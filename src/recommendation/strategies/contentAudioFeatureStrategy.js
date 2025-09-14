/**
 * Content-Based Audio Feature Strategy
 * 
 * Recommends music based on audio feature analysis and content similarity.
 * Uses Spotify's audio features (tempo, energy, valence, etc.) to find similar tracks.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class ContentAudioFeatureStrategy {
  constructor(options = {}) {
    this.name = 'content-based';
    this.options = {
      featureWeights: {
        acousticness: 0.8,
        danceability: 1.0,
        energy: 1.2,
        instrumentalness: 0.6,
        liveness: 0.4,
        loudness: 0.7,
        speechiness: 0.5,
        tempo: 1.0,
        valence: 1.1
      },
      similarityThreshold: 0.75,
      maxCandidates: 100,
      diversityWeight: 0.2,
      ...options
    };
    
    this.trackFeatures = new Map();
    this.genreProfiles = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the strategy
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load track audio features database
      await this._loadAudioFeatures();
      
      // Build genre profiles
      await this._buildGenreProfiles();
      
      this.initialized = true;
      console.log('ContentAudioFeatureStrategy initialized');
    } catch (error) {
      console.error('Failed to initialize ContentAudioFeatureStrategy:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations using content-based analysis
   * @param {Object} params - Generation parameters
   * @returns {Object} Recommendations with diagnostics
   */
  async run(params) {
    await this.initialize();

    const { userId, seeds = [], limits, context, filters = {} } = params;
    const startTime = Date.now();

    try {
      // Build user audio profile from context
      const userProfile = this._buildUserAudioProfile(context);
      
      // Get seed tracks for analysis
      const seedTracks = await this._getSeedTracks(seeds, context, userProfile);
      
      if (seedTracks.length === 0) {
        return this._handleNoSeeds(params);
      }

      // Find similar tracks based on audio features
      const candidates = await this._findSimilarTracks(
        seedTracks, 
        userProfile, 
        limits.candidates
      );

      // Apply content filters
      const filteredCandidates = this._applyContentFilters(candidates, filters, userProfile);
      
      // Rank by content similarity and user preferences
      const rankedCandidates = this._rankByContentSimilarity(filteredCandidates, userProfile);

      return {
        candidates: rankedCandidates.slice(0, limits.final),
        diagnostics: {
          strategy: this.name,
          seedTracks: seedTracks.length,
          candidatesGenerated: candidates.length,
          candidatesFiltered: filteredCandidates.length,
          userProfileFeatures: Object.keys(userProfile).length,
          executionTime: Date.now() - startTime,
          confidence: this._calculateContentConfidence(seedTracks, userProfile)
        }
      };

    } catch (error) {
      console.error('Error in ContentAudioFeatureStrategy:', error);
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
   * Update user model with audio feature preferences
   * @param {string} userId - User identifier
   * @param {Object} feedback - User feedback
   */
  async updateUserModel(userId, feedback) {
    try {
      // In a real implementation, this would update user audio feature preferences
      // based on feedback signals and the audio features of the feedback track
      
      if (feedback.signal === 'like' || feedback.signal === 'love') {
        // Positive feedback - strengthen preference for these audio features
        const trackFeatures = this.trackFeatures.get(feedback.trackId);
        if (trackFeatures) {
          // Update user's preferred audio feature ranges
          console.log(`Positive feedback for track ${feedback.trackId} with features:`, trackFeatures);
        }
      } else if (feedback.signal === 'skip' || feedback.signal === 'dislike') {
        // Negative feedback - weaken preference for these audio features
        console.log(`Negative feedback for track ${feedback.trackId}`);
      }
      
    } catch (error) {
      console.error('Error updating content-based user model:', error);
    }
  }

  // Private methods

  async _loadAudioFeatures() {
    const Database = require('../../database/Database');
    const SpotifyAPI = require('../../spotify/SpotifyAPI');
    
    try {
      console.log('Loading real audio features from database and Spotify API...');
      
      const db = Database.getInstance();
      const spotifyAPI = SpotifyAPI.getInstance();
      
      // Load cached audio features from database
      const cachedFeatures = await db.collection('audio_features')
        .find({})
        .toArray();

      for (const feature of cachedFeatures) {
        this.trackFeatures.set(feature.trackId, feature);
      }

      console.log(`Loaded ${cachedFeatures.length} cached audio features`);

      // If we have insufficient data, we could fetch more from Spotify API
      // But for production, we should have pre-populated audio features
      if (this.trackFeatures.size === 0) {
        throw new Error('No audio features found. Content-based filtering requires Spotify audio feature data.');
      }

    } catch (error) {
      console.error('Failed to load audio features:', error);
      throw new Error(`Content-based strategy initialization failed: ${error.message}`);
    }
  }

  async _buildGenreProfiles() {
    // Build average audio feature profiles for each genre
    const genreData = {};
    
    for (const [trackId, features] of this.trackFeatures) {
      const genre = features.genre;
      if (!genreData[genre]) {
        genreData[genre] = { tracks: [], features: {} };
      }
      genreData[genre].tracks.push(trackId);
      
      // Accumulate feature values
      Object.keys(this.options.featureWeights).forEach(feature => {
        if (!genreData[genre].features[feature]) {
          genreData[genre].features[feature] = [];
        }
        genreData[genre].features[feature].push(features[feature]);
      });
    }

    // Calculate average features for each genre
    for (const [genre, data] of Object.entries(genreData)) {
      const profile = {};
      
      Object.keys(this.options.featureWeights).forEach(feature => {
        const values = data.features[feature] || [];
        profile[feature] = {
          mean: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          std: this._calculateStandardDeviation(values)
        };
      });
      
      this.genreProfiles.set(genre, profile);
    }
  }

  _buildUserAudioProfile(context) {
    const profile = {};
    
    if (!context?.listeningHistory || context.listeningHistory.length === 0) {
      return this._getDefaultAudioProfile();
    }

    // Extract audio features from user's listening history
    const userTracks = context.listeningHistory
      .map(track => this.trackFeatures.get(track.id || track.trackId))
      .filter(Boolean);

    if (userTracks.length === 0) {
      return this._getDefaultAudioProfile();
    }

    // Calculate user's preferred audio feature ranges
    Object.keys(this.options.featureWeights).forEach(feature => {
      const values = userTracks.map(track => track[feature]).filter(v => v !== undefined);
      
      if (values.length > 0) {
        profile[feature] = {
          preferred: values.reduce((a, b) => a + b, 0) / values.length,
          tolerance: this._calculateStandardDeviation(values) || 0.2,
          weight: this.options.featureWeights[feature]
        };
      }
    });

    return profile;
  }

  async _getSeedTracks(seeds, context, userProfile) {
    let seedTracks = [];
    
    // Use provided seeds
    if (seeds.length > 0) {
      seedTracks = seeds
        .map(seedId => this.trackFeatures.get(seedId))
        .filter(Boolean);
    }
    
    // If no seeds, use recent listening history
    if (seedTracks.length === 0 && context?.listeningHistory) {
      seedTracks = context.listeningHistory
        .slice(0, 5) // Use last 5 tracks
        .map(track => this.trackFeatures.get(track.id || track.trackId))
        .filter(Boolean);
    }
    
    // If still no seeds, use genre preferences
    if (seedTracks.length === 0 && context?.preferences?.favoriteGenres) {
      for (const genre of context.preferences.favoriteGenres.slice(0, 2)) {
        const genreProfile = this.genreProfiles.get(genre);
        if (genreProfile) {
          // Find representative tracks for this genre
          const genreTracks = Array.from(this.trackFeatures.values())
            .filter(track => track.genre === genre)
            .slice(0, 3);
          seedTracks.push(...genreTracks);
        }
      }
    }

    return seedTracks;
  }

  async _findSimilarTracks(seedTracks, userProfile, limit) {
    const candidates = new Map();
    const seedIds = new Set(seedTracks.map(t => t.trackId));
    
    // For each track in the database, calculate similarity to seeds
    for (const [trackId, features] of this.trackFeatures) {
      if (seedIds.has(trackId)) continue; // Skip seed tracks
      
      let totalSimilarity = 0;
      let maxSimilarity = 0;
      
      // Calculate similarity to each seed track
      for (const seedTrack of seedTracks) {
        const similarity = this._calculateAudioSimilarity(features, seedTrack, userProfile);
        totalSimilarity += similarity;
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      const avgSimilarity = totalSimilarity / seedTracks.length;
      
      if (maxSimilarity >= this.options.similarityThreshold) {
        candidates.set(trackId, {
          trackId,
          score: avgSimilarity,
          maxSimilarity,
          features,
          reasons: [
            `${Math.round(maxSimilarity * 100)}% audio feature match`,
            `Similar ${this._getTopMatchingFeatures(features, seedTracks[0], 2).join(', ')}`
          ]
        });
      }
    }

    // Convert to array and sort by similarity
    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  _calculateAudioSimilarity(track1, track2, userProfile) {
    let similarity = 0;
    let totalWeight = 0;
    
    Object.keys(this.options.featureWeights).forEach(feature => {
      const value1 = track1[feature];
      const value2 = track2[feature];
      
      if (value1 !== undefined && value2 !== undefined) {
        let weight = this.options.featureWeights[feature];
        
        // Apply user preference weighting
        if (userProfile[feature]) {
          weight *= userProfile[feature].weight;
        }
        
        // Calculate feature similarity (normalized)
        let featureSimilarity;
        if (feature === 'tempo' || feature === 'loudness') {
          // Handle special cases with different ranges
          const range = feature === 'tempo' ? 200 : 60;
          featureSimilarity = 1 - Math.abs(value1 - value2) / range;
        } else {
          // Standard 0-1 range features
          featureSimilarity = 1 - Math.abs(value1 - value2);
        }
        
        similarity += featureSimilarity * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  _applyContentFilters(candidates, filters, userProfile) {
    return candidates.filter(candidate => {
      const features = candidate.features;
      
      // Genre filter
      if (filters.genre && features.genre !== filters.genre) {
        return false;
      }
      
      // Audio feature filters
      if (filters.minEnergy && features.energy < filters.minEnergy) {
        return false;
      }
      
      if (filters.maxInstrumentalness && features.instrumentalness > filters.maxInstrumentalness) {
        return false;
      }
      
      // User preference filters (simplified)
      if (userProfile.valence && Math.abs(features.valence - userProfile.valence.preferred) > userProfile.valence.tolerance * 2) {
        return false;
      }
      
      return true;
    });
  }

  _rankByContentSimilarity(candidates, userProfile) {
    return candidates.map(candidate => {
      let boost = 1.0;
      
      // Boost tracks that match user's preferred audio characteristics
      if (userProfile.energy && candidate.features.energy) {
        const energyMatch = 1 - Math.abs(candidate.features.energy - userProfile.energy.preferred);
        boost *= (1 + energyMatch * 0.2);
      }
      
      // Apply diversity penalty for very similar tracks
      boost *= (1 - this.options.diversityWeight * 0.1);
      
      return {
        ...candidate,
        score: candidate.score * boost
      };
    }).sort((a, b) => b.score - a.score);
  }

  _calculateContentConfidence(seedTracks, userProfile) {
    if (seedTracks.length === 0) return 0;
    
    const seedFactor = Math.min(seedTracks.length / 3, 1); // More seeds = higher confidence
    const profileFactor = Object.keys(userProfile).length > 0 ? 1 : 0.5;
    
    return seedFactor * profileFactor * 0.8; // Content-based tends to be high confidence
  }

  _getTopMatchingFeatures(track1, track2, count = 3) {
    const similarities = [];
    
    Object.keys(this.options.featureWeights).forEach(feature => {
      const value1 = track1[feature];
      const value2 = track2[feature];
      
      if (value1 !== undefined && value2 !== undefined) {
        const similarity = 1 - Math.abs(value1 - value2);
        similarities.push({ feature, similarity });
      }
    });
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count)
      .map(s => s.feature);
  }

  _getDefaultAudioProfile() {
    // Return neutral audio preferences
    const profile = {};
    
    Object.keys(this.options.featureWeights).forEach(feature => {
      profile[feature] = {
        preferred: 0.5, // Neutral preference
        tolerance: 0.3, // Moderate tolerance
        weight: this.options.featureWeights[feature]
      };
    });
    
    return profile;
  }

  _calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  _handleNoSeeds(params) {
    return {
      candidates: [],
      diagnostics: {
        strategy: this.name,
        noSeeds: true,
        reason: 'No seed tracks available for content analysis',
        recommendation: 'Provide seed tracks or user listening history'
      }
    };
  }
}

module.exports = ContentAudioFeatureStrategy;