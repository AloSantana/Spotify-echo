# 02 — Tech Stack

> **Quick Reference:** Every library, framework, and service used by EchoTune AI with exact
> versions, purposes, and rationale. Use this as the definitive reference when initializing a
> new project or resolving version conflicts.

---

## 1. Complete Technology Reference

### 1.1 Runtime & Server

| Technology | Version | Purpose | Justification |
|---|---|---|---|
| Node.js | ≥ 20 LTS | JavaScript runtime | LTS support, native `fetch`, improved ESM |
| Express | 4.18 | HTTP server framework | Mature, minimal, vast middleware ecosystem |
| `nodemon` | 3.x | Dev auto-restart | Watches `.js`/`.jsx` changes |
| `dotenv` | 16.x | Env var loading | `.env` → `process.env` at startup |
| `pino` | 10.x | Structured JSON logging | High-performance, low-overhead |
| `pino-pretty` | 11.x | Human-readable dev logs | Dev only; disabled in production |

### 1.2 Frontend

| Technology | Version | Purpose | Justification |
|---|---|---|---|
| React | 19.x | UI framework | Concurrent features, hooks, latest perf improvements |
| Vite | 7.x | Build tool + dev server | Instant HMR, rollup bundling, `dist/` output |
| Material-UI (MUI) | 5.x | Component library | Comprehensive theming, dark mode, accessibility |
| `@emotion/react` | 11.x | CSS-in-JS (MUI dep) | Required by MUI v5 |
| React Router | 7.x | Client-side routing | Nested routes, protected routes via `<AuthGuard>` |
| Socket.IO client | 4.8 | Real-time events | Matches server Socket.IO version exactly |
| `recharts` | 3.x | Analytics charts | Declarative, React-native charting |
| `@dnd-kit/core` | 6.x | Drag-and-drop | Playlist reordering |
| `web-vitals` | 5.x | Performance metrics | CLS, LCP, FID measurement |

### 1.3 Database

| Technology | Version | Purpose | Justification |
|---|---|---|---|
| MongoDB (driver) | 6.6 | Primary database client | Native async, Atlas-compatible |
| MongoDB Atlas | Managed | Production database | Hosted, auto-scaling, replica sets, free tier |
| Redis (driver) | 4.6 | Cache client | Redis 7 compatibility, promise-based |
| `node-cache` | 5.x | In-memory cache fallback | Zero-dependency fallback when Redis unavailable |

> **Agent Note:** MongoDB is the **only** system of record. Redis is optional — the app starts
> and functions without it. Never store data that doesn't also exist in MongoDB.

### 1.4 Authentication & Security

| Technology | Version | Purpose |
|---|---|---|
| `jsonwebtoken` | 9.x | JWT sign/verify |
| `express-session` | 1.17 | Session store (Redis or memory) |
| `helmet` | 7.x | Security HTTP headers |
| `cors` | 2.8 | CORS policy enforcement |
| `express-rate-limit` | 7.x | Per-IP rate limiting |
| `express-mongo-sanitize` | 2.2 | Strip MongoDB operators from input |
| `express-slow-down` | 3.x | Progressive request slowdown |
| `uuid` | 9.x | Secure random state/session IDs |

### 1.5 AI & LLM Providers

| Technology | Version | Purpose |
|---|---|---|
| `@google/generative-ai` | 0.2 | Gemini provider client |
| `openai` | 4.20 | OpenAI + OpenRouter client |
| `@anthropic-ai/sdk` | — | Anthropic Claude client |
| `@aws-sdk/client-bedrock-runtime` | — | AWS Bedrock (Llama/Claude) |
| `axios` | 1.6 | HTTP client for custom/Perplexity/Grok APIs |

### 1.6 Observability

| Technology | Version | Purpose |
|---|---|---|
| `prom-client` | 15.x | Prometheus metrics exposition |
| `@opentelemetry/sdk-node` | 0.203 | Distributed tracing |
| `@opentelemetry/auto-instrumentations-node` | 0.62 | Auto-instrument Express, MongoDB |
| `@opentelemetry/exporter-trace-otlp-http` | 0.203 | Export traces to Jaeger/Tempo |
| `response-time` | 2.3 | Inject `X-Response-Time` header |

### 1.7 Real-time

| Technology | Version | Purpose |
|---|---|---|
| `socket.io` | 4.6 | WebSocket server with fallback |
| `ws` | 8.18 | Raw WebSocket (used by Spotify Web Playback SDK) |

### 1.8 Validation & Schema

| Technology | Version | Purpose |
|---|---|---|
| `ajv` | 8.17 | JSON Schema validation |
| `ajv-formats` | 3.x | Date, email, uri format validators |
| `zod` | 3.25 | TypeScript-first schema validation in API handlers |

