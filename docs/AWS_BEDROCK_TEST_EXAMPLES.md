# AWS Bedrock Test Harness - Example Output

This document shows example output from the comprehensive test harness to help maintainers understand what to expect.

## Example 1: Successful Test Run

```bash
$ npm run test:bedrock

================================================================================
AWS BEDROCK COMPREHENSIVE MODEL TEST HARNESS
================================================================================

Configuration: 10 models to test
Region: us-east-1
Include deprecated: false
Skip streaming: false
Skip variations: false

================================================================================
Testing Model: Claude Opus 4.1 (anthropic.claude-opus-4-1-20250805-v1:0)
================================================================================
🧪 Testing Claude Opus 4.1: Basic text generation...
✅ ✓ Basic generation successful (342ms)
🧪 Testing Claude Opus 4.1: Streaming response...
✅ ✓ Streaming successful (45 chunks, 567ms)
🧪 Testing Claude Opus 4.1: Parameter variations...
ℹ️   ✓ low_temperature
ℹ️   ✓ high_temperature
ℹ️   ✓ long_response

================================================================================
Testing Model: Claude Sonnet 4.5 (anthropic.claude-sonnet-4-5-20250929-v1:0)
================================================================================
🧪 Testing Claude Sonnet 4.5: Basic text generation...
✅ ✓ Basic generation successful (289ms)
🧪 Testing Claude Sonnet 4.5: Streaming response...
✅ ✓ Streaming successful (42 chunks, 512ms)
🧪 Testing Claude Sonnet 4.5: Parameter variations...
ℹ️   ✓ low_temperature
ℹ️   ✓ high_temperature
ℹ️   ✓ long_response

... (additional models) ...

================================================================================
TEST SUMMARY REPORT
================================================================================

📊 STATISTICS
  Total Models in Registry: 12
  Models Tested: 10
  Models Skipped: 2
  Successful: 7
  Failed: 3
  Test Duration: 12456ms

✅ WORKING MODELS
  • Claude Opus 4.1
    - Latency: 342ms
    - Tokens: 187
    - Streaming: ✓ (45 chunks)
  • Claude Sonnet 4.5
    - Latency: 289ms
    - Tokens: 162
    - Streaming: ✓ (42 chunks)
  • Claude 3.5 Sonnet v2
    - Latency: 298ms
    - Tokens: 175
    - Streaming: ✓ (41 chunks)
  ... (more models) ...

❌ FAILED MODELS
  • Claude 2.1
    - Error: Model not available in this region
    - HTTP Status: 404
    - Action: Model may not be available in this region or may require enablement in AWS Console
  ... (more failed models) ...

💡 RECOMMENDATIONS

🟡 PARTIAL_SUCCESS: 7 models working, 3 failed
  1. Use working models: Claude Opus 4.1, Claude Sonnet 4.5, Claude 3.5 Sonnet v2...
  2. Implement fallback logic to use working models
  3. Investigate failed models individually
  4. Consider using cross-region inference profiles for reliability

================================================================================

✅ Results saved to: test-results/aws-bedrock-comprehensive-1705329000000.json
✅ Markdown report saved to: test-results/aws-bedrock-comprehensive-1705329000000.md
```

## Example 2: Permission Errors

