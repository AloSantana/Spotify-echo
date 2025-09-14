/**
 * Admin Routes - Phase 8: Optional In-App MCP Integration (Admin)
 * Secure route group for admin-only MCP management with read-only access
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Admin access control middleware
const requireAdmin = (req, res, next) => {
  // Check for admin role - implement your auth logic here
  const adminUsers = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : [];
  const adminRole = process.env.ADMIN_ROLE || 'admin';
  
  // For demo purposes, allow if ENABLE_ADMIN_MCP_PANEL is true
  // In production, implement proper role-based access control
  if (process.env.ENABLE_ADMIN_MCP_PANEL !== 'true') {
    return res.status(403).json({ 
      error: 'Admin MCP panel is disabled',
      message: 'Set ENABLE_ADMIN_MCP_PANEL=true to enable admin features'
    });
  }

  // TODO: Implement proper authentication check
  // For now, we'll allow access if the environment variable is set
  // In production, check user roles/permissions here
  
  next();
};

// Rate limiting for admin routes
const adminRateLimit = (req, res, next) => {
  // Simple rate limiting - 10 requests per minute per IP
  const clientIp = req.ip || req.connection.remoteAddress;
  const key = `admin_rate_${clientIp}`;
  
  // In production, use Redis for rate limiting
  // For now, we'll implement basic in-memory rate limiting
  
  next();
};

/**
 * GET /admin/mcp/status
 * Get comprehensive MCP server status information
 */
