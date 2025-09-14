/**
 * User Settings Service
 * Manages user preferences including LLM provider selection, strategy weights, and privacy settings
 */

const MongoDBManager = require('../database/mongodb-manager');

class UserSettingsService {
  constructor() {
    this.db = null;
    this.collection = null;
    this.collectionName = 'user_settings';
  }

  async initialize() {
    try {
      // Get MongoDB connection
      const mongoManager = new MongoDBManager();
      if (!mongoManager._isConnected) {
        await mongoManager.connect();
      }
      
      this.db = mongoManager.db;
      if (!this.db) {
        throw new Error('MongoDB connection not available');
      }

      this.collection = this.db.collection(this.collectionName);
      
      // Create indexes
      await this.createIndexes();
      
      console.log('✅ UserSettingsService initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize UserSettingsService:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      // Create compound index for efficient lookups
      await this.collection.createIndex({ userId: 1 }, { unique: true });
      await this.collection.createIndex({ updatedAt: -1 });
      console.log('✅ User settings indexes created');
    } catch (error) {
      console.warn('⚠️ Failed to create user settings indexes:', error.message);
    }
  }

  /**
   * Get default settings for a new user
   */
  getDefaultSettings() {
    return {
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
      playlistDefaults: {
        public: false,
        descriptionTemplate: 'AI-generated playlist by EchoTune',
        autoSync: true
      },
      preferences: {
        maxRecommendations: 20,
        enableExplanations: true,
        autoRefresh: false,
        compactMode: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!this.collection) {
        await this.initialize();
      }

      const settings = await this.collection.findOne({ userId });
      
      if (!settings) {
        // Return default settings for new users
        const defaultSettings = this.getDefaultSettings();
        return {
          userId,
          ...defaultSettings,
          isDefault: true
        };
      }

      return {
        ...settings,
        isDefault: false
      };
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw new Error(`Failed to get user settings: ${error.message}`);
    }
  }

  /**
   * Update user settings with optimistic concurrency control
   */
  async updateUserSettings(userId, updates, lastUpdated = null) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!this.collection) {
        await this.initialize();
      }

      // Validate updates
      this.validateSettings(updates);

      const now = new Date();
      const updateDoc = {
        ...updates,
        updatedAt: now
      };

      // Build query with optimistic concurrency check
      const query = { userId };
      if (lastUpdated) {
        query.updatedAt = { $lte: new Date(lastUpdated) };
      }

      // Upsert with optimistic concurrency
      const options = {
        upsert: true,
        returnDocument: 'after'
      };

      // If this is a new user, include defaults
      if (!(await this.collection.findOne({ userId }))) {
        const defaultSettings = this.getDefaultSettings();
        updateDoc.userId = userId;
        updateDoc.createdAt = now;
        Object.keys(defaultSettings).forEach(key => {
          if (!(key in updateDoc)) {
            updateDoc[key] = defaultSettings[key];
          }
        });
      }

      const result = await this.collection.findOneAndUpdate(
        query,
        { $set: updateDoc },
        options
      );

      if (!result.value) {
        // Concurrency conflict detected
        const currentSettings = await this.getUserSettings(userId);
        throw new Error('Settings were modified by another process. Please refresh and try again.', {
          code: 'CONCURRENCY_CONFLICT',
          currentSettings
        });
      }