```bash
$ npm run test:bedrock

================================================================================
AWS BEDROCK COMPREHENSIVE MODEL TEST HARNESS
================================================================================

Configuration: 10 models to test
Region: us-east-1

================================================================================
Testing Model: Claude Opus 4.1 (anthropic.claude-opus-4-1-20250805-v1:0)
================================================================================
🧪 Testing Claude Opus 4.1: Basic text generation...
❌ ✗ Basic generation failed: User is not authorized to perform: bedrock:InvokeModel with an EXPLICIT DENY
⚠️  Model Claude Opus 4.1 failed basic test - skipping additional tests

... (all models fail with same error) ...

================================================================================
TEST SUMMARY REPORT
================================================================================

📊 STATISTICS
  Total Models in Registry: 12
  Models Tested: 10
  Models Skipped: 2
  Successful: 0
  Failed: 10
  Test Duration: 3245ms

❌ FAILED MODELS
  • Claude Opus 4.1
    - Error: User is not authorized to perform: bedrock:InvokeModel with an EXPLICIT DENY
    - HTTP Status: 403
    - Category: permissions
  • Claude Sonnet 4.5
    - Error: User is not authorized to perform: bedrock:InvokeModel with an EXPLICIT DENY
    - HTTP Status: 403
    - Category: permissions
  ... (all models) ...

💡 RECOMMENDATIONS

🔴 CRITICAL: All models failed - likely an IAM permission issue
  1. Verify AWS credentials are valid
  2. Check IAM policy includes bedrock:InvokeModel permission
  3. Remove any explicit DENY policies for Bedrock
  4. Ensure Bedrock service is enabled in AWS Console
  5. Verify models are enabled in the target region

🟠 PERMISSIONS: 10 models failed due to permission errors
  1. Review IAM policy attached to the user/role
  2. Add bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream actions
  3. Ensure resource ARN includes the specific models or use wildcard
  4. Check for Service Control Policies (SCPs) that may block access

================================================================================
```

## Example 3: JSON Report Structure

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "region": "us-east-1",
  "overall": "partial_success",
  "summary": {
    "totalModels": 12,
    "testedModels": 10,
    "successfulModels": 7,
    "failedModels": 3,
    "skippedModels": 2
  },
  "modelResults": {
    "anthropic.claude-opus-4-1-20250805-v1:0": {
      "modelId": "anthropic.claude-opus-4-1-20250805-v1:0",
      "displayName": "Claude Opus 4.1",
      "provider": "anthropic",
      "family": "claude-4",
      "priority": 1,
      "deprecated": false,
      "requiresInferenceProfile": false,
      "inferenceProfileArn": null,
      "tests": {
        "basicTextGeneration": {
          "success": true,
          "testName": "basicTextGeneration",
          "latency": 342,
          "response": "Hello! I'm Claude, an AI assistant...",
          "tokenUsage": {
            "input": 25,
            "output": 162,
            "total": 187
          },
          "stopReason": "end_turn"
        },
        "streamingResponse": {
          "success": true,
          "testName": "streamingResponse",
          "chunkCount": 45,
          "latency": 567,
          "responseLength": 234,
          "streamingSupported": true
        },
        "parameterVariations": {
          "success": true,
          "testName": "parameterVariations",
          "variations": [
            {
              "variation": "low_temperature",
              "status": "success",
              "responseLength": 98,
              "tokenUsage": { "input_tokens": 30, "output_tokens": 98 }
            },
            {
              "variation": "high_temperature",
              "status": "success",
              "responseLength": 125,
              "tokenUsage": { "input_tokens": 30, "output_tokens": 125 }
            },
            {
              "variation": "long_response",
              "status": "success",
              "responseLength": 987,
              "tokenUsage": { "input_tokens": 30, "output_tokens": 987 }
            }
          ],
          "successCount": 3,
          "failureCount": 0
        }
      },
      "overall": "success",
      "timestamp": "2025-01-15T10:30:15.234Z"
    }
  },
  "errors": [],
  "warnings": [
    "Streaming not supported for Amazon Titan Text Express"
  ],
  "recommendations": [
    {
      "priority": "medium",
      "category": "partial_success",
      "message": "7 models working, 3 failed",
      "actions": [
        "Use working models: Claude Opus 4.1, Claude Sonnet 4.5, Claude 3.5 Sonnet v2",
        "Implement fallback logic to use working models",
        "Investigate failed models individually",
        "Consider using cross-region inference profiles for reliability"
      ],
      "workingModels": [
        "Claude Opus 4.1",
        "Claude Sonnet 4.5",
        "Claude 3.5 Sonnet v2"
      ]
    }
  ],
  "metadata": {
    "testDuration": 12456,
    "configVersion": "1.0.0"
  }
}
```

## Example 4: Markdown Report

```markdown
# AWS Bedrock Comprehensive Model Test Report

