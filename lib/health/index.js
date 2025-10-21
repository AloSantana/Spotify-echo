/**
 * Health Check System for Express Applications
 * 
 * Features:
 * - Liveness probe (/healthz) - Basic application health
 * - Readiness probe (/readyz) - Dependency health checks
 * - Detailed health status with dependency information
 * - Configurable timeout for health checks
 * - Integration with MongoDB, Redis, and Spotify API
 */

const logger = require('../logger');
const config = require('../config');

/**
 * Health check result interface
 */
class HealthCheckResult {
  constructor(name, status, message = '', details = {}) {
    this.name = name;
    this.status = status; // 'healthy', 'degraded', 'unhealthy'
    this.message = message;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  isHealthy() {
    return this.status === 'healthy';
  }
}

/**
 * Health check timeout wrapper
 */
async function withTimeout(promise, timeoutMs, name) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Health check timeout: ${name}`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Check MongoDB health
 */
async function checkMongoDBHealth(timeoutMs = 5000) {
  try {
    // Try to get MongoDB connection from global or require database manager
    let db = global.db;
    
    if (!db) {
      try {
        const databaseManager = require('../../src/database/database-manager');
        db = databaseManager.getMongoDatabase();
      } catch (error) {
        return new HealthCheckResult(
          'mongodb',
          'unhealthy',
          'MongoDB connection not available',
          { error: error.message }
        );
      }
    }
    
    if (!db) {
      return new HealthCheckResult(
        'mongodb',
        'unhealthy',
        'MongoDB not initialized'
      );
    }
    
    // Ping MongoDB with timeout
    await withTimeout(
      db.admin().ping(),
      timeoutMs,
      'MongoDB'
    );
    
    return new HealthCheckResult(
      'mongodb',
      'healthy',
      'MongoDB connection active',
      { database: db.databaseName }
    );
    
  } catch (error) {
    logger.error('MongoDB health check failed', { error: error.message });
    return new HealthCheckResult(
      'mongodb',
      'unhealthy',
      'MongoDB health check failed',
      { error: error.message }
    );
  }
}

/**
 * Check Redis health
 */
async function checkRedisHealth(timeoutMs = 5000) {
  try {
    // Try to get Redis manager
    const { getRedisManager } = require('../../src/utils/redis');
    const redisManager = getRedisManager();
    
    if (!redisManager || !redisManager.useRedis) {
      return new HealthCheckResult(
        'redis',
        'degraded',
        'Redis not configured, using in-memory fallback'
      );
    }
    
    // Ping Redis with timeout
    const result = await withTimeout(
      redisManager.ping(),
      timeoutMs,
      'Redis'
    );
    
    if (result === 'PONG') {
      return new HealthCheckResult(
        'redis',
        'healthy',
        'Redis connection active'
      );
    }
    
    return new HealthCheckResult(
      'redis',
      'degraded',
      'Redis ping returned unexpected result',
      { result }
    );
    
  } catch (error) {
    logger.warn('Redis health check failed', { error: error.message });
    return new HealthCheckResult(
      'redis',
      'degraded',
      'Redis unavailable, using fallback',
      { error: error.message }
    );
  }
}

/**
 * Check Spotify API health
 */
async function checkSpotifyAPIHealth(timeoutMs = 5000) {
  try {
    // Check if Spotify credentials are configured
    const clientId = config.spotify?.clientId || process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = config.spotify?.clientSecret || process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return new HealthCheckResult(
        'spotify',
        'unhealthy',
        'Spotify API credentials not configured'
      );
    }
    
    // Simple check - just verify credentials exist
    // Full API check would require making an actual request
    return new HealthCheckResult(
      'spotify',
      'healthy',
      'Spotify API credentials configured',
      {
        clientId: clientId.substring(0, 8) + '...',
        configured: true
      }
    );
    
  } catch (error) {
    logger.error('Spotify API health check failed', { error: error.message });
    return new HealthCheckResult(
      'spotify',
      'unhealthy',
      'Spotify API health check failed',
      { error: error.message }
    );
  }
}

/**
 * Perform all health checks
 */
async function performHealthChecks(options = {}) {
  const {
    checkMongoDB = true,
    checkRedis = true,
    checkSpotify = true,
    timeout = 5000
  } = options;
  
  const checks = [];
  
  if (checkMongoDB) {
    checks.push(checkMongoDBHealth(timeout));
  }
  
  if (checkRedis) {
    checks.push(checkRedisHealth(timeout));
  }
  
  if (checkSpotify) {
    checks.push(checkSpotifyAPIHealth(timeout));
  }
  
  const results = await Promise.all(checks);
  
  // Determine overall status
  const hasUnhealthy = results.some(r => r.status === 'unhealthy');
  const hasDegraded = results.some(r => r.status === 'degraded');
  
  let overallStatus = 'healthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  }
  
  return {
    status: overallStatus,
    checks: results,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };
}

/**
 * Liveness probe handler - Basic application health
 * Returns 200 if application is running
 */
function livenessProbe(req, res) {
  const health = {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
    memory: process.memoryUsage()
  };
  
  logger.debug('Liveness probe', health);
  res.status(200).json(health);
}

/**
 * Readiness probe handler - Dependency health checks
 * Returns 200 if ready to serve traffic, 503 if not ready
 */
async function readinessProbe(req, res) {
  try {
    const healthCheck = await performHealthChecks({
      checkMongoDB: true,
      checkRedis: true,
      checkSpotify: true,
      timeout: 3000 // Shorter timeout for readiness checks
    });
    
    // Determine HTTP status code
    let statusCode = 200;
    if (healthCheck.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (healthCheck.status === 'degraded') {
      statusCode = 200; // Still ready, but degraded
    }
    
    logger.debug('Readiness probe', {
      status: healthCheck.status,
      statusCode
    });
    
    res.status(statusCode).json(healthCheck);
    
  } catch (error) {
    logger.error('Readiness probe failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Detailed health endpoint - Full health status with all dependencies
 */
async function detailedHealth(req, res) {
  try {
    const healthCheck = await performHealthChecks({
      checkMongoDB: true,
      checkRedis: true,
      checkSpotify: true,
      timeout: 5000
    });
    
    // Add system information
    healthCheck.system = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
    
    // Add environment info (safe subset)
    healthCheck.environment = {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: config.server?.port || process.env.PORT,
      hostname: require('os').hostname()
    };
    
    let statusCode = 200;
    if (healthCheck.status === 'unhealthy') {
      statusCode = 503;
    }
    
    logger.info('Detailed health check', {
      status: healthCheck.status,
      checks: healthCheck.checks.length
    });
    
    res.status(statusCode).json(healthCheck);
    
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Register health check routes
 */
function registerHealthRoutes(app) {
  // Liveness probe - lightweight check
  app.get('/healthz', livenessProbe);
  app.get('/health/live', livenessProbe);
  
  // Readiness probe - dependency checks
  app.get('/readyz', readinessProbe);
  app.get('/health/ready', readinessProbe);
  
  // Detailed health status
  app.get('/health', detailedHealth);
  app.get('/health/detailed', detailedHealth);
  
  logger.info('Health check routes registered', {
    routes: ['/healthz', '/readyz', '/health']
  });
}

module.exports = {
  registerHealthRoutes,
  performHealthChecks,
  livenessProbe,
  readinessProbe,
  detailedHealth,
  HealthCheckResult,
  // Individual health checks for custom use
  checkMongoDBHealth,
  checkRedisHealth,
  checkSpotifyAPIHealth
};