      console.log(`✅ Updated settings for user ${userId}`);
      return result.value;
    } catch (error) {
      console.error('Error updating user settings:', error);
      if (error.message.includes('CONCURRENCY_CONFLICT')) {
        throw error;
      }
      throw new Error(`Failed to update user settings: ${error.message}`);
    }
  }

  /**
   * Validate settings object
   */
  validateSettings(settings) {
    // Validate LLM provider
    if (settings.llmProvider) {
      const validProviders = ['openai', 'openrouter', 'gemini'];
      if (!validProviders.includes(settings.llmProvider)) {
        throw new Error(`Invalid LLM provider: ${settings.llmProvider}. Must be one of: ${validProviders.join(', ')}`);
      }
    }

    // Validate strategy weights
    if (settings.strategyWeights) {
      const weights = settings.strategyWeights;
      const requiredKeys = ['collaborative', 'content', 'semantic', 'diversity'];
      
      for (const key of requiredKeys) {
        if (key in weights) {
          const value = weights[key];
          if (typeof value !== 'number' || value < 0 || value > 1) {
            throw new Error(`Strategy weight ${key} must be a number between 0 and 1`);
          }
        }
      }

      // Check that weights sum to approximately 1 (allowing for floating point precision)
      const validKeys = Object.keys(weights).filter(k => requiredKeys.includes(k));
      if (validKeys.length === requiredKeys.length) {
        const sum = validKeys.reduce((acc, key) => acc + weights[key], 0);
        if (Math.abs(sum - 1.0) > 0.01) {
          throw new Error('Strategy weights must sum to 1.0');
        }
      }
    }

    // Validate privacy settings
    if (settings.privacy) {
      const privacy = settings.privacy;
      ['storeHistory', 'shareAnalytics', 'enableTelemetry'].forEach(key => {
        if (key in privacy && typeof privacy[key] !== 'boolean') {
          throw new Error(`Privacy setting ${key} must be a boolean`);
        }
      });
    }

    // Validate preferences
    if (settings.preferences) {
      const prefs = settings.preferences;
      if (prefs.maxRecommendations && (typeof prefs.maxRecommendations !== 'number' || prefs.maxRecommendations < 1 || prefs.maxRecommendations > 100)) {
        throw new Error('maxRecommendations must be a number between 1 and 100');
      }
    }
  }

  /**
   * Delete user settings
   */
  async deleteUserSettings(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!this.collection) {
        await this.initialize();
      }

      const result = await this.collection.deleteOne({ userId });
      
      if (result.deletedCount === 0) {
        throw new Error('User settings not found');
      }

      console.log(`✅ Deleted settings for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting user settings:', error);
      throw new Error(`Failed to delete user settings: ${error.message}`);
    }
  }

  /**
   * Get settings for multiple users (admin function)
   */
  async getBulkUserSettings(userIds, limit = 100) {
    try {
      if (!Array.isArray(userIds)) {
        throw new Error('User IDs must be an array');
      }

      if (!this.collection) {
        await this.initialize();
      }

      const settings = await this.collection
        .find({ userId: { $in: userIds } })
        .limit(limit)
        .toArray();

      return settings;
    } catch (error) {
      console.error('Error getting bulk user settings:', error);
      throw new Error(`Failed to get bulk user settings: ${error.message}`);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics() {
    try {
      if (!this.collection) {
        await this.initialize();
      }

      const stats = await this.collection.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            providerUsage: {
              $push: '$llmProvider'
            },
            avgRecommendations: { $avg: '$preferences.maxRecommendations' },
            privacyStats: {
              $push: {
                storeHistory: '$privacy.storeHistory',
                shareAnalytics: '$privacy.shareAnalytics'
              }
            }
          }
        },
        {
          $project: {
            totalUsers: 1,
            providerCounts: {
              openai: {
                $size: {
                  $filter: {
                    input: '$providerUsage',
                    cond: { $eq: ['$$this', 'openai'] }
                  }
                }
              },
              openrouter: {
                $size: {
                  $filter: {
                    input: '$providerUsage',
                    cond: { $eq: ['$$this', 'openrouter'] }
                  }
                }
              },
              gemini: {
                $size: {
                  $filter: {
                    input: '$providerUsage',
                    cond: { $eq: ['$$this', 'gemini'] }
                  }
                }
              }
            },
            avgRecommendations: 1,
            privacyOptIn: {
              $size: {
                $filter: {
                  input: '$privacyStats',
                  cond: { $eq: ['$$this.shareAnalytics', true] }
                }
              }
            }
          }
        }
      ]).toArray();

      return stats[0] || {
        totalUsers: 0,
        providerCounts: { openai: 0, openrouter: 0, gemini: 0 },
        avgRecommendations: 20,
        privacyOptIn: 0
      };
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      throw new Error(`Failed to get usage statistics: ${error.message}`);
    }
  }
}

module.exports = UserSettingsService;