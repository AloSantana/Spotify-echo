# AWS Bedrock Live Validation Script

## Purpose

This script makes **actual AWS Bedrock API calls** to validate the `BedrockInferenceProvider` implementation with real Claude Sonnet 4.5 and Claude Opus 4.1 models.

## ⚠️ Important

**This script will incur actual AWS charges!** Expected cost per run: ~$0.008 USD

## Usage

### In GitHub Actions (Recommended)

The workflow automatically runs on push using repository secrets:

```yaml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_REGION: ${{ secrets.AWS_REGION || 'us-east-1' }}
```

### Local Testing

```bash
export AWS_ACCESS_KEY_ID="your_key_id"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_REGION="us-east-1"

node scripts/validate-bedrock-live.js
```

## What It Tests

1. **Credentials Validation**
   - Checks for AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   - Validates they are properly formatted

2. **Claude Sonnet 4.5**
   - Makes actual API call with test prompt
   - Tracks latency, token usage, and cost
   - Validates response format

3. **Claude Opus 4.1**
   - Makes actual API call with test prompt
   - Tracks latency, token usage, and cost
   - Validates response format

4. **Caching**
   - Tests cache hit/miss functionality
   - Validates latency improvement on cached requests

## Output

The script generates:
- Console output with detailed progress
- JSON report at `reports/bedrock-validation-report.json`

## Expected Results

```
🚀 AWS Bedrock Live Validation
🔐 Validating AWS Credentials...
✅ AWS_ACCESS_KEY_ID: AKIA...X3Y4
✅ AWS_SECRET_ACCESS_KEY: ***Y4Z5
✅ AWS_REGION: us-east-1

📡 Testing Claude Sonnet 4.5...
✅ Response received in 1234ms
   Usage: 23 input + 47 output tokens
   Cost: $0.000774 USD

📡 Testing Claude Opus 4.1...
✅ Response received in 2156ms
   Usage: 24 input + 89 output tokens
   Cost: $0.007035 USD

💰 Total Cost: $0.007809 USD
```

## Troubleshooting

### Error: "Missing AWS credentials"

**Cause:** Environment variables not set

**Solution:**
```bash
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

### Error: "AccessDeniedException"

**Cause:** IAM permissions insufficient

**Solution:** Ensure IAM user/role has these permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
}
```

### Error: "Model not found"

**Cause:** Model access not enabled in AWS Bedrock console

**Solution:**
1. Go to AWS Bedrock Console
2. Navigate to "Model access"
3. Request access to Claude models
4. Wait for approval (usually instant)

### Error: "ResourceNotFoundException"

**Cause:** Model not available in specified region

**Solution:** Try a different region:
- us-east-1 (N. Virginia) ✅ Most reliable
- us-west-2 (Oregon) ✅ Good alternative
- eu-west-1 (Ireland) ✅ For EU customers

## Verification in AWS

After running, verify actual usage in AWS Console:

### CloudWatch Logs

1. Go to CloudWatch → Log Groups
2. Find `/aws/bedrock/modelinvocations`
3. Look for recent log streams
4. Verify timestamps match your validation run

### Cost Explorer

1. Go to Cost Management → Cost Explorer
2. Filter by service: "Amazon Bedrock"
3. Check for charges (may take 24 hours to appear)
4. Verify cost matches expected ~$0.008 USD

## Dependencies

- `@aws-sdk/client-bedrock-runtime` - AWS Bedrock SDK
- `../src/infra/BedrockInferenceProvider` - Provider implementation

## Related Files

- `.github/workflows/bedrock-validation.yml` - GitHub Actions workflow
- `docs/AWS_BEDROCK_LIVE_VALIDATION.md` - Complete validation guide
- `src/infra/BedrockInferenceProvider.js` - Provider implementation
- `tests/infra/BedrockInferenceProvider.test.js` - Unit tests (mocked)
