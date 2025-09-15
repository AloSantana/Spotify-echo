/**
 * Simple Settings API - For frontend testing
 * Provides basic configuration data without authentication
 */

const express = require('express');
const router = express.Router();

// Mock settings data for frontend development
const mockSettings = {
  llmProviders: {
    gemini: {
      enabled: true,
      model: 'gemini-1.5-flash'
    },
    openrouter: {
      enabled: false,
      model: 'anthropic/claude-3.5-sonnet'
    },
    mock: {
      enabled: true,
      model: 'mock-music-assistant'
    }
  },
  spotify: {
    autoSync: true,
    syncInterval: 300
  },
  features: {
    realtime_chat: true,
    enhanced_mcp: true,
    advanced_analytics: true
  },
  preferences: {
    chatTimeout: 30,
    maxTokens: 2048,
    theme: 'dark'
  },
  performance: {
    requestTimeout: 5000,
    cacheTTL: 15
  }
};

/**
 * GET /api/simple-settings
 * Get current settings (no auth required for demo)
 */
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: mockSettings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve settings'
    });
  }
});

/**
 * PUT /api/simple-settings
 * Update settings (no auth required for demo)
 */
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate request body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Settings updates must be provided as an object'
      });
    }

    // Simple merge (in real implementation, this would be saved to database)
    if (updates.section && updates.settings) {
      // Update specific section
      mockSettings[updates.section] = {
        ...mockSettings[updates.section],
        ...updates.settings
      };
    } else {
      // Update all provided settings
      Object.keys(updates).forEach(key => {
        if (mockSettings.hasOwnProperty(key)) {
          mockSettings[key] = {
            ...mockSettings[key],
            ...updates[key]
          };
        }
      });
    }

    res.json({
      success: true,
      data: mockSettings,
      message: 'Settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update settings'
    });
  }
});

/**
 * GET /api/simple-settings/providers
 * Get available providers status
 */
router.get('/providers', async (req, res) => {
  try {
    // Get actual provider status from chat providers endpoint
    const providersResponse = await fetch('http://localhost:3000/api/chat/providers');
    let providers = [];
    
    if (providersResponse.ok) {
      const data = await providersResponse.json();
      providers = data.providers || [];
    }

    res.json({
      success: true,
      providers: providers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve providers'
    });
  }
});

module.exports = router;