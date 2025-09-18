#!/usr/bin/env node

/**
 * CI Auth Validation Script
 * Tests Spotify client credentials if available in CI environment
 * Fails gracefully if secrets are not available
 */

const { testClientCredentials } = require('./auth-helpers');

async function validateAuthInCI() {
  console.log('🔧 CI Auth Validation');
  console.log('');

  // Check if we're in CI environment
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  if (!isCI) {
    console.log('ℹ️ Not in CI environment - skipping validation');
    return;
  }

  // Check if Spotify credentials are available
  const hasCredentials = process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET;

  if (!hasCredentials) {
    console.log('⚠️ Spotify credentials not available in CI - skipping OAuth validation');
    console.log('This is expected if GitHub Secrets are not configured');
    return;
  }

  console.log('✅ Spotify credentials found in CI - testing...');

  try {
    await testClientCredentials();
    console.log('🎉 CI OAuth validation passed!');
  } catch (error) {
    console.error('❌ CI OAuth validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateAuthInCI().catch(error => {
    console.error('❌ CI validation error:', error.message);
    process.exit(1);
  });
}

module.exports = { validateAuthInCI };