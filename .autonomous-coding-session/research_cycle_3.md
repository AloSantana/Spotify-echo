# 🔍 Perplexity Research Results - Cycle 3

**Generated**: 2025-12-28T00:28:10.485145
**Cycle**: 3/5
**Tasks Completed This Cycle**: 3

EchoTune AI’s next coding cycle should focus on tightening architecture, performance, and robustness around its AI playlist generation and Spotify integration, while adding a few high‑impact, Copilot‑friendly features. Below is a concrete, implementation‑oriented plan derived from EchoTuner’s public documentation and general AI repo best practices.[1][5][6]

---

## 1. Codebase Structure & Optimization Opportunities

Based on the EchoTuner docs, the system has at least these layers:[5][6]  
- **Frontend:** React app for mood/prompt input, playlist display, and Spotify auth.  
- **Backend/API:** Handles AI prompt → playlist generation, calls Spotify API, manages auth tokens.  
- **AI Layer:** Model calls (likely OpenAI/other LLM) to interpret mood descriptions and map to tracks/genres.  
- **Integration Layer:** Spotify Web API wrappers (search, recommendations, playlist creation).

**Actionable structural tasks (Copilot‑implementable):**

1. **Introduce a clear “hexagonal” or layered folder structure (backend)**  
   - `src/api/` (route handlers/controllers)  
   - `src/services/` (business logic: playlist generation, user profiles, mood analysis)  
   - `src/integrations/spotify/` (all Spotify API calls)  
   - `src/ai/` (prompt building, model calls, post‑processing)  
   - `src/config/` (config, env parsing, constants)  
   - `src/utils/` (pure helpers, logging, error helpers)  
   - Task: Create folders, move existing modules, and add index barrels where useful.  
   - Priority: **P1**

2. **Centralize configuration and secrets**  
   - Add a single `config.ts` / `config.py` (depending on stack) reading from env vars with schema validation (e.g., Zod/TypeScript or Pydantic).  
   - Ensure no API keys or client secrets are hard‑coded; load Spotify + AI keys through env variables and config module.[1]  
   - Priority: **P1**

3. **Standardize error handling**  
   - Add `AppError` class hierarchy (e.g., `AuthError`, `SpotifyApiError`, `AiError`, `ValidationError`).  
   - Central error middleware/handler in backend: maps known errors to HTTP codes + JSON shape (`{code, message, details?}`).  
   - Priority: **P2**

4. **Introduce logging abstraction**  
   - Add `logger.ts` using a structured logger (e.g., pino/winston/structlog).  
   - Replace `console.log`/print calls throughout with `logger.info/error/warn/debug`.  
   - Priority: **P2**

---

## 2. Latest Music AI/ML Trends & Integration Possibilities

Modern music‑AI patterns relevant to EchoTune’s playlist generator include:[5][6]

- LLM‑driven **natural language → music attributes** (mood, tempo, energy, valence, era, genre).  
- **Audio feature‑aware recommendations** using Spotify track features (danceability, energy, valence, acousticness, tempo) to refine output.  
- **User modeling**: re‑ranking recommendations based on past likes, skips, and listening history.  
- **RAG‑like “preference memory”**: storing user preferences/profile and feeding them back into prompts.  
- **Multi‑turn refinement**: conversational tuning (“more 80s rock”, “less vocals”).

**AI feature tasks:**

5. **Add a prompt‑to‑attributes module**  
   - New function in `src/ai/moodToAttributes.ts`:  
     - Input: user text (mood, activities, context).  
     - Output: structured attributes (genres, min/max tempo, energy, valence, popularity range, decade bias, etc.).  
   - Implement with LLM call (if not already), plus a deterministic schema and validation.  
   - Priority: **P1**

6. **Integrate Spotify audio features into generation**  
   - After getting candidate tracks (search or recommendations), fetch `audio-features` for tracks and post‑filter/re‑rank locally by target attributes (energy, valence, tempo).  
   - Encapsulate logic in `src/services/playlistTuningService.ts`.  
   - Priority: **P2**

7. **Add basic user preference profile**  
   - Store per‑user preference vectors (top genres, artists, audio feature tendencies) based on accepted playlists or explicit thumbs‑up.  
   - Use this profile as an additional signal for LLM prompt or for re‑ranking final track list.  
   - Priority: **P3**

---

## 3. Spotify API Usage Patterns & Enhancements

