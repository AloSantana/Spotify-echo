# EchoTune AI - Current Chat Architecture

## Document Purpose
This document captures the current state of the chat system architecture before implementing the chat-first redesign. It serves as a baseline for understanding what exists and what needs to be enhanced.

**Last Updated**: 2025-11-18  
**Version**: Pre-Chat-First-Redesign

---

## 1. Authentication Flow

### Spotify OAuth 2.0 with PKCE

**Before Authentication:**
1. User lands on `/` (public/index.html) - a landing page with "Login with Spotify" button
2. Clicking login redirects to `/auth/spotify`
3. Backend generates PKCE challenge and state, stores in Redis (or memory fallback)
4. User is redirected to Spotify authorization page

**After Successful Authentication:**
1. Spotify redirects to `/auth/callback` with authorization code
2. Backend exchanges code for access token and refresh token
3. Tokens are stored (currently in session/cookies)
4. User is redirected to... **the same landing page** (no automatic chat redirect currently)

**Current Scopes:**
- `user-read-private`
- `user-read-email`
- `playlist-modify-public`
- `playlist-modify-private`
- `user-read-recently-played`
- `user-top-read`
- `user-library-read`
- `user-library-modify`

**Missing Scopes for Full Playback Control:**
- `user-read-playback-state`
- `user-modify-playback-state`
- `streaming` (for Web Playback SDK)

---

## 2. Current Chat Request Flow

### UI → Backend → AI Provider → Response

```
┌─────────────┐
│   User      │
│ (Browser)   │
└──────┬──────┘
       │
       │ POST /api/chat
       │ { message: "recommend music" }
       │
┌──────▼──────────────────────────┐
│   Chat Route                     │
│   (src/routes/chat.js)          │
│                                  │
│   - Basic intent recognition    │
│   - Pattern matching             │
│   - No LLM integration           │
└──────┬──────────────────────────┘
       │
       │ Simple pattern-based response
       │
┌──────▼──────────────────────────┐
│   Response                       │
│   {                              │
│     response: "text...",         │
│     action: "recommend",         │
│     timestamp: "..."             │
│   }                              │
└──────────────────────────────────┘
```

**Current Implementation:**
- **Location**: `src/routes/chat.js`
- **Type**: Simple rule-based chatbot
- **AI Integration**: None in basic route
- **Database**: No chat persistence
- **Spotify**: No integration

**Advanced Chat Route:**
- **Location**: `src/api/routes/chat.js`
- **Features**: LLM provider integration, intent classification
- **But**: Not connected to main UI flow

---

## 3. AI Provider Architecture (Existing Infrastructure)

### LLM Provider Manager
**Location**: `src/chat/llm-provider-manager.js`

**Capabilities:**
- Multi-provider support (Gemini, OpenAI, Perplexity, Grok-4, Bedrock, Mock)
- Circuit breaker pattern for failover
- API key rotation via KeyPool
- Health monitoring
- Automatic provider selection
- Telemetry tracking

**Fallback Order:**
1. Bedrock (if enabled)
2. Gemini
3. Perplexity
4. Grok-4
5. OpenAI
6. OpenRouter
7. Mock (always available)

### Model Registry
**Location**: `src/chat/model-registry.js`

**Registered Models (30+):**

**OpenAI:**
- gpt-4o (multimodal, 128K context)
- gpt-4o-mini (fast, cost-efficient)
- gpt-4-turbo
- gpt-3.5-turbo

**Google Gemini:**
- gemini-2.0-flash-exp (experimental, 1M context)
- gemini-1.5-pro (2M context)
- gemini-1.5-flash (1M context)

**Anthropic Claude (via OpenRouter):**
- claude-3.5-sonnet (200K context)
- claude-3-haiku (fast)
- claude-opus-4.1 (coding optimized, 200K context)

**Perplexity:**
- sonar-small (fast, web search)
- sonar-medium (balanced)
- sonar-large (high quality)
- sonar-pro (premium, real-time data)

**Grok-4 (xAI):**
- grok-4 (256K context)
- grok-4-heavy (multi-agent mode)
- grok-beta (experimental)

**Meta Llama:**
- llama-3.1-405b-instruct (131K context, open source)

**Mock:**
- mock-fast (testing)

**Model Selection:**
- Automatic recommendation based on task requirements
- Cost-aware routing
- Latency optimization
- Capability filtering

---

## 4. PostgreSQL Database Schema (Already Implemented!)

