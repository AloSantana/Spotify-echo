# Data Model Documentation

This document defines the comprehensive data models and schemas used throughout EchoTune AI. As the application evolves, this serves as the authoritative reference for database design, API contracts, and data relationships.

## Overview

EchoTune AI manages several core data entities:

- **Users**: Authentication and profile information
- **Settings**: User preferences and configuration
- **Listening History**: Spotify activity tracking
- **Recommendations**: AI-generated music suggestions
- **Chat Sessions**: Conversational AI interactions
- **Events**: System events and analytics
- **Feature Store**: ML-derived features and embeddings

## Database Architecture

### Primary Database: MongoDB

MongoDB serves as the primary database for flexible document storage and scalability.

**Connection**: `MONGODB_URI` environment variable  
**Database Name**: `echotune_ai`  
**Collections**: See individual schemas below

### Caching Layer: Redis

Redis provides high-performance caching for frequently accessed data.

**Connection**: `REDIS_URL` environment variable  
**Usage**: Session storage, API caching, recommendation caching

### Fallback Database: SQLite

SQLite serves as a local fallback for development and testing.

**File**: `./data/echotune.db`  
**Usage**: Development environments, automated testing

## Core Data Models

### 1. Users

Stores user identity and Spotify integration information.

```javascript
// Collection: users
{
  _id: ObjectId,
  userId: String,           // Unique user identifier
  email: String,           // User email (unique)
  spotifyId: String,       // Spotify user ID (unique, optional)
  displayName: String,     // User display name
  profileImage: String,    // Profile image URL
  spotifyConnected: Boolean, // Spotify integration status
  spotifyTokens: {         // Encrypted Spotify tokens
    accessToken: String,   // Encrypted access token
    refreshToken: String,  // Encrypted refresh token
    expiresAt: Date,      // Token expiration
    scope: String         // Granted scopes
  },
  createdAt: Date,         // Account creation timestamp
  lastLoginAt: Date,       // Last login timestamp
  isActive: Boolean,       // Account status
  preferences: {           // Basic user preferences
    explicitContent: Boolean,
    audioQuality: String,  // 'high', 'medium', 'low'
    notifications: Boolean
  }
}

// Indexes
db.users.createIndex({ "userId": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "spotifyId": 1 }, { unique: true, sparse: true })
db.users.createIndex({ "lastLoginAt": 1 })
```

### 2. User Settings

Detailed user preferences and AI configuration.

```javascript
// Collection: user_settings
{
  _id: ObjectId,
  userId: String,          // Reference to users.userId
  preferences: {
    music: {
      genres: [String],    // Preferred genres
      moods: [String],     // Preferred moods
      activities: [String], // Listening contexts
      artists: [String],   // Favorite artists
      energy: Number,      // Energy preference (0-1)
      valence: Number,     // Positivity preference (0-1)
      danceability: Number // Danceability preference (0-1)
    },
    ai: {
      provider: String,    // 'openai', 'gemini', 'anthropic'
      model: String,       // Specific model preference
      creativity: Number,  // Response creativity (0-1)
      context: Number,     // Context window preference
      language: String     // Response language
    },
    interface: {
      theme: String,       // 'light', 'dark', 'auto'
      density: String,     // 'compact', 'comfortable', 'spacious'
      animations: Boolean, // Enable UI animations
      sounds: Boolean      // Enable UI sounds
    }
  },
  updatedAt: Date,         // Last update timestamp
  version: Number          // Optimistic concurrency control
}

// Indexes
db.user_settings.createIndex({ "userId": 1 }, { unique: true })
db.user_settings.createIndex({ "updatedAt": 1 })
```

### 3. Listening History

User's Spotify listening activity for personalization.

