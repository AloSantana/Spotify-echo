# 🔍 Perplexity Research Results - Cycle 1

**Generated**: 2026-01-12T01:47:35.821801
**Cycle**: 1/5
**Tasks Completed This Cycle**: 3

Here is an actionable, Copilot-friendly plan for the next coding cycle, organized by focus area and written as concrete tasks a coding agent can execute autonomously.

---

## 1) Repository & Architecture Improvements

**1.1. Standardize project structure (High)**  
- Create a top-level structure like:  
  - `backend/` (API, Spotify integration, AI services)  
  - `frontend/` (React app)  
  - `models/` or `ai/` (training/inference code, if separate)  
  - `scripts/` (maintenance, data prep, utilities)  
  - `tests/` (backend + frontend)  
  - `docs/`  
- Add a `README.md` at root describing this structure and entry points.[1]  
- Add `backend/README.md` and `frontend/README.md` explaining how to run each service and how they communicate.

**1.2. Introduce modular service boundaries (Medium)**  
- Split backend into clear modules:  
  - `spotify/` (all Spotify API calls)  
  - `recommendation/` (EchoTune AI logic)  
  - `users/` (user profiles, auth, preferences)  
  - `common/` (logging, error handling, types)  
- Refactor imports to use these modules instead of cross-cutting utilities.  
- Add a lightweight architecture overview in `docs/architecture.md` using text + simple ASCII diagrams (no images needed for Copilot).

**1.3. Add environment & dependency management (High)**  
- Add `requirements.txt` or `pyproject.toml` for Python, or `package.json` cleanup for Node-based backend.[1]  
- Add `.env.example` for API keys (Spotify client ID/secret, JWT secret, etc.).  
- Ensure the app reads configuration only from environment variables (no secrets in code).

---

## 2) Spotify API Usage Enhancements

**2.1. Centralize Spotify API client (High)**  
- Create `backend/spotify/client.ts|py` that:  
  - Wraps token acquisition/refresh.  
  - Provides typed helpers: `getUserTopTracks`, `getAudioFeatures`, `getRecommendations`, `getUserPlaylists`, etc.  
- Replace any direct `fetch`/`axios` calls to Spotify with calls to this client.

**2.2. Implement request-level caching & rate-limit safety (High)**  
- Add a simple in-memory cache layer (or Redis if already present) keyed by user + endpoint + parameters with TTL (e.g., 10–30 minutes) for:  
  - `getUserTopTracks`  
  - `getUserTopArtists`  
  - `getAudioFeatures` for track lists  
- Implement automatic backoff when Spotify returns 429:  
  - Read `Retry-After` header and sleep/retry in the client.  
- Add centralized error translation to internal error objects (e.g., `SpotifyAuthError`, `SpotifyRateLimitError`).

**2.3. Add support for additional Spotify endpoints (Medium)**  
New features Copilot can scaffold:  
- Endpoint: `GET /api/spotify/recently-played` → use `player/recently-played`.  
- Endpoint: `GET /api/spotify/recommendations/seed` → build from user’s top tracks + artists + audio features.  
- Endpoint: `POST /api/spotify/playlist/from-recommendations` → create playlist from EchoTune-generated track list.

---

## 3) EchoTune AI / ML Integration & Future Features

**3.1. Introduce a pluggable recommendation engine layer (High)**  
- Create `backend/recommendation/engine.ts|py` exposing:  
  - `generatePersonalizedMix(userId, options)`  
  - `explainMix(mixId)` (optional for future explainability)  
- Initially implement a simple heuristic: combine Spotify recommendations + audio features + user preference weights (tempo, energy, valence).  
- Abstract the interface so a future ML model can be swapped in behind the same API.

**3.2. Prepare for current music AI trends (Medium)**  
Align with current trends that are practical with Spotify integration and Copilot implementation:  
- Add support for **mood and activity tags**:  
  - Extend user profile schema: `preferredMoods`, `activities` (e.g., focus, workout, chill).  
  - Allow frontend to send `mood` and `activity` parameters into `generatePersonalizedMix`.  
