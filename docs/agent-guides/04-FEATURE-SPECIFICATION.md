# 04 — Feature Specification

> **Quick Reference:** Every user-facing feature with user stories, acceptance criteria,
> backend implementation notes, and frontend component references. Use this document to
> verify that an implemented feature meets all requirements before marking it complete.

---

## Feature 1: Spotify Authentication & Login

### Description
Users authenticate via Spotify OAuth 2.0 with PKCE. No username/password — Spotify is the
identity provider. On success the user receives a JWT for all subsequent API calls.

### User Story
> As a new user, I want to connect my Spotify account so that EchoTune can read my listening
> history and control my playback.

### Acceptance Criteria
1. Clicking "Connect Spotify" redirects the browser to Spotify's authorization page
2. The authorization URL includes `code_challenge`, `code_challenge_method=S256`, and `state`
3. After granting access, the user is redirected back to `/auth/callback`
4. The callback validates `state` (CSRF protection) and exchanges the code for tokens
5. User profile is created or updated in `echotune_users`
6. A JWT (24h expiry) is returned and stored in the React `AuthContext`
7. All subsequent API calls include `Authorization: Bearer <JWT>`
8. Expired tokens are refreshed automatically (transparent to the user)
9. Logout clears the JWT from client and invalidates the session
10. Re-authentication works without requiring the user to re-grant Spotify permission

### Backend Implementation Notes
- Entry: `GET /auth/login` → `src/auth/auth-routes.js`
- PKCE helper: `src/auth/auth-service.js` (`generateAuthUrl`, `handleCallback`)
- Token storage: `echotune_users.accessToken`, `.refreshToken`, `.tokenExpiresAt`
- JWT: `jsonwebtoken.sign({ userId, spotifyId }, JWT_SECRET, { expiresIn: '24h' })`
- Token refresh middleware: checks `tokenExpiresAt` before every Spotify API call

### Frontend Components
- `src/frontend/components/SpotifyLoginButton.jsx` — renders "Connect Spotify" button
- `src/frontend/contexts/AuthContext.jsx` — stores JWT, exposes `user`, `login()`, `logout()`
- `src/frontend/components/AuthStatus.jsx` — shows auth state in nav bar
- `src/frontend/components/AuthGuard` (in `AuthStatus.jsx`) — wraps protected routes

---

## Feature 2: Conversational Chat Interface

### Description
A persistent chat panel where users type natural language to control music, get
recommendations, and ask questions. Responses come from the active LLM provider with
music-aware context injected into the system prompt.

### User Story
> As a user, I want to type messages like "play something chill" or "what's that song?" and
> get intelligent responses that also take action on Spotify.

### Acceptance Criteria
1. Chat input field is always visible on all screen sizes
2. Messages display with user / assistant bubbles in chronological order
3. Typing indicator shown while the LLM is responding
4. Responses reference the currently playing track when relevant
5. Commands like "play rock", "skip", "volume up" trigger actual Spotify actions
6. Conversation history persists within a session (min 20 messages of context)
7. Provider name and model shown in UI (e.g. "Gemini 1.5 Flash")
8. Error state displayed if LLM fails (with automatic retry via next provider)
9. Chat session saved to `echotune_chat_sessions` on each message
10. Session continues after page refresh (sessionId in local storage)

### Backend Implementation Notes
- Route: `POST /api/chat/message` → `src/api/routes/chat.js`
- Chatbot: `src/chat/chatbot.js` → `EchoTuneChatbot.processMessage()`
- Intent: `src/chat/intents/classifyIntent.js` detects music vs. general intent
- Prompt: `src/chat/context/buildPrompt.js` injects user profile + playback state
- Persistence: `src/services/ChatPersistenceService.js` writes to MongoDB

### Frontend Components
- `src/frontend/components/EnhancedChatInterface.jsx` — primary chat UI
- `src/frontend/components/ChatInput.jsx` — message input + send button
- `src/frontend/components/ChatFirstInterface.jsx` — full-screen chat layout
- `src/frontend/contexts/LLMContext.jsx` — tracks active provider + model

---

## Feature 3: Spotify Command Execution

### Description
Natural language phrases map to direct Spotify API actions. Commands are parsed from
chat messages or sent directly to a dedicated endpoint.

### User Story
> As a user, I want to say "play energetic rock", "skip this", "turn it up", or "shuffle on"
> and have EchoTune execute the corresponding Spotify action immediately.

