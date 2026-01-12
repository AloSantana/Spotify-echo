# 🔍 Perplexity Research Results - Cycle 4

**Generated**: 2026-01-12T01:49:51.828470
**Cycle**: 4/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly plan for the next coding cycle, organized by area and broken down into **small, automatable tasks**.

---

## 1. Codebase Structure & Refactoring

**Goal:** Make the repo easier for Copilot and humans to navigate, extend, and test.

**Tasks**

1. **Introduce a clear top-level structure** (if not already present):  
   - `backend/` (API, ML services)  
   - `frontend/` (React app)  
   - `ml/` (models, training scripts, experiments)  
   - `infra/` (CI, deployment, Docker)  
   - `docs/` (architecture, API, usage)  
   **Priority:** P1  

2. **Add central configuration management**:  
   - Create `backend/config/index.ts` or `config.py` (depending on stack) to load env vars (Spotify keys, DB URLs, model paths) with validation.  
   - Replace scattered `process.env.*` or hardcoded string literals with config imports.  
   **Priority:** P1  

3. **Modularize large files**:  
   - Identify any backend or ML files >300 lines or React components >200 lines.  
   - Split them by responsibility (e.g., `spotifyService.ts`, `playlistService.ts`, `audioAnalysisService.ts`).  
   **Priority:** P2  

4. **Introduce shared types/interfaces**:  
   - Add `backend/types/spotify.ts` and `backend/types/music.ts` defining track, playlist, audio features, and recommendation result interfaces.  
   - Replace inline type definitions and `any` usage.  
   **Priority:** P2  

---

## 2. Music AI/ML Integration Opportunities

**Goal:** Align with current music-AI trends (personalization, embeddings, mood/genre modeling) and make them pluggable.

**Tasks**

1. **Create a model abstraction layer**:  
   - Add `ml/model_registry.py` or `backend/ml/modelRegistry.ts` with a simple interface:  
     - `analyze_track(audio_features | raw_audio)`  
     - `recommend_tracks(user_profile, context)`  
   - Implement a default stub/heuristic model behind this interface.  
   **Priority:** P1  

2. **Add support for audio feature–based embeddings**:  
   - Implement a function `ml/feature_extraction.py` to map Spotify audio features into a normalized feature vector.  
   - Provide a similarity function (e.g., cosine similarity) for track–track similarity.  
   **Priority:** P2  

3. **Add pluggable “mood” and “activity” tags**:  
   - Define a mapping in code (e.g., JSON or TS file) that maps clusters of audio features to mood tags (chill, energetic, focus, etc.).  
   - Expose an endpoint `GET /tracks/:id/mood` that uses the model layer.  
   **Priority:** P2  

4. **Prepare hooks for future LLM integration** (text prompts like “give me a jazz playlist for studying”):  
   - Define an interface `TextToPlaylistEngine` in `backend/ml/textToPlaylist.ts` with a stub implementation.  
   - Wire it to an endpoint `POST /playlists/from-text`.  
   **Priority:** P3  

---

## 3. Spotify API Usage & Enhancements

**Goal:** Make Spotify integration robust, efficient, and easier to extend.

**Tasks**

1. **Centralize Spotify client**:  
   - Create `backend/integrations/spotifyClient.ts` handling:  
     - Auth/token refresh  
     - Rate limit handling (429 backoff)  
     - Generic `get`, `post` wrapper with logging and error mapping.  
   - Replace direct Spotify fetch/axios calls across the codebase with this client.  
   **Priority:** P1  

2. **Introduce typed Spotify data models**:  
   - Define types for `SpotifyTrack`, `SpotifyPlaylist`, `SpotifyAudioFeatures`, `SpotifyUserProfile`.  
   - Enforce these types in service and controller layers.  
   **Priority:** P2  

