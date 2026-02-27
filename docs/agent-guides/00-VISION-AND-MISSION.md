# 00 — Vision and Mission

> **Quick Reference:** This document defines what EchoTune AI is, why it exists, who it serves,
> the phased roadmap, and the non-negotiable technical philosophy every implementation decision
> must follow. Read this first before touching any other guide.

---

## 1. Vision Statement

**EchoTune AI** is an AI-native music discovery and playback control platform that makes Spotify
feel conversational. Instead of navigating menus and search boxes, a user simply says what they
want — "something energetic for my morning run", "skip this", "build a chill Friday playlist" —
and EchoTune makes it happen.

The long-term vision: **the world's most intelligent personal music companion**, one that learns
taste over time, understands context, controls playback natively, and surfaces music users never
knew they loved.

---

## 2. Problem Statement

| Pain point | Current reality | EchoTune solution |
|---|---|---|
| Discovery friction | Spotify search requires knowing what you want | Describe mood/activity → AI finds it |
| Context blindness | Generic "Daily Mix" ignores current mood | LLM reads natural language context |
| Control complexity | Separate app/device UI for playback | One chat box controls everything |
| Taste stagnation | Collaborative filtering echo chamber | Hybrid engine blends multiple signals |
| Provider lock-in | Single AI provider failure kills features | Circuit-breaker multi-provider fallback |

---

## 3. Target Users

| Persona | Need | Key feature used |
|---|---|---|
| Casual listener | Easy discovery | Chat-first interface, mood recommendations |
| Power user | Fine-grained control | Audio feature targeting, playlist builder |
| Developer / agent | Programmatic access | REST API, Socket.IO events |
| Enterprise / SaaS | Reliability, observability | Multi-LLM fallback, Prometheus metrics |

---

## 4. Core Mission Pillars

### Pillar 1 — Conversational Control
Every Spotify action must be reachable through natural language. The chat interface is the
primary UI, not an add-on.

### Pillar 2 — Intelligent Recommendation
Recommendations must blend at least two independent signals (collaborative + content) and
continuously improve from listening history stored in MongoDB.

### Pillar 3 — Resilient AI
No single LLM provider outage should degrade the user experience. The circuit-breaker
fallback chain keeps chat functional even when primary providers are down.

### Pillar 4 — MongoDB-First Persistence
All user data, history, recommendations, playlists, and analytics live in MongoDB Atlas.
Redis is a performance cache only — losing Redis must never cause data loss.

### Pillar 5 — DigitalOcean-Native Deployment
The canonical deployment target is DigitalOcean App Platform. `digitalocean-app.yaml` at the
repository root is the single source of truth for production infrastructure.

---

## 5. Phased Roadmap

### Phase 1 — Foundation (✅ Complete)
**Goal:** Working end-to-end prototype with Spotify auth, basic chat, and content recommendations.

| Feature | Status | Success metric |
|---|---|---|
| Spotify OAuth 2.0 PKCE | ✅ Done | Tokens stored in MongoDB, refresh works |
| JWT session management | ✅ Done | /api/health returns 200 with auth header |
| MongoDB Atlas connection | ✅ Done | Ping latency < 100 ms |
| Basic chat (Gemini/OpenAI) | ✅ Done | Chat returns music-relevant response |
| Content-based recommendations | ✅ Done | Returns 10+ tracks with scores |
| React SPA with Material-UI | ✅ Done | Chat + player render on mobile |
| DigitalOcean App Platform deploy | ✅ Done | `/api/health` returns 200 in prod |

### Phase 2 — Intelligence (🔄 In Progress)
**Goal:** Multi-provider LLM resilience, collaborative filtering, real-time playback, Socket.IO.

| Feature | Status | Success metric |
|---|---|---|
| Circuit-breaker provider failover | 🔄 Active | 0 user-visible errors on single provider failure |
| Collaborative filtering strategy | 🔄 Active | Listening history informs recommendations |
| Spotify Web Player (SDK) | 🔄 Active | Play/pause/skip from browser |
| Socket.IO `now_playing` events | 🔄 Active | UI updates < 500 ms on track change |
| Conversation memory (sessions) | 🔄 Active | Context persists across 10 turns |
| Redis caching layer | 🔄 Active | Recommendation cache hit > 60% |

### Phase 3 — Personalization (🗓 Planned)
**Goal:** Deep user profiling, audio-feature preference learning, semantic embeddings.

| Feature | Success metric |
|---|---|
| Embedding semantic strategy | Nearest-neighbor returns relevant tracks |
| Hybrid rerank engine | Diversity score > 0.7 across 20 recommendations |
| User preference auto-learning | Preference vector updates after 5 listens |
| Playlist AI generation | Generate 20-track playlist from 1-sentence prompt |
| Analytics dashboard | Show top genres, energy trend, top artists |

