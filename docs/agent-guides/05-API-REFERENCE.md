# 05 — API Reference

> **Quick Reference:** Every HTTP endpoint, Socket.IO event, error format, and rate limiting
> policy. Each endpoint entry follows a consistent structure: method, path, auth requirement,
> request body/params, and response schema with example. Use alongside Swagger UI at `/api/docs`.

---

## 1. Conventions

### Base URLs
```
Development:  http://localhost:3000
Production:   https://<app>.ondigitalocean.app
```

### Authentication
All protected endpoints require a JWT Bearer token obtained from the auth flow:
```
Authorization: Bearer <jwt-token>
```

JWT payload: `{ userId: string, spotifyId: string, iat: number, exp: number }`

### Standard Response Envelope
```json
// Success
{ "success": true, "data": <payload>, "meta": { "total": 0, "limit": 0, "offset": 0 } }

// Error
{ "success": false, "error": "Human-readable message", "code": "ERROR_CODE", "details": {} }
```

### Rate Limits
| Endpoint group | Window | Max requests | Response on exceeded |
|---|---|---|---|
| Global (all routes) | 15 min | 100 per IP | `429 Too Many Requests` |
| `/auth/*` | 15 min | 5 per IP | `429` |
| `/api/chat/*` | 15 min | 50 per IP | `429` |
| `/api/recommendations` | 15 min | 30 per IP | `429` |
| `/api/spotify/*` | 15 min | 60 per IP | `429` |

---

## 2. Health Endpoints

### GET /api/health
Returns system health status. No authentication required.

```
Auth: none
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "mongodb": { "status": "connected", "latencyMs": 12 },
    "redis": { "status": "connected", "latencyMs": 3 },
    "spotify": { "status": "available" }
  },
  "environment": "production"
}
```

**Error Response (degraded):**
```json
{ "success": false, "status": "degraded", "services": { "mongodb": { "status": "disconnected" } } }
```

---

## 3. Authentication Endpoints

### GET /auth/login
Initiates Spotify OAuth 2.0 PKCE flow. Returns the authorization URL.

```
Auth: none
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `force` | boolean | No | Force Spotify login dialog even if already logged in |

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.spotify.com/authorize?client_id=...&code_challenge=...&state=uuid",
  "state": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Redirect user to authUrl to start authentication"
}
```

---

### GET /auth/callback
OAuth callback endpoint. Called by Spotify after user grants permission.

```
Auth: none
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Authorization code from Spotify |
| `state` | string | Yes | State parameter (CSRF validation) |
| `error` | string | No | Present if user denied access (`access_denied`) |

**Success Response (redirects to frontend with token):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "665a1b2c3d4e5f6a7b8c9d0e",
    "spotifyId": "31xxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "displayName": "Alex Rivera",
    "email": "user@example.com",
    "premium": true
  }
}
```

**Error Responses:**
| Code | Scenario |
|---|---|
| `400` | Missing `code` or `state` parameter |
| `400 + code: OAUTH_DENIED` | User clicked "Cancel" on Spotify |
| `400 + code: STATE_MISMATCH` | Possible CSRF attack |
| `500` | Token exchange with Spotify failed |

---

### POST /auth/refresh
Refreshes the Spotify access token using the stored refresh token.

```
Auth: Bearer JWT required
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "expiresIn": 3600
}
```

---

### POST /auth/logout
Clears the user session.

```
Auth: Bearer JWT required
```

**Response:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

## 4. Chat Endpoints

