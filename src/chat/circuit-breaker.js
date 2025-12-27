/**
 * Circuit Breaker Pattern Implementation for LLM Provider Failover
 * 
 * Implements the circuit breaker pattern to handle provider failures gracefully
 * and automatically route requests to healthy providers.
 * 
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Provider is failing, requests are blocked
 * - HALF_OPEN: Testing if provider has recovered
 * 
 * Research-derived from Perplexity sweep 2025-08-16 (M2 Context-Aware Conversations)
 */

const EventEmitter = require('events');

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

/**
 * Circuit Breaker Configuration
 */
const DEFAULT_CONFIG = {
  failureThreshold: 5,        // Number of failures before opening circuit
  successThreshold: 3,        // Number of successes in HALF_OPEN to close circuit
  timeout: 30000,             // Time in ms before attempting recovery (30 seconds)
  monitoringWindow: 60000,    // Time window for failure counting (1 minute)
  halfOpenMaxRequests: 3,     // Max requests allowed in HALF_OPEN state
  volumeThreshold: 10,        // Minimum requests before circuit can open
  errorRateThreshold: 0.5,    // Error rate threshold (50%)
};

/**
 * Circuit Breaker Class
 * Manages the state and behavior of a circuit breaker for a single provider
 */
class CircuitBreaker extends EventEmitter {
  constructor(providerKey, config = {}) {
    super();
    this.providerKey = providerKey;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.halfOpenRequests = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.openedAt = null;
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastStateChange: new Date(),
      stateHistory: [],
    };
  }

  /**
   * Get current circuit state
   * @returns {string} Current state
   */
  getState() {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.shouldAttemptRecovery()) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }
    return this.state;
  }

  /**
   * Check if circuit allows requests
   * @returns {boolean} True if requests are allowed
   */
  isAllowed() {
    const state = this.getState();
    
    if (state === CircuitState.CLOSED) {
      return true;
    }
    
    if (state === CircuitState.OPEN) {
      return false;
    }
    
    // HALF_OPEN: Allow limited requests for testing
    if (state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequests < this.config.halfOpenMaxRequests) {
        this.halfOpenRequests++;
        return true;
      }
      return false;
    }
    
    return true;
  }

  /**
   * Record a successful request
   * @param {number} latencyMs - Request latency in milliseconds
   */
  recordSuccess(latencyMs = 0) {
    this.stats.totalRequests++;
    this.stats.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    
    const state = this.getState();
    
    if (state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (state === CircuitState.CLOSED) {
      // Clean up old failures outside monitoring window
      this.pruneFailures();
    }
    
    this.emit('success', {
      provider: this.providerKey,
      latencyMs,
      state: this.state,
    });
  }

  /**
   * Record a failed request
   * @param {Error|string} error - The error that occurred
   */
  recordFailure(error) {
    this.stats.totalRequests++;
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();
    
    const state = this.getState();
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN opens the circuit again
      this.transitionTo(CircuitState.OPEN);
    } else if (state === CircuitState.CLOSED) {
      // Track failure
      this.failures.push({
        timestamp: Date.now(),
        error: errorMessage,
      });
      
      // Prune old failures and check if we should open
      this.pruneFailures();
      
      if (this.shouldOpen()) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
    
    this.emit('failure', {
      provider: this.providerKey,
      error: errorMessage,
      state: this.state,
      failureCount: this.failures.length,
    });
  }

  /**
   * Check if circuit should open based on failure rate
   * Uses failures within the monitoring window for consistent time-based evaluation
   * @returns {boolean} True if circuit should open
   */
  shouldOpen() {
    // Prune failures first to ensure we're working with recent data
    this.pruneFailures();
    
    const recentFailures = this.failures.length;
    
    // Need minimum volume of recent failures before considering opening
    // This prevents opening on sporadic failures
    if (recentFailures < this.config.volumeThreshold) {
      return false;
    }
    
    // Check failure threshold - if we have enough recent failures, open the circuit
    if (recentFailures >= this.config.failureThreshold) {
      return true;
    }
    
    // Calculate error rate based on total requests
    // Note: This is a secondary check - primary is the failure count threshold
    const errorRate = this.stats.totalRequests > 0 
      ? this.stats.totalFailures / this.stats.totalRequests 
      : 0;
    if (errorRate >= this.config.errorRateThreshold && recentFailures > 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if we should attempt recovery (OPEN -> HALF_OPEN)
   * @returns {boolean} True if recovery should be attempted
   */
  shouldAttemptRecovery() {
    if (!this.openedAt) {
      return false;
    }
    
    const timeSinceOpen = Date.now() - this.openedAt;
    return timeSinceOpen >= this.config.timeout;
  }

  /**
   * Remove failures outside the monitoring window
   */
  pruneFailures() {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }

  /**
   * Transition to a new state
   * @param {string} newState - The new state
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stats.lastStateChange = new Date();
    this.stats.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: new Date(),
    });
    
    // Keep only last 10 state changes
    if (this.stats.stateHistory.length > 10) {
      this.stats.stateHistory.shift();
    }
    
    if (newState === CircuitState.OPEN) {
      this.openedAt = Date.now();
      this.successes = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenRequests = 0;
      this.successes = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.openedAt = null;
      this.failures = [];
      this.successes = 0;
      this.halfOpenRequests = 0;
    }
    
    this.emit('stateChange', {
      provider: this.providerKey,
      from: oldState,
      to: newState,
      timestamp: new Date(),
    });
    
    console.log(`🔌 Circuit breaker [${this.providerKey}]: ${oldState} → ${newState}`);
  }

  /**
   * Force circuit to open (for testing or manual intervention)
   */
  forceOpen() {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Force circuit to close (for testing or manual reset)
   */
  forceClose() {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      provider: this.providerKey,
      state: this.getState(),
      totalRequests: this.stats.totalRequests,
      totalSuccesses: this.stats.totalSuccesses,
      totalFailures: this.stats.totalFailures,
      successRate: this.stats.totalRequests > 0
        ? ((this.stats.totalSuccesses / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : 'N/A',
      recentFailures: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.stats.lastStateChange,
      openedAt: this.openedAt,
      config: this.config,
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.halfOpenRequests = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.openedAt = null;
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastStateChange: new Date(),
      stateHistory: [],
    };
    
    this.emit('reset', { provider: this.providerKey });
    console.log(`🔄 Circuit breaker [${this.providerKey}]: Reset to initial state`);
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different providers
 */
class CircuitBreakerManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.breakers = new Map();
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get or create a circuit breaker for a provider
   * @param {string} providerKey - Provider identifier
   * @param {Object} config - Optional config override
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  getBreaker(providerKey, config = {}) {
    if (!this.breakers.has(providerKey)) {
      const breaker = new CircuitBreaker(providerKey, {
        ...this.defaultConfig,
        ...config,
      });
      
      // Forward events
      breaker.on('stateChange', (data) => this.emit('stateChange', data));
      breaker.on('failure', (data) => this.emit('failure', data));
      breaker.on('success', (data) => this.emit('success', data));
      
      this.breakers.set(providerKey, breaker);
    }
    
    return this.breakers.get(providerKey);
  }

  /**
   * Check if a provider is available
   * @param {string} providerKey - Provider identifier
   * @returns {boolean} True if provider is available
   */
  isAvailable(providerKey) {
    const breaker = this.getBreaker(providerKey);
    return breaker.isAllowed();
  }

  /**
   * Record success for a provider
   * @param {string} providerKey - Provider identifier
   * @param {number} latencyMs - Request latency
   */
  recordSuccess(providerKey, latencyMs = 0) {
    const breaker = this.getBreaker(providerKey);
    breaker.recordSuccess(latencyMs);
  }

  /**
   * Record failure for a provider
   * @param {string} providerKey - Provider identifier
   * @param {Error|string} error - The error
   */
  recordFailure(providerKey, error) {
    const breaker = this.getBreaker(providerKey);
    breaker.recordFailure(error);
  }

  /**
   * Get all available providers (circuits not open)
   * @param {string[]} providers - List of provider keys to check
   * @returns {string[]} Available providers
   */
  getAvailableProviders(providers) {
    return providers.filter(provider => this.isAvailable(provider));
  }

  /**
   * Select best provider based on circuit state and health
   * @param {string[]} providers - List of provider keys
   * @param {Object} healthData - Optional health data from ProviderHealthMonitor
   * @returns {string|null} Best provider or null if none available
   */
  selectBestProvider(providers, healthData = {}) {
    const available = this.getAvailableProviders(providers);
    
    if (available.length === 0) {
      return null;
    }
    
    if (available.length === 1) {
      return available[0];
    }
    
    // Sort by success rate and latency if health data available
    return available.sort((a, b) => {
      const breakerA = this.getBreaker(a);
      const breakerB = this.getBreaker(b);
      
      const statsA = breakerA.getStats();
      const statsB = breakerB.getStats();
      
      // Prefer providers with better success rates
      const rateA = statsA.totalRequests > 0 
        ? statsA.totalSuccesses / statsA.totalRequests 
        : 1;
      const rateB = statsB.totalRequests > 0 
        ? statsB.totalSuccesses / statsB.totalRequests 
        : 1;
      
      // If rates are similar, prefer lower latency
      if (Math.abs(rateA - rateB) < 0.1) {
        const latencyA = healthData[a]?.averageLatency || 0;
        const latencyB = healthData[b]?.averageLatency || 0;
        return latencyA - latencyB;
      }
      
      return rateB - rateA;
    })[0];
  }

  /**
   * Get summary of all circuit breakers
   * @returns {Object} Summary
   */
  getSummary() {
    const summary = {
      totalBreakers: this.breakers.size,
      closedCount: 0,
      openCount: 0,
      halfOpenCount: 0,
      breakers: {},
    };
    
    for (const [key, breaker] of this.breakers) {
      const state = breaker.getState();
      const stats = breaker.getStats();
      
      summary.breakers[key] = stats;
      
      if (state === CircuitState.CLOSED) {
        summary.closedCount++;
      } else if (state === CircuitState.OPEN) {
        summary.openCount++;
      } else {
        summary.halfOpenCount++;
      }
    }
    
    return summary;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Reset a specific circuit breaker
   * @param {string} providerKey - Provider identifier
   */
  reset(providerKey) {
    if (this.breakers.has(providerKey)) {
      this.breakers.get(providerKey).reset();
    }
  }
}

// Singleton instance
let managerInstance = null;

/**
 * Get the singleton CircuitBreakerManager instance
 * @param {Object} config - Optional configuration
 * @returns {CircuitBreakerManager}
 */
function getCircuitBreakerManager(config = {}) {
  if (!managerInstance) {
    managerInstance = new CircuitBreakerManager(config);
    console.log('🔌 Circuit Breaker Manager initialized');
  }
  return managerInstance;
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  getCircuitBreakerManager,
  DEFAULT_CONFIG,
};
