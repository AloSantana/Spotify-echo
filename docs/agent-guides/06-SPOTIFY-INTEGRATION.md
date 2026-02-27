# 06 — Spotify Integration

> **Quick Reference:** Spotify OAuth 2.0 PKCE flow step-by-step, all required scopes,
> token storage in MongoDB, token refresh middleware, Web API wrapper patterns, command
> parser implementation, all 13 audio features, and playback controller code examples.

---

## 1. OAuth 2.0 PKCE Flow — Step by Step

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks.
EchoTune uses it because the client secret cannot be safely stored in a browser.

### Why PKCE?
```
Traditional flow risk:
  Browser → Spotify (authorization_code) → Browser
  If code is intercepted → attacker exchanges it for tokens

PKCE mitigation:
  1. App generates code_verifier (random secret, 43–128 chars)
  2. App generates code_challenge = base64url(SHA256(code_verifier))
  3. code_challenge sent to Spotify (harmless if intercepted)
  4. code_verifier only revealed during token exchange (on your server)
  5. Spotify verifies: SHA256(code_verifier) === code_challenge ✓
```

### Complete Flow Implementation

**Step 1: Generate PKCE Parameters**
```javascript
// src/auth/auth-service.js
const crypto = require('crypto');

function generateCodeVerifier() {
  // 43–128 random bytes, base64url encoded
  return crypto.randomBytes(64).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  // S256 method: base64url(SHA256(codeVerifier))
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
}

function generateAuthUrl(options = {}) {
  const state = require('uuid').v4();          // CSRF token
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store state + codeVerifier in Redis (TTL 10 min)
  this.redisManager.setEx(
    `oauth:state:${state}`,
    600,
    JSON.stringify({ codeVerifier, timestamp: Date.now(), ip: options.ip })
  );

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state,
    scope: SPOTIFY_SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    ...(options.forceDialog && { show_dialog: 'true' }),
  });

  return {
    authUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
    state,
  };
}
```

**Step 2: Handle OAuth Callback**
```javascript
// src/auth/auth-service.js
async function handleCallback(code, state, options = {}) {
  // 1. Validate state (CSRF check)
  const storedData = await this.redisManager.get(`oauth:state:${state}`);
  if (!storedData) {
    throw new Error('STATE_MISMATCH: OAuth state not found or expired');
  }
  const { codeVerifier } = JSON.parse(storedData);
  await this.redisManager.del(`oauth:state:${state}`); // one-time use

  // 2. Exchange code for tokens
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json();
    throw new Error(`Token exchange failed: ${err.error_description}`);
  }

  const { access_token, refresh_token, expires_in } = await tokenResponse.json();

  // 3. Fetch Spotify user profile
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = await profileRes.json();

  // 4. Upsert user in MongoDB
  const db = this.mongoManager.getCollection('echotune_users');
  const user = await db.findOneAndUpdate(
    { spotifyId: profile.id },
    {
      $set: {
        spotifyId: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        profileImageUrl: profile.images?.[0]?.url,
        country: profile.country,
        premium: profile.product === 'premium',
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        updatedAt: new Date(),
        lastActive: new Date(),
      },
      $setOnInsert: { createdAt: new Date(), tier: 'free', isActive: true },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 5. Issue JWT
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId: user._id.toString(), spotifyId: user.spotifyId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token, user };
}
```

---

## 2. Required Spotify Scopes

| Scope | Reason Required |
|---|---|
| `user-read-private` | Access user profile (display name, country, premium status) |
| `user-read-email` | Store email for user identification |
| `playlist-modify-public` | Create/modify public playlists |
| `playlist-modify-private` | Create/modify private playlists (AI generation) |
| `user-read-recently-played` | Seed listening history for collaborative filtering |
| `user-top-read` | Bootstrap cold-start recommendations from Spotify's top tracks |
| `user-library-read` | Read saved/liked tracks |
| `user-library-modify` | Save recommended tracks to library |
| `user-read-playback-state` | Get current playback state (now playing) |
| `user-modify-playback-state` | Control playback (play/pause/skip/volume) |
| `streaming` | Spotify Web Playback SDK (browser-based player) |

