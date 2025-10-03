#!/usr/bin/env node

/**
 * AWS Bedrock Monitoring and Logging
 * 
 * Provides comprehensive monitoring, logging, and analytics for AWS Bedrock operations
 * 
 * Features:
 * - Structured logging with multiple severity levels
 * - Performance metrics tracking
 * - Cost tracking and analytics
 * - Health monitoring
 * - Alert generation
 * - Report generation
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Log levels
 */
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

/**
 * Structured logger for AWS Bedrock operations
 */
class BedrockLogger {
  constructor(options = {}) {
    this.options = {
      level: options.level || LogLevel.INFO,
      outputFile: options.outputFile || null,
      console: options.console !== false,
      structured: options.structured !== false
    };
    
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };
  }

  /**
   * Check if message should be logged based on level
   */
  shouldLog(level) {
    const currentLevel = this.logLevels[this.options.level] || 1;
    const messageLevel = this.logLevels[level] || 1;
    return messageLevel >= currentLevel;
  }

  /**
   * Format log entry
   */
  formatLog(level, message, metadata = {}) {
    if (this.options.structured) {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...metadata
      });
    } else {
      const timestamp = new Date().toISOString();
      const meta = Object.keys(metadata).length > 0 ? 
        ` ${JSON.stringify(metadata)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${meta}`;
    }
  }

  /**
   * Write log entry
   */
  async write(level, message, metadata = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.formatLog(level, message, metadata);

    // Console output
    if (this.options.console) {
      const consoleMethod = level === 'error' || level === 'fatal' ? 
        console.error : console.log;
      consoleMethod(logEntry);
    }

    // File output
    if (this.options.outputFile) {
      try {
        await fs.appendFile(this.options.outputFile, logEntry + '\n');
      } catch (error) {
        console.error('Failed to write log to file:', error.message);
      }
    }
  }

  debug(message, metadata = {}) {
    return this.write(LogLevel.DEBUG, message, metadata);
  }

  info(message, metadata = {}) {
    return this.write(LogLevel.INFO, message, metadata);
  }

  warn(message, metadata = {}) {
    return this.write(LogLevel.WARN, message, metadata);
  }

  error(message, metadata = {}) {
    return this.write(LogLevel.ERROR, message, metadata);
  }

  fatal(message, metadata = {}) {
    return this.write(LogLevel.FATAL, message, metadata);
  }
}

/**
 * Performance metrics tracker
 */
class MetricsTracker {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byModel: {}
      },
      latency: {
        sum: 0,
        count: 0,
        min: Infinity,
        max: 0,
        p50: [],
        p95: [],
        p99: []
      },
      tokens: {
        input: 0,
        output: 0,
        total: 0,
        byModel: {}
      },
      errors: {
        total: 0,
        byCategory: {}
      }
    };
  }

  /**
   * Record a successful request
   */
  recordRequest(modelId, latency, tokens = {}) {
    // Update request counts
    this.metrics.requests.total++;
    this.metrics.requests.successful++;
    
    if (!this.metrics.requests.byModel[modelId]) {
      this.metrics.requests.byModel[modelId] = {
        total: 0,
        successful: 0,
        failed: 0
      };
    }
    this.metrics.requests.byModel[modelId].total++;
    this.metrics.requests.byModel[modelId].successful++;

    // Update latency metrics
    this.metrics.latency.sum += latency;
    this.metrics.latency.count++;
    this.metrics.latency.min = Math.min(this.metrics.latency.min, latency);
    this.metrics.latency.max = Math.max(this.metrics.latency.max, latency);
    
    // Store for percentile calculation
    this.metrics.latency.p50.push(latency);
    this.metrics.latency.p95.push(latency);
    this.metrics.latency.p99.push(latency);

    // Update token metrics
    const inputTokens = tokens.input || 0;
    const outputTokens = tokens.output || 0;
    const totalTokens = inputTokens + outputTokens;
    
    this.metrics.tokens.input += inputTokens;
    this.metrics.tokens.output += outputTokens;
    this.metrics.tokens.total += totalTokens;
    
    if (!this.metrics.tokens.byModel[modelId]) {
      this.metrics.tokens.byModel[modelId] = {
        input: 0,
        output: 0,
        total: 0
      };
    }
    this.metrics.tokens.byModel[modelId].input += inputTokens;
    this.metrics.tokens.byModel[modelId].output += outputTokens;
    this.metrics.tokens.byModel[modelId].total += totalTokens;
  }

  /**
   * Record a failed request
   */
  recordError(modelId, errorCategory) {
    this.metrics.requests.total++;
    this.metrics.requests.failed++;
    
    if (!this.metrics.requests.byModel[modelId]) {
      this.metrics.requests.byModel[modelId] = {
        total: 0,
        successful: 0,
        failed: 0
      };
    }
    this.metrics.requests.byModel[modelId].total++;
    this.metrics.requests.byModel[modelId].failed++;

    this.metrics.errors.total++;
    
    if (!this.metrics.errors.byCategory[errorCategory]) {
      this.metrics.errors.byCategory[errorCategory] = 0;
    }
    this.metrics.errors.byCategory[errorCategory]++;
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const avgLatency = this.metrics.latency.count > 0 ?
      this.metrics.latency.sum / this.metrics.latency.count : 0;

    return {
      requests: this.metrics.requests,
      latency: {
        avg: Math.round(avgLatency),
        min: this.metrics.latency.min === Infinity ? 0 : this.metrics.latency.min,
        max: this.metrics.latency.max,
        p50: Math.round(this.calculatePercentile(this.metrics.latency.p50, 50)),
        p95: Math.round(this.calculatePercentile(this.metrics.latency.p95, 95)),
        p99: Math.round(this.calculatePercentile(this.metrics.latency.p99, 99))
      },
      tokens: this.metrics.tokens,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests.total > 0 ?
        (this.metrics.errors.total / this.metrics.requests.total) * 100 : 0
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, byModel: {} },
      latency: { sum: 0, count: 0, min: Infinity, max: 0, p50: [], p95: [], p99: [] },
      tokens: { input: 0, output: 0, total: 0, byModel: {} },
      errors: { total: 0, byCategory: {} }
    };
  }
}

