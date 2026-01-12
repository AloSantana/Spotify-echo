# 🔍 Perplexity Research Results - Cycle 5

**Generated**: 2026-01-12T01:50:36.789811
**Cycle**: 5/5
**Tasks Completed This Cycle**: 3

Here is a proposed, **Copilot-executable** task plan for the next EchoTune AI coding cycle, aligned with your focus areas. I’ll assume a typical stack: React frontend, Node/TypeScript (or Python) backend, Spotify Web API, and an AI/ML recommendations module.

---

## 1. Codebase Structure & Refactoring

**Goal:** Make the repo more modular, analyzable, and easy for Copilot to work in.

### 1.1 Module & folder structure cleanup  
**Priority:** P1  
**Tasks:**
- [ ] Introduce a clear top-level structure:
  - `frontend/` (React app)
  - `backend/` (API + business logic)
  - `ml/` or `services/recommendation/` (AI/ML logic)
  - `scripts/` (one-off scripts, data prep, etc.)
  - `docs/` (markdown documentation)  
- [ ] Create/normalize index files (`index.ts` / `index.js`) in feature folders to re-export internal modules for cleaner imports.  
- [ ] Enforce path aliases (e.g., `@components/`, `@hooks/`, `@services/`) in tsconfig/jsconfig and React build config.

### 1.2 Configuration & environment separation  
**Priority:** P1  
**Tasks:**
- [ ] Introduce a unified `config` module:
  - `config/index.ts` that reads environment variables and centralizes them (Spotify keys, model endpoints, etc.).  
- [ ] Replace hard-coded constants throughout the codebase with imports from the config module, using environment variables for secrets and URLs.[1]  
- [ ] Add `.env.example` with all required variables (no secrets).[1]  

### 1.3 Copilot & repository meta  
**Priority:** P2  
**Tasks:**
- [ ] Add or update:
  - `CONTRIBUTING.md` (how to run, test, branch strategy).[1]  
  - `CODEOWNERS` for key directories (optional but Copilot-friendly).  
- [ ] Add `.editorconfig` and/or Prettier config for consistent formatting.

---

## 2. Music AI/ML Trends & Integration

**Goal:** Prepare for modern recommendation/personalization approaches that are realistic for automated coding.

### 2.1 ML service abstraction  
**Priority:** P1  
**Tasks:**
- [ ] Create an internal interface for recommendation engines, e.g.:
  - `ml/recommender/index.ts` exporting functions like:
    - `getTrackRecommendations(userId, options)`
    - `getPlaylistContinuations(playlistId, options)`
- [ ] Move existing heuristic logic (e.g., based on Spotify audio features) into this module if not already isolated.  
- [ ] Ensure the backend calls this abstraction instead of embedding recommendation logic directly in route handlers.

### 2.2 Embedding / feature-based recommendation hook (non-deep-learning placeholder)  
**Priority:** P2  
**Tasks:**
- [ ] Implement a “hybrid” recommender in `ml/recommender/hybridRecommender.ts` that:
  - Combines Spotify audio features (tempo, energy, valence, etc.) with user history (skips/likes) in a simple scoring function.  
- [ ] Add parameters for:
  - Mood / energy level
  - Tempo range
  - Decade/era preference  
- [ ] Expose these as query parameters to the existing recommendation API endpoint.

### 2.3 Future-proofing for model integration  
**Priority:** P3  
**Tasks:**
- [ ] Define a configuration object to support optional external ML endpoints (e.g. `RECOMMENDER_API_URL`, `RECOMMENDER_API_KEY`).  
- [ ] Implement a stubbed adapter (`ml/recommender/externalModelAdapter.ts`) that:
  - Calls a generic POST endpoint with track/user features.
  - Returns a normalized list of recommended track IDs.
- [ ] Wire feature flags (env var) to switch between internal and external recommender implementations.

---

## 3. Spotify API Usage & Enhancements

**Goal:** Improve efficiency, caching, and UX of Spotify integration.

