/**
 * Recommendation Provenance Model
 * Validates and constructs provenance objects for recommendation transparency
 */

// Valid Spotify audio features
const VALID_AUDIO_FEATURES = [
  'danceability', 'energy', 'valence', 'tempo', 
  'acousticness', 'instrumentalness', 'liveness', 
  'speechiness', 'loudness', 'key', 'mode', 'time_signature'
];

// Valid recommendation strategies
const VALID_STRATEGIES = [
  'collaborative', 'content', 'semantic', 'hybrid'
];

/**
 * Validate provenance object structure and values
 * @param {Object} provenance - Provenance object to validate
 * @throws {Error} If validation fails
 */
function validateProvenance(provenance) {
  if (!provenance || typeof provenance !== 'object') {
    throw new Error('INVALID_PROVENANCE: Provenance must be an object');
  }

  // Check required fields
  const requiredFields = ['trackId', 'strategies', 'scoreComponents', 'featuresUsed'];
  for (const field of requiredFields) {
    if (!(field in provenance)) {
      throw new Error(`MISSING_REQUIRED_FIELD: ${field} is required`);
    }
  }

  // Validate trackId
  if (typeof provenance.trackId !== 'string' || !provenance.trackId.trim()) {
    throw new Error('INVALID_TRACK_ID: trackId must be a non-empty string');
  }

  // Validate strategies
  if (!Array.isArray(provenance.strategies) || provenance.strategies.length === 0) {
    throw new Error('INVALID_STRATEGIES: strategies must be a non-empty array');
  }

  for (const strategy of provenance.strategies) {
    if (!VALID_STRATEGIES.includes(strategy)) {
      throw new Error(`INVALID_STRATEGY: ${strategy} is not a valid strategy. Valid: ${VALID_STRATEGIES.join(', ')}`);
    }
  }

  // Validate scoreComponents
  if (!provenance.scoreComponents || typeof provenance.scoreComponents !== 'object') {
    throw new Error('INVALID_SCORE_COMPONENTS: scoreComponents must be an object');
  }

  const scoreSum = Object.values(provenance.scoreComponents).reduce((sum, score) => {
    if (typeof score !== 'number' || score < 0 || score > 1) {
      throw new Error(`INVALID_SCORE_VALUE: Score values must be numbers between 0 and 1, got ${score}`);
    }
    return sum + score;
  }, 0);

  if (Math.abs(scoreSum - 1.0) > 0.01) {
    throw new Error(`INVALID_SCORE_SUM: Score components must sum to ~1.0, got ${scoreSum}`);
  }

  // Validate featuresUsed
  if (!Array.isArray(provenance.featuresUsed) || provenance.featuresUsed.length === 0) {
    throw new Error('INVALID_FEATURES_USED: featuresUsed must be a non-empty array');
  }

  for (const feature of provenance.featuresUsed) {
    if (!VALID_AUDIO_FEATURES.includes(feature)) {
      throw new Error(`INVALID_FEATURE: ${feature} is not a valid audio feature. Valid: ${VALID_AUDIO_FEATURES.join(', ')}`);
    }
  }

  // Validate optional fields
  if ('diversityPenaltyApplied' in provenance) {
    const penalty = provenance.diversityPenaltyApplied;
    if (typeof penalty !== 'number' || penalty < 0 || penalty > 1) {
      throw new Error('INVALID_DIVERSITY_PENALTY: diversityPenaltyApplied must be a number between 0 and 1');
    }
  }

  if ('noveltyDaysSinceLastPlay' in provenance) {
    const novelty = provenance.noveltyDaysSinceLastPlay;
    if (novelty !== null && (typeof novelty !== 'number' || novelty < 0)) {
      throw new Error('INVALID_NOVELTY_DAYS: noveltyDaysSinceLastPlay must be null or a non-negative number');
    }
  }

  if ('explanationRef' in provenance) {
    const ref = provenance.explanationRef;
    if (typeof ref !== 'string' || !ref.trim()) {
      throw new Error('INVALID_EXPLANATION_REF: explanationRef must be a non-empty string');
    }
  }

  return true;
}

/**
 * Build provenance object from entry specification
 * @param {Object} entrySpec - Specification for building provenance
 * @returns {Object} Valid provenance object
 */
