# 03 — Data Models

> **Quick Reference:** Every MongoDB collection with full field definitions, index declarations,
> TTL explanations, document examples, and Redis cache key patterns. Use this as the
> authoritative schema reference — no other source should define collection structure.

---

## 1. MongoDB Configuration

```javascript
// Connection (src/database/mongodb-manager.js)
const client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 5,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
});

const db = client.db(process.env.MONGODB_DB_NAME || 'echotune');
const PREFIX = process.env.MONGODB_COLLECTIONS_PREFIX || 'echotune_';
```

**Database name:** `echotune`  
**Collection prefix:** `echotune_`  
**Total collections:** 8

---

## 2. Collection: `echotune_users`

Stores Spotify user profiles, OAuth tokens, tier, and user metadata.

### Schema

```javascript
{
  // Identity
  _id: ObjectId,                           // MongoDB generated
  spotifyId: String,                        // required, unique  — Spotify user ID (e.g. "31abc...")
  email: String,                            // sparse unique     — from Spotify profile
  displayName: String,                      // required          — Spotify display_name
  profileImageUrl: String,                  // optional          — Spotify profile image

  // Spotify Account Info
  country: String,                          // ISO 3166-1 alpha-2 (e.g. "US")
  premium: Boolean,                         // default: false    — Spotify premium flag
  followers: Number,                        // default: 0

  // OAuth Tokens (treat as sensitive — never log)
  accessToken: String,                      // Spotify access token (short-lived ~1h)
  refreshToken: String,                     // Spotify refresh token (long-lived)
  tokenExpiresAt: Date,                     // when accessToken expires

  // Application Auth
  jwtSecret: String,                        // per-user JWT signing secret (optional)
  tier: String,                             // "free" | "pro" | "enterprise"   default: "free"
  isActive: Boolean,                        // default: true

  // Preferences (denormalized from echotune_user_preferences for fast reads)
  preferences: {
    favorite_genres: [String],              // e.g. ["rock", "electronic"]
    preferred_artists: [String],            // Spotify artist IDs
    audio_features_preferences: {
      energy: Number,                       // 0–1
      valence: Number,                      // 0–1
      danceability: Number,                 // 0–1
      acousticness: Number,                 // 0–1
    },
  },

  // Statistics
  listening_stats: {
    total_listening_time: Number,           // ms
    most_played_artist: String,
    most_played_genre: String,
    average_session_length: Number,         // ms
  },

  // Timestamps
  createdAt: Date,                          // default: Date.now
  updatedAt: Date,                          // updated on every save
  lastActive: Date,                         // updated on every authenticated request
}
```

### Indexes

```javascript
{ spotifyId: 1 }  → unique: true, sparse: true   // Primary lookup by Spotify ID
{ email: 1 }      → unique: true, sparse: true   // Email uniqueness (sparse = nulls allowed)
{ createdAt: 1 }  → background: true             // Pagination / user growth reports
{ lastActive: 1 } → background: true             // Inactive user cleanup queries
```

### Document Example

```json
{
  "_id": { "$oid": "665a1b2c3d4e5f6a7b8c9d0e" },
  "spotifyId": "31xxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "email": "user@example.com",
  "displayName": "Alex Rivera",
  "profileImageUrl": "https://i.scdn.co/image/abc123",
  "country": "US",
  "premium": true,
  "followers": 42,
  "accessToken": "BQA...",
  "refreshToken": "AQD...",
  "tokenExpiresAt": { "$date": "2024-01-15T14:30:00Z" },
  "tier": "free",
  "isActive": true,
  "preferences": {
    "favorite_genres": ["rock", "electronic"],
    "preferred_artists": ["4tZwfgrHOc3mvqYlEYSvVi"],
    "audio_features_preferences": {
      "energy": 0.75,
      "valence": 0.6,
      "danceability": 0.7,
      "acousticness": 0.2
    }
  },
  "listening_stats": {
    "total_listening_time": 18432000,
    "most_played_artist": "AC/DC",
    "most_played_genre": "rock",
    "average_session_length": 2700000
  },
  "createdAt": { "$date": "2024-01-01T00:00:00Z" },
  "updatedAt": { "$date": "2024-01-15T12:00:00Z" },
  "lastActive": { "$date": "2024-01-15T14:25:00Z" }
}
```

