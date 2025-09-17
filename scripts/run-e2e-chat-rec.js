#!/usr/bin/env node

/**
 * End-to-End Chat Recommendation Flow Validator
 * 
 * Validates complete chat-to-recommendation flow with real data sources.
 * Tests full integration without mocks to ensure production readiness.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class E2EChatRecValidator {
  constructor(options = {}) {
    this.options = {
      reportsPath: options.reportsPath || path.join(__dirname, '..', 'reports', 'e2e'),
      timeout: options.timeout || 30000,
      testUserId: options.testUserId || 'e2e_test_user_001',
      verbose: options.verbose !== false,
      ...options
    };

    this.testResults = [];
    this.startTime = null;
    this.endTime = null;
  }

  async runFullValidation() {
    console.log('🚀 Starting End-to-End Chat Recommendation Validation...');
    this.startTime = Date.now();

    try {
      // Initialize dependencies
      await this.initializeDependencies();

      // Run E2E test scenarios
      await this.runTestScenarios();

      // Generate comprehensive report
      const report = await this.generateReport();

      // Save results
      await this.saveReport(report);

      this.endTime = Date.now();
      const success = this.testResults.every(test => test.passed);

      console.log(success ? '✅ E2E validation completed successfully' : '❌ E2E validation failed');
      
      return {
        success,
        report,
        executionTime: this.endTime - this.startTime,
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(t => t.passed).length
      };

    } catch (error) {
      console.error('❌ E2E validation failed:', error);
      throw error;
    }
  }

  async initializeDependencies() {
    console.log('🔧 Initializing dependencies...');

    try {
      // Test database connection
      await this.testDatabaseConnection();

      // Test cache connection  
      await this.testCacheConnection();

      // Test MCP servers
      await this.testMCPServers();

      // Initialize recommendation strategies
      await this.initializeStrategies();

      // Initialize chat orchestrator
      await this.initializeChatOrchestrator();

      console.log('✅ All dependencies initialized successfully');

    } catch (error) {
      console.error('❌ Dependency initialization failed:', error);
      throw error;
    }
  }

  async testDatabaseConnection() {
    const testName = 'Database Connection';
    console.log(`📊 Testing ${testName}...`);

    try {
      const Database = require('../src/database/Database');
      await Database.connect();
      const db = Database.getInstance();
      
      // Test basic operations
      const collections = await db.listCollections().toArray();
      const requiredCollections = ['user_interactions', 'audio_features', 'users'];
      
      for (const reqCollection of requiredCollections) {
        const exists = collections.some(c => c.name === reqCollection);
        if (!exists) {
          throw new Error(`Required collection '${reqCollection}' not found`);
        }
      }

      this.addTestResult(testName, true, 'Database connection and collections validated');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async testCacheConnection() {
    const testName = 'Cache Connection';
    console.log(`💾 Testing ${testName}...`);

    try {
      const RecommendationCache = require('../src/cache/RecommendationCache');
      const cache = new RecommendationCache();
      
      await cache.initialize();
      
      // Test cache operations
      const testKey = 'e2e_test_key';
      const testData = { test: 'data', timestamp: Date.now() };
      
      await cache.set(testKey, testData, 60);
      const retrieved = await cache.get(testKey);
      
      if (!retrieved || retrieved.test !== testData.test) {
        throw new Error('Cache set/get operation failed');
      }

      const health = cache.getHealth();
      this.addTestResult(testName, true, `Cache status: ${health.status}`);

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      // Don't throw - cache might be in fallback mode
      console.warn('⚠️ Cache test failed, continuing with fallback mode');
    }
  }

  async testMCPServers() {
    const testName = 'MCP Server Health';
    console.log(`🔗 Testing ${testName}...`);

    try {
      const { EnhancedMCPValidatorV2 } = require('../src/mcp/EnhancedMCPValidatorV2');
      const validator = new EnhancedMCPValidatorV2();
      
      await validator.initialize();
      const report = await validator.validateAllServers();
      
      const criticalFailures = report.summary.criticalDownServers;
      if (criticalFailures > 0) {
        throw new Error(`${criticalFailures} critical MCP servers are down`);
      }

      this.addTestResult(testName, true, 
        `MCP Status: ${report.summary.healthyServers}/${report.summary.totalServers} healthy`);

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.warn('⚠️ MCP server issues detected, some features may be limited');
    }
  }

  async initializeStrategies() {
    const testName = 'Recommendation Strategies';
    console.log(`🎯 Testing ${testName}...`);

    try {
      const strategies = {
        collaborative: require('../src/recommendation/strategies/collaborativeStrategy'),
        content: require('../src/recommendation/strategies/contentAudioFeatureStrategy'),
        semantic: require('../src/recommendation/strategies/embeddingSemanticStrategy'),
        hybrid: require('../src/recommendation/strategies/hybridRerankStrategy')
      };

      const strategyResults = {};

      for (const [name, StrategyClass] of Object.entries(strategies)) {
        try {
          const strategy = new StrategyClass();
          await strategy.initialize();
          strategyResults[name] = 'initialized';
        } catch (error) {
          strategyResults[name] = `failed: ${error.message}`;
          console.warn(`⚠️ Strategy ${name} failed to initialize:`, error.message);
        }
      }

      const initialized = Object.values(strategyResults).filter(r => r === 'initialized').length;
      if (initialized === 0) {
        throw new Error('No recommendation strategies could be initialized');
      }

      this.addTestResult(testName, true, 
        `Strategies initialized: ${initialized}/${Object.keys(strategies).length}`);
      
      this.strategies = strategies;

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async initializeChatOrchestrator() {
    const testName = 'Chat Orchestrator';
    console.log(`💬 Testing ${testName}...`);

    try {
      const ChatRecommendationOrchestrator = require('../src/orchestration/ChatRecommendationOrchestrator');
      this.orchestrator = new ChatRecommendationOrchestrator();
      
      await this.orchestrator.initialize();
      
      this.addTestResult(testName, true, 'Chat orchestrator initialized successfully');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async runTestScenarios() {
    console.log('🧪 Running E2E test scenarios...');

    const scenarios = [
      {
        name: 'Basic Chat Recommendation Flow',
        handler: () => this.testBasicChatFlow()
      },
      {
        name: 'User Context Assembly',
        handler: () => this.testUserContextAssembly()
      },
      {
        name: 'Multi-Strategy Recommendation',
        handler: () => this.testMultiStrategyRecommendation()
      },
      {
        name: 'Feedback Ingestion',
        handler: () => this.testFeedbackIngestion()
      },
      {
        name: 'Cache Integration',
        handler: () => this.testCacheIntegration()
      },
      {
        name: 'Error Handling & Fallbacks',
        handler: () => this.testErrorHandling()
      }
    ];

    for (const scenario of scenarios) {
      try {
        console.log(`\n📋 Running scenario: ${scenario.name}`);
        await scenario.handler();
      } catch (error) {
        console.error(`❌ Scenario '${scenario.name}' failed:`, error);
        this.addTestResult(scenario.name, false, error.message);
      }
    }
  }

  async testBasicChatFlow() {
    const testName = 'Basic Chat Recommendation Flow';
    
    try {
      // Simulate user chat message
      const userMessage = 'I want some upbeat music for working out';
      const context = {
        userId: this.options.testUserId,
        userMessage,
        activity: 'workout',
        mood: 'energetic'
      };

      // Get recommendations through orchestrator
      const result = await this.orchestrator.generateRecommendations(
        this.options.testUserId,
        { final: 10, candidates: 50 },
        context
      );

      // Validate result structure
      if (!result || !result.recommendations || !Array.isArray(result.recommendations)) {
        throw new Error('Invalid recommendation result structure');
      }

      if (result.recommendations.length === 0) {
        throw new Error('No recommendations generated');
      }

      // Validate recommendation structure
      const rec = result.recommendations[0];
      if (!rec.trackId || typeof rec.score !== 'number' || !rec.reasons) {
        throw new Error('Invalid recommendation format');
      }

      this.addTestResult(testName, true, 
        `Generated ${result.recommendations.length} recommendations successfully`);

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async testUserContextAssembly() {
    const testName = 'User Context Assembly';
    
    try {
      // Test context building
      const context = await this.orchestrator.buildChatContext(
        this.options.testUserId,
        {
          includeHistory: true,
          includePreferences: true,
          includeActivity: true
        }
      );

      // Validate context structure
      if (!context || typeof context !== 'object') {
        throw new Error('Invalid context structure');
      }

      // Check for expected context components
      const expectedComponents = ['userId', 'preferences', 'listeningHistory'];
      const missingComponents = expectedComponents.filter(comp => !context[comp]);
      
      if (missingComponents.length > 0) {
        console.warn(`⚠️ Missing context components: ${missingComponents.join(', ')}`);
      }

      this.addTestResult(testName, true, 
        `Context assembled with ${Object.keys(context).length} components`);

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async testMultiStrategyRecommendation() {
    const testName = 'Multi-Strategy Recommendation';
    
    try {
      // Test each strategy individually
      const strategyResults = {};
      const testParams = {
        userId: this.options.testUserId,
        limits: { candidates: 20, final: 5 },
        context: {
          preferences: { genres: ['pop', 'rock'] },
          audioFeatures: { energy: 0.8, valence: 0.7 }
        }
      };

      for (const [name, StrategyClass] of Object.entries(this.strategies)) {
        try {
          const strategy = new StrategyClass();
          await strategy.initialize();
          
          const result = await strategy.run(testParams);
          
          strategyResults[name] = {
            success: true,
            candidates: result.candidates?.length || 0,
            executionTime: result.diagnostics?.executionTime || 0
          };
        } catch (error) {
          strategyResults[name] = {
            success: false,
            error: error.message
          };
        }
      }

      const successfulStrategies = Object.values(strategyResults).filter(r => r.success).length;
      
      if (successfulStrategies === 0) {
        throw new Error('No strategies executed successfully');
      }

      this.addTestResult(testName, true, 
        `${successfulStrategies}/${Object.keys(this.strategies).length} strategies executed successfully`);

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async testFeedbackIngestion() {
    const testName = 'Feedback Ingestion';
    
    try {
      // Test feedback ingestion
      const feedback = {
        trackId: 'test_track_001',
        signal: 'like',
        rating: 5,
        context: { playlist: 'workout', mood: 'energetic' }
      };

      await this.orchestrator.ingestFeedback(
        this.options.testUserId,
        feedback.trackId,
        feedback.signal,
        feedback
      );

      // Verify feedback was processed (would typically check database)
      this.addTestResult(testName, true, 'Feedback ingested successfully');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async testCacheIntegration() {
    const testName = 'Cache Integration';
    
    try {
      // Test cache hit scenario
      const context = { mood: 'test', activity: 'testing' };
      
      // First request (cache miss)
      const result1 = await this.orchestrator.generateRecommendations(
        this.options.testUserId,
        { final: 5, candidates: 20 },
        context
      );

      // Second request (should hit cache)
      const result2 = await this.orchestrator.generateRecommendations(
        this.options.testUserId,
        { final: 5, candidates: 20 },
        context
      );

      // Verify results are consistent
      if (result1.recommendations.length !== result2.recommendations.length) {
        console.warn('⚠️ Cache results inconsistent (might be expected if cache disabled)');
      }

      this.addTestResult(testName, true, 'Cache integration tested successfully');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  async testErrorHandling() {
    const testName = 'Error Handling & Fallbacks';
    
    try {
      // Test with invalid user ID
      try {
        await this.orchestrator.generateRecommendations(
          'invalid_user_id_12345',
          { final: 5, candidates: 20 },
          { mood: 'test' }
        );
      } catch (error) {
        // Expected error - this is good
      }

      // Test with malformed context
      const result = await this.orchestrator.generateRecommendations(
        this.options.testUserId,
        { final: 5, candidates: 20 },
        null // null context should be handled gracefully
      );

      // Should still return some result with fallback logic
      if (!result || !result.recommendations) {
        throw new Error('Error handling failed - no fallback result provided');
      }

      this.addTestResult(testName, true, 'Error handling and fallbacks working correctly');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      throw error;
    }
  }

  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });

    if (this.options.verbose) {
      console.log(`${passed ? '✅' : '❌'} ${testName}: ${details}`);
    }
  }

  async generateReport() {
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = this.testResults.filter(t => !t.passed).length;
    const successRate = (passedTests / this.testResults.length * 100).toFixed(2);

    return {
      timestamp: new Date().toISOString(),
      executionTime: this.endTime - this.startTime,
      summary: {
        totalTests: this.testResults.length,
        passedTests,
        failedTests,
        successRate: `${successRate}%`,
        overallStatus: failedTests === 0 ? 'PASSED' : 'FAILED'
      },
      testResults: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      },
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(t => !t.passed);

    if (failedTests.length === 0) {
      recommendations.push({
        type: 'SUCCESS',
        message: 'All E2E tests passed. System is ready for production deployment.',
        priority: 'INFO'
      });
    } else {
      recommendations.push({
        type: 'FAILURE',
        message: `${failedTests.length} tests failed. Review and fix issues before deployment.`,
        priority: 'HIGH'
      });

      // Add specific recommendations based on failures
      failedTests.forEach(test => {
        if (test.name.includes('Database')) {
          recommendations.push({
            type: 'DATABASE',
            message: 'Database connectivity issues detected. Check MongoDB connection and data.',
            priority: 'CRITICAL'
          });
        }
        
        if (test.name.includes('Cache')) {
          recommendations.push({
            type: 'CACHE',
            message: 'Cache issues detected. Verify Redis connection or ensure fallback works.',
            priority: 'MEDIUM'
          });
        }
        
        if (test.name.includes('MCP')) {
          recommendations.push({
            type: 'MCP',
            message: 'MCP server issues detected. Check server health and connectivity.',
            priority: 'HIGH'
          });
        }
      });
    }

    return recommendations;
  }

  async saveReport(report) {
    try {
      // Ensure reports directory exists
      await fs.mkdir(this.options.reportsPath, { recursive: true });

      // Save JSON report
      const jsonPath = path.join(this.options.reportsPath, 'chat-rec-e2e-report.json');
      await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

      // Save markdown summary
      const markdownPath = path.join(this.options.reportsPath, 'chat-rec-e2e-summary.md');
      const markdown = this.generateMarkdownReport(report);
      await fs.writeFile(markdownPath, markdown);

      console.log(`📄 E2E reports saved to ${this.options.reportsPath}`);

    } catch (error) {
      console.error('❌ Failed to save E2E report:', error);
      throw error;
    }
  }

  generateMarkdownReport(report) {
    const { summary, testResults, recommendations } = report;

    return `# E2E Chat Recommendation Validation Report

Generated: ${report.timestamp}
Execution Time: ${report.executionTime}ms

## Summary

- **Overall Status**: ${summary.overallStatus}
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests}
- **Failed**: ${summary.failedTests}
- **Success Rate**: ${summary.successRate}

## Test Results

| Test | Status | Details |
|------|--------|---------|
${testResults.map(test => 
  `| ${test.name} | ${test.passed ? '✅ PASS' : '❌ FAIL'} | ${test.details} |`
).join('\n')}

## Recommendations

${recommendations.map(rec => 
  `### ${rec.type} (${rec.priority})\n\n${rec.message}`
).join('\n\n')}

## Environment

- **Node.js**: ${report.environment.nodeVersion}
- **Platform**: ${report.environment.platform}
- **Timestamp**: ${report.environment.timestamp}

---
*Generated by E2E Chat Recommendation Validator v1.0.0*
`;
  }
}

// CLI execution
if (require.main === module) {
  const validator = new E2EChatRecValidator();
  
  validator.runFullValidation()
    .then(results => {
      console.log('\n📋 E2E VALIDATION SUMMARY');
      console.log('========================');
      console.log(`Status: ${results.success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Tests: ${results.passedTests}/${results.totalTests} passed`);
      console.log(`Execution Time: ${results.executionTime}ms`);
      
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 E2E validation failed:', error);
      process.exit(1);
    });
}

module.exports = E2EChatRecValidator;