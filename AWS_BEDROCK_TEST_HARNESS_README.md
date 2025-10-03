# AWS Bedrock Comprehensive Test Harness & Model Manager

> **IMPORTANT DISCLAIMER:**  
> The "Model Manager" tool is for AWS Bedrock model testing and configuration only.
> It does **NOT** control which models GitHub Copilot uses. GitHub Copilot's model
> selection is managed by GitHub's infrastructure, not by this tool.

## Overview

A robust, production-ready test framework and model management tool for AWS Bedrock model testing with comprehensive error handling, inference profile ARN support, actionable recommendations, and interactive model switching.

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
✅ **Retry Logic** - Automatic retry with exponential backoff for transient errors  
✅ **Auto-Create Directories** - Test results directory created automatically  

### Model Manager (formerly "Copilot Integration")
✅ **Visible Model Tracking** - Always know which model is being tested  
✅ **Slash Commands** - Dynamic model switching with `/use` and `/model` commands  
✅ **Testing Session Management** - Track token usage, latency, and interactions  
✅ **Default Models** - Claude Sonnet 4.5 (coding) and Opus 4.1 (analysis)  
✅ **Model Confirmations** - Visual feedback for all model changes  
✅ **Session Reports** - Export detailed testing session statistics  

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

### Model Manager

```bash
# Start interactive model manager
npm run bedrock:manager

# Check current model
npm run bedrock:status

# List available models
npm run bedrock:list

# Switch models dynamically
node scripts/aws-bedrock-model-manager.js /use claude-opus-4-1

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

### Model Manager Slash Commands

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
npm run bedrock:manager       # Start interactive model manager
npm run bedrock:status        # Quick status check
npm run bedrock:list          # List models
npm run bedrock:help          # Show help
```

### Visible Model Tracking

Every testing session displays current model information:

```
╔════════════════════════════════════════════════════════════╗
║  AWS Bedrock Model Manager – Testing & Configuration Tool ║
╠════════════════════════════════════════════════════════════╣
║  Model: Claude Sonnet 4.5                                 ║
║  ID: anthropic.claude-sonnet-4-5-20250929-v1:0            ║
║  Region: us-east-1                                          ║
║  Purpose: Code generation & analysis                        ║
║  Testing Session Started: 2025-01-15 13:00:00             ║
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
| `npm run test:bedrock:integration` | Run production integration tests |

### Model Manager Scripts

| Script | Description |
|--------|-------------|
| `npm run bedrock:manager` | Start interactive model manager |
| `npm run bedrock:status` | Show current model and testing session stats |
| `npm run bedrock:list` | List all available Bedrock models |
| `npm run bedrock:help` | Show all slash commands |
| `npm run bedrock:health` | Quick health check for Bedrock access |

## CLI Options

### Test Harness Options

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
  --max-retries <number>    Maximum retry attempts (default: 3)
  --help                    Show help
```

### Shell Wrapper Options

```bash
./scripts/test-aws-bedrock.sh [options] [credentials]

Options:
  -h, --help              Show help message
  -v, --verbose           Enable verbose output
  -q, --quick             Run quick tests
  --max-retries NUM       Set retry attempts
  --region REGION         Set AWS region
  --models MODEL1,MODEL2  Test specific models

Positional Arguments:
  AWS_ACCESS_KEY_ID       AWS access key
  AWS_SECRET_ACCESS_KEY   AWS secret key
  AWS_REGION              AWS region (optional)
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

### Core Guides
- **[AWS Bedrock Coding Guide](./docs/AWS_BEDROCK_CODING_GUIDE.md)** - Comprehensive guide for using AWS Bedrock Claude models
- **[Quickstart Guide](./docs/AWS_BEDROCK_QUICKSTART.md)** - Get started in 5 minutes
- **[Test Harness README](./AWS_BEDROCK_TEST_HARNESS_README.md)** - This document

### Additional Resources
- **[Architecture Documentation](./docs/AWS_BEDROCK_ARCHITECTURE.md)** - System architecture and design (coming soon)
- **[Integration Tests](./scripts/aws-bedrock-integration-tests.js)** - Production integration test examples
- **[Health Check Script](./scripts/aws-bedrock-health-check.js)** - Quick availability verification

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
npm run bedrock:health
```

#### With Retry Configuration
```bash
npm run test:bedrock -- --max-retries 5
```

### Model Manager Examples

#### Start Interactive Manager
```bash
npm run bedrock:manager
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
