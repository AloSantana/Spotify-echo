# AWS Bedrock Integration - Troubleshooting Guide

This guide provides solutions to common issues encountered when using the AWS Bedrock integration.

## Quick Diagnosis

Run the diagnostic script to identify common issues:

```bash
npm run bedrock:status
node scripts/validate-bedrock-test-harness.js
```

## Common Error Categories

### 1. Permission Errors (403 Forbidden)

**Symptoms:**
- `AccessDenied` errors
- `User is not authorized` messages
- HTTP 403 status codes

**Root Causes:**
- IAM policy missing required permissions
- Explicit DENY policy blocking access
- Bedrock service not enabled
- Model not enabled in console

**Solutions:**

1. **Verify IAM Permissions**
   ```bash
   # Check current user/role
   aws sts get-caller-identity
   
   # List attached policies
   aws iam list-attached-user-policies --user-name YOUR_USERNAME
   ```

2. **Add Required Permissions**
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

3. **Check for DENY Policies**
   - Review all policies attached to user/role
   - Check Service Control Policies (SCPs) if using AWS Organizations
   - Look for explicit DENY statements

4. **Enable Models in Console**
   - Go to AWS Bedrock console
   - Navigate to "Model access"
   - Request access to required models
   - Wait for approval (usually instant for most models)

### 2. Model Not Found Errors (404)

**Symptoms:**
- `ResourceNotFound` errors
- `Model not available` messages
- HTTP 404 status codes

**Root Causes:**
- Model not available in selected region
- Model ID incorrect or outdated
- Model not enabled in account
- Model requires special access request

**Solutions:**

1. **Verify Model Availability**
   ```bash
   # List available models in region
   aws bedrock list-foundation-models --region us-east-1
   ```

2. **Check Model ID**
   ```javascript
   // Correct format
   anthropic.claude-3-5-sonnet-20241022-v2:0
   
   // Common mistakes
   claude-3-5-sonnet  // Missing provider and version
   anthropic.claude-3-5-sonnet  // Missing version
   ```

3. **Try Alternative Region**
   ```bash
   # Test in different region
   AWS_REGION=us-west-2 npm run test:bedrock
   ```

4. **Request Model Access**
   - Some models require explicit access request
   - Go to AWS Bedrock console → Model access
   - Submit access request form
   - Check email for approval (can take 1-2 business days)

### 3. Rate Limiting Errors (429)

**Symptoms:**
- `ThrottlingException` errors
- `TooManyRequests` messages
- HTTP 429 status codes

**Root Causes:**
- Exceeding model-specific rate limits
- Burst traffic patterns
- Insufficient quota for account
- Multiple applications sharing quota

**Solutions:**

1. **Implement Exponential Backoff**
   ```javascript
   const { RetryHandler } = require('./scripts/aws-bedrock-utils');
   
   const result = await RetryHandler.withRetry(async () => {
     return await invokeModel(params);
   }, {
     maxRetries: 5,
     initialDelay: 1000,
     maxDelay: 30000
   });
   ```

2. **Add Rate Limiting**
   ```javascript
   const { RateLimiter } = require('./scripts/aws-bedrock-utils');
   
   const limiter = new RateLimiter(60); // 60 requests/minute
   await limiter.acquire();
   ```

3. **Request Quota Increase**
   - Go to AWS Service Quotas console
   - Search for "Bedrock"
   - Request quota increase for specific models
   - Provide justification and expected usage

4. **Distribute Load**
   - Use multiple AWS regions
   - Implement request queuing
   - Cache responses where appropriate
   - Use different models for different tasks

### 4. Validation Errors (400)

**Symptoms:**
- `ValidationException` errors
- `Invalid parameter` messages
- HTTP 400 status codes

**Root Causes:**
- Invalid request parameters
- max_tokens exceeds model limit
- temperature out of valid range
- Malformed request body

**Solutions:**

