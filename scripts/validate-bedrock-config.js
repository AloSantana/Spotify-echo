#!/usr/bin/env node

/**
 * AWS Bedrock Configuration Validator
 * 
 * Validates the bedrock-models.json configuration and ensures:
 * - All required models are present
 * - Model IDs follow correct format (us. prefix for new models)
 * - Inference profile ARNs are correctly specified
 * - No deprecated models remain (unless explicitly marked)
 * - Configuration structure is valid
 * 
 * Usage:
 *   node scripts/validate-bedrock-config.js
 */

const fs = require('fs');
const path = require('path');

class BedrockConfigValidator {
  constructor() {
    this.configPath = path.join(__dirname, '../config/aws-bedrock-models.json');
    this.config = null;
    this.errors = [];
    this.warnings = [];
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  /**
   * Load and parse configuration
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log('✅ Configuration loaded successfully');
      return true;
    } catch (error) {
      this.errors.push(`Failed to load configuration: ${error.message}`);
      console.error('❌ Failed to load configuration:', error.message);
      return false;
    }
  }

  /**
   * Validate required models are present
   */
  validateRequiredModels() {
    console.log('\n🔍 Validating Required Models...');
    
    const requiredModels = [
      'claude-opus-4-1',
      'claude-sonnet-4-5',
      'deepseek-r1',
      'claude-3-5-sonnet-v1',
      'claude-3-5-sonnet-v2',
      'claude-3-5-haiku',
      'claude-3-sonnet'
    ];

    const modelRegistry = this.config.modelRegistry || {};
    const presentModels = Object.keys(modelRegistry);

    for (const modelKey of requiredModels) {
      if (presentModels.includes(modelKey)) {
        console.log(`  ✅ ${modelKey} - Present`);
        this.validationResults.passed++;
      } else {
        const error = `Required model missing: ${modelKey}`;
        this.errors.push(error);
        console.error(`  ❌ ${error}`);
        this.validationResults.failed++;
      }
    }
  }

  /**
   * Validate deprecated models are removed
   */
  validateDeprecatedModels() {
    console.log('\n🔍 Checking for Deprecated Models...');
    
    const deprecatedModels = ['claude-v2-1', 'claude-v2'];
    const modelRegistry = this.config.modelRegistry || {};
    const presentModels = Object.keys(modelRegistry);

    let found = false;
    for (const modelKey of deprecatedModels) {
      if (presentModels.includes(modelKey)) {
        const warning = `Deprecated model found: ${modelKey}`;
        this.warnings.push(warning);
        console.warn(`  ⚠️  ${warning}`);
        this.validationResults.warnings++;
        found = true;
      }
    }

    if (!found) {
      console.log('  ✅ No deprecated models found');
      this.validationResults.passed++;
    }
  }

  /**
   * Validate model ID format
   */
  validateModelIdFormat() {
    console.log('\n🔍 Validating Model ID Format...');
    
    const modelRegistry = this.config.modelRegistry || {};
    
    for (const [modelKey, modelConfig] of Object.entries(modelRegistry)) {
      const modelId = modelConfig.modelId;
      
      // Claude 4.x and DeepSeek should use us. prefix
      if (modelKey.startsWith('claude-opus-4') || 
          modelKey.startsWith('claude-sonnet-4') || 
          modelKey.startsWith('deepseek')) {
        
        if (modelId.startsWith('us.')) {
          console.log(`  ✅ ${modelKey} - Correct format (${modelId})`);
          this.validationResults.passed++;
        } else {
          const error = `${modelKey} - Incorrect format. Should start with 'us.' (got: ${modelId})`;
          this.errors.push(error);
          console.error(`  ❌ ${error}`);
          this.validationResults.failed++;
        }
      } else {
        // Other models can use either format
        console.log(`  ℹ️  ${modelKey} - Format: ${modelId}`);
      }
    }
  }

  /**
   * Validate inference profile ARNs
   */
  validateInferenceProfiles() {
    console.log('\n🔍 Validating Inference Profile ARNs...');
    
    const modelRegistry = this.config.modelRegistry || {};
    
    const modelsRequiringArn = ['claude-opus-4-1', 'claude-sonnet-4-5', 'deepseek-r1'];
    
    for (const modelKey of modelsRequiringArn) {
      const modelConfig = modelRegistry[modelKey];
      
      if (!modelConfig) {
        const error = `Model ${modelKey} not found in registry`;
        this.errors.push(error);
        console.error(`  ❌ ${error}`);
        this.validationResults.failed++;
        continue;
      }

      // Check requiresInferenceProfile flag
      if (!modelConfig.requiresInferenceProfile) {
        const error = `${modelKey} - requiresInferenceProfile should be true`;
        this.errors.push(error);
        console.error(`  ❌ ${error}`);
        this.validationResults.failed++;
      }

      // Check inferenceProfileArn is present
      if (!modelConfig.inferenceProfileArn) {
        const error = `${modelKey} - Missing inferenceProfileArn`;
        this.errors.push(error);
        console.error(`  ❌ ${error}`);
        this.validationResults.failed++;
      } else {
        // Validate ARN format - allow alphanumeric, dots, hyphens, and colons
        const arnPattern = /^arn:aws:bedrock:[a-z0-9-]+:\d+:inference-profile\/[a-z0-9.:-]+$/;
        if (arnPattern.test(modelConfig.inferenceProfileArn)) {
          console.log(`  ✅ ${modelKey} - Valid ARN: ${modelConfig.inferenceProfileArn}`);
          this.validationResults.passed++;
        } else {
          const error = `${modelKey} - Invalid ARN format: ${modelConfig.inferenceProfileArn}`;
          this.errors.push(error);
          console.error(`  ❌ ${error}`);
          this.validationResults.failed++;
        }
      }
    }
  }

  /**
   * Validate model metadata
   */
  validateModelMetadata() {
    console.log('\n🔍 Validating Model Metadata...');
    
    const modelRegistry = this.config.modelRegistry || {};
    const requiredFields = ['modelId', 'displayName', 'provider', 'family', 'capabilities', 
                           'contextWindow', 'maxOutputTokens', 'requiresInferenceProfile', 
                           'regions', 'deprecated', 'priority'];
    
    for (const [modelKey, modelConfig] of Object.entries(modelRegistry)) {
      let modelValid = true;
      
      for (const field of requiredFields) {
        if (!(field in modelConfig)) {
          const error = `${modelKey} - Missing required field: ${field}`;
          this.errors.push(error);
          console.error(`  ❌ ${error}`);
          this.validationResults.failed++;
          modelValid = false;
        }
      }
      
      if (modelValid) {
        console.log(`  ✅ ${modelKey} - All required fields present`);
        this.validationResults.passed++;
      }
    }
  }

  /**
   * Validate configuration metadata
   */
  validateConfigMetadata() {
    console.log('\n🔍 Validating Configuration Metadata...');
    
    if (!this.config.metadata) {
      const error = 'Missing metadata section';
      this.errors.push(error);
      console.error(`  ❌ ${error}`);
      this.validationResults.failed++;
      return;
    }

    const metadata = this.config.metadata;
    const requiredMetadata = ['version', 'lastUpdated', 'maintainer', 'documentation'];
    
    for (const field of requiredMetadata) {
      if (field in metadata) {
        console.log(`  ✅ ${field}: ${metadata[field]}`);
        this.validationResults.passed++;
      } else {
        const error = `Missing metadata field: ${field}`;
        this.errors.push(error);
        console.error(`  ❌ ${error}`);
        this.validationResults.failed++;
      }
    }
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 VALIDATION REPORT');
    console.log('═'.repeat(70));
    
    console.log(`\n✅ Passed: ${this.validationResults.passed}`);
    console.log(`❌ Failed: ${this.validationResults.failed}`);
    console.log(`⚠️  Warnings: ${this.validationResults.warnings}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }
    
    const modelCount = Object.keys(this.config.modelRegistry || {}).length;
    console.log(`\n📦 Total Models: ${modelCount}`);
    
    console.log('\n' + '═'.repeat(70));
    
    if (this.validationResults.failed === 0) {
      console.log('✅ VALIDATION PASSED');
      return true;
    } else {
      console.log('❌ VALIDATION FAILED');
      return false;
    }
  }

  /**
   * Run all validations
   */
  async run() {
    console.log('🚀 AWS Bedrock Configuration Validator');
    console.log('═'.repeat(70));
    
    if (!this.loadConfig()) {
      return false;
    }

    this.validateRequiredModels();
    this.validateDeprecatedModels();
    this.validateModelIdFormat();
    this.validateInferenceProfiles();
    this.validateModelMetadata();
    this.validateConfigMetadata();
    
    return this.generateReport();
  }
}

// Run validator
async function main() {
  const validator = new BedrockConfigValidator();
  const passed = await validator.run();
  
  process.exit(passed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BedrockConfigValidator;
