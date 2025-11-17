const { MongoClient } = require('mongodb');
const SQLiteManager = require('./sqlite-manager');
const LocalFileDatabase = require('./local-file-database');

/**
 * Database Abstraction Layer
 * Provides unified interface for multiple database types with fallback support
 * Priority: MongoDB > SQLite > Local File Database (CSV/JSON)
 */
class DatabaseManager {
  constructor() {
    this.mongodb = null;
    this.sqlite = null;
    this.localFileDb = null;
    this.activeDatabases = [];
    this.fallbackMode = false;
    this.initialized = false;
  }

  /**
   * Initialize database connections based on environment configuration
   */
  async initialize() {
    console.log('🔄 Initializing database connections...');

    // Try MongoDB first (preferred for analytics)
    if (process.env.MONGODB_URI) {
      try {
        await this.initializeMongoDB();
      } catch (error) {
        console.warn('MongoDB initialization failed:', error.message);
      }
    }

    // Initialize SQLite as fallback
    try {
      await this.initializeSQLite();
    } catch (error) {
      console.error('SQLite initialization failed:', error);
    }

    // Initialize Local File Database as final fallback
    if (this.activeDatabases.length === 0) {
      console.log('📁 Attempting Local File Database fallback...');
      try {
        await this.initializeLocalFileDatabase();
      } catch (error) {
        console.error('Local File Database initialization failed:', error.message);
      }
    }

    // Set fallback mode if no primary databases are available
    if (this.activeDatabases.length === 0) {
      this.fallbackMode = true;
      console.log('⚠️  No databases available!');
    } else if (!this.mongodb) {
      this.fallbackMode = true;
      console.log(`📦 Database running in fallback mode (${this.activeDatabases.join(', ')})`);
    }

    this.initialized = true;
    console.log('✅ Database manager initialized');
    console.log(`📊 Active databases: ${this.activeDatabases.join(', ')}`);

    return this.activeDatabases.length > 0;
  }

  /**
   * Initialize MongoDB connection
   */
  async initializeMongoDB() {
    try {
      this.mongodb = new MongoClient(process.env.MONGODB_URI, {
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });

      await this.mongodb.connect();

      // Test connection
      await this.mongodb.db().admin().ping();

      this.activeDatabases.push('mongodb');
      console.log('✅ MongoDB connected successfully');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.mongodb = null;
      return false;
    }
  }



  /**
   * Initialize SQLite fallback database
   */
  async initializeSQLite() {
    try {
      this.sqlite = new SQLiteManager();
      const success = await this.sqlite.initialize();

      if (success) {
        this.activeDatabases.push('sqlite');
        console.log('✅ SQLite fallback database ready');
        return true;
      } else {
        throw new Error('SQLite initialization failed');
      }
    } catch (error) {
      console.error('❌ SQLite initialization failed:', error.message);
      this.sqlite = null;
      return false;
    }
  }

  /**
   * Initialize Local File Database (CSV/JSON files)
   */
  async initializeLocalFileDatabase() {
    try {
      this.localFileDb = new LocalFileDatabase();
      const success = await this.localFileDb.initialize();

      if (success) {
        this.activeDatabases.push('local-files');
        console.log('✅ Local File Database ready (using CSV/JSON data)');
        return true;
      } else {
        throw new Error('Local File Database initialization failed');
      }
    } catch (error) {
      console.error('❌ Local File Database initialization failed:', error.message);
      this.localFileDb = null;
      return false;
    }
  }

  /**
   * Save user data to available databases
   */
  async saveUser(userData) {
    const results = [];

    // Try MongoDB first
    if (this.mongodb) {
      try {
        const db = this.mongodb.db(process.env.MONGODB_DATABASE || 'spotify_analytics');
        const collection = db.collection('users');

        const _result = await collection.replaceOne(
          { id: userData.id },
          { ...userData, updated_at: new Date() },
          { upsert: true }
        );

        results.push({ database: 'mongodb', success: true, id: userData.id });
      } catch (error) {
        console.error('MongoDB save user error:', error);
        results.push({ database: 'mongodb', success: false, error: error.message });
      }
    }



    // Always save to SQLite as backup
    if (this.sqlite) {
      const result = await this.sqlite.saveUser(userData);
      results.push({ database: 'sqlite', ...result });
    }

    return {
      success: results.some((r) => r.success),
      results,
      primary: results.find((r) => r.success && r.database !== 'sqlite')?.database || 'sqlite',
    };
  }