```javascript
// Collection: listening_history
{
  _id: ObjectId,
  userId: String,          // Reference to users.userId
  trackId: String,         // Spotify track ID
  trackName: String,       // Track name (denormalized)
  artistName: String,      // Primary artist name (denormalized)
  albumName: String,       // Album name (denormalized)
  playedAt: Date,          // When track was played
  playDuration: Number,    // How long played (ms)
  trackDuration: Number,   // Total track duration (ms)
  completionRate: Number,  // playDuration / trackDuration
  context: {
    source: String,        // 'playlist', 'album', 'radio', 'search'
    uri: String,          // Context URI
    shuffle: Boolean,      // Shuffle mode
    repeat: String        // 'off', 'track', 'context'
  },
  audioFeatures: {         // Spotify audio features
    danceability: Number,
    energy: Number,
    key: Number,
    loudness: Number,
    mode: Number,
    speechiness: Number,
    acousticness: Number,
    instrumentalness: Number,
    liveness: Number,
    valence: Number,
    tempo: Number
  },
  importedAt: Date         // When imported to EchoTune
}

// Indexes
db.listening_history.createIndex({ "userId": 1, "playedAt": -1 })
db.listening_history.createIndex({ "trackId": 1 })
db.listening_history.createIndex({ "playedAt": 1 })
db.listening_history.createIndex({ "userId": 1, "importedAt": -1 })

// TTL Index for data retention (optional)
// db.listening_history.createIndex({ "playedAt": 1 }, { expireAfterSeconds: 31536000 }) // 1 year
```

### 4. Recommendations Cache

AI-generated music recommendations with metadata.

```javascript
// Collection: recommendations_cache
{
  _id: ObjectId,
  userId: String,          // Reference to users.userId
  sessionId: String,       // Chat/recommendation session ID
  strategy: String,        // 'collaborative', 'content-based', 'hybrid'
  prompt: String,          // Original user prompt/query
  context: {
    mood: String,          // Requested mood
    activity: String,      // Listening context
    genres: [String],      // Requested genres
    timeOfDay: String,     // 'morning', 'afternoon', 'evening', 'night'
    weather: String        // Weather context (if available)
  },
  recommendations: [{
    trackId: String,       // Spotify track ID
    trackName: String,     // Track name
    artistName: String,    // Artist name
    albumName: String,     // Album name
    score: Number,         // Recommendation confidence (0-1)
    reasons: [String],     // Why recommended
    audioFeatures: Object, // Spotify audio features
    spotifyUrl: String,    // Spotify URI
    previewUrl: String     // 30-second preview URL
  }],
  metadata: {
    provider: String,      // AI provider used
    model: String,         // AI model used
    processingTime: Number, // Generation time (ms)
    confidence: Number,    // Overall confidence (0-1)
    diversity: Number      // Recommendation diversity score
  },
  generatedAt: Date,       // When generated
  expiresAt: Date,         // Cache expiration
  accessed: Number,        // Access count
  lastAccessedAt: Date     // Last access timestamp
}

// Indexes
db.recommendations_cache.createIndex({ "userId": 1, "generatedAt": -1 })
db.recommendations_cache.createIndex({ "sessionId": 1 })
db.recommendations_cache.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 }) // TTL
db.recommendations_cache.createIndex({ "strategy": 1, "userId": 1 })
```

### 5. Chat Sessions

Conversational AI interaction history.

```javascript
// Collection: chat_sessions
{
  _id: ObjectId,
  sessionId: String,       // Unique session identifier
  userId: String,          // Reference to users.userId
  title: String,           // Session title (optional)
  messages: [{
    messageId: String,     // Unique message ID
    role: String,          // 'user', 'assistant', 'system'
    content: String,       // Message content
    timestamp: Date,       // Message timestamp
    metadata: {
      provider: String,    // AI provider for assistant messages
      model: String,       // AI model used
      tokens: Number,      // Token count
      cost: Number,        // API cost (USD)
      processingTime: Number, // Response time (ms)
      context: Object     // Additional context
    }
  }],
  context: {
    musicPreferences: Object, // User's music context
    currentMood: String,     // Session mood
    activityContext: String  // What user is doing
  },
  recommendations: [{       // Recommendations made in this session
    messageId: String,      // Associated message
    trackIds: [String],     // Recommended track IDs
    strategy: String,       // Recommendation strategy
    accepted: Boolean       // User accepted recommendations
  }],
  startedAt: Date,         // Session start
  lastMessageAt: Date,     // Last activity
  isActive: Boolean,       // Session status
  summary: String          // AI-generated session summary
}

// Indexes
db.chat_sessions.createIndex({ "sessionId": 1 }, { unique: true })
db.chat_sessions.createIndex({ "userId": 1, "lastMessageAt": -1 })
db.chat_sessions.createIndex({ "lastMessageAt": 1 })
db.chat_sessions.createIndex({ "isActive": 1, "userId": 1 })
```

### 6. Events

System events for analytics and monitoring.

