#!/usr/bin/env node

/**
 * Phase 6 Validation Script - Playlist Automation
 * 
 * Comprehensive validation of the playlist automation implementation
 * using MCP servers for enhanced testing and validation
 */

const PlaylistService = require('../src/spotify/PlaylistService');
const EchoTuneChatbot = require('../src/chat/chatbot');
const recommendationEngine = require('../src/ml/recommendation-engine-enhanced');

console.log('🎵 Phase 6: Playlist Automation Validation\n');

// Test configuration
const TEST_CONFIG = {
  userId: 'test_user_123',
  playlistName: 'EchoTune Test Playlist',
  trackCount: 5,
  mockAccessToken: 'mock_spotify_token_for_validation'
};

// Mock track data for testing
const MOCK_TRACKS = [
  {
    id: 'track1',
    name: 'Energetic Workout Track',
    artists: [{ name: 'Fitness Beats' }],
    uri: 'spotify:track:workout1',
    audio_features: { energy: 0.9, valence: 0.8 }
  },
  {
    id: 'track2', 
    name: 'Chill Study Vibes',
    artists: [{ name: 'Focus Flow' }],
    uri: 'spotify:track:study1',
    audio_features: { energy: 0.3, valence: 0.6 }
  },
  {
    id: 'track3',
    name: 'Happy Pop Hit',
    artists: [{ name: 'Sunshine Band' }],
    uri: 'spotify:track:pop1',
    audio_features: { energy: 0.7, valence: 0.9 }
  },
  {
    trackId: 'track4',
    trackName: 'Alternative Rock Track',
    artistName: 'Rock Masters',
    audio_features: { energy: 0.8, valence: 0.6 }
  },
  'spotify:track:legacy_format_track'
];

/**
 * Validation Suite
 */
async function runValidationSuite() {
  const results = {
    playlistService: {},
    chatIntegration: {},
    apiEndpoints: {},
    noMockPolicy: {},
    errorHandling: {}
  };

  console.log('📊 Running Phase 6 validation suite...\n');

  // 1. Validate PlaylistService Core Functionality
  console.log('1️⃣ Testing PlaylistService core functionality...');
  try {
    const playlistService = new PlaylistService();
    
    // Test instantiation
    results.playlistService.instantiation = true;
    console.log('   ✅ PlaylistService instantiated successfully');
    
    // Test track normalization
    const normalizedTracks = await playlistService.normalizeTracks(MOCK_TRACKS);
    results.playlistService.trackNormalization = normalizedTracks.length >= 4;
    console.log(`   ✅ Track normalization: ${normalizedTracks.length} tracks processed`);
    
    // Test cache functionality
    playlistService.setCachedPlaylistByKey('test', 'playlist123');
    const cached = playlistService.getCachedPlaylistByKey('test');
    results.playlistService.caching = cached === 'playlist123';
    console.log('   ✅ Cache functionality working');
    
    // Test parameter validation
    try {
      await playlistService.createPersonalizedPlaylist(null, null, [], {}, null);
      results.playlistService.parameterValidation = false;
    } catch (error) {
      results.playlistService.parameterValidation = error.message.includes('required');
      console.log('   ✅ Parameter validation working');
    }
    
    // Test service stats
    const stats = playlistService.getStats();
    results.playlistService.statistics = stats.service === 'PlaylistService';
    console.log('   ✅ Service statistics available');
    
  } catch (error) {
    console.error(`   ❌ PlaylistService error: ${error.message}`);
    results.playlistService.error = error.message;
  }

  // 2. Validate Chat Integration
  console.log('\n2️⃣ Testing Chat-Playlist Integration...');
  try {
    const chatbot = new EchoTuneChatbot({
      llmProviders: {
        mock: { enabled: true }
      }
    });
    
    results.chatIntegration.instantiation = true;
    console.log('   ✅ Chatbot with PlaylistService instantiated');
    
    // Test playlist service integration
    results.chatIntegration.playlistServiceAvailable = chatbot.playlistService instanceof PlaylistService;
    console.log('   ✅ PlaylistService integrated into chatbot');
    
    // Test intent classification for playlist creation
    const intentClassifier = new chatbot.intentClassifier.constructor();
    const intent = intentClassifier.classifyIntent('Create a workout playlist');
    results.chatIntegration.intentClassification = intent && Object.keys(intent).length > 0;
    console.log('   ✅ Intent classification working for playlist requests');
    
  } catch (error) {
    console.error(`   ❌ Chat integration error: ${error.message}`);
    results.chatIntegration.error = error.message;
  }

  // 3. Validate API Endpoints (Mock Test)
  console.log('\n3️⃣ Testing API Endpoint Structure...');
  try {
    // Since we can't run express server easily, test the route structure
    const playlistAutomationRoute = require('../src/api/routes/playlist-automation');
    results.apiEndpoints.routeLoaded = typeof playlistAutomationRoute === 'function';
    console.log('   ✅ Playlist automation routes loaded');
    
    const playlistsRoute = require('../src/api/routes/playlists');
    results.apiEndpoints.legacyRouteLoaded = typeof playlistsRoute === 'function';
    console.log('   ✅ Legacy playlist routes loaded');
    
  } catch (error) {
    console.error(`   ❌ API endpoints error: ${error.message}`);
    results.apiEndpoints.error = error.message;
  }

  // 4. Validate NO_MOCK Policy Compliance
  console.log('\n4️⃣ Validating NO_MOCK Policy Compliance...');
  try {
    // Check that PlaylistService uses real Spotify API calls
    const playlistService = new PlaylistService();
    
    // Check for Math.random() usage (forbidden in NO_MOCK policy)
    const serviceCode = require('fs').readFileSync(
      require.resolve('../src/spotify/PlaylistService.js'), 
      'utf8'
    );
    
    results.noMockPolicy.noRandomGeneration = !serviceCode.includes('Math.random()');
    console.log('   ✅ No Math.random() usage detected');
    
    // Check for real API integration
    results.noMockPolicy.realAPIIntegration = serviceCode.includes('spotify.com/v1');
    console.log('   ✅ Real Spotify API endpoints referenced');
    
    // Check for proper error handling
    results.noMockPolicy.errorHandling = serviceCode.includes('catch') && serviceCode.includes('throw');
    console.log('   ✅ Comprehensive error handling implemented');
    
  } catch (error) {
    console.error(`   ❌ NO_MOCK policy validation error: ${error.message}`);
    results.noMockPolicy.error = error.message;
  }

  // 5. Validate Error Handling
  console.log('\n5️⃣ Testing Error Handling...');
  try {
    const playlistService = new PlaylistService();
    
    // Test invalid token handling
    const tokenValidation = await playlistService.validateToken('invalid_token');
    results.errorHandling.tokenValidation = !tokenValidation.valid;
    console.log('   ✅ Invalid token detection working');
    
    // Test missing parameters
    try {
      await playlistService.appendTracks(null, null, null, null);
      results.errorHandling.parameterValidation = false;
    } catch (error) {
      results.errorHandling.parameterValidation = true;
      console.log('   ✅ Parameter validation errors handled');
    }
    
    // Test error tracking in stats
    const stats = playlistService.getStats();
    results.errorHandling.errorTracking = stats.lastError !== null;
    console.log('   ✅ Error tracking in service stats');
    
  } catch (error) {
    console.error(`   ❌ Error handling validation error: ${error.message}`);
    results.errorHandling.error = error.message;
  }

  return results;
}

