# AWS Bedrock Validation Quick Start Guide

This guide provides step-by-step instructions for validating AWS Bedrock integration with inference profile ARNs and generating comprehensive evidence.

## Prerequisites

- Node.js 18+ installed
- AWS account with Bedrock access
- IAM permissions for Bedrock model invocation
- AWS credentials (access key ID and secret access key)

## Step 1: Pre-flight Check

Before running any validation, verify your environment is properly configured:

```bash
npm run bedrock:preflight
```

This checks:
- ✅ AWS environment variables
- ✅ Bedrock model configuration
- ✅ Required scripts and dependencies
- ✅ Output directories
- ✅ Provider is Bedrock (not Vertex AI)

**Expected output when ready:**
```
🎉 All checks passed! Ready to run validation.
```

**If errors found:**
1. Set AWS credentials:
```bash
export AWS_ACCESS_KEY_ID="your_access_key_id"
export AWS_SECRET_ACCESS_KEY="your_secret_access_key"
export AWS_REGION="us-east-1"  # Optional, defaults to us-east-1
```

2. Install dependencies if missing:
```bash
npm install
```

## Step 2: Run Live Validation

⚠️ **WARNING:** This will make actual AWS API calls and incur charges (~$0.008 USD per run)

```bash
npm run bedrock:validate:live
```

**What it does:**
- Invokes Claude Sonnet 4.5 with inference profile ARN
- Invokes Claude Opus 4.1 with inference profile ARN
- Logs detailed request/response information
- Tracks token usage and costs
- Records timestamps (ISO 8601 format)
- Captures HTTP status codes

**Output files:**
- `reports/bedrock-validation-report.json` - Detailed JSON report
- `reports/bedrock-validation-report.md` - Human-readable report

**Sample output:**
```
🚀 AWS Bedrock Live Validation
================================================

📡 Testing Claude Sonnet 4.5...
   📋 Request Details:
      Model ID: anthropic.claude-sonnet-4-5-20250929-v1:0
      Inference Profile ARN: arn:aws:bedrock:us-east-1:394686422207:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0
      Region: us-east-1
      Request Timestamp: 2025-01-15T14:30:00.123Z
✅ Response received in 1234ms
   📊 Token Usage:
      Input Tokens: 23
      Output Tokens: 47
   💰 Cost: $0.000774 USD

📡 Testing Claude Opus 4.1...
   [Similar output]

✅ Validation completed successfully!
💰 Total Cost: $0.007809 USD
```

## Step 3: Generate Evidence Report

After validation, generate comprehensive evidence for verification:

```bash
npm run bedrock:evidence
```

Or save to file:
```bash
npm run bedrock:evidence > bedrock-evidence.md
```

**What it generates:**
1. **CloudWatch Metrics Queries** - Ready-to-run AWS CLI commands
2. **Cost Explorer Queries** - Billing verification commands
3. **CloudWatch Logs Queries** - Log search commands
4. **Verification Checklist** - Step-by-step validation guide

**Sample output:**
```
📊 CLOUDWATCH VERIFICATION QUERIES
================================================================================

# Claude Sonnet 4.5
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --dimensions Name=InferenceProfileId,Value=global.anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --start-time 2025-01-15T14:25:00.000Z \
  --end-time 2025-01-15T14:35:00.000Z \
  --period 300 \
  --statistics Sum \
  --region us-east-1

# Claude Opus 4.1
[Similar command]

💳 AWS COST EXPLORER VERIFICATION
================================================================================
[Cost verification commands]
```

## Step 4: Run Bedrock-Specific Tests

Test the Bedrock integration without making live API calls (or with minimal calls):

```bash
node scripts/test-claude-opus-4.1-bedrock.js
```

**What it tests:**
- ✅ Configuration validation
- ✅ Inference profile ARN configuration
- ✅ Provider initialization
- ✅ Model availability
- ⏭️ Live completion (skipped without credentials)
- ⏭️ Token tracking (skipped without credentials)

**Output:**
```
🔬 Claude Opus 4.1 AWS Bedrock Integration Test Suite
================================================================================
Provider: AWS Bedrock (provider=bedrock)
No Vertex AI dependencies

✅ Configuration Validation: Claude Opus 4.1 properly configured
   - Inference Profile ARN: arn:aws:bedrock:...
✅ Provider Initialization: Successfully initialized
⏭️  Skipping live test - AWS credentials not configured

📊 TEST SUMMARY
✅ Passed: 2
⏭️  Skipped: 4
```

