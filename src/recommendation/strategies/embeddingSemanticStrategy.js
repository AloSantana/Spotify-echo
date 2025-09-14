/**
 * Embedding Semantic Strategy
 * 
 * Recommends music based on semantic similarity using embedding vectors.
 * Uses natural language processing and semantic search for music discovery.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class EmbeddingSemanticStrategy {
  constructor(options = {}) {
    this.name = 'embedding-semantic';
    this.options = {
      embeddingDimension: 768,
      similarityThreshold: 0.7,
      maxCandidates: 100,
      useTextEmbeddings: true,
      useAudioEmbeddings: false, // Requires advanced ML infrastructure
      ...options
    };
    
    this.trackEmbeddings = new Map();
    this.textEmbeddings = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the strategy
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load pre-computed embeddings
      await this._loadEmbeddings();
      
      this.initialized = true;
      console.log('EmbeddingSemanticStrategy initialized');
    } catch (error) {
      console.error('Failed to initialize EmbeddingSemanticStrategy:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations using semantic similarity
   * @param {Object} params - Generation parameters
   * @returns {Object} Recommendations with diagnostics
   */
  async run(params) {
    await this.initialize();

    const { userId, seeds = [], limits, context, filters = {} } = params;
    const startTime = Date.now();

    try {
      // Extract semantic queries from context
      const semanticQueries = this._extractSemanticQueries(context, filters);
      
      // Get seed embeddings
      const seedEmbeddings = await this._getSeedEmbeddings(seeds, context, semanticQueries);
      
      if (seedEmbeddings.length === 0) {
        return this._handleNoEmbeddings(params);
      }

      // Find semantically similar tracks
      const candidates = await this._findSimilarEmbeddings(
        seedEmbeddings,
        limits.candidates
      );

      // Apply semantic filters
      const filteredCandidates = this._applySemanticFilters(candidates, filters, context);
      
      // Rank by semantic similarity
      const rankedCandidates = this._rankBySemanticSimilarity(filteredCandidates, semanticQueries);

      return {
        candidates: rankedCandidates.slice(0, limits.final),
        diagnostics: {
          strategy: this.name,
          seedEmbeddings: seedEmbeddings.length,
          semanticQueries: semanticQueries.length,
          candidatesGenerated: candidates.length,
          candidatesFiltered: filteredCandidates.length,
          executionTime: Date.now() - startTime,
          confidence: this._calculateSemanticConfidence(seedEmbeddings, semanticQueries)
        }
      };

    } catch (error) {
      console.error('Error in EmbeddingSemanticStrategy:', error);
      return {
        candidates: [],
        diagnostics: {
          strategy: this.name,
          error: error.message,
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  // Private methods

  async _loadEmbeddings() {
    const MongoDBManager = require('../../database/mongodb-manager');
    
    try {
      console.log('Loading track embeddings from MongoDB...');
      
      // Connect to MongoDB
      const mongoManager = new MongoDBManager();
      if (!mongoManager._isConnected) {
        await mongoManager.connect();
      }
      
      const db = mongoManager.db;
      if (!db) {
        throw new Error('MongoDB connection not available');
      }
      
      // Load real embeddings from database
      const embeddings = await db.collection('track_embeddings')
        .find({ 
          model: 'gemini',
          embedding: { $exists: true, $ne: [] }
        })
        .limit(10000) // Reasonable limit for memory
        .toArray();

      if (embeddings.length === 0) {
        console.warn('⚠️ No track embeddings found in database');
        console.warn('   Run "node scripts/embed-tracks.js" to generate embeddings');
        return false;
      }

      // Process and store embeddings
      for (const embedding of embeddings) {
        this.trackEmbeddings.set(embedding.trackId, {
          trackId: embedding.trackId,
          embedding: embedding.embedding,
          metadata: {
            dimensions: embedding.dimensions,
            model: embedding.model,
            createdAt: embedding.createdAt,
            text: embedding.text
          }
        });
      }

      console.log(`✅ Loaded ${this.trackEmbeddings.size} track embeddings`);
      return true;
    } catch (error) {
      console.error('Failed to load embeddings:', error);
      return false;
    }
  }

    // Load text embeddings for common music queries
    const commonQueries = [
      'upbeat dance music',
      'relaxing jazz',
      'energetic rock',
      'ambient electronic',
      'classical piano',
      'romantic ballads',
      'workout music',
      'study music',
      'party songs',
      'melancholy indie'
    ];

    for (const query of commonQueries) {
      const embedding = this._generateTextEmbedding(query);
      this.textEmbeddings.set(query, embedding);
    }
  }

  _extractSemanticQueries(context, filters) {
    const queries = [];
    
    // Extract from user message/intent
    if (context?.userMessage) {
      queries.push(context.userMessage);
    }
    
    // Extract from mood/activity filters
    if (filters.mood) {
      queries.push(`${filters.mood} music`);
    }
    
    if (filters.activity) {
      queries.push(`music for ${filters.activity}`);
    }
    
    // Extract from genre preferences
    if (context?.preferences?.favoriteGenres) {
      context.preferences.favoriteGenres.forEach(genre => {
        queries.push(`${genre} music`);
      });
    }

    return queries;
  }

  async _getSeedEmbeddings(seeds, context, semanticQueries) {
    const embeddings = [];
    
    // Get embeddings for seed tracks
    for (const seedId of seeds) {
      const embedding = this.trackEmbeddings.get(seedId);
      if (embedding) {
        embeddings.push({
          type: 'track',
          ...embedding,
          weight: 1.0
        });
      }
    }
    
    // Get embeddings for semantic queries
    for (const query of semanticQueries) {
      let queryEmbedding = this.textEmbeddings.get(query);
      
      if (!queryEmbedding) {
        // Generate embedding for new query
        queryEmbedding = this._generateTextEmbedding(query);
      }
      
      embeddings.push({
        type: 'query',
        query,
        embedding: queryEmbedding,
        weight: 0.8 // Slightly lower weight for text queries
      });
    }
    
    // Get embeddings from recent listening history
    if (context?.listeningHistory && embeddings.length < 3) {
      for (const track of context.listeningHistory.slice(0, 5)) {
        const embedding = this.trackEmbeddings.get(track.id || track.trackId);
        if (embedding) {
          embeddings.push({
            type: 'history',
            ...embedding,
            weight: 0.6 // Lower weight for history
          });
        }
      }
    }

    return embeddings;
  }

  async _findSimilarEmbeddings(seedEmbeddings, limit) {
    const candidates = new Map();
    const seedIds = new Set(seedEmbeddings
      .filter(s => s.type === 'track')
      .map(s => s.trackId)
    );
    
    // Calculate similarity to all tracks
    for (const [trackId, trackEmbedding] of this.trackEmbeddings) {
      if (seedIds.has(trackId)) continue; // Skip seed tracks
      
      let maxSimilarity = 0;
      let totalSimilarity = 0;
      let bestSeedMatch = null;
      
      // Calculate similarity to each seed embedding
      for (const seedEmbedding of seedEmbeddings) {
        const similarity = this._calculateCosineSimilarity(
          trackEmbedding.embedding,
          seedEmbedding.embedding
        );
        
        const weightedSimilarity = similarity * seedEmbedding.weight;
        totalSimilarity += weightedSimilarity;
        
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestSeedMatch = seedEmbedding;
        }
      }
      
      const avgSimilarity = totalSimilarity / seedEmbeddings.length;
      
      if (maxSimilarity >= this.options.similarityThreshold) {
        candidates.set(trackId, {
          trackId,
          score: avgSimilarity,
          maxSimilarity,
          bestMatch: bestSeedMatch,
          metadata: trackEmbedding.metadata,
          reasons: [
            `${Math.round(maxSimilarity * 100)}% semantic similarity`,
            bestSeedMatch?.type === 'query' 
              ? `Matches "${bestSeedMatch.query}"`
              : 'Similar musical characteristics'
          ]
        });
      }
    }

    // Convert to array and sort by similarity
    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  _calculateCosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  _applySemanticFilters(candidates, filters, context) {
    return candidates.filter(candidate => {
      // Genre filter
      if (filters.genre && candidate.metadata.genre !== filters.genre) {
        return false;
      }
      
      // Semantic relevance filter
      if (filters.minSemanticScore && candidate.score < filters.minSemanticScore) {
        return false;
      }
      
      return true;
    });
  }

  _rankBySemanticSimilarity(candidates, semanticQueries) {
    return candidates.map(candidate => {
      let boost = 1.0;
      
      // Boost tracks that match specific semantic queries
      if (semanticQueries.length > 0 && candidate.bestMatch?.type === 'query') {
        boost *= 1.2;
      }
      
      // Boost tracks with high semantic confidence
      if (candidate.maxSimilarity > 0.85) {
        boost *= 1.1;
      }
      
      return {
        ...candidate,
        score: candidate.score * boost
      };
    }).sort((a, b) => b.score - a.score);
  }

  _calculateSemanticConfidence(seedEmbeddings, semanticQueries) {
    if (seedEmbeddings.length === 0) return 0;
    
    const embeddingFactor = Math.min(seedEmbeddings.length / 5, 1);
    const queryFactor = semanticQueries.length > 0 ? 1.2 : 0.8;
    
    return embeddingFactor * queryFactor * 0.75; // Semantic can be high confidence with good queries
  }

  _generateTextEmbedding(text) {
    // Mock text embedding generation
    // In a real implementation, this would use a language model like BERT or Sentence-BERT
    
    // Simple hash-based mock embedding
    const embedding = new Array(this.options.embeddingDimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.options.embeddingDimension;
      embedding[index] += Math.sin(charCode * 0.1) * 0.1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  _handleNoEmbeddings(params) {
    console.warn('⚠️ No embeddings available for semantic strategy');
    return {
      candidates: [],
      diagnostics: {
        strategy: this.name,
        noEmbeddings: true,
        message: 'No track embeddings found. Run embedding ingestion script.',
        executionTime: 0
      }
    };
  }
    return {
      candidates: [],
      diagnostics: {
        strategy: this.name,
        noEmbeddings: true,
        reason: 'No seed embeddings available for semantic analysis',
        recommendation: 'Provide semantic queries or seed tracks with embeddings'
      }
    };
  }
}

module.exports = EmbeddingSemanticStrategy;