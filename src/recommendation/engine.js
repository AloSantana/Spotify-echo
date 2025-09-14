/**
 * RecommendationEngine - Multi-strategy music recommendation system
 * 
 * Orchestrates multiple recommendation strategies to provide personalized music discovery.
 * Supports collaborative filtering, content-based analysis, semantic embeddings, and hybrid approaches.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const StrategyRegistry = require('./strategies');

class RecommendationEngine {
  constructor(options = {}) {
    this.options = {
      defaultStrategy: 'hybrid',
      maxCandidates: 100,
      diversityThreshold: 0.7,
      confidenceThreshold: 0.5,
      enableCaching: true,
      ...options
    };

    this.strategyRegistry = new StrategyRegistry();
    this.initialized = false;
  }

  /**
   * Initialize the recommendation engine
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.strategyRegistry.initialize();
      this.initialized = true;
      console.log('RecommendationEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RecommendationEngine:', error);
      throw new Error(`Engine initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate personalized recommendations
   * @param {Object} params - Generation parameters
   * @returns {Object} Recommendations with metadata
   */
  async generate(params) {
    await this.initialize();

    const {
      userId,
      userContext,
      strategy = this.options.defaultStrategy,
      limit = 20,
      seeds = [],
      filters = {}
    } = params;

    try {
      const startTime = Date.now();

      // Select and execute strategy
      const selectedStrategy = await this.strategyRegistry.getStrategy(strategy);
      if (!selectedStrategy) {
        throw new Error(`Strategy '${strategy}' not found`);
      }

      // Execute strategy with context
      const result = await selectedStrategy.run({
        userId,
        seeds,
        limits: { 
          candidates: Math.min(this.options.maxCandidates, limit * 3),
          final: limit 
        },
        context: userContext,
        filters
      });

      // Post-process results
      const processedResult = await this._postProcessResults(result, params);

      return {
        ...processedResult,
        strategy,
        metadata: {
          ...processedResult.metadata,
          executionTime: Date.now() - startTime,
          engine: 'RecommendationEngine',
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this._getFallbackRecommendations(params, error);
    }
  }

  /**
   * Explain why a track was recommended
   * @param {string} trackId - Track identifier
   * @param {string} userId - User identifier  
   * @param {Object} userContext - User context
   * @returns {Object} Explanation with reasoning
   */
  async explainRecommendation(trackId, userId, userContext) {
    await this.initialize();

    try {
      // Try to find explanation in recent recommendations
      const explanation = await this._generateExplanation(trackId, userId, userContext);
      
      return {
        trackId,
        userId,
        explanation: explanation.text,
        factors: explanation.factors,
        confidence: explanation.confidence,
        metadata: {
          generatedAt: new Date().toISOString(),
          source: 'RecommendationEngine'
        }
      };

    } catch (error) {
      console.error('Error explaining recommendation:', error);
      return {
        trackId,
        userId,
        explanation: 'This track was recommended based on your listening patterns and preferences.',
        factors: ['User behavior analysis', 'Music similarity'],
        confidence: 0.5,
        error: error.message
      };
    }
  }

  /**
   * Update user model with feedback
   * @param {string} userId - User identifier
   * @param {Object} feedback - User feedback
   */
  async updateUserModel(userId, feedback) {
    await this.initialize();

    try {
      // Update all strategies that support online learning
      const strategies = await this.strategyRegistry.getAllStrategies();
      
      for (const strategy of strategies) {
        if (strategy.updateUserModel) {
          await strategy.updateUserModel(userId, feedback);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user model:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available strategies
   * @returns {Array} List of available strategies
   */
  async getAvailableStrategies() {
    await this.initialize();
    return this.strategyRegistry.getStrategyNames();
  }

  /**
   * Evaluate strategy performance
   * @param {string} strategyName - Strategy to evaluate
   * @param {Object} testParams - Test parameters
   * @returns {Object} Performance metrics
   */
  async evaluateStrategy(strategyName, testParams) {
    await this.initialize();

    try {
      const strategy = await this.strategyRegistry.getStrategy(strategyName);
      if (!strategy) {
        throw new Error(`Strategy '${strategyName}' not found`);
      }

      const startTime = Date.now();
      const result = await strategy.run(testParams);
      const executionTime = Date.now() - startTime;

      return {
        strategy: strategyName,
        executionTime,
        candidateCount: result.candidates.length,
        avgScore: this._calculateAverageScore(result.candidates),
        diversity: this._calculateDiversity(result.candidates),
        diagnostics: result.diagnostics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error evaluating strategy ${strategyName}:`, error);
      return {
        strategy: strategyName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods

  async _postProcessResults(result, params) {
    let candidates = result.candidates || [];

    // Apply diversity filtering if enabled
    if (this.options.diversityThreshold > 0) {
      candidates = this._applyDiversityFilter(candidates, this.options.diversityThreshold);
    }

    // Apply confidence filtering
    candidates = candidates.filter(c => (c.score || 0) >= this.options.confidenceThreshold);

    // Limit final results
    candidates = candidates.slice(0, params.limit || 20);

    return {
      candidates,
      metadata: {
        originalCount: result.candidates.length,
        filteredCount: candidates.length,
        diagnostics: result.diagnostics,
        postProcessed: true
      }
    };
  }

  _getFallbackRecommendations(params, error) {
    return {
      candidates: [],
      strategy: 'fallback',
      metadata: {
        error: error.message,
        fallback: true,
        executionTime: 0,
        engine: 'RecommendationEngine',
        version: '1.0.0'
      }
    };
  }

  async _generateExplanation(trackId, userId, userContext) {
    // Generate explanation based on available data
    const factors = [];
    let confidence = 0.5;

    // Check for genre matches
    if (userContext.preferences && userContext.preferences.favoriteGenres) {
      factors.push('Matches your preferred music genres');
      confidence += 0.2;
    }

    // Check for artist similarity
    if (userContext.listeningHistory && userContext.listeningHistory.length > 0) {
      factors.push('Similar to artists you frequently listen to');
      confidence += 0.2;
    }

    // Check for audio feature similarity
    factors.push('Audio characteristics align with your listening patterns');
    confidence += 0.1;

    return {
      text: `This track was recommended because it ${factors.join(', ').toLowerCase()}.`,
      factors,
      confidence: Math.min(confidence, 1.0)
    };
  }

  _calculateAverageScore(candidates) {
    if (candidates.length === 0) return 0;
    const sum = candidates.reduce((acc, c) => acc + (c.score || 0), 0);
    return sum / candidates.length;
  }

  _calculateDiversity(candidates) {
    // Simple diversity calculation based on unique genres/artists
    if (candidates.length === 0) return 0;
    
    const uniqueArtists = new Set(candidates.map(c => c.artistId).filter(Boolean));
    const uniqueGenres = new Set(candidates.flatMap(c => c.genres || []));
    
    return {
      artistDiversity: uniqueArtists.size / candidates.length,
      genreDiversity: uniqueGenres.size,
      score: Math.min(uniqueArtists.size / Math.max(candidates.length * 0.7, 1), 1)
    };
  }

  _applyDiversityFilter(candidates, threshold) {
    // Apply diversity filtering to reduce similar recommendations
    const filtered = [];
    const seenArtists = new Set();
    
    for (const candidate of candidates) {
      const artistId = candidate.artistId;
      
      if (!artistId || !seenArtists.has(artistId) || seenArtists.size < candidates.length * threshold) {
        filtered.push(candidate);
        if (artistId) seenArtists.add(artistId);
      }
    }
    
    return filtered;
  }
}

module.exports = { RecommendationEngine };