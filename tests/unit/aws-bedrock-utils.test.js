/**
 * Unit tests for AWS Bedrock utilities
 * Tests error handling, validation, retry logic, and other utilities
 */

const {
  ErrorCategory,
  BedrockErrorHandler,
  RetryHandler,
  ValidationUtils,
  BedrockClientManager,
  BackwardCompatibility,
  RateLimiter
} = require('../../scripts/aws-bedrock-utils');

describe('BedrockErrorHandler', () => {
  describe('categorizeError', () => {
    test('should categorize permission errors', () => {
      const error = new Error('AccessDenied: User is not authorized');
      error.$metadata = { httpStatusCode: 403 };
      
      const result = BedrockErrorHandler.categorizeError(error);
      
      expect(result.category).toBe(ErrorCategory.PERMISSIONS);
      expect(result.retryable).toBe(false);
      expect(result.actionable.length).toBeGreaterThan(0);
      expect(result.actionable[0]).toContain('credentials');
    });

    test('should categorize validation errors', () => {
      const error = new Error('ValidationException: Invalid parameter');
      error.$metadata = { httpStatusCode: 400 };
      
      const result = BedrockErrorHandler.categorizeError(error);
      
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.retryable).toBe(false);
      expect(result.actionable.length).toBeGreaterThan(0);
    });

    test('should categorize rate limit errors as retryable', () => {
      const error = new Error('ThrottlingException: Rate exceeded');
      error.$metadata = { httpStatusCode: 429 };
      
      const result = BedrockErrorHandler.categorizeError(error);
      
      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.retryable).toBe(true);
      expect(result.actionable[0]).toContain('backoff');
    });

    test('should categorize service errors as retryable', () => {
      const error = new Error('Internal server error');
      error.$metadata = { httpStatusCode: 500 };
      
      const result = BedrockErrorHandler.categorizeError(error);
      
      expect(result.category).toBe(ErrorCategory.SERVICE_ERROR);
      expect(result.retryable).toBe(true);
    });

    test('should categorize model not found errors', () => {
      const error = new Error('ResourceNotFound: Model not available');
      error.$metadata = { httpStatusCode: 404 };
      
      const result = BedrockErrorHandler.categorizeError(error);
      
      expect(result.category).toBe(ErrorCategory.MODEL_AVAILABILITY);
      expect(result.retryable).toBe(false);
      expect(result.actionable[0]).toContain('region');
    });

    test('should categorize network errors as retryable', () => {
      const error = new Error('NetworkingError: ECONNREFUSED');
      
      const result = BedrockErrorHandler.categorizeError(error);
      
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.retryable).toBe(true);
    });
  });

  describe('formatError', () => {
    test('should format error with all details', () => {
      const errorDetails = {
        category: ErrorCategory.PERMISSIONS,
        message: 'Access denied',
        httpStatus: 403,
        retryable: false,
        actionable: ['Check credentials', 'Verify IAM policy']
      };
      
      const formatted = BedrockErrorHandler.formatError(errorDetails);
      
      expect(formatted).toContain('PERMISSIONS ERROR');
      expect(formatted).toContain('Access denied');
      expect(formatted).toContain('HTTP Status: 403');
      expect(formatted).toContain('Check credentials');
      expect(formatted).toContain('Verify IAM policy');
    });
  });
});