### POST /api/chat/start
Creates a new chat session.

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{
  "provider": "gemini",       // optional — defaults to user preference
  "model": "gemini-1.5-flash" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440001",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

---

### POST /api/chat/message
Send a message in an existing chat session.

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{
  "message": "play some energetic rock",
  "sessionId": "550e8400-e29b-41d4-a716-446655440001",
  "provider": "gemini"        // optional override
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Playing energetic rock! I've queued 'Back in Black' by AC/DC. 🎸",
    "sessionId": "550e8400-e29b-41d4-a716-446655440001",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "responseMs": 842,
    "spotifyAction": {
      "type": "play",
      "trackId": "4iV5W9uYEdYUVa79Axb7Rh",
      "trackName": "Back in Black",
      "artist": "AC/DC"
    },
    "intent": "play"
  }
}
```

**Error Responses:**
| Code | Scenario |
|---|---|
| `401` | JWT missing or expired |
| `400 + code: MISSING_SESSION` | `sessionId` not provided |
| `429` | Chat rate limit exceeded |
| `503 + code: ALL_PROVIDERS_DOWN` | All LLM providers unavailable |

---

### GET /api/chat/history
Get conversation history for a session.

```
Auth: Bearer JWT required
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `sessionId` | string | — | Required. Session to retrieve |
| `limit` | integer | 50 | Max messages to return |

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-...",
    "messages": [
      { "role": "user", "content": "play rock", "timestamp": "2024-01-15T14:30:00Z" },
      { "role": "assistant", "content": "Playing Back in Black!", "timestamp": "2024-01-15T14:30:01Z" }
    ],
    "messageCount": 2
  }
}
```

---

## 5. Spotify Playback Endpoints

### GET /api/spotify/playback
Get current playback state.

```
Auth: Bearer JWT required
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isPlaying": true,
    "track": {
      "id": "4iV5W9uYEdYUVa79Axb7Rh",
      "name": "Back in Black",
      "artists": [{ "id": "711MCceyCBcFnzjGY4Q7Un", "name": "AC/DC" }],
      "album": {
        "name": "Back in Black",
        "images": [{ "url": "https://i.scdn.co/image/...", "width": 640, "height": 640 }]
      },
      "durationMs": 255493,
      "previewUrl": "https://p.scdn.co/mp3-preview/..."
    },
    "progressMs": 45000,
    "device": {
      "id": "abc123",
      "name": "MacBook Pro",
      "type": "Computer",
      "volumePercent": 65
    },
    "shuffleState": false,
    "repeatState": "off"
  }
}
```

---

### POST /api/spotify/play
Start or resume playback.

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{
  "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",  // optional — specific track
  "deviceId": "abc123",                               // optional — specific device
  "positionMs": 0                                     // optional — start position
}
```

**Response:**
```json
{ "success": true, "data": { "message": "Playback started" } }
```

---

### POST /api/spotify/pause
Pause playback.

```
Auth: Bearer JWT required
Body: {} (empty)
```

**Response:**
```json
{ "success": true, "data": { "message": "Playback paused" } }
```

---

### POST /api/spotify/skip
Skip to next track.

```
Auth: Bearer JWT required
Body: {} (empty)
```

**Response:**
```json
{ "success": true, "data": { "message": "Skipped to next track" } }
```

---

### POST /api/spotify/previous
Go to previous track.

```
Auth: Bearer JWT required
Body: {} (empty)
```

**Response:**
```json
{ "success": true, "data": { "message": "Playing previous track" } }
```

---

### POST /api/spotify/volume
Set playback volume.

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{ "volume": 75 }  // integer 0–100
```

**Response:**
```json
{ "success": true, "data": { "message": "Volume set to 75%" } }
```

---

### POST /api/spotify/shuffle
Set shuffle state.

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{ "state": true }  // boolean
```

**Response:**
```json
{ "success": true, "data": { "message": "Shuffle enabled" } }
```

---

### POST /api/spotify/repeat
Set repeat mode.

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{ "state": "track" }  // "track" | "context" | "off"
```

**Response:**
```json
{ "success": true, "data": { "message": "Repeat set to track" } }
```

---

### GET /api/spotify/search
Search for tracks, artists, or albums.

```
Auth: Bearer JWT required
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Required. Search query |
| `type` | string | `track` | `track` \| `artist` \| `album` \| `playlist` |
| `limit` | integer | 10 | Results count (1–50) |
| `offset` | integer | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": {
    "tracks": [
      {
        "id": "4iV5W9uYEdYUVa79Axb7Rh",
        "name": "Back in Black",
        "artists": [{ "id": "711MCceyCBcFnzjGY4Q7Un", "name": "AC/DC" }],
        "album": { "name": "Back in Black", "images": [...] },
        "durationMs": 255493,
        "popularity": 82,
        "previewUrl": "https://..."
      }
    ]
  },
  "meta": { "total": 1, "limit": 10, "offset": 0 }
}
```

---

### GET /api/spotify/devices
List available Spotify devices.

```
Auth: Bearer JWT required
```

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      { "id": "abc123", "name": "MacBook Pro", "type": "Computer", "isActive": true, "volumePercent": 65 },
      { "id": "def456", "name": "iPhone", "type": "Smartphone", "isActive": false, "volumePercent": 80 }
    ]
  }
}
```

---