### Acceptance Criteria
1. The following command types work: `play`, `pause`, `skip`, `previous`, `volume`, `shuffle`, `repeat`, `queue`, `device`
2. `play <query>` searches Spotify and plays the top result
3. `volume up/down/50` adjusts volume with numeric or relative values
4. `shuffle on/off` toggles shuffle mode
5. `repeat track/context/off` cycles repeat mode
6. Commands execute within 2 seconds of being sent
7. Command result is confirmed in the chat response ("Now playing: X by Y")
8. If no Spotify device is active, a helpful error message is shown
9. Device selection command lists available devices and switches to the specified one
10. Commands work via both chat (`POST /api/chat/message`) and direct endpoint (`POST /api/spotify/command`)

### Backend Implementation Notes
- Parser: `src/chat/spotify-command-parser.js` (`SpotifyCommandParser.parse()`)
- Patterns: regex patterns in `COMMAND_PATTERNS` map keywords to command types
- Execution: `src/spotify/playback-controller.js`
- Spotify API calls: `src/spotify/api-service.js`

### Frontend Components
- `src/frontend/components/EnhancedChatInterface.jsx` — primary command entry
- `src/frontend/components/AdvancedMusicControlCenter.jsx` — button-based playback controls

---

## Feature 4: AI-Powered Music Recommendations

### Description
Personalized track recommendations generated by blending collaborative filtering,
content-based audio feature matching, and semantic embeddings. Updated based on listening
history.

### User Story
> As a user, I want to see music recommendations that match my taste and current mood,
> getting more personalized as I listen to more music.

### Acceptance Criteria
1. `GET /api/recommendations` returns ≥ 10 tracks with scores and strategy attribution
2. Recommendations update after every 5 new listening history entries
3. At least two recommendation strategies contribute to hybrid results
4. Each recommendation includes a human-readable reason ("Based on your love of AC/DC")
5. Clicking a recommendation plays it immediately in Spotify
6. User can dismiss a recommendation (stored as negative signal in MongoDB)
7. User can like a recommendation (stored as positive signal)
8. Recommendations never repeat the same track within a 24-hour window
9. Cold-start users (no history) receive popular tracks in preferred genres
10. Recommendation generation completes within 3 seconds (cached results: < 100ms)

### Backend Implementation Notes
- Route: `GET /api/recommendations` → `src/api/routes/recommendations.js`
- Engine: `src/ml/recommendation-engine.js`
- Strategies: `src/recommendation/strategies/`
- Cache key: `recs:{userId}:{strategy}:{limit}` (TTL 3600s)
- History read from: `echotune_listening_history`
- Results saved to: `echotune_recommendations`

### Frontend Components
- `src/frontend/components/ExplainableRecommendations.jsx` — recommendation cards with reasons
- `src/frontend/components/EnhancedMusicDiscovery.jsx` — discovery dashboard
- `src/frontend/components/EnhancedMusicDiscoveryDashboard.jsx` — advanced discovery view

---

## Feature 5: AI Playlist Generation

### Description
Users describe a playlist in natural language and EchoTune generates a Spotify playlist
with matching tracks, saves it to Spotify, and shows it in the UI.

### User Story
> As a user, I want to type "make me a 20-song workout playlist with high energy rock and
> electronic" and have EchoTune create it in my Spotify account.

### Acceptance Criteria
1. `POST /api/playlists/generate` accepts a natural language `prompt` field
2. LLM parses prompt into: mood, activity, genres, target audio features
3. Recommendation engine selects matching tracks using parsed parameters
4. Playlist is created in Spotify via the Playlists API
5. Playlist is saved to `echotune_playlists` with `generation_parameters`
6. Response includes playlist name, track list, and Spotify playlist URL
7. Playlist names are creative and relevant to the prompt
8. Generation completes within 10 seconds
9. Generated playlists appear in the Playlists section of the UI
10. User can edit the playlist (add/remove tracks via drag-and-drop)

### Backend Implementation Notes
- Route: `POST /api/playlists/generate` → `src/api/routes/playlists.js`
- Playlist service: `src/spotify/PlaylistService.js`
- NLP parsing of prompt: LLM call with structured output prompt
- Spotify API: `POST /v1/users/{userId}/playlists`, `POST /v1/playlists/{id}/tracks`

### Frontend Components
- `src/frontend/components/PlaylistBuilder.jsx` — prompt input + preview
- `src/frontend/components/AdvancedPlaylistManagement.jsx` — full playlist manager
- `src/frontend/components/PlaylistsPage.jsx` — all playlists list

---

## Feature 6: Real-Time Playback Control

### Description
Full Spotify playback control from the EchoTune UI: play, pause, skip, previous,
volume, shuffle, repeat, device selection. Real-time now-playing state via Socket.IO.

### User Story
> As a user, I want to control my Spotify playback from EchoTune without switching apps,
> and see what's playing update in real-time.