---

## 3. Collection: `echotune_listening_history`

Records every track the user played. Powers collaborative filtering and analytics.
Target volume: 200,000+ documents per active deployment.

### Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                         // required — ref: echotune_users._id
  trackId: String,                          // required — Spotify track ID
  trackName: String,                        // required
  artistName: String,                       // required
  albumName: String,                        // required
  playedAt: Date,                           // required — when the track was played
  durationMs: Number,                       // required — track duration

  // Contextual signals
  popularity: Number,                       // 0–100 from Spotify
  context: {
    context_type: String,                   // "playlist" | "album" | "artist" | "search" | null
    context_uri: String,                    // Spotify context URI
    device_type: String,                    // "computer" | "smartphone" | "speaker"
  },

  // Interaction signals (updated in-place)
  skip_count: Number,                       // default: 0 — incremented if skipped < 30s
  repeat_count: Number,                     // default: 0 — incremented if replayed

  createdAt: Date,                          // default: Date.now
}
```

### Indexes

```javascript
{ userId: 1, playedAt: -1 }     // Primary query: user's recent history (compound)
{ trackId: 1 }                   // Collaborative: find who else played this track
{ artist: 1 }                    // Genre/artist analytics
{ playedAt: -1 }                 // Global recency queries
{ userId: 1, trackId: 1 }       // Check if user already played track (dedup)
```

### Document Example

```json
{
  "_id": { "$oid": "665b2c3d4e5f6a7b8c9d0e1f" },
  "userId": { "$oid": "665a1b2c3d4e5f6a7b8c9d0e" },
  "trackId": "4iV5W9uYEdYUVa79Axb7Rh",
  "trackName": "Back in Black",
  "artistName": "AC/DC",
  "albumName": "Back in Black",
  "playedAt": { "$date": "2024-01-15T14:20:00Z" },
  "durationMs": 255493,
  "popularity": 82,
  "context": {
    "context_type": "playlist",
    "context_uri": "spotify:playlist:37i9dQZF1DX4rfAQfAp5iu",
    "device_type": "computer"
  },
  "skip_count": 0,
  "repeat_count": 1,
  "createdAt": { "$date": "2024-01-15T14:20:00Z" }
}
```

---

## 4. Collection: `echotune_recommendations`

Stores computed recommendation sets. TTL auto-expires stale results.

### Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                         // required
  recommendation_type: String,              // required — "content_based" | "collaborative" | "hybrid" | "mood_based"
  tracks: [
    {
      trackId: String,
      name: String,
      artist: String,
      album: String,
      score: Number,                        // 0–1 blended score
      strategy: String,                     // which strategy produced this track
      reason: String,                       // human-readable reason (for explainability)
    }
  ],
  parameters: {
    seed_tracks: [String],
    seed_artists: [String],
    seed_genres: [String],
    target_features: Object,               // { energy: 0.8, valence: 0.5 }
    context: String,                        // user's original query
  },
  confidence_score: Number,                 // 0–1 overall confidence
  user_feedback: {
    liked_tracks: [String],
    disliked_tracks: [String],
    saved_tracks: [String],
  },
  createdAt: Date,
  expiresAt: Date,                          // TTL field — 7 days after creation
}
```

### Indexes

```javascript
{ userId: 1, createdAt: -1 }     // Fetch user's latest recommendations
{ trackId: 1 }                    // Cross-reference by track
{ expiresAt: 1 }                  // TTL index: expireAfterSeconds: 0
```

> **TTL Explanation:** Setting `expireAfterSeconds: 0` on `expiresAt` tells MongoDB to delete
> the document when `expiresAt` passes. Documents are set `expiresAt = Date.now() + 7 days`
> on creation. MongoDB's background thread runs every 60 seconds to collect expired docs.

---

## 5. Collection: `echotune_playlists`