### Phase 4 — Scale (🗓 Planned)
**Goal:** Handle 10,000 concurrent users; introduce read replicas and caching tiers.

| Feature | Success metric |
|---|---|
| MongoDB Atlas read replicas | Recommendation queries < 50 ms p95 |
| Redis Cluster cache | Cache hit > 80% across all API endpoints |
| Horizontal scaling (DO App Platform) | Auto-scale to 3 instances under load |
| CDN for static assets | Frontend bundle LCP < 2.5 s |
| Prometheus + Grafana dashboards | Full p50/p95/p99 per endpoint |

### Phase 5 — Voice & Mobile (🗓 Planned)
**Goal:** Voice input, PWA, native-feel mobile experience.

| Feature | Success metric |
|---|---|
| Browser Web Speech API integration | Voice command recognized in < 2 s |
| PWA manifest + service worker | Installable on Android/iOS |
| Offline fallback (cached recommendations) | Last 50 recommendations available offline |

### Phase 6 — Playlist Automation (🗓 Planned)
**Goal:** Autonomous playlist creation and smart scheduling.

| Feature | Success metric |
|---|---|
| AI playlist generation endpoint | `/api/playlists/generate` creates + saves to Spotify |
| Scheduled playlist refresh | Weekly cron re-scores and replaces playlist tracks |
| Collaborative playlists | Shared listening sessions with friends |

### Phase 7 — Enterprise & API (🗓 Planned)
**Goal:** Public API, webhook system, rate-tier management.

| Feature | Success metric |
|---|---|
| Public REST API with API keys | Third-party app can call `/api/v1/recommendations` |
| Webhook outbound events | External systems receive `track.played` events |
| Tier-based rate limits | Free: 100 req/day, Pro: 10,000 req/day |
| OpenAPI spec auto-generated | 100% endpoint coverage in `openapi.yaml` |

### Phase 8 — Research & Evaluation (🗓 Planned)
**Goal:** Model evaluation harness, A/B testing, continuous improvement loop.

| Feature | Success metric |
|---|---|
| Recommendation evaluation harness | NDCG@10 benchmark tracked per strategy |
| A/B testing framework | Experiment framework drives strategy weights |
| Feedback loop | User likes/dislikes retrain collaborative model weekly |

---

## 6. Technical Philosophy

### MongoDB-First
- MongoDB Atlas is the **system of record** for all persistent data.
- Redis is a read cache: always writeable data goes to MongoDB first.
- TTL indexes (not cron jobs) expire stale data automatically.
- Collection prefix `echotune_` isolates data in shared Atlas clusters.

### DigitalOcean App Platform Deployment
- `digitalocean-app.yaml` defines all services, environment variable references, and health checks.
- `npm start` is the single run command — no wrapper scripts.
- Build command: `npm install && npm run build` (Vite produces `dist/`).
- Health check: `GET /api/health` must return HTTP 200 within 5 seconds.
- Secrets are referenced as `${VAR_NAME}` in the YAML and injected by DO at runtime.

### Multi-Provider AI Resilience
- Fallback order is configuration-driven, not hardcoded.
- Every LLM call goes through the circuit breaker — no direct `fetch` to AI APIs in route handlers.
- The mock provider ensures the app stays functional with zero API keys (demo mode).
- Provider health is tracked per-provider with 1-minute sliding windows.

### Security Defaults
- All secrets loaded from environment variables — never hardcoded.
- JWT tokens expire; refresh uses the MongoDB-stored Spotify refresh token.
- PKCE (Proof Key for Code Exchange) prevents authorization code interception.
- Helmet, CORS, express-rate-limit, and express-mongo-sanitize are always on.

### Observability
- Structured JSON logging via Pino (key: `level`, `msg`, `requestId`, `userId`).
- Prometheus metrics exposed at `/metrics`.
- OpenTelemetry traces for all LLM calls and DB operations.
- Every error has an `errorCode` string (see `src/errors/codes.js`).

---

## 7. Cross-Reference Map

| Topic | Guide |
|---|---|
| Full architecture diagram | `01-ARCHITECTURE-GUIDE.md` |
| Technology versions | `02-TECH-STACK.md` |
| MongoDB schemas | `03-DATA-MODELS.md` |
| Feature specs | `04-FEATURE-SPECIFICATION.md` |
| API endpoints | `05-API-REFERENCE.md` |
| Spotify OAuth | `06-SPOTIFY-INTEGRATION.md` |
| LLM providers | `07-AI-LLM-INTEGRATION.md` |
| Recommendation engine | `08-RECOMMENDATION-ENGINE.md` |
| Frontend components | `09-FRONTEND-GUIDE.md` |
| Deployment | `10-DEPLOYMENT-GUIDE.md` |
| Build checklist | `11-BUILD-CHECKLIST.md` |