### Tables:
```prisma
User {
  id, spotifyId, email, displayName, profileImage
  isPremium, country
  createdAt, updatedAt, lastLoginAt
  → preferences, chatSessions, chatMessages, playlists
}

UserPreferences {
  preferredLLMProvider (default: "gemini")
  enabledProviders (array)
  preferredGenres, preferredArtists
  energyPreference, valencePreference, danceabilityPreference
  discoveryMode, explicitContent
  chatHistoryEnabled, streamingEnabled, contextRetention
  theme, defaultView
}

ChatSession {
  id, userId, title
  provider, model, isActive
  messageCount, systemPrompt, contextSummary
  createdAt, updatedAt, lastMessageAt
  → messages
}

ChatMessage {
  id, sessionId, userId
  role, content
  provider, model, tokensUsed, latencyMs
  spotifyCommand, spotifyTrackId, spotifyPlaylistId
  recommendedTracks (JSON)
  createdAt
}

Playlist {
  id, userId, spotifyId
  name, description, isPublic
  generatedByAI, generationPrompt, generatedWith
  tags, mood, targetEnergy, targetDuration
  createdAt, updatedAt, lastSyncedAt
}

SystemConfig {
  key, value (JSON), category, description, isPublic
}

ProviderHealth {
  provider, isAvailable, lastCheckAt
  responseTimeMs, errorCount, lastError
  requestCount, successCount, failureCount
}

FeatureFlag {
  key, name, description, enabled
  rolloutPercentage, targetUsers, targetGroups
}
```

**Connection Status:**
- Schema exists ✅
- Prisma client configured ✅
- Tables NOT actively used by chat UI ❌
- Chat messages NOT persisted ❌
- User preferences NOT integrated with chat ❌

---

## 5. MongoDB Data Usage

### listening_history Collection (203,090 documents)

**Purpose**: Foundation for recommendation engine

**Document Structure:**
```json
{
  "_id": "composite_key",
  "spotify_track_uri": "spotify:track:...",
  "timestamp": "2010-05-03T09:14:32Z",
  "user": {
    "username": "willexmen",
    "platform": "Windows XP",
    "country": "SE"
  },
  "track": {
    "name": "The Quiet Place",
    "artist": "In Flames",
    "album": "Soundtrack To Your Escape",
    "duration_ms": 210000,
    "popularity": 85
  },
  "audio_features": {
    "danceability": 0.7,
    "energy": 0.8,
    "valence": 0.6,
    "tempo": 150.0,
    "acousticness": 0.3,
    "instrumentalness": 0.1,
    "liveness": 0.2,
    "speechiness": 0.05,
    "loudness": -5.0,
    "key": 9,
    "mode": 1,
    "time_signature": 4
  },
  "listening": {
    "ms_played": 83863,
    "completion_rate": 0.399,
    "skipped": true
  }
}
```

**Indexing:**
- User-based queries
- Audio feature similarity
- Artist/genre clustering
- Timestamp-based analytics

**Current Usage:**
- Analytics dashboard
- Recommendation engine training
- User listening patterns
- NOT integrated with chat ❌

---

## 6. Spotify API Integration

### Current Implementation:
**Location**: `src/api/routes/spotify.js` (assumed)

**Available Operations:**
- OAuth callback handling
- Token refresh
- Basic API calls (assumed)

**Spotify Command Parser:**
**Location**: `src/chat/spotify-command-parser.js`

**Exists but not fully integrated with chat UI**

**Missing Integrations:**
- No chat-triggered playback control
- No device management from chat
- No queue management from chat
- No real-time "Now Playing" display
- No natural language command processing

---

## 7. Current Routing Structure

### Main Routes:
```
/ (root)                 → public/index.html (landing page)
/auth/spotify            → Spotify OAuth initiation
/auth/callback           → OAuth callback handler
/chat                    → public/chat/index.html (basic chat UI)
/settings.html           → User settings page
/admin.html              → Admin dashboard
/playlists/*             → Playlist management
```

### API Routes:
```
/api/chat                → Basic chat endpoint (pattern-based)
/api/recommendations     → Recommendation engine
/api/spotify/*           → Spotify Web API proxy
/api/providers           → LLM provider status
/api/database/*          → Database management
/api/playlists/*         → Playlist CRUD
/api/user-settings/*     → User preferences
/api/system/*            → System info
/api/analytics/*         → Analytics data
/api/insights/*          → Spotify insights
/api/llm-providers/*     → AI provider management
```

