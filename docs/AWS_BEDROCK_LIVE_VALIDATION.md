# AWS Bedrock Live Validation Guide

## Overview

This guide explains how to perform live validation of the AWS Bedrock integration with actual API calls, real usage metrics, and cost verification.

## Prerequisites

✅ **Required:**
- AWS account with Bedrock access enabled
- IAM permissions for `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`
- Access to Claude Sonnet 4.5 and Claude Opus 4.1 models in your region
- Valid AWS credentials (Access Key ID and Secret Access Key)

## Validation Methods

### Method 1: GitHub Actions (Automated - RECOMMENDED)

The repository includes an automated validation workflow that uses repository secrets.

**Setup:**
1. Repository secrets are already configured:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (optional, defaults to us-east-1)

2. Trigger the workflow:
   ```bash
   # Option A: Push to the branch (auto-triggers)
   git push origin copilot/fix-*
   
   # Option B: Manual trigger via GitHub UI
   # Go to Actions → AWS Bedrock Live Validation → Run workflow
   ```

3. Monitor the workflow:
   - Go to Actions tab in GitHub
   - Click on "AWS Bedrock Live Validation"
   - View real-time logs and validation results

4. Review results:
   - Workflow will post a comment on the PR with full results
   - Download validation report artifact from workflow run
   - Check report at `reports/bedrock-validation-report.json`

**Expected Output in Workflow:**
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
   Prompt: "Hello! Please confirm you are Claude Sonnet 4.5..."
✅ Response received in 1234ms
   Response: "Hello! I am Claude Sonnet 4.5, an AI assistant..."
   Cached: false
   Usage: 23 input + 47 output tokens
   Cost: $0.000774 USD
     - Input: 23 tokens × $0.003/1K = $0.000069
     - Output: 47 tokens × $0.015/1K = $0.000705

📡 Testing Claude Opus 4.1 (claude-opus-4-1)...
   Prompt: "Hello! Please confirm you are Claude Opus 4.1..."
✅ Response received in 2156ms
   Response: "Hello! I am Claude Opus 4.1, Anthropic's most capable..."
   Cached: false
   Usage: 24 input + 89 output tokens
   Cost: $0.007035 USD
     - Input: 24 tokens × $0.015/1K = $0.000360
     - Output: 89 tokens × $0.075/1K = $0.006675

================================================================================
📊 VALIDATION REPORT
================================================================================

📅 Validation Details:
   Timestamp: 2025-01-15T14:30:00.000Z
   Region: us-east-1
   Credentials Found: ✅

🤖 Models Tested:
   ✅ Claude Sonnet 4.5
      Model ID: anthropic.claude-sonnet-4-5-20250929-v1:0
      Latency: 1234ms
      Tokens: 23 in + 47 out
      Cost: $0.000774 USD

   ✅ Claude Opus 4.1
      Model ID: anthropic.claude-opus-4-1-20250805-v1:0
      Latency: 2156ms
      Tokens: 24 in + 89 out
      Cost: $0.007035 USD

💰 Cost Summary:
   Total Cost: $0.007809 USD

📝 Next Steps:
   1. Check AWS CloudWatch Logs for Bedrock invocations
   2. Verify charges in AWS Cost Explorer
   3. Confirm model IDs and regions match expectations
```

### Method 2: Local Validation (Manual)

Run validation directly on your local machine:

**Setup:**
```bash
cd /home/runner/work/Spotify-echo/Spotify-echo

# Set credentials
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_REGION="us-east-1"

# Install dependencies
npm install

# Run validation
node scripts/validate-bedrock-live.js
```

**Expected Output:** Same as above

### Method 3: Quick Manual Test

Quick one-liner to test basic connectivity:

```bash
node -e "
const Provider = require('./src/infra/BedrockInferenceProvider');
const p = new Provider();
p.initialize()
  .then(() => p.predict('claude-sonnet-4-5', 'Say hello'))
  .then(r => console.log('✅ Success!', r))
  .catch(e => console.error('❌ Error:', e));
