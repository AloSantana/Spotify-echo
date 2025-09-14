# Orchestration Layer

## Purpose
High-level product flows that orchestrate the integration between Chat, Recommendation Engine, and Spotify APIs. This is the **core product integration layer** that provides a single, stable interface for the conversational music discovery experience.

## Public Interfaces

### ChatRecommendationOrchestrator
The main orchestrator class that coordinates all product components:

```javascript
const orchestrator = new ChatRecommendationOrchestrator();

// Get comprehensive user context
const context = await orchestrator.getUserContext(userId);

// Generate recommendations using multiple strategies  
const recommendations = await orchestrator.generateRecommendations(userId, options);

// Build chat context for LLM interactions
const chatContext = await orchestrator.buildChatContext(userId, options);

// Ingest user feedback for personalization
await orchestrator.ingestFeedback(userId, trackId, signal, metadata);

// Generate explanations for recommendations
const explanation = await orchestrator.explain(trackId, userId);
```

## Architecture

```
ChatRecommendationOrchestrator
├── getUserContext()      → PersonalizationEngine + DatabaseManager
├── generateRecommendations() → RecommendationStrategies + SpotifyAPI
├── buildChatContext()    → ContextPipeline + UserProfile
├── ingestFeedback()      → FeedbackProcessor + CacheManager  
└── explain()             → ExplanationEngine + RecommendationMetadata
```

## Integration Points

- **Chat System**: Provides context and handles conversation flow
- **Recommendation Engine**: Manages strategy selection and execution
- **Spotify API**: Fetches track data and user listening history
- **Database Layer**: Persists user preferences and history
- **Cache Layer**: Optimizes performance with Redis caching

## Stability Contract

This layer provides a **stable interface** that shields the chat and recommendation systems from each other's internal changes. Product features should interact through this orchestrator rather than directly with underlying services.

## Files

- `ChatRecommendationOrchestrator.js` - Main orchestrator implementation
- `context-assembler.js` - User context assembly utilities
- `strategy-selector.js` - Recommendation strategy selection logic
- `feedback-processor.js` - User feedback ingestion and processing