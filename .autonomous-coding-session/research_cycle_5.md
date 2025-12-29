# 🔍 Perplexity Research Results - Cycle 5

**Generated**: 2025-12-29T00:27:43.048435
**Cycle**: 5/5
**Tasks Completed This Cycle**: 3

EchoTune AI’s next coding cycle should focus on tightening architecture and performance around the existing flow (prompt → AI music intent → Spotify playlist), while adding a small, high‑impact new feature and strengthening testing, security, and docs. Below is a concrete, Copilot‑friendly task list you can turn directly into issues/PRs.

---

## 1. Repository structure & code quality

**Goals:** Clear separation of concerns, easier navigation, Copilot‑friendly structure.

**Actionable tasks**

1. **Standardize top‑level layout**  
   - Ensure a clear structure such as:  
     - `backend/` (API, ML orchestration, Spotify integration)  
     - `frontend/` (React app)  
     - `infra/` (Docker, deployment, CI)  
     - `docs/` (architecture, API, product docs)  
   - Add/update a root `README.md` that explains each directory (3–5 bullet points).  
   - Add `CONTRIBUTING.md` with a very short “how to run / how to test” section.[1]

2. **Centralize configuration**  
   - Introduce a single config module (e.g., `backend/src/config.ts` or `config.py`) that loads all environment variables (Spotify keys, model settings, base URLs) with defaults and validation.  
   - Replace scattered `process.env.*` / `os.getenv` reads with calls to this config module.[1]

3. **Enforce code style & quality gates**  
   - Add ESLint + Prettier config for JS/TS, or Black/flake8/ruff if Python, and basic recommended rules.  
   - Add a simple GitHub Actions workflow that runs lint + tests on pull requests. Copilot can generate a starter `lint.yml` + `test.yml` easily.[1][3]

---

## 2. AI/ML integration & music personalization trends

EchoTune is an **AI‑powered music discovery platform** that creates playlists from natural language prompts, using an ML pipeline to map text → music attributes and then query Spotify.[4][5]

**Trends to exploit (safely implementable):**

- **Richer prompt understanding**: sentiment analysis, emotion tagging, and multi‑constraint parsing (mood + era + activity).  
- **Session‑based personalization**: re‑ranking or adjusting results based on user feedback (likes/skips) over a session, even without long‑term accounts.  
- **Explainability**: short natural‑language explanation of *why* tracks were chosen (tempo, energy, mood, era).[4][5]

**Actionable tasks**

4. **New feature (P1): “Explain this playlist” endpoint & UI**  
   - Backend:  
     - Add an endpoint `/playlists/:id/explanation` that returns a short summary:  
       - Dominant mood, typical tempo range, average energy/danceability, main eras/genres.  
       - A generated 1–2 sentence explanation leveraging your existing AI layer (or a lightweight rules‑based template to start).  
   - Frontend:  
     - Add a “Why these tracks?” button on the playlist view.  
     - Display explanation in a modal or collapsible panel.  
   - Use Copilot to scaffold controller, service, and React component; keep explanation logic in a separate `explanationService` for future ML upgrades.[4][5]

5. **Prompt parsing refactor (P1)**  
   - Extract all prompt → attributes logic into a dedicated module (e.g., `promptInterpreter.ts`).  
   - Add clear input/output types/interfaces (prompt in, normalized attributes out: `mood`, `energy`, `tempo_range`, `decade_pref`, etc.).  
   - Add unit tests for at least 8–10 prompt examples (different moods, decades, languages if supported). Copilot can generate test cases and fixtures.

6. **Session feedback scaffold (P2)**  
   - Add an internal “feedback” schema (in DB or in‑memory store) that records: `session_id`, `track_id`, `action` (like/skip), `timestamp`.  
   - Add endpoints for posting feedback (`POST /feedback`) and retrieving session stats.  
   - No complex ML yet—just store data and compute basic aggregates (top liked, most skipped attributes) in a small service module for future use.

---

## 3. Spotify API usage & enhancements

EchoTune uses the Spotify API to find tracks and build playlists from inferred attributes.[4][5]

**Actionable tasks**

7. **Centralize Spotify client (P1)**  
   - Create `backend/src/integrations/spotifyClient.(ts|py)` with:  
     - Token management (refresh handling, rate limit backoff).  
     - Wrapper methods: `searchTracksByAttributes`, `createPlaylist`, `addTracksToPlaylist`, `getAudioFeaturesBatch`, etc.  
   - Replace direct Spotify endpoint calls across the codebase with this client.

8. **Batch audio features calls (P1)**  
   - Ensure you use Spotify’s batch audio features endpoint (`/audio-features?ids=...`) instead of one call per track.  
   - Implement simple batching logic (e.g., up to 100 IDs per call) and integrate into playlist generation.

9. **Add rate limiting/backoff (P2)**  
   - Implement a wrapper in the Spotify client that:  
     - Detects 429 responses and reads `Retry-After`.  
     - Retries automatically with exponential backoff up to a max number of attempts.  
   - Log each rate limit event with relevant metadata for monitoring.

10. **Improve error handling & user messages (P2)**  
    - Standardize error objects coming from Spotify (e.g., `SpotifyError` class) and map them to user‑friendly messages.  
    - Ensure frontend shows clear errors instead of generic “Something went wrong”.

---

## 4. Frontend React performance & UX

EchoTune’s frontend is a React app that takes a prompt, shows generated playlists, and displays track details.[4][5]

**Actionable tasks**

11. **Code‑split heavy views (P2)**  
    - Use React lazy loading and `Suspense` for heavy routes like detailed playlist view or settings.  
    - Confirm bundle size improvements with `source-map-explorer` or similar (Copilot can assist with config snippets).

