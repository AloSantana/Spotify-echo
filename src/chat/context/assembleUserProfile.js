/**
 * User Profile Context Assembler
 * 
 * Assembles comprehensive user profiles from multiple data sources including
 * Spotify listening history, user preferences, and derived behavior patterns.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class ContextAssembler {
  constructor(options = {}) {
    this.options = {
      maxHistoryDays: 30,
      maxHistoryTracks: 100,
      includeAudioFeatures: true,
      includeDerivedPreferences: true,
      cacheTimeout: 300, // 5 minutes
      ...options
    };
    
    this.cache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the context assembler
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load dependencies
      this._loadDependencies();
      this.initialized = true;
      console.log('ContextAssembler initialized');
    } catch (error) {
      console.error('Failed to initialize ContextAssembler:', error);
      throw error;
    }
  }

  /**
   * Assemble comprehensive user profile context
   * @param {string} userId - User identifier
   * @param {Object} options - Assembly options
   * @returns {Object} Assembled user context
   */
  async assemble(userId, options = {}) {
    await this.initialize();

    const opts = {
      includeHistory: true,
      includePreferences: true,
      includeRecentActivity: true,
      includeDerivedPreferences: true,
      maxHistoryDays: this.options.maxHistoryDays,
      ...options
    };

    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this._generateCacheKey(userId, opts);
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return this._enrichCachedContext(cached);
      }

      // Assemble context from multiple sources
      const [
        basicProfile,
        listeningHistory, 
        explicitPreferences,
        recentActivity,
        derivedPreferences
      ] = await Promise.allSettled([
        this._getBasicProfile(userId),
        opts.includeHistory ? this._getListeningHistory(userId, opts) : Promise.resolve([]),
        opts.includePreferences ? this._getExplicitPreferences(userId) : Promise.resolve({}),
        opts.includeRecentActivity ? this._getRecentActivity(userId) : Promise.resolve({}),
        opts.includeDerivedPreferences ? this._getDerivedPreferences(userId, opts) : Promise.resolve({})
      ]);

      // Assemble final context
      const context = {
        userId,
        profile: this._unwrapSettled(basicProfile),
        listeningHistory: this._unwrapSettled(listeningHistory),
        preferences: {
          explicit: this._unwrapSettled(explicitPreferences),
          derived: this._unwrapSettled(derivedPreferences)
        },
        recentActivity: this._unwrapSettled(recentActivity),
        metadata: {
          assembledAt: new Date().toISOString(),
          assemblyTime: Date.now() - startTime,
          source: 'ContextAssembler',
          options: opts
        }
      };

      // Cache the assembled context
      this._setCache(cacheKey, context);

      return context;

    } catch (error) {
      console.error('Error assembling user context:', error);
      return this._getFallbackContext(userId, opts);
    }
  }

  /**
   * Assemble lightweight context for quick operations
   * @param {string} userId - User identifier
   * @returns {Object} Lightweight context
   */
  async assembleLightweight(userId) {
    await this.initialize();

    try {
      const [profile, recentTracks] = await Promise.allSettled([
        this._getBasicProfile(userId),
        this._getRecentTracks(userId, 10)
      ]);

      return {
        userId,
        profile: this._unwrapSettled(profile),
        recentTracks: this._unwrapSettled(recentTracks),
        metadata: {
          assembledAt: new Date().toISOString(),
          type: 'lightweight',
          source: 'ContextAssembler'
        }
      };

    } catch (error) {
      console.error('Error assembling lightweight context:', error);
      return { userId, error: error.message };
    }
  }

  // Private methods

  _loadDependencies() {
    // In a real implementation, load database managers, Spotify API clients, etc.
    // For now, we'll use mock implementations
    this.databaseManager = {
      async getUserProfile(userId) {
        return {
          id: userId,
          name: 'Test User',
          spotifyId: `spotify_${userId}`,
          country: 'US',
          subscription: 'premium'
        };
      },

      async getListeningHistory(userId, options) {
        return Array.from({ length: Math.min(options.limit || 50, 100) }, (_, i) => ({
          id: `track_${i}`,
          name: `Track ${i}`,
          artist: `Artist ${i % 10}`,
          album: `Album ${i % 5}`,
          genres: ['rock', 'pop', 'electronic'][i % 3],
          played_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          audio_features: {
            energy: Math.random(),
            valence: Math.random(),
            danceability: Math.random(),
            acousticness: Math.random()
          }
        }));
      },

      async getUserPreferences(userId) {
        return {
          favoriteGenres: ['rock', 'pop', 'jazz'],
          preferredEra: '2000s',
          explicitContent: false,
          audioFeaturePreferences: {
            energy: { min: 0.3, max: 0.9 },
            valence: { min: 0.2, max: 0.8 }
          }
        };
      }
    };
  }

  async _getBasicProfile(userId) {
    return await this.databaseManager.getUserProfile(userId);
  }

  async _getListeningHistory(userId, options) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.maxHistoryDays);

    const history = await this.databaseManager.getListeningHistory(userId, {
      since: cutoffDate,
      limit: this.options.maxHistoryTracks,
      includeAudioFeatures: this.options.includeAudioFeatures
    });

    return history.filter(track => new Date(track.played_at) >= cutoffDate);
  }

  async _getExplicitPreferences(userId) {
    return await this.databaseManager.getUserPreferences(userId);
  }

  async _getRecentActivity(userId) {
    const recent = await this._getRecentTracks(userId, 20);
    
    return {
      lastPlayedAt: recent[0]?.played_at || null,
      recentTrackCount: recent.length,
      recentGenres: this._extractUniqueValues(recent, 'genres'),
      recentArtists: this._extractUniqueValues(recent, 'artist'),
      averageAudioFeatures: this._calculateAverageFeatures(recent)
    };
  }

  async _getDerivedPreferences(userId, options) {
    const history = await this._getListeningHistory(userId, options);
    
    if (history.length === 0) {
      return {};
    }

    return {
      topGenres: this._analyzeGenrePreferences(history),
      audioFeatureProfile: this._analyzeAudioFeaturePreferences(history),
      listeningPatterns: this._analyzeListeningPatterns(history),
      artistAffinity: this._analyzeArtistAffinity(history)
    };
  }

  async _getRecentTracks(userId, limit = 10) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Last week

    const history = await this.databaseManager.getListeningHistory(userId, {
      since: cutoffDate,
      limit: limit
    });

    return history.sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
  }

  _analyzeGenrePreferences(history) {
    const genreCounts = {};
    let totalPlays = 0;

    history.forEach(track => {
      if (track.genres) {
        const genres = Array.isArray(track.genres) ? track.genres : [track.genres];
        genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          totalPlays++;
        });
      }
    });

    return Object.entries(genreCounts)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: (count / totalPlays) * 100,
        confidence: Math.min(count / 10, 1) // Higher confidence with more plays
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  _analyzeAudioFeaturePreferences(history) {
    const features = ['energy', 'valence', 'danceability', 'acousticness'];
    const profile = {};

    features.forEach(feature => {
      const values = history
        .map(track => track.audio_features?.[feature])
        .filter(val => val !== undefined);

      if (values.length > 0) {
        profile[feature] = {
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          std: this._calculateStandardDeviation(values),
          sampleSize: values.length
        };
      }
    });

    return profile;
  }

  _analyzeListeningPatterns(history) {
    const patterns = {
      hourlyDistribution: {},
      weeklyDistribution: {},
      monthlyTrends: {}
    };

    history.forEach(track => {
      const playedAt = new Date(track.played_at);
      const hour = playedAt.getHours();
      const day = playedAt.getDay();
      const month = playedAt.getMonth();

      patterns.hourlyDistribution[hour] = (patterns.hourlyDistribution[hour] || 0) + 1;
      patterns.weeklyDistribution[day] = (patterns.weeklyDistribution[day] || 0) + 1;
      patterns.monthlyTrends[month] = (patterns.monthlyTrends[month] || 0) + 1;
    });

    return patterns;
  }

  _analyzeArtistAffinity(history) {
    const artistCounts = {};
    
    history.forEach(track => {
      if (track.artist) {
        artistCounts[track.artist] = (artistCounts[track.artist] || 0) + 1;
      }
    });

    return Object.entries(artistCounts)
      .map(([artist, count]) => ({ artist, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  _extractUniqueValues(items, field) {
    const values = new Set();
    items.forEach(item => {
      const value = item[field];
      if (Array.isArray(value)) {
        value.forEach(v => values.add(v));
      } else if (value) {
        values.add(value);
      }
    });
    return Array.from(values);
  }

  _calculateAverageFeatures(tracks) {
    const features = ['energy', 'valence', 'danceability', 'acousticness'];
    const averages = {};

    features.forEach(feature => {
      const values = tracks
        .map(track => track.audio_features?.[feature])
        .filter(val => val !== undefined);

      if (values.length > 0) {
        averages[feature] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    return averages;
  }

  _calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  _generateCacheKey(userId, options) {
    const keyParts = [
      userId,
      options.includeHistory ? 'h' : '',
      options.includePreferences ? 'p' : '',
      options.includeRecentActivity ? 'r' : '',
      options.maxHistoryDays || 'default'
    ];
    return keyParts.join(':');
  }

  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout * 1000) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  _enrichCachedContext(context) {
    return {
      ...context,
      metadata: {
        ...context.metadata,
        fromCache: true,
        cacheHit: true
      }
    };
  }

  _unwrapSettled(settled) {
    return settled.status === 'fulfilled' ? settled.value : null;
  }

  _getFallbackContext(userId, options) {
    return {
      userId,
      profile: { id: userId, name: 'Unknown User' },
      listeningHistory: [],
      preferences: { explicit: {}, derived: {} },
      recentActivity: {},
      metadata: {
        assembledAt: new Date().toISOString(),
        assemblyTime: 0,
        source: 'ContextAssembler',
        fallback: true,
        options
      }
    };
  }
}

module.exports = { ContextAssembler };