- Add a minimal “**explain recommendation**” field:  
  - Include attributes like “high energy, danceable, similar to your top artists X and Y.”  
  - Return this metadata from the recommendation endpoint.

**3.3. Add roadmap hooks for generative / advanced AI (Low, design only)**  
- Add `docs/roadmap-ai.md` describing future integration with:  
  - Track summarization (e.g., textual description of a mix).  
  - LLM-based natural language to playlist queries (“give me dark, slow, ambient tracks with minimal vocals”).  
- No implementation, only interface placeholders (e.g., `NLPQueryToMix` interface) to keep Copilot’s scope bounded.

---

## 4) Frontend React Performance & UX

**4.1. Audit and refactor state management (High)**  
- Identify components that fetch Spotify/recommendation data directly; move logic into hooks:  
  - `useUserTopTracks`  
  - `useEchoMix(mood, activity)`  
- Use React Query or a lightweight fetching layer with caching and deduplication.  
- Ensure components are **pure UI** where possible; business logic goes into hooks/services.

**4.2. Optimize rendering & bundle size (Medium)**  
- Convert frequently re-rendering components to `React.memo` where props are stable.  
- Use `useCallback` / `useMemo` for expensive computations, e.g., transforming audio feature data into chart props.  
- Configure code splitting for heavy pages (e.g., analytics / visualization views) using `React.lazy` and `Suspense`.  
- Remove unused dependencies from `package.json`, and ensure tree-shaking is enabled in the build.

**4.3. Add UI for new features (High)**  
- Add a **“Create Echo Mix”** panel:  
  - Controls for `mood` (chips: chill, focus, workout, happy, sad, etc.).  
  - Controls for `activity` (work, study, gym, commute).  
  - Slider controls for energy, tempo preference.  
- Show generated playlist:  
  - Track cards with audio feature badges (energy, valence, danceability).  
  - “Save to Spotify” button (calls new playlist endpoint).  
- Add a small “Why these tracks?” info icon that shows the explanation string from backend.

---

## 5) Performance Optimizations (Backend & End-to-End)

**5.1. Batch Spotify calls (High)**  
- Ensure audio features are requested via batch endpoints (`/audio-features?ids=...`) instead of per-track calls.  
- Implement batching helper in Spotify client: given an array of track IDs, split into 100-ID chunks.

**5.2. Introduce server-side caching for hot endpoints (Medium)**  
- Add an in-memory or Redis-based cache for:  
  - Generated Echo mixes per user and parameter set (mood, activity, sliders).  
- Cache key pattern: `mix:{userId}:{hashOfParams}`.  
- TTL: e.g., 15–30 minutes to reflect recent listening but avoid constant recomputation.

**5.3. Add simple performance logging (Medium)**  
- Implement middleware to log request latency and status code for key endpoints:  
  - `/api/recommendations/mix`  
  - `/api/spotify/*`  
- Log to console or structured logger with fields: `path`, `method`, `durationMs`, `userId?`, `status`.

---

## 6) Security Enhancements

**6.1. Hardening configuration & secrets (High)**  
- Verify no Spotify secrets or JWT secrets are committed; enforce via:  
  - `.gitignore` covering `.env*`.  
  - Check for any inline credentials; replace with `process.env.*` or equivalent.  
- Add a minimal `SECURITY.md` stating how secrets are handled and how to report security issues.[1]

**6.2. Input validation & sanitization (High)**  
- Add validation middleware for request bodies and query params on:  
  - Recommendation endpoints (mood, activity, sliders).  
  - Playlist creation endpoints (name, description).  
- Use a schema validation library (e.g., Zod, Yup, Joi) and centralize schema definitions.

**6.3. OAuth & token handling (Medium)**  
- Verify Spotify OAuth tokens are:  
  - Stored securely (DB or encrypted store, not in frontend).  
  - Refreshed via a dedicated refresh function; no duplication across modules.  
