/**
 * User Settings Service Tests
 * Tests for the complete Phase 3 User Settings System
 */

const UserSettingsService = require('../../../src/services/UserSettingsService');

// Mock MongoDB manager at the module level
const mockCollection = {
  createIndex: jest.fn().mockResolvedValue(true),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  insertOne: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn()
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection)
};

// Mock the MongoDB manager
jest.mock('../../../src/database/mongodb-manager', () => {
  return jest.fn().mockImplementation(() => ({
    _isConnected: true,
    db: mockDb,
    connect: jest.fn().mockResolvedValue(true)
  }));
});

describe('UserSettingsService', () => {
  let settingsService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    settingsService = new UserSettingsService();
  });

  describe('Default Settings', () => {
    test('should load default settings from file', () => {
      const defaults = settingsService.getDefaultSettings();
      
      expect(defaults).toHaveProperty('llmProvider');
      expect(defaults).toHaveProperty('strategyWeights');
      expect(defaults).toHaveProperty('privacy');
      expect(defaults).toHaveProperty('playlistDefaults');
      expect(defaults).toHaveProperty('preferences');
      expect(defaults).toHaveProperty('createdAt');
      expect(defaults).toHaveProperty('updatedAt');
    });

    test('should normalize strategy weights correctly', () => {
      const weights = {
        collaborative: 0.5,
        content: 0.3,
        semantic: 0.1,
        diversity: 0.2
      };

      const normalized = settingsService.normalizeStrategyWeights(weights);
      
      // Check that base weights sum to 1.0
      const baseSum = normalized.collaborative + normalized.content + normalized.semantic;
      expect(Math.abs(baseSum - 1.0)).toBeLessThan(0.000001);
      
      // Diversity should remain unchanged
      expect(normalized.diversity).toBe(0.2);
    });

    test('should handle zero base weights with equal distribution', () => {
      const weights = {
        collaborative: 0,
        content: 0,
        semantic: 0,
        diversity: 0.1
      };

      const normalized = settingsService.normalizeStrategyWeights(weights);
      
      expect(normalized.collaborative).toBeCloseTo(0.333333, 6);
      expect(normalized.content).toBeCloseTo(0.333333, 6);
      expect(normalized.semantic).toBeCloseTo(0.333334, 6);
      expect(normalized.diversity).toBe(0.1);
    });
  });

  describe('Validation', () => {
    test('should validate valid settings', () => {
      const validSettings = {
        llmProvider: 'openai',
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
        playlistDefaults: {
          public: false,
          descriptionTemplate: 'My playlist',
          autoSync: true
        },
        preferences: {
          maxRecommendations: 20,
          enableExplanations: true,
          autoRefresh: false,
          compactMode: false
        }
      };

      expect(() => {
        settingsService.validateAndNormalizeSettings(validSettings);
      }).not.toThrow();
    });

    test('should reject invalid provider', () => {
      const invalidSettings = {
        llmProvider: 'invalid-provider'
      };

      expect(() => {
        settingsService.validateAndNormalizeSettings(invalidSettings);
      }).toThrow('Validation failed');
    });

    test('should reject negative weights', () => {
      const invalidSettings = {
        strategyWeights: {
          collaborative: -0.1,
          content: 0.3,
          semantic: 0.3,
          diversity: 0.1
        }
      };

      expect(() => {
        settingsService.validateAndNormalizeSettings(invalidSettings);
      }).toThrow('Validation failed');
    });

    test('should sanitize template', () => {
      const maliciousTemplate = '<script>alert("xss")</script>My playlist {{genre}}';
      const sanitized = settingsService.sanitizeTemplate(maliciousTemplate);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('{{genre}}');
      expect(sanitized).toContain('My playlist');
    });

    test('should remove invalid template tokens', () => {
      const template = 'Playlist {{genre}} with {{invalid.token}} and {{valid_token}}';
      const sanitized = settingsService.sanitizeTemplate(template);
      
      expect(sanitized).toContain('{{genre}}');
      expect(sanitized).toContain('{{valid_token}}');
      expect(sanitized).not.toContain('{{invalid.token}}');
    });
  });

  describe('CRUD Operations', () => {
    test('should create new user settings', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'new-id' });

      const updates = {
        llmProvider: 'gemini',
        privacy: { storeHistory: false, shareAnalytics: false, enableTelemetry: true }
      };

      const result = await settingsService.updateUserSettings('user123', updates);
      
      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.userId).toBe('user123');
      expect(result.llmProvider).toBe('gemini');
    });

    test('should update existing user settings', async () => {
      const existingSettings = {
        userId: 'user123',
        llmProvider: 'openai',
        updatedAt: new Date('2024-01-01')
      };

      mockCollection.findOne.mockResolvedValue(existingSettings);
      mockCollection.findOneAndUpdate.mockResolvedValue({
        value: { ...existingSettings, llmProvider: 'gemini', updatedAt: new Date() }
      });

      const updates = { llmProvider: 'gemini' };
      const result = await settingsService.updateUserSettings('user123', updates);
      
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(result.llmProvider).toBe('gemini');
    });

    test('should handle version conflict', async () => {
      const existingSettings = {
        userId: 'user123',
        llmProvider: 'openai',
        updatedAt: new Date('2024-01-02')
      };

      mockCollection.findOne.mockResolvedValue(existingSettings);

      const updates = { llmProvider: 'gemini' };
      const expectedUpdatedAt = new Date('2024-01-01'); // Older timestamp

      await expect(
        settingsService.updateUserSettings('user123', updates, expectedUpdatedAt)
      ).rejects.toMatchObject({
        code: 'VERSION_CONFLICT',
        serverVersion: existingSettings.updatedAt,
        serverState: existingSettings
      });
    });

    test('should get user settings with defaults fallback', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const settings = await settingsService.getUserSettings('user123');
      
      expect(settings.isDefault).toBe(true);
      expect(settings.userId).toBe('user123');
      expect(settings.llmProvider).toBeDefined();
    });

    test('should delete user settings', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await settingsService.deleteUserSettings('user123');
      
      expect(result).toBe(true);
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });

  describe('Alias Methods', () => {
    test('getByUserId should call getUserSettings', async () => {
      jest.spyOn(settingsService, 'getUserSettings').mockResolvedValue({ userId: 'test' });
      
      await settingsService.getByUserId('test');
      
      expect(settingsService.getUserSettings).toHaveBeenCalledWith('test');
    });

    test('upsert should call updateUserSettings', async () => {
      jest.spyOn(settingsService, 'updateUserSettings').mockResolvedValue({ userId: 'test' });
      
      await settingsService.upsert('test', {}, '2024-01-01');
      
      expect(settingsService.updateUserSettings).toHaveBeenCalledWith('test', {}, '2024-01-01');
    });

    test('getDefaults should call getDefaultSettings', () => {
      jest.spyOn(settingsService, 'getDefaultSettings').mockReturnValue({});
      
      settingsService.getDefaults();
      
      expect(settingsService.getDefaultSettings).toHaveBeenCalled();
    });
  });

  describe('Weight Normalization Edge Cases', () => {
    test('should handle floating point precision', () => {
      const weights = {
        collaborative: 0.333333,
        content: 0.333333,
        semantic: 0.333334,
        diversity: 0.1
      };

      const normalized = settingsService.normalizeStrategyWeights(weights);
      const sum = normalized.collaborative + normalized.content + normalized.semantic;
      
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.000001);
    });

    test('should preserve diversity weight during normalization', () => {
      const weights = {
        collaborative: 0.6,
        content: 0.3,
        semantic: 0.2,
        diversity: 0.5
      };

      const normalized = settingsService.normalizeStrategyWeights(weights);
      
      expect(normalized.diversity).toBe(0.5);
    });
  });
});