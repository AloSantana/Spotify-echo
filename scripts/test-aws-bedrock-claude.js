#!/usr/bin/env node

/**
 * AWS Bedrock Claude 4.5 Sonnet Testing Suite
 * 
 * Comprehensive test script to validate AWS Bedrock access and Claude 4.5 Sonnet functionality
 * 
 * Usage:
 *   node scripts/test-aws-bedrock-claude.js
 */

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand
} = require('@aws-sdk/client-bedrock-runtime');

class AWSBedrockClaudeTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'pending',
      tests: {},
      errors: [],
      warnings: [],
      recommendations: []
    };

    // AWS Credentials from environment or passed directly
    this.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || 'AKIAVXZJE3S7XRIRYUBC';
    this.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '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';
    this.awsRegion = process.env.AWS_REGION || 'us-east-1';

    // Comprehensive model list including Claude 4.x, 3.5, and other models
    this.modelIds = [
      'anthropic.claude-3-opus-20250805-v1:0',        // Claude Opus 4.1
      'anthropic.claude-sonnet-4-5-20250929-v1:0',      // Claude Sonnet 4.5
      'anthropic.claude-3-5-sonnet-v2-20240620-v1:0',   // Claude 3.5 Sonnet v2
      'anthropic.claude-3-5-sonnet-20240620-v1:0',      // Claude 3.5 Sonnet v1
      'anthropic.claude-3-5-haiku-20240515-v1:0',       // Claude 3.5 Haiku
      'anthropic.claude-3-sonnet-20240229-v1:0',        // Claude 3 Sonnet
      'anthropic.claude-v2:1',                          // Claude 2.1
      'deepseek.r1-v1:0',                               // DeepSeek-R1
    ];

    this.client = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪'
    }[type] || 'ℹ️';

    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Initialize AWS Bedrock client
   */
  async initializeClient() {
    this.log('Initializing AWS Bedrock client...', 'test');

    try {
      this.client = new BedrockRuntimeClient({
        region: this.awsRegion,
        credentials: {
          accessKeyId: this.awsAccessKeyId,
          secretAccessKey: this.awsSecretAccessKey
        }
      });

      this.results.tests.clientInitialization = {
        status: 'success',
        message: 'AWS Bedrock client initialized successfully',
        region: this.awsRegion,
        credentialsProvided: true
      };

      this.log('AWS Bedrock client initialized successfully', 'success');
      return true;
    } catch (error) {
      this.results.tests.clientInitialization = {
        status: 'failed',
        error: error.message,
        stack: error.stack
      };

      this.log(`Failed to initialize AWS Bedrock client: ${error.message}`, 'error');
      this.results.errors.push({
        test: 'clientInitialization',
        error: error.message,
        details: error.stack
      });
      return false;
    }
  }

  /**
   * Test basic text generation with Claude
   */
  async testBasicTextGeneration(modelId) {
    this.log(`Testing basic text generation with ${modelId}...`, 'test');

    try {
      const prompt = 'Hello! Please respond with a brief confirmation that you are Claude and working correctly.';

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

      const command = new InvokeModelCommand({
        modelId: modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
      });

      const startTime = Date.now();
      const response = await this.client.send(command);
      const latency = Date.now() - startTime;

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      this.results.tests[`basicTextGeneration_${modelId}`] = {
        status: 'success',
        modelId: modelId,
        prompt: prompt,
        response: responseBody.content?.[0]?.text || responseBody,
        latency: `${latency}ms`,
        tokenUsage: {
          input: responseBody.usage?.input_tokens,
          output: responseBody.usage?.output_tokens,
          total: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0)
        },
        stopReason: responseBody.stop_reason
      };

      this.log(`Basic text generation successful with ${modelId} (${latency}ms)`, 'success');
      this.log(`Response: ${responseBody.content?.[0]?.text?.substring(0, 100)}...`, 'info');

      return { success: true, modelId, latency, response: responseBody };
    } catch (error) {
      this.results.tests[`basicTextGeneration_${modelId}`] = {
        status: 'failed',
        modelId: modelId,
        error: error.message,
        errorCode: error.$metadata?.httpStatusCode,
        errorType: error.name
      };

      this.log(`Basic text generation failed with ${modelId}: ${error.message}`, 'error');
      this.results.errors.push({
        test: `basicTextGeneration_${modelId}`,
        error: error.message,
        details: error.toString()
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Test streaming response
   */
  async testStreamingResponse(modelId) {
    this.log(`Testing streaming response with ${modelId}...`, 'test');

    try {
      const prompt = 'Count from 1 to 5 slowly, explaining each number.';

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

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
      });

      const startTime = Date.now();
      const response = await this.client.send(command);

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

      this.results.tests[`streamingResponse_${modelId}`] = {
        status: 'success',
        modelId: modelId,
        prompt: prompt,
        fullResponse: fullText,
        chunkCount: chunkCount,
        latency: `${latency}ms`,
        streamingSupported: true
      };

      this.log(`Streaming response successful with ${modelId} (${chunkCount} chunks, ${latency}ms)`, 'success');
      this.log(`Response preview: ${fullText.substring(0, 100)}...`, 'info');

      return { success: true, modelId, chunkCount, latency };
    } catch (error) {
      this.results.tests[`streamingResponse_${modelId}`] = {
        status: 'failed',
        modelId: modelId,
        error: error.message,
        errorCode: error.$metadata?.httpStatusCode,
        streamingSupported: false
      };

      this.log(`Streaming response failed with ${modelId}: ${error.message}`, 'error');
      this.results.errors.push({
        test: `streamingResponse_${modelId}`,
        error: error.message,
        details: error.toString()
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Test with different parameters
   */
  async testParameterVariations(modelId) {
    this.log(`Testing parameter variations with ${modelId}...`, 'test');

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
              content: 'Write a short creative story about a music-loving robot.'
            }
          ],
          temperature: variation.temperature
        };

        const command = new InvokeModelCommand({
          modelId: modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(requestBody)
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        results.push({
          variation: variation.name,
          status: 'success',
          responseLength: responseBody.content?.[0]?.text?.length || 0,
          tokenUsage: responseBody.usage
        });

        this.log(`✓ Parameter variation '${variation.name}' successful`, 'info');
      } catch (error) {
        results.push({
          variation: variation.name,
          status: 'failed',
          error: error.message
        });

        this.log(`✗ Parameter variation '${variation.name}' failed: ${error.message}`, 'warning');
      }
    }

    this.results.tests[`parameterVariations_${modelId}`] = {
      status: results.every(r => r.status === 'success') ? 'success' : 'partial',
      modelId: modelId,
      variations: results
    };

    return results;
  }

  /**
   * Test model availability and fallback
   */
  async testModelAvailability() {
    this.log('Testing model availability and fallback...', 'test');

    const availableModels = [];
    let workingModelId = null;

    for (const modelId of this.modelIds) {
      this.log(`Checking model: ${modelId}`, 'info');

      const result = await this.testBasicTextGeneration(modelId);
      
      if (result.success) {
        availableModels.push({
          modelId: modelId,
          available: true,
          latency: result.latency
        });
        
        if (!workingModelId) {
          workingModelId = modelId;
        }
        
        this.log(`Model ${modelId} is available`, 'success');
      } else {
        availableModels.push({
          modelId: modelId,
          available: false,
          error: result.error
        });
        
        this.log(`Model ${modelId} is not available: ${result.error}`, 'warning');
      }
    }

    this.results.tests.modelAvailability = {
      status: workingModelId ? 'success' : 'failed',
      availableModels: availableModels,
      workingModel: workingModelId,
      totalTested: this.modelIds.length,
      totalAvailable: availableModels.filter(m => m.available).length
    };

    return { workingModelId, availableModels };
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('AWS BEDROCK CLAUDE 4.5 SONNET TEST REPORT', 'info');
    this.log('='.repeat(80), 'info');

    this.log('\n📋 CONFIGURATION', 'info');
    this.log(`  AWS Region: ${this.awsRegion}`, 'info');
    this.log(`  AWS Access Key ID: ${this.awsAccessKeyId.substring(0, 8)}...`, 'info');
    this.log(`  Models Tested: ${this.modelIds.length}`, 'info');

    this.log('\n🧪 TEST RESULTS', 'info');
    const successfulTests = Object.values(this.results.tests).filter(t => t.status === 'success').length;
    const totalTests = Object.keys(this.results.tests).length;
    this.log(`  Total Tests: ${totalTests}`, 'info');
    this.log(`  Successful: ${successfulTests}`, successfulTests > 0 ? 'success' : 'error');
    this.log(`  Failed: ${totalTests - successfulTests}`, totalTests - successfulTests === 0 ? 'success' : 'error');

    if (this.results.tests.modelAvailability) {
      this.log('\n🤖 MODEL AVAILABILITY', 'info');
      const ma = this.results.tests.modelAvailability;
      this.log(`  Available Models: ${ma.totalAvailable}/${ma.totalTested}`, 'info');
      if (ma.workingModel) {
        this.log(`  Primary Working Model: ${ma.workingModel}`, 'success');
      }

      this.log('\n  Detailed Model Status:', 'info');
      for (const model of ma.availableModels) {
        if (model.available) {
          this.log(`    ✅ ${model.modelId} - Available (latency: ${model.latency}ms)`, 'success');
        } else {
          this.log(`    ❌ ${model.modelId} - ${model.error}`, 'error');
        }
      }
    }

    if (this.results.errors.length > 0) {
      this.log('\n❌ ERRORS', 'error');
      this.results.errors.forEach((err, idx) => {
        this.log(`  ${idx + 1}. ${err.test}: ${err.error}`, 'error');
      });
    }

    if (this.results.warnings.length > 0) {
      this.log('\n⚠️  WARNINGS', 'warning');
      this.results.warnings.forEach((warn, idx) => {
        this.log(`  ${idx + 1}. ${warn}`, 'warning');
      });
    }

    // Recommendations
    this.generateRecommendations();

    if (this.results.recommendations.length > 0) {
      this.log('\n💡 RECOMMENDATIONS', 'info');
      this.results.recommendations.forEach((rec, idx) => {
        this.log(`  ${idx + 1}. ${rec}`, 'info');
      });
    }

    this.log('\n' + '='.repeat(80) + '\n', 'info');

    // Overall status
    const hasErrors = this.results.errors.length > 0;
    const hasWorkingModel = this.results.tests.modelAvailability?.workingModel;

    if (!hasErrors && hasWorkingModel) {
      this.results.overall = 'success';
      this.log('✅ OVERALL STATUS: SUCCESS - AWS Bedrock with Claude is working!', 'success');
    } else if (hasWorkingModel) {
      this.results.overall = 'partial';
      this.log('⚠️  OVERALL STATUS: PARTIAL - Some tests failed but basic functionality works', 'warning');
    } else {
      this.results.overall = 'failed';
      this.log('❌ OVERALL STATUS: FAILED - Critical issues detected', 'error');
    }

    return this.results;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const ma = this.results.tests.modelAvailability;

    if (!ma?.workingModel) {
      this.results.recommendations.push(
        'CRITICAL: No working Claude models found. Check AWS credentials and model access permissions.'
      );
      this.results.recommendations.push(
        'Verify that your AWS account has access to Amazon Bedrock and Claude models are enabled in your region.'
      );
    }

    if (this.results.errors.length > 0) {
      const accessErrors = this.results.errors.filter(e => 
        e.error.includes('AccessDenied') || 
        e.error.includes('UnrecognizedClient') ||
        e.error.includes('not authorized')
      );

      if (accessErrors.length > 0) {
        this.results.recommendations.push(
          'Access Denied errors detected. Verify IAM permissions include "bedrock:InvokeModel" and "bedrock:InvokeModelWithResponseStream".'
        );
      }

      const modelErrors = this.results.errors.filter(e => 
        e.error.includes('ValidationException') || 
        e.error.includes('model') ||
        e.error.includes('ResourceNotFound')
      );

      if (modelErrors.length > 0) {
        this.results.recommendations.push(
          'Model access errors detected. Enable Claude models in Amazon Bedrock console for your region.'
        );
      }
    }

    if (ma?.totalAvailable > 0 && ma?.totalAvailable < ma?.totalTested) {
      this.results.recommendations.push(
        `Only ${ma.totalAvailable} out of ${ma.totalTested} models are available. Consider enabling additional Claude model versions.`
      );
    }

    if (ma?.workingModel) {
      this.results.recommendations.push(
        `Use model ID "${ma.workingModel}" for production integration.`
      );
    }
  }

  /**
   * Save results to file
   */
  async saveResults() {
    const fs = require('fs');
    const path = require('path');

    const reportDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(reportDir, `aws-bedrock-claude-test-${timestamp}.json`);
    const mdPath = path.join(reportDir, `aws-bedrock-claude-test-${timestamp}.md`);

    // Save JSON
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));
    this.log(`Results saved to: ${jsonPath}`, 'success');

    // Save Markdown
    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(mdPath, markdown);
    this.log(`Markdown report saved to: ${mdPath}`, 'success');
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport() {
    const ma = this.results.tests.modelAvailability;
    
    let md = `# AWS Bedrock Claude 4.5 Sonnet Test Report\n\n`;
    md += `**Date**: ${this.results.timestamp}\n`;
    md += `**Overall Status**: ${this.results.overall.toUpperCase()}\n\n`;

    md += `## Configuration\n\n`;
    md += `- **AWS Region**: ${this.awsRegion}\n`;
    md += `- **AWS Access Key**: ${this.awsAccessKeyId.substring(0, 8)}...\n`;
    md += `- **Models Tested**: ${this.modelIds.length}\n\n`;

    md += `## Test Summary\n\n`;
    const successfulTests = Object.values(this.results.tests).filter(t => t.status === 'success').length;
    const totalTests = Object.keys(this.results.tests).length;
    md += `- **Total Tests**: ${totalTests}\n`;
    md += `- **Successful**: ${successfulTests}\n`;
    md += `- **Failed**: ${totalTests - successfulTests}\n\n`;

    if (ma) {
      md += `## Model Availability\n\n`;
      md += `**Available**: ${ma.totalAvailable}/${ma.totalTested}\n\n`;
      
      if (ma.workingModel) {
        md += `**Primary Working Model**: \`${ma.workingModel}\`\n\n`;
      }

      md += `### Detailed Model Status\n\n`;
      md += `| Model ID | Status | Details |\n`;
      md += `|----------|--------|----------|\n`;
      
      for (const model of ma.availableModels) {
        const status = model.available ? '✅ Available' : '❌ Unavailable';
        const details = model.available ? `Latency: ${model.latency}ms` : model.error;
        md += `| \`${model.modelId}\` | ${status} | ${details} |\n`;
      }
      md += `\n`;
    }

    if (this.results.errors.length > 0) {
      md += `## Errors\n\n`;
      this.results.errors.forEach((err, idx) => {
        md += `${idx + 1}. **${err.test}**: ${err.error}\n`;
      });
      md += `\n`;
    }

    if (this.results.recommendations.length > 0) {
      md += `## Recommendations\n\n`;
      this.results.recommendations.forEach((rec, idx) => {
        md += `${idx + 1}. ${rec}\n`;
      });
      md += `\n`;
    }

    md += `## Detailed Test Results\n\n`;
    md += `\`\`\`json\n`;
    md += JSON.stringify(this.results.tests, null, 2);
    md += `\n\`\`\`\n`;

    return md;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.log('Starting AWS Bedrock Claude 4.5 Sonnet test suite...', 'test');
    this.log('='.repeat(80), 'info');

    // Step 1: Initialize client
    const clientInitialized = await this.initializeClient();
    if (!clientInitialized) {
      this.log('Failed to initialize client. Aborting tests.', 'error');
      this.generateReport();
      await this.saveResults();
      return this.results;
    }

    // Step 2: Test model availability
    const { workingModelId } = await this.testModelAvailability();

    if (!workingModelId) {
      this.log('No working models found. Some tests will be skipped.', 'warning');
      this.results.warnings.push('No working Claude models available - some tests skipped');
    } else {
      // Step 3: Test streaming with working model
      await this.testStreamingResponse(workingModelId);

      // Step 4: Test parameter variations with working model
      await this.testParameterVariations(workingModelId);
    }

    // Generate and save report
    this.generateReport();
    await this.saveResults();

    return this.results;
  }
}

// Main execution
if (require.main === module) {
  const tester = new AWSBedrockClaudeTester();
  
  tester.runAllTests()
    .then(results => {
      process.exit(results.overall === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = AWSBedrockClaudeTester;
