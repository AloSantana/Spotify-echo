let PrismaClient;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (error) {
  // Prisma client not generated yet
  PrismaClient = null;
}

/**
 * Chat Persistence Service
 * Handles all PostgreSQL operations for chat sessions and messages
 */
class ChatPersistenceService {
  constructor() {
    if (!PrismaClient) {
      const errorMsg = [
        '\n❌ Prisma client not initialized.',
        '📋 To fix this issue:',
        '   1. Ensure you have POSTGRES_URL set in your .env file',
        '   2. Run: npm run db:generate',
        '   3. Run: npm run db:push (to sync your database schema)',
        '   4. Restart the server with: npm start',
        '\n💡 For quick setup: npm run db:init\n'
      ].join('\n');
      
      console.error(errorMsg);
      throw new Error('Prisma client not generated. Run "npm run db:generate" first.');
    }
    
    this.prisma = new PrismaClient();
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Test connection
      await this.prisma.$connect();
      this.initialized = true;
      console.log('✅ Chat Persistence Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Chat Persistence Service:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Create or get existing chat session
   */
  async getOrCreateSession(userId, options = {}) {
    try {
      const { sessionId, provider, model, systemPrompt } = options;

      // If sessionId provided, try to get existing session
      if (sessionId) {
        const existing = await this.prisma.chatSession.findUnique({
          where: { id: sessionId },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 50 // Last 50 messages for context
            }
          }
        });

        if (existing) {
          // Update session as active
          await this.prisma.chatSession.update({
            where: { id: sessionId },
            data: {
              lastMessageAt: new Date(),
              isActive: true
            }
          });
          return existing;
        }
      }

      // Create new session
      const newSession = await this.prisma.chatSession.create({
        data: {
          id: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          provider: provider || 'gemini',
          model,
          systemPrompt,
          isActive: true,
          messageCount: 0,
          lastMessageAt: new Date()
        },
        include: {
          messages: true
        }
      });

      return newSession;
    } catch (error) {
      console.error('Error creating/getting session:', error);
      throw new Error(`Failed to manage chat session: ${error.message}`);
    }
  }

