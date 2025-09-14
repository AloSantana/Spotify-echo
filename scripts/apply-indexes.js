/**
 * Apply Database Indexes Script
 * 
 * Applies optimal database indexes for EchoTune AI MongoDB collections.
 * This script is idempotent and can be run multiple times safely.
 * 
 * Usage:
 *   node scripts/apply-indexes.js
 *   node scripts/apply-indexes.js --dry-run
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const { MongoClient } = require('mongodb');

// Index definitions
const INDEXES = [
  // Users collection
  {
    collection: 'users',
    indexes: [
      { keys: { spotifyId: 1 }, options: { unique: true, name: 'idx_users_spotify_id' } },
      { keys: { email: 1 }, options: { unique: true, name: 'idx_users_email' } },
      { keys: { lastLogin: 1 }, options: { name: 'idx_users_last_login' } },
      { keys: { createdAt: 1 }, options: { name: 'idx_users_created_at' } }
    ]
  },

  // Listening history collection
  {
    collection: 'listening_history',
    indexes: [
      { keys: { userId: 1, playedAt: -1 }, options: { name: 'idx_listening_user_time' } },
      { keys: { spotifyUserId: 1, playedAt: -1 }, options: { name: 'idx_listening_spotify_user_time' } },
      { keys: { trackId: 1 }, options: { name: 'idx_listening_track_id' } },
      { keys: { playedAt: -1 }, options: { name: 'idx_listening_played_at' } },
      { keys: { 'context.recommendationId': 1 }, options: { name: 'idx_listening_recommendation_id', sparse: true } },
      { keys: { 'context.sessionId': 1 }, options: { name: 'idx_listening_session_id', sparse: true } },
      { keys: { userId: 1, trackId: 1 }, options: { name: 'idx_listening_user_track' } }
    ]
  },

  // Recommendations collection
  {
    collection: 'recommendations',
    indexes: [
      { keys: { userId: 1, createdAt: -1 }, options: { name: 'idx_recommendations_user_time' } },
      { keys: { sessionId: 1 }, options: { name: 'idx_recommendations_session_id' } },
      { keys: { strategy: 1, createdAt: -1 }, options: { name: 'idx_recommendations_strategy_time' } },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'idx_recommendations_ttl' } },
      { keys: { userId: 1, strategy: 1 }, options: { name: 'idx_recommendations_user_strategy' } },
      { keys: { 'performance.confidence': -1 }, options: { name: 'idx_recommendations_confidence' } }
    ]
  },

  // User feedback collection
  {
    collection: 'user_feedback',
    indexes: [
      { keys: { userId: 1, createdAt: -1 }, options: { name: 'idx_feedback_user_time' } },
      { keys: { trackId: 1, signal: 1 }, options: { name: 'idx_feedback_track_signal' } },
      { keys: { userId: 1, trackId: 1 }, options: { name: 'idx_feedback_user_track' } },
      { keys: { 'context.recommendationId': 1 }, options: { name: 'idx_feedback_recommendation_id', sparse: true } },
      { keys: { signal: 1, createdAt: -1 }, options: { name: 'idx_feedback_signal_time' } }
    ]
  },

  // Tracks collection
  {
    collection: 'tracks',
    indexes: [
      { keys: { spotifyId: 1 }, options: { unique: true, name: 'idx_tracks_spotify_id' } },
      { keys: { 'artists.id': 1 }, options: { name: 'idx_tracks_artist_id' } },
      { keys: { 'album.id': 1 }, options: { name: 'idx_tracks_album_id' } },
      { keys: { popularity: -1 }, options: { name: 'idx_tracks_popularity' } },
      { keys: { lastUpdated: 1 }, options: { name: 'idx_tracks_last_updated' } },
      { keys: { 'audioFeatures.energy': 1 }, options: { name: 'idx_tracks_energy', sparse: true } },
      { keys: { 'audioFeatures.valence': 1 }, options: { name: 'idx_tracks_valence', sparse: true } },
      { keys: { 'audioFeatures.danceability': 1 }, options: { name: 'idx_tracks_danceability', sparse: true } }
    ]
  },

  // Chat sessions collection
  {
    collection: 'chat_sessions',
    indexes: [
      { keys: { userId: 1, startedAt: -1 }, options: { name: 'idx_chat_user_time' } },
      { keys: { sessionId: 1 }, options: { unique: true, name: 'idx_chat_session_id' } },
      { keys: { endedAt: 1 }, options: { expireAfterSeconds: 86400 * 30, name: 'idx_chat_ttl', sparse: true } }, // 30 days
      { keys: { 'recommendations': 1 }, options: { name: 'idx_chat_recommendations', sparse: true } }
    ]
  },

  // Analytics aggregation collection (for pre-computed analytics)
  {
    collection: 'analytics_daily',
    indexes: [
      { keys: { date: 1 }, options: { name: 'idx_analytics_date' } },
      { keys: { userId: 1, date: 1 }, options: { name: 'idx_analytics_user_date' } },
      { keys: { type: 1, date: 1 }, options: { name: 'idx_analytics_type_date' } }
    ]
  }
];

class IndexManager {
  constructor(connectionString, databaseName) {
    this.connectionString = connectionString || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.databaseName = databaseName || process.env.MONGODB_DB_NAME || 'echotune_ai';
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(this.connectionString, {
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      this.db = this.client.db(this.databaseName);
      
      console.log(`Connected to MongoDB: ${this.databaseName}`);
      return true;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  async applyIndexes(dryRun = false) {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    console.log(`${dryRun ? 'DRY RUN: ' : ''}Applying database indexes...`);
    
    const results = {
      created: [],
      exists: [],
      errors: []
    };

    for (const collectionDef of INDEXES) {
      const { collection, indexes } = collectionDef;
      
      console.log(`\n📁 Processing collection: ${collection}`);
      
      try {
        // Ensure collection exists
        const collections = await this.db.listCollections({ name: collection }).toArray();
        if (collections.length === 0) {
          if (!dryRun) {
            await this.db.createCollection(collection);
            console.log(`  ✅ Created collection: ${collection}`);
          } else {
            console.log(`  📝 Would create collection: ${collection}`);
          }
        }

        const coll = this.db.collection(collection);
        
        // Get existing indexes
        const existingIndexes = await coll.listIndexes().toArray();
        const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));

        for (const indexDef of indexes) {
          const { keys, options } = indexDef;
          const indexName = options.name || this._generateIndexName(keys);

          try {
            if (existingIndexNames.has(indexName)) {
              console.log(`  ⚡ Index already exists: ${indexName}`);
              results.exists.push({ collection, indexName, keys });
            } else {
              if (!dryRun) {
                await coll.createIndex(keys, options);
                console.log(`  ✅ Created index: ${indexName}`);
                results.created.push({ collection, indexName, keys });
              } else {
                console.log(`  📝 Would create index: ${indexName}`);
                results.created.push({ collection, indexName, keys });
              }
            }
          } catch (error) {
            console.error(`  ❌ Failed to create index ${indexName}:`, error.message);
            results.errors.push({ collection, indexName, error: error.message });
          }
        }
      } catch (error) {
        console.error(`❌ Error processing collection ${collection}:`, error.message);
        results.errors.push({ collection, error: error.message });
      }
    }

    return results;
  }

  async analyzeIndexUsage() {
    console.log('\n📊 Analyzing index usage...');
    
    const stats = {};
    
    for (const collectionDef of INDEXES) {
      const { collection } = collectionDef;
      
      try {
        const coll = this.db.collection(collection);
        const indexStats = await coll.aggregate([{ $indexStats: {} }]).toArray();
        
        stats[collection] = indexStats.map(stat => ({
          name: stat.name,
          usageCount: stat.accesses?.ops || 0,
          since: stat.accesses?.since
        }));
        
      } catch (error) {
        console.warn(`Could not get index stats for ${collection}:`, error.message);
      }
    }
    
    return stats;
  }

  async validateIndexes() {
    console.log('\n🔍 Validating index integrity...');
    
    const validationResults = {};
    
    for (const collectionDef of INDEXES) {
      const { collection } = collectionDef;
      
      try {
        const result = await this.db.collection(collection).validate({ full: false });
        validationResults[collection] = {
          valid: result.valid,
          errors: result.errors || [],
          warnings: result.warnings || []
        };
        
        if (result.valid) {
          console.log(`  ✅ ${collection}: Valid`);
        } else {
          console.log(`  ❌ ${collection}: Invalid`);
          console.log(`    Errors: ${result.errors?.length || 0}`);
        }
        
      } catch (error) {
        console.warn(`Could not validate ${collection}:`, error.message);
        validationResults[collection] = { valid: false, error: error.message };
      }
    }
    
    return validationResults;
  }

  _generateIndexName(keys) {
    return Object.entries(keys)
      .map(([field, direction]) => `${field}_${direction}`)
      .join('_');
  }

  async getCollectionStats() {
    console.log('\n📈 Collection Statistics:');
    
    const stats = {};
    
    for (const collectionDef of INDEXES) {
      const { collection } = collectionDef;
      
      try {
        const collStats = await this.db.collection(collection).stats();
        
        stats[collection] = {
          count: collStats.count,
          size: collStats.size,
          avgObjSize: collStats.avgObjSize,
          storageSize: collStats.storageSize,
          indexCount: collStats.nindexes,
          totalIndexSize: collStats.totalIndexSize
        };
        
        console.log(`  📄 ${collection}:`);
        console.log(`    Documents: ${collStats.count?.toLocaleString()}`);
        console.log(`    Size: ${this._formatBytes(collStats.size)}`);
        console.log(`    Indexes: ${collStats.nindexes} (${this._formatBytes(collStats.totalIndexSize)})`);
        
      } catch (error) {
        if (error.code !== 26) { // Collection doesn't exist
          console.warn(`Could not get stats for ${collection}:`, error.message);
        }
      }
    }
    
    return stats;
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const analyze = args.includes('--analyze');
  const validate = args.includes('--validate');
  const stats = args.includes('--stats');

  const manager = new IndexManager();

  try {
    const connected = await manager.connect();
    if (!connected) {
      process.exit(1);
    }

    if (stats) {
      await manager.getCollectionStats();
    }

    if (analyze) {
      const indexUsage = await manager.analyzeIndexUsage();
      console.log('\n📊 Index Usage Analysis:');
      console.log(JSON.stringify(indexUsage, null, 2));
    }

    if (validate) {
      await manager.validateIndexes();
    }

    if (!analyze && !validate && !stats) {
      // Default action: apply indexes
      const results = await manager.applyIndexes(dryRun);

      console.log('\n📋 Summary:');
      console.log(`  Created: ${results.created.length} indexes`);
      console.log(`  Already existed: ${results.exists.length} indexes`);
      console.log(`  Errors: ${results.errors.length} indexes`);

      if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach(error => {
          console.log(`  ${error.collection}.${error.indexName}: ${error.error}`);
        });
      }

      if (dryRun) {
        console.log('\n📝 This was a dry run. No indexes were actually created.');
      } else {
        console.log('\n✅ Index application complete!');
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

// Export for programmatic use
module.exports = { IndexManager, INDEXES };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}