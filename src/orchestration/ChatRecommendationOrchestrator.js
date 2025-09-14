/**
 * ChatRecommendationOrchestrator - Core product integration layer
 * 
 * Provides a stable interface for coordinating chat, recommendations, and Spotify integration.
 * This orchestrator shields subsystems from each other's internal changes while providing
 * a unified product experience.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const path = require('path');

class ChatRecommendationOrchestrator {
  constructor(options = {}) {
    this.options = {
      enablePersonalization: true,
      enableCaching: true,
      defaultStrategy: 'balanced',
      maxRecommendations: 20,
      contextWindowSize: 10,
      ...options
    };

    // Lazy-loaded dependencies to avoid circular imports
    this._databaseManager = null;
    this._spotifyService = null;
    this._recommendationEngine = null;
    this._cacheManager = null;
    this._llmProvider = null;
    
    this.initialized = false;
  }

  /**
   * Initialize the orchestrator with required dependencies
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load dependencies dynamically to avoid circular imports
      const { DatabaseManager } = require('../database/database-manager');
      const { SpotifyAPIService } = require('../spotify/api-service');
      
      // Initialize core services
      this._databaseManager = new DatabaseManager();
      this._spotifyService = new SpotifyAPIService();
      
      // Try to load optional services with fallbacks
      try {
        const { RecommendationEngine } = require('../recommendation/engine');
        this._recommendationEngine = new RecommendationEngine();
      } catch (error) {
        console.warn('Recommendation engine not available, using mock implementation');
        this._recommendationEngine = this._createMockRecommendationEngine();
      }

      try {
        const { RecommendationCache } = require('../cache/RecommendationCache');
        this._cacheManager = new RecommendationCache();
      } catch (error) {
        console.warn('Cache manager not available, using in-memory fallback');
        this._cacheManager = this._createMockCacheManager();
      }

      // Initialize database connection
      await this._databaseManager.initialize();
      
      this.initialized = true;
      console.log('ChatRecommendationOrchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ChatRecommendationOrchestrator:', error);
      throw new Error(`Orchestrator initialization failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive user context for personalization
   * @param {string} userId - User identifier
   * @returns {Object} User context including preferences, history, and profile
   */
  async getUserContext(userId) {
    await this.initialize();
    
    try {
      const startTime = Date.now();
      
      // Fetch user data from multiple sources
      const [userProfile, listeningHistory, preferences, recentSessions] = await Promise.allSettled([
        this._getUserProfile(userId),
        this._getListeningHistory(userId),
        this._getUserPreferences(userId),
        this._getRecentSessions(userId)
      ]);

      const context = {
        userId,
        timestamp: new Date().toISOString(),
        profile: userProfile.status === 'fulfilled' ? userProfile.value : null,
        listeningHistory: listeningHistory.status === 'fulfilled' ? listeningHistory.value : [],
        preferences: preferences.status === 'fulfilled' ? preferences.value : {},
        recentSessions: recentSessions.status === 'fulfilled' ? recentSessions.value : [],
        metadata: {
          generatedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          source: 'ChatRecommendationOrchestrator'
        }
      };

      return context;
    } catch (error) {
      console.error('Error getting user context:', error);
      return this._getDefaultUserContext(userId);
    }
  }

  /**
   * Generate personalized music recommendations
   * @param {string} userId - User identifier
   * @param {Object} options - Recommendation options
   * @returns {Object} Recommendations with metadata
   */
  async generateRecommendations(userId, options = {}) {
    await this.initialize();
    
    try {
      const startTime = Date.now();
      const opts = {
        strategy: this.options.defaultStrategy,
        limit: this.options.maxRecommendations,
        context: null,
        seeds: [],
        filters: {},
        ...options
      };

      // Check cache first if enabled
      if (this.options.enableCaching) {
        const cached = await this._getCachedRecommendations(userId, opts);
        if (cached) {
          return {
            ...cached,
            metadata: {
              ...cached.metadata,
              fromCache: true,
              latencyMs: Date.now() - startTime
            }
          };
        }
      }

      // Get user context if not provided
      const userContext = opts.context || await this.getUserContext(userId);
      
      // Generate recommendations using the recommendation engine
      const recommendations = await this._recommendationEngine.generate({
        userId,
        userContext,
        strategy: opts.strategy,
        limit: opts.limit,
        seeds: opts.seeds,
        filters: opts.filters
      });

      const result = {
        userId,
        recommendations: recommendations.candidates || [],
        strategy: opts.strategy,
        metadata: {
          generatedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          source: 'ChatRecommendationOrchestrator',
          fromCache: false,
          diagnostics: recommendations.diagnostics || {}
        }
      };

      // Cache results if enabled
      if (this.options.enableCaching && result.recommendations.length > 0) {
        await this._cacheRecommendations(userId, opts, result);
      }

      return result;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this._getFallbackRecommendations(userId, options);
    }
  }

  /**
   * Build optimized chat context for LLM interactions
   * @param {string} userId - User identifier  
   * @param {Object} options - Context building options
   * @returns {Object} Structured context for chat
   */
  async buildChatContext(userId, options = {}) {
    await this.initialize();
    
    try {
      const opts = {
        includeHistory: true,
        includePreferences: true,
        includeRecentActivity: true,
        maxTokens: 2000,
        ...options
      };

      const userContext = await this.getUserContext(userId);
      
      // Build context pipeline
      const chatContext = {
        user: {
          id: userId,
          preferences: opts.includePreferences ? userContext.preferences : null,
          recentActivity: opts.includeRecentActivity ? this._summarizeRecentActivity(userContext) : null
        },
        conversation: {
          history: opts.includeHistory ? await this._getConversationHistory(userId, 5) : [],
          currentSession: new Date().toISOString()
        },
        musicContext: {
          topGenres: this._extractTopGenres(userContext),
          recentTracks: this._extractRecentTracks(userContext, 10),
          moodIndicators: this._extractMoodIndicators(userContext)
        },
        metadata: {
          tokenEstimate: this._estimateTokenCount(userContext),
          truncated: false,
          generatedAt: new Date().toISOString()
        }
      };

      // Apply token budgeting if needed
      if (opts.maxTokens && chatContext.metadata.tokenEstimate > opts.maxTokens) {
        return this._applyTokenBudgeting(chatContext, opts.maxTokens);
      }

      return chatContext;
    } catch (error) {
      console.error('Error building chat context:', error);
      return this._getDefaultChatContext(userId);
    }
  }

  /**
   * Ingest user feedback for personalization
   * @param {string} userId - User identifier
   * @param {string} trackId - Track identifier
   * @param {string} signal - Feedback signal (like, dislike, play, skip)
   * @param {Object} metadata - Additional feedback metadata
   */
  async ingestFeedback(userId, trackId, signal, metadata = {}) {
    await this.initialize();
    
    try {
      const feedback = {
        userId,
        trackId,
        signal,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'ChatRecommendationOrchestrator',
          sessionId: metadata.sessionId,
          context: metadata.context,
          ...metadata
        }
      };

      // Store feedback in database
      await this._databaseManager.saveFeedback(feedback);

      // Invalidate relevant caches
      if (this.options.enableCaching) {
        await this._invalidateUserCaches(userId);
      }

      // Update real-time personalization if available
      if (this._recommendationEngine && this._recommendationEngine.updateUserModel) {
        await this._recommendationEngine.updateUserModel(userId, feedback);
      }

      return { success: true, feedback };
    } catch (error) {
      console.error('Error ingesting feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate explanation for a recommendation
   * @param {string} trackId - Track identifier
   * @param {string} userId - User identifier
   * @returns {Object} Explanation with reasoning
   */
  async explain(trackId, userId) {
    await this.initialize();
    
    try {
      // Get track details from Spotify
      const trackInfo = await this._spotifyService.getTrack(trackId);
      
      // Get user context for personalized explanation
      const userContext = await this.getUserContext(userId);
      
      // Generate explanation using recommendation engine
      let explanation = 'This track was recommended based on your listening history and preferences.';
      
      if (this._recommendationEngine && this._recommendationEngine.explainRecommendation) {
        const detailedExplanation = await this._recommendationEngine.explainRecommendation(trackId, userId, userContext);
        explanation = detailedExplanation.explanation || explanation;
      }

      return {
        trackId,
        userId,
        track: trackInfo,
        explanation,
        factors: this._generateExplanationFactors(trackInfo, userContext),
        metadata: {
          generatedAt: new Date().toISOString(),
          source: 'ChatRecommendationOrchestrator'
        }
      };
    } catch (error) {
      console.error('Error generating explanation:', error);
      return {
        trackId,
        userId,
        explanation: 'Unable to generate explanation at this time.',
        error: error.message
      };
    }
  }

  // Private helper methods

  async _getUserProfile(userId) {
    // Implementation to fetch user profile
    return await this._databaseManager.getUserProfile(userId);
  }

  async _getListeningHistory(userId) {
    // Implementation to fetch listening history
    return await this._databaseManager.getListeningHistory(userId, this.options.contextWindowSize);
  }

  async _getUserPreferences(userId) {
    // Implementation to fetch user preferences
    return await this._databaseManager.getUserPreferences(userId);
  }

  async _getRecentSessions(userId) {
    // Implementation to fetch recent chat sessions
    return await this._databaseManager.getRecentSessions(userId, 5);
  }

  _getDefaultUserContext(userId) {
    return {
      userId,
      timestamp: new Date().toISOString(),
      profile: null,
      listeningHistory: [],
      preferences: {},
      recentSessions: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        latencyMs: 0,
        source: 'ChatRecommendationOrchestrator',
        fallback: true
      }
    };
  }

  _getFallbackRecommendations(userId, options) {
    return {
      userId,
      recommendations: [],
      strategy: 'fallback',
      metadata: {
        generatedAt: new Date().toISOString(),
        latencyMs: 0,
        source: 'ChatRecommendationOrchestrator',
        fallback: true,
        error: 'Unable to generate recommendations'
      }
    };
  }

  _getDefaultChatContext(userId) {
    return {
      user: { id: userId, preferences: null, recentActivity: null },
      conversation: { history: [], currentSession: new Date().toISOString() },
      musicContext: { topGenres: [], recentTracks: [], moodIndicators: [] },
      metadata: {
        tokenEstimate: 100,
        truncated: false,
        generatedAt: new Date().toISOString(),
        fallback: true
      }
    };
  }

  _createMockRecommendationEngine() {
    return {
      async generate(options) {
        console.log('Using mock recommendation engine');
        return {
          candidates: [],
          diagnostics: { source: 'mock', strategy: 'fallback' }
        };
      }
    };
  }

  _createMockCacheManager() {
    return {
      async get() { return null; },
      async set() { return true; },
      async invalidate() { return true; }
    };
  }

  async _getCachedRecommendations(userId, options) {
    const cacheKey = `recommendations:${userId}:${JSON.stringify(options)}`;
    return await this._cacheManager.get(cacheKey);
  }

  async _cacheRecommendations(userId, options, result) {
    const cacheKey = `recommendations:${userId}:${JSON.stringify(options)}`;
    const ttl = 600; // 10 minutes
    await this._cacheManager.set(cacheKey, result, ttl);
  }

  async _invalidateUserCaches(userId) {
    await this._cacheManager.invalidate(`recommendations:${userId}:*`);
    await this._cacheManager.invalidate(`context:${userId}:*`);
  }

  _summarizeRecentActivity(userContext) {
    if (!userContext.listeningHistory || userContext.listeningHistory.length === 0) {
      return null;
    }

    const recent = userContext.listeningHistory.slice(0, 5);
    return {
      recentTracks: recent.length,
      topGenres: this._extractTopGenres(userContext).slice(0, 3),
      lastActivity: recent[0]?.played_at || null
    };
  }

  _extractTopGenres(userContext) {
    // Extract top genres from listening history
    if (!userContext.listeningHistory) return [];
    
    const genreCounts = {};
    userContext.listeningHistory.forEach(track => {
      if (track.genres) {
        track.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    return Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);
  }

  _extractRecentTracks(userContext, limit = 10) {
    if (!userContext.listeningHistory) return [];
    return userContext.listeningHistory.slice(0, limit);
  }

  _extractMoodIndicators(userContext) {
    // Extract mood indicators from recent activity
    if (!userContext.listeningHistory) return [];
    
    return userContext.listeningHistory
      .slice(0, 10)
      .map(track => track.valence || track.energy)
      .filter(Boolean);
  }

  _estimateTokenCount(context) {
    // Rough token estimation (4 chars = 1 token)
    const text = JSON.stringify(context);
    return Math.ceil(text.length / 4);
  }

  _applyTokenBudgeting(chatContext, maxTokens) {
    // Simplified token budgeting - truncate conversation history first
    const truncated = { ...chatContext };
    
    while (this._estimateTokenCount(truncated) > maxTokens && truncated.conversation.history.length > 0) {
      truncated.conversation.history.pop();
      truncated.metadata.truncated = true;
    }

    return truncated;
  }

  async _getConversationHistory(userId, limit = 5) {
    try {
      return await this._databaseManager.getConversationHistory(userId, limit);
    } catch (error) {
      console.warn('Unable to fetch conversation history:', error);
      return [];
    }
  }

  _generateExplanationFactors(trackInfo, userContext) {
    const factors = [];
    
    if (trackInfo && userContext.preferences) {
      if (userContext.preferences.favoriteGenres && trackInfo.genres) {
        const matchingGenres = trackInfo.genres.filter(g => 
          userContext.preferences.favoriteGenres.includes(g)
        );
        if (matchingGenres.length > 0) {
          factors.push(`Matches your preferred genres: ${matchingGenres.join(', ')}`);
        }
      }
      
      if (trackInfo.audio_features) {
        factors.push('Audio features align with your listening patterns');
      }
    }

    if (factors.length === 0) {
      factors.push('Based on collaborative filtering and user behavior');
    }

    return factors;
  }
}

module.exports = { ChatRecommendationOrchestrator };