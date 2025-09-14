/**
 * EmbeddingProvider - Real embedding provider for semantic search
 * 
 * Supports multiple embedding providers: OpenAI, Cohere, Sentence Transformers
 * Provides consistent interface for embedding generation
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class EmbeddingProvider {
  constructor() {
    this.provider = process.env.EMBEDDING_PROVIDER || 'openai';
    this.model = process.env.EMBEDDING_MODEL || this._getDefaultModel();
    this.apiKey = this._getApiKey();
    this.initialized = false;
  }

  static getInstance() {
    if (!EmbeddingProvider.instance) {
      EmbeddingProvider.instance = new EmbeddingProvider();
    }
    return EmbeddingProvider.instance;
  }

  async initialize() {
    if (this.initialized) return;

    if (!this.apiKey) {
      throw new Error(`API key not found for embedding provider: ${this.provider}`);
    }

    console.log(`Initializing embedding provider: ${this.provider} with model: ${this.model}`);
    this.initialized = true;
  }

  async generateEmbedding(text, options = {}) {
    await this.initialize();

    try {
      switch (this.provider) {
        case 'openai':
          return await this._generateOpenAIEmbedding(text, options);
        case 'cohere':
          return await this._generateCohereEmbedding(text, options);
        case 'sentence-transformers':
          return await this._generateSentenceTransformersEmbedding(text, options);
        default:
          throw new Error(`Unsupported embedding provider: ${this.provider}`);
      }
    } catch (error) {
      console.error(`Embedding generation failed for provider ${this.provider}:`, error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts, options = {}) {
    // Generate embeddings in batches for efficiency
    const batchSize = options.batchSize || 100;
    const embeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(text, options))
      );
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  _getDefaultModel() {
    switch (this.provider) {
      case 'openai':
        return 'text-embedding-3-small'; // 1536 dimensions
      case 'cohere':
        return 'embed-english-v3.0'; // 1024 dimensions
      case 'sentence-transformers':
        return 'all-MiniLM-L6-v2'; // 384 dimensions
      default:
        return 'text-embedding-3-small';
    }
  }

  _getApiKey() {
    switch (this.provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'cohere':
        return process.env.COHERE_API_KEY;
      case 'sentence-transformers':
        return null; // Local model, no API key needed
      default:
        return null;
    }
  }

  async _generateOpenAIEmbedding(text, options) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      embedding: data.data[0].embedding,
      dimensions: data.data[0].embedding.length,
      model: this.model,
      provider: 'openai'
    };
  }

  async _generateCohereEmbedding(text, options) {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        texts: [text],
        model: this.model,
        input_type: options.inputType || 'search_document'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      embedding: data.embeddings[0],
      dimensions: data.embeddings[0].length,
      model: this.model,
      provider: 'cohere'
    };
  }

  async _generateSentenceTransformersEmbedding(text, options) {
    // For sentence-transformers, we would typically use a local service
    // This is a placeholder implementation that would connect to a local model server
    throw new Error('Sentence Transformers provider requires a local model server. Please implement connection to your model endpoint.');
  }

  getDimensions() {
    switch (this.provider) {
      case 'openai':
        return this.model === 'text-embedding-3-large' ? 3072 : 1536;
      case 'cohere':
        return 1024;
      case 'sentence-transformers':
        return 384; // Default for all-MiniLM-L6-v2
      default:
        return 1536;
    }
  }

  getCost(tokens) {
    // Estimated costs per 1M tokens (as of 2024)
    switch (this.provider) {
      case 'openai':
        return this.model === 'text-embedding-3-large' ? tokens * 0.13 / 1000000 : tokens * 0.02 / 1000000;
      case 'cohere':
        return tokens * 0.10 / 1000000;
      case 'sentence-transformers':
        return 0; // Local model, no API cost
      default:
        return 0;
    }
  }
}

module.exports = EmbeddingProvider;