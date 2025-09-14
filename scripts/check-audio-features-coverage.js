#!/usr/bin/env node

/**
 * Audio Features Coverage Analysis Script
 * Checks coverage of audio features in the database for recommendation quality
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

// Core audio features required for recommendations
const CORE_AUDIO_FEATURES = [
  'danceability', 'energy', 'valence', 'tempo',
  'acousticness', 'instrumentalness', 'liveness', 'speechiness'
];

/**
 * Connect to MongoDB
 */
async function connectToDatabase() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'echotune');
    console.log('✅ Connected to MongoDB');
    return { client, db };
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    throw error;
  }
}

/**
 * Get sample of tracks for analysis
 */
async function getSampleTracks(db, sampleSize) {
  try {
    // Try to get tracks from multiple collections
    const collections = ['tracks', 'listening_history', 'user_tracks'];
    let tracks = [];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          console.log(`📊 Found ${count} documents in ${collectionName}`);
          
          // Sample tracks from this collection
          const sampleFromCollection = await collection.aggregate([
            { $sample: { size: Math.min(sampleSize, count) } }
          ]).toArray();
          
          tracks = tracks.concat(sampleFromCollection);
          console.log(`🎵 Sampled ${sampleFromCollection.length} tracks from ${collectionName}`);
        }
      } catch (error) {
        console.log(`⚠️  Collection ${collectionName} not accessible: ${error.message}`);
      }
    }
    
    // Remove duplicates based on track_id or trackId
    const uniqueTracks = tracks.reduce((acc, track) => {
      const id = track.track_id || track.trackId || track.id || track._id;
      if (id && !acc.find(t => (t.track_id || t.trackId || t.id || t._id) === id)) {
        acc.push(track);
      }
      return acc;
    }, []);
    
    console.log(`🎯 Total unique tracks: ${uniqueTracks.length}`);
    return uniqueTracks.slice(0, sampleSize);
  } catch (error) {
    console.error('❌ Error sampling tracks:', error.message);
    return [];
  }
}

/**
 * Analyze audio features coverage
 */
function analyzeAudioFeaturesCoverage(tracks) {
  const analysis = {
    totalTracks: tracks.length,
    tracksWithAudioFeatures: 0,
    featureCoverage: {},
    missingFeatures: [],
    completelyMissingFeatures: 0
  };
  
  // Initialize feature coverage counters
  CORE_AUDIO_FEATURES.forEach(feature => {
    analysis.featureCoverage[feature] = 0;
  });
  
  tracks.forEach(track => {
    // Look for audio features in different possible locations
    const audioFeatures = track.audio_features || track.audioFeatures || track.features || {};
    
    let hasAnyFeatures = false;
    let missingFeaturesCount = 0;
    
    CORE_AUDIO_FEATURES.forEach(feature => {
      if (audioFeatures[feature] !== undefined && audioFeatures[feature] !== null) {
        analysis.featureCoverage[feature]++;
        hasAnyFeatures = true;
      } else {
        missingFeaturesCount++;
      }
    });
    
    if (hasAnyFeatures) {
      analysis.tracksWithAudioFeatures++;
    }
    
    if (missingFeaturesCount === CORE_AUDIO_FEATURES.length) {
      analysis.completelyMissingFeatures++;
    }
  });
  
  return analysis;
}

/**
 * Generate coverage report
 */
function generateCoverageReport(analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    sampleSize: analysis.totalTracks,
    tracksWithFeatures: analysis.tracksWithAudioFeatures,
    tracksWithoutFeatures: analysis.completelyMissingFeatures,
    overallCoveragePercent: analysis.totalTracks > 0 
      ? ((analysis.tracksWithAudioFeatures / analysis.totalTracks) * 100).toFixed(2)
      : 0,
    featureDetails: {}
  };
  
  // Calculate coverage percentage for each feature
  CORE_AUDIO_FEATURES.forEach(feature => {
    const coverage = analysis.totalTracks > 0 
      ? (analysis.featureCoverage[feature] / analysis.totalTracks) * 100
      : 0;
    
    report.featureDetails[feature] = {
      tracksWithFeature: analysis.featureCoverage[feature],
      coveragePercent: parseFloat(coverage.toFixed(2))
    };
  });
  
  return report;
}

/**
 * Create fallback audio features dataset
 */
