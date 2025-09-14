#!/usr/bin/env node

/**
 * Collaborative Matrix Builder
 * 
 * Builds co-occurrence matrices from user listening history for collaborative filtering.
 * Outputs processed matrices to data/derived/cooccurrence.json for real recommendations.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { MongoClient } = require('mongodb');

class CollaborativeMatrixBuilder {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.outputPath = path.join(__dirname, '..', 'data', 'derived', 'cooccurrence.json');
    this.minInteractions = 5; // Minimum interactions per user
    this.minCooccurrence = 3; // Minimum co-occurrence frequency
  }

  async build() {
    console.log('🔄 Starting collaborative matrix building process...');
    
    try {
      // Connect to database
      const client = new MongoClient(this.mongoUri);
      await client.connect();
      console.log('✅ Connected to MongoDB');

      const db = client.db();
      
      // Extract user listening data
      const userInteractions = await this.extractUserInteractions(db);
      console.log(`📊 Extracted interactions for ${userInteractions.size} users`);

      // Build co-occurrence matrix
      const cooccurrenceMatrix = this.buildCooccurrenceMatrix(userInteractions);
      console.log(`🔗 Built co-occurrence matrix with ${cooccurrenceMatrix.size} tracks`);

      // Calculate similarity scores
      const similarityMatrix = this.calculateSimilarityScores(cooccurrenceMatrix);
      console.log(`📈 Calculated similarity scores`);

      // Save to file
      await this.saveMatrix(similarityMatrix, cooccurrenceMatrix);
      console.log(`💾 Saved matrices to ${this.outputPath}`);

      await client.close();
      console.log('✅ Collaborative matrix building completed successfully');

    } catch (error) {
      console.error('❌ Error building collaborative matrix:', error);
      process.exit(1);
    }
  }

  async extractUserInteractions(db) {
    console.log('📥 Extracting user interactions from database...');
    
    const userInteractions = new Map();
    
    // Get user interactions from the last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const interactions = await db.collection('user_interactions')
      .aggregate([
        {
          $match: {
            timestamp: { $gte: cutoffDate },
            signal: { $in: ['play', 'like', 'save', 'replay'] } // Positive signals only
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              trackId: '$trackId'
            },
            weight: { $sum: '$weight' },
            lastInteraction: { $max: '$timestamp' }
          }
        },
        {
          $match: {
            weight: { $gte: 1.0 } // Filter out weak interactions
          }
        }
      ])
      .toArray();

    // Group by user
    for (const interaction of interactions) {
      const userId = interaction._id.userId;
      const trackId = interaction._id.trackId;
      
      if (!userInteractions.has(userId)) {
        userInteractions.set(userId, new Set());
      }
      
      userInteractions.get(userId).add(trackId);
    }

    // Filter users with insufficient interactions
    for (const [userId, tracks] of userInteractions) {
      if (tracks.size < this.minInteractions) {
        userInteractions.delete(userId);
      }
    }

    return userInteractions;
  }

  buildCooccurrenceMatrix(userInteractions) {
    console.log('🔗 Building co-occurrence matrix...');
    
    const cooccurrenceMatrix = new Map();
    
    // For each user, increment co-occurrence for all track pairs
    for (const [userId, tracks] of userInteractions) {
      const trackArray = Array.from(tracks);
      
      for (let i = 0; i < trackArray.length; i++) {
        for (let j = i + 1; j < trackArray.length; j++) {
          const trackA = trackArray[i];
          const trackB = trackArray[j];
          
          // Ensure consistent ordering
          const [first, second] = trackA < trackB ? [trackA, trackB] : [trackB, trackA];
          const pairKey = `${first}|||${second}`;
          
          if (!cooccurrenceMatrix.has(pairKey)) {
            cooccurrenceMatrix.set(pairKey, {
              trackA: first,
              trackB: second,
              cooccurrence: 0,
              users: new Set()
            });
          }
          
          const pair = cooccurrenceMatrix.get(pairKey);
          pair.cooccurrence++;
          pair.users.add(userId);
        }
      }
    }

    // Filter out low co-occurrence pairs
    for (const [pairKey, pair] of cooccurrenceMatrix) {
      if (pair.cooccurrence < this.minCooccurrence) {
        cooccurrenceMatrix.delete(pairKey);
      }
    }

    return cooccurrenceMatrix;
  }

  calculateSimilarityScores(cooccurrenceMatrix) {
    console.log('📈 Calculating similarity scores...');
    
    // Track frequency for normalization
    const trackFrequency = new Map();
    
    // Count track frequencies
    for (const pair of cooccurrenceMatrix.values()) {
      trackFrequency.set(pair.trackA, (trackFrequency.get(pair.trackA) || 0) + pair.cooccurrence);
      trackFrequency.set(pair.trackB, (trackFrequency.get(pair.trackB) || 0) + pair.cooccurrence);
    }

    // Calculate similarity scores using Jaccard similarity and PMI
    const similarityMatrix = new Map();
    
    for (const [pairKey, pair] of cooccurrenceMatrix) {
      const freqA = trackFrequency.get(pair.trackA);
      const freqB = trackFrequency.get(pair.trackB);
      
      // Jaccard similarity: intersection / union
      const jaccard = pair.cooccurrence / (freqA + freqB - pair.cooccurrence);
      
      // Pointwise Mutual Information (PMI)
      const totalPairs = cooccurrenceMatrix.size;
      const pmi = Math.log2((pair.cooccurrence * totalPairs) / (freqA * freqB));
      
      // Combined similarity score
      const similarity = 0.7 * jaccard + 0.3 * Math.max(0, pmi / 10); // Normalize PMI
      
      similarityMatrix.set(pairKey, {
        trackA: pair.trackA,
        trackB: pair.trackB,
        similarity: Math.min(1.0, Math.max(0.0, similarity)),
        cooccurrence: pair.cooccurrence,
        jaccard: jaccard,
        pmi: pmi,
        support: pair.users.size
      });
    }

    return similarityMatrix;
  }

  async saveMatrix(similarityMatrix, cooccurrenceMatrix) {
    console.log('💾 Saving matrices to file...');
    
    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Prepare data for JSON serialization
    const data = {
      metadata: {
        createdAt: new Date().toISOString(),
        totalPairs: similarityMatrix.size,
        totalCooccurrences: cooccurrenceMatrix.size,
        minInteractions: this.minInteractions,
        minCooccurrence: this.minCooccurrence,
        version: '1.0.0'
      },
      similarity: {},
      trackIndex: {}
    };

    // Convert similarity matrix to object format
    const tracks = new Set();
    for (const [pairKey, similarity] of similarityMatrix) {
      data.similarity[pairKey] = similarity;
      tracks.add(similarity.trackA);
      tracks.add(similarity.trackB);
    }

    // Create track index for efficient lookups
    const trackArray = Array.from(tracks).sort();
    trackArray.forEach((trackId, index) => {
      data.trackIndex[trackId] = index;
    });

    // Calculate statistics
    const similarities = Array.from(similarityMatrix.values()).map(s => s.similarity);
    data.metadata.statistics = {
      uniqueTracks: tracks.size,
      avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
      minSimilarity: Math.min(...similarities),
      maxSimilarity: Math.max(...similarities),
      medianSimilarity: similarities.sort()[Math.floor(similarities.length / 2)]
    };

    // Write to file
    await fs.writeFile(this.outputPath, JSON.stringify(data, null, 2));
    
    // Create summary report
    const summaryPath = this.outputPath.replace('.json', '_summary.md');
    const summary = this.generateSummaryReport(data);
    await fs.writeFile(summaryPath, summary);
    
    console.log(`📊 Summary report saved to ${summaryPath}`);
  }

  generateSummaryReport(data) {
    const { metadata } = data;
    const { statistics } = metadata;
    
    return `# Collaborative Matrix Build Report

## Build Information
- **Created**: ${metadata.createdAt}
- **Version**: ${metadata.version}
- **Total Track Pairs**: ${metadata.totalPairs.toLocaleString()}
- **Unique Tracks**: ${statistics.uniqueTracks.toLocaleString()}

## Configuration
- **Minimum Interactions per User**: ${metadata.minInteractions}
- **Minimum Co-occurrence Frequency**: ${metadata.minCooccurrence}

## Similarity Statistics
- **Average Similarity**: ${statistics.avgSimilarity.toFixed(4)}
- **Minimum Similarity**: ${statistics.minSimilarity.toFixed(4)}
- **Maximum Similarity**: ${statistics.maxSimilarity.toFixed(4)}
- **Median Similarity**: ${statistics.medianSimilarity.toFixed(4)}

## Usage
The generated co-occurrence matrix can be used by the collaborative filtering strategy to provide real, data-driven recommendations based on user listening patterns.

## Next Steps
1. Load this matrix in the CollaborativeStrategy initialization
2. Use similarity scores for track recommendations
3. Monitor recommendation quality and adjust parameters as needed
`;
  }

  // Helper method to query similar tracks
  static async getSimilarTracks(trackId, cooccurrenceData, limit = 10) {
    const similarities = [];
    
    for (const [pairKey, similarity] of Object.entries(cooccurrenceData.similarity)) {
      if (similarity.trackA === trackId) {
        similarities.push({
          trackId: similarity.trackB,
          similarity: similarity.similarity,
          support: similarity.support
        });
      } else if (similarity.trackB === trackId) {
        similarities.push({
          trackId: similarity.trackA,
          similarity: similarity.similarity,
          support: similarity.support
        });
      }
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

// CLI execution
if (require.main === module) {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is required');
    process.exit(1);
  }

  const builder = new CollaborativeMatrixBuilder();
  builder.build().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });
}

module.exports = CollaborativeMatrixBuilder;