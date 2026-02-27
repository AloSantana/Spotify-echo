# 11 — Build Checklist

> **Quick Reference:** Complete ordered build sequence for an AI agent building EchoTune AI
> from scratch. Each step has a description, files to create, and an acceptance test.
> Steps MUST be completed in order — later steps depend on earlier ones.

---

## How to Use This Checklist

- Complete phases in order (Phase 1 → Phase 10)
- Run the **Acceptance Test** at the end of each step before proceeding
- If an acceptance test fails, fix it before moving on
- Mark `[x]` when each step is verified

---

## Phase 0: Repository Initialization

### Step 0.1 — Create Repository Structure
**Description:** Initialize Node.js project with correct folder layout.

**Files to create:**
```bash
mkdir -p src/{auth,chat/{llm-providers,intents,context,utils},api/{routes,middleware,cache,health,monitoring},database,spotify,recommendation/strategies,ml,services,frontend/{components,contexts,hooks,utils,styles},infra,utils,config,errors}
npm init -y
git init
printf "node_modules/\n.env\ndist/\n" > .gitignore
```

**Files to create:**
- `package.json` — Add all dependencies from `02-TECH-STACK.md` §1
- `.gitignore`
- `.env.example` — Template from `02-TECH-STACK.md` §8

**Acceptance test:**
```bash
node -e "console.log('Node version:', process.version)"
# Must print Node 20+
```

---

### Step 0.2 — Install Dependencies
**Description:** Install all production and dev dependencies.

```bash
npm install express mongodb redis socket.io jsonwebtoken dotenv helmet cors \
  express-rate-limit express-session express-mongo-sanitize compression \
  pino prom-client @google/generative-ai openai axios uuid zod

npm install --save-dev vite @vitejs/plugin-react react react-dom \
  @mui/material @emotion/react @emotion/styled @mui/icons-material \
  react-router-dom socket.io-client recharts jest babel-jest \
  @testing-library/react supertest nodemon eslint cross-env
```

**Acceptance test:**
```bash
node -e "require('express'); require('mongodb'); console.log('✅ Dependencies OK')"
```

---

## Phase 1: Foundation — Express Server

### Step 1.1 — Entry Point
**Description:** Create the server entry point and Express factory.

**Files to create:**
- `server.js` — loads dotenv, requires src/server.js, starts listening
- `src/server.js` — Express app factory

```javascript
// server.js
require('dotenv').config();
const { createApp } = require('./src/server');

const PORT = process.env.PORT || 3000;

async function start() {
  const app = await createApp();
  app.listen(PORT, () => {
    console.log(`🚀 EchoTune AI running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
```

```javascript
// src/server.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

async function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check (no auth)
  app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date() }));

  return app;
}