```javascript
// src/auth/auth-service.js
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
  'user-read-playback-state',
  'user-modify-playback-state',
  'streaming',
];
```

---

## 3. Token Storage in MongoDB

Tokens are stored directly in `echotune_users`. For production, consider encrypting the
`refreshToken` field at the application level before storing.

```javascript
// Token fields in echotune_users document
{
  accessToken: "BQA...",              // short-lived (~1 hour)
  refreshToken: "AQD...",             // long-lived (until revoked)
  tokenExpiresAt: ISODate("2024-01-15T15:30:00Z")
}
```

> **Security Note:** Never log tokens. Never return `accessToken` or `refreshToken` in
> API responses. The JWT is the only credential returned to the client.

---

## 4. Token Refresh Middleware

Applied before any Spotify API call. Checks if `accessToken` is expired and silently
refreshes it using the stored `refreshToken`.

```javascript
// src/auth/auth-middleware.js
async function requireSpotifyToken(req, res, next) {
  try {
    const userId = req.user.userId;
    const db = mongoManager.getCollection('echotune_users');
    const user = await db.findOne({ _id: new ObjectId(userId) });

    if (!user?.refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Spotify not connected',
        code: 'SPOTIFY_AUTH_REQUIRED',
      });
    }

    // Check if token expires within 5 minutes
    const isExpired = !user.tokenExpiresAt || 
      new Date(user.tokenExpiresAt) < new Date(Date.now() + 5 * 60 * 1000);

    if (isExpired) {
      const refreshed = await refreshSpotifyToken(user.refreshToken);
      await db.updateOne(
        { _id: user._id },
        {
          $set: {
            accessToken: refreshed.access_token,
            tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
            updatedAt: new Date(),
          },
        }
      );
      req.spotifyToken = refreshed.access_token;
    } else {
      req.spotifyToken = user.accessToken;
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function refreshSpotifyToken(refreshToken) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID,
    }).toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  return res.json();
}
```

---

## 5. Spotify API Wrapper Patterns

`SpotifyAPIService` wraps the Spotify Web API with rate limiting, retry logic, and error
normalization.

```javascript
// src/spotify/api-service.js
class SpotifyAPIService {
  constructor() {
    this.baseUrl = 'https://api.spotify.com/v1';
    this.rateLimiter = new SpotifyRateLimiter();
  }

  async request(method, path, { token, body, params } = {}) {
    await this.rateLimiter.acquire();          // Respect Spotify's rate limits
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle Spotify rate limiting (429)
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return this.request(method, path, { token, body, params }); // Retry once
    }

    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new SpotifyAPIError(response.status, err.error?.message || 'Spotify API error', path);
    }

    return response.status === 204 ? null : response.json();
  }

  // Convenience methods
  async search(query, { type = 'track', limit = 10, token } = {}) {
    return this.request('GET', '/search', {
      token,
      params: { q: query, type, limit: String(limit) },
    });
  }

  async getAudioFeatures(trackIds, token) {
    // Batch up to 100 IDs
    const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    return this.request('GET', '/audio-features', { token, params: { ids } });
  }

  async getCurrentPlayback(token) {
    return this.request('GET', '/me/player', { token });
  }

  async getRecentlyPlayed(token, limit = 50) {
    return this.request('GET', '/me/player/recently-played', {
      token,
      params: { limit: String(limit) },
    });
  }
}
```

### Rate Limiter Implementation

```javascript
// src/spotify/rate-limiter.js
class SpotifyRateLimiter {
  constructor() {
    this.queue = [];
    this.requestsPerSecond = 3;   // Conservative limit (Spotify allows ~10/s burst)
    this.interval = 1000 / this.requestsPerSecond;
    this.lastRequest = 0;
  }

  acquire() {
    return new Promise(resolve => {
      const now = Date.now();
      const wait = Math.max(0, this.lastRequest + this.interval - now);
      this.lastRequest = now + wait;
      setTimeout(resolve, wait);
    });
  }
}
```

---