```javascript
// Collection: events
{
  _id: ObjectId,
  eventId: String,         // Unique event identifier
  type: String,            // Event type
  category: String,        // Event category
  userId: String,          // User who triggered event (optional)
  sessionId: String,       // Associated session (optional)
  data: Object,            // Event-specific data
  metadata: {
    source: String,        // Event source ('api', 'ui', 'system')
    version: String,       // Application version
    userAgent: String,     // User agent (for web events)
    ip: String,           // Client IP (hashed for privacy)
    country: String,      // Country code
    city: String         // City name
  },
  timestamp: Date,         // Event timestamp
  processedAt: Date        // When event was processed
}

// Event Types
// - user.login, user.logout, user.register
// - spotify.connect, spotify.disconnect, spotify.sync
// - chat.start, chat.message, chat.end
// - recommendation.request, recommendation.generate, recommendation.accept
// - playlist.create, playlist.update, playlist.delete
// - error.api, error.auth, error.system

// Indexes
db.events.createIndex({ "type": 1, "timestamp": -1 })
db.events.createIndex({ "userId": 1, "timestamp": -1 })
db.events.createIndex({ "category": 1, "timestamp": -1 })
db.events.createIndex({ "timestamp": 1 })

// TTL Index for data retention
db.events.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000 }) // 90 days
```

### 7. Feature Store (Planned)

ML-derived features and embeddings for advanced recommendations.

```javascript
// Collection: feature_store (TODO: Implementation planned)
{
  _id: ObjectId,
  userId: String,          // Reference to users.userId
  featureType: String,     // 'user_profile', 'track_embedding', 'similarity'
  features: {
    vector: [Number],      // Feature vector/embedding
    dimensions: Number,    // Vector dimensions
    algorithm: String,     // Algorithm used
    version: String        // Feature version
  },
  metadata: {
    confidence: Number,    // Feature confidence
    lastTrained: Date,     // When features were computed
    trainingData: {
      trackCount: Number,  // Number of tracks used
      historyDays: Number, // Days of history used
      algorithm: String   // Training algorithm
    }
  },
  computedAt: Date,        // When computed
  expiresAt: Date          // Feature expiration
}

// TODO: Define indexes based on query patterns
// TODO: Consider vector database integration (Pinecone, Weaviate)
```

## Data Relationships

### Relationship Diagram

```
Users (1) ←→ (1) UserSettings
  ↓ (1:N)
ListeningHistory
  ↓ (1:N)
RecommendationsCache
  ↓ (1:N)
ChatSessions (1) ←→ (N) Events
  ↓ (1:N)
FeatureStore (planned)
```

### Reference Integrity

- **Foreign Keys**: Enforced at application level
- **Cascading Deletes**: Handled by application logic
- **Data Consistency**: Eventual consistency model

## Future Enhancements

### Planned Improvements

1. **Vector Database Integration**
   - Pinecone or Weaviate for embedding storage
   - Semantic similarity search
   - Real-time recommendation updates

2. **Data Partitioning**
   - Partition by user ID for large-scale deployment
   - Time-based partitioning for historical data

3. **Real-time Streaming**
   - Apache Kafka for real-time event processing
   - Stream processing for live recommendations

---

This data model documentation will be updated as new features are implemented and requirements evolve. For implementation details, refer to the actual model files in `src/models/` and schema definitions in `src/database/`.
  albumName: String,
  genres: [String],
  playedAt: Date,
  playDuration: Number, // ms
  trackDuration: Number, // ms
  playedPercentage: Number, // 0-100
  context: {
    source: String, // "recommendation" | "search" | "playlist" | "radio"
    recommendationId: ObjectId, // If from recommendation
    sessionId: String
  },
  audioFeatures: {
    acousticness: Number,
    danceability: Number,
    energy: Number,
    instrumentalness: Number,
    liveness: Number,
    loudness: Number,
    speechiness: Number,
    tempo: Number,
    valence: Number
  },
  createdAt: Date
}

