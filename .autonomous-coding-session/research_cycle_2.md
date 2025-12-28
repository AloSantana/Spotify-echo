# 🔍 Perplexity Research Results - Cycle 2

**Generated**: 2025-12-28T00:27:25.573388
**Cycle**: 2/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly plan for the **next coding cycle** for EchoTune AI, organized by area and broken into small, automatable tasks.

---

## 1. Repository & Architecture Improvements

**Goal:** Make the repo cleaner, more modular, and scalable, following AI/ML repo best practices.[1]

### 1.1 Structure & Config (High)

- [ ] **Create a top-level `docs/` and `scripts/` folders** and move ad‑hoc utilities and one-off scripts into `scripts/` to reduce clutter (Copilot can assist with updating import paths).[1]  
- [ ] **Introduce central configuration management**:  
  - Add a `config/` directory with e.g. `config/default.json` or `config/*.yaml`.  
  - Refactor hardcoded parameters in backend (API keys, model paths, Spotify scopes, limits) into config + environment variables.[1]  
- [ ] **Add `.env.example` file** listing all required environment variables (Spotify credentials, DB URL, secret keys, model endpoints). Copilot can infer usage from current code.  
- [ ] **Standardize project entry points**:  
  - Ensure backend has a single `server.ts` / `main.py` (depending on stack) and a `README` section “How to run backend/frontend” with consistent commands.[1]

### 1.2 Modularization & Scalability (Medium)

- [ ] **Refactor “God files” into feature modules** (e.g., `spotify/`, `recommendation/`, `auth/`):  
  - Split large service/controller files into smaller ones (target < 300 lines per file, < 50 lines per function, where reasonable).[1]  
- [ ] **Introduce a clear “ports/adapters” layering**:  
  - Create services (pure business logic) separate from integration code (Spotify API, DB, external ML service).  
  - Move direct API/DB calls out of React components into hooks or service modules.  

---

## 2. Spotify API Usage Enhancements

**Goal:** More robust, scalable, and extensible integration.

### 2.1 API Client & Rate Limiting (High)

- [ ] **Create a dedicated Spotify client module** (e.g., `services/spotifyClient.ts`):  
  - Centralize all Spotify REST calls (tracks, playlists, audio features).  
  - Add typed request/response interfaces.  
- [ ] **Implement basic retry & rate‑limit handling**:  
  - Wrap calls to detect 429 responses and backoff using `Retry-After` header.  
  - Add minimal logging of rate-limit occurrences.  
- [ ] **Ensure token refresh logic is centralized**:  
  - If multiple places refresh tokens, consolidate into `auth/spotifyAuthService` and update callers.

### 2.2 New API Capabilities for Roadmap (Medium)

- [ ] **Add endpoint for “mood/energy‑filtered recommendations”**:  
  - Server route that takes mood/energy parameters, calls Spotify’s audio-features endpoint, and filters candidate tracks.  
  - Expose it as `/api/recommendations/mood` for future UI usage.  
- [ ] **Add endpoint for “save generated playlist to Spotify”**:  
  - Given a generated track list, create or update a playlist in user’s account.  
  - Return playlist URL/ID to the frontend.

---

## 3. Music AI/ML Integration Opportunities

**Goal:** Prepare EchoTune for modern music AI capabilities.

### 3.1 ML Service Abstraction (High)

- [ ] **Introduce an internal “ML service” interface** (even if currently rule‑based):  
  - Create `services/mlRecommendationService` with methods like `getTrackRecommendations(userProfile, seedTracks)` and `analyzeTrackFeatures(trackIds)`.  
  - Move existing recommendation logic there so it can later be swapped with a model (e.g., embeddings, transformer-based recommenders).  
- [ ] **Add placeholder for external model endpoint**:  
  - Add config keys for `ML_SERVICE_URL` and stub methods that call it, falling back to current logic if unset.

### 3.2 Future ML Features to Add to Roadmap (Design-Only Now)

Copilot tasks for this cycle should just add **interfaces and stubs**, not full models:

- [ ] Stub: “**Similar tracks via embeddings**” endpoint (server route + service stub).  
- [ ] Stub: “**Playlist coherence score**” calculator (scoring function placeholder using audio features).  

---

## 4. Frontend React Performance & UX

**Goal:** Make UI more responsive, efficient, and ready for richer features.

### 4.1 Component Structure & State Management (High)

- [ ] **Identify heavy components and split them**:  
  - Break large pages into smaller presentational components and container components.  
- [ ] **Move remote and global state out of deep component trees**:  
  - Introduce React Query / SWR (if not present) for data fetching.  
  - Replace repeated `useEffect` + `fetch` patterns with shared hooks like `useSpotifyRecommendations`, `useUserPlaylists`.  
- [ ] **Add memoization**:  
  - Wrap expensive components with `React.memo`.  
  - Use `useMemo`/`useCallback` for derived values and stable handlers passed to child components.

### 4.2 Network & Rendering Optimization (Medium)

- [ ] **Implement API call debouncing for search/autocomplete** (track/artist search box).  
- [ ] **Add lazy loading / code splitting** for heavy views (e.g., analysis or visualization pages) using `React.lazy` + `Suspense`.  
- [ ] **Ensure list rendering uses stable `key` props** and consider `react-window`/`react-virtualized` if large lists of tracks are displayed.

