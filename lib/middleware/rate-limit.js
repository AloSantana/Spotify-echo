/**
 * Rate Limiting Middleware for Spotify API
 * 
 * Features:
 * - Per-endpoint rate limit tracking using NodeCache
 * - Exponential backoff with configurable base delay
 * - Respect Retry-After headers from Spotify API
 * - Request queuing to prevent burst violations
 * - Comprehensive logging for debugging
 */

const NodeCache = require('node-cache');
const logger = require('../logger');
const config = require('../config');
const { ERROR_CODES, createErrorResponse } = require('../shared/api-contracts');

/**
 * Rate limit tracker
 * - stdTTL: 60 seconds (rate limit window)
 * - checkperiod: 10 seconds (cleanup interval)
 */
const rateLimitCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 10,
  useClones: false
});

/**
 * Queue for pending requests per endpoint
 */
const requestQueues = new Map();

/**
 * Rate limit configuration per endpoint type
 * Based on Spotify API documentation
 */
const RATE_LIMITS = {
  default: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    minDelayMs: 100
  },
  search: {
    maxRequests: 50,
    windowMs: 60000,
    minDelayMs: 200
  },
  playlist: {
    maxRequests: 30,
    windowMs: 60000,
    minDelayMs: 300
  },
  user: {
    maxRequests: 50,
    windowMs: 60000,
    minDelayMs: 200
  }
};

/**
 * Get rate limit key for cache
 */
function getRateLimitKey(userId, endpoint) {
  const endpointType = getEndpointType(endpoint);
  return `ratelimit:${userId}:${endpointType}`;
}

/**
 * Determine endpoint type from URL
 */
function getEndpointType(endpoint) {
  if (!endpoint) return 'default';
  
  if (endpoint.includes('/search')) return 'search';
  if (endpoint.includes('/playlist')) return 'playlist';
  if (endpoint.includes('/me') || endpoint.includes('/users')) return 'user';
  
  return 'default';
}

/**
 * Get rate limit configuration for endpoint
 */
function getRateLimitConfig(endpoint) {
  const endpointType = getEndpointType(endpoint);
  return RATE_LIMITS[endpointType] || RATE_LIMITS.default;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attemptNumber) {
  const baseMs = config.rateLimit.backoffBaseMs || 1000;
  const maxMs = 30000; // Maximum 30 seconds
  const delay = Math.min(baseMs * Math.pow(2, attemptNumber), maxMs);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Check if request should be rate limited
 */
function shouldRateLimit(userId, endpoint) {
  const key = getRateLimitKey(userId, endpoint);
  const rateLimitConfig = getRateLimitConfig(endpoint);
  
  let requestCount = rateLimitCache.get(key) || 0;
  
  if (requestCount >= rateLimitConfig.maxRequests) {
    logger.warn('Rate limit exceeded', {
      userId,
      endpoint: getEndpointType(endpoint),
      requestCount,
      maxRequests: rateLimitConfig.maxRequests
    });
    return true;
  }
  
  return false;
}

/**
 * Increment request count for rate limiting
 */
function incrementRequestCount(userId, endpoint) {
  const key = getRateLimitKey(userId, endpoint);
  const currentCount = rateLimitCache.get(key) || 0;
  rateLimitCache.set(key, currentCount + 1);
  
  logger.debug('Rate limit counter incremented', {
    userId,
    endpoint: getEndpointType(endpoint),
    count: currentCount + 1
  });
}

/**
 * Parse Retry-After header from Spotify response
 */
function parseRetryAfter(retryAfterHeader) {
  if (!retryAfterHeader) return null;
  
  // Retry-After can be seconds (number) or HTTP date
  const seconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }
  
  // Try parsing as HTTP date
  const date = new Date(retryAfterHeader);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  
  return null;
}

/**
 * Delay execution for specified milliseconds
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiting middleware for Express
 */
