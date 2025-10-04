# Claude Opus 4.1 Verification Quick Reference

## 🚀 Quick Start

Run the verification script with your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_key \
AWS_SECRET_ACCESS_KEY=your_secret \
AWS_REGION=us-east-1 \
npm run bedrock:verify-opus
```

## 📋 What This Script Checks

1. **AWS Credentials** - Validates your credentials are properly configured
2. **Available Models** - Lists all Claude models in your AWS Bedrock account
3. **Inference Profiles** - Lists all available inference profiles
4. **Model Testing** - Tests actual invocation of found models

## 🎯 Expected Outcomes

### Scenario 1: Claude Opus 4.1 Not Available (Most Likely)

**Output:**
```
⚠️  No Claude Opus models found
   This suggests Claude Opus 4.1 is not yet available in your account/region
```

**Recommendation:** Use Claude 3 Opus as fallback
```json
{
  "modelId": "anthropic.claude-3-opus-20240229-v1:0",
  "requiresInferenceProfile": false,
  "inferenceProfileArn": null
}
```

### Scenario 2: Claude Opus 4.1 IS Available (Future Release)

**Output:**
```
✅ Found Anthropic models
📌 Claude Opus Models:
   • Claude Opus 4.1
     ID: anthropic.claude-opus-4-1-20250805-v1:0
```

**Action:** Update `config/aws-bedrock-models.json` with the verified model ID and ARN

## 🔧 Configuration Updates

### If Using Claude 3 Opus (Recommended Now)

Update `config/aws-bedrock-models.json`:

```json
{
  "claude-opus-production": {
    "modelId": "anthropic.claude-3-opus-20240229-v1:0",
    "displayName": "Claude 3 Opus",
    "provider": "anthropic",
    "family": "claude-3",
    "capabilities": ["text-generation", "conversation", "analysis", "vision"],
    "contextWindow": 200000,
    "maxOutputTokens": 4096,
    "requiresInferenceProfile": false,
    "inferenceProfileArn": null,
    "regions": ["us-east-1", "us-west-2", "eu-west-1"],
    "deprecated": false,
    "priority": 1
  }
}
```

### If Claude Opus 4.1 Becomes Available

Update with the verified ARN from the script output:

```json
{
  "claude-opus-4-1": {
    "modelId": "anthropic.claude-opus-4-1-20250805-v1:0",
    "requiresInferenceProfile": true,
    "inferenceProfileArn": "arn:aws:bedrock:us-east-1:[YOUR_ACCOUNT]:inference-profile/[VERIFIED_ARN]",
    "regions": ["us-east-1"]
  }
}
```

## 🛠️ Manual Verification Commands

If the script doesn't work, use these AWS CLI commands directly:

### 1. List All Claude Models
```bash
aws bedrock list-foundation-models \
  --region us-east-1 \
  --by-provider Anthropic \
  | jq '.modelSummaries[] | {modelId, modelName}'
```

### 2. List Inference Profiles
```bash
aws bedrock list-inference-profiles \
  --region us-east-1 \
  | jq '.inferenceProfileSummaries[] | select(.inferenceProfileName | contains("opus"))'
```

### 3. Test Model Invocation
```bash
# For Claude 3 Opus (should work)
aws bedrock-runtime invoke-model \
  --region us-east-1 \
  --model-id anthropic.claude-3-opus-20240229-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","messages":[{"role":"user","content":"Hello"}],"max_tokens":100,"temperature":0.7}' \
  /tmp/response.json && cat /tmp/response.json
```

## 📊 IAM Permissions Required

Ensure your AWS IAM policy includes:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:ListFoundationModels",
        "bedrock:ListInferenceProfiles",
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🔍 Troubleshooting

### Error: "AccessDeniedException"
- **Cause:** Missing IAM permissions
- **Fix:** Add the required permissions above to your IAM policy

### Error: "ValidationException: The provided model identifier is invalid"
- **Cause:** Model not available in your account/region
- **Fix:** Use Claude 3 Opus as fallback

### Error: "No models found"
- **Cause:** Region doesn't have Bedrock enabled or no Claude models available
- **Fix:** Try a different region (us-west-2, eu-west-1) or enable Bedrock in AWS Console

## 📈 Next Steps After Verification

1. **Update Configuration**
   - Modify `config/aws-bedrock-models.json` with verified model IDs
   - Set `requiresInferenceProfile: false` if using Claude 3 Opus

2. **Re-run Validation**
   ```bash
   npm run bedrock:validate:live
   ```

3. **Test Integration**
   ```bash
   npm run bedrock:demo
   ```

4. **Re-trigger CI Workflow**
   - Go to: Actions > AWS Bedrock Full Integration Validation
   - Run workflow with updated configuration

## 💡 Best Practices

1. **Always verify model availability before deploying**
2. **Keep fallback models configured** (e.g., Claude 3 Opus, 3.5 Sonnet v2)
3. **Monitor AWS Bedrock announcements** for new model releases
4. **Re-run verification periodically** to check for new models
5. **Document your model choices** in configuration comments

## 📚 Additional Resources

- [AWS Bedrock Models Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
- [Inference Profiles Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html)
- [CRITICAL_FIXES_REPORT.md](../CRITICAL_FIXES_REPORT.md) - Complete fix documentation

## 🤝 Support

For issues or questions:
- Check `CRITICAL_FIXES_REPORT.md` for detailed troubleshooting
- Review AWS Bedrock console for model availability
- Verify IAM permissions match requirements above
- Re-run verification script after any AWS account changes

---

**Last Updated:** 2025-01-15  
**Script:** `scripts/verify-claude-opus-availability.js`  
**Config:** `config/aws-bedrock-models.json`
