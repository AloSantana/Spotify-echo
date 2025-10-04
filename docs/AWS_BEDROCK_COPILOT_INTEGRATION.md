# AWS Bedrock Copilot Integration Guide

## Overview

This guide explains how AWS Bedrock model integration enhances GitHub Copilot coding sessions with visible model tracking, dynamic switching, and comprehensive session management.

## Features

### 1. 🎯 Visible Model Usage Tracking

Every Copilot session displays the current AWS Bedrock model being used:

```
╔════════════════════════════════════════════════════════════╗
║  GitHub Copilot Session - AWS Bedrock Integration         ║
╠════════════════════════════════════════════════════════════╣
║  Model: Claude Sonnet 4.5                                  ║
║  ID: anthropic.claude-sonnet-4-5-20250929-v1:0            ║
║  Region: us-east-1                                         ║
║  Purpose: Code generation & analysis                       ║
║  Session Started: 2025-01-15 13:00:00                     ║
╚════════════════════════════════════════════════════════════╝
```

During code completions, you'll see:
```
🤖 Running on AWS Bedrock
• Model: Claude Sonnet 4.5
• Model ID: anthropic.claude-sonnet-4-5-20250929-v1:0
• Region: us-east-1
• Purpose: Code generation & analysis
```

### 2. ⚡ Default Models

The integration prioritizes the latest Claude models:

| Model | Purpose | Priority |
|-------|---------|----------|
| **Claude Sonnet 4.5** | Code generation & analysis | 🥇 Default |
| **Claude Opus 4.1** | Complex analysis & architecture | 🥈 Secondary |
| **DeepSeek R1** | Reasoning & problem solving | 🥉 Specialized |

### 3. 🔄 Slash Commands for Model Switching

#### Model Selection Commands

Switch between models dynamically during your session:

```bash
# Switch to specific models
/use claude-3-opus          # For complex architectural analysis
/use claude-sonnet-4-5        # For code generation (default)
/use claude-3-5-sonnet-v2     # For multimodal tasks with vision
/use deepseek-r1              # For advanced reasoning
/use titan                    # For Amazon Titan text generation

# Model information commands
/model status                 # Show current model and session stats
/model list                   # List all available models
/model reset                  # Reset to default model
/model help                   # Show all available commands
```

#### Example Usage

```bash
# Start a session
$ npm run bedrock:session

# Check current model
$ npm run bedrock:status

# List available models
$ npm run bedrock:list

# Switch models
$ node scripts/aws-bedrock-copilot-integration.js /use claude-3-opus

# Get help
$ npm run bedrock:help
```

### 4. ✅ Model Change Confirmations

When you switch models, you'll see a confirmation:

```
📝 Model Changed
• Previous: Claude Sonnet 4.5
• Current: Claude Opus 4.1 (anthropic.claude-3-opus-20250805-v1:0)
• Region: us-east-1
• Reason: User requested via /use command
```

### 5. 📊 Enhanced Session Output

Session statistics are tracked automatically:

```
📊 Session Statistics
• Interactions: 42
• Total Tokens: 18,543
• Current Model Tokens: 8,234
• Model Switches: 3
```

## Quick Start

### Installation

No additional installation required - the integration uses the existing AWS Bedrock configuration.

### Basic Usage

```bash
# Start an interactive session
npm run bedrock:session

# Check current status
npm run bedrock:status

# List available models
npm run bedrock:list

# Switch models (example)
node scripts/aws-bedrock-copilot-integration.js /use claude-3-opus
```

### Integration in Code

```javascript
const BedrockCopilotIntegration = require('./scripts/aws-bedrock-copilot-integration');

// Initialize integration
const integration = new BedrockCopilotIntegration();
await integration.initialize();

// Display session header
integration.displaySessionHeader();

// Switch model
await integration.handleSlashCommand('/use', ['claude-3-opus']);

// Track an interaction
integration.trackInteraction({ total: 1523 });

// Show completion header
integration.displayCompletionHeader('Code review');

// Get session summary
const summary = integration.getSessionSummary();
console.log(summary);
```

## Available Models

The integration supports all models from `config/aws-bedrock-models.json`:

### Claude 4.x Family
- **claude-3-opus**: Complex analysis and architectural review
- **claude-sonnet-4-5**: Code generation and analysis (default)

### Claude 3.5 Family
- **claude-3-5-sonnet-v2**: Multimodal with vision support
- **claude-3-5-sonnet-v1**: General purpose
- **claude-3-5-haiku**: Fast responses

### Claude 3 Family
- **claude-3-opus**: High-quality text generation
- **claude-3-sonnet**: Balanced performance
- **claude-3-haiku**: Quick responses

### Other Models
- **deepseek-r1**: Advanced reasoning and problem solving
- **titan-text-express-v1**: Amazon Titan for general text

## Command Reference