## 6. Command Parser — Natural Language → Spotify Action

`SpotifyCommandParser` uses regex pattern matching to detect commands and extract parameters.

```javascript
// src/chat/spotify-command-parser.js (key method)
parse(input) {
  const normalized = input.toLowerCase().trim();
  const commandType = this.detectCommandType(normalized);
  const params = this.extractParameters(normalized, commandType);

  return {
    type: commandType,              // e.g. "play"
    originalInput: input,
    params,                         // e.g. { genre: "rock", mood: "energetic" }
    confidence: this.calculateConfidence(commandType, params),
  };
}
```

### Command → Spotify Action Mapping

| Detected command | Extracted params | Spotify API call |
|---|---|---|
| `play rock` | `{ genre: "rock" }` | Search "rock", play top result |
| `play Back in Black` | `{ query: "Back in Black" }` | Search title, play |
| `pause` | `{}` | PUT /v1/me/player/pause |
| `skip` / `next` | `{}` | POST /v1/me/player/next |
| `previous` / `back` | `{}` | POST /v1/me/player/previous |
| `volume 75` | `{ level: 75 }` | PUT /v1/me/player/volume?volume_percent=75 |
| `volume up` | `{ direction: "up", delta: 10 }` | GET current, add 10, PUT |
| `shuffle on` | `{ state: true }` | PUT /v1/me/player/shuffle?state=true |
| `repeat track` | `{ mode: "track" }` | PUT /v1/me/player/repeat?state=track |
| `play energetic workout music` | `{ mood: "energetic", activity: "workout" }` | Use recommendation engine |

---

## 7. Audio Features Reference (All 13 Features)

Spotify provides 13 audio features per track. These power content-based recommendations.

