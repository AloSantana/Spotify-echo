# 🔍 Perplexity Research Results - Cycle 4

**Generated**: 2025-12-28T12:11:28.330676
**Cycle**: 4/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly task plan for the next coding cycle, structured by area and already broken down into small, automatable units. Adjust naming to match your actual repo conventions.

---

## 1. Codebase Structure & Refactoring

**Goal:** Clarify layers (API, services, ML, integration) and reduce coupling so Copilot can extend safely.

**Tasks**

1. **Introduce explicit high-level structure (Priority: High)**  
   - Add top-level folders (if not already present):  
     - `backend/api/` (HTTP handlers/controllers)  
     - `backend/services/` (domain logic)  
     - `backend/integrations/spotify/`  
     - `backend/ml/` (EchoTune AI models, feature extraction, inference)  
   - Move existing modules into these folders with minimal path-breaking refactors and update imports.  
   - Add a `backend/README.md` describing responsibilities of each folder.

2. **Centralize configuration (Priority: High)**  
   - Create `backend/config/settings.{ts|py|js}` that:  
     - Reads all env vars (Spotify keys, DB URL, model paths, feature flags).  
     - Provides typed, validated accessors (e.g., `getSpotifyConfig()`, `getModelConfig()`).  
   - Remove duplicated ad‑hoc env access throughout code and use this module instead.

3. **Define shared types/interfaces (Priority: Medium)**  
   - Add `frontend/src/types/music.ts` and `backend/api/types.{ts|py}` for:  
     - `Track`, `Playlist`, `Recommendation`, `UserProfile`, `AudioFeatures`, `EchoTuneAnalysis`.  
   - Replace inline/duplicated type definitions across components and endpoints.

4. **Introduce service interfaces and adapters (Priority: Medium)**  
   - In `backend/services/spotifyService.{ts|py}`, define interface for Spotify operations (search, fetch audio features, user library, recommendations).  
   - Implement concrete class `SpotifyServiceHttp` using the Spotify Web API.  
   - Ensure all controllers use the service rather than direct Spotify calls.

---

## 2. Music AI/ML Trends & Integration

**Goal:** Make the ML layer modular and ready for current trends: embeddings, personalization, and multimodal features.

**Tasks**

1. **Create a model abstraction layer (Priority: High)**  
   - In `backend/ml/model_registry.{ts|py}`:  
     - Define interface: `analyzeTrack`, `recommendTracks`, `embedTrack`, `embedPlaylist`.  
     - Implement a default model backend (e.g., `SimpleAudioFeatureModel`) that wraps existing logic.  
   - Route all ML calls in services/controllers through this abstraction.

2. **Add track embedding infrastructure (Priority: Medium)**  
   - Define `Embedding` type and add `track_embeddings` table or collection in persistence layer.  
   - Implement `backend/ml/embeddings.{ts|py}`:  
     - `computeTrackEmbedding(trackFeatures)` (initially reusing scaled Spotify audio features).  
     - `storeTrackEmbedding(trackId, embedding)` and `getNearestTracks(embedding, k)`.  
   - Add a background job/CLI script `scripts/backfill_embeddings` to process existing tracks.

3. **Prepare for personalized models (Priority: Medium)**  
   - Add `UserPreferenceProfile` type (e.g., weights over audio features/genres).  
   - Implement `backend/services/userProfileService` with functions:  
     - `buildUserPreferenceProfile(userId)` from listening history + liked tracks.  
     - `getUserPreferenceProfile(userId)` with caching.  
   - Wire `recommendTracksForUser(userId)` to take this profile as an argument (even if currently ignored) to make the signature future-proof.

4. **Hook for LLM-assisted explanation (Priority: Low)**  
   - Add `backend/ml/explanations.{ts|py}` with function stub  
     - `explainRecommendation(userId, trackIds) -> list[str]`  
   - For now, implement a simple rule-based explanation using audio features; leave TODO marker for future LLM integration.

---

## 3. Spotify API Usage & Enhancements

**Goal:** Make Spotify integration robust, efficient, and easy to extend.

**Tasks**

1. **Centralize Spotify API client (Priority: High)**  
   - Create `backend/integrations/spotify/client.{ts|py}`:  
     - Handles token management (client credentials + user auth where applicable).  
     - Wraps HTTP calls and error mapping.  
   - Migrate all Spotify calls to this client module.

2. **Batch API calls and caching (Priority: High)**  
   - Ensure use of batch endpoints (`/audio-features`, `/tracks`, `/artists`) where possible.  
   - Add a simple caching layer for Spotify responses (e.g., Redis or in-memory) with configurable TTL:  
     - Keyed by endpoint + params.  
     - Used transparently by the Spotify client.

