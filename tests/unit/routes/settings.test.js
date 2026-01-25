/**
 * Settings API Routes Tests
 * Tests for the Phase 3 User Settings REST API endpoints
 */

const request = require('supertest');
const express = require('express');
const settingsRouter = require('../../../src/api/routes/settings');

// Mock the UserSettingsService
jest.mock('../../../src/services/UserSettingsService');

describe('Settings API Routes', () => {
  let app;
  let mockSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create Express app with settings router
    app = express();
    app.use(express.json());
    app.use('/api/settings', settingsRouter);

    // Mock the settings service
    const UserSettingsService = require('../../../src/services/UserSettingsService');
    mockSettingsService = new UserSettingsService();
    
    // Mock service methods
    mockSettingsService.getUserSettings = jest.fn();
    mockSettingsService.updateUserSettings = jest.fn();
    mockSettingsService.getDefaultSettings = jest.fn();
    mockSettingsService.deleteUserSettings = jest.fn();
    mockSettingsService.validateSettings = jest.fn();
  });

  describe('GET /api/settings', () => {
    test('should return user settings', async () => {
      const mockSettings = {
        userId: 'user123',
        llmProvider: 'openai',
        isDefault: false
      };

      mockSettingsService.getUserSettings.mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/settings')
        .set('x-user-id', 'user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSettings);
      expect(mockSettingsService.getUserSettings).toHaveBeenCalledWith('user123');
    });

    test('should return 401 without user ID', async () => {
      await request(app)
        .get('/api/settings')
        .expect(401);
    });
  });

  describe('GET /api/settings/defaults', () => {
    test('should return default settings', async () => {
      const mockDefaults = {
        llmProvider: 'openai',
        strategyWeights: { collaborative: 0.3, content: 0.3, semantic: 0.3, diversity: 0.1 }
      };

      mockSettingsService.getDefaultSettings.mockReturnValue(mockDefaults);

      const response = await request(app)
        .get('/api/settings/defaults')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDefaults);
    });
  });

  describe('GET /api/settings/providers/status', () => {
    test('should return provider status', async () => {
      const response = await request(app)
        .get('/api/settings/providers/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('providers');
      expect(response.body.data).toHaveProperty('defaultProvider');
      expect(response.body.data).toHaveProperty('availableProviders');
    });

    test('should indicate provider availability based on env vars', async () => {
      // Mock env vars
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'test-key',
        OPENROUTER_API_KEY: undefined,
        GEMINI_API_KEY: undefined
      };

      const response = await request(app)
        .get('/api/settings/providers/status')
        .expect(200);

      expect(response.body.data.providers.openai.available).toBe(true);
      expect(response.body.data.providers.openrouter.available).toBe(false);
      expect(response.body.data.providers.gemini.available).toBe(false);

      process.env = originalEnv;
    });
  });

  describe('PUT /api/settings', () => {
    test('should update user settings successfully', async () => {
      const updates = {
        llmProvider: 'gemini',
        privacy: { storeHistory: false, shareAnalytics: false, enableTelemetry: true }
      };

      const updatedSettings = {
        userId: 'user123',
        ...updates,
        updatedAt: new Date()
      };

      mockSettingsService.updateUserSettings.mockResolvedValue(updatedSettings);

      const response = await request(app)
        .put('/api/settings')
        .set('x-user-id', 'user123')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedSettings);
      expect(mockSettingsService.updateUserSettings).toHaveBeenCalledWith('user123', updates, undefined);
    });

    test('should handle optimistic concurrency with If-Unmodified-Since', async () => {
      const updates = { llmProvider: 'gemini' };
      const lastModified = '2024-01-01T00:00:00.000Z';

      mockSettingsService.updateUserSettings.mockResolvedValue({
        userId: 'user123',
        ...updates
      });

      await request(app)
        .put('/api/settings')
        .set('x-user-id', 'user123')
        .set('if-unmodified-since', lastModified)
        .send(updates)
        .expect(200);

      expect(mockSettingsService.updateUserSettings).toHaveBeenCalledWith('user123', updates, lastModified);
    });

    test('should return 409 on version conflict', async () => {
      const versionError = new Error('VERSION_CONFLICT');
      versionError.code = 'VERSION_CONFLICT';
      versionError.serverVersion = new Date();
      versionError.serverState = { userId: 'user123' };

      mockSettingsService.updateUserSettings.mockRejectedValue(versionError);

      const response = await request(app)
        .put('/api/settings')
        .set('x-user-id', 'user123')
        .send({ llmProvider: 'gemini' })
        .expect(409);

      expect(response.body.error).toBe('VERSION_CONFLICT');
      expect(response.body).toHaveProperty('serverVersion');
      expect(response.body).toHaveProperty('serverState');
    });

    test('should return 400 on validation error', async () => {
      const validationError = new Error('Validation failed: invalid provider');
      mockSettingsService.updateUserSettings.mockRejectedValue(validationError);

      const response = await request(app)
        .put('/api/settings')
        .set('x-user-id', 'user123')
        .send({ llmProvider: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should strip sensitive fields from updates', async () => {
      const updates = {
        llmProvider: 'gemini',
        userId: 'should-be-removed',
        createdAt: new Date(),
        _id: 'should-be-removed'
      };

      mockSettingsService.updateUserSettings.mockResolvedValue({});

      await request(app)
        .put('/api/settings')
        .set('x-user-id', 'user123')
        .send(updates)
        .expect(200);

      const calledWith = mockSettingsService.updateUserSettings.mock.calls[0][1];
      expect(calledWith.userId).toBeUndefined();
      expect(calledWith.createdAt).toBeUndefined();
      expect(calledWith._id).toBeUndefined();
      expect(calledWith.llmProvider).toBe('gemini');
    });
  });

  describe('POST /api/settings/validate', () => {
    test('should validate settings successfully', async () => {
      const validSettings = {
        llmProvider: 'openai',
        strategyWeights: { collaborative: 0.3, content: 0.3, semantic: 0.3, diversity: 0.1 }
      };

      mockSettingsService.validateSettings.mockReturnValue(true);

      const response = await request(app)
        .post('/api/settings/validate')
        .set('x-user-id', 'user123')
        .send(validSettings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
    });

    test('should return validation errors', async () => {
      const invalidSettings = {
        llmProvider: 'invalid-provider'
      };

      mockSettingsService.validateSettings.mockImplementation(() => {
        throw new Error('Invalid provider');
      });

      const response = await request(app)
        .post('/api/settings/validate')
        .set('x-user-id', 'user123')
        .send(invalidSettings)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toContain('Invalid provider');
    });
  });

  describe('DELETE /api/settings', () => {
    test('should delete user settings', async () => {
      mockSettingsService.deleteUserSettings.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/settings')
        .set('x-user-id', 'user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSettingsService.deleteUserSettings).toHaveBeenCalledWith('user123');
    });

    test('should handle settings not found', async () => {
      const notFoundError = new Error('User settings not found');
      mockSettingsService.deleteUserSettings.mockRejectedValue(notFoundError);

      await request(app)
        .delete('/api/settings')
        .set('x-user-id', 'user123')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    test('should handle internal server errors', async () => {
      mockSettingsService.getUserSettings.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/api/settings')
        .set('x-user-id', 'user123')
        .expect(500);
    });

    test('should require authentication for protected routes', async () => {
      await request(app)
        .get('/api/settings')
        .expect(401);

      await request(app)
        .put('/api/settings')
        .send({})
        .expect(401);

      await request(app)
        .delete('/api/settings')
        .expect(401);
    });
  });
});