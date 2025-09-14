const express = require('express');
const router = express.Router();
const PlaylistService = require('../../spotify/PlaylistService');
const recommendationEngine = require('../../ml/recommendation-engine-enhanced');
const { traceManager } = require('../../utils/agentops-trace-manager');

/**
 * Phase 6: Playlist Automation API - Production Ready
 *
 * Provides comprehensive playlist management with:
 * - Real Spotify API integration (NO_MOCK policy)
 * - AI-powered track selection using recommendation engine
 * - Chat orchestrator integration for voice commands
 * - Automatic playlist generation and management
 * - Comprehensive error handling and token management
 */

// Initialize playlist service
const playlistService = new PlaylistService();

/**
 * POST /api/playlist-automation/create
 * Create a personalized playlist with real Spotify integration
 */
router.post('/create', async (req, res) => {
  return await traceManager.traceSpotifyOperation('createPlaylist', async () => {
    try {
      const {
        userId,
        name,
        description,
        tracks = [],
        config = {},
        spotifyAccessToken
      } = req.body;

      // Validate required fields
      if (!userId || !name || !spotifyAccessToken) {
        return res.status(400).json({
          success: false,
          error: 'userId, name, and spotifyAccessToken are required'
        });
      }

      if (!tracks || tracks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one track is required'
        });
      }

      // Validate Spotify token
      const tokenValidation = await playlistService.validateToken(spotifyAccessToken);
      if (!tokenValidation.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired Spotify access token',
          details: tokenValidation.error
        });
      }

      console.log(`Creating playlist "${name}" for user ${userId} with ${tracks.length} tracks`);

      // Create playlist using PlaylistService
      const result = await playlistService.createPersonalizedPlaylist(
        userId,
        name,
        tracks,
        {
          description: description || `AI-curated playlist created by EchoTune AI`,
          public: config.public || false,
          collaborative: config.collaborative || false,
          ...config
        },
        spotifyAccessToken
      );

      res.json({
        success: true,
        playlist: {
          id: result.playlist.id,
          name: result.playlist.name,
          description: result.playlist.description,
          spotifyUrl: result.spotifyUrl,
          trackCount: result.addedTracks,
          tracks: result.playlist.tracks.slice(0, 10), // Return first 10 tracks for preview
          createdAt: result.playlist.createdAt
        },
        metadata: {
          totalTracksAdded: result.addedTracks,
          totalTracksAttempted: result.totalAttempted,
          warnings: result.warnings || [],
          source: 'echotune_ai'
        }
      });

    } catch (error) {
      console.error('Create playlist error:', error);
      
      // Handle specific error types
      if (error.message.includes('token expired')) {
        return res.status(401).json({
          success: false,
          error: 'Spotify access token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Please re-authenticate with Spotify'
        });
      } else if (error.message.includes('permissions')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Spotify permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Please grant playlist modification permissions'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create playlist',
        details: error.message
      });
    }
  });
});

/**
 * POST /api/playlist-automation/generate-from-prompt
 * Generate and create playlist from natural language prompt
 */
router.post('/generate-from-prompt', async (req, res) => {
  return await traceManager.traceSpotifyOperation('generateFromPrompt', async () => {
    try {
      const {
        userId,
        prompt,
        trackCount = 20,
        spotifyAccessToken,
        autoCreate = false
      } = req.body;

      if (!userId || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'userId and prompt are required'
        });
      }

      console.log(`Generating playlist from prompt: "${prompt}"`);

      // Parse prompt using chat orchestrator's intent classification
      const IntentClassifier = require('../../chat/intents/classifyIntent');
      const intentClassifier = new IntentClassifier();
      const intent = intentClassifier.classifyIntent(prompt);
      const entities = intentClassifier.extractEntities(prompt);

      // Generate recommendations based on prompt context
      const recommendations = await recommendationEngine.generateRecommendations(userId, {
        limit: trackCount,
        context: {
          mood: entities.moods[0] || null,
          activity: entities.activities[0] || null,
          genre: entities.genres[0] || null,
          artist: entities.artists[0] || null
        }
      });

      if (!recommendations.success || recommendations.recommendations.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate recommendations from prompt',
          prompt,
          context
        });
      }

      // Extract playlist name from prompt
      const playlistName = extractPlaylistName(prompt) || 
        generatePlaylistName(entities) || 
        `AI Playlist: ${prompt.slice(0, 30)}...`;

      const playlistData = {
        name: playlistName,
        description: `Generated from: "${prompt}"`,
        tracks: recommendations.recommendations,
        context: entities,
        generatedAt: new Date().toISOString()
      };

      if (autoCreate && spotifyAccessToken) {
        // Validate token
        const tokenValidation = await playlistService.validateToken(spotifyAccessToken);
        if (!tokenValidation.valid) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired Spotify access token'
          });
        }

        // Auto-create the playlist
        const result = await playlistService.createPersonalizedPlaylist(
          userId,
          playlistName,
          recommendations.recommendations,
          {
            description: playlistData.description,
            public: false
          },
          spotifyAccessToken
        );

        res.json({
          success: true,
          autoCreated: true,
          playlist: result.playlist,
          spotifyUrl: result.spotifyUrl,
          prompt,
          context: entities,
          recommendations: {
            total: recommendations.recommendations.length,
            strategy: recommendations.strategy,
            explanation: recommendations.explanation
          }
        });
      } else {
        // Return suggestions without creating
        res.json({
          success: true,
          autoCreated: false,
          playlistSuggestion: playlistData,
          prompt,
          context: entities,
          recommendations: {
            tracks: recommendations.recommendations,
            total: recommendations.recommendations.length,
            strategy: recommendations.strategy,
            explanation: recommendations.explanation
          },
          message: 'Playlist suggestion ready. Provide spotifyAccessToken and set autoCreate=true to create automatically.'
        });
      }

    } catch (error) {
      console.error('Generate from prompt error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate playlist from prompt',
        details: error.message
      });
    }
  });
});