// Indexes for performance
db.listening_history.createIndex({ userId: 1, playedAt: -1 })
db.listening_history.createIndex({ spotifyUserId: 1, playedAt: -1 })
db.listening_history.createIndex({ trackId: 1 })
db.listening_history.createIndex({ playedAt: -1 })
db.listening_history.createIndex({ "context.recommendationId": 1 })
```

### recommendations
Generated recommendation sets and their metadata.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,
  strategy: String, // "collaborative" | "content-based" | "hybrid" | etc.
  candidates: [{
    trackId: String,
    score: Number,
    rank: Number,
    reasons: [String],
    metadata: {
      artist: String,
      trackName: String,
      genres: [String],
      audioFeatures: Object
    }
  }],
  context: {
    seeds: [String], // Seed track IDs
    userQuery: String,
    mood: String,
    activity: String,
    filters: Object
  },
  performance: {
    generationTime: Number, // ms
    candidateCount: Number,
    strategy: String,
    confidence: Number
  },
  feedback: {
    tracksPlayed: [String],
    tracksLiked: [String],
    tracksSkipped: [String],
    overallRating: Number // 1-5
  },
  createdAt: Date,
  expiresAt: Date
}

// Indexes
db.recommendations.createIndex({ userId: 1, createdAt: -1 })
db.recommendations.createIndex({ sessionId: 1 })
db.recommendations.createIndex({ strategy: 1, createdAt: -1 })
db.recommendations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

### user_feedback
Explicit and implicit user feedback signals.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  trackId: String,
  signal: String, // "like" | "dislike" | "love" | "skip" | "replay" | "save"
  strength: Number, // 1-5, signal strength
  context: {
    source: String, // "recommendation" | "search" | "radio"
    recommendationId: ObjectId,
    sessionId: String,
    playDuration: Number,
    totalDuration: Number
  },
  metadata: {
    timestamp: Date,
    platform: String, // "web" | "mobile" | "desktop"
    userAgent: String
  },
  createdAt: Date
}

// Indexes
db.user_feedback.createIndex({ userId: 1, createdAt: -1 })
db.user_feedback.createIndex({ trackId: 1, signal: 1 })
db.user_feedback.createIndex({ userId: 1, trackId: 1 })
db.user_feedback.createIndex({ "context.recommendationId": 1 })
```

### tracks
Cached track metadata and audio features.

```javascript
{
  _id: ObjectId,
  spotifyId: String, // Spotify track ID
  name: String,
  artists: [{
    id: String,
    name: String,
    genres: [String]
  }],
  album: {
    id: String,
    name: String,
    releaseDate: Date,
    images: [Object]
  },
  duration: Number, // ms
  popularity: Number, // 0-100
  explicit: Boolean,
  markets: [String], // Available markets
  audioFeatures: {
    acousticness: Number,
    danceability: Number,
    energy: Number,
    instrumentalness: Number,
    liveness: Number,
    loudness: Number,
    speechiness: Number,
    tempo: Number,
    valence: Number,
    key: Number,
    mode: Number,
    timeSignature: Number
  },
  analysis: {
    bars: [Object],
    beats: [Object],
    sections: [Object],
    segments: [Object],
    tatums: [Object]
  },
  lastUpdated: Date,
  createdAt: Date
}

// Indexes
db.tracks.createIndex({ spotifyId: 1 }, { unique: true })
db.tracks.createIndex({ "artists.id": 1 })
db.tracks.createIndex({ "album.id": 1 })
db.tracks.createIndex({ popularity: -1 })
db.tracks.createIndex({ lastUpdated: 1 })
```

### chat_sessions
Conversation history and context for chat interface.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,
  messages: [{
    role: String, // "user" | "assistant"
    content: String,
    timestamp: Date,
    metadata: {
      model: String,
      provider: String,
      tokenCount: Number,
      latency: Number
    }
  }],
  context: {
    musicPreferences: Object,
    currentMood: String,
    activity: String,
    recentTracks: [String]
  },
  recommendations: [ObjectId], // References to recommendations._id
  startedAt: Date,
  endedAt: Date,
  createdAt: Date
}

