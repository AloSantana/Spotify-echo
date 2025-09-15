const express = require('express');
const path = require('path');

const router = express.Router();

/**
 * Main page - React Application
 * GET /
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

/**
 * Legacy interface (for comparison)
 * GET /legacy
 */
router.get('/legacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

/**
 * Catch-all handler for React Router (client-side routing)
 * Handle all non-API routes for SPA
 */
router.get('*', (req, res) => {
  // Only serve the React app for non-API routes and non-asset routes
  if (!req.path.startsWith('/api/') && 
      !req.path.startsWith('/auth/') && 
      !req.path.startsWith('/internal/') &&
      !req.path.startsWith('/assets/') &&
      !req.path.startsWith('/frontend/') &&
      !req.path.startsWith('/src/') &&
      !req.path.startsWith('/docs/') &&
      !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  } else {
    // Let the 404 handler take care of API routes and assets (will be handled by static middleware)
    const { createNotFoundError } = require('../errors/createError');
    const error = createNotFoundError('Resource', req.path);
    
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp
      }
    });
  }
});

module.exports = router;