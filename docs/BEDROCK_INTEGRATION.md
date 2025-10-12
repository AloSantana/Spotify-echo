# AWS Bedrock Integration Guide

**Version**: 2.0.0  
**Last Updated**: October 12, 2025  
**Maintainer**: EchoTune AI Team

## Overview

This guide documents the integration of AWS Bedrock models into the GitHub Coding Agent, including the latest Claude 4.x models (Opus 4.1, Sonnet 4.5) and DeepSeek-R1 with comprehensive testing support.

## Table of Contents

1. [Supported Models](#supported-models)
2. [Configuration](#configuration)
3. [Inference Profile ARNs](#inference-profile-arns)
4. [Implementation Details](#implementation-details)
5. [Testing](#testing)
6. [IAM Permissions](#iam-permissions)
7. [Security Considerations](#security-considerations)
8. [Error Handling](#error-handling)
9. [Troubleshooting](#troubleshooting)

## Supported Models

### Claude 4.x Models (Latest)

#### Claude Opus 4.1
- **Model ID**: `us.anthropic.claude-opus-4-1-20250805-v1:0`
- **Inference Profile ARN**: `arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.anthropic.claude-opus-4-1-20250805-v1:0`
- **Capabilities**: Extended thinking, long-horizon tasks, advanced reasoning, coding
- **Context Window**: 200K tokens
- **Max Output**: 32K tokens
- **Priority**: 1 (highest)
- **Requires Inference Profile**: Yes

#### Claude Sonnet 4.5
- **Model ID**: `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
- **Inference Profile ARN**: `arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0`
- **Capabilities**: Text generation, coding, analysis, conversation
- **Context Window**: 200K tokens
- **Max Output**: 4K tokens
- **Priority**: 2
- **Requires Inference Profile**: Yes

### Claude 3.x Models

#### Claude 3 Opus
- **Model ID**: `us.anthropic.claude-3-opus-20240229-v1:0`
- **Capabilities**: Complex reasoning, coding, vision, analysis
- **Context Window**: 200K tokens
- **Max Output**: 4K tokens
- **Priority**: 3
- **Requires Inference Profile**: No

#### Claude 3.5 Sonnet v2
- **Model ID**: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Capabilities**: Text generation, conversation, analysis, vision
- **Context Window**: 200K tokens
- **Max Output**: 8K tokens
- **Priority**: 4
- **Requires Inference Profile**: No

#### Claude 3.5 Sonnet v1
- **Model ID**: `us.anthropic.claude-3-5-sonnet-20240620-v1:0`
- **Capabilities**: Text generation, conversation, analysis, vision
- **Context Window**: 200K tokens
- **Max Output**: 8K tokens
- **Priority**: 5
- **Requires Inference Profile**: No

#### Claude 3.5 Haiku
- **Model ID**: `us.anthropic.claude-3-5-haiku-20241022-v1:0`
- **Capabilities**: Fast text generation, conversation, analysis
- **Context Window**: 200K tokens
- **Max Output**: 8K tokens
- **Priority**: 6
- **Requires Inference Profile**: No

#### Claude 3 Sonnet
- **Model ID**: `us.anthropic.claude-3-sonnet-20240229-v1:0`
- **Capabilities**: Text generation, conversation, analysis, vision
- **Context Window**: 200K tokens
- **Max Output**: 4K tokens
- **Priority**: 7
- **Requires Inference Profile**: No

### DeepSeek Models

#### DeepSeek-R1
- **Model ID**: `us.deepseek.r1-v1:0`
- **Inference Profile ARN**: `arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.deepseek.r1-v1:0`
- **Capabilities**: Deep reasoning, coding, text generation
- **Context Window**: 64K tokens
- **Max Output**: 8K tokens
- **Priority**: 9
- **Requires Inference Profile**: Yes

### Deprecated Models

The following models have been **removed** from the configuration:
- **Claude 2.1** (`anthropic.claude-v2:1`) - Deprecated, use Claude 3 or later

## Configuration

### Model Registry

All model configurations are stored in `config/aws-bedrock-models.json`:

```json
{
  "modelRegistry": {
    "claude-opus-4-1": {
      "modelId": "us.anthropic.claude-opus-4-1-20250805-v1:0",
      "inferenceProfileArn": "arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.anthropic.claude-opus-4-1-20250805-v1:0",
      "requiresInferenceProfile": true,
      ...
    }
  }
}
```

### Environment Variables

Required environment variables for AWS Bedrock access:

```bash
# AWS Credentials (Required)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1  # Default region

# Optional Configuration
BEDROCK_DEFAULT_MODEL=claude-sonnet-4-5
BEDROCK_MAX_RETRIES=3
BEDROCK_TIMEOUT=30000
```

## Inference Profile ARNs

### What are Inference Profile ARNs?

Inference Profile ARNs are AWS Bedrock system-defined identifiers that enable:
- Cross-region model access
- Load balancing across regions
- Higher throughput and availability
- Optimized routing for Claude 4.x and DeepSeek models

### Format

```
arn:aws:bedrock:{region}:{account-id}:inference-profile/{profile-id}
```

Example:
```
arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.anthropic.claude-opus-4-1-20250805-v1:0
```

### When to Use

- **Required for**: Claude Opus 4.1, Claude Sonnet 4.5, DeepSeek-R1
- **Optional for**: Claude 3.x models (can use direct model IDs)

### Implementation

The `BedrockInferenceProvider` automatically uses inference profile ARNs when:

```javascript
const modelConfig = this.models.get(modelKey);

const effectiveModelId = (modelConfig?.requiresInferenceProfile && modelConfig?.inferenceProfileArn)
    ? modelConfig.inferenceProfileArn
    : modelId;

const command = new InvokeModelCommand({
    modelId: effectiveModelId,
    ...
});
```

## Implementation Details

### Core Components

1. **Configuration Layer**: `config/aws-bedrock-models.json`
   - Central registry for all Bedrock models
   - Defines model IDs, ARNs, capabilities, and metadata

2. **Provider Layer**: `src/infra/BedrockInferenceProvider.js`
   - AWS Bedrock client initialization
   - Model invocation with ARN support
   - Retry logic and error handling
   - Metrics and telemetry

3. **Test Harness**: `scripts/test-aws-bedrock-comprehensive.js`
   - Automated testing for all models
   - Streaming and non-streaming tests
   - Parameter variation testing
   - Comprehensive reporting

### Using Models in Code

```javascript
const BedrockInferenceProvider = require('./src/infra/BedrockInferenceProvider');

const provider = new BedrockInferenceProvider({
    region: 'us-east-1',
    defaultModel: 'claude-opus-4-1'
});

await provider.initialize();

// Invoke model (ARN handling is automatic)
const result = await provider.predict('claude-opus-4-1', 'Your prompt here', {
    maxTokens: 4096,
    temperature: 0.7
});

console.log(result.content);
```

## Testing

### Health Check

Verify Bedrock access and model availability:

```bash
npm run bedrock:health
```

Expected output:
```
🏥 AWS Bedrock Health Check
════════════════════════════════════════════════════════════
1️⃣  Checking AWS Credentials...
   ✅ Credentials found
   Region: us-east-1

2️⃣  Loading Model Configuration...
   ✅ Configuration loaded (11 models)

3️⃣  Initializing AWS Bedrock Client...
   ✅ Client initialized

4️⃣  Testing Model Invocation...
   Testing: Claude Sonnet 4.5
   ✅ Model invocation successful
   Latency: 1234ms
════════════════════════════════════════════════════════════
```

### Comprehensive Testing

Run full test suite for all models:

```bash
# Test all models
npm run test:bedrock

# Test specific models
node scripts/test-aws-bedrock-comprehensive.js --models claude-opus-4-1,claude-sonnet-4-5

# Verbose output
npm run test:bedrock:verbose

# Quick test (skip streaming and variations)
npm run test:bedrock:quick
```

### Integration Tests

```bash
# Production integration tests
npm run test:bedrock:integration

# Test specific model
node scripts/aws-bedrock-integration-tests.js --models claude-opus-4-1
```

## IAM Permissions

### Required Permissions

Create an IAM policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockModelAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/*",
        "arn:aws:bedrock:us-east-1:394686422207:inference-profile/*"
      ]
    },
    {
      "Sid": "BedrockMetadata",
      "Effect": "Allow",
      "Action": [
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel"
      ],
      "Resource": "*"
    }
  ]
}
```

### Model-Specific Access

For production environments, restrict access to specific models:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Claude4xAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.anthropic.claude-opus-4-1-20250805-v1:0",
        "arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-east-1:394686422207:inference-profile/us.deepseek.r1-v1:0"
      ]
    }
  ]
}
```

### Attaching Policies

1. **Via AWS Console**:
   - Navigate to IAM → Users/Roles
   - Select your user/role
   - Attach policy → Create inline policy
   - Paste JSON above

2. **Via AWS CLI**:
```bash
aws iam put-user-policy \
  --user-name your-user \
  --policy-name BedrockAccess \
  --policy-document file://bedrock-policy.json
```

3. **Via Terraform**:
```hcl
resource "aws_iam_policy" "bedrock_access" {
  name        = "BedrockModelAccess"
  description = "Access to AWS Bedrock models"
  policy      = file("bedrock-policy.json")
}

resource "aws_iam_user_policy_attachment" "bedrock_attach" {
  user       = aws_iam_user.coding_agent.name
  policy_arn = aws_iam_policy.bedrock_access.arn
}
```

## Security Considerations

### Credentials Management

1. **Never commit credentials** to version control
2. **Use environment variables** for AWS credentials
3. **Rotate credentials regularly** (90 days recommended)
4. **Use IAM roles** in production environments

### Best Practices

```bash
# ✅ Good: Use environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret

# ✅ Good: Use AWS credentials file
aws configure

# ❌ Bad: Hardcoding credentials
const credentials = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
};
```

### Region-Specific Access

Some models are only available in specific regions:
- **us-east-1**: All models available
- **us-west-2**: Most models available
- **eu-west-1**: Most Claude 3.x models

Always verify model availability in your target region.

### Cost Management

Monitor usage to avoid unexpected charges:

```javascript
// Track costs using metadata
const result = await provider.predict('claude-opus-4-1', prompt);
console.log('Input tokens:', result.usage.input_tokens);
console.log('Output tokens:', result.usage.output_tokens);

// Calculate estimated cost
const inputCost = (result.usage.input_tokens / 1000) * 0.015;
const outputCost = (result.usage.output_tokens / 1000) * 0.075;
console.log('Estimated cost: $', (inputCost + outputCost).toFixed(4));
```

## Error Handling

### Common Error Scenarios

#### 1. Access Denied (403)

```
Error: User is not authorized to perform: bedrock:InvokeModel
```

**Solution**:
- Verify IAM permissions are correctly configured
- Check if model is available in your region
- Ensure inference profile ARN is correct

#### 2. Model Not Found (404)

```
Error: ResourceNotFound: Could not find model with ID us.anthropic.claude-opus-4-1-20250805-v1:0
```

**Solution**:
- Verify model ID is correct
- Check if inference profile ARN is required
- Confirm model is available in your region

#### 3. Throttling (429)

```
Error: ThrottlingException: Rate exceeded
```

**Solution**:
- Implement exponential backoff retry logic
- Request quota increase from AWS
- Consider using lower-priority models for non-critical tasks

### Error Handling Pattern

```javascript
async function invokeModelSafely(modelKey, prompt) {
  try {
    const result = await provider.predict(modelKey, prompt, {
      maxTokens: 4096,
      temperature: 0.7
    });
    
    return {
      success: true,
      content: result.content,
      usage: result.usage
    };
  } catch (error) {
    console.error(`Model invocation failed: ${error.message}`);
    
    if (error.name === 'AccessDeniedException') {
      return {
        success: false,
        error: 'IAM permissions issue. Check your AWS credentials and policies.'
      };
    }
    
    if (error.name === 'ResourceNotFoundException') {
      return {
        success: false,
        error: 'Model not found. Verify model ID and region availability.'
      };
    }
    
    if (error.name === 'ThrottlingException') {
      return {
        success: false,
        error: 'Rate limit exceeded. Retry with exponential backoff.',
        retryable: true
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Troubleshooting

### Issue: Model invocation fails with "ResourceNotFound"

**Symptoms**:
```
Could not find model with ID us.anthropic.claude-opus-4-1-20250805-v1:0
```

**Solution**:
1. Check if the model requires an inference profile ARN
2. Verify the ARN is correctly specified in `config/aws-bedrock-models.json`
3. Ensure your IAM policy includes access to inference profiles
4. Confirm the model is available in your AWS region

### Issue: "AccessDenied" error

**Symptoms**:
```
User: arn:aws:iam::123456789012:user/your-user is not authorized to perform: bedrock:InvokeModel
```

**Solution**:
1. Review IAM permissions section above
2. Verify your user/role has the correct policies attached
3. Check for explicit DENY policies that might override
4. Ensure Bedrock service is enabled in AWS Console

### Issue: Inference profile ARN not working

**Symptoms**:
```
Invalid inference profile ARN format
```

**Solution**:
1. Verify ARN format matches: `arn:aws:bedrock:{region}:{account}:inference-profile/{profile-id}`
2. Ensure account ID is correct (394686422207 for system-defined profiles)
3. Check that the profile ID matches the model ID with "us." prefix
4. Confirm region matches your AWS_REGION environment variable

### Issue: Tests failing due to missing dependencies

**Symptoms**:
```
Error: Cannot find module '@aws-sdk/client-bedrock-runtime'
```

**Solution**:
```bash
npm install
# or install AWS SDK specifically
npm install @aws-sdk/client-bedrock-runtime
```

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## Related Documentation

- [`docs/AWS_BEDROCK_TESTING_README.md`](./AWS_BEDROCK_TESTING_README.md) - Setup and testing guide
- [`docs/AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md`](./AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md) - Test harness documentation
- [`docs/AWS_BEDROCK_CODING_GUIDE.md`](./AWS_BEDROCK_CODING_GUIDE.md) - Developer guide
- [`AWS_BEDROCK_QUICK_SUMMARY.md`](../AWS_BEDROCK_QUICK_SUMMARY.md) - Quick reference

## Support

For issues or questions:
1. Check this documentation and troubleshooting section
2. Review test results in `AWS_BEDROCK_CLAUDE_TEST_RESULTS.md`
3. Run health check: `npm run bedrock:health`
4. Open an issue on GitHub with detailed error logs

---

**Version History**:
- **2.0.0** (2025-10-12): Major update with Claude 4.x models, DeepSeek-R1, inference profile ARN support
- **1.0.0** (2025-01-15): Initial release with Claude 3.x models
