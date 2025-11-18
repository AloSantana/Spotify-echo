const express = require('express');
const axios = require('axios');
const SpotifyAudioFeaturesService = require('../../spotify/audio-features');
const { requireAuth, createRateLimit, authRateLimit } = require('../middleware');
const {
  generatePKCEChallenge,
  generateNonce,
  createJWT,
  createRefreshToken,
  verifyRefreshToken,
  sanitizeUserData,
  getSecureCookieOptions,
} = require('../../utils/auth-helpers');
const { getRedisManager } = require('../../utils/redis');

const router = express.Router();
const spotifyService = new SpotifyAudioFeaturesService();

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Use SPOTIFY_REDIRECT_URI directly - no fallback computation
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

if (!SPOTIFY_REDIRECT_URI) {
  console.error('[SPOTIFY] SPOTIFY_REDIRECT_URI not configured - OAuth will fail');
}

// Rate limiting for Spotify endpoints
const spotifyRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for data processing
  message: 'Too many Spotify API requests, please slow down',
});

// Helper function to make Spotify API calls
async function makeSpotifyRequest(endpoint, accessToken, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.spotify.com/v1${endpoint}`;

  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      data: options.data,
      params: options.params,
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
    }

    if (error.response?.status === 401) {
      throw new Error('Spotify authentication expired');
    }

    throw new Error(`Spotify API error: ${error.response?.status || 'Unknown'} ${error.message}`);
  }
}

/**
 * Initiate Spotify OAuth 2.0 PKCE flow
 * GET /api/spotify/auth/login
 */
router.get('/auth/login', authRateLimit, async (req, res) => {
  try {
    if (!SPOTIFY_CLIENT_ID) {
      return res.status(500).json({
        error: 'Spotify not configured',
        message: 'SPOTIFY_CLIENT_ID not set',
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
      'user-read-playback-state',
      'user-modify-playback-state',
    ].join(' ');

    // Store PKCE challenge and state in Redis/session store
    const redisManager = getRedisManager();
    const authData = {
      code_verifier: pkce.code_verifier,
      state,
      timestamp: Date.now(),
      ip: req.ip,
    };

    await redisManager.set(`oauth:${state}`, authData, 600); // 10 minute expiry

    const authURL =
      'https://accounts.spotify.com/authorize?' +
      new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        state,
        code_challenge: pkce.code_challenge,
        code_challenge_method: pkce.code_challenge_method,
      }).toString();

    res.json({
      success: true,
      authUrl: authURL,
      state,
      expiresAt: Date.now() + 600000, // 10 minutes
    });
  } catch (error) {
    console.error('OAuth login error:', error);
    res.status(500).json({
      error: 'Authentication setup failed',
      message: error.message,
    });
  }
});

/**
 * Handle Spotify OAuth callback
 * GET /api/spotify/auth/callback
 */
router.get('/auth/callback', authRateLimit, async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error('Spotify OAuth error:', oauthError);
      return res.status(400).json({
        error: 'OAuth failed',
        message: oauthError,
        code: 'SPOTIFY_OAUTH_ERROR',
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Authorization code and state are required',
      });
    }

    // Verify state and get stored PKCE data
    const redisManager = getRedisManager();
    let authData = null;
    
    try {
      authData = await redisManager.get(`oauth:${state}`);
    } catch (redisError) {
      console.warn('Redis not available for state verification, checking memory fallback');
    }
    
    // Check memory fallback if Redis data not found
    if (!authData && global.authStates) {
      authData = global.authStates.get(state);
      if (authData) {
        // Check if state hasn't expired (10 minutes)
        if (Date.now() - authData.timestamp > 10 * 60 * 1000) {
          global.authStates.delete(state);
          authData = null;
        }
      }
    }

    if (!authData) {
      console.error('OAuth callback failed: Invalid or expired state parameter');
      return res.status(400).json({
        error: 'Invalid state',
        message: 'State parameter is invalid or expired. Please try logging in again.',
        code: 'INVALID_OAUTH_STATE'
      });
    }

    // Clean up used state from both stores
    try {
      await redisManager.del(`oauth:${state}`);
    } catch (redisError) {
      // Ignore Redis errors during cleanup
    }
    if (global.authStates) {
      global.authStates.delete(state);
    }

    // Exchange code for tokens
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          client_id: SPOTIFY_CLIENT_ID,
          code_verifier: authData.code_verifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          },
        }
      );
    } catch (tokenError) {
      console.error('Spotify token exchange failed:', tokenError.response?.data || tokenError.message);
      return res.status(400).json({
        error: 'Token exchange failed',
        message: 'Failed to exchange authorization code for access token',
        details: tokenError.response?.data?.error_description || 'Invalid authorization code or client credentials',
        code: 'SPOTIFY_TOKEN_EXCHANGE_FAILED'
      });
    }

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    if (!access_token || !refresh_token) {
      console.error('Spotify token response missing required tokens:', tokenResponse.data);
      return res.status(500).json({
        error: 'Invalid token response',
        message: 'Spotify did not return required tokens',
        code: 'INCOMPLETE_TOKEN_RESPONSE'
      });
    }

    // Get user profile
    let userResponse;
    try {
      userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
    } catch (profileError) {
      console.error('Failed to fetch user profile:', profileError.response?.data || profileError.message);
      return res.status(500).json({
        error: 'Profile fetch failed',
        message: 'Failed to retrieve user profile from Spotify',
        details: profileError.response?.data?.error?.message || 'Invalid access token',
        code: 'SPOTIFY_PROFILE_FETCH_FAILED'
      });
    }

    const spotifyUser = userResponse.data;
    const userData = sanitizeUserData(spotifyUser);

    // Create JWT tokens
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication service not properly configured',
        code: 'JWT_SECRET_MISSING'
      });
    }

    const accessTokenJWT = createJWT(userData, jwtSecret, { expiresIn: '1h' });
    const refreshTokenJWT = createRefreshToken(userData, jwtSecret);

    // Store session data
    const sessionData = {
      user: userData,
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token,
      spotify_expires_at: Date.now() + expires_in * 1000,
      created_at: new Date().toISOString(),
    };

    try {
      await redisManager.setSession(userData.id, sessionData, 7 * 24 * 60 * 60); // 7 days
      // Cache user data for quick access
      await redisManager.cacheSpotifyUser(userData.id, userData, 3600); // 1 hour
    } catch (sessionError) {
      console.warn('Failed to store session in Redis, authentication will still work but session may not persist:', sessionError.message);
    }

    // Set secure cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getSecureCookieOptions(isProduction);

    res.cookie('access_token', accessTokenJWT, cookieOptions);
    res.cookie('refresh_token', refreshTokenJWT, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
    });

    // Redirect to chat page (chat-first design) instead of returning JSON
    // The React app will pick up the authentication from cookies
    res.redirect('/chat?auth=success');
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    
    // Provide specific error message based on error type
    let errorMessage = 'Failed to complete Spotify authentication';
    let errorCode = 'OAUTH_CALLBACK_ERROR';
    
    if (error.response?.status === 400) {
      errorMessage = 'Invalid request to Spotify. Please check your app configuration.';
      errorCode = 'SPOTIFY_BAD_REQUEST';
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid Spotify credentials. Please check your Client ID and Secret.';
      errorCode = 'SPOTIFY_UNAUTHORIZED';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to Spotify. Please check your internet connection.';
      errorCode = 'SPOTIFY_CONNECTION_ERROR';
    }
    
    res.status(500).json({
      error: 'Authentication failed',
      message: errorMessage,
      details: error.response?.data?.error_description || error.message,
      code: errorCode
    });
  }
});

/**
 * Refresh access token
 * POST /api/spotify/auth/refresh
 */
router.post('/auth/refresh', authRateLimit, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        message: 'No refresh token provided',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = verifyRefreshToken(refreshToken, jwtSecret);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired',
      });
    }

    const userId = decoded.id;
    const redisManager = getRedisManager();
    const sessionData = await redisManager.getSession(userId);

    if (!sessionData || !sessionData.spotify_refresh_token) {
      return res.status(401).json({
        error: 'Session expired',
        message: 'Please login again',
      });
    }

    // Refresh Spotify token if needed
    if (sessionData.spotify_expires_at < Date.now() + 300000) {
      // Refresh if expires in 5 minutes
      const refreshResponse = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: sessionData.spotify_refresh_token,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          },
        }
      );

      const { access_token, expires_in, refresh_token: newRefreshToken } = refreshResponse.data;

      // Update session with new tokens
      sessionData.spotify_access_token = access_token;
      sessionData.spotify_expires_at = Date.now() + expires_in * 1000;
      if (newRefreshToken) {
        sessionData.spotify_refresh_token = newRefreshToken;
      }

      await redisManager.setSession(userId, sessionData, 7 * 24 * 60 * 60);
    }

    // Create new JWT access token
    const newAccessToken = createJWT(sessionData.user, jwtSecret, { expiresIn: '1h' });

    // Update cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getSecureCookieOptions(isProduction);
    res.cookie('access_token', newAccessToken, cookieOptions);

    res.json({
      success: true,
      access_token: newAccessToken,
      expires_in: 3600,
      user: sessionData.user,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: error.message,
    });
  }
});

/**
 * Logout and clear session
 * POST /api/spotify/auth/logout
 */
router.post('/auth/logout', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      const redisManager = getRedisManager();
      await redisManager.deleteSession(userId);
      await redisManager.del(`spotify:user:${userId}`);
    }

    // Clear cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    };

    res.clearCookie('access_token', clearOptions);
    res.clearCookie('refresh_token', clearOptions);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message,
    });
  }
});

/**
 * Get current user profile
 * GET /api/spotify/auth/me
 */
router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const redisManager = getRedisManager();
    const cachedUser = await redisManager.getCachedSpotifyUser(req.user.id);

    if (cachedUser) {
      return res.json({
        success: true,
        user: cachedUser,
      });
    }

    // Fallback to session data
    const sessionData = await redisManager.getSession(req.user.id);
    if (sessionData && sessionData.user) {
      return res.json({
        success: true,
        user: sessionData.user,
      });
    }

    res.status(404).json({
      error: 'User not found',
      message: 'User session expired',
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: error.message,
    });
  }
});

/**
 * Get audio features for a track
 * GET /api/spotify/audio-features/:trackId
 */
router.get('/audio-features/:trackId', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { trackId } = req.params;
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({
        error: 'Missing access token',
        message: 'Spotify access token is required',
      });
    }

    const audioFeatures = await spotifyService.getAudioFeatures(trackId, accessToken);

    res.json({
      success: true,
      trackId,
      audioFeatures,
    });
  } catch (error) {
    console.error('Error getting audio features:', error);
    res.status(500).json({
      error: 'Failed to get audio features',
      message: error.message,
    });
  }
});

/**
 * Get audio features for multiple tracks
 * POST /api/spotify/audio-features/batch
 */
router.post('/audio-features/batch', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { trackIds, accessToken } = req.body;

    if (!accessToken || !trackIds || !Array.isArray(trackIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'accessToken and trackIds array are required',
      });
    }

    if (trackIds.length > 100) {
      return res.status(400).json({
        error: 'Too many tracks',
        message: 'Maximum 100 tracks per batch request',
      });
    }

    const result = await spotifyService.getBatchAudioFeatures(trackIds, accessToken, {
      onProgress: (progress) => {
        // Could emit progress via WebSocket in real-time applications
        console.log(`Progress: ${progress.processed}/${progress.total}`);
      },
    });

    res.json({
      success: true,
      result,
      processedCount: result.totalProcessed,
      errorCount: result.errors.length,
    });
  } catch (error) {
    console.error('Error getting batch audio features:', error);
    res.status(500).json({
      error: 'Failed to get batch audio features',
      message: error.message,
    });
  }
});

/**
 * Get track metadata
 * GET /api/spotify/track/:trackId
 */
router.get('/track/:trackId', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { trackId } = req.params;
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({
        error: 'Missing access token',
        message: 'Spotify access token is required',
      });
    }

    const metadata = await spotifyService.getTrackMetadata(trackId, accessToken);

    res.json({
      success: true,
      trackId,
      metadata,
    });
  } catch (error) {
    console.error('Error getting track metadata:', error);
    res.status(500).json({
      error: 'Failed to get track metadata',
      message: error.message,
    });
  }
});

/**
 * Get metadata for multiple tracks
 * POST /api/spotify/tracks/batch
 */
router.post('/tracks/batch', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { trackIds, accessToken } = req.body;

    if (!accessToken || !trackIds || !Array.isArray(trackIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'accessToken and trackIds array are required',
      });
    }

    if (trackIds.length > 50) {
      return res.status(400).json({
        error: 'Too many tracks',
        message: 'Maximum 50 tracks per batch request',
      });
    }

    const metadata = await spotifyService.getBatchTrackMetadata(trackIds, accessToken);

    res.json({
      success: true,
      tracks: metadata,
      count: metadata.length,
    });
  } catch (error) {
    console.error('Error getting batch track metadata:', error);
    res.status(500).json({
      error: 'Failed to get batch track metadata',
      message: error.message,
    });
  }
});

/**
 * Process CSV listening history with audio features
 * POST /api/spotify/process-history
 */
router.post('/process-history', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { listeningHistory, accessToken, includeMetadata = true } = req.body;

    if (!accessToken || !listeningHistory || !Array.isArray(listeningHistory)) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'accessToken and listeningHistory array are required',
      });
    }

    if (listeningHistory.length > 1000) {
      return res.status(400).json({
        error: 'Too much data',
        message:
          'Maximum 1000 listening history items per request. Consider breaking into smaller batches.',
      });
    }

    const enrichedHistory = await spotifyService.enrichListeningHistory(
      listeningHistory,
      accessToken,
      {
        includeMetadata,
        onProgress: (progress) => {
          console.log(`Processing: ${progress.stage} - ${progress.processed}/${progress.total}`);
        },
      }
    );

    // Store enriched data in database
    const db = require('../../database/mongodb').getDb();
    const listeningHistoryCollection = db.collection('listening_history');

    const operations = enrichedHistory.map((item) => ({
      updateOne: {
        filter: {
          user_id: req.userId,
          track_id: item.track_id,
          played_at: item.played_at,
        },
        update: { $set: { ...item, user_id: req.userId } },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await listeningHistoryCollection.bulkWrite(operations);
    }

    res.json({
      success: true,
      processedItems: enrichedHistory.length,
      enrichedHistory: enrichedHistory.slice(0, 10), // Return first 10 for preview
      message: 'Listening history processed and stored successfully',
    });
  } catch (error) {
    console.error('Error processing listening history:', error);
    res.status(500).json({
      error: 'Failed to process listening history',
      message: error.message,
    });
  }
});

/**
 * Get cached audio features
 * POST /api/spotify/cached-features
 */
router.post('/cached-features', requireAuth, async (req, res) => {
  try {
    const { trackIds } = req.body;

    if (!trackIds || !Array.isArray(trackIds)) {
      return res.status(400).json({
        error: 'Missing trackIds',
        message: 'trackIds array is required',
      });
    }

    const cachedFeatures = await spotifyService.getCachedAudioFeatures(trackIds);

    res.json({
      success: true,
      cachedFeatures,
      count: cachedFeatures.length,
      cacheHitRate: cachedFeatures.length / trackIds.length,
    });
  } catch (error) {
    console.error('Error getting cached features:', error);
    res.status(500).json({
      error: 'Failed to get cached features',
      message: error.message,
    });
  }
});

/**
 * Get missing track IDs that need audio features
 * POST /api/spotify/missing-features
 */
router.post('/missing-features', requireAuth, async (req, res) => {
  try {
    const { trackIds } = req.body;

    if (!trackIds || !Array.isArray(trackIds)) {
      return res.status(400).json({
        error: 'Missing trackIds',
        message: 'trackIds array is required',
      });
    }

    const missingTrackIds = await spotifyService.getMissingTrackIds(trackIds);

    res.json({
      success: true,
      missingTrackIds,
      missingCount: missingTrackIds.length,
      totalRequested: trackIds.length,
      cacheHitRate: (trackIds.length - missingTrackIds.length) / trackIds.length,
    });
  } catch (error) {
    console.error('Error getting missing track IDs:', error);
    res.status(500).json({
      error: 'Failed to get missing track IDs',
      message: error.message,
    });
  }
});

/**
 * Get Spotify service statistics
 * GET /api/spotify/stats
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const cacheStats = spotifyService.getCacheStats();

    // Get database statistics
    const db = require('../../database/mongodb').getDb();
    const [audioFeaturesCount, trackMetadataCount, listeningHistoryCount] = await Promise.all([
      db.collection('audio_features').countDocuments(),
      db.collection('track_metadata').countDocuments(),
      db.collection('listening_history').countDocuments({ user_id: req.userId }),
    ]);

    res.json({
      success: true,
      stats: {
        cache: cacheStats,
        database: {
          audioFeatures: audioFeaturesCount,
          trackMetadata: trackMetadataCount,
          userListeningHistory: listeningHistoryCount,
        },
        service: {
          name: 'SpotifyAudioFeaturesService',
          status: 'active',
        },
      },
    });
  } catch (error) {
    console.error('Error getting Spotify stats:', error);
    res.status(500).json({
      error: 'Failed to get Spotify statistics',
      message: error.message,
    });
  }
});

/**
 * Clear service cache
 * POST /api/spotify/clear-cache
 */
router.post('/clear-cache', requireAuth, async (req, res) => {
  try {
    spotifyService.clearCache();

    res.json({
      success: true,
      message: 'Service cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message,
    });
  }
});

/**
 * Upload and process CSV file
 * POST /api/spotify/upload-csv
 */
router.post('/upload-csv', requireAuth, async (req, res) => {
  try {
    const multer = require('multer');
    const csv = require('csv-parser');
    const fs = require('fs');
    const path = require('path');

    // Configure multer for file upload
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../uploads/csv');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${req.userId}_${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
      },
    });

    const upload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'));
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }).single('csvFile');

    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          error: 'File upload failed',
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a CSV file to upload',
        });
      }

      const { accessToken, processAudioFeatures = true } = req.body;

      if (!accessToken) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'Missing access token',
          message: 'Spotify access token is required for processing',
        });
      }

      const csvData = [];
      const errors = [];
      let rowCount = 0;

      // Parse CSV file
      const parsePromise = new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            rowCount++;

            // Validate required columns
            if (!row.track_id && !row.trackId && !row['Track ID']) {
              errors.push(`Row ${rowCount}: Missing track_id`);
              return;
            }

            // Normalize column names
            const normalizedRow = {
              track_id: row.track_id || row.trackId || row['Track ID'],
              track_name: row.track_name || row.trackName || row['Track Name'] || '',
              artist_name: row.artist_name || row.artistName || row['Artist Name'] || '',
              played_at:
                row.played_at || row.playedAt || row['Played At'] || new Date().toISOString(),
              duration_ms: parseInt(row.duration_ms || row.durationMs || row['Duration (ms)'] || 0),
              user_id: req.userId,
            };

            // Validate track_id format (Spotify track IDs are 22 characters)
            if (normalizedRow.track_id.length !== 22) {
              errors.push(`Row ${rowCount}: Invalid track_id format`);
              return;
            }

            csvData.push(normalizedRow);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      try {
        await parsePromise;

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (csvData.length === 0) {
          return res.status(400).json({
            error: 'No valid data found',
            message: 'CSV file contained no valid listening history records',
            errors: errors.slice(0, 10), // Return first 10 errors
          });
        }

        // Process audio features if requested
        let enrichedData = csvData;
        if (processAudioFeatures) {
          // uniqueTrackIds removed - was unused
          // Process in smaller batches to avoid overwhelming the API
          enrichedData = await spotifyService.enrichListeningHistory(csvData, accessToken, {
            includeMetadata: true,
            onProgress: (progress) => {
              console.log(
                `Processing CSV: ${progress.stage} - ${progress.processed}/${progress.total}`
              );
            },
          });
        }

        // Store in database
        const db = require('../../database/mongodb').getDb();
        const listeningHistoryCollection = db.collection('listening_history');

        const operations = enrichedData.map((item) => ({
          updateOne: {
            filter: {
              user_id: req.userId,
              track_id: item.track_id,
              played_at: item.played_at,
            },
            update: { $set: item },
            upsert: true,
          },
        }));

        const bulkResult = await listeningHistoryCollection.bulkWrite(operations);

        res.json({
          success: true,
          processed: {
            total_rows: rowCount,
            valid_records: csvData.length,
            stored_records: bulkResult.upsertedCount + bulkResult.modifiedCount,
            audio_features_processed: processAudioFeatures,
            errors_count: errors.length,
          },
          errors: errors.slice(0, 5), // Return first 5 errors for debugging
          sample_data: enrichedData.slice(0, 3), // Return first 3 records as sample
          message: `Successfully processed ${csvData.length} listening history records from CSV file`,
        });
      } catch (parseError) {
        // Clean up uploaded file on error
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        console.error('Error parsing CSV:', parseError);
        res.status(500).json({
          error: 'CSV processing failed',
          message: parseError.message,
        });
      }
    });
  } catch (error) {
    console.error('Error in CSV upload endpoint:', error);
    res.status(500).json({
      error: 'Failed to process CSV upload',
      message: error.message,
    });
  }
});

/**
 * Health check for Spotify service
 * GET /api/spotify/health
 */
router.get('/health', async (req, res) => {
  try {
    const cacheStats = spotifyService.getCacheStats();

    res.json({
      status: 'healthy',
      service: 'SpotifyAudioFeaturesService',
      cache: cacheStats,
      rateLimiter: {
        status: 'active',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/spotify/devices
 * Get user's available devices
 */
router.get('/devices', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const devices = await makeSpotifyRequest(
      '/me/player/devices',
      req.user.spotifyTokens.access_token
    );

    res.json({
      success: true,
      devices: devices.devices,
      message: 'Devices retrieved successfully',
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get devices',
      message: error.message,
    });
  }
});

/**
 * POST /api/spotify/play
 * Start/resume playback
 */
router.post('/play', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { device_id, context_uri, uris, offset, position_ms } = req.body;

    const data = {};
    if (context_uri) data.context_uri = context_uri;
    if (uris) data.uris = uris;
    if (offset) data.offset = offset;
    if (position_ms) data.position_ms = position_ms;

    const endpoint = device_id ? `/me/player/play?device_id=${device_id}` : '/me/player/play';

    await makeSpotifyRequest(endpoint, req.user.spotifyTokens.access_token, {
      method: 'PUT',
      data,
    });

    res.json({
      success: true,
      message: 'Playback started',
    });
  } catch (error) {
    console.error('Start playback error:', error);
    
    // Handle specific Spotify API errors
    if (error.message.includes('404')) {
      return res.status(404).json({
        success: false,
        error: 'no_active_device',
        code: 'no_active_device',
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'No active Spotify device found'
      });
    }
    
    if (error.message.includes('403')) {
      return res.status(403).json({
        success: false,
        error: 'no_active_device', 
        code: 'no_active_device',
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'Insufficient permissions or no active device'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to start playback',
      message: error.message,
      developerMessage: `Spotify API error: ${error.message}`
    });
  }
});

/**
 * POST /api/spotify/pause
 * Pause playback
 */
router.post('/pause', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { device_id } = req.body;

    const endpoint = device_id ? `/me/player/pause?device_id=${device_id}` : '/me/player/pause';

    await makeSpotifyRequest(endpoint, req.user.spotifyTokens.access_token, {
      method: 'PUT',
    });

    res.json({
      success: true,
      message: 'Playback paused',
    });
  } catch (error) {
    console.error('Pause playback error:', error);
    
    // Handle specific Spotify API errors
    if (error.message.includes('404')) {
      return res.status(404).json({
        success: false,
        error: 'no_active_device',
        code: 'no_active_device',
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'No active Spotify device found'
      });
    }
    
    if (error.message.includes('403')) {
      return res.status(403).json({
        success: false,
        error: 'no_active_device',
        code: 'no_active_device', 
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'Insufficient permissions or no active device'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to pause playback',
      message: error.message,
      developerMessage: `Spotify API error: ${error.message}`
    });
  }
});

/**
 * POST /api/spotify/next
 * Skip to next track
 */
router.post('/next', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { device_id } = req.body;

    const endpoint = device_id ? `/me/player/next?device_id=${device_id}` : '/me/player/next';

    await makeSpotifyRequest(endpoint, req.user.spotifyTokens.access_token, {
      method: 'POST',
    });

    res.json({
      success: true,
      message: 'Skipped to next track',
    });
  } catch (error) {
    console.error('Next track error:', error);
    
    // Handle specific Spotify API errors
    if (error.message.includes('404')) {
      return res.status(404).json({
        success: false,
        error: 'no_active_device',
        code: 'no_active_device',
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'No active Spotify device found'
      });
    }
    
    if (error.message.includes('403')) {
      return res.status(403).json({
        success: false,
        error: 'no_active_device',
        code: 'no_active_device',
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'Insufficient permissions or no active device'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to skip to next track',
      message: error.message,
      developerMessage: `Spotify API error: ${error.message}`
    });
  }
});

/**
 * POST /api/spotify/previous
 * Skip to previous track
 */
router.post('/previous', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { device_id } = req.body;

    const endpoint = device_id ? `/me/player/previous?device_id=${device_id}` : '/me/player/previous';

    await makeSpotifyRequest(endpoint, req.user.spotifyTokens.access_token, {
      method: 'POST',
    });

    res.json({
      success: true,
      message: 'Skipped to previous track',
    });
  } catch (error) {
    console.error('Previous track error:', error);
    
    // Handle specific Spotify API errors
    if (error.message.includes('404')) {
      return res.status(404).json({
        success: false,
        error: 'no_active_device',
        code: 'no_active_device',
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'No active Spotify device found'
      });
    }
    
    if (error.message.includes('403')) {
      return res.status(403).json({
        success: false,
        error: 'no_active_device',
        code: 'no_active_device',
        message: 'Open Spotify on one device and press play once, then retry.',
        developerMessage: 'Insufficient permissions or no active device'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to skip to previous track',
      message: error.message,
      developerMessage: `Spotify API error: ${error.message}`
    });
  }
});

/**
 * POST /api/spotify/transfer
 * Transfer playback to another device
 */
router.post('/transfer', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const { deviceId, device_ids } = req.body;
    
    // Support both deviceId (singular) and device_ids (array) for compatibility
    const deviceIds = device_ids || (deviceId ? [deviceId] : []);
    
    if (!deviceIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing device ID',
        message: 'deviceId or device_ids is required',
      });
    }

    await makeSpotifyRequest('/me/player', req.user.spotifyTokens.access_token, {
      method: 'PUT',
      data: {
        device_ids: deviceIds,
        play: false, // Don't start playback automatically
      },
    });

    res.json({
      success: true,
      message: 'Playback transferred successfully',
    });
  } catch (error) {
    console.error('Transfer playback error:', error);
    
    // Handle specific Spotify API errors
    if (error.message.includes('404')) {
      return res.status(404).json({
        success: false,
        error: 'device_not_found',
        code: 'device_not_found',
        message: 'Device not found. Please ensure the device is online and active.',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to transfer playback',
      message: error.message,
      developerMessage: `Spotify API error: ${error.message}`
    });
  }
});

/**
 * GET /api/spotify/playback
 * Get current playback state
 */
router.get('/playback', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const playback = await makeSpotifyRequest('/me/player', req.user.spotifyTokens.access_token);

    res.json({
      success: true,
      playback: playback || null,
      message: playback ? 'Playback state retrieved' : 'No active playback',
    });
  } catch (error) {
    console.error('Get playback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get playback state',
      message: error.message,
    });
  }
});

/**
 * GET /api/spotify/now-playing
 * Get currently playing track (formatted for Now Playing Widget)
 */
router.get('/now-playing', requireAuth, spotifyRateLimit, async (req, res) => {
  try {
    const PlaybackController = require('../../spotify/playback-controller');
    const controller = new PlaybackController(req.user.spotifyTokens.access_token);
    
    const nowPlaying = await controller.getNowPlaying();

    if (nowPlaying.error) {
      return res.json({
        success: false,
        error: nowPlaying.error,
        message: nowPlaying.error === 'No active device' 
          ? 'No active Spotify device found. Please open Spotify on a device.'
          : 'Unable to get playback information',
      });
    }

    res.json({
      success: true,
      ...nowPlaying,
    });
  } catch (error) {
    console.error('Get now playing error:', error);
    
    if (error.message.includes('Premium')) {
      return res.status(403).json({
        success: false,
        error: 'premium_required',
        message: 'Spotify Premium is required for playback control',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get now playing',
      message: error.message,
    });
  }
});

module.exports = router;