1. **Validate Input Parameters**
   ```javascript
   const { ValidationUtils } = require('./scripts/aws-bedrock-utils');
   
   const modelValidation = ValidationUtils.validateModelId(modelId);
   if (!modelValidation.valid) {
     console.error(modelValidation.error);
   }
   
   const paramsValidation = ValidationUtils.validateRequestParams(params);
   if (!paramsValidation.valid) {
     console.error(paramsValidation.errors);
   }
   ```

2. **Check Parameter Limits**
   ```javascript
   // Model-specific limits
   const limits = {
     'claude-3-5-sonnet-v2': {
       maxTokens: 8192,
       contextWindow: 200000
     },
     'claude-sonnet-4-5': {
       maxTokens: 4096,
       contextWindow: 200000
     }
   };
   ```

3. **Sanitize Input**
   ```javascript
   const sanitized = ValidationUtils.sanitizePrompt(userInput);
   ```

### 5. Network Errors

**Symptoms:**
- `ECONNREFUSED` errors
- `ETIMEDOUT` errors
- `NetworkingError` messages

**Root Causes:**
- Network connectivity issues
- Firewall blocking AWS endpoints
- DNS resolution problems
- Proxy configuration issues

**Solutions:**

1. **Check Network Connectivity**
   ```bash
   # Test AWS endpoint connectivity
   curl -I https://bedrock-runtime.us-east-1.amazonaws.com
   
   # Check DNS resolution
   nslookup bedrock-runtime.us-east-1.amazonaws.com
   ```

2. **Verify Firewall Rules**
   - Allow outbound HTTPS (443) to AWS endpoints
   - Whitelist AWS Bedrock service endpoints
   - Check corporate proxy settings

3. **Configure Proxy**
   ```bash
   # Set proxy environment variables
   export HTTPS_PROXY=http://proxy.example.com:8080
   export NO_PROXY=169.254.169.254  # Exclude EC2 metadata
   ```

4. **Increase Timeouts**
   ```javascript
   const client = new BedrockRuntimeClient({
     region: 'us-east-1',
     requestHandler: {
       connectionTimeout: 60000,  // 60 seconds
       socketTimeout: 120000      // 120 seconds
     }
   });
   ```

### 6. Service Errors (500)

**Symptoms:**
- HTTP 500, 502, 503 errors
- `InternalServerError` messages
- Intermittent failures

**Root Causes:**
- AWS service issues
- Regional outages
- Model-specific problems
- Temporary infrastructure issues

**Solutions:**