---

## 5. New Features for Next Cycle

**All defined so Copilot can scaffold implementation.**

### 5.1 Feature: “AI‑Enhanced Playlist Tuner” (High)

- [ ] Backend: Add route `/api/playlist/tune` that:  
  - Accepts playlist ID and “target mood/energy/tempo” parameters.  
  - Fetches tracks + audio features, applies simple heuristic adjustments (e.g., include more high-energy tracks), returns new ordered track list.  
- [ ] Frontend:  
  - Add UI panel on playlist page with sliders (mood, energy, danceability) and “Retune Playlist” button.  
  - Display differences (added/removed tracks) before applying.  

### 5.2 Feature: “Session Presets” (Medium)

- [ ] Backend: Add CRUD endpoints for user presets (preferred genres, energy ranges, time-of-day).  
- [ ] Frontend: Create “Presets” section where users can save and load configurations for recommendation sessions.

### 5.3 Feature: “Explain My Mix” (Medium)

- [ ] Backend: Add endpoint `/api/recommendations/explain` returning human-readable explanations per track (e.g., “High energy, similar to your liked track X”).  
- [ ] Frontend: Add expandable explanation text under each recommended track card.

---

## 6. Security Enhancements

**Goal:** Improve security posture with changes Copilot can implement automatically.[1][2][3]

- [ ] **Replace any hardcoded secrets** with environment variables and remove from repo; add corresponding entries in `.env.example`.[1][3]  
- [ ] **Add basic input validation on API routes**:  
  - Use a schema validator (e.g., Zod/Joi/Yup) for request bodies and query params (playlist IDs, user IDs, feature ranges).  
- [ ] **Enforce HTTPS-only cookies and secure session handling** (if session-based auth is used).  
- [ ] **Add minimal authorization checks**:  
  - Ensure user-specific routes validate that the authenticated user can access the requested playlist or profile.  
- [ ] **Add security headers middleware** (e.g., Helmet for Node/Express) and ensure CORS is minimally permissive.

---

## 7. Testing & Validation Improvements

**Goal:** Reliable, automatable tests that Copilot can generate and extend.[1][2][3]

### 7.1 Backend Tests (High)

- [ ] **Introduce or extend test framework** (Jest / Vitest / Pytest depending on stack).  
- [ ] Add tests for:  
  - Spotify client wrapper (mock HTTP, test error/rate-limit handling).  
  - Recommendation service logic (given input features, assert track selection ordering).  
  - Auth/token refresh flows.  
- [ ] **Add minimal coverage threshold** in test config (e.g., 60–70%) to start.

### 7.2 Frontend Tests (Medium)

- [ ] **Add component tests** with React Testing Library:  
  - Playlist tuner UI: ensure sliders update state and call API on apply.  
  - Recommendations list: renders tracks, shows loading/error states.  
- [ ] **Add simple e2e tests** (Playwright/Cypress):  
  - Auth + basic flow: login → select playlist → request recommendations.

---

## 8. Documentation Updates

**Goal:** Reach “Professional” repository standards with clear docs.[1]

- [ ] **Update `README`** with:  
  - High-level architecture diagram or description (frontend, backend, Spotify, ML service).  
  - Step-by-step setup for local dev, including Spotify app registration and environment variables.[1]  
- [ ] **Add `docs/architecture.md`** describing module structure (Spotify integration, ML abstraction, recommendation flow).  
- [ ] **Add `docs/api.md`** documenting main API endpoints (parameters, responses), especially new ones: `/playlist/tune`, `/recommendations/mood`, `/recommendations/explain`.  
- [ ] **Create `CONTRIBUTING.md`** with coding standards, testing commands, and PR checklist that aligns with AI-assisted reviews (e.g., “Run tests”, “Get Copilot review”).[1][2][3]  

---

## 9. Copilot-Specific Workflow Enhancements

**Goal:** Make it easy for Copilot agents to operate effectively on the repo.[2][3][6]

- [ ] **Add or refine `.github/workflows/*` CI** to run tests and lint on PRs so Copilot’s suggestions can be validated automatically.  
- [ ] **Add `.copilot` or `.github/copilot-instructions.md`** (if available in your setup) with short project context, coding style, and key modules so Copilot’s generations are more aligned.  
- [ ] **Configure GitHub Code Review AI** (Copilot / other) to auto-review all PRs touching `services/spotify*`, `services/ml*`, and `frontend/src/hooks/*`.[2][3]  

---

### Suggested Priority Breakdown for Next Cycle

**P1 (must do next cycle)**  
- Spotify client consolidation + rate limiting  
- ML service abstraction (no heavy modeling)  
- Playlist tuner feature (backend + basic UI)  
- Security: secrets to env, input validation on main routes  
- Backend tests for Spotify and recommendation services  
- README + `.env.example` updates  

**P2 (if time allows)**  
- Explain My Mix API + UI  
- React performance improvements (hooks, memoization, lazy loading)  
- Frontend tests for key components  
- Architecture and API docs  

**P3 (stretch)**  
- Session presets feature  
- e2e test setup  
- Code splitting and virtualized lists for very large track sets  

All tasks above are decomposed so a GitHub Copilot coding agent can implement them incrementally via PRs with minimal manual intervention.