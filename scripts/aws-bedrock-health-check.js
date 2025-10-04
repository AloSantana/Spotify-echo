#!/usr/bin/env node

/**
 * AWS Bedrock Health Check Script
 * 
 * Quick validation of AWS Bedrock access and model availability.
 * Tests connectivity and basic model invocation without full test suite.
 * 
 * Usage:
 *   node scripts/aws-bedrock-health-check.js [--model <model-key>]
 * 
 * Options:
 *   --model <model-key>    Specific model to test (default: claude-sonnet-4-5)
 *   --region <region>      AWS region (default: us-east-1)
 *   --help                 Show help message
 */

const {
  BedrockRuntimeClient,
  InvokeModelCommand
} = require('@aws-sdk/client-bedrock-runtime');
const fs = require('fs').promises;
const path = require('path');

class BedrockHealthCheck {
  constructor(options = {}) {
    this.options = {
      region: options.region || process.env.AWS_REGION || 'us-east-1',
      modelKey: options.modelKey || 'claude-sonnet-4-5',
      timeout: options.timeout || 10000
    };

    this.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };

    this.client = null;
    this.config = null;
  }

  /**
   * Run health check
   */
  async run() {
    console.log('🏥 AWS Bedrock Health Check');
    console.log('═'.repeat(60));
    console.log('');

    try {
      // Step 1: Validate credentials
      if (!this.validateCredentials()) {
        return false;
      }

      // Step 2: Load configuration
      if (!await this.loadConfiguration()) {
        return false;
      }

      // Step 3: Initialize client
      if (!await this.initializeClient()) {
        return false;
      }

      // Step 4: Test model invocation
      if (!await this.testModelInvocation()) {
        return false;
      }

      console.log('');
      console.log('═'.repeat(60));
      console.log('✅ Health Check PASSED - AWS Bedrock is operational');
      console.log('═'.repeat(60));
      return true;

    } catch (error) {
      console.error('');
      console.error('═'.repeat(60));
      console.error('❌ Health Check FAILED');
      console.error(`Error: ${error.message}`);
      console.error('═'.repeat(60));
      return false;
    }
  }

  /**
   * Validate AWS credentials
   */
  validateCredentials() {
    console.log('1️⃣  Checking AWS Credentials...');
    
    if (!this.credentials.accessKeyId) {
      console.error('   ❌ AWS_ACCESS_KEY_ID not set');
      console.error('   Set environment variable: export AWS_ACCESS_KEY_ID=your_key');
      return false;
    }

    if (!this.credentials.secretAccessKey) {
      console.error('   ❌ AWS_SECRET_ACCESS_KEY not set');
      console.error('   Set environment variable: export AWS_SECRET_ACCESS_KEY=your_secret');
      return false;
    }

    console.log('   ✅ Credentials found');
    console.log(`   Region: ${this.options.region}`);
    console.log('');
    return true;
  }

  /**
   * Load model configuration
   */
  async loadConfiguration() {
    console.log('2️⃣  Loading Model Configuration...');
    
    const configPath = path.join(__dirname, '../config/aws-bedrock-models.json');
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      
      const modelCount = Object.keys(this.config.modelRegistry).length;
      console.log(`   ✅ Configuration loaded (${modelCount} models)`);
      console.log('');
      return true;
    } catch (error) {
      console.error(`   ❌ Failed to load configuration: ${error.message}`);
      console.error(`   Expected path: ${configPath}`);
      return false;
    }
  }

  /**
   * Initialize Bedrock client
   */
  async initializeClient() {
    console.log('3️⃣  Initializing AWS Bedrock Client...');
    
    try {
      this.client = new BedrockRuntimeClient({
        region: this.options.region,
        credentials: this.credentials
      });
      
      console.log('   ✅ Client initialized');
      console.log('');
      return true;
    } catch (error) {
      console.error(`   ❌ Failed to initialize client: ${error.message}`);
      return false;
    }
  }

  /**
   * Test model invocation
   */
  async testModelInvocation() {
    console.log('4️⃣  Testing Model Invocation...');
    
    const model = this.config.modelRegistry[this.options.modelKey];
    
    if (!model) {
      console.error(`   ❌ Model "${this.options.modelKey}" not found in configuration`);
      console.error('   Available models:', Object.keys(this.config.modelRegistry).join(', '));
      return false;
    }

    console.log(`   Testing: ${model.displayName}`);
    console.log(`   Model ID: ${model.modelId}`);

    try {
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Hello! Please respond with a brief greeting to confirm you are working.'
          }
        ],
        temperature: 0.7
      };

      const commandParams = {
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
      };

      // Use inference profile ARN if required
      if (model.requiresInferenceProfile && model.inferenceProfileArn) {
        commandParams.modelId = model.inferenceProfileArn;
        console.log(`   Using inference profile ARN`);
      }

      const startTime = Date.now();
      const command = new InvokeModelCommand(commandParams);
      const response = await this.client.send(command);
      const latency = Date.now() - startTime;

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = responseBody.content?.[0]?.text || '';

      console.log(`   ✅ Model invocation successful`);
      console.log(`   Latency: ${latency}ms`);
      console.log(`   Response length: ${responseText.length} characters`);
      
      if (responseBody.usage) {
        console.log(`   Input tokens: ${responseBody.usage.input_tokens || 0}`);
        console.log(`   Output tokens: ${responseBody.usage.output_tokens || 0}`);
      }
      
      console.log('');
      return true;

    } catch (error) {
      console.error(`   ❌ Model invocation failed: ${error.message}`);
      
      // Provide actionable error information
      if (error.message.includes('AccessDenied') || error.$metadata?.httpStatusCode === 403) {
        console.error('');
        console.error('   💡 Access Denied - Check IAM Permissions:');
        console.error('      1. Ensure IAM user/role has bedrock:InvokeModel permission');
        console.error('      2. Remove any explicit DENY policies for Bedrock');
        console.error('      3. Verify Bedrock service is enabled in AWS Console');
      } else if (error.message.includes('not found') || error.message.includes('ResourceNotFound')) {
        console.error('');
        console.error('   💡 Model Not Found:');
        console.error('      1. Enable the model in AWS Bedrock console');
        console.error('      2. Verify model is available in your region');
        console.error('      3. Request model access if required');
      } else if (error.message.includes('throttl') || error.$metadata?.httpStatusCode === 429) {
        console.error('');
        console.error('   💡 Rate Limiting:');
        console.error('      1. Wait a moment and try again');
        console.error('      2. Request quota increase if persistent');
      } else if (error.$metadata?.httpStatusCode >= 500) {
        console.error('');
        console.error('   💡 AWS Service Issue:');
        console.error('      1. Retry in a few moments');
        console.error('      2. Check AWS status page');
        console.error('      3. Contact AWS support if persistent');
      }
      
      return false;
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    region: null,
    modelKey: null
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--model' && args[i + 1]) {
      options.modelKey = args[++i];
    } else if (arg === '--region' && args[i + 1]) {
      options.region = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
AWS Bedrock Health Check

USAGE:
  node scripts/aws-bedrock-health-check.js [OPTIONS]

OPTIONS:
  --model <model-key>    Test specific model (default: claude-sonnet-4-5)
  --region <region>      AWS region (default: us-east-1)
  --help                 Show this help message

ENVIRONMENT VARIABLES:
  AWS_ACCESS_KEY_ID      AWS access key (required)
  AWS_SECRET_ACCESS_KEY  AWS secret key (required)
  AWS_REGION             AWS region (optional)

EXAMPLES:
  # Basic health check with default model
  node scripts/aws-bedrock-health-check.js

  # Test specific model
  node scripts/aws-bedrock-health-check.js --model claude-3-opus

  # Test in different region
  node scripts/aws-bedrock-health-check.js --region us-west-2

  # With explicit credentials
  AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy node scripts/aws-bedrock-health-check.js
      `);
      process.exit(0);
    }
  }

  const healthCheck = new BedrockHealthCheck(options);
  const passed = await healthCheck.run();
  
  process.exit(passed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = BedrockHealthCheck;