### Acceptance Criteria
1. Play/Pause button reflects current playback state immediately
2. Skip and Previous buttons work and update the now-playing display
3. Volume slider adjusts Spotify volume (0–100%) in real-time
4. Shuffle and Repeat toggles reflect current Spotify state
5. Device selector shows all available Spotify devices and allows switching
6. Now-playing widget updates within 500ms of track change via Socket.IO
7. Progress bar shows current track position and updates every second
8. Album art, track name, and artist displayed in now-playing widget
9. Playback controls are disabled gracefully when no device is active
10. Premium-only features (playback control) are disabled for free Spotify accounts

### Backend Implementation Notes
- Playback routes: `src/api/routes/spotify.js` (`POST /api/spotify/play`, `/pause`, `/skip`, etc.)
- Controller: `src/spotify/playback-controller.js`
- Socket.IO emission: polling Spotify `GET /v1/me/player` every 5s, emitting `now_playing`
- Rate limiter: `src/spotify/rate-limiter.js` ensures Spotify API limits respected

### Frontend Components
- `src/frontend/components/EnhancedSpotifyWebPlayer.jsx` — full player widget
- `src/frontend/components/AdvancedMusicControlCenter.jsx` — transport controls
- Socket.IO client subscription to `now_playing` events

---

## Feature 7: Listening History Analytics

### Description
Dashboard showing the user's listening patterns: top artists, top genres, energy trends,
listening time, and most-played tracks — drawn from `echotune_listening_history`.

### User Story
> As a user, I want to see insights about my music taste, like my most-played artists this
> month and how my energy preferences change throughout the week.

### Acceptance Criteria
1. Dashboard shows top 5 artists (by play count) for configurable time period
2. Dashboard shows top 5 genres with play count and percentage
3. Energy trend chart shows average track energy by day of week
4. Total listening time displayed (last 7, 30, 90 days)
5. Most-played tracks list (top 10 with play count)
6. Data updates in near real-time (within 1 hour of new listens)
7. Time period selector: 7 days, 30 days, 90 days, all time
8. Charts are mobile-responsive
9. Empty state shown with instructions for users with < 10 listening history entries
10. Data export option (JSON download)

### Backend Implementation Notes
- Route: `GET /api/analytics/*` → `src/api/routes/analytics.js`
- Aggregations on `echotune_listening_history` using MongoDB `$group`, `$sort`, `$limit`
- Example query for top artists:
  ```javascript
  db.echotune_listening_history.aggregate([
    { $match: { userId: ObjectId(userId), playedAt: { $gte: since } } },
    { $group: { _id: "$artistName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  ```

### Frontend Components
- `src/frontend/components/EnhancedAnalyticsDashboard.jsx` — main analytics view
- `src/frontend/components/AdvancedAnalyticsVisualizationDashboard.jsx` — advanced charts
- `src/frontend/components/InsightsDashboard.jsx` — summary insights
- Recharts: `<BarChart>`, `<LineChart>`, `<PieChart>` for visualizations

---

## Feature 8: User Settings & Preferences

### Description
Configurable settings for LLM provider selection, music preferences (genres, energy level,
explicit content), recommendation strategy, and UI theme.

### User Story
> As a user, I want to configure which AI model powers my chat and fine-tune my music
> preferences so that recommendations match my taste.

### Acceptance Criteria
1. `GET /api/user/settings` returns current user preferences
2. `PATCH /api/user/settings` updates one or more preference fields
3. LLM provider dropdown shows all configured providers with availability status
4. Genre multi-select allows adding/removing up to 10 favorite genres
5. Energy level slider (0–1) with visual label ("calm" → "intense")
6. Explicit content toggle
7. Recommendation strategy selector: hybrid, collaborative, content-based
8. Theme toggle (dark/light) persists across sessions
9. Settings changes take effect immediately without page reload
10. Settings are persisted in `echotune_user_preferences` in MongoDB

### Backend Implementation Notes
- Routes: `GET/PATCH /api/user/settings` → `src/api/routes/user-settings.js`
- MongoDB upsert: `echotune_user_preferences` (unique on `userId`)
- Provider status from `src/chat/provider-health-monitor.js`

### Frontend Components
- `src/frontend/components/BackendConnectedSettings.jsx` — settings with API integration
- `src/frontend/components/ComprehensiveSystemSettings.jsx` — full settings panel
- `src/frontend/components/EnhancedConfigPanel.jsx` — general configuration

---

## Feature 9: Now Playing Widget

### Description
A persistent widget (visible across all app sections) showing the currently playing
Spotify track with artwork, artist, track name, progress bar, and playback controls.

### User Story
> As a user, I want to always see what's playing and have quick controls available no
> matter which section of the app I'm in.

