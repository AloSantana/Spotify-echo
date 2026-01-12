# 🔍 Perplexity Research Results - Cycle 3

**Generated**: 2026-01-12T01:49:05.575244
**Cycle**: 3/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly task plan for the next coding cycle, organized by area and priority, and written so that an automated agent can execute it with minimal clarification.

---

## 1. Codebase Structure & Refactoring

**Goal:** Make the repo easier for Copilot and humans to navigate and extend.

### Tasks

1. **Standardize project structure**  
   - [P1] Create or update a clear top-level structure:  
     - `frontend/` (React app)  
     - `backend/` (API, ML orchestration, Spotify integration)  
     - `ml/` or `models/` (music AI models, experiments)  
     - `scripts/` (utility scripts, data prep)  
     - `docs/`  
   - Ensure each subfolder has a short `README.md` explaining its purpose.

2. **Introduce/configure linting & formatting**  
   - [P1] Add ESLint + Prettier for React (TypeScript if used), with a standard config (`airbnb`, `react-app`, or similar).  
   - [P2] Add a formatter/linter for backend language (e.g., `black` + `ruff` for Python, or `eslint` for Node).  
   - [P2] Add basic pre-commit hooks (e.g., `husky` + `lint-staged` or `pre-commit` for Python) so Copilot changes get auto-formatted.

3. **Refactor large/complex files**  
   - [P1] Identify any file > 300–400 lines or with multiple responsibilities (e.g., a React page container that manages state, rendering, and API calls).  
   - Split into:  
     - **UI-only components**  
     - **hooks** (e.g., `useEchoTuneSession`, `useSpotifyPlayback`, `useTrackAnalysis`)  
     - **API client modules** (e.g., `spotifyClient.ts`, `analysisClient.ts`).

4. **Centralize environment/config management**  
   - [P1] Create a single config module per side:  
     - `backend/config.py` or `backend/src/config.ts`  
     - `frontend/src/config.ts`  
   - Load runtime config from environment variables, never hardcode API keys or Spotify secrets.

---

## 2. Music AI/ML Integration & Roadmap

**Goal:** Move toward modern music AI capabilities that Copilot can wire up around existing infra.

### New feature tasks

1. **Track audio feature analysis endpoint**  
   - [P1] Backend: add endpoint `POST /api/analysis/audio-features` that:  
     - Accepts Spotify track IDs or raw audio URL.  
     - Calls Spotify’s audio features endpoint as a baseline.  
     - Prepares a stub for future in-house model inference (e.g., function `run_advanced_music_model`).  
   - [P2] Add minimal persistence (e.g., cache results in a simple DB table or KV store keyed by track ID).

2. **Personalized playlist “EchoTune Mix” prototype**  
   - [P2] Backend: add `POST /api/playlists/echotune-mix` that:  
     - Accepts user seed tracks or genres.  
     - Uses Spotify recommendations endpoint with tuning params (tempo, energy, valence).  
   - [P2] Frontend: create a simple UI to generate and preview this mix (list of tracks, play buttons, “save to Spotify” button).

3. **Roadmap placeholders for advanced models (non-urgent stubs)**  
   - [P3] Create modules with clean interfaces only (no heavy logic yet):  
     - `ml/genre_classifier.py` or `ml/genre_classifier.ts`  
     - `ml/mood_estimator.py`  
   - Each file should define clear function signatures and docstrings describing expected inputs/outputs so Copilot can later fill in model code.

---

## 3. Spotify API Usage Enhancements

**Goal:** Make integration robust, reusable, and ready for future features.

### Tasks

1. **Central Spotify client module**  
   - [P1] Create `backend/integrations/spotify_client.(py|ts)` with:  
     - Typed methods for all used endpoints:  
       - Auth & token refresh  
       - Get user profile  
       - Get playback state  
       - Get audio features  
       - Get recommendations  
       - Create/update playlists  
     - Unified error handling and rate-limit handling (e.g., retry on 429 with `Retry-After` header).

2. **Token management hardening**  
   - [P1] Add helpers to:  
     - Refresh access tokens automatically when expired.  
     - Store refresh tokens securely.  
   - [P2] Ensure all Spotify calls go through a single function that injects auth headers, so Copilot doesn’t duplicate auth logic in multiple places.

3. **Logging & metrics for Spotify calls**  
   - [P2] Add minimal logging: endpoint name, status code, latency, and limited request context (no PII or tokens).  
   - [P3] Expose a simple internal `/health/integrations` endpoint that checks Spotify availability via a lightweight call.

---

## 4. React Frontend Performance & Structure

**Goal:** Improve performance and maintainability without changing UX.

### Tasks

1. **Component-level performance optimization**  
   - [P1] Identify heavy components (dashboards, track lists, visualizers). Apply:  
     - `React.memo` for pure presentational components.  
     - `useMemo` and `useCallback` for expensive calculations and stable callbacks.  
   - Ensure prop shapes are stable to avoid unnecessary re-renders.

2. **Code-split large routes**  
   - [P2] Use `React.lazy` and `Suspense` (or router-level code splitting) for pages like:  
     - Analytics dashboard  
     - Playlist builder  
     - Settings  
   - Ensure loading states are shown while bundles load.

3. **Abstract API calls into hooks/services**  
   - [P1] Create hooks such as:  
     - `useSpotifyUser`  
     - `useCurrentPlayback`  
     - `useTrackAnalysis(trackId)`  
   - Move `fetch`/`axios` logic out of components into `/src/api` or `/src/hooks`.

