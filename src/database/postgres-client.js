/**
 * PostgreSQL Client for EchoTune AI
 * Provides singleton Prisma Client instance and common database operations
 * Coexists with MongoDB for hybrid database architecture
 */

const { PrismaClient } = require('@prisma/client');

let prismaClient = null;
let isConnected = false;

/**
 * Get or create Prisma Client singleton
 * @returns {PrismaClient} Prisma client instance
 */
function getPrismaClient() {
  if (!prismaClient) {
    const logLevel = process.env.DATABASE_LOGGING === 'true' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'];

    prismaClient = new PrismaClient({
      log: logLevel,
      errorFormat: 'pretty',
    });

    // Handle disconnection on process exit
    process.on('beforeExit', async () => {
      await prismaClient.$disconnect();
      isConnected = false;
      console.log('📊 PostgreSQL connection closed');
    });

    console.log('📊 Prisma Client initialized');
  }

  return prismaClient;
}

/**
 * Test PostgreSQL connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
  try {
    if (!process.env.POSTGRES_URL) {
      console.log('⚠️  PostgreSQL URL not configured, skipping connection');
      return false;
    }

    const prisma = getPrismaClient();
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    isConnected = true;
    console.log('✅ PostgreSQL connected successfully');
    return true;
  } catch (error) {
    isConnected = false;
    console.warn('⚠️  PostgreSQL connection failed:', error.message);
    console.log('📦 Application will continue without PostgreSQL (using MongoDB/SQLite fallback)');
    return false;
  }
}

/**
 * Get connection status
 * @returns {boolean} Is connected to PostgreSQL
 */
function getConnectionStatus() {
  return isConnected;
}

/**
 * Chat Session Operations
 */
const chatOperations = {
  /**
   * Create a new chat session
   */
  async createSession(userId, provider = 'gemini') {
    const prisma = getPrismaClient();
    return prisma.chatSession.create({
      data: {
        userId,
        provider,
        isActive: true,
        messageCount: 0,
      },
    });
  },

  /**
   * Get active session for user
   */
  async getActiveSession(userId) {
    const prisma = getPrismaClient();
    return prisma.chatSession.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  },

  /**
   * Add message to session
   */
  async addMessage(sessionId, userId, role, content, metadata = {}) {
    const prisma = getPrismaClient();
    
    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        userId,
        role,
        content,
        provider: metadata.provider,
        model: metadata.model,
        tokensUsed: metadata.tokensUsed,
        latencyMs: metadata.latencyMs,
        spotifyCommand: metadata.spotifyCommand,
        spotifyTrackId: metadata.spotifyTrackId,
        recommendedTracks: metadata.recommendedTracks,
      },
    });

    // Update session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    });

    return message;
  },

  /**
   * Get session messages
   */
  async getSessionMessages(sessionId, limit = 50) {
    const prisma = getPrismaClient();
    return prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },

  /**
   * Get recent sessions for user
   */
  async getUserSessions(userId, limit = 10) {
    const prisma = getPrismaClient();
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  },
};

/**
 * User Preferences Operations
 */
const preferencesOperations = {
  /**
   * Get user preferences
   */
  async getPreferences(userId) {
    const prisma = getPrismaClient();
    return prisma.userPreferences.findUnique({
      where: { userId },
    });
  },

  /**
   * Create or update user preferences
   */
  async upsertPreferences(userId, preferences) {
    const prisma = getPrismaClient();
    return prisma.userPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    });
  },

  /**
   * Update specific preference fields
   */
  async updatePreferences(userId, updates) {
    const prisma = getPrismaClient();
    return prisma.userPreferences.update({
      where: { userId },
      data: updates,
    });
  },
};

/**
 * User Operations
 */
const userOperations = {
  /**
   * Create or update user from Spotify profile
   */
  async upsertUser(spotifyProfile) {
    const prisma = getPrismaClient();
    return prisma.user.upsert({
      where: { spotifyId: spotifyProfile.id },
      update: {
        email: spotifyProfile.email,
        displayName: spotifyProfile.display_name,
        profileImage: spotifyProfile.images?.[0]?.url,
        isPremium: spotifyProfile.product === 'premium',
        country: spotifyProfile.country,
        lastLoginAt: new Date(),
      },
      create: {
        spotifyId: spotifyProfile.id,
        email: spotifyProfile.email,
        displayName: spotifyProfile.display_name,
        profileImage: spotifyProfile.images?.[0]?.url,
        isPremium: spotifyProfile.product === 'premium',
        country: spotifyProfile.country,
        lastLoginAt: new Date(),
      },
    });
  },

  /**
   * Get user by Spotify ID
   */
  async getUserBySpotifyId(spotifyId) {
    const prisma = getPrismaClient();
    return prisma.user.findUnique({
      where: { spotifyId },
      include: {
        preferences: true,
      },
    });
  },

  /**
   * Get user with preferences
   */
  async getUserWithPreferences(userId) {
    const prisma = getPrismaClient();
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });
  },
};

/**
 * Provider Health Operations
 */
const providerOperations = {
  /**
   * Update provider health status
   */
  async updateHealth(provider, status) {
    const prisma = getPrismaClient();
    return prisma.providerHealth.upsert({
      where: { provider },
      update: {
        isAvailable: status.isAvailable,
        lastCheckAt: new Date(),
        responseTimeMs: status.responseTimeMs,
        errorCount: status.isAvailable ? 0 : { increment: 1 },
        lastError: status.error,
        lastErrorAt: status.error ? new Date() : undefined,
        requestCount: { increment: 1 },
        successCount: status.isAvailable ? { increment: 1 } : undefined,
        failureCount: !status.isAvailable ? { increment: 1 } : undefined,
      },
      create: {
        provider,
        isAvailable: status.isAvailable,
        responseTimeMs: status.responseTimeMs,
        errorCount: status.isAvailable ? 0 : 1,
        lastError: status.error,
        lastErrorAt: status.error ? new Date() : undefined,
        requestCount: 1,
        successCount: status.isAvailable ? 1 : 0,
        failureCount: !status.isAvailable ? 1 : 0,
      },
    });
  },

  /**
   * Get all provider health statuses
   */
  async getAllHealth() {
    const prisma = getPrismaClient();
    return prisma.providerHealth.findMany({
      orderBy: { provider: 'asc' },
    });
  },

  /**
   * Get specific provider health
   */
  async getProviderHealth(provider) {
    const prisma = getPrismaClient();
    return prisma.providerHealth.findUnique({
      where: { provider },
    });
  },
};

// Export client and operations
module.exports = {
  getPrismaClient,
  testConnection,
  getConnectionStatus,
  
  // Operations
  chat: chatOperations,
  preferences: preferencesOperations,
  users: userOperations,
  providers: providerOperations,
  
  // Direct access to Prisma Client for advanced queries
  get prisma() {
    return getPrismaClient();
  },
};
