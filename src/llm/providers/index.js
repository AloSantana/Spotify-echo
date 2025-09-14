const OpenAIProvider = require('./OpenAIProvider');
const OpenRouterProvider = require('./OpenRouterProvider');
const GeminiProvider = require('./GeminiProvider');

/**
 * LLM Provider Registry
 * Manages runtime provider selection and configuration
 */
class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'openai';
    this.fallbackOrder = ['openai', 'openrouter', 'gemini'];
    this.initialized = false;
  }

  /**
   * Initialize all providers
   */
  async initialize() {
    try {
      let providersInitialized = 0;

      // Initialize OpenAI provider
      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
        });
        try {
          await openai.initialize();
          this.providers.set('openai', openai);
          providersInitialized++;
          console.log('✅ OpenAI provider registered');
        } catch (error) {
          console.warn('⚠️ OpenAI provider initialization failed:', error.message);
        }
      }

      // Initialize OpenRouter provider
      if (process.env.OPENROUTER_API_KEY) {
        const openrouter = new OpenRouterProvider({
          apiKey: process.env.OPENROUTER_API_KEY,
          model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
        });
        try {
          await openrouter.initialize();
          this.providers.set('openrouter', openrouter);
          providersInitialized++;
          console.log('✅ OpenRouter provider registered');
        } catch (error) {
          console.warn('⚠️ OpenRouter provider initialization failed:', error.message);
        }
      }

      // Initialize Gemini provider
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
        const gemini = new GeminiProvider({
          apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        });
        try {
          await gemini.initialize();
          this.providers.set('gemini', gemini);
          providersInitialized++;
          console.log('✅ Gemini provider registered');
        } catch (error) {
          console.warn('⚠️ Gemini provider initialization failed:', error.message);
        }
      }

      // Set default provider based on environment or availability
      this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || this.getFirstAvailableProvider();
      
      this.initialized = true;
      console.log(`🎯 Provider registry initialized with ${this.providers.size} providers. Default: ${this.defaultProvider}`);
      
      // Return true even if no providers initialized for graceful degradation
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize provider registry:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Get provider by name
   */
  getProvider(name) {
    if (!this.initialized) {
      throw new Error('Provider registry not initialized');
    }
    
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found or not initialized`);
    }
    
    if (!provider.isAvailable()) {
      throw new Error(`Provider '${name}' is not available`);
    }
    
    return provider;
  }

  /**
   * Get provider with fallback logic
   */
  getProviderWithFallback(preferredProvider) {
    if (!this.initialized) {
      throw new Error('Provider registry not initialized');
    }

    // Try preferred provider first
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const provider = this.providers.get(preferredProvider);
      if (provider.isAvailable()) {
        return provider;
      }
    }

    // Try default provider
    if (this.providers.has(this.defaultProvider)) {
      const provider = this.providers.get(this.defaultProvider);
      if (provider.isAvailable()) {
        return provider;
      }
    }

    // Try fallback order
    for (const providerName of this.fallbackOrder) {
      if (this.providers.has(providerName)) {
        const provider = this.providers.get(providerName);
        if (provider.isAvailable()) {
          console.log(`🔄 Falling back to provider: ${providerName}`);
          return provider;
        }
      }
    }

    throw new Error('No available LLM providers');
  }

  /**
   * Get current provider (default or specified)
   */
  getCurrentProvider(providerName = null) {
    return this.getProviderWithFallback(providerName || this.defaultProvider);
  }

  /**
   * Set default provider
   */
  setDefaultProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider '${providerName}' not found`);
    }
    
    const provider = this.providers.get(providerName);
    if (!provider.isAvailable()) {
      throw new Error(`Provider '${providerName}' is not available`);
    }
    
    this.defaultProvider = providerName;
    console.log(`🎯 Default provider changed to: ${providerName}`);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders() {
    const available = [];
    for (const [name, provider] of this.providers) {
      if (provider.isAvailable()) {
        available.push({
          name,
          capabilities: provider.getCapabilities(),
          pricing: provider.getPricing(),
          telemetry: provider.getTelemetry()
        });
      }
    }
    return available;
  }

  /**
   * Get provider status
   */
  getProviderStatus() {
    const status = {
      initialized: this.initialized,
      defaultProvider: this.defaultProvider,
      totalProviders: this.providers.size,
      availableProviders: [],
      unavailableProviders: []
    };

    for (const [name, provider] of this.providers) {
      const providerInfo = {
        name,
        available: provider.isAvailable(),
        capabilities: provider.getCapabilities(),
        telemetry: provider.getTelemetry()
      };

      if (provider.isAvailable()) {
        status.availableProviders.push(providerInfo);
      } else {
        status.unavailableProviders.push(providerInfo);
      }
    }

    return status;
  }

  /**
   * Generate completion using current provider with fallback
   */
  async generate(messages, options = {}) {
    const provider = this.getProviderWithFallback(options.provider);
    return await provider.generate(messages, options);
  }

  /**
   * Generate streaming completion using current provider with fallback
   */
  async *generateStreaming(messages, options = {}) {
    const provider = this.getProviderWithFallback(options.provider);
    yield* provider.generateStreaming(messages, options);
  }

  /**
   * Validate provider configuration
   */
  async validateProvider(providerName) {
    if (!this.providers.has(providerName)) {
      return { valid: false, error: `Provider '${providerName}' not found` };
    }

    const provider = this.providers.get(providerName);
    
    try {
      // Test basic functionality
      const testMessages = [
        { role: 'user', content: 'Hello! Please respond with "Test successful."' }
      ];
      
      const response = await provider.generate(testMessages, { maxTokens: 50 });
      
      if (response.content && response.content.toLowerCase().includes('test successful')) {
        return { 
          valid: true, 
          response: response.content.trim(),
          telemetry: provider.getTelemetry()
        };
      } else {
        return { 
          valid: false, 
          error: `Unexpected response: ${response.content}`,
          response: response.content
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error.message || 'Validation failed'
      };
    }
  }

  /**
   * Get first available provider name
   */
  getFirstAvailableProvider() {
    for (const [name, provider] of this.providers) {
      if (provider.isAvailable()) {
        return name;
      }
    }
    return 'mock'; // fallback to mock if nothing available
  }

  /**
   * Reset all provider telemetry
   */
  resetTelemetry() {
    for (const provider of this.providers.values()) {
      provider.resetTelemetry();
    }
  }

  /**
   * Get comprehensive telemetry across all providers
   */
  getComprehensiveTelemetry() {
    const telemetry = {
      timestamp: new Date().toISOString(),
      defaultProvider: this.defaultProvider,
      providers: {}
    };

    for (const [name, provider] of this.providers) {
      telemetry.providers[name] = {
        available: provider.isAvailable(),
        ...provider.getTelemetry()
      };
    }

    return telemetry;
  }
}

// Export singleton instance
module.exports = new ProviderRegistry();