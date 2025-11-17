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
      
      this.initialized = true;
      this.loading = false;
      
      console.log('✅ Local File Database initialized successfully');
      console.log(`📊 Loaded ${this.listeningHistory.length} listening history records`);
      console.log(`🎵 Loaded ${this.trackFeatures.size} track features`);
      console.log(`👥 Loaded ${this.userInteractions.length} user interactions`);
      
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
      
      // Load most recent file fully, others partially
      let totalLoaded = 0;
      const maxRecordsPerFile = 1000; // Limit to avoid memory issues
      
      for (let i = 0; i < Math.min(files.length, 5); i++) { // Load max 5 files
        const file = files[files.length - 1 - i]; // Start from most recent
        const filePath = path.join(this.dataDir, file);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          const records = Array.isArray(data) ? data : [data];
          
          // Take first N records from each file
          const recordsToLoad = records.slice(0, maxRecordsPerFile);
          this.listeningHistory.push(...recordsToLoad);
          totalLoaded += recordsToLoad.length;
          
          console.log(`  📄 Loaded ${recordsToLoad.length} records from ${file}`);
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
        const maxRecords = 5000; // Limit to avoid memory issues
        
        fs.createReadStream(csvFile)
          .pipe(csvParser())
          .on('data', (row) => {
            if (count >= maxRecords) return;
            
            const trackId = row.track_id || row.spotify_track_uri;
            if (trackId) {
              this.trackFeatures.set(trackId, {
                trackId,
                trackName: row.master_metadata_track_name || row['Track Name_releases'],
                artistName: row.master_metadata_album_artist_name || row['Artist Name(s)_releases'],
                albumName: row.master_metadata_album_album_name || row['Album Name_releases'],
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
                popularity: parseInt(row.Popularity_releases) || 0
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
        const maxRecords = 2000;
        
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
   * Calculate similarity between two tracks based on audio features
   */
  calculateSimilarity(track1, track2) {
    const features = ['danceability', 'energy', 'valence', 'tempo', 'acousticness'];
    let totalDiff = 0;
    
    features.forEach(feature => {
      const diff = Math.abs(track1[feature] - track2[feature]);
      totalDiff += diff;
    });
    
    // Normalize to 0-1 range (lower diff = higher similarity)
    return 1 - (totalDiff / features.length);
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
      ).size
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
   * Close/cleanup (no-op for file-based DB)
   */
  async close() {
    console.log('📁 Local File Database closed');
    return true;
  }
}

module.exports = LocalFileDatabase;
