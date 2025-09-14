/**
 * Recommendation Strategies Test Suite
 * 
 * Comprehensive tests for all recommendation strategy modules
 * Validates algorithm correctness, performance, and fallback behavior
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const { jest } = require('@jest/globals');

// Mock external dependencies
jest.mock('../../src/database/database-manager');
jest.mock('../../src/spotify/api-service');
jest.mock('../../src/api/cache/cache-manager');

describe('Recommendation Strategies', () => {
  let mockDatabase;
  let mockSpotify;
  let mockCache;

  beforeEach(() => {
    mockDatabase = {
      getListeningHistory: jest.fn(),
      getUserSimilarities: jest.fn(),
      getTrackFeatures: jest.fn(),
      getUserPreferences: jest.fn()
    };

    mockSpotify = {
      getTrackFeatures: jest.fn(),
      getArtistGenres: jest.fn(),
      searchTracks: jest.fn()
    };

    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    };

    // Mock dependencies
    require('../../src/database/database-manager').DatabaseManager = jest.fn(() => mockDatabase);
    require('../../src/spotify/api-service').SpotifyAPIService = jest.fn(() => mockSpotify);
    require('../../src/api/cache/cache-manager').CacheManager = jest.fn(() => mockCache);
  });

  describe('Collaborative Filtering Strategy', () => {
    let CollaborativeStrategy;

    beforeAll(() => {
      CollaborativeStrategy = require('../../src/recommendation/strategies/collaborativeStrategy');
    });

    test('should generate collaborative recommendations successfully', async () => {
      const strategy = new CollaborativeStrategy();
      
      // Mock user listening history
      mockDatabase.getListeningHistory.mockResolvedValue([
        { trackId: 'track1', playCount: 10 },
        { trackId: 'track2', playCount: 8 },
        { trackId: 'track3', playCount: 5 }
      ]);

      // Mock similar users data
      mockDatabase.getUserSimilarities.mockResolvedValue([
        { userId: 'similar1', similarity: 0.8, tracks: ['track4', 'track5'] },
        { userId: 'similar2', similarity: 0.7, tracks: ['track5', 'track6'] }
      ]);

      const context = {
        userId: 'testUser',
        seeds: ['track1', 'track2'],
        limits: { maxCandidates: 10 }
      };

      const result = await strategy.run(context);

      expect(result).toHaveProperty('candidates');
      expect(result).toHaveProperty('diagnostics');
      expect(result.candidates).toBeInstanceOf(Array);
      expect(result.candidates.length).toBeGreaterThan(0);
      
      // Check candidate structure
      result.candidates.forEach(candidate => {
        expect(candidate).toHaveProperty('trackId');
        expect(candidate).toHaveProperty('score');
        expect(candidate).toHaveProperty('reasons');
        expect(candidate.score).toBeGreaterThanOrEqual(0);
        expect(candidate.score).toBeLessThanOrEqual(1);
      });

      expect(result.diagnostics).toHaveProperty('strategy', 'collaborative');
      expect(result.diagnostics).toHaveProperty('executionTime');
    });

    test('should handle empty user history gracefully', async () => {
      const strategy = new CollaborativeStrategy();
      
      mockDatabase.getListeningHistory.mockResolvedValue([]);
      mockDatabase.getUserSimilarities.mockResolvedValue([]);

      const context = {
        userId: 'newUser',
        seeds: [],
        limits: { maxCandidates: 10 }
      };

      const result = await strategy.run(context);

      expect(result.candidates).toEqual([]);
      expect(result.diagnostics).toHaveProperty('coldStart', true);
    });

    test('should calculate user similarity correctly', async () => {
      const strategy = new CollaborativeStrategy();
      
      const user1Tracks = ['track1', 'track2', 'track3', 'track4'];
      const user2Tracks = ['track2', 'track3', 'track5', 'track6'];
      
      const similarity = strategy._calculateJaccardSimilarity(user1Tracks, user2Tracks);
      
      // Jaccard similarity = intersection / union = 2 / 6 = 0.333...
      expect(similarity).toBeCloseTo(0.333, 2);
    });
  });

  describe('Content-Based Audio Features Strategy', () => {
    let ContentAudioFeatureStrategy;

    beforeAll(() => {
      ContentAudioFeatureStrategy = require('../../src/recommendation/strategies/contentAudioFeatureStrategy');
    });

    test('should generate content-based recommendations using audio features', async () => {
      const strategy = new ContentAudioFeatureStrategy();
      
      // Mock track audio features
      mockSpotify.getTrackFeatures.mockImplementation((trackId) => {
        const features = {
          'track1': { energy: 0.8, valence: 0.7, danceability: 0.6, acousticness: 0.2 },
          'track2': { energy: 0.7, valence: 0.8, danceability: 0.7, acousticness: 0.1 },
          'track3': { energy: 0.9, valence: 0.6, danceability: 0.8, acousticness: 0.3 }
        };
        return Promise.resolve(features[trackId] || {});
      });

      mockDatabase.getListeningHistory.mockResolvedValue([
        { trackId: 'track1', playCount: 10 },
        { trackId: 'track2', playCount: 8 }
      ]);

      const context = {
        userId: 'testUser',
        seeds: ['track1', 'track2'],
        limits: { maxCandidates: 10 }
      };

      const result = await strategy.run(context);

      expect(result.candidates).toBeInstanceOf(Array);
      expect(result.diagnostics).toHaveProperty('strategy', 'content-audio-features');
      
      // Should have feature-based scoring
      result.candidates.forEach(candidate => {
        expect(candidate.reasons).toContain(expect.stringMatching(/energy|valence|danceability/));
      });
    });

    test('should calculate audio feature similarity correctly', async () => {
      const strategy = new ContentAudioFeatureStrategy();
      
      const features1 = { energy: 0.8, valence: 0.7, danceability: 0.6 };
      const features2 = { energy: 0.7, valence: 0.8, danceability: 0.7 };
      
      const similarity = strategy._calculateCosineSimilarity(features1, features2);
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    test('should handle missing audio features gracefully', async () => {
      const strategy = new ContentAudioFeatureStrategy();
      
      mockSpotify.getTrackFeatures.mockResolvedValue(null);
      mockDatabase.getListeningHistory.mockResolvedValue([
        { trackId: 'track1', playCount: 10 }
      ]);

      const context = {
        userId: 'testUser',
        seeds: ['track1'],
        limits: { maxCandidates: 10 }
      };

      const result = await strategy.run(context);

      expect(result.diagnostics).toHaveProperty('missingFeatures', true);
    });
  });

  describe('Embedding Semantic Strategy', () => {
    let EmbeddingSemanticStrategy;

    beforeAll(() => {
      EmbeddingSemanticStrategy = require('../../src/recommendation/strategies/embeddingSemanticStrategy');
    });

    test('should generate semantic recommendations using embeddings', async () => {
      const strategy = new EmbeddingSemanticStrategy();
      
      // Mock semantic embeddings
      strategy._getTrackEmbedding = jest.fn().mockImplementation((trackId) => {
        const embeddings = {
          'track1': [0.1, 0.2, 0.3, 0.4],
          'track2': [0.2, 0.3, 0.4, 0.5],
          'track3': [0.3, 0.4, 0.5, 0.6]
        };
        return Promise.resolve(embeddings[trackId] || [0, 0, 0, 0]);
      });

      mockDatabase.getListeningHistory.mockResolvedValue([
        { trackId: 'track1', playCount: 10 },
        { trackId: 'track2', playCount: 8 }
      ]);

      const context = {
        userId: 'testUser',
        seeds: ['track1', 'track2'],
        limits: { maxCandidates: 10 }
      };

      const result = await strategy.run(context);

      expect(result.candidates).toBeInstanceOf(Array);
      expect(result.diagnostics).toHaveProperty('strategy', 'embedding-semantic');
      
      // Should have semantic similarity scoring
      result.candidates.forEach(candidate => {
        expect(candidate.reasons).toContain(expect.stringMatching(/semantic|similarity|embedding/));
      });
    });

    test('should calculate vector similarity correctly', async () => {
      const strategy = new EmbeddingSemanticStrategy();
      
      const vector1 = [1, 2, 3];
      const vector2 = [4, 5, 6];
      
      const similarity = strategy._calculateVectorSimilarity(vector1, vector2);
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('Hybrid Rerank Strategy', () => {
    let HybridRerankStrategy;

    beforeAll(() => {
      HybridRerankStrategy = require('../../src/recommendation/strategies/hybridRerankStrategy');
    });

    test('should combine multiple strategy results effectively', async () => {
      const strategy = new HybridRerankStrategy();
      
      // Mock the strategy results that would be combined
      const collaborativeResults = {
        candidates: [
          { trackId: 'track1', score: 0.8, reasons: ['collaborative'] },
          { trackId: 'track2', score: 0.7, reasons: ['collaborative'] }
        ]
      };

      const contentResults = {
        candidates: [
          { trackId: 'track1', score: 0.6, reasons: ['content'] },
          { trackId: 'track3', score: 0.9, reasons: ['content'] }
        ]
      };

      const semanticResults = {
        candidates: [
          { trackId: 'track2', score: 0.8, reasons: ['semantic'] },
          { trackId: 'track4', score: 0.7, reasons: ['semantic'] }
        ]
      };

      // Mock the strategy execution
      strategy._runCollaborativeStrategy = jest.fn().mockResolvedValue(collaborativeResults);
      strategy._runContentStrategy = jest.fn().mockResolvedValue(contentResults);
      strategy._runSemanticStrategy = jest.fn().mockResolvedValue(semanticResults);

      const context = {
        userId: 'testUser',
        seeds: ['track1'],
        limits: { maxCandidates: 10 }
      };

      const result = await strategy.run(context);

      expect(result.candidates).toBeInstanceOf(Array);
      expect(result.diagnostics).toHaveProperty('strategy', 'hybrid-rerank');
      expect(result.diagnostics).toHaveProperty('strategiesUsed');
      
      // Should have combined reasons from multiple strategies
      const track1Candidate = result.candidates.find(c => c.trackId === 'track1');
      if (track1Candidate) {
        expect(track1Candidate.reasons.length).toBeGreaterThan(1);
      }
    });

    test('should weight strategies appropriately', async () => {
      const strategy = new HybridRerankStrategy();
      
      const weights = { collaborative: 0.4, content: 0.3, semantic: 0.3 };
      const scores = { collaborative: 0.8, content: 0.6, semantic: 0.7 };
      
      const combinedScore = strategy._combineScores(scores, weights);
      
      const expectedScore = (0.8 * 0.4) + (0.6 * 0.3) + (0.7 * 0.3);
      expect(combinedScore).toBeCloseTo(expectedScore, 2);
    });

    test('should handle strategy failures gracefully', async () => {
      const strategy = new HybridRerankStrategy();
      
      // Mock one strategy failing
      strategy._runCollaborativeStrategy = jest.fn().mockRejectedValue(new Error('Strategy failed'));
      strategy._runContentStrategy = jest.fn().mockResolvedValue({
        candidates: [{ trackId: 'track1', score: 0.8, reasons: ['content'] }]
      });
      strategy._runSemanticStrategy = jest.fn().mockResolvedValue({
        candidates: [{ trackId: 'track2', score: 0.7, reasons: ['semantic'] }]
      });

      const context = {
        userId: 'testUser',
        seeds: ['track1'],
        limits: { maxCandidates: 10 }
      };

      const result = await strategy.run(context);

      expect(result.candidates).toBeInstanceOf(Array);
      expect(result.diagnostics).toHaveProperty('strategyFailures');
      expect(result.diagnostics.strategyFailures).toContain('collaborative');
    });
  });

  describe('Strategy Registry', () => {
    let StrategyRegistry;

    beforeAll(() => {
      StrategyRegistry = require('../../src/recommendation/strategies/index');
    });

    test('should register all strategies correctly', () => {
      const registry = new StrategyRegistry();
      
      expect(registry.getAvailableStrategies()).toContain('collaborative');
      expect(registry.getAvailableStrategies()).toContain('content-audio-features');
      expect(registry.getAvailableStrategies()).toContain('embedding-semantic');
      expect(registry.getAvailableStrategies()).toContain('hybrid-rerank');
    });

    test('should get strategy by name', () => {
      const registry = new StrategyRegistry();
      
      const collaborativeStrategy = registry.getStrategy('collaborative');
      expect(collaborativeStrategy).toBeDefined();
      expect(typeof collaborativeStrategy.run).toBe('function');
    });

    test('should handle unknown strategy gracefully', () => {
      const registry = new StrategyRegistry();
      
      expect(() => {
        registry.getStrategy('unknown-strategy');
      }).toThrow('Unknown strategy: unknown-strategy');
    });

    test('should provide strategy metadata', () => {
      const registry = new StrategyRegistry();
      
      const metadata = registry.getStrategyMetadata('collaborative');
      
      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('strengths');
      expect(metadata).toHaveProperty('weaknesses');
      expect(metadata).toHaveProperty('bestUseCase');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large datasets efficiently', async () => {
      const strategy = new (require('../../src/recommendation/strategies/collaborativeStrategy'))();
      
      // Mock large dataset
      const largeHistory = Array(1000).fill().map((_, i) => ({
        trackId: `track${i}`,
        playCount: Math.floor(Math.random() * 100)
      }));

      mockDatabase.getListeningHistory.mockResolvedValue(largeHistory);
      mockDatabase.getUserSimilarities.mockResolvedValue([]);

      const startTime = Date.now();
      
      const context = {
        userId: 'testUser',
        seeds: ['track1'],
        limits: { maxCandidates: 20 }
      };

      const result = await strategy.run(context);
      
      const executionTime = Date.now() - startTime;
      
      // Should complete within reasonable time (< 1 second for this test)
      expect(executionTime).toBeLessThan(1000);
      expect(result.diagnostics).toHaveProperty('executionTime');
    });

    test('should handle concurrent strategy execution', async () => {
      const strategy = new (require('../../src/recommendation/strategies/hybridRerankStrategy'))();
      
      const context = {
        userId: 'testUser',
        seeds: ['track1'],
        limits: { maxCandidates: 10 }
      };

      // Run multiple concurrent requests
      const promises = Array(5).fill().map(() => strategy.run(context));
      const results = await Promise.all(promises);

      // All should complete successfully
      results.forEach(result => {
        expect(result).toHaveProperty('candidates');
        expect(result).toHaveProperty('diagnostics');
      });
    });

    test('should respect memory constraints', async () => {
      const strategy = new (require('../../src/recommendation/strategies/embeddingSemanticStrategy'))();
      
      // Monitor memory usage (simplified check)
      const initialMemory = process.memoryUsage().heapUsed;
      
      const context = {
        userId: 'testUser',
        seeds: ['track1'],
        limits: { maxCandidates: 100 }
      };

      await strategy.run(context);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not use excessive memory (< 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});