  /**
   * Save listening history
   */
  async saveListeningHistory(userId, tracks) {
    const results = [];

    // MongoDB
    if (this.mongodb) {
      try {
        const db = this.mongodb.db(process.env.MONGODB_DATABASE || 'spotify_analytics');
        const collection = db.collection('listening_history');

        const documents = tracks.map((track) => ({
          userId,
          trackId: track.id || track.track_id,
          trackName: track.name || track.track_name,
          artistName: track.artists?.[0]?.name || track.artist_name,
          albumName: track.album?.name || track.album_name,
          playedAt: new Date(track.played_at),
          durationMs: track.duration_ms,
          audioFeatures: track.audio_features || {},
          createdAt: new Date(),
        }));

        const result = await collection.insertMany(documents, { ordered: false });
        results.push({ database: 'mongodb', success: true, inserted: result.insertedCount });
      } catch (error) {
        console.error('MongoDB save listening history error:', error);
        results.push({ database: 'mongodb', success: false, error: error.message });
      }
    }

    // SQLite fallback
    if (this.sqlite) {
      const result = await this.sqlite.saveListeningHistory(userId, tracks);
      results.push({ database: 'sqlite', ...result });
    }

    return {
      success: results.some((r) => r.success),
      results,
    };
  }

  /**
   * Get recommendations
   */
  async getRecommendations(userId, options = {}) {
    const limit = options.limit || 20;

    // Try MongoDB first
    if (this.mongodb) {
      try {
        const db = this.mongodb.db(process.env.MONGODB_DATABASE || 'spotify_analytics');
        const collection = db.collection('recommendations');

        const recommendations = await collection
          .find({ userId })
          .sort({ score: -1, createdAt: -1 })
          .limit(limit)
          .toArray();

        return { success: true, recommendations, source: 'mongodb' };
      } catch (error) {
        console.error('MongoDB get recommendations error:', error);
      }
    }

    // Fallback to SQLite
    if (this.sqlite) {
      const result = await this.sqlite.getRecommendations(userId, limit);
      if (result.success) {
        return { ...result, source: 'sqlite' };
      }
    }

    // Fallback to Local File Database
    if (this.localFileDb) {
      try {
        // Get a random track from listening history as seed
        const history = await this.localFileDb.queryListeningHistory({}, { limit: 1 });
        if (history.data.length > 0) {
          const seedTrack = history.data[0].spotify_track_uri;
          const recommendations = await this.localFileDb.getRecommendations(seedTrack, limit);
          return { success: true, recommendations, source: 'local-files' };
        }
      } catch (error) {
        console.error('Local File Database get recommendations error:', error);
      }
    }

    return { success: false, error: 'No available database for recommendations' };
  }

  /**
   * Query listening history with local file database support
   */
  async queryListeningHistory(filters = {}, options = {}) {
    // Try MongoDB first
    if (this.mongodb) {
      try {
        const db = this.mongodb.db(process.env.MONGODB_DATABASE || 'spotify_analytics');
        const collection = db.collection('listening_history');
        
        const query = {};
        if (filters.userId) query.userId = filters.userId;
        if (filters.trackName) query.trackName = new RegExp(filters.trackName, 'i');
        if (filters.artistName) query.artistName = new RegExp(filters.artistName, 'i');
        
        const results = await collection
          .find(query)
          .limit(options.limit || 100)
          .skip(options.skip || 0)
          .toArray();
        
        return { success: true, data: results, source: 'mongodb' };
      } catch (error) {
        console.error('MongoDB query error:', error);
      }
    }

    // Fallback to SQLite
    if (this.sqlite) {
      try {
        const result = await this.sqlite.queryListeningHistory(filters, options);
        if (result.success) {
          return { ...result, source: 'sqlite' };
        }
      } catch (error) {
        console.error('SQLite query error:', error);
      }
    }

    // Fallback to Local File Database
    if (this.localFileDb) {
      try {
        const result = await this.localFileDb.queryListeningHistory(filters, options);
        return { success: true, ...result, source: 'local-files' };
      } catch (error) {
        console.error('Local File Database query error:', error);
      }
    }

    return { success: false, error: 'No available database' };
  }

  /**
   * Search tracks across all available databases
   */
  async searchTracks(query, limit = 20) {
    // Try MongoDB first
    if (this.mongodb) {
      try {
        const db = this.mongodb.db(process.env.MONGODB_DATABASE || 'spotify_analytics');
        const collection = db.collection('tracks');
        
        const results = await collection
          .find({
            $or: [
              { trackName: new RegExp(query, 'i') },
              { artistName: new RegExp(query, 'i') }
            ]
          })
          .limit(limit)
          .toArray();
        
        return { success: true, tracks: results, source: 'mongodb' };
      } catch (error) {
        console.error('MongoDB search error:', error);
      }
    }

    // Fallback to Local File Database
    if (this.localFileDb) {
      try {
        const results = await this.localFileDb.searchTracks(query, limit);
        return { success: true, tracks: results, source: 'local-files' };
      } catch (error) {
        console.error('Local File Database search error:', error);
      }
    }

    return { success: false, error: 'No available database' };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    // Try MongoDB first
    if (this.mongodb) {
      try {
        const db = this.mongodb.db(process.env.MONGODB_DATABASE || 'spotify_analytics');
        const stats = await db.stats();
        return { success: true, stats, source: 'mongodb' };
      } catch (error) {
        console.error('MongoDB stats error:', error);
      }
    }

    // Fallback to Local File Database
    if (this.localFileDb) {
      try {
        const stats = await this.localFileDb.getStats();
        return { success: true, stats, source: 'local-files' };
      } catch (error) {
        console.error('Local File Database stats error:', error);
      }
    }

    return { success: false, error: 'No available database' };
  }

