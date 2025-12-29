# 🔍 Perplexity Research Results - Cycle 1

**Generated**: 2025-12-29T00:26:02.807583
**Cycle**: 1/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly task plan for the **next coding cycle** for EchoTune AI, organized by area and priority, assuming a typical stack of: React frontend, Node/Express (or similar) backend, Spotify Web API integration, and AI/ML music features.

---

## 1) New Features (roadmap items)

### 1.1 “Smart Playlist Seed Recommendations” (High)

Add a feature that suggests **seed tracks/artists/genres** for Spotify recommendations based on the user’s listening history and liked tracks.

Actionable tasks:
- Add backend endpoint `GET /ai/recommend-seeds`:
  - Input: optional `userId`, `limit`.
  - Logic: 
    - Call Spotify API to get user’s top tracks and artists.
    - Compute simple scores (frequency / recency).
    - Return top N tracks, artists, and genres as seed candidates.
- Add frontend React hook `useSeedRecommendations()` to call the new endpoint.
- Add UI section on the “Create AI Mix” page:
  - “Suggested seeds” list with:
    - Top tracks (show name + artist).
    - Top artists.
    - Top genres as clickable chips.
- Wire “Use all seeds” and “Clear seeds” buttons into existing playlist generation flow.

### 1.2 “AI Mix Explainability” (Medium)

Display a **short textual explanation** for why a track was added to an AI-generated playlist.

Actionable tasks:
- Extend playlist generation backend:
  - For each track, store metadata such as:
    - Closest seed track(s)/artist(s).
    - Key audio features (tempo, energy, danceability).
  - Add a small explanation generator function that produces a 1–2 sentence reason string per track.
- Extend playlist response schema to include `reason` per track.
- Update React playlist view:
  - Add a collapsible “Why this track?” section for each track, showing the reason string.

### 1.3 “Session Presets” (Medium)

Let users save and re-apply **AI mix configuration presets** (mood, energy, tempo range, genres).

Actionable tasks:
- Add backend CRUD endpoints:
  - `POST /presets`
  - `GET /presets`
  - `DELETE /presets/:id`
- Add minimal persistence model: `Preset { id, userId, name, paramsJSON, createdAt }`.
- On the frontend:
  - Add “Save current settings as preset” button on the main mixer panel.
  - Add dropdown listing user presets with “Apply” and “Delete” actions.

---

## 2) Code Improvements & Refactoring

### 2.1 Centralize Spotify API Client (High)

Actionable tasks:
- Create a single `spotifyClient.ts` (or `spotify.service.ts`) module:
  - Export strongly typed functions: `getUserTopTracks`, `getUserTopArtists`, `getAudioFeatures`, `createPlaylist`, `addTracksToPlaylist`, etc.
  - Handle token injection, rate limiting (simple retry with backoff), and error normalization.
- Replace scattered raw `fetch`/`axios` Spotify calls with this unified client.
- Add basic logging for 4xx/5xx responses in one place.

### 2.2 Extract AI/ML Logic Into a Service Layer (Medium)

Actionable tasks:
- Create `ai` or `recommendations` service module:
  - Functions such as `buildFeatureVectorFromTrack`, `scoreTrackSimilarity`, `generatePlaylistFromSeeds`.
- Move data science-ish logic out of route handlers/controllers into that service.
- Ensure service is **pure** (no direct HTTP/DB calls) where possible to simplify testing.

### 2.3 Normalize Types and Interfaces (Medium)

Actionable tasks:
- For TypeScript:
  - Create `types/spotify.ts`, `types/playlist.ts`, `types/ai.ts` with shared interfaces.
  - Replace inline `any`/implicit `object` types with these shared types.
- For JS-only:
  - Add JSDoc type comments for main domain objects and function parameters.

---

## 3) Performance Optimizations

### 3.1 Memoization and Suspense for Heavy React Components (High)

Actionable tasks:
- Identify components that re-render frequently (playlist lists, track rows, charts).
- Wrap item components in `React.memo` and ensure stable `key` and props.
- Use `useMemo`/`useCallback` for derived data and callbacks passed deep into the tree.
- Use code-splitting (`React.lazy` + `Suspense`) for non-critical views like “About AI” or advanced settings.

### 3.2 Virtualized Lists for Large Playlists (Medium)

Actionable tasks:
- If playlist pages render more than ~50 tracks:
  - Install `react-window` or `react-virtualized`.
  - Replace plain `.map()` over large track arrays with a virtualized list component.
- Ensure row heights are fixed or predictable for smoother virtualization.

### 3.3 Backend Caching of Spotify Results (Medium)

Actionable tasks:
- Implement simple in-memory cache module:
  - Key by `userId` + endpoint name (`userTopTracks`, etc.).
  - TTL configurable (e.g., 5–10 minutes).
- Wrap `getUserTopTracks` and similar functions with cache lookups to reduce API calls.

---

## 4) Spotify API Usage Enhancements

### 4.1 Robust Token Management (High)

Actionable tasks:
- Implement a central auth module:
  - Functions: `getAccessToken(userId)`, `refreshAccessToken(userId)`.
- Ensure all Spotify calls:
  - Refresh on 401/expired token.
  - Do not log tokens.
- Add defensive checks for missing scopes; provide clear error messages to the frontend.

### 4.2 Rate Limit Handling (Medium)

Actionable tasks:
- In `spotifyClient`, detect `429` responses:
  - Read `Retry-After` header.
  - Retry once or twice after a delay.