3. **Add rate-limiting and retry logic (Priority: Medium)**  
   - Implement automatic backoff when receiving 429 or transient 5xx from Spotify:  
     - Exponential backoff with jitter, capped retries.  
   - Log rate-limit events with structured metadata.

4. **Harden error handling and typing (Priority: Medium)**  
   - Introduce typed error classes: `SpotifyAuthError`, `SpotifyRateLimitError`, `SpotifyApiError`.  
   - Wrap and rethrow all Spotify errors with these classes, and convert to clear HTTP responses in the API layer.

5. **Add capability discovery helpers (Priority: Low)**  
   - Add utility function to detect available Spotify scopes for current user and store them.  
   - Use this to conditionally enable features in frontend (e.g., library analysis vs generic recommendations).

---

## 4. Frontend React Performance & UX

**Goal:** Improve responsiveness and make components predictable for Copilot to extend.

**Tasks**

1. **Audit and memoize heavy components (Priority: High)**  
   - Identify components rendering large lists (tracks, recommendations, playlists).  
   - Wrap them in `React.memo` and use `useMemo` / `useCallback` to stabilize props and handlers.  
   - Replace inline arrow functions in JSX with memoized callbacks when they are passed down multiple levels.

2. **Implement virtualized lists (Priority: High)**  
   - Introduce a virtualized list component using `react-window` or similar for track lists.  
   - Refactor existing long lists (search results, playlist contents, recommendations) to use virtualization.

3. **Extract reusable UI primitives (Priority: Medium)**  
   - Create `TrackCard`, `PlaylistCard`, `AnalysisBadge`, `RecommendationReason` components with clear props.  
   - Replace duplicated markup across pages with these primitives.

4. **Improve loading and error states (Priority: Medium)**  
   - Standardize UI for loading, empty, and error states in a single `AsyncState` component or hook.  
   - Ensure all async data fetching components use this pattern for consistent UX.

5. **Add client-side caching of recent results (Priority: Low)**  
   - Use React Query/TanStack Query or a minimal custom hook to cache:  
     - Recent searches  
     - Recent recommendation results  
   - Configure stale time and background refetch for better perceived performance.

---

## 5. New Features for Roadmap (Copilot-executable)

**Goal:** Add clear, relatively contained features that Copilot can implement with existing services.

**Tasks**

1. **“Mood-based Mix” generator (Priority: High)**  
   - New endpoint: `POST /mixes/mood` accepting `mood` + optional seed tracks.  
   - Backend:  
     - Map moods to audio feature ranges (valence, energy, tempo).  
     - Use Spotify + internal embedding index to select matching tracks.  
   - Frontend:  
     - New page or panel with mood selector chips (e.g., Chill, Focus, Party, Melancholy).  
     - Display generated mix and allow saving as a Spotify playlist via existing API.

2. **“Explain this recommendation” tooltip (Priority: Medium)**  
   - Extend recommendation API to return a short explanation string per track (for now from rules or simple heuristics).  
   - Frontend:  
     - Add tooltip or expandable text under each recommended track showing “Based on your liking of X and Y; similar energy and tempo.”

3. **User “Taste Profile” view (Priority: Medium)**  
   - Backend endpoint: `GET /users/me/taste-profile` using `UserPreferenceProfile`.  
   - Frontend page: radar chart or badges for top genres, energy/valence ranges, typical tempo.  
   - Include copy-only description (no complex ML) that Copilot can generate from profile values.

4. **Session-based quick recommendations (Priority: Low)**  
   - Add API `GET /recommendations/session` that uses last N tracks in session to adapt recommendations (stateless; uses request body/headers).  
   - Frontend: button “Refresh for this session” on recommendation view.

---

## 6. Architecture & Scalability

**Goal:** Prepare for increased usage with clearer boundaries and basic scaling primitives.

**Tasks**

1. **Introduce layered architecture README (Priority: High)**  
   - Add `ARCHITECTURE.md` describing:  
     - API layer, service layer, integration layer, ML layer, data persistence, and frontend.  
     - Data flow for a typical recommendation request.  
   - Include ASCII diagrams simple enough for Copilot to parse and extend.

2. **Add async job/execution layer (Priority: Medium)**  
   - Introduce job runner abstraction (e.g., BullMQ / Celery / simple queue).  
   - Implement jobs for:  
     - Backfilling track embeddings  
     - Periodic refreshing of long-lived Spotify data (e.g., user library snapshots, popular tracks).  
   - Add basic monitoring logs for job executions.

3. **Introduce configuration-based feature flags (Priority: Medium)**  
   - Implement `featureFlags` module that reads env or config file.  
   - Use flags for new features (mood mixes, explanations, taste profile) so they can be rolled out gradually.