module.exports = { createApp };
```

**Acceptance test:**
```bash
npm start &
curl http://localhost:3000/api/health
# Must return: {"status":"healthy",...}
kill %1
```

---

### Step 1.2 — Logger
**Description:** Set up structured Pino logger used across the application.

**File to create:** `src/utils/logger.js`

```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
module.exports = logger;
```

**Acceptance test:**
```javascript
const logger = require('./src/utils/logger');
logger.info('Logger works');
// No error thrown
```

---

## Phase 2: Database — MongoDB Connection

> **Dependency:** Phase 1 must be complete. MongoDB Atlas cluster must exist.

### Step 2.1 — MongoDB Manager
**Description:** Singleton MongoDB connection manager with auto-retry and index initialization.

**File to create:** `src/database/mongodb-manager.js`

Key behaviors (see full implementation in `03-DATA-MODELS.md` §10):
- Reads `MONGODB_URI` from env
- Retries connection up to 3 times with 5s delay
- Calls `initializeCollections()` after connect
- Creates all 8 collections with correct indexes and TTLs
- Exports singleton: `module.exports = new MongoDBManager()`

**Acceptance test:**
```bash
MONGODB_URI="your-atlas-uri" node -e "
const mgr = require('./src/database/mongodb-manager');
mgr.connect().then(ok => {
  console.log('MongoDB connected:', ok);
  process.exit(0);
});
"
```

---

### Step 2.2 — Schema Definitions
**Description:** Define all 8 collection schemas and TTL configurations.

**File to create:** `src/database/schema.js`

Include all schemas from `03-DATA-MODELS.md`: users, listening_history, recommendations,
playlists, user_preferences, analytics_events, chat_sessions, track_metadata.

**Acceptance test:**
```javascript
const schema = require('./src/database/schema');
console.assert(schema.UserProfileSchema, 'UserProfileSchema must exist');
console.assert(schema.ListeningHistorySchema, 'ListeningHistorySchema must exist');
console.log('✅ Schemas OK');
```

---

## Phase 3: Authentication — Spotify OAuth

> **Dependency:** Phase 2 (MongoDB) must work. Spotify app registered.

### Step 3.1 — Auth Service (PKCE)
**Description:** PKCE OAuth flow: generate URL, handle callback, token storage, JWT issue.

**File to create:** `src/auth/auth-service.js`

Key methods (see full code in `06-SPOTIFY-INTEGRATION.md`):
- `generateAuthUrl(options)` — creates PKCE state + challenge, stores in Redis, returns URL
- `handleCallback(code, state)` — validates state, exchanges code, upserts user, returns JWT
- `refreshSpotifyToken(refreshToken)` — calls Spotify token refresh endpoint

**File to create:** `src/auth/auth-routes.js`

Routes:
- `GET /auth/login` → calls `authService.generateAuthUrl()`
- `GET /auth/callback` → calls `authService.handleCallback()`
- `POST /auth/logout` → clears session

**Acceptance test:**
```bash
curl http://localhost:3000/auth/login
# Must return: {"success":true,"authUrl":"https://accounts.spotify.com/authorize?..."}
```

---

### Step 3.2 — JWT Middleware
**Description:** `requireAuth` middleware that validates JWT Bearer tokens.

**File to create:** `src/auth/auth-middleware.js`

```javascript
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required', code: 'MISSING_TOKEN' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

module.exports = { requireAuth };
```

**Acceptance test:**
```bash
curl -X GET http://localhost:3000/api/user/settings
# Must return 401 with code: "MISSING_TOKEN"

curl -H "Authorization: Bearer invalid" http://localhost:3000/api/user/settings
# Must return 401 with code: "INVALID_TOKEN"
```

---

## Phase 4: Spotify Integration

> **Dependency:** Phase 3 (Auth) complete. Valid Spotify credentials in `.env`.

### Step 4.1 — Spotify API Service
**Description:** HTTP wrapper for Spotify Web API with rate limiting and retry.

**File to create:** `src/spotify/api-service.js`

Key methods (see `06-SPOTIFY-INTEGRATION.md` §5):
- `request(method, path, opts)` — handles auth, 429 retry, error normalization
- `search(query, opts)` — `GET /v1/search`
- `getAudioFeatures(trackIds, token)` — `GET /v1/audio-features`
- `getCurrentPlayback(token)` — `GET /v1/me/player`
- `getRecentlyPlayed(token, limit)` — `GET /v1/me/player/recently-played`

**File to create:** `src/spotify/rate-limiter.js`

**File to create:** `src/spotify/playback-controller.js`

Methods: `play`, `pause`, `skip`, `previous`, `setVolume`, `setShuffle`, `setRepeat`,
`transferPlayback`, `addToQueue`, `getDevices`

**Acceptance test:**
```bash
# With valid token:
curl -H "Authorization: Bearer <jwt>" \
  "http://localhost:3000/api/spotify/search?q=rock&type=track"
