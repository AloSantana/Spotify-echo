# Data Model Documentation

## Overview
EchoTune AI uses MongoDB as the primary database with well-defined collections for user data, music metadata, recommendations, and analytics. This document outlines the schema, indexing strategy, and performance considerations.

## Core Collections

### users
User profiles and authentication data.

```javascript
{
  _id: ObjectId,
  spotifyId: String, // Spotify user ID
  email: String,
  name: String,
  country: String,
  subscription: String, // "free" | "premium"
  preferences: {
    favoriteGenres: [String],
    audioFeaturePreferences: {
      energy: { min: Number, max: Number },
      valence: { min: Number, max: Number },
      danceability: { min: Number, max: Number }
    },
    explicitContent: Boolean,
    language: String
  },
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}

// Indexes
db.users.createIndex({ spotifyId: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ lastLogin: 1 })
```

### listening_history
User listening events and track interactions.

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to users._id
  spotifyUserId: String,
  trackId: String, // Spotify track ID
  trackName: String,
  artistName: String,
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