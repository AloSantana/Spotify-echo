#!/usr/bin/env node

/**
 * Comprehensive AWS Bedrock Model Test Harness
 * 
 * This script provides a robust testing framework for AWS Bedrock models with:
 * - Configurable model registry with inference profile ARN support
 * - Detailed logging and validation per model
 * - Error handling with actionable insights
 * - Support for streaming and non-streaming tests
 * - Parameter variation testing
 * - Comprehensive reporting
 * 
 * Usage:
 *   node scripts/test-aws-bedrock-comprehensive.js [options]
 * 
 * Options:
 *   --region <region>         AWS region (default: us-east-1)
 *   --include-deprecated      Include deprecated models in tests
 *   --models <model-keys>     Test specific models (comma-separated)
 *   --skip-streaming          Skip streaming tests
 *   --skip-variations         Skip parameter variation tests
 *   --config <path>           Custom model configuration file
 *   --verbose                 Enable verbose logging
 */

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand
} = require('@aws-sdk/client-bedrock-runtime');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveBedrockTestHarness {
  constructor(options = {}) {
    this.options = {
      region: options.region || process.env.AWS_REGION || 'us-east-1',
      includeDeprecated: options.includeDeprecated || false,
      specificModels: options.specificModels || null,
      skipStreaming: options.skipStreaming || false,
      skipVariations: options.skipVariations || false,
      configPath: options.configPath || path.join(__dirname, '../config/aws-bedrock-models.json'),
      verbose: options.verbose || false,
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
      overall: 'pending',
      summary: {
        totalModels: 0,
        testedModels: 0,
        successfulModels: 0,
        failedModels: 0,
        skippedModels: 0
      },
      modelResults: {},
      errors: [],
      warnings: [],
      recommendations: [],
      metadata: {
        testDuration: 0,
        configVersion: null
      }
    };
  }

  /**
   * Invoke model with retry logic and exponential backoff
   * @param {Object} client - AWS Bedrock client
   * @param {Object} params - Command parameters
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<Object>} Response from the model
   */
  async invokeModelWithRetry(client, params, maxRetries = null) {
    const retries = maxRetries !== null ? maxRetries : this.options.maxRetries;
    let lastError = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const command = new InvokeModelCommand(params);
        const response = await client.send(command);
        
        if (attempt > 0) {
          this.log(`✓ Succeeded on retry attempt ${attempt}`, 'success');
        }
        
        return response;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        const errorMessage = error.message || '';
        const errorCode = error.$metadata?.httpStatusCode;
        
        // Don't retry on 4xx errors except 429 (throttling)
        if (errorCode >= 400 && errorCode < 500 && errorCode !== 429) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt >= retries) {
          throw error;
        }
        
        // Calculate backoff delay: 1s, 2s, 4s, 8s...
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        
        this.log(`⚠️  Attempt ${attempt + 1} failed (${errorMessage}), retrying in ${delayMs}ms...`, 'warning');
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Should never reach here, but just in case
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Invoke streaming model with retry logic
   * @param {Object} client - AWS Bedrock client
   * @param {Object} params - Command parameters
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<Object>} Streaming response
   */
  async invokeStreamingModelWithRetry(client, params, maxRetries = null) {
    const retries = maxRetries !== null ? maxRetries : this.options.maxRetries;
    let lastError = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const command = new InvokeModelWithResponseStreamCommand(params);
        const response = await client.send(command);
        
        if (attempt > 0) {
          this.log(`✓ Streaming succeeded on retry attempt ${attempt}`, 'success');
        }
        
        return response;
      } catch (error) {
        lastError = error;
        
        const errorCode = error.$metadata?.httpStatusCode;
        
        // Don't retry on 4xx errors except 429
        if (errorCode >= 400 && errorCode < 500 && errorCode !== 429) {
          throw error;
        }
        
        if (attempt >= retries) {
          throw error;
        }
        
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        this.log(`⚠️  Streaming attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`, 'warning');
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Initialize the test harness
   */
  async initialize() {
    this.log('Initializing Comprehensive AWS Bedrock Test Harness...', 'test');
    
    // Auto-create test-results directory
    const resultsDir = path.join(__dirname, '../test-results');
    try {
      await fs.mkdir(resultsDir, { recursive: true });
      this.log('✅ Test results directory ready', 'success');
    } catch (error) {
      this.log(`⚠️  Could not create test-results directory: ${error.message}`, 'warning');
    }
    
    // Load configuration
    await this.loadConfiguration();
    
    // Validate credentials
    if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
      throw new Error('AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }
    
    // Initialize Bedrock client
    await this.initializeClient();
    
    this.log('Test harness initialized successfully', 'success');
  }

  /**
   * Load model configuration
   */
  async loadConfiguration() {
    this.log(`Loading configuration from ${this.options.configPath}...`, 'info');
    
    try {
      const configContent = await fs.readFile(this.options.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      
      this.results.metadata.configVersion = this.config.metadata?.version || 'unknown';
      
      this.log(`Configuration loaded: ${Object.keys(this.config.modelRegistry).length} models defined`, 'success');
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Initialize AWS Bedrock client
   */
  async initializeClient() {
    this.log('Initializing AWS Bedrock client...', 'info');
    
    try {
      this.client = new BedrockRuntimeClient({
        region: this.options.region,
        credentials: this.credentials
      });
      
      this.log(`AWS Bedrock client initialized for region: ${this.options.region}`, 'success');
      return true;
    } catch (error) {
      throw new Error(`Failed to initialize Bedrock client: ${error.message}`);
    }
  }

  /**
   * Get models to test based on configuration and options
   */
  getModelsToTest() {
    const models = [];
    const registry = this.config.modelRegistry;
    
    for (const [key, model] of Object.entries(registry)) {
      // Skip if deprecated and not including deprecated
      if (model.deprecated && !this.options.includeDeprecated) {
        this.log(`Skipping deprecated model: ${model.displayName}`, 'warning');
        this.results.summary.skippedModels++;
        continue;
      }
      
      // Skip if specific models requested and this isn't one
      if (this.options.specificModels && !this.options.specificModels.includes(key)) {
        continue;
      }
      
      // Skip if region locked and not in available regions
      if (model.regions && !model.regions.includes(this.options.region)) {
        this.log(`Skipping region-locked model: ${model.displayName} (not available in ${this.options.region})`, 'warning');
        this.results.summary.skippedModels++;
        continue;
      }
      
      models.push({ key, ...model });
    }
    
    // Sort by priority
    models.sort((a, b) => a.priority - b.priority);
    
    return models;
  }

  /**
   * Test basic text generation for a model
   */
  async testBasicTextGeneration(model) {
    const testName = 'basicTextGeneration';
    this.log(`Testing ${model.displayName}: Basic text generation...`, 'test');
    
    try {
      const prompt = this.config.testPrompts.basic;
      
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
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

      // Add inference profile ARN if required and available
      if (model.requiresInferenceProfile && model.inferenceProfileArn) {
        commandParams.modelId = model.inferenceProfileArn;
        this.log(`Using inference profile ARN: ${model.inferenceProfileArn}`, 'info');
      }

      const startTime = Date.now();
      const response = await this.invokeModelWithRetry(this.client, commandParams);
      const latency = Date.now() - startTime;

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = responseBody.content?.[0]?.text || JSON.stringify(responseBody);

      this.log(`✓ Basic generation successful (${latency}ms)`, 'success');
      if (this.options.verbose) {
        this.log(`Response preview: ${responseText.substring(0, 100)}...`, 'info');
      }

      return {
        success: true,
        testName,
        latency,
        response: responseText,
        tokenUsage: {
          input: responseBody.usage?.input_tokens,
          output: responseBody.usage?.output_tokens,
          total: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0)
        },
        stopReason: responseBody.stop_reason
      };
    } catch (error) {
      this.log(`✗ Basic generation failed: ${error.message}`, 'error');
      
      return {
        success: false,
        testName,
        error: error.message,
        errorCode: error.$metadata?.httpStatusCode,
        errorType: error.name,
        errorDetails: this.extractErrorDetails(error)
      };
    }
  }

  /**
   * Test streaming response for a model
   */
  async testStreamingResponse(model) {
    const testName = 'streamingResponse';
    
    if (this.options.skipStreaming) {
      return { success: true, testName, skipped: true };
    }
    
    this.log(`Testing ${model.displayName}: Streaming response...`, 'test');
    
    try {
      const prompt = this.config.testPrompts.streaming;

      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt
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

      // Add inference profile ARN if required and available
      if (model.requiresInferenceProfile && model.inferenceProfileArn) {
        commandParams.modelId = model.inferenceProfileArn;
      }

      const startTime = Date.now();
      const response = await this.invokeStreamingModelWithRetry(this.client, commandParams);

      let fullText = '';
      let chunkCount = 0;

      // Process stream
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

      this.log(`✓ Streaming successful (${chunkCount} chunks, ${latency}ms)`, 'success');

      return {
        success: true,
        testName,
        chunkCount,
        latency,
        responseLength: fullText.length,
        streamingSupported: true
      };
    } catch (error) {
      this.log(`✗ Streaming failed: ${error.message}`, 'error');
      
      return {
        success: false,
        testName,
        error: error.message,
        errorCode: error.$metadata?.httpStatusCode,
        streamingSupported: false,
        errorDetails: this.extractErrorDetails(error)
      };
    }
  }

  /**
   * Test parameter variations for a model
   */
  async testParameterVariations(model) {
    const testName = 'parameterVariations';
    
    if (this.options.skipVariations) {
      return { success: true, testName, skipped: true };
    }
    
    this.log(`Testing ${model.displayName}: Parameter variations...`, 'test');

    const variations = [
      { name: 'low_temperature', temperature: 0.1, max_tokens: 100 },
      { name: 'high_temperature', temperature: 1.0, max_tokens: 100 },
      { name: 'long_response', temperature: 0.7, max_tokens: 1000 }
    ];

    const results = [];

    for (const variation of variations) {
      try {
        const requestBody = {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: variation.max_tokens,
          messages: [
            {
              role: 'user',
              content: this.config.testPrompts.creative
            }
          ],
          temperature: variation.temperature
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

        const response = await this.invokeModelWithRetry(this.client, commandParams);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        results.push({
          variation: variation.name,
          status: 'success',
          responseLength: responseBody.content?.[0]?.text?.length || 0,
          tokenUsage: responseBody.usage
        });

        this.log(`  ✓ ${variation.name}`, 'info');
      } catch (error) {
        results.push({
          variation: variation.name,
          status: 'failed',
          error: error.message
        });

        this.log(`  ✗ ${variation.name}: ${error.message}`, 'warning');
      }
    }

    const allSuccess = results.every(r => r.status === 'success');
    
    return {
      success: allSuccess,
      testName,
      variations: results,
      successCount: results.filter(r => r.status === 'success').length,
      failureCount: results.filter(r => r.status === 'failed').length
    };
  }

  /**
   * Test a single model comprehensively
   */
  async testModel(model) {
    this.log(`\n${'='.repeat(80)}`, 'info');
    this.log(`Testing Model: ${model.displayName} (${model.modelId})`, 'test');
    this.log(`${'='.repeat(80)}`, 'info');

    const modelResult = {
      modelId: model.modelId,
      displayName: model.displayName,
      provider: model.provider,
      family: model.family,
      priority: model.priority,
      deprecated: model.deprecated,
      requiresInferenceProfile: model.requiresInferenceProfile,
      inferenceProfileArn: model.inferenceProfileArn,
      tests: {},
      overall: 'pending',
      timestamp: new Date().toISOString()
    };

    this.results.summary.testedModels++;

    // Test 1: Basic text generation
    const basicTest = await this.testBasicTextGeneration(model);
    modelResult.tests.basicTextGeneration = basicTest;

    if (!basicTest.success) {
      modelResult.overall = 'failed';
      this.results.summary.failedModels++;
      this.results.errors.push({
        model: model.displayName,
        modelId: model.modelId,
        test: 'basicTextGeneration',
        error: basicTest.error,
        errorCode: basicTest.errorCode,
        details: basicTest.errorDetails
      });
      
      this.log(`Model ${model.displayName} failed basic test - skipping additional tests`, 'warning');
      this.results.modelResults[model.modelId] = modelResult;
      return modelResult;
    }

    // Test 2: Streaming (if basic test passed)
    const streamingTest = await this.testStreamingResponse(model);
    modelResult.tests.streamingResponse = streamingTest;

    if (!streamingTest.success && !streamingTest.skipped) {
      this.results.warnings.push(`Streaming not supported for ${model.displayName}`);
    }

    // Test 3: Parameter variations (if basic test passed)
    const variationTest = await this.testParameterVariations(model);
    modelResult.tests.parameterVariations = variationTest;

    // Determine overall status
    if (basicTest.success) {
      modelResult.overall = 'success';
      this.results.summary.successfulModels++;
    }

    this.results.modelResults[model.modelId] = modelResult;
    return modelResult;
  }

  /**
   * Run comprehensive tests on all configured models
   */
  async runAllTests() {
    const startTime = Date.now();
    
    this.log('\n' + '═'.repeat(80), 'info');
    this.log('AWS BEDROCK COMPREHENSIVE MODEL TEST HARNESS', 'test');
    this.log('═'.repeat(80) + '\n', 'info');

    const modelsToTest = this.getModelsToTest();
    this.results.summary.totalModels = modelsToTest.length;

    this.log(`Configuration: ${this.results.summary.totalModels} models to test`, 'info');
    this.log(`Region: ${this.options.region}`, 'info');
    this.log(`Include deprecated: ${this.options.includeDeprecated}`, 'info');
    this.log(`Skip streaming: ${this.options.skipStreaming}`, 'info');
    this.log(`Skip variations: ${this.options.skipVariations}\n`, 'info');

    if (modelsToTest.length === 0) {
      this.log('No models to test based on current configuration', 'warning');
      this.results.overall = 'no_tests';
      return this.results;
    }

    // Test each model
    for (const model of modelsToTest) {
      try {
        await this.testModel(model);
      } catch (error) {
        this.log(`Fatal error testing ${model.displayName}: ${error.message}`, 'error');
        this.results.errors.push({
          model: model.displayName,
          modelId: model.modelId,
          test: 'fatal',
          error: error.message
        });
        this.results.summary.failedModels++;
      }
    }

    this.results.metadata.testDuration = Date.now() - startTime;
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Determine overall status
    if (this.results.summary.successfulModels === 0) {
      this.results.overall = 'all_failed';
    } else if (this.results.summary.failedModels === 0) {
      this.results.overall = 'all_passed';
    } else {
      this.results.overall = 'partial_success';
    }

    // Generate and save reports
    await this.generateReport();
    await this.saveResults();

    return this.results;
  }

  /**
   * Extract detailed error information
   */
  extractErrorDetails(error) {
    const details = {
      message: error.message,
      type: error.name,
      httpStatus: error.$metadata?.httpStatusCode
    };

    // Extract AWS-specific error details
    if (error.message.includes('AccessDenied')) {
      details.category = 'permissions';
      details.actionable = 'Check IAM permissions for bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream';
    } else if (error.message.includes('ValidationException')) {
      details.category = 'validation';
      details.actionable = 'Verify model ID and request parameters are correct';
    } else if (error.message.includes('ResourceNotFound') || error.message.includes('not found')) {
      details.category = 'model_availability';
      details.actionable = 'Model may not be available in this region or may require enablement in AWS Console';
    } else if (error.message.includes('ThrottlingException') || error.message.includes('TooManyRequests')) {
      details.category = 'rate_limit';
      details.actionable = 'Reduce request rate or request quota increase';
    } else if (error.$metadata?.httpStatusCode === 403) {
      details.category = 'permissions';
      details.actionable = 'IAM user/role lacks necessary Bedrock permissions';
    } else if (error.$metadata?.httpStatusCode >= 500) {
      details.category = 'service_error';
      details.actionable = 'AWS service issue - retry later or contact AWS support';
    }

    return details;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const { successfulModels, failedModels, testedModels } = this.results.summary;

    if (failedModels === testedModels) {
      this.results.recommendations.push({
        priority: 'critical',
        category: 'permissions',
        message: 'All models failed - likely an IAM permission issue',
        actions: [
          'Verify AWS credentials are valid',
          'Check IAM policy includes bedrock:InvokeModel permission',
          'Remove any explicit DENY policies for Bedrock',
          'Ensure Bedrock service is enabled in AWS Console',
          'Verify models are enabled in the target region'
        ]
      });
    }

    // Check for permission errors
    const permissionErrors = this.results.errors.filter(e => 
      e.errorCode === 403 || 
      e.error?.includes('AccessDenied') ||
      e.error?.includes('not authorized')
    );

    if (permissionErrors.length > 0) {
      this.results.recommendations.push({
        priority: 'high',
        category: 'permissions',
        message: `${permissionErrors.length} models failed due to permission errors`,
        actions: [
          'Review IAM policy attached to the user/role',
          'Add bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream actions',
          'Ensure resource ARN includes the specific models or use wildcard',
          'Check for Service Control Policies (SCPs) that may block access'
        ]
      });
    }

    // Check for model availability errors
    const availabilityErrors = this.results.errors.filter(e => 
      e.error?.includes('not found') ||
      e.error?.includes('ResourceNotFound') ||
      e.error?.includes('Model not available')
    );

    if (availabilityErrors.length > 0) {
      this.results.recommendations.push({
        priority: 'medium',
        category: 'model_availability',
        message: `${availabilityErrors.length} models not available in ${this.options.region}`,
        actions: [
          'Verify models are enabled in AWS Bedrock console',
          'Check if models are available in your region',
          'Request model access if required',
          'Try alternative regions from the configuration'
        ]
      });
    }

    // Success case recommendations
    if (successfulModels > 0 && failedModels === 0) {
      this.results.recommendations.push({
        priority: 'info',
        category: 'success',
        message: 'All tested models are working correctly',
        actions: [
          'Integration is ready for production use',
          'Consider implementing model fallback logic',
          'Monitor usage and costs',
          'Set up alerting for model failures'
        ]
      });
    }

    // Partial success recommendations
    if (successfulModels > 0 && failedModels > 0) {
      const workingModels = Object.values(this.results.modelResults)
        .filter(r => r.overall === 'success')
        .map(r => r.displayName);

      this.results.recommendations.push({
        priority: 'medium',
        category: 'partial_success',
        message: `${successfulModels} models working, ${failedModels} failed`,
        actions: [
          `Use working models: ${workingModels.slice(0, 3).join(', ')}${workingModels.length > 3 ? '...' : ''}`,
          'Implement fallback logic to use working models',
          'Investigate failed models individually',
          'Consider using cross-region inference profiles for reliability'
        ],
        workingModels
      });
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    this.log('\n' + '═'.repeat(80), 'info');
    this.log('TEST SUMMARY REPORT', 'test');
    this.log('═'.repeat(80) + '\n', 'info');

    this.log('📊 STATISTICS', 'info');
    this.log(`  Total Models in Registry: ${Object.keys(this.config.modelRegistry).length}`, 'info');
    this.log(`  Models Tested: ${this.results.summary.testedModels}`, 'info');
    this.log(`  Models Skipped: ${this.results.summary.skippedModels}`, 'info');
    this.log(`  Successful: ${this.results.summary.successfulModels}`, this.results.summary.successfulModels > 0 ? 'success' : 'error');
    this.log(`  Failed: ${this.results.summary.failedModels}`, this.results.summary.failedModels === 0 ? 'success' : 'error');
    this.log(`  Test Duration: ${this.results.metadata.testDuration}ms`, 'info');

    if (this.results.summary.successfulModels > 0) {
      this.log('\n✅ WORKING MODELS', 'success');
      for (const [modelId, result] of Object.entries(this.results.modelResults)) {
        if (result.overall === 'success') {
          const basicTest = result.tests.basicTextGeneration;
          this.log(`  • ${result.displayName}`, 'success');
          this.log(`    - Latency: ${basicTest.latency}ms`, 'info');
          this.log(`    - Tokens: ${basicTest.tokenUsage?.total || 'N/A'}`, 'info');
          if (result.tests.streamingResponse?.success) {
            this.log(`    - Streaming: ✓ (${result.tests.streamingResponse.chunkCount} chunks)`, 'info');
          }
        }
      }
    }

    if (this.results.summary.failedModels > 0) {
      this.log('\n❌ FAILED MODELS', 'error');
      for (const [modelId, result] of Object.entries(this.results.modelResults)) {
        if (result.overall === 'failed') {
          const basicTest = result.tests.basicTextGeneration;
          this.log(`  • ${result.displayName}`, 'error');
          this.log(`    - Error: ${basicTest.error}`, 'error');
          this.log(`    - HTTP Status: ${basicTest.errorCode || 'N/A'}`, 'error');
          if (basicTest.errorDetails?.actionable) {
            this.log(`    - Action: ${basicTest.errorDetails.actionable}`, 'warning');
          }
        }
      }
    }

    if (this.results.recommendations.length > 0) {
      this.log('\n💡 RECOMMENDATIONS', 'info');
      for (const rec of this.results.recommendations) {
        const icon = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : rec.priority === 'medium' ? '🟡' : '🟢';
        this.log(`\n${icon} ${rec.category.toUpperCase()}: ${rec.message}`, 'info');
        rec.actions.forEach((action, idx) => {
          this.log(`  ${idx + 1}. ${action}`, 'info');
        });
      }
    }

    this.log('\n' + '═'.repeat(80) + '\n', 'info');
  }

  /**
   * Save results to files
   */
  async saveResults() {
    const timestamp = Date.now();
    const resultsDir = path.join(__dirname, '../test-results');
    
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (error) {
      // Directory exists, continue
    }

    // Save JSON results
    const jsonPath = path.join(resultsDir, `aws-bedrock-comprehensive-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
    this.log(`Results saved to: ${jsonPath}`, 'success');

    // Save Markdown report
    const mdPath = path.join(resultsDir, `aws-bedrock-comprehensive-${timestamp}.md`);
    const mdContent = this.generateMarkdownReport();
    await fs.writeFile(mdPath, mdContent);
    this.log(`Markdown report saved to: ${mdPath}`, 'success');

    // Save latest as well
    const latestJsonPath = path.join(resultsDir, 'aws-bedrock-comprehensive-latest.json');
    await fs.writeFile(latestJsonPath, JSON.stringify(this.results, null, 2));
    
    const latestMdPath = path.join(resultsDir, 'aws-bedrock-comprehensive-latest.md');
    await fs.writeFile(latestMdPath, mdContent);
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport() {
    let md = `# AWS Bedrock Comprehensive Model Test Report\n\n`;
    md += `**Generated**: ${new Date().toISOString()}\n`;
    md += `**Region**: ${this.options.region}\n`;
    md += `**Test Duration**: ${this.results.metadata.testDuration}ms\n`;
    md += `**Config Version**: ${this.results.metadata.configVersion}\n\n`;

    md += `## Summary\n\n`;
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Models | ${Object.keys(this.config.modelRegistry).length} |\n`;
    md += `| Tested | ${this.results.summary.testedModels} |\n`;
    md += `| Skipped | ${this.results.summary.skippedModels} |\n`;
    md += `| ✅ Successful | ${this.results.summary.successfulModels} |\n`;
    md += `| ❌ Failed | ${this.results.summary.failedModels} |\n\n`;

    if (this.results.summary.successfulModels > 0) {
      md += `## ✅ Working Models\n\n`;
      md += `| Model | Provider | Family | Latency | Tokens | Streaming |\n`;
      md += `|-------|----------|--------|---------|--------|----------|\n`;
      
      for (const [modelId, result] of Object.entries(this.results.modelResults)) {
        if (result.overall === 'success') {
          const basic = result.tests.basicTextGeneration;
          const streaming = result.tests.streamingResponse;
          md += `| ${result.displayName} | ${result.provider} | ${result.family} | ${basic.latency}ms | ${basic.tokenUsage?.total || 'N/A'} | ${streaming?.success ? '✓' : '✗'} |\n`;
        }
      }
      md += `\n`;
    }

    if (this.results.summary.failedModels > 0) {
      md += `## ❌ Failed Models\n\n`;
      md += `| Model | Error | HTTP Status | Category |\n`;
      md += `|-------|-------|-------------|----------|\n`;
      
      for (const [modelId, result] of Object.entries(this.results.modelResults)) {
        if (result.overall === 'failed') {
          const basic = result.tests.basicTextGeneration;
          md += `| ${result.displayName} | ${basic.error} | ${basic.errorCode || 'N/A'} | ${basic.errorDetails?.category || 'unknown'} |\n`;
        }
      }
      md += `\n`;
    }

    if (this.results.recommendations.length > 0) {
      md += `## 💡 Recommendations\n\n`;
      for (const rec of this.results.recommendations) {
        md += `### ${rec.priority.toUpperCase()}: ${rec.message}\n\n`;
        rec.actions.forEach((action, idx) => {
          md += `${idx + 1}. ${action}\n`;
        });
        md += `\n`;
      }
    }

    md += `## Detailed Results\n\n`;
    md += `\`\`\`json\n${JSON.stringify(this.results.modelResults, null, 2)}\n\`\`\`\n`;

    return md;
  }

  /**
   * Logging utility
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icons = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪'
    };
    const icon = icons[type] || 'ℹ️';
    
    if (this.options.verbose || ['success', 'error', 'warning', 'test'].includes(type)) {
      console.log(`[${timestamp}] ${icon} ${message}`);
    }
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    region: null,
    includeDeprecated: false,
    specificModels: null,
    skipStreaming: false,
    skipVariations: false,
    configPath: null,
    verbose: false,
    maxRetries: 3
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--region' && args[i + 1]) {
      options.region = args[++i];
    } else if (arg === '--include-deprecated') {
      options.includeDeprecated = true;
    } else if (arg === '--models' && args[i + 1]) {
      options.specificModels = args[++i].split(',');
    } else if (arg === '--skip-streaming') {
      options.skipStreaming = true;
    } else if (arg === '--skip-variations') {
      options.skipVariations = true;
    } else if (arg === '--config' && args[i + 1]) {
      options.configPath = args[++i];
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--max-retries' && args[i + 1]) {
      options.maxRetries = parseInt(args[++i], 10);
      if (isNaN(options.maxRetries) || options.maxRetries < 0) {
        console.error('Error: --max-retries must be a non-negative integer');
        process.exit(1);
      }
    } else if (arg === '--help') {
      console.log(`
AWS Bedrock Comprehensive Test Harness

Usage: node scripts/test-aws-bedrock-comprehensive.js [options]

Options:
  --region <region>         AWS region (default: us-east-1)
  --include-deprecated      Include deprecated models in tests
  --models <model-keys>     Test specific models (comma-separated)
  --skip-streaming          Skip streaming tests
  --skip-variations         Skip parameter variation tests
  --config <path>           Custom model configuration file
  --verbose                 Enable verbose logging
  --max-retries <number>    Maximum retry attempts for failed requests (default: 3)
  --help                    Show this help message

Environment Variables:
  AWS_ACCESS_KEY_ID         AWS access key
  AWS_SECRET_ACCESS_KEY     AWS secret key
  AWS_REGION                Default AWS region

Examples:
  # Test all non-deprecated models
  node scripts/test-aws-bedrock-comprehensive.js

  # Test specific models
  node scripts/test-aws-bedrock-comprehensive.js --models claude-3-5-sonnet-v2,claude-sonnet-4-5

  # Test in different region
  node scripts/test-aws-bedrock-comprehensive.js --region us-west-2

  # Include deprecated models
  node scripts/test-aws-bedrock-comprehensive.js --include-deprecated

  # Verbose output
  node scripts/test-aws-bedrock-comprehensive.js --verbose
  
  # Set custom retry count
  node scripts/test-aws-bedrock-comprehensive.js --max-retries 5
      `);
      process.exit(0);
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  const harness = new ComprehensiveBedrockTestHarness(options);

  try {
    await harness.initialize();
    const results = await harness.runAllTests();
    
    // Exit with appropriate code
    if (results.overall === 'all_passed') {
      process.exit(0);
    } else if (results.overall === 'partial_success') {
      process.exit(0); // Still exit 0 if some models work
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Export for use as module
module.exports = ComprehensiveBedrockTestHarness;

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
