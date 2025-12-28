# 🔍 Perplexity Research Results - Cycle 5

**Generated**: 2025-12-28T00:29:02.356014
**Cycle**: 5/5
**Tasks Completed This Cycle**: 3

Here is a concrete, Copilot-friendly task plan for the next coding cycle, structured by focus area and written so an automated agent can execute them file-by-file.

---

## 1. Repository & Architecture Improvements

**Task A1 – Enforce clear project structure**  
**Priority:** High  
**Goal:** Make repo consistent and navigable for Copilot and humans.

Actions:
- Ensure a standard structure like:
  - `frontend/` (React app)
  - `backend/` (API, Spotify integration, ML orchestration)
  - `ml/` or `services/ai/` (EchoTune AI models, pipelines)
  - `scripts/` (utilities, one-off tools)
  - `docs/` (architecture, API, feature docs)
- Add or update top-level `README.md` to:
  - Describe each top-level folder
  - Provide basic setup/run instructions for frontend/backend/ML services.
- Add `CONTRIBUTING.md` with:
  - Coding style conventions
  - Branch/PR guidelines
  - How to run tests and linting.

---

**Task A2 – Centralize configuration & environment handling**  
**Priority:** High  

Actions (backend & ML):
- Introduce `config/` module with:
  - `config/default.ts` or `.py` and environment-specific overrides (`development`, `production`, `test`).
- Load secrets strictly from environment variables:
  - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, callback URL, DB URL, JWT secret, etc.
- Add `.env.example` with non-sensitive placeholders.
- Ensure no secrets are hardcoded; Copilot can scan for likely secrets and replace with config calls.

---

**Task A3 – Add minimal architecture documentation**  
**Priority:** Medium  

Actions:
- Create `docs/architecture.md` explaining:
  - Overall flow: frontend → backend → Spotify API → AI models.
  - Main services: auth, playlist analysis, recommendation, track preview/generation, etc.
- Create `docs/ai-pipeline.md`:
  - Document models used, inputs/outputs, where models are loaded, latency expectations.
- Add simple sequence diagram in Markdown (ASCII or plantuml block) that Copilot can fill in from code.

---

## 2. Spotify API Usage & Enhancements

**Task S1 – Centralize Spotify client and token handling**  
**Priority:** High  

Actions:
- Create a `backend/src/spotify/spotifyClient.(ts|js|py)`:
  - One function/class to:
    - Manage OAuth tokens (refresh when expired).
    - Wrap Spotify Web API client initialization.
  - Provide helper functions:
    - `getUserProfile()`
    - `getUserPlaylists()`
    - `getPlaylistTracks(playlistId)`
    - `getAudioFeatures(trackIds)`
- Replace scattered/raw Spotify calls with the centralized client.

---

**Task S2 – Implement rate-limit and error handling middleware**  
**Priority:** High  

Actions:
- In Spotify client wrapper:
  - Handle HTTP 429 (rate limited): read `Retry-After` header and backoff or propagate structured error.
  - Normalize errors into an internal error format (e.g. `{ code, message, status }`).
- Add retry logic with jitter for transient 5xx errors (max 2–3 retries).
- Update all Spotify-calling routes/controllers to:
  - Use try/catch with standardized error response.
  - Log error context (endpoint, user ID, playlist ID).

---

**Task S3 – Extend use of audio features and recommendations**  
**Priority:** Medium  

Actions (new functionality Copilot can infer from Spotify docs):
- Add backend route: `GET /api/spotify/audio-features?trackIds=...`
  - Uses `getAudioFeatures` helper.
- Add backend route: `POST /api/spotify/recommendations`
  - Accepts seed tracks/artists/genres and target audio features.
  - Calls Spotify `recommendations` endpoint.
- Integrate these into the AI layer (if present) as inputs for model-based personalization.

---

## 3. AI/ML Trends & Integration Tasks

**Task M1 – Add modular “model adapter” layer**  
**Priority:** High  

Goal: Make it easy to swap/extend models (local or third-party).

