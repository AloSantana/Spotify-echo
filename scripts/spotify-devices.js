#!/usr/bin/env node

/**
 * Spotify Devices Listing Script
 * Lists available Spotify devices for development and testing
 */

// Load environment variables
require('dotenv').config();

async function listDevices() {
  try {
    console.log('🎵 Spotify Devices List');
    console.log('========================\n');

    // Check if we're in a dev environment with tokens available
    if (!process.env.SPOTIFY_CLIENT_ID) {
      console.log('❌ Error: SPOTIFY_CLIENT_ID not found in environment');
      console.log('💡 Please set up your .env file with Spotify credentials');
      process.exit(1);
    }

    console.log('📋 Instructions:');
    console.log('1. Start the server: npm start');
    console.log('2. Log in via Spotify OAuth at: http://localhost:3000/auth/spotify');
    console.log('3. Once logged in, call: GET /api/spotify/devices');
    console.log('4. Or use the frontend UI to see available devices');
    console.log('\n💡 Required Spotify scopes:');
    console.log('   - user-read-playback-state');
    console.log('   - user-modify-playback-state');
    console.log('   - streaming (if using Web Playback SDK)');
    
    console.log('\n🎯 Expected device response format:');
    console.log('```json');
    console.log('{');
    console.log('  "success": true,');
    console.log('  "devices": [');
    console.log('    {');
    console.log('      "id": "device-id-here",');
    console.log('      "name": "Device Name",');
    console.log('      "type": "Computer|Smartphone|Speaker",');
    console.log('      "is_active": true,');
    console.log('      "is_private_session": false,');
    console.log('      "is_restricted": false,');
    console.log('      "volume_percent": 50');
    console.log('    }');
    console.log('  ]');
    console.log('}');
    console.log('```');
    
    console.log('\n🔧 API Testing Examples:');
    console.log('# List devices');
    console.log('curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:3000/api/spotify/devices');
    
    console.log('\n# Control playback');
    console.log('curl -X PUT -H "Content-Type: application/json" \\');
    console.log('     -d \'{"device_id":"YOUR_DEVICE_ID"}\' \\');
    console.log('     http://localhost:3000/api/spotify/playback/play');
    
    console.log('\n# Skip to next track');
    console.log('curl -X POST -H "Content-Type: application/json" \\');
    console.log('     -d \'{"device_id":"YOUR_DEVICE_ID"}\' \\');
    console.log('     http://localhost:3000/api/spotify/next');

  } catch (error) {
    console.error('❌ Error listing devices:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  listDevices();
}

module.exports = { listDevices };