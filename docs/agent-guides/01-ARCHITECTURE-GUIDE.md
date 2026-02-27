# 01 — Architecture Guide

> **Quick Reference:** System topology, layer responsibilities, request-flow walkthroughs,
> module dependency graph, and design patterns. Use this document to understand *how* the
> application is assembled before reading any source file.

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│   Browser / Mobile PWA                                              │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │  React 19 SPA  (Vite 7, Material-UI 5, React Router 7)    │   │
│   │  ┌──────────┐ ┌──────────────┐ ┌──────────────────────┐   │   │
│   │  │ ChatFirst│ │NowPlaying    │ │EnhancedMusicDiscovery │   │   │
│   │  │Interface │ │Widget        │ │Dashboard              │   │   │
│   │  └──────────┘ └──────────────┘ └──────────────────────┘   │   │
│   │  AuthContext ─── LLMContext ─── Socket.IO Client           │   │
│   └────────────────────────────────────────────────────────────┘   │
│                       │ HTTPS / WSS                                 │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────────┐
│                      EDGE / PROXY LAYER                             │
│                                                                     │
│   Nginx (Docker / DigitalOcean Managed Load Balancer)               │
│   • SSL termination (TLS 1.2/1.3)                                   │
│   • Gzip compression                                                │
│   • Static asset serving (dist/)                                    │
│   • Rate limiting zones (api: 10r/s, webhook: 30r/s)               │
│   • Security headers (HSTS, X-Frame-Options, CSP)                  │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ HTTP 3000
┌───────────────────────▼─────────────────────────────────────────────┐
│                      APPLICATION LAYER (Node.js 20)                 │
│                                                                     │
│   server.js  ──► Express App Factory (src/server.js)               │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  MIDDLEWARE PIPELINE                                         │  │
│   │  helmet → cors → compression → express-mongo-sanitize       │  │
│   │  → express-session → rate-limit → requestId injection        │  │
│   │  → JWT auth (requireAuth) → response-time                   │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│   │/auth/*   │ │/api/chat │ │/api/spot │ │/api/recs │            │
│   │auth-     │ │chat.js   │ │spotify.js│ │recomm.js │            │
│   │routes.js │ │          │ │          │ │          │            │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│        │            │             │             │                   │
│   ┌────▼─────────────▼─────────────▼─────────────▼────────────┐   │
│   │              SERVICE LAYER                                  │   │
│   │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│   │  │ ChatBot     │  │SpotifyAPI    │  │Recommendation    │  │   │
│   │  │ + LLM Mgr   │  │Service       │  │Engine            │  │   │
│   │  │ + CircuitBkr│  │+ Playback    │  │(4 strategies)    │  │   │
│   │  │ + Conv Mgr  │  │  Controller  │  │                  │  │   │
│   │  └──────┬──────┘  └──────┬───────┘  └──────────────────┘  │   │
│   └─────────┼────────────────┼──────────────────────────────────┘  │
│             │                │                                      │
│   ┌─────────▼────────────────▼──────────────────────────────────┐  │
│   │  Socket.IO Server  (real-time events)                        │  │
│   │  now_playing · recommendation_update · provider_health       │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │ MongoDB Driver         │ Spotify Web API      │ LLM APIs
┌────────▼───────┐    ┌───────────▼──────────┐  ┌───────▼──────────┐
│ MongoDB Atlas  │    │ Spotify API           │  │ Gemini / OpenAI  │
│ (primary DB)   │    │ api.spotify.com       │  │ Anthropic        │
│                │    │ accounts.spotify.com  │  │ OpenRouter       │
│ echotune_*     │    │ (OAuth + Web API)     │  │ AWS Bedrock      │
│ collections    │    └───────────────────────┘  │ Perplexity/Grok  │
└────────────────┘                               └──────────────────┘
         │
┌────────▼───────┐
│ Redis          │
│ (cache only)   │
│ TTL-based      │
│ in-memory      │
│ fallback       │
└────────────────┘
```

---

## 2. Layer Breakdown

### 2.1 Client Layer
| Component | Role |
|---|---|
| `src/frontend/App.jsx` | Root React component; lazy loads all heavy routes |
| `AuthContext` | Holds JWT token + Spotify auth state; wraps entire app |
| `LLMContext` | Tracks active LLM provider + model selection |
| Socket.IO client | Subscribes to `now_playing`, `recommendation_update` |
| Material-UI theme | Dark/light toggle; consistent design tokens |
| React Router 7 | Client-side routing; protected routes via `AuthGuard` |

### 2.2 Edge Layer
| Component | Role |
|---|---|
| `nginx/nginx.conf` | SSL termination, gzip, rate limiting zones |
| Static serving | `dist/` served directly by Nginx, bypassing Node.js |
| Proxy pass | `/api/*` and `/auth/*` forwarded to `localhost:3000` |
| DigitalOcean LB | Managed HTTPS + certificate renewal on App Platform |

### 2.3 Application Layer
| File | Role |
|---|---|
| `server.js` | Entry point; bootstraps Express app |
| `src/server.js` | Express factory; registers middleware + routes |
| `src/auth/auth-routes.js` | `/auth/login`, `/auth/callback` — PKCE OAuth |
| `src/api/routes/chat.js` | `POST /api/chat/message`, `POST /api/chat/start` |
| `src/api/routes/spotify.js` | All `/api/spotify/*` playback endpoints |
| `src/api/routes/recommendations.js` | `GET /api/recommendations` |
| `src/api/routes/playlists.js` | `POST /api/playlists/generate` |
| `src/api/health/health-routes.js` | `GET /api/health` |

### 2.4 Service Layer
| Module | Path | Role |
|---|---|---|
| `EchoTuneChatbot` | `src/chat/chatbot.js` | Orchestrates LLM + intent + Spotify |
| `LLMProviderManager` | `src/chat/llm-provider-manager.js` | Manages provider pool + fallback |
| `CircuitBreaker` | `src/chat/circuit-breaker.js` | Per-provider failure tracking |
| `SpotifyCommandParser` | `src/chat/spotify-command-parser.js` | NL → Spotify action |
| `ConversationManager` | `src/chat/conversation-manager.js` | Session memory |
| `SpotifyAPIService` | `src/spotify/api-service.js` | Spotify Web API wrapper |
| `PlaybackController` | `src/spotify/playback-controller.js` | Play/pause/skip/volume |
| `RecommendationEngine` | `src/ml/recommendation-engine.js` | Strategy dispatcher |
| `MongoDBManager` | `src/database/mongodb-manager.js` | Connection pool + index init |

### 2.5 Infrastructure Layer
| Module | Path | Role |
|---|---|---|
| DI Container | `src/infra/` | Dependency injection wiring |
| Event Bus | `src/infra/` | Decoupled internal events |
| Feature Flags | `src/infra/` | Runtime feature toggle |
| Observability | `src/infra/` | OTel tracing setup |
| CacheManager | `src/api/cache/cache-manager.js` | Redis + in-memory fallback |

---

## 3. Request Flow Walkthroughs

### 3.1 "Play energetic rock" — Full Flow

```
User types: "play energetic rock"
    │
    ▼
[React ChatInterface]
  └─ POST /api/chat/message  { message: "play energetic rock", sessionId }
        │
        ▼
  [Express Middleware]
  helmet → cors → rateLimiter → requireAuth (JWT validation)
  → injects req.user = { userId, spotifyId }
        │
        ▼
  [chat.js route handler]
  └─ initializeChatbot()  (singleton, cached after first call)
  └─ chatbot.processMessage(message, sessionId, userId)
        │
        ▼
  [EchoTuneChatbot.processMessage()]
  ├─ conversationManager.getContext(sessionId)
  ├─ intentClassifier.classify(message)
  │   └─ returns { intent: "play", entities: { genre: "rock", mood: "energetic" } }
  ├─ SpotifyCommandParser.parse(message)
  │   └─ returns { type: "play", params: { genre: "rock", energy: 0.8+ } }
  │
  ├─ [Spotify command detected → call SpotifyAPIService]
  │   └─ spotifyAPI.search("energetic rock", { type: "track", limit: 5 })
  │   └─ playbackController.play(topTrackUri, req.user.spotifyToken)
  │
  ├─ [Build LLM prompt with context]
  │   └─ buildPrompt(message, userProfile, spotifyData, conversationHistory)
  │
  ├─ [LLMProviderManager.generate(prompt)]
  │   ├─ circuitBreaker.isAllowed("gemini") → true
  │   ├─ geminiProvider.generate(prompt)   ← primary
  │   └─ response: "Playing energetic rock! I queued 'Enter Sandman'..."
  │
  └─ conversationManager.saveMessage(sessionId, user+assistant turns)
        │
        ▼
  [Response]  { success: true, message: "Playing...", spotifyAction: "play" }
        │
        ▼
  [Socket.IO]  server emits "now_playing" event to client room
        │
        ▼
  [React NowPlayingWidget] updates with new track info
```

### 3.2 Spotify OAuth Flow

```
User clicks "Connect Spotify"
    │
    ▼
GET /auth/login
  └─ authService.generateAuthUrl()
     ├─ generate codeVerifier (43–128 random chars, base64url)
     ├─ codeChallenge = SHA256(codeVerifier) → base64url
     ├─ state = uuid()
     ├─ store { state, codeVerifier, timestamp } in Redis (TTL 10 min)
     └─ return Spotify authorize URL with code_challenge + state
    │
    ▼
Browser redirects to accounts.spotify.com
User grants permission
    │
    ▼
GET /auth/callback?code=XXX&state=YYY
  ├─ verify state from Redis (CSRF protection)
  ├─ retrieve codeVerifier from Redis
  ├─ POST accounts.spotify.com/api/token
  │   body: { code, code_verifier, grant_type: "authorization_code" }
  ├─ receive { access_token, refresh_token, expires_in }
  ├─ GET api.spotify.com/me → fetch user profile
  ├─ upsert user in echotune_users (spotifyId index)
  ├─ store encrypted tokens in MongoDB user document
  └─ issue JWT (payload: { userId, spotifyId }, expires: 24h)
    │
    ▼
Response: { success: true, token: JWT }
Client stores JWT in AuthContext → all future requests use Bearer header
```

### 3.3 Recommendation Generation Flow

```
GET /api/recommendations?strategy=hybrid&limit=20
    │
    ▼
  [requireAuth] → validates JWT → req.user.userId
    │
    ▼
  [CacheManager.get("recs:userId:hybrid:20")]
  ├─ HIT  → return cached JSON
  └─ MISS → continue
        │
        ▼
  [RecommendationEngine.generate({ userId, strategy: "hybrid", limit: 20 })]
  │
  ├─ collaborativeStrategy.generate(userId)
  │   └─ fetch user's listening history from echotune_listening_history
  │   └─ build user-item matrix (trackId × playCount)
  │   └─ cosine similarity against other users
  │   └─ return top-N track candidates with scores
  │
  ├─ contentAudioFeatureStrategy.generate(userId)
  │   └─ fetch user preference vector (energy, valence, danceability...)
  │   └─ query echotune_track_metadata by audio feature proximity
  │   └─ return top-N candidates
  │
  ├─ hybridRerankStrategy.rerank([collaborative[], contentBased[]])
  │   └─ normalize scores: score = 0.5*collab + 0.5*content
  │   └─ apply diversity filter (max 2 tracks per artist)
  │   └─ apply confidence threshold (score > 0.6)
  │   └─ return final ranked list
  │
  └─ save results to echotune_recommendations (TTL 7 days)
        │
        ▼
  [CacheManager.set("recs:userId:hybrid:20", results, TTL=3600)]
        │
        ▼
  Response: { success: true, data: [...20 tracks], meta: { strategy, total } }
```

---

## 4. Module Dependency Graph

```
server.js
  └── src/server.js (Express factory)
        ├── src/auth/auth-routes.js
        │     └── src/auth/auth-service.js
        │           ├── src/database/mongodb-manager.js ◄─┐
        │           └── src/auth/redis-session-store.js    │
        │                                                   │
        ├── src/api/routes/chat.js                          │
        │     └── src/chat/chatbot.js                       │
        │           ├── src/chat/llm-provider-manager.js    │
        │           │     ├── src/chat/circuit-breaker.js   │
        │           │     └── src/chat/llm-providers/*.js   │
        │           ├── src/chat/conversation-manager.js ───┤
        │           ├── src/chat/spotify-command-parser.js  │
        │           └── src/spotify/api-service.js ─────────┤
        │                 └── src/spotify/playback-cont.js  │
        │                                                    │
        ├── src/api/routes/recommendations.js               │
        │     └── src/ml/recommendation-engine.js ──────────┤
        │           ├── collaborativeStrategy               │
        │           ├── contentAudioFeatureStrategy         │
        │           ├── embeddingSemanticStrategy           │
        │           └── hybridRerankStrategy                │
        │                                                    │
        ├── src/api/routes/spotify.js                        │
        │     └── src/spotify/api-service.js ───────────────┤
        │                                                    │
        └── src/database/mongodb-manager.js ────────────────┘
              └── (shared singleton across all modules)
```

---

## 5. Design Patterns

### 5.1 Dependency Injection Container
All major services are registered in `src/infra/` DI container. Route handlers receive
service instances through the container rather than `require()`-ing them directly.
This enables testing (swap real services for mocks) and avoids circular dependencies.

```javascript
// Registering a service
container.register('recommendationEngine', () => new RecommendationEngine(config));

// Resolving in a route
const engine = container.resolve('recommendationEngine');
```

### 5.2 Circuit Breaker (LLM Providers)
Each LLM provider has an independent `CircuitBreaker` instance. States:

```
CLOSED ──[5 failures in 60s]──► OPEN ──[30s timeout]──► HALF_OPEN
  ▲                                                          │
  └────────────[3 consecutive successes]────────────────────┘
```

The `LLMProviderManager` checks `circuitBreaker.isAllowed()` before every call and
automatically routes to the next provider in the fallback chain when a circuit is OPEN.

### 5.3 Strategy Pattern (Recommendations)
Each recommendation algorithm implements the same interface:

```javascript
class BaseStrategy {
  async generate(userId, options = {}) {
    // Returns: [{ trackId, score, reason }]
  }
}
```

The `RecommendationEngine` holds a registry of strategies and dispatches based on the
`strategy` query parameter or uses all strategies for hybrid mode.

### 5.4 Fallback Chain (LLM Providers)
Provider priority is configuration-driven:

```
bedrock → gemini → perplexity → grok4 → openai → openrouter → mock
```

The chain walks left-to-right, skipping providers whose circuit is OPEN or whose API key
is not configured. The mock provider is always available as a final fallback.

### 5.5 Event Bus
Internal domain events (track played, recommendation clicked, playlist created) flow
through an event bus in `src/infra/`. Consumers (analytics, Socket.IO emitter, cache
invalidator) subscribe without coupling to the emitting service.

```javascript
eventBus.emit('track.played', { userId, trackId, playedAt });
// Consumed by: analyticsService, recommendationEngine, socketService
```

### 5.6 Repository Pattern (MongoDB)
`MongoDBManager` is a singleton that exposes collection handles. Services do not call
`MongoClient` directly — they call `mongoManager.getCollection('echotune_users')`.
This centralizes connection pool management and index initialization.

---

## 6. Security Architecture

```
Request
  │
  ▼
Helmet (CSP, HSTS, X-Frame-Options, etc.)
  │
  ▼
CORS (whitelist: CORS_ORIGINS env var)
  │
  ▼
express-rate-limit (100 req/15min per IP; 5 req/15min for /auth/*)
  │
  ▼
express-mongo-sanitize (strip $ and . from req.body/query/params)
  │
  ▼
requireAuth (JWT Bearer validation, injects req.user)
  │
  ▼
Route handler
```

> **Agent Note:** `requireAuth` is in `src/api/middleware/index.js`. Always apply it to
> routes that touch user data. The health endpoint `/api/health` intentionally has no auth.

---

## 7. Cross-References

- Technology decisions → `02-TECH-STACK.md`
- MongoDB schemas → `03-DATA-MODELS.md`
- Full API surface → `05-API-REFERENCE.md`
- Spotify OAuth detail → `06-SPOTIFY-INTEGRATION.md`
- LLM circuit breaker detail → `07-AI-LLM-INTEGRATION.md`
- Recommendation strategies → `08-RECOMMENDATION-ENGINE.md`
