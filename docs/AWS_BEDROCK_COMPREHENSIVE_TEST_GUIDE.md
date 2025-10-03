# AWS Bedrock Comprehensive Test Harness Guide

## Overview

The Comprehensive AWS Bedrock Test Harness is a robust testing framework designed to validate AWS Bedrock model integration with support for:

- ✅ Configurable model registry with inference profile ARN support
- ✅ Detailed logging and validation per model
- ✅ Comprehensive error handling with actionable insights
- ✅ Streaming and non-streaming test support
- ✅ Parameter variation testing
- ✅ Automated report generation in JSON and Markdown formats
- ✅ Support for deprecated model filtering
- ✅ Region-specific model testing

## Quick Start

### Prerequisites

1. **AWS Credentials**: Set environment variables
   ```bash
   export AWS_ACCESS_KEY_ID="your_access_key"
   export AWS_SECRET_ACCESS_KEY="your_secret_key"
   export AWS_REGION="us-east-1"  # Optional, defaults to us-east-1
   ```

2. **Install Dependencies**
   ```bash
   npm install @aws-sdk/client-bedrock-runtime
   ```

### Basic Usage

```bash
# Test all non-deprecated models in default region (us-east-1)
node scripts/test-aws-bedrock-comprehensive.js

# Test with verbose output
node scripts/test-aws-bedrock-comprehensive.js --verbose

# Test in specific region
node scripts/test-aws-bedrock-comprehensive.js --region us-west-2

# Test specific models only
node scripts/test-aws-bedrock-comprehensive.js --models claude-3-5-sonnet-v2,claude-sonnet-4-5

# Include deprecated models
node scripts/test-aws-bedrock-comprehensive.js --include-deprecated

# Skip streaming tests (faster)
node scripts/test-aws-bedrock-comprehensive.js --skip-streaming

# Skip parameter variation tests
node scripts/test-aws-bedrock-comprehensive.js --skip-variations
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--region <region>` | AWS region to test | `us-east-1` |
| `--include-deprecated` | Include deprecated models | `false` |
| `--models <keys>` | Comma-separated model keys to test | All non-deprecated |
| `--skip-streaming` | Skip streaming response tests | `false` |
| `--skip-variations` | Skip parameter variation tests | `false` |
| `--config <path>` | Custom config file path | `config/aws-bedrock-models.json` |
| `--verbose` | Enable verbose logging | `false` |
| `--help` | Show help message | - |

## Configuration File

### Location
`config/aws-bedrock-models.json`

### Structure

The configuration file defines:

1. **Model Registry**: All available Bedrock models with metadata
2. **Test Configuration**: Global test settings
3. **Test Prompts**: Standardized prompts for different test types
4. **Inference Profiles**: Cross-region inference profile ARNs
5. **Metadata**: Version and documentation info

### Model Registry Entry

```json
{
  "model-key": {
    "modelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "displayName": "Claude 3.5 Sonnet v2",
    "provider": "anthropic",
    "family": "claude-3-5",
    "capabilities": ["text-generation", "conversation", "analysis", "vision"],
    "contextWindow": 200000,
    "maxOutputTokens": 8192,
    "requiresInferenceProfile": false,
    "inferenceProfileArn": null,
    "regions": ["us-east-1", "us-west-2", "eu-west-1"],
    "deprecated": false,
    "priority": 3
  }
}
```

### Key Fields

- **modelId**: AWS Bedrock model identifier (required)
- **displayName**: Human-readable name (required)
- **provider**: Model provider (anthropic, amazon, etc.)
- **family**: Model family grouping
- **capabilities**: List of model capabilities
- **contextWindow**: Maximum context window size
- **maxOutputTokens**: Maximum output tokens
- **requiresInferenceProfile**: Whether model requires inference profile ARN
- **inferenceProfileArn**: ARN for cross-region inference (if required)
- **regions**: List of available AWS regions
- **deprecated**: Whether model is deprecated
- **priority**: Test priority (lower = higher priority)

## Test Types

### 1. Basic Text Generation
- **Purpose**: Validate model can generate basic text responses
- **Prompt**: Simple confirmation request
- **Success Criteria**: Receives valid response with token usage
- **Metrics Captured**:
  - Response latency (ms)
  - Token usage (input/output/total)
  - Stop reason
  - Response content

