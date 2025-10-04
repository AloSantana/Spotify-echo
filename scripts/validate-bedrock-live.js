#!/usr/bin/env node

/**
 * AWS Bedrock Live Validation Script
 * 
 * This script performs actual live AWS Bedrock API calls to validate
 * the BedrockInferenceProvider implementation with real models.
 * 
 * Enhanced with:
 * - Alias-based model resolution
 * - Resilience metrics (retry counts, circuit breaker stats)
 * - P95/P99 latency tracking
 * - Configuration hash manifest
 * - Cost tracking per model
 * 
 * IMPORTANT: This will incur actual AWS charges!
 * 
 * Usage:
 *   AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_REGION=us-east-1 node scripts/validate-bedrock-live.js
 *   node scripts/validate-bedrock-live.js --strict  # Fail if any model invocation fails
 * 
 * Or with repo secrets in GitHub Actions:
 *   node scripts/validate-bedrock-live.js
 */

const BedrockInferenceProvider = require('../src/infra/BedrockInferenceProvider');
const aliasResolver = require('../src/infra/bedrock/alias-resolver');
const unifiedRetry = require('../src/infra/bedrock/unified-retry');
const fs = require('fs').promises;
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const STRICT_MODE = args.includes('--strict');

// Validation configuration
const VALIDATION_CONFIG = {
    models: [
        {
            key: 'claude-sonnet-4-5',
            displayName: 'Claude Sonnet 4.5',
            testPrompt: 'Hello! Please confirm you are Claude Sonnet 4.5 from AWS Bedrock. Respond with your model name and a brief greeting.'
        },
        {
            key: 'claude-3-opus',
            displayName: 'Claude 3 Opus',
            testPrompt: 'Hello! Please confirm you are Claude 3 Opus from AWS Bedrock. Respond with your model name and capabilities.'
        }
    ],
    region: process.env.AWS_REGION || 'us-east-1',
    validateCredentials: true,
    retryAttempts: 3,
    retryDelay: 2000, // 2 seconds between retries
    requestDelay: 1000 // 1 second delay between requests to avoid rate limiting
};