/**
 * POST /api/playlist-automation/:playlistId/tracks
 * Add tracks to existing playlist
 */
router.post('/:playlistId/tracks', async (req, res) => {
  return await traceManager.traceSpotifyOperation('addTracks', async () => {
    try {
      const { playlistId } = req.params;
      const { userId, tracks, spotifyAccessToken } = req.body;

      if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'tracks array is required'
        });
      }

      if (!spotifyAccessToken) {
        return res.status(400).json({
          success: false,
          error: 'spotifyAccessToken is required'
        });
      }

      // Validate token
      const tokenValidation = await playlistService.validateToken(spotifyAccessToken);
      if (!tokenValidation.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired Spotify access token'
        });
      }

      console.log(`Adding ${tracks.length} tracks to playlist ${playlistId}`);

      const result = await playlistService.appendTracks(
        userId,
        playlistId,
        tracks,
        spotifyAccessToken
      );

      res.json({
        success: true,
        addedTracks: result.addedTracks,
        totalAttempted: result.totalAttempted,
        warnings: result.warnings || [],
        snapshot_id: result.snapshot_id
      });

    } catch (error) {
      console.error('Add tracks error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add tracks to playlist',
        details: error.message
      });
    }
  });
});

/**
 * POST /api/playlist-automation/ensure
 * Ensure playlist exists for a specific purpose (e.g., workout, study)
 */
router.post('/ensure', async (req, res) => {
  return await traceManager.traceSpotifyOperation('ensurePlaylist', async () => {
    try {
      const {
        userId,
        key, // Unique identifier for playlist type (e.g., 'workout', 'study', 'daily_mix')
        config = {},
        spotifyAccessToken
      } = req.body;

      if (!userId || !key || !spotifyAccessToken) {
        return res.status(400).json({
          success: false,
          error: 'userId, key, and spotifyAccessToken are required'
        });
      }

      // Validate token
      const tokenValidation = await playlistService.validateToken(spotifyAccessToken);
      if (!tokenValidation.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired Spotify access token'
        });
      }

      const result = await playlistService.ensurePlaylistExists(
        userId,
        key,
        {
          name: config.name || `EchoTune ${key.charAt(0).toUpperCase() + key.slice(1)} Playlist`,
          description: config.description || `Auto-managed ${key} playlist by EchoTune AI`,
          public: config.public || false,
          initialTracks: config.initialTracks || []
        },
        spotifyAccessToken
      );

      res.json({
        success: true,
        playlist: result.playlist,
        created: result.created,
        key,
        message: result.created ? 'New playlist created' : 'Using existing playlist'
      });

    } catch (error) {
      console.error('Ensure playlist error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to ensure playlist exists',
        details: error.message
      });
    }
  });
});

/**
 * GET /api/playlist-automation/stats
 * Get playlist service statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = playlistService.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

/**
 * Helper Functions
 */

/**
 * Extract playlist name from natural language prompt
 */
function extractPlaylistName(prompt) {
  // Try various patterns to extract playlist name
  const patterns = [
    /(?:create|make|generate).*?playlist.*?(?:called|named|titled)\s+"([^"]+)"/i,
    /(?:create|make|generate).*?playlist.*?(?:called|named|titled)\s+([^,.\n!?]+)/i,
    /playlist.*?(?:called|named|titled)\s+"([^"]+)"/i,
    /playlist.*?(?:called|named|titled)\s+([^,.\n!?]+)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Generate playlist name from context
 */
function generatePlaylistName(entities) {
  const parts = [];
  
  if (entities.moods && entities.moods.length > 0) {
    parts.push(entities.moods[0].charAt(0).toUpperCase() + entities.moods[0].slice(1));
  }
  
  if (entities.activities && entities.activities.length > 0) {
    parts.push(entities.activities[0].charAt(0).toUpperCase() + entities.activities[0].slice(1));
  }
  
  if (entities.genres && entities.genres.length > 0) {
    parts.push(entities.genres[0].charAt(0).toUpperCase() + entities.genres[0].slice(1));
  }

  if (parts.length > 0) {
    return `${parts.join(' ')} Mix`;
  }

  return null;
}

module.exports = router;
