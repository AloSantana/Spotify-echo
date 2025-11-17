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
      console.log(`💾 MongoDB-compatible collections initialized`);
      
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
   * Populate MongoDB-like collections from loaded data
   */
  async populateCollections() {
    try {
      // Populate listening_history collection
      this.collections.listening_history = this.listeningHistory.map((record, index) => ({
        _id: index + 1,
        userId: 'default_user',
        trackId: record.spotify_track_uri,
        trackName: record.master_metadata_track_name,
        artistName: record.master_metadata_album_artist_name,
        albumName: record.master_metadata_album_album_name,
        playedAt: record.ts ? new Date(record.ts) : new Date(),
        msPlayed: parseInt(record.ms_played) || 0,
        platform: record.platform,
        skipped: record.skipped || false,
        shuffle: record.shuffle || false,
        offline: record.offline || false,
        reasonStart: record.reason_start,
        reasonEnd: record.reason_end,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // Populate tracks collection
      const tracksArray = Array.from(this.trackFeatures.values());
      this.collections.tracks = tracksArray.map((track, index) => ({
        _id: index + 1,
        trackId: track.trackId,
        trackName: track.trackName,
        artistName: track.artistName,
        albumName: track.albumName,
        audioFeatures: {
          danceability: track.danceability,
          energy: track.energy,
          key: track.key,
          loudness: track.loudness,
          mode: track.mode,
          speechiness: track.speechiness,
          acousticness: track.acousticness,
          instrumentalness: track.instrumentalness,
          liveness: track.liveness,
          valence: track.valence,
          tempo: track.tempo,
          timeSignature: track.timeSignature
        },
        popularity: track.popularity,
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
      
      console.log(`💾 Collections populated:`);
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
