/**
 * Unit tests for Recommendation Provenance Model
 * Tests validation, construction, and merging of provenance objects
 */

const {
  buildProvenance,
  validateProvenance,
  createDefaultProvenance,
  mergeProvenance,
  VALID_AUDIO_FEATURES,
  VALID_STRATEGIES
} = require('../../src/recommendation/provenance/model');

describe('Recommendation Provenance Model', () => {
  describe('buildProvenance', () => {
    test('should build valid provenance from complete spec', () => {
      const spec = {
        trackId: 'track_123',
        strategies: ['collaborative', 'content'],
        scoreComponents: {
          collaborative: 0.6,
          content: 0.4
        },
        featuresUsed: ['energy', 'valence'],
        diversityPenaltyApplied: 0.05,
        noveltyDaysSinceLastPlay: 30
      };

      const provenance = buildProvenance(spec);

      expect(provenance.trackId).toBe('track_123');
      expect(provenance.strategies).toEqual(['collaborative', 'content']);
      expect(provenance.scoreComponents).toEqual({
        collaborative: 0.6,
        content: 0.4
      });
      expect(provenance.featuresUsed).toEqual(['energy', 'valence']);
      expect(provenance.diversityPenaltyApplied).toBe(0.05);
      expect(provenance.noveltyDaysSinceLastPlay).toBe(30);
    });

    test('should throw error for missing required field', () => {
      const spec = {
        trackId: 'track_123',
        strategies: ['content']
        // Missing scoreComponents and featuresUsed
      };

      expect(() => buildProvenance(spec)).toThrow('NOT_IMPLEMENTED');
    });

    test('should throw error for invalid strategy', () => {
      const spec = {
        trackId: 'track_123',
        strategies: ['invalid_strategy'],
        scoreComponents: { invalid_strategy: 1.0 },
        featuresUsed: ['energy']
      };

      expect(() => buildProvenance(spec)).toThrow('INVALID_STRATEGY');
    });

    test('should throw error for invalid audio feature', () => {
      const spec = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['invalid_feature']
      };

      expect(() => buildProvenance(spec)).toThrow('INVALID_FEATURE');
    });

    test('should clone arrays and objects to prevent mutation', () => {
      const strategies = ['content'];
      const scoreComponents = { content: 1.0 };
      const featuresUsed = ['energy'];

      const spec = {
        trackId: 'track_123',
        strategies,
        scoreComponents,
        featuresUsed
      };

      const provenance = buildProvenance(spec);

      // Mutate original arrays/objects
      strategies.push('collaborative');
      scoreComponents.collaborative = 0.5;
      featuresUsed.push('valence');

      // Provenance should be unchanged
      expect(provenance.strategies).toEqual(['content']);
      expect(provenance.scoreComponents).toEqual({ content: 1.0 });
      expect(provenance.featuresUsed).toEqual(['energy']);
    });
  });

  describe('validateProvenance', () => {
    test('should validate correct provenance object', () => {
      const provenance = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy', 'valence']
      };

      expect(() => validateProvenance(provenance)).not.toThrow();
      expect(validateProvenance(provenance)).toBe(true);
    });

    test('should throw error for invalid score sum', () => {
      const provenance = {
        trackId: 'track_123',
        strategies: ['collaborative', 'content'],
        scoreComponents: {
          collaborative: 0.3,
          content: 0.3 // Sum is 0.6, should be ~1.0
        },
        featuresUsed: ['energy']
      };

      expect(() => validateProvenance(provenance)).toThrow('INVALID_SCORE_SUM');
    });

    test('should throw error for score out of range', () => {
      const provenance = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.5 }, // > 1.0
        featuresUsed: ['energy']
      };

      expect(() => validateProvenance(provenance)).toThrow('INVALID_SCORE_VALUE');
    });

    test('should throw error for negative diversity penalty', () => {
      const provenance = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy'],
        diversityPenaltyApplied: -0.1 // Negative value
      };

      expect(() => validateProvenance(provenance)).toThrow('INVALID_DIVERSITY_PENALTY');
    });

    test('should throw error for empty trackId', () => {
      const provenance = {
        trackId: '   ', // Empty/whitespace
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy']
      };

      expect(() => validateProvenance(provenance)).toThrow('INVALID_TRACK_ID');
    });

    test('should accept valid optional fields', () => {
      const provenance = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy', 'valence'],
        diversityPenaltyApplied: 0.1,
        noveltyDaysSinceLastPlay: 45,
        explanationRef: 'exp_abc123'
      };

      expect(() => validateProvenance(provenance)).not.toThrow();
    });

    test('should accept null noveltyDaysSinceLastPlay', () => {
      const provenance = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy'],
        noveltyDaysSinceLastPlay: null
      };

      expect(() => validateProvenance(provenance)).not.toThrow();
    });
  });

  describe('createDefaultProvenance', () => {
    test('should create default provenance with content strategy', () => {
      const provenance = createDefaultProvenance('track_123');

      expect(provenance.trackId).toBe('track_123');
      expect(provenance.strategies).toEqual(['content']);
      expect(provenance.scoreComponents).toEqual({ content: 1.0 });
      expect(provenance.featuresUsed).toEqual(['energy', 'valence']);
      expect(provenance.diversityPenaltyApplied).toBe(0);
      expect(provenance.noveltyDaysSinceLastPlay).toBeNull();
    });

    test('should create default provenance with specified strategy', () => {
      const provenance = createDefaultProvenance('track_123', 'collaborative');

      expect(provenance.strategies).toEqual(['collaborative']);
      expect(provenance.scoreComponents).toEqual({ collaborative: 1.0 });
    });

    test('should throw error for invalid strategy', () => {
      expect(() => createDefaultProvenance('track_123', 'invalid')).toThrow('NOT_IMPLEMENTED');
    });

    test('should throw error for missing trackId', () => {
      expect(() => createDefaultProvenance()).toThrow('NOT_IMPLEMENTED');
    });
  });

  describe('mergeProvenance', () => {
    test('should merge two provenance objects', () => {
      const prov1 = {
        trackId: 'track_123',
        strategies: ['collaborative'],
        scoreComponents: { collaborative: 1.0 },
        featuresUsed: ['energy', 'valence']
      };

      const prov2 = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['danceability', 'tempo']
      };

      const merged = mergeProvenance([prov1, prov2]);

      expect(merged.trackId).toBe('track_123');
      expect(merged.strategies).toContain('collaborative');
      expect(merged.strategies).toContain('content');
      expect(merged.featuresUsed).toContain('energy');
      expect(merged.featuresUsed).toContain('danceability');
      expect(merged.scoreComponents).toHaveProperty('collaborative');
      expect(merged.scoreComponents).toHaveProperty('content');
    });

    test('should average diversity penalties', () => {
      const prov1 = {
        trackId: 'track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy'],
        diversityPenaltyApplied: 0.1
      };

      const prov2 = {
        trackId: 'track_123',
        strategies: ['semantic'],
        scoreComponents: { semantic: 1.0 },
        featuresUsed: ['valence'],
        diversityPenaltyApplied: 0.3
      };

      const merged = mergeProvenance([prov1, prov2]);

      expect(merged.diversityPenaltyApplied).toBeCloseTo(0.2, 2); // Average of 0.1 and 0.3
    });

    test('should return single provenance if array has one element', () => {
      const provenance = createDefaultProvenance('track_123');
      const merged = mergeProvenance([provenance]);

      expect(merged).toEqual(provenance);
    });

    test('should throw error for empty array', () => {
      expect(() => mergeProvenance([])).toThrow('NOT_IMPLEMENTED');
    });

    test('should throw error for invalid provenance in array', () => {
      const prov1 = createDefaultProvenance('track_123');
      const prov2 = {
        trackId: 'track_456',
        strategies: ['invalid_strategy'], // Invalid
        scoreComponents: { invalid_strategy: 1.0 },
        featuresUsed: ['energy']
      };

      expect(() => mergeProvenance([prov1, prov2])).toThrow();
    });

    test('should generate explanationRef for merged provenance', () => {
      const prov1 = createDefaultProvenance('track_123', 'collaborative');
      const prov2 = createDefaultProvenance('track_123', 'content');

      const merged = mergeProvenance([prov1, prov2]);

      expect(merged.explanationRef).toBeDefined();
      expect(typeof merged.explanationRef).toBe('string');
      expect(merged.explanationRef).toContain('merged');
    });
  });

  describe('VALID_AUDIO_FEATURES', () => {
    test('should contain all required Spotify audio features', () => {
      const requiredFeatures = [
        'danceability', 'energy', 'valence', 'tempo',
        'acousticness', 'instrumentalness', 'liveness', 'speechiness'
      ];

      for (const feature of requiredFeatures) {
        expect(VALID_AUDIO_FEATURES).toContain(feature);
      }
    });

    test('should be an array', () => {
      expect(Array.isArray(VALID_AUDIO_FEATURES)).toBe(true);
    });
  });

  describe('VALID_STRATEGIES', () => {
    test('should contain core recommendation strategies', () => {
      const coreStrategies = ['collaborative', 'content', 'semantic', 'hybrid'];

      for (const strategy of coreStrategies) {
        expect(VALID_STRATEGIES).toContain(strategy);
      }
    });

    test('should be an array', () => {
      expect(Array.isArray(VALID_STRATEGIES)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle provenance with maximum features', () => {
      const spec = {
        trackId: 'track_123',
        strategies: ['hybrid'],
        scoreComponents: { hybrid: 1.0 },
        featuresUsed: VALID_AUDIO_FEATURES.slice() // All features
      };

      const provenance = buildProvenance(spec);
      expect(provenance.featuresUsed).toHaveLength(VALID_AUDIO_FEATURES.length);
    });

    test('should handle provenance with multiple strategies', () => {
      const spec = {
        trackId: 'track_123',
        strategies: ['collaborative', 'content', 'semantic'],
        scoreComponents: {
          collaborative: 0.4,
          content: 0.35,
          semantic: 0.25
        },
        featuresUsed: ['energy', 'valence', 'danceability']
      };

      const provenance = buildProvenance(spec);
      expect(provenance.strategies).toHaveLength(3);
      expect(Object.keys(provenance.scoreComponents)).toHaveLength(3);
    });

    test('should handle zero values correctly', () => {
      const provenance = {
        trackId: 'track_123',
        strategies: ['content', 'semantic'],
        scoreComponents: {
          content: 1.0,
          semantic: 0.0 // Zero is valid
        },
        featuresUsed: ['energy'],
        diversityPenaltyApplied: 0, // Zero is valid
        noveltyDaysSinceLastPlay: 0 // Zero is valid
      };

      expect(() => validateProvenance(provenance)).not.toThrow();
    });
  });
});