### 2. Streaming Response
- **Purpose**: Validate streaming API support
- **Prompt**: Multi-step counting task
- **Success Criteria**: Receives chunked response stream
- **Metrics Captured**:
  - Total chunks received
  - Stream latency (ms)
  - Response length
  - Streaming support status

### 3. Parameter Variations
- **Purpose**: Test model behavior with different parameters
- **Variations Tested**:
  - Low temperature (0.1) - More deterministic
  - High temperature (1.0) - More creative
  - Long response (1000 tokens) - Extended generation
- **Success Criteria**: All variations complete successfully
- **Metrics Captured**:
  - Response length per variation
  - Token usage per variation
  - Success/failure status

## Output and Reports

### Console Output

Real-time test progress with:
- Model testing status
- Test results (✅ success / ❌ failure)
- Error messages and actionable advice
- Summary statistics
- Recommendations

### JSON Report

**Location**: `test-results/aws-bedrock-comprehensive-<timestamp>.json`

**Contents**:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
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
    "anthropic.claude-3-5-sonnet-20241022-v2:0": {
      "overall": "success",
      "tests": {
        "basicTextGeneration": { ... },
        "streamingResponse": { ... },
        "parameterVariations": { ... }
      }
    }
  },
  "errors": [ ... ],
  "warnings": [ ... ],
  "recommendations": [ ... ]
}
```

### Markdown Report

**Location**: `test-results/aws-bedrock-comprehensive-<timestamp>.md`

**Contents**:
- Executive summary with statistics
- Working models table
- Failed models table with error details
- Actionable recommendations
- Detailed JSON results

### Latest Results

Both JSON and Markdown reports are also saved as:
- `test-results/aws-bedrock-comprehensive-latest.json`
- `test-results/aws-bedrock-comprehensive-latest.md`

These provide quick access to the most recent test run.

## Error Handling and Recommendations

### Error Categories

The harness automatically categorizes errors and provides actionable recommendations:

1. **Permissions** (403, AccessDenied)
   - Check IAM policy permissions
   - Remove explicit DENY policies
   - Verify resource ARNs

2. **Model Availability** (ResourceNotFound, not found)
   - Enable models in AWS Console
   - Check regional availability
   - Request model access

3. **Validation** (ValidationException)
   - Verify model ID format
   - Check request parameters
   - Update to correct model identifier

4. **Rate Limiting** (ThrottlingException, TooManyRequests)
   - Reduce request rate
   - Request quota increase
   - Implement backoff strategy

5. **Service Errors** (5xx status codes)
   - AWS service issues
   - Retry with exponential backoff
   - Contact AWS support if persistent

### Recommendation Priorities

- **🔴 Critical**: All models failed - likely permissions issue
- **🟠 High**: Multiple models failed with same error category
- **🟡 Medium**: Some models failed, partial success
- **🟢 Info**: All tests passed, production ready

## Adding New Models

### Step 1: Update Configuration

Add new model to `config/aws-bedrock-models.json`:

```json
{
  "modelRegistry": {
    "new-model-key": {
      "modelId": "provider.model-id:version",
      "displayName": "Model Display Name",
      "provider": "provider-name",
      "family": "model-family",
      "capabilities": ["text-generation"],
      "contextWindow": 100000,
      "maxOutputTokens": 4096,
      "requiresInferenceProfile": false,
      "inferenceProfileArn": null,
      "regions": ["us-east-1"],
      "deprecated": false,
      "priority": 50
    }
  }
}
```

### Step 2: Test the Model

```bash
# Test specific new model
node scripts/test-aws-bedrock-comprehensive.js --models new-model-key --verbose

# Or test all models including new one
node scripts/test-aws-bedrock-comprehensive.js
```

### Step 3: Update Documentation

If the model has special requirements:
1. Document in this file
2. Add notes to configuration metadata
3. Update IAM policy recommendations if needed

## Inference Profile ARN Support

For models requiring cross-region inference profiles:

### Step 1: Update Model Configuration

```json
{
  "model-key": {
    "requiresInferenceProfile": true,
    "inferenceProfileArn": "arn:aws:bedrock:us-east-1::inference-profile/us.anthropic.claude-3-5-sonnet-20240620-v1:0"
  }
}
```

### Step 2: Test with ARN

The harness automatically uses the inference profile ARN when:
- `requiresInferenceProfile` is `true`
- `inferenceProfileArn` is provided
- The model is tested

No code changes required!

## Troubleshooting

### Issue: "AWS credentials not found"

**Solution**:
```bash
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

