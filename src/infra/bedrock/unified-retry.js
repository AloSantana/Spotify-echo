'use strict';

/**
 * Unified Retry Layer for AWS Bedrock Operations
 * 
 * Provides centralized retry logic with circuit breaker pattern,
 * exponential backoff, and comprehensive telemetry for all Bedrock API calls.
 * 
 * Features:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern integration
 * - Retry budget enforcement
 * - Comprehensive telemetry (latency, retries, failures)
 * - p95/p99 latency tracking
 * - Error categorization (throttling, timeout, auth, etc.)
 * 
 * @module infra/bedrock/unified-retry
 */

const { createBreaker, CircuitState } = require('../resilience/breaker');
const logger = require('../observability/logger');
const { getCorrelationId } = require('../observability/requestContext');

/**
 * Telemetry collector for retry operations
 */
class RetryTelemetry {
  constructor() {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      retriedCalls: 0,
      circuitBreakerOpens: 0,
      latencies: [],
      errorsByType: {},
      costByModel: {}
    };
  }

  recordCall(success, latency, retries, error = null, model = null, cost = null) {
    this.metrics.totalCalls++;
    
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }
    
    if (retries > 0) {
      this.metrics.retriedCalls++;
    }
    
    this.metrics.latencies.push(latency);
    
    if (error) {
      const errorType = this.categorizeError(error);
      this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    }
    
    if (model && cost !== null) {
      if (!this.metrics.costByModel[model]) {
        this.metrics.costByModel[model] = { calls: 0, totalCost: 0 };
      }
      this.metrics.costByModel[model].calls++;
      this.metrics.costByModel[model].totalCost += cost;
    }
  }

  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const statusCode = error.$metadata?.httpStatusCode || error.statusCode;
    
    if (statusCode === 429 || message.includes('throttl')) {
      return 'throttling';
    }
    if (statusCode === 401 || statusCode === 403 || message.includes('access denied')) {
      return 'authorization';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (statusCode === 404 || message.includes('not found') || message.includes('invalid')) {
      return 'invalid_model';
    }
    if (statusCode >= 500) {
      return 'server_error';
    }
    if (message.includes('circuit breaker')) {
      return 'circuit_breaker';
    }
    return 'unknown';
  }

  getLatencyPercentile(percentile) {
    if (this.metrics.latencies.length === 0) return 0;
    
    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getSummary() {
    return {
      totalCalls: this.metrics.totalCalls,
      successfulCalls: this.metrics.successfulCalls,
      failedCalls: this.metrics.failedCalls,
      retriedCalls: this.metrics.retriedCalls,
      successRate: this.metrics.totalCalls > 0 
        ? (this.metrics.successfulCalls / this.metrics.totalCalls * 100).toFixed(2) + '%'
        : 'N/A',
      retryRate: this.metrics.totalCalls > 0
        ? (this.metrics.retriedCalls / this.metrics.totalCalls * 100).toFixed(2) + '%'
        : 'N/A',
      latency: {
        mean: this.metrics.latencies.length > 0
          ? Math.round(this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length)
          : 0,
        p50: Math.round(this.getLatencyPercentile(50)),
        p95: Math.round(this.getLatencyPercentile(95)),
        p99: Math.round(this.getLatencyPercentile(99)),
        max: this.metrics.latencies.length > 0 
          ? Math.max(...this.metrics.latencies)
          : 0
      },
      errorsByType: this.metrics.errorsByType,
      costByModel: this.metrics.costByModel
    };
  }

  reset() {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      retriedCalls: 0,
      circuitBreakerOpens: 0,
      latencies: [],
      errorsByType: {},
      costByModel: {}
    };
  }
}

/**
 * Unified Retry Wrapper for Bedrock Operations
 */
class UnifiedRetryLayer {
  constructor(options = {}) {
    this.config = {
      maxRetries: options.maxRetries || 3,
      baseDelayMs: options.baseDelayMs || 1000,
      maxDelayMs: options.maxDelayMs || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      jitterFactor: options.jitterFactor || 0.1,
      timeout: options.timeout || 30000,
      failureThreshold: options.failureThreshold || 5,
      resetTimeoutMs: options.resetTimeoutMs || 60000,
      retryBudget: options.retryBudget || 100, // Max retries per time window
      retryBudgetWindow: options.retryBudgetWindow || 60000, // 1 minute window
      ...options
    };

    this.telemetry = new RetryTelemetry();
    this.retryBudgetUsed = 0;
    this.retryBudgetResetTime = Date.now() + this.config.retryBudgetWindow;
    
    // Create circuit breakers for different operation types
    this.breakers = {
      inference: createBreaker('bedrock-inference', {
        failureThreshold: this.config.failureThreshold,
        resetTimeoutMs: this.config.resetTimeoutMs,
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.baseDelayMs,
        backoffFactor: this.config.backoffMultiplier,
        retryOn: this.shouldRetry.bind(this),
        onStateChange: ({ name, newState, reason }) => {
          logger.info({
            msg: 'Circuit breaker state change',
            breaker: name,
            state: newState,
            reason
          });
          if (newState === CircuitState.OPEN) {
            this.telemetry.metrics.circuitBreakerOpens++;
          }
        }
      })
    };
  }