" 2>&1
```

## Verification in AWS Console

After running validation, verify in AWS:

### 1. CloudWatch Logs

Navigate to CloudWatch → Log Groups → Look for:
- `/aws/bedrock/modelinvocations`
- Filter by timestamp of your validation run
- Confirm you see log entries for:
  - `anthropic.claude-sonnet-4-5-20250929-v1:0`
  - `anthropic.claude-opus-4-1-20250805-v1:0`

**Expected Log Entry:**
```json
{
  "schemaType": "ModelInvocationLog",
  "schemaVersion": "1.0",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "accountId": "123456789012",
  "identity": {
    "arn": "arn:aws:sts::123456789012:assumed-role/..."
  },
  "region": "us-east-1",
  "requestId": "abc123...",
  "operation": "InvokeModel",
  "modelId": "anthropic.claude-sonnet-4-5-20250929-v1:0",
  "input": {
    "inputContentType": "application/json",
    "inputBodyJson": {
      "anthropic_version": "bedrock-2023-05-31",
      "max_tokens": 200,
      "messages": [...]
    },
    "inputTokenCount": 23
  },
  "output": {
    "outputContentType": "application/json",
    "outputBodyJson": {
      "content": [...],
      "usage": {
        "input_tokens": 23,
        "output_tokens": 47
      }
    },
    "outputTokenCount": 47
  }
}
```

### 2. AWS Cost Explorer

Navigate to Cost Management → Cost Explorer:
- Select date range covering your validation
- Filter by service: "Amazon Bedrock"
- Group by: "Usage Type"
- Confirm charges for:
  - `Bedrock:InputTokens`
  - `Bedrock:OutputTokens`

**Expected Charges:**
```
Service: Amazon Bedrock
Region: US East (N. Virginia)

Model: anthropic.claude-sonnet-4-5-20250929-v1:0
- Input tokens: 23 × $0.003/1K = $0.000069
- Output tokens: 47 × $0.015/1K = $0.000705
Subtotal: $0.000774

Model: anthropic.claude-opus-4-1-20250805-v1:0
- Input tokens: 24 × $0.015/1K = $0.000360
- Output tokens: 89 × $0.075/1K = $0.006675
Subtotal: $0.007035

Total: ~$0.008 USD (may show $0.01 due to rounding)
```

### 3. Bedrock Console

Navigate to AWS Bedrock Console → Model invocations:
- View recent invocation history
- Confirm timestamps match your validation
- Verify model IDs and token counts

## Troubleshooting

### Error: "Missing AWS credentials"

**Solution:** Ensure environment variables are set:
```bash
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_REGION
```

### Error: "AccessDeniedException"

**Solution:** Check IAM permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ],
    "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*"
  }]
}
```

### Error: "Model not found"

**Solution:** 
- Verify model access is enabled in AWS Bedrock console
- Check model availability in your region
- Confirm model ID matches the one in `config/aws-bedrock-models.json`

### Error: "Rate limit exceeded"

**Solution:** The validation script includes retry logic. If you still see this:
- Wait a few minutes and retry
- Check your AWS account quotas
- Consider using a different region

## Cost Estimates

Based on current AWS Bedrock pricing (January 2025):

### Single Validation Run

| Model | Input Tokens | Output Tokens | Cost |
|-------|--------------|---------------|------|
| Claude Sonnet 4.5 | ~25 | ~50 | ~$0.001 |
| Claude Opus 4.1 | ~25 | ~90 | ~$0.007 |
| **Total** | | | **~$0.008** |

### Multiple Validation Runs

- 10 runs: ~$0.08
- 100 runs: ~$0.80
- 1000 runs: ~$8.00

### Caching Benefit

Second identical request (cached):
- Cost: $0.000 (served from cache)
- Latency: <10ms (vs 1000-2000ms)

## Next Steps After Validation

Once validation is successful:

1. ✅ **Update PR** with validation results and AWS evidence
2. ✅ **Document** actual costs in PR description
3. ✅ **Integrate** with RealTimeInferenceService
4. ✅ **Enable** in production with monitoring
5. ✅ **Set up** cost alerts in AWS Budgets

## Continuous Validation

For ongoing validation:

1. **Pre-deployment:** Run validation before each deployment
2. **Post-deployment:** Automated health checks
3. **Scheduled:** Weekly validation runs
4. **Cost monitoring:** Daily AWS cost alerts

## Support

For issues or questions:
- Check [AWS_BEDROCK_INTEGRATION_STATUS.md](./AWS_BEDROCK_INTEGRATION_STATUS.md)
- Review [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- Contact repository maintainers

---

**Last Updated:** 2025-01-15  
**Status:** Ready for live validation with repository secrets
