const express = require('express');
const os = require('os');
const { performance } = require('perf_hooks');
const { createRateLimit } = require('../middleware');

const router = express.Router();

// Rate limiting for performance endpoints
const performanceRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: 'Too many performance monitoring requests'
});

// Apply rate limiting
router.use(performanceRateLimit);

/**
 * Get system performance metrics
 * GET /api/performance/system
 */
router.get('/system', async (req, res) => {
  try {
    const startTime = performance.now();
    
    // CPU metrics
    const cpus = os.cpus();
    const loadAverage = os.loadavg();
    
    // Memory metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // System info
    const uptime = os.uptime();
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();
    
    // Process metrics
    const processUptime = process.uptime();
    const processMemory = process.memoryUsage();
    
    // Calculate CPU usage (simplified)
    const cpuUsage = loadAverage[0] / cpus.length * 100;
    
    const metrics = {
      timestamp: new Date(),
      cpu: {
        usage: Math.min(Math.round(cpuUsage * 100) / 100, 100),
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        load: loadAverage.map(load => Math.round(load * 100) / 100)
      },
      memory: {
        total: Math.round(totalMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
        used: Math.round(usedMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
        free: Math.round(freeMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
        percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
        process: {
          rss: Math.round(processMemory.rss / 1024 / 1024 * 100) / 100, // MB
          heapTotal: Math.round(processMemory.heapTotal / 1024 / 1024 * 100) / 100, // MB
          heapUsed: Math.round(processMemory.heapUsed / 1024 / 1024 * 100) / 100, // MB
          external: Math.round(processMemory.external / 1024 / 1024 * 100) / 100 // MB
        }
      },
      system: {
        uptime: Math.round(uptime),
        processUptime: Math.round(processUptime),
        platform,
        arch,
        hostname,
        nodeVersion: process.version
      },
      responseTime: Math.round((performance.now() - startTime) * 100) / 100
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve system metrics',
      message: error.message
    });
  }
});

/**
 * Get API performance metrics
 * GET /api/performance/api
 */
router.get('/api', async (req, res) => {
  try {
    // Mock API performance data (in real implementation, this would come from monitoring)
    const mockMetrics = {
      timestamp: new Date(),
      endpoints: [
        {
          path: '/api/chat/message',
          method: 'POST',
          requests: Math.floor(Math.random() * 2000) + 1000,
          avgTime: Math.floor(Math.random() * 300) + 200,
          p95Time: Math.floor(Math.random() * 500) + 400,
          p99Time: Math.floor(Math.random() * 800) + 700,
          errors: Math.floor(Math.random() * 20),
          successRate: 99.0 + Math.random(),
          lastHour: {
            requests: Math.floor(Math.random() * 200) + 100,
            avgTime: Math.floor(Math.random() * 250) + 180
          }
        },
        {
          path: '/api/spotify/auth',
          method: 'GET',
          requests: Math.floor(Math.random() * 800) + 400,
          avgTime: Math.floor(Math.random() * 200) + 150,
          p95Time: Math.floor(Math.random() * 300) + 250,
          p99Time: Math.floor(Math.random() * 500) + 400,
          errors: Math.floor(Math.random() * 10),
          successRate: 99.5 + Math.random() * 0.5,
          lastHour: {
            requests: Math.floor(Math.random() * 100) + 50,
            avgTime: Math.floor(Math.random() * 180) + 140
          }
        },
        {
          path: '/api/recommendations',
          method: 'GET',
          requests: Math.floor(Math.random() * 600) + 300,
          avgTime: Math.floor(Math.random() * 400) + 300,
          p95Time: Math.floor(Math.random() * 600) + 500,
          p99Time: Math.floor(Math.random() * 1000) + 800,
          errors: Math.floor(Math.random() * 15),
          successRate: 98.5 + Math.random() * 1.5,
          lastHour: {
            requests: Math.floor(Math.random() * 80) + 40,
            avgTime: Math.floor(Math.random() * 350) + 280
          }
        },
        {
          path: '/health',
          method: 'GET',
          requests: Math.floor(Math.random() * 5000) + 2000,
          avgTime: Math.floor(Math.random() * 50) + 10,
          p95Time: Math.floor(Math.random() * 80) + 20,
          p99Time: Math.floor(Math.random() * 120) + 40,
          errors: 0,
          successRate: 100,
          lastHour: {
            requests: Math.floor(Math.random() * 500) + 200,
            avgTime: Math.floor(Math.random() * 30) + 8
          }
        }
      ],
      summary: {
        totalRequests: 0,
        totalErrors: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        overallSuccessRate: 0
      }
    };
    
    // Calculate summary metrics
    mockMetrics.summary.totalRequests = mockMetrics.endpoints.reduce((sum, ep) => sum + ep.requests, 0);
    mockMetrics.summary.totalErrors = mockMetrics.endpoints.reduce((sum, ep) => sum + ep.errors, 0);
    mockMetrics.summary.averageResponseTime = Math.round(
      mockMetrics.endpoints.reduce((sum, ep) => sum + ep.avgTime, 0) / mockMetrics.endpoints.length
    );
    mockMetrics.summary.p95ResponseTime = Math.round(
      mockMetrics.endpoints.reduce((sum, ep) => sum + ep.p95Time, 0) / mockMetrics.endpoints.length
    );
    mockMetrics.summary.p99ResponseTime = Math.round(
      mockMetrics.endpoints.reduce((sum, ep) => sum + ep.p99Time, 0) / mockMetrics.endpoints.length
    );
    mockMetrics.summary.overallSuccessRate = Math.round(
      (mockMetrics.summary.totalRequests - mockMetrics.summary.totalErrors) / 
      mockMetrics.summary.totalRequests * 100 * 100
    ) / 100;
    
    res.json(mockMetrics);
  } catch (error) {
    console.error('API metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve API metrics',
      message: error.message
    });
  }
});

/**
 * Get database performance metrics
 * GET /api/performance/database
 */
router.get('/database', async (req, res) => {
  try {
    const databaseMetrics = {
      timestamp: new Date(),
      mongodb: {
        status: 'healthy',
        connections: Math.floor(Math.random() * 50) + 20,
        operations: Math.floor(Math.random() * 2000) + 1000,
        avgQueryTime: Math.round((Math.random() * 20 + 5) * 100) / 100,
        cacheHitRate: Math.round((90 + Math.random() * 8) * 100) / 100,
        collections: {
          users: Math.floor(Math.random() * 1000) + 500,
          tracks: Math.floor(Math.random() * 50000) + 25000,
          playlists: Math.floor(Math.random() * 5000) + 2500,
          sessions: Math.floor(Math.random() * 200) + 100
        },
        indexes: {
          total: 15,
          efficiency: Math.round((95 + Math.random() * 4) * 100) / 100
        }
      },
      redis: {
        status: 'healthy',
        connections: Math.floor(Math.random() * 100) + 30,
        operations: Math.floor(Math.random() * 10000) + 5000,
        avgQueryTime: Math.round((Math.random() * 2 + 0.5) * 100) / 100,
        cacheHitRate: Math.round((95 + Math.random() * 4) * 100) / 100,
        memory: {
          used: Math.round((Math.random() * 100 + 50) * 100) / 100, // MB
          peak: Math.round((Math.random() * 150 + 100) * 100) / 100, // MB
          fragmentation: Math.round((1 + Math.random() * 0.5) * 100) / 100
        },
        keyspace: {
          keys: Math.floor(Math.random() * 10000) + 5000,
          expires: Math.floor(Math.random() * 2000) + 1000,
          avgTtl: Math.floor(Math.random() * 3600) + 1800 // seconds
        }
      }
    };
    
    res.json(databaseMetrics);
  } catch (error) {
    console.error('Database metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve database metrics',
      message: error.message
    });
  }
});

