/**
 * Base LLM Provider Interface
 * Abstract class for all LLM providers with enhanced runtime configuration
 */
class BaseProvider {
  constructor(config = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      timeout: 30000,
      enableTelemetry: true,
      ...config,
    };
    this.name = this.constructor.name;
    this.isInitialized = false;
    this.telemetry = this.resetTelemetryData();
  }

  /**
   * Initialize the provider
   */
  async initialize() {
    this.isInitialized = true;
    this.resetTelemetry();
  }

  /**
   * Generate chat completion - must be implemented by subclasses
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Generation options
   * @returns {Object} Response object
   */
  async generate(messages, options = {}) {
    throw new Error('generate method must be implemented by subclass');
  }

  /**
   * Generate streaming completion - optional for subclasses
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator} Stream of response chunks
   */
  async *generateStreaming(messages, options = {}) {
    // Default fallback to non-streaming
    const response = await this.generate(messages, options);
    yield response;
  }

  /**
   * Check if provider is available and configured
   */
  isAvailable() {
    return this.isInitialized && this.validateConfig();
  }

  /**
   * Validate provider configuration - must be implemented by subclasses
   */
  validateConfig() {
    throw new Error('validateConfig must be implemented by subclass');
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      streaming: false,
      functionCalling: false,
      maxTokens: 4096,
      supportedModels: [],
      features: ['chat', 'completion']
    };
  }

  /**
   * Get provider pricing information
   */
  getPricing() {
    return {
      inputTokenPrice: 0,
      outputTokenPrice: 0,
      currency: 'USD',
      per1k: true
    };
  }

  /**
   * Format messages for provider
   */
  formatMessages(messages) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Parse response from provider
   */
  parseResponse(response) {
    return {
      content: response.content || '',
      role: 'assistant',
      model: response.model || 'unknown',
      usage: response.usage || {},
      metadata: response.metadata || {},
    };
  }

  /**
   * Handle errors from provider
   */
  handleError(error) {
    console.error(`${this.name} error:`, error);
    return {
      error: true,
      message: error.message || 'Unknown error occurred',
      provider: this.name,
    };
  }

  /**
   * Get telemetry data
   */
  getTelemetry() {
    return {
      ...this.telemetry,
      successRate: this.telemetry.requests > 0
        ? ((this.telemetry.successes / this.telemetry.requests) * 100).toFixed(2) + '%'
        : '0%',
      averageLatency: this.telemetry.successes > 0
        ? Math.round(this.telemetry.totalLatency / this.telemetry.successes)
        : 0
    };
  }

  /**
   * Reset telemetry data
   */
  resetTelemetry() {
    this.telemetry = this.resetTelemetryData();
  }

  resetTelemetryData() {
    return {
      requests: 0,
      successes: 0,
      failures: 0,
      totalLatency: 0,
      lastRequestTime: null,
      errors: [],
      retryAttempts: 0,
    };
  }

  /**
   * Record telemetry for request
   */
  recordRequest() {
    if (!this.config.enableTelemetry) return;
    this.telemetry.requests++;
    this.telemetry.lastRequestTime = new Date().toISOString();
  }

  /**
   * Record successful request
   */
  recordSuccess(latency) {
    if (!this.config.enableTelemetry) return;
    this.telemetry.successes++;
    this.telemetry.totalLatency += latency;
  }

  /**
   * Record failed request
   */
  recordFailure(error, latency) {
    if (!this.config.enableTelemetry) return;
    this.telemetry.failures++;
    this.telemetry.totalLatency += latency;
    
    this.telemetry.errors.unshift({
      message: error.message,
      timestamp: new Date().toISOString(),
      latency,
    });

    if (this.telemetry.errors.length > 10) {
      this.telemetry.errors.pop();
    }
  }

  /**
   * Get token count estimate
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Execute operation with timeout
   */
  withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      ),
    ]);
  }
}

module.exports = BaseProvider;