12. **Memoize derived data (P2)**  
    - Audit components that map/filter large track arrays on each render.  
    - Wrap them with `useMemo` and `useCallback` where props are stable.  
    - Avoid inline functions and objects in frequently re‑rendered lists.

13. **Virtualized track lists (P3)**  
    - If playlists can become large, wrap the track list in a virtualization component (e.g., `react-window`).  
    - Keep item renderer small and pure; move complex logic outside.

14. **Loading and error states (P1)**  
    - Ensure every async call (generate playlist, explain playlist, like/skip) has:  
      - A skeleton or spinner.  
      - A clear inline error message with retry option.  
    - Centralize API calls in a small `apiClient` module with typed responses.

---

## 5. Architecture & scalability

**Actionable tasks**

15. **Introduce a clear service layering (P1)**  
    - Separate:  
      - **Controllers/routers** (HTTP, request/response).  
      - **Services** (business logic: prompt interpretation, playlist generation).  
      - **Integrations** (Spotify, AI providers).  
      - **Models** (DB or in‑memory state).  
    - Move mixed logic out of controllers into services; keep controllers ≤50 lines.[1]

16. **Add simple request‑level logging (P1)**  
    - Implement middleware that logs request method, path, latency, and status code.  
    - Tag logs with `session_id` or `request_id` if available.  
    - Ensure PII is never logged.

17. **Config‑driven feature flags (P3)**  
    - Introduce a tiny feature flag module (env‑based) for toggling experimental features like explanations or session feedback.  
    - Use flags in controllers to gate new endpoints or behaviors.

---

## 6. Security enhancements

**Actionable tasks**

18. **Secrets management & validation (P1)**  
    - Ensure **no secrets** are in the repo; rely on environment variables for Spotify and AI keys.[1]  
    - Add schema validation for env vars (e.g., Zod, Joi, or a simple manual check) that fails fast at startup with clear messages.

19. **Input validation for APIs (P1)**  
    - Add validation middleware for:  
      - Playlist generation prompts (max length, allowed characters).  
      - Feedback endpoints (session_id format, track_id format, enum for actions).  
    - Respond with 400 + clear error details if validation fails.

20. **CORS and rate limiting (P2)**  
    - Configure CORS to only allow your frontend origin(s).  
    - Add simple IP‑based or session‑based rate limiting for:  
      - Playlist generation endpoint.  
      - Explanation endpoint.

21. **Dependency auditing (P2)**  
    - Add `npm audit` / `yarn audit` (or `pip-audit`) to CI, failing on high‑severity vulnerabilities.  
    - Generate a short `SECURITY.md` stating how to report vulnerabilities and basic guarantees.

---

## 7. Documentation updates

EchoTune already has external docs describing architecture and user flows.[4][5]

**Actionable tasks**

22. **Update architecture overview (P1)**  
    - In `docs/architecture.md` (or create it if missing), add:  
      - Diagram or textual description of: frontend → backend → AI model → Spotify.  
      - New modules: Spotify client, promptInterpreter, explanationService, feedback service.  
    - Keep it to one page so Copilot and humans can quickly grasp the system.

23. **API reference sync (P1)**  
    - Document all public endpoints:  
      - `/playlists/generate`, `/playlists/:id/explanation`, `/feedback`.  
      - Inputs (JSON schema), outputs, error codes.  
    - Store as Markdown or an OpenAPI spec file that Copilot can maintain.

24. **Developer quickstart (P2)**  
    - In `README` or `docs/dev-setup.md`, add:  
      - Clone → install → configure env vars → run backend → run frontend.  
      - Basic “how to run tests” and “how to run lint”.

---

## 8. Testing & validation

**Actionable tasks**

25. **Unit tests for core logic (P1)**  
    - Add tests for:  
      - `promptInterpreter` (edge prompts, combined constraints).  
      - Playlist generation service (given fixed Spotify responses, verify correct track filtering, ordering, and minimal constraints).  
      - Explanation service (outputs non‑empty explanation with expected structure for sample playlists).  
    - Target at least one test file per service module.

26. **Integration test: end‑to‑end playlist generation (P2)**  
    - Use a mocked Spotify client to simulate responses.  
    - Test `POST /playlists/generate` end‑to‑end:  
      - Valid prompt returns playlist with tracks and attributes.  
      - Invalid prompt or rate‑limited Spotify response returns proper error.

27. **Frontend component tests (P2)**  
    - Add tests for:  
      - Prompt input + submit flow (renders playlist on success, error on failure).  
      - Playlist view + explanation modal.  
    - Use React Testing Library; Copilot can scaffold tests from existing components.

28. **Basic performance checks (P3)**  
    - Add very simple benchmarks or timing logs around playlist generation to ensure it stays under a target latency (e.g., 1–2 seconds for typical prompts).  
    - Log counts of Spotify calls per request to detect regressions.

---

### Suggested priorities for the next coding cycle

- **P1 (do next cycle):**  
  - #4 Explain playlist feature (backend + UI)  
  - #5 Prompt parsing refactor + tests  
  - #7 Centralize Spotify client  
  - #15 Service layering refactor (at least for playlist/Spotify flows)  
  - #18 Env + secrets validation  
  - #19 Input validation  
  - #22 Architecture doc update  
  - #25 Core unit tests

- **P2 (plan for subsequent cycle):**  
  - #8 Batch audio features  
  - #11 Code splitting  
  - #14 Loading/error states polish  
  - #16 Request logging  
  - #20 CORS + rate limiting  
  - #23 API reference  
  - #26, #27 Integration + UI tests

All of these are small, well‑scoped changes that GitHub Copilot can implement with minimal manual adjustment when guided by short, focused prompts and existing file structure.