#!/usr/bin/env node

/**
 * Performance Smoke Test Script
 * Tests chat latency with p50/p95 metrics and soft/hard thresholds
 * Outputs: perf-chat.json
 */

const fs = require('fs');
const path = require('path');

class PerformanceSmokeTest {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testCount = 10;
    this.softThresholdP95 = 3500; // ms - warning threshold
    this.hardThresholdP95 = 5000; // ms - failure threshold (if ENFORCE_PERF_THRESHOLDS=true)
    this.enforceThresholds = process.env.ENFORCE_PERF_THRESHOLDS === 'true';
    
    this.report = {
      timestamp: new Date().toISOString(),
      baseUrl,
      testCount: this.testCount,
      enforceThresholds: this.enforceThresholds,
      success: false,
      results: [],
      metrics: {
        latencies: [],
        p50: 0,
        p95: 0,
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        standardDeviation: 0
      },
      thresholds: {
        softP95: this.softThresholdP95,
        hardP95: this.hardThresholdP95,
        softExceeded: false,
        hardExceeded: false
      },
      errors: [],
      warnings: [],
      providers: {
        tested: {},
        fastest: null,
        slowest: null
      }
    };

    this.testMessages = [
      'Can you recommend some music?',
      'What are some good pop songs?',
      'Suggest jazz music for studying',
      'I want upbeat music for working out',
      'Recommend relaxing ambient music',
      'Find me some rock music',
      'What about classical music?',
      'Suggest electronic dance music',
      'I like indie folk music',
      'Recommend some hip hop'
    ];
  }

  async runPerformanceTests() {
    console.log('🚀 Starting performance smoke tests...\n');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Tests: ${this.testCount} sequential chat requests`);
    console.log(`Thresholds: Soft warning at p95>${this.softThresholdP95}ms, Hard fail at p95>${this.hardThresholdP95}ms (enforced: ${this.enforceThresholds})`);
    console.log('');

    try {
      // 1. Warm up request
      await this.performWarmupRequest();
      
      // 2. Run performance tests
      await this.runChatLatencyTests();
      
      // 3. Calculate metrics
      this.calculateMetrics();
      
      // 4. Test different providers if available
      await this.testProviderPerformance();
      
      // 5. Evaluate thresholds
      this.evaluateThresholds();
      
      this.report.success = !this.report.thresholds.hardExceeded;

    } catch (error) {
      console.error('💥 Performance test failed:', error.message);
      this.report.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      });
    }

    return this.report;
  }

  async performWarmupRequest() {
    console.log('🔥 Warming up server...');
    
    try {
      const fetch = (await import('node-fetch')).default;
      await fetch(`${this.baseUrl}/health`, { timeout: 10000 });
      console.log('✅ Warmup completed');
    } catch (error) {
      console.log(`⚠️ Warmup failed: ${error.message}`);
    }
  }

  async runChatLatencyTests() {
    console.log('⚡ Running chat latency tests...\n');

    for (let i = 0; i < this.testCount; i++) {
      const message = this.testMessages[i % this.testMessages.length];
      await this.performSingleChatTest(i + 1, message);
      
      // Small delay between requests to avoid overwhelming
      if (i < this.testCount - 1) {
        await this.sleep(500);
      }
    }
  }

  async performSingleChatTest(testNumber, message) {
    const startTime = Date.now();
    
    try {
      console.log(`Test ${testNumber}: ${message.substring(0, 30)}...`);
      
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Performance-Test/1.0'
        },
        body: JSON.stringify({
          message,
          provider: 'auto'
        }),
        timeout: 30000 // 30 second timeout
      });

      const latency = Date.now() - startTime;
      
      let responseData = null;
      let responseSize = 0;
      
      if (response.ok) {
        const responseText = await response.text();
        responseSize = responseText.length;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          // Response might not be JSON
        }
      }

      const result = {
        testNumber,
        message,
        latency,
        status: response.status,
        success: response.ok,
        responseSize,
        provider: responseData?.provider || 'unknown',
        hasRecommendations: !!(responseData?.recommendations?.length > 0),
        timestamp: new Date().toISOString()
      };

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
        console.log(`  ❌ Failed: ${response.status} (${latency}ms)`);
      } else {
        console.log(`  ✅ Success: ${latency}ms (${responseData?.provider || 'unknown'}) [${responseSize} bytes]`);
      }

      this.report.results.push(result);
      this.report.metrics.latencies.push(latency);

      // Track provider performance
      const provider = result.provider;
      if (!this.report.providers.tested[provider]) {
        this.report.providers.tested[provider] = {
          count: 0,
          latencies: [],
          successes: 0,
          errors: 0
        };
      }
      
      this.report.providers.tested[provider].count++;
      this.report.providers.tested[provider].latencies.push(latency);
      
      if (result.success) {
        this.report.providers.tested[provider].successes++;
      } else {
        this.report.providers.tested[provider].errors++;
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.log(`  ❌ Error: ${error.message} (${latency}ms)`);
      
      this.report.results.push({
        testNumber,
        message,
        latency,
        status: 'error',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.report.metrics.latencies.push(latency);
      this.report.errors.push({
        testNumber,
        error: error.message,
        latency
      });
    }
  }

  calculateMetrics() {
    console.log('\n📊 Calculating performance metrics...');
    
    const latencies = this.report.metrics.latencies;
    
    if (latencies.length === 0) {
      console.log('❌ No latency data to calculate metrics');
      return;
    }

    // Sort latencies for percentile calculations
    const sorted = [...latencies].sort((a, b) => a - b);
    
    // Basic stats
    this.report.metrics.min = Math.min(...latencies);
    this.report.metrics.max = Math.max(...latencies);
    this.report.metrics.average = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    this.report.metrics.median = this.calculatePercentile(sorted, 50);
    
    // Percentiles
    this.report.metrics.p50 = this.calculatePercentile(sorted, 50);
    this.report.metrics.p95 = this.calculatePercentile(sorted, 95);
    
    // Standard deviation
    const mean = this.report.metrics.average;
    const variance = latencies.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / latencies.length;
    this.report.metrics.standardDeviation = Math.round(Math.sqrt(variance));

    // Success rate
    const successes = this.report.results.filter(r => r.success).length;
    this.report.metrics.successRate = Math.round((successes / this.report.results.length) * 100);

    console.log('  ✅ Metrics calculated:');
    console.log(`    Min: ${this.report.metrics.min}ms`);
    console.log(`    Max: ${this.report.metrics.max}ms`);
    console.log(`    Average: ${this.report.metrics.average}ms`);
    console.log(`    Median (p50): ${this.report.metrics.p50}ms`);
    console.log(`    p95: ${this.report.metrics.p95}ms`);
    console.log(`    Success rate: ${this.report.metrics.successRate}%`);
  }

  calculatePercentile(sorted, percentile) {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
  }

  async testProviderPerformance() {
    console.log('\n🔌 Analyzing provider performance...');
    
    const providers = Object.keys(this.report.providers.tested);
    
    if (providers.length === 0) {
      console.log('  ⚠️ No provider data available');
      return;
    }

    let fastestProvider = null;
    let slowestProvider = null;
    let fastestAvg = Infinity;
    let slowestAvg = 0;

    for (const provider of providers) {
      const data = this.report.providers.tested[provider];
      const avgLatency = Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length);
      const successRate = Math.round((data.successes / data.count) * 100);
      
      data.averageLatency = avgLatency;
      data.successRate = successRate;
      
      if (avgLatency < fastestAvg) {
        fastestAvg = avgLatency;
        fastestProvider = provider;
      }
      
      if (avgLatency > slowestAvg) {
        slowestAvg = avgLatency;
        slowestProvider = provider;
      }
      
      console.log(`  ${provider}: ${avgLatency}ms avg, ${successRate}% success (${data.count} requests)`);
    }

    this.report.providers.fastest = fastestProvider;
    this.report.providers.slowest = slowestProvider;
    
    if (fastestProvider) {
      console.log(`  🏆 Fastest: ${fastestProvider} (${fastestAvg}ms)`);
    }
    if (slowestProvider && slowestProvider !== fastestProvider) {
      console.log(`  🐌 Slowest: ${slowestProvider} (${slowestAvg}ms)`);
    }
  }

  evaluateThresholds() {
    console.log('\n🎯 Evaluating performance thresholds...');
    
    const p95 = this.report.metrics.p95;
    
    // Check soft threshold
    if (p95 > this.softThresholdP95) {
      this.report.thresholds.softExceeded = true;
      this.report.warnings.push(`p95 latency (${p95}ms) exceeds soft threshold (${this.softThresholdP95}ms)`);
      console.log(`  ⚠️ Soft threshold exceeded: p95=${p95}ms > ${this.softThresholdP95}ms`);
    } else {
      console.log(`  ✅ Soft threshold OK: p95=${p95}ms <= ${this.softThresholdP95}ms`);
    }

    // Check hard threshold
    if (p95 > this.hardThresholdP95) {
      this.report.thresholds.hardExceeded = true;
      
      if (this.enforceThresholds) {
        this.report.errors.push(`p95 latency (${p95}ms) exceeds hard threshold (${this.hardThresholdP95}ms) - enforcement enabled`);
        console.log(`  ❌ Hard threshold exceeded: p95=${p95}ms > ${this.hardThresholdP95}ms (ENFORCEMENT ENABLED)`);
      } else {
        this.report.warnings.push(`p95 latency (${p95}ms) exceeds hard threshold (${this.hardThresholdP95}ms) - enforcement disabled`);
        console.log(`  ⚠️ Hard threshold exceeded: p95=${p95}ms > ${this.hardThresholdP95}ms (enforcement disabled)`);
      }
    } else {
      console.log(`  ✅ Hard threshold OK: p95=${p95}ms <= ${this.hardThresholdP95}ms`);
    }
  }

  generateSummary() {
    console.log('\n📈 Performance Test Summary:');
    console.log('='.repeat(50));
    
    const metrics = this.report.metrics;
    console.log(`Tests completed: ${this.report.results.length}/${this.testCount}`);
    console.log(`Success rate: ${metrics.successRate}%`);
    console.log(`Latency p50: ${metrics.p50}ms`);
    console.log(`Latency p95: ${metrics.p95}ms`);
    console.log(`Range: ${metrics.min}ms - ${metrics.max}ms`);
    
    if (this.report.providers.fastest) {
      console.log(`Fastest provider: ${this.report.providers.fastest}`);
    }
    
    if (this.report.warnings.length > 0) {
      console.log(`\n⚠️ Warnings: ${this.report.warnings.length}`);
      this.report.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (this.report.errors.length > 0) {
      console.log(`\n❌ Errors: ${this.report.errors.length}`);
      this.report.errors.slice(0, 3).forEach(error => console.log(`  - ${error.error || error}`));
    }
    
    console.log(`\nOverall: ${this.report.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(50));
  }

  writeReport() {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Write performance report
      const reportPath = path.join(reportsDir, 'perf-chat.json');
      fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));

      console.log(`\n📄 Report written to: ${reportPath}`);

    } catch (error) {
      console.error('❌ Failed to write report:', error.message);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      await this.runPerformanceTests();
      this.generateSummary();
      this.writeReport();

      if (this.report.success) {
        console.log('\n✅ Performance smoke test completed successfully');
        process.exit(0);
      } else {
        if (this.enforceThresholds) {
          console.log('\n❌ Performance smoke test failed (hard thresholds enforced)');
          process.exit(1);
        } else {
          console.log('\n⚠️ Performance smoke test completed with warnings');
          process.exit(0);
        }
      }

    } catch (error) {
      console.error('💥 Performance test error:', error.message);
      
      // Write error report
      const errorReport = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        partialResults: this.report
      };

      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(reportsDir, 'perf-chat.json'), 
        JSON.stringify(errorReport, null, 2)
      );

      process.exit(1);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const perfTest = new PerformanceSmokeTest(baseUrl);
  perfTest.run();
}

module.exports = PerformanceSmokeTest;