/**
 * Legacy User Settings API Routes 
 * Backward compatibility endpoints that delegate to /api/settings
 * 
 * These routes provide compatibility for clients expecting /api/user-settings
 * All functionality is implemented in the canonical /api/settings routes
 */

const express = require('express');
const router = express.Router();

// Import the canonical settings routes
const settingsRoutes = require('./settings');

/**
 * GET /api/user-settings
 * Legacy alias for GET /api/settings
 */
router.get('/', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * PUT /api/user-settings  
 * Legacy alias for PUT /api/settings
 */
router.put('/', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * PATCH /api/user-settings
 * Legacy alias for PATCH /api/settings  
 */
router.patch('/', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * DELETE /api/user-settings
 * Legacy alias for DELETE /api/settings
 */
router.delete('/', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * GET /api/user-settings/defaults
 * Legacy alias for GET /api/settings/defaults
 */
router.get('/defaults', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * POST /api/user-settings/validate
 * Legacy alias for POST /api/settings/validate
 */
router.post('/validate', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * GET /api/user-settings/admin/stats
 * Legacy alias for GET /api/settings/admin/stats
 */
router.get('/admin/stats', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * GET /api/user-settings/admin/bulk
 * Legacy alias for GET /api/settings/admin/bulk
 */
router.get('/admin/bulk', (req, res, next) => {
  // Delegate to the canonical settings route
  settingsRoutes.handle(req, res, next);
});

/**
 * GET /api/user-settings/providers/status
 * Legacy alias for GET /api/providers/status
 */
router.get('/providers/status', (req, res, next) => {
  // Delegate to the providers status route
  const providersRoutes = require('./providers');
  providersRoutes.handle(req, res, next);
});

module.exports = router;