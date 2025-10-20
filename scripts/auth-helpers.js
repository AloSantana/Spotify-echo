#!/usr/bin/env node

/**
 * Auth Helper Scripts for Local OAuth Testing
 * Provides utilities for manual OAuth validation
 */

const axios = require('axios');
const crypto = require('crypto');
const { URLSearchParams } = require('url');
require('dotenv').config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/auth/callback`;

// Generate PKCE challenge for testing
function generatePKCEChallenge() {
  const code_verifier = crypto.randomBytes(32).toString('base64url');
  const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
  return {
    code_verifier,
    code_challenge,
    code_challenge_method: 'S256'
  };
}

// Generate auth URL for manual testing
function generateAuthUrl() {
  if (!SPOTIFY_CLIENT_ID) {
    console.error('❌ SPOTIFY_CLIENT_ID not configured');
    process.exit(1);
  }

  const state = crypto.randomBytes(16).toString('hex');
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private', 
    'user-read-recently-played',
    'user-top-read',
    'user-library-read',
    'user-library-modify'
  ];

  const { code_challenge, code_challenge_method, code_verifier } = generatePKCEChallenge();

  const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes.join(' '),
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state,
    code_challenge: code_challenge,
    code_challenge_method: code_challenge_method
  }).toString();

  console.log('🔗 Spotify Authorization URL:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Copy the URL above');
  console.log('2. Open it in your browser');
  console.log('3. Log in to Spotify and grant permissions');
  console.log('4. Copy the authorization code from the callback URL');
  console.log('5. Use: npm run auth:exchange -- --code=<your-code>');
  console.log('');
  console.log(`🔑 Redirect URI: ${SPOTIFY_REDIRECT_URI}`);
  console.log('⚠️  IMPORTANT: This redirect URI must be added to your Spotify Developer Dashboard:');
  console.log('   1. Go to https://developer.spotify.com/dashboard');
  console.log('   2. Select your app');
  console.log('   3. Click "Edit Settings"');
  console.log(`   4. Add "${SPOTIFY_REDIRECT_URI}" to Redirect URIs`);
  console.log('   5. Click "Save"');
  console.log('');
  console.log(`🔑 State: ${state}`);
  console.log(`🔑 Code Challenge: ${code_challenge}`);
  console.log(`🔑 Code Verifier: ${code_verifier} (save this for exchange)`);
  
  return { authUrl, state, code_challenge, code_verifier };
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code, codeVerifier) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('❌ Spotify credentials not configured');
    process.exit(1);
  }

  if (!code) {
    console.error('❌ Authorization code required');
    console.log('Usage: npm run auth:exchange -- --code=<authorization-code>');
    process.exit(1);
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier || crypto.randomBytes(32).toString('base64url')
    });

    const authHeader = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    console.log('🔄 Exchanging authorization code for tokens...');
    
    const response = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });

    const tokens = response.data;

    console.log('✅ Token exchange successful!');
    console.log('');
    console.log('🔑 Tokens (masked for security):');
    console.log(`Access Token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`Refresh Token: ${tokens.refresh_token.substring(0, 20)}...`);
    console.log(`Expires In: ${tokens.expires_in} seconds`);
    console.log(`Token Type: ${tokens.token_type}`);
    console.log('');

    // Test the access token by getting user profile
    try {
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      console.log('👤 User Profile:');
      console.log(`ID: ${userResponse.data.id}`);
      console.log(`Display Name: ${userResponse.data.display_name}`);
      console.log(`Email: ${userResponse.data.email}`);
      console.log(`Country: ${userResponse.data.country}`);
      console.log(`Premium: ${userResponse.data.product === 'premium' ? 'Yes' : 'No'}`);
      console.log('');
      console.log('🎉 OAuth flow completed successfully!');

    } catch (profileError) {
      console.log('⚠️ Token exchange successful but profile fetch failed:');
      console.log(profileError.response?.data || profileError.message);
    }

    return tokens;

  } catch (error) {
    console.error('❌ Token exchange failed:');
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Test client credentials (app-only access)
async function testClientCredentials() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('❌ Spotify credentials not configured');
    process.exit(1);
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    const authHeader = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    console.log('🔄 Testing client credentials...');

    const response = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });

    const tokens = response.data;

    console.log('✅ Client credentials valid!');
    console.log(`Access Token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`Expires In: ${tokens.expires_in} seconds`);
    console.log(`Token Type: ${tokens.token_type}`);

    // Test a simple API call
    try {
      const searchResponse = await axios.get('https://api.spotify.com/v1/search?q=test&type=track&limit=1', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      console.log('🎵 API Test successful - found tracks:');
      if (searchResponse.data.tracks.items.length > 0) {
        const track = searchResponse.data.tracks.items[0];
        console.log(`  "${track.name}" by ${track.artists[0].name}`);
      }
      console.log('');
      console.log('🎉 Client credentials and API access working!');

    } catch (apiError) {
      console.log('⚠️ Credentials valid but API test failed:');
      console.log(apiError.response?.data || apiError.message);
    }

    return tokens;

  } catch (error) {
    console.error('❌ Client credentials test failed:');
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'url':
      generateAuthUrl();
      break;
      
    case 'exchange':
      const codeArg = args.find(arg => arg.startsWith('--code='));
      const code = codeArg ? codeArg.split('=')[1] : null;
      const verifierArg = args.find(arg => arg.startsWith('--verifier='));
      const verifier = verifierArg ? verifierArg.split('=')[1] : null;
      exchangeCodeForTokens(code, verifier);
      break;
      
    case 'test-credentials':
      testClientCredentials();
      break;
      
    default:
      console.log('🔧 Auth Helper Scripts');
      console.log('');
      console.log('Available commands:');
      console.log('  url                     - Generate authorization URL for manual testing');
      console.log('  exchange --code=<code>  - Exchange authorization code for tokens');
      console.log('  test-credentials        - Test client credentials (app-only access)');
      console.log('');
      console.log('Examples:');
      console.log('  npm run auth:url');
      console.log('  npm run auth:exchange -- --code=AQDj8s...');
      console.log('  npm run auth:test-credentials');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateAuthUrl,
  exchangeCodeForTokens,
  testClientCredentials,
  generatePKCEChallenge
};