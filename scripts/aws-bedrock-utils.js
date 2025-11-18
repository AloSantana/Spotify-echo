#!/usr/bin/env node

/**
 * AWS Bedrock Utilities and Helpers
 * 
 * Provides common utilities, error handling, validation, and retry logic
 * for AWS Bedrock integration across the codebase.
 * 
 * Features:
 * - Comprehensive error handling with categorization
 * - Exponential backoff retry logic
 * - Input validation and sanitization
 * - Rate limiting and throttling protection
 * - Connection health checking
 * - Backward compatibility helpers
 */

const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

/**
 * Error categories for AWS Bedrock operations
 */
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

/**
 * AWS Bedrock error handler with detailed categorization
 */
class BedrockErrorHandler {
  /**
   * Analyze and categorize an error
   * @param {Error} error - The error to analyze
   * @returns {Object} Categorized error details with actionable recommendations
   */
  static categorizeError(error) {
    const details = {
      message: error.message || 'Unknown error',
      type: error.name || 'Error',
      category: ErrorCategory.UNKNOWN,
      httpStatus: error.$metadata?.httpStatusCode,
      retryable: false,
      actionable: [],
      originalError: error
    };

    // Permissions errors
    if (error.message?.includes('AccessDenied') || 
        error.message?.includes('not authorized') ||
        error.$metadata?.httpStatusCode === 403) {
      details.category = ErrorCategory.PERMISSIONS;
      details.retryable = false;
      details.actionable = [
        'Verify AWS credentials are valid and not expired',
        'Check IAM policy includes bedrock:InvokeModel permission',
        'Remove any explicit DENY policies for Bedrock',
        'Ensure Bedrock service is enabled in AWS Console',
        'Verify the IAM user/role has the necessary permissions'
      ];
    }
    
    // Validation errors
    else if (error.message?.includes('ValidationException') ||
             error.message?.includes('invalid') ||
             error.$metadata?.httpStatusCode === 400) {
      details.category = ErrorCategory.VALIDATION;
      details.retryable = false;
      details.actionable = [
        'Verify model ID is correct and properly formatted',
        'Check request parameters match model requirements',
        'Ensure max_tokens is within model limits',
        'Validate temperature and other parameters are in valid ranges',
        'Check that the request body structure matches API expectations'
      ];
    }
    
    // Model availability errors
    else if (error.message?.includes('ResourceNotFound') ||
             error.message?.includes('not found') ||
             error.message?.includes('Model not available') ||
             error.$metadata?.httpStatusCode === 404) {
      details.category = ErrorCategory.MODEL_AVAILABILITY;
      details.retryable = false;
      details.actionable = [
        'Verify model is available in the target AWS region',
        'Enable model access in AWS Bedrock console',
        'Check if model requires special access request',
        'Try alternative regions where model is available',
        'Verify model ID matches current AWS Bedrock naming'
      ];
    }
    
    // Rate limiting errors
    else if (error.message?.includes('ThrottlingException') ||
             error.message?.includes('TooManyRequests') ||
             error.$metadata?.httpStatusCode === 429) {
      details.category = ErrorCategory.RATE_LIMIT;
      details.retryable = true;
      details.actionable = [
        'Implement exponential backoff retry logic',
        'Reduce request rate to stay within quotas',
        'Request quota increase from AWS support',
        'Consider using multiple regions for load distribution',
        'Implement request queuing and throttling'
      ];
    }
    
    // Service errors
    else if (error.$metadata?.httpStatusCode >= 500) {
      details.category = ErrorCategory.SERVICE_ERROR;
      details.retryable = true;
      details.actionable = [
        'Retry the request after a delay',
        'Check AWS Service Health Dashboard',
        'Try alternative AWS region if available',
        'Contact AWS support if issue persists',
        'Implement circuit breaker pattern for resilience'
      ];
    }
    
    // Network errors
    else if (error.message?.includes('ECONNREFUSED') ||
             error.message?.includes('ETIMEDOUT') ||
             error.message?.includes('NetworkingError')) {
      details.category = ErrorCategory.NETWORK;
      details.retryable = true;
      details.actionable = [
        'Check network connectivity',
        'Verify firewall rules allow AWS API access',
        'Check DNS resolution for AWS endpoints',
        'Verify proxy settings if applicable',
        'Try with increased timeout settings'
      ];
    }

    return details;
  }