**Generated**: 2025-01-15T10:30:00.000Z
**Region**: us-east-1
**Test Duration**: 12456ms
**Config Version**: 1.0.0

## Summary

| Metric | Count |
|--------|-------|
| Total Models | 12 |
| Tested | 10 |
| Skipped | 2 |
| ✅ Successful | 7 |
| ❌ Failed | 3 |

## ✅ Working Models

| Model | Provider | Family | Latency | Tokens | Streaming |
|-------|----------|--------|---------|--------|-----------|
| Claude Opus 4.1 | anthropic | claude-4 | 342ms | 187 | ✓ |
| Claude Sonnet 4.5 | anthropic | claude-4 | 289ms | 162 | ✓ |
| Claude 3.5 Sonnet v2 | anthropic | claude-3-5 | 298ms | 175 | ✓ |

## ❌ Failed Models

| Model | Error | HTTP Status | Category |
|-------|-------|-------------|----------|
| Claude 2.1 | Model not available in this region | 404 | model_availability |
| DeepSeek R1 | Validation error in request parameters | 400 | validation |

## 💡 Recommendations

### MEDIUM: 7 models working, 3 failed

1. Use working models: Claude Opus 4.1, Claude Sonnet 4.5, Claude 3.5 Sonnet v2
2. Implement fallback logic to use working models
3. Investigate failed models individually
4. Consider using cross-region inference profiles for reliability

## Detailed Results

\`\`\`json
{
  "anthropic.claude-opus-4-1-20250805-v1:0": {
    "overall": "success",
    "tests": { ... }
  }
}
\`\`\`
```

## Example 5: Quick Test (Skip Streaming & Variations)

```bash
$ npm run test:bedrock:quick

================================================================================
AWS BEDROCK COMPREHENSIVE MODEL TEST HARNESS
================================================================================

Configuration: 10 models to test
Region: us-east-1
Skip streaming: true
Skip variations: true

... (only basic text generation tests run) ...

📊 STATISTICS
  Total Models in Registry: 12
  Models Tested: 10
  Models Skipped: 2
  Successful: 8
  Failed: 2
  Test Duration: 4234ms  ← Much faster!

✅ All basic tests completed quickly
```

## Example 6: Testing Specific Models

```bash
$ npm run test:bedrock -- --models claude-3-5-sonnet-v2,claude-sonnet-4-5

================================================================================
AWS BEDROCK COMPREHENSIVE MODEL TEST HARNESS
================================================================================

Configuration: 2 models to test
Region: us-east-1

... (only specified models tested) ...

📊 STATISTICS
  Models Tested: 2
  Successful: 2
  Failed: 0
  Test Duration: 2145ms
```

## Example 7: Different Region

```bash
$ AWS_REGION=us-west-2 npm run test:bedrock

================================================================================
AWS BEDROCK COMPREHENSIVE MODEL TEST HARNESS
================================================================================

Configuration: 10 models to test
Region: us-west-2  ← Different region

... (tests run in us-west-2) ...
```

## Understanding the Output

### Status Icons
- 🧪 Test in progress
- ✅ Success
- ❌ Error/Failure
- ⚠️ Warning
- ℹ️ Information
- 📊 Statistics
- 💡 Recommendations

### Priority Levels
- 🔴 **Critical**: All models failed, blocking issue
- 🟠 **High**: Multiple models affected, needs attention
- 🟡 **Medium**: Some models working, partial success
- 🟢 **Info**: All tests passed, informational

### Error Categories
- **permissions**: IAM permission issues (403)
- **model_availability**: Model not found or not enabled (404)
- **validation**: Request parameter issues (400)
- **rate_limit**: Too many requests (429)
- **service_error**: AWS service issues (5xx)

## Next Steps After Running Tests

1. **Review the Markdown report** in `test-results/` for human-readable summary
2. **Check JSON report** for programmatic access to results
3. **Follow recommendations** provided based on error patterns
4. **Implement fallback logic** using the list of working models
5. **Fix issues** for failed models if needed for your use case
