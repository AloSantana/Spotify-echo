# AWS Bedrock Comprehensive Test Harness & Copilot Integration

## Overview

A robust, production-ready test framework and Copilot integration for AWS Bedrock model testing with comprehensive error handling, inference profile ARN support, actionable recommendations, and interactive model switching.

## Features

### Test Harness
✅ **Configurable Model Registry** - JSON-based model configuration with 12+ models  
✅ **Inference Profile ARN Support** - Automatic ARN usage for cross-region models  
✅ **Comprehensive Testing** - Basic, streaming, and parameter variation tests  
✅ **Smart Error Handling** - Categorizes errors with actionable recommendations  
✅ **Multiple Output Formats** - JSON and Markdown reports  
✅ **Region Support** - Test models in any AWS region  
✅ **Deprecated Model Filtering** - Exclude old models automatically  
✅ **CI/CD Ready** - Proper exit codes and report generation  

### Copilot Integration ✨ NEW
✅ **Visible Model Tracking** - Always know which model is handling requests  
✅ **Slash Commands** - Dynamic model switching with `/use` and `/model` commands  
✅ **Session Management** - Track token usage, latency, and interactions  
✅ **Default Models** - Claude Sonnet 4.5 (coding) and Opus 4.1 (analysis)  
✅ **Model Confirmations** - Visual feedback for all model changes  
✅ **Session Reports** - Export detailed session statistics  

## Quick Start

### Test Harness

```bash
# Install AWS SDK (if not already installed)
npm install @aws-sdk/client-bedrock-runtime

# Set credentials
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"

# Run tests
npm run test:bedrock
```

### Copilot Integration ✨ NEW

```bash
# Start interactive session with model visibility
npm run bedrock:session

# Check current model
npm run bedrock:status

# List available models
npm run bedrock:list

# Switch models dynamically
node scripts/aws-bedrock-copilot-integration.js /use claude-opus-4-1

# Get help
npm run bedrock:help
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

### Copilot Integration Slash Commands ✨ NEW

```bash
# Model switching
/use claude-opus-4-1          # Switch to Claude Opus 4.1
/use claude-sonnet-4-5        # Switch to Claude Sonnet 4.5 (default)
/use claude-3-5-sonnet-v2     # Switch to Claude 3.5 Sonnet v2
/use deepseek-r1              # Switch to DeepSeek R1
/use titan                    # Switch to Amazon Titan

# Model information
/model status                 # Show current model and stats
/model list                   # List all available models
/model reset                  # Reset to default model
/model help                   # Show all commands

# NPM shortcuts
npm run bedrock:session       # Start interactive session
npm run bedrock:status        # Quick status check
npm run bedrock:list          # List models
npm run bedrock:help          # Show help
```

### Visible Model Tracking ✨ NEW

Every session displays current model information:

```
╔════════════════════════════════════════════════════════════╗
║  GitHub Copilot Session - AWS Bedrock Integration         ║
╠════════════════════════════════════════════════════════════╣
║  Model: Claude Sonnet 4.5                                 ║
║  ID: anthropic.claude-sonnet-4-5-20250929-v1:0            ║
║  Region: us-east-1                                          ║
║  Purpose: Code generation & analysis                        ║
║  Session Started: 2025-01-15 13:00:00                     ║
╚════════════════════════════════════════════════════════════╝
```

When switching models:
```
📝 Model Changed
• Previous: Claude Sonnet 4.5
• Current: Claude Opus 4.1 (anthropic.claude-opus-4-1-20250805-v1:0)
• Region: us-east-1
• Reason: User requested via /use command
```

## NPM Scripts

### Test Harness Scripts

| Script | Description |
|--------|-------------|
| `npm run test:bedrock` | Run all non-deprecated models |
| `npm run test:bedrock:verbose` | Verbose output with detailed logging |
| `npm run test:bedrock:quick` | Skip streaming & variations (faster) |
| `npm run test:bedrock:deprecated` | Include deprecated models |
| `npm run test:bedrock:legacy` | Run original test script |

### Copilot Integration Scripts ✨ NEW

| Script | Description |
|--------|-------------|
| `npm run bedrock:session` | Start interactive Copilot session |
| `npm run bedrock:status` | Show current model and session stats |
| `npm run bedrock:list` | List all available Bedrock models |
| `npm run bedrock:help` | Show all slash commands |

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

- **[Comprehensive Test Guide](./docs/AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md)** - Full usage documentation
- **[Test Examples](./docs/AWS_BEDROCK_TEST_EXAMPLES.md)** - Example outputs and scenarios
- **[Testing README](./docs/AWS_BEDROCK_TESTING_README.md)** - Overview and setup
- **[Copilot Integration Guide](./docs/AWS_BEDROCK_COPILOT_INTEGRATION.md)** ✨ NEW - Interactive session management

## Example Usage

### Test Harness Examples

#### Test All Models
```bash
npm run test:bedrock
```

#### Test Specific Models
```bash
npm run test:bedrock -- --models claude-3-5-sonnet-v2,claude-sonnet-4-5
```

#### Test in Different Region
```bash
AWS_REGION=us-west-2 npm run test:bedrock
```

#### Quick Health Check
```bash
npm run test:bedrock:quick
```

### Copilot Integration Examples ✨ NEW

#### Start Interactive Session
```bash
npm run bedrock:session
```

#### Check Current Model
```bash
npm run bedrock:status
```

Output:
```
🤖 Running on AWS Bedrock
• Model: Claude Sonnet 4.5
• Model ID: anthropic.claude-sonnet-4-5-20250929-v1:0
• Region: us-east-1
• Purpose: Code generation & analysis

📊 Session Statistics
• Interactions: 15
• Total Tokens: 5,432
• Current Model Tokens: 5,432
• Model Switches: 0
```

#### Switch Models for Specific Tasks
```bash
# Switch to Opus for architectural review
node scripts/aws-bedrock-copilot-integration.js /use claude-opus-4-1

# Switch to DeepSeek for complex reasoning
node scripts/aws-bedrock-copilot-integration.js /use deepseek-r1

# Reset to default
node scripts/aws-bedrock-copilot-integration.js /model reset
```

#### List All Available Models
```bash
npm run bedrock:list
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
