#!/usr/bin/env node

/**
 * AWS Bedrock Production Integration Tests
 * 
 * Comprehensive integration tests for Claude 4.5 Sonnet and Claude 4.1 Opus.
 * Tests both basic and streaming invocations with proper error handling.
 * 
 * Usage:
 *   node scripts/aws-bedrock-integration-tests.js [--models <model1,model2>]
 * 
 * Environment:
 *   AWS_ACCESS_KEY_ID       AWS access key (required)
 *   AWS_SECRET_ACCESS_KEY   AWS secret key (required)
 *   AWS_REGION              AWS region (default: us-east-1)
 */

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand
} = require('@aws-sdk/client-bedrock-runtime');
const fs = require('fs').promises;
const path = require('path');

class BedrockIntegrationTests {
  constructor(options = {}) {
    this.options = {
      region: options.region || process.env.AWS_REGION || 'us-east-1',
      specificModels: options.specificModels || ['claude-sonnet-4-5', 'claude-opus-4-1'],
      maxRetries: options.maxRetries || 3
    };

    this.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };

    this.client = null;
    this.config = null;
    this.results = {
      timestamp: new Date().toISOString(),
      region: this.options.region,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  /**
   * Initialize test suite
   */
  async initialize() {
    console.log('🧪 AWS Bedrock Production Integration Tests');
    console.log('═'.repeat(60));
    console.log('');

    // Validate credentials
    if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
      throw new Error('AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    }

    // Load configuration
    const configPath = path.join(__dirname, '../config/aws-bedrock-models.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    this.config = JSON.parse(configContent);

    // Initialize client
    this.client = new BedrockRuntimeClient({
      region: this.options.region,
      credentials: this.credentials
    });

    console.log(`✅ Initialized (Region: ${this.options.region})`);
    console.log('');
  }

  /**
   * Retry helper with exponential backoff
   */
  async retry(fn, maxRetries = null) {
    const retries = maxRetries !== null ? maxRetries : this.options.maxRetries;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        const errorCode = error.$metadata?.httpStatusCode;
        if (errorCode >= 400 && errorCode < 500 && errorCode !== 429) {
          throw error;
        }

        if (attempt >= retries) {
          throw error;
        }

        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  /**
   * Test basic model invocation
   */
  async testBasicInvocation(modelKey) {
    const model = this.config.modelRegistry[modelKey];
    const testName = `${model.displayName} - Basic Invocation`;
    
    console.log(`🧪 ${testName}...`);

    try {
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: 'Write a concise explanation of AWS Bedrock in 2-3 sentences.'
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

      if (model.requiresInferenceProfile && model.inferenceProfileArn) {
        commandParams.modelId = model.inferenceProfileArn;
      }

      const startTime = Date.now();
      const response = await this.retry(async () => {
        const command = new InvokeModelCommand(commandParams);
        return await this.client.send(command);
      });
      const latency = Date.now() - startTime;

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = responseBody.content?.[0]?.text || '';

      if (!responseText || responseText.length < 50) {
        throw new Error('Response too short or empty');
      }

      console.log(`   ✅ PASSED (${latency}ms, ${responseText.length} chars)`);
      console.log(`      Tokens: ${responseBody.usage?.input_tokens || 0} in / ${responseBody.usage?.output_tokens || 0} out`);

      this.results.tests.push({
        name: testName,
        modelKey,
        status: 'passed',
        latency,
        responseLength: responseText.length,
        tokenUsage: responseBody.usage
      });

      this.results.summary.passed++;
      return true;

    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      this.results.tests.push({
        name: testName,
        modelKey,
        status: 'failed',
        error: error.message,
        errorCode: error.$metadata?.httpStatusCode
      });

      this.results.summary.failed++;
      return false;
    }
  }

  /**
   * Test streaming invocation
   */
  async testStreamingInvocation(modelKey) {
    const model = this.config.modelRegistry[modelKey];
    const testName = `${model.displayName} - Streaming Invocation`;
    
    console.log(`🧪 ${testName}...`);

    try {
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: 'List 5 benefits of using cloud services. Be concise.'
          }
        ],
        temperature: 0.5
      };

      const commandParams = {
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
      };

      if (model.requiresInferenceProfile && model.inferenceProfileArn) {
        commandParams.modelId = model.inferenceProfileArn;
      }

      const startTime = Date.now();
      const response = await this.retry(async () => {
        const command = new InvokeModelWithResponseStreamCommand(commandParams);
        return await this.client.send(command);
      });

      let fullText = '';
      let chunkCount = 0;

      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk) {
            const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
            
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              fullText += chunk.delta.text;
              chunkCount++;
            }
          }
        }
      }

      const latency = Date.now() - startTime;

      if (chunkCount === 0 || fullText.length < 50) {
        throw new Error('Streaming produced insufficient output');
      }

      console.log(`   ✅ PASSED (${latency}ms, ${chunkCount} chunks, ${fullText.length} chars)`);

      this.results.tests.push({
        name: testName,
        modelKey,
        status: 'passed',
        latency,
        chunkCount,
        responseLength: fullText.length
      });

      this.results.summary.passed++;
      return true;

    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      this.results.tests.push({
        name: testName,
        modelKey,
        status: 'failed',
        error: error.message,
        errorCode: error.$metadata?.httpStatusCode
      });

      this.results.summary.failed++;
      return false;
    }
  }

  /**
   * Test retry logic
   */
  async testRetryLogic(modelKey) {
    const model = this.config.modelRegistry[modelKey];
    const testName = `${model.displayName} - Retry Logic`;
    
    console.log(`🧪 ${testName}...`);

    try {
      // This test validates that the retry mechanism is properly configured
      // We don't force an error, but verify the retry helper is available
      
      let retryAttempts = 0;
      const testFn = async () => {
        retryAttempts++;
        if (retryAttempts < 2) {
          // Simulate a transient error on first attempt
          const error = new Error('Simulated throttling error');
          error.$metadata = { httpStatusCode: 429 };
          throw error;
        }
        return { success: true };
      };

      const result = await this.retry(testFn, 3);

      if (result.success && retryAttempts === 2) {
        console.log(`   ✅ PASSED (Retry worked after ${retryAttempts} attempts)`);
        
        this.results.tests.push({
          name: testName,
          modelKey,
          status: 'passed',
          retryAttempts
        });

        this.results.summary.passed++;
        return true;
      } else {
        throw new Error('Retry logic did not behave as expected');
      }

    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      this.results.tests.push({
        name: testName,
        modelKey,
        status: 'failed',
        error: error.message
      });

      this.results.summary.failed++;
      return false;
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(modelKey) {
    const model = this.config.modelRegistry[modelKey];
    const testName = `${model.displayName} - Error Handling`;
    
    console.log(`🧪 ${testName}...`);

    try {
      // Test with invalid parameters to verify error handling
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: -1, // Invalid: negative tokens
        messages: [
          {
            role: 'user',
            content: 'Test'
          }
        ]
      };

      const commandParams = {
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
      };

      try {
        const command = new InvokeModelCommand(commandParams);
        await this.client.send(command);
        
        // If we got here, the test failed (we expected an error)
        throw new Error('Expected validation error was not raised');
        
      } catch (error) {
        // We expect a validation error
        if (error.message.includes('validation') || 
            error.$metadata?.httpStatusCode === 400) {
          console.log(`   ✅ PASSED (Properly handled validation error)`);
          
          this.results.tests.push({
            name: testName,
            modelKey,
            status: 'passed',
            note: 'Validation error properly caught'
          });

          this.results.summary.passed++;
          return true;
        } else {
          throw error;
        }
      }

    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      this.results.tests.push({
        name: testName,
        modelKey,
        status: 'failed',
        error: error.message
      });

      this.results.summary.failed++;
      return false;
    }
  }

  /**
   * Run all tests for a specific model
   */
  async testModel(modelKey) {
    console.log('');
    console.log('─'.repeat(60));
    console.log(`Testing: ${modelKey}`);
    console.log('─'.repeat(60));

    await this.testBasicInvocation(modelKey);
    await this.testStreamingInvocation(modelKey);
    await this.testRetryLogic(modelKey);
    await this.testErrorHandling(modelKey);
  }

  /**
   * Run all integration tests
   */
  async runTests() {
    await this.initialize();

    for (const modelKey of this.options.specificModels) {
      if (!this.config.modelRegistry[modelKey]) {
        console.warn(`⚠️  Model ${modelKey} not found in configuration, skipping`);
        continue;
      }

      await this.testModel(modelKey);
      this.results.summary.total = this.results.tests.length;
    }

    await this.generateReport();
    return this.results.summary.failed === 0;
  }

  /**
   * Generate test report
   */
  async generateReport() {
    console.log('');
    console.log('═'.repeat(60));
    console.log('Integration Test Results');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log('');

    // Save results
    const resultsDir = path.join(__dirname, '../test-results');
    await fs.mkdir(resultsDir, { recursive: true });

    const timestamp = Date.now();
    const jsonPath = path.join(resultsDir, `bedrock-integration-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
    
    console.log(`Results saved: ${jsonPath}`);
    console.log('');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--models' && args[i + 1]) {
      options.specificModels = args[++i].split(',');
    } else if (args[i] === '--region' && args[i + 1]) {
      options.region = args[++i];
    } else if (args[i] === '--help') {
      console.log(`
AWS Bedrock Production Integration Tests

USAGE:
  node scripts/aws-bedrock-integration-tests.js [OPTIONS]

OPTIONS:
  --models <model1,model2>   Comma-separated model keys to test
                             (default: claude-sonnet-4-5,claude-opus-4-1)
  --region <region>          AWS region (default: us-east-1)
  --help                     Show this help message

ENVIRONMENT VARIABLES:
  AWS_ACCESS_KEY_ID          AWS access key (required)
  AWS_SECRET_ACCESS_KEY      AWS secret key (required)
  AWS_REGION                 AWS region (optional)

EXAMPLES:
  # Test default models (Claude Sonnet 4.5 and Opus 4.1)
  node scripts/aws-bedrock-integration-tests.js

  # Test specific models
  node scripts/aws-bedrock-integration-tests.js --models claude-3-5-sonnet-v2

  # Test in different region
  node scripts/aws-bedrock-integration-tests.js --region us-west-2
      `);
      process.exit(0);
    }
  }

  const tests = new BedrockIntegrationTests(options);
  const passed = await tests.runTests();

  process.exit(passed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BedrockIntegrationTests;
