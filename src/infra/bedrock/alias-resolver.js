'use strict';

/**
 * Bedrock Alias Resolver
 * 
 * Dynamically resolves model aliases to actual AWS Bedrock model IDs.
 * Prevents hardcoded model IDs and enables centralized model configuration.
 * 
 * Features:
 * - Alias-based resolution (e.g., 'claude-3-opus' -> 'anthropic.claude-3-opus-20240229-v1:0')
 * - Legacy model mapping for backward compatibility
 * - Deprecated model detection and warnings
 * - Pricing lookup and cost calculation
 * - Model metadata retrieval (capabilities, regions, context window)
 * 
 * @module infra/bedrock/alias-resolver
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AliasResolver {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../../../config/bedrock-aliases.json');
    this.config = null;
    this.configHash = null;
    this.lastLoadTime = null;
    this.cache = new Map();
    this.warnedAliases = new Set(); // Warning deduplication for cycle detection
  }

  /**
   * Load alias configuration from file
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Calculate hash for validation artifacts
      this.configHash = crypto.createHash('sha256').update(configData).digest('hex');
      this.lastLoadTime = new Date().toISOString();
      
      this.config = config;
      this.cache.clear(); // Clear cache on reload
      
      return config;
    } catch (error) {
      throw new Error(`Failed to load Bedrock alias configuration: ${error.message}`);
    }
  }

  /**
   * Get configuration (lazy load)
   * @returns {Object} Configuration object
   */
  getConfig() {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config;
  }

  /**
   * Resolve alias to model configuration with cycle detection (ITERATIVE - no recursion)
   * @param {string} alias - Model alias (e.g., 'claude-3-opus')
   * @param {Object} options - Resolution options
   * @returns {Object} Model configuration with resolved modelId
   */
  resolve(alias, options = {}) {
    const { allowDeprecated = false, warnDeprecated = true } = options;
    
    if (typeof alias !== 'string' || !alias.trim()) {
      throw new Error('Alias must be a non-empty string');
    }
    
    const originalAlias = alias;
    const cacheKey = `${originalAlias}:${allowDeprecated}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const config = this.getConfig();
    const visited = new Set();
    const chain = [];
    let current = alias;
    let depth = 0;
    const MAX_DEPTH = 50;
    
    // ITERATIVE legacy remapping resolution with cycle detection
    while (true) {
      // Cycle detection
      if (visited.has(current)) {
        chain.push(current);
        const loop = [...chain.slice(chain.indexOf(current)), current];
        if (!this.warnedAliases.has(originalAlias)) {
          console.error(`⚠️ [ALIAS-RESOLVER] Cycle detected: ${loop.join(' -> ')}`);
          this.warnedAliases.add(originalAlias);
        }
        throw new Error(
          `Legacy alias cycle detected: ${loop.join(' -> ')}. ` +
          `Please fix the 'legacyMappings' in bedrock-aliases.json`
        );
      }
      
      visited.add(current);
      chain.push(current);
      
      // Depth protection
      if (depth++ > MAX_DEPTH) {
        throw new Error(
          `Maximum alias resolution depth (${MAX_DEPTH}) exceeded for '${originalAlias}'. ` +
          `Chain: ${chain.join(' -> ')}`
        );
      }
      
      // Check for legacy mapping and continue iteration
      if (config.legacyMappings && Object.prototype.hasOwnProperty.call(config.legacyMappings, current)) {
        const target = config.legacyMappings[current];
        
        // Self-mapping check
        if (target === current) {
          if (!this.warnedAliases.has(originalAlias)) {
            console.error(`⚠️ [ALIAS-RESOLVER] Self-mapping detected for alias "${current}"`);
            this.warnedAliases.add(originalAlias);
          }
          throw new Error(`Self-mapping detected for alias '${current}'`);
        }
        
        console.warn(`⚠️  Legacy alias '${current}' mapped to '${target}'`);
        current = target;
        continue; // Continue iteration with new target
      }
      
      // No more legacy mappings, break to check deprecated/active aliases
      break;
    }
    
    // Now check deprecated aliases
    if (config.deprecatedAliases && config.deprecatedAliases[current]) {
      const deprecated = config.deprecatedAliases[current];
      
      if (!allowDeprecated) {
        throw new Error(
          `Model alias '${current}' is deprecated. ${deprecated.deprecationNote} ` +
          `Use '${deprecated.replacement}' instead.`
        );
      }
      
      if (warnDeprecated) {
        console.warn(
          `⚠️  DEPRECATED: '${current}' - ${deprecated.deprecationNote} ` +
          `Use '${deprecated.replacement}' instead.`
        );
      }
      
      // Return deprecated model info but recommend replacement
      const result = {
        ...deprecated,
        resolved: false,
        deprecated: true,
        recommendedReplacement: deprecated.replacement
      };
      
      this.cache.set(cacheKey, result);
      return result;
    }
    
    // Check active aliases
    if (config.aliases && config.aliases[current]) {
      const modelConfig = config.aliases[current];
      
      const result = {
        ...modelConfig,
        alias: current,
        originalAlias: originalAlias,
        resolved: true,
        deprecated: false
      };
      
      this.cache.set(cacheKey, result);
      return result;
    }
    
    // Alias not found
    throw new Error(
      `Unknown model alias: '${current}' (resolved from '${originalAlias}'). ` +
      `Available aliases: ${Object.keys(config.aliases || {}).join(', ')}`
    );
  }

  /**
   * Get model ID from alias
   * @param {string} alias - Model alias
   * @param {Object} options - Resolution options
   * @returns {string} AWS Bedrock model ID
   */
  getModelId(alias, options = {}) {
    const resolved = this.resolve(alias, options);
    
    if (!resolved.resolved) {
      throw new Error(`Cannot get model ID for deprecated alias '${alias}'`);
    }
    
    return resolved.modelId;
  }

  /**
   * Get pricing information for alias
   * @param {string} alias - Model alias
   * @returns {Object} Pricing configuration
   */
  getPricing(alias) {
    const resolved = this.resolve(alias, { allowDeprecated: true });
    
    if (!resolved.pricing) {
      return {
        input: 0,
        output: 0,
        currency: 'USD',
        unit: 'per 1K tokens'
      };
    }
    
    return resolved.pricing;
  }

  /**
   * Calculate cost for token usage
   * @param {string} alias - Model alias
   * @param {Object} usage - Token usage { input_tokens, output_tokens }
   * @returns {Object} Cost breakdown
   */
  calculateCost(alias, usage) {
    const pricing = this.getPricing(alias);
    
    const inputCost = (usage.input_tokens / 1000) * pricing.input;
    const outputCost = (usage.output_tokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;
    
    return {
      inputCost,
      outputCost,
      totalCost,
      currency: pricing.currency,
      usage
    };
  }

  /**
   * List all available aliases
   * @param {Object} options - Filter options
   * @returns {Array} List of alias names
   */
  listAliases(options = {}) {
    const { includeDeprecated = false, filterByProvider = null, filterByCapability = null } = options;
    
    const config = this.getConfig();
    const aliases = [];

    // Active aliases
    if (config.aliases) {
      for (const [alias, modelConfig] of Object.entries(config.aliases)) {
        if (filterByProvider && modelConfig.provider !== filterByProvider) {
          continue;
        }
        
        if (filterByCapability && !modelConfig.capabilities?.includes(filterByCapability)) {
          continue;
        }
        
        aliases.push({
          alias,
          displayName: modelConfig.displayName,
          provider: modelConfig.provider,
          family: modelConfig.family,
          capabilities: modelConfig.capabilities,
          deprecated: false,
          priority: modelConfig.priority
        });
      }
    }

    // Deprecated aliases
    if (includeDeprecated && config.deprecatedAliases) {
      for (const [alias, modelConfig] of Object.entries(config.deprecatedAliases)) {
        aliases.push({
          alias,
          displayName: modelConfig.displayName,
          provider: modelConfig.provider,
          family: modelConfig.family,
          deprecated: true,
          replacement: modelConfig.replacement
        });
      }
    }

    // Sort by priority (lower = higher priority)
    return aliases.sort((a, b) => {
      if (a.deprecated !== b.deprecated) {
        return a.deprecated ? 1 : -1;
      }
      return (a.priority || 999) - (b.priority || 999);
    });
  }

  /**
   * Get all model metadata
   * @param {string} alias - Model alias
   * @returns {Object} Complete model metadata
   */
  getMetadata(alias) {
    const resolved = this.resolve(alias, { allowDeprecated: true });
    
    return {
      alias,
      modelId: resolved.modelId,
      displayName: resolved.displayName,
      provider: resolved.provider,
      family: resolved.family,
      capabilities: resolved.capabilities,
      contextWindow: resolved.contextWindow,
      maxOutputTokens: resolved.maxOutputTokens,
      requiresInferenceProfile: resolved.requiresInferenceProfile,
      inferenceProfileArn: resolved.inferenceProfileArn,
      regions: resolved.regions,
      deprecated: resolved.deprecated,
      pricing: resolved.pricing,
      notes: resolved.notes
    };
  }

  /**
   * Validate if alias exists
   * @param {string} alias - Model alias
   * @returns {boolean} True if alias exists
   */
  hasAlias(alias) {
    try {
      this.resolve(alias, { allowDeprecated: true, warnDeprecated: false });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get configuration hash for validation
   * @returns {string} SHA-256 hash of configuration
   */
  getConfigHash() {
    if (!this.configHash) {
      this.getConfig(); // Trigger load
    }
    return this.configHash;
  }

  /**
   * Get configuration metadata
   * @returns {Object} Configuration metadata
   */
  getConfigMetadata() {
    const config = this.getConfig();
    
    return {
      version: config.version,
      lastUpdated: config.lastUpdated,
      lastLoadTime: this.lastLoadTime,
      configHash: this.configHash,
      totalAliases: Object.keys(config.aliases || {}).length,
      totalDeprecated: Object.keys(config.deprecatedAliases || {}).length,
      metadata: config.metadata
    };
  }

  /**
   * Reload configuration from disk
   */
  reload() {
    this.loadConfig();
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of AliasResolver
 * @returns {AliasResolver} Singleton instance
 */
function getInstance() {
  if (!instance) {
    instance = new AliasResolver();
  }
  return instance;
}

module.exports = {
  AliasResolver,
  getInstance,
  // Convenience exports
  resolve: (alias, options) => getInstance().resolve(alias, options),
  getModelId: (alias, options) => getInstance().getModelId(alias, options),
  getPricing: (alias) => getInstance().getPricing(alias),
  calculateCost: (alias, usage) => getInstance().calculateCost(alias, usage),
  listAliases: (options) => getInstance().listAliases(options),
  getMetadata: (alias) => getInstance().getMetadata(alias),
  hasAlias: (alias) => getInstance().hasAlias(alias),
  getConfigHash: () => getInstance().getConfigHash(),
  getConfigMetadata: () => getInstance().getConfigMetadata()
};
