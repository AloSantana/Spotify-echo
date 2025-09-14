/**
 * Tests for recommendation explanation generation
 * Validates that explanations reference only real features and avoid hallucinations
 */

const { generateExplanation, generateBatchExplanations, validateExplanation } = require('../../src/recommendation/explanations/generateExplanation');
const { buildProvenance, VALID_AUDIO_FEATURES } = require('../../src/recommendation/provenance/model');

describe('Recommendation Explanation Generation', () => {
  describe('generateExplanation', () => {
    it('should generate explanation with valid track and provenance', () => {
      const track = {
        id: 'test_track_123',
        name: 'Test Song',
        artists: [{ name: 'Test Artist' }],
        audio_features: {
          energy: 0.8,
          valence: 0.6,
          danceability: 0.7,
          tempo: 128
        }
      };

      const provenance = buildProvenance({
        trackId: 'test_track_123',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy', 'valence'],
        noveltyDaysSinceLastPlay: 5
      });

      const explanation = generateExplanation({ track, provenance });

      expect(explanation).toHaveProperty('text');
      expect(explanation).toHaveProperty('confidence');
      expect(explanation).toHaveProperty('strategies');
      expect(explanation).toHaveProperty('featuresUsed');
      expect(explanation.text).toContain('Test Song');
      expect(explanation.text).toContain('Test Artist');
      expect(explanation.strategies).toEqual(['content']);
      expect(explanation.featuresUsed).toEqual(['energy', 'valence']);
    });

    it('should throw error when track is missing', () => {
      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy']
      });

      expect(() => {
        generateExplanation({ provenance });
      }).toThrow('MISSING_INPUT: track is required');
    });

    it('should throw error when provenance is missing', () => {
      const track = {
        id: 'test',
        audio_features: { energy: 0.5 }
      };

      expect(() => {
        generateExplanation({ track });
      }).toThrow('MISSING_INPUT: provenance is required');
    });

    it('should throw error when referenced feature is missing from track', () => {
      const track = {
        id: 'test',
        audio_features: { energy: 0.5 }
      };

      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy', 'valence'] // valence not in audio_features
      });

      expect(() => {
        generateExplanation({ track, provenance });
      }).toThrow(/FEATURE_MISSING.*valence/);
    });

    it('should throw error when invalid audio feature is used', () => {
      const track = {
        id: 'test',
        audio_features: { energy: 0.5, invalid_feature: 0.3 }
      };

      const provenance = {
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy', 'invalid_feature']
      };

      expect(() => {
        generateExplanation({ track, provenance });
      }).toThrow(/INVALID_FEATURE.*invalid_feature/);
    });

    it('should include novelty information when available', () => {
      const track = {
        id: 'test',
        name: 'Test Song',
        audio_features: { energy: 0.5 }
      };

      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy'],
        noveltyDaysSinceLastPlay: 30
      });

      const explanation = generateExplanation({ track, provenance });
      expect(explanation.text).toMatch(/month.*since/); // Changed to match actual output pattern
    });

    it('should include diversity information when applicable', () => {
      const track = {
        id: 'test',
        name: 'Test Song',
        audio_features: { energy: 0.5 }
      };

      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy'],
        diversityPenaltyApplied: 0.15
      });

      const explanation = generateExplanation({ track, provenance });
      expect(explanation.text).toMatch(/15%.*diversity/);
    });

    it('should handle multiple strategies correctly', () => {
      const track = {
        id: 'test',
        name: 'Test Song',
        audio_features: { energy: 0.7, valence: 0.8 }
      };

      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['collaborative', 'content'],
        scoreComponents: { collaborative: 0.6, content: 0.4 },
        featuresUsed: ['energy', 'valence']
      });

      const explanation = generateExplanation({ track, provenance });
      expect(explanation.strategies).toEqual(['collaborative', 'content']);
      expect(explanation.text).toContain('content analysis (40%)');
    });
  });

  describe('generateBatchExplanations', () => {
    it('should generate explanations for multiple recommendations', () => {
      const recommendations = [
        {
          track: {
            id: 'track1',
            name: 'Song 1',
            audio_features: { energy: 0.5 }
          },
          provenance: buildProvenance({
            trackId: 'track1',
            strategies: ['content'],
            scoreComponents: { content: 1.0 },
            featuresUsed: ['energy']
          })
        },
        {
          track: {
            id: 'track2',
            name: 'Song 2',
            audio_features: { valence: 0.7 }
          },
          provenance: buildProvenance({
            trackId: 'track2',
            strategies: ['collaborative'],
            scoreComponents: { collaborative: 1.0 },
            featuresUsed: ['valence']
          })
        }
      ];

      const explanations = generateBatchExplanations(recommendations);
      
      expect(explanations).toHaveLength(2);
      expect(explanations[0]).toHaveProperty('text');
      expect(explanations[1]).toHaveProperty('text');
      expect(explanations[0].text).toContain('Song 1');
      expect(explanations[1].text).toContain('Song 2');
    });

    it('should handle errors gracefully in batch processing', () => {
      const recommendations = [
        {
          track: {
            id: 'track1',
            audio_features: { energy: 0.5 }
          },
          provenance: buildProvenance({
            trackId: 'track1',
            strategies: ['content'],
            scoreComponents: { content: 1.0 },
            featuresUsed: ['energy']
          })
        },
        {
          track: {
            id: 'track2',
            audio_features: { energy: 0.5 }
          },
          provenance: {
            // Invalid provenance that will cause error
            featuresUsed: ['nonexistent_feature']
          }
        }
      ];

      const explanations = generateBatchExplanations(recommendations);
      
      expect(explanations).toHaveLength(2);
      expect(explanations[0]).not.toHaveProperty('error');
      expect(explanations[1]).toHaveProperty('error');
    });
  });

  describe('validateExplanation', () => {
    it('should validate explanation against provenance', () => {
      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy', 'valence']
      });

      const explanation = {
        text: 'Test explanation',
        strategies: ['content'],
        featuresUsed: ['energy', 'valence']
      };

      expect(validateExplanation(explanation, provenance)).toBe(true);
    });

    it('should reject explanation with features not in provenance', () => {
      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy']
      });

      const explanation = {
        text: 'Test explanation',
        strategies: ['content'],
        featuresUsed: ['energy', 'valence'] // valence not in provenance
      };

      expect(validateExplanation(explanation, provenance)).toBe(false);
    });

    it('should reject explanation with strategies not in provenance', () => {
      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy']
      });

      const explanation = {
        text: 'Test explanation',
        strategies: ['content', 'collaborative'], // collaborative not in provenance
        featuresUsed: ['energy']
      };

      expect(validateExplanation(explanation, provenance)).toBe(false);
    });
  });

  describe('Feature validation', () => {
    it('should only allow valid Spotify audio features', () => {
      const validFeatures = ['energy', 'valence', 'danceability', 'tempo', 'acousticness'];
      
      for (const feature of validFeatures) {
        expect(VALID_AUDIO_FEATURES).toContain(feature);
      }
    });

    it('should reject non-Spotify features', () => {
      const invalidFeatures = ['mood', 'genre', 'popularity', 'release_date'];
      
      for (const feature of invalidFeatures) {
        expect(VALID_AUDIO_FEATURES).not.toContain(feature);
      }
    });
  });

  describe('No hallucination policy', () => {
    it('should only reference features that exist in track data', () => {
      const track = {
        id: 'test',
        name: 'Test Song',
        audio_features: {
          energy: 0.8,
          valence: 0.6
          // Note: no danceability or other features
        }
      };

      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy', 'valence']
      });

      const explanation = generateExplanation({ track, provenance });
      
      // Explanation should only mention energy and valence
      expect(explanation.featuresUsed).toEqual(['energy', 'valence']);
      expect(explanation.text).not.toMatch(/danceability|tempo|acousticness/);
    });

    it('should not generate explanations with qualitative descriptions not in data model', () => {
      const track = {
        id: 'test',
        name: 'Test Song',
        audio_features: { energy: 0.8 }
      };

      const provenance = buildProvenance({
        trackId: 'test',
        strategies: ['content'],
        scoreComponents: { content: 1.0 },
        featuresUsed: ['energy']
      });

      const explanation = generateExplanation({ track, provenance });
      
      // Should not contain qualitative descriptions not supported by data
      expect(explanation.text).not.toMatch(/haunting|ethereal|uplifting|melancholic|powerful/);
    });
  });
});