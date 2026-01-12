# 🔍 Perplexity Research Results - Cycle 2

**Generated**: 2026-01-12T01:48:17.307532
**Cycle**: 2/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly task plan for the next coding cycle, structured by area and written so that an autonomous coding agent can execute it with minimal ambiguity.

---

## 1. Codebase Structure & Refactoring

**Goal:** Make the EchoTune AI repo easier to navigate, safer to extend, and more automation-friendly.[1]

### Tasks

1. **Standardize repository layout (Priority: High)**  
   - Create or update a top-level structure like:
     - `backend/` (API, Spotify integration, ML orchestration)
     - `frontend/` (React app)
     - `models/` or `ml/` (training, inference pipelines)
     - `scripts/` (CLI utilities, maintenance scripts)
     - `tests/` (backend + frontend tests)
     - `docs/` (architecture, API, setup)  
   - Ensure shared utilities are moved to `backend/common/` or `backend/utils/` and remove duplicate helper code.

2. **Introduce/normalize module boundaries (Priority: Medium)**  
   - Group backend modules into:
     - `services/` (Spotify, recommendation, user profiles)
     - `routes/` or `controllers/` (HTTP handlers)
     - `repositories/` (DB access if applicable)
     - `core/` (domain logic: tracks, playlists, features)  
   - Update imports to use these new module paths.

3. **Add configuration system with environment variables (Priority: High)**  
   - Create `backend/config/index.(ts|js)` that:
     - Reads env vars (Spotify keys, DB URL, model paths, etc.).
     - Performs basic validation (throw error if required env vars missing).
   - Replace any hardcoded secrets/URLs with config access.[1]

4. **Introduce consistent logging wrapper (Priority: Medium)**  
   - Implement `backend/common/logger.(ts|js)` using console or a logging library.
   - Replace scattered `console.log` calls with structured logging calls (info/warn/error).

---

## 2. Music AI/ML Trends & Integration Tasks

**Goal:** Modernize music intelligence features and prep for future ML integrations.

### Tasks

1. **Centralize ML inference interface (Priority: High)**  
   - Create `backend/services/mlService.(ts|js)` with functions:
     - `analyzeTrack(audioUrl | spotifyTrackId)`
     - `recommendTracksForUser(userId, options)`
     - `summarizeUserTaste(userId)`  
   - Internally call existing ML logic, but ensure a single public interface.

2. **Add embedding-based recommendation scaffold (Priority: Medium)**  
   - Create a module `backend/core/embeddings.(ts|js)` that:
     - Defines a type for track embeddings (e.g., `number[]`).
     - Adds functions:
       - `computeTrackEmbedding(trackFeatures)` (placeholder calling existing models or stubs).
       - `similarTracks(trackId, topK)` (stub using cosine similarity over in-memory list).  
   - Wire this into `mlService.recommendTracksForUser` behind a feature flag (env var).

3. **Add “mood / vibe” tagging scaffold (Priority: Low)**  
   - Define a `MoodTag` type and a mapping function:
     - `inferMoodTagsFromFeatures(features): MoodTag[]`.  
   - Initially implement rule-based logic using loudness/valence/energy (Spotify audio features), so Copilot can implement simple heuristics.  
   - Expose endpoint `/api/tracks/:id/mood-tags` (backend) and a hook on frontend to call it (see React section).

4. **Model configuration and dependency isolation (Priority: Medium)**  
   - Move any model download paths, model names, and thresholds into a single config file `ml/config.(ts|js)` or `ml/config.yaml` read by code.  
   - Add comments/Docstrings describing each parameter and expected ranges.

---

## 3. Spotify API Usage Enhancements

**Goal:** Harden Spotify integration, reduce rate-limit issues, and prepare for future endpoints.

### Tasks

1. **Create dedicated Spotify client service (Priority: High)**  
   - Implement `backend/services/spotifyClient.(ts|js)` that:
     - Wraps all Spotify API calls.
     - Handles token refresh internally.
     - Centralizes base URL, headers, error handling.  
   - Refactor existing code to use this service exclusively.

2. **Implement basic request retry & rate-limit handling (Priority: High)**  
   - In `spotifyClient`, detect 429 and retry after `Retry-After` header.  
   - Add limited exponential backoff for transient 5xx errors.  
   - Surface clear error messages for frontend.

3. **Introduce caching layer for Spotify calls (Priority: Medium)**  
   - Implement simple in-memory cache (e.g., Map with TTL) or use a pluggable cache module.  
   - Cache:
     - Track details
     - Audio features
     - User’s top tracks/artists  
   - Add configuration for cache TTL via env.

