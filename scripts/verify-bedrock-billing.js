#!/usr/bin/env node

/**
 * AWS Bedrock CloudWatch Metrics Verification Script
 * 
 * Polls CloudWatch for Bedrock invocation metrics to verify actual usage.
 * Provides billing/cost signal corroboration.
 * 
 * Usage:
 *   node scripts/verify-bedrock-billing.js
 *   node scripts/verify-bedrock-billing.js --start-time 2025-01-15T10:00:00Z
 */

const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const fs = require('fs').promises;
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const startTimeArg = args.find(arg => arg.startsWith('--start-time='));
const DEFAULT_LOOKBACK_HOURS = 24;

class BedrockBillingVerifier {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.cloudwatch = new CloudWatchClient({
            region: this.region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        this.metrics = {
            timestamp: new Date().toISOString(),
            region: this.region,
            models: {}
        };
        
        // Models to check
        this.modelsToCheck = [
            {
                key: 'claude-sonnet-4-5',
                modelId: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
                displayName: 'Claude Sonnet 4.5'
            },
            {
                key: 'claude-opus-4-1',
                modelId: 'anthropic.claude-opus-4-1-20250805-v1:0',
                displayName: 'Claude Opus 4.1'
            }
        ];
    }

    /**
     * Get time range for metrics query
     */
    getTimeRange() {
        const endTime = new Date();
        let startTime;
        
        if (startTimeArg) {
            const timeValue = startTimeArg.split('=')[1];
            startTime = new Date(timeValue);
        } else {
            startTime = new Date(endTime.getTime() - (DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000));
        }
        
        return { startTime, endTime };
    }

    /**
     * Query CloudWatch metrics for a specific model
     */
    async queryModelMetrics(model) {
        console.log(`\n📊 Querying metrics for ${model.displayName}...`);
        
        const { startTime, endTime } = this.getTimeRange();
        
        console.log(`   Time Range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
        
        try {
            // Query InvocationCount metric
            const invocationCommand = new GetMetricStatisticsCommand({
                Namespace: 'AWS/Bedrock',
                MetricName: 'InvocationCount',
                Dimensions: [
                    {
                        Name: 'ModelId',
                        Value: model.modelId
                    }
                ],
                StartTime: startTime,
                EndTime: endTime,
                Period: 300, // 5 minutes
                Statistics: ['Sum']
            });
            
            const invocationResponse = await this.cloudwatch.send(invocationCommand);
            
            // Query InvocationLatency metric
            const latencyCommand = new GetMetricStatisticsCommand({
                Namespace: 'AWS/Bedrock',
                MetricName: 'InvocationLatency',
                Dimensions: [
                    {
                        Name: 'ModelId',
                        Value: model.modelId
                    }
                ],
                StartTime: startTime,
                EndTime: endTime,
                Period: 300,
                Statistics: ['Average', 'Maximum', 'Minimum']
            });
            
            const latencyResponse = await this.cloudwatch.send(latencyCommand);
            
            // Process results
            const totalInvocations = invocationResponse.Datapoints
                .reduce((sum, dp) => sum + (dp.Sum || 0), 0);
            
            const avgLatency = latencyResponse.Datapoints.length > 0
                ? latencyResponse.Datapoints.reduce((sum, dp) => sum + (dp.Average || 0), 0) / latencyResponse.Datapoints.length
                : 0;
            
            this.metrics.models[model.key] = {
                modelId: model.modelId,
                displayName: model.displayName,
                invocations: {
                    total: totalInvocations,
                    datapoints: invocationResponse.Datapoints.length,
                    details: invocationResponse.Datapoints.map(dp => ({
                        timestamp: dp.Timestamp,
                        count: dp.Sum
                    }))
                },
                latency: {
                    average: avgLatency,
                    datapoints: latencyResponse.Datapoints.length,
                    details: latencyResponse.Datapoints.map(dp => ({
                        timestamp: dp.Timestamp,
                        avg: dp.Average,
                        max: dp.Maximum,
                        min: dp.Minimum
                    }))
                }
            };
            
            console.log(`   ✅ Total Invocations: ${totalInvocations}`);
            console.log(`   ✅ Datapoints: ${invocationResponse.Datapoints.length}`);
            if (totalInvocations > 0) {
                console.log(`   ✅ Average Latency: ${avgLatency.toFixed(2)}ms`);
            } else {
                console.log(`   ℹ️  No invocations found in time range (this is normal if validation hasn't run yet)`);
            }
            
            return totalInvocations > 0;
            
        } catch (error) {
            console.error(`   ❌ Failed to query metrics: ${error.message}`);
            
            this.metrics.models[model.key] = {
                modelId: model.modelId,
                displayName: model.displayName,
                error: error.message,
                note: 'Metrics may not be available immediately after first use (15-30 min delay)'
            };
            
            return false;
        }
    }

    /**
     * Generate verification report
     */
    async generateReport() {
        console.log('\n📝 Generating Billing Verification Report...');
        
        try {
            const reportsDir = path.join(__dirname, '..', 'reports');
            await fs.mkdir(reportsDir, { recursive: true });
            
            // Calculate totals
            this.metrics.summary = {
                totalInvocations: 0,
                modelsWithMetrics: 0,
                modelsWithErrors: 0
            };
            
            Object.values(this.metrics.models).forEach(model => {
                if (model.error) {
                    this.metrics.summary.modelsWithErrors++;
                } else {
                    this.metrics.summary.totalInvocations += model.invocations.total || 0;
                    if (model.invocations.total > 0) {
                        this.metrics.summary.modelsWithMetrics++;
                    }
                }
            });
            
            // Save report
            const filepath = path.join(reportsDir, 'bedrock-metrics.json');
            await fs.writeFile(filepath, JSON.stringify(this.metrics, null, 2));
            
            console.log(`   ✅ Report saved: reports/bedrock-metrics.json`);
            console.log(`\n📊 Metrics Summary:`);
            console.log(`   Total Invocations Found: ${this.metrics.summary.totalInvocations}`);
            console.log(`   Models with Metrics: ${this.metrics.summary.modelsWithMetrics}`);
            console.log(`   Models with Errors: ${this.metrics.summary.modelsWithErrors}`);
            
            return true;
        } catch (error) {
            console.error(`   ❌ Failed to generate report: ${error.message}`);
            return false;
        }
    }

    /**
     * Run verification
     */
    async verify() {
        console.log('🚀 AWS Bedrock CloudWatch Metrics Verification');
        console.log('='.repeat(80));
        console.log('ℹ️  Note: CloudWatch metrics may have 15-30 minute delay after first use');
        console.log('='.repeat(80));
        
        let anyMetricsFound = false;
        
        for (const model of this.modelsToCheck) {
            const found = await this.queryModelMetrics(model);
            anyMetricsFound = anyMetricsFound || found;
        }
        
        await this.generateReport();
        
        console.log('\n' + '='.repeat(80));
        if (anyMetricsFound) {
            console.log('✅ Metrics Verification Complete - Invocations found');
            return 0;
        } else {
            console.log('ℹ️  No metrics found (normal if validation hasn\'t run or metrics delayed)');
            return 0; // Non-fatal, as metrics may be delayed
        }
    }
}

// Run if called directly
if (require.main === module) {
    const verifier = new BedrockBillingVerifier();
    verifier.verify()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = BedrockBillingVerifier;