# Must return tracks array
```

---

### Step 4.2 — Spotify Routes
**Description:** Register all `/api/spotify/*` routes.

**File to create:** `src/api/routes/spotify.js`

Routes to implement:
- `GET /api/spotify/playback`
- `POST /api/spotify/play`
- `POST /api/spotify/pause`
- `POST /api/spotify/skip`
- `POST /api/spotify/previous`
- `POST /api/spotify/volume`
- `POST /api/spotify/shuffle`
- `POST /api/spotify/repeat`
- `GET /api/spotify/search`
- `GET /api/spotify/devices`

All routes: apply `requireAuth` + `requireSpotifyToken` middleware.

**Acceptance test:**
```bash
curl -H "Authorization: Bearer <jwt>" http://localhost:3000/api/spotify/playback
# Returns playback state or {"data":{"isPlaying":false}}
```

---

## Phase 5: LLM Chat Integration

> **Dependency:** Phase 3 (Auth). At least one LLM API key in `.env`.

### Step 5.1 — Base Provider + Implementations
**Description:** Create all LLM provider files.

**Files to create:**
- `src/chat/llm-providers/base-provider.js` — abstract base class
- `src/chat/llm-providers/gemini-provider.js`
- `src/chat/llm-providers/openai-provider.js`
- `src/chat/llm-providers/openrouter-provider.js`
- `src/chat/llm-providers/anthropic-provider.js`
- `src/chat/llm-providers/mock-provider.js` — always available, deterministic

See full implementations in `07-AI-LLM-INTEGRATION.md` §3.

**Acceptance test:**
```javascript
const MockProvider = require('./src/chat/llm-providers/mock-provider');
const p = new MockProvider();
await p.initialize();
const response = await p.generate('recommend rock music');
console.assert(response.length > 0, 'Mock must return non-empty string');
console.log('✅ Mock provider OK');
```

---

### Step 5.2 — Circuit Breaker
**Description:** Per-provider circuit breaker with CLOSED/OPEN/HALF_OPEN states.

**File to create:** `src/chat/circuit-breaker.js`

Configuration (from `07-AI-LLM-INTEGRATION.md` §4):
- `failureThreshold: 5`
- `successThreshold: 3`
- `timeout: 30000` (30s recovery window)
- `monitoringWindow: 60000` (1-minute failure window)

**Acceptance test:**
```javascript
const CircuitBreaker = require('./src/chat/circuit-breaker');
const cb = new CircuitBreaker('test');
console.assert(cb.isAllowed(), 'CLOSED state must allow requests');
for (let i = 0; i < 5; i++) cb.recordFailure();
console.assert(!cb.isAllowed(), 'After 5 failures must be OPEN');
console.log('✅ Circuit breaker OK');
```

---

### Step 5.3 — Chatbot + Provider Manager
**Description:** Main chatbot class that orchestrates LLM calls with fallback.

**Files to create:**
- `src/chat/llm-provider-manager.js` — fallback chain logic
- `src/chat/conversation-manager.js` — session memory (rolling 20 messages)
- `src/chat/chatbot.js` — `EchoTuneChatbot` class
- `src/chat/spotify-command-parser.js` — NL → command type mapping
- `src/chat/context/buildPrompt.js` — system prompt assembly
- `src/chat/intents/classifyIntent.js` — intent detection

**File to create:** `src/api/routes/chat.js`

Routes:
- `POST /api/chat/start`
- `POST /api/chat/message`
- `GET /api/chat/history`

**Acceptance test:**
```bash
# 1. Start session
curl -X POST http://localhost:3000/api/chat/start \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json"

# 2. Send message
curl -X POST http://localhost:3000/api/chat/message \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"message":"recommend rock music","sessionId":"<from step 1>"}'
# Must return {"success":true,"data":{"message":"...","provider":"mock"}}
```

---

## Phase 6: Recommendation Engine

> **Dependency:** Phase 2 (MongoDB), Phase 4 (Spotify audio features).

### Step 6.1 — Recommendation Strategies
**Description:** Implement all recommendation strategies.

**Files to create:**
- `src/recommendation/strategies/collaborativeStrategy.js`
- `src/recommendation/strategies/contentAudioFeatureStrategy.js`
- `src/recommendation/strategies/embeddingSemanticStrategy.js` (stub for Phase 3)
- `src/recommendation/strategies/hybridRerankStrategy.js`

See full code in `08-RECOMMENDATION-ENGINE.md` §3–§6.

**Acceptance test:**
```javascript
const HybridReranker = require('./src/recommendation/strategies/hybridRerankStrategy');
const reranker = new HybridReranker();
const candidates = [[
  { trackId: 'a', score: 0.9, strategy: 'collaborative', artist: 'X' },
  { trackId: 'b', score: 0.8, strategy: 'collaborative', artist: 'Y' },
], [
  { trackId: 'a', score: 0.7, strategy: 'content', artist: 'X' },
  { trackId: 'c', score: 0.6, strategy: 'content', artist: 'Z' },
]];
const result = reranker.rerank(candidates, { limit: 3, confidenceThreshold: 0.5 });
console.assert(result.length > 0, 'Reranker must return results');
console.assert(result[0].score >= result[1].score, 'Must be sorted by score');
console.log('✅ Hybrid reranker OK');
```

---

### Step 6.2 — Recommendation Engine + API
**Description:** Singleton engine with strategy registry and cache integration.

**Files to create:**
- `src/ml/recommendation-engine.js` — singleton with `register()` and `generate()`
- `src/api/cache/cache-manager.js` — Redis + in-memory fallback
- `src/api/routes/recommendations.js` — `GET /api/recommendations`

**Acceptance test:**
```bash
curl -H "Authorization: Bearer <jwt>" \
  "http://localhost:3000/api/recommendations?strategy=hybrid&limit=10"
# Must return {"success":true,"data":[...],"meta":{...}}
```

---

## Phase 7: Real-time — Socket.IO

> **Dependency:** Phase 1 (Express server).

### Step 7.1 — Socket.IO Server Setup
**Description:** Attach Socket.IO to the HTTP server; emit `now_playing` events.

**Files to create:**
- `src/services/socket-service.js` — Socket.IO initialization and event handlers

```javascript
// src/services/socket-service.js
const { Server } = require('socket.io');

function initializeSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGINS?.split(',') || '*' },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe_now_playing', () => {
      socket.join('now_playing_room');
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = { initializeSocketIO };
```

Update `server.js` to use `createServer` and pass to Socket.IO:

```javascript
// server.js
const { createServer } = require('http');
const { createApp } = require('./src/server');
const { initializeSocketIO } = require('./src/services/socket-service');

async function start() {
  const app = await createApp();
  const httpServer = createServer(app);
  const io = initializeSocketIO(httpServer);
  app.set('io', io);
  httpServer.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
}
```

**Acceptance test:**
```javascript
const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');
socket.on('connect', () => {
  console.log('✅ Socket.IO connected');
  socket.disconnect();
  process.exit(0);
});
socket.on('connect_error', err => {
  console.error('❌ Socket.IO failed:', err.message);
  process.exit(1);
});
```

---

## Phase 8: Frontend — React Application

> **Dependency:** Phases 1–7 complete. Backend API running on port 3000.

### Step 8.1 — Vite Configuration
**Description:** Set up Vite with React plugin, proxy, and chunking.

**Files to create:**
- `vite.config.js` — see `02-TECH-STACK.md` §5

**Acceptance test:**
```bash
npx vite build
# Must produce dist/ without errors
ls dist/index.html  # Must exist
```

---

### Step 8.2 — Auth Context + App Shell
**Description:** Core React structure with auth, theme, and routing.

**Files to create:**
- `src/frontend/contexts/AuthContext.jsx` — see `09-FRONTEND-GUIDE.md` §3.1
- `src/frontend/contexts/LLMContext.jsx` — see `09-FRONTEND-GUIDE.md` §3.2
- `src/frontend/components/ThemeProvider.jsx` — MUI dark/light theme
- `src/frontend/components/AuthStatus.jsx` — with `AuthGuard` export
- `src/frontend/components/SpotifyLoginButton.jsx`
- `src/frontend/components/LoadingState.jsx`
- `src/frontend/components/ErrorBoundary.jsx`
- `src/frontend/App.jsx` — root with routes and lazy loading
- `src/frontend/styles/App.css`
- `index.html` — Vite entry HTML

**Acceptance test:**
```bash
npm run dev &
# Open http://localhost:5173 in browser
# Must show "Connect Spotify" button
# No console errors
```

---

### Step 8.3 — Chat Interface Component
**Description:** Build the main chat UI component.

**Files to create:**
- `src/frontend/components/ChatInput.jsx`
- `src/frontend/components/EnhancedChatInterface.jsx`
- `src/frontend/components/ChatFirstInterface.jsx`

**Acceptance test:**
```
1. Log in with Spotify
2. Type "hello" in chat input
3. Press Enter or click Send
4. See user bubble with "hello"
5. See assistant bubble with AI response within 5 seconds
```

---

### Step 8.4 — Playback Components
**Description:** Now-playing widget and transport controls.

**Files to create:**
- `src/frontend/components/EnhancedSpotifyWebPlayer.jsx`
- `src/frontend/components/AdvancedMusicControlCenter.jsx`
- `src/frontend/hooks/useSocket.js` — Socket.IO hook

**Acceptance test:**
```
1. Start Spotify playing on any device
2. Open EchoTune
3. Now-playing widget shows current track within 10 seconds
4. Clicking "Skip" changes the track
```

---

### Step 8.5 — Recommendation + Playlist Components
**Description:** Recommendation cards, music discovery, playlist builder.

**Files to create:**
- `src/frontend/components/ExplainableRecommendations.jsx`
- `src/frontend/components/EnhancedMusicDiscovery.jsx`
- `src/frontend/components/PlaylistBuilder.jsx`
- `src/frontend/components/PlaylistsPage.jsx`

**Acceptance test:**
```
1. Navigate to /recommendations
2. See at least 10 track cards with names and scores
3. Navigate to /playlist
4. Type "workout rock playlist"
5. See playlist generated with tracks
```

---

### Step 8.6 — Analytics + Settings Components
**Description:** Analytics dashboard and settings panel.

**Files to create:**
- `src/frontend/components/EnhancedAnalyticsDashboard.jsx`
- `src/frontend/components/InsightsDashboard.jsx`
- `src/frontend/components/BackendConnectedSettings.jsx`
- `src/frontend/components/EnhancedProviderPanel.jsx`
- `src/frontend/utils/api.js` — fetch wrapper

**Acceptance test:**
```
1. Navigate to /analytics
2. See listening history charts (or empty state with instructions)
3. Navigate to /settings
4. Change LLM provider to "mock"
5. Send chat message — verify response comes from mock provider
```

---

## Phase 9: Deployment

> **Dependency:** All phases 1–8 complete. DigitalOcean account, MongoDB Atlas, Spotify app set up.

### Step 9.1 — Production Build
**Description:** Ensure `npm run build` produces a working `dist/` bundle.

```bash
NODE_ENV=production npm run build
ls -la dist/
# Must contain index.html and assets/
```

**Acceptance test:**
```bash
NODE_ENV=production node server.js &
curl http://localhost:3000/api/health
# Must return { status: "healthy" }
curl http://localhost:3000/
# Must return HTML (index.html served from dist/)
kill %1
```

---

### Step 9.2 — DigitalOcean App Platform Deploy
**Description:** Deploy to production.

Steps (see full guide in `10-DEPLOYMENT-GUIDE.md` §3):
1. Push code to GitHub
2. Create DigitalOcean App from GitHub
3. Set all required environment variables as Secrets
4. Update Spotify redirect URI to production URL
5. Deploy

**Acceptance test:**
```bash
curl https://<your-app>.ondigitalocean.app/api/health
# Must return { status: "healthy" }
curl https://<your-app>.ondigitalocean.app/auth/login
# Must return { authUrl: "https://accounts.spotify.com/..." }
```

---

## Phase 10: Testing & Verification

### Step 10.1 — Unit Tests
**Files to create:**
- `tests/unit/circuit-breaker.test.js`
- `tests/unit/spotify-command-parser.test.js`
- `tests/unit/recommendation-engine.test.js`
- `tests/unit/auth-service.test.js`

```bash
npm test
# Must pass with 0 failures
```

---

### Step 10.2 — Integration Tests
**Files to create:**
- `tests/integration/auth.test.js` — full OAuth flow with mock Spotify
- `tests/integration/chat.test.js` — chat message with mock LLM
- `tests/integration/recommendations.test.js` — recommendation generation

```bash
npm run test:integration
# Must pass with 0 failures
```

---

### Step 10.3 — End-to-End Smoke Test
```bash
# With server running:
npm run test:e2e:smoke
# Playwright tests must pass
```

---

## Common Pitfalls and Solutions

| Pitfall | Symptom | Solution |
|---|---|---|
| MongoDB URI missing | `Cannot start — MONGODB_URI not set` | Set `MONGODB_URI` in `.env` |
| Spotify redirect mismatch | `INVALID_CLIENT: Invalid redirect URI` | Match URI exactly in Spotify Dashboard and env var |
| PKCE state expired | `STATE_MISMATCH` after 10+ minutes | Redis TTL is 10 min — complete OAuth faster |
| No LLM key but expecting AI | `ALL_PROVIDERS_DOWN` | Set at least one LLM key, or rely on mock provider |
| Socket.IO not updating | `now_playing` never fires | Check Spotify polling interval; ensure Socket.IO room join |
| Recommendations empty | Empty array returned | Need listening history; use cold-start fallback |
| JWT expired in frontend | 401 errors after 24h | Implement token refresh in `AuthContext` |
| Vite proxy not working | API calls fail in dev | Verify `vite.config.js` proxy target is `http://localhost:3000` |
| Docker build fails | Prisma generate error | Set `PUPPETEER_SKIP_DOWNLOAD=true` in Docker env |
| DigitalOcean health check fails | App restart loop | Ensure `/api/health` responds within 5s on startup |

---

## Final Integration Checklist

```
□ npm start → server starts without errors
□ GET /api/health → { status: "healthy", services: { mongodb: { status: "connected" } } }
□ GET /auth/login → returns Spotify authorization URL
□ Full OAuth flow → JWT issued and stored
□ POST /api/chat/message → LLM response received
□ GET /api/recommendations → tracks returned with scores
□ GET /api/spotify/playback → current state returned
□ POST /api/spotify/play → playback starts
□ Socket.IO connects → now_playing event received within 10s
□ POST /api/playlists/generate → playlist created in Spotify
□ GET /api/analytics/top-artists → artists returned or empty state
□ PATCH /api/user/settings → settings persisted
□ npm test → 0 failures
□ npm run build → dist/ created
□ Production deploy → /api/health returns 200
□ HTTPS active in production
□ All sensitive env vars are SECRET type in DigitalOcean
```

---

## Build Time Estimates

| Phase | Estimated Time | Complexity |
|---|---|---|
| Phase 0: Init | 30 min | Low |
| Phase 1: Express | 1 hour | Low |
| Phase 2: MongoDB | 2 hours | Medium |
| Phase 3: Auth | 3 hours | High |
| Phase 4: Spotify | 3 hours | High |
| Phase 5: LLM Chat | 4 hours | High |
| Phase 6: Recommendations | 4 hours | Very High |
| Phase 7: Socket.IO | 1 hour | Medium |
| Phase 8: Frontend | 8 hours | High |
| Phase 9: Deployment | 2 hours | Medium |
| Phase 10: Testing | 3 hours | Medium |
| **Total** | **~31 hours** | |

---

## Cross-References (All Referenced Guides)

| Guide | Key Section |
|---|---|
| `00-VISION-AND-MISSION.md` | Roadmap, success metrics |
| `01-ARCHITECTURE-GUIDE.md` | Request flows, design patterns |
| `02-TECH-STACK.md` | All dependencies with versions |
| `03-DATA-MODELS.md` | MongoDB schemas and index code |
| `04-FEATURE-SPECIFICATION.md` | Acceptance criteria per feature |
| `05-API-REFERENCE.md` | All endpoint contracts |
| `06-SPOTIFY-INTEGRATION.md` | OAuth + playback controller code |
| `07-AI-LLM-INTEGRATION.md` | Provider + circuit breaker code |
| `08-RECOMMENDATION-ENGINE.md` | Strategy implementations |
| `09-FRONTEND-GUIDE.md` | Component code and patterns |
| `10-DEPLOYMENT-GUIDE.md` | Atlas + DigitalOcean setup |