EchoTuner already integrates with Spotify for playlist creation and playback.[5][6]

**Enhancement tasks:**

8. **Create a unified Spotify API client module**  
   - `src/integrations/spotify/client.ts` handling:  
     - Base URL, auth headers, rate limit/retry (e.g., exponential backoff for 429, 5xx).  
     - Wrapper methods: `searchTracks`, `getRecommendations`, `getAudioFeatures`, `createPlaylist`, `addTracksToPlaylist`, etc.  
   - Centralize all Spotify HTTP calls through this client.  
   - Priority: **P1**

9. **Implement automatic token refresh flow**  
   - Ensure refresh tokens are stored securely.  
   - Implement `ensureAccessToken(userId)` helper that refreshes tokens when expired and updates storage.  
   - Handle token errors gracefully and bubble up a clear frontend error (e.g., “Please reconnect Spotify”).  
   - Priority: **P1**

10. **Add caching for stable endpoints**  
    - Simple in‑memory or Redis caching for:  
      - User’s top artists/genres for a time window.  
      - Genre seeds list and common metadata.  
    - TTL‑based caching to reduce API calls and improve latency.  
    - Priority: **P3**

---

## 4. Frontend React Performance Improvements

Docs indicate a React‑based frontend that handles prompts, previewing playlists, and auth flows.[5][6]

**React tasks:**

11. **Audit and memoize heavy components**  
    - Identify components rendering playlist track lists or artwork grids.  
    - Apply `React.memo`, `useMemo`, and `useCallback` where props are stable and lists are large.  
    - Priority: **P2**

12. **Introduce code‑splitting for heavy screens**  
    - Use `React.lazy`/`Suspense` for rarely used views (e.g., settings, profile, advanced filters).  
    - Priority: **P3**

13. **Standardize state management**  
    - If global state is scattered: introduce a single source (e.g., Zustand/Redux) for:  
      - Auth status  
      - Current generated playlist  
      - User preferences & session info  
    - Move cross‑cutting state out of deeply nested props.  
    - Priority: **P2**

14. **Improve perceived latency & UX**  
    - Add proper loading indicators for playlist generation and Spotify requests.  
    - Disable “Generate” button while pending, debounced prompt input (e.g., 300–500 ms) if live suggestions are added.  
    - Priority: **P2**

---

## 5. New Features & Roadmap Additions

All scoped so Copilot can implement with clear APIs.

**New features (next cycle candidates):**

15. **Multi‑constraint playlist builder (high‑impact)**  
    - UI: advanced section below mood input:  
      - Sliders for tempo range, energy, valence.  
      - Toggles for “only liked artists”, “discover mode” (unheard tracks).  
    - Backend: extend generation service to merge LLM mood attributes with user‑selected constraints, then call Spotify recommendations + post‑filtering.  
    - Priority: **P1**

16. **“Regenerate but keep vibe” button**  
    - Frontend: button on playlist view; keeps last attributes but randomizes seed tracks or discovery.  
    - Backend: reuse previous request attributes from cache or payload, change seed set/random state.  
    - Priority: **P2**

17. **Session‑aware conversation refinement (lightweight)**  
    - Allow user follow‑ups like “more upbeat” / “less vocals”:  
      - Frontend: simple chat‑style input referencing current playlist.  
      - Backend: store last attributes in session; apply small deltas (e.g., increase energy range, exclude vocal genres).  
    - Priority: **P3**

18. **Export & share playlist metadata**  
    - Generate shareable link that describes why songs were chosen (mood explanation, attributes).  
    - Store a short “playlist card” JSON in backend, referenced by link ID.  
    - Priority: **P3**

---

## 6. Architecture & Scalability Improvements

**Backend/infra tasks:**

19. **Introduce request‑handling timeouts & concurrency limits**  
    - Wrap external calls (Spotify, LLM) with timeouts.  
    - Limit concurrent playlist generations per user/IP to avoid overload.  
    - Priority: **P2**

20. **Make playlist generation idempotent and traceable**  
    - Add correlation IDs per request; include in logs.  
    - Ensure repeated retries (e.g., on timeout) don’t create duplicate playlists (store temporary generation state and deduplicate).  
    - Priority: **P3**

21. **Abstract AI provider layer**  
    - Create `src/ai/providers/openai.ts` (and interface).  
    - All business code calls `AiProvider.generateAttributes(prompt)` etc., not the raw SDK.  
    - Future‑proofs switching models and adds testability.  
    - Priority: **P2**

