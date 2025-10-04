# AWS Bedrock Integration - API Reference

Complete reference documentation for all classes, methods, and utilities in the AWS Bedrock integration.

## Table of Contents

- [Utility Classes](#utility-classes)
- [Monitoring Classes](#monitoring-classes)
- [Integration Classes](#integration-classes)
- [Constants](#constants)
- [Examples](#examples)

## Utility Classes

Located in `scripts/aws-bedrock-utils.js`

### BedrockErrorHandler

Handles and categorizes AWS Bedrock errors with actionable recommendations.

#### Methods

##### `categorizeError(error)`

Analyzes an error and returns categorized information with remediation steps.

**Parameters:**
- `error` (Error): The error object to categorize

**Returns:** Object with:
- `message` (string): Error message
- `type` (string): Error type
- `category` (string): Error category from ErrorCategory enum
- `httpStatus` (number): HTTP status code if available
- `retryable` (boolean): Whether the error is retryable
- `actionable` (Array<string>): List of remediation actions
- `originalError` (Error): Original error object

**Example:**
```javascript
const { BedrockErrorHandler } = require('./scripts/aws-bedrock-utils');

try {
  await invokeModel(params);
} catch (error) {
  const details = BedrockErrorHandler.categorizeError(error);
  console.log(`Category: ${details.category}`);
  console.log(`Retryable: ${details.retryable}`);
  details.actionable.forEach(action => console.log(`- ${action}`));
}
```

##### `formatError(errorDetails)`

Formats error details for human-readable display.

**Parameters:**
- `errorDetails` (Object): Categorized error details from categorizeError()

**Returns:** String with formatted error message

**Example:**
```javascript
const details = BedrockErrorHandler.categorizeError(error);
const formatted = BedrockErrorHandler.formatError(details);
console.error(formatted);
```

### RetryHandler

Implements exponential backoff retry logic for transient failures.

#### Methods

##### `withRetry(fn, options)`

Executes a function with automatic retry on retryable errors.

**Parameters:**
- `fn` (Function): Async function to execute
- `options` (Object): Retry configuration
  - `maxRetries` (number): Maximum retry attempts (default: 3)
  - `initialDelay` (number): Initial delay in ms (default: 1000)
  - `maxDelay` (number): Maximum delay in ms (default: 10000)
  - `backoffMultiplier` (number): Delay multiplier (default: 2)
  - `retryableCategories` (Array<string>): Error categories to retry

**Returns:** Promise resolving to function result

**Example:**
```javascript
const { RetryHandler } = require('./scripts/aws-bedrock-utils');

const result = await RetryHandler.withRetry(
  async () => {
    return await invokeModel(params);
  },
  {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000
  }
);
```

### ValidationUtils

Input validation and sanitization utilities.

#### Methods

##### `validateModelId(modelId)`

Validates AWS Bedrock model ID format.

**Parameters:**
- `modelId` (string): Model ID to validate

**Returns:** Object with:
- `valid` (boolean): Whether model ID is valid
- `error` (string): Error message if invalid

**Example:**
```javascript
const { ValidationUtils } = require('./scripts/aws-bedrock-utils');

const result = ValidationUtils.validateModelId('anthropic.claude-3-5-sonnet');
if (!result.valid) {
  console.error(result.error);
}
```

##### `validateRequestParams(params)`

Validates request parameters.

**Parameters:**
- `params` (Object): Request parameters to validate

**Returns:** Object with:
- `valid` (boolean): Whether parameters are valid
- `errors` (Array<string>): List of validation errors

**Example:**
```javascript
const validation = ValidationUtils.validateRequestParams({
  max_tokens: 1000,
  temperature: 0.7,
  messages: [{ role: 'user', content: 'Hello' }]
});

if (!validation.valid) {
  validation.errors.forEach(err => console.error(err));
}
```

##### `sanitizePrompt(prompt)`

Sanitizes user input prompt.

**Parameters:**
- `prompt` (string): Prompt text to sanitize

**Returns:** String with sanitized prompt

**Example:**
```javascript
const userInput = "  test\x00prompt  ";
const sanitized = ValidationUtils.sanitizePrompt(userInput);
// Returns: "testprompt"
```

### BedrockClientManager

Manages AWS Bedrock client instances with connection pooling.

#### Methods

##### `getClient(region, credentials)`

Gets or creates a Bedrock client for a region.

**Parameters:**
- `region` (string): AWS region (default: 'us-east-1')
- `credentials` (Object): AWS credentials (optional)

**Returns:** BedrockRuntimeClient instance

**Example:**
```javascript
const { BedrockClientManager } = require('./scripts/aws-bedrock-utils');

const manager = new BedrockClientManager();
const client = manager.getClient('us-east-1', {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
```

##### `checkHealth(region)`

Checks health status of a client.

**Parameters:**
- `region` (string): AWS region

**Returns:** Promise resolving to health status object

##### `destroy()`

Destroys all clients and cleans up resources.

### BackwardCompatibility

Helpers for legacy code support.

#### Methods

##### `convertLegacyModelKey(legacyKey)`

Converts legacy model keys to current format.

**Parameters:**
- `legacyKey` (string): Legacy model key

**Returns:** String with current model key

**Example:**
```javascript
const { BackwardCompatibility } = require('./scripts/aws-bedrock-utils');

const currentKey = BackwardCompatibility.convertLegacyModelKey('claude-v2');
// Returns: 'claude-v2-1'
```

##### `normalizeResponse(response)`

Normalizes API response format.

**Parameters:**
- `response` (Object): API response

**Returns:** Normalized response object

### RateLimiter

Implements rate limiting for API requests.

#### Constructor

```javascript
new RateLimiter(maxRequestsPerMinute)
```

**Parameters:**
- `maxRequestsPerMinute` (number): Maximum requests per minute (default: 60)

#### Methods

##### `acquire()`

Waits for rate limit availability before proceeding.

**Returns:** Promise that resolves when request can proceed

**Example:**
```javascript
const { RateLimiter } = require('./scripts/aws-bedrock-utils');

const limiter = new RateLimiter(60);

await limiter.acquire();
const response = await invokeModel(params);
```

##### `getStatus()`

Gets current rate limit status.

**Returns:** Object with:
- `used` (number): Requests used in current window
- `available` (number): Requests available
- `limit` (number): Total limit
- `resetIn` (number): Milliseconds until reset

## Monitoring Classes

Located in `scripts/aws-bedrock-monitor.js`

### BedrockLogger

Structured logger for AWS Bedrock operations.

#### Constructor

```javascript
new BedrockLogger(options)
```

**Options:**
- `level` (string): Log level (default: 'info')
- `outputFile` (string): File path for logs (optional)
- `console` (boolean): Enable console output (default: true)
- `structured` (boolean): Use structured JSON format (default: true)

#### Methods

##### `debug(message, metadata)`, `info()`, `warn()`, `error()`, `fatal()`

Log messages at different severity levels.

**Example:**
```javascript
const { BedrockLogger } = require('./scripts/aws-bedrock-monitor');

const logger = new BedrockLogger({
  level: 'info',
  outputFile: '/var/log/bedrock.log'
});

await logger.info('Model invoked', {
  model_id: 'claude-sonnet-4-5',
  latency_ms: 1234
});
```

### MetricsTracker

Tracks performance metrics.

#### Methods

##### `recordRequest(modelId, latency, tokens)`

Records a successful request.

**Parameters:**
- `modelId` (string): Model identifier
- `latency` (number): Request latency in milliseconds
- `tokens` (Object): Token counts
  - `input` (number): Input tokens
  - `output` (number): Output tokens

##### `recordError(modelId, errorCategory)`

Records a failed request.

##### `getMetrics()`

Gets current metrics summary.

**Returns:** Object with comprehensive metrics including:
- Request counts
- Latency statistics (avg, min, max, p50, p95, p99)
- Token usage
- Error rates

**Example:**
```javascript
const { MetricsTracker } = require('./scripts/aws-bedrock-monitor');

const metrics = new MetricsTracker();

metrics.recordRequest('claude-sonnet-4-5', 1234, {
  input: 100,
  output: 200
});

const summary = metrics.getMetrics();
console.log(`Average latency: ${summary.latency.avg}ms`);
console.log(`Error rate: ${summary.errorRate}%`);
```

### CostTracker

Tracks AWS Bedrock usage costs.

#### Constructor

```javascript
new CostTracker(pricingConfig)
```

**Parameters:**
- `pricingConfig` (Object): Custom pricing per 1K tokens (optional)

#### Methods

##### `calculateCost(modelKey, inputTokens, outputTokens)`

Calculates cost for a request.

##### `recordCost(modelKey, inputTokens, outputTokens)`

Records cost for a request.

##### `getCosts()`

Gets cost summary.

**Example:**
```javascript
const { CostTracker } = require('./scripts/aws-bedrock-monitor');

const costTracker = new CostTracker();

const cost = costTracker.recordCost('claude-sonnet-4-5', 100, 200);
console.log(`Request cost: $${cost.toFixed(4)}`);

const summary = costTracker.getCosts();
console.log(`Total cost: $${summary.total}`);
```

### HealthMonitor

Monitors system health.

#### Methods

##### `addCheck(name, checkFn)`

Adds a health check function.

##### `runChecks()`

Runs all health checks.

**Example:**
```javascript
const { HealthMonitor } = require('./scripts/aws-bedrock-monitor');

const monitor = new HealthMonitor();

monitor.addCheck('database', async () => {
  // Check database connection
  return { healthy: true, message: 'Connected' };
});

const results = await monitor.runChecks();
console.log(`System healthy: ${results.healthy}`);
```

### AlertManager

Manages monitoring alerts.

#### Methods

##### `setThreshold(metric, value)`

Sets alert threshold.

##### `checkMetrics(metrics)`

Checks metrics against thresholds.

##### `getAlerts(severity)`

Gets current alerts.

### BedrockMonitor

Unified monitoring facade combining all monitoring features.

#### Methods

##### `recordSuccess(modelId, latency, tokens)`

Records successful API call.

##### `recordFailure(modelId, errorCategory, errorMessage)`

Records failed API call.

##### `generateReport()`

Generates comprehensive monitoring report.

##### `saveReport(outputPath)`

Saves report to file.

**Example:**
```javascript
const { BedrockMonitor } = require('./scripts/aws-bedrock-monitor');

const monitor = new BedrockMonitor({
  logging: { level: 'info' }
});

await monitor.recordSuccess('claude-sonnet-4-5', 1234, {
  input: 100,
  output: 200
});

const report = await monitor.generateReport();
console.log(JSON.stringify(report, null, 2));
```

## Integration Classes

Located in `scripts/aws-bedrock-copilot-integration.js`

### BedrockCopilotIntegration

Manages Copilot session with model tracking.

#### Constructor

```javascript
new BedrockCopilotIntegration(options)
```

**Options:**
- `configPath` (string): Path to model configuration

#### Methods

##### `initialize()`

Initializes the integration.

##### `handleSlashCommand(command, args)`

Handles slash commands like `/use` and `/model`.

##### `switchModel(args)`

Switches to a different model.

##### `trackInteraction(tokenUsage)`

Tracks an interaction with token usage.

##### `getSessionSummary()`

Gets session summary.

**Example:**
```javascript
const BedrockCopilotIntegration = require('./scripts/aws-bedrock-copilot-integration');

const integration = new BedrockCopilotIntegration();
await integration.initialize();

integration.displaySessionHeader();

await integration.handleSlashCommand('/use claude-3-opus');

integration.trackInteraction({ total: 300 });

const summary = integration.getSessionSummary();
console.log(`Interactions: ${summary.interactions}`);
```

## Constants

### ErrorCategory

Error classification constants:

```javascript
const ErrorCategory = {
  PERMISSIONS: 'permissions',
  VALIDATION: 'validation',
  MODEL_AVAILABILITY: 'model_availability',
  RATE_LIMIT: 'rate_limit',
  SERVICE_ERROR: 'service_error',
  NETWORK: 'network',
  CONFIGURATION: 'configuration',
  UNKNOWN: 'unknown'
};
```

### LogLevel

Logging severity levels:

```javascript
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};
```

## Examples

### Complete Usage Example

```javascript
const {
  BedrockErrorHandler,
  RetryHandler,
  ValidationUtils,
  BedrockClientManager,
  RateLimiter
} = require('./scripts/aws-bedrock-utils');

const { BedrockMonitor } = require('./scripts/aws-bedrock-monitor');

// Initialize components
const clientManager = new BedrockClientManager();
const rateLimiter = new RateLimiter(60);
const monitor = new BedrockMonitor();

async function invokeModelSafely(modelId, prompt) {
  // Validate inputs
  const modelValidation = ValidationUtils.validateModelId(modelId);
  if (!modelValidation.valid) {
    throw new Error(modelValidation.error);
  }

  const sanitizedPrompt = ValidationUtils.sanitizePrompt(prompt);

  // Apply rate limiting
  await rateLimiter.acquire();

  // Get client
  const client = clientManager.getClient('us-east-1');

  const startTime = Date.now();

  try {
    // Execute with retry
    const response = await RetryHandler.withRetry(
      async () => {
        // Your actual API call here
        return await client.invokeModel({
          modelId,
          body: JSON.stringify({
            prompt: sanitizedPrompt,
            max_tokens: 1000
          })
        });
      },
      {
        maxRetries: 3,
        initialDelay: 1000
      }
    );

    const latency = Date.now() - startTime;

    // Record success
    await monitor.recordSuccess(modelId, latency, {
      input: 100,
      output: 200
    });

    return response;
  } catch (error) {
    // Categorize and handle error
    const errorDetails = BedrockErrorHandler.categorizeError(error);
    console.error(BedrockErrorHandler.formatError(errorDetails));

    // Record failure
    await monitor.recordFailure(
      modelId,
      errorDetails.category,
      errorDetails.message
    );

    throw error;
  }
}

// Generate report
const report = await monitor.generateReport();
console.log(JSON.stringify(report, null, 2));
```

## Related Documentation

- [Production Guide](./AWS_BEDROCK_PRODUCTION_GUIDE.md)
- [Troubleshooting Guide](./AWS_BEDROCK_TROUBLESHOOTING.md)
- [Known Issues](./AWS_BEDROCK_KNOWN_ISSUES.md)
- [Test Guide](./AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md)
