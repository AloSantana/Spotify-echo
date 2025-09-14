/**
 * Generate explanations for music recommendations
 * Provides transparent reasoning for recommendation choices based on audio features and user patterns
 */

const { VALID_AUDIO_FEATURES } = require('../provenance/model');

/**
 * Generate explanation for a single recommendation
 * @param {Object} config - Configuration object with track and provenance
 * @param {Object} options - Options for explanation generation
 * @returns {Object} Explanation object
 */
function generateExplanation(config, options = {}) {
  if (!config || typeof config !== 'object') {
    throw new Error('MISSING_INPUT: config object is required');
  }

  const { track, provenance } = config;
  
  if (!track) {
    throw new Error('MISSING_INPUT: track is required');
  }
  
  if (!provenance) {
    throw new Error('MISSING_INPUT: provenance is required');
  }

  const audioFeatures = track.audio_features || track.audioFeatures || {};
  const featuresUsed = provenance.featuresUsed || [];
  
  // Validate that all referenced features exist in the track's feature object
  for (const feature of featuresUsed) {
    if (!(feature in audioFeatures)) {
      throw new Error(`FEATURE_MISSING: Feature '${feature}' referenced in provenance but not found in track audio features. Available features: ${Object.keys(audioFeatures).join(', ')}`);
    }
    
    // Validate that feature is a known audio feature
    if (!VALID_AUDIO_FEATURES.includes(feature)) {
      throw new Error(`INVALID_FEATURE: Feature '${feature}' is not a valid Spotify audio feature. Valid features: ${VALID_AUDIO_FEATURES.join(', ')}`);
    }
  }

  // Get strategy information
  const strategies = provenance.strategies || [];
  const scoreComponents = provenance.scoreComponents || {};
  
  // Generate base explanation using only validated features
  let explanation = generateBaseExplanation(track, audioFeatures, featuresUsed, strategies, scoreComponents);
  
  // Add novelty information if available
  if (provenance.noveltyDaysSinceLastPlay !== undefined && provenance.noveltyDaysSinceLastPlay !== null) {
    explanation += generateNoveltyExplanation(provenance.noveltyDaysSinceLastPlay);
  }
  
  // Add diversity information if applicable
  if (provenance.diversityPenaltyApplied && provenance.diversityPenaltyApplied > 0) {
    explanation += generateDiversityExplanation(provenance.diversityPenaltyApplied);
  }

  return {
    text: explanation.trim(),
    confidence: calculateExplanationConfidence(featuresUsed, strategies),
    strategies: strategies,
    featuresUsed: featuresUsed,
    explanationRef: provenance.explanationRef || generateExplanationRef(track, strategies)
  };
}

/**
 * Generate base explanation text based on audio features and strategies
 */
function generateBaseExplanation(track, audioFeatures, featuresUsed, strategies, scoreComponents) {
  const trackName = track.name || 'This track';
  const artistName = track.artists?.[0]?.name || track.artist || 'the artist';
  
  // Primary strategy explanation
  const primaryStrategy = strategies[0] || 'content';
  const primaryScore = scoreComponents[primaryStrategy] || 1.0;
  
  let explanation = '';
  
  if (primaryStrategy === 'collaborative') {
    explanation = `${trackName} by ${artistName} is recommended because users with similar taste also enjoyed it. `;
  } else if (primaryStrategy === 'content') {
    explanation = `${trackName} by ${artistName} matches your preferences based on its musical characteristics. `;
  } else if (primaryStrategy === 'semantic') {
    explanation = `${trackName} by ${artistName} is recommended based on semantic similarity to your listening history. `;
  } else {
    explanation = `${trackName} by ${artistName} is recommended based on multiple analysis approaches. `;
  }
  
  // Add feature-specific explanations (only for features that exist and are validated)
  if (featuresUsed.length > 0) {
    const featureExplanations = generateFeatureExplanations(audioFeatures, featuresUsed);
    if (featureExplanations.length > 0) {
      explanation += `It features ${featureExplanations.join(', ')}.`;
    }
  }
  
  // Add multi-strategy explanation if applicable
  if (strategies.length > 1) {
    const strategyContributions = strategies
      .filter(s => s !== primaryStrategy)
      .map(s => {
        const score = scoreComponents[s] || 0;
        const percentage = Math.round(score * 100);
        return `${s} analysis (${percentage}%)`;
      });
    
    if (strategyContributions.length > 0) {
      explanation += ` This recommendation also incorporates ${strategyContributions.join(' and ')}.`;
    }
  }
  
  return explanation;
}

/**
 * Generate explanations for specific audio features (deterministic based on real values)
 */
function generateFeatureExplanations(audioFeatures, featuresUsed) {
  const explanations = [];
  
  featuresUsed.forEach(feature => {
    const value = audioFeatures[feature];
    if (value === undefined || value === null) return;
    
    let explanation = '';
    
    switch (feature) {
      case 'energy':
        const energy = parseFloat(value);
        if (energy >= 0.7) explanation = `high energy (${energy.toFixed(2)})`;
        else if (energy >= 0.4) explanation = `moderate energy (${energy.toFixed(2)})`;
        else explanation = `calm energy (${energy.toFixed(2)})`;
        break;
        
      case 'valence':
        const valence = parseFloat(value);
        if (valence >= 0.7) explanation = `positive mood (${valence.toFixed(2)})`;
        else if (valence >= 0.4) explanation = `neutral mood (${valence.toFixed(2)})`;
        else explanation = `melancholic mood (${valence.toFixed(2)})`;
        break;
        
      case 'danceability':
        const danceability = parseFloat(value);
        if (danceability >= 0.7) explanation = `high danceability (${danceability.toFixed(2)})`;
        else if (danceability >= 0.4) explanation = `moderate danceability (${danceability.toFixed(2)})`;
        else explanation = `low danceability (${danceability.toFixed(2)})`;
        break;
        
      case 'tempo':
        const tempo = parseFloat(value);
        if (tempo >= 140) explanation = `fast tempo (${Math.round(tempo)} BPM)`;
        else if (tempo >= 90) explanation = `moderate tempo (${Math.round(tempo)} BPM)`;
        else explanation = `slow tempo (${Math.round(tempo)} BPM)`;
        break;
        
      case 'acousticness':
        const acousticness = parseFloat(value);
        if (acousticness >= 0.7) explanation = `acoustic sound (${acousticness.toFixed(2)})`;
        else if (acousticness >= 0.3) explanation = `mixed acoustic elements (${acousticness.toFixed(2)})`;
        break;
        
      case 'instrumentalness':
        const instrumentalness = parseFloat(value);
        if (instrumentalness >= 0.7) explanation = `primarily instrumental (${instrumentalness.toFixed(2)})`;
        else if (instrumentalness >= 0.3) explanation = `some instrumental passages (${instrumentalness.toFixed(2)})`;
        break;
        
      case 'liveness':
        const liveness = parseFloat(value);
        if (liveness >= 0.7) explanation = `live recording feel (${liveness.toFixed(2)})`;
        break;
        
      case 'speechiness':
        const speechiness = parseFloat(value);
        if (speechiness >= 0.7) explanation = `speech-like characteristics (${speechiness.toFixed(2)})`;
        else if (speechiness >= 0.4) explanation = `some spoken elements (${speechiness.toFixed(2)})`;
        break;
        
      case 'loudness':
        const loudness = parseFloat(value);
        explanation = `${loudness.toFixed(1)} dB loudness`;
        break;
        
      case 'key':
        const key = parseInt(value);
        const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        if (key >= 0 && key < 12) {
          explanation = `${keyNames[key]} key`;
        }
        break;
        
      case 'mode':
        const mode = parseInt(value);
        explanation = mode === 1 ? 'major mode' : 'minor mode';
        break;
        
      case 'time_signature':
        const timeSignature = parseInt(value);
        explanation = `${timeSignature}/4 time signature`;
        break;
    }
    
    if (explanation) {
      explanations.push(explanation);
    }
  });
  
  return explanations;
}

