const BaseProvider = require('./BaseProvider');
const fetch = require('node-fetch');

/**
 * OpenRouter LLM Provider
 * Provides access to multiple models through OpenRouter API
 */
class OpenRouterProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.defaultModel = config.model || 'meta-llama/llama-3.1-8b-instruct:free';
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
    this.siteName = config.siteName || 'EchoTune AI';
    this.siteUrl = config.siteUrl || 'https://github.com/primoscope/Spotify-echo';
    
    this.supportedModels = [
      'meta-llama/llama-3.1-8b-instruct:free',
      'meta-llama/llama-3.1-70b-instruct:nitro',
      'anthropic/claude-3-haiku',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-opus',
      'openai/gpt-4o-mini',
      'openai/gpt-4o',
      'google/gemini-pro',
      'mistralai/mistral-7b-instruct:free',
      'mistralai/mixtral-8x7b-instruct:nitro',
      'perplexity/llama-3.1-sonar-large-128k-online',
    ];
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        throw new Error('OpenRouter API key not provided. Please set OPENROUTER_API_KEY environment variable.');
      }

      // Test connection
      await this.testConnection();
      await super.initialize();
      
      console.log(`✅ OpenRouter provider initialized successfully with model: ${this.defaultModel}`);
    } catch (error) {
      console.error('❌ Failed to initialize OpenRouter provider:', error.message);
      this.isInitialized = false;
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API test failed: ${response.status} ${response.statusText}`);
      }

      const models = await response.json();
      console.log(`✅ OpenRouter API connection test successful. Available models: ${models.data?.length || 0}`);
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        throw new Error('OpenRouter API connection failed. Please check your internet connection.');
      }
      console.error('❌ OpenRouter API connection test failed:', error.message);
      throw new Error(`OpenRouter API connection failed: ${error.message}`);
    }
  }

  validateConfig() {
    return !!(this.apiKey && this.apiKey.length > 10);
  }

  getCapabilities() {
    return {
      streaming: true,
      functionCalling: true,
      maxTokens: this.getMaxTokensForModel(this.defaultModel),
      supportedModels: this.supportedModels,
      features: ['chat', 'completion', 'streaming', 'multi_model'],
    };
  }

  getPricing() {
    // OpenRouter pricing varies by model - provide average estimates
    return {
      inputTokenPrice: 0.0002,
      outputTokenPrice: 0.0008,
      currency: 'USD',
      per1k: true,
      note: 'Pricing varies by model'
    };
  }

  getMaxTokensForModel(model) {
    const tokenLimits = {
      'meta-llama/llama-3.1-8b-instruct:free': 8192,
      'meta-llama/llama-3.1-70b-instruct:nitro': 131072,
      'anthropic/claude-3-haiku': 200000,
      'anthropic/claude-3-sonnet': 200000,
      'anthropic/claude-3-opus': 200000,
      'openai/gpt-4o-mini': 128000,
      'openai/gpt-4o': 128000,
      'google/gemini-pro': 32768,
      'mistralai/mistral-7b-instruct:free': 32768,
      'mistralai/mixtral-8x7b-instruct:nitro': 32768,
      'perplexity/llama-3.1-sonar-large-128k-online': 127072,
    };
    return tokenLimits[model] || 8192;
  }

  async generate(messages, options = {}) {
    const startTime = Date.now();
    this.recordRequest();

    try {
      const model = options.model || this.defaultModel;
      const maxTokens = options.maxTokens || 2000;
      const temperature = options.temperature ?? 0.7;

      const requestData = {
        model,
        messages: this.formatMessages(messages),
        max_tokens: Math.min(maxTokens, this.getMaxTokensForModel(model) - 1000),
        temperature,
        top_p: options.topP ?? 1,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stream: false,
      };

      // Add function/tool calling for compatible models
      if (options.functions && this.supportsFunction(model)) {
        requestData.functions = options.functions;
        requestData.function_call = options.functionCall || 'auto';
      }

      if (options.tools && this.supportsFunction(model)) {
        requestData.tools = options.tools;
        requestData.tool_choice = options.toolChoice || 'auto';
      }

      const response = await this.makeRequest(requestData);
      const latency = Date.now() - startTime;
      
      this.recordSuccess(latency);

      return this.parseResponse({
        content: response.choices[0].message.content,
        role: response.choices[0].message.role,
        model: response.model,
        usage: response.usage,
        functionCall: response.choices[0].message.function_call,
        toolCalls: response.choices[0].message.tool_calls,
        finishReason: response.choices[0].finish_reason,
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordFailure(error, latency);
      throw this.handleError(error);
    }
  }

  async *generateStreaming(messages, options = {}) {
    this.recordRequest();

    try {
      const model = options.model || this.defaultModel;
      const maxTokens = options.maxTokens || 2000;
      const temperature = options.temperature ?? 0.7;

      const requestData = {
        model,
        messages: this.formatMessages(messages),
        max_tokens: Math.min(maxTokens, this.getMaxTokensForModel(model) - 1000),
        temperature,
        top_p: options.topP ?? 1,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stream: true,
      };

      const response = await this.makeRequest(requestData, true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta;
                
                if (delta?.content) {
                  yield {
                    content: delta.content,
                    role: 'assistant',
                    model: parsed.model,
                    finishReason: parsed.choices[0]?.finish_reason,
                    isPartial: true,
                  };
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming chunk:', parseError.message);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async makeRequest(requestData, streaming = false) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (streaming) {
        return response;
      }

      return await response.json();
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        throw new Error('OpenRouter API connection failed. Please check your internet connection.');
      }
      throw error;
    }
  }

  supportsFunction(model) {
    const functionSupportedModels = [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-opus',
      'meta-llama/llama-3.1-70b-instruct:nitro',
    ];
    return functionSupportedModels.includes(model);
  }

  handleError(error) {
    console.error('OpenRouter API Error:', error);

    if (error.message?.includes('insufficient_quota')) {
      return {
        error: 'Insufficient OpenRouter credits. Please check your billing.',
        type: 'quota_exceeded',
        retryable: false,
      };
    }

    if (error.message?.includes('model_not_found')) {
      return {
        error: 'Requested model not available on OpenRouter.',
        type: 'model_error',
        retryable: false,
      };
    }

    if (error.message?.includes('rate_limit')) {
      return {
        error: 'Rate limit exceeded. Please try again in a moment.',
        type: 'rate_limit',
        retryable: true,
      };
    }

    if (error.message?.includes('401')) {
      return {
        error: 'Authentication failed. Please check your OpenRouter API key.',
        type: 'auth_error',
        retryable: false,
      };
    }

    return {
      error: `OpenRouter API error: ${error.message}`,
      type: 'unknown_error',
      retryable: false,
    };
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 3.5);
  }
}

module.exports = OpenRouterProvider;