| Feature | Range | Description | Use in Recommendations |
|---|---|---|---|
| `acousticness` | 0–1 | Confidence the track is acoustic (1 = fully acoustic) | High for acoustic/folk mood |
| `danceability` | 0–1 | How suitable for dancing (rhythm, tempo stability) | High for party/dance playlists |
| `energy` | 0–1 | Intensity and activity (1 = intense, fast, loud) | Key filter for workout/chill |
| `instrumentalness` | 0–1 | Predicts absence of vocals (> 0.5 = likely instrumental) | Study/focus playlists |
| `liveness` | 0–1 | Audience presence (> 0.8 = live recording) | Filters live vs studio |
| `loudness` | −60 to 0 dB | Overall track loudness | Normalizing for mixing |
| `speechiness` | 0–1 | Spoken words (> 0.66 = pure speech, 0.33–0.66 = rap) | Exclude podcasts |
| `valence` | 0–1 | Musical positiveness (1 = happy/euphoric, 0 = sad/angry) | Mood matching |
| `tempo` | 0–250 BPM | Estimated tempo | Workout (120–160 BPM), sleep (<70 BPM) |
| `key` | −1–11 | Pitch class (0=C, 1=C#, 2=D … 11=B, -1=no key) | Harmonic mixing |
| `mode` | 0–1 | 0 = minor (sad), 1 = major (happy) | Mood alongside valence |
| `time_signature` | 3–7 | Estimated beats per bar | Usually 4; 3 = waltz |
| `duration_ms` | ms | Track duration | Filter very short/long |

### Audio Feature Vector for Recommendations

```javascript
// Content-based strategy computes Euclidean distance between feature vectors
function featureVector(audioFeatures) {
  return [
    audioFeatures.energy,
    audioFeatures.valence,
    audioFeatures.danceability,
    audioFeatures.acousticness,
    audioFeatures.instrumentalness,
    audioFeatures.speechiness,
    audioFeatures.tempo / 250,  // normalize 0–1
  ];
}

function cosineSimilarity(vec1, vec2) {
  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((s, v) => s + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((s, v) => s + v * v, 0));
  return mag1 && mag2 ? dot / (mag1 * mag2) : 0;
}
```

---

## 8. Playback Controller

Full implementation of all playback control methods:

```javascript
// src/spotify/playback-controller.js
class PlaybackController {
  constructor(apiService) {
    this.api = apiService;
  }

  async play(token, { uri, deviceId, positionMs = 0 } = {}) {
    const body = {};
    if (uri) body.uris = [uri];
    if (positionMs) body.position_ms = positionMs;
    const params = deviceId ? { device_id: deviceId } : {};
    return this.api.request('PUT', '/me/player/play', { token, body, params });
  }

  async pause(token) {
    return this.api.request('PUT', '/me/player/pause', { token });
  }

  async skip(token) {
    return this.api.request('POST', '/me/player/next', { token });
  }

  async previous(token) {
    return this.api.request('POST', '/me/player/previous', { token });
  }

  async setVolume(token, volumePercent) {
    const vol = Math.max(0, Math.min(100, Math.round(volumePercent)));
    return this.api.request('PUT', '/me/player/volume', {
      token,
      params: { volume_percent: String(vol) },
    });
  }

  async setShuffle(token, state) {
    return this.api.request('PUT', '/me/player/shuffle', {
      token,
      params: { state: String(Boolean(state)) },
    });
  }

  async setRepeat(token, state) {
    // state: "track" | "context" | "off"
    const validStates = ['track', 'context', 'off'];
    const normalized = validStates.includes(state) ? state : 'off';
    return this.api.request('PUT', '/me/player/repeat', {
      token,
      params: { state: normalized },
    });
  }

  async transferPlayback(token, deviceId, play = true) {
    return this.api.request('PUT', '/me/player', {
      token,
      body: { device_ids: [deviceId], play },
    });
  }

  async addToQueue(token, uri) {
    return this.api.request('POST', '/me/player/queue', {
      token,
      params: { uri },
    });
  }

  async getDevices(token) {
    const data = await this.api.request('GET', '/me/player/devices', { token });
    return data?.devices || [];
  }
}
```

---

## 9. Playlist Service

```javascript
// src/spotify/PlaylistService.js
class PlaylistService {
  constructor(apiService) {
    this.api = apiService;
  }

  async createPlaylist(token, userId, { name, description, isPublic = false }) {
    return this.api.request('POST', `/users/${userId}/playlists`, {
      token,
      body: { name, description, public: isPublic, collaborative: false },
    });
  }

  async addTracks(token, playlistId, trackUris) {
    // Spotify API accepts max 100 URIs per call
    const chunks = [];
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      await this.api.request('POST', `/playlists/${playlistId}/tracks`, {
        token,
        body: { uris: chunk },
      });
    }
  }

  async generateAndSave(token, spotifyUserId, prompt, tracks) {
    // 1. Create playlist in Spotify
    const name = await this.generatePlaylistName(prompt);
    const playlist = await this.createPlaylist(token, spotifyUserId, {
      name,
      description: `AI generated: ${prompt}`,
    });

    // 2. Add tracks
    const uris = tracks.map(t => `spotify:track:${t.trackId}`);
    await this.addTracks(token, playlist.id, uris);

    return { spotifyPlaylistId: playlist.id, name, spotifyUrl: playlist.external_urls.spotify };
  }
}
```

---

## 10. Spotify App Setup (Developer Dashboard)

Before any code runs, configure the Spotify app:

1. Go to https://developer.spotify.com/dashboard
2. Click "Create app"
3. Set **Redirect URIs**:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://<your-app>.ondigitalocean.app/auth/callback`
4. Enable **Web API** and **Web Playback SDK** checkboxes
5. Copy **Client ID** → `SPOTIFY_CLIENT_ID`
6. Copy **Client Secret** → `SPOTIFY_CLIENT_SECRET`

> **Agent Note:** The Redirect URI must match EXACTLY (including trailing slash) between
> the Spotify dashboard and `SPOTIFY_REDIRECT_URI` env var. Any mismatch causes a 400 error.

---

## Cross-References

- API endpoints for playback → `05-API-REFERENCE.md`
- How chat commands trigger playback → `07-AI-LLM-INTEGRATION.md`
- Recommendation engine uses audio features → `08-RECOMMENDATION-ENGINE.md`
- Deployment env vars → `10-DEPLOYMENT-GUIDE.md`
