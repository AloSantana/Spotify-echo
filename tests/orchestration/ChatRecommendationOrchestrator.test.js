/**
 * ChatRecommendationOrchestrator Tests
 * 
 * Basic tests for the core product orchestrator to validate functionality
 * and ensure proper integration between components.
 */

const { ChatRecommendationOrchestrator } = require('../../src/orchestration/ChatRecommendationOrchestrator');

// Mock dependencies to avoid requiring full infrastructure
jest.mock('../../src/database/database-manager', () => ({
  DatabaseManager: class MockDatabaseManager {
    async initialize() { return true; }
    async getUserProfile(userId) { 
      return { id: userId, name: 'Test User', preferences: {} }; 
    }
    async getListeningHistory(userId, limit) { 
      return [
        { id: 'track1', name: 'Test Track 1', played_at: new Date().toISOString() },
        { id: 'track2', name: 'Test Track 2', played_at: new Date().toISOString() }
      ]; 
    }
    async getUserPreferences(userId) { 
      return { favoriteGenres: ['rock', 'pop'] }; 
    }
    async getRecentSessions(userId, limit) { 
      return []; 
    }
    async saveFeedback(feedback) { 
      return { success: true }; 
    }
    async getConversationHistory(userId, limit) { 
      return []; 
    }
  }
}));

jest.mock('../../src/spotify/api-service', () => ({
  SpotifyAPIService: class MockSpotifyAPIService {
    async getTrack(trackId) {
      return {
        id: trackId,
        name: 'Mock Track',
        artists: [{ name: 'Mock Artist' }],
        genres: ['rock']
      };
    }
  }
}));

