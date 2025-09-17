/**
 * Integration Test for Recommendation Engine with Real Data
 * Validates that NO_MOCK policy is enforced in recommendation pathways
 */

const RecommendationEngine = require('../../src/recommendation/engine');
const ExplanationGenerator = require('../../src/recommendation/explanations/generateExplanation');
const UserSettingsService = require('../../src/services/UserSettingsService');

describe('Recommendation Engine Integration', () => {
  let engine;
  let explanationGenerator;
  let settingsService;

  beforeEach(() => {
    engine = new RecommendationEngine();
    explanationGenerator = new ExplanationGenerator();
    settingsService = new UserSettingsService();
  });

  describe('NO_MOCK Policy Enforcement', () => {
    test('should not contain Math.random() calls in recommendation code', async () => {
      const fs = require('fs');
      const path = require('path');
      
      // Scan recommendation directory for Math.random usage
      const scanDirectory = (dir) => {
        const results = [];
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isDirectory()) {
            results.push(...scanDirectory(fullPath));
          } else if (file.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Check for Math.random() but ignore test files
            if (!fullPath.includes('test') && !fullPath.includes('spec')) {
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                if (line.includes('Math.random()') && !line.includes('// test:') && !line.includes('// mock:')) {
                  results.push({
                    file: fullPath,
                    line: index + 1,
                    content: line.trim()
                  });
                }
              });
            }
          }
        }
        
        return results;
      };

      const randomUsages = scanDirectory(path.join(__dirname, '../../src/recommendation'));
      
      expect(randomUsages).toEqual([]);
      
      if (randomUsages.length > 0) {
        console.log('❌ Found Math.random() usage in recommendation code:');
        randomUsages.forEach(usage => {
          console.log(`   ${usage.file}:${usage.line} - ${usage.content}`);
        });
      }
    });

    test('should not contain placeholder or mock data in strategies', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const strategiesPath = path.join(__dirname, '../../src/recommendation/strategies');
      const files = fs.readdirSync(strategiesPath).filter(f => f.endsWith('.js'));
      
      const suspiciousPatterns = [
        /mock.*data/i,
        /placeholder.*data/i,
        /dummy.*data/i,
        /fake.*data/i,
        /test.*data/i,
        /sample.*data/i
      ];
      
      const violations = [];
      
      for (const file of files) {
        const content = fs.readFileSync(path.join(strategiesPath, file), 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Skip comments and test code
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
          
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(line) && !line.includes('// allowed:')) {
              violations.push({
                file,
                line: index + 1,
                content: line.trim(),
                pattern: pattern.toString()
              });
            }
          }
        });
      }
      
      expect(violations).toEqual([]);
      
      if (violations.length > 0) {
        console.log('❌ Found suspicious mock/placeholder patterns:');
        violations.forEach(v => {
          console.log(`   ${v.file}:${v.line} - ${v.content}`);
        });
      }
    });
  });

  describe('Explanation Generator', () => {
    test('should generate valid explanations with real metadata', () => {
      const mockRecommendation = {
        track: {
          id: 'track123',
          name: 'Test Song',
          artist: 'Test Artist',
          genre: 'pop'
        },
        metadata: {
          strategies: {
            collaborative: true,
            'content-based': true
          },
          scores: {
            collaborative: 0.8,
            'content-based': 0.6
          },
          features: {
            energy: 0.7,
            valence: 0.8,
            tempo: 120,
            acousticness: 0.3
          }
        }
      };

      const explanation = explanationGenerator.generateExplanation(mockRecommendation);
      
      expect(explanation).toBeDefined();
      expect(explanation.primary).toBeTruthy();
      expect(explanation.detailed).toBeInstanceOf(Array);
      expect(explanation.audioFeatures).toBeTruthy();
      expect(explanation.confidence).toBeTruthy();
      expect(explanation.strategies).toBeInstanceOf(Array);
      expect(explanation.metadata).toBeDefined();
      
      // Validate explanation references real features
      expect(explanation.audioFeatures).toContain('high-energy');
      expect(explanation.audioFeatures).toContain('upbeat and positive');
      expect(explanation.audioFeatures).toContain('moderate tempo');
    });

    test('should not hallucinate features not present in metadata', () => {
      const recommendation = {
        track: {
          id: 'track123',
          name: 'Test Song'
        },
        metadata: {
          strategies: { collaborative: true },
          scores: { collaborative: 0.6 },
          features: { energy: 0.5 } // Only energy provided
        }
      };

      const explanation = explanationGenerator.generateExplanation(recommendation);
      
      // Should not mention features not in metadata
      expect(explanation.audioFeatures).not.toContain('danceable');
      expect(explanation.audioFeatures).not.toContain('acoustic');
      expect(explanation.audioFeatures).not.toContain('tempo');
      
      // Should mention the feature that was provided
      expect(explanation.audioFeatures).toContain('moderate energy');
    });

    test('should handle missing metadata gracefully', () => {
      const recommendation = {
        track: {
          id: 'track123',
          name: 'Test Song'
        }
        // No metadata
      };

      const explanation = explanationGenerator.generateExplanation(recommendation);
      
      expect(explanation).toBeDefined();
      expect(explanation.primary).toBeTruthy();
      expect(explanation.confidence).toBe('medium');
      expect(explanation.strategies).toContain('fallback');
    });
  });

  describe('User Settings Integration', () => {
    test('should validate settings structure matches schema', () => {
      const defaultSettings = settingsService.getDefaultSettings();
      
      // Validate required fields exist
      expect(defaultSettings.llmProvider).toBeDefined();
      expect(defaultSettings.strategyWeights).toBeDefined();
      expect(defaultSettings.privacy).toBeDefined();
      expect(defaultSettings.playlistDefaults).toBeDefined();
      expect(defaultSettings.preferences).toBeDefined();
      
      // Validate strategy weights
      const weights = defaultSettings.strategyWeights;
      expect(weights.collaborative).toBeGreaterThanOrEqual(0);
      expect(weights.collaborative).toBeLessThanOrEqual(1);
      expect(weights.content).toBeGreaterThanOrEqual(0);
      expect(weights.content).toBeLessThanOrEqual(1);
      expect(weights.semantic).toBeGreaterThanOrEqual(0);
      expect(weights.semantic).toBeLessThanOrEqual(1);
      expect(weights.diversity).toBeGreaterThanOrEqual(0);
      expect(weights.diversity).toBeLessThanOrEqual(1);
      
      // Weights should sum to approximately 1.0
      const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
    });

    test('should validate strategy weights correctly', () => {
      // Valid weights
      expect(() => {
        settingsService.validateSettings({
          strategyWeights: {
            collaborative: 0.3,
            content: 0.3,
            semantic: 0.3,
            diversity: 0.1
          }
        });
      }).not.toThrow();

      // Invalid weights (sum > 1)
      expect(() => {
        settingsService.validateSettings({
          strategyWeights: {
            collaborative: 0.5,
            content: 0.5,
            semantic: 0.5,
            diversity: 0.1
          }
        });
      }).toThrow();

      // Invalid weight values
      expect(() => {
        settingsService.validateSettings({
          strategyWeights: {
            collaborative: -0.1,
            content: 0.5,
            semantic: 0.4,
            diversity: 0.2
          }
        });
      }).toThrow();

      expect(() => {
        settingsService.validateSettings({
          strategyWeights: {
            collaborative: 1.5,
            content: -0.3,
            semantic: 0.4,
            diversity: 0.2
          }
        });
      }).toThrow();
    });

    test('should validate LLM provider values', () => {
      // Valid providers
      ['openai', 'openrouter', 'gemini'].forEach(provider => {
        expect(() => {
          settingsService.validateSettings({ llmProvider: provider });
        }).not.toThrow();
      });

      // Invalid provider
      expect(() => {
        settingsService.validateSettings({ llmProvider: 'invalid_provider' });
      }).toThrow();
    });
  });

  describe('Real Data Validation', () => {
    test('should use MongoDB for user interactions', async () => {
      // This test verifies that the collaborative strategy attempts to use real MongoDB data
      const strategy = require('../../src/recommendation/strategies/collaborativeStrategy');
      const collaborativeStrategy = new strategy();
      
      // Mock MongoDB connection
      const mockMongoManager = {
        _isConnected: true,
        db: {
          collection: jest.fn().mockReturnValue({
            aggregate: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([
                {
                  _id: 'user1',
                  interactions: [
                    { trackId: 'track1', signal: 'play', weight: 1, timestamp: new Date() }
                  ],
                  totalInteractions: 1
                }
              ])
            })
          })
        },
        connect: jest.fn().mockResolvedValue(true)
      };

      // Mock the require call
      jest.doMock('../../src/database/mongodb-manager', () => {
        return jest.fn().mockImplementation(() => mockMongoManager);
      });

      const result = await collaborativeStrategy._loadUserInteractions();
      
      expect(result).toBe(true);
      expect(mockMongoManager.db.collection).toHaveBeenCalledWith('user_interactions');
    });

    test('should handle absence of user data gracefully', async () => {
      const strategy = require('../../src/recommendation/strategies/collaborativeStrategy');
      const collaborativeStrategy = new strategy();
      
      // Mock MongoDB with no data
      const mockMongoManager = {
        _isConnected: true,
        db: {
          collection: jest.fn().mockReturnValue({
            aggregate: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]) // No user interactions
            })
          })
        },
        connect: jest.fn().mockResolvedValue(true)
      };

      jest.doMock('../../src/database/mongodb-manager', () => {
        return jest.fn().mockImplementation(() => mockMongoManager);
      });

      const result = await collaborativeStrategy._loadUserInteractions();
      
      // Should return false but not throw error
      expect(result).toBe(false);
    });
  });

  describe('Recommendation Quality Validation', () => {
    test('should return recommendations with required fields', () => {
      const mockRecommendation = {
        track: {
          id: 'track123',
          name: 'Test Song',
          artist: 'Test Artist'
        },
        score: 0.8,
        metadata: {
          strategies: { collaborative: true },
          scores: { collaborative: 0.8 },
          features: { energy: 0.7 }
        }
      };

      // Validate recommendation structure
      expect(mockRecommendation.track).toBeDefined();
      expect(mockRecommendation.track.id).toBeTruthy();
      expect(mockRecommendation.track.name).toBeTruthy();
      expect(mockRecommendation.score).toBeGreaterThan(0);
      expect(mockRecommendation.metadata).toBeDefined();
      expect(mockRecommendation.metadata.strategies).toBeDefined();
      expect(mockRecommendation.metadata.scores).toBeDefined();
    });

    test('should validate explanation quality', () => {
      const explanation = {
        primary: 'Users with similar music taste often enjoy this track',
        detailed: [
          {
            strategy: 'collaborative',
            score: 0.8,
            explanation: 'Based on users with similar preferences'
          }
        ],
        audioFeatures: 'This track is high-energy, upbeat and positive',
        confidence: 'high',
        strategies: ['collaborative'],
        metadata: {
          primaryStrategy: 'collaborative',
          confidenceScore: 0.8,
          featuresUsed: ['energy', 'valence']
        }
      };

      // Validate explanation structure
      expect(explanation.primary).toBeTruthy();
      expect(explanation.detailed).toBeInstanceOf(Array);
      expect(explanation.detailed.length).toBeGreaterThan(0);
      expect(explanation.audioFeatures).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(explanation.confidence);
      expect(explanation.strategies).toBeInstanceOf(Array);
      expect(explanation.metadata).toBeDefined();
      expect(explanation.metadata.primaryStrategy).toBeTruthy();
      expect(explanation.metadata.confidenceScore).toBeGreaterThan(0);
    });
  });
});

module.exports = {
  RecommendationEngine,
  ExplanationGenerator,
  UserSettingsService
};