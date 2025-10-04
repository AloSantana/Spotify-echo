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
   * Resolve alias to model configuration with cycle detection
   * @param {string} alias - Model alias (e.g., 'claude-3-opus')
   * @param {Object} options - Resolution options
   * @param {Set} visited - Set of visited aliases for cycle detection (internal use)
   * @returns {Object} Model configuration with resolved modelId
   */
  resolve(alias, options = {}, visited = new Set()) {
    const { allowDeprecated = false, warnDeprecated = true } = options;
    
    // Cycle detection: check if we've seen this alias before in the current resolution chain
    if (visited.has(alias)) {
      if (!this.warnedAliases.has(alias)) {
        console.error(`⚠️ [ALIAS-RESOLVER] Cycle detected in alias resolution for "${alias}". Breaking cycle to prevent infinite loop.`);
        this.warnedAliases.add(alias); // Deduplicate warnings
      }
      throw new Error(`Circular alias reference detected for '${alias}'`);
    }

    // Add current alias to visited set
    visited.add(alias);
    
    // Check cache first
    const cacheKey = `${alias}:${allowDeprecated}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const config = this.getConfig();

    // Check for self-mapping (alias points to itself)
    if (config.legacyMappings && config.legacyMappings[alias] === alias) {
      if (!this.warnedAliases.has(alias)) {
        console.error(`⚠️ [ALIAS-RESOLVER] Self-mapping detected for alias "${alias}". This would cause infinite recursion.`);
        this.warnedAliases.add(alias);
      }
      throw new Error(`Self-mapping detected for alias '${alias}'`);
    }

    // Check if alias is in legacy mappings
    if (config.legacyMappings && config.legacyMappings[alias]) {
      const mappedAlias = config.legacyMappings[alias];
      console.warn(`⚠️  Legacy alias '${alias}' mapped to '${mappedAlias}'`);
      return this.resolve(mappedAlias, options, visited);
    }

    // Check deprecated aliases first
    if (config.deprecatedAliases && config.deprecatedAliases[alias]) {
      const deprecated = config.deprecatedAliases[alias];
      
      if (!allowDeprecated) {
        throw new Error(
          `Model alias '${alias}' is deprecated. ${deprecated.deprecationNote} ` +
          `Use '${deprecated.replacement}' instead.`
        );
      }
      
      if (warnDeprecated) {
        console.warn(
          `⚠️  DEPRECATED: '${alias}' - ${deprecated.deprecationNote} ` +
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
    if (config.aliases && config.aliases[alias]) {
      const modelConfig = config.aliases[alias];
      
      const result = {
        ...modelConfig,
        alias,
        resolved: true,
        deprecated: false
      };
      
      this.cache.set(cacheKey, result);
      return result;
    }

    // Alias not found
    throw new Error(
      `Unknown model alias: '${alias}'. ` +
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