describe('ChatRecommendationOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new ChatRecommendationOrchestrator({
      enableCaching: false // Disable caching for tests
    });
  });

  afterEach(async () => {
    if (orchestrator._databaseManager?.close) {
      await orchestrator._databaseManager.close();
    }
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      await orchestrator.initialize();
      expect(orchestrator.initialized).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      // Force an error in initialization
      orchestrator._databaseManager = {
        initialize: () => Promise.reject(new Error('DB Error'))
      };

      await expect(orchestrator.initialize()).rejects.toThrow('Orchestrator initialization failed');
    });
  });

  describe('getUserContext', () => {
    test('should return user context successfully', async () => {
      const context = await orchestrator.getUserContext('testUser');
      
      expect(context).toHaveProperty('userId', 'testUser');
      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('profile');
      expect(context).toHaveProperty('listeningHistory');
      expect(context).toHaveProperty('preferences');
      expect(context).toHaveProperty('metadata');
      
      expect(context.metadata).toHaveProperty('source', 'ChatRecommendationOrchestrator');
      expect(context.metadata).toHaveProperty('latencyMs');
    });

    test('should return default context on error', async () => {
      // Force an error
      orchestrator._getUserProfile = () => Promise.reject(new Error('Test error'));
      
      const context = await orchestrator.getUserContext('testUser');
      
      expect(context).toHaveProperty('userId', 'testUser');
      expect(context.metadata).toHaveProperty('fallback', true);
    });
  });

  describe('generateRecommendations', () => {
    test('should generate recommendations successfully', async () => {
      const recommendations = await orchestrator.generateRecommendations('testUser', {
        strategy: 'balanced',
        limit: 10
      });
      
      expect(recommendations).toHaveProperty('userId', 'testUser');
      expect(recommendations).toHaveProperty('recommendations');
      expect(recommendations).toHaveProperty('strategy');
      expect(recommendations).toHaveProperty('metadata');
      
      expect(recommendations.metadata).toHaveProperty('source', 'ChatRecommendationOrchestrator');
      expect(recommendations.metadata).toHaveProperty('fromCache', false);
    });

    test('should return fallback recommendations on error', async () => {
      // Force an error in recommendation engine
      orchestrator._recommendationEngine = {
        generate: () => Promise.reject(new Error('Engine error'))
      };
      
      const recommendations = await orchestrator.generateRecommendations('testUser');
      
      expect(recommendations.metadata).toHaveProperty('fallback', true);
      expect(recommendations.recommendations).toEqual([]);
    });
  });

  describe('buildChatContext', () => {
    test('should build chat context successfully', async () => {
      const chatContext = await orchestrator.buildChatContext('testUser', {
        maxTokens: 1000
      });
      
      expect(chatContext).toHaveProperty('user');
      expect(chatContext).toHaveProperty('conversation');
      expect(chatContext).toHaveProperty('musicContext');
      expect(chatContext).toHaveProperty('metadata');
      
      expect(chatContext.user).toHaveProperty('id', 'testUser');
      expect(chatContext.metadata).toHaveProperty('tokenEstimate');
      expect(chatContext.metadata).toHaveProperty('generatedAt');
    });

    test('should apply token budgeting when needed', async () => {
      const chatContext = await orchestrator.buildChatContext('testUser', {
        maxTokens: 50 // Very low limit to trigger budgeting
      });
      
      expect(chatContext.metadata.tokenEstimate).toBeLessThanOrEqual(50);
    });

    test('should return default context on error', async () => {
      // Force an error
      orchestrator.getUserContext = () => Promise.reject(new Error('Context error'));
      
      const chatContext = await orchestrator.buildChatContext('testUser');
      
      expect(chatContext.metadata).toHaveProperty('fallback', true);
    });
  });

  describe('ingestFeedback', () => {
    test('should ingest feedback successfully', async () => {
      const result = await orchestrator.ingestFeedback('testUser', 'track123', 'like', {
        sessionId: 'session123'
      });
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('feedback');
      expect(result.feedback).toHaveProperty('userId', 'testUser');
      expect(result.feedback).toHaveProperty('trackId', 'track123');
      expect(result.feedback).toHaveProperty('signal', 'like');
    });

    test('should handle feedback errors gracefully', async () => {
      // Force an error
      orchestrator._databaseManager.saveFeedback = () => Promise.reject(new Error('DB Error'));
      
      const result = await orchestrator.ingestFeedback('testUser', 'track123', 'like');
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('explain', () => {
    test('should generate explanation successfully', async () => {
      const explanation = await orchestrator.explain('track123', 'testUser');
      
      expect(explanation).toHaveProperty('trackId', 'track123');
      expect(explanation).toHaveProperty('userId', 'testUser');
      expect(explanation).toHaveProperty('track');
      expect(explanation).toHaveProperty('explanation');
      expect(explanation).toHaveProperty('factors');
      expect(explanation).toHaveProperty('metadata');
      
      expect(explanation.metadata).toHaveProperty('source', 'ChatRecommendationOrchestrator');
    });

    test('should handle explanation errors gracefully', async () => {
      // Force an error
      orchestrator._spotifyService.getTrack = () => Promise.reject(new Error('Spotify Error'));
      
      const explanation = await orchestrator.explain('track123', 'testUser');
      
      expect(explanation).toHaveProperty('error');
      expect(explanation.explanation).toBe('Unable to generate explanation at this time.');
    });
  });

  describe('helper methods', () => {
    test('should extract top genres correctly', async () => {
      await orchestrator.initialize();
      
      const userContext = {
        listeningHistory: [
          { genres: ['rock', 'alternative'] },
          { genres: ['rock', 'metal'] },
          { genres: ['pop', 'rock'] }
        ]
      };
      
      const topGenres = orchestrator._extractTopGenres(userContext);
      
      expect(topGenres[0]).toBe('rock'); // Most frequent
      expect(topGenres).toContain('alternative');
      expect(topGenres).toContain('metal');
      expect(topGenres).toContain('pop');
    });

    test('should estimate token count approximately', async () => {
      await orchestrator.initialize();
      
      const context = { test: 'data', longer: 'context with more text' };
      const estimate = orchestrator._estimateTokenCount(context);
      
      expect(estimate).toBeGreaterThan(0);
      expect(typeof estimate).toBe('number');
    });

    test('should apply token budgeting correctly', async () => {
      await orchestrator.initialize();
      
      const largeChatContext = {
        user: { id: 'test' },
        conversation: {
          history: new Array(10).fill({ message: 'Long conversation message that takes up space' })
        },
        musicContext: { topGenres: ['rock', 'pop'], recentTracks: [] },
        metadata: { tokenEstimate: 1000, truncated: false }
      };
      
      const budgeted = orchestrator._applyTokenBudgeting(largeChatContext, 200);
      
      expect(budgeted.metadata.truncated).toBe(true);
      expect(budgeted.conversation.history.length).toBeLessThan(10);
    });
  });
});

describe('ChatRecommendationOrchestrator Integration', () => {
  test('should work end-to-end with real workflow', async () => {
    const orchestrator = new ChatRecommendationOrchestrator({
      enableCaching: false
    });

    // Initialize
    await orchestrator.initialize();

    // Get user context
    const context = await orchestrator.getUserContext('integrationTestUser');
    expect(context.userId).toBe('integrationTestUser');

    // Generate recommendations
    const recommendations = await orchestrator.generateRecommendations('integrationTestUser', {
      context,
      strategy: 'balanced',
      limit: 5
    });
    expect(recommendations.userId).toBe('integrationTestUser');

    // Build chat context
    const chatContext = await orchestrator.buildChatContext('integrationTestUser');
    expect(chatContext.user.id).toBe('integrationTestUser');

    // Ingest feedback
    const feedbackResult = await orchestrator.ingestFeedback('integrationTestUser', 'track123', 'like');
    expect(feedbackResult.success).toBe(true);

    // Generate explanation
    const explanation = await orchestrator.explain('track123', 'integrationTestUser');
    expect(explanation.trackId).toBe('track123');
  });
});