### 3.1 Centralize Spotify client & error handling  
**Priority:** P1  
**Tasks:**
- [ ] Create `backend/integrations/spotifyClient.ts`:
  - A singleton wrapper around the Spotify Web API SDK or fetch clients.
  - Utility functions: `getUserTopTracks`, `getAudioFeatures`, `getRecommendations`, `refreshAccessToken`, etc.  
- [ ] Implement unified error handling:
  - Map Spotify errors to consistent internal error types / HTTP responses.
  - Log rate limits (429) and retry-after if applicable.

### 3.2 Add basic caching layer  
**Priority:** P1  
**Tasks:**
- [ ] Implement an in-memory cache (e.g., `node-cache` or a small custom map with TTL) for:
  - Audio features by track ID.
  - Static metadata (genres, artists for playlists).  
- [ ] Add function wrappers in `spotifyClient.ts` that:
  - Check cache before calling Spotify.
  - Respect TTLs (e.g., 10–30 minutes for non-personalized data).

### 3.3 Usage pattern analytics (minimal)  
**Priority:** P3  
**Tasks:**
- [ ] Add lightweight logging for:
  - Which Spotify endpoints are called and how often.
  - Error rates per endpoint.  
- [ ] Pipe these logs into a simple JSON file or standard logger for future analysis.

---

## 4. Frontend React Performance & UX

**Goal:** Optimize React components and state for responsiveness, especially around playlist and recommendation views.

### 4.1 Component-level performance audit (automatable)  
**Priority:** P1  
**Tasks:**
- [ ] Identify large components (>200 lines) and split into:
  - Container (data fetching, state).
  - Presentational (pure rendering).  
- [ ] Introduce `React.memo` for pure presentational components.  
- [ ] Wrap expensive callbacks with `useCallback` where props cause unnecessary re-renders.

### 4.2 State management & data fetching  
**Priority:** P1  
**Tasks:**
- [ ] If not present, introduce a data-fetching layer (e.g., React Query or a custom hook pattern):
  - `hooks/useSpotifyData.ts` for queries like `useUserTopTracks`, `useRecommendations`.  
- [ ] Ensure:
  - Caching of results.
  - Automatic refetch on focus/invalidation.
  - Error and loading states are standardized.

### 4.3 Virtualization for large lists  
**Priority:** P2  
**Tasks:**
- [ ] For screens with long track/playlist lists, integrate list virtualization (e.g., `react-window`):
  - Create a `VirtualizedTrackList` component.
  - Replace naive `.map()` renders for large lists.

---

## 5. New Features for Roadmap (Copilot-friendly)

### 5.1 Mood-based playlist generator UI  
**Priority:** P1  
**Tasks:**
- [ ] Add a “Mood Mixer” panel:
  - Sliders/selects for **energy**, **valence (happy/sad)**, and **tempo range**.
  - A “Generate Playlist” button that calls the backend recommender with these parameters.  
- [ ] Display generated playlist as:
  - Track list with basic metadata.
  - “Save to Spotify” button that creates/updates a Spotify playlist.

### 5.2 Session-aware "auto-continue" feature  
**Priority:** P2  
**Tasks:**
- [ ] Add a backend endpoint:
  - `POST /playback/continue` that:
    - Takes current track and history.
    - Returns next N recommended tracks using the recommender.  
- [ ] Frontend:
  - Add a toggle for “Smart Auto-Continue” on the player.
  - When enabled, automatically fetch next tracks when queue is almost empty.

### 5.3 Simple “Insights” dashboard  
**Priority:** P3  
**Tasks:**
- [ ] Backend:
  - Aggregate simple stats: top genres, average tempo, average valence of recent listening.  
- [ ] Frontend:
  - Add an “Insights” view with cards or small charts showing these metrics.

---

## 6. Architecture & Scalability

**Goal:** Improve separation of concerns and set up for scaling.

### 6.1 Layered backend architecture  
**Priority:** P1  
**Tasks:**
- [ ] Refactor routes to call service-layer functions:
  - `services/userService.ts`
  - `services/recommendationService.ts`
  - `services/spotifyService.ts`  
