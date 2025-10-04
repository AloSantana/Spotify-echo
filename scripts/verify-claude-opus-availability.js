#!/usr/bin/env node

/**
 * Claude Opus 4.1 Availability Verification Script
 * 
 * This script helps verify if Claude Opus 4.1 is available in your AWS Bedrock account
 * and provides recommendations for configuration updates.
 * 
 * Usage:
 *   AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_REGION=us-east-1 node scripts/verify-claude-opus-availability.js
 */

const { BedrockClient, ListFoundationModelsCommand, ListInferenceProfilesCommand } = require('@aws-sdk/client-bedrock');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkCredentials() {
    log('\n🔐 Step 1: Checking AWS Credentials...', 'cyan');
    
    const credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
    };
    
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        log('❌ Missing AWS credentials', 'red');
        log('   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables', 'yellow');
        return null;
    }
    
    log(`✅ AWS_ACCESS_KEY_ID: ${credentials.accessKeyId.substring(0, 8)}...`, 'green');
    log(`✅ AWS_REGION: ${credentials.region}`, 'green');
    
    return credentials;
}

async function listClaudeModels(credentials) {
    log('\n📋 Step 2: Listing All Claude Models in AWS Bedrock...', 'cyan');
    
    try {
        const client = new BedrockClient({
            region: credentials.region,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey
            }
        });
        
        const command = new ListFoundationModelsCommand({
            byProvider: 'Anthropic'
        });
        
        const response = await client.send(command);
        
        log(`\n✅ Found ${response.modelSummaries.length} Anthropic models in ${credentials.region}:`, 'green');
        
        const opusModels = [];
        const sonnetModels = [];
        const otherModels = [];
        
        response.modelSummaries.forEach(model => {
            const info = {
                modelId: model.modelId,
                modelName: model.modelName,
                modelArn: model.modelArn
            };
            
            if (model.modelName.toLowerCase().includes('opus')) {
                opusModels.push(info);
            } else if (model.modelName.toLowerCase().includes('sonnet')) {
                sonnetModels.push(info);
            } else {
                otherModels.push(info);
            }
        });
        
        if (opusModels.length > 0) {
            log('\n📌 Claude Opus Models:', 'magenta');
            opusModels.forEach(model => {
                log(`   • ${model.modelName}`, 'blue');
                log(`     ID: ${model.modelId}`, 'reset');
            });
        } else {
            log('\n⚠️  No Claude Opus models found', 'yellow');
            log('   This suggests Claude Opus 4.1 is not yet available in your account/region', 'yellow');
        }
        
        if (sonnetModels.length > 0) {
            log('\n📌 Claude Sonnet Models:', 'magenta');
            sonnetModels.forEach(model => {
                log(`   • ${model.modelName}`, 'blue');
                log(`     ID: ${model.modelId}`, 'reset');
            });
        }
        
        if (otherModels.length > 0) {
            log('\n📌 Other Claude Models:', 'magenta');
            otherModels.forEach(model => {
                log(`   • ${model.modelName}`, 'blue');
                log(`     ID: ${model.modelId}`, 'reset');
            });
        }
        
        return { opusModels, sonnetModels, allModels: response.modelSummaries };
        
    } catch (error) {
        log(`❌ Error listing models: ${error.message}`, 'red');
        if (error.name === 'AccessDeniedException') {
            log('   ⚠️  Access denied - check IAM permissions for bedrock:ListFoundationModels', 'yellow');
        }
        return null;
    }
}

