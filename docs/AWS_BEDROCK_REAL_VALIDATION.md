# AWS Bedrock Real Validation Guide

## Overview

This document outlines the comprehensive validation and evidence requirements for AWS Bedrock integration in the EchoTune AI project. It explains how to verify real Bedrock availability, interpret validation artifacts, and troubleshoot common issues.

## Key Principles

### 1. Evidence-Based Validation

**Narrative output is not evidence.** All Bedrock integration claims must be backed by:

- ✅ Real AWS Bedrock invocation logs with request IDs
- ✅ Token usage and cost calculations  
- ✅ CloudWatch metrics (when available)
- ✅ AWS identity verification
- ✅ Model availability confirmation

**What is NOT evidence:**

- ❌ Expected output examples
- ❌ Simulated responses  
- ❌ Placeholder data like `[DEMO]`, `[MOCK]`, `[PLACEHOLDER]`
- ❌ Missing request IDs or timestamps
- ❌ Zero invocation logs

### 2. Strict Validation Mode

The `--strict` flag enforces production-grade validation:

```bash
node scripts/validate-bedrock-live.js --strict
```

**Strict mode requirements:**
- All model invocations must succeed (HTTP 200)
- All responses must have valid request IDs
- No placeholder strings in any output
- Zero tolerance for mock data

**Exit codes:**
- `0` = All validations passed
- `1` = One or more validations failed

### 3. Anti-Mock Safeguards

The system actively detects and rejects mock/demo data:

- Scans for `[DEMO]`, `[MOCK]`, `[PLACEHOLDER]` strings
- Validates presence of request IDs
- Requires real token usage data
- Cross-references with CloudWatch metrics (when available)

## Evidence Chain Components

### 1. AWS Identity Verification

**Purpose:** Confirm valid AWS credentials and account access

**Command:**
```bash
aws sts get-caller-identity
```

**Expected Output:**
```json
{
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/bedrock-user",
  "UserId": "AIDAI..."
}
```

**Script:** `scripts/collect-bedrock-evidence.js`

**Artifact:** `reports/aws-identity.json`

### 2. Model Availability Listing

**Purpose:** Verify Claude Sonnet 4.5 and Opus 4.1 are available in your region

**Command:**
```bash
aws bedrock list-foundation-models \
  --by-provider Anthropic \
  --region us-east-1
```

**Expected Models:**
- `anthropic.claude-sonnet-4-5-20250929-v1:0`
- `anthropic.claude-opus-4-1-20250805-v1:0`

**Script:** `scripts/collect-bedrock-evidence.js`

**Artifact:** `reports/bedrock-models.json`

### 3. Live Model Invocations

**Purpose:** Execute real API calls and capture full invocation details

**Script:** `scripts/validate-bedrock-live.js`

**What gets captured per invocation:**

```json
{
  "model": "claude-sonnet-4-5",
  "modelId": "anthropic.claude-sonnet-4-5-20250929-v1:0",
  "requestId": "bedrock-1705340123456-claude-sonnet-4-5",
  "requestTimestamp": "2025-01-15T10:30:45.123Z",
  "responseTimestamp": "2025-01-15T10:30:46.789Z",
  "httpStatus": 200,
  "success": true,
  "latency": 1666,
  "usage": {
    "input_tokens": 45,
    "output_tokens": 128
  },
  "cost": 0.002055,
  "costBreakdown": {
    "inputTokens": 45,
    "outputTokens": 128,
    "inputCostPer1K": 0.003,
    "outputCostPer1K": 0.015
  },
  "region": "us-east-1",
  "requiresInferenceProfile": true,
  "inferenceProfileArn": "arn:aws:bedrock:us-east-1:394686422207:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "response": "Hello! I am Claude Sonnet 4.5..."
}
```

**Artifacts:**
- Per-invocation logs: `logs/bedrock/invocations/<timestamp>-<model>.json`
- Summary report: `reports/bedrock-invocation-summary.json`

### 4. CloudWatch Metrics (Optional)

**Purpose:** Corroborate invocations with AWS billing/usage metrics

**Note:** CloudWatch metrics have a 15-30 minute delay after first use

**Command for Sonnet 4.5:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --dimensions Name=ModelId,Value=anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --start-time 2025-01-15T10:00:00Z \
  --end-time 2025-01-15T12:00:00Z \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

**Script:** `scripts/verify-bedrock-billing.js`

**Artifact:** `reports/bedrock-metrics.json`

**Expected Data:**
```json
{
  "models": {
    "claude-sonnet-4-5": {
      "invocations": {
        "total": 2,
        "datapoints": [
          {
            "timestamp": "2025-01-15T10:30:00Z",
            "count": 1
          },
          {
            "timestamp": "2025-01-15T10:35:00Z",
            "count": 1
          }
        ]
      },
      "latency": {
        "average": 1650.5
      }
    }
  }
}
```

### 5. Comprehensive Evidence Report

**Script:** `scripts/collect-bedrock-evidence.js`

**Artifact:** `reports/bedrock-evidence-complete.json`

