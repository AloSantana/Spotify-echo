# EchoTune AI — Full Application Specification

> **Purpose of this document**: A complete, in-depth technical reference that describes what EchoTune AI does, how every layer works, and how all components interconnect. It is written so that another AI agent or development team can use it as a blueprint to build an equivalent application from scratch.

---

## Table of Contents

1. [What the Application Does](#1-what-the-application-does)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Environment Configuration](#5-environment-configuration)
6. [Authentication System](#6-authentication-system)
7. [Backend Server & API Layer](#7-backend-server--api-layer)
8. [Database Architecture](#8-database-architecture)
9. [AI / LLM Chat System](#9-ai--llm-chat-system)
10. [Music Recommendation Engine](#10-music-recommendation-engine)
11. [Spotify Integration Layer](#11-spotify-integration-layer)
12. [Frontend React Application](#12-frontend-react-application)
13. [Real-Time Layer (Socket.IO)](#13-real-time-layer-socketio)
14. [Infrastructure & Cross-Cutting Concerns](#14-infrastructure--cross-cutting-concerns)
15. [MCP Server Ecosystem](#15-mcp-server-ecosystem)
16. [Deployment & DevOps](#16-deployment--devops)
17. [Testing Strategy](#17-testing-strategy)
18. [Data Models (Full Schema)](#18-data-models-full-schema)
19. [Complete API Route Reference](#19-complete-api-route-reference)
20. [Key Design Patterns](#20-key-design-patterns)
21. [Rebuilding from Scratch — Step-by-Step Checklist](#21-rebuilding-from-scratch--step-by-step-checklist)

---

## 1. What the Application Does

**EchoTune AI** is a full-stack, AI-powered music discovery and playback control platform that wraps the Spotify Web API with:

| Capability | Description |
|---|---|
| **Conversational music control** | Users type (or speak) natural language—"play energetic rock", "skip this", "queue something chill"—and the app translates it to Spotify API calls in real time. |
| **AI-powered recommendations** | A multi-strategy recommendation engine blends collaborative filtering, content-based audio-feature analysis, semantic embedding search, and hybrid reranking to generate personalised track lists. |
| **Multi-provider chat** | A unified chat interface routes messages to the best available LLM provider (Gemini, OpenAI, Azure OpenAI, OpenRouter, Anthropic, mock) with automatic failover, streaming responses, and conversation memory. |
| **Playlist automation** | AI generates entire playlists from a natural-language prompt and optionally writes them back to the user's Spotify account. |
| **Listening history analytics** | Ingests and analyses 200,000+ user listening history records stored in MongoDB, visualised in a React dashboard. |
| **Playback control** | Complete Spotify playback surface: play/pause/skip/previous, volume, shuffle, repeat, device selection, queue management, and Now Playing widget — all accessible from a single-page React app. |
| **User preferences** | Persistent per-user settings (preferred LLM provider, music genres, energy level, explicit content filter) stored in PostgreSQL via Prisma. |
| **Real-time updates** | Socket.IO broadcasts now-playing state, recommendation results, and provider health changes to all connected clients. |
| **Observability** | Prometheus metrics, OpenTelemetry tracing, Pino structured logging, and a health endpoint hierarchy give full operational visibility. |

**Who uses it**: Individual Spotify Premium subscribers who want an AI assistant to help them discover music and control playback through natural conversation instead of (or in addition to) the normal Spotify UI.

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                          Browser / PWA                         │
│   React 19 SPA (Vite)  ·  Material-UI  ·  Socket.IO-client    │
└───────────────────────────────┬────────────────────────────────┘
                                │ HTTPS / WSS
┌───────────────────────────────▼────────────────────────────────┐
│                  Nginx (reverse proxy / TLS)                    │
└───────────────────────────────┬────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────┐
│                  Node.js / Express  (src/server.js)            │
│                                                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │  Auth Routes │  │  API Routes   │  │   Static / SPA serve │ │
│  │  /auth/*     │  │  /api/*       │  │   /dist, /public     │ │
│  └──────┬───────┘  └───────┬───────┘  └──────────────────────┘ │
│         │                  │                                     │
│  ┌──────▼──────────────────▼──────────────────────────────────┐ │
│  │              Middleware Stack                               │ │
│  │  rate-limit · CORS · Helmet · sanitize · request-size      │ │
│  │  session · auth-extract · slow-request-log · tracing       │ │
│  └──────────────────────────┬──────────────────────────────── ┘ │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐│
│  │ Service / Domain Layer                                       ││
│  │  ChatService · RecommendationEngine · PlaylistService        ││
│  │  SpotifyAPIService · AudioFeaturesService · LLMProviderHub   ││
│  └──────────┬──────────────────────┬───────────────────────────┘│
│             │                      │                              │
│  ┌──────────▼──────┐  ┌────────────▼──────────────────────────┐ │
│  │  Spotify Web API│  │  LLM Providers                        │ │
│  │  (external)     │  │  Gemini · OpenAI · OpenRouter          │ │
│  └─────────────────┘  │  Anthropic · Azure · Mock             │ │
│                        └───────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Data Layer                                                │  │
│  │  MongoDB (analytics + listening history)                   │  │
│  │  PostgreSQL via Prisma (users, chat, prefs, feature flags) │  │
│  │  Redis (sessions, OAuth state, rate-limit, cache)          │  │
│  │  SQLite (local fallback)                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Request lifecycle (typical chat message)

1. Browser sends `POST /api/chat/message` with `{ sessionId, content }`.
2. Express auth middleware validates the JWT / session cookie.
3. Rate limiter (Redis-backed) checks quotas.
4. `ChatRoutes` calls `EchoTuneChatbot.chat(sessionId, content)`.
5. `IntentClassifier` classifies the message as one of: `SPOTIFY_COMMAND`, `RECOMMENDATION_REQUEST`, `GENERAL_CHAT`, etc.
6. If Spotify command → `SpotifyChatIntegration.executeCommand()` → `PlaybackController.play/pause/…()` → Spotify Web API.
7. If recommendation → `RecommendationEngine.generate()` (multi-strategy) → scored track list.
8. Response sent to the active LLM provider for a conversational reply and then returned to the browser.
9. The reply and assistant message are persisted via `ChatPersistenceService` (PostgreSQL + MongoDB).
10. Socket.IO broadcasts `chat:response` and optionally `now_playing:update`.

---

## 3. Technology Stack

### Runtime & Framework

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | ≥ 20 (recommended 22 LTS) | ESM and CommonJS mixed |
| Web framework | Express.js | 4.18 | REST API, session, static files |
| Real-time | Socket.IO | 4.6 | WebSocket with HTTP fallback |
| Frontend build | Vite | 7.x | ES modules, HMR, code splitting |
| UI library | React | 19 | Hooks, Context, lazy loading |
| UI components | Material-UI (MUI) | 5 | Accessible design system |
| HTTP client | Axios | 1.6 | Both browser and server-side |
| ORM | Prisma | 6.x | PostgreSQL schema + migrations |
| Process manager | Nodemon (dev) / node (prod) | — | — |

### Databases

| Database | Use Case | Driver |
|---|---|---|
| MongoDB Atlas | Listening history, analytics events, audio feature cache | `mongodb` 6.x |
| PostgreSQL | Users, chat sessions/messages, preferences, feature flags, provider health | `@prisma/client` + `pg` |
| Redis | Sessions, OAuth PKCE state, distributed rate limits, response cache | `redis` 4.x |
| SQLite | Local fallback when neither MongoDB nor PostgreSQL is available | `sqlite3` (dev dep) |

### AI / ML

| Component | Libraries / Services |
|---|---|
| LLM providers | `openai` 4.x, `@google/generative-ai`, `@anthropic-ai/sdk`, custom HTTP for OpenRouter, Azure OpenAI, Grok-4 |
| Embeddings | `EmbeddingProvider.js` (configurable backend, defaults to Gemini text-embedding) |
| Recommendation | Custom JS classes: `CollaborativeStrategy`, `ContentAudioFeatureStrategy`, `EmbeddingSemanticStrategy`, `HybridRerankStrategy` |
| Telemetry | `agentops` (optional), OpenTelemetry (`@opentelemetry/sdk-node`) |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker / Docker Compose | Multi-container dev and production environments |
| Nginx | Reverse proxy, TLS termination, static file caching |
| DigitalOcean App Platform | Primary cloud target (`digitalocean-app.yaml`) |
| Vercel | Secondary/serverless deployment option (`vercel.json`) |
| GitHub Actions | CI/CD (test, lint, build, deploy) |
| Prometheus + prom-client | Metrics scraping |
| Pino | Structured JSON logging |

---

## 4. Project Directory Structure

```
Spotify-echo/
├── server.js               # DigitalOcean/platform entry point — loads tracing, env, then src/server
├── src/
│   ├── server.js           # Main Express app — mounts all routes and middleware
│   ├── index.js            # Alternate entry (same app export)
│   │
│   ├── api/                # HTTP route handlers
│   │   ├── routes/         # 30+ feature-specific route files (chat, spotify, recommendations, …)
│   │   ├── middleware.js    # Barrel: exports all shared middleware
│   │   ├── middleware/      # Individual middleware (rate-limit, auth-extract, response-time…)
│   │   ├── cache/          # CacheManager — Redis + in-memory LRU
│   │   ├── health/         # /health routes (liveness, readiness, deep)
│   │   ├── monitoring/     # PerformanceMonitor class
│   │   ├── security/       # SecurityManager, token validation
│   │   └── utils/          # Logger, helpers shared across routes
│   │
│   ├── routes/             # Modular route sub-modules (auth, spotify-api, enhanced-api, …)
│   │
│   ├── chat/               # Conversational AI subsystem
│   │   ├── chatbot.js      # EchoTuneChatbot orchestrator
│   │   ├── conversation-manager.js  # Session state and summarisation
│   │   ├── llm-provider-manager.js  # Provider selection and health
│   │   ├── llm-providers/  # Provider adapters (openai, gemini, anthropic, bedrock, mock, …)
│   │   ├── intents/        # classifyIntent.js — maps user text to action types
│   │   ├── spotify-command-parser.js  # NLP → Spotify command objects
│   │   ├── spotify-integration.js     # Executes Spotify commands
│   │   ├── provider-factory.js        # Factory for provider instantiation
│   │   └── context/        # Context windowing and summarisation utilities
│   │
│   ├── recommendation/     # New modular recommendation engine
│   │   ├── engine.js       # RecommendationEngine orchestrator
│   │   └── strategies/     # Four concrete strategies (see §10)
│   │
│   ├── ml/                 # Legacy ML engine (still in production)
│   │   ├── recommendation-engine.js         # Hybrid real-time engine
│   │   ├── recommendation-engine-enhanced.js
│   │   ├── collaborative-filter.js
│   │   └── content-filter.js
│   │
│   ├── spotify/            # Spotify API wrapper services
│   │   ├── api-service.js          # Generic Spotify REST client
│   │   ├── playback-controller.js  # Play/pause/skip/queue/device/volume
│   │   ├── audio-features.js       # Fetch & cache audio features
│   │   ├── PlaylistService.js      # Create, populate, sync playlists
│   │   └── rate-limiter.js         # Spotify-specific rate limiter
│   │
│   ├── database/           # Database abstraction layer
│   │   ├── database-manager.js    # Unified interface: MongoDB → SQLite → file fallback
│   │   ├── mongodb.js             # MongoDB singleton client
│   │   ├── mongodb-manager.js     # Collection helpers
│   │   ├── postgres-client.js     # Raw pg client (non-Prisma queries)
│   │   ├── sqlite-manager.js      # SQLite fallback
│   │   ├── analytics-schema.js    # MongoDB collection + index definitions
│   │   └── schema.js              # MongoDB document schemas
│   │
│   ├── infra/              # Cross-cutting infrastructure services
│   │   ├── DIContainer.js         # Dependency injection container
│   │   ├── FeatureFlags.js        # Feature flag manager (PostgreSQL-backed)
│   │   ├── EventBus.js            # In-process pub/sub with retry & DLQ
│   │   ├── SessionManager.js      # Redis/memory session store wrapper
│   │   ├── MiddlewareManager.js   # Dynamic middleware registration
│   │   ├── ServiceRegistry.js     # Service locator
│   │   ├── lifecycle/             # Graceful shutdown + readiness probes
│   │   ├── cache/                 # Application-level cache manager
│   │   ├── observability/         # OpenTelemetry tracing initialiser
│   │   └── resilience/            # Circuit breaker, retry utilities
│   │
│   ├── security/           # Security modules
│   │   ├── auth.js                # Prometheus metrics for auth events
│   │   ├── rateLimit.js           # Central rate limit config
│   │   ├── helmet.js              # Security headers
│   │   └── security-manager.js    # Token validation, threat detection
│   │
│   ├── services/           # Shared services
│   │   ├── ChatPersistenceService.js   # Persists messages to PostgreSQL + MongoDB
│   │   └── SocketService.js            # Socket.IO event emitter wrapper
│   │
│   ├── frontend/           # React SPA source
│   │   ├── App.jsx                # Router, lazy loading, global providers
│   │   ├── index.jsx              # ReactDOM.render entry
│   │   ├── components/            # 60+ UI components (see §12)
│   │   ├── contexts/              # AuthContext, LLMContext
│   │   ├── routes/                # Client-side route definitions
│   │   ├── styles/                # Global CSS
│   │   ├── theme/                 # MUI theme tokens
│   │   └── utils/                 # API client, formatters
│   │
│   ├── config/             # Environment and production config
│   ├── utils/              # Server utilities (redis, agentops-trace, auth-helpers, …)
│   ├── middleware/         # Redis rate limiter, slow-request logger
│   ├── domain/             # Domain logic (playlist metrics, …)
│   ├── errors/             # Custom error classes
│   └── validation/         # Zod schemas for request validation
│
├── prisma/
│   └── schema.prisma       # Full PostgreSQL schema (9 models)
│
├── data/                   # Sample CSV / JSON listening history datasets
├── ml_datasets/            # Pre-processed ML training datasets
├── mcp-server/             # MCP server orchestrator
├── mcp-servers/            # Community MCP server integrations
├── nginx/                  # Nginx config snippets
├── docs/                   # All documentation (this file lives here)
├── tests/                  # Jest unit + integration tests
├── scripts/                # Setup, validation, QA automation scripts
├── Dockerfile              # Production container image
├── docker-compose.yml      # Single-service dev compose
├── docker-compose.full-stack.yml  # Full stack: app + Mongo + Postgres + Redis
└── package.json
```

---

## 5. Environment Configuration

All configuration is loaded from `.env` via `dotenv`. Create `.env` from `.env.example`.

### Required variables

```env
# Spotify OAuth
SPOTIFY_CLIENT_ID=<from developer.spotify.com>
SPOTIFY_CLIENT_SECRET=<from developer.spotify.com>
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Session security
JWT_SECRET=<long random string>
SESSION_SECRET=<long random string>
```

### Strongly recommended

```env
# At least one LLM provider
GEMINI_API_KEY=...          # Google Gemini
OPENAI_API_KEY=...          # OpenAI
OPENROUTER_API_KEY=...      # OpenRouter (multi-model gateway)
ANTHROPIC_API_KEY=...       # Anthropic Claude

# Primary database
MONGODB_URI=mongodb+srv://...
POSTGRES_URL=postgresql://user:pass@host:5432/echotune_ai

# Cache
REDIS_URL=redis://localhost:6379
```

### Optional

```env
NODE_ENV=development          # or 'production'
PORT=3000
ENABLE_TRACING=true           # OpenTelemetry
ENABLE_AGENTOPS=false         # AgentOps AI observability
DEFAULT_LLM_PROVIDER=gemini   # Which provider to try first
DEFAULT_LLM_MODEL=gemini-1.5-flash
DISABLE_REALTIME=false        # Disable Socket.IO (for serverless)
LOG_LEVEL=info
```

---

## 6. Authentication System

### Flow: Spotify OAuth 2.0 with PKCE

```
Browser                Server                   Spotify
  │                      │                         │
  │ GET /auth/spotify     │                         │
  │──────────────────────►│                         │
  │                      │ generate state + PKCE   │
  │                      │ store in Redis (10 min)  │
  │ 302 → accounts.spotify.com/authorize            │
  │◄─────────────────────│                         │
  │                                                 │
  │ User approves → 302 → /auth/callback?code=...   │
  │──────────────────────────────────────────────►  │
  │                      │◄────────────────────────│
  │                      │ POST /api/token          │
  │                      │ (code + code_verifier)   │
  │                      │──────────────────────►  │
  │                      │◄── access_token +        │
  │                      │    refresh_token         │
  │                      │                         │
  │                      │ upsert User in MongoDB/PG│
  │                      │ set session cookie       │
  │ 302 → /               │                         │
  │◄──────────────────────│                         │
```

**Key implementation files:**

- `src/routes/auth.js` — `/auth/spotify` (initiate) and `/auth/callback` (exchange code for tokens)
- `src/utils/auth-helpers.js` — `generatePKCEChallenge()`, `generateNonce()`
- `src/security/auth.js` — Prometheus counters for auth events
- `src/infra/SessionManager.js` — Redis session store with memory fallback
- `src/api/middleware.js#extractUser` — attaches `req.user` from JWT / session on every request

**Scopes requested:**

```
user-read-private, user-read-email,
playlist-modify-public, playlist-modify-private,
user-read-recently-played, user-top-read,
user-library-read, user-library-modify,
user-read-playback-state, user-modify-playback-state,
streaming
```

**Token refresh:** The server automatically exchanges the refresh token when the access token expires (401 from Spotify). The refreshed token is stored back in the user's session.

---

## 7. Backend Server & API Layer

### Entry points

| File | Role |
|---|---|
| `server.js` (root) | DigitalOcean-compatible entry — initialises tracing, loads dotenv, validates env, then `require('./src/server')` |
| `src/server.js` | Main Express application factory — creates `app`, `server`, optional `io`, mounts all middleware and routes |

### Middleware stack (in order)

1. `compression()` — gzip all responses
2. `helmet()` — security headers (CSP, HSTS, etc.)
3. `cors()` — configurable allow-list
4. `express.json({ limit: '10mb' })`
5. `express.urlencoded()`
6. `express-mongo-sanitize` — strip `$` from body/query to prevent NoSQL injection
7. `requestSizeLimit` — hard limit on request body
8. `requestLogger` — Pino structured log on every request
9. `slowRequestMiddleware` — log any request taking > 2 s
10. Redis-backed rate limiters: `apiRateLimit` (general), `authRateLimit` (auth), `spotifyRateLimit`, `chatRateLimit`
11. `extractUser` — JWT / session decode → `req.user`
12. `ensureDatabase` — asserts DB is reachable before passing to handlers
13. `sanitizeInput` — XSS-safe input normalization

### Route mount map

| Prefix | File | Authentication |
|---|---|---|
| `/auth` | `src/routes/auth.js` | Public |
| `/api/chat` | `src/api/routes/chat.js` | Required |
| `/api/recommendations` | `src/api/routes/recommendations.js` | Required (GET is public stub) |
| `/api/spotify` | `src/api/routes/spotify.js` + `src/routes/spotify-api.js` | Required |
| `/api/playlists` | `src/api/routes/playlists.js` | Required |
| `/api/insights` | `src/api/routes/insights.js` | Required |
| `/api/analytics` | `src/api/routes/analytics.js` | Required |
| `/api/feedback` | `src/api/routes/feedback.js` | Required |
| `/api/music-discovery` | `src/api/routes/music-discovery.js` | Required |
| `/api/providers` | `src/api/routes/providers.js` | Required |
| `/api/llm-providers` | `src/api/routes/llm-providers.js` | Required |
| `/api/settings` | `src/api/routes/user-settings.js` | Required |
| `/api/system` | `src/api/routes/system.js` | Optional |
| `/api/database` | `src/api/routes/database.js` | Required |
| `/api/admin` | `src/api/routes/admin.js` | Required + admin role |
| `/api/docs` | `src/api/routes/docs.js` | Public (Swagger UI) |
| `/health`, `/healthz`, `/readiness` | `src/routes/health-consolidated.js` | Public |
| `/metrics` | `src/routes/metrics.js` | Internal (IP allowlist) |
| `*` (SPA fallback) | Serves `dist/index.html` | Public |

### Error handling

- `src/api/middleware.js#errorHandler` — catches all unhandled errors, formats JSON response with `{ error, message, code }`, logs with Pino.
- `src/errors/` — custom error classes (`AppError`, `SpotifyError`, `AuthError`, `ValidationError`).
- `src/infra/httpError.js` — HTTP-specific error factory.

---

## 8. Database Architecture

### Three-tier fallback

```
DatabaseManager (src/database/database-manager.js)
    │
    ├─ 1. MongoDB      (preferred for analytics)
    ├─ 2. SQLite       (local fallback)
    └─ 3. LocalFileDB  (CSV/JSON last resort)
```

The `DatabaseManager` attempts each tier on startup and exposes a unified CRUD interface regardless of which tier is active.

### MongoDB (analytics + history)

Collections and their schemas are defined in `src/database/analytics-schema.js`:

| Collection | Purpose | Key Fields |
|---|---|---|
| `listening_history` | 200 K+ play events per user | `userId, trackId, trackName, artist, played_at, audio_features{}` |
| `audio_features` | Cached Spotify audio analysis | `track_id, danceability, energy, valence, tempo, acousticness, …` |
| `user_analytics` | UI events, device info, UTM | `userId, sessionId, eventType, timestamp, deviceType` |
| `recommendations` | Generated recommendation sets | `userId, tracks[], strategy, score, timestamp` |
| `chat_sessions` | Legacy chat persistence | `sessionId, userId, messages[], context` |
| `playlists` | User playlist metadata | `userId, spotifyId, name, tracks[]` |

TTL indexes auto-expire `user_analytics` documents after 30 days.

### PostgreSQL via Prisma (state + preferences)

Schema file: `prisma/schema.prisma`

**Models:**

| Model | Purpose |
|---|---|
| `User` | Spotify identity: `spotifyId`, `email`, `displayName`, `isPremium` |
| `UserPreferences` | Per-user settings: preferred LLM provider, genres, energy, explicit content |
| `ChatSession` | Conversation sessions: `sessionId`, provider, model, started/ended times |
| `ChatMessage` | Individual messages: `role` (user/assistant), `content`, `tokensUsed`, `latencyMs` |
| `Playlist` | AI-generated playlists: `generatedByAI`, `generationPrompt`, `tags`, `mood` |
| `SystemConfig` | Key-value system configuration stored in DB |
| `ProviderHealth` | Real-time LLM provider health: `isAvailable`, `responseTimeMs`, `errorCount` |
| `FeatureFlag` | Dynamic feature flags: `enabled`, `rolloutPercentage`, `targetUsers` |

### Redis (cache + sessions)

| Key Pattern | Content | TTL |
|---|---|---|
| `oauth:{state}` | PKCE verifier + state for OAuth flow | 10 min |
| `session:{id}` | Express session data | 24 h |
| `rec:{userId}:{hash}` | Recommendation results | 5 min |
| `chat:context:{sessionId}` | Active conversation context | 30 min |
| `rate:{ip}:{route}` | Rate limit counters | Window size |

---

## 9. AI / LLM Chat System

### Overview

The chat subsystem lives in `src/chat/`. The entry point for the API is `POST /api/chat/message`.

### Component graph

```
EchoTuneChatbot (chatbot.js)
  ├── ConversationManager   — session store, context window, summarisation
  ├── IntentClassifier      — maps text → intent enum
  ├── LLMProviderManager    — selects, health-checks, fails over providers
  │     ├── OpenAIProvider
  │     ├── GeminiProvider
  │     ├── AnthropicProvider
  │     ├── OpenRouterProvider (custom HTTP)
  │     ├── BedrockProvider   (AWS Bedrock)
  │     ├── Grok4Provider
  │     ├── PerplexityProvider
  │     └── MockProvider      (always available for demo/dev)
  ├── SpotifyChatIntegration — bridges intents to Spotify API calls
  │     └── SpotifyCommandParser — NLP → {command, params}
  ├── RecommendationEngine  — generates music recommendations
  └── PlaylistService       — AI playlist generation
```

### Intent types

```javascript
const INTENTS = {
  SPOTIFY_PLAY:       'spotify_play',
  SPOTIFY_PAUSE:      'spotify_pause',
  SPOTIFY_SKIP:       'spotify_skip',
  SPOTIFY_VOLUME:     'spotify_volume',
  SPOTIFY_QUEUE:      'spotify_queue',
  SPOTIFY_SHUFFLE:    'spotify_shuffle',
  SPOTIFY_REPEAT:     'spotify_repeat',
  SPOTIFY_DEVICE:     'spotify_device',
  NOW_PLAYING:        'now_playing',
  RECOMMEND:          'recommend',
  PLAYLIST_CREATE:    'playlist_create',
  SEARCH:             'search',
  GENERAL_CHAT:       'general_chat',
};
```

### Provider selection strategy

On each request:
1. `LLMProviderManager` checks `ProviderHealth` table for availability and average latency.
2. The configured `DEFAULT_LLM_PROVIDER` is tried first.
3. If it fails (timeout, HTTP 5xx, rate limit), the next healthy provider is selected automatically.
4. Health checks run every 60 s; results are persisted to PostgreSQL.
5. Circuit breaker (`src/chat/circuit-breaker.js`) opens after 5 consecutive failures and resets after 30 s.

### Conversation memory

`ConversationManager` maintains per-session state:

```javascript
session = {
  sessionId: uuid,
  userId,
  messages: [...],      // last 50 messages
  context: {
    userProfile,
    currentPlaylist,
    lastRecommendations,
    musicPreferences,
    musicContext: { currentMood, preferredGenres, recentlyDiscussed },
    sessionMemory:  { importantFacts, userFeedback, preferences }
  }
}
```

After 20 messages the manager creates an LLM-generated summary of the conversation so far, and the sliding context window only contains the summary + the last 10 messages.

### Persistence

`ChatPersistenceService` (`src/services/ChatPersistenceService.js`):
- Writes `ChatSession` and `ChatMessage` rows to PostgreSQL via Prisma.
- Writes the full conversation JSON to MongoDB for analytics.
- Reads previous sessions on start of a new conversation for context continuity.

---

## 10. Music Recommendation Engine

Two parallel implementations exist; both are active:

### Legacy ML engine (`src/ml/recommendation-engine.js`)

Used directly from `POST /api/recommendations/generate`.

**Hybrid algorithm weights (configurable):**

| Signal | Default Weight |
|---|---|
| Content-based (audio features) | 0.40 |
| Collaborative filtering | 0.30 |
| Context-aware | 0.20 |
| Trending | 0.10 |

### New modular engine (`src/recommendation/`)

Used from the chat system and new API routes. Four strategies, all conform to the same interface:

```javascript
class BaseStrategy {
  async initialize(): Promise<void>
  async run(params): Promise<{ tracks[], diagnostics, metadata }>
}
```

| Strategy | File | How it works |
|---|---|---|
| `content-based` | `contentAudioFeatureStrategy.js` | Cosine similarity over 9 Spotify audio features (energy, valence, tempo, danceability, etc.). Feature weights are configurable per request. |
| `collaborative` | `collaborativeStrategy.js` | User-item matrix built from listening history. Pearson / cosine user similarity; recommends tracks liked by the most similar users. |
| `embedding-semantic` | `embeddingSemanticStrategy.js` | Text embeddings (via `EmbeddingProvider`) for track titles/descriptions; cosine similarity for semantic music discovery. |
| `hybrid-rerank` | `hybridRerankStrategy.js` | Runs all three strategies in parallel, merges candidate lists with weighted fusion or rank fusion, applies diversity and novelty reranking. |

`RecommendationEngine` (orchestrator):
1. Selects strategy based on `params.strategy` (default: `hybrid`).
2. Runs it, post-processes results (deduplicate, diversity cap).
3. Returns `{ tracks[], strategy, metadata: { executionTime, engine, version } }`.
4. Results cached in Redis for 5 min per `(userId, strategyHash)`.

### Audio feature dimensions used

```
acousticness, danceability, energy, instrumentalness,
liveness, loudness, speechiness, tempo, valence
```

---

## 11. Spotify Integration Layer

### API service (`src/spotify/api-service.js`)

Generic authenticated HTTP client for the Spotify Web API (`https://api.spotify.com/v1`). Handles:
- Bearer token injection
- Automatic token refresh on 401
- Rate limit back-off on 429
- Device-not-found on 404

### Playback controller (`src/spotify/playback-controller.js`)

Full playback surface — 15+ operations:

| Method | Spotify endpoint |
|---|---|
| `play(trackUris, deviceId)` | `PUT /me/player/play` |
| `pause()` | `PUT /me/player/pause` |
| `skipToNext()` | `POST /me/player/next` |
| `skipToPrevious()` | `POST /me/player/previous` |
| `setVolume(percent)` | `PUT /me/player/volume` |
| `setShuffle(state)` | `PUT /me/player/shuffle` |
| `setRepeat(state)` | `PUT /me/player/repeat` |
| `addToQueue(trackUri)` | `POST /me/player/queue` |
| `transferPlayback(deviceId)` | `PUT /me/player` |
| `getCurrentTrack()` | `GET /me/player/currently-playing` |
| `getDevices()` | `GET /me/player/devices` |
| `search(query, type)` | `GET /search` |
| `getRecentlyPlayed(limit)` | `GET /me/player/recently-played` |
| `getTopTracks(limit)` | `GET /me/top/tracks` |
| `getTopArtists(limit)` | `GET /me/top/artists` |

### Audio features service (`src/spotify/audio-features.js`)

Fetches Spotify's audio analysis for individual tracks or batches of up to 100 tracks. Results are cached:
1. In-memory `Map` (fastest, session-scoped).
2. MongoDB `audio_features` collection (persistent).
3. Requests Spotify API only on cache miss.

### Playlist service (`src/spotify/PlaylistService.js`)

- Creates a new Spotify playlist with given name/description.
- Adds track URIs to the playlist.
- Optionally generates playlist name and description via LLM from a natural-language prompt.
- Syncs playlist state with PostgreSQL `Playlist` model.

### Rate limiter (`src/spotify/rate-limiter.js`)

Token-bucket implementation respecting Spotify's undocumented limit (~180 requests/minute). Queues excess calls instead of dropping them.

---

## 12. Frontend React Application

### Entry & routing

`src/frontend/App.jsx` — React Router v7 SPA with **lazy-loaded route components** and **prefetch-on-hover** for instant navigation.

**Routes:**

| Path | Component | Description |
|---|---|---|
| `/` | `ChatFirstInterface` | Default: chat as primary interface |
| `/chat` | `EnhancedChatInterface` | Full chat + recommendations |
| `/recommendations` | `ExplainableRecommendations` | Recommendations with reasoning |
| `/playlist` | `PlaylistBuilder` | AI playlist generator |
| `/playlists` | `PlaylistsPage` | Browse and manage playlists |
| `/songs` | `SongsPage` | Browse saved tracks |
| `/discovery` | `EnhancedMusicDiscovery` | Mood/genre-based discovery |
| `/analytics` | `EnhancedAnalyticsDashboard` | Listening history charts |
| `/player` | `AdvancedMusicControlCenter` | Full playback control UI |
| `/insights` | `InsightsDashboard` | Spotify insights + trends |
| `/settings` | `ComprehensiveSystemSettings` | All user settings |
| `/monitoring` | `RealTimeSystemMonitoring` | System health dashboard |

### Key UI components

| Component | Purpose |
|---|---|
| `ChatFirstInterface` | Landing chat with quick suggestions, intent detection, Spotify command execution |
| `NowPlayingWidget` | Floating widget showing current track, cover art, inline play/pause/skip |
| `EnhancedSpotifyWebPlayer` | Embedded Spotify Web Playback SDK integration |
| `ExplainableRecommendations` | Shows each recommendation with its explanation (why this track?) |
| `LLMProviderSelector` | UI dropdown for switching LLM providers + health indicators |
| `FeedbackSystem` | Thumbs up/down on recommendations; feeds back to engine |
| `TrackAnalytics` | Spider chart of audio features for any track |
| `MusicVisualizer` | Animated canvas visualizer synced to playback |
| `VoiceRecording` | Microphone input → speech-to-text → chat message |
| `PlaylistBuilder` | Drag-and-drop playlist construction with AI suggestions |
| `InsightsDashboard` | Recharts-based listening history graphs |
| `AdvancedAnalyticsVisualizationDashboard` | Full analytics with heatmaps and trends |
| `RealTimeSystemMonitoring` | Live provider health + server metrics |
| `AdminMCPPanel` | Admin view of MCP server status |

### State management

- **React Context**: `AuthContext` (Spotify user + tokens), `LLMContext` (active provider + model).
- **Local state** (`useState`/`useReducer`) for component-level UI state.
- No Redux or Zustand — kept intentionally simple.

### Authentication flow (frontend)

1. `AuthGuard` HOC checks `AuthContext.isAuthenticated`.
2. If not authenticated, renders `SpotifyLoginButton` (links to `/auth/spotify`).
3. On successful OAuth callback the server sets a cookie; `AuthContext` reads user data from `GET /api/spotify/profile`.

### API client

`src/frontend/test-api-client.js` (and `src/frontend/utils/`) — thin wrapper over `fetch`/Axios that:
- Reads the base URL from `window.location.origin`.
- Injects the session cookie automatically (same-origin).
- Handles 401 by redirecting to `/auth/spotify`.

### Build

Vite produces a `dist/` folder with hashed asset names. The Express server serves `dist/` as static files with 1-year `Cache-Control: immutable` headers and falls back to `dist/index.html` for all unknown routes (SPA client-side routing).

---

## 13. Real-Time Layer (Socket.IO)

Socket.IO is optionally disabled in serverless environments via `DISABLE_REALTIME=true`.

### Namespace / events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `chat:response` | Server → client | `{ sessionId, message, provider }` | Stream chat replies |
| `chat:typing` | Server → client | `{ sessionId }` | Typing indicator |
| `now_playing:update` | Server → client | Spotify track object | Real-time now-playing sync |
| `recommendation:ready` | Server → client | `{ tracks[], strategy }` | Push recommendations |
| `provider:health_change` | Server → client | `{ provider, available }` | Provider status update |
| `chat:message` | Client → server | `{ sessionId, content }` | Send message |
| `playback:command` | Client → server | `{ command, params }` | Trigger playback action |

`src/services/SocketService.js` wraps `io` and provides a singleton emitter used throughout the server-side code.

---

## 14. Infrastructure & Cross-Cutting Concerns

### Dependency injection (`src/infra/DIContainer.js`)

Simple container that registers singletons and factories. Used to wire `DatabaseManager`, `RecommendationEngine`, `ChatService`, etc., making them testable.

### Feature flags (`src/infra/FeatureFlags.js`)

In-memory map backed by PostgreSQL `FeatureFlag` table. Supports:
- Binary on/off per flag.
- Percentage rollout (hash of `userId % 100`).
- Target user lists.
- Cache TTL of 5 minutes.

### Event bus (`src/infra/EventBus.js`)

`EventEmitter`-based internal pub/sub with:
- Persistent in-memory event store (replaces with Redis in production).
- Retry with exponential back-off (max 3 retries).
- Dead letter queue for events that exhaust retries.
- Ordered delivery per topic.
- Metrics: `eventsPublished`, `eventsDelivered`, `eventsFailed`.

### Graceful shutdown (`src/infra/lifecycle/gracefulShutdown.js`)

On `SIGTERM`/`SIGINT`:
1. Stop accepting new HTTP connections.
2. Drain in-flight Socket.IO connections.
3. Close database connections (Mongo, Prisma, Redis).
4. Flush telemetry.
5. Exit with code 0.

### Caching (`src/api/cache/cache-manager.js`)

Two-level cache:
- **L1**: `node-cache` in-memory with configurable TTL.
- **L2**: Redis with automatic L1 population on L2 hit.

### Observability

| Signal | Implementation |
|---|---|
| Metrics | `prom-client` — counters/histograms for request duration, Spotify API latency, recommendation generation time, cache hit rate |
| Tracing | OpenTelemetry SDK (`@opentelemetry/sdk-node`) with OTLP HTTP exporter; traces cover incoming HTTP, DB queries, LLM calls |
| Logging | `pino` structured JSON; `pino-pretty` in development |
| Health endpoint | `GET /health` → `{ status, db, redis, spotify, version }` |
| Readiness probe | `GET /readiness` → 503 until all services are connected |
| Liveness probe | `GET /healthz` → 200 always if process is alive |

### Security

| Control | Implementation |
|---|---|
| Security headers | `helmet` (CSP, HSTS, X-Frame-Options, …) |
| Rate limiting | `express-rate-limit` + Redis sliding window |
| Slow-down | `express-slow-down` adds delay after threshold |
| Input sanitisation | `express-mongo-sanitize` + manual XSS sanitisation |
| JWT | `jsonwebtoken` signed with `JWT_SECRET` |
| PKCE | SHA-256 code challenge for OAuth |
| Zero-trust | `ZeroTrustSecurityManager.js` validates every internal service call |

---

## 15. MCP Server Ecosystem

EchoTune AI integrates with **Model Context Protocol (MCP)** servers to extend its capabilities:

| Server | Purpose |
|---|---|
| `mcp-server/` (local) | Orchestrator: exposes tool endpoints used by the AI chat system for executing music actions |
| `mcp-servers/browserbase` | Browser automation for Spotify Web Player UI testing |
| Package management MCP | Automated dependency version checking and security scanning |
| Code sandbox MCP | Isolated code execution for AI-generated scripts |
| Analytics MCP | OpenTelemetry-based analytics and performance telemetry |

The MCP orchestrator is started alongside the main server and communicates over HTTP on `localhost:3001`. The chat system calls MCP tool endpoints when it needs to perform actions that are not covered by the Spotify REST API (e.g., complex browser-based interactions).

---

## 16. Deployment & DevOps

### Docker

| File | Purpose |
|---|---|
| `Dockerfile` | Production multi-stage build: `node:20-alpine`, installs prod deps, copies `src/`, runs `node server.js` |
| `Dockerfile.optimized` | Smaller image with `npm ci --production` |
| `docker-compose.yml` | App only |
| `docker-compose.full-stack.yml` | App + MongoDB + PostgreSQL + Redis |
| `docker-compose.dev.yml` | Development with volume mounts and hot-reload |

### DigitalOcean App Platform

`digitalocean-app.yaml` defines:
- Service name `echotune-ai`, instance size `basic-xs`.
- Build command: `npm install`.
- Run command: `node server.js`.
- Port 3000.
- Environment variable references from DO secret store.
- Health check at `/health`.

### Vercel

`vercel.json` routes all traffic to `server.js` (serverless function). `DISABLE_REALTIME=true` is set to skip Socket.IO.

### Nginx

`nginx.conf` / `nginx.conf.template`:
- SSL termination with certificates from `certs/`.
- Reverse proxy to `localhost:3000`.
- Static file caching (`/dist/`, `/public/`) with long max-age.
- WebSocket upgrade headers for Socket.IO.
- Gzip for all text types.

### CI/CD (GitHub Actions)

Key workflows in `.github/workflows/`:

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | push, PR | lint → unit tests → integration tests → build |
| `deploy.yml` | push to `main` | build Docker image → push to registry → deploy to DigitalOcean |
| `security.yml` | schedule, PR | `npm audit`, gitleaks secret scan, SAST |
| `qa.yml` | manual | Full QA automation suite (npm, docker, e2e) |

---

## 17. Testing Strategy

### Unit tests (`tests/unit/`)

Jest with `jest-environment-jsdom` for React component tests. Each service class has a corresponding `*.test.js`.

```bash
npm run test:unit
```

### Integration tests (`tests/integration/`)

Start the Express app in-process with `supertest`, use a real (or in-memory) SQLite database.

```bash
npm run test:integration
```

### E2E tests (`tests/e2e/`)

Playwright — launches Chromium and drives the full React SPA.

Key specs:
- `basic-smoke.spec.js` — health check, login page render
- `comprehensive-ui-automation.spec.js` — full user journey: login → chat → recommendation → playlist

```bash
npm run test:e2e:smoke
```

### QA Automation

`scripts/master-qa-orchestrator.js` runs the full pipeline:

1. NPM install validation
2. Docker build + start
3. Comprehensive API tests (discover all endpoints, test each)
4. UI automation screenshots (10 screenshots for visual regression)
5. Report generation in `QA-AUTOMATION-RESULTS/`

```bash
npm run qa:all
```

---

## 18. Data Models (Full Schema)

### PostgreSQL (Prisma)

```prisma
model User {
  id            String           @id @default(uuid())
  spotifyId     String?          @unique
  email         String?          @unique
  displayName   String?
  isPremium     Boolean          @default(false)
  country       String?
  createdAt     DateTime         @default(now())
  lastLoginAt   DateTime?
  preferences   UserPreferences?
  chatSessions  ChatSession[]
  chatMessages  ChatMessage[]
  playlists     Playlist[]
}

model UserPreferences {
  id                   String   @id @default(uuid())
  userId               String   @unique
  preferredLLMProvider String   @default("gemini")
  enabledProviders     String[]
  preferredGenres      String[]
  preferredArtists     String[]
  energyPreference     Float?   @default(0.5)
  // … more fields
}

model ChatSession {
  id          String        @id @default(uuid())
  userId      String
  provider    String
  model       String
  startedAt   DateTime      @default(now())
  endedAt     DateTime?
  messages    ChatMessage[]
}

model ChatMessage {
  id          String      @id @default(uuid())
  sessionId   String
  userId      String
  role        String      // "user" | "assistant"
  content     String
  tokensUsed  Int?
  latencyMs   Int?
  createdAt   DateTime    @default(now())
}

model Playlist {
  id               String   @id @default(uuid())
  userId           String
  spotifyId        String?  @unique
  name             String
  generatedByAI    Boolean  @default(false)
  generationPrompt String?
  tags             String[]
  mood             String?
}

model ProviderHealth {
  id            String   @id @default(uuid())
  provider      String   @unique
  isAvailable   Boolean
  responseTimeMs Int?
  errorCount    Int      @default(0)
  requestCount  Int      @default(0)
  successCount  Int      @default(0)
}

model FeatureFlag {
  id                String   @id @default(uuid())
  key               String   @unique
  enabled           Boolean  @default(false)
  rolloutPercentage Int      @default(0)
  targetUsers       String[]
}

model SystemConfig {
  id          String  @id @default(uuid())
  key         String  @unique
  value       Json
  category    String
}
```

### MongoDB key document shapes

**listening_history document:**
```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "trackId": "spotify:track:...",
  "trackName": "Bohemian Rhapsody",
  "artist": "Queen",
  "album": "A Night at the Opera",
  "duration_ms": 354947,
  "played_at": ISODate,
  "audio_features": {
    "danceability": 0.321,
    "energy": 0.664,
    "valence": 0.428,
    "tempo": 70.057,
    "acousticness": 0.209,
    "instrumentalness": 0.0,
    "liveness": 0.338,
    "loudness": -7.891,
    "speechiness": 0.0527
  }
}
```

**recommendations document:**
```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "strategy": "hybrid-rerank",
  "tracks": [
    { "trackId": "...", "score": 0.92, "reason": "High energy match" }
  ],
  "generatedAt": ISODate,
  "executionTimeMs": 245
}
```

---

## 19. Complete API Route Reference

### Authentication

| Method | Path | Description |
|---|---|---|
| GET | `/auth/spotify` | Initiate Spotify OAuth 2.0 PKCE flow |
| GET | `/auth/callback` | Exchange code for tokens, create session |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/status` | Check authentication status |
| GET | `/auth/refresh` | Force token refresh |

### Chat

| Method | Path | Description |
|---|---|---|
| POST | `/api/chat/start` | Create new chat session |
| POST | `/api/chat/message` | Send a message, receive AI response |
| GET | `/api/chat/history/:sessionId` | Fetch message history |
| DELETE | `/api/chat/session/:sessionId` | End session |
| GET | `/api/chat/providers` | List available LLM providers |
| POST | `/api/chat/provider` | Switch active provider |

### Recommendations

| Method | Path | Description |
|---|---|---|
| GET | `/api/recommendations` | Dev stub — returns sample tracks |
| POST | `/api/recommendations/generate` | Generate personalised recommendations |
| POST | `/api/recommendations/feedback` | Submit thumbs up/down feedback |
| GET | `/api/recommendations/history` | Past recommendation sets |

### Spotify

| Method | Path | Description |
|---|---|---|
| GET | `/api/spotify/profile` | Current user's Spotify profile |
| GET | `/api/spotify/now-playing` | Currently playing track |
| PUT | `/api/spotify/play` | Start/resume playback |
| PUT | `/api/spotify/pause` | Pause playback |
| POST | `/api/spotify/skip` | Skip to next track |
| POST | `/api/spotify/previous` | Skip to previous track |
| PUT | `/api/spotify/volume` | Set volume (0–100) |
| PUT | `/api/spotify/shuffle` | Toggle shuffle |
| PUT | `/api/spotify/repeat` | Set repeat mode |
| POST | `/api/spotify/queue` | Add track to queue |
| GET | `/api/spotify/devices` | List available devices |
| PUT | `/api/spotify/transfer` | Transfer playback to device |
| GET | `/api/spotify/search` | Search Spotify catalogue |
| GET | `/api/spotify/top-tracks` | User's top tracks |
| GET | `/api/spotify/top-artists` | User's top artists |
| GET | `/api/spotify/recently-played` | Recently played tracks |
| GET | `/api/spotify/audio-features/:trackId` | Audio features for a track |

### Playlists

| Method | Path | Description |
|---|---|---|
| GET | `/api/playlists` | List user's playlists |
| POST | `/api/playlists` | Create new playlist |
| PUT | `/api/playlists/:id` | Update playlist |
| DELETE | `/api/playlists/:id` | Delete playlist |
| POST | `/api/playlists/:id/tracks` | Add tracks |
| DELETE | `/api/playlists/:id/tracks` | Remove tracks |
| POST | `/api/playlists/generate` | AI-generate playlist from prompt |

### Analytics & Insights

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/listening-history` | Paginated listening history |
| GET | `/api/analytics/top-genres` | Top genres by play count |
| GET | `/api/analytics/audio-profile` | Average audio feature profile |
| GET | `/api/insights/trends` | Listening trends over time |
| GET | `/api/insights/discovery-rate` | New artist discovery rate |

### Settings

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Get user preferences |
| PUT | `/api/settings` | Update user preferences |
| GET | `/api/settings/providers` | Get LLM provider config |
| PUT | `/api/settings/providers` | Update provider config |

### System & Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Deep health check (all services) |
| GET | `/healthz` | Liveness probe |
| GET | `/readiness` | Readiness probe |
| GET | `/metrics` | Prometheus metrics scrape endpoint |
| GET | `/api/system/info` | Version, environment info |
| GET | `/api/docs` | Swagger UI |

---

## 20. Key Design Patterns

| Pattern | Where Used | Why |
|---|---|---|
| **Strategy** | Recommendation engine strategies | Swap algorithms without changing the engine interface |
| **Factory** | LLM provider factory (`provider-factory.js`) | Instantiate the correct provider class from config |
| **Circuit breaker** | LLM provider calls | Prevent cascade failures when a provider is down |
| **Observer / Event bus** | `EventBus.js`, Socket.IO | Decouple services; real-time push to clients |
| **Repository** | `DatabaseManager`, `analytics-schema.js` | Abstract DB engine from domain logic |
| **Dependency injection** | `DIContainer.js` | Testability, loose coupling |
| **Facade** | `EchoTuneChatbot` | Single entry point for the complex chat subsystem |
| **Decorator** | `BaseLLMProvider` retry/telemetry wrapper | Add retry and metrics to any provider transparently |
| **Fallback chain** | `DatabaseManager` (Mongo → SQLite → file) | Zero-downtime degradation |
| **Feature flags** | `FeatureFlags.js` | Gradual rollout and A/B testing without code deploys |
| **CQRS lite** | Separate read (GET) and write (POST/PUT) routes | Easier caching, scaling, and audit trail |
| **Lazy loading** | React `lazy()` + Vite code splitting | Sub-second initial page load |

---

## 21. Rebuilding from Scratch — Step-by-Step Checklist

Use this checklist to build an equivalent application:

### Phase 1 — Project Bootstrap
- [ ] `npm init` Node.js project, set `"main": "server.js"`, Node ≥ 18 engine
- [ ] Install core: `express`, `dotenv`, `cors`, `helmet`, `compression`, `express-rate-limit`, `express-session`, `pino`, `uuid`, `axios`, `jsonwebtoken`
- [ ] Install Socket.IO: `socket.io`, `socket.io-client`
- [ ] Install database drivers: `mongodb`, `pg`, `redis`, `@prisma/client`, `prisma`, `sqlite3`
- [ ] Install AI: `openai`, `@google/generative-ai`, `@anthropic-ai/sdk`
- [ ] Set up ESLint + Prettier
- [ ] Create `.env.example` with all variable names (no values)

### Phase 2 — Spotify OAuth
- [ ] Create a Spotify Developer App and note Client ID / Secret
- [ ] Implement PKCE helper: `generateCodeVerifier()`, `generateCodeChallenge(verifier)`
- [ ] `GET /auth/spotify` — store `{ state, code_verifier }` in Redis with 10 min TTL, redirect to `accounts.spotify.com/authorize`
- [ ] `GET /auth/callback` — exchange code for `access_token` + `refresh_token`, upsert user in DB, set session
- [ ] Middleware: `extractUser` — decode session cookie, attach `req.user` with access token
- [ ] Token refresh helper — auto-refresh when 401 from Spotify

### Phase 3 — Database Layer
- [ ] MongoDB: create `listening_history`, `audio_features`, `recommendations` collections with indexes
- [ ] PostgreSQL: write Prisma schema for `User`, `UserPreferences`, `ChatSession`, `ChatMessage`, `Playlist`, `ProviderHealth`, `FeatureFlag`
- [ ] `npx prisma migrate dev` to apply schema
- [ ] Redis: configure session store and PKCE state store
- [ ] `DatabaseManager` with Mongo → SQLite → CSV fallback chain

### Phase 4 — Spotify API Wrapper
- [ ] `SpotifyAPIService` — generic authenticated GET/PUT/POST with token refresh
- [ ] `PlaybackController` — implement all 15 playback operations
- [ ] `AudioFeaturesService` — fetch features, cache in MongoDB and in-memory
- [ ] `PlaylistService` — create, populate, sync to Spotify
- [ ] Rate limiter (token bucket, ~180 req/min)

### Phase 5 — LLM Chat System
- [ ] `BaseLLMProvider` — abstract class with retry/back-off, telemetry
- [ ] Concrete providers: `OpenAIProvider`, `GeminiProvider`, `AnthropicProvider`, `OpenRouterProvider`, `MockProvider`
- [ ] `ConversationManager` — session store, sliding context window, conversation summarisation after 20 messages
- [ ] `IntentClassifier` — regex/LLM-based intent detection returning one of the 13 intents
- [ ] `SpotifyCommandParser` — NLP patterns → `{ command, params }` objects
- [ ] `SpotifyChatIntegration` — maps command objects to `PlaybackController` calls
- [ ] `EchoTuneChatbot` — orchestrates all of the above
- [ ] `ChatPersistenceService` — saves messages to PostgreSQL `ChatMessage` and MongoDB
- [ ] Circuit breaker for provider calls
- [ ] `ProviderHealth` table updated every 60 s

### Phase 6 — Recommendation Engine
- [ ] Implement `ContentAudioFeatureStrategy` — cosine similarity over audio features
- [ ] Implement `CollaborativeStrategy` — user similarity matrix from listening history
- [ ] Implement `EmbeddingSemanticStrategy` — vector similarity from text embeddings
- [ ] Implement `HybridRerankStrategy` — parallel execution + weighted fusion + diversity rerank
- [ ] `RecommendationEngine` orchestrator — strategy registry, cache results in Redis
- [ ] Expose `POST /api/recommendations/generate` with `{ userId, strategy, limit, seeds }`
- [ ] Implement feedback endpoint that adjusts weights

### Phase 7 — REST API
- [ ] Mount all route modules from §19
- [ ] Add rate limiting per route group (auth: stricter, chat: medium, general: liberal)
- [ ] Add input validation with Zod schemas
- [ ] Add Swagger doc generation from JSDoc comments
- [ ] Error handler middleware returning `{ error, message, code }`

### Phase 8 — Real-Time Layer
- [ ] Attach Socket.IO to `http.createServer(app)`
- [ ] Implement event list from §13
- [ ] `SocketService` singleton for broadcasting from anywhere in the server
- [ ] Poll Spotify `now-playing` every 5 s and emit `now_playing:update`

### Phase 9 — React Frontend
- [ ] Vite project inside `src/frontend/`
- [ ] Install `react`, `react-dom`, `react-router-dom`, `@mui/material`, `@emotion/react`, `recharts`, `socket.io-client`
- [ ] `AuthContext` — stores user + Spotify tokens, reads from `/api/spotify/profile`
- [ ] `LLMContext` — active provider + model selection
- [ ] `App.jsx` — lazy-loaded routes with prefetch-on-hover
- [ ] Chat component with streaming response (SSE or Socket.IO)
- [ ] `NowPlayingWidget` — reads Socket.IO `now_playing:update`
- [ ] Recommendation component with explainability panel
- [ ] Playlist builder with drag-and-drop (`@dnd-kit`)
- [ ] Analytics dashboard with `recharts`
- [ ] Settings page reading/writing `/api/settings`
- [ ] Configure Vite to proxy `/api` and `/auth` to Express in dev

### Phase 10 — Infrastructure
- [ ] Implement `FeatureFlags` with PostgreSQL backend
- [ ] Implement `EventBus` (EventEmitter + retry + DLQ)
- [ ] Implement `DIContainer` for service wiring
- [ ] Graceful shutdown: drain connections on SIGTERM
- [ ] Health endpoints: `/health`, `/healthz`, `/readiness`
- [ ] Prometheus metrics: request duration histogram, Spotify API latency, recommendation generation time
- [ ] OpenTelemetry tracing initialised before first import
- [ ] Pino logger with `pino-pretty` in dev

### Phase 11 — Containerisation & Deployment
- [ ] Multi-stage `Dockerfile` (node:20-alpine, prod deps only)
- [ ] `docker-compose.full-stack.yml` with app, MongoDB, PostgreSQL, Redis
- [ ] Nginx reverse proxy with SSL, WebSocket upgrade, static file caching
- [ ] `digitalocean-app.yaml` for App Platform deploy
- [ ] GitHub Actions: CI (lint + test) + CD (build + push + deploy)
- [ ] `.env.example` with all required and optional vars documented

### Phase 12 — Testing
- [ ] Jest unit tests for: DatabaseManager, RecommendationEngine, ChatBot, LLM providers
- [ ] Integration tests with supertest for all API routes
- [ ] Playwright E2E: smoke test (health + login page), full user journey (login → chat → recommendation → playlist)
- [ ] Add `npm run test:ci` combining unit + integration

---

*This specification was extracted from the EchoTune AI (Spotify-echo) repository at commit HEAD on 2026-02-27. All file paths, class names, and API routes were verified against the actual source code.*