- Ensure access tokens are never logged.  
- Mask sensitive fields in logs.

**6.4. Dependency & header hardening (Medium)**  
- Add `helmet` (if Node/Express) or equivalent for security headers.  
- Enable CORS with explicit allowed origins (frontend host only).  
- Add an NPM/Yarn script like `npm run audit` / `yarn audit` and a GitHub Action to run it on PRs.

---

## 7) Documentation Updates

**7.1. Core documentation (High)**  
- Update root `README.md` to include:  
  - Project overview (EchoTune AI: personalized echo-based music curation via Spotify).  
  - Tech stack (frontend, backend, DB, external APIs).  
  - Quickstart: setup `.env`, run backend, run frontend, open app.  
  - Link to `docs/architecture.md` and `docs/roadmap-ai.md`.[1]

**7.2. API documentation (Medium)**  
- Add `docs/api.md` (or `backend/docs/api.md`) describing:  
  - Spotify proxy endpoints.  
  - Recommendation endpoints and request/response JSON schemas.  
  - Error format.  
- Optionally, scaffold an OpenAPI/Swagger spec (Copilot can generate initial spec from handlers).

**7.3. Frontend component & hook docs (Low)**  
- For key hooks (`useEchoMix`, `useUserTopTracks`), add JSDoc/TSDoc comments describing:  
  - Inputs (params, types).  
  - Returned data and loading/error states.  
- Generate a short `docs/frontend-architecture.md` describing state management and data flow.

---

## 8) Testing & Validation Improvements

**8.1. Establish basic automated tests (High)**  
- Add test frameworks if missing:  
  - Backend: Jest / Vitest / Pytest depending on stack.  
  - Frontend: Jest + React Testing Library.  
- Create tests for:  
  - Spotify client: token logic, rate limit handling, basic endpoint wrappers (mocking HTTP).  
  - Recommendation engine: deterministic behavior given a static input fixture (mock Spotify responses).

**8.2. Integration tests for core flows (Medium)**  
- Backend: an integration test that:  
  - Mocks Spotify API.  
  - Calls `/api/recommendations/mix` with sample user + parameters.  
  - Asserts on resulting track list and explanations.  
- Frontend: a test that:  
  - Renders the “Create Echo Mix” UI.  
  - Fills mood/activity/slider controls.  
  - Mocks API response and verifies tracks and explanations render.

**8.3. CI pipeline basics (Medium)**  
- Add GitHub Actions workflows to run:  
  - `npm test` / `yarn test` (frontend).  
  - Backend test command.  
  - Linting and type-checking (ESLint, TypeScript, etc.).  
- Block merging on failing tests.

---

## 9) Concrete Task List for Next Cycle (Copilot-Ready)

**High Priority**  
1. Standardize repo structure and add root/backend/frontend README files.  
2. Implement centralized Spotify API client with caching and rate-limit handling.  
3. Create recommendation engine abstraction and basic heuristic `generatePersonalizedMix`.  
4. Build “Create Echo Mix” UI with mood/activity/slider controls and explanation display.  
5. Add input validation middleware for all recommendation and playlist endpoints.  
6. Introduce basic test setup (backend + frontend) and write tests for Spotify client + recommendation engine.

**Medium Priority**  
7. Add new endpoints: recently played, recommendations-by-seed, playlist-from-recommendations.  
8. Implement server-side cache for generated mixes keyed by user + parameters.  
9. Optimize React components using hooks, memoization, and code splitting where useful.  
10. Add security hardening: headers, CORS config, secret handling verification, and dependency audits.  
11. Add `docs/architecture.md` and `docs/api.md`.

**Low Priority**  
12. Document roadmap for advanced AI features in `docs/roadmap-ai.md`.  
13. Add performance logging middleware and simple metrics.  
14. Add more comprehensive component/hook docs and higher-coverage tests.

All of these items are structured so a GitHub Copilot agent can implement them step-by-step in separate branches/PRs with minimal human intervention, following standard AI/ML repository and code-quality best practices.[1][5][6]