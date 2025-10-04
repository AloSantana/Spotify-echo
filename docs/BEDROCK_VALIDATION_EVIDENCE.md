# AWS Bedrock Validation Evidence Requirements

## Overview

This document outlines the comprehensive validation and evidence requirements for AWS Bedrock integration, specifically for Claude Opus 4.1 and Claude Sonnet 4.5 models using inference profile ARNs.

## Validation Components

### 1. Live Model Invocations

**Script:** `scripts/validate-bedrock-live.js`

**Purpose:** Make actual AWS Bedrock API calls to both models and collect detailed evidence.

**Usage:**
```bash
# With environment variables
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_REGION="us-east-1"
npm run bedrock:validate:live

# Or in CI
npm run bedrock:validate:live  # Uses secrets from GitHub
```

**Evidence Collected:**
- ✅ Request timestamps (ISO 8601)
- ✅ Response timestamps (ISO 8601)
- ✅ Model IDs (actual model IDs used)
- ✅ Inference Profile ARNs (when applicable)
- ✅ Region used (us-east-1)
- ✅ HTTP status codes (200 for success)
- ✅ Token counts (input + output)
- ✅ Latency measurements (milliseconds)
- ✅ Cost calculations (per model)
- ✅ Response content (first 200 chars)

**Output Files:**
- `reports/bedrock-validation-report.json` - Machine-readable report
- `reports/bedrock-validation-report.md` - Human-readable report

### 2. Evidence Generation

**Script:** `scripts/generate-bedrock-evidence.js`

**Purpose:** Generate comprehensive verification commands and queries from validation results.

**Usage:**
```bash
npm run bedrock:evidence

# Or with custom report
node scripts/generate-bedrock-evidence.js path/to/report.json
```

**Evidence Generated:**
1. **CloudWatch Metrics Queries** - Commands to verify invocations
2. **Cost Explorer Queries** - Commands to verify billing
3. **CloudWatch Logs Queries** - Commands to find invocation logs
4. **Verification Checklist** - Step-by-step validation guide

**Output:**
- Console output (redirect to file: `> evidence.md`)
- CloudWatch query commands (ready to run)
- Cost Explorer filter configuration
- Timestamps for verification

### 3. Bedrock-Only Testing

**Script:** `scripts/test-claude-opus-4.1-bedrock.js`

**Purpose:** Comprehensive test suite for Claude Opus 4.1 using AWS Bedrock exclusively (no Vertex AI).

**Usage:**
```bash
node scripts/test-claude-opus-4.1-bedrock.js
```

**Tests:**
- ✅ Configuration validation (model registry)
- ✅ Inference profile ARN verification
- ✅ Provider initialization (BedrockInferenceProvider)
- ✅ Basic completion (with credentials)
- ✅ Token tracking and cost calculation
- ✅ Coding capabilities

**Output:**
- `test-results/claude-opus-41-bedrock-test.json`

## Evidence Requirements Checklist

### Required for PR Approval:

- [ ] **Live Invocations Completed**
  - [ ] Claude Sonnet 4.5 invoked successfully
  - [ ] Claude Opus 4.1 invoked successfully
  - [ ] Both models return HTTP 200 status
  - [ ] Response timestamps within expected latency

- [ ] **Inference Profile ARNs Used**
  - [ ] Claude Sonnet 4.5 uses: `arn:aws:bedrock:us-east-1:394686422207:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0`
  - [ ] Claude Opus 4.1 uses: `arn:aws:bedrock:us-east-1:394686422207:inference-profile/global.anthropic.claude-opus-4-1-20250805-v1:0`
  - [ ] Logs show ARN usage, not direct model IDs

- [ ] **Token Counts Tracked**
  - [ ] Input tokens recorded for both models
  - [ ] Output tokens recorded for both models
  - [ ] Cost calculations accurate

- [ ] **CloudWatch Evidence**
  - [ ] Metrics query commands generated
  - [ ] InvocationCount metric queryable
  - [ ] InputTokens metric queryable
  - [ ] OutputTokens metric queryable
  - [ ] Timestamps match validation report

- [ ] **Billing Evidence**
  - [ ] Cost Explorer query provided
  - [ ] Expected costs documented
  - [ ] Charges visible in AWS account
  - [ ] Model-specific usage tracked

- [ ] **No Vertex AI Paths**
  - [ ] No GCP_PROJECT_ID references in validation
  - [ ] No VertexAnthropicProvider usage
  - [ ] All tests use BedrockInferenceProvider
  - [ ] provider=bedrock confirmed in logs

- [ ] **CI/CD Integration**
  - [ ] Workflows run successfully
  - [ ] Artifacts uploaded (JSON, MD reports)
  - [ ] PR comments include evidence
  - [ ] All checks green

## Verification Commands

### CloudWatch Metrics

#### Claude Sonnet 4.5
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --dimensions Name=InferenceProfileId,Value=global.anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --start-time <REQUEST_TIMESTAMP> \
  --end-time <RESPONSE_TIMESTAMP> \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