Actions:
- Create `backend/src/ai/` or `ml/adapters/` with:
  - `BaseModelAdapter` interface: `analyzePlaylist`, `generatePlaylist`, `explainSuggestion`, etc.
  - Implement current logic as `EchoTuneModelAdapter`.
- Update existing AI routes/services to:
  - Depend on `BaseModelAdapter`, not on concrete model implementation.
- Add simple factory/config to choose adapter by env (e.g., `ECHO_TUNE`, `OPENAI`, `LOCAL_LLM`).

---

**Task M2 – Introduce “Explainable Recommendations” endpoint**  
**Priority:** Medium  

Trend: XAI / explainable personalization.

Actions:
- Add backend route: `POST /api/ai/explain-recommendations`
  - Input: selected playlist + recommended tracks.
  - Returns: natural-language explanation (e.g., “These tracks match your preference for high-energy, danceability 0.7–0.9 …”).
- Implement using existing model or an LLM via simple prompt template:
  - Template code in `backend/src/ai/prompts/explainRecommendations.ts`.
- Wire to frontend (simple UI addition, see F3).

---

**Task M3 – Integrate basic “mood/intent” classification**  
**Priority:** Low  

Actions:
- Add function `classifyMoodFromTracks(audioFeatures)` in AI layer:
  - Uses heuristics or small model to map tempo/energy/valence to tags (e.g., “chill”, “focus”, “party”).
- Expose via `POST /api/ai/mood` endpoint.
- Store mood labels in a typed response model for reuse in UI.

---

## 4. Frontend (React) Performance & UX

**Task F1 – Enable code-splitting and lazy loading**  
**Priority:** High  

Actions:
- Identify large route-based pages (e.g., `Dashboard`, `PlaylistDetail`, `AIRecommendations`).
- Replace static imports with:
  - `React.lazy(() => import('./Dashboard'))` and `<Suspense>`.
- Ensure error boundaries are defined for lazy-loaded routes.

---

**Task F2 – Audit and optimize state management**  
**Priority:** Medium  

Actions:
- Identify global state (auth, user profile, selected playlist, AI results).
- If using React Context heavily:
  - Extract “heavy” state to a dedicated store (e.g., Redux Toolkit, Zustand, or RTK Query for data).
- Avoid re-renders:
  - Use `React.memo`, `useCallback`, `useMemo` for expensive list components and callbacks passed deep in tree.
- For large lists (tracks/playlists), wrap in a virtualization component (e.g., `react-window` or hand-rolled if not using libs).

---

**Task F3 – Add “Why this recommendation?” UI panel**  
**Priority:** Medium  

Actions:
- Add a component `RecommendationExplanationPanel`:
  - Shows explanation returned from `/api/ai/explain-recommendations`.
- Add a “Why?” button next to each recommended track or at top of recommendations section that:
  - Calls backend endpoint.
  - Displays explanation in a modal or side panel.
- Ensure loading/error states are handled gracefully.

---

**Task F4 – Improve loading and error UX for Spotify-dependent views**  
**Priority:** Medium  

Actions:
- Wrap playlist and recommendations views with clear:
  - Loading spinners/skeletons.
  - User-visible Spotify error messages (rate limit, auth expired).
- Centralize error handling hook: `useApiErrorHandler` that:
  - Maps backend error codes to user-friendly messages.
  - Optionally triggers re-auth flow when needed.

---

## 5. Code Quality & Refactoring

**Task Q1 – Add linting, formatting, and basic type safety**  
**Priority:** High  

Actions:
- For JS/TS:
  - Add `eslint` with recommended + React/Node rules.
  - Add `prettier` config.
  - Optionally integrate TypeScript if not already:
    - Add `tsconfig` for frontend and backend.
- Add npm/yarn scripts:
  - `"lint"`, `"format"`, `"typecheck"` (if TS).
- Add `.editorconfig` for basic consistency.

---

**Task Q2 – Refactor “god” modules into smaller, testable units**  
**Priority:** Medium  

Actions:
- Identify any files > 300–400 lines or with many responsibilities (e.g., combined routing + business logic + data access).
- Split into:
  - `controllers/` (HTTP handling)
  - `services/` (business logic)
  - `repositories/` (DB/Spotify integration wrappers)
