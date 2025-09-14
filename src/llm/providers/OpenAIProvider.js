const BaseProvider = require('./BaseProvider');
const OpenAI = require('openai');

/**
 * OpenAI LLM Provider
 * Supports GPT models with enhanced error handling and runtime configuration
 */
class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.defaultModel = config.model || 'gpt-4o-mini';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    
    this.supportedModels = [
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-4o',
      'gpt-4o-mini',
    ];
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not provided. Please set OPENAI_API_KEY environment variable.');
      }

      if (!this.apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format. API key should start with "sk-"');
      }

      this.client = new OpenAI({
        apiKey: this.apiKey,
        timeout: this.config.timeout || 30000,
        maxRetries: this.config.maxRetries || 3,
      });

      // Test connection
      await this.testConnection();
      await super.initialize();
      
      console.log(`✅ OpenAI provider initialized successfully with model: ${this.defaultModel}`);
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI provider:', error.message);
      this.isInitialized = false;
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.client.models.list();
      console.log('✅ OpenAI API connection test successful');
    } catch (error) {
      console.error('❌ OpenAI API connection test failed:', error.message);
      throw new Error(`OpenAI API connection failed: ${error.message}`);
    }
  }

  validateConfig() {
    return !!(this.apiKey && this.apiKey.startsWith('sk-'));
  }

  getCapabilities() {
    return {
      streaming: true,
      functionCalling: true,
      maxTokens: this.getMaxTokensForModel(this.defaultModel),
      supportedModels: this.supportedModels,
      features: ['chat', 'completion', 'function_calling', 'streaming'],
    };
  }

  getPricing() {
    const pricing = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    };
    
    const modelPricing = pricing[this.defaultModel] || pricing['gpt-4o-mini'];
    return {
      inputTokenPrice: modelPricing.input,
      outputTokenPrice: modelPricing.output,
      currency: 'USD',
      per1k: true
    };
  }

  getMaxTokensForModel(model) {
    const tokenLimits = {
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'gpt-4': 8192,
      'gpt-4-turbo-preview': 128000,
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
    };
    return tokenLimits[model] || 4096;
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
      };

      // Add function/tool calling support
      if (options.functions) {
        requestData.functions = options.functions;
        requestData.function_call = options.functionCall || 'auto';
      }

      if (options.tools) {
        requestData.tools = options.tools;
        requestData.tool_choice = options.toolChoice || 'auto';
      }

      const response = await this.client.chat.completions.create(requestData);
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

      const stream = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(messages),
        max_tokens: Math.min(maxTokens, this.getMaxTokensForModel(model) - 1000),
        temperature,
        stream: true,
        top_p: options.topP ?? 1,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield {
            content: delta.content,
            role: 'assistant',
            model: chunk.model,
            finishReason: chunk.choices[0]?.finish_reason,
            isPartial: true,
          };
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    console.error('OpenAI API Error:', error);

    if (error.status === 401) {
      return {
        error: 'Authentication failed. Please check your OpenAI API key.',
        type: 'auth_error',
        retryable: false,
      };
    }

    if (error.status === 429) {
      return {
        error: 'Rate limit exceeded. Please try again in a moment.',
        type: 'rate_limit',
        retryable: true,
      };
    }

    if (error.status === 402) {
      return {
        error: 'Insufficient quota. Please check your OpenAI billing.',
        type: 'quota_exceeded',
        retryable: false,
      };
    }

    if (error.status >= 500) {
      return {
        error: 'OpenAI service temporarily unavailable. Please try again.',
        type: 'server_error',
        retryable: true,
      };
    }

    return {
      error: `OpenAI API error: ${error.message}`,
      type: 'unknown_error',
      retryable: false,
    };
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 3.5);
  }
}

module.exports = OpenAIProvider;