#### Claude Opus 4.1
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --dimensions Name=InferenceProfileId,Value=global.anthropic.claude-opus-4-1-20250805-v1:0 \
  --start-time <REQUEST_TIMESTAMP> \
  --end-time <RESPONSE_TIMESTAMP> \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

### Cost Explorer

```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-01-15,End=2025-01-16 \
  --granularity DAILY \
  --metrics "BlendedCost" "UsageQuantity" \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Bedrock"]}}' \
  --group-by Type=DIMENSION,Key=USAGE_TYPE
```

### CloudWatch Logs

```bash
aws logs filter-log-events \
  --log-group-name /aws/bedrock/modelinvocations \
  --start-time <TIMESTAMP_MS> \
  --end-time <TIMESTAMP_MS> \
  --filter-pattern "global.anthropic.claude-opus-4-1-20250805-v1:0" \
  --region us-east-1 \
  --limit 10
```

## Sample Evidence Output

### Validation Report Summary

```
🚀 AWS Bedrock Live Validation
================================================================================
⚠️  WARNING: This will make actual AWS API calls and incur charges!
================================================================================

🔐 Validating AWS Credentials...
✅ AWS_ACCESS_KEY_ID: AKIA...X3Y4
✅ AWS_SECRET_ACCESS_KEY: ***Y4Z5
✅ AWS_REGION: us-east-1

🔧 Initializing BedrockInferenceProvider...
✅ Provider initialized successfully

📡 Testing Claude Sonnet 4.5 (claude-sonnet-4-5)...
   📋 Request Details:
      Model ID: anthropic.claude-sonnet-4-5-20250929-v1:0
      Requires Inference Profile: true
      Inference Profile ARN: arn:aws:bedrock:us-east-1:394686422207:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0
      Region: us-east-1
      Request Timestamp: 2025-01-15T14:30:00.123Z
✅ Response received in 1234ms
   📋 Response Details:
      Response Timestamp: 2025-01-15T14:30:01.357Z
      HTTP Status: 200 (Success)
      Model Used: anthropic.claude-sonnet-4-5-20250929-v1:0
   📊 Token Usage:
      Input Tokens: 23
      Output Tokens: 47
      Total Tokens: 70
   💰 Cost Breakdown:
      Total: $0.000774 USD

📡 Testing Claude Opus 4.1 (claude-opus-4-1)...
   📋 Request Details:
      Model ID: anthropic.claude-opus-4-1-20250805-v1:0
      Requires Inference Profile: true
      Inference Profile ARN: arn:aws:bedrock:us-east-1:394686422207:inference-profile/global.anthropic.claude-opus-4-1-20250805-v1:0
      Region: us-east-1
      Request Timestamp: 2025-01-15T14:30:02.000Z
✅ Response received in 2156ms
   📋 Response Details:
      Response Timestamp: 2025-01-15T14:30:04.156Z
      HTTP Status: 200 (Success)
      Model Used: anthropic.claude-opus-4-1-20250805-v1:0
   📊 Token Usage:
      Input Tokens: 24
      Output Tokens: 89
      Total Tokens: 113
   💰 Cost Breakdown:
      Total: $0.007035 USD

================================================================================
📊 VALIDATION REPORT
================================================================================
✅ All tests passed!
💰 Total Cost: $0.007809 USD
```

## Troubleshooting

### Missing Evidence

**Problem:** Validation report not generated

**Solution:**
1. Check AWS credentials are set
2. Verify network connectivity
3. Check CloudWatch for errors
4. Review workflow logs

### ARN Not Used

**Problem:** Logs show model ID instead of inference profile ARN

**Solution:**
1. Check `config/aws-bedrock-models.json`
2. Verify `requiresInferenceProfile: true`
3. Verify `inferenceProfileArn` is set
4. Check BedrockInferenceProvider logs

### Billing Not Showing

**Problem:** No charges in Cost Explorer

**Solution:**
1. Wait 24 hours for billing to update
2. Check correct AWS account
3. Verify region (us-east-1)
4. Check CloudWatch Logs for invocations

## Related Files

- `src/infra/BedrockInferenceProvider.js` - Provider implementation
- `config/aws-bedrock-models.json` - Model configuration
- `scripts/validate-bedrock-live.js` - Live validation script
- `scripts/generate-bedrock-evidence.js` - Evidence generator
- `scripts/test-claude-opus-4.1-bedrock.js` - Bedrock-only tests
- `.github/workflows/bedrock-validation.yml` - CI workflow
- `.github/workflows/aws-bedrock-validation.yml` - Comprehensive CI workflow

## Support

For issues or questions:
1. Check workflow artifacts for full logs
2. Review CloudWatch Logs: `/aws/bedrock/modelinvocations`
3. Verify IAM permissions for Bedrock
4. Check AWS Service Health Dashboard
