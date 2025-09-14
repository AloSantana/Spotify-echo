/**
 * Strategy Registry - Central registry for recommendation strategies
 * 
 * Manages registration, initialization, and access to recommendation strategies.
 * Supports dynamic strategy loading and weighted selection.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class StrategyRegistry {
  constructor() {
    this.strategies = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all registered strategies
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load core strategies
      await this._loadCoreStrategies();
      
      // Initialize all strategies
      for (const [name, strategy] of this.strategies) {
        if (strategy.initialize) {
          await strategy.initialize();
        }
      }

      this.initialized = true;
      console.log(`StrategyRegistry initialized with ${this.strategies.size} strategies`);
    } catch (error) {
      console.error('Failed to initialize StrategyRegistry:', error);
      throw error;
    }
  }

  /**
   * Register a new strategy
   * @param {string} name - Strategy name
   * @param {Object} strategy - Strategy implementation
   */
  registerStrategy(name, strategy) {
    if (!strategy || typeof strategy.run !== 'function') {
      throw new Error(`Invalid strategy: ${name}. Must implement run() method.`);
    }

    this.strategies.set(name, strategy);
    console.log(`Registered strategy: ${name}`);
  }

  /**
   * Get a strategy by name
   * @param {string} name - Strategy name
   * @returns {Object} Strategy implementation
   */
  async getStrategy(name) {
    await this.initialize();

    const strategy = this.strategies.get(name);
    if (!strategy) {
      // Try fallback strategies
      if (name === 'hybrid' && this.strategies.has('collaborative')) {
        return this.strategies.get('collaborative');
      }
      return null;
    }

    return strategy;
  }

  /**
   * Get all available strategies
   * @returns {Array} Array of strategy implementations
   */
  async getAllStrategies() {
    await this.initialize();
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy names
   * @returns {Array} Array of strategy names
   */
  getStrategyNames() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Select strategy based on context and weights
   * @param {Object} context - Selection context
   * @param {Object} weights - Strategy weights
   * @returns {string} Selected strategy name
   */
  selectStrategy(context, weights = {}) {
    const available = this.getStrategyNames();
    
    // Default weights
    const defaultWeights = {
      collaborative: 0.4,
      'content-based': 0.3,
      'embedding-semantic': 0.2,
      'hybrid-rerank': 0.1
    };

    const finalWeights = { ...defaultWeights, ...weights };

    // Simple weighted selection (can be enhanced with ML-based selection)
    if (context.userHistory && context.userHistory.length > 50) {
      return available.includes('collaborative') ? 'collaborative' : available[0];
    }

    if (context.coldStart) {
      return available.includes('content-based') ? 'content-based' : available[0];
    }

    if (context.semanticQuery) {
      return available.includes('embedding-semantic') ? 'embedding-semantic' : available[0];
    }

    // Default to hybrid if available
    return available.includes('hybrid-rerank') ? 'hybrid-rerank' : available[0];
  }

  // Private methods

  async _loadCoreStrategies() {
    const strategies = [
      { name: 'collaborative', module: './collaborativeStrategy' },
      { name: 'content-based', module: './contentAudioFeatureStrategy' },
      { name: 'embedding-semantic', module: './embeddingSemanticStrategy' },
      { name: 'hybrid-rerank', module: './hybridRerankStrategy' }
    ];

    for (const { name, module } of strategies) {
      try {
        const StrategyClass = require(module);
        const strategy = new StrategyClass();
        this.registerStrategy(name, strategy);
      } catch (error) {
        console.warn(`Failed to load strategy ${name}:`, error.message);
        // Register a mock strategy as fallback
        this.registerStrategy(name, this._createMockStrategy(name));
      }
    }
  }

  _createMockStrategy(name) {
    return {
      name,
      async run(params) {
        console.log(`Using mock strategy: ${name}`);
        return {
          candidates: [],
          diagnostics: {
            strategy: name,
            mock: true,
            reason: 'Strategy implementation not available'
          }
        };
      }
    };
  }
}

module.exports = StrategyRegistry;