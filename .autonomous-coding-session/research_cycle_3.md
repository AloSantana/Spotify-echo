# 🔍 Perplexity Research Results - Cycle 3

**Generated**: 2025-12-26T01:31:07.098574
**Cycle**: 3/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly plan for the next coding cycle, organized by area and broken down into small, automatable tasks.

---

## 1) New Features (Roadmap Items)

**P0 – High impact, low integration risk**

1. **Personalized “Echo Profiles” for users**
   - Add backend model for `EchoProfile` (preferred genres, tempo range, energy/valence ranges, favorite artists).
   - Add endpoints:
     - `GET /api/profile`
     - `PUT /api/profile` (update preferences, including “auto-learn from listening history” flag).
   - Wire Spotify data:
     - Background job / endpoint to pull top tracks + artists and infer profile vectors from audio features.
   - Frontend:
     - React settings panel: sliders for tempo/energy/valence, multi-select for genres, toggle for “learn from Spotify history.”
     - Persist and show a quick textual summary (“You like energetic, danceable tracks around 120–130 BPM”).

2. **EchoTune “Smart Mix” playlist generator (MVP)**
   - Backend:
     - Endpoint `POST /api/playlists/smart-mix` that:
       - Accepts: seed tracks/artists/genres, target mood (e.g., chill / focus / party), length (N tracks).
       - Uses stored EchoProfile + Spotify audio features to:
         - Filter candidate tracks by BPM, energy, etc.
         - Score tracks by similarity to user profile and requested mood.
       - Returns ordered track URIs and human-readable rationale per track.
   - Frontend:
     - “Create Smart Mix” modal from:
       - Home dashboard
       - Any existing playlist view (“Generate Smart Mix from this playlist”).
     - Show preview list with short explanations: “Higher energy than your average, but close in danceability.”

3. **“AI Commentary” on existing playlists**
   - Backend endpoint `POST /api/playlists/:id/commentary`:
     - Analyze playlist tracks (genres, tempo distribution, keys, loudness).
     - Return short summary (“Mostly mid-tempo indie rock, high energy, low acousticness, great for workouts.”).
   - Frontend:
     - Button on playlist detail view: “Generate AI commentary.”
     - Display commentary in collapsible card; cache result in local state/backend to avoid recomputation.

---

## 2) Codebase Improvements & Refactoring

**P1 – Structural cleanup that aids Copilot and scalability**

4. **Standardize backend architecture into clear modules**
   - Create top-level modules (or folders/namespaces):
     - `core/` – domain models & shared utilities
     - `services/spotify/` – Spotify client, auth refresh, rate-limiting
     - `services/recommendation/` – profile & playlist logic
     - `api/` – HTTP controllers/routers only
   - Move all direct Spotify SDK calls into `services/spotify/spotifyClient` with typed methods (e.g., `getAudioFeatures(trackIds)`).
   - Ensure all controllers are thin: validate input, call service, return DTO.

5. **Introduce typed DTOs / interfaces for main flows**
   - Define explicit types/interfaces:
     - `TrackFeatures`, `UserProfileVector`, `SmartMixRequest`, `SmartMixResponse`, `PlaylistCommentaryResponse`.
   - Refactor existing endpoints to use those DTO types both server-side and in React via shared type definitions (e.g., generated from OpenAPI/TypeScript types).

6. **Centralize configuration & environment handling**
   - Add `config/` module:
     - Handles Spotify client IDs, secrets, redirect URIs, rate limits, and AI model selection from env vars.
   - Replace scattered `process.env.*` or inline config literals with config module accessors.
   - Add schema validation (e.g., Zod / Joi) for env at startup with clear error messages.

---

## 3) Performance Optimizations

**P1 – Measurable wins, feasible for Copilot**

7. **Spotify API call batching & caching**
   - Implement batched calls for audio features, tracks, and artists:
     - New helper `batchGetAudioFeatures(trackIds: string[])` that:
       - Splits into chunks within Spotify limits.
       - Caches results (in-memory LRU) for some TTL (e.g., 15–30 minutes).
   - Replace per-track calls with the new batch functions in recommendation flows.
   - Add simple in-process cache abstraction so it can later be swapped to Redis.

8. **Memoize heavy frontend selectors & derived data**
   - Identify React components that compute large derived lists (e.g., sorting/aggregating playlist tracks).
   - Introduce memoized selectors or `useMemo` hooks:
     - Track list transformations
     - Stats aggregations (tempo histograms, genre counts)
   - Ensure dependency arrays are correct and stable to avoid unnecessary recomputes.

9. **Code-splitting & lazy loading on React routes**
   - Convert major routes (e.g., `/dashboard`, `/playlists/:id`, `/settings`) to lazy-loaded components via `React.lazy` + `Suspense`.
   - Split out heavy visualization/musical analysis components into separate bundles.
   - Verify that top-level shell (nav + minimal layout) stays small and fast.

---

## 4) Spotify API Usage Enhancements

**P1–P2 – Correctness, rate-limit safety**

