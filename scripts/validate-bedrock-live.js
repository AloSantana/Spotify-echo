#!/usr/bin/env node

/**
 * AWS Bedrock Live Validation Script
 * 
 * This script performs actual live AWS Bedrock API calls to validate
 * the BedrockInferenceProvider implementation with real models.
 * 
 * IMPORTANT: This will incur actual AWS charges!
 * 
 * Usage:
 *   AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_REGION=us-east-1 node scripts/validate-bedrock-live.js
 * 
 * Or with repo secrets in GitHub Actions:
 *   node scripts/validate-bedrock-live.js
 */

const BedrockInferenceProvider = require('../src/infra/BedrockInferenceProvider');

// Validation configuration
const VALIDATION_CONFIG = {
    models: [
        {
            key: 'claude-sonnet-4-5',
            displayName: 'Claude Sonnet 4.5',
            testPrompt: 'Hello! Please confirm you are Claude Sonnet 4.5 from AWS Bedrock. Respond with your model name and a brief greeting.'
        },
        {
            key: 'claude-opus-4-1',
            displayName: 'Claude Opus 4.1',
            testPrompt: 'Hello! Please confirm you are Claude Opus 4.1 from AWS Bedrock. Respond with your model name and capabilities.'
        }
    ],
    region: process.env.AWS_REGION || 'us-east-1',
    validateCredentials: true
};

// Results tracking
const validationResults = {
    timestamp: new Date().toISOString(),
    region: VALIDATION_CONFIG.region,
    credentialsFound: false,
    models: [],
    totalCost: 0,
    errors: []
};

/**
 * Validate AWS credentials are present
 */
function validateCredentials() {
    console.log('🔐 Validating AWS Credentials...');
    
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
        console.error('❌ AWS credentials not found!');
        console.error('   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables');
        validationResults.errors.push('Missing AWS credentials in environment');
        return false;
    }
    
    // Mask credentials in output
    console.log(`✅ AWS_ACCESS_KEY_ID: ${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)}`);
    console.log(`✅ AWS_SECRET_ACCESS_KEY: ***${secretAccessKey.substring(secretAccessKey.length - 4)}`);
    console.log(`✅ AWS_REGION: ${VALIDATION_CONFIG.region}`);
    
    validationResults.credentialsFound = true;
    return true;
}

/**
 * Calculate estimated cost based on token usage
 */
function calculateCost(model, usage) {
    const pricing = {
        'claude-sonnet-4-5': {
            input: 0.003,  // per 1K tokens
            output: 0.015  // per 1K tokens
        },
        'claude-opus-4-1': {
            input: 0.015,   // per 1K tokens
            output: 0.075   // per 1K tokens
        }
    };
    
    const modelPricing = pricing[model] || pricing['claude-sonnet-4-5'];
    
    const inputCost = (usage.input_tokens / 1000) * modelPricing.input;
    const outputCost = (usage.output_tokens / 1000) * modelPricing.output;
    
    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
        breakdown: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            inputCostPer1K: modelPricing.input,
            outputCostPer1K: modelPricing.output
        }
    };
}

/**
 * Test a specific model with live API call
 */