3. **Add caching for stable Spotify responses**:  
   - For endpoints like `getAudioFeatures`, `getUserPlaylists`, introduce in-memory or Redis caching with TTL.  
   - Create a wrapper `cachedSpotifyCall(key, fetchFn, ttl)` and apply to high-traffic methods.  
   **Priority:** P2  

4. **Implement request-level error handling**:  
   - Standardize error responses for Spotify failures (e.g., 401, 429, 5xx) in an error utility.  
   - Ensure frontend gets consistent error shapes.  
   **Priority:** P2  

---

## 4. Frontend React Performance & Structure

**Goal:** Improve UX responsiveness and maintainability.

**Tasks**

1. **Audit and memoize heavy components**:  
   - Identify components that render large lists (tracks, playlists, recommendations).  
   - Wrap them with `React.memo`, use `useMemo`/`useCallback` where props are stable.  
   **Priority:** P1  

2. **Introduce list virtualization**:  
   - Use `react-window` or similar for long track lists.  
   - Replace manual `.map` rendering of large arrays with a virtualized list.  
   **Priority:** P2  

3. **Centralize API calls in a hooks layer**:  
   - Create hooks like `useUserPlaylists`, `useRecommendations`, `useTrackAnalysis`.  
   - Move `fetch`/axios logic out of UI components into these hooks, with loading/error state.  
   **Priority:** P2  

4. **Add skeleton loaders & suspense-like UX**:  
   - For main views (dashboard, playlist view, recommendation view), show skeletons while data loads.  
   **Priority:** P3  

5. **Standardize global state**:  
   - If using multiple ad-hoc contexts, migrate to a simple store (React Context + reducer or Zustand/Redux).  
   - Define store slices: `user`, `spotifySession`, `recommendations`, `ui`.  
   **Priority:** P2  

---

## 5. New Features for the Roadmap (Copilot-friendly)

**Goal:** Add small, well-scoped features that Copilot can implement with minimal design work.

**Features**

1. **“Explain this recommendation” panel**  
   - Backend: add endpoint `/recommendations/:id/explanation` returning why tracks were chosen (e.g., “similar tempo and energy to seed track”).  
   - Frontend: optional expandable card showing explanation text per playlist.  
   **Priority:** P1  

2. **User tuning sliders (EchoTune controls)**  
   - UI controls for: energy, tempo, acousticness, popularity.  
   - Backend: accept these parameters in recommendation endpoint and adjust filtering/scoring.  
   **Priority:** P1  

3. **Session presets** (“Focus”, “Workout”, “Chill”)  
   - Predefined parameter sets mapped to buttons.  
   - Call recommendation endpoint with preset configuration.  
   **Priority:** P2  

4. **History of generated playlists**  
   - Backend: persist generated playlists (id, name, seed, parameters, timestamp).  
   - API: `GET /playlists/generated` and `GET /playlists/generated/:id`.  
   - Frontend: simple “History” page listing past generations with “re-generate” button.  
   **Priority:** P2  

5. **Basic analytics view**  
   - For a selected playlist, show aggregate stats (avg tempo, energy, key distribution).  
   - Compute on backend or frontend using Spotify audio features.  
   **Priority:** P3  

---

## 6. Architecture & Scalability Improvements

**Goal:** Prepare for higher traffic and more complex ML.

**Tasks**

1. **Introduce clear layering in backend**:  
   - Folders: `controllers/`, `services/`, `integrations/`, `ml/`, `repositories/`.  
   - Ensure controllers only handle HTTP; services contain business logic.  
   **Priority:** P1  

2. **Add request logging & tracing**:  
   - Implement middleware logging: endpoint, duration, status, user id (if present).  
   - Tag calls involving Spotify separately.  
   **Priority:** P2  

3. **Implement basic rate limiting & throttling**:  
   - Per-user rate limiting for recommendation endpoints.  
   - Prevent abuse that could exhaust Spotify quotas.  
   **Priority:** P2  