### Issue: "All models failed with 403"

**Solution**:
1. Check IAM permissions
2. Ensure policy includes:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "bedrock:InvokeModel",
       "bedrock:InvokeModelWithResponseStream"
     ],
     "Resource": "arn:aws:bedrock:*::foundation-model/*"
   }
   ```
3. Remove any explicit DENY policies

### Issue: "Model not found in region"

**Solution**:
1. Check model availability in AWS Console
2. Enable model in Bedrock console
3. Try different region: `--region us-west-2`
4. Update configuration to remove model from region list

### Issue: "Failed to load configuration"

**Solution**:
1. Check configuration file exists: `config/aws-bedrock-models.json`
2. Validate JSON syntax
3. Use custom config: `--config /path/to/config.json`

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/bedrock-test.yml
name: AWS Bedrock Model Tests

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install @aws-sdk/client-bedrock-runtime
      - name: Run Bedrock tests
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: node scripts/test-aws-bedrock-comprehensive.js
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: bedrock-test-results
          path: test-results/
```

### Node.js Application

```javascript
const ComprehensiveBedrockTestHarness = require('./scripts/test-aws-bedrock-comprehensive');

async function validateBedrockAccess() {
  const harness = new ComprehensiveBedrockTestHarness({
    region: 'us-east-1',
    skipStreaming: true,
    skipVariations: true,
    verbose: false
  });

  await harness.initialize();
  const results = await harness.runAllTests();

  if (results.summary.successfulModels > 0) {
    console.log('Bedrock access validated');
    return results.modelResults;
  } else {
    throw new Error('No working Bedrock models found');
  }
}
```

### Scheduled Health Checks

```bash
#!/bin/bash
# bedrock-health-check.sh

# Run health check
node scripts/test-aws-bedrock-comprehensive.js \
  --skip-streaming \
  --skip-variations \
  > /var/log/bedrock-health.log 2>&1

# Check exit code
if [ $? -eq 0 ]; then
  echo "Bedrock health check passed"
  exit 0
else
  echo "Bedrock health check failed"
  # Send alert
  curl -X POST https://alerts.example.com/bedrock-failure
  exit 1
fi
```

## Best Practices

### For Development
1. Test with `--verbose` flag for detailed debugging
2. Use `--models` to test specific models during development
3. Check latest reports in `test-results/` directory
4. Update configuration when AWS releases new models

### For Production
1. Run tests in CI/CD before deployment
2. Monitor test results for model availability changes
3. Implement fallback logic based on test results
4. Set up alerts for test failures
5. Use `--skip-variations` for faster health checks

### For Maintenance
1. Review and update model configuration quarterly
2. Remove deprecated models from configuration
3. Add new models as they become available
4. Document special model requirements
5. Keep IAM policies aligned with model needs

## FAQ

### Q: How long does a full test run take?
**A**: Typically 2-5 minutes for all non-deprecated models, depending on model count and network latency.

### Q: Can I run tests in parallel?
**A**: Currently tests run sequentially per model. Parallel execution may be added in future versions.

### Q: How do I test a model requiring special setup?
**A**: Update the model configuration with `requiresInferenceProfile: true` and provide the ARN.

### Q: What if my IAM user doesn't have all permissions?
**A**: Tests will fail with 403 errors. Check recommendations in report for required permissions.

### Q: Can I customize test prompts?
**A**: Yes! Edit the `testPrompts` section in the configuration file.

### Q: How do I interpret partial success?
**A**: Partial success means some models work. Check the recommendations for which models to use.

## Support and Feedback

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check `docs/AWS_BEDROCK_TESTING_README.md` for additional info
- **Configuration**: See `config/aws-bedrock-models.json` for model registry
- **Contact**: EchoTune AI Team

## Version History

- **1.0.0** (2025-01-15): Initial release
  - Comprehensive model testing
  - Inference profile ARN support
  - Actionable error reporting
  - JSON and Markdown reports

## License

See repository LICENSE file for details.
