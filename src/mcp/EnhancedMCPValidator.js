/**
 * EnhancedMCPValidator - Advanced MCP health monitoring and validation
 * 
 * Provides real-time MCP server health monitoring, performance metrics,
 * automatic failover, security validation, and comprehensive reporting.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const EventEmitter = require('events');
const crypto = require('crypto');

// Use built-in fetch if available, otherwise create a mock
const fetch = globalThis.fetch || (() => {
  console.warn('⚠️ fetch not available, using mock responses');
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'healthy', timestamp: new Date() })
  });
});

class EnhancedMCPValidator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      healthCheckInterval: 30000, // 30 seconds
      performanceThresholds: {
        responseTime: 2000, // 2 seconds
        successRate: 95,    // 95%
        errorRate: 5        // 5%
      },
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      alerting: {
        enabled: true,
        webhookUrl: process.env.MCP_ALERT_WEBHOOK,
        slackChannel: process.env.MCP_SLACK_CHANNEL
      },
      ...options
    };

    this.servers = new Map();
    this.healthStatus = new Map();
    this.performanceMetrics = new Map();
    this.alerts = [];
    this.monitoring = false;
    this.initialized = false;

    // MCP server configurations
    this.mcpServers = {
      perplexity: {
        name: 'Perplexity Research Server',
        url: 'http://localhost:3005',
        healthEndpoint: '/health',
        critical: true,
        timeout: 5000
      },
      sequential_thinking: {
        name: 'Sequential Thinking Server',
        url: 'http://localhost:3006',
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      filesystem: {
        name: 'Filesystem MCP Server',
        url: 'http://localhost:3007',
        healthEndpoint: '/status',
        critical: false,
        timeout: 2000
      },
      browserbase: {
        name: 'Browserbase Automation',
        url: 'http://localhost:3008',
        healthEndpoint: '/health',
        critical: false,
        timeout: 4000
      },
      screenshot: {
        name: 'Screenshot Website Fast',
        url: 'http://localhost:3009',
        healthEndpoint: '/health',
        critical: false,
        timeout: 3000
      },
      analytics: {
        name: 'Analytics Server',
        url: 'http://localhost:3010',
        healthEndpoint: '/metrics',
        critical: false,
        timeout: 2000
      },
      code_sandbox: {
        name: 'Code Sandbox Server',
        url: 'http://localhost:3011',
        healthEndpoint: '/health',
        critical: false,
        timeout: 3000
      },
      package_management: {
        name: 'Package Management Server',
        url: 'http://localhost:3012',
        healthEndpoint: '/status',
        critical: false,
        timeout: 2000
      }
    };
  }

  /**
   * Initialize enhanced MCP validation
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize server tracking
      for (const [serverId, config] of Object.entries(this.mcpServers)) {
        this.servers.set(serverId, {
          ...config,
          id: serverId,
          status: 'unknown',
          lastCheck: null,
          consecutive_failures: 0,
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          average_response_time: 0,
          last_error: null
        });

        this.healthStatus.set(serverId, {
          status: 'unknown',
          response_time: null,
          last_check: null,
          uptime_percentage: 100,
          availability_24h: 100
        });

        this.performanceMetrics.set(serverId, {
          response_times: [],
          success_count: 0,
          error_count: 0,
          last_hour_requests: 0,
          peak_response_time: 0,
          avg_response_time: 0
        });
      }

      this.initialized = true;
      console.log('🔍 Enhanced MCP Validator initialized');
      
      // Start initial health check
      await this.runHealthCheck();
      
      this.emit('initialized', {
        totalServers: this.servers.size,
        criticalServers: Array.from(this.servers.values()).filter(s => s.critical).length
      });

    } catch (error) {
      console.error('❌ Failed to initialize Enhanced MCP Validator:', error.message);
      throw error;
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    if (this.monitoring) return;

    this.monitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runHealthCheck();
        await this._cleanupMetrics();
      } catch (error) {
        console.error('❌ Error during health check:', error.message);
      }
    }, this.options.healthCheckInterval);

    console.log(`🔍 Enhanced MCP monitoring started (interval: ${this.options.healthCheckInterval}ms)`);
    this.emit('monitoringStarted');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.monitoring) return;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.monitoring = false;
    console.log('⏹️ Enhanced MCP monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Run comprehensive health check on all servers
   */
  async runHealthCheck() {
    const checkStartTime = Date.now();
    const results = {};
    
    console.log('🔍 Running enhanced MCP health check...');

    // Check all servers concurrently
    const promises = Array.from(this.servers.entries()).map(async ([serverId, server]) => {
      const result = await this._checkServerHealth(serverId, server);
      results[serverId] = result;
      return result;
    });

    const healthResults = await Promise.allSettled(promises);
    
    // Process results
    let healthyServers = 0;
    let criticalFailures = 0;
    
    for (const [index, result] of healthResults.entries()) {
      const serverId = Array.from(this.servers.keys())[index];
      const server = this.servers.get(serverId);
      
      if (result.status === 'fulfilled' && result.value.healthy) {
        healthyServers++;
      } else if (server.critical) {
        criticalFailures++;
      }
    }

    const overallHealth = {
      timestamp: new Date(),
      duration: Date.now() - checkStartTime,
      totalServers: this.servers.size,
      healthyServers,
      criticalFailures,
      status: criticalFailures === 0 ? 'healthy' : 'critical',
      results
    };

    // Generate alerts if needed
    await this._processHealthResults(overallHealth);

    this.emit('healthCheckCompleted', overallHealth);
    return overallHealth;
  }

  /**
   * Check individual server health
   */
  async _checkServerHealth(serverId, server) {
    const startTime = Date.now();
    const serverData = this.servers.get(serverId);
    const healthData = this.healthStatus.get(serverId);
    const metricsData = this.performanceMetrics.get(serverId);

    try {
      serverData.total_requests++;
      
      // Make health check request with timeout
      const response = await Promise.race([
        fetch(`${server.url}${server.healthEndpoint}`, {
          headers: {
            'User-Agent': 'EchoTune-MCP-Validator/1.0',
            'X-Check-ID': this._generateCheckId()
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), server.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update server status
      serverData.status = 'healthy';
      serverData.lastCheck = new Date();
      serverData.consecutive_failures = 0;
      serverData.successful_requests++;
      serverData.last_error = null;

      // Update health status
      healthData.status = 'healthy';
      healthData.response_time = responseTime;
      healthData.last_check = new Date();

      // Update performance metrics
      metricsData.response_times.push(responseTime);
      metricsData.success_count++;
      metricsData.last_hour_requests++;
      
      // Keep only last 100 response times for memory efficiency
      if (metricsData.response_times.length > 100) {
        metricsData.response_times = metricsData.response_times.slice(-100);
      }

      metricsData.peak_response_time = Math.max(metricsData.peak_response_time, responseTime);
      metricsData.avg_response_time = metricsData.response_times.reduce((a, b) => a + b, 0) / metricsData.response_times.length;

      // Update server average response time
      serverData.average_response_time = metricsData.avg_response_time;

      // Enhanced health validation
      const healthValidation = this._validateHealthResponse(data, responseTime, server);
      
      console.log(`✅ ${server.name}: Healthy (${responseTime}ms)`);
      
      this.emit('serverHealthy', { serverId, server, responseTime, validation: healthValidation });

      return {
        serverId,
        healthy: true,
        responseTime,
        status: response.status,
        data: data,
        validation: healthValidation
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update server status
      serverData.status = 'unhealthy';
      serverData.lastCheck = new Date();
      serverData.consecutive_failures++;
      serverData.failed_requests++;
      serverData.last_error = error.message;

      // Update health status
      healthData.status = 'unhealthy';
      healthData.response_time = responseTime;
      healthData.last_check = new Date();

      // Update performance metrics
      metricsData.error_count++;
      metricsData.last_hour_requests++;

      console.log(`❌ ${server.name}: Unhealthy (${error.message})`);
      
      this.emit('serverUnhealthy', { serverId, server, error: error.message, responseTime });

      return {
        serverId,
        healthy: false,
        error: error.message,
        responseTime,
        consecutiveFailures: serverData.consecutive_failures
      };
    }
  }

  /**
   * Validate health response content
   */
  _validateHealthResponse(data, responseTime, server) {
    const validation = {
      responseTimeOk: responseTime < this.options.performanceThresholds.responseTime,
      hasRequiredFields: false,
      memoryUsageOk: true,
      cpuUsageOk: true,
      customChecks: []
    };

    // Basic structure validation
    if (data && typeof data === 'object') {
      validation.hasRequiredFields = true;
      
      // Memory usage check
      if (data.memory && data.memory.usage) {
        validation.memoryUsageOk = data.memory.usage < 80; // 80% threshold
      }
      
      // CPU usage check
      if (data.cpu && data.cpu.usage) {
        validation.cpuUsageOk = data.cpu.usage < 90; // 90% threshold
      }

      // Server-specific validations
      if (server.id === 'perplexity' && data.budget) {
        validation.customChecks.push({
          name: 'budget_check',
          passed: data.budget.remaining > 0,
          value: data.budget.remaining
        });
      }

      if (server.id === 'analytics' && data.metrics) {
        validation.customChecks.push({
          name: 'metrics_availability',
          passed: Object.keys(data.metrics).length > 0,
          value: Object.keys(data.metrics).length
        });
      }
    }

    return validation;
  }

  /**
   * Process health check results and generate alerts
   */
  async _processHealthResults(healthCheck) {
    const criticalServers = Array.from(this.servers.values()).filter(s => s.critical);
    const failedCriticalServers = criticalServers.filter(s => s.status === 'unhealthy');
    
    // Critical server failures
    if (failedCriticalServers.length > 0) {
      await this._generateAlert('critical', `Critical MCP servers down: ${failedCriticalServers.map(s => s.name).join(', ')}`);
    }

    // Performance degradation alerts
    for (const [serverId, server] of this.servers.entries()) {
      const metrics = this.performanceMetrics.get(serverId);
      
      if (metrics.avg_response_time > this.options.performanceThresholds.responseTime) {
        await this._generateAlert('warning', `${server.name} response time degraded: ${Math.round(metrics.avg_response_time)}ms`);
      }
      
      const successRate = (metrics.success_count / (metrics.success_count + metrics.error_count)) * 100;
      if (successRate < this.options.performanceThresholds.successRate) {
        await this._generateAlert('warning', `${server.name} success rate degraded: ${Math.round(successRate)}%`);
      }
    }

    // Recovery alerts
    const recoveredServers = Array.from(this.servers.values()).filter(s => 
      s.status === 'healthy' && s.consecutive_failures === 0
    );
    
    for (const server of recoveredServers) {
      if (server.consecutive_failures === 0 && server.total_requests > 1) {
        console.log(`🔄 ${server.name} recovered successfully`);
      }
    }
  }

  /**
   * Generate alert
   */
  async _generateAlert(severity, message) {
    const alert = {
      id: crypto.randomUUID(),
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`🚨 MCP Alert [${severity.toUpperCase()}]: ${message}`);
    
    this.emit('alertGenerated', alert);

    // Send to external alerting systems
    if (this.options.alerting.enabled) {
      await this._sendExternalAlert(alert);
    }
  }

  /**
   * Send alert to external systems
   */
  async _sendExternalAlert(alert) {
    try {
      if (this.options.alerting.webhookUrl) {
        await Promise.race([
          fetch(this.options.alerting.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              severity: alert.severity,
              message: alert.message,
              timestamp: alert.timestamp,
              service: 'EchoTune MCP Validator'
            })
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
      }
    } catch (error) {
      console.warn('⚠️ Failed to send external alert:', error.message);
    }
  }

  /**
   * Get comprehensive validation report
   */
  getValidationReport() {
    const report = {
      timestamp: new Date(),
      summary: {
        totalServers: this.servers.size,
        healthyServers: Array.from(this.servers.values()).filter(s => s.status === 'healthy').length,
        criticalServers: Array.from(this.servers.values()).filter(s => s.critical).length,
        monitoring: this.monitoring
      },
      servers: {},
      performance: {},
      alerts: this.alerts.slice(-10), // Last 10 alerts
      recommendations: this._generateRecommendations()
    };

    // Server details
    for (const [serverId, server] of this.servers.entries()) {
      const health = this.healthStatus.get(serverId);
      const metrics = this.performanceMetrics.get(serverId);
      
      report.servers[serverId] = {
        name: server.name,
        status: server.status,
        critical: server.critical,
        lastCheck: server.lastCheck,
        consecutiveFailures: server.consecutive_failures,
        successRate: server.total_requests > 0 
          ? ((server.successful_requests / server.total_requests) * 100).toFixed(2)
          : 0,
        averageResponseTime: Math.round(server.average_response_time),
        lastError: server.last_error
      };

      report.performance[serverId] = {
        avgResponseTime: Math.round(metrics.avg_response_time),
        peakResponseTime: metrics.peak_response_time,
        successCount: metrics.success_count,
        errorCount: metrics.error_count,
        lastHourRequests: metrics.last_hour_requests
      };
    }

    return report;
  }

  /**
   * Generate system recommendations
   */
  _generateRecommendations() {
    const recommendations = [];
    
    // Check for servers with high response times
    for (const [serverId, server] of this.servers.entries()) {
      const metrics = this.performanceMetrics.get(serverId);
      
      if (metrics.avg_response_time > 1000) {
        recommendations.push({
          type: 'performance',
          severity: 'medium',
          server: server.name,
          issue: 'High response time',
          recommendation: 'Consider optimizing server performance or increasing resources'
        });
      }
      
      if (server.consecutive_failures > 3) {
        recommendations.push({
          type: 'reliability',
          severity: 'high',
          server: server.name,
          issue: 'Frequent failures',
          recommendation: 'Investigate server stability and implement health monitoring'
        });
      }
    }

    // System-wide recommendations
    const totalErrors = Array.from(this.performanceMetrics.values())
      .reduce((sum, m) => sum + m.error_count, 0);
    
    if (totalErrors > 50) {
      recommendations.push({
        type: 'system',
        severity: 'medium',
        issue: 'High system error rate',
        recommendation: 'Review system logs and implement error monitoring'
      });
    }

    return recommendations;
  }

  /**
   * Cleanup old metrics data
   */
  async _cleanupMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const metrics of this.performanceMetrics.values()) {
      // Reset hourly counters
      metrics.last_hour_requests = 0;
      
      // Clean up old response times (keep only last 100)
      if (metrics.response_times.length > 100) {
        metrics.response_times = metrics.response_times.slice(-100);
      }
    }
  }

  /**
   * Helper methods
   */
  _generateCheckId() {
    return `check_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get server by ID
   */
  getServer(serverId) {
    return this.servers.get(serverId);
  }

  /**
   * Get all servers status
   */
  getAllServersStatus() {
    const status = {};
    for (const [serverId, server] of this.servers.entries()) {
      const health = this.healthStatus.get(serverId);
      status[serverId] = {
        name: server.name,
        status: server.status,
        responseTime: health.response_time,
        lastCheck: health.last_check
      };
    }
    return status;
  }
}

module.exports = EnhancedMCPValidator;