---

## 8. Data Flow Abstraction

### What is Tightly Coupled to MongoDB:
- Listening history queries
- Analytics aggregations
- Recommendation training data
- Historical data analysis

### What is Already Abstracted:
- User authentication (Spotify-based, could store in PostgreSQL)
- System configuration (PostgreSQL SystemConfig table exists)
- Provider health tracking (PostgreSQL ProviderHealth table exists)
- Feature flags (PostgreSQL FeatureFlag table exists)

### What Needs PostgreSQL Migration:
- Chat sessions and messages (schema exists, not used)
- User preferences for chat (schema exists, not used)
- AI-generated playlists (schema exists, not used)
- Model selection preferences (schema exists, not used)

---

## 9. Current Gaps and Opportunities

### Authentication & Routing:
❌ After Spotify auth, user is NOT automatically redirected to chat
❌ Chat is not the "main page" or primary experience
❌ No persistent login state visible in chat

### Chat Integration:
❌ Basic chat route has no AI integration
❌ Advanced chat route exists but not connected to UI
❌ No chat history persistence
❌ No conversation context
❌ No model selection in UI

### Spotify in Chat:
❌ No natural language playback control
❌ No device management from chat
❌ No "Now Playing" integration
❌ No queue management via chat
❌ Rich responses (track cards, album art) not implemented

### AI Provider:
✅ Infrastructure exists (LLM Provider Manager, Model Registry)
❌ Not exposed in chat UI
❌ No user-facing model selection
❌ No API key management UI
❌ Per-user provider preferences not stored in PostgreSQL

### PostgreSQL:
✅ Schema fully designed and implemented
❌ Tables not actively used by application
❌ No Prisma queries in chat routes
❌ No data persistence for chat sessions

---

## 10. Modernization Opportunities

### Immediate Wins:
1. **Wire existing PostgreSQL schema** to chat routes
2. **Connect LLM Provider Manager** to chat UI
3. **Integrate Spotify command parser** with chat flow
4. **Redirect to /chat after authentication**
5. **Add model selection controls** to chat UI

### Medium-Term:
1. Build React chat interface with rich components
2. Add "Now Playing" widget with real-time updates
3. Implement natural language Spotify control
4. Create playlist generation via chat
5. Add semantic search capability

### Long-Term:
1. Advanced personalization engine
2. Voice interface integration
3. Mobile PWA optimization
4. Social features (shared playlists)
5. Multi-user chat rooms

---

## 11. Technology Stack Summary

### Frontend:
- **Framework**: React 19
- **Build Tool**: Vite
- **UI Library**: Material-UI (@mui/material)
- **State Management**: React hooks (no Redux/Zustand currently)
- **HTTP**: Axios

### Backend:
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma (for PostgreSQL)
- **MongoDB**: Native driver
- **Redis**: Optional (caching, sessions)

### AI/ML:
- **Providers**: 7 (Gemini, OpenAI, Perplexity, Grok-4, Bedrock, OpenRouter, Mock)
- **Models**: 30+ across all providers
- **Features**: Circuit breakers, health monitoring, cost tracking

### Infrastructure:
- **Observability**: OpenTelemetry, Prometheus metrics
- **Security**: Helmet, rate limiting, CORS
- **Testing**: Jest, Playwright
- **CI/CD**: GitHub Actions

---

## Next Steps for Chat-First Redesign

### Priority 1 - Routing:
- Update auth callback to redirect to `/chat`
- Make `/chat` the default authenticated landing page
- Keep `/` as login/landing for unauthenticated users

### Priority 2 - UI:
- Build modern React chat interface
- Integrate model selection dropdown
- Add "Now Playing" widget
- Implement responsive layout

### Priority 3 - Backend:
- Wire chat routes to LLM Provider Manager
- Implement PostgreSQL persistence for chat
- Integrate Spotify command parser
- Add rich response formatting

### Priority 4 - Features:
- Natural language playback control
- Smart playlist generation
- Advanced semantic search
- Real-time personalization

---

## Conclusion

EchoTune AI has a **solid foundation** with:
- ✅ PostgreSQL schema fully designed
- ✅ Comprehensive AI provider infrastructure
- ✅ Working Spotify OAuth
- ✅ 203K+ listening history for recommendations

The chat-first redesign will **leverage these existing assets** and wire them together into a cohesive, modern, chat-centric experience. The infrastructure is 70% complete; we need to connect the dots and build the UI layer.
