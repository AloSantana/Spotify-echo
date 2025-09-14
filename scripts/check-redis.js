#!/usr/bin/env node

/**
 * Redis Connection Checker
 * 
 * Validates Redis connection, measures performance, and provides
 * comprehensive health diagnostics for the caching layer.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const Redis = require('redis');
const os = require('os');

class RedisChecker {
  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.timeout = 5000; // 5 second timeout
    this.results = {
      connected: false,
      rtt: null,
      memory: null,
      keyspace: null,
      errors: [],
      recommendations: []
    };
  }

  async check() {
    console.log('🔍 Checking Redis connection and performance...');
    console.log(`📍 Redis URL: ${this.redisUrl}`);
    
    let client;
    
    try {
      // Create Redis client with timeout
      client = Redis.createClient({
        url: this.redisUrl,
        socket: {
          connectTimeout: this.timeout,
          commandTimeout: this.timeout
        },
        retry_strategy: (times) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 50, 200); // Exponential backoff
        }
      });

      // Connect with timeout
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), this.timeout)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log('✅ Connected to Redis');
      this.results.connected = true;

      // Test basic operations
      await this.testBasicOperations(client);
      
      // Measure round-trip time
      await this.measureRTT(client);
      
      // Get Redis info
      await this.getRedisInfo(client);
      
      // Test caching scenarios
      await this.testCachingScenarios(client);

      console.log('✅ All Redis checks completed successfully');

    } catch (error) {
      console.error('❌ Redis check failed:', error.message);
      this.results.errors.push(error.message);
      this.results.connected = false;
    } finally {
      if (client) {
        try {
          await client.quit();
        } catch (error) {
          console.warn('Warning: Error closing Redis connection:', error.message);
        }
      }
    }

    return this.generateReport();
  }

  async testBasicOperations(client) {
    console.log('🧪 Testing basic Redis operations...');
    
    const testKey = 'echotune:health:test';
    const testValue = JSON.stringify({ 
      timestamp: Date.now(), 
      test: 'redis-health-check' 
    });

    try {
      // SET operation
      await client.set(testKey, testValue, { EX: 60 }); // 60 second expiry
      console.log('✅ SET operation successful');

      // GET operation
      const retrieved = await client.get(testKey);
      if (retrieved === testValue) {
        console.log('✅ GET operation successful');
      } else {
        throw new Error('GET operation returned incorrect value');
      }

      // DEL operation
      await client.del(testKey);
      console.log('✅ DEL operation successful');

      // Verify deletion
      const deleted = await client.get(testKey);
      if (deleted === null) {
        console.log('✅ Key deletion verified');
      } else {
        throw new Error('Key was not properly deleted');
      }

    } catch (error) {
      throw new Error(`Basic operations failed: ${error.message}`);
    }
  }

  async measureRTT(client) {
    console.log('⏱️  Measuring round-trip time...');
    
    const iterations = 10;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await client.ping();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000); // Convert to milliseconds
    }

    const avgRTT = times.reduce((a, b) => a + b, 0) / times.length;
    const minRTT = Math.min(...times);
    const maxRTT = Math.max(...times);

    this.results.rtt = {
      average: avgRTT.toFixed(2),
      min: minRTT.toFixed(2),
      max: maxRTT.toFixed(2),
      samples: iterations
    };

    console.log(`📊 RTT - Avg: ${avgRTT.toFixed(2)}ms, Min: ${minRTT.toFixed(2)}ms, Max: ${maxRTT.toFixed(2)}ms`);

    // Performance recommendations
    if (avgRTT > 50) {
      this.results.recommendations.push('High RTT detected. Consider Redis server proximity or network optimization.');
    }
    if (maxRTT > 200) {
      this.results.recommendations.push('High max RTT detected. Check for network instability.');
    }
  }

  async getRedisInfo(client) {
    console.log('📊 Gathering Redis server information...');
    
    try {
      const info = await client.info();
      const lines = info.split('\r\n');
      const parsed = {};

      lines.forEach(line => {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          parsed[key] = value;
        }
      });

      this.results.memory = {
        used: parsed.used_memory_human || 'Unknown',
        peak: parsed.used_memory_peak_human || 'Unknown',
        overhead: parsed.mem_fragmentation_ratio || 'Unknown'
      };

      this.results.keyspace = {
        db0: parsed.db0 || 'No keys',
        totalKeys: this.extractKeyCount(parsed.db0)
      };

      console.log(`💾 Memory Usage: ${this.results.memory.used} (Peak: ${this.results.memory.peak})`);
      console.log(`🗝️  Keyspace: ${this.results.keyspace.totalKeys} keys`);

      // Memory recommendations
      if (parsed.mem_fragmentation_ratio && parseFloat(parsed.mem_fragmentation_ratio) > 1.5) {
        this.results.recommendations.push('High memory fragmentation detected. Consider Redis restart.');
      }

    } catch (error) {
      console.warn('⚠️  Could not retrieve Redis info:', error.message);
      this.results.errors.push(`Info retrieval failed: ${error.message}`);
    }
  }

  async testCachingScenarios(client) {
    console.log('🎯 Testing EchoTune caching scenarios...');
    
    try {
      // Test recommendation caching
      const recKey = 'echotune:recs:user123';
      const recData = JSON.stringify({
        userId: 'user123',
        recommendations: [
          { trackId: 'track1', score: 0.95 },
          { trackId: 'track2', score: 0.87 }
        ],
        generatedAt: Date.now(),
        strategy: 'collaborative'
      });

      await client.setex(recKey, 900, recData); // 15 minute TTL
      console.log('✅ Recommendation caching test passed');

      // Test user profile caching
      const profileKey = 'echotune:profile:user123';
      const profileData = JSON.stringify({
        userId: 'user123',
        preferences: { genres: ['pop', 'rock'], features: { energy: 0.8 } },
        lastActive: Date.now()
      });

      await client.setex(profileKey, 3600, profileData); // 1 hour TTL
      console.log('✅ User profile caching test passed');

      // Test session caching
      const sessionKey = 'echotune:session:sess123';
      const sessionData = JSON.stringify({
        sessionId: 'sess123',
        userId: 'user123',
        context: { mood: 'energetic', activity: 'workout' },
        startTime: Date.now()
      });

      await client.setex(sessionKey, 600, sessionData); // 10 minute TTL
      console.log('✅ Session caching test passed');

      // Test bulk operations (pipeline)
      const pipeline = client.multi();
      for (let i = 0; i < 10; i++) {
        pipeline.set(`echotune:test:bulk:${i}`, `value${i}`, { EX: 30 });
      }
      await pipeline.exec();
      console.log('✅ Bulk operations test passed');

      // Clean up test data
      await client.del([recKey, profileKey, sessionKey]);
      for (let i = 0; i < 10; i++) {
        await client.del(`echotune:test:bulk:${i}`);
      }

    } catch (error) {
      console.warn('⚠️  Caching scenario test failed:', error.message);
      this.results.errors.push(`Caching test failed: ${error.message}`);
    }
  }

  extractKeyCount(db0Info) {
    if (!db0Info) return 0;
    const match = db0Info.match(/keys=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      status: this.results.connected ? 'HEALTHY' : 'UNHEALTHY',
      connection: {
        url: this.redisUrl,
        connected: this.results.connected,
        timeout: this.timeout
      },
      performance: this.results.rtt,
      server: {
        memory: this.results.memory,
        keyspace: this.results.keyspace
      },
      errors: this.results.errors,
      recommendations: this.results.recommendations,
      systemInfo: {
        platform: os.platform(),
        hostname: os.hostname(),
        nodeVersion: process.version,
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
          free: Math.round(os.freemem() / 1024 / 1024) + 'MB'
        }
      }
    };

    console.log('\n📋 REDIS HEALTH REPORT');
    console.log('========================');
    console.log(`Status: ${report.status}`);
    console.log(`Connection: ${report.connection.connected ? '✅' : '❌'}`);
    
    if (report.performance) {
      console.log(`Performance: ${report.performance.average}ms avg RTT`);
    }
    
    if (report.server.memory) {
      console.log(`Memory: ${report.server.memory.used}`);
    }
    
    if (report.errors.length > 0) {
      console.log(`Errors: ${report.errors.length}`);
      report.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (report.recommendations.length > 0) {
      console.log(`Recommendations: ${report.recommendations.length}`);
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    return report;
  }
}

// CLI execution
if (require.main === module) {
  const checker = new RedisChecker();
  
  checker.check()
    .then(report => {
      // Save report to file
      const fs = require('fs');
      const reportPath = './redis-health-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to ${reportPath}`);
      
      // Exit with appropriate code
      process.exit(report.status === 'HEALTHY' ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Health check failed:', error);
      process.exit(1);
    });
}

module.exports = RedisChecker;