4. **Abstract persistence layer (Priority: Low)**  
   - If using raw queries in multiple places, wrap them in repository modules (e.g., `TrackRepository`, `UserRepository`).  
   - Move direct DB calls from services/controllers to these repositories.

---

## 7. Security Enhancements

**Goal:** Ensure Spotify integration and user data are handled securely with minimal manual work.

**Tasks**

1. **Secret management and environment safety (Priority: High)**  
   - Confirm all secrets (Spotify client secret, JWT keys, DB password) are read from environment only.  
   - Add checks that the app fails fast with clear logs if required secrets are missing.  
   - Add `.env.example` with non-sensitive placeholders.

2. **Input validation and sanitization (Priority: High)**  
   - For each public endpoint, introduce request schemas (e.g., Zod/Joi/Pydantic) for body, params, query.  
   - Centralize error responses when validation fails.

3. **Harden authentication & authorization (Priority: Medium)**  
   - Ensure all user-specific endpoints check authenticated user ID and do not accept arbitrary user IDs from client.  
   - Add middleware to enforce scopes or roles if applicable.

4. **Security headers and HTTPS assumptions (Priority: Medium)**  
   - Configure security middleware (Helmet or equivalent) to add standard headers.  
   - Add configuration flag `TRUST_PROXY` and ensure proper handling of `X-Forwarded-*` headers for deployments behind proxies.

5. **Basic rate limiting at API gateway (Priority: Low)**  
   - Add per-IP and per-user rate limiting middleware for public endpoints to avoid abuse.  

---

## 8. Documentation Updates

**Goal:** Reach at least “Professional” tier repository standards for AI projects.[1]

**Tasks**

1. **Top-level README restructuring (Priority: High)**  
   - Include: short product description, architecture overview, quickstart, environment setup, and example workflows (e.g., “Generate a mood-based mix”).  
   - Add short section: “How EchoTune AI works (high level)” describing dataset, ML approach, and limitations.

2. **API documentation (Priority: Medium)**  
   - Auto-generate or hand-write API docs in `docs/api.md` listing endpoints, parameters, and response schemas.  
   - Ensure new endpoints (mood mix, taste profile, explanations) are documented.

3. **ML documentation (Priority: Medium)**  
   - Create `docs/ml-overview.md` describing:  
     - Current model(s) used.  
     - Features consumed (Spotify audio features, embeddings).  
     - Where to plug in alternative models.  

4. **Operations / deployment guide (Priority: Low)**  
   - Add `docs/deploy.md` with instructions for:  
     - Required env vars.  
     - Running migrations.  
     - Scaling strategies (horizontal replicas, worker processes).

---

## 9. Testing & Validation Improvements

**Goal:** Provide enough automated checks for Copilot-generated changes to be verified in CI.

**Tasks**

1. **Establish a minimal test harness (Priority: High)**  
   - If not already present, add unit test framework config (Jest/Pytest/Vitest).  
   - Ensure `npm test` / `pytest` runs with a simple example spec.

2. **Add tests for critical services (Priority: High)**  
   - Backend:  
     - `spotifyService` (mocking HTTP responses).  
     - `recommendationService` logic (given controlled features/embeddings).  
   - Frontend:  
     - Render tests for key pages and components (recommendations list, mood-mix view).

3. **Contract tests for Spotify integration (Priority: Medium)**  
   - Add tests with mocked Spotify API responses to ensure parsing and error handling remain correct.  
   - Use recorded fixtures for primary endpoints.

4. **Snapshot tests for API responses (Priority: Medium)**  
   - For main endpoints (`/recommendations`, `/mixes/mood`, `/users/me/taste-profile`), create snapshot tests of JSON output, using stable fixtures.

5. **Introduce basic CI workflow (Priority: Medium)**  
   - GitHub Actions workflow:  
     - Install dependencies.  
     - Run linters/formatters.  
     - Run test suite.  
   - Fail PRs if tests or lints fail.

6. **Add simple load test script (Priority: Low)**  
   - Create a k6/Locust or custom script to hit `/recommendations` and `/mixes/mood` endpoints at various RPS.  
   - Store in `scripts/loadtest/` with a short README on usage.

---

### Suggested Cycle-5 Focus (if you want a concise subset)

If you need a tight set of tasks for the very next cycle, prioritize:

- Structure & config: tasks 1.1, 1.2, 3.1  
- New feature: 5.1 Mood-based Mix  
- Frontend perf: 4.1, 4.2  
- Security: 7.1, 7.2  
- Testing: 9.1, 9.2 (backend services only)

All of these can be implemented largely autonomously by a GitHub Copilot agent operating via PRs with review.