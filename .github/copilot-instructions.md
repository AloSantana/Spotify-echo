# Copilot Instructions for EchoTune AI (Spotify-echo)

## Purpose

This document provides comprehensive guidance for GitHub Copilot and AI coding agents working on this repository. It follows [GitHub's best practices for Copilot coding agents](https://gh.io/copilot-coding-agent-tips).

## Quick Reference

- **Language**: JavaScript/Node.js ES6+ (Backend), Python 3.8+ (Scripts/ML), JavaScript ES6+/React (Frontend)
- **Framework**: Express.js (REST API), WebSockets (Real-time), React (Frontend)
- **AI/ML**: OpenAI, Google Gemini, OpenRouter, AWS Bedrock (Claude Sonnet/Opus), custom ML models
- **Database**: MongoDB (primary), SQLite (fallback), Redis (caching)
- **Testing**: Jest (Node.js), pytest (Python)
- **Deployment**: Docker, DigitalOcean, Nginx, SSL automation
- **CI/CD**: GitHub Actions (`.github/workflows/`)

## Repository Overview

**EchoTune AI** is a sophisticated music recommendation system that integrates with Spotify to provide AI-powered, personalized music discovery. It features:
- Advanced recommendation algorithms (collaborative filtering, content-based analysis, deep learning)
- Conversational AI for natural language music discovery
- Large-scale Spotify listening history processing and audio feature analysis
- Browser automation for Spotify Web Player integration via MCP
- MCP (Model Context Protocol) ecosystem with 13 integrated servers — see `.github/copilot/mcp.json` for the full list
- AWS Bedrock model integration with Claude Sonnet 4.5 / Opus 4.1

## Tech Stack

### Backend
- **Framework**: Express.js (Node.js 16+)
- **AI/ML**:
  - OpenAI API (GPT models)
  - Google Gemini (Gemini models)
  - OpenRouter (multi-model routing)
  - AWS Bedrock (Claude Sonnet 4.5, Claude Opus 4.1, DeepSeek R1)
  - Custom ML pipelines (collaborative filtering, content-based)
- **Database**: MongoDB Atlas, Redis (caching), SQLite (fallback)
- **Other**: WebSockets, JWT auth, Spotify Web API, Passport.js

### Frontend
- **React** with modern hooks
- Vanilla JS/HTML/CSS for lighter pages
- Multi-tab interface (Music Discovery, AI Chat, Visualizations)
- Real-time WebSocket communication
- Spotify Web Player integration

### Scripts / ML (Python)
- **Python 3.8+**: Data processing, ML training, analysis
- Collaborative filtering, content-based analysis
- Audio feature extraction via Spotify API
- Dataset processing in `scripts/` and `ml_datasets/`

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **Deployment**: DigitalOcean App Platform, Nginx reverse proxy, SSL/HTTPS
- **MCP Servers**: 10+ Model Context Protocol servers for enhanced Copilot capabilities
- **CI/CD**: GitHub Actions with security scanning, build tests, CodeQL

## Project Structure

```
.
├── .github/
│   ├── agents/              # Custom AI agent definitions (13 specialized agents)
│   ├── copilot/             # Copilot MCP configuration (mcp.json)
│   └── workflows/           # CI/CD workflows
├── .agent/                  # Agent toolkit (skills, rules, workflows)
├── .gemini/                 # Gemini IDE configuration
├── .context/                # Coding context and style guides
├── src/                     # Frontend JavaScript modules & React components
├── static/                  # Static assets (CSS, images)
├── scripts/                 # Python automation and data processing
├── mcp-server/              # Enhanced MCP automation ecosystem
├── mcp-servers/             # Community MCP server integrations
├── ml_datasets/             # Machine learning datasets
├── data/                    # Spotify CSV data and processed files
├── config/                  # Application configuration
├── docs/                    # Comprehensive documentation
├── nginx/                   # Nginx configuration for production
├── tests/                   # Test suite (Jest + pytest)
├── package.json             # Node.js dependencies
├── requirements.txt         # Python dependencies
└── README.md                # Project documentation
```

## Custom AI Agents

This repository includes **13 specialized agents** for different development tasks:

1. **jules** ⭐ - Code quality, collaboration, refactoring
2. **rapid-implementer** - Fast, autonomous end-to-end code implementation
3. **architect** - System architecture and design decisions
4. **debug-detective** - Advanced debugging and root cause analysis
5. **deep-research** - Comprehensive research and analysis (flagship agent)
6. **full-stack-developer** - Complete web application development
7. **repo-optimizer** - Repository setup and tooling improvements
8. **testing-stability-expert** - Testing and quality validation
9. **performance-optimizer** - Performance profiling and optimization
10. **code-reviewer** - Security and quality code reviews
11. **docs-master** - Documentation creation and verification
12. **api-developer** - API design and implementation
13. **devops-infrastructure** - Docker, CI/CD, DigitalOcean deployment

**Usage**: `@agent:rapid-implementer Implement Spotify playlist recommendation feature with collaborative filtering`

## MCP Servers Available

### Core Development (Always Active)
- `filesystem`: File operations and batch read/write
- `git`: Version control operations
- `github`: GitHub integration (issues, PRs, code search, workflow runs)
- `memory`: Context persistence across sessions
- `sequential-thinking`: Enhanced multi-step reasoning

### Data & Storage
- `mongodb`: MongoDB queries, collections, and aggregations (requires `MONGODB_URI`)
- `postgres`: PostgreSQL / Prisma database queries (requires `POSTGRES_URL`)
- `sqlite`: SQLite local database queries

### Web & Automation
- `playwright`: Advanced cross-browser automation with accessibility-tree interactions (Spotify Web Player, UI testing)
- `fetch`: HTTP requests to external APIs
- `brave-search`: Web search for research and documentation lookup (requires `BRAVE_API_KEY`)

### Infrastructure & Utilities
- `docker`: Container management
- `time`: Time and timezone operations

> **Setup**: Credential-based servers (mongodb, postgres, brave-search) activate automatically when the corresponding environment variable is set. See `.github/copilot/OPTIONAL_SERVERS.md` for setup instructions.

## Development Guidelines

### Code Style & Conventions

#### JavaScript/Node.js
- **Style**: ESLint + Prettier (configured in `.prettierrc`)
- **Async/Await**: Use async/await for all I/O operations (no callbacks)
- **Error Handling**: Try/catch with proper logging (Winston logger)
- **Imports**: CommonJS (`require`) for Node.js backend
- **Logging**: Use existing logger utility (`require('../utils/logger')`)

**Express Route Pattern:**
```javascript
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

// GET /api/v1/recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const { limit = 20, seed_tracks } = req.query;
    const userId = req.user.id;

    const recommendations = await recommendationService.get(userId, {
      limit: parseInt(limit),
      seedTracks: seed_tracks?.split(',')
    });

    res.json({ success: true, data: recommendations });
  } catch (error) {
    logger.error('Recommendation error:', { userId: req.user?.id, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate recommendations' });
  }
});

module.exports = router;
```

#### Python (Scripts/ML)
- **Style**: Follow PEP 8
- **Type Hints**: Mandatory for all function signatures
- **Docstrings**: Google-style docstrings for all public functions/classes
- **Async**: Use async/await for I/O operations
- **Error Handling**: Specific exception types with proper logging

**Python ML Pattern:**
```python
import logging
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

def get_spotify_recommendations(
    user_id: str,
    seed_tracks: List[str],
    target_features: Optional[Dict[str, float]] = None,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """Get personalized Spotify recommendations.

    Args:
        user_id: Spotify user ID
        seed_tracks: List of seed track IDs (max 5)
        target_features: Optional target audio features
        limit: Number of recommendations to return

    Returns:
        List of recommended track dictionaries

    Raises:
        ValueError: If seed_tracks is empty or limit is invalid
        SpotifyAPIError: If Spotify API call fails
    """
    if not seed_tracks:
        raise ValueError("seed_tracks cannot be empty")
    if not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100")

    try:
        # Implementation
        ...
    except Exception as e:
        logger.error(f"Failed to get recommendations for user {user_id}: {e}")
        raise
```

### API Design
- RESTful conventions at `/api/v1/`
- Consistent error responses: `{ success: false, error: 'message' }`
- Consistent success responses: `{ success: true, data: {...} }`
- Authentication via JWT Bearer tokens
- Spotify OAuth 2.0 (Authorization Code Flow with PKCE)

### Database Patterns

#### MongoDB (Primary)
```javascript
const mongoose = require('mongoose');

const ListeningHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  trackId: { type: String, required: true },
  playedAt: { type: Date, default: Date.now },
  audioFeatures: {
    danceability: Number,
    energy: Number,
    valence: Number,
    tempo: Number
  }
}, { timestamps: true });

// Compound index for efficient queries
ListeningHistorySchema.index({ userId: 1, playedAt: -1 });
```

### Testing Standards

#### Jest (JavaScript)
```javascript
const RecommendationService = require('../../src/services/RecommendationService');

describe('RecommendationService', () => {
  let service;
  const mockDb = { getUserHistory: jest.fn() };
  const mockSpotify = { getRecommendations: jest.fn() };

  beforeEach(() => {
    service = new RecommendationService({ db: mockDb, spotify: mockSpotify });
    jest.clearAllMocks();
  });

  test('returns personalized recommendations', async () => {
    mockDb.getUserHistory.mockResolvedValue(mockHistory);
    mockSpotify.getRecommendations.mockResolvedValue(mockTracks);

    const result = await service.getRecommendations('user123', { limit: 10 });

    expect(result).toHaveLength(10);
    expect(result[0]).toHaveProperty('trackId');
  });
});
```

#### pytest (Python)
```python
import pytest
from scripts.ml.collaborative_filter import CollaborativeFilter

def test_collaborative_filtering_recommendations(mock_listening_matrix):
    """Test collaborative filtering returns valid recommendations."""
    cf = CollaborativeFilter(n_recommendations=10)
    cf.fit(mock_listening_matrix)

    recommendations = cf.predict(user_id='user123')

    assert len(recommendations) == 10
    assert all(isinstance(r, str) for r in recommendations)
```

## Spotify Integration

### Key Patterns
```javascript
// Spotify Web API service pattern
class SpotifyService {
  async getUserTopTracks(userId, timeRange = 'medium_term') {
    const token = await this.getValidToken(userId);
    return this.client.getMyTopTracks({ time_range: timeRange, limit: 50 }, token);
  }

  async getAudioFeatures(trackIds) {
    // Cache in Redis, expire after 24h
    const cached = await redis.get(`features:${trackIds.join(',')}`);
    if (cached) return JSON.parse(cached);

    const features = await this.client.getAudioFeaturesForTracks(trackIds);
    await redis.setEx(`features:${trackIds.join(',')}`, 86400, JSON.stringify(features));
    return features;
  }
}
```

### OAuth Flow
- Authorization Code Flow with PKCE
- Token storage in MongoDB (encrypted with `ENCRYPTION_KEY`)
- Automatic token refresh via middleware

## CI/CD

### GitHub Actions Workflows

**CI** (`.github/workflows/ci.yml`):
- Triggered on: Push to main, Pull Requests
- Steps: Install deps → Lint → Test → Build

**Security Scan** (`.github/workflows/security-scan.yml`):
- npm audit, pip safety check
- CodeQL static analysis

**Running Locally:**
```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Run JavaScript tests
npm test

# Run Python tests
pytest tests/

# Lint
npm run lint
```

## Monitoring & Debugging

### Health Checks
```bash
# API health check
curl http://localhost:3000/health

# Check Spotify token status
curl -H "Authorization: Bearer <JWT>" http://localhost:3000/api/v1/auth/status
```

### Common Issues
1. **Spotify token expired**: Token refresh happens automatically via middleware
2. **MongoDB connection**: Verify `MONGODB_URI` in `.env`
3. **Rate limits**: Spotify API rate limits apply; retry with exponential backoff
4. **MCP server issues**: Check `.github/copilot/OPTIONAL_SERVERS.md` for required env vars; run `npx -y <package>` manually to verify the package installs correctly

## Documentation

- **README.md**: Main project documentation
- **docs/ARCHITECTURE.md**: System architecture
- **docs/DEVELOPMENT.md**: Development setup guide
- **.github/agents/README.md**: Agent quick reference
- **.github/copilot/mcp.json**: MCP server configuration

## Important Notes

1. **Never commit secrets** - Use `.env` with environment variables
2. **Spotify credentials** - Store in `.env`, never hardcode
3. **Rate limiting** - Respect Spotify API limits (handle 429 errors)
4. **MongoDB indexes** - Always add indexes for queried fields
5. **Redis caching** - Cache expensive Spotify API calls (TTL: 1h-24h)
6. **Use appropriate agents** for specialized tasks
7. **Test with mock Spotify data** in unit tests
8. **Follow async/await patterns** throughout the codebase

## Pull Request Guidelines

When creating or reviewing PRs:

1. **Before Submitting:**
   ```bash
   npm test           # Run JavaScript tests
   pytest tests/      # Run Python tests
   npm run lint       # Lint check
   npm audit          # Security audit
   ```

2. **PR Description Should Include:**
   - Summary of changes
   - Related issue numbers
   - Testing performed
   - Breaking changes (if any)
   - Screenshots for UI changes

3. **Code Review Checklist:**
   - [ ] Code follows style guidelines
   - [ ] Tests pass locally
   - [ ] New tests added for new features
   - [ ] Documentation updated
   - [ ] No secrets in code
   - [ ] Error handling is appropriate
   - [ ] Spotify API rate limits handled
   - [ ] MongoDB queries are efficient (indexes)

## Getting Help

- **Agent Docs**: `.github/agents/README.md`
- **MCP Config**: `.github/copilot/mcp.json`
- **Workflow Guides**: `.github/agents/CODING_WORKFLOW.md`
- **Architecture**: `docs/ARCHITECTURE.md`

---

**When in doubt**: Use the specialized agents! They have deep knowledge of their domains and can guide you effectively.

**For Spotify-specific tasks**: The `api-developer` knows REST API patterns, `debug-detective` can trace OAuth issues, and `full-stack-developer` can implement end-to-end music features.