/**
 * Cost tracker for AWS Bedrock usage
 */
class CostTracker {
  constructor(pricingConfig = {}) {
    // Default pricing per 1K tokens (as of Jan 2025)
    this.pricing = {
      'claude-opus-4-1': { input: 0.015, output: 0.075 },
      'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
      'claude-3-5-sonnet-v2': { input: 0.003, output: 0.015 },
      'claude-3-5-sonnet-v1': { input: 0.003, output: 0.015 },
      'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'deepseek-r1': { input: 0.0014, output: 0.0028 },
      'titan-text-express-v1': { input: 0.0002, output: 0.0006 },
      ...pricingConfig
    };

    this.costs = {
      total: 0,
      byModel: {}
    };
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(modelKey, inputTokens, outputTokens) {
    const modelPricing = this.pricing[modelKey];
    
    if (!modelPricing) {
      console.warn(`No pricing data for model: ${modelKey}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Record cost for a request
   */
  recordCost(modelKey, inputTokens, outputTokens) {
    const cost = this.calculateCost(modelKey, inputTokens, outputTokens);
    
    this.costs.total += cost;
    
    if (!this.costs.byModel[modelKey]) {
      this.costs.byModel[modelKey] = 0;
    }
    this.costs.byModel[modelKey] += cost;

    return cost;
  }

  /**
   * Get cost summary
   */
  getCosts() {
    return {
      total: this.costs.total.toFixed(4),
      byModel: Object.fromEntries(
        Object.entries(this.costs.byModel).map(([model, cost]) => 
          [model, cost.toFixed(4)]
        )
      )
    };
  }

  /**
   * Reset costs
   */
  reset() {
    this.costs = { total: 0, byModel: {} };
  }
}

/**
 * Health monitor for AWS Bedrock services
 */
class HealthMonitor {
  constructor() {
    this.checks = [];
    this.status = {
      healthy: true,
      lastCheck: null,
      issues: []
    };
  }

  /**
   * Add a health check
   */
  addCheck(name, checkFn) {
    this.checks.push({ name, checkFn });
  }

  /**
   * Run all health checks
   */
  async runChecks() {
    this.status.lastCheck = new Date();
    this.status.issues = [];
    
    const results = [];

    for (const check of this.checks) {
      try {
        const result = await check.checkFn();
        results.push({
          name: check.name,
          status: result.healthy ? 'healthy' : 'unhealthy',
          message: result.message,
          timestamp: new Date()
        });

        if (!result.healthy) {
          this.status.issues.push({
            check: check.name,
            message: result.message
          });
        }
      } catch (error) {
        results.push({
          name: check.name,
          status: 'error',
          message: error.message,
          timestamp: new Date()
        });
        
        this.status.issues.push({
          check: check.name,
          message: `Check failed: ${error.message}`
        });
      }
    }

    this.status.healthy = this.status.issues.length === 0;

    return {
      healthy: this.status.healthy,
      checks: results,
      issues: this.status.issues
    };
  }

  /**
   * Get current health status
   */
  getStatus() {
    return this.status;
  }
}

/**
 * Alert manager for monitoring thresholds
 */
class AlertManager {
  constructor() {
    this.thresholds = {
      errorRate: 5.0,        // Percent
      latencyP95: 5000,      // Milliseconds
      costPerHour: 10.0,     // Dollars
      failedHealthChecks: 2  // Count
    };

    this.alerts = [];
  }

  /**
   * Set custom threshold
   */
  setThreshold(metric, value) {
    this.thresholds[metric] = value;
  }

  /**
   * Check metrics against thresholds
   */
  checkMetrics(metrics) {
    const newAlerts = [];

    // Check error rate
    if (metrics.errorRate > this.thresholds.errorRate) {
      newAlerts.push({
        severity: 'high',
        metric: 'errorRate',
        value: metrics.errorRate,
        threshold: this.thresholds.errorRate,
        message: `Error rate (${metrics.errorRate.toFixed(2)}%) exceeds threshold (${this.thresholds.errorRate}%)`,
        timestamp: new Date()
      });
    }

    // Check latency
    if (metrics.latency.p95 > this.thresholds.latencyP95) {
      newAlerts.push({
        severity: 'medium',
        metric: 'latencyP95',
        value: metrics.latency.p95,
        threshold: this.thresholds.latencyP95,
        message: `P95 latency (${metrics.latency.p95}ms) exceeds threshold (${this.thresholds.latencyP95}ms)`,
        timestamp: new Date()
      });
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  /**
   * Get all alerts
   */
  getAlerts(severity = null) {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return this.alerts;
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
  }
}

/**
 * Unified monitoring facade
 */
class BedrockMonitor {
  constructor(options = {}) {
    this.logger = new BedrockLogger(options.logging || {});
    this.metrics = new MetricsTracker();
    this.costs = new CostTracker(options.pricing || {});
    this.health = new HealthMonitor();
    this.alerts = new AlertManager();
  }

  /**
   * Record a successful API call
   */
  async recordSuccess(modelId, latency, tokens = {}) {
    this.metrics.recordRequest(modelId, latency, tokens);
    
    if (tokens.input && tokens.output) {
      const cost = this.costs.recordCost(modelId, tokens.input, tokens.output);
      
      await this.logger.info('API call successful', {
        event: 'api_success',
        model_id: modelId,
        latency_ms: latency,
        tokens_input: tokens.input,
        tokens_output: tokens.output,
        cost_usd: cost
      });
    }

    // Check for alerts
    const metrics = this.metrics.getMetrics();
    this.alerts.checkMetrics(metrics);
  }

  /**
   * Record a failed API call
   */
  async recordFailure(modelId, errorCategory, errorMessage) {
    this.metrics.recordError(modelId, errorCategory);
    
    await this.logger.error('API call failed', {
      event: 'api_failure',
      model_id: modelId,
      error_category: errorCategory,
      error_message: errorMessage
    });

    // Check for alerts
    const metrics = this.metrics.getMetrics();
    this.alerts.checkMetrics(metrics);
  }

  /**
   * Get comprehensive monitoring report
   */
  async generateReport() {
    const metrics = this.metrics.getMetrics();
    const costs = this.costs.getCosts();
    const health = await this.health.runChecks();
    const alerts = this.alerts.getAlerts();

    return {
      timestamp: new Date().toISOString(),
      metrics,
      costs,
      health,
      alerts: {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
        items: alerts
      }
    };
  }

  /**
   * Save report to file
   */
  async saveReport(outputPath) {
    const report = await this.generateReport();
    await fs.writeFile(
      outputPath,
      JSON.stringify(report, null, 2)
    );
    return report;
  }
}

module.exports = {
  LogLevel,
  BedrockLogger,
  MetricsTracker,
  CostTracker,
  HealthMonitor,
  AlertManager,
  BedrockMonitor
};