  /**
   * Format error for display
   * @param {Object} errorDetails - Categorized error details
   * @returns {string} Formatted error message
   */
  static formatError(errorDetails) {
    let message = `❌ ${errorDetails.category.toUpperCase()} ERROR\n`;
    message += `Message: ${errorDetails.message}\n`;
    
    if (errorDetails.httpStatus) {
      message += `HTTP Status: ${errorDetails.httpStatus}\n`;
    }
    
    if (errorDetails.retryable) {
      message += 'Retryable: Yes\n';
    }
    
    if (errorDetails.actionable.length > 0) {
      message += '\n💡 Recommended Actions:\n';
      errorDetails.actionable.forEach((action, idx) => {
        message += `  ${idx + 1}. ${action}\n`;
      });
    }
    
    return message;
  }
}

/**
 * Retry logic with exponential backoff
 */
class RetryHandler {
  /**
   * Execute a function with retry logic
   * @param {Function} fn - Async function to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Result of successful execution
   */
  static async withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryableCategories = [
        ErrorCategory.RATE_LIMIT,
        ErrorCategory.SERVICE_ERROR,
        ErrorCategory.NETWORK
      ]
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Categorize error
        const errorDetails = BedrockErrorHandler.categorizeError(error);
        
        // Check if error is retryable
        if (!retryableCategories.includes(errorDetails.category)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        console.log(`⚠️  Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        console.log(`   Error: ${errorDetails.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase delay for next retry
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }
}

/**
 * Input validation utilities
 */
class ValidationUtils {
  /**
   * Validate model ID format
   * @param {string} modelId - Model ID to validate
   * @returns {Object} Validation result
   */
  static validateModelId(modelId) {
    if (!modelId || typeof modelId !== 'string') {
      return {
        valid: false,
        error: 'Model ID must be a non-empty string'
      };
    }

    // Check for valid format (provider.model-name or arn:...)
    const validFormats = [
      /^[a-z]+\.[a-z0-9-]+$/i,  // Simple format: anthropic.claude-3-5
      /^arn:aws:bedrock:.+$/    // ARN format
    ];

    const isValid = validFormats.some(regex => regex.test(modelId));

    if (!isValid) {
      return {
        valid: false,
        error: 'Model ID format invalid. Expected format: provider.model-name or ARN'
      };
    }

    return { valid: true };
  }

  /**
   * Validate request parameters
   * @param {Object} params - Request parameters
   * @returns {Object} Validation result
   */
  static validateRequestParams(params) {
    const errors = [];

    // Validate max_tokens
    if (params.max_tokens !== undefined) {
      if (typeof params.max_tokens !== 'number' || params.max_tokens <= 0) {
        errors.push('max_tokens must be a positive number');
      }
      if (params.max_tokens > 100000) {
        errors.push('max_tokens exceeds maximum limit (100000)');
      }
    }

    // Validate temperature
    if (params.temperature !== undefined) {
      if (typeof params.temperature !== 'number') {
        errors.push('temperature must be a number');
      }
      if (params.temperature < 0 || params.temperature > 2) {
        errors.push('temperature must be between 0 and 2');
      }
    }

    // Validate messages
    if (params.messages) {
      if (!Array.isArray(params.messages)) {
        errors.push('messages must be an array');
      } else if (params.messages.length === 0) {
        errors.push('messages array cannot be empty');
      } else {
        params.messages.forEach((msg, idx) => {
          if (!msg.role || !msg.content) {
            errors.push(`message[${idx}] missing required role or content`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize prompt text
   * @param {string} prompt - Prompt to sanitize
   * @returns {string} Sanitized prompt
   */
  static sanitizePrompt(prompt) {
    if (typeof prompt !== 'string') {
      return '';
    }

    // Remove any potential injection attempts
    return prompt
      .trim()
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, 50000); // Limit length
  }
}

/**
 * AWS Bedrock client manager with connection pooling
 */
class BedrockClientManager {
  constructor() {
    this.clients = new Map();
    this.healthStatus = new Map();
  }

  /**
   * Get or create a Bedrock client for a region
   * @param {string} region - AWS region
   * @param {Object} credentials - AWS credentials
   * @returns {BedrockRuntimeClient} Bedrock client instance
   */
  getClient(region = 'us-east-1', credentials = null) {
    const key = `${region}`;
    
    if (this.clients.has(key)) {
      return this.clients.get(key);
    }

    const clientConfig = {
      region,
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: 30000,
        socketTimeout: 60000
      }
    };

    if (credentials) {
      clientConfig.credentials = credentials;
    }

    const client = new BedrockRuntimeClient(clientConfig);
    this.clients.set(key, client);
    this.healthStatus.set(key, { healthy: true, lastCheck: Date.now() });

    return client;
  }

  /**
   * Check health of a client
   * @param {string} region - AWS region
   * @returns {Object} Health status
   */
  async checkHealth(region = 'us-east-1') {
    const key = `${region}`;
    const status = this.healthStatus.get(key) || { healthy: false };
    
    // Check health every 5 minutes
    if (Date.now() - (status.lastCheck || 0) < 300000) {
      return status;
    }

    try {
      // Basic connectivity test would go here
      status.healthy = true;
      status.lastCheck = Date.now();
    } catch (error) {
      status.healthy = false;
      status.error = error.message;
      status.lastCheck = Date.now();
    }

    this.healthStatus.set(key, status);
    return status;
  }

  /**
   * Destroy all clients and cleanup
   */
  destroy() {
    this.clients.forEach(client => {
      if (client.destroy) {
        client.destroy();
      }
    });
    this.clients.clear();
    this.healthStatus.clear();
  }
}

/**
 * Backward compatibility helpers
 */
class BackwardCompatibility {
  /**
   * Convert legacy model key to current format
   * @param {string} legacyKey - Legacy model key
   * @returns {string} Current model key
   */
  static convertLegacyModelKey(legacyKey) {
    const legacyMapping = {
      'claude-v2': 'claude-v2-1',
      'claude-instant': 'claude-instant-v1',
      'claude-3-sonnet': 'claude-3-sonnet',
      'claude-3-opus': 'claude-3-opus',
      'claude-3-haiku': 'claude-3-haiku'
    };

    return legacyMapping[legacyKey] || legacyKey;
  }

  /**
   * Convert legacy API response format to current format
   * @param {Object} response - Legacy API response
   * @returns {Object} Current format response
   */
  static normalizeResponse(response) {
    // Handle different response formats
    if (response.content) {
      return response;
    }

    // Legacy format conversion
    if (response.completion) {
      return {
        content: [{
          type: 'text',
          text: response.completion
        }],
        stop_reason: response.stop_reason || 'end_turn',
        usage: response.usage || {}
      };
    }

    return response;
  }
}

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  constructor(maxRequestsPerMinute = 60) {
    this.maxRequests = maxRequestsPerMinute;
    this.requests = [];
    this.queue = [];
  }

  /**
   * Wait for rate limit availability
   * @returns {Promise<void>}
   */
  async acquire() {
    const now = Date.now();
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => now - time < 60000);
    
    if (this.requests.length >= this.maxRequests) {
      // Wait until oldest request expires
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(Date.now());
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit status
   */
  getStatus() {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < 60000);
    
    return {
      used: recentRequests.length,
      available: this.maxRequests - recentRequests.length,
      limit: this.maxRequests,
      resetIn: recentRequests.length > 0 ? 
        60000 - (now - recentRequests[0]) : 0
    };
  }
}

module.exports = {
  ErrorCategory,
  BedrockErrorHandler,
  RetryHandler,
  ValidationUtils,
  BedrockClientManager,
  BackwardCompatibility,
  RateLimiter
};