// Results tracking with enhanced metrics
const validationResults = {
    timestamp: new Date().toISOString(),
    region: VALIDATION_CONFIG.region,
    credentialsFound: false,
    configHash: null,
    configMetadata: null,
    models: [],
    totalCost: 0,
    errors: [],
    resilienceMetrics: null,
    latencyPercentiles: {
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0
    }
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
 * Validate request ID format (not placeholder)
 */
function validateRequestId(requestId) {
    if (!requestId) return false;
    
    // Check for placeholder patterns
    const placeholderPatterns = [
        /bedrock-\d+-/,  // bedrock-{timestamp}-{model}
        /req-\d+-/,      // req-{timestamp}-{hash}
        /\[DEMO\]/,
        /\[PLACEHOLDER\]/,
        /\[MOCK\]/,
        /example/i,
        /test-request/i
    ];
    
    for (const pattern of placeholderPatterns) {
        if (pattern.test(requestId)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Validate latency is within reasonable bounds
 */
function validateLatency(latency, modelKey) {
    // Warn if latency seems unrealistic
    if (latency < 100) {
        console.warn(`   ⚠️  WARNING: Latency ${latency}ms is suspiciously low (< 100ms). May indicate cached/mocked response.`);
        return false;
    }
    
    if (latency > 60000) {
        console.warn(`   ⚠️  WARNING: Latency ${latency}ms is very high (> 60s). May indicate network issues.`);
        return false;
    }
    
    return true;
}

/**
 * Check for distinct request IDs (no duplicates)
 */
function checkDistinctRequestIds(results) {
    const requestIds = results.models
        .filter(m => m.success && m.requestId)
        .map(m => m.requestId);
    
    const uniqueIds = new Set(requestIds);
    
    if (requestIds.length !== uniqueIds.size) {
        console.warn(`   ⚠️  WARNING: Duplicate request IDs detected! This may indicate mocked data.`);
        return false;
    }
    
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
        'claude-3-opus': {
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
 * Save per-invocation log to logs/bedrock/invocations/
 */
async function saveInvocationLog(invocationData) {
    try {
        const logsDir = path.join(__dirname, '..', 'logs', 'bedrock', 'invocations');
        await fs.mkdir(logsDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}-${invocationData.model}.json`;
        const filepath = path.join(logsDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(invocationData, null, 2));
        console.log(`   📝 Invocation log saved: ${filename}`);
        
        // Detect placeholder strings (anti-mock safeguard)
        const content = JSON.stringify(invocationData);
        if (content.includes('[DEMO]') || content.includes('[PLACEHOLDER]') || content.includes('[MOCK]')) {
            console.warn(`   ⚠️  WARNING: Placeholder strings detected in invocation data!`);
            invocationData.hasPlaceholders = true;
        }
    } catch (error) {
        console.error(`   ❌ Failed to save invocation log: ${error.message}`);
    }
}

/**
 * Sleep/delay function
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test a specific model with live API call (with retry logic)
 */
async function testModel(provider, modelConfig) {
    console.log(`\n📡 Testing ${modelConfig.displayName} (${modelConfig.key})...`);
    console.log(`   Prompt: "${modelConfig.testPrompt}"`);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= VALIDATION_CONFIG.retryAttempts; attempt++) {
        const requestTimestamp = new Date().toISOString();
        const startTime = Date.now();
        
        // Get model configuration for inference profile info
        const config = provider.config.modelConfig[modelConfig.key];
        const requiresInferenceProfile = config?.requiresInferenceProfile || false;
        const inferenceProfileArn = config?.inferenceProfileArn || null;
        const actualModelId = config?.modelId || modelConfig.key;
        
        if (attempt > 1) {
            console.log(`   🔄 Retry attempt ${attempt}/${VALIDATION_CONFIG.retryAttempts}...`);
            await sleep(VALIDATION_CONFIG.retryDelay * attempt); // Exponential backoff
        }
        
        console.log(`   📋 Request Details:`);
        console.log(`      Model ID: ${actualModelId}`);
        console.log(`      Requires Inference Profile: ${requiresInferenceProfile}`);
        if (requiresInferenceProfile && inferenceProfileArn) {
            console.log(`      Inference Profile ARN: ${inferenceProfileArn}`);
        }
        console.log(`      Region: ${VALIDATION_CONFIG.region}`);
        console.log(`      Request Timestamp: ${requestTimestamp}`);
        
        try {
            const result = await provider.predict(modelConfig.key, modelConfig.testPrompt, {
                maxTokens: 200,
                temperature: 0.7
            });
            
            const responseTimestamp = new Date().toISOString();
            const latency = Date.now() - startTime;
            
            console.log(`✅ Response received in ${latency}ms`);
            console.log(`   📋 Response Details:`);
            console.log(`      Response Timestamp: ${responseTimestamp}`);
            console.log(`      HTTP Status: 200 (Success)`);
            console.log(`      Model Used: ${result.modelId || actualModelId}`);
            console.log(`      Response: "${result.text.substring(0, 150)}..."`);
            console.log(`      Cached: ${result.cached}`);
            console.log(`   📊 Token Usage:`);
            console.log(`      Input Tokens: ${result.usage.input_tokens}`);
            console.log(`      Output Tokens: ${result.usage.output_tokens}`);
            console.log(`      Total Tokens: ${result.usage.input_tokens + result.usage.output_tokens}`);
            
            // Calculate cost
            const cost = calculateCost(modelConfig.key, result.usage);
            console.log(`   💰 Cost Breakdown:`);
            console.log(`      Input: ${cost.breakdown.inputTokens} tokens × $${cost.breakdown.inputCostPer1K}/1K = $${cost.inputCost.toFixed(6)}`);
            console.log(`      Output: ${cost.breakdown.outputTokens} tokens × $${cost.breakdown.outputCostPer1K}/1K = $${cost.outputCost.toFixed(6)}`);
            console.log(`      Total: $${cost.totalCost.toFixed(6)} USD`);
            
            validationResults.totalCost += cost.totalCost;
            
            const invocationData = {
                model: modelConfig.key,
                displayName: modelConfig.displayName,
                modelId: result.modelId || actualModelId,
                actualModelId: actualModelId,
                requiresInferenceProfile,
                inferenceProfileArn: requiresInferenceProfile ? inferenceProfileArn : null,
                region: VALIDATION_CONFIG.region,
                success: true,
                latency,
                cached: result.cached,
                usage: result.usage,
                cost: cost.totalCost,
                costBreakdown: cost.breakdown,
                response: result.text.substring(0, 200),
                requestTimestamp,
                responseTimestamp,
                httpStatus: 200,
                requestId: result.requestId || `bedrock-${Date.now()}-${modelConfig.key}`,
                validations: {
                    requestIdValid: validateRequestId(result.requestId),
                    latencyValid: validateLatency(latency, modelConfig.key),
                    hasRealTokens: result.usage.input_tokens > 0 && result.usage.output_tokens > 0
                }
            };
            
            // In strict mode, fail if validations don't pass
            if (STRICT_MODE) {
                if (!invocationData.validations.requestIdValid) {
                    console.error(`   ❌ STRICT MODE: Request ID validation failed`);
                    throw new Error('Request ID appears to be a placeholder');
                }
                if (!invocationData.validations.latencyValid) {
                    console.error(`   ❌ STRICT MODE: Latency validation failed`);
                }
                if (!invocationData.validations.hasRealTokens) {
                    console.error(`   ❌ STRICT MODE: Token counts are zero or missing`);
                    throw new Error('No real tokens detected');
                }
            }
        
        validationResults.models.push(invocationData);
        
        // Save per-invocation log
        await saveInvocationLog(invocationData);
        
        return true;
        
    } catch (error) {
        const responseTimestamp = new Date().toISOString();
        const latency = Date.now() - startTime;
        
        lastError = error;
        
        // Check if error is rate limiting (throttling)
        const isRateLimited = error.message && (
            error.message.includes('Too many requests') ||
            error.message.includes('ThrottlingException') ||
            error.message.includes('Rate exceeded') ||
            error.$metadata?.httpStatusCode === 429
        );
        
        if (isRateLimited && attempt < VALIDATION_CONFIG.retryAttempts) {
            console.warn(`⚠️  Rate limited on attempt ${attempt}. Will retry...`);
            console.warn(`   Error: ${error.message}`);
            continue; // Retry
        }
        
        // If not rate limited or final attempt, log error
        console.error(`❌ Failed to test ${modelConfig.displayName} (attempt ${attempt}/${VALIDATION_CONFIG.retryAttempts})`);
        console.error(`   📋 Error Details:`);
        console.error(`      Error: ${error.message}`);
        console.error(`      Response Timestamp: ${responseTimestamp}`);
        console.error(`      HTTP Status: ${error.$metadata?.httpStatusCode || 'Unknown'}`);
        console.error(`      Latency: ${latency}ms`);
        
        if (attempt === VALIDATION_CONFIG.retryAttempts) {
            // Final attempt failed
            validationResults.models.push({
                model: modelConfig.key,
                displayName: modelConfig.displayName,
                success: false,
                error: error.message,
                httpStatus: error.$metadata?.httpStatusCode || null,
                requestTimestamp,
                responseTimestamp,
                latency,
                attempts: attempt
            });
            
            validationResults.errors.push(`${modelConfig.displayName}: ${error.message}`);
            
            return false;
        }
    }
}

// Should never reach here, but just in case
return false;
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
 * Generate validation report with enhanced metrics
 */
function generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(80));
    
    // Get resilience metrics from unified retry layer
    const resilienceMetrics = unifiedRetry.getTelemetry();
    validationResults.resilienceMetrics = resilienceMetrics;
    
    // Get config metadata
    const configMetadata = aliasResolver.getConfigMetadata();
    validationResults.configHash = configMetadata.configHash;
    validationResults.configMetadata = configMetadata;
    
    console.log('\n📅 Validation Details:');
    console.log(`   Timestamp: ${validationResults.timestamp}`);
    console.log(`   Region: ${validationResults.region}`);
    console.log(`   Credentials Found: ${validationResults.credentialsFound ? '✅' : '❌'}`);
    console.log(`   Config Hash: ${validationResults.configHash?.substring(0, 12)}...`);
    console.log(`   Config Version: ${configMetadata.version}`);
    console.log(`   Total Aliases: ${configMetadata.totalAliases}`);
    
    console.log('\n🔐 Resilience Metrics:');
    console.log(`   Total Calls: ${resilienceMetrics.totalCalls}`);
    console.log(`   Successful: ${resilienceMetrics.successfulCalls}`);
    console.log(`   Failed: ${resilienceMetrics.failedCalls}`);
    console.log(`   Retried: ${resilienceMetrics.retriedCalls}`);
    console.log(`   Success Rate: ${resilienceMetrics.successRate}`);
    console.log(`   Retry Rate: ${resilienceMetrics.retryRate}`);
    
    console.log('\n⏱️  Latency Percentiles:');
    console.log(`   Mean: ${resilienceMetrics.latency.mean}ms`);
    console.log(`   P50: ${resilienceMetrics.latency.p50}ms`);
    console.log(`   P95: ${resilienceMetrics.latency.p95}ms`);
    console.log(`   P99: ${resilienceMetrics.latency.p99}ms`);
    console.log(`   Max: ${resilienceMetrics.latency.max}ms`);
    
    validationResults.latencyPercentiles = resilienceMetrics.latency;
    
    if (Object.keys(resilienceMetrics.errorsByType).length > 0) {
        console.log('\n⚠️  Errors by Type:');
        for (const [type, count] of Object.entries(resilienceMetrics.errorsByType)) {
            console.log(`   ${type}: ${count}`);
        }
    }
    console.log(`   Provider: AWS Bedrock (provider=bedrock)`);
    
    console.log('\n🤖 Models Tested:');
    validationResults.models.forEach(model => {
        if (model.success) {
            console.log(`   ✅ ${model.displayName}`);
            console.log(`      Model ID: ${model.actualModelId}`);
            if (model.requiresInferenceProfile) {
                console.log(`      Inference Profile ARN: ${model.inferenceProfileArn}`);
                console.log(`      Cross-Region Access: Enabled`);
            }
            console.log(`      Region: ${model.region}`);
            console.log(`      Latency: ${model.latency}ms`);
            console.log(`      Tokens: ${model.usage.input_tokens} in + ${model.usage.output_tokens} out`);
            console.log(`      Cost: $${model.cost.toFixed(6)} USD`);
            console.log(`      Request Time: ${model.requestTimestamp}`);
            console.log(`      Response Time: ${model.responseTimestamp}`);
            console.log(`      HTTP Status: ${model.httpStatus}`);
            console.log(`      Response: "${model.response.substring(0, 80)}..."`);
        } else {
            console.log(`   ❌ ${model.displayName}: ${model.error}`);
            console.log(`      HTTP Status: ${model.httpStatus || 'N/A'}`);
            console.log(`      Latency: ${model.latency}ms`);
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
    
    console.log('\n📝 CloudWatch Verification:');
    console.log('   To verify these invocations in AWS CloudWatch:');
    console.log('   1. Navigate to CloudWatch > Logs > Log groups');
    console.log('   2. Find: /aws/bedrock/modelinvocations');
    console.log('   3. Filter by timestamps:');
    validationResults.models.forEach(model => {
        if (model.success) {
            console.log(`      - ${model.displayName}: ${model.requestTimestamp} to ${model.responseTimestamp}`);
        }
    });
    
    console.log('\n💳 AWS Billing Verification:');
    console.log('   To verify charges in AWS Cost Explorer:');
    console.log('   1. Navigate to AWS Cost Explorer');
    console.log('   2. Set time range: Last 24 hours');
    console.log('   3. Filter by Service: Amazon Bedrock');
    console.log('   4. Group by: Usage Type');
    console.log('   5. Expected charges for models:');
    validationResults.models.forEach(model => {
        if (model.success && model.requiresInferenceProfile) {
            console.log(`      - ${model.inferenceProfileArn}`);
            console.log(`        Region: ${model.region}`);
            console.log(`        Cost: ~$${model.cost.toFixed(6)} USD`);
        }
    });
    
    console.log('\n📊 Query Templates for CloudWatch Metrics:');
    validationResults.models.forEach(model => {
        if (model.success) {
            console.log(`\n   # ${model.displayName}`);
            console.log(`   aws cloudwatch get-metric-statistics \\`);
            console.log(`     --namespace AWS/Bedrock \\`);
            console.log(`     --metric-name InvocationCount \\`);
            if (model.requiresInferenceProfile && model.inferenceProfileArn) {
                console.log(`     --dimensions Name=InferenceProfileId,Value=${model.inferenceProfileArn.split('/').pop()} \\`);
            } else {
                console.log(`     --dimensions Name=ModelId,Value=${model.actualModelId} \\`);
            }
            console.log(`     --start-time ${new Date(model.requestTimestamp).toISOString()} \\`);
            console.log(`     --end-time ${new Date(model.responseTimestamp).toISOString()} \\`);
            console.log(`     --period 60 \\`);
            console.log(`     --statistics Sum`);
        }
    });
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Check AWS CloudWatch Logs for Bedrock invocations');
    console.log('   2. Verify charges in AWS Cost Explorer');
    console.log('   3. Confirm model IDs and regions match expectations');
    console.log('   4. Validate inference profile ARNs are being used correctly');
    
    console.log('\n' + '='.repeat(80));
    
    // Save report to file
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '..', 'reports', 'bedrock-validation-report.json');
    
    try {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));
        console.log(`\n💾 Full report saved to: ${reportPath}`);
        
        // Also save a human-readable markdown report
        const mdReportPath = path.join(__dirname, '..', 'reports', 'bedrock-validation-report.md');
        const mdReport = generateMarkdownReport();
        fs.writeFileSync(mdReportPath, mdReport);
        console.log(`💾 Markdown report saved to: ${mdReportPath}`);
    } catch (error) {
        console.error(`\n⚠️  Could not save report: ${error.message}`);
    }
    
    return validationResults;
}

/**
 * Generate markdown format report
 */
function generateMarkdownReport() {
    let md = '# AWS Bedrock Live Validation Report\n\n';
    md += `**Generated:** ${validationResults.timestamp}\n\n`;
    md += `**Region:** ${validationResults.region}\n\n`;
    md += `**Provider:** AWS Bedrock (provider=bedrock)\n\n`;
    
    md += '## Models Tested\n\n';
    validationResults.models.forEach(model => {
        if (model.success) {
            md += `### ✅ ${model.displayName}\n\n`;
            md += `- **Model ID:** \`${model.actualModelId}\`\n`;
            if (model.requiresInferenceProfile) {
                md += `- **Inference Profile ARN:** \`${model.inferenceProfileArn}\`\n`;
                md += `- **Cross-Region Access:** Enabled\n`;
            }
            md += `- **Region:** ${model.region}\n`;
            md += `- **Latency:** ${model.latency}ms\n`;
            md += `- **Tokens:** ${model.usage.input_tokens} input + ${model.usage.output_tokens} output\n`;
            md += `- **Cost:** $${model.cost.toFixed(6)} USD\n`;
            md += `- **Request Timestamp:** ${model.requestTimestamp}\n`;
            md += `- **Response Timestamp:** ${model.responseTimestamp}\n`;
            md += `- **HTTP Status:** ${model.httpStatus}\n\n`;
            md += `**Response:**\n> ${model.response.substring(0, 200)}\n\n`;
        } else {
            md += `### ❌ ${model.displayName}\n\n`;
            md += `- **Error:** ${model.error}\n`;
            md += `- **HTTP Status:** ${model.httpStatus || 'N/A'}\n\n`;
        }
    });
    
    md += `## Cost Summary\n\n`;
    md += `**Total Cost:** $${validationResults.totalCost.toFixed(6)} USD\n\n`;
    
    md += '## CloudWatch Verification Commands\n\n';
    md += '```bash\n';
    validationResults.models.forEach(model => {
        if (model.success) {
            md += `# ${model.displayName}\n`;
            md += `aws cloudwatch get-metric-statistics \\\n`;
            md += `  --namespace AWS/Bedrock \\\n`;
            md += `  --metric-name InvocationCount \\\n`;
            if (model.requiresInferenceProfile && model.inferenceProfileArn) {
                md += `  --dimensions Name=InferenceProfileId,Value=${model.inferenceProfileArn.split('/').pop()} \\\n`;
            } else {
                md += `  --dimensions Name=ModelId,Value=${model.actualModelId} \\\n`;
            }
            md += `  --start-time ${new Date(model.requestTimestamp).toISOString()} \\\n`;
            md += `  --end-time ${new Date(model.responseTimestamp).toISOString()} \\\n`;
            md += `  --period 60 \\\n`;
            md += `  --statistics Sum\n\n`;
        }
    });
    md += '```\n\n';
    
    md += '## Billing Verification\n\n';
    md += '1. Navigate to AWS Cost Explorer\n';
    md += '2. Set time range: Last 24 hours\n';
    md += '3. Filter by Service: Amazon Bedrock\n';
    md += '4. Expected charges:\n\n';
    validationResults.models.forEach(model => {
        if (model.success) {
            md += `   - **${model.displayName}:** $${model.cost.toFixed(6)} USD\n`;
            if (model.requiresInferenceProfile) {
                md += `     - Inference Profile: \`${model.inferenceProfileArn}\`\n`;
            }
        }
    });
    
    return md;
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
        for (let i = 0; i < VALIDATION_CONFIG.models.length; i++) {
            const modelConfig = VALIDATION_CONFIG.models[i];
            const success = await testModel(provider, modelConfig);
            allSuccessful = allSuccessful && success;
            
            // Add delay between model tests to avoid rate limiting
            if (i < VALIDATION_CONFIG.models.length - 1) {
                console.log(`\n⏳ Waiting ${VALIDATION_CONFIG.requestDelay}ms before next model test to avoid rate limiting...`);
                await sleep(VALIDATION_CONFIG.requestDelay);
            }
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
        
        // Generate and save report
        const report = generateReport();
        
        // Check for distinct request IDs
        console.log('\n🔍 Checking for distinct request IDs...');
        const hasDistinctIds = checkDistinctRequestIds(validationResults);
        if (!hasDistinctIds && STRICT_MODE) {
            console.error('\n❌ STRICT MODE: Duplicate request IDs detected - FAILED');
            process.exit(1);
        }
        
        // Save summary report
        await saveSummaryReport();
        
        // Check strict mode validation
        if (STRICT_MODE) {
            console.log('\n🔒 Running STRICT MODE validations...');
            
            const successfulInvocations = validationResults.models.filter(m => m.success).length;
            const totalInvocations = validationResults.models.length;
            
            if (successfulInvocations === 0) {
                console.error('\n❌ STRICT MODE: Zero successful invocations - FAILED');
                process.exit(1);
            }
            
            // Check per-model success enforcement
            if (successfulInvocations < totalInvocations) {
                console.error(`\n❌ STRICT MODE: Not all models succeeded (${successfulInvocations}/${totalInvocations}) - FAILED`);
                process.exit(1);
            }
            
            if (validationResults.models.some(m => m.hasPlaceholders)) {
                console.error('\n❌ STRICT MODE: Placeholder strings detected in invocations - FAILED');
                process.exit(1);
            }
            
            // Check validations passed for all models
            const allValidationsPassed = validationResults.models
                .filter(m => m.success)
                .every(m => m.validations && m.validations.requestIdValid && m.validations.hasRealTokens);
            
            if (!allValidationsPassed) {
                console.error('\n❌ STRICT MODE: Some validation checks failed (request ID or token validation) - FAILED');
                process.exit(1);
            }
            
            console.log('✅ STRICT MODE: All validations passed');
        }
        
        // Exit with appropriate code
        if (allSuccessful && validationResults.errors.length === 0) {
            console.log('\n✅ Validation completed successfully!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Validation completed with errors');
            process.exit(STRICT_MODE ? 1 : 0);
        }
        
    } catch (error) {
        console.error('\n❌ Validation failed with error:');
        console.error(error);
        validationResults.errors.push(`Fatal error: ${error.message}`);
        await saveSummaryReport();
        generateReport();
        process.exit(1);
    }
}

/**
 * Save summary report to reports/bedrock-invocation-summary.json
 */
async function saveSummaryReport() {
    try {
        const reportsDir = path.join(__dirname, '..', 'reports');
        await fs.mkdir(reportsDir, { recursive: true });
        
        const filepath = path.join(reportsDir, 'bedrock-invocation-summary.json');
        await fs.writeFile(filepath, JSON.stringify(validationResults, null, 2));
        
        console.log(`\n📄 Summary report saved: reports/bedrock-invocation-summary.json`);
    } catch (error) {
        console.error(`❌ Failed to save summary report: ${error.message}`);
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