## Step 5: Verify in AWS Console

### CloudWatch Metrics

1. Navigate to CloudWatch Console
2. Go to **Metrics** > **All metrics**
3. Select **Bedrock** namespace
4. View metrics:
   - InvocationCount
   - InputTokens
   - OutputTokens
5. Filter by:
   - Dimension: InferenceProfileId
   - Value: `global.anthropic.claude-sonnet-4-5-20250929-v1:0` or `global.anthropic.claude-opus-4-1-20250805-v1:0`

### CloudWatch Logs

1. Navigate to CloudWatch Console
2. Go to **Logs** > **Log groups**
3. Find log group: `/aws/bedrock/modelinvocations`
4. Filter by timestamps from validation report
5. Verify entries show:
   - Request IDs
   - Model IDs
   - Token counts
   - Response times

### Cost Explorer

1. Navigate to AWS Cost Explorer
2. Set time range: **Last 24 hours**
3. Filter by Service: **Amazon Bedrock**
4. Group by: **Usage Type**
5. Verify charges match expected costs from validation report

## Step 6: CI/CD Integration

The validation runs automatically in GitHub Actions:

### Trigger Workflows

**Manual trigger:**
```bash
# Via GitHub UI: Actions > AWS Bedrock Live Validation > Run workflow
```

**Automatic triggers:**
- Push to branches: `copilot/fix-*`
- Pull requests to `main` that modify:
  - `src/infra/BedrockInferenceProvider.js`
  - `scripts/validate-bedrock-live.js`

### View Results

1. Go to **Actions** tab in GitHub
2. Select workflow run
3. Download artifacts:
   - `bedrock-validation-report` (contains JSON and MD files)
   - `bedrock-test-results`
4. Review PR comments for summary

## Troubleshooting

### Error: "Missing AWS credentials"

**Solution:** Set environment variables:
```bash
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

### Error: "AccessDeniedException"

**Solution:** Ensure IAM user/role has permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/*",
        "arn:aws:bedrock:us-east-1:*:inference-profile/*"
      ]
    }
  ]
}
```

### Error: "Cannot find module '@aws-sdk/client-bedrock-runtime'"

**Solution:** Install dependencies:
```bash
npm install
```

### Error: "Inference profile not found"

**Solution:** Verify ARNs in `config/aws-bedrock-models.json` match your AWS account.

### No charges in Cost Explorer

**Solution:** 
- Wait 24 hours for billing to update
- Verify correct AWS region (us-east-1)
- Check CloudWatch Logs for invocation evidence

## Cost Estimation

Typical costs per validation run:

| Model | Input Tokens | Output Tokens | Cost |
|-------|-------------|---------------|------|
| Claude Sonnet 4.5 | ~25 | ~50 | ~$0.0008 |
| Claude Opus 4.1 | ~25 | ~90 | ~$0.007 |
| **Total** | | | **~$0.008** |

## Quick Reference

```bash
# Full validation workflow
npm run bedrock:preflight          # 1. Check environment
npm run bedrock:validate:live      # 2. Run live validation (incurs costs)
npm run bedrock:evidence > evidence.md  # 3. Generate evidence
node scripts/test-claude-opus-4.1-bedrock.js  # 4. Run tests

# Individual commands
npm run bedrock:health             # Health check (no API calls)
npm run bedrock:list               # List available models
npm run bedrock:status             # Show provider status
```

## Documentation

- **Evidence Requirements:** `docs/BEDROCK_VALIDATION_EVIDENCE.md`
- **Live Validation Guide:** `docs/AWS_BEDROCK_LIVE_VALIDATION.md`
- **Comprehensive Testing:** `docs/AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md`
- **Coding Guide:** `docs/AWS_BEDROCK_CODING_GUIDE.md`

## Support

For issues:
1. Check preflight: `npm run bedrock:preflight`
2. Review CloudWatch Logs: `/aws/bedrock/modelinvocations`
3. Verify IAM permissions
4. Check AWS Service Health Dashboard
5. Review workflow artifacts in GitHub Actions