**Structure:**
```json
{
  "timestamp": "2025-01-15T10:45:00.000Z",
  "region": "us-east-1",
  "identity": { "account": "...", "arn": "..." },
  "models": [...],
  "inferenceProfiles": [...],
  "invocations": [...],
  "summary": {
    "totalInvocations": 2,
    "successfulInvocations": 2,
    "failedInvocations": 0,
    "totalCost": 0.004110,
    "totalTokensUsed": 346
  },
  "validation": {
    "hasIdentity": true,
    "hasModels": true,
    "hasInvocations": true,
    "allInvocationsSuccessful": true,
    "hasRequestIds": true,
    "hasPlaceholders": false,
    "isValid": true
  }
}
```

## Running Validation Locally

### Prerequisites

```bash
# Required environment variables
export AWS_ACCESS_KEY_ID="your-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export BEDROCK_ENABLED="true"
```

### Step 1: Health Check

```bash
node scripts/aws-bedrock-health-check.js
```

Expected: AWS credentials valid, models loaded

### Step 2: Live Validation

```bash
# Standard mode
node scripts/validate-bedrock-live.js

# Strict mode (recommended for CI/CD)
node scripts/validate-bedrock-live.js --strict
```

Expected: Both Claude Sonnet 4.5 and Opus 4.1 invocations succeed

### Step 3: Evidence Collection

```bash
node scripts/collect-bedrock-evidence.js
```

Expected: All validation checks pass, comprehensive evidence report generated

### Step 4: CloudWatch Metrics (Optional)

```bash
node scripts/verify-bedrock-billing.js
```

Expected: Metrics found (or note about 15-30 min delay)

### Step 5: Review Artifacts

```bash
# Per-invocation logs
ls -lh logs/bedrock/invocations/

# Summary reports
ls -lh reports/

# View evidence report
cat reports/bedrock-evidence-complete.json | jq .
```

## CI/CD Integration

### GitHub Actions Workflow

The workflow `.github/workflows/bedrock-real-validation.yml` runs automatically on:

- Push to `main` or `feature/bedrock-*` branches
- Pull requests modifying Bedrock-related files
- Manual dispatch (`workflow_dispatch`)

### Workflow Steps

1. **Setup:** Install dependencies and verify AWS credentials
2. **Identity:** Capture AWS account identity
3. **Models:** List available Bedrock models
4. **Validation:** Run live invocation tests (strict mode)
5. **Evidence:** Collect comprehensive evidence
6. **Metrics:** Query CloudWatch (best effort)
7. **Artifacts:** Upload all evidence files
8. **Summary:** Generate validation report

### Workflow Artifacts

After workflow completion, download artifacts:

```
bedrock-validation-evidence/
├── logs/
│   └── bedrock/
│       └── invocations/
│           ├── 2025-01-15T10-30-45-123Z-claude-sonnet-4-5.json
│           └── 2025-01-15T10-32-15-456Z-claude-opus-4-1.json
└── reports/
    ├── aws-identity.json
    ├── bedrock-models.json
    ├── bedrock-inference-profiles.json
    ├── bedrock-invocation-summary.json
    ├── bedrock-metrics.json
    └── bedrock-evidence-complete.json
```

## Pricing & Cost Tracking

### Pricing Matrix

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet 4.5 | $0.003 | $0.015 |
| Claude Opus 4.1 | $0.015 | $0.075 |

### Cost Calculation

```javascript
const inputCost = (inputTokens / 1000) * pricePerK;
const outputCost = (outputTokens / 1000) * pricePerK;
const totalCost = inputCost + outputCost;
```

### Example Costs

**Claude Sonnet 4.5** (45 input, 128 output):
- Input: 45 × $0.003 / 1000 = $0.000135
- Output: 128 × $0.015 / 1000 = $0.001920
- **Total: $0.002055**

**Claude Opus 4.1** (50 input, 150 output):
- Input: 50 × $0.015 / 1000 = $0.000750
- Output: 150 × $0.075 / 1000 = $0.011250
- **Total: $0.012000**

### Cost Monitoring

All invocations track and report cost:

```bash
# View total cost from validation
cat reports/bedrock-invocation-summary.json | jq '.totalCost'

# View per-model costs
cat reports/bedrock-invocation-summary.json | jq '.models[] | {model, cost}'
```

## Troubleshooting

### AccessDenied Errors

**Symptom:**
```
AccessDeniedException: User is not authorized to perform: bedrock:InvokeModel
```

**Causes:**
1. IAM policy missing `bedrock:InvokeModel` permission
2. IAM policy missing model-specific ARN access
3. Account doesn't have Bedrock enabled

**Resolution:**