async function createFallbackDataset(tracks) {
  const fallbackTracks = tracks
    .filter(track => {
      const audioFeatures = track.audio_features || track.audioFeatures || track.features || {};
      return CORE_AUDIO_FEATURES.some(feature => 
        audioFeatures[feature] !== undefined && audioFeatures[feature] !== null
      );
    })
    .slice(0, 10)
    .map(track => {
      const audioFeatures = track.audio_features || track.audioFeatures || track.features || {};
      
      // Create sanitized track with essential features
      const sanitized = {
        id: `fallback_${Math.random().toString(36).substr(2, 9)}`,
        name: "Sample Track",
        audio_features: {}
      };
      
      // Copy available audio features
      CORE_AUDIO_FEATURES.forEach(feature => {
        if (audioFeatures[feature] !== undefined && audioFeatures[feature] !== null) {
          sanitized.audio_features[feature] = audioFeatures[feature];
        }
      });
      
      // Add default values for missing features
      const defaults = {
        danceability: 0.5,
        energy: 0.5,
        valence: 0.5,
        tempo: 120,
        acousticness: 0.5,
        instrumentalness: 0.5,
        liveness: 0.5,
        speechiness: 0.5
      };
      
      CORE_AUDIO_FEATURES.forEach(feature => {
        if (sanitized.audio_features[feature] === undefined) {
          sanitized.audio_features[feature] = defaults[feature];
        }
      });
      
      return sanitized;
    });
  
  // Ensure we have at least 10 fallback tracks
  while (fallbackTracks.length < 10) {
    fallbackTracks.push({
      id: `fallback_default_${fallbackTracks.length}`,
      name: "Default Sample Track",
      audio_features: {
        danceability: 0.5 + (Math.random() - 0.5) * 0.3,
        energy: 0.5 + (Math.random() - 0.5) * 0.3,
        valence: 0.5 + (Math.random() - 0.5) * 0.3,
        tempo: 120 + (Math.random() - 0.5) * 40,
        acousticness: 0.3 + Math.random() * 0.4,
        instrumentalness: 0.1 + Math.random() * 0.3,
        liveness: 0.1 + Math.random() * 0.2,
        speechiness: 0.05 + Math.random() * 0.15
      }
    });
  }
  
  return fallbackTracks;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Starting Audio Features Coverage Analysis');
  console.log('=' .repeat(60));
  
  const sampleSize = parseInt(process.env.AUDIO_FEATURE_COVERAGE_SAMPLE) || 200;
  console.log(`📊 Sample size: ${sampleSize} tracks`);
  
  let client = null;
  
  try {
    // Connect to database
    const { client: dbClient, db } = await connectToDatabase();
    client = dbClient;
    
    // Get sample tracks
    console.log('\n🎵 Sampling tracks...');
    const tracks = await getSampleTracks(db, sampleSize);
    
    if (tracks.length === 0) {
      console.log('⚠️  No tracks found in database. Creating minimal fallback dataset.');
      
      // Create minimal fallback dataset
      const fallbackTracks = await createFallbackDataset([]);
      
      // Save fallback dataset
      const fallbackPath = path.join(process.cwd(), 'data', 'fallback', 'audio-features.sample.json');
      await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
      await fs.writeFile(fallbackPath, JSON.stringify(fallbackTracks, null, 2));
      console.log(`💾 Created fallback dataset: ${fallbackPath}`);
      
      // Create empty coverage report
      const report = {
        timestamp: new Date().toISOString(),
        sampleSize: 0,
        tracksWithFeatures: 0,
        tracksWithoutFeatures: 0,
        overallCoveragePercent: 0,
        featureDetails: {},
        warning: 'No tracks found in database'
      };
      
      CORE_AUDIO_FEATURES.forEach(feature => {
        report.featureDetails[feature] = {
          tracksWithFeature: 0,
          coveragePercent: 0
        };
      });
      
      // Save report
      const reportPath = path.join(process.cwd(), 'reports', 'audio-features', 'coverage.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Coverage report saved: ${reportPath}`);
      
      return;
    }
    
    // Analyze coverage
    console.log('\n🔍 Analyzing audio features coverage...');
    const analysis = analyzeAudioFeaturesCoverage(tracks);
    
    // Generate report
    const report = generateCoverageReport(analysis);
    
    // Display results
    console.log('\n📊 Coverage Analysis Results:');
    console.log('=' .repeat(60));
    console.log(`Sample Size: ${report.sampleSize}`);
    console.log(`Tracks with Features: ${report.tracksWithFeatures}`);
    console.log(`Overall Coverage: ${report.overallCoveragePercent}%`);
    
    console.log('\n🎯 Feature-by-Feature Coverage:');
    CORE_AUDIO_FEATURES.forEach(feature => {
      const details = report.featureDetails[feature];
      const status = details.coveragePercent >= 85 ? '✅' : details.coveragePercent >= 60 ? '⚠️' : '❌';
      console.log(`  ${status} ${feature.padEnd(20)}: ${details.coveragePercent}% (${details.tracksWithFeature}/${report.sampleSize})`);
    });
    
    // Save report
    const reportPath = path.join(process.cwd(), 'reports', 'audio-features', 'coverage.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Coverage report saved: ${reportPath}`);
    
    // Create fallback dataset
    console.log('\n🛡️  Creating fallback dataset...');
    const fallbackTracks = await createFallbackDataset(tracks);
    const fallbackPath = path.join(process.cwd(), 'data', 'fallback', 'audio-features.sample.json');
    await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
    await fs.writeFile(fallbackPath, JSON.stringify(fallbackTracks, null, 2));
    console.log(`💾 Fallback dataset saved: ${fallbackPath}`);
    
    // Coverage assessment
    const overallCoverage = parseFloat(report.overallCoveragePercent);
    if (overallCoverage < 85) {
      console.log('\n⚠️  WARNING: Audio features coverage is below 85%');
      console.log('📝 Recommendation: Run enrichment pipeline with fetch-missing-audio-features');
      console.log('   Command: node scripts/fetch-missing-audio-features.js');
    } else {
      console.log('\n✅ Audio features coverage is sufficient for recommendations');
    }
    
  } catch (error) {
    console.error('\n❌ Error during analysis:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
  
  console.log('\n🎉 Audio features coverage analysis complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, analyzeAudioFeaturesCoverage, generateCoverageReport };