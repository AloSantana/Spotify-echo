const express = require('express');
const { requireAuth, createRateLimit } = require('../middleware');
const SmartFeaturesService = require('../../services/SmartFeaturesService');
const { getLLMProviderManager } = require('../../chat/llm-provider-manager');
const SpotifyAPIService = require('../../spotify/api-service');

const router = express.Router();

// Initialize services
let smartFeaturesService = null;

async function getSmartFeaturesService() {
  if (!smartFeaturesService) {
    const llmManager = await getLLMProviderManager();
    const spotifyService = new SpotifyAPIService();
    smartFeaturesService = new SmartFeaturesService(llmManager, spotifyService);
  }
  return smartFeaturesService;
}

// Rate limiting
const smartFeaturesRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit smart features due to AI usage
  message: 'Too many smart feature requests, please try again later',
});

/**
 * Generate smart playlist
 * POST /api/smart-features/playlist/generate
 */
router.post('/playlist/generate', requireAuth, smartFeaturesRateLimit, async (req, res) => {
  try {
    const service = await getSmartFeaturesService();
    const { prompt, duration, provider, model } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Missing prompt',
        message: 'Prompt is required for playlist generation'
      });
    }

    // Get Spotify access token from session/user
    const spotifyAccessToken = req.user?.spotifyAccessToken || req.session?.spotifyAccessToken;
    
    if (!spotifyAccessToken) {
      return res.status(401).json({
        error: 'Spotify not connected',
        message: 'Please connect your Spotify account to generate playlists'
      });
    }

    const result = await service.generateSmartPlaylist(req.userId, prompt, {
      duration: duration || 30,
      provider,
      model,
      spotifyAccessToken
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Smart playlist generation error:', error);
    res.status(500).json({
      error: 'Playlist generation failed',
      message: error.message
    });
  }
});

/**
 * Update personalization preferences
 * POST /api/smart-features/personalization/update
 */
router.post('/personalization/update', requireAuth, smartFeaturesRateLimit, async (req, res) => {
  try {
    const service = await getSmartFeaturesService();
    const { direction, attributes } = req.body;

    if (!direction || !attributes || !Array.isArray(attributes)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'direction and attributes array are required'
      });
    }

    const result = await service.updatePersonalization(req.userId, {
      direction,
      attributes
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Personalization update error:', error);
    res.status(500).json({
      error: 'Personalization update failed',
      message: error.message
    });
  }
});

/**
 * Semantic search
 * POST /api/smart-features/search/semantic
 */
router.post('/search/semantic', requireAuth, smartFeaturesRateLimit, async (req, res) => {
  try {
    const service = await getSmartFeaturesService();
    const { query, provider, model } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Missing query',
        message: 'Search query is required'
      });
    }

    const spotifyAccessToken = req.user?.spotifyAccessToken || req.session?.spotifyAccessToken;
    
    if (!spotifyAccessToken) {
      return res.status(401).json({
        error: 'Spotify not connected',
        message: 'Please connect your Spotify account to search'
      });
    }

    const result = await service.semanticSearch(query, req.userId, {
      provider,
      model,
      accessToken: spotifyAccessToken
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * Get personalization insights
 * GET /api/smart-features/personalization/insights
 */
router.get('/personalization/insights', requireAuth, smartFeaturesRateLimit, async (req, res) => {
  try {
    // This would aggregate user's preferences and listening patterns
    // For now, return a simple summary
    res.json({
      success: true,
      insights: {
        topGenres: [],
        topArtists: [],
        listeningPatterns: {},
        recommendations: 'Connect more data sources for personalized insights'
      },
      message: 'Insights available after more usage'
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      error: 'Failed to get insights',
      message: error.message
    });
  }
});

module.exports = router;