describe('RetryHandler', () => {
  test('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await RetryHandler.withRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should retry on retryable errors', async () => {
    const error = new Error('ThrottlingException');
    error.$metadata = { httpStatusCode: 429 };
    
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const result = await RetryHandler.withRetry(fn, {
      maxRetries: 3,
      initialDelay: 10
    });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('should not retry on non-retryable errors', async () => {
    const error = new Error('AccessDenied');
    error.$metadata = { httpStatusCode: 403 };
    
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(
      RetryHandler.withRetry(fn, { maxRetries: 3, initialDelay: 10 })
    ).rejects.toThrow('AccessDenied');
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should throw after max retries', async () => {
    const error = new Error('ThrottlingException');
    error.$metadata = { httpStatusCode: 429 };
    
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(
      RetryHandler.withRetry(fn, { maxRetries: 2, initialDelay: 10 })
    ).rejects.toThrow('ThrottlingException');
    
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

describe('ValidationUtils', () => {
  describe('validateModelId', () => {
    test('should validate correct model ID format', () => {
      expect(ValidationUtils.validateModelId('anthropic.claude-3-5-sonnet')).toEqual({
        valid: true
      });
      
      expect(ValidationUtils.validateModelId('amazon.titan-text-express-v1')).toEqual({
        valid: true
      });
    });

    test('should validate ARN format', () => {
      expect(ValidationUtils.validateModelId(
        'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3'
      )).toEqual({
        valid: true
      });
    });

    test('should reject invalid model IDs', () => {
      expect(ValidationUtils.validateModelId('').valid).toBe(false);
      expect(ValidationUtils.validateModelId(null).valid).toBe(false);
      expect(ValidationUtils.validateModelId('invalid@model').valid).toBe(false);
    });
  });

  describe('validateRequestParams', () => {
    test('should validate correct parameters', () => {
      const params = {
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };
      
      const result = ValidationUtils.validateRequestParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should reject invalid max_tokens', () => {
      expect(ValidationUtils.validateRequestParams({ max_tokens: -1 }).valid).toBe(false);
      expect(ValidationUtils.validateRequestParams({ max_tokens: 'invalid' }).valid).toBe(false);
      expect(ValidationUtils.validateRequestParams({ max_tokens: 200000 }).valid).toBe(false);
    });

    test('should reject invalid temperature', () => {
      expect(ValidationUtils.validateRequestParams({ temperature: -1 }).valid).toBe(false);
      expect(ValidationUtils.validateRequestParams({ temperature: 3 }).valid).toBe(false);
      expect(ValidationUtils.validateRequestParams({ temperature: 'hot' }).valid).toBe(false);
    });

    test('should reject invalid messages', () => {
      expect(ValidationUtils.validateRequestParams({ messages: 'invalid' }).valid).toBe(false);
      expect(ValidationUtils.validateRequestParams({ messages: [] }).valid).toBe(false);
      expect(ValidationUtils.validateRequestParams({ 
        messages: [{ role: 'user' }] // Missing content
      }).valid).toBe(false);
    });
  });

  describe('sanitizePrompt', () => {
    test('should trim and clean prompt', () => {
      expect(ValidationUtils.sanitizePrompt('  test  ')).toBe('test');
      expect(ValidationUtils.sanitizePrompt('test\x00bad')).toBe('testbad');
    });

    test('should limit prompt length', () => {
      const longPrompt = 'a'.repeat(60000);
      const sanitized = ValidationUtils.sanitizePrompt(longPrompt);
      expect(sanitized.length).toBeLessThanOrEqual(50000);
    });

    test('should handle non-string input', () => {
      expect(ValidationUtils.sanitizePrompt(null)).toBe('');
      expect(ValidationUtils.sanitizePrompt(123)).toBe('');
    });
  });
});

describe('BedrockClientManager', () => {
  let manager;

  beforeEach(() => {
    manager = new BedrockClientManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  test('should create and cache clients', () => {
    const client1 = manager.getClient('us-east-1');
    const client2 = manager.getClient('us-east-1');
    
    expect(client1).toBe(client2); // Same instance
  });

  test('should create different clients for different regions', () => {
    const client1 = manager.getClient('us-east-1');
    const client2 = manager.getClient('us-west-2');
    
    expect(client1).not.toBe(client2);
  });

  test('should track health status', async () => {
    manager.getClient('us-east-1');
    const health = await manager.checkHealth('us-east-1');
    
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('lastCheck');
  });
});

describe('BackwardCompatibility', () => {
  test('should convert legacy model keys', () => {
    expect(BackwardCompatibility.convertLegacyModelKey('claude-v2'))
      .toBe('claude-v2-1');
    expect(BackwardCompatibility.convertLegacyModelKey('claude-instant'))
      .toBe('claude-instant-v1');
    expect(BackwardCompatibility.convertLegacyModelKey('claude-3-sonnet'))
      .toBe('claude-3-sonnet');
  });

  test('should normalize legacy response format', () => {
    const legacyResponse = {
      completion: 'test response',
      stop_reason: 'end_turn'
    };
    
    const normalized = BackwardCompatibility.normalizeResponse(legacyResponse);
    
    expect(normalized).toHaveProperty('content');
    expect(normalized.content[0].text).toBe('test response');
    expect(normalized.stop_reason).toBe('end_turn');
  });

  test('should pass through modern format', () => {
    const modernResponse = {
      content: [{ type: 'text', text: 'test' }],
      stop_reason: 'end_turn'
    };
    
    const normalized = BackwardCompatibility.normalizeResponse(modernResponse);
    
    expect(normalized).toEqual(modernResponse);
  });
});

describe('RateLimiter', () => {
  test('should allow requests within limit', async () => {
    const limiter = new RateLimiter(5);
    
    // Should not throw
    await limiter.acquire();
    await limiter.acquire();
    
    const status = limiter.getStatus();
    expect(status.used).toBe(2);
    expect(status.available).toBe(3);
  });

  test('should track rate limit status', async () => {
    const limiter = new RateLimiter(10);
    
    await limiter.acquire();
    await limiter.acquire();
    
    const status = limiter.getStatus();
    
    expect(status.limit).toBe(10);
    expect(status.used).toBe(2);
    expect(status.available).toBe(8);
  });

  test('should reset after time window', async () => {
    const limiter = new RateLimiter(2);
    
    await limiter.acquire();
    await limiter.acquire();
    
    // Simulate time passing by manipulating requests array
    limiter.requests = [Date.now() - 61000]; // Older than 1 minute
    
    const status = limiter.getStatus();
    expect(status.used).toBe(0);
    expect(status.available).toBe(2);
  });
});
