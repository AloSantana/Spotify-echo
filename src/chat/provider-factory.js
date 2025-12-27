/**
 * AI Provider Factory
 * Centralized provider management with health monitoring, failover, and load balancing
 */

// Import all providers
const GeminiProvider = require('./llm-providers/gemini-provider');
const OpenAIProvider = require('./llm-providers/openai-provider');
const OpenRouterProvider = require('./llm-providers/openrouter-provider');
const AnthropicProvider = require('./llm-providers/anthropic-provider');
const MockProvider = require('./llm-providers/mock-provider');

// Provider health monitoring
const ProviderHealthMonitor = require('./provider-health-monitor');

// Circuit breaker for failover (research-derived from Perplexity sweep 2025-08-16)
const { getCircuitBreakerManager, CircuitState } = require('./circuit-breaker');

/**
 * Provider Registry
 * Maps provider names to their classes and configuration
 */
const PROVIDER_REGISTRY = {
  gemini: {
    class: GeminiProvider,
    name: 'Google Gemini',
    requiresKey: 'GEMINI_API_KEY',
    priority: 1, // Lower = higher priority
    capabilities: ['chat', 'streaming', 'function-calling', 'multimodal'],
  },
  openai: {
    class: OpenAIProvider,
    name: 'OpenAI GPT',
    requiresKey: 'OPENAI_API_KEY',
    priority: 2,
    capabilities: ['chat', 'streaming', 'function-calling'],
  },
  openrouter: {
    class: OpenRouterProvider,
    name: 'OpenRouter',
    requiresKey: 'OPENROUTER_API_KEY',
    priority: 3,
    capabilities: ['chat', 'streaming', 'multi-model'],
  },
  anthropic: {
    class: AnthropicProvider,
    name: 'Anthropic Claude',
    requiresKey: 'ANTHROPIC_API_KEY',
    priority: 2,
    capabilities: ['chat', 'streaming', 'extended-thinking'],
  },
  mock: {
    class: MockProvider,
    name: 'Mock Provider (Development)',
    requiresKey: null,
    priority: 999, // Lowest priority
    capabilities: ['chat', 'streaming', 'testing'],
  },
};

/**
 * Provider Selection Strategies
 */
const SELECTION_STRATEGIES = {
  // Use first available provider
  FAILOVER: 'failover',
  // Round-robin between available providers
  ROUND_ROBIN: 'roundRobin',
  // Choose provider with best health score
  HEALTH_BASED: 'healthBased',
  // Choose provider with lowest latency
  PERFORMANCE: 'performance',
  // Distribute based on cost
  COST_OPTIMIZED: 'costOptimized',
};

/**
 * Provider Factory Class
 */