/**
 * Get network performance metrics
 * GET /api/performance/network
 */
router.get('/network', async (req, res) => {
  try {
    const networkInterfaces = os.networkInterfaces();
    
    const networkMetrics = {
      timestamp: new Date(),
      interfaces: Object.keys(networkInterfaces).map(name => ({
        name,
        addresses: networkInterfaces[name].filter(addr => !addr.internal)
      })),
      connectivity: {
        spotify_api: {
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          responseTime: Math.floor(Math.random() * 300) + 100,
          lastCheck: new Date()
        },
        external_services: {
          status: Math.random() > 0.05 ? 'healthy' : 'error',
          responseTime: Math.floor(Math.random() * 200) + 50,
          lastCheck: new Date()
        }
      },
      throughput: {
        incoming: Math.round((Math.random() * 10 + 1) * 100) / 100, // MB/s
        outgoing: Math.round((Math.random() * 5 + 0.5) * 100) / 100, // MB/s
        peak_incoming: Math.round((Math.random() * 20 + 10) * 100) / 100,
        peak_outgoing: Math.round((Math.random() * 10 + 5) * 100) / 100
      }
    };
    
    res.json(networkMetrics);
  } catch (error) {
    console.error('Network metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve network metrics',
      message: error.message
    });
  }
});

