/**
 * Provider Health Monitor
 * Tracks provider availability, performance, and error rates
 * Integrates with PostgreSQL for persistent health data
 */

const postgresClient = require('../database/postgres-client');

/**
 * Provider Health Monitor Class
 */
class ProviderHealthMonitor {
  constructor() {
    this.healthCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize health monitor
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Load health data from PostgreSQL if available
    try {
      if (postgresClient.getConnectionStatus()) {
        const healthData = await postgresClient.providers.getAllHealth();
        
        for (const data of healthData) {
          this.healthCache.set(data.provider, {
            isAvailable: data.isAvailable,
            lastCheckAt: data.lastCheckAt,
            responseTimeMs: data.responseTimeMs,
            errorCount: data.errorCount,
            lastError: data.lastError,
            lastErrorAt: data.lastErrorAt,
            requestCount: data.requestCount,
            successCount: data.successCount,
            failureCount: data.failureCount,
            averageLatency: data.responseTimeMs || 0,
          });
        }

        console.log(`📊 Loaded health data for ${healthData.length} providers from PostgreSQL`);
      }
    } catch (error) {
      console.warn('⚠️  Could not load provider health from PostgreSQL:', error.message);
      // Continue with empty cache
    }

    this.initialized = true;
  }

  /**
   * Check provider health
   * @param {string} providerKey - Provider identifier
   * @param {Object} provider - Provider instance
   * @returns {Promise<boolean>} Is provider healthy
   */
  async checkHealth(providerKey, provider) {
    const startTime = Date.now();
    let isHealthy = false;
    let error = null;

    try {
      // Check if provider is available
      isHealthy = provider.isAvailable && provider.isAvailable();
      
      // If available, try a simple test request
      if (isHealthy) {
        try {
          // Simple ping-like test
          await provider.generateCompletion([
            { role: 'user', content: 'test' }
          ], { maxTokens: 5 });
          isHealthy = true;
        } catch (testError) {
          isHealthy = false;
          error = testError.message;
        }
      }
    } catch (err) {
      isHealthy = false;
      error = err.message;
    }

    const responseTimeMs = Date.now() - startTime;

    // Update health status
    await this.updateHealth(providerKey, {
      isAvailable: isHealthy,
      responseTimeMs,
      error,
    });

    return isHealthy;
  }

  /**
   * Update provider health status
   * @param {string} providerKey - Provider identifier
   * @param {Object} status - Health status
   */
  async updateHealth(providerKey, status) {
    // Get current health data
    const currentHealth = this.healthCache.get(providerKey) || {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      totalLatency: 0,
    };

    // Update metrics
    currentHealth.isAvailable = status.isAvailable;
    currentHealth.lastCheckAt = new Date();
    currentHealth.requestCount++;

    if (status.isAvailable) {
      currentHealth.successCount++;
    } else {
      currentHealth.failureCount++;
      currentHealth.lastError = status.error;
      currentHealth.lastErrorAt = new Date();
      currentHealth.errorCount = (currentHealth.errorCount || 0) + 1;
    }

    // Update latency
    if (status.responseTimeMs) {
      currentHealth.responseTimeMs = status.responseTimeMs;
      currentHealth.totalLatency = (currentHealth.totalLatency || 0) + status.responseTimeMs;
      currentHealth.averageLatency = currentHealth.totalLatency / currentHealth.requestCount;
    }

    // Update cache
    this.healthCache.set(providerKey, currentHealth);

    // Persist to PostgreSQL if available
    try {
      if (postgresClient.getConnectionStatus()) {
        await postgresClient.providers.updateHealth(providerKey, currentHealth);
      }
    } catch (error) {
      console.warn(`⚠️  Could not persist health data for ${providerKey}:`, error.message);
      // Continue without persistence
    }
  }