  /**
   * Save a message to the database
   */
  async saveMessage(sessionId, messageData) {
    try {
      const {
        role,
        content,
        provider,
        model,
        tokensUsed,
        latencyMs,
        spotifyCommand,
        spotifyTrackId,
        spotifyPlaylistId,
        recommendedTracks,
        userId
      } = messageData;

      const message = await this.prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role, // 'user' or 'assistant'
          content,
          provider,
          model,
          tokensUsed,
          latencyMs,
          spotifyCommand,
          spotifyTrackId,
          spotifyPlaylistId,
          recommendedTracks: recommendedTracks ? JSON.parse(JSON.stringify(recommendedTracks)) : null
        }
      });

      // Update session message count
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date()
        }
      });

      return message;
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error(`Failed to save message: ${error.message}`);
    }
  }

  /**
   * Get chat history for a session
   */
  async getSessionHistory(sessionId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const messages = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit
      });

      return messages;
    } catch (error) {
      console.error('Error getting session history:', error);
      throw new Error(`Failed to get session history: ${error.message}`);
    }
  }

  /**
   * Get user's chat sessions
   */
  async getUserSessions(userId, options = {}) {
    try {
      const { limit = 20, includeInactive = false } = options;

      const where = { userId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const sessions = await this.prisma.chatSession.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  /**
   * Update session metadata
   */
  async updateSession(sessionId, updates) {
    try {
      const allowedUpdates = {
        title: updates.title,
        provider: updates.provider,
        model: updates.model,
        isActive: updates.isActive,
        systemPrompt: updates.systemPrompt,
        contextSummary: updates.contextSummary
      };

      // Remove undefined values
      Object.keys(allowedUpdates).forEach(key => 
        allowedUpdates[key] === undefined && delete allowedUpdates[key]
      );

      const session = await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: allowedUpdates
      });

      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId) {
    try {
      // Cascade delete will handle messages
      await this.prisma.chatSession.delete({
        where: { id: sessionId }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    try {
      let preferences = await this.prisma.userPreferences.findUnique({
        where: { userId }
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await this.prisma.userPreferences.create({
          data: {
            userId,
            preferredLLMProvider: 'gemini',
            enabledProviders: ['gemini', 'openai', 'mock']
          }
        });
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error(`Failed to get user preferences: ${error.message}`);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, updates) {
    try {
      const preferences = await this.prisma.userPreferences.upsert({
        where: { userId },
        update: updates,
        create: {
          userId,
          ...updates
        }
      });

      return preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }
  }

  /**
   * Save or update AI-generated playlist
   */
  async savePlaylist(userId, playlistData) {
    try {
      const {
        spotifyId,
        name,
        description,
        isPublic,
        generatedByAI,
        generationPrompt,
        generatedWith,
        tags,
        mood,
        targetEnergy,
        targetDuration
      } = playlistData;

      const playlist = await this.prisma.playlist.upsert({
        where: { spotifyId: spotifyId || `local_${Date.now()}` },
        update: {
          name,
          description,
          lastSyncedAt: new Date()
        },
        create: {
          userId,
          spotifyId,
          name,
          description,
          isPublic: isPublic || false,
          generatedByAI: generatedByAI || false,
          generationPrompt,
          generatedWith,
          tags: tags || [],
          mood,
          targetEnergy,
          targetDuration
        }
      });

      return playlist;
    } catch (error) {
      console.error('Error saving playlist:', error);
      throw new Error(`Failed to save playlist: ${error.message}`);
    }
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(userId, options = {}) {
    try {
      const { generatedByAI, limit = 50 } = options;

      const where = { userId };
      if (generatedByAI !== undefined) {
        where.generatedByAI = generatedByAI;
      }

      const playlists = await this.prisma.playlist.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      return playlists;
    } catch (error) {
      console.error('Error getting user playlists:', error);
      throw new Error(`Failed to get user playlists: ${error.message}`);
    }
  }

  /**
   * Record provider health metrics
   */
  async recordProviderHealth(provider, metrics) {
    try {
      const {
        isAvailable,
        responseTimeMs,
        errorCount,
        lastError,
        requestCount,
        successCount,
        failureCount
      } = metrics;

      await this.prisma.providerHealth.upsert({
        where: { provider },
        update: {
          isAvailable: isAvailable !== undefined ? isAvailable : true,
          lastCheckAt: new Date(),
          responseTimeMs,
          errorCount: errorCount || 0,
          lastError,
          lastErrorAt: lastError ? new Date() : undefined,
          requestCount: requestCount || 0,
          successCount: successCount || 0,
          failureCount: failureCount || 0
        },
        create: {
          provider,
          isAvailable: isAvailable !== undefined ? isAvailable : true,
          lastCheckAt: new Date(),
          responseTimeMs,
          errorCount: errorCount || 0,
          lastError,
          requestCount: requestCount || 0,
          successCount: successCount || 0,
          failureCount: failureCount || 0
        }
      });
    } catch (error) {
      console.error('Error recording provider health:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get all provider health data
   */
  async getAllProviderHealth() {
    try {
      const healthData = await this.prisma.providerHealth.findMany({
        orderBy: { lastCheckAt: 'desc' }
      });

      return healthData;
    } catch (error) {
      console.error('Error getting provider health:', error);
      return [];
    }
  }

  /**
   * Cleanup old inactive sessions
   */
  async cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.chatSession.deleteMany({
        where: {
          isActive: false,
          lastMessageAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`🧹 Cleaned up ${result.count} old chat sessions`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      return { count: 0 };
    }
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Chat Persistence Service disconnected');
    } catch (error) {
      console.error('Error disconnecting Chat Persistence Service:', error);
    }
  }
}

// Singleton instance
let chatPersistenceService = null;

/**
 * Get or create the ChatPersistenceService singleton
 */
function getChatPersistenceService() {
  if (!chatPersistenceService) {
    chatPersistenceService = new ChatPersistenceService();
  }
  return chatPersistenceService;
}

module.exports = {
  ChatPersistenceService,
  getChatPersistenceService
};
