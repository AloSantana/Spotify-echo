const BaseProvider = require('./BaseProvider');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini LLM Provider
 * Provides access to Google's Gemini models with enhanced error handling
 */
class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.defaultModel = config.model || 'gemini-1.5-flash';
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.useVertex = config.useVertex || process.env.GEMINI_USE_VERTEX === 'true';
    
    this.supportedModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-pro',
      'gemini-pro-vision',
    ];
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not provided. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
      }

      this.client = new GoogleGenerativeAI(this.apiKey);
      
      // Test connection
      await this.testConnection();
      await super.initialize();
      
      console.log(`✅ Gemini provider initialized successfully with model: ${this.defaultModel}`);
    } catch (error) {
      console.error('❌ Failed to initialize Gemini provider:', error.message);
      this.isInitialized = false;
      throw error;
    }
  }

  async testConnection() {
    try {
      const model = this.client.getGenerativeModel({ model: this.defaultModel });
      const result = await model.generateContent('Hello');
      console.log('✅ Gemini API connection test successful');
    } catch (error) {
      console.error('❌ Gemini API connection test failed:', error.message);
      throw new Error(`Gemini API connection failed: ${error.message}`);
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
      features: ['chat', 'completion', 'streaming', 'vision', 'function_calling'],
    };
  }

  getPricing() {
    const pricing = {
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
      'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 }, // Free during preview
      'gemini-pro': { input: 0.0005, output: 0.0015 },
      'gemini-pro-vision': { input: 0.00025, output: 0.0005 },
    };
    
    const modelPricing = pricing[this.defaultModel] || pricing['gemini-1.5-flash'];
    return {
      inputTokenPrice: modelPricing.input,
      outputTokenPrice: modelPricing.output,
      currency: 'USD',
      per1k: true
    };
  }

  getMaxTokensForModel(model) {
    const tokenLimits = {
      'gemini-1.5-flash': 1048576,
      'gemini-1.5-pro': 2097152,
      'gemini-2.0-flash-exp': 1048576,
      'gemini-pro': 32768,
      'gemini-pro-vision': 16384,
    };
    return tokenLimits[model] || 32768;
  }

  async generate(messages, options = {}) {
    const startTime = Date.now();
    this.recordRequest();

    try {
      const model = options.model || this.defaultModel;
      const maxTokens = options.maxTokens || 2000;
      const temperature = options.temperature ?? 0.7;

      const generativeModel = this.client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: Math.min(maxTokens, this.getMaxTokensForModel(model) - 1000),
          temperature,
          topP: options.topP ?? 1,
        },
      });

      // Convert chat messages to Gemini format
      const prompt = this.convertMessagesToPrompt(messages);
      
      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const latency = Date.now() - startTime;
      this.recordSuccess(latency);

      return this.parseResponse({
        content: text,
        role: 'assistant',
        model: model,
        usage: this.estimateUsage(prompt, text),
        finishReason: 'stop',
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

      const generativeModel = this.client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: Math.min(maxTokens, this.getMaxTokensForModel(model) - 1000),
          temperature,
          topP: options.topP ?? 1,
        },
      });

      const prompt = this.convertMessagesToPrompt(messages);
      const result = await generativeModel.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield {
            content: chunkText,
            role: 'assistant',
            model: model,
            finishReason: null,
            isPartial: true,
          };
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  convertMessagesToPrompt(messages) {
    // Convert OpenAI-style messages to Gemini format
    let prompt = '';
    
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `System: ${message.content}\n\n`;
          break;
        case 'user':
          prompt += `User: ${message.content}\n\n`;
          break;
        case 'assistant':
          prompt += `Assistant: ${message.content}\n\n`;
          break;
        default:
          prompt += `${message.content}\n\n`;
      }
    }
    
    // Add final prompt for assistant response
    if (!prompt.endsWith('Assistant: ')) {
      prompt += 'Assistant: ';
    }
    
    return prompt;
  }

  estimateUsage(prompt, response) {
    const promptTokens = this.estimateTokens(prompt);
    const completionTokens = this.estimateTokens(response);
    
    return {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
  }

  handleError(error) {
    console.error('Gemini API Error:', error);

    if (error.message?.includes('API_KEY_INVALID')) {
      return {
        error: 'Invalid Gemini API key. Please check your configuration.',
        type: 'auth_error',
        retryable: false,
      };
    }

    if (error.message?.includes('QUOTA_EXCEEDED')) {
      return {
        error: 'Gemini API quota exceeded. Please check your billing.',
        type: 'quota_exceeded',
        retryable: false,
      };
    }

    if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
      return {
        error: 'Gemini rate limit exceeded. Please try again in a moment.',
        type: 'rate_limit',
        retryable: true,
      };
    }

    if (error.message?.includes('MODEL_NOT_FOUND')) {
      return {
        error: 'Requested Gemini model not found.',
        type: 'model_error',
        retryable: false,
      };
    }

    if (error.message?.includes('SAFETY')) {
      return {
        error: 'Content blocked by Gemini safety filters.',
        type: 'safety_error',
        retryable: false,
      };
    }

    return {
      error: `Gemini API error: ${error.message}`,
      type: 'unknown_error',
      retryable: false,
    };
  }

  estimateTokens(text) {
    // Gemini uses similar tokenization to other models
    return Math.ceil(text.length / 4);
  }
}

module.exports = GeminiProvider;