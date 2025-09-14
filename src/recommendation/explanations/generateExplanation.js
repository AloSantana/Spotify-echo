/**
 * Recommendation Explanation Generator
 * Generates human-readable explanations for music recommendations using real data
 */

class ExplanationGenerator {
  constructor() {
    this.templates = {
      collaborative: {
        high: "Users with similar music taste often enjoy this track",
        medium: "Other listeners with interests like yours have liked this",
        low: "This track is popular among users with some overlapping preferences"
      },
      content: {
        high: "This matches your audio preferences perfectly (energy: {energy}, valence: {valence})",
        medium: "The audio features align well with your listening patterns",
        low: "This has some musical characteristics similar to your preferences"
      },
      semantic: {
        high: "This track's style and mood closely match your recent listening",
        medium: "The genre and musical style are similar to tracks you enjoy",
        low: "This shares some thematic elements with music you like"
      },
      hybrid: {
        high: "Multiple recommendation systems strongly agree this fits your taste",
        medium: "Several recommendation approaches suggest you'd enjoy this",
        low: "This track scores well across different recommendation methods"
      },
      diversity: {
        high: "This adds variety while staying within your preferences",
        medium: "Expanding your musical horizons with this recommendation",
        low: "A slight departure from your usual style you might enjoy"
      },
      novelty: {
        high: "This is a recent release that matches your taste",
        medium: "A newer track that aligns with your preferences",
        low: "Fresh music similar to what you already enjoy"
      },
      popularity: {
        high: "This is trending and matches your musical preferences",
        medium: "A popular track that fits your listening style",
        low: "Many listeners enjoy this track"
      }
    };

    this.audioFeatureDescriptions = {
      energy: {
        high: "high-energy",
        medium: "moderate energy",
        low: "mellow"
      },
      valence: {
        high: "upbeat and positive",
        medium: "balanced mood",
        low: "moody and introspective"
      },
      danceability: {
        high: "very danceable",
        medium: "somewhat danceable", 
        low: "more contemplative"
      },
      acousticness: {
        high: "acoustic",
        medium: "semi-acoustic",
        low: "electronic"
      },
      tempo: {
        fast: "fast-paced",
        medium: "moderate tempo",
        slow: "slow-paced"
      }
    };
  }

  /**
   * Generate explanation for a recommendation
   * @param {Object} recommendation - Recommendation object with metadata
   * @param {Object} userProfile - User's music profile and preferences
   * @returns {Object} Explanation with primary and detailed text
   */
  generateExplanation(recommendation, userProfile = {}) {
    try {
      if (!recommendation || !recommendation.metadata) {
        return this.getFallbackExplanation();
      }

      const { metadata, track } = recommendation;
      const { strategies, scores, features } = metadata;

      // Determine primary reason
      const primaryStrategy = this.getPrimaryStrategy(strategies, scores);
      const confidence = this.getConfidenceLevel(scores);

      // Generate primary explanation
      const primaryExplanation = this.generatePrimaryExplanation(
        primaryStrategy,
        confidence,
        features,
        track
      );

      // Generate detailed breakdown
      const detailedExplanation = this.generateDetailedExplanation(
        strategies,
        scores,
        features,
        track,
        userProfile
      );

      // Generate audio feature description
      const audioDescription = this.generateAudioFeatureDescription(features);

      return {
        primary: primaryExplanation,
        detailed: detailedExplanation,
        audioFeatures: audioDescription,
        confidence: confidence,
        strategies: Object.keys(strategies || {}),
        metadata: {
          primaryStrategy,
          confidenceScore: this.getMaxScore(scores),
          featuresUsed: Object.keys(features || {})
        }
      };
    } catch (error) {
      console.error('Error generating explanation:', error);
      return this.getFallbackExplanation();
    }
  }

  /**
   * Get primary strategy that contributed most to the recommendation
   */
  getPrimaryStrategy(strategies, scores) {
    if (!strategies || !scores) return 'hybrid';

    let maxScore = 0;
    let primaryStrategy = 'hybrid';

    Object.entries(scores).forEach(([strategy, score]) => {
      if (score > maxScore) {
        maxScore = score;
        primaryStrategy = strategy;
      }
    });

    return primaryStrategy;
  }

