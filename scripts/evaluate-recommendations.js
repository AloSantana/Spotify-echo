/**
 * Recommendation Evaluation Harness
 * 
 * Evaluates recommendation strategy performance with metrics for precision,
 * diversity, novelty, and user acceptance proxies.
 * 
 * Usage:
 *   node scripts/evaluate-recommendations.js
 *   node scripts/evaluate-recommendations.js --strategy collaborative
 *   node scripts/evaluate-recommendations.js --output reports/evaluation.json
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

class RecommendationEvaluator {
  constructor(options = {}) {
    this.options = {
      testUsers: 10,
      recommendationsPerUser: 20,
      evaluationMetrics: ['precision', 'diversity', 'novelty', 'coverage'],
      strategies: ['collaborative', 'content-based', 'embedding-semantic', 'hybrid-rerank'],
      outputDir: 'reports',
      verbose: false,
      ...options
    };

    this.results = {};
    this.testData = null;
  }

  /**
   * Run comprehensive evaluation of recommendation strategies
   * @param {Array} strategiesToTest - Strategies to evaluate
   * @returns {Object} Evaluation results
   */
  async runEvaluation(strategiesToTest = null) {
    console.log('🧪 Starting recommendation evaluation...');
    
    const strategies = strategiesToTest || this.options.strategies;
    
    try {
      // Initialize test data
      await this._prepareTestData();
      
      // Evaluate each strategy
      for (const strategy of strategies) {
        console.log(`📊 Evaluating strategy: ${strategy}`);
        this.results[strategy] = await this._evaluateStrategy(strategy);
      }
      
      // Calculate comparative metrics
      const comparison = this._compareStrategies();
      
      // Generate summary report
      const summary = this._generateSummary();
      
      const finalResults = {
        timestamp: new Date().toISOString(),
        strategies: this.results,
        comparison,
        summary,
        metadata: {
          testUsers: this.options.testUsers,
          recommendationsPerUser: this.options.recommendationsPerUser,
          evaluationMetrics: this.options.evaluationMetrics
        }
      };
      
      console.log('✅ Evaluation complete!');
      return finalResults;
      
    } catch (error) {
      console.error('❌ Evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate a single strategy
   * @param {string} strategyName - Strategy to evaluate
   * @returns {Object} Strategy evaluation results
   */
  async _evaluateStrategy(strategyName) {
    const startTime = Date.now();
    
    try {
      // Load strategy
      const strategy = await this._loadStrategy(strategyName);
      
      // Generate recommendations for test users
      const userResults = [];
      
      for (const testUser of this.testData.users) {
        const userResult = await this._evaluateUserRecommendations(
          strategy, 
          testUser, 
          strategyName
        );
        userResults.push(userResult);
        
        if (this.options.verbose) {
          console.log(`  User ${testUser.id}: ${userResult.metrics.precision.toFixed(3)} precision`);
        }
      }
      
      // Aggregate metrics
      const aggregatedMetrics = this._aggregateUserResults(userResults);
      
      return {
        strategy: strategyName,
        userResults,
        aggregatedMetrics,
        executionTime: Date.now() - startTime,
        evaluatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error evaluating ${strategyName}:`, error);
      return {
        strategy: strategyName,
        error: error.message,
        executionTime: Date.now() - startTime,
        evaluatedAt: new Date().toISOString()
      };
    }
  }

  async _evaluateUserRecommendations(strategy, testUser, strategyName) {
    try {
      // Generate recommendations
      const recommendations = await strategy.run({
        userId: testUser.id,
        userContext: testUser.context,
        limits: { 
          candidates: this.options.recommendationsPerUser * 2,
          final: this.options.recommendationsPerUser 
        },
        context: testUser.context
      });

      // Calculate metrics
      const metrics = {
        precision: this._calculatePrecision(recommendations.candidates, testUser.ground_truth),
        diversity: this._calculateDiversity(recommendations.candidates),
        novelty: this._calculateNovelty(recommendations.candidates, testUser.context),
        coverage: this._calculateCoverage(recommendations.candidates, this.testData.catalog),
        personalisation: this._calculatePersonalisation(recommendations.candidates, testUser.preferences)
      };

      return {
        userId: testUser.id,
        strategy: strategyName,
        recommendationCount: recommendations.candidates.length,
        metrics,
        diagnostics: recommendations.diagnostics || {}
      };

    } catch (error) {
      console.error(`Error evaluating user ${testUser.id}:`, error);
      return {
        userId: testUser.id,
        strategy: strategyName,
        error: error.message,
        metrics: this._getZeroMetrics()
      };
    }
  }

  _calculatePrecision(recommendations, groundTruth) {
    if (!recommendations || recommendations.length === 0) return 0;
    if (!groundTruth || groundTruth.length === 0) return 0;

    const recommendedIds = new Set(recommendations.map(r => r.trackId));
    const relevantIds = new Set(groundTruth.map(t => t.trackId));
    
    const intersection = new Set([...recommendedIds].filter(id => relevantIds.has(id)));
    
    return intersection.size / recommendations.length;
  }

  _calculateDiversity(recommendations) {
    if (!recommendations || recommendations.length === 0) return 0;

    // Calculate genre diversity
    const genres = new Set();
    const artists = new Set();
    
    recommendations.forEach(rec => {
      if (rec.metadata?.genres) {
        rec.metadata.genres.forEach(genre => genres.add(genre));
      }
      if (rec.metadata?.artist) {
        artists.add(rec.metadata.artist);
      }
    });

    // Intra-list diversity score
    const genreDiversity = genres.size / Math.max(recommendations.length * 0.5, 1);
    const artistDiversity = artists.size / recommendations.length;
    
    return (genreDiversity + artistDiversity) / 2;
  }

  _calculateNovelty(recommendations, userContext) {
    if (!recommendations || recommendations.length === 0) return 0;
    if (!userContext?.listeningHistory) return 1; // If no history, everything is novel

    const knownTracks = new Set(userContext.listeningHistory.map(t => t.id || t.trackId));
    const knownArtists = new Set(userContext.listeningHistory.map(t => t.artist));
    
    let noveltyScore = 0;
    
    recommendations.forEach(rec => {
      if (!knownTracks.has(rec.trackId)) {
        noveltyScore += 0.6; // Novel track
        
        if (!knownArtists.has(rec.metadata?.artist)) {
          noveltyScore += 0.4; // Novel artist
        }
      }
    });
    
    return noveltyScore / recommendations.length;
  }

  _calculateCoverage(recommendations, catalog) {
    if (!recommendations || recommendations.length === 0) return 0;
    if (!catalog || catalog.length === 0) return 1;

    const recommendedTracks = new Set(recommendations.map(r => r.trackId));
    const catalogTracks = new Set(catalog.map(t => t.id));
    
    const intersection = new Set([...recommendedTracks].filter(id => catalogTracks.has(id)));
    
    return intersection.size / Math.min(catalog.length, 1000); // Normalize by catalog size
  }

  _calculatePersonalisation(recommendations, userPreferences) {
    if (!recommendations || recommendations.length === 0) return 0;
    if (!userPreferences) return 0.5; // Neutral if no preferences

    let personalisationScore = 0;
    let scorableRecommendations = 0;

    recommendations.forEach(rec => {
      let itemScore = 0;
      let factors = 0;

      // Genre preference matching
      if (userPreferences.favoriteGenres && rec.metadata?.genres) {
        const genreMatch = rec.metadata.genres.some(genre => 
          userPreferences.favoriteGenres.includes(genre)
        );
        itemScore += genreMatch ? 1 : 0;
        factors++;
      }

      // Audio feature matching (simplified)
      if (userPreferences.audioFeatures && rec.metadata?.audioFeatures) {
        const features = ['energy', 'valence', 'danceability'];
        let featureScore = 0;
        
        features.forEach(feature => {
          if (userPreferences.audioFeatures[feature] && rec.metadata.audioFeatures[feature]) {
            const prefValue = userPreferences.audioFeatures[feature];
            const trackValue = rec.metadata.audioFeatures[feature];
            const similarity = 1 - Math.abs(prefValue - trackValue);
            featureScore += similarity;
          }
        });
        
        itemScore += featureScore / features.length;
        factors++;
      }

      if (factors > 0) {
        personalisationScore += itemScore / factors;
        scorableRecommendations++;
      }
    });

    return scorableRecommendations > 0 ? personalisationScore / scorableRecommendations : 0;
  }

  _aggregateUserResults(userResults) {
    const metrics = {};
    const metricNames = ['precision', 'diversity', 'novelty', 'coverage', 'personalisation'];
    
    metricNames.forEach(metric => {
      const values = userResults
        .map(ur => ur.metrics[metric])
        .filter(val => val !== undefined && !isNaN(val));
      
      if (values.length > 0) {
        metrics[metric] = {
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          std: this._calculateStandardDeviation(values),
          count: values.length
        };
      }
    });

    return metrics;
  }

  _compareStrategies() {
    const comparison = {};
    const strategies = Object.keys(this.results);
    
    // Overall ranking by combined score
    const overallScores = strategies.map(strategy => {
      const metrics = this.results[strategy].aggregatedMetrics;
      const score = (
        (metrics.precision?.mean || 0) * 0.3 +
        (metrics.diversity?.mean || 0) * 0.2 +
        (metrics.novelty?.mean || 0) * 0.2 +
        (metrics.coverage?.mean || 0) * 0.1 +
        (metrics.personalisation?.mean || 0) * 0.2
      );
      
      return { strategy, score };
    }).sort((a, b) => b.score - a.score);

    comparison.overallRanking = overallScores;
    
    // Best strategy for each metric
    const metricNames = ['precision', 'diversity', 'novelty', 'coverage', 'personalisation'];
    comparison.bestByMetric = {};
    
    metricNames.forEach(metric => {
      const best = strategies.reduce((best, strategy) => {
        const currentMean = this.results[strategy].aggregatedMetrics[metric]?.mean || 0;
        const bestMean = this.results[best].aggregatedMetrics[metric]?.mean || 0;
        return currentMean > bestMean ? strategy : best;
      });
      
      comparison.bestByMetric[metric] = {
        strategy: best,
        score: this.results[best].aggregatedMetrics[metric]?.mean || 0
      };
    });

    return comparison;
  }

  _generateSummary() {
    const strategies = Object.keys(this.results);
    
    return {
      totalStrategies: strategies.length,
      successfulEvaluations: strategies.filter(s => !this.results[s].error).length,
      failedEvaluations: strategies.filter(s => this.results[s].error).length,
      totalUsers: this.options.testUsers,
      totalRecommendations: this.options.testUsers * this.options.recommendationsPerUser,
      evaluationDuration: Object.values(this.results).reduce((sum, r) => sum + (r.executionTime || 0), 0),
      averageMetrics: this._calculateAverageMetrics()
    };
  }

  _calculateAverageMetrics() {
    const strategies = Object.keys(this.results).filter(s => !this.results[s].error);
    const metricNames = ['precision', 'diversity', 'novelty', 'coverage', 'personalisation'];
    const averages = {};

    metricNames.forEach(metric => {
      const values = strategies
        .map(s => this.results[s].aggregatedMetrics[metric]?.mean)
        .filter(val => val !== undefined && !isNaN(val));
      
      if (values.length > 0) {
        averages[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    return averages;
  }

  async _prepareTestData() {
    console.log('📋 Preparing test data...');
    
    // Generate mock test data
    this.testData = {
      users: this._generateTestUsers(),
      catalog: this._generateTestCatalog()
    };
  }

  _generateTestUsers() {
    return Array.from({ length: this.options.testUsers }, (_, i) => ({
      id: `test_user_${i}`,
      context: {
        listeningHistory: this._generateListeningHistory(),
        preferences: this._generateUserPreferences()
      },
      preferences: this._generateUserPreferences(),
      ground_truth: this._generateGroundTruth()
    }));
  }

  _generateListeningHistory() {
    return Array.from({ length: 20 + Math.floor(Math.random() * 30) }, (_, i) => ({
      id: `track_${i}`,
      name: `Track ${i}`,
      artist: `Artist ${i % 10}`,
      genres: ['rock', 'pop', 'jazz', 'electronic'][i % 4],
      played_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  }

  _generateUserPreferences() {
    return {
      favoriteGenres: ['rock', 'pop', 'jazz'].slice(0, Math.floor(Math.random() * 3) + 1),
      audioFeatures: {
        energy: Math.random(),
        valence: Math.random(),
        danceability: Math.random()
      }
    };
  }

  _generateGroundTruth() {
    return Array.from({ length: 10 }, (_, i) => ({
      trackId: `relevant_track_${i}`,
      relevanceScore: Math.random()
    }));
  }

  _generateTestCatalog() {
    return Array.from({ length: 1000 }, (_, i) => ({
      id: `catalog_track_${i}`,
      name: `Catalog Track ${i}`,
      artist: `Catalog Artist ${i % 100}`,
      genres: ['rock', 'pop', 'jazz', 'electronic', 'classical'][i % 5]
    }));
  }

  async _loadStrategy(strategyName) {
    try {
      // Mock strategy loading for testing
      return {
        async run(params) {
          // Simulate strategy execution
          const candidates = Array.from({ 
            length: params.limits.final 
          }, (_, i) => ({
            trackId: `${strategyName}_rec_${i}`,
            score: Math.random(),
            metadata: {
              artist: `Artist ${i}`,
              genres: ['rock', 'pop', 'jazz'][i % 3]
            }
          }));

          return {
            candidates,
            diagnostics: {
              strategy: strategyName,
              executionTime: Math.random() * 1000,
              confidence: Math.random()
            }
          };
        }
      };
    } catch (error) {
      throw new Error(`Failed to load strategy ${strategyName}: ${error.message}`);
    }
  }

  _calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  _getZeroMetrics() {
    return {
      precision: 0,
      diversity: 0,
      novelty: 0,
      coverage: 0,
      personalisation: 0
    };
  }

  /**
   * Save evaluation results to file
   * @param {Object} results - Evaluation results
   * @param {string} outputPath - Output file path
   */
  async saveResults(results, outputPath) {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`📄 Results saved to: ${outputPath}`);
    } catch (error) {
      console.error('Error saving results:', error);
    }
  }

  /**
   * Print evaluation summary
   * @param {Object} results - Evaluation results
   */
  printSummary(results) {
    console.log('\n📊 Evaluation Summary:');
    console.log('='.repeat(50));
    
    // Overall ranking
    console.log('\n🏆 Strategy Ranking:');
    results.comparison.overallRanking.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.strategy}: ${item.score.toFixed(3)}`);
    });

    // Best by metric
    console.log('\n🎯 Best by Metric:');
    Object.entries(results.comparison.bestByMetric).forEach(([metric, best]) => {
      console.log(`  ${metric}: ${best.strategy} (${best.score.toFixed(3)})`);
    });

    // Summary stats
    console.log('\n📈 Summary Statistics:');
    console.log(`  Strategies evaluated: ${results.summary.totalStrategies}`);
    console.log(`  Test users: ${results.summary.totalUsers}`);
    console.log(`  Total recommendations: ${results.summary.totalRecommendations}`);
    console.log(`  Evaluation time: ${results.summary.evaluationDuration}ms`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const strategy = args.find(arg => arg.startsWith('--strategy='))?.split('=')[1];
  const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'reports/evaluation.json';
  const verbose = args.includes('--verbose');

  const evaluator = new RecommendationEvaluator({ verbose });

  try {
    const strategies = strategy ? [strategy] : undefined;
    const results = await evaluator.runEvaluation(strategies);

    await evaluator.saveResults(results, output);
    evaluator.printSummary(results);

  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { RecommendationEvaluator };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}