4. **Add new endpoints usage scaffolding (Priority: Low)**  
   - Add functions in `spotifyClient` for:
     - Getting user’s recent listening history.
     - Getting user’s saved tracks.  
   - Create but do not fully expose in UI yet; just expose backend endpoints (`/api/spotify/recent`, `/api/spotify/saved`) for future use.

---

## 4. Frontend React Performance & Structure

**Goal:** Make the React app more performant, modular, and Copilot-friendly.

### Tasks

1. **Component hierarchy cleanup (Priority: High)**  
   - Create directories:
     - `src/components/`
     - `src/hooks/`
     - `src/pages/`
     - `src/context/`
     - `src/services/`  
   - Move generic components (buttons, cards, layout) into `components/common/`.  
   - Move page-level containers into `pages/` (e.g., `DashboardPage`, `TrackDetailPage`).

2. **Introduce React Query (or central API hook) (Priority: High)**  
   - If not present, add a data fetching layer (e.g., React Query or custom hook):
     - `useApi` wrapper or `apiClient` module in `src/services/apiClient.ts`.  
   - Convert main data-fetching components (user recommendations, track analysis view) to use this layer for caching and error handling.

3. **Memoization & re-render reduction (Priority: Medium)**  
   - Identify heavy components (charts, large lists).  
   - Apply:
     - `React.memo` to pure presentational components.
     - `useMemo` and `useCallback` where dependencies are stable.  
   - Ensure props for memoized components are stable (restructure state accordingly).

4. **Code-splitting for heavy routes (Priority: Medium)**  
   - Use `React.lazy` and `Suspense` for:
     - Analytics-heavy pages
     - Any ML visualization dashboard  
   - Confirm that initial bundle size is reduced (Copilot can rely on basic dynamic import patterns).

5. **Add “Mood Tags” UI stub (Priority: Low)**  
   - Create a component `TrackMoodTags` that:
     - Accepts `trackId`
     - Calls `/api/tracks/:id/mood-tags`
     - Renders tags as chips  
   - Integrate into the track details or “Now Analyzing” view.

---

## 5. New Features for Roadmap (Copilot-executable parts)

### 5.1 User Taste Profile View (Priority: High)

**Backend:**
- Add endpoint `/api/users/:id/taste-profile` that aggregates:
  - Top genres, artists, moods, and key audio feature stats.
  - Provides a compact JSON structure.

**Frontend:**
- Add `TasteProfilePage`:
  - Displays simple charts or lists (Copilot can use a basic chart library already in project or fallback to textual lists).
  - Link from navigation (e.g., “My Taste Profile”).

### 5.2 “Smart Playlist Seed” Generator (Priority: Medium)

**Backend:**
- Endpoint `/api/users/:id/playlist-seed`:
  - Combines user top tracks + ML-based recommendations (via `mlService`).
  - Returns a list of candidate tracks.

**Frontend:**
- Component `PlaylistSeedCreator`:
  - Shows suggested tracks with checkboxes.
  - Button “Export to Spotify” (uses existing playlist creation logic, or stub if not yet present).

### 5.3 Session-based Recommendations (Priority: Low)

**Backend:**
- Add endpoint that accepts “current context” (time of day, mood tag, energy preference) and returns recommended tracks using rule-based logic + existing features.

**Frontend:**
- Simple control panel (sliders/toggles) to capture context and show results.

---

## 6. Architecture & Scalability Improvements

**Goal:** Prepare for growing traffic and larger ML workloads.

### Tasks

1. **Introduce clear layer separation (Priority: High)**  
   - Enforce:
     - Routing layer (Express/FastAPI/etc.)
     - Service layer (business logic)
     - Data/adapter layer (Spotify, DB, ML).  
   - Copilot can move functions accordingly and adjust imports.

2. **Add basic health and readiness endpoints (Priority: Medium)**  
   - Implement `/health` (process-level OK) and `/readiness` (checks Spotify API connectivity and required services).  
   - Return simple JSON status and HTTP codes.

3. **Prepare for asynchronous jobs (Priority: Medium)**  
   - Add a service abstraction for background jobs (even if implemented as in-process queue initially).  
   - Define interfaces for tasks like:
     - Batch track analysis
     - Playlist re-computation  
   - Use this in endpoints that may become long-running in the future.

4. **Add basic rate limiting on backend routes (Priority: Medium)**  
   - Apply a middleware-based rate limiter per IP or per user for heavier endpoints (recommendations, analysis) to avoid overload.

---

## 7. Security Enhancements

