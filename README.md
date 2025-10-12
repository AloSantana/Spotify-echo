# 🎵 EchoTune AI - Spotify Music Discovery Platform

<div align="center">

![EchoTune AI Logo](https://via.placeholder.com/150x150/007ACC/FFFFFF?text=🎵)

**Intelligent music discovery platform powered by Spotify integration, AI recommendations, and conversational search**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Ready-green.svg)](https://mongodb.com/)
[![Spotify API](https://img.shields.io/badge/Spotify-API%20Ready-1DB954.svg)](https://developer.spotify.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🤖 AI Platform](docs/AI_PLATFORM.md) • [🧠 Coding Agent](docs/CODING_AGENT.md) • [🗺️ Roadmap](docs/ROADMAP.md)

</div>

---

## 🌟 What is EchoTune AI?

EchoTune AI is a comprehensive music discovery platform that combines Spotify's vast music catalog with AI-powered recommendations and conversational search. The platform provides personalized music discovery through hybrid recommendation algorithms, natural language chat interfaces, and comprehensive user preference management.

### Core Value Proposition

- **🎵 Spotify Integration**: Seamless connection to Spotify Web API for playback control and music data
- **🤖 AI-Powered Recommendations**: Multi-provider AI system with intelligent routing and fallback mechanisms  
- **💬 Conversational Search**: Natural language music discovery through chat interfaces
- **📊 Data-Driven Insights**: MongoDB-powered analytics with 200K+ listening history records
- **⚙️ Personalized Settings**: Comprehensive user preference system with real-time updates

## 🎯 Current Features

### ✅ Working Features (Production Ready)

- **🔐 Spotify Authentication**: OAuth 2.0 flow with token refresh ✅
- **🎵 Spotify Web Player Control**: Play, pause, skip, device management ✅
- **👤 User Settings System**: Personalized preferences with MongoDB persistence ✅
- **💬 Chat Interface**: Multi-provider LLM integration (OpenAI, Gemini, OpenRouter, Mock) ✅
- **📊 Listening History**: 203,090+ documents with comprehensive indexing ✅
- **📱 Web Interface**: Multiple UI pages (admin, settings, chat, playlists) ✅
- **🔧 API Ecosystem**: 27+ API routes for comprehensive functionality ✅
- **🤖 Advanced AI/ML Services**: Real-time inference, personalization engine ✅
- **🔄 Feature Flags**: Dynamic feature control with A/B testing framework ✅
- **📊 MongoDB Integration**: Multiple databases (MongoDB, SQLite, Redis) ✅
- **🎯 Recommendation Engine**: Content-based filtering using Spotify audio features ✅

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

- **Node.js** 20.x or higher
- **MongoDB** (Atlas recommended)
- **Spotify Developer Account**

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

# Optional: AI Provider (at least one recommended)
GEMINI_API_KEY=your_gemini_api_key
# OR
OPENAI_API_KEY=your_openai_api_key
# OR  
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional: Advanced features
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
```

### Installation & Launch

```bash
# Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Install dependencies
npm install

# Validate your setup
npm run auth:url  # Generate authorization URL
npm run auth:test-credentials  # Test client credentials

# Start the application
npm start

# Access the application
open http://localhost:3000
```

### 🔐 Authentication Testing

Test your Spotify setup before full launch:

#### Validate Configuration
```bash
# Check auth health (should show clientConfigured: true)
curl http://localhost:3000/auth/health

# Test client credentials (should connect to Spotify API)
npm run auth:test-credentials
```

#### Manual OAuth Flow
```bash
# Generate authorization URL
npm run auth:url
# Copy URL, visit in browser, authorize app, copy code from callback

# Exchange code for tokens (replace <your-code>)
npm run auth:exchange -- --code=<your-code>
```

### First Run Experience

1. **Validate Setup**: Run `npm run auth:test-credentials` to ensure Spotify connection
2. **Connect Spotify**: Click "Login with Spotify" to complete OAuth flow
3. **Configure Settings**: Visit `/settings.html` to set music preferences  
4. **Start Chatting**: Use `/chat` to begin AI-powered music discovery
5. **Explore Data**: Admin panel at `/admin.html` shows analytics

### 🎵 Spotify Playback Setup

EchoTune AI provides full playback control when connected to Spotify. Follow these steps to enable music playback:

#### Activating an "Active Device"

Spotify requires an **active device** to control playback. An active device is any Spotify-enabled device currently playing music.

**Quick Setup:**
1. Open Spotify on **any device** (phone, computer, tablet, smart speaker)
2. **Start playing any song** (this makes the device "active")
3. Return to EchoTune AI and use the playback controls

**Supported Devices:**
- 📱 **Mobile**: Spotify mobile app (iOS/Android)
- 💻 **Desktop**: Spotify desktop app (Windows/Mac/Linux)
- 🌐 **Web Player**: [open.spotify.com](https://open.spotify.com)
- 🔊 **Smart Speakers**: Alexa, Google Home, etc.
- 🎧 **Hardware**: Spotify Connect-enabled devices

#### Available Playback Controls

Once you have an active device, you can use:

- ▶️ **Play/Pause** - Start or stop playback
- ⏭️ **Next Track** - Skip to next song
- ⏮️ **Previous Track** - Go to previous song  
- 📱 **Device Transfer** - Switch playback between devices
- 📋 **Device List** - View all available Spotify devices

#### Testing Playback Controls

```bash
# Check available devices (requires login)
npm run spotify:devices

# Example API calls (after authentication)
curl -X GET "http://localhost:3000/api/spotify/devices"
curl -X POST "http://localhost:3000/api/spotify/next"
```

#### "No Active Device" Troubleshooting

If you see **"No active device found"**:

1. ✅ **Start music on any device**: Open Spotify and press play
2. ✅ **Wait a moment**: Can take 10-30 seconds for device to register
3. ✅ **Refresh the page**: Device list updates when UI loads
4. ✅ **Check device is online**: Ensure device has internet connection

**Quick Test Workflow:**
1. Open [open.spotify.com](https://open.spotify.com) in another tab
2. Play any song
3. Return to EchoTune AI
4. Try the playback controls - they should work immediately!

### 🔧 Troubleshooting

#### Common Issues

**"SPOTIFY_CLIENT_ID not configured"**
- Ensure `.env` file exists with valid credentials
- Check Spotify Developer Dashboard for correct Client ID

**"Invalid redirect URI"**  
- Verify redirect URI in Spotify app settings exactly matches: `http://localhost:3000/auth/callback`
- Check for trailing slashes or protocol mismatches

**"Invalid client" during OAuth**
- Double-check Client ID and Client Secret are correct
- Ensure Client Secret is kept private and not exposed

**"Access denied" during authorization**
- App may be in development mode (limited to 25 users)
- Submit quota extension request in Spotify Dashboard

**Token refresh errors**
- Tokens automatically refresh when expiring
- Check server logs for refresh errors
- May need to re-authorize if refresh token expires

#### Health Checks

```bash
# Check overall auth health  
curl http://localhost:3000/auth/health

# Check server status
curl http://localhost:3000/health

# Validate environment variables
npm run validate:env
```

#### Getting Help

1. Check the [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
2. Review server logs for detailed error messages
3. Use development tools in your browser to inspect network requests
4. For issues with this app, check existing GitHub issues

## 🔧 Environment Variables

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | - | MongoDB connection string |
| `SPOTIFY_CLIENT_ID` | ✅ | - | Spotify API client ID |
| `SPOTIFY_CLIENT_SECRET` | ✅ | - | Spotify API client secret |

### AI Provider Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | One required | - | Google Gemini API key |
| `OPENAI_API_KEY` | One required | - | OpenAI API key |
| `OPENROUTER_API_KEY` | One required | - | OpenRouter API key |
| `DEFAULT_LLM_PROVIDER` | No | `gemini` | Preferred AI provider |

### Optional Features

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | - | Redis for caching |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |

## 🤖 MCP Integration

EchoTune AI includes a comprehensive MCP (Model Context Protocol) ecosystem that runs automatically during development to enhance productivity:

### Automatic Integration

- **🔧 Package Management**: Automated dependency updates and security scanning
- **📊 Analytics Server**: Real-time performance monitoring and insights
- **🧪 Testing Automation**: Continuous validation and quality assurance
- **📁 File Operations**: Secure file handling with directory scoping
- **🌐 Browser Automation**: UI testing and screenshot capabilities

### Validation

MCP servers are automatically validated during CI/CD. Manual validation:

```bash
# Quick MCP health check
bash scripts/mcp-smoke-test.sh

# Comprehensive validation
npm run mcp:validate:all
```

For detailed MCP information, see: [MCP Quick Test Guide](docs/MCP_QUICKTEST.md)

## 🗺️ Roadmap

| Phase | Feature | Status | Target | Notes |
|-------|---------|--------|--------|-------|
| **Phase 1** | Core Platform | ✅ DONE | Q4 2024 | Spotify integration, basic chat |
| **Phase 2** | Hybrid Algorithms | 🚧 IN PROGRESS | Q1 2025 | ML recommendation engine |
| **Phase 3** | User Settings | ✅ DONE | Q4 2024 | Personalization system |
| **Phase 4** | Real-time Features | 📋 PLANNED | Q2 2025 | Live recommendations |
| **Phase 5** | PWA & Mobile | 📋 PLANNED | Q2 2025 | Offline capabilities |
| **Phase 6** | Social Features | 📋 PLANNED | Q3 2025 | Shared playlists |

For detailed roadmap information, see: [Detailed Roadmap](docs/ROADMAP.md)

## 📊 Current Status Snapshot

What works today when you run the application:

- ✅ **Spotify Login**: Complete OAuth flow with token management
- ✅ **Music Control**: Play, pause, skip tracks via Spotify Web API
- ✅ **Chat Interface**: Ask for music in natural language
- ✅ **User Settings**: Save and retrieve personalized preferences
- ✅ **Analytics View**: Browse 200K+ listening history records
- ✅ **Admin Dashboard**: System health and usage statistics
- ✅ **API Endpoints**: 27+ functional REST API routes
- ⚠️ **Recommendations**: Basic implementation (hybrid algorithms in development)

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Fork & Clone**: Fork the repository and clone locally
2. **Environment**: Copy `.env.example` to `.env` and configure
3. **Dependencies**: Run `npm install` to install packages
4. **Database**: Set up MongoDB Atlas or local instance
5. **Spotify App**: Create Spotify application for API credentials

### Adding New Features

- **API Routes**: Add to `src/api/routes/`
- **Frontend Pages**: Add to `public/`
- **Database Models**: Follow existing MongoDB schema patterns
- **AI Providers**: Extend the multi-provider chat system

### MCP Server Development

To add new MCP servers:

1. Create server in `mcp-servers/your-server/`
2. Follow existing patterns for server structure
3. Add health checks and validation
4. Update orchestrator configuration
5. Test with smoke test suite

For detailed guidelines, see: [Contributing Guide](CONTRIBUTING.md)

## 🧪 Testing & Validation

EchoTune AI includes a comprehensive test suite that validates installation, configuration, APIs, authentication, and UI components.

### Quick Test Commands

```bash
# Run complete test suite
npm run test:comprehensive

# Run individual test components
npm run test:installation        # Validate dependencies & setup
node scripts/env-validate.js     # Check environment configuration
node scripts/comprehensive-api-testing.js  # Test all APIs
```

### What Gets Tested

- ✅ **Installation & Setup**: Node.js, npm, Python, dependencies, project structure
- ✅ **Environment & Configuration**: Required variables, placeholder detection, API keys
- ✅ **APIs & Services**: Spotify, MongoDB, Redis, LLM providers, infrastructure services
- ✅ **Authentication & Security**: OAuth flows, JWT tokens, session management
- ✅ **UI & Screenshots**: All pages, responsive design, error states

### Test Reports

All tests generate detailed reports in two formats:

- **JSON Reports** (`reports/*.json`): Machine-readable, schema v2 compliant
- **Markdown Reports** (`reports/*.md`): Human-readable summaries
- **Main Report**: `COMPREHENSIVE_TEST_REPORT.md` (copied to root)

### Documentation

- **[📚 Comprehensive Test Guide](docs/COMPREHENSIVE_TEST_GUIDE.md)** - Detailed test documentation
- **[🧪 Testing README](TESTING_README.md)** - Quick reference guide
- **[📋 Test Strategy](docs/TEST_STRATEGY.md)** - Testing architecture and philosophy

### CI/CD Integration

The test suite integrates seamlessly with GitHub Actions. See `.github/workflows/comprehensive-tests.yml` for the workflow configuration.

```yaml
# Example: Run tests on push
- name: Run Comprehensive Tests
  run: npm run test:comprehensive
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
    SPOTIFY_CLIENT_ID: ${{ secrets.SPOTIFY_CLIENT_ID }}
    # ... other secrets
```

For more details, see [Comprehensive Test Guide](docs/COMPREHENSIVE_TEST_GUIDE.md).

## 📖 Documentation

### Quick Links

- **[🤖 AI Platform](docs/AI_PLATFORM.md)** - Multi-provider AI integration and routing
- **[🧠 Coding Agent](docs/CODING_AGENT.md)** - GitHub agent workflows and commands  
- **[🔧 MCP Integration](docs/MCP_QUICKTEST.md)** - Model Context Protocol server validation
- **[🗺️ Roadmap](docs/ROADMAP.md)** - Detailed development roadmap
- **[🤝 Contributing](CONTRIBUTING.md)** - Development guidelines and setup

### Technical Documentation

- **[📊 Data Management](docs/guides/DATA_MANAGEMENT.md)** - MongoDB schema and data handling
- **[⚙️ User Settings](docs/USER_SETTINGS.md)** - Settings system API and implementation
- **[🔒 Environment Config](docs/config/environment_variables.md)** - Complete variable reference
- **[🔗 API Reference](docs/api/)** - REST API documentation

---

**Ready to discover music with AI?** Start with our [Quick Start Guide](#-quick-start) and join the future of intelligent music discovery!

---

## 📚 Documentation Links

### Core Documentation
- **[📖 Main Documentation](docs/README.md)** - Comprehensive documentation index
- **[🚀 Quick Start Guide](docs/QUICK_START.md)** - Get started in 5 minutes
- **[🏗️ Architecture Guide](docs/ARCHITECTURE.md)** - System architecture and design
- **[📊 Data Model](docs/DATA_MODEL.md)** - Database schemas and structures
- **[🔧 API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference

### Developer Guides
- **[👥 Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute to the project
- **[🧪 Testing Guide](docs/TESTING_POLICY.md)** - Testing standards and procedures
- **[🔒 Security Guide](docs/SECRETS.md)** - Security configuration and best practices
- **[📋 Coding Standards](docs/guides/coding-standards.md)** - Code style and conventions

### Advanced Features
- **[🤖 AI Platform Integration](docs/AI_PLATFORM.md)** - Multi-provider AI configuration
- **[🧠 GitHub Coding Agent](docs/CODING_AGENT.md)** - Automated development workflows
- **[🔧 MCP Integration](docs/MCP_INTEGRATION.md)** - Model Context Protocol servers
- **[⚡ MCP Quick Test](docs/MCP_QUICKTEST.md)** - Rapid MCP validation
- **[🗺️ Roadmap](docs/ROADMAP.md)** - Development roadmap and milestones

### Agent Instructions & Automation
- **[🤖 Agent Instructions](docs/guides/AGENTS.md)** - AI agent development guidelines
- **[🔄 GitHub Automation](docs/guides/github-automation.md)** - Automated workflows and CI/CD
- **[📝 Workflow Guide](docs/guides/WORKFLOW_GUIDE.md)** - Development workflow documentation
- **[⌨️ Copilot Commands](docs/guides/COPILOT_SLASH_COMMANDS.md)** - GitHub Copilot slash commands

### Deployment & Production
- **[🚀 Production Guide](docs/PRODUCTION_READINESS_GUIDE.md)** - Production deployment checklist
- **[🐳 Docker Deployment](docs/deployment/DOCKER.md)** - Containerized deployment
- **[☁️ Vercel Deployment](docs/DEPLOYMENT_VERCEL.md)** - Serverless deployment guide
- **[🔧 Performance Optimization](docs/guides/production-optimization.md)** - Performance tuning guide