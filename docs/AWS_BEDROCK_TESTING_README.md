# AWS Bedrock Testing - Comprehensive Guide

This directory contains comprehensive testing infrastructure and results for AWS Bedrock model integration.

## 🚀 New: Comprehensive Test Harness

**Version 1.0.0** - A robust, configurable test harness for AWS Bedrock models with:
- ✅ Inference profile ARN support
- ✅ Detailed error reporting with actionable insights
- ✅ Configurable model registry
- ✅ Streaming and parameter variation tests
- ✅ JSON and Markdown reports

**See**: [AWS Bedrock Comprehensive Test Guide](./AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md)

## 📋 Executive Summary

**Test Infrastructure**: ✅ **Comprehensive Test Harness Available**  
**Configuration**: Model registry with inference profile support  
**Documentation**: Complete usage guide and troubleshooting  
**Integration**: CI/CD ready with multiple test modes

## 🔑 Credentials Tested

- **AWS Access Key**: AKIAVXZJE3S7XRIRYUBC
- **AWS Secret Key**: Provided (masked for security)
- **AWS Region**: us-east-1
- **IAM User**: github-bedrock-agent
- **Account**: 394686422207

## ✅ What's Working

- AWS credentials authenticate successfully
- AWS SDK client initialization works
- Network connectivity confirmed
- IAM user exists and is valid

## ❌ What's NOT Working

- **IAM Explicit Deny Policy**: Blocks all Bedrock access
- Cannot invoke any Claude models
- Cannot access Claude 4.5 Sonnet
- Cannot perform model inference
- Cannot stream responses

## 🧪 Test Scripts

### 1. Comprehensive Bedrock Test Harness (NEW)

The new comprehensive test harness provides robust testing for all AWS Bedrock models:

```bash
# Run all tests with default settings
npm run test:bedrock

# Or use the shell script
./scripts/test-aws-bedrock-comprehensive.sh

# Quick test (skip streaming and variations)
npm run test:bedrock:quick

# Verbose output for debugging
npm run test:bedrock:verbose

# Include deprecated models
npm run test:bedrock:deprecated

# Test specific models
npm run test:bedrock -- --models claude-3-5-sonnet-v2,claude-sonnet-4-5

# Test in different region
AWS_REGION=us-west-2 npm run test:bedrock

# View all options
node scripts/test-aws-bedrock-comprehensive.js --help
```

**Features**:
- Configurable model registry (`config/aws-bedrock-models.json`)
- Inference profile ARN support
- Detailed error categorization and actionable recommendations
- Streaming and parameter variation tests
- JSON and Markdown reports in `test-results/`
- Model availability by region
- Automatic deprecated model filtering

**Documentation**: See [AWS Bedrock Comprehensive Test Guide](./AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md)

### 2. Legacy Bedrock Test (Original)

The original test script focusing on Claude models:

```bash
node scripts/test-aws-bedrock-claude.js
# or
npm run test:bedrock:legacy
```

Tests:
- Client initialization
- Credentials validation
- Model availability (Claude variants)
- Basic text generation
- Streaming responses
- Parameter variations
- Error handling

### 3. IAM User Inspection
```bash
node scripts/check-aws-iam-user.js
```

Retrieves:
- User details and ARN
- Attached policies
- Group memberships
- Permission summary

### 4. Automated Test Runner (Legacy)
```bash
./scripts/test-aws-bedrock.sh
```

Or with custom credentials:
```bash
./scripts/test-aws-bedrock.sh AWS_KEY AWS_SECRET us-east-1
```

## 📊 Model Configuration

The comprehensive test harness uses a configurable model registry at `config/aws-bedrock-models.json`.

### Supported Models

The configuration includes:
- **Claude 4.x**: Opus 4.1, Sonnet 4.5
- **Claude 3.5**: Sonnet v2, Sonnet v1, Haiku
- **Claude 3**: Opus, Sonnet, Haiku
- **Claude 2**: Claude 2.1 (deprecated)
- **DeepSeek**: R1
- **Amazon Titan**: Text Express v1

### Adding New Models

1. Edit `config/aws-bedrock-models.json`
2. Add model entry with all required fields
3. Run test: `npm run test:bedrock -- --models your-model-key`

### Inference Profile ARN Support

For models requiring cross-region inference profiles:

