#!/usr/bin/env node

/**
 * AWS Bedrock Evidence Collection Script
 * 
 * Collects comprehensive evidence of Bedrock availability and usage:
 * - AWS identity verification (STS)
 * - Available Bedrock models
 * - Inference profiles (if available)
 * - Aggregated invocation logs
 * - Usage and cost summary
 * 
 * Usage:
 *   node scripts/collect-bedrock-evidence.js
 */

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { BedrockClient, ListFoundationModelsCommand, ListInferenceProfilesCommand } = require('@aws-sdk/client-bedrock');
const fs = require('fs').promises;
const path = require('path');

/**
 * Assert that a required module is available
 */
function assertModule(name) {
    try {
        require.resolve(name);
    } catch (e) {
        console.error(`❌ [INSTALL_FAILURE] Required module '${name}' not found.`);
        console.error('   This indicates the npm install phase likely failed.');
        process.exit(10);
    }
}

// Verify critical AWS SDK modules
console.log('🔍 Verifying required AWS SDK modules...');
['@aws-sdk/client-sts', '@aws-sdk/client-bedrock'].forEach(mod => {
    assertModule(mod);
    console.log(`   ✅ ${mod}`);
});
console.log('✅ All required modules verified\n');

class BedrockEvidenceCollector {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.evidence = {
            timestamp: new Date().toISOString(),
            region: this.region,
            identity: null,
            models: [],
            inferenceProfiles: [],
            invocations: [],
            summary: {
                totalInvocations: 0,
                successfulInvocations: 0,
                failedInvocations: 0,
                totalCost: 0,
                totalTokensUsed: 0
            }
        };
    }

    /**
     * Collect AWS identity
     */
    async collectIdentity() {
        console.log('🔐 Collecting AWS Identity...');
        
        // Verify credentials are present
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        
        if (!accessKeyId || !secretAccessKey) {
            console.error('   ❌ AWS credentials not found in environment');
            this.evidence.identity = { 
                error: 'Missing AWS credentials',
                accessKeyIdPresent: !!accessKeyId,
                secretAccessKeyPresent: !!secretAccessKey
            };
            return false;
        }
        
        // Log credential fingerprint (first 4 and last 4 chars only)
        console.log(`   🔑 Access Key ID fingerprint: ${accessKeyId.substring(0, 4)}****${accessKeyId.substring(accessKeyId.length - 4)}`);
        console.log(`   🔑 Secret Key fingerprint: ***${secretAccessKey.substring(secretAccessKey.length - 4)}`);
        
        try {
            const stsClient = new STSClient({
                region: this.region,
                credentials: {
                    accessKeyId,
                    secretAccessKey
                }
            });
            
            const command = new GetCallerIdentityCommand({});
            const response = await stsClient.send(command);
            
            this.evidence.identity = {
                account: response.Account,
                arn: response.Arn,
                userId: response.UserId
            };
            
            console.log(`   ✅ Account: ${response.Account}`);
            console.log(`   ✅ ARN: ${response.Arn}`);
            
            // Save to reports
            await this.saveReport('aws-identity.json', this.evidence.identity);
            
            return true;
        } catch (error) {
            console.error(`   ❌ Failed to get identity: ${error.message}`);
            this.evidence.identity = { error: error.message };
            return false;
        }
    }

    /**
     * Collect available Bedrock models
     */
    async collectModels() {
        console.log('\n📦 Collecting Bedrock Models...');
        
        try {
            const bedrockClient = new BedrockClient({
                region: this.region,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            });
            
            const command = new ListFoundationModelsCommand({
                byProvider: 'Anthropic'  // Filter for Anthropic models
            });
            
            const response = await bedrockClient.send(command);
            
            this.evidence.models = response.modelSummaries || [];
            
            console.log(`   ✅ Found ${this.evidence.models.length} Anthropic models`);
            
            // Log key models
            const claudeModels = this.evidence.models.filter(m => 
                m.modelId.includes('claude-4') || m.modelId.includes('opus') || m.modelId.includes('sonnet-4') || m.modelId.includes('claude-3-opus')
            );
            
            claudeModels.forEach(model => {
                console.log(`      - ${model.modelName}: ${model.modelId}`);
            });
            
            // Save to reports
            await this.saveReport('bedrock-models.json', this.evidence.models);
            
            return true;
        } catch (error) {
            console.error(`   ❌ Failed to list models: ${error.message}`);
            this.evidence.models = [{ error: error.message }];
            return false;
        }
    }

    /**
     * Collect inference profiles (optional, may not exist in all accounts)
     */
    async collectInferenceProfiles() {
        console.log('\n🔍 Collecting Inference Profiles...');
        
        try {
            const bedrockClient = new BedrockClient({
                region: this.region,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            });
            
            const command = new ListInferenceProfilesCommand({});
            const response = await bedrockClient.send(command);
            
            this.evidence.inferenceProfiles = response.inferenceProfileSummaries || [];
            
            if (this.evidence.inferenceProfiles.length > 0) {
                console.log(`   ✅ Found ${this.evidence.inferenceProfiles.length} inference profiles`);
                this.evidence.inferenceProfiles.forEach(profile => {
                    console.log(`      - ${profile.inferenceProfileName}: ${profile.inferenceProfileArn}`);
                });
            } else {
                console.log('   ℹ️  No inference profiles found (this is normal for new accounts)');
            }
            
            // Save to reports
            await this.saveReport('bedrock-inference-profiles.json', this.evidence.inferenceProfiles);
            
            return true;
        } catch (error) {
            // This is non-fatal - inference profiles may not be available
            console.log(`   ℹ️  Inference profiles not available: ${error.message}`);
            this.evidence.inferenceProfiles = [];
            return true; // Don't fail on this
        }
    }

    /**
     * Aggregate invocation logs
     */
    async aggregateInvocations() {
        console.log('\n📊 Aggregating Invocation Logs...');
        
        try {
            const logsDir = path.join(__dirname, '..', 'logs', 'bedrock', 'invocations');
            
            // Check if directory exists
            try {
                await fs.access(logsDir);
            } catch {
                console.log('   ℹ️  No invocation logs found');
                return true;
            }
            
            const files = await fs.readdir(logsDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            console.log(`   Found ${jsonFiles.length} invocation logs`);
            
            for (const file of jsonFiles) {
                try {
                    const content = await fs.readFile(path.join(logsDir, file), 'utf-8');
                    const invocation = JSON.parse(content);
                    this.evidence.invocations.push(invocation);
                    
                    // Update summary
                    this.evidence.summary.totalInvocations++;
                    if (invocation.success) {
                        this.evidence.summary.successfulInvocations++;
                        this.evidence.summary.totalCost += invocation.cost || 0;
                        this.evidence.summary.totalTokensUsed += 
                            (invocation.usage?.input_tokens || 0) + 
                            (invocation.usage?.output_tokens || 0);
                    } else {
                        this.evidence.summary.failedInvocations++;
                    }
                } catch (error) {
                    console.error(`   ⚠️  Failed to parse ${file}: ${error.message}`);
                }
            }
            
            console.log(`   ✅ Aggregated ${this.evidence.invocations.length} invocations`);
            console.log(`      Successful: ${this.evidence.summary.successfulInvocations}`);
            console.log(`      Failed: ${this.evidence.summary.failedInvocations}`);
            console.log(`      Total Cost: $${this.evidence.summary.totalCost.toFixed(6)}`);
            console.log(`      Total Tokens: ${this.evidence.summary.totalTokensUsed}`);
            
            return true;
        } catch (error) {
            console.error(`   ❌ Failed to aggregate invocations: ${error.message}`);
            return false;
        }
    }

    /**
     * Save report to reports directory
     */
    async saveReport(filename, data) {
        try {
            const reportsDir = path.join(__dirname, '..', 'reports');
            await fs.mkdir(reportsDir, { recursive: true });
            
            const filepath = path.join(reportsDir, filename);
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            
            return filepath;
        } catch (error) {
            console.error(`Failed to save ${filename}: ${error.message}`);
        }
    }

    /**
     * Generate final evidence report
     */
    async generateFinalReport() {
        console.log('\n📝 Generating Final Evidence Report...');
        
        // Add validation checks
        this.evidence.validation = {
            hasIdentity: this.evidence.identity && !this.evidence.identity.error,
            hasModels: this.evidence.models.length > 0 && !this.evidence.models[0].error,
            hasInvocations: this.evidence.invocations.length > 0,
            allInvocationsSuccessful: this.evidence.summary.failedInvocations === 0,
            hasRequestIds: this.evidence.invocations.every(inv => inv.requestId)
        };
        
        // Anti-mock check
        const fullContent = JSON.stringify(this.evidence);
        this.evidence.validation.hasPlaceholders = 
            fullContent.includes('[DEMO]') || 
            fullContent.includes('[PLACEHOLDER]') || 
            fullContent.includes('[MOCK]');
        
        // Overall validation status
        this.evidence.validation.isValid = 
            this.evidence.validation.hasIdentity &&
            this.evidence.validation.hasModels &&
            this.evidence.validation.hasInvocations &&
            !this.evidence.validation.hasPlaceholders;
        
        // Save comprehensive evidence report
        await this.saveReport('bedrock-evidence-complete.json', this.evidence);
        
        console.log('\n📋 Evidence Collection Summary:');
        console.log(`   AWS Identity: ${this.evidence.validation.hasIdentity ? '✅' : '❌'}`);
        console.log(`   Models Available: ${this.evidence.validation.hasModels ? '✅' : '❌'}`);
        console.log(`   Invocations Found: ${this.evidence.validation.hasInvocations ? '✅' : '❌'}`);
        console.log(`   All Successful: ${this.evidence.validation.allInvocationsSuccessful ? '✅' : '⚠️'}`);
        console.log(`   Has Request IDs: ${this.evidence.validation.hasRequestIds ? '✅' : '❌'}`);
        console.log(`   No Placeholders: ${!this.evidence.validation.hasPlaceholders ? '✅' : '❌'}`);
        console.log(`\n   Overall Valid: ${this.evidence.validation.isValid ? '✅' : '❌'}`);
        
        return this.evidence.validation.isValid;
    }

    /**
     * Run full evidence collection
     */
    async collect() {
        console.log('🚀 AWS Bedrock Evidence Collection');
        console.log('='.repeat(80));
        
        await this.collectIdentity();
        await this.collectModels();
        await this.collectInferenceProfiles();
        await this.aggregateInvocations();
        const isValid = await this.generateFinalReport();
        
        console.log('\n' + '='.repeat(80));
        if (isValid) {
            console.log('✅ Evidence Collection Complete - All checks passed');
            return 0;
        } else {
            console.log('⚠️  Evidence Collection Complete - Some checks failed');
            return 1;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const collector = new BedrockEvidenceCollector();
    collector.collect()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = BedrockEvidenceCollector;
