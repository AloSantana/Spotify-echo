#!/usr/bin/env node

/**
 * Recommendation Engine Probe Script
 * Tests recommendation endpoints and records metrics
 * Outputs: recommendation-engine.json
 */

const fs = require('fs');
const path = require('path');

class RecommendationProbe {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.report = {
      timestamp: new Date().toISOString(),
      success: false,
      endpointsTested: [],
      hybridEndpoint: {
        available: false,
        tested: false,
        latency: null,
        recommendationCount: 0,
        error: null
      },
      chatFallback: {
        tested: false,
        latency: null,
        response: null,
        error: null
      },
      fallbackUsed: false,
      hybridFlagState: null,
      totalLatency: 0,
      errors: [],
      warnings: []
    };
  }

  async probeRecommendationEngine() {
    console.log('🎵 Probing recommendation engine...\n');

    try {
      // 1. Test direct recommendations endpoint
      await this.testRecommendationsEndpoint();

      // 2. If direct endpoint fails, test chat fallback
      if (!this.report.hybridEndpoint.available) {
        await this.testChatFallback();
      }

      // 3. Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('💥 Recommendation probe failed:', error.message);
      this.report.errors.push(`Probe failed: ${error.message}`);
    }

    return this.report;
  }

  async testRecommendationsEndpoint() {
    console.log('🧪 Testing recommendations endpoint...');
    
    const strategies = ['hybrid', 'collaborative', 'content-based'];
    
    for (const strategy of strategies) {
      await this.testStrategy(strategy);
    }
  }

  async testStrategy(strategy) {
    const startTime = Date.now();
    const testEndpoint = `${this.baseUrl}/api/recommendations?strategy=${strategy}`;
    
    try {
      console.log(`  Testing strategy: ${strategy}`);
      
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EchoTune-Test/1.0'
        },
        timeout: 15000
      });

      const latency = Date.now() - startTime;
      this.report.totalLatency += latency;

      this.report.endpointsTested.push({
        strategy,
        endpoint: testEndpoint,
        status: response.status,
        latency,
        tested: true
      });

      if (response.ok) {
        const data = await response.json();
        
        if (strategy === 'hybrid') {
          this.report.hybridEndpoint = {
            available: true,
            tested: true,
            latency,
            recommendationCount: Array.isArray(data.recommendations) ? data.recommendations.length : 0,
            error: null
          };
          this.report.hybridFlagState = data.strategy || 'hybrid';
        }

        console.log(`    ✅ ${strategy}: ${response.status} (${latency}ms) - ${Array.isArray(data.recommendations) ? data.recommendations.length : 0} recommendations`);
        
        if (data.recommendations && data.recommendations.length > 0) {
          this.report.success = true;
        }

      } else {
        const errorText = await response.text();
        console.log(`    ❌ ${strategy}: ${response.status} - ${errorText}`);
        
        if (strategy === 'hybrid') {
          this.report.hybridEndpoint.error = `HTTP ${response.status}: ${errorText}`;
        }
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      console.log(`    ❌ ${strategy}: Failed - ${error.message} (${latency}ms)`);
      
      this.report.endpointsTested.push({
        strategy,
        endpoint: testEndpoint,
        status: 'error',
        latency,
        error: error.message,
        tested: true
      });

      if (strategy === 'hybrid') {
        this.report.hybridEndpoint = {
          available: false,
          tested: true,
          latency,
          recommendationCount: 0,
          error: error.message
        };
      }
    }
  }

  async testChatFallback() {
    console.log('\n🗨️ Testing chat fallback for recommendations...');
    
    const startTime = Date.now();
    const chatEndpoint = `${this.baseUrl}/api/chat`;
    
    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EchoTune-Test/1.0'
        },
        body: JSON.stringify({
          message: 'Can you recommend some music?',
          provider: 'auto'
        }),
        timeout: 20000
      });

      const latency = Date.now() - startTime;
      this.report.totalLatency += latency;

      this.report.chatFallback.tested = true;
      this.report.chatFallback.latency = latency;

      if (response.ok) {
        const data = await response.json();
        this.report.chatFallback.response = {
          hasMessage: !!data.message,
          hasRecommendations: !!(data.recommendations && data.recommendations.length > 0),
          recommendationCount: data.recommendations ? data.recommendations.length : 0,
          provider: data.provider || 'unknown'
        };

        this.report.fallbackUsed = true;
        
        if (data.recommendations && data.recommendations.length > 0) {
          this.report.success = true;
        }

        console.log(`  ✅ Chat fallback: ${response.status} (${latency}ms)`);
        console.log(`    Provider: ${data.provider || 'unknown'}`);
        console.log(`    Recommendations: ${data.recommendations ? data.recommendations.length : 0}`);

      } else {
        const errorText = await response.text();
        this.report.chatFallback.error = `HTTP ${response.status}: ${errorText}`;
        console.log(`  ❌ Chat fallback: ${response.status} - ${errorText}`);
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      this.report.chatFallback.tested = true;
      this.report.chatFallback.latency = latency;
      this.report.chatFallback.error = error.message;
      console.log(`  ❌ Chat fallback: Failed - ${error.message} (${latency}ms)`);
    }
  }

  generateFinalReport() {
    console.log('\n📊 Recommendation Engine Summary:');
    console.log('='.repeat(50));

    // Determine overall success
    if (this.report.hybridEndpoint.available) {
      console.log(`✅ Hybrid recommendations: Available (${this.report.hybridEndpoint.recommendationCount} recommendations)`);
    } else if (this.report.fallbackUsed && this.report.chatFallback.response?.hasRecommendations) {
      console.log(`✅ Chat fallback: Working (${this.report.chatFallback.response.recommendationCount} recommendations)`);
      this.report.warnings.push('Using chat fallback instead of direct recommendations endpoint');
    } else {
      console.log('❌ No working recommendation system found');
      this.report.errors.push('Neither hybrid endpoint nor chat fallback providing recommendations');
    }

    console.log(`⚡ Total latency: ${this.report.totalLatency}ms`);
    console.log(`🎯 Endpoints tested: ${this.report.endpointsTested.length}`);
    
    if (this.report.hybridFlagState) {
      console.log(`🏷️ Hybrid flag state: ${this.report.hybridFlagState}`);
    }

    if (this.report.warnings.length > 0) {
      console.log(`\n⚠️ Warnings: ${this.report.warnings.length}`);
      this.report.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.report.errors.length > 0) {
      console.log(`\n❌ Errors: ${this.report.errors.length}`);
      this.report.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('='.repeat(50));
  }

  writeReport() {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Write recommendation engine report
      const reportPath = path.join(reportsDir, 'recommendation-engine.json');
      fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));

      console.log(`\n📄 Report written to: ${reportPath}`);

    } catch (error) {
      console.error('❌ Failed to write report:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      await this.probeRecommendationEngine();
      this.writeReport();

      if (this.report.success) {
        console.log('\n✅ Recommendation engine probe completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️ Recommendation engine probe completed with warnings');
        process.exit(0); // Don't fail the build, just warn
      }

    } catch (error) {
      console.error('💥 Recommendation probe failed:', error.message);
      
      // Write error report
      const errorReport = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        stack: error.stack
      };

      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(reportsDir, 'recommendation-engine.json'), 
        JSON.stringify(errorReport, null, 2)
      );

      process.exit(1);
    }
  }
}

// Run probe if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const probe = new RecommendationProbe(baseUrl);
  probe.run();
}

module.exports = RecommendationProbe;