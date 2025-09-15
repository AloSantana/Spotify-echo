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

- **🔐 Spotify Authentication**: OAuth 2.0 flow with token refresh
- **🎵 Spotify Web Player Control**: Play, pause, skip, device management
- **👤 User Settings System**: Personalized preferences with MongoDB persistence
- **💬 Chat Interface**: Multi-provider LLM integration (OpenAI, Gemini, OpenRouter, Mock)
- **📊 Listening History**: 203,090+ documents with comprehensive indexing
- **📱 Web Interface**: Multiple UI pages (admin, settings, chat, playlists)
- **🔧 API Ecosystem**: 27+ API routes for comprehensive functionality

### 🚧 Partial Implementation (In Progress)

- **🎯 Hybrid Recommendations**: Algorithm framework with feature flags (scaffolded)
- **📈 Analytics Dashboard**: Real-time insights (basic implementation)
- **🧪 A/B Testing**: Experimentation framework (behind feature flags)
- **📱 PWA Features**: Offline capabilities and push notifications (scaffolded)
- **🤖 Advanced AI Routing**: Multi-provider optimization strategies

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

## 💾 MongoDB Data Model

### Core Collections

#### `listening_history` (203,090 documents)
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
    "danceability": 0.7,
    "energy": 0.8,
    "valence": 0.6,
    "tempo": 150.0
  },
  "listening": {
    "ms_played": 83863,
    "completion_rate": 0.399,
    "skipped": true
  }
}
```

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

### Environment Setup

Create `.env` file with essential variables:

```env
# Required: MongoDB Connection
MONGODB_URI=mongodb+srv://your-cluster/echotune

# Required: Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# Required: At least one AI provider
GEMINI_API_KEY=your_gemini_api_key
# OR
OPENAI_API_KEY=your_openai_api_key
# OR  
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional: Advanced features
REDIS_URL=redis://localhost:6379
```

### Installation & Launch

```bash
# Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Install dependencies
npm install

# Start the application
npm start

# Access the application
open http://localhost:3000
```

### First Run Experience

1. **Connect Spotify**: Click "Login with Spotify" to authorize
2. **Configure Settings**: Visit `/settings.html` to set preferences  
3. **Start Chatting**: Use `/chat` to begin music discovery
4. **Explore Data**: Admin panel at `/admin.html` shows analytics

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