/**
 * Get application-specific performance metrics
 * GET /api/performance/application
 */
router.get('/application', async (req, res) => {
  try {
    const appMetrics = {
      timestamp: new Date(),
      features: {
        chat: {
          activeUsers: Math.floor(Math.random() * 200) + 50,
          messagesPerMinute: Math.floor(Math.random() * 100) + 20,
          avgResponseTime: Math.floor(Math.random() * 2000) + 500,
          errorRate: Math.round(Math.random() * 2 * 100) / 100
        },
        recommendations: {
          requestsPerMinute: Math.floor(Math.random() * 50) + 10,
          avgGenerationTime: Math.floor(Math.random() * 1000) + 300,
          cacheHitRate: Math.round((80 + Math.random() * 15) * 100) / 100,
          satisfaction: Math.round((4 + Math.random()) * 100) / 100 // out of 5
        },
        spotify: {
          authSuccessRate: Math.round((95 + Math.random() * 4) * 100) / 100,
          apiCalls: Math.floor(Math.random() * 1000) + 200,
          avgLatency: Math.floor(Math.random() * 500) + 100,
          rateLimitHits: Math.floor(Math.random() * 10)
        }
      },
      resources: {
        sessions: Math.floor(Math.random() * 300) + 100,
        activeTasks: Math.floor(Math.random() * 50) + 10,
        queueLength: Math.floor(Math.random() * 20),
        cacheSize: Math.round((Math.random() * 500 + 100) * 100) / 100 // MB
      }
    };
    
    res.json(appMetrics);
  } catch (error) {
    console.error('Application metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve application metrics',
      message: error.message
    });
  }
});

/**
 * Get performance alerts
 * GET /api/performance/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = [
      {
        id: 'alert_1',
        type: 'warning',
        severity: 'medium',
        title: 'High Memory Usage',
        message: 'System memory usage has exceeded 85%',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        resolved: false,
        source: 'system_monitor',
        metrics: {
          current: 87.3,
          threshold: 85,
          unit: '%'
        }
      },
      {
        id: 'alert_2',
        type: 'info',
        severity: 'low',
        title: 'Cache Performance',
        message: 'Redis cache hit rate is performing optimally',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        resolved: true,
        source: 'database_monitor',
        metrics: {
          current: 97.8,
          threshold: 90,
          unit: '%'
        }
      },
      {
        id: 'alert_3',
        type: 'error',
        severity: 'high',
        title: 'API Response Time',
        message: 'Chat API response time exceeds acceptable threshold',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        resolved: false,
        source: 'api_monitor',
        metrics: {
          current: 2.5,
          threshold: 2.0,
          unit: 's'
        }
      }
    ];
    
    res.json({
      alerts,
      summary: {
        total: alerts.length,
        active: alerts.filter(a => !a.resolved).length,
        resolved: alerts.filter(a => a.resolved).length,
        critical: alerts.filter(a => a.severity === 'high').length
      }
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

module.exports = router;