AI-generated and user-created playlists synced with Spotify.

### Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                         // required
  name: String,                             // required — playlist name
  description: String,
  playlist_type: String,                    // "generated" | "manual" | "recommendation"
  spotifyPlaylistId: String,                // Spotify playlist ID (unique, sparse)
  tracks: [
    {
      trackId: String,
      name: String,
      artist: String,
      addedAt: Date,
      position: Number,                     // 0-indexed position in playlist
    }
  ],
  generation_parameters: {
    mood: String,                           // "energetic" | "chill" | "melancholy"
    activity: String,                       // "workout" | "study" | "party"
    genres: [String],
    audio_features: Object,
    originalPrompt: String,                 // user's natural language input
  },
  public: Boolean,                          // default: false
  collaborative: Boolean,                   // default: false
  trackCount: Number,                       // denormalized count
  createdAt: Date,
  updatedAt: Date,
}
```

### Indexes

```javascript
{ userId: 1, createdAt: -1 }          // User's playlists, most recent first
{ spotifyPlaylistId: 1 }               // unique: true, sparse: true — Spotify sync
{ name: "text", description: "text" } // Text search for playlist discovery
```

---

## 6. Collection: `echotune_user_preferences`

Per-user settings for LLM provider, music preferences, and UI preferences.
One document per user (`userId` is unique).

### Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                         // required, unique
  
  // LLM Settings
  llmProvider: String,                      // "gemini" | "openai" | "openrouter" | "mock"
  llmModel: String,                         // specific model name
  
  // Music Preferences
  favoriteGenres: [String],
  dislikedGenres: [String],
  energyLevel: Number,                      // 0–1 preferred energy
  explicitContent: Boolean,                 // default: true
  
  // Recommendation Settings
  recommendationStrategy: String,           // "hybrid" | "collaborative" | "content"
  diversityWeight: Number,                  // 0–1 (1 = max diversity)
  
  // UI Preferences
  theme: String,                            // "dark" | "light"
  language: String,                         // ISO 639-1 (e.g. "en")
  
  // Notification Settings
  emailNotifications: Boolean,             // default: false
  
  createdAt: Date,
  updatedAt: Date,
}
```

### Indexes

```javascript
{ userId: 1 }   // unique: true — one preferences doc per user
```

---

## 7. Collection: `echotune_analytics_events`

Behavioural telemetry. TTL 90 days. Used for analytics dashboards and ML feedback loops.

### Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                         // required (null for anonymous)
  eventType: String,                        // required — see event type list below
  timestamp: Date,                          // required — event time
  metadata: Object,                         // event-specific payload
  sessionId: String,                        // browser session identifier
  createdAt: Date,                          // TTL field
}
```

### Event Types
| `eventType` | `metadata` fields |
|---|---|
| `track.played` | `{ trackId, artistId, durationMs, context }` |
| `track.skipped` | `{ trackId, playedMs, reason }` |
| `recommendation.clicked` | `{ trackId, strategy, position, score }` |
| `recommendation.dismissed` | `{ trackId, strategy, position }` |
| `playlist.created` | `{ playlistId, trackCount, prompt }` |
| `chat.message` | `{ provider, intent, responseMs, tokenCount }` |
| `search.performed` | `{ query, resultCount, type }` |
| `provider.switched` | `{ from, to, reason }` |

### Indexes

```javascript
{ userId: 1, eventType: 1, timestamp: -1 }  // User activity drill-down
{ eventType: 1, timestamp: -1 }              // Global event analytics
{ createdAt: 1 }                             // TTL index: expireAfterSeconds: 7776000 (90 days)
```

---

## 8. Collection: `echotune_chat_sessions`

Conversation history for context-aware multi-turn chat. TTL 30 days.

### Schema

```javascript
{
  _id: ObjectId,
  sessionId: String,                        // required, unique — UUID
  userId: ObjectId,                         // required
  provider: String,                         // LLM provider used for this session
  model: String,                            // specific model
  messages: [
    {
      role: String,                         // "user" | "assistant" | "system"
      content: String,                      // message text
      timestamp: Date,
      metadata: {
        tokens_used: Number,
        response_time: Number,              // ms
        intent: String,                     // detected intent
        spotifyAction: String,              // if Spotify command was executed
      },
    }
  ],
  context: {
    spotify_data: Object,                   // current playback state at session start
    user_preferences: Object,               // snapshot of preferences
  },
  messageCount: Number,                     // denormalized
  startTime: Date,
  lastActivity: Date,
  createdAt: Date,                          // TTL field
}
```

### Indexes

```javascript
{ sessionId: 1 }               // unique: true — primary lookup
{ userId: 1, lastActivity: -1} // User's recent sessions
{ createdAt: 1 }               // TTL index: expireAfterSeconds: 2592000 (30 days)
```

---

## 9. Collection: `echotune_track_metadata`

Cached Spotify track data and audio features. Avoids repeated Spotify API calls.

### Schema

```javascript
{
  _id: ObjectId,
  spotifyId: String,                        // required, unique — Spotify track ID
  name: String,                             // required
  artists: [
    { id: String, name: String }
  ],
  album: {
    id: String,
    name: String,
    release_date: String,                   // "YYYY-MM-DD"
    total_tracks: Number,
    images: [{ url: String, width: Number, height: Number }],
  },
  durationMs: Number,
  explicit: Boolean,                        // default: false
  popularity: Number,                       // 0–100
  previewUrl: String,                       // 30-second preview MP3 URL
  externalUrls: { spotify: String },

  // Audio Features (from Spotify Audio Features API)
  audioFeatures: {
    acousticness: Number,                   // 0–1: acoustic vs electric
    danceability: Number,                   // 0–1: rhythmic suitability for dancing
    energy: Number,                         // 0–1: intensity and activity
    instrumentalness: Number,               // 0–1: no vocals prediction
    liveness: Number,                       // 0–1: audience presence probability
    loudness: Number,                       // dB: typically -60 to 0
    speechiness: Number,                    // 0–1: spoken word presence
    valence: Number,                        // 0–1: musical positiveness (sad→happy)
    tempo: Number,                          // BPM
    key: Number,                            // Pitch class: -1 (no key) to 11
    mode: Number,                           // 0 = minor, 1 = major
    time_signature: Number,                 // 3–7 beats per bar
  },

  genres: [String],                         // from artist genres
  releaseYear: Number,                      // extracted from release_date

  createdAt: Date,
  updatedAt: Date,
}
```

### Indexes

```javascript
{ spotifyId: 1 }                          // unique: true — primary lookup
{ "audioFeatures.energy": 1 }             // Content-based filtering by energy
{ "audioFeatures.valence": 1 }            // Content-based filtering by valence
{ "audioFeatures.danceability": 1 }       // Content-based filtering
{ genres: 1 }                             // Genre-based queries
```

---

## 10. Schema Initialization Code

```javascript
// src/database/mongodb-manager.js  — initializeCollections()
async initializeCollections() {
  const prefix = process.env.MONGODB_COLLECTIONS_PREFIX || 'echotune_';

  const collections = [
    {
      name: `${prefix}users`,
      indexes: [
        { key: { spotifyId: 1 }, options: { unique: true, sparse: true } },
        { key: { email: 1 }, options: { unique: true, sparse: true } },
        { key: { createdAt: 1 } },
        { key: { lastActive: 1 } },
      ],
    },
    {
      name: `${prefix}listening_history`,
      indexes: [
        { key: { userId: 1, playedAt: -1 } },
        { key: { trackId: 1 } },
        { key: { playedAt: -1 } },
        { key: { userId: 1, trackId: 1 } },
      ],
    },
    {
      name: `${prefix}recommendations`,
      indexes: [
        { key: { userId: 1, createdAt: -1 } },
        { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
      ],
    },
    {
      name: `${prefix}playlists`,
      indexes: [
        { key: { userId: 1, createdAt: -1 } },
        { key: { spotifyPlaylistId: 1 }, options: { unique: true, sparse: true } },
        { key: { name: 'text', description: 'text' } },
      ],
    },
    {
      name: `${prefix}user_preferences`,
      indexes: [{ key: { userId: 1 }, options: { unique: true } }],
    },
    {
      name: `${prefix}analytics_events`,
      indexes: [
        { key: { userId: 1, eventType: 1, timestamp: -1 } },
        { key: { createdAt: 1 }, options: { expireAfterSeconds: 7776000 } }, // 90 days
      ],
    },
    {
      name: `${prefix}chat_sessions`,
      indexes: [
        { key: { sessionId: 1 }, options: { unique: true } },
        { key: { userId: 1, lastActivity: -1 } },
        { key: { createdAt: 1 }, options: { expireAfterSeconds: 2592000 } }, // 30 days
      ],
    },
    {
      name: `${prefix}track_metadata`,
      indexes: [
        { key: { spotifyId: 1 }, options: { unique: true } },
        { key: { 'audioFeatures.energy': 1 } },
        { key: { 'audioFeatures.valence': 1 } },
        { key: { genres: 1 } },
      ],
    },
  ];

  for (const col of collections) {
    try {
      const collection = this.db.collection(col.name);
      for (const idx of col.indexes) {
        await collection.createIndex(idx.key, idx.options || {});
      }
    } catch (err) {
      if (err.code !== 85 && err.code !== 86) throw err; // Ignore existing index conflicts
    }
  }
}
```

---

## 11. Collection Relationships

```
echotune_users (1)
  ├─ (1:N) echotune_listening_history   — userId → _id
  ├─ (1:N) echotune_recommendations     — userId → _id
  ├─ (1:N) echotune_playlists           — userId → _id
  ├─ (1:1) echotune_user_preferences    — userId → _id (unique)
  ├─ (1:N) echotune_analytics_events    — userId → _id
  └─ (1:N) echotune_chat_sessions       — userId → _id

echotune_track_metadata (1)
  └─ (N:N) echotune_listening_history   — trackId → spotifyId
  └─ (N:N) echotune_recommendations     — tracks[].trackId → spotifyId
```

> **Agent Note:** MongoDB does not enforce foreign key constraints. Application code is
> responsible for referential integrity. Always validate `userId` exists before inserting
> into user-owned collections.

---

## 12. Redis Cache Key Patterns

| Key Pattern | TTL | Description |
|---|---|---|
| `recs:{userId}:{strategy}:{limit}` | 3600s (1h) | Recommendation results |
| `features:{trackId}` | 86400s (24h) | Spotify audio features |
| `oauth:state:{state}` | 600s (10min) | PKCE state + code verifier |
| `session:{sessionId}` | 1800s (30min) | express-session data |
| `search:{hash}` | 300s (5min) | Spotify search results |
| `user:{userId}:prefs` | 3600s (1h) | User preferences snapshot |
| `health:spotify` | 60s (1min) | Spotify API health status |
| `provider:health:{name}` | 30s | LLM provider health status |

### Cache Manager Usage

```javascript
// src/api/cache/cache-manager.js
class CacheManager {
  async get(key) {
    if (this.redis) {
      const val = await this.redis.get(key);
      return val ? JSON.parse(val) : null;
    }
    return this.memoryCache.get(key) || null;
  }

  async set(key, value, ttlSeconds = 3600) {
    const serialized = JSON.stringify(value);
    if (this.redis) {
      await this.redis.setEx(key, ttlSeconds, serialized);
    } else {
      this.memoryCache.set(key, value, ttlSeconds * 1000);
    }
  }

  async del(key) {
    if (this.redis) await this.redis.del(key);
    else this.memoryCache.del(key);
  }
}
```

---

## 13. Cross-References

- Architecture context for these collections → `01-ARCHITECTURE-GUIDE.md`
- How recommendations use listening history → `08-RECOMMENDATION-ENGINE.md`
- How auth stores/reads tokens → `06-SPOTIFY-INTEGRATION.md`
- Chat sessions TTL in practice → `07-AI-LLM-INTEGRATION.md`