4. **Accessibility & UI polish (Copilot-friendly)**  
   - [P3] Ensure interactive elements use semantic HTML and `aria-` attributes.  
   - Standardize button and input components into reusable primitives (`<Button>`, `<TextField>`, etc.).

---

## 5. Architecture & Scalability

**Goal:** Move toward a clean, service-oriented layout that is easy to scale.

### Tasks

1. **Define clear domain layers in backend**  
   - [P1] Split into:  
     - `routes` / `controllers` (HTTP handling)  
     - `services` (business logic: recommendation, session management, analysis orchestration)  
     - `integrations` (Spotify, model API, external services)  
     - `models` / `repositories` (DB access).  
   - Add lightweight type hints and docstrings for each service function.

2. **Introduce basic task queue interface (future-ready)**  
   - [P3] Add an abstraction for async jobs (long-running analysis):  
     - Define interface `enqueueAnalysisJob(trackId, userId)` and `getJobStatus(jobId)`.  
     - Implementation can be in-memory stub initially, but interface should assume an external queue (Redis/Celery/BullMQ).

3. **Configuration for multiple environments**  
   - [P2] Separate `development`, `staging`, and `production` configs using env vars.  
   - Ensure Spotify redirect URIs and client IDs can be set per environment.

---

## 6. Security Enhancements

**Goal:** Eliminate obvious risks; apply standard web and OAuth best practices.

### Tasks

1. **Secrets & credentials handling**  
   - [P1] Verify no Spotify client secrets or tokens are committed.  
   - Add `.env.example` with placeholders and explain usage in README.  
   - Ensure config loads secrets exclusively from environment variables.

2. **OAuth & callback hardening**  
   - [P1] Enforce strict redirect URIs and state parameter verification for Spotify auth.  
   - Validate that access tokens belong to the expected user where relevant.

3. **Input validation & sanitization**  
   - [P2] Add request schema validation for key endpoints (e.g., using `zod`, `pydantic`, or similar).  
   - Validate user-provided playlist names, search queries, and any text fields.

4. **CORS and headers**  
   - [P2] Configure CORS to only allow trusted frontend origins.  
   - Add standard security headers (e.g., via middleware):  
     - `Content-Security-Policy` (basic)  
     - `X-Content-Type-Options: nosniff`  
     - `X-Frame-Options: DENY` (unless embedding is required).

---

## 7. Documentation Updates

**Goal:** Make the repo self-explanatory and AI-friendly for future automation.[1]

### Tasks

1. **Top-level README overhaul**  
   - [P1] Ensure README covers:  
     - Project overview (what EchoTune AI does).  
     - High-level architecture diagram (can be text-based for now).  
     - Quickstart: setup, env vars, running frontend and backend.  
     - How Spotify integration works (auth flow).  
     - How to run tests.  

2. **API documentation**  
   - [P2] Add an OpenAPI/Swagger spec or a simple `docs/api.md` listing key endpoints, params, and responses.  
   - Keep this in sync with new analysis and playlist endpoints.

3. **Developer guide**  
   - [P3] Add `docs/development.md` with:  
     - Coding standards (linting, formatting, directory conventions).  
     - How to add a new endpoint or React page.  
     - How to work with Copilot (e.g., prompt examples for this repo).

---

## 8. Testing & Validation Improvements

**Goal:** Establish a minimal but meaningful test baseline that Copilot can expand.

### Tasks

1. **Set up baseline test framework**  
   - [P1] Backend: configure `pytest` or language-appropriate test runner; add sample tests for:  
     - One core Spotify service function (mocking HTTP).  
     - One analysis endpoint (unit or integration).  
   - [P1] Frontend: configure `Jest` + `React Testing Library` (or framework default); add:  
     - Test for a key page that ensures main UI elements render and handle a simple user interaction.

2. **Add CI workflow**  
   - [P1] GitHub Actions workflow that:  
     - Runs lint + tests on push and PR.  
     - Fails on lint or test errors so Copilot-generated PRs get automatic feedback.

3. **Snapshot tests for critical UIs**  
   - [P2] Add a small set of snapshot tests for:  
     - Dashboard view  
     - Playlist builder  
   - This gives Copilot a safety net when refactoring visual structure.

4. **Mocking external dependencies**  
   - [P2] Create reusable Spotify API mock fixtures so tests never hit real Spotify APIs.  
   - Ensure env vars for tests use dummy values.

---

## Prioritized Next-Cycle Task List (Copilot-friendly)

For the next cycle, focusing on what yields the most leverage and is straightforward for Copilot:

**High priority (P1) candidates for immediate implementation:**

1. Standardize repo structure and add sub-`README`s.  
2. Add ESLint + Prettier (frontend) and formatter + linter (backend).  
3. Refactor any overgrown React containers into smaller components + hooks.  
4. Create centralized `spotify_client` module and route all Spotify calls through it.  
5. Implement `POST /api/analysis/audio-features` backend endpoint + simple frontend hook.  
6. Harden OAuth token handling and secret management (env-based).  
7. Add basic backend and frontend test frameworks with 1–2 example tests each.  
8. Add GitHub Actions workflow for lint + test on push/PR.  

**Medium priority (P2) for the same or following cycle (if capacity allows):**

1. React performance tweaks (`React.memo`, `useMemo`, code-splitting).  
2. Simple “EchoTune Mix” playlist generator endpoint + UI.  
3. Basic CORS/security headers and request validation.  
4. OpenAPI or `docs/api.md` for main endpoints.  

These tasks are structured so a GitHub Copilot agent can:  
- Work file-by-file,  
- Follow clear naming patterns,  
- Rely on standard frameworks and libraries,  
- And validate work via the added test/CI scaffolding.