#!/usr/bin/env node
'use strict';

/**
 * Live Test for Bedrock Roadmap Orchestrator
 * 
 * Executes a small test run with REAL AWS Bedrock invocations
 * to validate the system and collect evidence.
 * 
 * @module scripts/test-bedrock-roadmap-live
 */

const BedrockRoadmapOrchestrator = require('./bedrock-roadmap-orchestrator');
const fs = require('fs').promises;
const path = require('path');

async function runLiveTest() {
  console.log('🧪 Starting Live Bedrock Roadmap Test');
  console.log('=' .repeat(80));
  console.log('⚠️  This test will make REAL AWS Bedrock API calls');
  console.log('💰 Expected cost: ~$0.01 - $0.05');
  console.log('=' .repeat(80) + '\n');

  try {
    // Create test roadmap with a few simple tasks
    const testRoadmapPath = path.join(__dirname, '../test-roadmap.md');
    const testRoadmapContent = `# Test Roadmap

## High Priority Tasks

- [ ] **Implement basic error handling**: Add try-catch blocks to main functions
- [ ] **Add input validation**: Validate user inputs before processing
- [ ] **Update documentation**: Add JSDoc comments to public functions
- [ ] **Create unit tests**: Add tests for core functionality
- [ ] **Optimize database queries**: Add indexes for frequently queried fields

## Medium Priority

- [ ] **Refactor code structure**: Improve modularity and separation of concerns
- [ ] **Add logging**: Implement comprehensive logging system
- [ ] **Security audit**: Review authentication and authorization flows
`;

    await fs.writeFile(testRoadmapPath, testRoadmapContent, 'utf-8');
    console.log(`✅ Created test roadmap: ${testRoadmapPath}\n`);

    // Configure orchestrator for test run
    const orchestrator = new BedrockRoadmapOrchestrator({
      roadmapPath: testRoadmapPath,
      outputDir: path.join(__dirname, '../reports/bedrock-roadmap-test'),
      maxTasksPerSession: 3, // Limit to 3 tasks for testing
      collectEvidence: true
    });

    // Execute test run
    console.log('🚀 Starting test execution...\n');
    const summary = await orchestrator.run();

    // Validate results
    console.log('\n🔍 Validating results...');
    
    const validationResults = {
      realInvocations: summary.invocations.every(inv => inv.requestId && inv.requestId.startsWith('req-')),
      hasTokenCounts: summary.tokens.total > 0,
      hasCosts: summary.costs.total > 0,
      hasLatencyMetrics: summary.performance.latencyP50 > 0,
      hasRetryStats: summary.retryStatistics.totalCalls > 0,
      configHashExists: !!summary.configHash,
      verificationHashExists: !!summary.evidence.verificationHash
    };

    console.log('\n📊 Validation Results:');
    console.log('='.repeat(80));
    for (const [check, passed] of Object.entries(validationResults)) {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${check}: ${passed}`);
    }
    console.log('='.repeat(80) + '\n');

    const allPassed = Object.values(validationResults).every(v => v === true);
    
    if (allPassed) {
      console.log('🎉 ALL VALIDATION CHECKS PASSED');
      console.log('\n📈 Key Metrics:');
      console.log(`   - Real AWS invocations: ${summary.invocations.length}`);
      console.log(`   - Total cost: ${summary.costs.totalFormatted}`);
      console.log(`   - Total tokens: ${summary.tokens.total.toLocaleString()}`);
      console.log(`   - Success rate: ${summary.tasks.successRate}`);
      console.log(`   - P95 latency: ${summary.performance.latencyP95}ms`);
      console.log(`   - Config hash: ${summary.configHash.substring(0, 16)}...`);
      
      console.log('\n🔗 Evidence Artifacts:');
      console.log(`   - Session data: reports/bedrock-roadmap-test/${summary.sessionId}.json`);
      console.log(`   - Evidence report: reports/bedrock-roadmap-test/${summary.sessionId}-evidence.md`);
      console.log(`   - Cost analysis: reports/bedrock-roadmap-test/${summary.sessionId}-costs.md`);
    } else {
      console.log('❌ VALIDATION FAILED - Some checks did not pass');
      process.exit(1);
    }

    // Cleanup test roadmap
    await fs.unlink(testRoadmapPath);
    console.log('\n✅ Test roadmap cleaned up');

    console.log('\n' + '='.repeat(80));
    console.log('✅ LIVE TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test if executed directly
if (require.main === module) {
  runLiveTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = runLiveTest;