### Acceptance Criteria
1. Widget visible on all pages when Spotify is connected and a track is playing
2. Track name, artist, and album art displayed
3. Progress bar shows current position and updates every second
4. Play/pause, skip, and previous buttons functional
5. Widget shows "Nothing playing" state when no track is active
6. Track change reflected within 500ms via Socket.IO `now_playing` event
7. Clicking album art opens track in Spotify (external link)
8. Widget is fixed to bottom of screen on mobile

### Backend Implementation Notes
- Socket.IO event: `now_playing` emitted by server when track changes
- Payload: `{ trackId, name, artist, album, artworkUrl, progress, duration, isPlaying }`
- Server-side polling: `GET /v1/me/player` every 5 seconds (rate-limited)

### Frontend Components
- `src/frontend/components/EnhancedSpotifyWebPlayer.jsx` — full player with widget mode
- Socket.IO client listener: `socket.on('now_playing', updatePlayerState)`

---

## Feature 10: Multi-Provider LLM Selection

### Description
Users can select which LLM provider powers their chat experience. The system
automatically falls back to the next available provider on failure.

### User Story
> As a user, I want to choose between Gemini, OpenAI, and other AI providers, and trust
> that the app keeps working if one goes down.

### Acceptance Criteria
1. `GET /api/llm/providers` returns list of providers with health status
2. Provider selection persisted in `echotune_user_preferences.llmProvider`
3. Circuit breaker prevents failed provider from being used for 30 seconds
4. Automatic fallback to next provider in chain is transparent to user
5. Provider health indicator visible in settings (green/yellow/red)
6. Model selection dropdown (provider-specific models) shown when provider selected
7. Mock provider always available as final fallback (shown in UI as "Demo Mode")
8. Token usage and latency visible in advanced settings (optional)

### Backend Implementation Notes
- Route: `GET /api/llm/providers` → `src/api/routes/llm-providers.js`
- Health monitor: `src/chat/provider-health-monitor.js`
- Circuit breaker: `src/chat/circuit-breaker.js`
- Provider factory: `src/chat/provider-factory.js`

### Frontend Components
- `src/frontend/components/EnhancedProviderPanel.jsx` — provider selection + health
- `src/frontend/contexts/LLMContext.jsx` — active provider state
- `src/frontend/components/BackendConnectedSettings.jsx` — provider settings tab

---

## Feature 11: Voice Input (Phase 5)

### Description
Users can click a microphone button to speak commands instead of typing.
Browser Web Speech API transcribes audio to text, then processes it as a normal
chat message.

### User Story
> As a user, I want to say "play something for studying" while my hands are busy and
> have EchoTune recognize and execute the command.

### Acceptance Criteria
1. Microphone button visible in chat input area
2. Clicking starts browser speech recognition (Web Speech API)
3. Visual indicator shows active recording state
4. Transcribed text populated in chat input
5. Auto-submit option (send immediately on pause in speech)
6. Graceful fallback message if browser does not support Web Speech API
7. Works on Chrome, Edge; graceful degradation on Safari/Firefox
8. Language detection follows browser language setting

### Backend Implementation Notes
- No backend changes required — voice input is browser-side only
- Transcribed text sent to `POST /api/chat/message` like any typed message

### Frontend Components
- Voice input hook: `src/frontend/hooks/useVoiceInput.js` (to be created)
- Integrated into: `src/frontend/components/ChatInput.jsx`

---

## Feature Cross-Reference Matrix

| Feature | API Endpoint(s) | MongoDB Collection(s) | Socket.IO Events |
|---|---|---|---|
| Auth | `/auth/login`, `/auth/callback` | `users` | — |
| Chat | `/api/chat/message`, `/api/chat/start` | `chat_sessions` | — |
| Spotify Commands | `/api/spotify/*` | `listening_history` | `now_playing` |
| Recommendations | `/api/recommendations` | `recommendations`, `listening_history` | `recommendation_update` |
| Playlist Gen | `/api/playlists/generate` | `playlists` | — |
| Playback Control | `/api/spotify/play`, `/pause`, etc. | `listening_history` | `now_playing`, `queue_update` |
| Analytics | `/api/analytics/*` | `listening_history` | — |
| Settings | `/api/user/settings` | `user_preferences` | — |
| Now Playing | `/api/spotify/playback` | — | `now_playing` |
| Provider Select | `/api/llm/providers` | `user_preferences` | `provider_health` |

---

## Cross-References

- API endpoint details → `05-API-REFERENCE.md`
- Spotify OAuth feature → `06-SPOTIFY-INTEGRATION.md`
- LLM provider feature → `07-AI-LLM-INTEGRATION.md`
- Recommendation engine → `08-RECOMMENDATION-ENGINE.md`
- Frontend components → `09-FRONTEND-GUIDE.md`