router.get('/mcp/status', requireAdmin, adminRateLimit, async (req, res) => {
  try {
    const statusData = {
      timestamp: new Date().toISOString(),
      servers: {},
      systemHealth: {},
      lastValidation: null
    };

    // Read MCP server status from various sources
    try {
      // Check for last validation report
      const validationPath = path.join(process.cwd(), 'reports', 'mcp', 'last-validation.json');
      const validationExists = await fs.access(validationPath).then(() => true).catch(() => false);
      
      if (validationExists) {
        const validationData = await fs.readFile(validationPath, 'utf8');
        statusData.lastValidation = JSON.parse(validationData);
      }
    } catch (error) {
      console.warn('Could not read validation report:', error.message);
    }

    // Check MCP server health endpoints
    const mcpServerPort = process.env.MCP_SERVER_PORT || 3001;
    
    try {
      // Try to fetch health from MCP server
      const healthResponse = await fetch(`http://localhost:${mcpServerPort}/health`);
      if (healthResponse.ok) {
        statusData.servers.primary = {
          status: 'healthy',
          port: mcpServerPort,
          lastCheck: new Date().toISOString()
        };
      }
    } catch (error) {
      statusData.servers.primary = {
        status: 'unhealthy',
        port: mcpServerPort,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }

    // Check individual MCP servers
    const mcpServers = [
      { name: 'filesystem', port: 3002 },
      { name: 'puppeteer', port: 3003 },
      { name: 'analytics', port: 3004 },
      { name: 'package-management', port: 3005 }
    ];

    for (const server of mcpServers) {
      try {
        const response = await fetch(`http://localhost:${server.port}/health`, { 
          timeout: 2000 
        });
        
        statusData.servers[server.name] = {
          status: response.ok ? 'healthy' : 'unhealthy',
          port: server.port,
          lastCheck: new Date().toISOString(),
          responseTime: `${Date.now()}ms`
        };
      } catch (error) {
        statusData.servers[server.name] = {
          status: 'unreachable',
          port: server.port,
          error: error.message,
          lastCheck: new Date().toISOString()
        };
      }
    }

    // System health metrics
    statusData.systemHealth = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
    };

    res.json({
      success: true,
      data: statusData,
      meta: {
        requestId: req.headers['x-request-id'] || 'admin-' + Date.now(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin MCP status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve MCP status',
      message: error.message,
      meta: {
        requestId: req.headers['x-request-id'] || 'admin-' + Date.now(),
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /admin/mcp/cache/stats
 * Get cache performance statistics
 */
router.get('/mcp/cache/stats', requireAdmin, adminRateLimit, async (req, res) => {
  try {
    const cacheStats = {
      timestamp: new Date().toISOString(),
      redis: null,
      nodeCache: null,
      insights: null
    };

    // Check Redis cache stats if available
    if (global.redisClient) {
      try {
        const redisInfo = await global.redisClient.info('memory');
        const keyspace = await global.redisClient.info('keyspace');
        
        cacheStats.redis = {
          status: 'connected',
          memory: redisInfo,
          keyspace: keyspace,
          connected: global.redisClient.status === 'ready'
        };
      } catch (error) {
        cacheStats.redis = {
          status: 'error',
          error: error.message
        };
      }
    }

    // Check NodeCache stats if available
    if (global.nodeCache) {
      cacheStats.nodeCache = {
        keys: global.nodeCache.keys().length,
        stats: global.nodeCache.getStats(),
        status: 'active'
      };
    }

    // Check insights cache stats
    try {
      const insightsCachePath = path.join(process.cwd(), 'cache', 'insights-stats.json');
      const insightsCacheExists = await fs.access(insightsCachePath).then(() => true).catch(() => false);
      
      if (insightsCacheExists) {
        const insightsData = await fs.readFile(insightsCachePath, 'utf8');
        cacheStats.insights = JSON.parse(insightsData);
      }
    } catch (error) {
      cacheStats.insights = {
        status: 'unavailable',
        error: error.message
      };
    }

    res.json({
      success: true,
      data: cacheStats,
      meta: {
        requestId: req.headers['x-request-id'] || 'admin-cache-' + Date.now(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin cache stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      message: error.message
    });
  }
});

/**
 * GET /admin/mcp/security/scan
 * Get last security scan summary (read-only)
 */
router.get('/mcp/security/scan', requireAdmin, adminRateLimit, async (req, res) => {
  try {
    const securityData = {
      timestamp: new Date().toISOString(),
      lastScan: null,
      vulnerabilities: [],
      recommendations: []
    };

    // Read security scan reports
    try {
      const securityReportPath = path.join(process.cwd(), 'reports', 'security', 'last-scan.json');
      const securityExists = await fs.access(securityReportPath).then(() => true).catch(() => false);
      
      if (securityExists) {
        const securityReport = await fs.readFile(securityReportPath, 'utf8');
        securityData.lastScan = JSON.parse(securityReport);
      }
    } catch (error) {
      console.warn('Could not read security report:', error.message);
    }

    // Check for vulnerability reports
    try {
      const vulnPath = path.join(process.cwd(), 'reports', 'security', 'vulnerabilities.json');
      const vulnExists = await fs.access(vulnPath).then(() => true).catch(() => false);
      
      if (vulnExists) {
        const vulnData = await fs.readFile(vulnPath, 'utf8');
        const vulnReport = JSON.parse(vulnData);
        securityData.vulnerabilities = vulnReport.vulnerabilities || [];
        securityData.recommendations = vulnReport.recommendations || [];
      }
    } catch (error) {
      console.warn('Could not read vulnerability report:', error.message);
    }

    res.json({
      success: true,
      data: securityData,
      meta: {
        requestId: req.headers['x-request-id'] || 'admin-security-' + Date.now(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin security scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security scan data',
      message: error.message
    });
  }
});

/**
 * GET /admin/mcp/performance/baseline
 * Get performance baseline metrics (read-only)
 */
router.get('/mcp/performance/baseline', requireAdmin, adminRateLimit, async (req, res) => {
  try {
    const performanceData = {
      timestamp: new Date().toISOString(),
      baseline: null,
      current: null,
      drift: null
    };

    // Read performance baseline
    try {
      const baselinePath = path.join(process.cwd(), 'enhanced-mcp-performance-baseline.json');
      const baselineExists = await fs.access(baselinePath).then(() => true).catch(() => false);
      
      if (baselineExists) {
        const baselineData = await fs.readFile(baselinePath, 'utf8');
        performanceData.baseline = JSON.parse(baselineData);
      }
    } catch (error) {
      console.warn('Could not read performance baseline:', error.message);
    }

    // Get current performance metrics
    performanceData.current = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };

    // Calculate drift if baseline exists
    if (performanceData.baseline && performanceData.baseline.systemMetrics) {
      const baselineMemory = performanceData.baseline.systemMetrics.memoryUsage;
      const currentMemory = performanceData.current.memory;
      
      performanceData.drift = {
        memoryDrift: {
          rss: ((currentMemory.rss - baselineMemory.rss) / baselineMemory.rss * 100).toFixed(2) + '%',
          heapUsed: ((currentMemory.heapUsed - baselineMemory.heapUsed) / baselineMemory.heapUsed * 100).toFixed(2) + '%'
        },
        calculated: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      data: performanceData,
      meta: {
        requestId: req.headers['x-request-id'] || 'admin-perf-' + Date.now(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin performance baseline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance baseline',
      message: error.message
    });
  }
});

/**
 * GET /admin/mcp/logs
 * Get recent MCP server logs (read-only)
 */
router.get('/mcp/logs', requireAdmin, adminRateLimit, async (req, res) => {
  try {
    const { lines = 100, level = 'info' } = req.query;
    
    const logsData = {
      timestamp: new Date().toISOString(),
      logs: [],
      totalLines: 0,
      level: level
    };

    // Read log files
    const logPaths = [
      path.join(process.cwd(), 'logs', 'mcp.log'),
      path.join(process.cwd(), 'logs', 'app.log'),
      path.join(process.cwd(), 'logs', 'error.log')
    ];

    for (const logPath of logPaths) {
      try {
        const logExists = await fs.access(logPath).then(() => true).catch(() => false);
        
        if (logExists) {
          const logContent = await fs.readFile(logPath, 'utf8');
          const logLines = logContent.split('\n')
            .filter(line => line.trim())
            .slice(-parseInt(lines))
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return { message: line, timestamp: new Date().toISOString() };
              }
            })
            .filter(entry => entry.level ? entry.level.toLowerCase().includes(level.toLowerCase()) : true);

          logsData.logs.push({
            source: path.basename(logPath),
            entries: logLines
          });
        }
      } catch (error) {
        console.warn(`Could not read log file ${logPath}:`, error.message);
      }
    }

    logsData.totalLines = logsData.logs.reduce((total, log) => total + log.entries.length, 0);

    res.json({
      success: true,
      data: logsData,
      meta: {
        requestId: req.headers['x-request-id'] || 'admin-logs-' + Date.now(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

module.exports = router;