function buildProvenance(entrySpec) {
  if (!entrySpec || typeof entrySpec !== 'object') {
    throw new Error('NOT_IMPLEMENTED: entrySpec must be provided as object');
  }

  // Check required specification fields
  const requiredSpecFields = ['trackId', 'strategies', 'scoreComponents', 'featuresUsed'];
  for (const field of requiredSpecFields) {
    if (!(field in entrySpec)) {
      throw new Error(`NOT_IMPLEMENTED: Missing required field in entrySpec: ${field}`);
    }
  }

  // Build the provenance object
  const provenance = {
    trackId: entrySpec.trackId,
    strategies: [...entrySpec.strategies], // Clone array
    scoreComponents: { ...entrySpec.scoreComponents }, // Clone object
    featuresUsed: [...entrySpec.featuresUsed], // Clone array
  };

  // Add optional fields if provided
  if ('diversityPenaltyApplied' in entrySpec) {
    provenance.diversityPenaltyApplied = entrySpec.diversityPenaltyApplied;
  }

  if ('noveltyDaysSinceLastPlay' in entrySpec) {
    provenance.noveltyDaysSinceLastPlay = entrySpec.noveltyDaysSinceLastPlay;
  }

  if ('explanationRef' in entrySpec) {
    provenance.explanationRef = entrySpec.explanationRef;
  }

  // Validate the built provenance
  validateProvenance(provenance);

  return provenance;
}

/**
 * Create a default provenance object for fallback scenarios
 * @param {string} trackId - Track identifier
 * @param {string} strategy - Primary strategy used
 * @returns {Object} Basic provenance object
 */
function createDefaultProvenance(trackId, strategy = 'content') {
  if (!trackId || typeof trackId !== 'string') {
    throw new Error('NOT_IMPLEMENTED: trackId is required for default provenance');
  }

  if (!VALID_STRATEGIES.includes(strategy)) {
    throw new Error(`NOT_IMPLEMENTED: Invalid strategy for default provenance: ${strategy}`);
  }

  return buildProvenance({
    trackId,
    strategies: [strategy],
    scoreComponents: { [strategy]: 1.0 },
    featuresUsed: ['energy', 'valence'], // Most common features
    diversityPenaltyApplied: 0,
    noveltyDaysSinceLastPlay: null
  });
}

/**
 * Merge multiple provenance objects (for hybrid recommendations)
 * @param {Array} provenances - Array of provenance objects to merge
 * @returns {Object} Merged provenance object
 */
function mergeProvenance(provenances) {
  if (!Array.isArray(provenances) || provenances.length === 0) {
    throw new Error('NOT_IMPLEMENTED: provenances must be a non-empty array');
  }

  if (provenances.length === 1) {
    return provenances[0];
  }

  // Validate all input provenances
  provenances.forEach((prov, index) => {
    try {
      validateProvenance(prov);
    } catch (error) {
      throw new Error(`NOT_IMPLEMENTED: Invalid provenance at index ${index}: ${error.message}`);
    }
  });

  // Use the first trackId (should be the same for all)
  const trackId = provenances[0].trackId;
  
  // Merge strategies (unique)
  const strategies = [...new Set(provenances.flatMap(p => p.strategies))];
  
  // Merge featuresUsed (unique)
  const featuresUsed = [...new Set(provenances.flatMap(p => p.featuresUsed))];
  
  // Average score components (weighted)
  const scoreComponents = {};
  const weight = 1 / provenances.length;
  
  for (const prov of provenances) {
    for (const [strategy, score] of Object.entries(prov.scoreComponents)) {
      scoreComponents[strategy] = (scoreComponents[strategy] || 0) + (score * weight);
    }
  }

  // Average optional numeric fields
  const diversityPenalties = provenances
    .filter(p => 'diversityPenaltyApplied' in p)
    .map(p => p.diversityPenaltyApplied);
  
  const diversityPenaltyApplied = diversityPenalties.length > 0
    ? diversityPenalties.reduce((sum, val) => sum + val, 0) / diversityPenalties.length
    : undefined;

  const noveltyDays = provenances
    .filter(p => 'noveltyDaysSinceLastPlay' in p && p.noveltyDaysSinceLastPlay !== null)
    .map(p => p.noveltyDaysSinceLastPlay);
  
  const noveltyDaysSinceLastPlay = noveltyDays.length > 0
    ? Math.round(noveltyDays.reduce((sum, val) => sum + val, 0) / noveltyDays.length)
    : null;

  const merged = {
    trackId,
    strategies,
    scoreComponents,
    featuresUsed
  };

  if (diversityPenaltyApplied !== undefined) {
    merged.diversityPenaltyApplied = diversityPenaltyApplied;
  }

  if (noveltyDaysSinceLastPlay !== null) {
    merged.noveltyDaysSinceLastPlay = noveltyDaysSinceLastPlay;
  }

  // Generate explanationRef for merged provenance
  merged.explanationRef = `merged_${strategies.join('_')}_${Date.now()}`;

  return merged;
}

module.exports = {
  validateProvenance,
  buildProvenance,
  createDefaultProvenance,
  mergeProvenance,
  VALID_AUDIO_FEATURES,
  VALID_STRATEGIES
};