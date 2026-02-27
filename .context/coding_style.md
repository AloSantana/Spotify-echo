# EchoTune AI Coding Standards & Best Practices

## JavaScript/Node.js Architecture

### 1. Service Layer Isolation
All business logic goes in services. Routes only handle HTTP concerns.

```javascript
// ✅ CORRECT: Thin route, fat service
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const result = await recommendationService.get(req.user.id, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

// ❌ WRONG: Business logic in route
router.get('/recommendations', authenticate, async (req, res) => {
  const history = await ListeningHistory.find({ userId: req.user.id });
  const features = await Promise.all(history.map(t => spotify.getFeatures(t.id)));
  // ... 50 more lines of business logic
});
```

### 2. Error Handling Standard
```javascript
// Always use try/catch with specific error types
try {
  // ...
} catch (error) {
  if (error.status === 429) {
    // Spotify rate limit
    logger.warn('Spotify rate limit hit, retrying...');
    // handle retry
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired
    return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
  } else {
    logger.error('Unexpected error:', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
```

### 3. MongoDB Best Practices
```javascript
// Always use .lean() for read-only queries
const history = await ListeningHistory
  .find({ userId })
  .select('trackId playedAt -_id')
  .sort({ playedAt: -1 })
  .limit(100)
  .lean(); // Returns plain JS objects, ~3x faster

// Always add indexes for queried fields
ListeningHistorySchema.index({ userId: 1, playedAt: -1 }); // Compound index

// Use projection to avoid fetching unnecessary data
const user = await User.findById(userId).select('spotifyTokens preferences -password');
```

### 4. Spotify API Patterns
```javascript
// Always check token validity before Spotify calls
async function withSpotifyToken(userId, fn) {
  const token = await getValidToken(userId); // Handles refresh automatically
  return fn(token);
}

// Always handle 429 rate limits
async function spotifyRequest(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429) {
        const delay = (err.headers?.['retry-after'] ?? Math.pow(2, attempt)) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Spotify API request failed after retries');
}

// Always cache Spotify API calls
async function getCachedSpotifyData(key, fetcher, ttl = 3600) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setEx(key, ttl, JSON.stringify(data));
  return data;
}
```

## Python Standards

### 1. Type Hints (Mandatory)
```python
from typing import List, Optional, Dict, Any

def compute_user_taste_profile(
    listening_history: List[Dict[str, Any]],
    audio_features: Dict[str, Dict[str, float]],
    n_top_genres: int = 5
) -> Dict[str, Any]:
    """Compute user taste profile from listening history.

    Args:
        listening_history: List of { trackId, playedAt, count }
        audio_features: Map of trackId → Spotify audio features
        n_top_genres: Number of top genres to include

    Returns:
        User taste profile with audio preferences and genre distribution
    """
```

### 2. Google-Style Docstrings (Required)
Every public function and class must have a docstring with `Args:`, `Returns:`, and `Raises:` sections.

### 3. Stateless ML Functions
```python
# ✅ Stateless: pass context as arguments
def recommend_tracks(user_id: str, listening_matrix: np.ndarray) -> List[str]:
    ...

# ❌ Stateful: uses global state
user_matrix = load_matrix()
def recommend_tracks(user_id: str) -> List[str]:
    return cf_model.predict(user_matrix[user_id])
```

## Naming Conventions

### JavaScript
- **Files**: `camelCase.js` for modules, `PascalCase.js` for classes/models
- **Functions**: `camelCase` (async functions should use verb-noun: `getRecommendations`, `createPlaylist`)
- **Constants**: `UPPER_SNAKE_CASE`
- **Routes**: `/api/v1/kebab-case`

### Python
- **Files**: `snake_case.py`
- **Functions**: `snake_case` with verb-noun: `get_recommendations`, `compute_profile`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

## Testing Standards

### JavaScript (Jest)
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- Always mock external services (Spotify, MongoDB, Redis)
- Test file names: `*.test.js`

### Python (pytest)
- Tests in `tests/`
- Use pytest fixtures for shared state
- Test file names: `test_*.py`

## Security Rules (Non-Negotiable)

1. **Never** hardcode credentials
2. **Always** validate userId from JWT (never from request body/query)
3. **Never** log sensitive data (tokens, passwords)
4. **Always** use parameterized queries in any SQL (SQLite fallback)
5. **Always** sanitize user inputs before MongoDB queries