  /**
   * Determine confidence level based on scores
   */
  getConfidenceLevel(scores) {
    if (!scores) return 'medium';

    const maxScore = this.getMaxScore(scores);
    
    if (maxScore >= 0.8) return 'high';
    if (maxScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Get maximum score from scores object
   */
  getMaxScore(scores) {
    if (!scores || typeof scores !== 'object') return 0;
    return Math.max(...Object.values(scores));
  }

  /**
   * Generate primary explanation text
   */
  generatePrimaryExplanation(strategy, confidence, features, track) {
    const template = this.templates[strategy]?.[confidence] || 
                    this.templates.hybrid[confidence];
    
    return this.interpolateTemplate(template, features, track);
  }

  /**
   * Generate detailed explanation breakdown
   */
  generateDetailedExplanation(strategies, scores, features, track, userProfile) {
    const explanations = [];

    // Add strategy-specific explanations
    Object.entries(scores || {}).forEach(([strategy, score]) => {
      if (score > 0.3) { // Only include meaningful contributions
        const confidence = score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';
        const template = this.templates[strategy]?.[confidence];
        
        if (template) {
          const explanation = this.interpolateTemplate(template, features, track);
          explanations.push({
            strategy,
            score,
            explanation
          });
        }
      }
    });

    // Add diversity/novelty explanations if applicable
    if (features?.novelty > 0.6) {
      explanations.push({
        strategy: 'novelty',
        score: features.novelty,
        explanation: this.templates.novelty.high
      });
    }

    if (features?.diversity > 0.6) {
      explanations.push({
        strategy: 'diversity', 
        score: features.diversity,
        explanation: this.templates.diversity.medium
      });
    }

    return explanations;
  }

  /**
   * Generate audio feature description
   */
  generateAudioFeatureDescription(features) {
    if (!features || typeof features !== 'object') {
      return "Audio characteristics not available";
    }

    const descriptions = [];

    // Energy
    if (typeof features.energy === 'number') {
      const level = features.energy >= 0.7 ? 'high' : features.energy >= 0.4 ? 'medium' : 'low';
      descriptions.push(this.audioFeatureDescriptions.energy[level]);
    }

    // Valence (mood)
    if (typeof features.valence === 'number') {
      const level = features.valence >= 0.7 ? 'high' : features.valence >= 0.4 ? 'medium' : 'low';
      descriptions.push(this.audioFeatureDescriptions.valence[level]);
    }

    // Tempo
    if (typeof features.tempo === 'number') {
      const level = features.tempo >= 140 ? 'fast' : features.tempo >= 90 ? 'medium' : 'slow';
      descriptions.push(this.audioFeatureDescriptions.tempo[level]);
    }

    // Acousticness
    if (typeof features.acousticness === 'number') {
      const level = features.acousticness >= 0.7 ? 'high' : features.acousticness >= 0.3 ? 'medium' : 'low';
      descriptions.push(this.audioFeatureDescriptions.acousticness[level]);
    }

    if (descriptions.length === 0) {
      return "Audio characteristics not available";
    }

    return `This track is ${descriptions.join(', ')}`;
  }

  /**
   * Interpolate template with real feature values
   */
  interpolateTemplate(template, features, track) {
    if (!template) return "Recommended based on your listening preferences";

    let result = template;

    // Replace feature placeholders with actual values
    if (features) {
      Object.entries(features).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        if (result.includes(placeholder) && typeof value === 'number') {
          result = result.replace(placeholder, (value * 100).toFixed(0) + '%');
        }
      });
    }

    // Replace track placeholders
    if (track) {
      if (track.name && result.includes('{trackName}')) {
        result = result.replace('{trackName}', track.name);
      }
      if (track.artist && result.includes('{artist}')) {
        result = result.replace('{artist}', track.artist);
      }
      if (track.genre && result.includes('{genre}')) {
        result = result.replace('{genre}', track.genre);
      }
    }

    return result;
  }

  /**
   * Generate explanation for a list of recommendations
   */
  generateBatchExplanations(recommendations, userProfile = {}) {
    return recommendations.map(rec => ({
      ...rec,
      explanation: this.generateExplanation(rec, userProfile)
    }));
  }

  /**
   * Generate summary explanation for a set of recommendations
   */
  generateSummaryExplanation(recommendations, userProfile = {}) {
    if (!recommendations || recommendations.length === 0) {
      return "No recommendations available";
    }

    const strategies = new Set();
    const totalRecommendations = recommendations.length;
    
    // Analyze primary strategies used
    recommendations.forEach(rec => {
      if (rec.metadata?.strategies) {
        Object.keys(rec.metadata.strategies).forEach(strategy => {
          strategies.add(strategy);
        });
      }
    });

    const strategyList = Array.from(strategies);
    
    if (strategyList.length === 0) {
      return `Generated ${totalRecommendations} recommendations based on your listening preferences`;
    }

    if (strategyList.length === 1) {
      const strategy = strategyList[0];
      return `Generated ${totalRecommendations} recommendations using ${strategy} analysis of your music taste`;
    }

    return `Generated ${totalRecommendations} recommendations by analyzing your music preferences across multiple approaches: ${strategyList.join(', ')}`;
  }

  /**
   * Get fallback explanation when data is insufficient
   */
  getFallbackExplanation() {
    return {
      primary: "Recommended based on your listening preferences",
      detailed: [{
        strategy: 'fallback',
        score: 0.5,
        explanation: "This recommendation is based on general music preferences and popularity"
      }],
      audioFeatures: "Audio characteristics not available",
      confidence: 'medium',
      strategies: ['fallback'],
      metadata: {
        primaryStrategy: 'fallback',
        confidenceScore: 0.5,
        featuresUsed: []
      }
    };
  }

  /**
   * Validate explanation object
   */
  validateExplanation(explanation) {
    return !!(
      explanation &&
      explanation.primary &&
      explanation.detailed &&
      Array.isArray(explanation.detailed) &&
      explanation.confidence &&
      explanation.strategies &&
      Array.isArray(explanation.strategies)
    );
  }
}

module.exports = ExplanationGenerator;