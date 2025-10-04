#!/usr/bin/env node

/**
 * AWS Bedrock Evidence Generator
 * 
 * Generates comprehensive evidence for AWS Bedrock validation including:
 * - CloudWatch query commands
 * - Cost Explorer queries
 * - Billing verification instructions
 * 
 * Usage:
 *   node scripts/generate-bedrock-evidence.js [report-file]
 */

const fs = require('fs');
const path = require('path');

/**
 * Load validation report
 */
function loadReport(reportPath) {
    try {
        if (!reportPath) {
            reportPath = path.join(__dirname, '..', 'reports', 'bedrock-validation-report.json');
        }
        
        if (!fs.existsSync(reportPath)) {
            console.error(`❌ Report file not found: ${reportPath}`);
            console.log('   Run validation first: npm run bedrock:validate');
            process.exit(1);
        }
        
        return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch (error) {
        console.error(`❌ Failed to load report: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Generate CloudWatch queries
 */
function generateCloudWatchQueries(report) {
    console.log('📊 CLOUDWATCH VERIFICATION QUERIES');
    console.log('='.repeat(80));
    console.log('');
    
    report.models.forEach(model => {
        if (!model.success) return;
        
        console.log(`# ${model.displayName}`);
        console.log('# Invocation Count Metric');
        console.log('```bash');
        console.log(`aws cloudwatch get-metric-statistics \\`);
        console.log(`  --namespace AWS/Bedrock \\`);
        console.log(`  --metric-name InvocationCount \\`);
        
        if (model.requiresInferenceProfile && model.inferenceProfileArn) {
            const profileId = model.inferenceProfileArn.split('/').pop();
            console.log(`  --dimensions Name=InferenceProfileId,Value=${profileId} \\`);
        } else {
            console.log(`  --dimensions Name=ModelId,Value=${model.actualModelId} \\`);
        }
        
        const startTime = new Date(model.requestTimestamp);
        const endTime = new Date(model.responseTimestamp);
        
        // Expand time window by 5 minutes on each side
        startTime.setMinutes(startTime.getMinutes() - 5);
        endTime.setMinutes(endTime.getMinutes() + 5);
        
        console.log(`  --start-time ${startTime.toISOString()} \\`);
        console.log(`  --end-time ${endTime.toISOString()} \\`);
        console.log(`  --period 300 \\`);
        console.log(`  --statistics Sum \\`);
        console.log(`  --region ${report.region}`);
        console.log('```');
        console.log('');
        
        console.log('# Token Usage Metric');
        console.log('```bash');
        console.log(`aws cloudwatch get-metric-statistics \\`);
        console.log(`  --namespace AWS/Bedrock \\`);
        console.log(`  --metric-name InputTokens \\`);
        
        if (model.requiresInferenceProfile && model.inferenceProfileArn) {
            const profileId = model.inferenceProfileArn.split('/').pop();
            console.log(`  --dimensions Name=InferenceProfileId,Value=${profileId} \\`);
        } else {
            console.log(`  --dimensions Name=ModelId,Value=${model.actualModelId} \\`);
        }
        
        console.log(`  --start-time ${startTime.toISOString()} \\`);
        console.log(`  --end-time ${endTime.toISOString()} \\`);
        console.log(`  --period 300 \\`);
        console.log(`  --statistics Sum \\`);
        console.log(`  --region ${report.region}`);
        console.log('```');
        console.log('');
        
        console.log('Expected Results:');
        console.log(`  - Invocation Count: >= 1`);
        console.log(`  - Input Tokens: >= ${model.usage.input_tokens}`);
        console.log(`  - Output Tokens: >= ${model.usage.output_tokens}`);
        console.log('');
        console.log('---');
        console.log('');
    });
}

/**
 * Generate Cost Explorer queries
 */
function generateCostExplorerQueries(report) {
    console.log('💳 AWS COST EXPLORER VERIFICATION');
    console.log('='.repeat(80));
    console.log('');
    
    const startDate = new Date(report.timestamp);
    const endDate = new Date();
    
    // Format dates for Cost Explorer (YYYY-MM-DD)
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    console.log('## Using AWS Console:');
    console.log('');
    console.log('1. Navigate to: https://console.aws.amazon.com/cost-management/home#/cost-explorer');
    console.log('2. Settings:');
    console.log(`   - Time Range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
    console.log('   - Granularity: Daily');
    console.log('   - Service: Amazon Bedrock');
    console.log('3. Group by: Usage Type');
    console.log('');
    
    console.log('## Using AWS CLI:');
    console.log('```bash');
    console.log(`aws ce get-cost-and-usage \\`);
    console.log(`  --time-period Start=${formatDate(startDate)},End=${formatDate(endDate)} \\`);
    console.log(`  --granularity DAILY \\`);
    console.log(`  --metrics "BlendedCost" "UsageQuantity" \\`);
    console.log(`  --filter file://bedrock-filter.json \\`);
    console.log(`  --group-by Type=DIMENSION,Key=USAGE_TYPE`);
    console.log('```');
    console.log('');
    
    console.log('## Filter file (bedrock-filter.json):');
    console.log('```json');
    console.log(JSON.stringify({
        "Dimensions": {
            "Key": "SERVICE",
            "Values": ["Amazon Bedrock"]
        }
    }, null, 2));
    console.log('```');
    console.log('');
    
    console.log('## Expected Charges:');
    console.log('');
    let totalExpected = 0;
    report.models.forEach(model => {
        if (model.success) {
            console.log(`- **${model.displayName}:**`);
            if (model.requiresInferenceProfile) {
                console.log(`  - Inference Profile: \`${model.inferenceProfileArn}\``);
            }
            console.log(`  - Model ID: \`${model.actualModelId}\``);
            console.log(`  - Region: ${model.region}`);
            console.log(`  - Input Tokens: ${model.usage.input_tokens}`);
            console.log(`  - Output Tokens: ${model.usage.output_tokens}`);
            console.log(`  - Cost: $${model.cost.toFixed(6)} USD`);
            console.log('');
            totalExpected += model.cost;
        }
    });
    console.log(`**Total Expected Cost:** $${totalExpected.toFixed(6)} USD`);
    console.log('');
}

/**
 * Generate CloudWatch Logs queries
 */
function generateCloudWatchLogsQueries(report) {
    console.log('📝 CLOUDWATCH LOGS VERIFICATION');
    console.log('='.repeat(80));
    console.log('');
    
    console.log('## Using AWS Console:');
    console.log('');
    console.log('1. Navigate to: https://console.aws.amazon.com/cloudwatch/');
    console.log('2. Go to: Logs > Log groups');
    console.log('3. Search for: `/aws/bedrock/modelinvocations`');
    console.log('4. Time range: Last 24 hours');
    console.log('');
    
    console.log('## Using AWS CLI:');
    console.log('');
    
    report.models.forEach(model => {
        if (!model.success) return;
        
        console.log(`# ${model.displayName}`);
        console.log('```bash');
        console.log(`aws logs filter-log-events \\`);
        console.log(`  --log-group-name /aws/bedrock/modelinvocations \\`);
        console.log(`  --start-time $(date -d "${model.requestTimestamp}" +%s)000 \\`);
        console.log(`  --end-time $(date -d "${model.responseTimestamp}" +%s)000 \\`);
        
        if (model.requiresInferenceProfile && model.inferenceProfileArn) {
            console.log(`  --filter-pattern "${model.inferenceProfileArn}" \\`);
        } else {
            console.log(`  --filter-pattern "${model.actualModelId}" \\`);
        }
        
        console.log(`  --region ${report.region} \\`);
        console.log(`  --limit 10`);
        console.log('```');
        console.log('');
    });
}

/**
 * Generate summary document
 */
function generateSummaryDocument(report) {
    console.log('📄 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    
    console.log(`**Validation Timestamp:** ${report.timestamp}`);
    console.log(`**Region:** ${report.region}`);
    console.log(`**Provider:** AWS Bedrock (provider=bedrock)`);
    console.log('');
    
    console.log('## Models Validated:');
    console.log('');
    report.models.forEach(model => {
        if (model.success) {
            console.log(`✅ **${model.displayName}**`);
            console.log(`   - Model ID: \`${model.actualModelId}\``);
            if (model.requiresInferenceProfile) {
                console.log(`   - Inference Profile ARN: \`${model.inferenceProfileArn}\``);
                console.log(`   - Cross-Region: Enabled`);
            }
            console.log(`   - Latency: ${model.latency}ms`);
            console.log(`   - Tokens: ${model.usage.input_tokens} input + ${model.usage.output_tokens} output`);
            console.log(`   - Cost: $${model.cost.toFixed(6)} USD`);
            console.log(`   - HTTP Status: ${model.httpStatus}`);
            console.log('');
        } else {
            console.log(`❌ **${model.displayName}**`);
            console.log(`   - Error: ${model.error}`);
            console.log(`   - HTTP Status: ${model.httpStatus || 'N/A'}`);
            console.log('');
        }
    });
    
    console.log(`## Total Cost: $${report.totalCost.toFixed(6)} USD`);
    console.log('');
    
    console.log('## Verification Checklist:');
    console.log('');
    console.log('- [ ] CloudWatch metrics show invocations for both models');
    console.log('- [ ] Cost Explorer shows charges for both models');
    console.log('- [ ] CloudWatch Logs contain request/response entries');
    console.log('- [ ] Inference profile ARNs used correctly (where applicable)');
    console.log('- [ ] No Vertex AI fallbacks or errors');
    console.log('- [ ] All validations use provider=bedrock');
    console.log('');
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    const reportPath = args[0];
    
    console.log('🔍 AWS Bedrock Evidence Generator');
    console.log('='.repeat(80));
    console.log('');
    
    const report = loadReport(reportPath);
    
    console.log(`✅ Loaded validation report: ${report.timestamp}`);
    console.log(`   Models: ${report.models.length}`);
    console.log(`   Region: ${report.region}`);
    console.log('');
    
    // Generate all evidence sections
    generateSummaryDocument(report);
    console.log('\n\n');
    
    generateCloudWatchQueries(report);
    console.log('\n\n');
    
    generateCostExplorerQueries(report);
    console.log('\n\n');
    
    generateCloudWatchLogsQueries(report);
    console.log('\n\n');
    
    console.log('='.repeat(80));
    console.log('✅ Evidence generation complete!');
    console.log('');
    console.log('💡 Tip: Redirect output to a file for easy reference:');
    console.log('   node scripts/generate-bedrock-evidence.js > bedrock-evidence.md');
    console.log('');
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { loadReport, generateCloudWatchQueries, generateCostExplorerQueries };
