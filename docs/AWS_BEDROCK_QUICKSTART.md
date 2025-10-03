# AWS Bedrock Quickstart Guide

**Get started with AWS Bedrock Claude models in 5 minutes**

## Prerequisites

- Node.js 18+ installed
- AWS account with Bedrock access
- AWS credentials (Access Key ID & Secret Access Key)

## Step 1: Install Dependencies

```bash
cd /path/to/Spotify-echo
npm install
```

The AWS Bedrock SDK is already included in `package.json`.

## Step 2: Configure AWS Credentials

Choose one option:

### Option A: Environment Variables (Recommended)

```bash
export AWS_ACCESS_KEY_ID="your_access_key_here"
export AWS_SECRET_ACCESS_KEY="your_secret_key_here"
export AWS_REGION="us-east-1"
```

### Option B: AWS CLI Configuration

```bash
aws configure
# Follow prompts to enter credentials
```

### Option C: Pass as Arguments

```bash
./scripts/test-aws-bedrock.sh YOUR_ACCESS_KEY YOUR_SECRET_KEY us-east-1
```

## Step 3: Enable Bedrock Models (One-Time Setup)

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Click **Model access** in the left sidebar
3. Click **Manage model access**
4. Select **Anthropic - Claude 3.5 Sonnet** and **Claude Opus**
5. Click **Request model access**
6. Wait for approval (usually instant)

## Step 4: Run Health Check

```bash
npm run bedrock:health
```

Expected output:
```
🏥 AWS Bedrock Health Check
════════════════════════════════════════════════════════════
1️⃣  Checking AWS Credentials...
   ✅ Credentials found
2️⃣  Loading Model Configuration...
   ✅ Configuration loaded (12 models)
3️⃣  Initializing AWS Bedrock Client...
   ✅ Client initialized
4️⃣  Testing Model Invocation...
   ✅ Model invocation successful
════════════════════════════════════════════════════════════
✅ Health Check PASSED - AWS Bedrock is operational
```

## Step 5: Run Your First Test

```bash
# Quick test (basic invocation only)
npm run test:bedrock:quick

# Full comprehensive test
npm run test:bedrock
```

## Step 6: Use the Model Manager

```bash
# Interactive model manager
npm run bedrock:manager

# Show current model status
npm run bedrock:status

# List available models
npm run bedrock:list
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run bedrock:health` | Quick health check |
| `npm run bedrock:manager` | Interactive model manager |
| `npm run bedrock:status` | Show current model |
| `npm run bedrock:list` | List available models |
| `npm run test:bedrock` | Run comprehensive tests |
| `npm run test:bedrock:quick` | Run quick tests |
| `npm run test:bedrock:integration` | Run integration tests |

## Basic Code Example

```javascript
const {
  BedrockRuntimeClient,
  InvokeModelCommand
} = require('@aws-sdk/client-bedrock-runtime');

// Initialize client
const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Invoke model
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
generateCode('Write a function to calculate factorial').then(console.log);
```

## Troubleshooting

### Issue: "AWS credentials not found"

**Solution**: Set environment variables or configure AWS CLI
```bash
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

### Issue: "Access Denied" (403 error)

**Solution**: Check IAM permissions. Required permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": "*"
}
```

### Issue: "Model not found" (404 error)

**Solution**: Enable model access in Bedrock console (see Step 3)

### Issue: Rate limiting (429 error)

**Solution**: The test harness includes automatic retry with exponential backoff. If persistent:
```bash
# Reduce test frequency
npm run test:bedrock:quick --max-retries 5
```

## Next Steps

- Read the [full Coding Guide](./AWS_BEDROCK_CODING_GUIDE.md)
- Check [Architecture Documentation](./AWS_BEDROCK_ARCHITECTURE.md)
- Review [test results](../test-results/) for examples
- Explore [integration tests](../scripts/aws-bedrock-integration-tests.js)

## Support

- **Health check fails?** Run with verbose mode: `npm run test:bedrock:verbose`
- **Need help?** Check [Troubleshooting Guide](./AWS_BEDROCK_CODING_GUIDE.md#troubleshooting)
- **Found a bug?** Open an issue on GitHub

---

**Ready to code?** You're all set! Start with `npm run bedrock:manager` to explore available models.