- Add JSDoc / docstrings and type hints for public service functions.

---

## 6. Security Enhancements

**Task SEC1 – Harden auth and secrets management**  
**Priority:** High  

Actions:
- Confirm Spotify OAuth flow:
  - Use PKCE and state parameter if in SPA + backend scenario.
  - Store refresh tokens securely server-side; never expose to frontend.
- Validate all incoming payloads:
  - Use a schema validator (e.g., `zod`, `joi`, `pydantic`) for request bodies, query params.
- Ensure HTTPS-only cookies for session/JWT where applicable:
  - `httpOnly`, `secure`, `sameSite=strict` (except where cross-site required).

---

**Task SEC2 – Implement input sanitization and output encoding**  
**Priority:** Medium  

Actions:
- For backend:
  - Sanitize playlist names, user-entered prompts, etc., before logging or storing.
- For frontend:
  - Ensure any dynamic HTML is rendered via React, not `dangerouslySetInnerHTML`.
- Add rate limiting on critical endpoints (auth, AI generation) to prevent abuse.

---

**Task SEC3 – Basic dependency and vulnerability scanning**  
**Priority:** Medium  

Actions:
- Add `npm audit` / `yarn audit` script or `pip-audit` for Python.
- Add GitHub Actions workflow:
  - On push/PR, run:
    - `lint`
    - `test`
    - dependency audit
- Configure Dependabot (or similar) for automatic dependency PRs.

---

## 7. Documentation Updates

**Task D1 – Update user-facing feature docs**  
**Priority:** Medium  

Actions:
- In `docs/features.md`:
  - Document:
    - Current EchoTune capabilities.
    - New Explainable Recommendations and Mood classification (once implemented).
- Add screenshots/short text examples describing:
  - How the user connects Spotify.
  - How AI analyzes playlists and surfaces insights.

---

**Task D2 – Add API reference stub**  
**Priority:** Low  

Actions:
- Create `docs/api.md`:
  - List main backend routes:
    - Spotify routes
    - AI routes
  - For each:
    - Method + path
    - Expected request body/params
    - Example response
- Copilot can infer schemas from existing route code.

---

## 8. Testing & Validation

**Task T1 – Establish unit test scaffolding**  
**Priority:** High  

Actions:
- Choose testing framework based on stack:
  - Node: `jest` or `vitest`.
  - Python: `pytest`.
- Add basic tests for:
  - Spotify client wrapper (mock Spotify responses).
  - AI adapter interface (mock model responses).
  - Simple React components (render test, props test).
- Add `"test"` script to package config.

---

**Task T2 – Add integration tests for core flows**  
**Priority:** Medium  

Actions:
- Backend integration tests:
  - For `/api/spotify/playlists`, `/api/ai/recommendations`, `/api/ai/explain-recommendations`.
  - Use test doubles/mocks for Spotify and AI providers.
- Frontend integration tests (if using React Testing Library / Cypress):
  - Flow: user connects Spotify → sees playlists → triggers AI recommendations → sees explanation.

---

**Task T3 – Introduce lightweight monitoring hooks**  
**Priority:** Low  

Actions:
- Add basic logging around:
  - AI inference duration.
  - Spotify API call count/failures by endpoint.
- Optionally:
  - Expose a health endpoint `/health` returning:
    - Status of Spotify connection (simple check) and model loading.

---

### Suggested Next-Cycle Priority Set

If you need a concrete limited set for the very next cycle (for Copilot automation), prioritize:

1. **A2 – Centralize configuration & env**  
2. **S1 – Spotify client wrapper**  
3. **SEC1 – Harden auth & secrets**  
4. **Q1 – Linting/formatting + type safety**  
5. **T1 – Unit test scaffolding**  
6. **F1 – Code-splitting + lazy loading**  
7. **M1 – Model adapter layer**  

These are all highly automatable by GitHub Copilot Coding Agent and will strongly improve maintainability, performance, and safety for subsequent feature work.