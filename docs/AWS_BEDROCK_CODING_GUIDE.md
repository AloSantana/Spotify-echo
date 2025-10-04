# AWS Bedrock Coding Guide

**Comprehensive guide for using AWS Bedrock Claude models (4.5 Sonnet & 4.1 Opus) for coding tasks**

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Model Selection](#model-selection)
5. [Authentication & Configuration](#authentication--configuration)
6. [Basic Usage](#basic-usage)
7. [Streaming Responses](#streaming-responses)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)
12. [Examples](#examples)

---

## Overview

AWS Bedrock provides access to Claude models from Anthropic, including:
- **Claude Sonnet 4.5**: Optimized for code generation and analysis
- **Claude Opus 4.1**: Best for complex reasoning and architectural analysis

This guide focuses on practical coding workflows using these models programmatically.

### Key Features

✅ **Production-Ready**: Includes retry logic, error handling, and monitoring  
✅ **Model Management**: Easy switching between models for different tasks  
✅ **Streaming Support**: Real-time response streaming for better UX  
✅ **Type Safety**: Full TypeScript support (JSDoc annotations)  
✅ **Testing Infrastructure**: Comprehensive test suite included  

---

## Prerequisites

### Required

- **Node.js**: v18+ (LTS recommended)
- **AWS Account**: With Bedrock access enabled
- **AWS IAM Permissions**:
  - `bedrock:InvokeModel`
  - `bedrock:InvokeModelWithResponseStream`

### Optional

- **AWS CLI**: For credential management
- **TypeScript**: For enhanced type checking

### Installation

```bash
# Install AWS SDK for Bedrock
npm install @aws-sdk/client-bedrock-runtime

# Or with Yarn
yarn add @aws-sdk/client-bedrock-runtime
```

---

## Quick Start

### 1. Set up AWS Credentials

```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_REGION="us-east-1"

# Option 2: AWS CLI configuration
aws configure
```

### 2. Run Health Check

```bash
# Verify Bedrock access
npm run bedrock:health

# Or directly
node scripts/aws-bedrock-health-check.js
```

Expected output:
```
🏥 AWS Bedrock Health Check
════════════════════════════════════════════════════════════
1️⃣  Checking AWS Credentials...
   ✅ Credentials found
   Region: us-east-1

2️⃣  Loading Model Configuration...
   ✅ Configuration loaded (12 models)

3️⃣  Initializing AWS Bedrock Client...
   ✅ Client initialized

4️⃣  Testing Model Invocation...
   Testing: Claude Sonnet 4.5
   ✅ Model invocation successful
   Latency: 1234ms
════════════════════════════════════════════════════════════
✅ Health Check PASSED - AWS Bedrock is operational
```

### 3. Test Basic Invocation

```bash
# Run integration tests
npm run test:bedrock:integration

# Or comprehensive test suite
npm run test:bedrock
```

---

## Model Selection

### Claude Sonnet 4.5 (Recommended for Coding)

**Best For:**
- Code generation
- Code refactoring
- Bug fixing
- Unit test generation
- Code documentation

**Characteristics:**
- Fast response times (~1-2s)
- 200K context window
- Excellent code quality
- Cost-effective

**Example:**
```javascript
const modelKey = 'claude-sonnet-4-5';
const prompt = 'Write a function to validate email addresses in JavaScript';
```

### Claude Opus 4.1 (Complex Analysis)

**Best For:**
- System architecture design
- Complex debugging
- Performance optimization
- Security analysis
- Multi-file refactoring

**Characteristics:**
- Advanced reasoning
- Slower but more thorough (~2-4s)
- 200K context window
- Higher cost

**Example:**
```javascript
const modelKey = 'claude-3-opus';
const prompt = 'Analyze this microservices architecture and suggest improvements';
```

### When to Use Which Model

| Task | Recommended Model | Reason |
|------|------------------|--------|
| Generate a function | Sonnet 4.5 | Fast, accurate, cost-effective |
| Refactor legacy code | Sonnet 4.5 | Good balance of speed/quality |
| Design system architecture | Opus 4.1 | Deep reasoning needed |
| Debug complex issue | Opus 4.1 | Multi-step analysis required |
| Write unit tests | Sonnet 4.5 | Straightforward task |
| Security audit | Opus 4.1 | Thorough analysis needed |

---

## Authentication & Configuration

### Environment Variables

```bash
# Required
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Optional
export AWS_REGION="us-east-1"  # Default region
```

### IAM Policy

Minimum required IAM policy:

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
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

### Configuration File

Model configuration is stored in `config/aws-bedrock-models.json`:

```json
{
  "modelRegistry": {
    "claude-sonnet-4-5": {
      "modelId": "anthropic.claude-sonnet-4-5-20250929-v1:0",
      "displayName": "Claude Sonnet 4.5",
      "provider": "anthropic",
      "capabilities": ["coding", "analysis"],
      "contextWindow": 200000,
      "maxOutputTokens": 4096,
      "regions": ["us-east-1", "us-west-2", "eu-west-1"]
    }
  }
}
```

---

## Basic Usage

### Initialize Client

```javascript
const {
  BedrockRuntimeClient,
  InvokeModelCommand
} = require('@aws-sdk/client-bedrock-runtime');

// Initialize client
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

### Simple Invocation

```javascript
async function generateCode(prompt) {
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7
  };

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.content[0].text;
}

// Usage
const code = await generateCode('Write a function to calculate Fibonacci numbers');
console.log(code);
```

### With Error Handling

```javascript
async function invokeModelSafely(prompt, modelKey = 'claude-sonnet-4-5') {
  try {
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    };

    const command = new InvokeModelCommand({
      modelId: getModelId(modelKey),
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return {
      success: true,
      text: responseBody.content[0].text,
      usage: responseBody.usage
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorCode: error.$metadata?.httpStatusCode
    };
  }
}
```

---

## Streaming Responses

### Why Use Streaming?

- **Better UX**: Show progress to users
- **Faster TTFB**: First token arrives quickly
- **Real-time feedback**: See generation in progress

### Streaming Implementation

```javascript
const {
  InvokeModelWithResponseStreamCommand
} = require('@aws-sdk/client-bedrock-runtime');

async function streamCodeGeneration(prompt) {
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  });

  const response = await client.send(command);
  let fullText = '';

  // Process stream
  for await (const event of response.body) {
    if (event.chunk) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
      
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        const text = chunk.delta.text;
        fullText += text;
        
        // Process chunk (e.g., send to UI)
        process.stdout.write(text);
      }
    }
  }

  return fullText;
}
```

### Streaming with Error Handling

```javascript
async function streamWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await streamCodeGeneration(prompt);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Error Handling

### Common Errors

#### 1. Access Denied (403)

**Cause**: IAM permissions insufficient

**Solution**:
```bash
# Add required permissions to IAM policy
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": "*"
}
```

#### 2. Model Not Found (404)

**Cause**: Model not enabled in region

**Solution**:
1. Go to AWS Bedrock console
2. Navigate to "Model access"
3. Request access to Claude models
4. Wait for approval (usually instant)

#### 3. Throttling (429)

**Cause**: Rate limit exceeded

**Solution**:
```javascript
async function invokeWithBackoff(command, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.send(command);
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 429) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### 4. Validation Error (400)

**Cause**: Invalid request parameters

**Common Issues**:
- `max_tokens` too high (>4096 for Sonnet)
- Invalid `temperature` (must be 0-1)
- Missing required fields

**Example Fix**:
```javascript
// ❌ Wrong
const requestBody = {
  max_tokens: 10000,  // Too high!
  temperature: 2.0     // Out of range!
};

// ✅ Correct
const requestBody = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 4096,    // Within limit
  temperature: 0.7,    // Valid range
  messages: [{ role: 'user', content: prompt }]
};
```

### Retry Strategy

```javascript
class BedrockClient {
  async invokeWithRetry(command, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      shouldRetry = (error) => {
        const code = error.$metadata?.httpStatusCode;
        return code === 429 || code >= 500;
      }
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.send(command);
      } catch (error) {
        lastError = error;

        if (!shouldRetry(error) || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        );

        console.log(`Retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
```

---

## Best Practices

### 1. Model Selection

```javascript
// ✅ Good: Use appropriate model for task
const modelForTask = (task) => {
  if (task.complexity === 'high') return 'claude-3-opus';
  return 'claude-sonnet-4-5';
};

// ❌ Bad: Always using expensive model
const model = 'claude-3-opus'; // Overkill for simple tasks
```

### 2. Context Management

```javascript
// ✅ Good: Provide relevant context
const prompt = `
Given this code:
\`\`\`javascript
${existingCode}
\`\`\`

Refactor to use async/await instead of callbacks.
`;

// ❌ Bad: Vague request
const prompt = 'Make this code better';
```

### 3. Temperature Settings

```javascript
// Code generation: Low temperature for deterministic output
const codeGeneration = { temperature: 0.3 };

// Creative tasks: Higher temperature for variety
const documentation = { temperature: 0.7 };

// Exploration: High temperature for diverse ideas
const brainstorming = { temperature: 0.9 };
```

### 4. Token Management

```javascript
// Estimate tokens before request
function estimateTokens(text) {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

// Set appropriate max_tokens
const inputTokens = estimateTokens(prompt);
const maxOutputTokens = Math.min(4096, 4096 - inputTokens - 100);
```

### 5. Error Logging

```javascript
async function invokeWithLogging(command) {
  const startTime = Date.now();
  
  try {
    const response = await client.send(command);
    const latency = Date.now() - startTime;
    
    console.log({
      event: 'bedrock_success',
      latency,
      model: command.input.modelId,
      timestamp: new Date().toISOString()
    });
    
    return response;
    
  } catch (error) {
    console.error({
      event: 'bedrock_error',
      error: error.message,
      errorCode: error.$metadata?.httpStatusCode,
      latency: Date.now() - startTime,
      model: command.input.modelId,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}
```

---

## Production Deployment

### Environment Configuration

```bash
# .env.production
AWS_REGION=us-east-1
BEDROCK_DEFAULT_MODEL=claude-sonnet-4-5
BEDROCK_MAX_RETRIES=5
BEDROCK_TIMEOUT_MS=30000
BEDROCK_LOG_LEVEL=info
```

### Health Monitoring

```javascript
// Setup health check endpoint
app.get('/health/bedrock', async (req, res) => {
  try {
    const result = await bedrockHealthCheck();
    res.json({
      status: 'healthy',
      ...result
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const bedrockLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many Bedrock requests, please try again later'
});

app.use('/api/generate', bedrockLimiter);
```

### Cost Monitoring

```javascript
class BedrockCostTracker {
  constructor() {
    this.usage = {
      inputTokens: 0,
      outputTokens: 0,
      requests: 0
    };
  }

  trackUsage(responseBody) {
    if (responseBody.usage) {
      this.usage.inputTokens += responseBody.usage.input_tokens || 0;
      this.usage.outputTokens += responseBody.usage.output_tokens || 0;
      this.usage.requests++;
    }
  }

  estimateCost() {
    // Claude Sonnet 4.5 pricing (example)
    const inputCostPer1K = 0.003;
    const outputCostPer1K = 0.015;

    const inputCost = (this.usage.inputTokens / 1000) * inputCostPer1K;
    const outputCost = (this.usage.outputTokens / 1000) * outputCostPer1K;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      requests: this.usage.requests
    };
  }
}
```

---

## Troubleshooting

### Debug Mode

```bash
# Enable verbose logging
export BEDROCK_DEBUG=true
npm run test:bedrock:verbose
```

### Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Slow responses | >10s latency | Use streaming, reduce max_tokens |
| High costs | Unexpected billing | Implement cost tracking, use Sonnet for simple tasks |
| Rate limiting | 429 errors | Implement exponential backoff |
| Invalid responses | Empty or malformed | Check prompt format, validate input |
| Authentication fails | 403 errors | Verify IAM permissions, check credentials |

### Testing Checklist

- [ ] Health check passes
- [ ] Basic invocation works
- [ ] Streaming works
- [ ] Retry logic tested
- [ ] Error handling verified
- [ ] Integration tests pass
- [ ] Load tested (if production)

---

## Examples

### Example 1: Code Generation

```javascript
const prompt = `
Write a TypeScript function that:
1. Accepts an array of numbers
2. Returns the median value
3. Handles empty arrays
4. Includes JSDoc comments
`;

const code = await generateCode(prompt);
```

### Example 2: Code Review

```javascript
const prompt = `
Review this code for:
- Security vulnerabilities
- Performance issues
- Best practice violations

\`\`\`javascript
${codeToReview}
\`\`\`

Provide specific recommendations.
`;

const review = await invokeModel(prompt, 'claude-3-opus');
```

### Example 3: Test Generation

```javascript
const prompt = `
Generate Jest unit tests for this function:

\`\`\`javascript
${functionCode}
\`\`\`

Include:
- Happy path tests
- Edge cases
- Error scenarios
`;

const tests = await generateCode(prompt);
```

---

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude Model Documentation](https://docs.anthropic.com/claude/)
- [Project GitHub Repository](https://github.com/primoscope/Spotify-echo)
- [Test Results Examples](../test-results/)

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Run health check: `npm run bedrock:health`
3. Review test results in `test-results/` directory
4. Open an issue on GitHub

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-15  
**Maintained By**: EchoTune AI Team