### 1.9 Testing

| Technology | Version | Purpose |
|---|---|---|
| Jest | 29.x | Unit + integration test runner |
| `@testing-library/react` | 16.x | React component testing |
| `@testing-library/jest-dom` | 6.x | Custom DOM matchers |
| Playwright | 1.40 | End-to-end browser automation |
| `supertest` | 7.x | HTTP integration testing |
| Babel | 7.x | JSX/ESM transform for Jest |

### 1.10 Build & Tooling

| Technology | Version | Purpose |
|---|---|---|
| ESLint | 9.x | Linting (flat config, `eslint.config.js`) |
| Prettier | — | Code formatting |
| `cross-env` | 7.x | Cross-platform env vars in npm scripts |
| `start-server-and-test` | 2.x | E2E test orchestration |
| `compression` | 1.7 | Gzip middleware for Express |
| `multer` | 2.x | Multipart form uploads |
| `swagger-jsdoc` | 6.x | OpenAPI spec generation from JSDoc |
| `swagger-ui-express` | 5.x | Serve Swagger UI at `/api/docs` |

---

## 2. MongoDB vs Redis vs SQLite — Role Clarification

### MongoDB Atlas (Primary — Always Required)
```
What it stores:
  echotune_users            — user profiles, encrypted Spotify tokens
  echotune_listening_history — every track play event
  echotune_recommendations  — cached recommendation sets (TTL 7d)
  echotune_playlists        — AI-generated playlists
  echotune_user_preferences — per-user LLM/music settings
  echotune_analytics_events — behavioural telemetry (TTL 90d)
  echotune_chat_sessions    — conversation history (TTL 30d)
  echotune_track_metadata   — Spotify track + audio features cache

Why MongoDB:
  • Flexible document model handles nested audio features & preferences
  • Atlas free tier (512 MB) sufficient for Phase 1–2
  • TTL indexes eliminate cron-based cleanup jobs
  • Text indexes on playlists.name for search
  • Atlas vector search (Phase 3) for semantic embeddings
```

### Redis (Cache — Optional)
```
What it caches:
  "recs:{userId}:{strategy}:{limit}"  TTL 3600s  (recommendations)
  "features:{trackId}"                TTL 86400s (audio features)
  "oauth:{state}"                     TTL 600s   (PKCE state + verifier)
  "session:{sessionId}"               TTL 1800s  (express-session store)
  "search:{query}:{type}"             TTL 300s   (Spotify search results)

Why Redis:
  • Recommendations are expensive (multi-strategy aggregation)
  • Audio features rarely change — safe to cache for 24h
  • OAuth state needs fast atomic operations with TTL

Fallback:
  • node-cache (in-process memory) used when REDIS_URL is not set
  • In-process cache is lost on restart — acceptable for ephemeral data
```

### SQLite (Legacy / Testing Only)
```
Status: Present in codebase (sqlite3 devDependency) but NOT used in production.
        Used only in some unit tests for in-memory test fixtures.
        Do NOT add any production code paths that write to SQLite.
```

---

## 3. Why DigitalOcean App Platform

