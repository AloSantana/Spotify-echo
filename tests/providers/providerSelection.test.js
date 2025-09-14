/**
 * Tests for LLM Provider Selection and Fallback
 */

const ProviderRegistry = require('../../src/llm/providers/index');

describe('LLM Provider Selection', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset registry state (if possible)
    ProviderRegistry.providers?.clear?.();
    ProviderRegistry.initialized = false;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Provider Registration', () => {
    it('should initialize with no providers when no API keys are set', async () => {
      // Clear all provider API keys
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const result = await ProviderRegistry.initialize();
      
      expect(result).toBe(true); // Should still initialize for graceful degradation
      expect(ProviderRegistry.providers.size).toBe(0);
    });

    it('should register OpenAI provider when API key is available', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await ProviderRegistry.initialize();
      
      expect(result).toBe(true);
      expect(ProviderRegistry.providers.has('openai')).toBe(true);
    });

    it('should register multiple providers when API keys are available', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const result = await ProviderRegistry.initialize();
      
      expect(result).toBe(true);
      expect(ProviderRegistry.providers.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Provider Selection Logic', () => {
    beforeEach(async () => {
      // Setup mock providers
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      
      await ProviderRegistry.initialize();
    });

    it('should use default provider when no preference specified', () => {
      const provider = ProviderRegistry.getProviderWithFallback();
      expect(provider).toBeDefined();
      expect(provider.name).toBe('OpenAIProvider');
    });

    it('should use preferred provider when specified and available', () => {
      const provider = ProviderRegistry.getProviderWithFallback('openrouter');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('OpenRouterProvider');
    });

    it('should fallback to default when preferred provider unavailable', () => {
      const provider = ProviderRegistry.getProviderWithFallback('nonexistent');
      expect(provider).toBeDefined();
      // Should fallback to first available
    });

    it('should throw error when no providers are available', () => {
      // Clear all providers
      ProviderRegistry.providers.clear();
      
      expect(() => {
        ProviderRegistry.getProviderWithFallback();
      }).toThrow('No available LLM providers');
    });
  });

  describe('Environment-based Provider Selection', () => {
    it('should respect DEFAULT_LLM_PROVIDER environment variable', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
      process.env.DEFAULT_LLM_PROVIDER = 'openrouter';

      await ProviderRegistry.initialize();
      
      expect(ProviderRegistry.defaultProvider).toBe('openrouter');
    });

    it('should fallback gracefully when DEFAULT_LLM_PROVIDER is invalid', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.DEFAULT_LLM_PROVIDER = 'invalid_provider';

      await ProviderRegistry.initialize();
      
      // Should fall back to first available provider
      expect(ProviderRegistry.defaultProvider).not.toBe('invalid_provider');
    });
  });

  describe('Provider Status and Health', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
      
      await ProviderRegistry.initialize();
    });

    it('should return provider status correctly', () => {
      const status = ProviderRegistry.getProviderStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('defaultProvider');
      expect(status).toHaveProperty('totalProviders');
      expect(status).toHaveProperty('availableProviders');
      expect(status).toHaveProperty('unavailableProviders');
      
      expect(Array.isArray(status.availableProviders)).toBe(true);
      expect(Array.isArray(status.unavailableProviders)).toBe(true);
    });

    it('should return available providers list', () => {
      const available = ProviderRegistry.getAvailableProviders();
      
      expect(Array.isArray(available)).toBe(true);
      
      if (available.length > 0) {
        expect(available[0]).toHaveProperty('name');
        expect(available[0]).toHaveProperty('capabilities');
        expect(available[0]).toHaveProperty('telemetry');
      }
    });
  });

  describe('Fallback Chain', () => {
    it('should have defined fallback order', () => {
      expect(ProviderRegistry.fallbackOrder).toBeDefined();
      expect(Array.isArray(ProviderRegistry.fallbackOrder)).toBe(true);
      expect(ProviderRegistry.fallbackOrder.length).toBeGreaterThan(0);
    });

    it('should include common providers in fallback order', () => {
      expect(ProviderRegistry.fallbackOrder).toContain('openai');
      expect(ProviderRegistry.fallbackOrder).toContain('openrouter');
      expect(ProviderRegistry.fallbackOrder).toContain('gemini');
    });
  });

  describe('Error Handling', () => {
    it('should handle provider initialization failures gracefully', async () => {
      // Set invalid API keys that would cause initialization to fail
      process.env.OPENAI_API_KEY = 'invalid-key';
      
      const result = await ProviderRegistry.initialize();
      
      // Should still return true for graceful degradation
      expect(result).toBe(true);
    });

    it('should throw meaningful error when accessing non-existent provider', () => {
      expect(() => {
        ProviderRegistry.getProvider('nonexistent_provider');
      }).toThrow(/not found/);
    });

    it('should validate registry is initialized before provider access', () => {
      ProviderRegistry.initialized = false;
      
      expect(() => {
        ProviderRegistry.getProvider('openai');
      }).toThrow(/not initialized/);
    });
  });

  describe('Telemetry and Monitoring', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      await ProviderRegistry.initialize();
    });

    it('should provide comprehensive telemetry', () => {
      const telemetry = ProviderRegistry.getComprehensiveTelemetry();
      
      expect(telemetry).toHaveProperty('timestamp');
      expect(telemetry).toHaveProperty('defaultProvider');
      expect(telemetry).toHaveProperty('providers');
      expect(typeof telemetry.providers).toBe('object');
    });

    it('should track provider telemetry correctly', () => {
      const telemetry = ProviderRegistry.getComprehensiveTelemetry();
      
      Object.values(telemetry.providers).forEach(providerTelemetry => {
        expect(providerTelemetry).toHaveProperty('available');
        expect(typeof providerTelemetry.available).toBe('boolean');
      });
    });

    it('should allow telemetry reset', () => {
      ProviderRegistry.resetTelemetry();
      
      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Integration with Chat System', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      await ProviderRegistry.initialize();
    });

    it('should provide interface for chat generation', async () => {
      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      // Should have the generate method
      expect(typeof ProviderRegistry.generate).toBe('function');
      
      // Note: We don't actually call it with real API keys in tests
      // but we verify the interface exists
    });

    it('should provide interface for streaming generation', async () => {
      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      // Should have the generateStreaming method
      expect(typeof ProviderRegistry.generateStreaming).toBe('function');
    });
  });
});