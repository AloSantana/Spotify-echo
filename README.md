# 🎵 EchoTune AI

**AI-powered music discovery and Spotify control platform.**

EchoTune AI wraps the Spotify Web API with a conversational AI layer: type natural language commands ("play energetic rock", "create a chill playlist"), get personalised recommendations, and control playback — all from a single React chat interface.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/AloSantana/Spotify-echo.git
cd Spotify-echo

# 2. Configure
cp .env.example .env
# Edit .env — add Spotify credentials + at least one LLM API key

# 3. Install & initialise database
npm install
npm run db:init      # generates Prisma client + pushes schema

# 4. Start
npm start            # http://localhost:3000
# or
npm run dev          # hot-reload development mode
```

> **Requires**: Node.js ≥ 20, a [Spotify Developer App](https://developer.spotify.com/dashboard), and at least one AI key (Gemini / OpenAI / OpenRouter).

---

## Key Features

| Feature | Description |
|---|---|
| 💬 Natural language control | "play something upbeat", "skip", "add to queue" |
| 🤖 Multi-provider AI chat | Gemini · OpenAI · Anthropic · OpenRouter · Azure · mock fallback |
| 🎵 Recommendation engine | Collaborative + content-based (audio features) + semantic embeddings |
| 📋 AI playlist generation | Describe a vibe → full Spotify playlist |
| 📊 Listening analytics | History charts, top tracks/artists, audio-feature profiles |
| 🔄 Real-time updates | Socket.IO now-playing widget, provider health |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+, Express 4 |
| Frontend | React 19, Vite 7, Material-UI 5 |
| Databases | PostgreSQL (Prisma) · MongoDB · Redis · SQLite fallback |
| AI providers | Gemini, OpenAI, Anthropic, OpenRouter, Azure OpenAI |
| Real-time | Socket.IO 4 |
| Deployment | Docker, Nginx, DigitalOcean App Platform, Vercel |

---

## Environment Variables

Copy `.env.example` and fill in:

```env
# Required — Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Required — Security
JWT_SECRET=
SESSION_SECRET=

# Required — at least one database
MONGODB_URI=
POSTGRES_URL=

# At least one LLM provider
GEMINI_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=

# Optional
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
```

---

## Project Structure

```
Spotify-echo/
├── src/                    # All application source code
│   ├── server.js           # Express app factory
│   ├── api/                # HTTP route handlers
│   ├── routes/             # Modular route sub-modules
│   ├── chat/               # Conversational AI (chatbot, LLM providers, intents)
│   ├── recommendation/     # Recommendation engine strategies
│   ├── ml/                 # ML recommendation engine
│   ├── spotify/            # Spotify API wrapper (playback, audio features, playlists)
│   ├── database/           # DB abstraction (MongoDB, PostgreSQL, SQLite, file)
│   ├── infra/              # DI container, feature flags, event bus, lifecycle
│   ├── security/           # Auth, rate limiting, security headers
│   ├── services/           # Shared services (chat persistence, Socket.IO)
│   ├── frontend/           # React SPA (App.jsx, 60+ components, contexts)
│   ├── config/             # Environment and production config
│   └── utils/              # Shared utilities
├── prisma/
│   └── schema.prisma       # PostgreSQL schema (9 models)
├── tests/                  # Jest unit + integration + E2E tests
├── public/                 # Frontend static assets
├── nginx/                  # Nginx reverse proxy config
├── ml_datasets/            # Sample ML datasets (README + small files)
├── config/                 # App-level config files (weights, feature flags)
├── docs/                   # Key documentation
│   └── APP_SPECIFICATION.md  # Full in-depth technical specification
├── server.js               # Root entry point (DigitalOcean / platforms)
├── index.js                # Alternate entry point
├── package.json
├── Dockerfile
├── docker-compose.yml
├── docker-compose.full-stack.yml
├── vite.config.js
├── jest.config.js
└── playwright.config.mjs
```

---

## Documentation

| Doc | Content |
|---|---|
| [`docs/APP_SPECIFICATION.md`](docs/APP_SPECIFICATION.md) | **Complete technical spec** — architecture, all APIs, data models, rebuild checklist |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture diagrams |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Development setup guide |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Production deployment guide |
| [`docs/SPOTIFY_INTEGRATION.md`](docs/SPOTIFY_INTEGRATION.md) | Spotify API integration details |
| [`docs/LLM_INTEGRATION.md`](docs/LLM_INTEGRATION.md) | AI provider integration guide |
| [`docs/POSTGRESQL_SETUP.md`](docs/POSTGRESQL_SETUP.md) | PostgreSQL + Prisma setup |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Full database schema documentation |

---

## Commands

```bash
npm start             # Start production server
npm run dev           # Start with hot-reload
npm test              # Run unit tests
npm run test:e2e      # Run Playwright E2E tests
npm run lint          # ESLint
npm run db:init       # Init database (generate Prisma + push schema)
npm run db:migrate    # Run database migrations
```

### Docker

```bash
docker-compose up --build                              # App only
docker-compose -f docker-compose.full-stack.yml up    # App + MongoDB + PostgreSQL + Redis
```

---

## Spotify API Setup

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Set redirect URI to `http://localhost:3000/auth/callback`
3. Copy **Client ID** and **Client Secret** into `.env`
4. Visit `http://localhost:3000/auth/spotify` to authenticate

---

## License

MIT — see [LICENSE](LICENSE)
