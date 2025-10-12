# AWS Bedrock Quick Start Guide

**Version**: 2.0.0  
**Last Updated**: October 12, 2025

## 🚀 Quick Start (5 Minutes)

### 1. Verify Configuration

```bash
# Validate configuration without AWS credentials
npm run bedrock:validate:config
npm run test:bedrock:dryrun
```

Expected output: ✅ All tests passed

### 2. Set Up AWS Credentials

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

Or create `.env` file:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

### 3. Test Connection

```bash
# Health check (requires AWS credentials)
npm run bedrock:health
```

### 4. Run Comprehensive Tests

```bash
# Test all models
npm run test:bedrock

# Test specific new models
node scripts/test-aws-bedrock-comprehensive.js --models claude-opus-4-1,claude-sonnet-4-5,deepseek-r1

# Quick test (faster)
npm run test:bedrock:quick
```

## 🎯 New Models Available

### Claude 4.x Models
- **Claude Opus 4.1**: Extended thinking, long-horizon tasks (Priority 1)
- **Claude Sonnet 4.5**: Fast coding and analysis (Priority 2)

### Advanced Reasoning
- **DeepSeek-R1**: Deep reasoning and coding (Priority 9)

### Updated Claude 3.x Models
All Claude 3.x models now use updated `us.` prefix identifiers.

## 📝 Basic Usage Example

```javascript
const BedrockInferenceProvider = require('./src/infra/BedrockInferenceProvider');

// Initialize provider
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

console.log(result.text);
```

## 🔐 Required IAM Permissions

Minimum IAM policy:

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
        "arn:aws:bedrock:us-east-1:394686422207:inference-profile/*"
      ]
    }
  ]
}
```

## 🧪 Available Commands

```bash
# Configuration validation (no AWS required)
npm run bedrock:validate:config     # Validate configuration
npm run test:bedrock:dryrun         # Dry run tests

# Health checks (requires AWS)
npm run bedrock:health              # Basic health check
npm run bedrock:health:verbose      # Detailed health check

# Comprehensive testing (requires AWS)
npm run test:bedrock                # Test all models
npm run test:bedrock:quick          # Quick test
npm run test:bedrock:verbose        # Verbose output
npm run test:bedrock:integration    # Integration tests

# Model management
npm run bedrock:manager             # Interactive model manager
npm run bedrock:list                # List available models
npm run bedrock:status              # Show model status
```

## 📚 Documentation

- **Full Integration Guide**: [`docs/BEDROCK_INTEGRATION.md`](docs/BEDROCK_INTEGRATION.md)
- **Implementation Summary**: [`AWS_BEDROCK_INTEGRATION_SUMMARY.md`](AWS_BEDROCK_INTEGRATION_SUMMARY.md)
- **Configuration**: [`config/aws-bedrock-models.json`](config/aws-bedrock-models.json)

## ❓ Troubleshooting

### Error: "Cannot find module '@aws-sdk/client-bedrock-runtime'"

```bash
npm install
```

### Error: "AccessDenied"

1. Verify AWS credentials are set
2. Check IAM permissions include Bedrock access
3. Ensure inference profile ARNs are included in policy

### Error: "ResourceNotFound"

1. Verify model ID is correct in configuration
2. Check if model requires inference profile ARN
3. Confirm model is available in your region (us-east-1 recommended)

## 🆘 Getting Help

1. Check [`docs/BEDROCK_INTEGRATION.md`](docs/BEDROCK_INTEGRATION.md) troubleshooting section
2. Run validation: `npm run bedrock:validate:config`
3. Check health: `npm run bedrock:health:verbose`
4. Review test results: `npm run test:bedrock:dryrun`

## ✨ What's New in v2.0.0

- ✅ Claude Opus 4.1 with inference profile ARN
- ✅ Claude Sonnet 4.5 with updated ARN format
- ✅ DeepSeek-R1 with inference profile ARN
- ✅ All model IDs updated to `us.` prefix
- ✅ Deprecated Claude 2.1 removed
- ✅ Comprehensive validation tools
- ✅ Enhanced documentation

## 🎉 Success Metrics

After setup, you should see:
- ✅ 29/29 configuration checks passed
- ✅ 28/28 dry run tests passed
- ✅ Health check successful
- ✅ All models accessible via provider

---

**Need More Details?** See [`docs/BEDROCK_INTEGRATION.md`](docs/BEDROCK_INTEGRATION.md)