| Criterion | DigitalOcean App Platform | Alternative (AWS ECS) |
|---|---|---|
| Setup time | < 30 minutes (GitHub connect + YAML) | Hours (IAM, ECR, ECS, ALB...) |
| Config format | Single `digitalocean-app.yaml` | Multiple CloudFormation/Terraform files |
| Managed SSL | Auto (Let's Encrypt, renews) | ACM + ALB configuration |
| MongoDB | External Atlas (free/paid) | DocumentDB (expensive) |
| Deploy on push | Yes (GitHub webhook) | Requires CI/CD pipeline |
| Cost (Phase 1) | ~$5/month (basic-xxs) | ~$50+/month minimum |
| Node.js | Native environment slug | Docker image required |
| Scaling | Instance count in YAML | Task definition updates |

**Key constraint:** `digitalocean-app.yaml` at repo root is the deployment manifest.
The app must start with `npm start` → `node server.js`. No wrapper scripts.

---

## 4. Node.js 20 + Express 4 Backend Rationale

```
Node.js 20 (LTS):
  ✓ Native fetch API (no node-fetch in production code)
  ✓ Improved performance vs Node 18 for I/O-heavy workloads
  ✓ Long-term support through April 2026
  ✓ Required by some OpenTelemetry instrumentations

Express 4.18:
  ✓ Battle-tested middleware ecosystem
  ✓ express-rate-limit v7 requires Express 4+
  ✓ express-session, helmet, cors all maintained for Express 4
  ✓ Express 5 not yet widely adopted (beta as of 2024)

Deliberately NOT using:
  ✗ Fastify — migration cost > performance gain at current scale
  ✗ NestJS — unnecessary boilerplate for this project size
  ✗ Bun — runtime stability risk for production
```

---

## 5. React 19 + Vite 7 + MUI 5 Frontend Setup

### Project Init (from scratch)
```bash
# Vite creates the React project
npm create vite@latest frontend -- --template react
cd frontend
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install react-router-dom socket.io-client recharts
```

### Vite Config (vite.config.js)
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [react(), compression({ algorithm: 'gzip' })],
  build: {
    outDir: 'dist',          // Nginx serves from here
    sourcemap: false,         // Disabled in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',   // Dev proxy to Express
      '/auth': 'http://localhost:3000',
    },
  },
});
```

### Material-UI Theme Setup
```javascript
// src/frontend/components/ThemeProvider.jsx
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1DB954' },      // Spotify green
    secondary: { main: '#191414' },     // Spotify black
    background: {
      default: '#121212',
      paper: '#181818',
    },
  },
  typography: {
    fontFamily: '"Circular", "Helvetica Neue", Arial, sans-serif',
  },
});
```

---

## 6. AI Provider Selection Criteria

### Provider Evaluation Matrix
| Provider | Latency | Cost | Music Context | Streaming | Notes |
|---|---|---|---|---|---|
| Gemini 1.5 Flash | ~800ms | Low | Good | Yes | Default; free tier available |
| OpenAI GPT-4o-mini | ~600ms | Medium | Excellent | Yes | Best quality for music NL |
| Anthropic Claude | ~900ms | Medium | Good | Yes | Good at following instructions |
| Perplexity Sonar | ~500ms | Low | Good | No | Useful for real-time music news |
| Grok 4 (xAI) | ~700ms | Medium | Good | Yes | Good for creative playlist names |
| OpenRouter | Variable | Variable | Varies | Yes | Gateway to many models |
| AWS Bedrock | ~1200ms | Low (if AWS) | Good | Yes | Enterprise; Llama/Claude |
| **Mock** | ~0ms | Free | Demo | Yes | Always available; safe fallback |

### Fallback Order Logic
```javascript
// src/chat/llm-provider-manager.js
const FALLBACK_ORDER = [
  'bedrock',      // Enterprise primary
  'gemini',       // Fast and cheap
  'perplexity',   // Real-time search
  'grok4',        // xAI
  'openai',       // Reliable quality
  'openrouter',   // Multi-model gateway
  'mock',         // Always last resort
];
```

---

## 7. Build Tools Reference

### ESLint (eslint.config.js — Flat Config)
```javascript
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',  // console.log is fine; we use pino for structured logs
    },
  },
];
```

### Jest Config (jest.config.js)
```javascript
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['**/tests/**/*.test.js', '**/*.spec.js'],
  setupFilesAfterFramework: ['./jest.setup.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/frontend/**'],
  coverageThreshold: {
    global: { branches: 50, functions: 60, lines: 60 },
  },
};
```

### npm Scripts (Key Commands)
```bash
npm start               # Production: node server.js
npm run dev             # Development: nodemon server.js
npm run build           # Vite build → dist/
npm test                # Jest unit tests
npm run test:e2e        # Playwright E2E tests
npm run lint            # ESLint check
npm run lint:fix        # ESLint auto-fix
npm run docker:compose  # docker-compose up --build
```

---

## 8. Environment Variable Precedence

```
1. DigitalOcean App Platform env vars (production)  ← highest priority
2. .env file (local development)                     ← loaded by dotenv
3. process.env system environment                    ← lowest priority

Loading order in server.js:
  require('dotenv').config();   // loads .env into process.env
```

### .env Template
```bash
# === REQUIRED ===
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/echotune?retryWrites=true&w=majority
MONGODB_DB_NAME=echotune
JWT_SECRET=minimum-32-character-random-secret-here
SESSION_SECRET=another-minimum-32-character-secret
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# === OPTIONAL (at least one LLM key recommended) ===
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...     # Alias for GEMINI_API_KEY
XAI_API_KEY=xai-...        # Grok 4

# === OPTIONAL SERVICES ===
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# === PERFORMANCE ===
MONGODB_MAX_POOL_SIZE=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL=3600000
```

---

## 9. Cross-References

- Architecture diagram using this stack → `01-ARCHITECTURE-GUIDE.md`
- MongoDB schemas and collections → `03-DATA-MODELS.md`
- Deployment with DigitalOcean YAML → `10-DEPLOYMENT-GUIDE.md`
