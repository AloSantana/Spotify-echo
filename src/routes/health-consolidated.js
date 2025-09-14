/**
 * Consolidated Health Check Routes
 * Phase 5B: Extracted from server.js for modular health monitoring
 * Provides comprehensive health endpoints for infrastructure monitoring
 */

const express = require('express');
const router = express.Router();

/**
 * Configure health check routes
 * @param {Express} app - Express application instance
 */
function configureHealthRoutes(app) {
  // Enhanced health check endpoints
  const HealthCheckSystem = require('../utils/health-check');
  const healthChecker = new HealthCheckSystem();

  // Comprehensive health check endpoint (bypass rate limiting)
  app.get('/health', async (req, res) => {
    try {
      const healthReport = await healthChecker.runAllChecks();

      // For production deployment health checks, only fail on critical errors
      // Warnings and missing optional services should not cause 503s
      const hasCriticalErrors = Object.values(healthReport.checks).some(
        (check) => check.status === 'unhealthy' && !check.optional
      );

      const statusCode = hasCriticalErrors ? 503 : 200;
      res.status(statusCode).json(healthReport);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check system failure',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Cache health endpoint
  app.get('/health/cache', async (req, res) => {
    try {
      const RecommendationCache = require('../cache/RecommendationCache');
      const cache = new RecommendationCache();
      
      // Try to initialize cache if not already done
      try {
        await cache.initialize();
      } catch (error) {
        // Cache might already be initialized or in fallback mode
      }
      
      const health = cache.getHealth();
      const metrics = cache.getMetrics();
      
      // Add rec_cache_fallback_total metric
      if (health.fallbackActive) {
        // Increment fallback metric (would typically be tracked by Prometheus)
        console.log('Cache fallback active - incrementing rec_cache_fallback_total metric');
      }
      
      const response = {
        status: health.status,
        connected: health.redis.connected,
        hitRatio: metrics.hitRate,
        fallbackActive: health.fallbackActive,
        metrics: {
          totalRequests: metrics.totalRequests,
          hits: metrics.hits,
          misses: metrics.misses,
          redisHits: metrics.redisHits,
          memoryHits: metrics.memoryHits,
          errors: metrics.errors,
          memoryCacheSize: metrics.memoryCacheSize
        },
        redis: health.redis,
        memory: health.memory,
        timestamp: new Date().toISOString()
      };
      
      const statusCode = health.status === 'HEALTHY' ? 200 : 
                        health.status === 'DEGRADED' ? 200 : 503;
      
      res.status(statusCode).json(response);
      
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        connected: false,
        hitRatio: '0.00%',
        fallbackActive: true,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Individual health check endpoints
  app.get('/health/:check', async (req, res) => {
    try {
      const checkName = req.params.check;
      const result = await healthChecker.runCheck(checkName);

      const statusCode = result.status === 'healthy' ? 200 : result.status === 'warning' ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(404).json({
        error: 'Invalid health check',
        message: error.message,
        availableChecks: Array.from(healthChecker.checks.keys()),
      });
    }
  });

  console.log('🏥 Health check routes configured');
}

module.exports = {
  configureHealthRoutes,
};