10. **Robust Spotify token refresh & error handling**
    - Encapsulate:
      - Token storage
      - Refresh logic
      - Retry-with-backoff on 401/429.
    - Ensure all Spotify calls go through a wrapper that:
      - Detects expired tokens, refreshes once, retries.
      - Interprets `Retry-After` headers on 429 and awaits accordingly.
    - Add standardized error mapping:
      - Convert Spotify errors into app-level error codes/messages.

11. **Consistent permission scope management**
    - Centralize list of required scopes for:
      - Reading library/playlist
      - Creating/editing playlists
    - On login, present computed minimal scope set.
    - Add small utility to check that user tokens have required scopes before calling specific operations; return a clear error to frontend if not.

---

## 5) Frontend React Performance & UX

**P1 – Smooth UI for AI features**

12. **Standard loading/skeleton states for AI operations**
    - Build reusable `<LoadingOverlay>` or `<SkeletonSection>` for:
      - Smart Mix generation
      - Playlist commentary
      - Profile inference from Spotify
    - Use React Query (or equivalent) for request status instead of ad-hoc `isLoading` flags where applicable.

13. **Debounced user input for filters & sliders**
    - For tempo/energy/valence sliders and text search fields:
      - Add `useDebounce` hook and apply to API calls / heavy recomputation.
    - Ensure the UI updates instantly while expensive work is debounced.

---

## 6) Architecture & Scalability

**P2 – Prepare for larger loads and multi-user scale**

14. **Introduce a lightweight job abstraction for long-running tasks**
    - Define a simple job runner interface:
      - For tasks like bulk audio-feature fetching, playlist re-analysis, profile recomputation.
    - Start with in-process queue implementation with:
      - `enqueueJob`, `processJobs`.
    - Mark long-running operations that should move to jobs and wrap them:
      - Smart Mix creation if N is large
      - Full-library analysis.

15. **Add versioned API routes**
    - Introduce `v1` prefix (e.g., `/api/v1/profile`, `/api/v1/playlists/smart-mix`).
    - Create central router that groups all v1 endpoints.
    - Add internal comment on how to add v2 endpoints later without breaking current clients.

---

## 7) Security Enhancements

**P0–P1 – Important and Copilot-implementable**

16. **Secure handling of secrets & tokens**
    - Ensure:
      - No Spotify or AI keys are checked into the repo.
      - Add `.env.example` with non-sensitive placeholders and documentation.
    - Verify token storage:
      - User refresh/access tokens encrypted at rest (if stored server-side).
      - In frontend, use HttpOnly cookies for session tokens instead of localStorage.

17. **Input validation & sanitization**
    - Add schema validation for all external inputs:
      - API payloads (playlist IDs, profile updates, Smart Mix options).
    - Normalize/validate IDs and query parameters to prevent injection or malformed requests.

18. **Basic rate limiting on public endpoints**
    - Add simple, IP-based or user-based rate limiting middleware around:
      - Auth/login
      - Playlist generation/commentary endpoints.
    - Make limits configurable via config module.

---

## 8) Documentation Updates

**P2 – Improve Copilot and contributor effectiveness**

19. **Update/author high-level architecture overview**
    - Create `docs/architecture.md`:
      - Modules: API, Spotify service, recommendation service, AI commentary, React frontend.
      - Major flows: login → Spotify auth → profile inference → smart mix generation.
    - Ensure diagrams are text-based (mermaid) so Copilot can parse and reason over them.

20. **Endpoint & feature documentation**
    - Add concise docs for new endpoints:
      - `GET/PUT /api/v1/profile`
      - `POST /api/v1/playlists/smart-mix`
      - `POST /api/v1/playlists/:id/commentary`
    - For each: request schema, response schema, example payloads.

---

## 9) Testing & Validation

**P1 – Automated tests that Copilot can generate**

21. **Unit tests for recommendation logic**
    - Add tests covering:
      - Profile vector creation from audio features.
      - Smart Mix scoring: similar tracks get higher scores; extreme outliers are excluded.
      - Mood presets (chill/focus/party) mapping to expected feature ranges.
    - Use deterministic fixtures for Spotify audio feature objects.

22. **Integration tests for main API flows**
    - Add tests for:
      - Profile read/write
      - Smart Mix generation with mocked Spotify client that:
        - Returns known tracks and features.
    - Assert both structure and basic semantics (e.g., correct number of tracks, all from mock data set).

23. **Frontend component tests for new UI**
    - Tests for:
      - Profile settings panel:
        - Sliders update local state.
        - Save triggers correct API call (using mocked fetch/React Query).
      - Smart Mix modal:
        - Disabled “Create” button while required seeds are missing.
        - Shows loading state and then renders track list with rationales.

---

## Suggested Priority Ordering for Next Cycle

If the next cycle is similar in size to previous ones, a focused set for high impact would be:

1. Tasks 1–3 (new features: Echo Profiles, Smart Mix, AI Commentary).
2. Tasks 4, 7, 10, 16 (core refactor + Spotify robustness + security).
3. Tasks 21–22 (backend tests to guard new logic).
4. As time remains: 12–13 (frontend polish), 19–20 (docs).

All of these are decomposed into small, declarative units that can be handed directly to a GitHub Copilot agent as individual issues or PR tasks.