async function listInferenceProfiles(credentials) {
    log('\n📋 Step 3: Listing Inference Profiles...', 'cyan');
    
    try {
        const client = new BedrockClient({
            region: credentials.region,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey
            }
        });
        
        const command = new ListInferenceProfilesCommand({});
        const response = await client.send(command);
        
        log(`\n✅ Found ${response.inferenceProfileSummaries.length} inference profiles in ${credentials.region}:`, 'green');
        
        const opusProfiles = [];
        const sonnetProfiles = [];
        
        response.inferenceProfileSummaries.forEach(profile => {
            const info = {
                profileName: profile.inferenceProfileName,
                profileArn: profile.inferenceProfileArn,
                profileId: profile.inferenceProfileId,
                type: profile.type,
                models: profile.models || []
            };
            
            if (profile.inferenceProfileName.toLowerCase().includes('opus')) {
                opusProfiles.push(info);
            } else if (profile.inferenceProfileName.toLowerCase().includes('sonnet')) {
                sonnetProfiles.push(info);
            }
        });
        
        if (opusProfiles.length > 0) {
            log('\n📌 Claude Opus Inference Profiles:', 'magenta');
            opusProfiles.forEach(profile => {
                log(`   • ${profile.profileName}`, 'blue');
                log(`     ARN: ${profile.profileArn}`, 'reset');
                log(`     ID: ${profile.profileId}`, 'reset');
                log(`     Type: ${profile.type}`, 'reset');
            });
        } else {
            log('\n⚠️  No Claude Opus inference profiles found', 'yellow');
        }
        
        if (sonnetProfiles.length > 0) {
            log('\n📌 Claude Sonnet Inference Profiles:', 'magenta');
            sonnetProfiles.forEach(profile => {
                log(`   • ${profile.profileName}`, 'blue');
                log(`     ARN: ${profile.profileArn}`, 'reset');
                log(`     ID: ${profile.profileId}`, 'reset');
            });
        }
        
        return { opusProfiles, sonnetProfiles, allProfiles: response.inferenceProfileSummaries };
        
    } catch (error) {
        log(`❌ Error listing inference profiles: ${error.message}`, 'red');
        if (error.name === 'AccessDeniedException') {
            log('   ⚠️  Access denied - check IAM permissions for bedrock:ListInferenceProfiles', 'yellow');
        }
        return null;
    }
}

async function testModelInvocation(credentials, modelId, modelName) {
    log(`\n🧪 Step 4: Testing ${modelName} Invocation...`, 'cyan');
    
    try {
        const client = new BedrockRuntimeClient({
            region: credentials.region,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey
            }
        });
        
        const requestBody = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 100,
            messages: [
                { role: 'user', content: 'Hello! Confirm you are working. Just say "Working" and nothing else.' }
            ],
            temperature: 0.7
        };
        
        const command = new InvokeModelCommand({
            modelId: modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
        });
        
        log(`   Testing with model ID: ${modelId}`, 'blue');
        
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        log(`\n✅ ${modelName} is WORKING!`, 'green');
        log(`   Response: "${responseBody.content[0].text}"`, 'reset');
        log(`   Tokens: ${responseBody.usage.input_tokens} in, ${responseBody.usage.output_tokens} out`, 'reset');
        
        return true;
        
    } catch (error) {
        log(`\n❌ ${modelName} test FAILED:`, 'red');
        log(`   Error: ${error.message}`, 'red');
        
        if (error.name === 'ValidationException') {
            log('   ⚠️  Model identifier is invalid or model not available', 'yellow');
        } else if (error.name === 'AccessDeniedException') {
            log('   ⚠️  Access denied - check IAM permissions for bedrock:InvokeModel', 'yellow');
        } else if (error.name === 'ResourceNotFoundException') {
            log('   ⚠️  Model not found in this region', 'yellow');
        }
        
        return false;
    }
}