## 6. Recommendation Endpoints

### GET /api/recommendations
Get personalized recommendations.

```
Auth: Bearer JWT required
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `strategy` | string | `hybrid` | `hybrid` \| `collaborative` \| `content` \| `semantic` |
| `limit` | integer | 20 | Number of recommendations (1–50) |
| `offset` | integer | 0 | Pagination |
| `seed_tracks` | string | — | Comma-separated Spotify track IDs |
| `target_energy` | float | — | Target energy 0–1 |
| `target_valence` | float | — | Target valence 0–1 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "trackId": "4iV5W9uYEdYUVa79Axb7Rh",
      "name": "Back in Black",
      "artist": "AC/DC",
      "album": "Back in Black",
      "artworkUrl": "https://i.scdn.co/image/...",
      "score": 0.94,
      "strategy": "hybrid",
      "reason": "Matches your high-energy rock preference",
      "audioFeatures": { "energy": 0.96, "valence": 0.54, "danceability": 0.49 }
    }
  ],
  "meta": { "total": 20, "limit": 20, "strategy": "hybrid", "cached": false }
}
```

---

### POST /api/recommendations/feedback
Submit feedback on a recommendation (like/dislike/save).

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{
  "trackId": "4iV5W9uYEdYUVa79Axb7Rh",
  "action": "like",         // "like" | "dislike" | "save"
  "recommendationId": "665c..."  // optional — MongoDB recommendation _id
}
```

**Response:**
```json
{ "success": true, "data": { "message": "Feedback recorded" } }
```

---

## 7. Playlist Endpoints

### POST /api/playlists/generate
Generate an AI playlist from a natural language prompt.

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:**
```json
{
  "prompt": "energetic workout playlist with rock and electronic music",
  "trackCount": 20,          // optional, default: 20
  "public": false            // optional, default: false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playlistId": "665d...",
    "spotifyPlaylistId": "37i9dQZF1DX4rfAQfAp5iu",
    "name": "Peak Performance Mix",
    "description": "High-energy rock and electronic for your workout",
    "spotifyUrl": "https://open.spotify.com/playlist/37i9dQZF1DX4rfAQfAp5iu",
    "trackCount": 20,
    "tracks": [...]
  }
}
```

---

### GET /api/playlists
List user's playlists.

```
Auth: Bearer JWT required
```

**Query Parameters:** `limit` (default 20), `offset` (default 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "playlistId": "665d...",
      "name": "Peak Performance Mix",
      "trackCount": 20,
      "playlist_type": "generated",
      "createdAt": "2024-01-15T14:30:00Z"
    }
  ],
  "meta": { "total": 5, "limit": 20 }
}
```

---

## 8. User Settings Endpoints

### GET /api/user/settings
Get current user preferences.

```
Auth: Bearer JWT required
```

**Response:**
```json
{
  "success": true,
  "data": {
    "llmProvider": "gemini",
    "llmModel": "gemini-1.5-flash",
    "favoriteGenres": ["rock", "electronic"],
    "energyLevel": 0.75,
    "explicitContent": true,
    "recommendationStrategy": "hybrid",
    "theme": "dark"
  }
}
```

---

### PATCH /api/user/settings
Update user preferences (partial update supported).

```
Auth: Bearer JWT required
Body: application/json
```

**Request Body:** (any subset of settings fields)
```json
{
  "llmProvider": "openai",
  "favoriteGenres": ["jazz", "soul"],
  "energyLevel": 0.4
}
```

**Response:**
```json
{ "success": true, "data": { "updated": true } }
```

---

## 9. LLM Provider Endpoints

### GET /api/llm/providers
Get list of configured LLM providers with health status.

```
Auth: none
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "gemini",
        "name": "Google Gemini",
        "status": "healthy",        // "healthy" | "degraded" | "down"
        "circuitState": "CLOSED",   // "CLOSED" | "OPEN" | "HALF_OPEN"
        "latencyMs": 842,
        "models": ["gemini-1.5-flash", "gemini-1.5-pro"],
        "isConfigured": true
      },
      {
        "id": "mock",
        "name": "Demo Mode",
        "status": "healthy",
        "circuitState": "CLOSED",
        "latencyMs": 1,
        "models": ["mock-v1"],
        "isConfigured": true
      }
    ],
    "activeProvider": "gemini",
    "fallbackChain": ["gemini", "openai", "mock"]
  }
}
```

---

## 10. Analytics Endpoints

