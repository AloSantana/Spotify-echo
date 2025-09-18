const express = require('express');
const crypto = require('crypto');
const { URLSearchParams } = require('url');
const { getConfigService } = require('../config/ConfigurationService');
const { generatePKCEChallenge, generateNonce } = require('../utils/auth-helpers');
const { getRedisManager } = require('../utils/redis');

const router = express.Router();

// Get configuration
const config = getConfigService().load();

// Environment-aware redirect URI fallback
const getDefaultRedirectUri = () => {
  if (process.env.NODE_ENV === 'production') {
    return `https://${process.env.DOMAIN || 'primosphere.studio'}/auth/callback`;
  }
  return `http://localhost:${config.server.port}/auth/callback`;
};

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || getDefaultRedirectUri();

/**
 * Spotify authentication initiation
 * Redirects user to Spotify authorization page with PKCE
 */
router.get('/spotify', async (req, res) => {
  try {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return res.status(500).json({
        error: 'Spotify credentials not configured',
        message: 'Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables',
      });
    }

    const state = generateNonce();
    const pkce = generatePKCEChallenge();
    const scope = [
      'user-read-private',
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-recently-played',
      'user-top-read',
      'user-library-read',
      'user-library-modify'
    ].join(' ');

    // Store PKCE challenge and state in Redis/session store  
    const redisManager = getRedisManager();
    const authData = {
      code_verifier: pkce.code_verifier,
      state,
      timestamp: Date.now(),
      ip: req.ip,
    };

    try {
      await redisManager.set(`oauth:${state}`, authData, 600); // 10 minute expiry
    } catch (redisError) {
      console.warn('Redis not available, using memory fallback for OAuth state');
      // Fallback to memory storage if Redis is not available
      if (!global.authStates) {
        global.authStates = new Map();
      }
      global.authStates.set(state, authData);
      
      // Clean up old states (older than 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      for (const [key, value] of global.authStates.entries()) {
        if (value.timestamp < tenMinutesAgo) {
          global.authStates.delete(key);
        }
      }
    }

    const authURL =
      'https://accounts.spotify.com/authorize?' +
      new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        state: state,
        code_challenge: pkce.code_challenge,
        code_challenge_method: pkce.code_challenge_method,
      }).toString();

    res.redirect(authURL);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({
      error: 'OAuth initiation failed',
      message: 'Failed to start authentication process',
      details: error.message
    });
  }
});

/**
 * Spotify OAuth callback handler
 * Redirects to the canonical Spotify API callback handler
 */
router.get('/callback', (req, res) => {
  // Redirect to the canonical Spotify API callback handler to avoid code duplication
  const queryString = req.url.indexOf('?') !== -1 ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`/api/spotify/auth/callback${queryString}`);
});

/**
 * GET /auth/health
 * Auth health endpoint - validates configuration without leaking secrets
 */
router.get('/health', (req, res) => {
  try {
    const status = {
      ok: true,
      clientConfigured: !!SPOTIFY_CLIENT_ID && !!SPOTIFY_CLIENT_SECRET,
      redirectUri: SPOTIFY_REDIRECT_URI || 'not configured',
      scopes: [
        'user-read-private',
        'user-read-email', 
        'playlist-modify-public',
        'playlist-modify-private',
        'user-read-recently-played',
        'user-top-read'
      ],
      checks: {
        spotifyClientId: !!SPOTIFY_CLIENT_ID,
        spotifyClientSecret: !!SPOTIFY_CLIENT_SECRET,
        redirectUri: !!SPOTIFY_REDIRECT_URI
      },
      warnings: [],
      errors: []
    };

    // Check for configuration issues
    if (!status.checks.spotifyClientId) {
      status.errors.push('SPOTIFY_CLIENT_ID not configured');
    }
    if (!status.checks.spotifyClientSecret) {
      status.errors.push('SPOTIFY_CLIENT_SECRET not configured'); 
    }
    if (!status.checks.redirectUri) {
      status.warnings.push('SPOTIFY_REDIRECT_URI not configured - using default');
    }

    // Overall health
    status.ok = status.errors.length === 0;
    const statusCode = status.ok ? 200 : 503;
    
    res.status(statusCode).json(status);
  } catch (error) {
    console.error('Auth health check error:', error);
    res.status(500).json({
      ok: false,
      clientConfigured: false,
      redirectUri: 'error',
      error: 'Health check failed'
    });
  }
});

module.exports = router;