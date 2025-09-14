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
        await this._evaluateStrategy(strategy);
      }
      
      // Generate comparative analysis
      this._generateComparativeAnalysis();
      
      // Save results
      await this._saveResults();
      
      console.log('✅ Evaluation completed successfully');
      return this.results;
      
    } catch (error) {
      console.error('❌ Evaluation failed:', error.message);
      throw error;
    }
  }

  async _prepareTestData() {
    console.log('📚 Preparing test dataset...');
    
    // Generate or load test users with diverse listening patterns
    this.testData = {
      users: await this._generateTestUsers(),
      tracks: await this._generateTestTracks(),
      interactions: await this._generateTestInteractions()
    };
    
    console.log(`Generated ${this.testData.users.length} test users with ${this.testData.interactions.length} interactions`);
  }

  async _generateTestUsers() {
    const users = [];
    
    // Create diverse user profiles
    const genrePreferences = [
      ['rock', 'alternative', 'indie'],
      ['pop', 'dance', 'electronic'],
      ['hip-hop', 'rap', 'r&b'],
      ['jazz', 'blues', 'soul'],
      ['classical', 'instrumental', 'ambient'],
      ['country', 'folk', 'americana'],
      ['metal', 'hardcore', 'punk'],
      ['reggae', 'ska', 'dub']
    ];
    
    for (let i = 0; i < this.options.testUsers; i++) {
      const preferences = genrePreferences[i % genrePreferences.length];
      users.push({
        id: `test_user_${i}`,
        preferences: {
          favoriteGenres: preferences,
          audioFeatures: {
            energy: Math.random(),
            valence: Math.random(),
            danceability: Math.random()
          }
        },
        listeningHistory: [],
        demographics: {
          age: 18 + Math.floor(Math.random() * 60),
          country: ['US', 'UK', 'CA', 'AU', 'DE'][Math.floor(Math.random() * 5)]
        }
      });
    }
    
    return users;
  }

  async _generateTestTracks() {
    const tracks = [];
    
    // Generate test tracks with varied characteristics
    for (let i = 0; i < 1000; i++) {
      tracks.push({
        id: `test_track_${i}`,
        name: `Test Track ${i}`,
        artist: `Test Artist ${Math.floor(i / 10)}`,
        genres: this._getRandomGenres(),
        audioFeatures: {
          energy: Math.random(),
          valence: Math.random(),
          danceability: Math.random(),
          acousticness: Math.random(),
          instrumentalness: Math.random(),
          tempo: 60 + Math.random() * 140
        },
        popularity: Math.floor(Math.random() * 100)
      });
    }
    
    return tracks;
  }

  async _generateTestInteractions() {
    const interactions = [];
    
    // Generate realistic listening patterns
    for (const user of this.testData.users) {
      const numInteractions = 20 + Math.floor(Math.random() * 80);
      
      for (let i = 0; i < numInteractions; i++) {
        const track = this._selectTrackForUser(user);
        const interaction = {
          userId: user.id,
          trackId: track.id,
          timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
          action: this._getRandomAction(),
          context: this._getRandomContext()
        };
        
        interactions.push(interaction);
        user.listeningHistory.push(interaction);
      }
    }
    
    return interactions;
  }

  _selectTrackForUser(user) {
    // Select tracks that match user preferences with some noise
    const userGenres = user.preferences.favoriteGenres;
    const candidates = this.testData.tracks.filter(track => 
      track.genres.some(genre => userGenres.includes(genre)) || Math.random() < 0.2
    );
    
    return candidates[Math.floor(Math.random() * candidates.length)] || this.testData.tracks[0];
  }

  _getRandomGenres() {
    const allGenres = ['rock', 'pop', 'hip-hop', 'jazz', 'classical', 'country', 'electronic', 'metal'];
    const numGenres = 1 + Math.floor(Math.random() * 3);
    const selectedGenres = [];
    
    for (let i = 0; i < numGenres; i++) {
      const genre = allGenres[Math.floor(Math.random() * allGenres.length)];
      if (!selectedGenres.includes(genre)) {
        selectedGenres.push(genre);
      }
    }
    
    return selectedGenres;
  }

  _getRandomAction() {
    const actions = ['play', 'skip', 'like', 'save', 'share'];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  _getRandomContext() {
    const contexts = ['discovery', 'playlist', 'radio', 'search', 'recommendation'];
    return contexts[Math.floor(Math.random() * contexts.length)];
  }

  async _evaluateStrategy(strategyName) {
    const startTime = Date.now();
    
    try {
      // Load strategy implementation
      const StrategyClass = this._loadStrategy(strategyName);
      const strategy = new StrategyClass();
      
      const strategyResults = {
        name: strategyName,
        metrics: {},
        performance: {},
        errors: []
      };
      
      // Test with each user
      for (const user of this.testData.users) {
        try {
          const recommendations = await this._generateRecommendationsForUser(strategy, user);
          const metrics = await this._calculateMetricsForUser(user, recommendations);
          
          // Aggregate metrics
          Object.keys(metrics).forEach(metric => {
            if (!strategyResults.metrics[metric]) {
              strategyResults.metrics[metric] = [];
            }
            strategyResults.metrics[metric].push(metrics[metric]);
          });
          
        } catch (error) {
          strategyResults.errors.push({
            userId: user.id,
            error: error.message
          });
        }
      }
      
      // Calculate aggregate metrics
      Object.keys(strategyResults.metrics).forEach(metric => {
        const values = strategyResults.metrics[metric];
        strategyResults.metrics[metric] = {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: this._calculateMedian(values),
          std: this._calculateStandardDeviation(values),
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });
      
      // Record performance metrics
      strategyResults.performance = {
        executionTime: Date.now() - startTime,
        errorsCount: strategyResults.errors.length,
        successRate: (this.testData.users.length - strategyResults.errors.length) / this.testData.users.length
      };
      
      this.results[strategyName] = strategyResults;
      
    } catch (error) {
      console.error(`Failed to evaluate strategy ${strategyName}:`, error.message);
      this.results[strategyName] = {
        name: strategyName,
        error: error.message,
        metrics: {},
        performance: { executionTime: Date.now() - startTime }
      };
    }
  }

  async _generateRecommendationsForUser(strategy, user) {
    const context = {
      userId: user.id,
      seeds: user.listeningHistory.slice(-5).map(h => h.trackId),
      limits: { maxCandidates: this.options.recommendationsPerUser },
      userProfile: user.preferences
    };
    
    const result = await strategy.run(context);
    return result.candidates || [];
  }

  async _calculateMetricsForUser(user, recommendations) {
    const metrics = {};
    
    // Precision@K - how many recommended tracks match user preferences
    metrics.precision_at_5 = this._calculatePrecisionAtK(user, recommendations, 5);
    metrics.precision_at_10 = this._calculatePrecisionAtK(user, recommendations, 10);
    
    // Diversity - how diverse are the recommendations
    metrics.diversity = this._calculateDiversity(recommendations);
    
    // Novelty - how novel are the recommendations vs user's history
    metrics.novelty = this._calculateNovelty(user, recommendations);
    
    // Coverage - how well do recommendations cover different genres
    metrics.coverage = this._calculateCoverage(user, recommendations);
    
    // Serendipity - unexpected but relevant recommendations
    metrics.serendipity = this._calculateSerendipity(user, recommendations);
    
    return metrics;
  }

  _calculatePrecisionAtK(user, recommendations, k) {
    const topK = recommendations.slice(0, k);
    const userGenres = user.preferences.favoriteGenres;
    
    let relevantCount = 0;
    for (const rec of topK) {
      const track = this.testData.tracks.find(t => t.id === rec.trackId);
      if (track && track.genres.some(genre => userGenres.includes(genre))) {
        relevantCount++;
      }
    }
    
    return topK.length > 0 ? relevantCount / topK.length : 0;
  }

  _calculateDiversity(recommendations) {
    if (recommendations.length < 2) return 0;
    
    const genres = new Set();
    const artists = new Set();
    
    for (const rec of recommendations) {
      const track = this.testData.tracks.find(t => t.id === rec.trackId);
      if (track) {
        track.genres.forEach(genre => genres.add(genre));
        artists.add(track.artist);
      }
    }
    
    // Diversity score based on unique genres and artists
    return (genres.size + artists.size) / (recommendations.length * 2);
  }

  _calculateNovelty(user, recommendations) {
    const userTracks = new Set(user.listeningHistory.map(h => h.trackId));
    const novelTracks = recommendations.filter(rec => !userTracks.has(rec.trackId));
    
    return recommendations.length > 0 ? novelTracks.length / recommendations.length : 0;
  }

  _calculateCoverage(user, recommendations) {
    const userGenres = new Set(user.preferences.favoriteGenres);
    const recGenres = new Set();
    
    for (const rec of recommendations) {
      const track = this.testData.tracks.find(t => t.id === rec.trackId);
      if (track) {
        track.genres.forEach(genre => recGenres.add(genre));
      }
    }
    
    let coveredGenres = 0;
    userGenres.forEach(genre => {
      if (recGenres.has(genre)) coveredGenres++;
    });
    
    return userGenres.size > 0 ? coveredGenres / userGenres.size : 0;
  }

  _calculateSerendipity(user, recommendations) {
    // Simplified serendipity: recommendations outside user's main genres but still relevant
    const userGenres = user.preferences.favoriteGenres;
    let serendipitousCount = 0;
    
    for (const rec of recommendations) {
      const track = this.testData.tracks.find(t => t.id === rec.trackId);
      if (track) {
        const hasUserGenre = track.genres.some(genre => userGenres.includes(genre));
        const isHighQuality = track.popularity > 50 || rec.score > 0.7;
        
        if (!hasUserGenre && isHighQuality) {
          serendipitousCount++;
        }
      }
    }
    
    return recommendations.length > 0 ? serendipitousCount / recommendations.length : 0;
  }

  _generateComparativeAnalysis() {
    console.log('📈 Generating comparative analysis...');
    
    const comparison = {
      overall: {},
      byMetric: {},
      ranking: []
    };
    
    const strategies = Object.keys(this.results);
    const metrics = ['precision_at_5', 'precision_at_10', 'diversity', 'novelty', 'coverage'];
    
    // Compare strategies by metric
    metrics.forEach(metric => {
      comparison.byMetric[metric] = {};
      strategies.forEach(strategy => {
        if (this.results[strategy].metrics[metric]) {
          comparison.byMetric[metric][strategy] = this.results[strategy].metrics[metric].mean;
        }
      });
    });
    
    // Calculate overall scores
    strategies.forEach(strategy => {
      let totalScore = 0;
      let metricCount = 0;
      
      metrics.forEach(metric => {
        if (this.results[strategy].metrics[metric]) {
          totalScore += this.results[strategy].metrics[metric].mean;
          metricCount++;
        }
      });
      
      comparison.overall[strategy] = metricCount > 0 ? totalScore / metricCount : 0;
    });
    
    // Create ranking
    comparison.ranking = strategies.sort((a, b) => 
      comparison.overall[b] - comparison.overall[a]
    ).map((strategy, index) => ({
      rank: index + 1,
      strategy,
      score: comparison.overall[strategy],
      performance: this.results[strategy].performance
    }));
    
    this.results.comparison = comparison;
  }

  _loadStrategy(strategyName) {
    const strategyMap = {
      'collaborative': require('../src/recommendation/strategies/collaborativeStrategy'),
      'content-based': require('../src/recommendation/strategies/contentAudioFeatureStrategy'),
      'embedding-semantic': require('../src/recommendation/strategies/embeddingSemanticStrategy'),
      'hybrid-rerank': require('../src/recommendation/strategies/hybridRerankStrategy')
    };
    
    if (!strategyMap[strategyName]) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }
    
    return strategyMap[strategyName];
  }

  _calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  _calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  async _saveResults() {
    const outputDir = path.join(__dirname, '..', this.options.outputDir);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `evaluation-results-${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);
    
    // Add metadata
    const output = {
      metadata: {
        timestamp: new Date().toISOString(),
        options: this.options,
        testDataSize: {
          users: this.testData.users.length,
          tracks: this.testData.tracks.length,
          interactions: this.testData.interactions.length
        }
      },
      results: this.results
    };
    
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log(`📄 Results saved to: ${filePath}`);
    
    // Also save a summary
    this._saveSummaryReport(outputDir, timestamp);
  }

  _saveSummaryReport(outputDir, timestamp) {
    const summaryPath = path.join(outputDir, `evaluation-summary-${timestamp}.md`);
    
    let summary = `# Recommendation Strategy Evaluation Report\n\n`;
    summary += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    // Overall ranking
    summary += `## Overall Strategy Ranking\n\n`;
    this.results.comparison.ranking.forEach(item => {
      summary += `${item.rank}. **${item.strategy}** - Score: ${item.score.toFixed(3)}\n`;
      summary += `   - Success Rate: ${(item.performance.successRate * 100).toFixed(1)}%\n`;
      summary += `   - Execution Time: ${item.performance.executionTime}ms\n\n`;
    });
    
    // Metric breakdown
    summary += `## Metrics Breakdown\n\n`;
    Object.keys(this.results.comparison.byMetric).forEach(metric => {
      summary += `### ${metric}\n\n`;
      const metricData = this.results.comparison.byMetric[metric];
      Object.entries(metricData)
        .sort(([,a], [,b]) => b - a)
        .forEach(([strategy, value]) => {
          summary += `- **${strategy}**: ${value.toFixed(3)}\n`;
        });
      summary += `\n`;
    });
    
    fs.writeFileSync(summaryPath, summary);
    console.log(`📊 Summary saved to: ${summaryPath}`);
  }
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