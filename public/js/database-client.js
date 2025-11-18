/**
 * Database Client Library for Frontend
 * Provides seamless MongoDB-compatible database access from browser
 * Automatically handles authentication, caching, and real-time updates
 */

class DatabaseClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api/database';
    this.cacheEnabled = options.cache !== false;
    this.realtimeEnabled = options.realtime !== false;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 60000; // 1 minute
    this.listeners = new Map();
    this.initialized = false;
    this.socket = null;
  }

  /**
   * Initialize the database client
   */
  async init() {
    if (this.initialized) return true;

    try {
      // Check database status
      const status = await this.getStatus();
      console.log('Database client initialized:', status);

      // Initialize real-time connection if enabled
      if (this.realtimeEnabled && typeof io !== 'undefined') {
        this.initRealtime();
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize database client:', error);
      throw error;
    }
  }

  /**
   * Initialize real-time WebSocket connection
   * @private
   */
  initRealtime() {
    try {
      this.socket = io();
      
      this.socket.on('database:update', (data) => {
        console.log('Database update received:', data);
        
        // Invalidate cache for updated collection
        if (data.collection) {
          this.invalidateCache(data.collection);
        }
        
        // Notify listeners
        this.emit(`${data.collection}.updated`, data);
      });

      console.log('Real-time database connection established');
    } catch (error) {
      console.warn('Failed to initialize real-time connection:', error);
    }
  }

  /**
   * Get database status
   * @returns {Promise<Object>} Status information
   */
  async getStatus() {
    return await this.request('GET', '/status');
  }

  /**
   * Get database info and statistics
   * @returns {Promise<Object>} Database information
   */
  async getInfo() {
    return await this.request('GET', '/info');
  }

  /**
   * Query a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of documents
   */
  async query(collection, query = {}, options = {}) {
    // Check cache
    const cacheKey = this.getCacheKey(collection, 'query', query, options);
    if (this.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Make API request
    const result = await this.request('POST', `/collections/${collection}/find`, {
      query,
      options
    });

    // Cache result
    if (this.cacheEnabled) {
      this.setInCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Find a single document
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @returns {Promise<Object|null>} Document or null
   */
  async findOne(collection, query = {}) {
    const results = await this.query(collection, query, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Count documents in a collection
   * @param {string} collection - Collection name
   * @param {Object} query - MongoDB query object
   * @returns {Promise<number>} Document count
   */
  async count(collection, query = {}) {
    const result = await this.request('POST', '/query', {
      collection,
      operation: 'count',
      query
    });
    return result.count;
  }

  /**
   * Execute aggregation pipeline
   * @param {string} collection - Collection name
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregation results
   */
  async aggregate(collection, pipeline) {
    return await this.request('POST', `/collections/${collection}/aggregate`, {
      pipeline
    });
  }

  /**
   * Get personalized recommendations
   * @param {Object} options - Recommendation options
   * @returns {Promise<Array>} Array of recommended tracks
   */
  async getRecommendations(options = {}) {
    return await this.request('POST', '/recommendations', options);
  }

  /**
   * Search tracks by text query
   * @param {string} searchQuery - Search text
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching tracks
   */
  async searchTracks(searchQuery, options = {}) {
    return await this.request('POST', '/search/tracks', {
      query: searchQuery,
      ...options
    });
  }

  /**
   * Get collection list with metadata
   * @returns {Promise<Array>} Array of collection info
   */
  async getCollections() {
    return await this.request('GET', '/collections');
  }

  /**
   * Get paginated collection data
   * @param {string} collection - Collection name
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async getCollectionData(collection, options = {}) {
    const params = new URLSearchParams(options);
    return await this.request('GET', `/collections/${collection}?${params}`);
  }

  /**
   * Query builder for fluent interface
   * @param {string} collection - Collection name
   * @returns {QueryBuilder} Query builder instance
   */
  queryBuilder(collection) {
    return new QueryBuilder(this, collection);
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Emit event to listeners
   * @private
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Make HTTP request to API
   * @private
   */
  async request(method, path, body = null) {
    const url = `${this.baseURL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error(`Database client request error (${method} ${path}):`, error);
      throw error;
    }
  }

  /**
   * Get cache key
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

/**
 * Query Builder for fluent interface
 */
class QueryBuilder {
  constructor(client, collection) {
    this.client = client;
    this.collection = collection;
    this.query = {};
    this.options = {};
  }

  /**
   * Add where condition
   * @param {string} field - Field name
   * @returns {FieldBuilder} Field builder
   */
  where(field) {
    return new FieldBuilder(this, field);
  }

  /**
   * Set sort order
   * @param {Object} sort - Sort object
   * @returns {QueryBuilder} this
   */
  sort(sort) {
    this.options.sort = sort;
    return this;
  }

  /**
   * Set limit
   * @param {number} limit - Maximum documents
   * @returns {QueryBuilder} this
   */
  limit(limit) {
    this.options.limit = limit;
    return this;
  }

  /**
   * Set skip
   * @param {number} skip - Number of documents to skip
   * @returns {QueryBuilder} this
   */
  skip(skip) {
    this.options.skip = skip;
    return this;
  }

  /**
   * Execute query
   * @returns {Promise<Array>} Query results
   */
  async execute() {
    return await this.client.query(this.collection, this.query, this.options);
  }
}

/**
 * Field Builder for query conditions
 */
class FieldBuilder {
  constructor(queryBuilder, field) {
    this.queryBuilder = queryBuilder;
    this.field = field;
  }

  /**
   * Equal to
   */
  equals(value) {
    this.queryBuilder.query[this.field] = value;
    return this.queryBuilder;
  }

  /**
   * Greater than
   */
  gt(value) {
    this.queryBuilder.query[this.field] = { $gt: value };
    return this.queryBuilder;
  }

  /**
   * Greater than or equal
   */
  gte(value) {
    this.queryBuilder.query[this.field] = { $gte: value };
    return this.queryBuilder;
  }

  /**
   * Less than
   */
  lt(value) {
    this.queryBuilder.query[this.field] = { $lt: value };
    return this.queryBuilder;
  }

  /**
   * Less than or equal
   */
  lte(value) {
    this.queryBuilder.query[this.field] = { $lte: value };
    return this.queryBuilder;
  }

  /**
   * In array
   */
  in(values) {
    this.queryBuilder.query[this.field] = { $in: values };
    return this.queryBuilder;
  }

  /**
   * Not in array
   */
  nin(values) {
    this.queryBuilder.query[this.field] = { $nin: values };
    return this.queryBuilder;
  }

  /**
   * Regex match
   */
  regex(pattern, options = 'i') {
    this.queryBuilder.query[this.field] = { $regex: pattern, $options: options };
    return this.queryBuilder;
  }

  /**
   * Exists
   */
  exists(value = true) {
    this.queryBuilder.query[this.field] = { $exists: value };
    return this.queryBuilder;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DatabaseClient;
}