### Slash Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/use <model>` | Switch to specified model | `/use claude-3-opus` |
| `/model status` | Show current model info | `/model status` |
| `/model list` | List all available models | `/model list` |
| `/model reset` | Reset to default model | `/model reset` |
| `/model help` | Show command help | `/model help` |

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run bedrock:session` | Start interactive session |
| `npm run bedrock:status` | Show current model status |
| `npm run bedrock:list` | List available models |
| `npm run bedrock:help` | Show help information |

## Model Selection Guide

### When to Use Each Model

#### Claude Sonnet 4.5 (Default)
**Use for:**
- Code generation and completion
- Bug fixes and refactoring
- Documentation writing
- General development tasks

**Best for:**
- Fast iterations
- Standard coding workflows
- Balanced quality and speed

#### Claude Opus 4.1
**Use for:**
- Complex architectural decisions
- System design reviews
- Detailed code analysis
- Critical bug investigation

**Best for:**
- High-stakes decisions
- In-depth analysis
- Complex problem solving

#### Claude 3.5 Sonnet v2
**Use for:**
- Multimodal tasks (text + images)
- UI/UX analysis
- Visual debugging
- Screenshot analysis

**Best for:**
- Frontend development
- Visual design work
- Image-related tasks

#### DeepSeek R1
**Use for:**
- Mathematical reasoning
- Algorithm design
- Complex logic problems
- Research tasks

**Best for:**
- Computational problems
- Advanced reasoning
- Research and analysis

#### Amazon Titan
**Use for:**
- Simple text generation
- Cost-effective operations
- Basic completions

**Best for:**
- Budget-conscious development
- Simple tasks
- Testing

## Session Management

### Tracking Interactions

The integration automatically tracks:
- Number of interactions
- Token usage per model
- Model switch history
- Session duration

### Exporting Session State

```javascript
// Export session state to file
await integration.exportSessionState('./session-report.json');
```

The exported file includes:
- Session ID and duration
- Current model information
- Complete interaction history
- Token usage breakdown
- Model switch log

## Configuration

### Environment Variables

```bash
# AWS configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Model configuration (optional)
BEDROCK_DEFAULT_MODEL=claude-sonnet-4-5
```

### Model Registry

Models are configured in `config/aws-bedrock-models.json`. Each model includes:
- `modelId`: AWS Bedrock model identifier
- `displayName`: Human-readable name
- `provider`: Model provider (anthropic, amazon, etc.)
- `family`: Model family grouping
- `capabilities`: List of capabilities
- `regions`: Available AWS regions
- `priority`: Default priority order

## Best Practices

### 1. Start with Default Model
Begin sessions with the default Claude Sonnet 4.5 for general development.

### 2. Switch for Specific Tasks
Use `/use` commands to switch models for specialized tasks:
- Complex analysis → Claude Opus 4.1
- Visual tasks → Claude 3.5 Sonnet v2
- Reasoning → DeepSeek R1

### 3. Monitor Token Usage
Check token usage regularly with `/model status` to track costs.

### 4. Reset After Specialized Tasks
Use `/model reset` to return to the default model after completing specialized tasks.

### 5. Document Model Choices
Log which models you used for different tasks to optimize future workflows.

## Troubleshooting

### Model Not Found
**Error**: `Model "xyz" not found`

**Solution**: Use `/model list` to see available models. Ensure the model key matches exactly.

### Configuration Load Error
**Error**: `Failed to load configuration`

**Solution**: Verify `config/aws-bedrock-models.json` exists and is valid JSON.

### AWS Credentials
**Error**: Authentication failures

**Solution**: Ensure AWS credentials are set:
```bash
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

## Integration with Copilot

### In GitHub Copilot Chat

The model information appears automatically in:
- Session headers
- Completion banners
- Change confirmations

### In VS Code

Use the terminal to run commands:
```bash
# Check model in terminal
npm run bedrock:status

# Switch models
node scripts/aws-bedrock-copilot-integration.js /use claude-3-opus
```

### In CI/CD

Reference the current model in automated workflows:
```yaml
- name: Run with Bedrock model
  run: |
    npm run bedrock:session
    # Your CI commands here
```

## Examples

### Example 1: Code Review Session

```bash
# Start session with architecture model
node scripts/aws-bedrock-copilot-integration.js /use claude-3-opus

# Perform review
# ... review code ...

# Switch back to default
node scripts/aws-bedrock-copilot-integration.js /model reset
```

### Example 2: Multi-Model Workflow

```bash
# Start with default model
npm run bedrock:session

# Quick code generation
# ... write code with Sonnet 4.5 ...

# Switch for complex analysis
node scripts/aws-bedrock-copilot-integration.js /use claude-3-opus
# ... analyze architecture ...

# Switch for reasoning task
node scripts/aws-bedrock-copilot-integration.js /use deepseek-r1
# ... solve complex problem ...

# Return to default
node scripts/aws-bedrock-copilot-integration.js /model reset
```

### Example 3: Session with Tracking

```javascript
const integration = new BedrockCopilotIntegration();
await integration.initialize();

// Start with default
integration.displaySessionHeader();

// Do some work
integration.displayCompletionHeader('Feature implementation');
integration.trackInteraction({ total: 2341 });

// Switch model
await integration.handleSlashCommand('/use', ['claude-3-opus']);
integration.displayCompletionHeader('Architecture review');
integration.trackInteraction({ total: 3452 });

// Get summary
const summary = integration.getSessionSummary();
console.log('Session Summary:', summary);

// Export report
await integration.exportSessionState('./reports/session-report.json');
```

## Support

For issues or questions:
1. Check configuration: `npm run bedrock:status`
2. List available models: `npm run bedrock:list`
3. View help: `npm run bedrock:help`
4. Consult main documentation: `docs/AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md`

## Version History

- **1.0.0** (2025-01-15): Initial release
  - Visible model tracking
  - Slash command support
  - Session management
  - Token usage tracking
  - Model switching with confirmations
  - Default Claude 4.x models

## License

See repository LICENSE file for details.
