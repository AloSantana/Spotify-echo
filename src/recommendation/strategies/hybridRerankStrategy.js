/**
 * Hybrid Rerank Strategy
 * 
 * Combines multiple recommendation strategies with intelligent reranking.
 * Uses weighted combination and advanced reranking algorithms for optimal results.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class HybridRerankStrategy {
  constructor(options = {}) {
    this.name = 'hybrid-rerank';
    this.options = {
      strategyWeights: {
        collaborative: 0.4,
        'content-based': 0.35,
        'embedding-semantic': 0.25
      },
      minStrategies: 2,
      diversityWeight: 0.3,
      noveltyWeight: 0.2,
      popularityWeight: 0.1,
      rerankingAlgorithm: 'weighted_fusion', // 'weighted_fusion', 'rank_fusion', 'interleaving'
      ...options
    };
    
    this.subStrategies = {};
    this.initialized = false;
  }

  /**
   * Initialize the strategy and load sub-strategies
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load and initialize sub-strategies
      await this._loadSubStrategies();
      
      this.initialized = true;
      console.log('HybridRerankStrategy initialized');
    } catch (error) {
      console.error('Failed to initialize HybridRerankStrategy:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations using hybrid approach
   * @param {Object} params - Generation parameters
   * @returns {Object} Recommendations with diagnostics
   */
  async run(params) {
    await this.initialize();

    const { userId, limits, context, filters = {} } = params;
    const startTime = Date.now();

    try {
      // Determine which strategies to use
      const activeStrategies = this._selectActiveStrategies(context, filters);
      
      if (activeStrategies.length < this.options.minStrategies) {
        return this._handleInsufficientStrategies(params, activeStrategies);
      }

      // Run all strategies in parallel
      const strategyResults = await this._runMultipleStrategies(activeStrategies, params);
      
      // Combine and rerank results
      const hybridCandidates = await this._combineAndRerank(
        strategyResults,
        context,
        limits.candidates
      );

      // Apply final filtering and ranking
      const finalCandidates = this._applyFinalRanking(hybridCandidates, context, limits.final);

      return {
        candidates: finalCandidates,
        diagnostics: {
          strategy: this.name,
          activeStrategies: activeStrategies.length,
          strategyResults: strategyResults.map(r => ({
            strategy: r.strategy,
            candidates: r.result.candidates.length,
            executionTime: r.result.diagnostics?.executionTime || 0
          })),
          combinedCandidates: hybridCandidates.length,
          rerankingAlgorithm: this.options.rerankingAlgorithm,
          executionTime: Date.now() - startTime,
          confidence: this._calculateHybridConfidence(strategyResults)
        }
      };

    } catch (error) {
      console.error('Error in HybridRerankStrategy:', error);
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
   * Update user model across all sub-strategies
   * @param {string} userId - User identifier
   * @param {Object} feedback - User feedback
   */
  async updateUserModel(userId, feedback) {
    await this.initialize();

    try {
      // Update all sub-strategies that support user model updates
      const updatePromises = Object.values(this.subStrategies)
        .filter(strategy => strategy.updateUserModel)
        .map(strategy => strategy.updateUserModel(userId, feedback));

      await Promise.allSettled(updatePromises);
      return { success: true };
    } catch (error) {
      console.error('Error updating hybrid user model:', error);
      return { success: false, error: error.message };
    }
  }

  // Private methods

  async _loadSubStrategies() {
    try {
      const CollaborativeStrategy = require('./collaborativeStrategy');
      this.subStrategies.collaborative = new CollaborativeStrategy();
    } catch (error) {
      console.warn('Collaborative strategy not available');
    }

    try {
      const ContentStrategy = require('./contentAudioFeatureStrategy');
      this.subStrategies['content-based'] = new ContentStrategy();
    } catch (error) {
      console.warn('Content-based strategy not available');
    }

    try {
      const SemanticStrategy = require('./embeddingSemanticStrategy');
      this.subStrategies['embedding-semantic'] = new SemanticStrategy();
    } catch (error) {
      console.warn('Semantic strategy not available');
    }

    // Initialize all loaded strategies
    for (const [name, strategy] of Object.entries(this.subStrategies)) {
      try {
        if (strategy.initialize) {
          await strategy.initialize();
        }
      } catch (error) {
        console.warn(`Failed to initialize ${name} strategy:`, error);
        delete this.subStrategies[name];
      }
    }
  }

  _selectActiveStrategies(context, filters) {
    const strategies = [];
    
    // Always try collaborative if user has sufficient history
    if (this.subStrategies.collaborative && context?.listeningHistory?.length > 5) {
      strategies.push('collaborative');
    }
    
    // Always try content-based
    if (this.subStrategies['content-based']) {
      strategies.push('content-based');
    }
    
    // Use semantic if there are semantic queries or text input
    if (this.subStrategies['embedding-semantic'] && 
        (context?.userMessage || filters.mood || filters.activity)) {
      strategies.push('embedding-semantic');
    }

    return strategies;
  }

  async _runMultipleStrategies(strategyNames, params) {
    const promises = strategyNames.map(async (strategyName) => {
      try {
        const strategy = this.subStrategies[strategyName];
        const result = await strategy.run(params);
        
        return {
          strategy: strategyName,
          result,
          weight: this.options.strategyWeights[strategyName] || 0.1
        };
      } catch (error) {
        console.error(`Error running ${strategyName} strategy:`, error);
        return {
          strategy: strategyName,
          result: { candidates: [], diagnostics: { error: error.message } },
          weight: 0
        };
      }
    });

    return Promise.all(promises);
  }

  async _combineAndRerank(strategyResults, context, limit) {
    switch (this.options.rerankingAlgorithm) {
      case 'weighted_fusion':
        return this._weightedFusion(strategyResults, context, limit);
      case 'rank_fusion':
        return this._rankFusion(strategyResults, context, limit);
      case 'interleaving':
        return this._interleaving(strategyResults, context, limit);
      default:
        return this._weightedFusion(strategyResults, context, limit);
    }
  }

  _weightedFusion(strategyResults, context, limit) {
    const candidateMap = new Map();
    
    // Combine candidates from all strategies
    for (const { result, weight, strategy } of strategyResults) {
      for (const candidate of result.candidates || []) {
        const trackId = candidate.trackId;
        
        if (candidateMap.has(trackId)) {
          const existing = candidateMap.get(trackId);
          existing.score += candidate.score * weight;
          existing.strategySupport.push(strategy);
          existing.reasons.push(...(candidate.reasons || []));
        } else {
          candidateMap.set(trackId, {
            ...candidate,
            score: candidate.score * weight,
            strategySupport: [strategy],
            reasons: candidate.reasons || [],
            hybridScore: candidate.score * weight
          });
        }
      }
    }

    // Convert to array and apply hybrid scoring
    let candidates = Array.from(candidateMap.values());
    
    // Apply multi-strategy bonus
    candidates = candidates.map(candidate => {
      const strategyBonus = candidate.strategySupport.length > 1 ? 
        1 + (candidate.strategySupport.length - 1) * 0.2 : 1;
      
      return {
        ...candidate,
        score: candidate.score * strategyBonus,
        multiStrategy: candidate.strategySupport.length > 1
      };
    });

    // Sort and limit
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  _rankFusion(strategyResults, context, limit) {
    const trackRanks = new Map();
    
    // Calculate reciprocal rank scores
    for (const { result, weight, strategy } of strategyResults) {
      const candidates = result.candidates || [];
      
      candidates.forEach((candidate, index) => {
        const trackId = candidate.trackId;
        const rankScore = weight / (index + 1); // Reciprocal rank with weight
        
        if (trackRanks.has(trackId)) {
          const existing = trackRanks.get(trackId);
          existing.rankScore += rankScore;
          existing.strategySupport.push(strategy);
          existing.minRank = Math.min(existing.minRank, index);
        } else {
          trackRanks.set(trackId, {
            ...candidate,
            rankScore,
            strategySupport: [strategy],
            minRank: index,
            reasons: candidate.reasons || []
          });
        }
      });
    }

    return Array.from(trackRanks.values())
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit);
  }

  _interleaving(strategyResults, context, limit) {
    const interleavedList = [];
    const strategyCursors = strategyResults.map(sr => ({ 
      candidates: sr.result.candidates || [], 
      cursor: 0, 
      weight: sr.weight,
      strategy: sr.strategy
    }));
    
    const seenTracks = new Set();
    
    while (interleavedList.length < limit && strategyCursors.some(sc => sc.cursor < sc.candidates.length)) {
      // Select strategy based on weight and remaining candidates
      const availableStrategies = strategyCursors.filter(sc => sc.cursor < sc.candidates.length);
      
      if (availableStrategies.length === 0) break;
      
      // Weighted selection of strategy
      const totalWeight = availableStrategies.reduce((sum, sc) => sum + sc.weight, 0);
      let random = Math.random() * totalWeight;
      
      let selectedStrategy = availableStrategies[0];
      for (const strategy of availableStrategies) {
        random -= strategy.weight;
        if (random <= 0) {
          selectedStrategy = strategy;
          break;
        }
      }
      
      // Get next candidate from selected strategy
      const candidate = selectedStrategy.candidates[selectedStrategy.cursor];
      selectedStrategy.cursor++;
      
      // Add to interleaved list if not seen
      if (!seenTracks.has(candidate.trackId)) {
        seenTracks.add(candidate.trackId);
        interleavedList.push({
          ...candidate,
          interleavedFrom: selectedStrategy.strategy,
          interleavedPosition: interleavedList.length
        });
      }
    }
    
    return interleavedList;
  }

  _applyFinalRanking(candidates, context, limit) {
    // Apply diversity, novelty, and popularity adjustments
    return candidates.map(candidate => {
      let finalScore = candidate.score || candidate.rankScore || 1.0;
      
      // Diversity boost (simplified - would use audio features in real implementation)
      if (candidate.multiStrategy) {
        finalScore *= (1 + this.options.diversityWeight);
      }
      
      // Novelty boost (boost tracks not in recent listening history)
      if (context?.listeningHistory) {
        const recentTracks = new Set(context.listeningHistory.map(t => t.id || t.trackId));
        if (!recentTracks.has(candidate.trackId)) {
          finalScore *= (1 + this.options.noveltyWeight);
        }
      }
      
      return {
        ...candidate,
        finalScore,
        adjustments: {
          diversity: candidate.multiStrategy,
          novelty: true // Simplified
        }
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
  }

  _calculateHybridConfidence(strategyResults) {
    if (strategyResults.length === 0) return 0;
    
    // Weight confidence by strategy performance
    let totalConfidence = 0;
    let totalWeight = 0;
    
    for (const { result, weight } of strategyResults) {
      const confidence = result.diagnostics?.confidence || 0.5;
      totalConfidence += confidence * weight;
      totalWeight += weight;
    }
    
    const avgConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    
    // Bonus for multiple strategies
    const strategyBonus = Math.min(strategyResults.length / 3, 1);
    
    return avgConfidence * (1 + strategyBonus * 0.2);
  }

  _handleInsufficientStrategies(params, activeStrategies) {
    return {
      candidates: [],
      diagnostics: {
        strategy: this.name,
        insufficientStrategies: true,
        activeStrategies: activeStrategies.length,
        minRequired: this.options.minStrategies,
        reason: 'Not enough strategies available for hybrid approach',
        recommendation: 'Use individual strategies or improve strategy availability'
      }
    };
  }
}

module.exports = HybridRerankStrategy;