- Surface “rate limit” errors to frontend as a user-friendly message (“We are talking to Spotify too fast. Please try again in a moment.”).

### 4.3 Expand Use of Audio Features (Medium)

Actionable tasks:
- Update AI mix algorithm to use:
  - `tempo`, `key`, `mode`, `energy`, `valence`, `danceability`.
- Add parameters in the UI for at least:
  - Energy slider
  - Mood slider (valence)
- Ensure backend’s selection logic reads these parameters and filters or rescales scores accordingly.

---

## 5) Architecture & Scalability Improvements

### 5.1 Modular API Routing (High)

Actionable tasks:
- Split routes by domain:
  - `/api/spotify/*`
  - `/api/ai/*`
  - `/api/presets/*`
- Put each router in its own file and mount them in `app.ts` or `server.ts`.
- Ensure shared middlewares (auth, logging, error handling) are applied consistently.

### 5.2 Configuration Normalization (Medium)

Actionable tasks:
- Introduce a `config` module:
  - Read environment variables once.
  - Validate presence using a small schema or manual checks.
- Replace direct `process.env.X` usage across codebase with `config.X`.

### 5.3 Prepare for Multi-User Load (Medium)

Actionable tasks:
- Ensure any in-memory per-user caches are namespaced by `userId`.
- Avoid shared mutable state not keyed by user.
- Guard against N+1 Spotify calls inside loops; batch track IDs for audio-features where possible.

---

## 6) Security Enhancements

### 6.1 Secrets and Env Management (High)

Actionable tasks:
- Verify all secrets (Spotify client secret, JWT secrets, API keys) are:
  - Loaded via environment variables.
  - Never committed to repo.
- Add `.env.example` file with non-sensitive placeholders.
- Add `.gitignore` rules for `.env*`.

### 6.2 Input Validation and Sanitization (High)

Actionable tasks:
- Add a small validation layer (e.g., `zod` or `Joi`) for:
  - Playlist creation inputs.
  - AI mix settings (tempo ranges, sliders, text fields).
- Normalize and bounds-check inputs before using them in queries or AI prompts.

### 6.3 HTTP Security Headers (Medium)

Actionable tasks:
- Use `helmet` middleware (Node/Express):
  - Enable defaults.
  - Set sensible CSP if not yet present (even a relaxed one).
- Ensure `cors` is configured with explicit origins, not `*` for production.

### 6.4 Frontend Security Hardening (Medium)

Actionable tasks:
- Ensure any AI-generated or external text shown in UI is escaped (no `dangerouslySetInnerHTML` unless absolutely needed).
- If currently using `dangerouslySetInnerHTML`, wrap it with a sanitization function (e.g., DOMPurify) and limit allowed tags.

---

## 7) Documentation Updates

### 7.1 Developer Onboarding Guide (High)

Actionable tasks:
- Add `docs/DEVELOPMENT.md`:
  - Prerequisites (Node version, package managers).
  - How to set up Spotify app and callback URL.
  - How to run backend, frontend, and tests (`npm`/`yarn` scripts).
  - Brief architecture overview (frontend, backend, AI service, Spotify integration).

### 7.2 API Reference Stub (Medium)

Actionable tasks:
- Add `docs/API.md`:
  - Document main endpoints (`/ai/generate-playlist`, `/ai/recommend-seeds`, `/presets`, etc.).
  - For each: method, params, and example response (short and synthetic).

### 7.3 Frontend Component Conventions (Low)

Actionable tasks:
- Add a short style guide:
  - Folder structure for components/hooks.
  - State management approach.
  - Naming conventions.

---

## 8) Testing & Validation Improvements

### 8.1 Unit Tests for AI Logic (High)

Actionable tasks:
- For the AI/recommendation service functions:
  - Add tests covering:
    - Similarity scoring.
    - Parameter influence (energy, mood, tempo).
    - Edge cases (no seeds, very few tracks).
- Use fixed fixture data for audio features.

### 8.2 Integration Tests for Spotify Flow (Medium)

Actionable tasks:
- Add tests for:
  - Happy path: user auth → get top tracks → generate AI playlist.
  - Expired token path: verify refresh is attempted.
- Use mocking for Spotify HTTP calls to keep tests offline.

### 8.3 Frontend Component Tests (Medium)

Actionable tasks:
- Add tests (React Testing Library) for:
  - AI Mix form: slider changes call `onChange` with expected values.
  - Seed recommendations UI: renders seeds from mocked API hook, calls handler on click.
- Snapshot or minimal DOM checks where appropriate.

### 8.4 Basic E2E Happy Path (Low–Medium)

Actionable tasks:
- Using Playwright or Cypress:
  - Script: login (mocked), open AI mix page, set parameters, generate playlist, confirm tracks render, and reasons are visible.
- Gate this behind a separate script so it can be run on demand.

---

## Prioritization Recap for Next Cycle

**High priority (aim to complete next cycle):**
- Smart Playlist Seed Recommendations feature (backend + frontend).
- Centralized Spotify client and token management.
- Modular API routing + config module.
- React memoization and basic performance tuning.
- Secrets/env management and input validation.
- Unit tests for AI logic.
- Developer onboarding doc.

**Medium priority (start or partially complete next cycle):**
- AI mix explainability.
- Session presets.
- Caching Spotify results and rate-limit handling.
- Virtualized lists for large playlists.
- Security headers and basic CSP.
- API docs and component tests.

All of these tasks are structured so a GitHub Copilot coding agent can implement them incrementally via small, focused pull requests.