1. **Check AWS Service Health**
   - Visit [AWS Service Health Dashboard](https://status.aws.amazon.com/)
   - Check for Bedrock-specific incidents
   - Review regional status

2. **Implement Retry Logic**
   ```javascript
   // Service errors are retryable
   const result = await RetryHandler.withRetry(fn, {
     maxRetries: 3,
     initialDelay: 2000
   });
   ```

3. **Try Alternative Region**
   ```javascript
   const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];
   
   for (const region of regions) {
     try {
       return await invokeModel(params, region);
     } catch (error) {
       console.log(`Failed in ${region}, trying next...`);
     }
   }
   ```

4. **Contact AWS Support**
   - Open support ticket if issue persists
   - Provide request IDs and timestamps
   - Include error messages and stack traces

## Configuration Issues

### Environment Variables Not Set

**Problem:** Missing AWS credentials or configuration

**Solution:**
```bash
# Check current environment
node -e "console.log(process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set')"

# Set environment variables
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_REGION="us-east-1"

# Or use .env file
cp .env.example .env
# Edit .env with your credentials
```

### Configuration File Issues

**Problem:** Invalid or missing configuration file

**Solution:**
```bash
# Validate configuration
node scripts/validate-bedrock-test-harness.js

# Check file exists
ls -l config/aws-bedrock-models.json

# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('config/aws-bedrock-models.json'))"
```

### Model Key Mismatch

**Problem:** Configuration uses different model keys than expected

**Solution:**
```javascript
// Use backward compatibility helper
const { BackwardCompatibility } = require('./scripts/aws-bedrock-utils');

const currentKey = BackwardCompatibility.convertLegacyModelKey(legacyKey);
```

## Testing Issues

### Tests Fail Without Credentials

**Problem:** Tests require actual AWS credentials

**Solution:**
```bash
# Run tests with mock credentials
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test npm test

# Or skip integration tests
npm run test:unit
```

### Test Timeouts

**Problem:** Tests timeout due to slow responses

**Solution:**
```bash
# Increase test timeout
JEST_TIMEOUT=30000 npm test

# Or skip slow tests
npm test -- --testPathIgnorePatterns=integration
```

## Performance Issues

### High Latency

**Problem:** Requests take too long to complete

**Diagnosis:**
```javascript
// Add timing metrics
const startTime = Date.now();
const response = await invokeModel(params);
const latency = Date.now() - startTime;
console.log(`Latency: ${latency}ms`);
```

**Solutions:**
1. Use streaming for long responses
2. Choose faster models (e.g., Claude Haiku)
3. Reduce max_tokens if possible
4. Use closer AWS region
5. Check network connectivity

### High Token Usage

**Problem:** Excessive token consumption and costs

**Solutions:**
1. **Optimize Prompts**
   - Remove unnecessary context
   - Use more concise instructions
   - Implement prompt caching

2. **Track Usage**
   ```javascript
   integration.trackInteraction({
     total: response.usage.input_tokens + response.usage.output_tokens
   });
   
   const summary = integration.getSessionSummary();
   console.log(`Total tokens: ${summary.totalTokens}`);
   ```

3. **Set Token Limits**
   ```javascript
   const params = {
     max_tokens: 1000,  // Limit output
     // ...
   };
   ```

## Debugging Tips

### Enable Verbose Logging

```bash
# Verbose output
npm run test:bedrock:verbose

# Debug mode
DEBUG=bedrock:* npm run test:bedrock
```

### Capture Request/Response

```javascript
// Log full request
console.log('Request:', JSON.stringify(params, null, 2));

// Log full response
console.log('Response:', JSON.stringify(response, null, 2));
```

### Test Individual Models

```bash
# Test specific model only
npm run test:bedrock -- --models claude-sonnet-4-5

# Skip streaming and variations for faster testing
npm run test:bedrock:quick
```

### Check Client Health

```javascript
const { BedrockClientManager } = require('./scripts/aws-bedrock-utils');

const manager = new BedrockClientManager();
const health = await manager.checkHealth('us-east-1');
console.log('Client health:', health);
```

## Getting Additional Help

### Information to Provide

When seeking help, include:

1. **Error Messages**
   - Full error message and stack trace
   - HTTP status codes
   - Request IDs if available

2. **Environment Details**
   - Node.js version: `node --version`
   - AWS SDK version: `npm list @aws-sdk/client-bedrock-runtime`
   - Operating system
   - AWS region

3. **Configuration**
   - Model IDs being used
   - Request parameters (sanitized)
   - Environment variables (without sensitive data)

4. **Steps to Reproduce**
   - Minimal code to reproduce issue
   - Expected vs actual behavior
   - Frequency of occurrence

### Support Channels

1. **Internal Documentation**
   - [Production Guide](./AWS_BEDROCK_PRODUCTION_GUIDE.md)
   - [Comprehensive Test Guide](./AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md)
   - [Copilot Integration Guide](./AWS_BEDROCK_COPILOT_INTEGRATION.md)

2. **AWS Support**
   - [AWS Support Center](https://console.aws.amazon.com/support/)
   - [Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
   - [AWS Forums](https://forums.aws.amazon.com/)

3. **Project Resources**
   - GitHub Issues for bug reports
   - Project documentation
   - Team communication channels

## Preventive Measures

To avoid common issues:

1. ✅ Always validate input parameters
2. ✅ Implement comprehensive error handling
3. ✅ Use retry logic with exponential backoff
4. ✅ Monitor usage and set up alerts
5. ✅ Test in staging before production
6. ✅ Keep credentials secure
7. ✅ Document configuration changes
8. ✅ Review AWS Service Health regularly
9. ✅ Maintain up-to-date dependencies
10. ✅ Train team on proper usage