**Goal:** Remove obvious vulnerabilities and improve secret handling.[1][4]

### Tasks

1. **Secrets & config hygiene (Priority: High)**  
   - Ensure:
     - No API keys, tokens, or client secrets committed to repo.
     - `.env.example` lists required env vars without real values.
   - Replace any inline secrets with `process.env.*` (or equivalent).

2. **Input validation and sanitization (Priority: High)**  
   - Add validation layer for all public endpoints:
     - Use a schema library (e.g., Zod / Joi) or manual validation.
   - Validate:
     - IDs (Spotify track/user IDs)
     - Query params (pagination, filter values)
     - Body payloads (preferences, options).

3. **Auth & token handling review (Priority: Medium)**  
   - Ensure access tokens are:
     - Stored securely (httpOnly cookies or secure storage).
     - Never logged.
   - Add checks that user-specific endpoints require authenticated user context.

4. **CORS & headers hardening (Priority: Medium)**  
   - Explicitly configure CORS allowed origins.
   - Add basic security headers (via middleware) such as:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options`
     - `Content-Security-Policy` (basic version).

---

## 8. Testing & Validation

**Goal:** Increase confidence so Copilot changes can be verified automatically.[1][4][5]

### Tasks

1. **Set up unified testing framework (Priority: High)**  
   - If missing:
     - Backend: Jest / Vitest / Pytest (depending on stack).
     - Frontend: Jest + React Testing Library / Vitest + RTL.  
   - Add npm/yarn scripts: `test`, `test:backend`, `test:frontend`.

2. **Add smoke tests for critical flows (Priority: High)**  
   - Backend tests:
     - Spotify API wrapper: mock responses and test error handling.
     - `mlService`: test that it calls underlying modules and returns expected shape.  
   - Frontend tests:
     - Rendering of main dashboard.
     - Data fetch of recommendations list (mock API client).

3. **Introduce basic integration tests (Priority: Medium)**  
   - Use supertest or similar to test main API endpoints end-to-end with mocked external services.  
   - Cover:
     - `/api/recommendations`
     - `/api/users/:id/taste-profile`
     - `/api/tracks/:id/mood-tags`

4. **Add pre-commit / CI checks (Priority: Medium)**  
   - Add:
     - Linter script (ESLint / equivalent).
     - Formatter script (Prettier / equivalent).
   - Configure GitHub Actions (or existing CI) to run:
     - Lint
     - Tests
     - (Optionally) type checking

---

## 9. Documentation Updates

**Goal:** Improve discoverability and align with professional/elite repo standards.[1]

### Tasks

1. **Update root README (Priority: High)**  
   - Include:
     - Project overview & main features.
     - Tech stack (backend, frontend, ML).
     - Setup instructions (with `npm`/`yarn`/`pip` commands).
     - How to configure Spotify credentials and env vars.
     - How to run tests.

2. **Add ARCHITECTURE.md (Priority: Medium)**  
   - Diagram or bullet explanation of:
     - Data flow: User → Frontend → Backend → Spotify + ML → Response.
     - Module boundaries (services, routes, core).  
   - Describe key ML components and their responsibilities.

3. **Add API documentation stub (Priority: Medium)**  
   - Create `docs/api.md` listing:
     - Key endpoints with method, path, and request/response examples.
   - Keep format simple (Markdown) for Copilot to extend easily.

4. **Document development workflows (Priority: Low)**  
   - Create `docs/development.md` describing:
     - How to run backend + frontend concurrently.
     - Common commands.
     - How to run a “full recommendation run” end-to-end.

---

## Suggested Priority Ordering for Next Cycle

For the upcoming coding cycle, focusing on what brings immediate structural and product value while being highly automatable:

1. **High Priority set**
   - Standardize repo layout.
   - Central config and env handling.
   - Spotify client service + rate-limit handling.
   - React API/data layer and component reorganization.
   - Taste Profile backend + basic frontend page.
   - Testing framework + smoke tests.
   - README update.

2. **Medium Priority set**
   - ML service abstraction and embedding scaffold.
   - Caching of Spotify calls.
   - Logging wrapper and health/readiness endpoints.
   - React memoization and code-splitting.
   - Basic integration tests and CI pipeline.

3. **Low Priority set**
   - Mood tags feature (backend + UI).
   - Session-based recommendations.
   - Background job abstraction.
   - Additional documentation and dev workflow docs.

All of these tasks are phrased so a GitHub Copilot coding agent can work file-by-file: create modules, move code into clear layers, wire endpoints, write straightforward tests, and extend documentation with minimal human guidance.