  /**
   * Get provider health status
   * @param {string} providerKey - Provider identifier
   * @returns {Promise<Object>} Health status
   */
  async getHealth(providerKey) {
    // Try cache first
    if (this.healthCache.has(providerKey)) {
      return this.healthCache.get(providerKey);
    }

    // Try PostgreSQL
    try {
      if (postgresClient.getConnectionStatus()) {
        const health = await postgresClient.providers.getProviderHealth(providerKey);
        if (health) {
          const healthData = {
            isAvailable: health.isAvailable,
            lastCheckAt: health.lastCheckAt,
            responseTimeMs: health.responseTimeMs,
            errorCount: health.errorCount,
            lastError: health.lastError,
            lastErrorAt: health.lastErrorAt,
            requestCount: health.requestCount,
            successCount: health.successCount,
            failureCount: health.failureCount,
            averageLatency: health.responseTimeMs || 0,
          };
          this.healthCache.set(providerKey, healthData);
          return healthData;
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not fetch health data for ${providerKey}:`, error.message);
    }

    // Return default health if not found
    return {
      isAvailable: true, // Assume healthy until proven otherwise
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      errorCount: 0,
      averageLatency: 0,
    };
  }

  /**
   * Check if provider is healthy
   * @param {string} providerKey - Provider identifier
   * @returns {Promise<boolean>} Is provider healthy
   */
  async isHealthy(providerKey) {
    const health = await this.getHealth(providerKey);
    
    // Provider is healthy if:
    // 1. It's marked as available
    // 2. Error rate is below 50%
    // 3. Last check was successful or within acceptable time window
    const errorRate = health.requestCount > 0 
      ? health.failureCount / health.requestCount 
      : 0;

    const isRecentlyChecked = health.lastCheckAt && 
      (Date.now() - new Date(health.lastCheckAt).getTime() < 300000); // 5 minutes

    return health.isAvailable && 
           errorRate < 0.5 && 
           (isRecentlyChecked || health.requestCount === 0);
  }

  /**
   * Get health summary for all providers
   * @returns {Promise<Object>} Health summary
   */
  async getHealthSummary() {
    const summary = {
      totalProviders: this.healthCache.size,
      healthyProviders: 0,
      unhealthyProviders: 0,
      providers: {},
    };

    for (const [providerKey, health] of this.healthCache) {
      const isHealthy = await this.isHealthy(providerKey);
      
      if (isHealthy) {
        summary.healthyProviders++;
      } else {
        summary.unhealthyProviders++;
      }

      summary.providers[providerKey] = {
        ...health,
        isHealthy,
        successRate: health.requestCount > 0 
          ? (health.successCount / health.requestCount * 100).toFixed(2) + '%'
          : 'N/A',
      };
    }

    return summary;
  }

  /**
   * Reset health data for a provider
   * @param {string} providerKey - Provider identifier
   */
  async resetHealth(providerKey) {
    this.healthCache.delete(providerKey);
    
    try {
      if (postgresClient.getConnectionStatus()) {
        // Reset in database by setting default values
        await postgresClient.providers.updateHealth(providerKey, {
          isAvailable: true,
          responseTimeMs: 0,
          requestCount: 0,
          successCount: 0,
          failureCount: 0,
          errorCount: 0,
        });
      }
    } catch (error) {
      console.warn(`⚠️  Could not reset health data for ${providerKey}:`, error.message);
    }
  }

  /**
   * Record successful request
   * @param {string} providerKey - Provider identifier
   * @param {number} latencyMs - Request latency
   */
  async recordSuccess(providerKey, latencyMs) {
    await this.updateHealth(providerKey, {
      isAvailable: true,
      responseTimeMs: latencyMs,
    });
  }

  /**
   * Record failed request
   * @param {string} providerKey - Provider identifier
   * @param {string} error - Error message
   */
  async recordFailure(providerKey, error) {
    await this.updateHealth(providerKey, {
      isAvailable: false,
      error,
    });
  }
}

module.exports = ProviderHealthMonitor;