  /**
   * Get analytics data
   */
  async getAnalytics(userId, options = {}) {
    // Try MongoDB first (better for analytics)
    if (this.mongodb) {
      try {
        const db = this.mongodb.db(process.env.MONGODB_DATABASE || 'spotify_analytics');

        // Aggregate listening data
        const pipeline = [
          { $match: { userId } },
          {
            $group: {
              _id: null,
              totalTracks: { $sum: 1 },
              uniqueArtists: { $addToSet: '$artistName' },
              avgDuration: { $avg: '$durationMs' },
            },
          },
          {
            $project: {
              totalTracks: 1,
              uniqueArtists: { $size: '$uniqueArtists' },
              avgDuration: 1,
            },
          },
        ];

        const analytics = await db.collection('listening_history').aggregate(pipeline).toArray();

        // Get top artists
        const topArtists = await db
          .collection('listening_history')
          .aggregate([
            { $match: { userId } },
            { $group: { _id: '$artistName', playCount: { $sum: 1 } } },
            { $sort: { playCount: -1 } },
            { $limit: 10 },
            { $project: { artist_name: '$_id', play_count: '$playCount' } },
          ])
          .toArray();

        return {
          success: true,
          analytics: {
            ...analytics[0],
            top_artists: topArtists,
          },
          source: 'mongodb',
        };
      } catch (error) {
        console.error('MongoDB get analytics error:', error);
      }
    }

    // Fallback to SQLite
    if (this.sqlite) {
      const result = await this.sqlite.getAnalytics(userId, options);
      if (result.success) {
        return { ...result, source: 'sqlite' };
      }
    }

    return { success: false, error: 'No available database for analytics' };
  }

  /**
   * Health check for all databases
   */
  async healthCheck() {
    const status = {
      mongodb: { connected: false, status: 'disconnected' },
      sqlite: { connected: false, status: 'disconnected' },
    };

    // Check MongoDB
    if (this.mongodb) {
      try {
        await this.mongodb.db().admin().ping();
        status.mongodb = { connected: true, status: 'healthy' };
      } catch (error) {
        status.mongodb = { connected: false, status: 'error', error: error.message };
      }
    }

    // Check SQLite
    if (this.sqlite) {
      const sqliteStatus = await this.sqlite.healthCheck();
      status.sqlite = sqliteStatus;
    }

    return {
      connections: status,
      active: this.activeDatabases,
      fallbackMode: this.fallbackMode,
      healthy: this.activeDatabases.length > 0,
    };
  }

  /**
   * Close all database connections
   */
  async close() {
    const promises = [];

    if (this.mongodb) {
      promises.push(this.mongodb.close());
    }

    if (this.sqlite) {
      this.sqlite.close();
    }

    if (this.localFileDb) {
      promises.push(this.localFileDb.close());
    }

    await Promise.all(promises);
    console.log('📦 All database connections closed');
  }

  /**
   * Get active database info
   */
  getActiveDatabase() {
    return {
      databases: this.activeDatabases,
      fallbackMode: this.fallbackMode,
      primary: this.activeDatabases.find((db) => db !== 'sqlite') || 'sqlite',
    };
  }

  /**
   * Get MongoDB database instance for health checks and direct access
   */
  getMongoDatabase(databaseName = null) {
    if (!this.mongodb) {
      console.warn('getMongoDatabase: MongoDB client not initialized');
      return null;
    }

    try {
      const dbName = databaseName || process.env.MONGODB_DATABASE || 'echotune';
      const db = this.mongodb.db(dbName);
      console.log('getMongoDatabase: Returning database instance for:', dbName);
      return db;
    } catch (error) {
      console.error('getMongoDatabase: Error getting database instance:', error.message);
      return null;
    }
  }

  /**
   * Test MongoDB connection
   */
  async testMongoConnection() {
    if (!this.mongodb) {
      throw new Error('MongoDB not initialized');
    }

    const db = this.getMongoDatabase();
    await db.admin().ping();
    return true;
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;
