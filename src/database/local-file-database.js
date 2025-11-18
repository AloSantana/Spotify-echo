/**
 * Local File-Based Database Manager
 * Fallback solution when MongoDB/SQLite are unavailable
 * Loads data from CSV and JSON files in data/ directory
 */

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

class LocalFileDatabase {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.mlDataDir = path.join(process.cwd(), 'ml_datasets');
    this.initialized = false;
    this.listeningHistory = [];
    this.trackFeatures = new Map();
    this.userInteractions = [];
    this.loading = false;
    
    // MongoDB-like collections storage
    this.collections = {
      listening_history: [],
      tracks: [],
      users: [],
      user_settings: [],
      recommendations: [],
      playlists: []
    };
    
    // Auto-increment IDs for each collection
    this.nextIds = {
      listening_history: 1,
      tracks: 1,
      users: 1,
      user_settings: 1,
      recommendations: 1,
      playlists: 1
    };
  }

  /**
   * Initialize the local file database by loading CSV and JSON files
   */
  async initialize() {
    if (this.initialized || this.loading) {
      return this.initialized;
    }

    this.loading = true;
    console.log('📁 Initializing Local File Database...');
    
    try {
      // Check if data directory exists
      if (!fs.existsSync(this.dataDir)) {
        console.warn('⚠️  Data directory not found');
        this.loading = false;
        return false;
      }

      // Load listening history from JSON files (lightweight load - first 1000 records per file)
      await this.loadStreamingHistory();
      
      // Load track features from CSV
      await this.loadTrackFeatures();
      
      // Load user interactions from ML datasets
      await this.loadUserInteractions();
      
      // Populate MongoDB-like collections from loaded data
      await this.populateCollections();
      
      this.initialized = true;
      this.loading = false;
      
      console.log('✅ Local File Database initialized successfully');
      console.log(`📊 Loaded ${this.listeningHistory.length} listening history records`);
      console.log(`🎵 Loaded ${this.trackFeatures.size} track features`);
      console.log(`👥 Loaded ${this.userInteractions.length} user interactions`);
      console.log('💾 MongoDB-compatible collections initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Local File Database initialization failed:', error.message);
      this.loading = false;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Load streaming history from JSON files
   */
  async loadStreamingHistory() {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(f => f.startsWith('Streaming_History_Audio') && f.endsWith('.json'))
        .sort();
      
      console.log(`📂 Found ${files.length} streaming history files`);
      
      // Load ALL files completely - no limits
      let totalLoaded = 0;
      const maxRecordsPerFile = Infinity; // Load ALL records for complete music history
      
      // Load ALL files - no limits for complete music history
      for (let i = 0; i < files.length; i++) {
        const file = files[files.length - 1 - i]; // Start from most recent
        const filePath = path.join(this.dataDir, file);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          const records = Array.isArray(data) ? data : [data];
          
          // Load ALL records from each file - complete history
          this.listeningHistory.push(...records);
          totalLoaded += records.length;
          
          console.log(`  📄 Loaded ${records.length} records from ${file}`);
        } catch (fileError) {
          console.warn(`  ⚠️  Could not load ${file}:`, fileError.message);
        }
      }
      
      console.log(`✅ Total streaming history loaded: ${totalLoaded} records`);
    } catch (error) {
      console.warn('⚠️  Could not load streaming history:', error.message);
    }
  }

  /**
   * Load track features from CSV file
   */
  async loadTrackFeatures() {
    try {
      const csvFile = path.join(this.dataDir, 'Merged Data With Audio Features (1) (1).csv');
      
      if (!fs.existsSync(csvFile)) {
        console.warn('⚠️  Track features CSV not found');
        return;
      }
      
      return new Promise((resolve, reject) => {
        let count = 0;
        const maxRecords = Infinity; // Load ALL track features with audio data - no limits
        
        fs.createReadStream(csvFile)
          .pipe(csvParser())
          .on('data', (row) => {
            if (count >= maxRecords) return;
            
            const trackId = row.track_id || row.spotify_track_uri;
            if (trackId) {
              // Load ALL Spotify audio features for personalized recommendations
              this.trackFeatures.set(trackId, {
                trackId,
                spotifyUri: row.spotify_track_uri,
                trackName: row.master_metadata_track_name || row['Track Name_releases'],
                artistName: row.master_metadata_album_artist_name || row['Artist Name(s)_releases'],
                albumName: row.master_metadata_album_album_name || row['Album Name_releases'],
                
                // Core audio features for personalization
                danceability: parseFloat(row.Danceability) || 0,
                energy: parseFloat(row.Energy) || 0,
                key: parseInt(row.Key) || 0,
                loudness: parseFloat(row.Loudness) || 0,
                mode: parseInt(row.Mode) || 0,
                speechiness: parseFloat(row.Speechiness) || 0,
                acousticness: parseFloat(row.Acousticness) || 0,
                instrumentalness: parseFloat(row.Instrumentalness) || 0,
                liveness: parseFloat(row.Liveness) || 0,
                valence: parseFloat(row.Valence) || 0,
                tempo: parseFloat(row.Tempo) || 0,
                timeSignature: parseInt(row['Time Signature']) || 4,
                
                // Additional metadata for recommendations
                popularity: parseInt(row.Popularity_releases) || 0,
                explicit: row.Explicit_releases === 'true' || row.Explicit_releases === '1',
                duration_ms: parseInt(row['Track Duration (ms)_releases']) || 0,
                
                // Release and catalog data
                albumReleaseDate: row['Album Release Date_releases'],
                albumImageUrl: row['Album Image URL_releases'],
                discNumber: parseInt(row['Disc Number_releases']) || 1,
                trackNumber: parseInt(row['Track Number_releases']) || 1,
                isrc: row.ISRC_releases,
                
                // Artist and genre information
                artistUris: row['Artist URI(s)_releases'],
                artistGenres: row['Artist Genres'] ? row['Artist Genres'].split(',').map(g => g.trim()) : [],
                albumGenres: row['Album Genres'] ? row['Album Genres'].split(',').map(g => g.trim()) : [],
                
                // Catalog metadata
                label: row.Label,
                copyrights: row.Copyrights,
                
                // Track URIs for Spotify API
                trackUri: row['Track URI'],
                albumUri: row.Album_URI_releases || row['Album URI_releases'],
                
                // Preview and additional data
                previewUrl: row['Track Preview URL_releases'],
                addedAt: row['Added At_releases'],
                addedBy: row['Added By_releases']
              });
              count++;
            }
          })
          .on('end', () => {
            console.log(`✅ Loaded ${count} track features from CSV`);
            resolve();
          })
          .on('error', (error) => {
            console.warn('⚠️  Error loading track features:', error.message);
            resolve(); // Resolve anyway, partial data is okay
          });
      });
    } catch (error) {
      console.warn('⚠️  Could not load track features:', error.message);
    }
  }

  /**
   * Load user interactions from ML datasets
   */
  async loadUserInteractions() {
    try {
      const interactionsFile = path.join(this.mlDataDir, 'user_track_interactions.csv');
      
      if (!fs.existsSync(interactionsFile)) {
        console.warn('⚠️  User interactions CSV not found');
        return;
      }
      
      return new Promise((resolve, reject) => {
        let count = 0;
        const maxRecords = Infinity; // Load ALL user interactions - no limits
        
        fs.createReadStream(interactionsFile)
          .pipe(csvParser())
          .on('data', (row) => {
            if (count >= maxRecords) return;
            this.userInteractions.push(row);
            count++;
          })
          .on('end', () => {
            console.log(`✅ Loaded ${count} user interactions`);
            resolve();
          })
          .on('error', (error) => {
            console.warn('⚠️  Error loading user interactions:', error.message);
            resolve();
          });
      });
    } catch (error) {
      console.warn('⚠️  Could not load user interactions:', error.message);
    }
  }

  /**
   * Populate MongoDB-like collections from loaded data
   */
  async populateCollections() {
    try {
      // Populate listening_history collection with ALL fields for personalization
      this.collections.listening_history = this.listeningHistory.map((record, index) => ({
        _id: index + 1,
        userId: 'default_user',
        
        // Track identification
        trackId: record.spotify_track_uri,
        trackName: record.master_metadata_track_name,
        artistName: record.master_metadata_album_artist_name,
        albumName: record.master_metadata_album_album_name,
        
        // Playback context for personalization
        playedAt: record.ts ? new Date(record.ts) : new Date(),
        msPlayed: parseInt(record.ms_played) || 0,
        platform: record.platform,
        connCountry: record.conn_country,
        ipAddr: record.ip_addr,
        
        // User behavior signals for recommendations
        skipped: record.skipped || false,
        shuffle: record.shuffle || false,
        offline: record.offline || false,
        incognitoMode: record.incognito_mode || false,
        offlineTimestamp: record.offline_timestamp,
        
        // Context for AI recommendations
        reasonStart: record.reason_start,  // How track started (clickrow, fwdbtn, etc.)
        reasonEnd: record.reason_end,      // How track ended (endplay, fwdbtn, etc.)
        
        // Episode/Audiobook data if present
        episodeName: record.episode_name,
        episodeShowName: record.episode_show_name,
        spotifyEpisodeUri: record.spotify_episode_uri,
        audiobookTitle: record.audiobook_title,
        audiobookUri: record.audiobook_uri,
        audiobookChapterUri: record.audiobook_chapter_uri,
        audiobookChapterTitle: record.audiobook_chapter_title,
        
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // Populate tracks collection with ALL Spotify audio features for ML recommendations
      const tracksArray = Array.from(this.trackFeatures.values());
      this.collections.tracks = tracksArray.map((track, index) => ({
        _id: index + 1,
        
        // Track identification
        trackId: track.trackId,
        spotifyUri: track.spotifyUri,
        trackUri: track.trackUri,
        trackName: track.trackName,
        artistName: track.artistName,
        albumName: track.albumName,
        
        // Complete Spotify Audio Features for personalization
        audioFeatures: {
          // Core features for mood/energy analysis
          danceability: track.danceability,      // 0.0-1.0: How suitable for dancing
          energy: track.energy,                  // 0.0-1.0: Intensity and activity
          valence: track.valence,                // 0.0-1.0: Musical positiveness
          
          // Acoustic properties
          acousticness: track.acousticness,      // 0.0-1.0: Acoustic vs electronic
          instrumentalness: track.instrumentalness, // 0.0-1.0: Vocal presence
          speechiness: track.speechiness,        // 0.0-1.0: Spoken word presence
          liveness: track.liveness,              // 0.0-1.0: Live performance
          
          // Musical properties
          key: track.key,                        // 0-11: Pitch class (C=0, C#=1, etc.)
          mode: track.mode,                      // 0=Minor, 1=Major
          tempo: track.tempo,                    // BPM
          loudness: track.loudness,              // dB, typically -60 to 0
          timeSignature: track.timeSignature     // Beats per measure
        },
        
        // Popularity and engagement metrics
        popularity: track.popularity,            // 0-100: Track popularity
        explicit: track.explicit,
        duration_ms: track.duration_ms,
        
        // Release and catalog information
        albumReleaseDate: track.albumReleaseDate,
        albumImageUrl: track.albumImageUrl,
        discNumber: track.discNumber,
        trackNumber: track.trackNumber,
        isrc: track.isrc,
        
        // Genre and style information for recommendations
        artistUris: track.artistUris,
        artistGenres: track.artistGenres || [],  // Artist genres for style matching
        albumGenres: track.albumGenres || [],    // Album genres
        
        // Label and copyright
        label: track.label,
        copyrights: track.copyrights,
        
        // URIs for Spotify API integration
        albumUri: track.albumUri,
        previewUrl: track.previewUrl,
        
        // Metadata
        addedAt: track.addedAt,
        addedBy: track.addedBy,
        
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // Populate users collection with default user
      this.collections.users = [{
        _id: 1,
        id: 'default_user',
        spotifyId: 'default_spotify_user',
        displayName: 'Local User',
        email: 'user@local.dev',
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      
      // Initialize other collections as empty
      this.collections.user_settings = [];
      this.collections.recommendations = [];
      this.collections.playlists = [];
      
      // Set next IDs
      this.nextIds.listening_history = this.collections.listening_history.length + 1;
      this.nextIds.tracks = this.collections.tracks.length + 1;
      this.nextIds.users = 2;
      
      console.log('💾 Collections populated:');
      console.log(`   - listening_history: ${this.collections.listening_history.length} records`);
      console.log(`   - tracks: ${this.collections.tracks.length} records`);
      console.log(`   - users: ${this.collections.users.length} records`);
    } catch (error) {
      console.warn('⚠️  Error populating collections:', error.message);
    }
  }

  /**
   * Query listening history with filters
   */
  async queryListeningHistory(filters = {}, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    let results = [...this.listeningHistory];

    // Apply filters
    if (filters.trackName) {
      const searchTerm = filters.trackName.toLowerCase();
      results = results.filter(r => 
        r.master_metadata_track_name?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.artistName) {
      const searchTerm = filters.artistName.toLowerCase();
      results = results.filter(r => 
        r.master_metadata_album_artist_name?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.startDate) {
      results = results.filter(r => new Date(r.ts) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      results = results.filter(r => new Date(r.ts) <= new Date(filters.endDate));
    }

    // Apply sorting
    if (options.sort) {
      results.sort((a, b) => {
        const aVal = a[options.sort.field];
        const bVal = b[options.sort.field];
        return options.sort.order === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
      });
    }

    // Apply pagination
    const limit = options.limit || 100;
    const skip = options.skip || 0;
    results = results.slice(skip, skip + limit);

    return {
      data: results,
      total: this.listeningHistory.length,
      count: results.length
    };
  }

  /**
   * Get track features by track ID
   */
  async getTrackFeatures(trackId) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.trackFeatures.get(trackId) || null;
  }

  /**
   * Get recommendations based on track features
   */
  async getRecommendations(seedTrackId, limit = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    const seedTrack = this.trackFeatures.get(seedTrackId);
    if (!seedTrack) {
      return [];
    }

    // Simple content-based recommendation using audio features
    const recommendations = [];
    
    for (const [trackId, features] of this.trackFeatures) {
      if (trackId === seedTrackId) continue;
      
      // Calculate similarity score based on audio features
      const similarity = this.calculateSimilarity(seedTrack, features);
      recommendations.push({ trackId, features, similarity });
    }

    // Sort by similarity and return top N
    recommendations.sort((a, b) => b.similarity - a.similarity);
    return recommendations.slice(0, limit).map(r => r.features);
  }

  /**
   * Calculate similarity between two tracks using ALL audio features
   * Advanced algorithm using weighted features for personalized recommendations
   */
  calculateSimilarity(track1, track2) {
    // Weighted features - more important features have higher weights
    const featureWeights = {
      // Primary mood/energy features (highest weight)
      valence: 0.20,          // Musical positiveness - critical for mood
      energy: 0.18,           // Intensity - key for workout/chill playlists
      danceability: 0.15,     // Groove - important for party/dance
      
      // Secondary acoustic features
      acousticness: 0.12,     // Acoustic vs electronic
      instrumentalness: 0.10, // Vocal vs instrumental
      speechiness: 0.08,      // Rap/spoken word
      
      // Musical structure
      tempo: 0.08,            // BPM - normalized to 0-1
      loudness: 0.05,         // Volume - normalized
      liveness: 0.04          // Live vs studio
    };
    
    let weightedSimilarity = 0;
    let totalWeight = 0;
    
    for (const [feature, weight] of Object.entries(featureWeights)) {
      let val1 = track1[feature] || 0;
      let val2 = track2[feature] || 0;
      
      // Normalize tempo and loudness to 0-1 range
      if (feature === 'tempo') {
        val1 = Math.min(val1 / 200, 1); // Normalize BPM
        val2 = Math.min(val2 / 200, 1);
      } else if (feature === 'loudness') {
        val1 = (val1 + 60) / 60; // Normalize dB (-60 to 0)
        val2 = (val2 + 60) / 60;
      }
      
      // Calculate feature similarity (1 - absolute difference)
      const featureSimilarity = 1 - Math.abs(val1 - val2);
      weightedSimilarity += featureSimilarity * weight;
      totalWeight += weight;
    }
    
    // Additional bonus for matching genres
    let genreBonus = 0;
    if (track1.artistGenres && track2.artistGenres) {
      const genres1 = new Set(track1.artistGenres);
      const genres2 = new Set(track2.artistGenres);
      const intersection = [...genres1].filter(g => genres2.has(g));
      genreBonus = intersection.length > 0 ? 0.10 : 0; // 10% bonus for genre match
    }
    
    // Additional bonus for matching key/mode (music theory)
    let keyBonus = 0;
    if (track1.key === track2.key && track1.mode === track2.mode) {
      keyBonus = 0.05; // 5% bonus for same key and mode
    }
    
    // Calculate final similarity score (0-1 range)
    const baseSimilarity = weightedSimilarity / totalWeight;
    const finalSimilarity = Math.min(baseSimilarity + genreBonus + keyBonus, 1.0);
    
    return finalSimilarity;
  }

  /**
   * Get personalized recommendations based on listening history and audio features
   */
  async getPersonalizedRecommendations(userId = 'default_user', limit = 20) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Analyze user's listening patterns
    const userProfile = this.buildUserProfile(userId);
    
    // Score all tracks based on user profile
    const scoredTracks = [];
    for (const [trackId, features] of this.trackFeatures) {
      // Skip if already in history
      const inHistory = this.listeningHistory.some(h => h.spotify_track_uri === trackId);
      if (inHistory) continue;
      
      const score = this.calculatePersonalizationScore(features, userProfile);
      scoredTracks.push({ trackId, features, score });
    }
    
    // Sort by score and return top recommendations
    scoredTracks.sort((a, b) => b.score - a.score);
    return scoredTracks.slice(0, limit).map(t => ({
      ...t.features,
      recommendationScore: t.score,
      recommendationReason: this.getRecommendationReason(t.features, userProfile)
    }));
  }

  /**
   * Build user profile from listening history
   */
  buildUserProfile(userId) {
    const userHistory = this.listeningHistory.filter(h => 
      !h.skipped && h.ms_played > 30000 // Only completed plays
    );
    
    if (userHistory.length === 0) {
      return this.getDefaultProfile();
    }
    
    // Calculate average audio features from listening history
    const profile = {
      avgDanceability: 0,
      avgEnergy: 0,
      avgValence: 0,
      avgTempo: 0,
      avgAcousticness: 0,
      avgInstrumentalness: 0,
      avgSpeechiness: 0,
      favoriteGenres: new Set(),
      favoriteArtists: new Map(),
      listeningCount: userHistory.length,
      averagePlayTime: 0
    };
    
    let featureCount = 0;
    let totalPlayTime = 0;
    
    userHistory.forEach(record => {
      const trackFeatures = this.trackFeatures.get(record.spotify_track_uri);
      if (trackFeatures) {
        profile.avgDanceability += trackFeatures.danceability || 0;
        profile.avgEnergy += trackFeatures.energy || 0;
        profile.avgValence += trackFeatures.valence || 0;
        profile.avgTempo += trackFeatures.tempo || 0;
        profile.avgAcousticness += trackFeatures.acousticness || 0;
        profile.avgInstrumentalness += trackFeatures.instrumentalness || 0;
        profile.avgSpeechiness += trackFeatures.speechiness || 0;
        featureCount++;
        
        // Track genres
        if (trackFeatures.artistGenres) {
          trackFeatures.artistGenres.forEach(g => profile.favoriteGenres.add(g));
        }
      }
      
      // Track artists
      const artist = record.master_metadata_album_artist_name;
      if (artist) {
        profile.favoriteArtists.set(artist, (profile.favoriteArtists.get(artist) || 0) + 1);
      }
      
      totalPlayTime += parseInt(record.ms_played) || 0;
    });
    
    // Calculate averages
    if (featureCount > 0) {
      profile.avgDanceability /= featureCount;
      profile.avgEnergy /= featureCount;
      profile.avgValence /= featureCount;
      profile.avgTempo /= featureCount;
      profile.avgAcousticness /= featureCount;
      profile.avgInstrumentalness /= featureCount;
      profile.avgSpeechiness /= featureCount;
    }
    
    profile.averagePlayTime = totalPlayTime / userHistory.length;
    profile.favoriteGenres = Array.from(profile.favoriteGenres);
    
    // Get top 10 artists
    profile.topArtists = Array.from(profile.favoriteArtists.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist, count]) => ({ artist, playCount: count }));
    
    return profile;
  }

  /**
   * Calculate personalization score for a track
   */
  calculatePersonalizationScore(track, userProfile) {
    let score = 0;
    
    // Feature similarity (60% of score)
    const featureSimilarity = (
      (1 - Math.abs(track.danceability - userProfile.avgDanceability)) * 0.15 +
      (1 - Math.abs(track.energy - userProfile.avgEnergy)) * 0.15 +
      (1 - Math.abs(track.valence - userProfile.avgValence)) * 0.15 +
      (1 - Math.abs((track.tempo / 200) - (userProfile.avgTempo / 200))) * 0.05 +
      (1 - Math.abs(track.acousticness - userProfile.avgAcousticness)) * 0.05 +
      (1 - Math.abs(track.instrumentalness - userProfile.avgInstrumentalness)) * 0.03 +
      (1 - Math.abs(track.speechiness - userProfile.avgSpeechiness)) * 0.02
    );
    score += featureSimilarity * 0.6;
    
    // Genre match (25% of score)
    if (track.artistGenres && userProfile.favoriteGenres) {
      const trackGenres = new Set(track.artistGenres);
      const matchingGenres = userProfile.favoriteGenres.filter(g => trackGenres.has(g));
      score += (matchingGenres.length / Math.max(userProfile.favoriteGenres.length, 1)) * 0.25;
    }
    
    // Popularity factor (10% of score) - slight boost for popular tracks
    score += (track.popularity / 100) * 0.10;
    
    // Diversity bonus (5% of score) - encourage some exploration
    const diversityBonus = Math.random() * 0.05;
    score += diversityBonus;
    
    return score;
  }

  /**
   * Get recommendation reason
   */
  getRecommendationReason(track, userProfile) {
    const reasons = [];
    
    // Check feature matches
    if (Math.abs(track.valence - userProfile.avgValence) < 0.15) {
      reasons.push('matches your mood preference');
    }
    if (Math.abs(track.energy - userProfile.avgEnergy) < 0.15) {
      reasons.push('similar energy to your favorites');
    }
    if (Math.abs(track.danceability - userProfile.avgDanceability) < 0.15) {
      reasons.push('great for your listening style');
    }
    
    // Check genre match
    if (track.artistGenres && userProfile.favoriteGenres) {
      const matchingGenres = track.artistGenres.filter(g => 
        userProfile.favoriteGenres.includes(g)
      );
      if (matchingGenres.length > 0) {
        reasons.push(`${matchingGenres[0]} genre match`);
      }
    }
    
    // Popularity
    if (track.popularity > 80) {
      reasons.push('trending track');
    }
    
    return reasons.join(', ') || 'based on your listening history';
  }

  /**
   * Get default profile for new users
   */
  getDefaultProfile() {
    return {
      avgDanceability: 0.5,
      avgEnergy: 0.5,
      avgValence: 0.5,
      avgTempo: 120,
      avgAcousticness: 0.3,
      avgInstrumentalness: 0.2,
      avgSpeechiness: 0.1,
      favoriteGenres: [],
      topArtists: [],
      listeningCount: 0,
      averagePlayTime: 0
    };
  }

  /**
   * Get statistics about the data
   */
  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    return {
      listeningHistoryCount: this.listeningHistory.length,
      trackFeaturesCount: this.trackFeatures.size,
      userInteractionsCount: this.userInteractions.length,
      uniqueArtists: new Set(
        this.listeningHistory
          .map(r => r.master_metadata_album_artist_name)
          .filter(Boolean)
      ).size,
      uniqueTracks: new Set(
        this.listeningHistory
          .map(r => r.spotify_track_uri)
          .filter(Boolean)
      ).size,
      totalPlayTimeHours: (this.listeningHistory.reduce((sum, r) => sum + (parseInt(r.ms_played) || 0), 0) / (1000 * 60 * 60)).toFixed(2)
    };
  }

  /**
   * Search tracks by name or artist
   */
  async searchTracks(query, limit = 20) {
    if (!this.initialized) {
      await this.initialize();
    }

    const searchTerm = query.toLowerCase();
    const results = [];

    for (const [trackId, features] of this.trackFeatures) {
      if (results.length >= limit) break;
      
      const trackName = (features.trackName || '').toLowerCase();
      const artistName = (features.artistName || '').toLowerCase();
      
      if (trackName.includes(searchTerm) || artistName.includes(searchTerm)) {
        results.push(features);
      }
    }

    return results;
  }

  /**
   * MongoDB-compatible collection API
   * Returns a collection object with MongoDB-like methods
   */
  collection(name) {
    if (!this.collections[name]) {
      this.collections[name] = [];
      this.nextIds[name] = 1;
    }
    
    const self = this;
    
    return {
      /**
       * Find documents matching query
       * @param {Object} query - MongoDB-style query object
       * @param {Object} options - Query options (projection, sort, limit, skip)
       */
      find(query = {}, options = {}) {
        let results = self.collections[name];
        
        // Apply query filter
        if (Object.keys(query).length > 0) {
          results = results.filter(doc => self._matchesQuery(doc, query));
        }
        
        // Apply projection
        if (options.projection) {
          results = results.map(doc => self._applyProjection(doc, options.projection));
        }
        
        // Return cursor-like object
        const cursor = {
          _results: results,
          _sortObj: options.sort,
          _limitNum: options.limit,
          _skipNum: options.skip,
          
          toArray: async function() {
            let finalResults = [...this._results];
            
            // Apply sort
            if (this._sortObj) {
              finalResults = self._applySort(finalResults, this._sortObj);
            }
            
            // Apply skip
            if (this._skipNum) {
              finalResults = finalResults.slice(this._skipNum);
            }
            
            // Apply limit
            if (this._limitNum) {
              finalResults = finalResults.slice(0, this._limitNum);
            }
            
            return finalResults;
          },
          
          sort: function(sortObj) {
            this._sortObj = sortObj;
            return this;
          },
          
          limit: function(n) {
            this._limitNum = n;
            return this;
          },
          
          skip: function(n) {
            this._skipNum = n;
            return this;
          }
        };
        
        return cursor;
      },
      
      /**
       * Find one document matching query
       */
      async findOne(query = {}, options = {}) {
        let results = self.collections[name];
        
        if (Object.keys(query).length > 0) {
          results = results.filter(doc => self._matchesQuery(doc, query));
        }
        
        // Apply sort if specified
        if (options.sort) {
          results = self._applySort(results, options.sort);
        }
        
        const doc = results[0] || null;
        
        // Apply projection
        if (doc && options.projection) {
          return self._applyProjection(doc, options.projection);
        }
        
        return doc;
      },
      
      /**
       * Insert one document
       */
      async insertOne(doc) {
        const newDoc = {
          _id: doc._id || self.nextIds[name]++,
          ...doc,
          createdAt: doc.createdAt || new Date(),
          updatedAt: new Date()
        };
        
        self.collections[name].push(newDoc);
        
        return {
          insertedId: newDoc._id,
          acknowledged: true
        };
      },
      
      /**
       * Insert many documents
       */
      async insertMany(docs, options = {}) {
        const insertedIds = [];
        const ordered = options.ordered !== false;
        
        for (const doc of docs) {
          try {
            const result = await this.insertOne(doc);
            insertedIds.push(result.insertedId);
          } catch (error) {
            if (ordered) {
              throw error;
            }
          }
        }
        
        return {
          insertedIds,
          insertedCount: insertedIds.length,
          acknowledged: true
        };
      },
      
      /**
       * Update one document
       */
      async updateOne(query, update, options = {}) {
        const docIndex = self.collections[name].findIndex(doc => 
          self._matchesQuery(doc, query)
        );
        
        if (docIndex === -1) {
          if (options.upsert) {
            // Create new document
            const newDoc = self._applyUpdate({}, update);
            return await this.insertOne(newDoc);
          }
          return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
        }
        
        const oldDoc = self.collections[name][docIndex];
        const newDoc = self._applyUpdate({ ...oldDoc }, update);
        newDoc.updatedAt = new Date();
        
        self.collections[name][docIndex] = newDoc;
        
        return {
          matchedCount: 1,
          modifiedCount: 1,
          acknowledged: true,
          upsertedId: null
        };
      },
      
      /**
       * Update many documents
       */
      async updateMany(query, update) {
        let modifiedCount = 0;
        
        self.collections[name] = self.collections[name].map(doc => {
          if (self._matchesQuery(doc, query)) {
            modifiedCount++;
            const updated = self._applyUpdate({ ...doc }, update);
            updated.updatedAt = new Date();
            return updated;
          }
          return doc;
        });
        
        return {
          matchedCount: modifiedCount,
          modifiedCount,
          acknowledged: true
        };
      },
      
      /**
       * Replace one document
       */
      async replaceOne(query, replacement, options = {}) {
        const docIndex = self.collections[name].findIndex(doc => 
          self._matchesQuery(doc, query)
        );
        
        if (docIndex === -1) {
          if (options.upsert) {
            return await this.insertOne(replacement);
          }
          return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
        }
        
        const oldDoc = self.collections[name][docIndex];
        const newDoc = {
          _id: oldDoc._id,
          ...replacement,
          updatedAt: new Date()
        };
        
        self.collections[name][docIndex] = newDoc;
        
        return {
          matchedCount: 1,
          modifiedCount: 1,
          acknowledged: true
        };
      },
      
      /**
       * Find one and update
       */
      async findOneAndUpdate(query, update, options = {}) {
        const doc = await this.findOne(query);
        
        if (!doc) {
          if (options.upsert) {
            const newDoc = self._applyUpdate({}, update);
            await this.insertOne(newDoc);
            return { value: options.returnDocument === 'after' ? newDoc : null };
          }
          return { value: null };
        }
        
        const oldValue = { ...doc };
        await this.updateOne(query, update);
        
        if (options.returnDocument === 'after') {
          const newValue = await this.findOne(query);
          return { value: newValue };
        }
        
        return { value: oldValue };
      },
      
      /**
       * Delete one document
       */
      async deleteOne(query) {
        const docIndex = self.collections[name].findIndex(doc => 
          self._matchesQuery(doc, query)
        );
        
        if (docIndex === -1) {
          return { deletedCount: 0, acknowledged: true };
        }
        
        self.collections[name].splice(docIndex, 1);
        
        return { deletedCount: 1, acknowledged: true };
      },
      
      /**
       * Delete many documents
       */
      async deleteMany(query) {
        const originalLength = self.collections[name].length;
        
        self.collections[name] = self.collections[name].filter(doc => 
          !self._matchesQuery(doc, query)
        );
        
        const deletedCount = originalLength - self.collections[name].length;
        
        return { deletedCount, acknowledged: true };
      },
      
      /**
       * Count documents
       */
      async countDocuments(query = {}) {
        if (Object.keys(query).length === 0) {
          return self.collections[name].length;
        }
        
        return self.collections[name].filter(doc => 
          self._matchesQuery(doc, query)
        ).length;
      },
      
      /**
       * Create index (no-op for in-memory, but MongoDB-compatible)
       */
      async createIndex(keys, options = {}) {
        console.log(`📇 Index created for ${name}:`, keys);
        return { name: `${Object.keys(keys).join('_')}_1` };
      },
      
      /**
       * Aggregate pipeline
       */
      aggregate(pipeline) {
        let results = [...self.collections[name]];
        
        for (const stage of pipeline) {
          if (stage.$match) {
            results = results.filter(doc => self._matchesQuery(doc, stage.$match));
          }
          
          if (stage.$group) {
            results = self._applyGroup(results, stage.$group);
          }
          
          if (stage.$sort) {
            results = self._applySort(results, stage.$sort);
          }
          
          if (stage.$limit) {
            results = results.slice(0, stage.$limit);
          }
          
          if (stage.$skip) {
            results = results.slice(stage.$skip);
          }
          
          if (stage.$project) {
            results = results.map(doc => self._applyProjection(doc, stage.$project));
          }
        }
        
        return {
          toArray: async () => results
        };
      }
    };
  }
  
  /**
   * Get database-like object (MongoDB compatibility)
   */
  db(dbName = 'echotune') {
    return {
      collection: (name) => this.collection(name),
      admin: () => ({
        ping: async () => ({ ok: 1 })
      })
    };
  }
  
  /**
   * Helper: Match document against MongoDB-style query
   */
  _matchesQuery(doc, query) {
    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith('$')) {
        // Handle operators
        if (key === '$or') {
          return value.some(subQuery => this._matchesQuery(doc, subQuery));
        }
        if (key === '$and') {
          return value.every(subQuery => this._matchesQuery(doc, subQuery));
        }
        continue;
      }
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Handle field operators
        const fieldValue = this._getNestedValue(doc, key);
        
        for (const [op, opValue] of Object.entries(value)) {
          if (op === '$eq' && fieldValue !== opValue) return false;
          if (op === '$ne' && fieldValue === opValue) return false;
          if (op === '$gt' && !(fieldValue > opValue)) return false;
          if (op === '$gte' && !(fieldValue >= opValue)) return false;
          if (op === '$lt' && !(fieldValue < opValue)) return false;
          if (op === '$lte' && !(fieldValue <= opValue)) return false;
          if (op === '$in' && !opValue.includes(fieldValue)) return false;
          if (op === '$nin' && opValue.includes(fieldValue)) return false;
          if (op === '$exists') {
            const exists = fieldValue !== undefined;
            if (exists !== opValue) return false;
          }
          if (op === '$regex') {
            const regex = new RegExp(opValue);
            if (!regex.test(String(fieldValue))) return false;
          }
        }
      } else {
        // Simple equality
        const fieldValue = this._getNestedValue(doc, key);
        if (fieldValue !== value) return false;
      }
    }
    
    return true;
  }
  
  /**
   * Helper: Get nested value from object (e.g., "user.name")
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current?.[key], obj
    );
  }
  
  /**
   * Helper: Apply MongoDB update operators
   */
  _applyUpdate(doc, update) {
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        delete doc[key];
      }
    }
    
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        doc[key] = (doc[key] || 0) + value;
      }
    }
    
    if (update.$push) {
      for (const [key, value] of Object.entries(update.$push)) {
        if (!Array.isArray(doc[key])) {
          doc[key] = [];
        }
        doc[key].push(value);
      }
    }
    
    if (update.$pull) {
      for (const [key, value] of Object.entries(update.$pull)) {
        if (Array.isArray(doc[key])) {
          doc[key] = doc[key].filter(item => item !== value);
        }
      }
    }
    
    if (update.$addToSet) {
      for (const [key, value] of Object.entries(update.$addToSet)) {
        if (!Array.isArray(doc[key])) {
          doc[key] = [];
        }
        if (!doc[key].includes(value)) {
          doc[key].push(value);
        }
      }
    }
    
    return doc;
  }
  
  /**
   * Helper: Apply projection
   */
  _applyProjection(doc, projection) {
    const result = {};
    const include = Object.values(projection).some(v => v === 1);
    
    if (include) {
      // Include mode
      for (const [key, value] of Object.entries(projection)) {
        if (value === 1) {
          result[key] = doc[key];
        }
      }
      // Always include _id unless explicitly excluded
      if (projection._id !== 0 && doc._id !== undefined) {
        result._id = doc._id;
      }
    } else {
      // Exclude mode
      Object.assign(result, doc);
      for (const [key, value] of Object.entries(projection)) {
        if (value === 0) {
          delete result[key];
        }
      }
    }
    
    return result;
  }
  
  /**
   * Helper: Apply sort
   */
  _applySort(docs, sort) {
    const sortKeys = Object.entries(sort);
    
    return [...docs].sort((a, b) => {
      for (const [key, order] of sortKeys) {
        const aVal = this._getNestedValue(a, key);
        const bVal = this._getNestedValue(b, key);
        
        if (aVal < bVal) return order === 1 ? -1 : 1;
        if (aVal > bVal) return order === 1 ? 1 : -1;
      }
      return 0;
    });
  }
  
  /**
   * Helper: Apply $group stage
   */
  _applyGroup(docs, groupStage) {
    const { _id, ...accumulators } = groupStage;
    const groups = new Map();
    
    // Group documents
    for (const doc of docs) {
      const groupKey = _id === null ? 'null' : 
        typeof _id === 'string' && _id.startsWith('$') ? 
          this._getNestedValue(doc, _id.substring(1)) : 
          _id;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(doc);
    }
    
    // Apply accumulators
    const results = [];
    for (const [groupKey, groupDocs] of groups) {
      const result = { _id: groupKey };
      
      for (const [field, accumulator] of Object.entries(accumulators)) {
        if (accumulator.$sum) {
          if (accumulator.$sum === 1) {
            result[field] = groupDocs.length;
          } else if (typeof accumulator.$sum === 'string' && accumulator.$sum.startsWith('$')) {
            const fieldName = accumulator.$sum.substring(1);
            result[field] = groupDocs.reduce((sum, doc) => 
              sum + (this._getNestedValue(doc, fieldName) || 0), 0
            );
          }
        }
        
        if (accumulator.$avg) {
          const fieldName = accumulator.$avg.substring(1);
          const values = groupDocs.map(doc => this._getNestedValue(doc, fieldName) || 0);
          result[field] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
        
        if (accumulator.$addToSet) {
          const fieldName = accumulator.$addToSet.substring(1);
          result[field] = [...new Set(groupDocs.map(doc => 
            this._getNestedValue(doc, fieldName)
          ))];
        }
        
        if (accumulator.$push) {
          const fieldName = accumulator.$push.substring(1);
          result[field] = groupDocs.map(doc => this._getNestedValue(doc, fieldName));
        }
        
        if (accumulator.$min) {
          const fieldName = accumulator.$min.substring(1);
          const values = groupDocs.map(doc => this._getNestedValue(doc, fieldName));
          result[field] = Math.min(...values);
        }
        
        if (accumulator.$max) {
          const fieldName = accumulator.$max.substring(1);
          const values = groupDocs.map(doc => this._getNestedValue(doc, fieldName));
          result[field] = Math.max(...values);
        }
      }
      
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Connect method (MongoDB compatibility)
   */
  async connect() {
    return await this.initialize();
  }
  
  /**
   * Close/cleanup (no-op for file-based DB)
   */
  async close() {
    console.log('📁 Local File Database closed');
    return true;
  }
}

module.exports = LocalFileDatabase;
