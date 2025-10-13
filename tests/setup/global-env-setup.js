/**
 * Global Setup for Playwright Tests
 * Validates environment variables and sets up test context
 */

module.exports = async function globalSetup(config) {
  console.log('🔧 Setting up Playwright test environment...');
  
  // Validate required environment variables
  const requiredEnvVars = ['BASE_URL'];
  const optionalEnvVars = [
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET', 
    'SPOTIFY_REDIRECT_URI',
    'PORT',
    'NODE_ENV'
  ];
  
  const missingRequired = requiredEnvVars.filter(key => !process.env[key]);
  if (missingRequired.length > 0) {
    console.warn(`⚠️ Missing required env vars: ${missingRequired.join(', ')}`);
    process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  }
  
  const missingOptional = optionalEnvVars.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.log(`ℹ️ Missing optional env vars: ${missingOptional.join(', ')}`);
    console.log('   Tests requiring these will be skipped');
  }
  
  // Log configuration (mask secrets)
  console.log('\n📋 Test Environment Configuration:');
  console.log(`   BASE_URL: ${process.env.BASE_URL}`);
  console.log(`   PORT: ${process.env.PORT || '3000'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CI: ${process.env.CI || 'false'}`);
  
  // Check Spotify credentials availability (masked)
  if (process.env.SPOTIFY_CLIENT_ID) {
    console.log(`   SPOTIFY_CLIENT_ID: ${process.env.SPOTIFY_CLIENT_ID.substring(0, 8)}...`);
  } else {
    console.log('   SPOTIFY_CLIENT_ID: NOT SET (OAuth tests will be skipped)');
  }
  
  if (process.env.SPOTIFY_CLIENT_SECRET) {
    console.log(`   SPOTIFY_CLIENT_SECRET: ${process.env.SPOTIFY_CLIENT_SECRET.substring(0, 4)}****`);
  } else {
    console.log('   SPOTIFY_CLIENT_SECRET: NOT SET (OAuth tests will be skipped)');
  }
  
  if (process.env.SPOTIFY_REDIRECT_URI) {
    console.log(`   SPOTIFY_REDIRECT_URI: ${process.env.SPOTIFY_REDIRECT_URI}`);
  } else {
    console.log('   SPOTIFY_REDIRECT_URI: NOT SET (using default)');
  }
  
  console.log('\n✅ Playwright environment setup complete\n');
  
  // Store environment state for tests
  global.__PLAYWRIGHT_ENV__ = {
    hasSpotifyCredentials: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    isCI: !!process.env.CI
  };
};
