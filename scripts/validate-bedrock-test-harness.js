#!/usr/bin/env node

/**
 * Validation Test for AWS Bedrock Comprehensive Test Harness
 * 
 * This test validates the structure and configuration without requiring AWS SDK.
 * It checks:
 * - Configuration file validity
 * - Model registry structure
 * - Test harness imports and structure
 */

const fs = require('fs').promises;
const path = require('path');

class ValidationTest {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const icons = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    };
    console.log(`${icons[type] || 'ℹ️'} ${message}`);
  }

  async validateConfigFile() {
    this.log('Validating configuration file...', 'info');
    
    try {
      const configPath = path.join(__dirname, '../config/aws-bedrock-models.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Check required sections
      const requiredSections = ['modelRegistry', 'testConfiguration', 'testPrompts', 'metadata'];
      for (const section of requiredSections) {
        if (!config[section]) {
          throw new Error(`Missing required section: ${section}`);
        }
      }

      // Validate model registry
      const models = Object.keys(config.modelRegistry);
      if (models.length === 0) {
        throw new Error('Model registry is empty');
      }

      this.log(`Configuration valid: ${models.length} models defined`, 'success');
      
      // Validate each model entry
      let validModels = 0;
      let invalidModels = 0;

      for (const [key, model] of Object.entries(config.modelRegistry)) {
        const requiredFields = ['modelId', 'displayName', 'provider', 'family', 'priority'];
        const missingFields = requiredFields.filter(field => !model[field]);
        
        if (missingFields.length > 0) {
          this.log(`Model ${key} missing fields: ${missingFields.join(', ')}`, 'warning');
          this.results.warnings.push(`Model ${key} incomplete`);
          invalidModels++;
        } else {
          validModels++;
        }
      }

      this.log(`Model validation: ${validModels} valid, ${invalidModels} warnings`, validModels > 0 ? 'success' : 'warning');
      this.results.passed.push('Configuration file validation');
      
      return config;
    } catch (error) {
      this.log(`Configuration validation failed: ${error.message}`, 'error');
      this.results.failed.push(`Configuration validation: ${error.message}`);
      throw error;
    }
  }

  async validateTestScript() {
    this.log('Validating test script structure...', 'info');
    
    try {
      const scriptPath = path.join(__dirname, '../scripts/test-aws-bedrock-comprehensive.js');
      const scriptContent = await fs.readFile(scriptPath, 'utf-8');

      // Check for required components
      const requiredComponents = [
        'class ComprehensiveBedrockTestHarness',
        'async initialize()',
        'async loadConfiguration()',
        'async testBasicTextGeneration',
        'async testStreamingResponse',
        'async testParameterVariations',
        'async runAllTests()',
        'generateRecommendations()',
        'parseArgs()'
      ];

      const missingComponents = requiredComponents.filter(comp => !scriptContent.includes(comp));
      
      if (missingComponents.length > 0) {
        throw new Error(`Missing components: ${missingComponents.join(', ')}`);
      }

      // Check for inference profile ARN support
      if (!scriptContent.includes('inferenceProfileArn') || !scriptContent.includes('requiresInferenceProfile')) {
        throw new Error('Missing inference profile ARN support');
      }

      this.log('Test script structure valid', 'success');
      this.results.passed.push('Test script structure validation');
    } catch (error) {
      this.log(`Test script validation failed: ${error.message}`, 'error');
      this.results.failed.push(`Test script validation: ${error.message}`);
      throw error;
    }
  }

  async validateDocumentation() {
    this.log('Validating documentation...', 'info');
    
    try {
      const docPath = path.join(__dirname, '../docs/AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md');
      const docContent = await fs.readFile(docPath, 'utf-8');

      // Check for required sections
      const requiredSections = [
        '## Quick Start',
        '## Command Line Options',
        '## Configuration File',
        '## Test Types',
        '## Output and Reports',
        '## Error Handling',
        '## Adding New Models',
        '## Inference Profile ARN Support',
        '## Troubleshooting'
      ];

      const missingSections = requiredSections.filter(section => !docContent.includes(section));
      
      if (missingSections.length > 0) {
        this.results.warnings.push(`Documentation missing sections: ${missingSections.join(', ')}`);
      }

      this.log('Documentation structure valid', 'success');
      this.results.passed.push('Documentation validation');
    } catch (error) {
      this.log(`Documentation validation failed: ${error.message}`, 'error');
      this.results.failed.push(`Documentation validation: ${error.message}`);
    }
  }

  async validateNpmScripts() {
    this.log('Validating NPM scripts...', 'info');
    
    try {
      const packagePath = path.join(__dirname, '../package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      const requiredScripts = [
        'test:bedrock',
        'test:bedrock:verbose',
        'test:bedrock:deprecated',
        'test:bedrock:quick',
        'test:bedrock:legacy'
      ];

      const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
      
      if (missingScripts.length > 0) {
        throw new Error(`Missing NPM scripts: ${missingScripts.join(', ')}`);
      }

      this.log('NPM scripts configuration valid', 'success');
      this.results.passed.push('NPM scripts validation');
    } catch (error) {
      this.log(`NPM scripts validation failed: ${error.message}`, 'error');
      this.results.failed.push(`NPM scripts validation: ${error.message}`);
    }
  }

  async validateShellScript() {
    this.log('Validating shell script wrapper...', 'info');
    
    try {
      const shellPath = path.join(__dirname, '../scripts/test-aws-bedrock-comprehensive.sh');
      const stats = await fs.stat(shellPath);
      
      // Check if executable
      const isExecutable = (stats.mode & 0o111) !== 0;
      if (!isExecutable) {
        this.results.warnings.push('Shell script is not executable');
      }

      const shellContent = await fs.readFile(shellPath, 'utf-8');
      
      // Check for required components
      if (!shellContent.includes('#!/bin/bash')) {
        throw new Error('Missing shebang');
      }

      this.log('Shell script wrapper valid', 'success');
      this.results.passed.push('Shell script validation');
    } catch (error) {
      this.log(`Shell script validation failed: ${error.message}`, 'error');
      this.results.failed.push(`Shell script validation: ${error.message}`);
    }
  }

  async testConfigurationLoading() {
    this.log('Testing configuration loading logic...', 'info');
    
    try {
      const config = await this.validateConfigFile();
      
      // Test model filtering logic
      const nonDeprecatedModels = Object.entries(config.modelRegistry)
        .filter(([, model]) => !model.deprecated);
      
      this.log(`Non-deprecated models: ${nonDeprecatedModels.length}`, 'info');
      
      // Test region filtering
      const usEast1Models = Object.entries(config.modelRegistry)
        .filter(([, model]) => model.regions?.includes('us-east-1') || !model.regions);
      
      this.log(`Models available in us-east-1: ${usEast1Models.length}`, 'info');
      
      // Test priority sorting
      const sortedModels = Object.entries(config.modelRegistry)
        .sort(([, a], [, b]) => a.priority - b.priority);
      
      this.log(`Highest priority model: ${sortedModels[0][1].displayName}`, 'info');
      
      this.results.passed.push('Configuration loading logic');
    } catch (error) {
      this.log(`Configuration loading test failed: ${error.message}`, 'error');
      this.results.failed.push(`Configuration loading: ${error.message}`);
    }
  }

  async runAllValidations() {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('AWS BEDROCK TEST HARNESS VALIDATION', 'info');
    this.log('='.repeat(80) + '\n', 'info');

    await this.validateConfigFile();
    await this.validateTestScript();
    await this.validateDocumentation();
    await this.validateNpmScripts();
    await this.validateShellScript();
    await this.testConfigurationLoading();

    this.log('\n' + '='.repeat(80), 'info');
    this.log('VALIDATION SUMMARY', 'info');
    this.log('='.repeat(80) + '\n', 'info');

    this.log(`Passed: ${this.results.passed.length}`, 'success');
    this.results.passed.forEach(test => {
      this.log(`  ✓ ${test}`, 'success');
    });

    if (this.results.warnings.length > 0) {
      this.log(`\nWarnings: ${this.results.warnings.length}`, 'warning');
      this.results.warnings.forEach(warning => {
        this.log(`  ⚠ ${warning}`, 'warning');
      });
    }

    if (this.results.failed.length > 0) {
      this.log(`\nFailed: ${this.results.failed.length}`, 'error');
      this.results.failed.forEach(failure => {
        this.log(`  ✗ ${failure}`, 'error');
      });
    }

    this.log('\n' + '='.repeat(80) + '\n', 'info');

    if (this.results.failed.length > 0) {
      this.log('Validation FAILED', 'error');
      process.exit(1);
    } else {
      this.log('All validations PASSED!', 'success');
      this.log('\nThe test harness is ready to use.', 'info');
      this.log('Install AWS SDK to run actual tests:', 'info');
      this.log('  npm install @aws-sdk/client-bedrock-runtime', 'info');
      process.exit(0);
    }
  }
}

// Run validation
const validator = new ValidationTest();
validator.runAllValidations().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});