async function testModel(provider, modelConfig) {
    console.log(`\n📡 Testing ${modelConfig.displayName} (${modelConfig.key})...`);
    console.log(`   Prompt: "${modelConfig.testPrompt}"`);
    
    const startTime = Date.now();
    
    try {
        const result = await provider.predict(modelConfig.key, modelConfig.testPrompt, {
            maxTokens: 200,
            temperature: 0.7
        });
        
        const latency = Date.now() - startTime;
        
        console.log(`✅ Response received in ${latency}ms`);
        console.log(`   Response: "${result.text.substring(0, 150)}..."`);
        console.log(`   Cached: ${result.cached}`);
        console.log(`   Usage: ${result.usage.input_tokens} input + ${result.usage.output_tokens} output tokens`);
        
        // Calculate cost
        const cost = calculateCost(modelConfig.key, result.usage);
        console.log(`   Cost: $${cost.totalCost.toFixed(6)} USD`);
        console.log(`     - Input: ${cost.breakdown.inputTokens} tokens × $${cost.breakdown.inputCostPer1K}/1K = $${cost.inputCost.toFixed(6)}`);
        console.log(`     - Output: ${cost.breakdown.outputTokens} tokens × $${cost.breakdown.outputCostPer1K}/1K = $${cost.outputCost.toFixed(6)}`);
        
        validationResults.totalCost += cost.totalCost;
        
        validationResults.models.push({
            model: modelConfig.key,
            displayName: modelConfig.displayName,
            modelId: result.modelId,
            success: true,
            latency,
            cached: result.cached,
            usage: result.usage,
            cost: cost.totalCost,
            costBreakdown: cost.breakdown,
            response: result.text.substring(0, 200),
            timestamp: new Date().toISOString()
        });
        
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to test ${modelConfig.displayName}`);
        console.error(`   Error: ${error.message}`);
        
        validationResults.models.push({
            model: modelConfig.key,
            displayName: modelConfig.displayName,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
        
        validationResults.errors.push(`${modelConfig.displayName}: ${error.message}`);
        
        return false;
    }
}

/**
 * Test caching functionality
 */
async function testCaching(provider) {
    console.log('\n🔄 Testing Caching Functionality...');
    
    const testPrompt = 'What is 2+2?';
    const model = 'claude-sonnet-4-5';
    
    // First call (should not be cached)
    console.log('   First call (should miss cache)...');
    const result1 = await provider.predict(model, testPrompt);
    console.log(`   ✅ First call: cached=${result1.cached}, latency=${result1.latency}ms`);
    
    // Second call (should be cached)
    console.log('   Second call (should hit cache)...');
    const result2 = await provider.predict(model, testPrompt);
    console.log(`   ✅ Second call: cached=${result2.cached}, latency=${result2.latency}ms`);
    
    if (result2.cached && result2.latency < result1.latency) {
        console.log('   ✅ Caching working correctly!');
        return true;
    } else {
        console.log('   ⚠️  Caching may not be working as expected');
        return false;
    }
}

/**
 * Generate validation report
 */
function generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📅 Validation Details:');
    console.log(`   Timestamp: ${validationResults.timestamp}`);
    console.log(`   Region: ${validationResults.region}`);
    console.log(`   Credentials Found: ${validationResults.credentialsFound ? '✅' : '❌'}`);
    
    console.log('\n🤖 Models Tested:');
    validationResults.models.forEach(model => {
        if (model.success) {
            console.log(`   ✅ ${model.displayName}`);
            console.log(`      Model ID: ${model.modelId}`);
            console.log(`      Latency: ${model.latency}ms`);
            console.log(`      Tokens: ${model.usage.input_tokens} in + ${model.usage.output_tokens} out`);
            console.log(`      Cost: $${model.cost.toFixed(6)} USD`);
            console.log(`      Response: "${model.response.substring(0, 80)}..."`);
        } else {
            console.log(`   ❌ ${model.displayName}: ${model.error}`);
        }
    });
    
    console.log('\n💰 Cost Summary:');
    console.log(`   Total Cost: $${validationResults.totalCost.toFixed(6)} USD`);
    
    if (validationResults.errors.length > 0) {
        console.log('\n⚠️  Errors Encountered:');
        validationResults.errors.forEach((error, i) => {
            console.log(`   ${i + 1}. ${error}`);
        });
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Check AWS CloudWatch Logs for Bedrock invocations');
    console.log('   2. Verify charges in AWS Cost Explorer');
    console.log('   3. Confirm model IDs and regions match expectations');
    
    console.log('\n' + '='.repeat(80));
    
    // Save report to file
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '..', 'reports', 'bedrock-validation-report.json');
    
    try {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));
        console.log(`\n💾 Full report saved to: ${reportPath}`);
    } catch (error) {
        console.error(`\n⚠️  Could not save report: ${error.message}`);
    }
    
    return validationResults;
}

/**
 * Main validation function
 */
async function main() {
    console.log('🚀 AWS Bedrock Live Validation');
    console.log('=' .repeat(80));
    console.log('⚠️  WARNING: This will make actual AWS API calls and incur charges!');
    console.log('='.repeat(80));
    
    // Validate credentials
    if (!validateCredentials()) {
        console.error('\n❌ Validation aborted: Missing credentials');
        process.exit(1);
    }
    
    try {
        // Initialize provider
        console.log('\n🔧 Initializing BedrockInferenceProvider...');
        const provider = new BedrockInferenceProvider({
            region: VALIDATION_CONFIG.region,
            enableCaching: true,
            maxRetries: 3
        });
        
        await provider.initialize();
        console.log('✅ Provider initialized successfully');
        
        // Test each model
        let allSuccessful = true;
        for (const modelConfig of VALIDATION_CONFIG.models) {
            const success = await testModel(provider, modelConfig);
            allSuccessful = allSuccessful && success;
        }
        
        // Test caching
        await testCaching(provider);
        
        // Get metrics
        console.log('\n📊 Provider Metrics:');
        const metrics = provider.getMetrics();
        console.log(`   Total Requests: ${metrics.totalRequests}`);
        console.log(`   Successful: ${metrics.successfulRequests}`);
        console.log(`   Failed: ${metrics.failedRequests}`);
        console.log(`   Cache Hits: ${metrics.cacheHits}`);
        console.log(`   Cache Misses: ${metrics.cacheMisses}`);
        console.log(`   Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
        console.log(`   Success Rate: ${metrics.successRate.toFixed(2)}%`);
        
        // Generate report
        const report = generateReport();
        
        // Exit with appropriate code
        if (allSuccessful && validationResults.errors.length === 0) {
            console.log('\n✅ Validation completed successfully!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Validation completed with errors');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Validation failed with error:');
        console.error(error);
        validationResults.errors.push(`Fatal error: ${error.message}`);
        generateReport();
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main, validateCredentials, testModel, calculateCost };