4. **Containerization / environment parity**:  
   - Add or update `Dockerfile` and `docker-compose` for backend + frontend + optional cache.  
   - Provide minimal `.env.example`.  
   **Priority:** P2  

---

## 7. Security Enhancements

**Goal:** Protect tokens, user data, and prevent obvious vulnerabilities.

**Tasks**

1. **Centralize secret handling**:  
   - Ensure Spotify client ID/secret, JWT keys, DB credentials are only read from environment variables.  
   - Add `.env.example` without real values.  
   - Double-check `.gitignore` includes `.env*` and secrets.  
   **Priority:** P1  

2. **Input validation layer**:  
   - Add validation (e.g., Zod/Joi/Yup) for all external inputs (query, params, body) in controllers.  
   - Return 400 with clear error messages on invalid input.  
   **Priority:** P2  

3. **Auth & scopes review**:  
   - Confirm only necessary Spotify scopes are requested.  
   - Ensure protected endpoints verify user identity and ownership where needed.  
   **Priority:** P2  

4. **HTTP security headers**:  
   - For the backend API, configure helmet (Node) or equivalent with sane defaults.  
   **Priority:** P2  

5. **Sanitize logs**:  
   - Make sure no access tokens, refresh tokens, or PII are logged.  
   **Priority:** P2  

---

## 8. Testing & Validation Improvements

**Goal:** Raise reliability while keeping tasks small and automatable.

**Tasks**

1. **Set up basic test framework** (if missing):  
   - Backend: Jest / Vitest / Pytest with minimal config.  
   - Frontend: React Testing Library + Jest/Vitest.  
   **Priority:** P1  

2. **Add unit tests for core business logic**:  
   - Recommendation ranking logic.  
   - Spotify client wrapper (using mocked responses).  
   - Feature extraction / mood tagging.  
   **Priority:** P1  

3. **Snapshot tests for key UI screens**:  
   - Home/dashboard, playlist view, recommendation configuration panel.  
   **Priority:** P2  

4. **Contract tests for Spotify integration**:  
   - Mock Spotify API with recorded fixtures.  
   - Validate that request shapes and responses match types/interfaces.  
   **Priority:** P2  

5. **Add minimal CI pipeline**:  
   - Run tests and lint on pull requests.  
   - Fail build on test or lint failures.  
   **Priority:** P2  

---

## 9. Documentation Updates

**Goal:** Make it easy for agents and humans to understand and extend EchoTune AI.

**Tasks**

1. **Update/Write main README**:  
   - Clear sections: overview, architecture diagram (text description is sufficient), tech stack, setup, running locally, testing, deployment.  
   **Priority:** P1  

2. **Add `docs/architecture.md`**:  
   - Document high-level flow: user → frontend → backend → Spotify → ML layer → response.  
   - Explain where recommendation logic lives.  
   **Priority:** P2  

3. **Add `docs/api.md`**:  
   - Document all public endpoints, parameters, and response shapes (especially recommendation and analytics endpoints).  
   **Priority:** P2  

4. **Add `CONTRIBUTING.md` with AI hints**:  
   - Describe coding style, testing requirements, and how to use GitHub Copilot/agents effectively on this repo.  
   **Priority:** P3  

---

## 10. How to Structure These for a Copilot Agent

When opening issues or tasks for the next cycle, phrase them in **small, atomic tickets**, for example:

- “Refactor all direct Spotify API calls into a `backend/integrations/spotifyClient.ts` module with typed methods and rate limit handling.”  
- “Add Jest tests for the recommendation scoring function in `backend/services/recommendationService` covering at least 3 scenarios.”  
- “Implement `/recommendations/:id/explanation` endpoint and corresponding React UI panel to display explanation text.”  
- “Introduce `useRecommendations` hook in frontend to encapsulate API calls and loading/error state.”

This decomposition will let Copilot’s coding agent handle each task with minimal human intervention, while steadily improving EchoTune AI’s capabilities and robustness.