1. Check IAM policy has:
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": [
    "arn:aws:bedrock:*::foundation-model/*",
    "arn:aws:bedrock:*:*:inference-profile/*"
  ]
}
```

2. Verify Bedrock is enabled in AWS Console
3. Ensure region supports Claude 4 models (us-east-1, us-west-2, eu-west-1)

### ModelNotFound Errors

**Symptom:**
```
ResourceNotFoundException: The specified model was not found
```

**Causes:**
1. Model not available in your region
2. Model ID typo
3. Inference profile required but not used

**Resolution:**

1. Verify model availability:
```bash
aws bedrock list-foundation-models --region us-east-1 | grep claude
```

2. Use correct model IDs from `config/aws-bedrock-models.json`
3. For Claude 4 models, use inference profile ARNs

### Zero Invocations in Evidence

**Symptom:**
```json
{
  "summary": {
    "totalInvocations": 0
  }
}
```

**Causes:**
1. Validation script failed before completing
2. Logs directory not writable
3. Invocations failed silently

**Resolution:**

1. Run validation with verbose logging:
```bash
node scripts/validate-bedrock-live.js --strict 2>&1 | tee validation.log
```

2. Check file permissions:
```bash
mkdir -p logs/bedrock/invocations
chmod 755 logs/bedrock/invocations
```

3. Review validation output for errors

### CloudWatch Metrics Not Found

**Symptom:**
```
ℹ️  No metrics found (normal if validation hasn't run or metrics delayed)
```

**Causes:**
1. Metrics have 15-30 minute delay after first use
2. CloudWatch metrics not enabled (rare)
3. Time range doesn't include invocations

**Resolution:**

1. Wait 30 minutes and retry:
```bash
node scripts/verify-bedrock-billing.js --start-time=2025-01-15T10:00:00Z
```

2. Verify invocations actually occurred (check logs)
3. This is non-fatal - evidence is still valid without CloudWatch metrics

### Placeholder Strings Detected

**Symptom:**
```
⚠️  WARNING: Placeholder strings detected in invocation data!
❌ STRICT MODE: Placeholder strings detected - FAILED
```

**Causes:**
1. Mock provider accidentally used
2. Demo data not cleaned up
3. Test scaffolding code in production path

**Resolution:**

1. Verify `BEDROCK_ENABLED=true`
2. Check provider initialization logs
3. Review invocation logs for actual API responses
4. Remove any test/demo data files

## Integration with Provider Manager

### Environment Variables

```bash
# Enable Bedrock provider
export BEDROCK_ENABLED=true

# Configure region (default: us-east-1)
export BEDROCK_REGION=us-east-1
export AWS_REGION=us-east-1

# Set default model (default: claude-sonnet-4-5)
export BEDROCK_DEFAULT_MODEL=claude-sonnet-4-5

# AWS credentials
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

### Provider Priority

When Bedrock is enabled and healthy:

1. **Bedrock** (Claude Sonnet 4.5 for coding)
2. Gemini
3. Perplexity
4. Grok-4
5. OpenAI
6. OpenRouter
7. Mock (fallback)

### Health Checks

The provider automatically:
- Validates AWS credentials on initialization
- Detects AccessDenied errors and marks unhealthy
- Falls back to next provider if unhealthy
- Logs detailed error messages for troubleshooting

### Usage in Code

```javascript
const LLMProviderManager = require('./src/chat/llm-provider-manager');

// Initialize
await LLMProviderManager.initialize();

// Check if Bedrock available
const status = LLMProviderManager.getProviderStatus();
console.log(status.bedrock); // { name: 'AWS Bedrock', available: true, ... }

// Send message (auto-routes to best provider)
const response = await LLMProviderManager.sendMessage([
  { role: 'user', content: 'Write a Python function...' }
]);

// Force Bedrock provider
const response = await LLMProviderManager.sendMessage(
  [{ role: 'user', content: 'Analyze this code...' }],
  { provider: 'bedrock', model: 'claude-opus-4-1' }
);
```

## Best Practices

### 1. Always Use Strict Mode in CI/CD

```yaml
# .github/workflows/bedrock-real-validation.yml
- name: Run Validation
  run: node scripts/validate-bedrock-live.js --strict
```

### 2. Review Evidence Before Merging PRs

Check workflow artifacts for:
- ✅ Non-zero invocations
- ✅ Request IDs present
- ✅ Realistic token counts
- ✅ Costs align with pricing
- ✅ No placeholder strings

### 3. Monitor Costs

```bash
# Weekly cost review
node scripts/verify-bedrock-billing.js --start-time=$(date -d '7 days ago' -Iseconds)
```

### 4. Keep Model Registry Updated

Update `config/aws-bedrock-models.json` when:
- New Claude models released
- Pricing changes
- Inference profiles updated

### 5. Test Fallback Behavior

```bash
# Disable Bedrock to test fallback
export BEDROCK_ENABLED=false
npm start
```

## Support & Resources

### AWS Documentation
- [Bedrock User Guide](https://docs.aws.amazon.com/bedrock/)
- [Claude Models on Bedrock](https://docs.anthropic.com/claude/docs/bedrock)
- [IAM Permissions for Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html)

### Repository Files
- Provider: `src/chat/llm-providers/bedrock-provider.js`
- Inference: `src/infra/BedrockInferenceProvider.js`
- Config: `config/aws-bedrock-models.json`
- Scripts: `scripts/validate-bedrock-live.js`, `scripts/collect-bedrock-evidence.js`

### Metrics & Telemetry
- Metrics: `src/metrics/ai-metrics.js`
- Cost tracking built-in to all invocations
- CloudWatch integration for billing validation

---

**Last Updated:** 2025-01-15  
**Maintained By:** EchoTune AI Team