```json
{
  "model-key": {
    "requiresInferenceProfile": true,
    "inferenceProfileArn": "arn:aws:bedrock:us-east-1::inference-profile/..."
  }
}
```

The test harness automatically uses the ARN when configured.

## 📊 Detailed Test Results

### Models Tested

| Model ID | Version | Status | Error |
|----------|---------|--------|-------|
| `anthropic.claude-3-5-sonnet-20241022-v2:0` | Claude 3.5 v2 | ❌ | Access Denied (403) |
| `anthropic.claude-3-5-sonnet-20240620-v1:0` | Claude 3.5 v1 | ❌ | Access Denied (403) |
| `anthropic.claude-3-sonnet-20240229-v1:0` | Claude 3.0 | ❌ | Access Denied (403) |
| `anthropic.claude-v2:1` | Claude 2.1 | ❌ | Access Denied (403) |

### Error Analysis

```
Error: AccessDeniedException
HTTP Status: 403
Message: User arn:aws:iam::394686422207:user/github-bedrock-agent 
         is not authorized to perform: bedrock:InvokeModel 
         with an EXPLICIT DENY in an identity-based policy
```

**Root Cause**: IAM user has explicit deny policy preventing Bedrock access.

## 🛠️ How to Fix

### Required IAM Policy

Add this policy to the IAM user or remove conflicting deny policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:GetFoundationModel",
        "bedrock:ListFoundationModels"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

### Steps to Enable Access

1. **Remove Explicit Deny**
   - Review IAM policies attached to user `github-bedrock-agent`
   - Remove or modify any policies with `Effect: "Deny"` for `bedrock:*`

2. **Add Allow Permissions**
   - Attach the policy above to the IAM user
   - Or add user to a group with Bedrock permissions

3. **Enable Claude Models**
   - Go to AWS Bedrock Console
   - Navigate to Model Access
   - Request access to Anthropic Claude models
   - Wait for approval (typically instant to a few hours)

4. **Verify Access**
   - Re-run test: `node scripts/test-aws-bedrock-claude.js`
   - Check for successful model invocation

## 📁 Generated Files

- `AWS_BEDROCK_CLAUDE_TEST_RESULTS.md` - Full test report
- `AWS_BEDROCK_QUICK_SUMMARY.md` - Quick reference summary
- `test-results/aws-bedrock-claude-test-*.json` - Raw JSON results
- `test-results/aws-bedrock-claude-test-*.md` - Formatted results

## 🔄 Re-testing After Permission Fix

Once IAM permissions are corrected:

```bash
# Re-run full test suite
node scripts/test-aws-bedrock-claude.js

# Check IAM user permissions
node scripts/check-aws-iam-user.js

# Run automated test
./scripts/test-aws-bedrock.sh
```

## 💡 Recommendations

### Immediate Actions
1. Contact AWS account administrator
2. Request Bedrock access for IAM user `github-bedrock-agent`
3. Enable Claude models in Bedrock console
4. Re-run validation tests

### Alternative Approaches
1. **Use different credentials** with Bedrock access
2. **Create new IAM user** with proper permissions
3. **Use IAM roles** instead of user credentials
4. **Test in different regions** after fixing permissions

### Security Best Practices
- Use IAM roles instead of long-term credentials when possible
- Apply least privilege principle (only grant needed permissions)
- Enable CloudTrail logging for Bedrock API calls
- Monitor usage and costs in AWS Cost Explorer
- Rotate access keys regularly

## 📚 AWS Documentation

- [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/)
- [Bedrock IAM Permissions](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html)
- [Claude on Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html)
- [Bedrock Model Access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)

## 🎯 Next Steps

1. ✅ Credentials validated - Working
2. ❌ Fix IAM permissions - **ACTION REQUIRED**
3. ⏳ Enable Claude models - Pending permissions
4. ⏳ Re-test access - After permissions granted
5. ⏳ Integrate with EchoTune AI - After validation

## 📞 Support

If you need help:
- Review the detailed reports in this directory
- Check AWS Bedrock console for model access status
- Contact your AWS administrator for IAM permissions
- Consult AWS Support if you have a support plan

---

**Test Suite Version**: 1.0.0  
**Last Updated**: October 3, 2025  
**Repository**: primoscope/Spotify-echo  
**Branch**: copilot/fix-e23c3ab4-4e7e-47cd-8240-064e06d00316