class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.healthMonitor = new ProviderHealthMonitor();
    this.circuitBreakerManager = getCircuitBreakerManager();
    this.roundRobinIndex = 0;
    this.selectionStrategy = process.env.AI_ROUTING_STRATEGY || SELECTION_STRATEGIES.FAILOVER;
    this.initialized = false;
    
    // Set up circuit breaker event listeners
    this.circuitBreakerManager.on('stateChange', (data) => {
      console.log(`🔌 Provider ${data.provider} circuit: ${data.from} → ${data.to}`);
    });
  }

  /**
   * Initialize factory and all available providers
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🤖 Initializing AI Provider Factory...');

    // Initialize health monitor
    await this.healthMonitor.initialize();

    // Scan for available providers
    const availableProviders = this.scanAvailableProviders();
    console.log(`📊 Found ${availableProviders.length} available providers`);

    // Initialize each provider
    for (const providerKey of availableProviders) {
      try {
        const config = PROVIDER_REGISTRY[providerKey];
        const provider = new config.class({
          apiKey: process.env[config.requiresKey],
          name: providerKey,
        });

        await provider.initialize();
        this.providers.set(providerKey, provider);
        
        console.log(`✅ ${config.name} initialized successfully`);
      } catch (error) {
        console.warn(`⚠️  Failed to initialize ${providerKey}:`, error.message);
      }
    }

    // Start health monitoring
    this.startHealthMonitoring();

    this.initialized = true;
    console.log(`🚀 Provider Factory initialized with ${this.providers.size} providers`);
  }

  /**
   * Scan environment for available providers
   * @returns {string[]} Array of available provider keys
   */
  scanAvailableProviders() {
    const available = [];

    for (const [key, config] of Object.entries(PROVIDER_REGISTRY)) {
      // Mock provider is always available
      if (key === 'mock') {
        available.push(key);
        continue;
      }

      // Check if API key is configured
      if (config.requiresKey && process.env[config.requiresKey]) {
        available.push(key);
      }
    }

    // Sort by priority (lower number = higher priority)
    return available.sort((a, b) => {
      return PROVIDER_REGISTRY[a].priority - PROVIDER_REGISTRY[b].priority;
    });
  }

  /**
   * Get provider by name with automatic fallback
   * @param {string} providerName - Preferred provider name
   * @param {boolean} allowFallback - Allow fallback to other providers
   * @returns {Promise<Object>} Provider instance
   */
  async getProvider(providerName = null, allowFallback = true) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Use selection strategy if no provider specified
    if (!providerName) {
      return await this.selectProvider();
    }

    // Try to get requested provider
    const provider = this.providers.get(providerName);

    // Check if provider is available and healthy
    if (provider && (await this.healthMonitor.isHealthy(providerName))) {
      return provider;
    }

    // Fallback logic
    if (allowFallback) {
      console.log(`⚠️  Provider ${providerName} not available, falling back...`);
      return await this.selectProvider([providerName]); // Exclude failed provider
    }

    throw new Error(`Provider ${providerName} is not available and fallback is disabled`);
  }

  /**
   * Select provider based on configured strategy
   * @param {string[]} excludeProviders - Providers to exclude from selection
   * @returns {Promise<Object>} Selected provider
   */
  async selectProvider(excludeProviders = []) {
    const available = Array.from(this.providers.keys())
      .filter(key => !excludeProviders.includes(key));

    if (available.length === 0) {
      throw new Error('No providers available');
    }

    let selectedKey;

    switch (this.selectionStrategy) {
      case SELECTION_STRATEGIES.ROUND_ROBIN:
        selectedKey = this.roundRobinSelect(available);
        break;

      case SELECTION_STRATEGIES.HEALTH_BASED:
        selectedKey = await this.healthBasedSelect(available);
        break;

      case SELECTION_STRATEGIES.PERFORMANCE:
        selectedKey = await this.performanceBasedSelect(available);
        break;

      case SELECTION_STRATEGIES.COST_OPTIMIZED:
        selectedKey = await this.costOptimizedSelect(available);
        break;

      case SELECTION_STRATEGIES.FAILOVER:
      default:
        selectedKey = await this.failoverSelect(available);
        break;
    }

    return this.providers.get(selectedKey);
  }

  /**
   * Failover selection: Use first healthy provider with circuit breaker check
   */
  async failoverSelect(available) {
    // First, filter by circuit breaker state
    const circuitBreakerAvailable = available.filter(key => 
      this.circuitBreakerManager.isAvailable(key)
    );
    
    // If circuit breakers are blocking all providers, try any available
    const candidates = circuitBreakerAvailable.length > 0 ? circuitBreakerAvailable : available;
    
    for (const key of candidates) {
      if (await this.healthMonitor.isHealthy(key)) {
        return key;
      }
    }
    
    // If no healthy provider, use circuit breaker's best selection
    const best = this.circuitBreakerManager.selectBestProvider(available);
    return best || available[0];
  }

  /**
   * Round-robin selection
   */
  roundRobinSelect(available) {
    const key = available[this.roundRobinIndex % available.length];
    this.roundRobinIndex++;
    return key;
  }

  /**
   * Health-based selection: Choose provider with best health score
   */
  async healthBasedSelect(available) {
    let bestProvider = available[0];
    let bestScore = 0;

    for (const key of available) {
      const health = await this.healthMonitor.getHealth(key);
      const score = this.calculateHealthScore(health);
      
      if (score > bestScore) {
        bestScore = score;
        bestProvider = key;
      }
    }

    return bestProvider;
  }

  /**
   * Performance-based selection: Choose fastest provider
   */
  async performanceBasedSelect(available) {
    let fastestProvider = available[0];
    let lowestLatency = Infinity;

    for (const key of available) {
      const health = await this.healthMonitor.getHealth(key);
      
      if (health && health.averageLatency < lowestLatency) {
        lowestLatency = health.averageLatency;
        fastestProvider = key;
      }
    }

    return fastestProvider;
  }

  /**
   * Cost-optimized selection: Prefer cheaper providers
   */
  async costOptimizedSelect(available) {
    // Simple implementation: prefer providers in priority order
    // Real implementation would factor in actual costs
    return available[0];
  }

  /**
   * Calculate health score for a provider
   */
  calculateHealthScore(health) {
    if (!health) return 0;

    const successRate = health.successCount / (health.requestCount || 1);
    const latencyScore = Math.max(0, 1 - (health.averageLatency / 5000)); // Penalize >5s latency
    const availabilityScore = health.isAvailable ? 1 : 0;

    return (successRate * 0.5) + (latencyScore * 0.3) + (availabilityScore * 0.2);
  }

  /**
   * Start health monitoring for all providers
   */
  startHealthMonitoring() {
    setInterval(async () => {
      for (const [key, provider] of this.providers) {
        try {
          const isHealthy = await this.healthMonitor.checkHealth(key, provider);
          if (!isHealthy) {
            console.warn(`⚠️  Provider ${key} health check failed`);
          }
        } catch (error) {
          console.error(`❌ Health check error for ${key}:`, error.message);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Get all provider health statuses
   * @returns {Promise<Object>} Provider health map
   */
  async getAllProviderHealth() {
    const health = {};
    
    for (const key of this.providers.keys()) {
      health[key] = await this.healthMonitor.getHealth(key);
    }

    return health;
  }

  /**
   * Get list of available provider names
   * @returns {string[]} Provider names
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider capabilities
   * @param {string} providerName - Provider name
   * @returns {string[]} Capabilities array
   */
  getProviderCapabilities(providerName) {
    const config = PROVIDER_REGISTRY[providerName];
    return config ? config.capabilities : [];
  }

  /**
   * Test provider with a simple request
   * @param {string} providerName - Provider to test
   * @returns {Promise<boolean>} Test result
   */
  async testProvider(providerName) {
    try {
      const provider = await this.getProvider(providerName, false);
      const response = await provider.generateCompletion([
        { role: 'user', content: 'Hello!' }
      ]);
      return !!response;
    } catch (error) {
      console.error(`Provider test failed for ${providerName}:`, error.message);
      return false;
    }
  }

  /**
   * Record successful request to update circuit breaker and health monitor
   * @param {string} providerName - Provider that succeeded
   * @param {number} latencyMs - Request latency in milliseconds
   */
  async recordSuccess(providerName, latencyMs = 0) {
    // Update circuit breaker
    this.circuitBreakerManager.recordSuccess(providerName, latencyMs);
    
    // Update health monitor
    await this.healthMonitor.recordSuccess(providerName, latencyMs);
  }

  /**
   * Record failed request to update circuit breaker and health monitor
   * @param {string} providerName - Provider that failed
   * @param {Error|string} error - The error
   */
  async recordFailure(providerName, error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Update circuit breaker
    this.circuitBreakerManager.recordFailure(providerName, errorMessage);
    
    // Update health monitor
    await this.healthMonitor.recordFailure(providerName, errorMessage);
  }

  /**
   * Get circuit breaker status for all providers
   * @returns {Object} Circuit breaker summary
   */
  getCircuitBreakerStatus() {
    return this.circuitBreakerManager.getSummary();
  }

  /**
   * Reset circuit breaker for a provider (manual intervention)
   * @param {string} providerName - Provider to reset
   */
  resetCircuitBreaker(providerName) {
    this.circuitBreakerManager.reset(providerName);
    console.log(`🔄 Circuit breaker reset for ${providerName}`);
  }
}

// Singleton instance
let factoryInstance = null;

/**
 * Get singleton factory instance
 * @returns {ProviderFactory} Factory instance
 */
function getProviderFactory() {
  if (!factoryInstance) {
    factoryInstance = new ProviderFactory();
  }
  return factoryInstance;
}

module.exports = {
  ProviderFactory,
  getProviderFactory,
  PROVIDER_REGISTRY,
  SELECTION_STRATEGIES,
  // Re-export circuit breaker for direct access
  getCircuitBreakerManager,
  CircuitState,
};
