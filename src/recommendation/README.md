# Recommendation Engine

## Purpose
Multi-strategy recommendation system that provides personalized music discovery through various algorithmic approaches. This module contains the core recommendation logic and strategy implementations.

## Public Interfaces

### RecommendationEngine
Main engine that orchestrates multiple recommendation strategies:

```javascript
const engine = new RecommendationEngine();

// Generate recommendations using multiple strategies
const recommendations = await engine.generate({
  userId: 'user123',
  userContext: context,
  strategy: 'hybrid',
  limit: 20,
  seeds: ['track1', 'track2'],
  filters: { genre: 'rock' }
});

// Explain a recommendation
const explanation = await engine.explainRecommendation(trackId, userId, context);

// Update user model with feedback
await engine.updateUserModel(userId, feedback);
```

## Strategies

### Available Strategies
- **collaborative** - Collaborative filtering based on user behavior patterns
- **content-based** - Content analysis using audio features and metadata  
- **embedding-semantic** - Semantic similarity using embedding vectors
- **hybrid-rerank** - Weighted combination with intelligent reranking

### Strategy Interface
All strategies implement a consistent interface:

```javascript
{
  async run({ userId, seeds, limits, context }) {
    return {
      candidates: [
        {
          trackId: 'spotify:track:...',
          score: 0.95,
          reasons: ['Similar tempo', 'Same genre', 'User preference match']
        }
      ],
      diagnostics: {
        strategy: 'collaborative',
        executionTime: 120,
        candidateCount: 50,
        confidence: 0.89
      }
    };
  }
}
```

## Files

- `engine.js` - Main recommendation engine
- `strategies/index.js` - Strategy registry and factory
- `strategies/collaborativeStrategy.js` - Collaborative filtering implementation
- `strategies/contentAudioFeatureStrategy.js` - Content-based filtering
- `strategies/embeddingSemanticStrategy.js` - Semantic similarity
- `strategies/hybridRerankStrategy.js` - Hybrid reranking algorithm