#!/usr/bin/env node

/**
 * Spotify Devices Listing Script
 * Lists available Spotify devices for development and testing
 */

// Simple environment loading without external dependencies
const fs = require('fs');
const path = require('path');

// Load .env file if it exists
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#')) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });
    }
  } catch (error) {
    // Ignore errors if .env doesn't exist
  }
}

loadEnv();

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

    console.log('🔍 Attempting to list devices via API...\n');
    
    try {
      // Try to call the devices API
      const response = await fetch('http://localhost:3000/api/spotify/devices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.log('🔐 Authentication required.');
        console.log('Please log in with Spotify first:\n');
        console.log('1. Start the server: npm start');
        console.log('2. Open: http://localhost:3000/auth/spotify');
        console.log('3. Complete OAuth flow');
        console.log('4. Run this script again\n');
        process.exit(0);
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.devices) {
          console.log('✅ Found devices:\n');
          data.devices.forEach((device, index) => {
            console.log(`${index + 1}. ${device.name} (${device.type})`);
            console.log(`   ID: ${device.id}`);
            console.log(`   Active: ${device.is_active ? '✓' : '✗'}`);
            console.log(`   Volume: ${device.volume_percent}%\n`);
          });

          if (data.devices.length === 0) {
            console.log('⚠️  No devices found.');
            console.log('💡 To add devices:');
            console.log('   - Open Spotify on your phone, computer, or web player');
            console.log('   - Start playing a song');
            console.log('   - Run this script again\n');
          }
        } else {
          console.log('⚠️  API returned unexpected format:', data);
        }
      } else {
        const errorData = await response.text();
        console.log(`❌ API error (${response.status}): ${errorData}\n`);
      }

    } catch (networkError) {
      console.log('❌ Network error - is the server running?');
      console.log('💡 Start the server with: npm start\n');
      console.log('📋 Manual setup instructions:');
      console.log('1. Start the server: npm start');
      console.log('2. Log in via Spotify OAuth at: http://localhost:3000/auth/spotify');
      console.log('3. Once logged in, call: GET /api/spotify/devices');
      console.log('4. Or use the frontend UI to see available devices');
    }
    
    console.log('\n💡 Required Spotify scopes:');
    console.log('   - user-read-playback-state');
    console.log('   - user-modify-playback-state');
    console.log('   - streaming (if using Web Playback SDK)');
    
    console.log('\n🔧 API Testing Examples:');
    console.log('# List devices');
    console.log('curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/spotify/devices');
    
    console.log('\n# Control playback');
    console.log('curl -X POST -H "Content-Type: application/json" \\');
    console.log('     -d \'{"device_id":"YOUR_DEVICE_ID"}\' \\');
    console.log('     http://localhost:3000/api/spotify/play');
    
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