---

## 7. Security Enhancements & Best Practices

Aligned with AI repo best practices and Spotify integration requirements.[1][5][6]

22. **Harden secrets management & environment handling**  
    - Confirm `.env` is git‑ignored.  
    - Add `.env.example` with required keys but no sensitive data.  
    - Validate env vars on boot; crash early on misconfig.  
    - Priority: **P1**

23. **Input validation and sanitization**  
    - Use a schema library to validate all external inputs:  
      - Backend request payloads (mood text length limits, allowed characters, array sizes).  
      - Query params for pagination/filters.  
    - Reject oversized prompts to prevent abuse.  
    - Priority: **P1**

24. **Rate limiting & basic abuse protection**  
    - Implement IP/user‑based rate limits on generation endpoints.  
    - Add simple WAF‑like checks for obviously malicious strings.  
    - Priority: **P2**

25. **Security headers & HTTPS enforcement**  
    - Add middleware for headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, etc.  
    - Ensure frontend only talks to backend over HTTPS in production.  
    - Priority: **P2**

26. **Audit and remove PII from logs**  
    - Ensure tokens, emails, and sensitive identifiers never appear in logs.  
    - Mask Spotify user IDs if logged, or avoid logging them entirely.  
    - Priority: **P1**

---

## 8. Testing & Validation Improvements

Following repository best‑practice guidance for professional‑level AI repos.[1]

27. **Add unit tests for core services (high value)**  
    - Tests for:  
      - `moodToAttributes` (LLM prompt builder & post‑processing) using mocked AI responses.  
      - Spotify service wrapper: correct endpoint URLs, error handling, retries (mock HTTP).  
      - Playlist generation logic: given attributes + mock Spotify data, ensure correct filters and ordering.  
    - Priority: **P1**

28. **Add integration tests for key flows**  
    - End‑to‑end tests for:  
      - POST `/generate-playlist` with sample prompt → mock Spotify & AI → verify response shape.  
      - Spotify token refresh flow.  
    - Use a test runner (Jest/Pytest) with fixtures and mocking.  
    - Priority: **P2**

29. **Snapshot tests for React UI**  
    - Snapshot tests for main screens (prompt page, playlist results, error states).  
    - Priority: **P3**

30. **Automated linting & formatting**  
    - Add ESLint + Prettier (frontend) and linter/formatter backend.  
    - Connect to CI so PRs run tests + lint.  
    - Priority: **P1**

31. **Basic performance monitoring hooks**  
    - Wrap playlist generation with timing logs and emit metrics (e.g., duration, Spotify/AI call counts).  
    - Later can be wired to observability stack.  
    - Priority: **P3**

---

## 9. Documentation Updates

EchoTuner already has good user‑facing docs.[5][6] Next step is raising the repo to “Professional” level on the engineering side.[1]

32. **Add/refresh top‑level technical README**  
    - Include: architecture overview diagram (text + simple ASCII outline is enough for Copilot), core flows (prompt → AI → Spotify → playlist), stack, and how to run locally.  
    - Priority: **P1**

33. **Create `docs/architecture.md`**  
    - Describe modules: `ai`, `services`, `integrations/spotify`, `api`, `frontend`.  
    - Document boundaries and main data structures (attributes schema, playlist objects).  
    - Priority: **P2**

34. **Document configuration and env variables**  
    - `docs/configuration.md` listing all env vars (names, types, purpose) for backend and frontend.  
    - Priority: **P2**

35. **Add CONTRIBUTING + CODE_OF_CONDUCT (if OSS)**  
    - Simple guidelines: branching, testing, code style, how to add new AI providers or Spotify endpoints.  
    - Priority: **P3**

---

## Suggested Task Breakdown for Next Cycle (Copilot‑friendly)

**High‑priority (P1) for next cycle:**

- Restructure backend folders and centralize config.  
- Implement unified Spotify client + token refresh helper.  
- Implement `moodToAttributes` AI module.  
- Add env handling & secrets best‑practices.  
- Add core unit tests for AI + Spotify + playlist generation.  
- Add linting/formatting + CI.  
- Update top‑level technical README.

These are all well‑scoped, API‑driven tasks that a GitHub Copilot coding agent can implement or refactor automatically with minimal human glue work.