function rateLimitMiddleware(options = {}) {
  const {
    enabled = config.rateLimit.enabled !== false,
    maxRetries = 3,
    skipPaths = ['/health', '/healthz', '/readyz']
  } = options;
  
  return async (req, res, next) => {
    // Skip rate limiting if disabled or for health check paths
    if (!enabled || skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Get user identifier (from session, JWT, or IP)
    const userId = req.user?.id || req.session?.userId || req.ip;
    const endpoint = req.originalUrl || req.url;
    
    // Check if rate limited
    if (shouldRateLimit(userId, endpoint)) {
      const rateLimitConfig = getRateLimitConfig(endpoint);
      const retryAfterMs = rateLimitConfig.windowMs;
      
      logger.warn('Request rate limited', {
        userId,
        endpoint: getEndpointType(endpoint),
        retryAfterMs
      });
      
      res.set('Retry-After', Math.ceil(retryAfterMs / 1000));
      return res.status(429).json(
        createErrorResponse(
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          'Too many requests. Please try again later.',
          { retryAfterMs }
        )
      );
    }
    
    // Increment counter
    incrementRequestCount(userId, endpoint);
    
    // Add rate limit info to response headers
    const key = getRateLimitKey(userId, endpoint);
    const currentCount = rateLimitCache.get(key) || 0;
    const rateLimitConfig = getRateLimitConfig(endpoint);
    
    res.set({
      'X-RateLimit-Limit': rateLimitConfig.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, rateLimitConfig.maxRequests - currentCount),
      'X-RateLimit-Reset': new Date(Date.now() + rateLimitConfig.windowMs).toISOString()
    });
    
    next();
  };
}

/**
 * Wrapper for Spotify API calls with automatic retry and backoff
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    endpoint = 'unknown',
    userId = 'system'
  } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before attempt
      if (attempt > 0 && shouldRateLimit(userId, endpoint)) {
        const backoffMs = calculateBackoff(attempt);
        logger.info('Rate limited, backing off', {
          userId,
          endpoint: getEndpointType(endpoint),
          attempt,
          backoffMs
        });
        await delay(backoffMs);
      }
      
      // Execute function
      const result = await fn();
      
      // Increment counter on success
      incrementRequestCount(userId, endpoint);
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Check if error is rate limit related
      const isRateLimitError = error.response?.status === 429;
      const retryAfterMs = parseRetryAfter(error.response?.headers?.['retry-after']);
      
      if (isRateLimitError) {
        logger.warn('Spotify API rate limit hit', {
          userId,
          endpoint: getEndpointType(endpoint),
          attempt,
          retryAfterMs
        });
        
        if (attempt < maxRetries) {
          const waitMs = retryAfterMs || calculateBackoff(attempt);
          logger.info('Retrying after backoff', {
            userId,
            endpoint: getEndpointType(endpoint),
            attempt: attempt + 1,
            waitMs
          });
          await delay(waitMs);
          continue;
        }
      }
      
      // Non-rate-limit error or max retries exceeded
      logger.error('Spotify API call failed', {
        userId,
        endpoint: getEndpointType(endpoint),
        attempt,
        error: error.message,
        isRateLimitError
      });
      
      if (attempt < maxRetries && isRateLimitError) {
        continue;
      }
      
      throw error;
    }
  }
  
  // Max retries exceeded
  throw lastError;
}

/**
 * Clear rate limit for a user (admin function)
 */
function clearRateLimit(userId, endpoint = null) {
  if (endpoint) {
    const key = getRateLimitKey(userId, endpoint);
    rateLimitCache.del(key);
    logger.info('Rate limit cleared', { userId, endpoint: getEndpointType(endpoint) });
  } else {
    // Clear all rate limits for user
    const keys = rateLimitCache.keys();
    const userKeys = keys.filter(key => key.includes(`:${userId}:`));
    rateLimitCache.del(userKeys);
    logger.info('All rate limits cleared for user', { userId, count: userKeys.length });
  }
}

/**
 * Get current rate limit status
 */
function getRateLimitStatus(userId, endpoint = null) {
  if (endpoint) {
    const key = getRateLimitKey(userId, endpoint);
    const rateLimitConfig = getRateLimitConfig(endpoint);
    const currentCount = rateLimitCache.get(key) || 0;
    
    return {
      endpoint: getEndpointType(endpoint),
      currentCount,
      maxRequests: rateLimitConfig.maxRequests,
      remaining: Math.max(0, rateLimitConfig.maxRequests - currentCount),
      windowMs: rateLimitConfig.windowMs
    };
  }
  
  // Get all rate limits for user
  const keys = rateLimitCache.keys();
  const userKeys = keys.filter(key => key.includes(`:${userId}:`));
  
  return userKeys.map(key => {
    const endpointType = key.split(':')[2];
    const count = rateLimitCache.get(key) || 0;
    const config = RATE_LIMITS[endpointType] || RATE_LIMITS.default;
    
    return {
      endpoint: endpointType,
      currentCount: count,
      maxRequests: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      windowMs: config.windowMs
    };
  });
}

module.exports = {
  rateLimitMiddleware,
  withRetry,
  clearRateLimit,
  getRateLimitStatus,
  calculateBackoff,
  parseRetryAfter,
  // Export for testing
  _test: {
    rateLimitCache,
    getRateLimitKey,
    getEndpointType,
    getRateLimitConfig,
    shouldRateLimit,
    incrementRequestCount
  }
};