function generateRecommendations(results) {
    log('\n' + '='.repeat(80), 'cyan');
    log('📊 RECOMMENDATIONS & NEXT STEPS', 'cyan');
    log('='.repeat(80), 'cyan');
    
    if (!results.modelsData || !results.modelsData.opusModels || results.modelsData.opusModels.length === 0) {
        log('\n⚠️  Claude Opus 4.1 NOT Available', 'yellow');
        log('\nRECOMMENDED ACTIONS:', 'magenta');
        log('\n1. Use Claude 3 Opus (confirmed available):', 'blue');
        log('   Model ID: anthropic.claude-3-opus-20240229-v1:0', 'reset');
        log('   Config:', 'reset');
        log('   {', 'reset');
        log('     "requiresInferenceProfile": false,', 'reset');
        log('     "inferenceProfileArn": null', 'reset');
        log('   }', 'reset');
        
        log('\n2. Use Claude 3.5 Sonnet v2 (also high capability):', 'blue');
        log('   Model ID: anthropic.claude-3-5-sonnet-20241022-v2:0', 'reset');
        log('   Benefits: Vision support, 8192 max tokens', 'reset');
        
        log('\n3. Monitor for Claude Opus 4.1 availability:', 'blue');
        log('   • Check AWS Bedrock console regularly', 'reset');
        log('   • Re-run this script periodically', 'reset');
        log('   • Subscribe to AWS Bedrock announcements', 'reset');
        
    } else {
        log('\n✅ Claude Opus Models ARE Available!', 'green');
        log('\nUpdate your config with the found model ID:', 'blue');
        results.modelsData.opusModels.forEach(model => {
            log(`\n   Model ID: ${model.modelId}`, 'reset');
        });
    }
    
    if (results.profilesData && results.profilesData.opusProfiles && results.profilesData.opusProfiles.length > 0) {
        log('\n✅ Claude Opus Inference Profiles Available!', 'green');
        log('\nUpdate your config with the found ARN:', 'blue');
        results.profilesData.opusProfiles.forEach(profile => {
            log(`\n   ARN: ${profile.profileArn}`, 'reset');
            log(`   Profile ID: ${profile.profileId}`, 'reset');
        });
    }
    
    log('\n' + '='.repeat(80), 'cyan');
    log('\n📝 Configuration Update Example:', 'magenta');
    log('\nIf using Claude 3 Opus (recommended fallback):', 'blue');
    log(`
{
  "claude-opus-fallback": {
    "modelId": "anthropic.claude-3-opus-20240229-v1:0",
    "displayName": "Claude 3 Opus",
    "provider": "anthropic",
    "family": "claude-3",
    "capabilities": ["text-generation", "conversation", "analysis", "vision"],
    "contextWindow": 200000,
    "maxOutputTokens": 4096,
    "requiresInferenceProfile": false,
    "inferenceProfileArn": null,
    "regions": ["us-east-1", "us-west-2", "eu-west-1"],
    "deprecated": false,
    "priority": 1
  }
}
    `, 'reset');
    
    log('\n' + '='.repeat(80), 'cyan');
}

async function main() {
    log('╔════════════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  Claude Opus 4.1 Availability Verification Script                     ║', 'cyan');
    log('║  Checks AWS Bedrock for model availability and configuration          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════════════╝', 'cyan');
    
    const results = {};
    
    // Step 1: Check credentials
    const credentials = await checkCredentials();
    if (!credentials) {
        process.exit(1);
    }
    
    // Step 2: List all Claude models
    const modelsData = await listClaudeModels(credentials);
    results.modelsData = modelsData;
    
    // Step 3: List inference profiles
    const profilesData = await listInferenceProfiles(credentials);
    results.profilesData = profilesData;
    
    // Step 4: Test model invocations if available
    if (modelsData && modelsData.opusModels && modelsData.opusModels.length > 0) {
        log('\n🧪 Testing Claude Opus model invocation...', 'cyan');
        for (const model of modelsData.opusModels) {
            await testModelInvocation(credentials, model.modelId, model.modelName);
        }
    }
    
    // Test Claude 3 Opus as fallback
    if (modelsData && modelsData.allModels) {
        const claude3Opus = modelsData.allModels.find(m => 
            m.modelId === 'anthropic.claude-3-opus-20240229-v1:0'
        );
        if (claude3Opus) {
            await testModelInvocation(credentials, claude3Opus.modelId, 'Claude 3 Opus (Fallback)');
        }
    }
    
    // Generate recommendations
    generateRecommendations(results);
    
    log('\n✅ Verification complete!', 'green');
    log('\nFor more information, see: CRITICAL_FIXES_REPORT.md', 'cyan');
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        log(`\n❌ Fatal error: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    });
}

module.exports = { checkCredentials, listClaudeModels, listInferenceProfiles, testModelInvocation };
