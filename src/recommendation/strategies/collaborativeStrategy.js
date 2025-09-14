/**
 * Collaborative Filtering Strategy
 * 
 * Recommends music based on user behavior patterns and collaborative filtering.
 * Uses user-item interactions to find similar users and recommend their preferences.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class CollaborativeStrategy {
  constructor(options = {}) {
    this.name = 'collaborative';
    this.options = {
      minSimilarUsers: 5,
      maxSimilarUsers: 50,
      minInteractions: 3,
      similarityThreshold: 0.1,
      diversityWeight: 0.3,
      ...options
    };
    
    this.userSimilarities = new Map();
    this.userInteractions = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the strategy
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load user interaction data
      await this._loadUserInteractions();
      
      this.initialized = true;
      console.log('CollaborativeStrategy initialized');
    } catch (error) {
      console.error('Failed to initialize CollaborativeStrategy:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations using collaborative filtering
   * @param {Object} params - Generation parameters
   * @returns {Object} Recommendations with diagnostics
   */
  async run(params) {
    await this.initialize();

    const { userId, limits, context, filters = {} } = params;
    const startTime = Date.now();

    try {
      // Get user's interaction history
      const userHistory = this._getUserHistory(userId, context);
      
      if (userHistory.length < this.options.minInteractions) {
        return this._handleColdStart(params);
      }

      // Find similar users
      const similarUsers = await this._findSimilarUsers(userId, userHistory);
      
      if (similarUsers.length < this.options.minSimilarUsers) {
        return this._handleInsufficientData(params);
      }

      // Generate recommendations from similar users
      const candidates = await this._generateFromSimilarUsers(
        userId, 
        similarUsers, 
        userHistory, 
        limits.candidates
      );

      // Apply filters and ranking
      const filteredCandidates = this._applyFilters(candidates, filters);
      const rankedCandidates = this._rankCandidates(filteredCandidates, userHistory);

      return {
        candidates: rankedCandidates.slice(0, limits.final),
        diagnostics: {
          strategy: this.name,
          similarUsers: similarUsers.length,
          candidatesGenerated: candidates.length,
          candidatesFiltered: filteredCandidates.length,
          userHistorySize: userHistory.length,
          executionTime: Date.now() - startTime,
          confidence: this._calculateConfidence(similarUsers, userHistory)
        }
      };

    } catch (error) {
      console.error('Error in CollaborativeStrategy:', error);
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

  /**
   * Update user model with new feedback
   * @param {string} userId - User identifier
   * @param {Object} feedback - User feedback
   */
  async updateUserModel(userId, feedback) {
    try {
      // Update user interactions
      if (!this.userInteractions.has(userId)) {
        this.userInteractions.set(userId, []);
      }

      const interactions = this.userInteractions.get(userId);
      interactions.push({
        trackId: feedback.trackId,
        signal: feedback.signal,
        timestamp: feedback.timestamp,
        weight: this._signalToWeight(feedback.signal)
      });

      // Keep only recent interactions (sliding window)
      const maxInteractions = 1000;
      if (interactions.length > maxInteractions) {
        interactions.splice(0, interactions.length - maxInteractions);
      }

      // Invalidate similarity cache for this user
      this.userSimilarities.delete(userId);
      
      console.log(`Updated user model for ${userId}: ${interactions.length} interactions`);
    } catch (error) {
      console.error('Error updating user model:', error);
    }
  }

  // Private methods

  async _loadUserInteractions() {
    const MongoDBManager = require('../../database/mongodb-manager');
    
    try {
      console.log('Loading real user interactions from MongoDB...');
      
      // Connect to MongoDB
      const mongoManager = new MongoDBManager();
      if (!mongoManager._isConnected) {
        await mongoManager.connect();
      }
      
      const db = mongoManager.db;
      if (!db) {
        throw new Error('MongoDB connection not available');
      }
      
      // Load real user interaction data from MongoDB
      const userInteractions = await db.collection('user_interactions')
        .aggregate([
          {
            $match: {
              timestamp: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
            }
          },
          {
            $group: {
              _id: '$userId',
              interactions: {
                $push: {
                  trackId: '$trackId',
                  signal: '$signal',
                  weight: '$weight',
                  timestamp: '$timestamp',
                  sessionId: '$sessionId'
                }
              },
              totalInteractions: { $sum: 1 }
            }
          },
          {
            $match: {
              totalInteractions: { $gte: this.options.minInteractions }
            }
          }
        ])
        .toArray();

      // Process and store the interactions
      for (const user of userInteractions) {
        this.userInteractions.set(user._id, user.interactions);
      }

      if (this.userInteractions.size === 0) {
        console.warn('⚠️ No sufficient user interaction data found for collaborative filtering');
        // Don't throw error - gracefully handle by indicating insufficient data
        return false;
      }

      console.log(`✅ Loaded interactions for ${this.userInteractions.size} users`);
      return true;
    } catch (error) {
      console.error('Failed to load user interactions:', error);
      return false;
    }
  }

  _getUserHistory(userId, context) {
    // Combine stored interactions with context history
    const storedHistory = this.userInteractions.get(userId) || [];
    const contextHistory = context?.listeningHistory || [];
    
    // Convert context history to interaction format
    const contextInteractions = contextHistory.map(track => ({
      trackId: track.id || track.trackId,
      signal: 'play',
      timestamp: track.played_at || track.timestamp,
      weight: 1.0
    }));

    // Combine and deduplicate
    const combined = [...storedHistory, ...contextInteractions];
    const seen = new Set();
    
    return combined.filter(interaction => {
      const key = `${interaction.trackId}_${interaction.signal}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async _findSimilarUsers(targetUserId, targetHistory) {
    const similarities = [];
    
    for (const [userId, userHistory] of this.userInteractions) {
      if (userId === targetUserId) continue;
      
      const similarity = this._calculateUserSimilarity(targetHistory, userHistory);
      
      if (similarity >= this.options.similarityThreshold) {
        similarities.push({ userId, similarity });
      }
    }

    // Sort by similarity and limit
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.options.maxSimilarUsers);
  }

  _calculateUserSimilarity(history1, history2) {
    // Simple Jaccard similarity based on common tracks
    const tracks1 = new Set(history1.map(h => h.trackId));
    const tracks2 = new Set(history2.map(h => h.trackId));
    
    const intersection = new Set([...tracks1].filter(t => tracks2.has(t)));
    const union = new Set([...tracks1, ...tracks2]);
    
    if (union.size === 0) return 0;
    
    return intersection.size / union.size;
  }

  async _generateFromSimilarUsers(userId, similarUsers, userHistory, limit) {
    const candidates = new Map();
    const userTracks = new Set(userHistory.map(h => h.trackId));
    
    for (const { userId: similarUserId, similarity } of similarUsers) {
      const similarUserHistory = this.userInteractions.get(similarUserId) || [];
      
      for (const interaction of similarUserHistory) {
        if (userTracks.has(interaction.trackId)) continue; // Skip already known tracks
        
        const trackId = interaction.trackId;
        const weight = interaction.weight * similarity;
        
        if (candidates.has(trackId)) {
          candidates.set(trackId, {
            ...candidates.get(trackId),
            score: candidates.get(trackId).score + weight,
            supportingUsers: candidates.get(trackId).supportingUsers + 1
          });
        } else {
          candidates.set(trackId, {
            trackId,
            score: weight,
            supportingUsers: 1,
            reasons: [`Liked by ${Math.floor(similarity * 100)}% similar users`]
          });
        }
      }
    }

    // Convert to array and sort by score
    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  _applyFilters(candidates, filters) {
    return candidates.filter(candidate => {
      // Apply genre filter
      if (filters.genre && candidate.genre && !candidate.genre.includes(filters.genre)) {
        return false;
      }
      
      // Apply minimum score filter
      if (filters.minScore && candidate.score < filters.minScore) {
        return false;
      }
      
      return true;
    });
  }

  _rankCandidates(candidates, userHistory) {
    // Apply additional ranking based on recency, popularity, and diversity
    return candidates.map(candidate => ({
      ...candidate,
      score: candidate.score * this._calculateRankingBoost(candidate, userHistory)
    })).sort((a, b) => b.score - a.score);
  }

  _calculateRankingBoost(candidate, userHistory) {
    let boost = 1.0;
    
    // Boost tracks with more supporting users
    boost *= Math.min(1.0 + (candidate.supportingUsers - 1) * 0.1, 2.0);
    
    // Apply diversity penalty for very similar tracks (simplified)
    // In a real implementation, this would use audio features
    
    return boost;
  }

  _calculateConfidence(similarUsers, userHistory) {
    if (similarUsers.length === 0 || userHistory.length === 0) return 0;
    
    const avgSimilarity = similarUsers.reduce((sum, u) => sum + u.similarity, 0) / similarUsers.length;
    const historyFactor = Math.min(userHistory.length / 20, 1); // More history = higher confidence
    
    return avgSimilarity * historyFactor;
  }

  _signalToWeight(signal) {
    const weights = {
      like: 2.0,
      love: 3.0,
      replay: 1.5,
      play: 1.0,
      skip: -0.5,
      dislike: -1.0,
      hate: -2.0
    };
    
    return weights[signal] || 0;
  }

  _handleColdStart(params) {
    return {
      candidates: [],
      diagnostics: {
        strategy: this.name,
        coldStart: true,
        reason: 'Insufficient user interaction history',
        recommendation: 'Use content-based strategy instead'
      }
    };
  }

  _handleInsufficientData(params) {
    return {
      candidates: [],
      diagnostics: {
        strategy: this.name,
        insufficientData: true,
        reason: 'Not enough similar users found',
        recommendation: 'Expand user base or use hybrid approach'
      }
    };
  }
}

module.exports = CollaborativeStrategy;