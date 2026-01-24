# 🎵 EchoTune AI - Spotify Music Discovery Platform

> **🚨 CODING AGENT INSTRUCTIONS:** Please refer to the [Coding Agent Workflow](CODING_AGENT_WORKFLOW.md) for the "Fresh Start" protocols and cleanup checklist before making changes.

<div align="center">

![EchoTune AI Logo](https://via.placeholder.com/150x150/007ACC/FFFFFF?text=🎵)

**Intelligent music discovery platform powered by Spotify integration, AI recommendations, and conversational search**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Ready-green.svg)](https://mongodb.com/)
[![Spotify API](https://img.shields.io/badge/Spotify-API%20Ready-1DB954.svg)](https://developer.spotify.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🚀 Quick Start](#-quick-start) • [🛠️ Dev Guide](docs/DEVELOPMENT.md) • [📖 Documentation](#-documentation) • [🤖 AI Platform](docs/AI_PLATFORM.md) • [🗺️ Roadmap](docs/ROADMAP.md)

</div>

---

<!-- QA-AUTOMATION-START -->
## 🧪 Latest QA Automation Results

**Last Run:** 2025-10-13  
**Duration:** 43.21s  
**Status:** ⚠️ ISSUES DETECTED

### Installation & Build
- **NPM Install:** ✅ PASS
- **Docker Build:** ❌ FAIL

### Test Results
- **Total Tests:** 4
- **Passed:** 0 ✅
- **Failed:** 0 ❌
- **Skipped:** 4 ⏭️

### UI Screenshots
10 screenshots captured for regression testing.

### ⚠️ Issues Detected
1. **docker-build:** Docker build failed
2. **comprehensive-tests:** Docker build failed

### 📊 Full Reports
Detailed reports available in: [`QA-AUTOMATION-RESULTS/master-qa-1760318996225`](./QA-AUTOMATION-RESULTS/master-qa-1760318996225)

### Running QA Automation
```bash
# Run full QA suite
npm run qa:all

# Run specific phases
npm run qa:npm      # NPM installation & tests
npm run qa:docker   # Docker build & validation
npm run qa:full     # Comprehensive automation
```

<!-- QA-AUTOMATION-END -->


## 🌟 What is EchoTune AI?

EchoTune AI is a comprehensive music discovery platform that combines Spotify's vast music catalog with AI-powered recommendations and conversational search. The platform provides personalized music experiences through a modern web interface.

**✨ NEW: Modernized Chat-First Architecture** - Complete platform overhaul with PostgreSQL integration, advanced AI provider management, and natural language Spotify control!

### Core Value Proposition

- **🎵 Natural Language Spotify Control**: Control playback with conversational commands like "play energetic rock music" ✨ NEW
- **💬 Chat-First Experience**: Modern React UI with chat as the primary interface ✨ NEW
- **🤖 AI-Powered Recommendations**: Multi-provider system (Gemini, OpenAI, Claude) with automatic failover ✨ ENHANCED
- **🗄️ Hybrid Database**: PostgreSQL for state + MongoDB for analytics ✨ NEW
- **📊 Data-Driven Insights**: 200K+ listening history records with real-time personalization
- **⚙️ Production-Ready**: Comprehensive error handling, health monitoring, and graceful degradation ✨ NEW

## 🎯 Current Features

### ✨ New Modernization Features (Phase 1-5 Complete)

- **💬 Chat-First UI**: React 19 + Vite + Material-UI with optimized code splitting (<1s load time) ✨ NEW
- **🎵 Natural Language Spotify Commands**: Control playback conversationally (13 command types) ✨ NEW
  - "play some energetic rock music", "pause", "add to queue", "what's playing?"
- **🗄️ PostgreSQL Integration**: Hybrid database with 9 models for chat, preferences, and state ✨ NEW
- **🤖 AI Provider Factory**: Centralized management with 5 selection strategies and <100ms failover ✨ NEW
- **📊 Provider Health Monitoring**: Real-time tracking with PostgreSQL persistence ✨ NEW
- **🎵 Now Playing Widget**: Real-time playback display with inline controls ✨ NEW
- **🔧 Playback Controller**: Complete Spotify API coverage (15+ operations) ✨ NEW

### ✅ Core Features (Production Ready)

- **🔐 Spotify Authentication**: OAuth 2.0 PKCE flow with token refresh ✅
- **🎵 Spotify Playback Control**: Play, pause, skip, queue, shuffle, repeat, volume, device management ✅
- **👤 User Settings System**: PostgreSQL preferences + MongoDB persistence ✅
- **💬 Multi-Provider Chat**: Gemini, OpenAI, Claude, OpenRouter with automatic failover ✅
- **📊 Listening History**: 203,090+ documents with comprehensive indexing ✅
- **📱 Modern Web Interface**: React SPA with lazy-loaded components ✅
- **🔧 API Ecosystem**: 30+ API routes including Spotify integration ✅
- **🤖 AI/ML Services**: Real-time inference with provider health monitoring ✅
- **🔄 Feature Flags**: Dynamic control with PostgreSQL backend ✅
- **📊 Hybrid Database**: PostgreSQL (state) + MongoDB (analytics) + Redis (cache) ✅
- **🎯 Recommendation Engine**: Content-based filtering + AI-powered suggestions ✅

### 🚧 Partial Implementation (In Progress)

- **🎯 Hybrid Recommendations**: Algorithm framework with feature flags ✅ (content-based working, collaborative partially implemented)
- **📈 Analytics Dashboard**: Real-time insights ✅ (basic API endpoints active)  
- **🧪 A/B Testing**: Experimentation framework ✅ (feature flags system operational)
- **📱 PWA Features**: Offline capabilities and push notifications ⏳ (scaffolded)
- **🤖 Advanced AI Routing**: Multi-provider optimization strategies ✅ (implemented with fallbacks)
- **🔍 Advanced Search**: Vector similarity search ⏳ (embedding strategy partial)
- **📊 Real-time Analytics**: Live user behavior tracking ⏳ (infrastructure ready)

### 📋 Planned Features (Roadmap)

- **🔄 Real-time Personalization**: Live preference learning
- **🎵 Smart Playlist Generation**: AI-curated playlists
- **📱 Mobile-Responsive PWA**: Full offline functionality
- **🏢 Multi-user Support**: Shared playlists and social features
- **🔍 Advanced Search**: Vector similarity and semantic search

## 🏗️ Architecture Overview

```mermaid
graph TB
    Frontend[🖥️ Web Interface] --> API[🔌 Express API Server]
    API --> Auth[🔐 Spotify OAuth]
    API --> Chat[💬 Chat Service]
    API --> Settings[⚙️ User Settings]
    API --> Spotify[🎵 Spotify Integration]
    
    Chat --> LLM[🤖 Multi-Provider LLM]
    LLM --> OpenAI[OpenAI]
    LLM --> Gemini[Google Gemini]
    LLM --> Mock[Mock Provider]
    
    Settings --> MongoDB[(🗄️ MongoDB)]
    Spotify --> SpotifyAPI[🎧 Spotify Web API]
    API --> MCP[🔧 MCP Servers]
    
    MongoDB --> Analytics[📊 Analytics]
    MongoDB --> Recommendations[🎯 Recommendations]
    
    classDef frontend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef api fill:#f1f8e9,stroke:#388e3c,stroke-width:2px
    classDef data fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef external fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class Frontend frontend
    class API,Auth,Chat,Settings,Spotify api
    class MongoDB,Analytics,Recommendations data
    class SpotifyAPI,OpenAI,Gemini,Mock external
```

## 💾 MongoDB Data Model & Recommendation Engine

### Core Collections

#### `listening_history` (203,090 documents)
**Purpose**: Foundation for AI-powered music recommendations using Spotify's 13 audio features
```json
{
  "_id": "composite_key_track_user_timestamp",
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
    "danceability": 0.7,      // Spotify's rhythm and beat strength
    "energy": 0.8,            // Perceptual measure of intensity
    "valence": 0.6,           // Musical positivity/happiness
    "tempo": 150.0,           // BPM (beats per minute)
    "acousticness": 0.3,      // Acoustic vs electronic confidence
    "instrumentalness": 0.1,  // Vocal content prediction
    "liveness": 0.2,          // Live performance detection
    "speechiness": 0.05,      // Spoken word content
    "loudness": -5.0,         // Overall loudness in dB
    "key": 9,                 // Musical key (0=C, 1=C#, etc)
    "mode": 1,                // Major (1) or minor (0)
    "time_signature": 4       // Time signature beats per bar
  },
  "listening": {
    "ms_played": 83863,
    "completion_rate": 0.399,
    "skipped": true
  }
}
```

### 🎯 Recommendation Engine Architecture

EchoTune AI uses a **hybrid recommendation system** that combines:

1. **Content-Based Filtering**: Analyzes Spotify's 13 audio features to find musically similar tracks
2. **Collaborative Filtering**: Leverages 203K+ listening history records to identify user patterns  
3. **LLM-Enhanced Discovery**: Uses AI to understand natural language music preferences
4. **MongoDB Analytics**: Real-time aggregation of listening patterns and audio feature clusters

#### Multi-Stage Recommendation Pipeline

```mermaid
graph TD
    A[User Input] --> B{Input Type}
    B -->|Natural Language| C[LLM Processing]
    B -->|Direct Play| D[Audio Feature Analysis]
    C --> E[Intent Extraction]
    D --> F[Feature Clustering]
    E --> G[MongoDB Query]
    F --> G
    G --> H[Collaborative Filtering]
    H --> I[Content-Based Scoring]
    I --> J[Hybrid Ranking]
    J --> K[Spotify Track Enrichment]
    K --> L[Final Recommendations]
```

#### Audio Feature Clustering Examples

**High Energy Electronic** (Energy: 0.8+, Danceability: 0.7+)
- Tempo: 120-140 BPM
- Acousticness: <0.3
- Valence: >0.6

**Ambient/Chill** (Energy: <0.4, Valence: 0.3-0.7)
- Instrumentalness: >0.7  
- Acousticness: >0.5
- Tempo: 60-100 BPM

**Aggressive Rock/Metal** (Energy: 0.8+, Valence: <0.4)
- Loudness: >-8dB
- Tempo: 140+ BPM
- Instrumentalness: <0.3

### MongoDB Integration with AI

The recommendation engine continuously learns from:
- **203K+ historical listening patterns** for collaborative filtering
- **Real-time user interactions** for preference adaptation  
- **Spotify's audio feature vectors** for content similarity
- **LLM-generated preference profiles** for semantic understanding

This creates a personalized music discovery experience that understands both what you like and why you like it.

#### `user_settings` (TODO)
```json
{
  "userId": "user_12345",
  "llmProvider": "gemini",
  "strategyWeights": {
    "collaborative": 0.4,
    "content": 0.4,
    "semantic": 0.2
  },
  "privacy": {
    "storeHistory": true,
    "shareAnalytics": false
  }
}
```

## 💬 Chat & Recommendation Flow

```mermaid
sequenceDiagram
    participant User
    participant Chat
    participant LLM
    participant Spotify
    participant MongoDB
    
    User->>Chat: "Find energetic rock music"
    Chat->>LLM: Process natural language
    LLM->>Chat: Extract intent & preferences
    Chat->>MongoDB: Query listening history
    MongoDB->>Chat: Return user patterns
    Chat->>Spotify: Search tracks with features
    Spotify->>Chat: Return track metadata
    Chat->>User: Curated recommendations
```

## 🚀 Quick Start

### Prerequisites

> **⚠️ Important**: Node.js **20.x LTS** is the recommended and tested version. While Node 18.x is the minimum requirement, Node 20.x provides better compatibility with all dependencies (Prisma, etc.).

**Required:**
- **Node.js 20.x LTS** (recommended - see `.nvmrc`)
  - Minimum: Node.js 18.0+
  - Tested on: Node.js 20.19.5
  - Required for: Prisma 6.x, Vite 7.x, ESLint 9, modern JavaScript features
  - Check version: `node --version`
  - Install with nvm: `nvm install 20 && nvm use 20`
- **npm** 8.x or higher (comes with Node.js 20+)
- **MongoDB** (Atlas recommended) or use embedded SQLite
- **Spotify Developer Account** + **Premium Account** (for playback control)

**Optional but Recommended:**
- **PostgreSQL** (for chat history & user preferences) ✨ NEW
- **Redis** (for caching and session management)

### 🎵 Spotify API Setup

#### Step 1: Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create an App"**
3. Fill in app details:
   - **App Name**: `EchoTune AI Local` (or your preference)
   - **App Description**: `Local development for music discovery app`
   - **Redirect URI**: `http://localhost:3000/auth/callback`
   - **Website**: (optional)
4. Accept terms and click **"Create"**

#### Step 2: Configure App Settings

1. In your new app dashboard, click **"Settings"**
2. Note your **Client ID** and **Client Secret**
3. Under **"Redirect URIs"**, ensure you have:
   ```
   http://localhost:3000/auth/callback
   ```
4. **Required Scopes** (automatically requested by app):
   - `user-read-private` - Basic profile access
   - `user-read-email` - Email access for account linking
   - `playlist-modify-public` - Create/modify public playlists
   - `playlist-modify-private` - Create/modify private playlists  
   - `user-read-recently-played` - Access listening history
   - `user-top-read` - Access top tracks and artists
   - `user-library-read` - Read saved tracks
   - `user-library-modify` - Save/remove tracks
   - `user-read-playback-state` - Read current playback state
   - `user-modify-playback-state` - Control playback (play/pause/skip/device transfer)
   - `streaming` - Play tracks in Web Playbook SDK (if using web player)

### Environment Setup

Create `.env` file with your Spotify credentials:

```env
# Required: Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Required: MongoDB Connection
MONGODB_URI=mongodb+srv://your-cluster/echotune

# Required: JWT Security (generate secure secrets for production)
JWT_SECRET=your-secure-jwt-secret-here
SESSION_SECRET=your-secure-session-secret-here

# Optional: AI Provider (at least one recommended for chat)
GEMINI_API_KEY=your_gemini_api_key
# OR
OPENAI_API_KEY=your_openai_api_key
# OR  
OPENROUTER_API_KEY=your_openrouter_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: PostgreSQL for chat & preferences (recommended) ✨ NEW
POSTGRES_URL=postgresql://localhost:5432/echotune_ai
# See docs/POSTGRESQL_SETUP.md for setup instructions

# Optional: Advanced features
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
```

### Installation & Launch

> **⚠️ Important**: Before running `npm start`, you must first run `npm install` to install all required dependencies. The installation process now automatically handles Prisma client generation.

#### Standard Setup (Linux, macOS, WSL)

```bash
# 1. Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# 2. Copy environment template
cp env.example .env
# Edit .env and add your POSTGRES_URL and other credentials

# 3. Install dependencies (automatically runs Prisma generation)
npm install

# 4. Initialize database (generate Prisma client + sync schema)
npm run db:init

# 5. Start the application
npm start

# Or use development mode with hot-reload
npm run dev
```

#### Windows WSL Setup

**For detailed Windows WSL setup, see [docs/WSL-SETUP.md](docs/WSL-SETUP.md)**

Quick steps:
```bash
# In WSL Ubuntu terminal:

# 1. Ensure Node 20.x is installed
node --version  # Should be v20.x.x

# 2. Start PostgreSQL (Docker recommended)
docker run --name echotune-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=echotune \
  -p 5432:5432 -d postgres:15

# 3. Clone and setup
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
cp env.example .env

# 4. Edit .env with your database URL
# POSTGRES_URL=postgresql://postgres:password@localhost:5432/echotune

# 5. Install and initialize
npm install
npm run db:init

# 6. Start the server
npm start
```

#### Manual Database Setup (if needed)

```bash
# Generate Prisma client only
npm run db:generate

# Push schema to database (for quick sync)
npm run db:push

# Or run migrations (for production)
npm run db:migrate

# Combined init (recommended for first-time setup)
npm run db:init
```

#### Validate Installation

```bash
# Test environment configuration
npm run validate:env

# Test Spotify credentials
npm run auth:test-credentials

# Run health check
curl http://localhost:3000/health
```

# Access the application at http://localhost:3000
# Chat interface loads as the default page ✨ NEW
```

### 🎵 Using Natural Language Spotify Commands ✨ NEW

Once you've authenticated with Spotify, you can control playback using natural language in the chat:

```
"play some energetic rock music"
"pause"
"skip to the next song"
"add Blinding Lights to the queue"
"what's playing?"
"turn on shuffle"
"set volume to 70%"
"switch to my phone"
```

See [Spotify Integration Guide](docs/SPOTIFY_INTEGRATION.md) for complete command reference.

#### Windows 11 + WSL Setup

If you're using Windows 11 with WSL (Windows Subsystem for Linux), follow these guidelines for optimal performance:

**1. Use WSL2 and Ubuntu Terminal**
```bash
# Ensure you're using WSL2 (recommended for better file system performance)
wsl --set-default-version 2
wsl --install -d Ubuntu
```

**2. Store Repository in Linux Filesystem**
```bash
# Store repo in your Linux home directory (not /mnt/c/)
# This provides better file watching and performance
cd ~
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
```

**3. Line Endings Configuration**
```bash
# Configure Git to use LF line endings (prevents CRLF issues)
git config --global core.autocrlf false
```
Alternatively, the repository includes a `.gitattributes` file to enforce LF endings.

**4. Node.js Version**
```bash
# Ensure Node.js 20.x is installed
node --version  # Should show v20.x.x

# If not, install Node.js 20.x using nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**5. Opening URLs from WSL**
```bash
# If `open` or `xdg-open` commands don't work in WSL:
# 1. Copy the URL shown in the terminal
# 2. Manually paste it into your Windows browser
# Example: http://localhost:3000

# Or configure WSL to open URLs in Windows browser:
export BROWSER=wslview  # If you have wslu installed
```

**6. Common WSL Pitfalls**
- ❌ Don't store the repo in `/mnt/c/Users/...` (Windows filesystem) - slower and file watching may not work
- ✅ Do store the repo in `~/projects/...` (Linux filesystem) - faster and reliable file watching
- ✅ Always run `npm install` and `npm start` from within WSL terminal (not Windows Command Prompt)
- ✅ Access the app via `http://localhost:3000` from your Windows browser

#### Native Windows Setup (PowerShell)

For native Windows development without WSL, we provide PowerShell scripts for a smooth experience:

**1. Prerequisites**
- Node.js 18+ from [nodejs.org](https://nodejs.org/)
- Git for Windows from [git-scm.com](https://git-scm.com/download/win)
- (Optional) Docker Desktop for Windows from [docker.com](https://www.docker.com/products/docker-desktop)

**2. Quick Setup with PowerShell**
```powershell
# Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Run automated setup script
.scriptslash-windowsun.ps1
```

**3. Configure Environment**
```powershell
# Edit .env file with your configuration
notepad .env
```

**4. Run the Application**
```powershell
# Using PowerShell script
.scriptslash-windowsun.ps1

# Or using npm directly
npm start
```

**5. Run Tests**
```powershell
# Smoke tests
.scriptslash-windows	est.ps1 -Type smoke

# All E2E tests
.scriptslash-windows	est.ps1 -Type e2e

# All tests
.scriptslash-windows	est.ps1 -Type all
```

**6. Docker on Windows**
```powershell
# Build image
.scriptslash-windowsuild.ps1

# Run container
.scriptslash-windowsun.ps1

# View logs
.scriptslash-windowsun.ps1

# Stop container
.scriptslash-windowsun.ps1
```

📖 **Full Windows Documentation**: See [docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md) for comprehensive Windows setup, troubleshooting, and best practices.

### 🔧 Troubleshooting Installation

#### Node.js Version Issues

**Problem:** Installation fails with engine compatibility errors

```
npm ERR! engine Unsupported engine
npm ERR! Required: { node: '>=18.0.0' }
npm ERR! Actual:   { node: 'v12.22.9', npm: '8.5.1' }
```

**Solution:**
1. **Upgrade to a supported Node.js version:**
   ```bash
   # Using nvm (recommended)
   nvm install 20
   nvm use 20
   nvm alias default 20
   
   # Verify installation
   node --version  # Should show v20.x.x
   npm --version   # Should show 10.x.x or higher
   ```
2. **Check `.nvmrc` for recommended version:**
   ```bash
   # Use the project's recommended version
   nvm use
   # or
   nvm install
   ```
3. **If you don't have nvm:**
   - Download Node.js 20.x LTS from [nodejs.org](https://nodejs.org/)
   - Or use package managers:
     - Ubuntu/Debian: `sudo apt update && sudo apt install nodejs npm`
     - macOS: `brew install node@20`
     - Windows: Download from [nodejs.org](https://nodejs.org/)

#### Clean Install After Errors

**Problem:** Installation partially completed but has errors

**Solution:**
```bash
# 1. Clean everything
npm cache clean --force
rm -rf node_modules package-lock.json

# 2. Verify Node version
node --version  # Must be >=18.0.0

# 3. Clean install (recommended for CI/CD)
npm ci

# 4. Or regular install
npm install
```

#### Deprecated Dependency Warnings

**Problem:** Seeing warnings about deprecated packages

```
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
```

**Solution:** These are **warnings** from transitive dependencies and do **NOT** prevent installation or operation. They can be safely ignored. The maintainers will update these in future releases.

#### MCP Server Dependencies

**Problem:** Errors or warnings about MCP servers during installation

**Solution:** 
- MCP servers (like `@browserbasehq/mcp-server-browserbase`) are **optional** features
- They use `npx` for on-demand installation and are NOT installed during `npm install`
- They are only downloaded when explicitly started
- To disable MCP features: Add `SKIP_MCP_SERVERS=true` to your `.env` file
- See [MCP_SERVERS_INTEGRATION_GUIDE.md](MCP_SERVERS_INTEGRATION_GUIDE.md) for details

#### Database Connection Issues

**Problem:** Application starts but can't connect to MongoDB or PostgreSQL

**Solution:**
```bash
# MongoDB
# 1. Check MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# 2. Verify connection string in .env
# MONGODB_URI=mongodb://localhost:27017/echotune
# OR
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/echotune

# PostgreSQL (optional)
# 1. Check PostgreSQL is running
pg_isready

# 2. Verify connection string in .env
# POSTGRES_URL=postgresql://localhost:5432/echotune_ai
```

#### Docker Build Issues

**Problem:** Docker build fails or uses wrong Node version

**Solution:**
```bash
# The Dockerfile uses Node 20-alpine by default
# 1. Rebuild with no cache
docker build --no-cache -t echotune-ai:latest .

# 2. Or use docker-compose
docker compose up --build --force-recreate

# 3. Check Docker base image
docker run --rm node:20-alpine node --version
```

#### Common Runtime Errors

**Problem:** "Cannot find module 'dotenv'" or similar errors

**Solution:**
- **First time setup**: Run `npm install` to install all dependencies
- **After updating**: Run `npm install` to install new dependencies
- If issue persists, try `rm -rf node_modules package-lock.json && npm install`
- Key runtime dependencies required:
  - `dotenv` for environment variable management (required for startup)
  - `@google/generative-ai` for Gemini AI integration
  - `mongodb` for database connectivity
  - OpenTelemetry packages for observability
  - See `package.json` for complete list

**Problem:** "SyntaxError: Unexpected token '?" or "Unexpected token '='" during npm install**
- **Cause**: Your Node.js version is too old (likely 12.x, 14.x, or 16.x)
- **Specific error**: This typically occurs in `@prisma/debug` or `@prisma/engines` due to nullish coalescing operator (`??=`) which requires Node.js 14.4+
- **Fix**: Upgrade to Node.js 18 or higher (20.x or 22.x recommended)
- **How to upgrade**:
  - Using nvm: `nvm install 20 && nvm use 20`
  - Or download from https://nodejs.org/
- The project uses modern JavaScript syntax (ES2021+, nullish coalescing, optional chaining) that requires Node.js 18+
- After upgrading, run `rm -rf node_modules package-lock.json && npm install` again

**Deprecation warnings during npm install**
- **Expected behavior**: Some deprecation warnings are normal and come from transitive dependencies (dependencies of dependencies)
- **No action required**: These don't affect functionality or security
- **Common warnings**: `inflight`, `glob@7.x`, `rimraf@3.x`, `lodash.get`, `lodash.isequal`
- **Details**: See [docs/DEPRECATED_DEPENDENCIES.md](docs/DEPRECATED_DEPENDENCIES.md) for full analysis
- **What's fixed**: We've upgraded ESLint to v9 and Prisma to v6.19.0 to minimize deprecations
- **Still present**: Some warnings remain from packages like `sqlite3`, `jest`, and `swagger-jsdoc` - these are waiting for upstream updates

**OpenTelemetry warnings**
- If you see "OpenTelemetry modules not available" - run `npm install`