// Indexes
db.chat_sessions.createIndex({ userId: 1, startedAt: -1 })
db.chat_sessions.createIndex({ sessionId: 1 }, { unique: true })
db.chat_sessions.createIndex({ endedAt: 1 })
```

## Indexing Strategy

### Performance Considerations

1. **Query Patterns**
   - User-centric queries: Always include `userId` in compound indexes
   - Time-based queries: Include timestamp fields (`createdAt`, `playedAt`, etc.)
   - Recommendation lookups: Index by `recommendationId` and `sessionId`

2. **Compound Indexes**
   ```javascript
   // User listening history with time ordering
   { userId: 1, playedAt: -1 }
   
   // Recommendation performance tracking
   { strategy: 1, createdAt: -1, "performance.confidence": -1 }
   
   // Feedback analysis
   { userId: 1, signal: 1, createdAt: -1 }
   ```

3. **TTL Indexes**
   ```javascript
   // Auto-expire old recommendations
   { expiresAt: 1 }, { expireAfterSeconds: 0 }
   
   // Clean old chat sessions
   { endedAt: 1 }, { expireAfterSeconds: 86400 * 30 } // 30 days
   ```

### Index Maintenance Script

```javascript
// scripts/apply-indexes.js
const indexes = [
  // Users
  { collection: 'users', index: { spotifyId: 1 }, options: { unique: true } },
  { collection: 'users', index: { email: 1 }, options: { unique: true } },
  
  // Listening History
  { collection: 'listening_history', index: { userId: 1, playedAt: -1 } },
  { collection: 'listening_history', index: { trackId: 1 } },
  
  // Recommendations
  { collection: 'recommendations', index: { userId: 1, createdAt: -1 } },
  { collection: 'recommendations', index: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  
  // Feedback
  { collection: 'user_feedback', index: { userId: 1, createdAt: -1 } },
  { collection: 'user_feedback', index: { trackId: 1, signal: 1 } },
  
  // Tracks
  { collection: 'tracks', index: { spotifyId: 1 }, options: { unique: true } },
  
  // Chat Sessions
  { collection: 'chat_sessions', index: { userId: 1, startedAt: -1 } },
  { collection: 'chat_sessions', index: { sessionId: 1 }, options: { unique: true } }
];
```

## Sample Queries

### High-Performance Query Examples

```javascript
// Get user's recent listening history (last 30 days)
db.listening_history.find({
  userId: ObjectId("..."),
  playedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
}).sort({ playedAt: -1 }).limit(100)

// Find tracks with high energy and positive valence
db.tracks.find({
  "audioFeatures.energy": { $gte: 0.7 },
  "audioFeatures.valence": { $gte: 0.6 }
}).sort({ popularity: -1 })

// Get recommendation performance by strategy
db.recommendations.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
  { $group: {
    _id: "$strategy",
    avgConfidence: { $avg: "$performance.confidence" },
    avgGenerationTime: { $avg: "$performance.generationTime" },
    totalRecommendations: { $sum: 1 }
  }}
])

// Find similar users based on listening overlap
db.listening_history.aggregate([
  { $match: { userId: { $ne: ObjectId("target_user_id") } } },
  { $group: { _id: "$userId", tracks: { $addToSet: "$trackId" } } },
  { $project: { 
    userId: "$_id",
    commonTracks: { $setIntersection: ["$tracks", target_user_tracks] },
    totalTracks: { $size: "$tracks" }
  }},
  { $match: { $expr: { $gte: [{ $size: "$commonTracks" }, 5] } } },
  { $sort: { $size: "$commonTracks": -1 } }
])
```

## Performance Optimization

### Best Practices

1. **Aggregation Pipeline Optimization**
   - Use `$match` early to reduce data
   - Leverage indexes with `$sort` operations
   - Use `$limit` to control result set size

2. **Memory Usage**
   - Monitor working set size
   - Use projection to limit field retrieval
   - Implement pagination for large result sets

3. **Write Operations**
   - Batch insert operations when possible
   - Use appropriate write concerns
   - Monitor index overhead on writes

### Monitoring Queries

```javascript
// Index usage analysis
db.listening_history.explain("executionStats").find({
  userId: ObjectId("..."),
  playedAt: { $gte: new Date() }
})

// Slow query identification
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

## Data Validation

### Schema Validation Rules

```javascript
// Apply validation to collections
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["spotifyId", "email", "name"],
      properties: {
        spotifyId: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" },
        name: { bsonType: "string" },
        preferences: {
          bsonType: "object",
          properties: {
            favoriteGenres: { bsonType: "array", items: { bsonType: "string" } }
          }
        }
      }
    }
  }
})
```

## Migration Scripts

### Data Migration Utilities

```javascript
// Migrate legacy data format
db.listening_history.find({ audioFeatures: { $exists: false } }).forEach(doc => {
  // Fetch audio features from Spotify API
  // Update document with audio features
})

// Update index definitions
db.recommendations.dropIndex("old_index_name")
db.recommendations.createIndex({ userId: 1, createdAt: -1 })
```