#!/usr/bin/env node

/**
 * AWS Bedrock Configuration Dry Run Test
 * 
 * Tests the configuration without making actual AWS API calls.
 * Validates model registry structure, ARN formats, and BedrockInferenceProvider compatibility.
 * 
 * Usage:
 *   node scripts/test-bedrock-config-dryrun.js
 */

const fs = require('fs');
const path = require('path');

class BedrockConfigDryRunTest {
  constructor() {
    this.configPath = path.join(__dirname, '../config/aws-bedrock-models.json');
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  /**
   * Load configuration
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      this.addTestResult('Configuration Loading', true, 'Configuration loaded successfully');
      return true;
    } catch (error) {
      this.addTestResult('Configuration Loading', false, `Failed to load config: ${error.message}`);
      return false;
    }
  }

  /**
   * Test model registry structure
   */
  testModelRegistryStructure() {
    console.log('\n🔍 Testing Model Registry Structure...');
    
    if (!this.config.modelRegistry) {
      this.addTestResult('Model Registry Exists', false, 'modelRegistry not found in config');
      return;
    }

    this.addTestResult('Model Registry Exists', true, 'modelRegistry section found');

    const models = Object.keys(this.config.modelRegistry);
    console.log(`   Found ${models.length} models in registry`);

    // Test each model has required fields
    for (const [key, model] of Object.entries(this.config.modelRegistry)) {
      const requiredFields = ['modelId', 'displayName', 'provider', 'requiresInferenceProfile'];
      const missingFields = requiredFields.filter(field => !(field in model));
      
      if (missingFields.length === 0) {
        this.addTestResult(`Model ${key} Structure`, true, 'All required fields present');
      } else {
        this.addTestResult(`Model ${key} Structure`, false, `Missing fields: ${missingFields.join(', ')}`);
      }
    }
  }

  /**
   * Test inference profile ARN configuration
   */
  testInferenceProfileARNs() {
    console.log('\n🔍 Testing Inference Profile ARNs...');

    const modelsRequiringArn = ['claude-opus-4-1', 'claude-sonnet-4-5', 'deepseek-r1'];
    
    for (const modelKey of modelsRequiringArn) {
      const model = this.config.modelRegistry[modelKey];
      
      if (!model) {
        this.addTestResult(`ARN Test - ${modelKey}`, false, 'Model not found in registry');
        continue;
      }

      // Check requiresInferenceProfile is true
      if (model.requiresInferenceProfile === true) {
        this.addTestResult(`${modelKey} - requiresInferenceProfile`, true, 'Flag correctly set to true');
      } else {
        this.addTestResult(`${modelKey} - requiresInferenceProfile`, false, 'Flag should be true');
      }

      // Check ARN is present and valid
      if (model.inferenceProfileArn) {
        const arnPattern = /^arn:aws:bedrock:[a-z0-9-]+:\d+:inference-profile\/[a-z0-9.:-]+$/;
        if (arnPattern.test(model.inferenceProfileArn)) {
          this.addTestResult(`${modelKey} - ARN Format`, true, 'Valid ARN format');
        } else {
          this.addTestResult(`${modelKey} - ARN Format`, false, `Invalid ARN: ${model.inferenceProfileArn}`);
        }
      } else {
        this.addTestResult(`${modelKey} - ARN Presence`, false, 'ARN is missing');
      }
    }
  }

  /**
   * Test model ID format
   */
  testModelIdFormat() {
    console.log('\n🔍 Testing Model ID Format...');

    const expectedUsPrefix = ['claude-opus-4-1', 'claude-sonnet-4-5', 'deepseek-r1'];
    
    for (const modelKey of expectedUsPrefix) {
      const model = this.config.modelRegistry[modelKey];
      
      if (!model) {
        this.addTestResult(`Model ID - ${modelKey}`, false, 'Model not found');
        continue;
      }

      if (model.modelId.startsWith('us.')) {
        this.addTestResult(`${modelKey} - us. Prefix`, true, `Correct: ${model.modelId}`);
      } else {
        this.addTestResult(`${modelKey} - us. Prefix`, false, `Should start with 'us.': ${model.modelId}`);
      }
    }
  }

  /**
   * Test BedrockInferenceProvider compatibility
   */
  testBedrockProviderCompatibility() {
    console.log('\n🔍 Testing BedrockInferenceProvider Compatibility...');

    // Simulate what BedrockInferenceProvider does
    const testModels = ['claude-opus-4-1', 'claude-sonnet-4-5', 'claude-3-5-sonnet-v1'];

    for (const modelKey of testModels) {
      const modelConfig = this.config.modelRegistry[modelKey];
      
      if (!modelConfig) {
        this.addTestResult(`Provider Compat - ${modelKey}`, false, 'Model not found');
        continue;
      }

      // Simulate the provider's ARN resolution logic
      const effectiveModelId = (modelConfig.requiresInferenceProfile && modelConfig.inferenceProfileArn)
        ? modelConfig.inferenceProfileArn
        : modelConfig.modelId;

      if (modelConfig.requiresInferenceProfile) {
        if (effectiveModelId === modelConfig.inferenceProfileArn) {
          this.addTestResult(
            `Provider - ${modelKey}`,
            true,
            `Will use ARN: ${effectiveModelId.substring(0, 60)}...`
          );
        } else {
          this.addTestResult(
            `Provider - ${modelKey}`,
            false,
            'ARN should be used but modelId would be used instead'
          );
        }
      } else {
        if (effectiveModelId === modelConfig.modelId) {
          this.addTestResult(
            `Provider - ${modelKey}`,
            true,
            `Will use modelId: ${effectiveModelId}`
          );
        } else {
          this.addTestResult(
            `Provider - ${modelKey}`,
            false,
            'Unexpected model ID resolution'
          );
        }
      }
    }
  }

  /**
   * Test deprecated models removed
   */
  testDeprecatedModelsRemoved() {
    console.log('\n🔍 Testing Deprecated Models Removed...');

    const shouldBeRemoved = ['claude-v2-1', 'claude-v2'];
    const models = Object.keys(this.config.modelRegistry);

    let allRemoved = true;
    for (const deprecatedKey of shouldBeRemoved) {
      if (models.includes(deprecatedKey)) {
        this.addTestResult(
          `Deprecated Model - ${deprecatedKey}`,
          false,
          'Deprecated model should be removed'
        );
        allRemoved = false;
      }
    }

    if (allRemoved) {
      this.addTestResult('Deprecated Models', true, 'All deprecated models removed');
    }
  }

  /**
   * Test configuration metadata
   */
  testConfigurationMetadata() {
    console.log('\n🔍 Testing Configuration Metadata...');

    if (!this.config.metadata) {
      this.addTestResult('Config Metadata', false, 'metadata section missing');
      return;
    }

    // Check version is updated
    if (this.config.metadata.version === '2.0.0') {
      this.addTestResult('Config Version', true, 'Version updated to 2.0.0');
    } else {
      this.addTestResult('Config Version', false, `Version should be 2.0.0, got: ${this.config.metadata.version}`);
    }

    // Check documentation reference
    if (this.config.metadata.documentation === 'docs/BEDROCK_INTEGRATION.md') {
      this.addTestResult('Documentation Reference', true, 'Correct documentation path');
    } else {
      this.addTestResult('Documentation Reference', false, 'Should reference docs/BEDROCK_INTEGRATION.md');
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, message) {
    this.testResults.tests.push({ testName, passed, message });
    
    if (passed) {
      this.testResults.passed++;
      console.log(`   ✅ ${testName}: ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`   ❌ ${testName}: ${message}`);
    }
  }

  /**
   * Generate summary report
   */
  generateReport() {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 DRY RUN TEST SUMMARY');
    console.log('═'.repeat(70));
    
    console.log(`\n✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    
    const totalTests = this.testResults.passed + this.testResults.failed;
    const successRate = totalTests > 0 ? ((this.testResults.passed / totalTests) * 100).toFixed(1) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.tests
        .filter(t => !t.passed)
        .forEach((test, i) => {
          console.log(`  ${i + 1}. ${test.testName}: ${test.message}`);
        });
    }

    console.log('\n' + '═'.repeat(70));
    
    if (this.testResults.failed === 0) {
      console.log('✅ ALL DRY RUN TESTS PASSED');
      console.log('\nConfiguration is ready for live testing with AWS credentials.');
      return true;
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('\nPlease fix the issues before proceeding with live tests.');
      return false;
    }
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('🚀 AWS Bedrock Configuration Dry Run Test');
    console.log('═'.repeat(70));
    
    if (!this.loadConfig()) {
      return false;
    }

    this.testModelRegistryStructure();
    this.testInferenceProfileARNs();
    this.testModelIdFormat();
    this.testBedrockProviderCompatibility();
    this.testDeprecatedModelsRemoved();
    this.testConfigurationMetadata();

    return this.generateReport();
  }
}

// Run tests
async function main() {
  const tester = new BedrockConfigDryRunTest();
  const passed = await tester.run();
  
  process.exit(passed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BedrockConfigDryRunTest;
