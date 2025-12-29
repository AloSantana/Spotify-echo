# 🔍 Perplexity Research Results - Cycle 4

**Generated**: 2025-12-29T00:27:00.138720
**Cycle**: 4/5
**Tasks Completed This Cycle**: 3

Here is a concrete next‑cycle plan for **EchoTune AI**, structured as small, Copilot‑friendly tasks that can be implemented largely automatically.

---

## 1. Repository & Architecture Improvements

**1.1. Standardize repo structure and configs (High)**  
- Add top-level folders: `backend/`, `frontend/`, `ml/`, `infrastructure/`, `scripts/`, `docs/`.  
- Introduce central config pattern for each service: `config.ts`/`config.py` reading from environment variables (no hard‑coded secrets/URLs).  
- Add `.editorconfig`, `.gitignore` and basic lint/format configs (ESLint + Prettier for React, flake8/black or ruff for Python).  
- Add `README.md` sections: architecture overview, folder layout, how to run dev (frontend, backend, ML), how to run tests.  

**1.2. Introduce modular “music‑engine” boundary (High)**  
- Create a `backend/music_engine/` (or `ml/engine/`) module that exposes clean functions:  
  - `analyze_track(audio_or_features)`  
  - `generate_recommendations(user_id | audio_features)`  
  - `create_playlist(seed_tracks, target_mood, target_energy)`  
- Refactor existing Spotify + ML logic into this module so frontend only hits simple REST endpoints and backend orchestrates Spotify + models through this layer.

---

## 2. Music AI/ML Enhancements

**2.1. Add pluggable model wrapper layer (High)**  
Inside `ml/`:

- Define interface (Python):  
  ```python
  class EchoTuneModel(Protocol):
      def analyze_features(self, features: dict) -> dict: ...
      def recommend_tracks(self, user_profile: dict, candidate_tracks: list[dict]) -> list[dict]: ...
  ```
- Implement `BaselineModel(EchoTuneModel)` using simple heuristics (energy/valence/danceability) as a default.  
- Add a `model_registry.py` that maps strings (`"baseline"`, `"transformer_v1"`, etc.) to classes, reading active model name from env/config.

**2.2. Prepare for modern music‑ML trends (Medium)**  
(Tasks Copilot can scaffold now, even if models are stubbed)

- Add placeholders for:  
  - **Contrastive representation**: `ml/embeddings.py` with functions `get_track_embedding(features)` and `similar_tracks(embedding, candidates)`.  
  - **Reranker hook**: `ml/rerank.py` with `rerank_for_mood(tracks, mood_label)` to later host a small reranking model.  
- Expose these as optional steps in the pipeline (flagged via config).

---

## 3. Spotify API Usage Improvements

**3.1. Centralize Spotify client and rate‑limit handling (High)**  
- Create `backend/spotify/client.ts` (or `.py`) that:  
  - Encapsulates all Spotify Web API calls.  
  - Implements token refresh internally.  
  - Adds rate‑limit/backoff handling (check `Retry-After` header and sleep/retry).  
- Replace scattered direct `fetch`/`axios` Spotify calls with calls to this client.

**3.2. Introduce cached feature & profile layer (Medium)**  
- Add `backend/spotify/cache.ts`: simple in‑memory map now, with TODO for Redis.  
- Cache:  
  - `getAudioFeatures(track_ids)`  
  - `getUserTopTracks(user_id)`  
  - `getUserProfile(user_id)`  
- Add config‑driven TTL and cache busting.  
- Ensure all high‑volume endpoints go through cache.

**3.3. Add API usage logging hooks (Medium)**  
- Add simple logging wrapper around Spotify client: log method name, status code, and latency (without PII).  
- Store logs via existing logging mechanism, with a tag like `spotify_api`.

---

## 4. Frontend (React) Performance & UX

**4.1. Split and optimize heavy components (High)**  
- Identify main dashboard / playlist builder component.  
- Refactor into smaller components: `TrackList`, `PlaylistPreview`, `MoodSelector`, `EnergySlider`, etc.  
- Use `React.memo` for pure presentational components.  
- Use `useCallback` and `useMemo` for stable callbacks/derived data in container components.

**4.2. Introduce route‑level code splitting (Medium)**  
- Use `React.lazy` + `Suspense` for non‑critical views (settings, about, advanced analytics).  
- Optionally add dynamic import for heavy charts/visualizations.

**4.3. Debouncing and batch updates (Medium)**  
- For sliders/inputs that trigger recompute or API calls (mood, energy, tempo):  
  - Wrap change handlers with a debounced function (e.g., 250–400 ms).  
- Ensure state updates that affect lists use functional updates to avoid extra renders.

**4.4. Accessibility & micro‑optimizations (Low/Medium)**  
- Add semantic labels, ARIA attributes, and keyboard focus handling to core UI controls.  
- Replace inline functions in lists with pre‑defined handlers.  
- Ensure stable `key` props on list items (use track ID).

---

## 5. New Features for Next Cycle

**5.1. “Smart Mood Playlist” v1 (High, Feature)**  
- Frontend:  
  - Add a **Mood & Intensity** panel where user selects mood (dropdown/chips: *chill, focus, party, melancholy, happy*) and an intensity slider.  
