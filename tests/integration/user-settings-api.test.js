/**
 * User Settings API Tests
 * Integration tests for Phase 3 User Settings API endpoints
 */

const request = require('supertest');
const express = require('express');
const settingsRoutes = require('../../src/routes/settings');
const legacyUserSettingsRoutes = require('../../src/routes/user-settings');

// Mock the UserSettingsService
jest.mock('../../src/services/UserSettingsService', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    getUserSettings: jest.fn(),
    updateUserSettings: jest.fn(),
    deleteUserSettings: jest.fn(),
    validateSettings: jest.fn(),
    getDefaultSettings: jest.fn(),
    getBulkUserSettings: jest.fn(),
    getUsageStatistics: jest.fn()
  }));
});

// Create test app
const createTestApp = (routes) => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware
  app.use((req, res, next) => {
    req.userId = req.headers['x-user-id'] || 'test-user-123';
    req.user = { id: req.userId, role: 'user' };
    next();
  });
  
  app.use('/', routes);
  return app;
};

describe('User Settings API', () => {
  let settingsApp;
  let legacyApp;
  let mockService;

  beforeEach(() => {
    settingsApp = createTestApp(settingsRoutes);
    legacyApp = createTestApp(legacyUserSettingsRoutes);
    
    // Get the mocked service instance
    const UserSettingsService = require('../../src/services/UserSettingsService');
    mockService = new UserSettingsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Canonical Settings Endpoints (/api/settings)', () => {
    describe('GET /api/settings', () => {
      test('should return user settings successfully', async () => {
        const mockSettings = {
          userId: 'test-user-123',
          llmProvider: 'openai',
          llmModel: 'gpt-4o-mini',
          strategyWeights: {
            collaborative: 0.3,
            content: 0.3,
            semantic: 0.3,
            diversity: 0.1
          },
          privacy: {
            storeHistory: true,
            shareAnalytics: false,
            enableTelemetry: true
          },
          updatedAt: new Date('2024-01-15T10:30:00.000Z'),
          isDefault: false
        };

        mockService.getUserSettings.mockResolvedValue(mockSettings);

        const response = await request(settingsApp)
          .get('/')
          .set('X-User-ID', 'test-user-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject(mockSettings);
        expect(response.body.timestamp).toBeDefined();
      });

      test('should return 401 when user not authenticated', async () => {
        const response = await request(settingsApp)
          .get('/')
          .expect(401);

        expect(response.body.error).toBe('Authentication required');
      });
    });

    describe('PUT /api/settings', () => {
      test('should update settings with optimistic concurrency (updatedAt in body)', async () => {
        const updateData = {
          llmProvider: 'gemini',
          updatedAt: '2024-01-15T10:30:00.000Z'
        };

        const updatedSettings = {
          userId: 'test-user-123',
          llmProvider: 'gemini',
          updatedAt: new Date('2024-01-15T10:31:00.000Z')
        };

        mockService.updateUserSettings.mockResolvedValue(updatedSettings);

        const response = await request(settingsApp)
          .put('/')
          .set('X-User-ID', 'test-user-123')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.llmProvider).toBe('gemini');
        expect(mockService.updateUserSettings).toHaveBeenCalledWith(
          'test-user-123',
          updateData,
          undefined // no header timestamp
        );
      });

      test('should handle version conflict with proper error format', async () => {
        const updateData = {
          llmProvider: 'gemini',
          updatedAt: '2024-01-15T10:00:00.000Z' // Old timestamp
        };

        const conflictError = new Error('Settings were modified by another process. Please refresh and try again.');
        conflictError.code = 'VERSION_CONFLICT';
        conflictError.serverVersion = new Date('2024-01-15T10:30:00.000Z');
        conflictError.serverState = {
          userId: 'test-user-123',
          llmProvider: 'openai',
          updatedAt: new Date('2024-01-15T10:30:00.000Z')
        };

        mockService.updateUserSettings.mockRejectedValue(conflictError);

        const response = await request(settingsApp)
          .put('/')
          .set('X-User-ID', 'test-user-123')
          .send(updateData)
          .expect(409);

        expect(response.body.error).toBe('VERSION_CONFLICT');
        expect(response.body.message).toContain('Settings were modified by another process');
        expect(response.body.serverVersion).toBeDefined();
        expect(response.body.serverState).toBeDefined();
        expect(response.body.serverState.llmProvider).toBe('openai');
      });

      test('should support legacy If-Unmodified-Since header', async () => {
        const updateData = {
          llmProvider: 'gemini'
          // No updatedAt in body
        };

        const updatedSettings = {
          userId: 'test-user-123',
          llmProvider: 'gemini',
          updatedAt: new Date('2024-01-15T10:31:00.000Z')
        };

        mockService.updateUserSettings.mockResolvedValue(updatedSettings);

        const response = await request(settingsApp)
          .put('/')
          .set('X-User-ID', 'test-user-123')
          .set('If-Unmodified-Since', 'Mon, 15 Jan 2024 10:30:00 GMT')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockService.updateUserSettings).toHaveBeenCalledWith(
          'test-user-123',
          updateData,
          'Mon, 15 Jan 2024 10:30:00 GMT'
        );
      });

      test('should handle validation errors', async () => {
        const invalidData = {
          llmProvider: 'invalid-provider',
          updatedAt: '2024-01-15T10:30:00.000Z'
        };

        const validationError = new Error('Invalid LLM provider specified');
        mockService.updateUserSettings.mockRejectedValue(validationError);

        const response = await request(settingsApp)
          .put('/')
          .set('X-User-ID', 'test-user-123')
          .send(invalidData)
          .expect(400);

        expect(response.body.error).toBe('VALIDATION_ERROR');
        expect(response.body.message).toContain('Invalid LLM provider');
      });
    });

    describe('PATCH /api/settings', () => {
      test('should partially update settings', async () => {
        const partialUpdate = {
          privacy: {
            storeHistory: false
          },
          updatedAt: '2024-01-15T10:30:00.000Z'
        };

        const updatedSettings = {
          userId: 'test-user-123',
          privacy: {
            storeHistory: false,
            shareAnalytics: false,
            enableTelemetry: true
          },
          updatedAt: new Date('2024-01-15T10:31:00.000Z')
        };

        mockService.updateUserSettings.mockResolvedValue(updatedSettings);

        const response = await request(settingsApp)
          .patch('/')
          .set('X-User-ID', 'test-user-123')
          .send(partialUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.privacy.storeHistory).toBe(false);
      });
    });

    describe('GET /api/settings/defaults', () => {
      test('should return default settings', async () => {
        const defaultSettings = {
          llmProvider: 'openai',
          llmModel: 'gpt-4o-mini',
          strategyWeights: {
            collaborative: 0.3,
            content: 0.3,
            semantic: 0.3,
            diversity: 0.1
          },
          privacy: {
            storeHistory: true,
            shareAnalytics: false,
            enableTelemetry: true
          }
        };

        mockService.getDefaultSettings.mockReturnValue(defaultSettings);

        const response = await request(settingsApp)
          .get('/defaults')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject(defaultSettings);
      });
    });
  });

  describe('Legacy User Settings Endpoints (/api/user-settings)', () => {
    test('should route GET /api/user-settings to canonical implementation', async () => {
      const mockSettings = {
        userId: 'test-user-123',
        llmProvider: 'openai',
        isDefault: false
      };

      mockService.getUserSettings.mockResolvedValue(mockSettings);

      const response = await request(legacyApp)
        .get('/')
        .set('X-User-ID', 'test-user-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(mockSettings);
    });

    test('should route PUT /api/user-settings to canonical implementation', async () => {
      const updateData = {
        llmProvider: 'gemini',
        updatedAt: '2024-01-15T10:30:00.000Z'
      };

      const updatedSettings = {
        userId: 'test-user-123',
        llmProvider: 'gemini'
      };

      mockService.updateUserSettings.mockResolvedValue(updatedSettings);

      const response = await request(legacyApp)
        .put('/')
        .set('X-User-ID', 'test-user-123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.llmProvider).toBe('gemini');
    });

    test('should route GET /api/user-settings/defaults to canonical implementation', async () => {
      const defaultSettings = {
        llmProvider: 'openai',
        llmModel: 'gpt-4o-mini'
      };

      mockService.getDefaultSettings.mockReturnValue(defaultSettings);

      const response = await request(legacyApp)
        .get('/defaults')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(defaultSettings);
    });
  });

  describe('Error Response Consistency', () => {
    test('should return consistent error format for authentication failures', async () => {
      const response = await request(settingsApp)
        .get('/')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Authentication required');
    });

    test('should return consistent error format for validation failures', async () => {
      const invalidData = { invalid: 'data' };
      
      const validationError = new Error('Invalid settings format');
      mockService.updateUserSettings.mockRejectedValue(validationError);

      const response = await request(settingsApp)
        .put('/')
        .set('X-User-ID', 'test-user-123')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    test('should return consistent error format for internal server errors', async () => {
      const serverError = new Error('Database connection failed');
      mockService.getUserSettings.mockRejectedValue(serverError);

      const response = await request(settingsApp)
        .get('/')
        .set('X-User-ID', 'test-user-123')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Provider Fallback Integration', () => {
    test('should handle provider fallback gracefully', async () => {
      const updateData = {
        llmProvider: 'unavailable-provider',
        updatedAt: '2024-01-15T10:30:00.000Z'
      };

      // Mock fallback scenario - service returns different provider
      const fallbackSettings = {
        userId: 'test-user-123',
        llmProvider: 'gemini', // Fallback provider
        updatedAt: new Date('2024-01-15T10:31:00.000Z')
      };

      mockService.updateUserSettings.mockResolvedValue(fallbackSettings);

      const response = await request(settingsApp)
        .put('/')
        .set('X-User-ID', 'test-user-123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.llmProvider).toBe('gemini');
      
      // In a real implementation, we might expect a warning about fallback
      // For now, we're testing the data flow
    });
  });

  describe('Privacy Gating Integration', () => {
    test('should accept privacy settings updates', async () => {
      const privacyUpdate = {
        privacy: {
          storeHistory: false,
          shareAnalytics: false,
          enableTelemetry: false
        },
        updatedAt: '2024-01-15T10:30:00.000Z'
      };

      const updatedSettings = {
        userId: 'test-user-123',
        privacy: privacyUpdate.privacy,
        updatedAt: new Date('2024-01-15T10:31:00.000Z')
      };

      mockService.updateUserSettings.mockResolvedValue(updatedSettings);

      const response = await request(settingsApp)
        .put('/')
        .set('X-User-ID', 'test-user-123')
        .send(privacyUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.privacy.storeHistory).toBe(false);
      expect(response.body.data.privacy.shareAnalytics).toBe(false);
    });
  });
});