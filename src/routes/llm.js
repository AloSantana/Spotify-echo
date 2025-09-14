/**
 * LLM Provider API Routes
 * Provides endpoints for managing and monitoring LLM providers
 */

const express = require('express');
const router = express.Router();
const providerRegistry = require('../llm/providers');

/**
 * GET /api/llm/status
 * Get status and capabilities of all LLM providers
 */
router.get('/status', async (req, res) => {
  try {
    // Ensure registry is initialized
    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    const status = providerRegistry.getProviderStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting LLM provider status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve provider status'
    });
  }
});

/**
 * GET /api/llm/providers
 * Get available providers with capabilities
 */
router.get('/providers', async (req, res) => {
  try {
    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    const providers = providerRegistry.getAvailableProviders();
    
    res.json({
      success: true,
      data: providers,
      count: providers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting available providers:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve available providers'
    });
  }
});

/**
 * GET /api/llm/telemetry
 * Get comprehensive telemetry data
 */
router.get('/telemetry', async (req, res) => {
  try {
    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    const telemetry = providerRegistry.getComprehensiveTelemetry();
    
    res.json({
      success: true,
      data: telemetry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting LLM telemetry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve telemetry data'
    });
  }
});

/**
 * POST /api/llm/validate/:provider
 * Validate a specific provider
 */
router.post('/validate/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    const validation = await providerRegistry.validateProvider(provider);
    
    res.json({
      success: true,
      data: validation,
      provider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error validating provider ${req.params.provider}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: `Failed to validate provider: ${req.params.provider}`
    });
  }
});

/**
 * POST /api/llm/generate
 * Generate completion with specified provider
 */
router.post('/generate', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Messages array is required'
      });
    }

    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    const response = await providerRegistry.generate(messages, options);
    
    res.json({
      success: true,
      data: response,
      provider: options.provider || providerRegistry.defaultProvider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating completion:', error);
    
    // Handle provider-specific errors
    if (error.message?.includes('No available LLM providers')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'No LLM providers are currently available'
      });
    }
    
    if (error.message?.includes('not found') || error.message?.includes('not available')) {
      return res.status(404).json({
        error: 'Provider not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate completion'
    });
  }
});

/**
 * POST /api/llm/switch/:provider
 * Switch default provider
 */
router.post('/switch/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    providerRegistry.setDefaultProvider(provider);
    
    res.json({
      success: true,
      message: `Default provider switched to ${provider}`,
      defaultProvider: provider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error switching to provider ${req.params.provider}:`, error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Provider not found',
        message: error.message
      });
    }
    
    if (error.message?.includes('not available')) {
      return res.status(503).json({
        error: 'Provider not available',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: `Failed to switch to provider: ${req.params.provider}`
    });
  }
});

/**
 * POST /api/llm/reset-telemetry
 * Reset telemetry data for all providers
 */
router.post('/reset-telemetry', async (req, res) => {
  try {
    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    providerRegistry.resetTelemetry();
    
    res.json({
      success: true,
      message: 'Telemetry data reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting telemetry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reset telemetry data'
    });
  }
});

/**
 * GET /api/llm/health
 * Health check endpoint for LLM providers
 */
router.get('/health', async (req, res) => {
  try {
    if (!providerRegistry.initialized) {
      await providerRegistry.initialize();
    }

    const status = providerRegistry.getProviderStatus();
    const hasAvailableProviders = status.availableProviders.length > 0;
    
    res.status(hasAvailableProviders ? 200 : 503).json({
      healthy: hasAvailableProviders,
      totalProviders: status.totalProviders,
      availableProviders: status.availableProviders.length,
      defaultProvider: status.defaultProvider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking LLM health:', error);
    res.status(503).json({
      healthy: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('LLM API error:', error);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred in the LLM API',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;