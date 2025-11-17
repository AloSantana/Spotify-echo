/**
 * Database Service Layer
 * Unified high-level interface for database operations
 * Provides simple API for both backend and frontend integration
 * Automatic fallback handling (MongoDB → SQLite → Local File DB)
 */

const databaseManager = require('./database-manager');

class DatabaseService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    this.initialized = false;
  }

  /**
   * Initialize the database service
   */
  async initialize() {
    if (!this.initialized) {
      await databaseManager.initialize();
      this.initialized = true;
    }
    return this.initialized;
  }

  /**
   * Get database instance (MongoDB-compatible interface)
   * @param {string} dbName - Database name
   * @returns {Object} Database instance
   */
  getDatabase(dbName = 'echotune') {
    return databaseManager.getDatabase(dbName);
  }

  /**
   * Create a new document in a collection
   * @param {string} collection - Collection name
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Created document with _id
   */
  async create(collection, data) {
    try {
      const db = this.getDatabase();
      const result = await db.collection(collection).insertOne(data);
      
      // Invalidate cache for this collection
      this.invalidateCache(collection);
      
      return {
        success: true,
        _id: result.insertedId,
        ...data
      };
    } catch (error) {
      console.error(`Database create error (${collection}):`, error);
      throw new Error(`Failed to create document in ${collection}: ${error.message}`);
    }
  }

  /**
   * Create multiple documents in a collection
   * @param {string} collection - Collection name
   * @param {Array} documents - Array of documents
   * @returns {Promise<Object>} Result with inserted count
   */
  async createMany(collection, documents) {
    try {
      const db = this.getDatabase();
      const result = await db.collection(collection).insertMany(documents);
      
      this.invalidateCache(collection);
      
      return {
        success: true,
        insertedCount: result.insertedCount,
        insertedIds: result.insertedIds
      };
    } catch (error) {
      console.error(`Database createMany error (${collection}):`, error);
      throw new Error(`Failed to create documents in ${collection}: ${error.message}`);
    }
  }

  /**
   * Find documents in a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @param {Object} options - Query options (limit, sort, skip, projection)
   * @returns {Promise<Array>} Array of documents
   */
  async find(collection, query = {}, options = {}) {
    try {
      // Check cache
      const cacheKey = this.getCacheKey(collection, 'find', query, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const db = this.getDatabase();
      let cursor = db.collection(collection).find(query);
      
      // Apply options
      if (options.sort) cursor = cursor.sort(options.sort);
      if (options.skip) cursor = cursor.skip(options.skip);
      if (options.limit) cursor = cursor.limit(options.limit);
      
      const documents = await cursor.toArray();
      
      // Cache result
      this.setInCache(cacheKey, documents);
      
      return documents;
    } catch (error) {
      console.error(`Database find error (${collection}):`, error);
      throw new Error(`Failed to find documents in ${collection}: ${error.message}`);
    }
  }

  /**
   * Find a single document in a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Document or null
   */
  async findOne(collection, query = {}, options = {}) {
    try {
      const db = this.getDatabase();
      const document = await db.collection(collection).findOne(query, options);
      return document;
    } catch (error) {
      console.error(`Database findOne error (${collection}):`, error);
      throw new Error(`Failed to find document in ${collection}: ${error.message}`);
    }
  }

  /**
   * Update a document in a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @param {Object} update - Update operations
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async update(collection, query, update, options = {}) {
    try {
      const db = this.getDatabase();
      const result = await db.collection(collection).updateOne(query, update, options);
      
      this.invalidateCache(collection);
      
      return {
        success: true,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error(`Database update error (${collection}):`, error);
      throw new Error(`Failed to update document in ${collection}: ${error.message}`);
    }
  }

  /**
   * Update multiple documents in a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @param {Object} update - Update operations
   * @returns {Promise<Object>} Update result
   */
  async updateMany(collection, query, update) {
    try {
      const db = this.getDatabase();
      const result = await db.collection(collection).updateMany(query, update);
      
      this.invalidateCache(collection);
      
      return {
        success: true,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error(`Database updateMany error (${collection}):`, error);
      throw new Error(`Failed to update documents in ${collection}: ${error.message}`);
    }
  }

  /**
   * Delete a document from a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @returns {Promise<Object>} Delete result
   */
  async delete(collection, query) {
    try {
      const db = this.getDatabase();
      const result = await db.collection(collection).deleteOne(query);
      
      this.invalidateCache(collection);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error(`Database delete error (${collection}):`, error);
      throw new Error(`Failed to delete document from ${collection}: ${error.message}`);
    }
  }

  /**
   * Delete multiple documents from a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(collection, query) {
    try {
      const db = this.getDatabase();
      const result = await db.collection(collection).deleteMany(query);
      
      this.invalidateCache(collection);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error(`Database deleteMany error (${collection}):`, error);
      throw new Error(`Failed to delete documents from ${collection}: ${error.message}`);
    }
  }

  /**
   * Count documents in a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @returns {Promise<number>} Document count
   */
  async count(collection, query = {}) {
    try {
      const db = this.getDatabase();
      const count = await db.collection(collection).countDocuments(query);
      return count;
    } catch (error) {
      console.error(`Database count error (${collection}):`, error);
      throw new Error(`Failed to count documents in ${collection}: ${error.message}`);
    }
  }

  /**
   * Execute aggregation pipeline
   * @param {string} collection - Collection name
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregation results
   */
  async aggregate(collection, pipeline) {
    try {
      const db = this.getDatabase();
      const cursor = db.collection(collection).aggregate(pipeline);
      const results = await cursor.toArray();
      return results;
    } catch (error) {
      console.error(`Database aggregate error (${collection}):`, error);
      throw new Error(`Failed to aggregate in ${collection}: ${error.message}`);
    }
  }

  /**
   * Get personalized recommendations for a user
   * @param {string} userId - User ID
   * @param {Object} options - Recommendation options
   * @returns {Promise<Array>} Array of recommended tracks
   */
  async getRecommendations(userId, options = {}) {
    try {
      const db = this.getDatabase();
      
      // Try to use personalized recommendations if available
      if (db.getPersonalizedRecommendations) {
        return await db.getPersonalizedRecommendations(userId, options.limit || 20);
      }
      
      // Fallback to simple query
      const recommendations = await this.find('recommendations', {
        userId
      }, {
        sort: { score: -1, createdAt: -1 },
        limit: options.limit || 20
      });
      
      return recommendations;
    } catch (error) {
      console.error('Database getRecommendations error:', error);
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  /**
   * Search tracks by text query
   * @param {string} searchQuery - Search text
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching tracks
   */
  async searchTracks(searchQuery, options = {}) {
    try {
      const db = this.getDatabase();
      
      // Use searchTracks if available
      if (db.searchTracks) {
        return await db.searchTracks(searchQuery, options.limit || 20);
      }
      
      // Fallback to regex search
      const query = {
        $or: [
          { trackName: { $regex: searchQuery, $options: 'i' } },
          { artistName: { $regex: searchQuery, $options: 'i' } },
          { albumName: { $regex: searchQuery, $options: 'i' } }
        ]
      };
      
      if (options.filters) {
        Object.assign(query, options.filters);
      }
      
      return await this.find('tracks', query, {
        limit: options.limit || 20,
        sort: { popularity: -1 }
      });
    } catch (error) {
      console.error('Database searchTracks error:', error);
      throw new Error(`Failed to search tracks: ${error.message}`);
    }
  }

  /**
   * Get database status and health
   * @returns {Promise<Object>} Status information
   */
  async getStatus() {
    try {
      return await databaseManager.healthCheck();
    } catch (error) {
      console.error('Database getStatus error:', error);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get database info and statistics
   * @returns {Promise<Object>} Database information
   */
  async getInfo() {
    try {
      const db = this.getDatabase();
      const stats = {};
      
      // Get stats if available
      if (db.getStats) {
        Object.assign(stats, await db.getStats());
      }
      
      // Get active databases
      stats.activeDatabases = databaseManager.activeDatabases || [];
      stats.fallbackMode = databaseManager.fallbackMode || false;
      
      return stats;
    } catch (error) {
      console.error('Database getInfo error:', error);
      throw new Error(`Failed to get database info: ${error.message}`);
    }
  }

  /**
   * Get cache key for a query
   * @private
   */
  getCacheKey(collection, operation, query, options) {
    return `${collection}:${operation}:${JSON.stringify(query)}:${JSON.stringify(options)}`;
  }

  /**
   * Get data from cache
   * @private
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set data in cache
   * @private
   */
  setInCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for a collection
   * @private
   */
  invalidateCache(collection) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${collection}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
module.exports = new DatabaseService();