### GET /api/analytics/top-artists
Get user's top artists by play count.

```
Auth: Bearer JWT required
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | string | `30d` | `7d` \| `30d` \| `90d` \| `all` |
| `limit` | integer | 5 | Number of artists (1–20) |

**Response:**
```json
{
  "success": true,
  "data": [
    { "artistName": "AC/DC", "playCount": 47, "percentage": 23.5 },
    { "artistName": "Metallica", "playCount": 38, "percentage": 19.0 }
  ]
}
```

---

### GET /api/analytics/listening-time
Get total listening time statistics.

```
Auth: Bearer JWT required
```

**Response:**
```json
{
  "success": true,
  "data": {
    "last7Days": { "totalMs": 18432000, "sessions": 12 },
    "last30Days": { "totalMs": 72900000, "sessions": 48 },
    "allTime": { "totalMs": 435600000, "sessions": 287 }
  }
}
```

---

## 11. Socket.IO Events

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: jwtToken }  // JWT in socket auth
});
```

### Server → Client Events

#### `now_playing`
Emitted when the currently playing track changes.
```json
{
  "event": "now_playing",
  "data": {
    "isPlaying": true,
    "trackId": "4iV5W9uYEdYUVa79Axb7Rh",
    "trackName": "Back in Black",
    "artistName": "AC/DC",
    "albumName": "Back in Black",
    "artworkUrl": "https://i.scdn.co/image/...",
    "progressMs": 45000,
    "durationMs": 255493,
    "deviceName": "MacBook Pro"
  }
}
```

#### `recommendation_update`
Emitted when new recommendations are ready.
```json
{
  "event": "recommendation_update",
  "data": {
    "strategy": "hybrid",
    "tracks": [...],
    "generatedAt": "2024-01-15T14:30:00Z"
  }
}
```

#### `provider_health`
Emitted when an LLM provider's circuit breaker state changes.
```json
{
  "event": "provider_health",
  "data": {
    "provider": "gemini",
    "previousState": "CLOSED",
    "newState": "OPEN",
    "reason": "5 failures in 60 seconds"
  }
}
```

#### `queue_update`
Emitted when the playback queue changes.
```json
{
  "event": "queue_update",
  "data": {
    "queue": [
      { "trackId": "...", "trackName": "...", "artistName": "..." }
    ]
  }
}
```

### Client → Server Events

#### `subscribe_now_playing`
Subscribe to now-playing updates for the current user.
```javascript
socket.emit('subscribe_now_playing', { userId: 'user123' });
```

#### `request_recommendations`
Request fresh recommendations.
```javascript
socket.emit('request_recommendations', {
  strategy: 'hybrid',
  limit: 20
});
```

#### `playback_command`
Send a playback command via Socket.IO (alternative to REST).
```javascript
socket.emit('playback_command', {
  type: 'skip'  // 'play' | 'pause' | 'skip' | 'previous' | 'volume'
});
```

---

## 12. Error Code Reference

| Code | HTTP Status | Description |
|---|---|---|
| `MISSING_TOKEN` | 401 | No Authorization header |
| `INVALID_TOKEN` | 401 | JWT malformed or expired |
| `SPOTIFY_AUTH_REQUIRED` | 401 | Spotify tokens not present |
| `SPOTIFY_TOKEN_EXPIRED` | 401 | Spotify access token expired (retry after refresh) |
| `STATE_MISMATCH` | 400 | OAuth state param doesn't match |
| `OAUTH_DENIED` | 400 | User denied Spotify permission |
| `MISSING_SESSION` | 400 | Chat sessionId required |
| `PROVIDER_UNAVAILABLE` | 503 | Specific LLM provider down |
| `ALL_PROVIDERS_DOWN` | 503 | All LLM providers unavailable |
| `RATE_LIMITED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Request body/query failed validation |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 13. Swagger / OpenAPI

Interactive API documentation available at:
```
http://localhost:3000/api/docs
```

The OpenAPI specification is also available as YAML:
```
GET /api/docs/swagger.json
```

Full spec: `docs/openapi.yaml`

---

## Cross-References

- Auth flow detail → `06-SPOTIFY-INTEGRATION.md`
- LLM provider architecture → `07-AI-LLM-INTEGRATION.md`
- Recommendation engine → `08-RECOMMENDATION-ENGINE.md`
- Frontend API call patterns → `09-FRONTEND-GUIDE.md`
