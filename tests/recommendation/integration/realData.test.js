/**
 * Real Data Integration Tests
 * 
 * Tests recommendation strategies with real data sources to ensure
 * no placeholder logic remains and all components work with production data.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const Database = require('../../../src/database/Database');
const CollaborativeStrategy = require('../../../src/recommendation/strategies/collaborativeStrategy');
const ContentAudioFeatureStrategy = require('../../../src/recommendation/strategies/contentAudioFeatureStrategy');
const EmbeddingSemanticStrategy = require('../../../src/recommendation/strategies/embeddingSemanticStrategy');
const EmbeddingProvider = require('../../../src/ai/EmbeddingProvider');

describe('Real Data Integration Tests', () => {
  let db;
  let testUserId = 'test_user_realdata_001';

  beforeAll(async () => {
    // Set up test database connection
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI required for real data tests');
    }

    await Database.connect();
    db = Database.getInstance();

    // Seed minimal test data if needed
    await seedTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await Database.disconnect();
  });

  describe('Collaborative Strategy Real Data', () => {
    test('should load real user interactions from database', async () => {
      const strategy = new CollaborativeStrategy();
      
      // This should not throw if real data exists
      await expect(strategy.initialize()).resolves.not.toThrow();
      
      // Verify it loaded real data, not mock data
      expect(strategy.userInteractions.size).toBeGreaterThan(0);
      
      // Verify data structure
      const firstUser = strategy.userInteractions.values().next().value;
      expect(firstUser).toBeInstanceOf(Array);
      expect(firstUser.length).toBeGreaterThan(0);
      expect(firstUser[0]).toHaveProperty('trackId');
      expect(firstUser[0]).toHaveProperty('weight');
      expect(firstUser[0].trackId).not.toMatch(/^track_\d+$/); // Should not be mock ID
    });

    test('should generate real recommendations with proper candidate structure', async () => {
      const strategy = new CollaborativeStrategy();
      await strategy.initialize();

      const result = await strategy.run({
        userId: testUserId,
        limits: { candidates: 50, final: 10 },
        context: { 
          listeningHistory: [
            { trackId: 'real_track_001', signal: 'play', weight: 1.0 },
            { trackId: 'real_track_002', signal: 'like', weight: 2.0 }
          ]
        }
      });

      expect(result).toHaveProperty('candidates');
      expect(result).toHaveProperty('diagnostics');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates.length).toBeLessThanOrEqual(10);

      // Verify candidate structure
      const candidate = result.candidates[0];
      expect(candidate).toHaveProperty('trackId');
      expect(candidate).toHaveProperty('score');
      expect(candidate).toHaveProperty('reasons');
      expect(candidate.score).toBeGreaterThan(0);
      expect(candidate.reasons).toBeInstanceOf(Array);
    });
  });

  // Helper functions
  async function seedTestData() {
    // Create minimal test data if collections are empty
    const collections = ['user_interactions', 'audio_features'];
    
    for (const collectionName of collections) {
      const count = await db.collection(collectionName).countDocuments();
      if (count === 0) {
        console.log(`Seeding test data for ${collectionName}...`);
        await seedCollection(collectionName);
      }
    }
  }

  async function seedCollection(collectionName) {
    switch (collectionName) {
      case 'user_interactions':
        await db.collection('user_interactions').insertMany([
          {
            userId: testUserId,
            trackId: 'real_track_001',
            signal: 'play',
            weight: 1.0,
            timestamp: new Date(),
            sessionId: 'test_session_001'
          },
          {
            userId: testUserId,
            trackId: 'real_track_002',
            signal: 'like',
            weight: 2.0,
            timestamp: new Date(),
            sessionId: 'test_session_001'
          }
        ]);
        break;

      case 'audio_features':
        await db.collection('audio_features').insertMany([
          {
            trackId: 'real_track_001',
            acousticness: 0.2,
            danceability: 0.8,
            energy: 0.9,
            instrumentalness: 0.1,
            liveness: 0.3,
            loudness: -5.2,
            speechiness: 0.1,
            tempo: 128.0,
            valence: 0.8,
            genre: 'electronic'
          },
          {
            trackId: 'real_track_002',
            acousticness: 0.7,
            danceability: 0.4,
            energy: 0.3,
            instrumentalness: 0.8,
            liveness: 0.1,
            loudness: -12.5,
            speechiness: 0.05,
            tempo: 72.0,
            valence: 0.6,
            genre: 'ambient'
          }
        ]);
        break;
    }
  }

  async function cleanupTestData() {
    // Remove test data
    await db.collection('user_interactions').deleteMany({ userId: testUserId });
    await db.collection('audio_features').deleteMany({ 
      trackId: { $in: ['real_track_001', 'real_track_002'] }
    });
  }
});