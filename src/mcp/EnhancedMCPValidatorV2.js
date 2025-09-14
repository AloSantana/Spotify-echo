/**
 * Enhanced MCP Validator v2.0 - Failure Classification and Remediation
 * 
 * Provides comprehensive MCP server validation with real-time health monitoring,
 * failure type classification, exponential backoff, and automatic failover.
 * 
 * @author EchoTune AI Team
 * @version 2.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

// Failure type classifications
const FAILURE_TYPES = {
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK', 
  PROTOCOL: 'PROTOCOL',
  AUTH: 'AUTH',
  UNKNOWN: 'UNKNOWN'
};

// Server health states
const HEALTH_STATES = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED', 
  DOWN: 'DOWN',
  DOWN_CRITICAL: 'DOWN_CRITICAL'
};

class EnhancedMCPValidatorV2 extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      configPath: options.configPath || path.join(__dirname, '../../mcp/servers.json'),
      reportsPath: options.reportsPath || path.join(__dirname, '../../reports/mcp'),
      baseBackoffMs: options.baseBackoffMs || 300,
      backoffFactor: options.backoffFactor || 2.0,
      maxRetries: options.maxRetries || 3,
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      criticalFailureThreshold: options.criticalFailureThreshold || 3,
      ...options
    };

    this.servers = [];
    this.serverStates = new Map();
    this.validationHistory = new Map();
    this.healthCheckTimer = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing Enhanced MCP Validator v2.0...');
      
      // Load server configuration
      await this.loadServerConfig();
      
      // Initialize server states
      this.initializeServerStates();
      
      // Create reports directory
      await this.ensureReportsDirectory();
      
      // Start continuous health monitoring
      this.startHealthMonitoring();
      
      this.initialized = true;
      console.log(`✅ Enhanced MCP Validator initialized with ${this.servers.length} servers`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced MCP Validator:', error);
      throw error;
    }
  }

  async loadServerConfig() {
    try {
      const configData = await fs.readFile(this.options.configPath, 'utf8');
      this.servers = JSON.parse(configData);
      
      // Validate server configuration
      for (const server of this.servers) {
        if (!server.name || !server.url) {
          throw new Error(`Invalid server configuration: ${JSON.stringify(server)}`);
        }
      }
      
      console.log(`📋 Loaded ${this.servers.length} MCP server configurations`);
      
    } catch (error) {
      console.error('❌ Failed to load server configuration:', error);
      throw new Error(`Server config loading failed: ${error.message}`);
    }
  }

  initializeServerStates() {
    for (const server of this.servers) {
      this.serverStates.set(server.name, {
        state: HEALTH_STATES.DOWN,
        lastCheck: null,
        consecutiveFailures: 0,
        totalChecks: 0,
        successCount: 0,
        failureHistory: [],
        responseTimeHistory: [],
        lastError: null,
        lastFailureType: null
      });
      
      this.validationHistory.set(server.name, []);
    }
  }

  async validateServer(server, attempt = 1) {
    const startTime = Date.now();
    const serverState = this.serverStates.get(server.name);
    
    try {
      // Apply exponential backoff for retries
      if (attempt > 1) {
        const backoffMs = this.calculateBackoff(attempt);
        console.log(`⏳ Backing off ${backoffMs}ms for ${server.name} (attempt ${attempt})`);
        await this.sleep(backoffMs);
      }

      // Make health check request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), server.timeoutMs || 5000);

      const response = await fetch(`${server.url}${server.healthEndpoint || '/health'}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EchoTune-MCP-Validator/2.0'
        }
      });

      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      const responseData = await response.json();
      
      // Update server state on success
      this.updateServerStateSuccess(server.name, responseTime, responseData);
      
      return {
        server: server.name,
        status: 'success',
        state: this.determineHealthState(server, serverState),
        responseTime,
        data: responseData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const failureType = this.classifyFailure(error);
      
      // Update server state on failure
      this.updateServerStateFailure(server.name, error, failureType, responseTime);
      
      // Retry if we haven't exceeded max retries
      if (attempt < (server.retries || this.options.maxRetries)) {
        console.log(`🔄 Retrying ${server.name} (${attempt}/${server.retries || this.options.maxRetries})`);
        return await this.validateServer(server, attempt + 1);
      }
      
      // Final failure
      return {
        server: server.name,
        status: 'failure',
        state: this.determineHealthState(server, serverState),
        failureType,
        error: error.message,
        responseTime,
        attempt,
        timestamp: new Date().toISOString()
      };
    }
  }

  classifyFailure(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('aborted')) {
      return FAILURE_TYPES.TIMEOUT;
    }
    
    if (message.includes('network') || message.includes('connection') || 
        message.includes('econnrefused') || message.includes('enotfound')) {
      return FAILURE_TYPES.NETWORK;
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden') ||
        message.includes('authentication') || message.includes('auth')) {
      return FAILURE_TYPES.AUTH;
    }
    
    if (message.includes('protocol') || message.includes('parse') ||
        message.includes('json') || message.includes('syntax')) {
      return FAILURE_TYPES.PROTOCOL;
    }
    
    return FAILURE_TYPES.UNKNOWN;
  }

  updateServerStateSuccess(serverName, responseTime, data) {
    const state = this.serverStates.get(serverName);
    
    state.lastCheck = new Date();
    state.consecutiveFailures = 0;
    state.totalChecks++;
    state.successCount++;
    state.lastError = null;
    state.lastFailureType = null;
    
    // Track response time (keep last 100 measurements)
    state.responseTimeHistory.push(responseTime);
    if (state.responseTimeHistory.length > 100) {
      state.responseTimeHistory.shift();
    }
    
    // Update health state
    state.state = HEALTH_STATES.HEALTHY;
    
    this.emit('serverHealthy', { server: serverName, responseTime, data });
  }

  updateServerStateFailure(serverName, error, failureType, responseTime) {
    const state = this.serverStates.get(serverName);
    const server = this.servers.find(s => s.name === serverName);
    
    state.lastCheck = new Date();
    state.consecutiveFailures++;
    state.totalChecks++;
    state.lastError = error.message;
    state.lastFailureType = failureType;
    
    // Track failure history (keep last 50 failures)
    state.failureHistory.push({
      timestamp: new Date(),
      error: error.message,
      type: failureType,
      responseTime
    });
    if (state.failureHistory.length > 50) {
      state.failureHistory.shift();
    }
    
    // Update health state based on failure severity
    if (server.critical && state.consecutiveFailures >= this.options.criticalFailureThreshold) {
      state.state = HEALTH_STATES.DOWN_CRITICAL;
      this.emit('criticalServerDown', { server: serverName, error, failureType });
    } else if (state.consecutiveFailures >= 2) {
      state.state = HEALTH_STATES.DOWN;
      this.emit('serverDown', { server: serverName, error, failureType });
    } else {
      state.state = HEALTH_STATES.DEGRADED;
      this.emit('serverDegraded', { server: serverName, error, failureType });
    }
  }

  determineHealthState(server, serverState) {
    if (server.critical && serverState.consecutiveFailures >= this.options.criticalFailureThreshold) {
      return HEALTH_STATES.DOWN_CRITICAL;
    }
    
    return serverState.state;
  }

  calculateBackoff(attempt) {
    return Math.min(
      this.options.baseBackoffMs * Math.pow(this.options.backoffFactor, attempt - 2),
      10000 // Max 10 seconds
    );
  }

  async validateAllServers() {
    console.log('🔍 Starting comprehensive MCP server validation...');
    
    const validationResults = await Promise.allSettled(
      this.servers.map(server => this.validateServer(server))
    );

    const results = validationResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          server: this.servers[index].name,
          status: 'failure',
          state: HEALTH_STATES.DOWN,
          error: result.reason.message,
          failureType: FAILURE_TYPES.UNKNOWN,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Generate validation report
    const report = await this.generateValidationReport(results);
    
    // Save report to files
    await this.saveValidationReport(report);
    
    return report;
  }

  async generateValidationReport(results) {
    const summary = {
      totalServers: this.servers.length,
      healthyServers: 0,
      degradedServers: 0,
      downServers: 0,
      criticalDownServers: 0,
      overallStatus: 'HEALTHY',
      criticalSystemsHealthy: true
    };

    const serverResults = [];
    
    for (const result of results) {
      const server = this.servers.find(s => s.name === result.server);
      const state = this.serverStates.get(result.server);
      
      // Count servers by state
      switch (result.state) {
        case HEALTH_STATES.HEALTHY:
          summary.healthyServers++;
          break;
        case HEALTH_STATES.DEGRADED:
          summary.degradedServers++;
          break;
        case HEALTH_STATES.DOWN:
          summary.downServers++;
          if (server.critical) summary.criticalSystemsHealthy = false;
          break;
        case HEALTH_STATES.DOWN_CRITICAL:
          summary.criticalDownServers++;
          summary.criticalSystemsHealthy = false;
          break;
      }
      
      serverResults.push({
        ...result,
        critical: server.critical,
        category: server.category,
        tags: server.tags,
        consecutiveFailures: state.consecutiveFailures,
        successRate: state.totalChecks > 0 ? 
          ((state.successCount / state.totalChecks) * 100).toFixed(2) + '%' : 'N/A',
        avgResponseTime: state.responseTimeHistory.length > 0 ?
          Math.round(state.responseTimeHistory.reduce((a, b) => a + b) / state.responseTimeHistory.length) + 'ms' : 'N/A'
      });
    }

    // Determine overall status
    if (summary.criticalDownServers > 0 || !summary.criticalSystemsHealthy) {
      summary.overallStatus = 'CRITICAL';
    } else if (summary.downServers > 0 || summary.degradedServers > summary.healthyServers) {
      summary.overallStatus = 'DEGRADED';
    } else if (summary.degradedServers > 0) {
      summary.overallStatus = 'WARNING';
    }

    return {
      timestamp: new Date().toISOString(),
      summary,
      servers: serverResults,
      recommendations: this.generateRecommendations(summary, serverResults)
    };
  }

  generateRecommendations(summary, serverResults) {
    const recommendations = [];
    
    // Critical system recommendations
    if (summary.criticalDownServers > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        type: 'SYSTEM_FAILURE',
        message: `${summary.criticalDownServers} critical MCP servers are down. Immediate intervention required.`,
        action: 'Check server logs, restart services, verify network connectivity'
      });
    }
    
    // Performance recommendations
    const slowServers = serverResults.filter(s => 
      s.avgResponseTime && parseInt(s.avgResponseTime) > 5000
    );
    
    if (slowServers.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'PERFORMANCE',
        message: `${slowServers.length} servers have high response times (>5s)`,
        action: 'Investigate server performance, check resource usage, consider scaling'
      });
    }
    
    // Network recommendations
    const networkFailures = serverResults.filter(s => 
      s.failureType === FAILURE_TYPES.NETWORK
    );
    
    if (networkFailures.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'NETWORK',
        message: `${networkFailures.length} servers experiencing network issues`,
        action: 'Check network connectivity, firewall rules, DNS resolution'
      });
    }
    
    return recommendations;
  }

  async saveValidationReport(report) {
    try {
      // Save JSON report
      const jsonPath = path.join(this.options.reportsPath, 'last-validation.json');
      await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
      
      // Save Markdown summary
      const markdownPath = path.join(this.options.reportsPath, 'last-validation.md');
      const markdown = this.generateMarkdownReport(report);
      await fs.writeFile(markdownPath, markdown);
      
      console.log(`📄 Validation reports saved to ${this.options.reportsPath}`);
      
    } catch (error) {
      console.error('❌ Failed to save validation report:', error);
    }
  }

  generateMarkdownReport(report) {
    const { summary, servers, recommendations } = report;
    
    return `# MCP Server Validation Report

Generated: ${report.timestamp}

## Summary

- **Overall Status**: ${summary.overallStatus}
- **Total Servers**: ${summary.totalServers}
- **Healthy**: ${summary.healthyServers}
- **Degraded**: ${summary.degradedServers}
- **Down**: ${summary.downServers}
- **Critical Down**: ${summary.criticalDownServers}

## Server Details

| Server | Status | Critical | Response Time | Success Rate | Last Error |
|--------|--------|----------|---------------|--------------|------------|
${servers.map(s => 
  `| ${s.server} | ${s.state} | ${s.critical ? '⚠️' : '✅'} | ${s.avgResponseTime || 'N/A'} | ${s.successRate} | ${s.error || 'None'} |`
).join('\n')}

## Recommendations

${recommendations.length > 0 ? 
  recommendations.map(r => 
    `### ${r.priority}: ${r.type}\n\n${r.message}\n\n**Action**: ${r.action}\n`
  ).join('\n') : 
  'No specific recommendations at this time.'
}

---
*Generated by Enhanced MCP Validator v2.0*
`;
  }

  startHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.validateAllServers();
      } catch (error) {
        console.error('❌ Health monitoring error:', error);
      }
    }, this.options.healthCheckInterval);
    
    console.log(`🔄 Health monitoring started (interval: ${this.options.healthCheckInterval}ms)`);
  }

  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('⏹️ Health monitoring stopped');
    }
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.options.reportsPath, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create reports directory:', error);
    }
  }

  shouldBlockMerge() {
    // Check if any critical servers are in DOWN_CRITICAL state
    for (const [serverName, state] of this.serverStates) {
      const server = this.servers.find(s => s.name === serverName);
      if (server.critical && state.state === HEALTH_STATES.DOWN_CRITICAL) {
        return true;
      }
    }
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    this.stopHealthMonitoring();
    this.removeAllListeners();
    console.log('✅ Enhanced MCP Validator closed');
  }
}

module.exports = { 
  EnhancedMCPValidatorV2, 
  FAILURE_TYPES, 
  HEALTH_STATES 
};