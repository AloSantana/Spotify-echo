/**
 * User Settings API Routes
 * RESTful endpoints for managing user preferences and configuration
 */

const express = require('express');
const router = express.Router();
const UserSettingsService = require('../services/UserSettingsService');
const logger = require('../api/utils/logger');

// Initialize settings service
const settingsService = new UserSettingsService();

// Middleware to ensure user authentication
const requireAuth = (req, res, next) => {
  // Extract user ID from request (assuming it's set by auth middleware)
  const userId = req.user?.id || req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User ID must be provided'
    });
  }
  
  req.userId = userId;
  next();
};

// Middleware for admin operations
const requireAdmin = (req, res, next) => {
  const isAdmin = req.user?.role === 'admin' || req.headers['x-admin-key'] === process.env.ADMIN_SECRET_KEY;
  
  if (!isAdmin) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'This operation requires administrator privileges'
    });
  }
  
  next();
};

/**
 * GET /api/settings
 * Get current user settings
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await settingsService.getUserSettings(req.userId);
    
    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting user settings', { userId: req.userId, error: error.message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve user settings'
    });
  }
});

/**
 * PUT /api/settings
 * Update user settings with optimistic concurrency control
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    const lastUpdated = req.headers['if-unmodified-since'];
    
    // Validate request body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Settings updates must be provided as an object'
      });
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.userId;
    delete updates.createdAt;
    delete updates._id;

    const updatedSettings = await settingsService.updateUserSettings(
      req.userId,
      updates,
      lastUpdated
    );

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating user settings', { userId: req.userId, error: error.message });
    
    if (error.code === 'VERSION_CONFLICT') {
      return res.status(409).json({
        error: 'VERSION_CONFLICT',
        message: error.message,
        serverVersion: error.serverVersion,
        serverState: error.serverState
      });
    }
    
    if (error.message.includes('Validation failed') || error.message.includes('must be')) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update user settings'
    });
  }
});

/**
 * PATCH /api/settings
 * Partially update user settings
 */
router.patch('/', requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    const lastUpdated = req.headers['if-unmodified-since'];
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Partial updates must be provided as an object'
      });
    }

    // For PATCH, we only update the provided fields
    const currentSettings = await settingsService.getUserSettings(req.userId);
    const mergedUpdates = { ...currentSettings, ...updates };
    
    // Remove sensitive fields
    delete mergedUpdates.userId;
    delete mergedUpdates.createdAt;
    delete mergedUpdates._id;
    delete mergedUpdates.isDefault;

    const updatedSettings = await settingsService.updateUserSettings(
      req.userId,
      mergedUpdates,
      lastUpdated
    );

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Settings partially updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error partially updating user settings', { userId: req.userId, error: error.message });
    
    if (error.code === 'VERSION_CONFLICT') {
      return res.status(409).json({
        error: 'VERSION_CONFLICT',
        message: error.message,
        serverVersion: error.serverVersion,
        serverState: error.serverState
      });
    }
    
    if (error.message.includes('Validation failed') || error.message.includes('must be')) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to partially update user settings'
    });
  }
});

/**
 * DELETE /api/settings
 * Delete user settings (reset to defaults)
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    await settingsService.deleteUserSettings(req.userId);
    
    res.json({
      success: true,
      message: 'User settings deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting user settings', { userId: req.userId, error: error.message });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Settings not found',
        message: 'No settings found for this user'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user settings'
    });
  }
});

/**
 * POST /api/settings/validate
 * Validate settings object without saving
 */
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const settings = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Settings object must be provided'
      });
    }

    // Validate using the service method
    settingsService.validateSettings(settings);
    
    res.json({
      success: true,
      valid: true,
      message: 'Settings are valid',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      valid: false,
      error: 'Validation error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/settings/defaults
 * Get default settings template
 */
router.get('/defaults', (req, res) => {
  try {
    const defaultSettings = settingsService.getDefaultSettings();
    
    res.json({
      success: true,
      data: defaultSettings,
      message: 'Default settings retrieved',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting default settings', { error: error.message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve default settings'
    });
  }
});

/**
 * GET /api/providers/status
 * Get provider status and availability
 */
router.get('/providers/status', async (req, res) => {
  try {
    // This would normally check actual provider availability
    // For now, providing a static implementation that can be extended
    const providers = {
      openai: {
        id: 'openai',
        name: 'OpenAI',
        available: !!process.env.OPENAI_API_KEY,
        default: true,
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
        reasonUnavailable: !process.env.OPENAI_API_KEY ? 'API key not configured' : null
      },
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        available: !!process.env.OPENROUTER_API_KEY,
        default: false,
        models: ['gpt-4o-mini', 'claude-3-haiku', 'llama-3.1-8b'],
        reasonUnavailable: !process.env.OPENROUTER_API_KEY ? 'API key not configured' : null
      },
      gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        available: !!process.env.GEMINI_API_KEY,
        default: false,
        models: ['gemini-pro', 'gemini-pro-vision'],
        reasonUnavailable: !process.env.GEMINI_API_KEY ? 'API key not configured' : null
      }
    };

    // Find default provider
    const defaultProvider = Object.values(providers).find(p => p.default && p.available)?.id || 'openai';

    res.json({
      success: true,
      data: {
        providers,
        defaultProvider,
        availableProviders: Object.values(providers).filter(p => p.available).map(p => p.id)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting provider status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve provider status'
    });
  }
});

/**
 * Admin Routes
 */

/**
 * GET /api/settings/admin/stats
 * Get usage statistics (admin only)
 */
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await settingsService.getUsageStatistics();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting usage statistics', { error: error.message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve usage statistics'
    });
  }
});

/**
 * GET /api/settings/admin/bulk
 * Get settings for multiple users (admin only)
 */
router.get('/admin/bulk', requireAdmin, async (req, res) => {
  try {
    const { userIds, limit } = req.query;
    
    if (!userIds) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'userIds parameter is required'
      });
    }

    const userIdArray = Array.isArray(userIds) ? userIds : userIds.split(',');
    const settings = await settingsService.getBulkUserSettings(
      userIdArray,
      parseInt(limit) || 100
    );
    
    res.json({
      success: true,
      data: settings,
      count: settings.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting bulk user settings', { error: error.message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve bulk user settings'
    });
  }
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  logger.error('Settings API error', { error: error.message, stack: error.stack });
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;