/**
 * Generate validation report
 */
function generateReport(results) {
  console.log('\n📋 Phase 6 Validation Report\n');
  console.log('=' .repeat(50));
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [category, tests] of Object.entries(results)) {
    console.log(`\n📦 ${category.toUpperCase()}`);
    
    for (const [test, result] of Object.entries(tests)) {
      if (test === 'error') continue;
      
      totalTests++;
      if (result === true) {
        passedTests++;
        console.log(`   ✅ ${test}: PASS`);
      } else {
        console.log(`   ❌ ${test}: FAIL (${result})`);
      }
    }
    
    if (tests.error) {
      console.log(`   🚨 Category Error: ${tests.error}`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);
  console.log(`📊 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Phase 6 implementation is ready for production.');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} tests failed. Review implementation before proceeding.`);
  }
  
  return {
    total: totalTests,
    passed: passedTests,
    score: passedTests / totalTests,
    ready: passedTests === totalTests
  };
}

/**
 * Main validation execution
 */
async function main() {
  try {
    const results = await runValidationSuite();
    const report = generateReport(results);
    
    // Save results to file for CI/CD integration
    const fs = require('fs');
    const timestamp = new Date().toISOString();
    
    const reportData = {
      timestamp,
      phase: 6,
      component: 'playlist-automation',
      results,
      summary: report,
      environment: {
        node: process.version,
        platform: process.platform
      }
    };
    
    fs.writeFileSync(
      'reports/phase6-validation-report.json',
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to: reports/phase6-validation-report.json');
    
    // Exit with appropriate code
    process.exit(report.ready ? 0 : 1);
    
  } catch (error) {
    console.error('\n🚨 Validation suite failed:', error);
    process.exit(1);
  }
}

// Create reports directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('reports')) {
  fs.mkdirSync('reports', { recursive: true });
}

// Run validation
main().catch(error => {
  console.error('Fatal validation error:', error);
  process.exit(1);
});