- Backend:  
  - Endpoint `POST /api/playlists/mood` with payload `{ mood, intensity, seedTracks? }`.  
  - Use baseline ML model + Spotify recommendations to build a playlist matching target average valence/energy/danceability ranges based on mood.  
- Return playlist preview and an option to “Save to Spotify”.

**5.2. “Explain My Mix” tool (Medium, Feature)**  
- Backend endpoint `GET /api/explanations/playlist/:id`:  
  - Aggregate track features and compute summary (average energy, valence, tempo, acousticness).  
  - Create plain‑language explanation (e.g., “This playlist leans towards high energy and positive mood with moderate tempo.”).  
- Frontend view: small card under playlist preview with this explanation.

**5.3. Recent sessions / history list (Low/Medium, Feature)**  
- Backend: simple `sessions` table or JSON file: `{ id, created_at, mood, parameters, track_ids }`.  
- Endpoints:  
  - `GET /api/sessions/recent`  
  - `POST /api/sessions` on playlist creation.  
- Frontend: “Recent Mixes” sidebar showing last N sessions with quick “reopen”.

---

## 6. Code Quality & Refactoring

**6.1. Type safety & interfaces (High)**  
- Add/complete TypeScript types for:  
  - `Track`, `AudioFeatures`, `UserProfile`, `Playlist`, `RecommendationRequest`.  
- Replace `any` and untyped `props` with these interfaces.  
- Add type guards where necessary for external data.

**6.2. Reduce duplication in feature mapping (Medium)**  
- Create a `ml/feature_mapping.ts` (or `.py`) that:  
  - Normalizes Spotify audio features into internal representation.  
- Replace ad‑hoc transforms across the codebase with calls to this module.

**6.3. Central error handling (Medium)**  
- Backend:  
  - Add global error middleware that maps known errors (Spotify error, validation error) into consistent JSON structure.  
- Frontend:  
  - Add a small error boundary component around major routes.  
  - Normalize error messages from API into a shared `ApiError` type.

---

## 7. Security Enhancements

**7.1. Secrets & environment handling (High)**  
- Ensure Spotify client ID/secret, DB URLs, and JWT secrets come only from environment variables.  
- Add `.env.example` with placeholders (no real secrets).  
- Add a simple `validateEnv()` at startup to assert required variables.

**7.2. Input validation & sanitization (High)**  
- Introduce schema validation (e.g., Zod/Joi/Yup) for key endpoints:  
  - `POST /api/playlists/mood`  
  - any text input endpoints (search, playlist name, etc.).  
- Reject invalid payloads with clear 400‑level errors.

**7.3. Basic auth hardening (Medium)**  
- If using JWT:  
  - Enforce reasonable token expiry.  
  - Ensure tokens are signed with strong secret and algorithm.  
- If using cookies:  
  - Mark as `Secure`, `HttpOnly`, `SameSite=Lax/Strict`.

**7.4. Spotify scopes minimization (Medium)**  
- Review OAuth scopes and remove unused ones.  
- Document which feature uses which scope in `docs/spotify-scopes.md`.

---

## 8. Testing & Validation

**8.1. Establish minimal test scaffolding (High)**  
- Add test frameworks:  
  - Backend: Jest/Vitest or Pytest.  
  - Frontend: Jest + React Testing Library.  
- Add `npm test` / `pytest` scripts and ensure they run green with example tests.

**8.2. Core unit tests (High)**  
- Backend/ML:  
  - Tests for `feature_mapping` (correct ranges, missing fields).  
  - Tests for baseline `EchoTuneModel` recommendation ordering.  
- Frontend:  
  - Render tests for main dashboard and Mood Playlist panel.  
  - Interaction test: changing mood/slider triggers API call (mocked).

**8.3. API contract tests (Medium)**  
- Add tests that hit major endpoints (using supertest or similar) with mocked Spotify responses:  
  - `GET /api/user/top-tracks`  
  - `POST /api/playlists/mood`.  
- Validate response shape and required fields.

**8.4. Lightweight performance checks (Low/Medium)**  
- Add a small script in `scripts/load-smoke.ts` that:  
  - Calls core endpoints a few times and logs response times.  
- Integrate into CI as an optional step or manual check.

---

## 9. Documentation Updates

**9.1. High‑level architecture doc (High)**  
- Create `docs/architecture.md` including:  
  - High‑level diagram: frontend ↔ backend ↔ Spotify ↔ ML engine.  
  - Description of the music recommendation pipeline.  
  - Where models plug in (model registry).

**9.2. Developer quickstart (Medium)**  
- Create `docs/development-setup.md`:  
  - How to set up Spotify app and env vars.  
  - Commands to run frontend, backend, and tests.  
  - Example workflows: “Add a new model”, “Add a new API endpoint”.

**9.3. Public feature overview (Low/Medium)**  
- Update main `README.md` with:  
  - Description of Smart Mood Playlist and Explain My Mix.  
  - Short GIFs or screenshots section placeholder.

---

If you share a tree of the current repo or key files, I can turn these into very concrete, file‑level edit plans and prompt templates that GitHub Copilot can follow step‑by‑step.