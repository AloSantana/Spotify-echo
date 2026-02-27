# EchoTune AI — Agent Guides Index

> This directory contains **12 guides** (plus this index file — 13 files total) enabling an AI agent to build,
> maintain, and deploy EchoTune AI from scratch. Read them in numerical order.

## Quick Navigation

| # | Guide | Purpose | Start Here If... |
|---|---|---|---|
| 00 | [Vision & Mission](./00-VISION-AND-MISSION.md) | What EchoTune is, roadmap, tech philosophy | You're starting from scratch |
| 01 | [Architecture Guide](./01-ARCHITECTURE-GUIDE.md) | System diagram, request flows, design patterns | You need to understand how parts connect |
| 02 | [Tech Stack](./02-TECH-STACK.md) | All libraries, versions, rationale | You're initializing the project |
| 03 | [Data Models](./03-DATA-MODELS.md) | MongoDB schemas, indexes, Redis cache patterns | You're implementing persistence |
| 04 | [Feature Specification](./04-FEATURE-SPECIFICATION.md) | User stories, acceptance criteria per feature | You're verifying a feature is complete |
| 05 | [API Reference](./05-API-REFERENCE.md) | Every HTTP endpoint + Socket.IO events | You're building the API or frontend calls |
| 06 | [Spotify Integration](./06-SPOTIFY-INTEGRATION.md) | OAuth PKCE, scopes, tokens, playback control | You're implementing Spotify auth/control |
| 07 | [AI/LLM Integration](./07-AI-LLM-INTEGRATION.md) | Providers, circuit breaker, fallback chain | You're implementing chat or adding a provider |
| 08 | [Recommendation Engine](./08-RECOMMENDATION-ENGINE.md) | 4 strategies with full code | You're implementing recommendations |
| 09 | [Frontend Guide](./09-FRONTEND-GUIDE.md) | React structure, components, Socket.IO client | You're building the UI |
| 10 | [Deployment Guide](./10-DEPLOYMENT-GUIDE.md) | MongoDB Atlas + DigitalOcean App Platform | You're deploying to production |
| 11 | [Build Checklist](./11-BUILD-CHECKLIST.md) | Step-by-step build order with acceptance tests | You're building the entire app |

## Total Documentation

- **13 files** (12 guides + this index) · **~232,000 characters** · **7,173 lines**
- Every code example is language-tagged and production-ready
- All cross-references are explicit (file + section)

## Critical Facts for Any Agent

```
Primary DB:      MongoDB Atlas  (echotune_* collections)
Cache:           Redis (optional) + node-cache fallback
Deployment:      DigitalOcean App Platform (digitalocean-app.yaml)
Run command:     npm start → node server.js
Build command:   npm install && npm run build
Health check:    GET /api/health → HTTP 200
LLM fallback:    bedrock → gemini → perplexity → grok4 → openai → openrouter → mock
Auth:            Spotify OAuth 2.0 PKCE → JWT (24h)
Real-time:       Socket.IO 4 (now_playing, recommendation_update, provider_health)
Node version:    ≥ 20 LTS
```
