#!/usr/bin/env node

/**
 * Track Embedding Ingestion Script
 * Generates and stores embeddings for tracks that don't have them
 */

const MongoDBManager = require('../src/database/mongodb-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class EmbeddingIngestionService {
  constructor() {
    this.mongoManager = new MongoDBManager();
    this.db = null;
    this.tracksCollection = null;
    this.embeddingsCollection = null;
    
    // Initialize embedding models
    this.geminiClient = null;
    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    
    this.batchSize = 50;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async initialize() {
    try {
      // Connect to MongoDB
      if (!this.mongoManager._isConnected) {
        await this.mongoManager.connect();
      }
      
      this.db = this.mongoManager.db;
      if (!this.db) {
        throw new Error('MongoDB connection not available');
      }

      this.tracksCollection = this.db.collection('tracks');
      this.embeddingsCollection = this.db.collection('track_embeddings');
      
      // Create indexes
      await this.createIndexes();
      
      console.log('✅ EmbeddingIngestionService initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize EmbeddingIngestionService:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      // Indexes for track embeddings
      await this.embeddingsCollection.createIndex({ trackId: 1 }, { unique: true });
      await this.embeddingsCollection.createIndex({ model: 1 });
      await this.embeddingsCollection.createIndex({ createdAt: -1 });
      
      console.log('✅ Embedding indexes created');
    } catch (error) {
      console.warn('⚠️ Failed to create embedding indexes:', error.message);
    }
  }

  /**
   * Get tracks that need embeddings
   */
  async getTracksNeedingEmbeddings(limit = this.batchSize) {
    try {
      // Find tracks without embeddings
      const tracksWithoutEmbeddings = await this.tracksCollection.aggregate([
        {
          $lookup: {
            from: 'track_embeddings',
            localField: 'id',
            foreignField: 'trackId',
            as: 'embeddings'
          }
        },
        {
          $match: {
            embeddings: { $size: 0 },
            name: { $exists: true, $ne: null },
            artists: { $exists: true, $ne: [] }
          }
        },
        {
          $limit: limit
        },
        {
          $project: {
            id: 1,
            name: 1,
            artists: 1,
            album: 1,
            genres: 1,
            audio_features: 1,
            description: 1
          }
        }
      ]).toArray();

      return tracksWithoutEmbeddings;
    } catch (error) {
      console.error('Error getting tracks needing embeddings:', error);
      return [];
    }
  }

  /**
   * Generate text representation for embedding
   */
  generateTrackText(track) {
    const parts = [];
    
    // Track name and artists
    parts.push(`Song: ${track.name}`);
    
    if (track.artists && track.artists.length > 0) {
      const artistNames = track.artists.map(a => a.name || a).join(', ');
      parts.push(`Artist: ${artistNames}`);
    }
    
    // Album information
    if (track.album?.name) {
      parts.push(`Album: ${track.album.name}`);
    }
    
    // Genres
    if (track.genres && track.genres.length > 0) {
      parts.push(`Genres: ${track.genres.join(', ')}`);
    }
    
    // Audio features description
    if (track.audio_features) {
      const features = track.audio_features;
      const descriptions = [];
      
      if (typeof features.energy === 'number') {
        const energyLevel = features.energy > 0.7 ? 'high energy' : 
                           features.energy > 0.4 ? 'moderate energy' : 'low energy';
        descriptions.push(energyLevel);
      }
      
      if (typeof features.valence === 'number') {
        const moodLevel = features.valence > 0.7 ? 'happy and upbeat' :
                         features.valence > 0.4 ? 'neutral mood' : 'sad and melancholic';
        descriptions.push(moodLevel);
      }
      
      if (typeof features.danceability === 'number') {
        const danceLevel = features.danceability > 0.7 ? 'very danceable' :
                          features.danceability > 0.4 ? 'somewhat danceable' : 'not danceable';
        descriptions.push(danceLevel);
      }
      
      if (typeof features.acousticness === 'number') {
        const acousticLevel = features.acousticness > 0.7 ? 'acoustic' :
                             features.acousticness > 0.3 ? 'semi-acoustic' : 'electronic';
        descriptions.push(acousticLevel);
      }
      
      if (descriptions.length > 0) {
        parts.push(`Style: ${descriptions.join(', ')}`);
      }
    }
    
    // Existing description if available
    if (track.description) {
      parts.push(`Description: ${track.description}`);
    }
    
    return parts.join('. ');
  }

  /**
   * Generate embedding using Gemini
   */
  async generateGeminiEmbedding(text) {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    try {
      const model = this.geminiClient.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Gemini embedding error:', error);
      throw error;
    }
  }

  /**
   * Generate embedding with retry logic
   */
  async generateEmbeddingWithRetry(text, model = 'gemini') {
    let lastError;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (model === 'gemini' && this.geminiClient) {
          return await this.generateGeminiEmbedding(text);
        } else {
          throw new Error(`Unsupported embedding model: ${model}`);
        }
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.warn(`Embedding attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Store embedding in database
   */
  async storeEmbedding(trackId, embedding, model, text) {
    try {
      const embeddingDoc = {
        trackId,
        model,
        embedding: Array.isArray(embedding) ? embedding : [],
        text,
        dimensions: Array.isArray(embedding) ? embedding.length : 0,
        createdAt: new Date(),
        version: '1.0'
      };

      await this.embeddingsCollection.replaceOne(
        { trackId, model },
        embeddingDoc,
        { upsert: true }
      );

      return true;
    } catch (error) {
      console.error(`Error storing embedding for track ${trackId}:`, error);
      return false;
    }
  }

  /**
   * Process a batch of tracks
   */
  async processBatch(tracks) {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    console.log(`📦 Processing batch of ${tracks.length} tracks...`);

    for (const track of tracks) {
      try {
        results.processed++;
        
        // Generate text representation
        const text = this.generateTrackText(track);
        
        if (!text || text.length < 10) {
          throw new Error('Insufficient track data for embedding');
        }

        // Generate embedding
        const embedding = await this.generateEmbeddingWithRetry(text, 'gemini');
        
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Invalid embedding generated');
        }

        // Store embedding
        const stored = await this.storeEmbedding(track.id, embedding, 'gemini', text);
        
        if (stored) {
          results.successful++;
          console.log(`✅ Processed ${track.name} by ${track.artists?.[0]?.name || 'Unknown'}`);
        } else {
          throw new Error('Failed to store embedding');
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          trackId: track.id,
          trackName: track.name,
          error: error.message
        });
        console.error(`❌ Failed to process ${track.name}:`, error.message);
      }

      // Small delay between tracks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Run embedding ingestion for all tracks needing embeddings
   */
  async ingestEmbeddings(options = {}) {
    const { maxTracks = 1000, dryRun = false } = options;
    
    console.log('🚀 Starting embedding ingestion...');
    console.log(`   Max tracks: ${maxTracks}`);
    console.log(`   Dry run: ${dryRun}`);
    console.log(`   Batch size: ${this.batchSize}`);

    if (!this.geminiClient) {
      console.warn('⚠️ No embedding models available. Please set GEMINI_API_KEY.');
      return;
    }

    await this.initialize();

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors = [];

    try {
      while (totalProcessed < maxTracks) {
        const remaining = maxTracks - totalProcessed;
        const batchLimit = Math.min(this.batchSize, remaining);
        
        // Get tracks needing embeddings
        const tracks = await this.getTracksNeedingEmbeddings(batchLimit);
        
        if (tracks.length === 0) {
          console.log('✅ No more tracks needing embeddings');
          break;
        }

        console.log(`\n📊 Batch ${Math.floor(totalProcessed / this.batchSize) + 1}: ${tracks.length} tracks`);

        if (dryRun) {
          console.log('🔍 Dry run - would process:');
          tracks.forEach(track => {
            console.log(`   - ${track.name} by ${track.artists?.[0]?.name || 'Unknown'}`);
          });
          totalProcessed += tracks.length;
          continue;
        }

        // Process batch
        const batchResults = await this.processBatch(tracks);
        
        totalProcessed += batchResults.processed;
        totalSuccessful += batchResults.successful;
        totalFailed += batchResults.failed;
        allErrors.push(...batchResults.errors);

        console.log(`📈 Batch results: ${batchResults.successful}/${batchResults.processed} successful`);

        // Progress update
        const elapsed = Date.now() - startTime;
        const rate = totalProcessed / (elapsed / 1000);
        console.log(`⏱️  Progress: ${totalProcessed}/${maxTracks} tracks (${rate.toFixed(1)} tracks/sec)`);
      }

    } catch (error) {
      console.error('❌ Embedding ingestion failed:', error);
      throw error;
    }

    // Final summary
    const totalTime = Date.now() - startTime;
    console.log('\n📊 Embedding Ingestion Complete');
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Successful: ${totalSuccessful}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Success rate: ${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%`);
    console.log(`   Total time: ${(totalTime / 1000).toFixed(1)} seconds`);

    if (allErrors.length > 0) {
      console.log(`\n❌ Errors (${allErrors.length}):`);
      allErrors.slice(0, 10).forEach(error => {
        console.log(`   - ${error.trackName}: ${error.error}`);
      });
      if (allErrors.length > 10) {
        console.log(`   ... and ${allErrors.length - 10} more`);
      }
    }

    return {
      totalProcessed,
      totalSuccessful,
      totalFailed,
      successRate: (totalSuccessful / totalProcessed) * 100,
      totalTime,
      errors: allErrors
    };
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats() {
    try {
      await this.initialize();

      const stats = await this.embeddingsCollection.aggregate([
        {
          $group: {
            _id: null,
            totalEmbeddings: { $sum: 1 },
            modelStats: { $push: '$model' },
            avgDimensions: { $avg: '$dimensions' },
            createdRange: {
              $push: '$createdAt'
            }
          }
        },
        {
          $project: {
            totalEmbeddings: 1,
            avgDimensions: 1,
            geminiEmbeddings: {
              $size: {
                $filter: {
                  input: '$modelStats',
                  cond: { $eq: ['$$this', 'gemini'] }
                }
              }
            },
            oldestEmbedding: { $min: '$createdRange' },
            newestEmbedding: { $max: '$createdRange' }
          }
        }
      ]).toArray();

      const totalTracks = await this.tracksCollection.countDocuments();
      const result = stats[0] || { totalEmbeddings: 0, avgDimensions: 0 };

      return {
        ...result,
        totalTracks,
        coveragePercentage: totalTracks > 0 ? (result.totalEmbeddings / totalTracks * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error getting embedding stats:', error);
      return { error: error.message };
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    maxTracks: 1000,
    dryRun: false,
    stats: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--max-tracks':
        options.maxTracks = parseInt(args[++i]) || 1000;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--help':
        console.log(`
🎵 Track Embedding Ingestion Script

Usage: node scripts/embed-tracks.js [options]

Options:
  --max-tracks <number>  Maximum number of tracks to process (default: 1000)
  --dry-run             Show what would be processed without actually processing
  --stats              Show current embedding statistics
  --help               Show this help message

Environment Variables:
  GEMINI_API_KEY       Google Gemini API key for generating embeddings
  MONGODB_URI          MongoDB connection string

Examples:
  node scripts/embed-tracks.js --max-tracks 100
  node scripts/embed-tracks.js --dry-run
  node scripts/embed-tracks.js --stats
        `);
        process.exit(0);
        break;
    }
  }

  const service = new EmbeddingIngestionService();

  try {
    if (options.stats) {
      console.log('📊 Getting embedding statistics...');
      const stats = await service.getEmbeddingStats();
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    await service.ingestEmbeddings(options);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = EmbeddingIngestionService;