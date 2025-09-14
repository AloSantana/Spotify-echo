# Recommendation Provenance Schema

## Overview

This document defines the provenance schema for the EchoTune AI recommendation system. Provenance tracks how recommendations are generated, ensuring transparency and explainability.

## Schema Definition

### Core Provenance Object

```json
{
  "trackId": "string",
  "strategies": ["collaborative", "content", "semantic"],
  "scoreComponents": {
    "collaborative": 0.42,
    "content": 0.31, 
    "semantic": 0.27
  },
  "featuresUsed": ["danceability", "energy", "valence"],
  "diversityPenaltyApplied": 0.05,
  "noveltyDaysSinceLastPlay": 37,
  "explanationRef": "hash-or-id"
}
```

### Field Definitions

#### `trackId` (required)
- Type: `string`
- Description: Spotify track URI or identifier
- Example: `"spotify:track:4iV5W9uYEdYUVa79Axb7Rh"`

#### `strategies` (required)
- Type: `array<string>`
- Description: List of recommendation strategies used
- Allowed values: `["collaborative", "content", "semantic", "hybrid"]`
- Example: `["collaborative", "content"]`

#### `scoreComponents` (required)
- Type: `object`
- Description: Score contribution from each strategy
- Values: Numbers between 0-1, should sum to 1.0
- Example: `{"collaborative": 0.6, "content": 0.4}`

#### `featuresUsed` (required)
- Type: `array<string>`
- Description: Audio features used in recommendation
- Allowed values: `["danceability", "energy", "valence", "tempo", "acousticness", "instrumentalness", "liveness", "speechiness", "loudness", "key", "mode", "time_signature"]`
- Example: `["energy", "valence", "danceability"]`

#### `diversityPenaltyApplied` (optional)
- Type: `number`
- Description: Penalty applied for diversity (0-1)
- Default: `0`
- Example: `0.05`

#### `noveltyDaysSinceLastPlay` (optional)
- Type: `number`
- Description: Days since user last played this track
- Default: `null`
- Example: `37`

#### `explanationRef` (optional)
- Type: `string`
- Description: Reference to explanation text or hash
- Example: `"exp_abc123"`

## Validation Rules

1. **Required Fields**: `trackId`, `strategies`, `scoreComponents`, `featuresUsed` must be present
2. **Score Validation**: `scoreComponents` values should sum to approximately 1.0 (±0.01)
3. **Feature Validation**: All `featuresUsed` values must be valid Spotify audio features
4. **Strategy Validation**: All `strategies` must be implemented recommendation strategies

## Usage Examples

### Basic Collaborative Filtering
```json
{
  "trackId": "spotify:track:123",
  "strategies": ["collaborative"],
  "scoreComponents": {"collaborative": 1.0},
  "featuresUsed": ["energy", "valence"],
  "noveltyDaysSinceLastPlay": 15
}
```

### Hybrid Recommendation
```json
{
  "trackId": "spotify:track:456", 
  "strategies": ["collaborative", "content", "semantic"],
  "scoreComponents": {
    "collaborative": 0.4,
    "content": 0.35,
    "semantic": 0.25
  },
  "featuresUsed": ["danceability", "energy", "valence", "tempo"],
  "diversityPenaltyApplied": 0.1,
  "noveltyDaysSinceLastPlay": 0,
  "explanationRef": "exp_hybrid_001"
}
```

## Error Handling

The system should validate provenance objects and throw descriptive errors:

- `MISSING_REQUIRED_FIELD`: When required fields are missing
- `INVALID_STRATEGY`: When strategy is not implemented
- `INVALID_FEATURE`: When feature is not a valid Spotify audio feature
- `INVALID_SCORE_SUM`: When score components don't sum to ~1.0
- `INVALID_VALUE_RANGE`: When values are outside expected ranges

## Future Extensions

- `timestamp`: When recommendation was generated
- `userId`: User for whom recommendation was made
- `contextTags`: Situational context (workout, study, etc.)
- `sourcePlaylist`: If recommendation came from specific playlist
- `modelVersion`: Version of recommendation model used