  /**
   * Check retry budget
   * @returns {boolean} True if retry budget available
   */
  checkRetryBudget() {
    const now = Date.now();
    
    // Reset budget if window expired
    if (now >= this.retryBudgetResetTime) {
      this.retryBudgetUsed = 0;
      this.retryBudgetResetTime = now + this.config.retryBudgetWindow;
    }
    
    return this.retryBudgetUsed < this.config.retryBudget;
  }

  /**
   * Consume retry budget
   */
  consumeRetryBudget() {
    this.retryBudgetUsed++;
  }

  /**
   * Determine if error should be retried
   * @param {Error} error - Error object
   * @param {number} attempt - Current attempt number
   * @returns {boolean} True if should retry
   */
  shouldRetry(error, attempt) {
    // Don't exceed max retries
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    // Check retry budget
    if (!this.checkRetryBudget()) {
      logger.warn({
        msg: 'Retry budget exhausted',
        budgetUsed: this.retryBudgetUsed,
        budgetLimit: this.config.retryBudget
      });
      return false;
    }

    const errorType = this.telemetry.categorizeError(error);
    
    // Retry on throttling, timeout, and server errors
    const retryableErrors = ['throttling', 'timeout', 'server_error'];
    
    if (retryableErrors.includes(errorType)) {
      this.consumeRetryBudget();
      return true;
    }
    
    // Don't retry authorization or invalid model errors
    const nonRetryableErrors = ['authorization', 'invalid_model'];
    
    return !nonRetryableErrors.includes(errorType);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    const exponentialDelay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    
    // Add jitter (±10% by default)
    const jitter = cappedDelay * this.config.jitterFactor * (Math.random() * 2 - 1);
    
    return Math.round(cappedDelay + jitter);
  }

  /**
   * Execute operation with unified retry logic
   * @param {Function} operation - Async operation to execute
   * @param {Object} context - Operation context (model, cost calculation, etc.)
   * @returns {Promise} Operation result
   */
  async execute(operation, context = {}) {
    const { model = 'unknown', operationType = 'inference' } = context;
    
    const startTime = Date.now();
    let lastError = null;
    let attempts = 0;

    // Get appropriate circuit breaker
    const breaker = this.breakers[operationType] || this.breakers.inference;

    try {
      // Execute with circuit breaker
      const result = await breaker(async () => {
        attempts++;
        
        try {
          const opResult = await operation();
          return opResult;
        } catch (error) {
          lastError = error;
          
          logger.warn({
            msg: 'Bedrock operation failed',
            requestId: getCorrelationId(),
            model,
            attempt: attempts,
            error: error.message,
            errorType: this.telemetry.categorizeError(error)
          });
          
          throw error;
        }
      });

      const latency = Date.now() - startTime;
      
      // Calculate cost if provided
      const cost = context.calculateCost ? context.calculateCost(result) : null;
      
      // Record successful call
      this.telemetry.recordCall(true, latency, attempts - 1, null, model, cost);
      
      logger.info({
        msg: 'Bedrock operation succeeded',
        requestId: getCorrelationId(),
        model,
        attempts,
        latency,
        cost
      });
      
      return result;
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Record failed call
      this.telemetry.recordCall(false, latency, attempts - 1, error, model, null);
      
      logger.error({
        msg: 'Bedrock operation failed after all retries',
        requestId: getCorrelationId(),
        model,
        attempts,
        latency,
        error: error.message,
        errorType: this.telemetry.categorizeError(error)
      });
      
      throw error;
    }
  }

  /**
   * Get telemetry summary
   * @returns {Object} Telemetry summary
   */
  getTelemetry() {
    return this.telemetry.getSummary();
  }

  /**
   * Reset telemetry
   */
  resetTelemetry() {
    this.telemetry.reset();
    this.retryBudgetUsed = 0;
    this.retryBudgetResetTime = Date.now() + this.config.retryBudgetWindow;
  }

  /**
   * Get retry budget status
   * @returns {Object} Budget status
   */
  getRetryBudgetStatus() {
    return {
      used: this.retryBudgetUsed,
      limit: this.config.retryBudget,
      available: this.config.retryBudget - this.retryBudgetUsed,
      resetTime: new Date(this.retryBudgetResetTime).toISOString()
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance
 * @returns {UnifiedRetryLayer} Singleton instance
 */
function getInstance() {
  if (!instance) {
    instance = new UnifiedRetryLayer();
  }
  return instance;
}

module.exports = {
  UnifiedRetryLayer,
  RetryTelemetry,
  getInstance,
  // Convenience exports
  execute: (operation, context) => getInstance().execute(operation, context),
  getTelemetry: () => getInstance().getTelemetry(),
  resetTelemetry: () => getInstance().resetTelemetry(),
  getRetryBudgetStatus: () => getInstance().getRetryBudgetStatus()
};
