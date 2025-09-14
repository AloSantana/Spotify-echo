/**
 * User Settings Service
 * Manages user preferences including LLM provider selection, strategy weights, and privacy settings
 */

const MongoDBManager = require('../database/mongodb-manager');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

class UserSettingsService {
  constructor() {
    this.db = null;
    this.collection = null;
    this.collectionName = 'user_settings';
    this.ajv = new Ajv({ allErrors: true, removeAdditional: true });
    addFormats(this.ajv);
    this.defaultSettings = null;
    this.schema = this._getValidationSchema();
    this.validate = this.ajv.compile(this.schema);
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

  _getValidationSchema() {
    return {
      type: 'object',
      additionalProperties: false,
      properties: {
        llmProvider: {
          type: 'string',
          enum: ['openai', 'openrouter', 'gemini']
        },
        llmModel: {
          type: 'string'
        },
        providerOverride: {
          type: ['string', 'null'],
          enum: ['openai', 'openrouter', 'gemini', null]
        },
        strategyWeights: {
          type: 'object',
          additionalProperties: false,
          properties: {
            collaborative: { type: 'number', minimum: 0, maximum: 1 },
            content: { type: 'number', minimum: 0, maximum: 1 },
            semantic: { type: 'number', minimum: 0, maximum: 1 },
            diversity: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['collaborative', 'content', 'semantic', 'diversity']
        },
        privacy: {
          type: 'object',
          additionalProperties: false,
          properties: {
            storeHistory: { type: 'boolean' },
            shareAnalytics: { type: 'boolean' },
            enableTelemetry: { type: 'boolean' }
          },
          required: ['storeHistory', 'shareAnalytics', 'enableTelemetry']
        },
        playlistDefaults: {
          type: 'object',
          additionalProperties: false,
          properties: {
            public: { type: 'boolean' },
            descriptionTemplate: { 
              type: 'string', 
              maxLength: 500,
              pattern: '^[^<>]*$'  // Prevent HTML/script injection
            },
            autoSync: { type: 'boolean' }
          },
          required: ['public', 'descriptionTemplate', 'autoSync']
        },
        preferences: {
          type: 'object',
          additionalProperties: false,
          properties: {
            maxRecommendations: { type: 'number', minimum: 1, maximum: 100 },
            enableExplanations: { type: 'boolean' },
            autoRefresh: { type: 'boolean' },
            compactMode: { type: 'boolean' }
          },
          required: ['maxRecommendations', 'enableExplanations', 'autoRefresh', 'compactMode']
        }
      }
    };
  }

  /**
   * Get default settings for a new user
   */
  getDefaultSettings() {
    if (!this.defaultSettings) {
      try {
        const defaultsPath = path.join(__dirname, '../../config/default-user-settings.json');
        const defaultsContent = fs.readFileSync(defaultsPath, 'utf8');
        this.defaultSettings = JSON.parse(defaultsContent);
      } catch (error) {
        console.warn('Failed to load default settings file, using hardcoded defaults:', error.message);
        // Fallback to hardcoded defaults
        this.defaultSettings = {
          llmProvider: 'openai',
          llmModel: 'gpt-4o-mini',
          providerOverride: null,
          strategyWeights: {
            collaborative: 0.333333,
            content: 0.333333,
            semantic: 0.333334,
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
          }
        };
      }
    }
    
    return {
      ...this.defaultSettings,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get user settings by userId (alias for getUserSettings)
   */
  async getByUserId(userId) {
    return this.getUserSettings(userId);
  }

  /**
   * Upsert user settings with optimistic concurrency
   */
  async upsert(userId, payload, expectedUpdatedAt = null) {
    return this.updateUserSettings(userId, payload, expectedUpdatedAt);
  }

  /**
   * Get default settings (alias for getDefaultSettings)
   */
  getDefaults() {
    return this.getDefaultSettings();
  }
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
  async updateUserSettings(userId, updates, expectedUpdatedAt = null) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!this.collection) {
        await this.initialize();
      }

      // Validate and sanitize updates
      const sanitizedUpdates = this.validateAndNormalizeSettings(updates);

      const now = new Date();
      const updateDoc = {
        ...sanitizedUpdates,
        updatedAt: now
      };

      // Check if user exists first
      const existingUser = await this.collection.findOne({ userId });
      
      if (!existingUser) {
        // New user - create with defaults merged
        const defaultSettings = this.getDefaultSettings();
        const newUserDoc = {
          userId,
          ...defaultSettings,
          ...updateDoc,
          createdAt: now,
          updatedAt: now
        };

        const result = await this.collection.insertOne(newUserDoc);
        return { ...newUserDoc, _id: result.insertedId };
      }

      // Existing user - check optimistic concurrency
      const query = { userId };
      if (expectedUpdatedAt) {
        // Convert to Date if string
        const expectedDate = new Date(expectedUpdatedAt);
        const actualDate = new Date(existingUser.updatedAt);
        
        if (actualDate.getTime() !== expectedDate.getTime()) {
          // Version conflict - return current state
          const conflictError = new Error('VERSION_CONFLICT');
          conflictError.code = 'VERSION_CONFLICT';
          conflictError.serverVersion = existingUser.updatedAt;
          conflictError.serverState = existingUser;
          throw conflictError;
        }
      }

      const result = await this.collection.findOneAndUpdate(
        query,
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Failed to update user settings');
      }

      console.log(`✅ Updated settings for user ${userId}`);
      return result.value;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Validate and normalize settings with AJV
   */
  validateAndNormalizeSettings(settings) {
    // First validate with AJV schema
    const valid = this.validate(settings);
    if (!valid) {
      const errors = this.validate.errors.map(err => 
        `${err.instancePath || 'root'} ${err.message}`
      ).join('; ');
      throw new Error(`Validation failed: ${errors}`);
    }

    // Clone to avoid mutating input
    const normalized = JSON.parse(JSON.stringify(settings));

    // Normalize strategy weights if present
    if (normalized.strategyWeights) {
      normalized.strategyWeights = this.normalizeStrategyWeights(normalized.strategyWeights);
    }

    // Sanitize template if present
    if (normalized.playlistDefaults?.descriptionTemplate) {
      normalized.playlistDefaults.descriptionTemplate = this.sanitizeTemplate(
        normalized.playlistDefaults.descriptionTemplate
      );
    }

    return normalized;
  }

  /**
   * Normalize strategy weights so collaborative+content+semantic = 1.0
   */
  normalizeStrategyWeights(weights) {
    const { collaborative, content, semantic, diversity } = weights;
    
    // Check if all three base weights are zero
    const baseSum = collaborative + content + semantic;
    if (baseSum === 0) {
      // Equal distribution fallback
      return {
        collaborative: 0.333333,
        content: 0.333333,
        semantic: 0.333334,
        diversity: diversity || 0.1
      };
    }

    // Normalize to sum = 1.0 with 6 decimal precision
    const factor = 1.0 / baseSum;
    return {
      collaborative: Math.round(collaborative * factor * 1000000) / 1000000,
      content: Math.round(content * factor * 1000000) / 1000000,
      semantic: Math.round(semantic * factor * 1000000) / 1000000,
      diversity: diversity // Not normalized into the base sum
    };
  }

  /**
   * Sanitize playlist description template
   */
  sanitizeTemplate(template) {
    if (typeof template !== 'string') {
      return 'AI-generated playlist by EchoTune';
    }

    // Remove any HTML/script tags and limit length
    let sanitized = template
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .trim();

    // Limit length
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 497) + '...';
    }

    // Allow only simple token placeholders {{token}} and plain text
    sanitized = sanitized.replace(/\{\{([^}]+)\}\}/g, (match, token) => {
      // Only allow alphanumeric tokens and common words
      if (/^[a-zA-Z0-9_\s]+$/.test(token.trim())) {
        return `{{${token.trim()}}}`;
      }
      return ''; // Remove invalid tokens
    });

    return sanitized || 'AI-generated playlist by EchoTune';
  }

  /**
   * Legacy validation method - now mostly handled by AJV
   */
  validateSettings(settings) {
    // This method is kept for backward compatibility
    // Most validation is now handled by validateAndNormalizeSettings
    try {
      this.validateAndNormalizeSettings(settings);
    } catch (error) {
      throw error;
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