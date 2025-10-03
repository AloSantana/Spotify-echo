# AWS Bedrock Comprehensive Test Harness

## Overview

A robust, production-ready test framework for AWS Bedrock model integration with comprehensive error handling, inference profile ARN support, and actionable recommendations.

## Quick Start

```bash
# Install AWS SDK (if not already installed)
npm install @aws-sdk/client-bedrock-runtime

# Set credentials
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"

# Run tests
npm run test:bedrock
```

## Features

✅ **Configurable Model Registry** - JSON-based model configuration with 12+ models  
✅ **Inference Profile ARN Support** - Automatic ARN usage for cross-region models  
✅ **Comprehensive Testing** - Basic, streaming, and parameter variation tests  
✅ **Smart Error Handling** - Categorizes errors with actionable recommendations  
✅ **Multiple Output Formats** - JSON and Markdown reports  
✅ **Region Support** - Test models in any AWS region  
✅ **Deprecated Model Filtering** - Exclude old models automatically  
✅ **CI/CD Ready** - Proper exit codes and report generation  

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run test:bedrock` | Run all non-deprecated models |
| `npm run test:bedrock:verbose` | Verbose output with detailed logging |
| `npm run test:bedrock:quick` | Skip streaming & variations (faster) |
| `npm run test:bedrock:deprecated` | Include deprecated models |
| `npm run test:bedrock:legacy` | Run original test script |

## CLI Options

```bash
node scripts/test-aws-bedrock-comprehensive.js [options]

Options:
  --region <region>         AWS region (default: us-east-1)
  --include-deprecated      Include deprecated models
  --models <keys>           Test specific models (comma-separated)
  --skip-streaming          Skip streaming tests
  --skip-variations         Skip parameter variation tests
  --config <path>           Custom config file
  --verbose                 Verbose logging
  --help                    Show help
```

## Configuration

Edit `config/aws-bedrock-models.json` to:
- Add new models
- Update inference profile ARNs
- Change model priorities
- Configure test prompts
- Set regional availability

## Output

Tests generate two report formats:

1. **JSON**: `test-results/aws-bedrock-comprehensive-<timestamp>.json`
2. **Markdown**: `test-results/aws-bedrock-comprehensive-<timestamp>.md`

Latest results also saved as:
- `test-results/aws-bedrock-comprehensive-latest.json`
- `test-results/aws-bedrock-comprehensive-latest.md`

## Documentation

- [Comprehensive Test Guide](./docs/AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md) - Full usage documentation
- [Test Examples](./docs/AWS_BEDROCK_TEST_EXAMPLES.md) - Example outputs and scenarios
- [Testing README](./docs/AWS_BEDROCK_TESTING_README.md) - Overview and setup

## Example Usage

### Test All Models
```bash
npm run test:bedrock
```

### Test Specific Models
```bash
npm run test:bedrock -- --models claude-3-5-sonnet-v2,claude-sonnet-4-5
```

### Test in Different Region
```bash
AWS_REGION=us-west-2 npm run test:bedrock
```

### Quick Health Check
```bash
npm run test:bedrock:quick
```

## Validation

Validate the test harness setup without AWS credentials:

```bash
node scripts/validate-bedrock-test-harness.js
```

This checks:
- Configuration file validity
- Model registry structure
- Test script components
- Documentation completeness
- NPM scripts setup

## Adding New Models

1. Edit `config/aws-bedrock-models.json`
2. Add model entry:
   ```json
   {
     "your-model-key": {
       "modelId": "provider.model-id:version",
       "displayName": "Model Name",
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
   ```
3. Test: `npm run test:bedrock -- --models your-model-key`

## Troubleshooting

### All Models Failing with 403
**Issue**: IAM permission errors  
**Solution**: Add these IAM permissions:
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

### Model Not Found (404)
**Issue**: Model not available in region  
**Solution**: 
1. Enable model in AWS Bedrock console
2. Try different region
3. Check model availability

### Module Not Found Error
**Issue**: AWS SDK not installed  
**Solution**: `npm install @aws-sdk/client-bedrock-runtime`

## Integration Examples

### CI/CD Pipeline
```yaml
- name: Test Bedrock Access
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: npm run test:bedrock:quick
```

### Node.js Application
```javascript
const TestHarness = require('./scripts/test-aws-bedrock-comprehensive');

const harness = new TestHarness({ region: 'us-east-1' });
await harness.initialize();
const results = await harness.runAllTests();

if (results.summary.successfulModels > 0) {
  console.log('Bedrock integration validated');
}
```

## Contributing

To add new features:
1. Update test harness script
2. Update configuration schema
3. Add tests to validation script
4. Update documentation
5. Submit PR

## License

See repository LICENSE file.

## Support

- **Issues**: GitHub Issues
- **Documentation**: See `docs/` directory
- **Configuration**: `config/aws-bedrock-models.json`