/**
 * Generate novelty explanation
 */
function generateNoveltyExplanation(daysSinceLastPlay) {
  if (daysSinceLastPlay === 0) {
    return ' You recently played this track.';
  } else if (daysSinceLastPlay < 7) {
    return ` You last played this ${daysSinceLastPlay} day${daysSinceLastPlay > 1 ? 's' : ''} ago.`;
  } else if (daysSinceLastPlay < 30) {
    const weeks = Math.round(daysSinceLastPlay / 7);
    return ` You last played this ${weeks} week${weeks > 1 ? 's' : ''} ago.`;
  } else {
    const months = Math.round(daysSinceLastPlay / 30);
    return ` It's been ${months} month${months > 1 ? 's' : ''} since you last played this.`;
  }
}

/**
 * Generate diversity explanation
 */
function generateDiversityExplanation(diversityPenalty) {
  const percentage = Math.round(diversityPenalty * 100);
  return ` This adds ${percentage}% diversity to your recommendations.`;
}

/**
 * Calculate confidence score for explanation
 */
function calculateExplanationConfidence(featuresUsed, strategies) {
  let confidence = 0.5; // Base confidence
  
  // More features = higher confidence
  confidence += (featuresUsed.length * 0.1);
  
  // Multiple strategies = higher confidence
  confidence += (strategies.length * 0.15);
  
  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Generate explanation reference ID
 */
function generateExplanationRef(track, strategies) {
  const trackId = track.id || track.track_id || 'unknown';
  const strategyStr = strategies.join('_');
  const timestamp = Date.now();
  return `exp_${strategyStr}_${trackId.slice(-8)}_${timestamp}`;
}

/**
 * Generate batch explanations for multiple tracks
 * @param {Array} recommendations - Array of {track, provenance} objects
 * @param {Object} options - Generation options
 * @returns {Array} Array of explanation objects
 */
function generateBatchExplanations(recommendations, options = {}) {
  if (!Array.isArray(recommendations)) {
    throw new Error('INVALID_INPUT: recommendations must be an array');
  }
  
  return recommendations.map((rec, index) => {
    try {
      return generateExplanation({ track: rec.track, provenance: rec.provenance }, options);
    } catch (error) {
      console.error(`Error generating explanation for recommendation ${index}:`, error.message);
      return {
        text: 'This track is recommended based on your listening preferences.',
        confidence: 0.3,
        strategies: ['content'],
        featuresUsed: [],
        error: error.message
      };
    }
  });
}

/**
 * Validate explanation against provenance
 * @param {Object} explanation - Generated explanation object
 * @param {Object} provenance - Original provenance object
 * @returns {boolean} Whether explanation is valid
 */
function validateExplanation(explanation, provenance) {
  try {
    // Check that explanation references only features in provenance
    const provenanceFeaturesUsed = provenance.featuresUsed || [];
    const explanationFeaturesUsed = explanation.featuresUsed || [];
    
    for (const feature of explanationFeaturesUsed) {
      if (!provenanceFeaturesUsed.includes(feature)) {
        console.warn(`Explanation references feature '${feature}' not in provenance`);
        return false;
      }
    }
    
    // Check that strategies match
    const provenanceStrategies = provenance.strategies || [];
    const explanationStrategies = explanation.strategies || [];
    
    for (const strategy of explanationStrategies) {
      if (!provenanceStrategies.includes(strategy)) {
        console.warn(`Explanation references strategy '${strategy}' not in provenance`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating explanation:', error.message);
    return false;
  }
}

module.exports = {
  generateExplanation,
  generateBatchExplanations,
  validateExplanation,
  generateFeatureExplanations,
  calculateExplanationConfidence
};