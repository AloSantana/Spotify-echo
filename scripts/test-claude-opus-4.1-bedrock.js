#!/usr/bin/env node
/**
 * Comprehensive Claude Opus 4.1 AWS Bedrock Integration Test
 * Tests all aspects of the Claude Opus 4.1 AWS Bedrock integration
 * 
 * This replaces the Vertex AI test with Bedrock-only validation
 */

const BedrockInferenceProvider = require('../src/infra/BedrockInferenceProvider');

class ClaudeOpus41BedrockTest {
  constructor() {
    this.results = {
      configValidation: null,
      providerInit: null,
      basicCompletion: null,
      inferenceProfileValidation: null,
      codingCapabilities: null,
      tokenTracking: null,
      overall: null
    };
  }

  log(message) {
    console.log(message);
  }

  async testConfigValidation() {
    this.log('🔍 Testing AWS Bedrock Configuration...');
    
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, '..', 'config', 'aws-bedrock-models.json');
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check if Claude Opus 4.1 is in the registry
      const claudeOpusModel = config.modelRegistry['claude-3-opus'];
      
      if (!claudeOpusModel) {
        throw new Error('Claude Opus 4.1 not found in model registry');
      }
      
      // Validate required fields
      const requiredFields = ['modelId', 'displayName', 'provider', 'requiresInferenceProfile', 'inferenceProfileArn'];
      const missingFields = requiredFields.filter(field => !claudeOpusModel.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Validate inference profile ARN
      if (claudeOpusModel.requiresInferenceProfile && !claudeOpusModel.inferenceProfileArn) {
        throw new Error('Model requires inference profile but ARN is missing');
      }
      
      this.log('✅ Configuration Validation: Claude Opus 4.1 properly configured');
      this.log(`   - Model ID: ${claudeOpusModel.modelId}`);
      this.log(`   - Display Name: ${claudeOpusModel.displayName}`);
      this.log(`   - Provider: ${claudeOpusModel.provider}`);
      this.log(`   - Requires Inference Profile: ${claudeOpusModel.requiresInferenceProfile}`);
      this.log(`   - Inference Profile ARN: ${claudeOpusModel.inferenceProfileArn}`);
      this.log(`   - Context Window: ${claudeOpusModel.contextWindow}`);
      this.log(`   - Max Output Tokens: ${claudeOpusModel.maxOutputTokens}`);
      
      this.results.configValidation = { 
        status: 'success', 
        model: claudeOpusModel 
      };
      
    } catch (error) {
      this.log(`❌ Configuration validation failed: ${error.message}`);
      this.results.configValidation = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  async testProviderInitialization() {
    this.log('\n🚀 Testing AWS Bedrock Provider Initialization...');
    
    try {
      const provider = new BedrockInferenceProvider({
        region: process.env.AWS_REGION || 'us-east-1',
        defaultModel: 'claude-3-opus',
        enableCaching: true,
        maxRetries: 3
      });

      await provider.initialize();
      
      // Check available models
      const availableModels = provider.getAvailableModels();
      const claudeOpus = availableModels.find(m => m.key === 'claude-3-opus');
      
      if (!claudeOpus) {
        throw new Error('Claude Opus 4.1 not available in provider');
      }

      this.log('✅ Provider Initialization: Successfully initialized');
      this.log(`   - Region: ${provider.config.region}`);
      this.log(`   - Models Loaded: ${availableModels.length}`);
      this.log(`   - Claude Opus 4.1: Available`);
      this.log(`   - Caching Enabled: ${provider.config.enableCaching}`);
      
      this.results.providerInit = { 
        status: 'success', 
        modelsCount: availableModels.length,
        provider: 'bedrock' 
      };
      
    } catch (error) {
      this.log(`❌ Provider initialization failed: ${error.message}`);
      this.results.providerInit = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  async testBasicCompletion() {
    this.log('\n📝 Testing Basic Completion with Claude Opus 4.1...');
    
    if (!process.env.AWS_ACCESS_KEY_ID) {
      this.log('⏭️  Skipping live test - AWS credentials not configured');
      this.results.basicCompletion = { 
        status: 'skipped', 
        reason: 'No AWS credentials' 
      };
      return;
    }

    try {
      const provider = new BedrockInferenceProvider({
        region: process.env.AWS_REGION || 'us-east-1',
        enableCaching: true
      });

      await provider.initialize();

      const testPrompt = 'Hello! Please confirm you are Claude Opus 4.1 from AWS Bedrock. Respond with your model name and a brief description of your capabilities.';
      
      const startTime = Date.now();
      const result = await provider.predict('claude-3-opus', testPrompt, {
        maxTokens: 200,
        temperature: 0.7
      });
      const latency = Date.now() - startTime;

      this.log('✅ Basic Completion: Response received');
      this.log(`   - Latency: ${latency}ms`);
      this.log(`   - Input Tokens: ${result.usage.input_tokens}`);
      this.log(`   - Output Tokens: ${result.usage.output_tokens}`);
      this.log(`   - Cached: ${result.cached}`);
      this.log(`   - Response: "${result.text.substring(0, 100)}..."`);
      
      this.results.basicCompletion = { 
        status: 'success', 
        latency, 
        usage: result.usage,
        responseLength: result.text.length
      };
      
    } catch (error) {
      this.log(`❌ Basic completion test failed: ${error.message}`);
      this.results.basicCompletion = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  async testInferenceProfileValidation() {
    this.log('\n🔐 Testing Inference Profile ARN Usage...');
    
    if (!process.env.AWS_ACCESS_KEY_ID) {
      this.log('⏭️  Skipping inference profile test - AWS credentials not configured');
      this.results.inferenceProfileValidation = { 
        status: 'skipped', 
        reason: 'No AWS credentials' 
      };
      return;
    }

    try {
      const provider = new BedrockInferenceProvider({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      await provider.initialize();

      // Get the model config to verify inference profile ARN
      const modelConfig = provider.models.get('claude-3-opus');
      
      if (!modelConfig) {
        throw new Error('Claude Opus 4.1 not found in loaded models');
      }

      const config = provider.config.modelConfig['claude-3-opus'];
      
      if (!config.requiresInferenceProfile) {
        throw new Error('Claude Opus 4.1 should require inference profile');
      }

      if (!config.inferenceProfileArn) {
        throw new Error('Inference profile ARN not configured');
      }

      this.log('✅ Inference Profile Validation: Configured correctly');
      this.log(`   - Requires Inference Profile: ${config.requiresInferenceProfile}`);
      this.log(`   - Inference Profile ARN: ${config.inferenceProfileArn}`);
      this.log(`   - Region: ${provider.config.region}`);
      
      this.results.inferenceProfileValidation = { 
        status: 'success',
        arnConfigured: true,
        arn: config.inferenceProfileArn
      };
      
    } catch (error) {
      this.log(`❌ Inference profile validation failed: ${error.message}`);
      this.results.inferenceProfileValidation = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  async testCodingCapabilities() {
    this.log('\n💻 Testing Coding Capabilities...');
    
    if (!process.env.AWS_ACCESS_KEY_ID) {
      this.log('⏭️  Skipping coding test - AWS credentials not configured');
      this.results.codingCapabilities = { 
        status: 'skipped', 
        reason: 'No AWS credentials' 
      };
      return;
    }

    try {
      const provider = new BedrockInferenceProvider({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      await provider.initialize();

      const codingTask = `Write a simple JavaScript function that takes an array of music tracks with properties: name, artist, genre, energy_level (0-1), and returns the top 3 tracks sorted by energy level. Include JSDoc comments.`;

      const result = await provider.predict('claude-3-opus', codingTask, {
        maxTokens: 500,
        temperature: 0.3
      });

      // Check if response contains code
      const hasCode = result.text.includes('function') || result.text.includes('const');
      const hasJSDoc = result.text.includes('/**') || result.text.includes('* @');

      this.log('✅ Coding Capabilities: Response received');
      this.log(`   - Contains Code: ${hasCode}`);
      this.log(`   - Contains JSDoc: ${hasJSDoc}`);
      this.log(`   - Response Length: ${result.text.length} characters`);
      this.log(`   - Input Tokens: ${result.usage.input_tokens}`);
      this.log(`   - Output Tokens: ${result.usage.output_tokens}`);
      
      this.results.codingCapabilities = { 
        status: 'success',
        hasCode,
        hasJSDoc,
        usage: result.usage
      };
      
    } catch (error) {
      this.log(`❌ Coding capabilities test failed: ${error.message}`);
      this.results.codingCapabilities = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  async testTokenTracking() {
    this.log('\n📊 Testing Token Tracking and Cost Calculation...');
    
    if (!process.env.AWS_ACCESS_KEY_ID) {
      this.log('⏭️  Skipping token tracking test - AWS credentials not configured');
      this.results.tokenTracking = { 
        status: 'skipped', 
        reason: 'No AWS credentials' 
      };
      return;
    }

    try {
      const provider = new BedrockInferenceProvider({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      await provider.initialize();

      const testPrompt = 'Count from 1 to 5.';
      
      const result = await provider.predict('claude-3-opus', testPrompt, {
        maxTokens: 100
      });

      // Calculate cost (Claude Opus 4.1 pricing)
      const inputCost = (result.usage.input_tokens / 1000) * 0.015;
      const outputCost = (result.usage.output_tokens / 1000) * 0.075;
      const totalCost = inputCost + outputCost;

      this.log('✅ Token Tracking: Metrics collected');
      this.log(`   - Input Tokens: ${result.usage.input_tokens}`);
      this.log(`   - Output Tokens: ${result.usage.output_tokens}`);
      this.log(`   - Input Cost: $${inputCost.toFixed(6)}`);
      this.log(`   - Output Cost: $${outputCost.toFixed(6)}`);
      this.log(`   - Total Cost: $${totalCost.toFixed(6)}`);
      
      this.results.tokenTracking = { 
        status: 'success',
        usage: result.usage,
        cost: totalCost
      };
      
    } catch (error) {
      this.log(`❌ Token tracking test failed: ${error.message}`);
      this.results.tokenTracking = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  async runFullTest() {
    this.log('🔬 Claude Opus 4.1 AWS Bedrock Integration Test Suite');
    this.log('='.repeat(80));
    this.log('Provider: AWS Bedrock (provider=bedrock)');
    this.log('No Vertex AI dependencies\n');
    
    await this.testConfigValidation();
    await this.testProviderInitialization();
    await this.testBasicCompletion();
    await this.testInferenceProfileValidation();
    await this.testCodingCapabilities();
    await this.testTokenTracking();
    
    // Determine overall result
    const testResults = Object.values(this.results).filter(r => r !== null);
    const failed = testResults.filter(r => r.status === 'failed');
    const passed = testResults.filter(r => r.status === 'success');
    const skipped = testResults.filter(r => r.status === 'skipped');
    
    this.log('\n' + '='.repeat(80));
    this.log('📊 TEST SUMMARY');
    this.log('='.repeat(80));
    this.log(`✅ Passed: ${passed.length}`);
    this.log(`❌ Failed: ${failed.length}`);
    this.log(`⏭️  Skipped: ${skipped.length}`);
    
    if (failed.length === 0) {
      this.log('\n✅ All tests passed!');
      this.results.overall = 'success';
    } else {
      this.log('\n❌ Some tests failed:');
      failed.forEach(result => {
        this.log(`   - ${result.error}`);
      });
      this.results.overall = 'failed';
    }
    
    // Save results
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '..', 'test-results', 'claude-opus-41-bedrock-test.json');
    
    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      this.log(`\n💾 Test results saved to: ${reportPath}`);
    } catch (error) {
      this.log(`\n⚠️  Could not save results: ${error.message}`);
    }
    
    return this.results;
  }
}

// CLI execution
if (require.main === module) {
  const tester = new ClaudeOpus41BedrockTest();
  tester.runFullTest()
    .then(results => {
      process.exit(results.overall === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ClaudeOpus41BedrockTest;