- [ ] Ensure:
  - No direct DB/Spotify calls from controllers.
  - Business logic lives in services, IO logic in integrations.

### 6.2 Async job preparation (for heavy tasks)  
**Priority:** P2  
**Tasks:**
- [ ] Introduce a simple job queue abstraction (in-memory to start) for:
  - Precomputing user embeddings or statistics.
  - Heavy batch Spotify calls.  
- [ ] Provide a `jobs/` directory with a basic interface:
  - `enqueueJob`, `processJobs`, `JobType` enum.

---

## 7. Security Enhancements

**Goal:** Harden secrets handling, input validation, and API boundaries.

### 7.1 Secrets & token management  
**Priority:** P1  
**Tasks:**
- [ ] Ensure all secrets (Spotify client ID/secret, JWT keys, any model API keys) come from environment variables only.[1]  
- [ ] Add runtime checks in `config`:
  - Throw descriptive errors if required env variables are missing.  
- [ ] If using refresh tokens:
  - Confirm tokens are encrypted or at least hashed at rest.

### 7.2 API input validation  
**Priority:** P1  
**Tasks:**
- [ ] Add a validation layer using a schema library (e.g., Zod, Joi, Yup):
  - Define schemas per endpoint (`/recommendations`, `/playlist/generate`, etc.).
  - Validate request bodies and query parameters before service logic is executed.  
- [ ] Return standardized error responses for validation failures.

### 7.3 CORS & auth hardening  
**Priority:** P2  
**Tasks:**
- [ ] Lock down CORS:
  - Explicit allowed origins (frontend URL), methods, and headers.  
- [ ] Confirm:
  - HTTPS-only cookies if using cookies.
  - Secure storage of access tokens on the frontend (avoid localStorage when possible).

---

## 8. Testing & Validation

**Goal:** Improve reliability with tests that Copilot can scaffold.

### 8.1 Backend unit tests  
**Priority:** P1  
**Tasks:**
- [ ] Set up or extend Jest/Vitest/Mocha for backend if not present.  
- [ ] Add tests for:
  - `services/recommendationService.ts` (core logic).  
  - `integrations/spotifyClient.ts` with mocked responses.  
- [ ] Aim for at least:
  - Happy path and a few edge cases per function.

### 8.2 Frontend component & hook tests  
**Priority:** P2  
**Tasks:**
- [ ] Use React Testing Library:
  - Tests for `Mood Mixer` UI interaction and API calls.
  - Tests for `VirtualizedTrackList` rendering and scrolling behavior.  
- [ ] Add snapshot tests for major pages (Home, Insights, Playlist Generator).

### 8.3 Basic end-to-end sanity check  
**Priority:** P3  
**Tasks:**
- [ ] Add a minimal Playwright/Cypress test:
  - Login flow (mocked if necessary).
  - Generate a playlist from mood parameters.
  - Confirm tracks appear and “Save to Spotify” triggers API.

---

## 9. Documentation Updates

**Goal:** Make the project self-explanatory and AI-agent-friendly.

### 9.1 Architecture & flows  
**Priority:** P1  
**Tasks:**
- [ ] Add `docs/architecture.md`:
  - High-level diagram (text description is enough) of frontend, backend, ML, Spotify integration.  
- [ ] Document:
  - Recommendation flow (from UI controls → backend → Spotify/ML → UI).  
  - Key services and where to add new recommendation strategies.

### 9.2 API and feature docs  
**Priority:** P2  
**Tasks:**
- [ ] Add `docs/api.md` listing:
  - All public backend endpoints, parameters, and response shapes.  
- [ ] Update `README.md`:
  - Quick start (install, run, test).
  - Short description of main features (mood-based generator, auto-continue, insights).

---

These tasks are all amenable to automated implementation or scaffolding by a GitHub Copilot agent: they rely on standard patterns, clear file placement, and common tools (React, Node/TS, Jest, validation libraries, etc.). If you share the actual repo layout (top-level folders and key files), I can further map each task to concrete file paths and function names.