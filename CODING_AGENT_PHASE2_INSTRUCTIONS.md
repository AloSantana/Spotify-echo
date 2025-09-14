# EchoTune Core Product – Phase 2 Execution Plan (Hybrid Skeleton + Provider Abstraction + Recommendation Data Prep)
Version: 1.2  
PR Context: https://github.com/primoscope/Spotify-echo/pull/34  
Owner Intent: Keep full product momentum (multi‑LLM, recommendation engine foundations, playlist, insights path) while DEFERING invasive security cleanup (DO NOT remove or rotate existing secrets now; no .env scrubbing).  
NO_MOCK Policy: Still enforced for production pathways (no fake recommendation data, no random placeholders).

> COPY/PASTE INTO CODING AGENT SESSION.  
> The agent must work sequentially, update the PR body progress section after each milestone, and add GAP tasks if structure differs.  
> Security-heavy tasks (secret rotation, aggressive scanning, redaction) are explicitly deferred to a later “Security Hardening” PR. Environment values remain unchanged.

---

## 0. Guiding Principles

1. Stability First: Preserve existing working auth, chat, playlist automation, and analytics endpoints.
2. Add, Don’t Break: Introduce new provider abstraction & recommendation scaffolds without disabling legacy imports (use bridges/adapters).
3. Deterministic Behavior: No random scoring or “dummy” tracks—recommendations must derive from Spotify audio features + stored user history (or deterministic fallback dataset).
4. Fail Fast: Unimplemented modules use `throw new Error("NOT_IMPLEMENTED:<context>")` (never silently return empty arrays).
5. Observability Hooks: Minimal telemetry (latency, providerUsed, strategy contributions) to accelerate Phase 4 & 7.
6. Environment Respect: All dynamic behavior (provider choice, feature flags, fallback thresholds) must come from `.env` or repo secrets. Do NOT alter existing values.
7. Progressive Disclosure: Build cross-cutting “spine” now (providers, settings schema placeholder, provenance/explanation scaffold, playlist service skeleton, insights skeleton) to avoid future directory churn.

---

## 1. Phase 2 Scope (Active)
Primary Deliverables:
- Unified LLM Provider Abstraction (OpenAI, OpenRouter, Gemini) with fallback chain.
- Provider validation + environment validation scripts (non-destructive).
- Preparation for user settings (Phase 3) via schema draft & adapter.
- Recommendation Engine Data Preparation (audio feature coverage, embedding ingestion pipeline prep, provenance schema, explanation generator skeleton).
- Playlist service unification scaffold (wrapping existing playlist automation route).
- Insights aggregation foundation (stubs + coverage script for future metrics).
- MCP server utilization readiness.
- CI additions (lightweight) and targeted tests.

---

## 2. Deferred (Document, Do Not Implement Now)
- Secret rotation / removal of committed secrets.
- Deep secret scanning / gitleaks enforcement gates.
- Strict logging redaction audit.
- Full security header / CSP refactor.
- Dependency audit gating / vulnerability fail conditions.
- Advanced provenance enforcement & hallucination lint rules (will come with explanation logic refinement).

Mark these as “Deferred Security” in PR body.

---

## 3. Task Matrix Overview

| Category | Code Modules | Core Tasks |
|----------|--------------|-----------|
| LLM Provider Abstraction | `src/llm/providers/*` | Base + 3 concrete providers + registry + fallback + telemetry |
| Bridge Compatibility | `src/chat/llm-provider-manager-bridge.js` | Map old calls to new registry |
| Env & Provider Validation | `scripts/validate-env.js`, `scripts/validate-llm-providers.js` | Non-destructive presence & availability checks |
| Recommendation Data Prep | `scripts/check-audio-features-coverage.js`, `scripts/embed-tracks.js` (if missing), `docs/PROVENANCE_SCHEMA.md` | Coverage audit, provenance schema, ingestion readiness |
| Explanation Scaffold | `src/recommendation/explanations/generateExplanation.js` | Stub (fail-fast) referencing real feature keys only |
| Provenance Model | `src/recommendation/provenance/model.js` | Data structure + validation helper |
| Playlist Service Spine | `src/spotify/PlaylistService.js` | Wrap route logic; unify token handling |
| Insights Spine | `src/insights/aggregateInsights.js`, `src/insights/cache/InsightsCache.js` | Stub functions for metrics |
| Audio Features Fallback | `data/fallback/audio-features.sample.json` | Deterministic fallback (sanitized real feature shape) |
| Tests | `tests/providers/*`, `tests/recommendation/*`, `tests/playlist/*` | Provider selection, fallback, explanation sanity |
| CI Light | Workflow update | Add provider/env validation + provider tests jobs |
| MCP Light | `scripts/mcp-health-check.js` (optional) | Minimal health enumeration |
| Progress Automation | `scripts/update-pr-progress.js` (optional) | Append updated checklist |

---

## 4. Detailed Task List (Execute Sequentially)

### 4.1 Repository State Audit
[ ] A1: List existing provider files under `src/chat/llm-providers/` (openai, gemini, mock, custom).  
[ ] A2: Identify all current call sites (grep for `llm-provider-manager`, `openai-provider`); document in PR comment “Provider Integration Map”.  
[ ] A3: Locate recommendation-related scripts & confirm presence of audio feature enrichment pipelines (`scripts/fetch-missing-audio-features.js`, etc.).  
[ ] A4: Confirm playlist automation route(s) (`src/api/routes/playlist-automation.js`) and note whether logic is monolithic or separable.

### 4.2 Provider Abstraction Implementation
[ ] P2-01: Create `src/llm/providers/BaseProvider.js` (abstract; enforce `generate(messages, options)` signature).  
[ ] P2-02: Implement `OpenAIProvider` (env: `OPENAI_API_KEY`; load model from `DEFAULT_OPENAI_MODEL` or fallback).  
[ ] P2-03: Implement `OpenRouterProvider` (env: `OPENROUTER_API_KEY`; add required headers like `HTTP-Referer` & `X-Title` if needed).  
[ ] P2-04: Implement `GeminiProvider` (env: `GEMINI_API_KEY` or `GOOGLE_API_KEY`).  
[ ] P2-05: Registry `src/llm/providers/index.js`:  
          - `register(providerInstance)`  
          - `getAllProvidersStatus()` → array { name, usable, reason? }  
          - `selectProvider(userSettings?)` resolution priority: user → env → first usable  
[ ] P2-06: Fallback Chain: If `LLM_FALLBACK_ENABLED=true` and primary fails (network/4xx/5xx), iterate others (track attempts).  
[ ] P2-07: Add `telemetry.js` with `recordInvocation({ provider, start, end, model, tokensEstimated })`.  
[ ] P2-08: Create compatibility bridge `src/chat/llm-provider-manager-bridge.js` exporting old function names but internally calling registry.  
[ ] P2-09: Inject provider metadata into chat response payload: `{ providerUsed, latencyMs, fallbackAttempts }`.  
[ ] P2-10: Add script `scripts/validate-llm-providers.js` → prints table + writes JSON to `reports/provider-validation.json`.  

### 4.3 Environment & Validation (Non-Destructive)
[ ] ENV-1: Implement `scripts/validate-env.js` (core required vs optional; NO secret removal; exit 1 only if required missing).  
[ ] ENV-2: Add NPM scripts:  
```
"validate:env": "node scripts/validate-env.js",
"validate:providers": "node scripts/validate-llm-providers.js"
```  
[ ] ENV-3: Update PR body with environment validation summary (counts of present variables).  

### 4.4 Recommendation Engine Data Preparation (Phase 4 groundwork)
[ ] REC-1: Create `docs/PROVENANCE_SCHEMA.md` describing:  
```
trackId, strategies[], scoreComponents{}, featuresUsed[], noveltyDaysSinceLastPlay, diversityPenaltyApplied, explanationRef
```  
[ ] REC-2: Scaffold `src/recommendation/provenance/model.js` with schema validator + `buildProvenance(entrySpec)` (fail-fast if missing required fields).  
[ ] REC-3: Create audio feature coverage script `scripts/check-audio-features-coverage.js`:  
       - Sample (env: `AUDIO_FEATURE_COVERAGE_SAMPLE=200` default)  
       - Count tracks missing any core features (danceability, energy, valence, tempo, acousticness, instrumentalness, liveness, speechiness)  
       - Output JSON: `reports/audio-features/coverage.json` with fields: { sampleSize, missingCount, coveragePercent, timestamp }.  
[ ] REC-4: If coverage < 85% log advisory to console “Run enrichment pipeline: fetch-missing-audio-features”.  
[ ] REC-5: Fallback dataset: `data/fallback/audio-features.sample.json` (min 10 real-shaped objects, sanitized IDs).  
[ ] REC-6: Add embedding ingestion script if absent: `scripts/embed-tracks.js` (scans for tracks lacking embedding vector; stubs call if model unspecified).  
[ ] REC-7: Explanation generator scaffold `src/recommendation/explanations/generateExplanation.js`:  
       - Input: { track, provenance }  
       - Validate only feature keys present in track’s feature object; fail-fast if unknown.  
       - Return deterministic template (e.g., “This track ranks high due to its energy (${energy}) and valence (${valence}) fitting your recent pattern.”).  
[ ] REC-8: Add test `tests/recommendation/explanation.test.js` ensuring:  
       - Only referenced features exist.  
       - Throws on missing provenance fields.  

### 4.5 Playlist Automation Spine
[ ] PL-1: Create `src/spotify/PlaylistService.js`: methods  
```
createPersonalizedPlaylist(userId, name, trackUris[], options)
appendTracks(userId, playlistId, trackUris[])
ensureCuratedPlaylist(userId, key, options)
```
      Internally reuse existing route logic; do NOT duplicate Spotify auth fetch patterns—abstract them.  
[ ] PL-2: Modify `playlist-automation` route to consume PlaylistService (thin controller).  
[ ] PL-3: Add minimal test `tests/playlist/playlistService.test.js` (mock Spotify network layer ONLY if needed; no random output).  

### 4.6 Insights Foundation
[ ] INS-1: Create `src/insights/aggregateInsights.js` with stub exports:  
```
getTopGenres(userId)
getFeatureDistributions(userId)
getTimeOfDayTrends(userId)
getAcceptanceRate(userId)
getNoveltyScore(userId)
```
Each currently `throw NOT_IMPLEMENTED` (Phase 7 target).  
[ ] INS-2: Cache module `src/insights/cache/InsightsCache.js` exposing `getOrCompute(key, fn, ttlMs)`.  
[ ] INS-3: Add test placeholder `tests/insights/insightsAggregation.stub.test.js` (skipped; documents future expectations).  

### 4.7 MCP Light Integration
[ ] MCP-1: If trivial, add `scripts/mcp-health-check.js` sending `tools/list` to existing internal MCP servers (redis, mongodb, spotify).  
[ ] MCP-2: Output JSON `reports/mcp/health.json`.  
[ ] MCP-3: Update PR comment “MCP Health Snapshot” with statuses.  
(Additional servers like sequence-thinker, vector-memory deferred until after stable provider abstraction.)

### 4.8 Tests & CI
[ ] TEST-1: `tests/providers/providerSelection.test.js` (env permutations & fallback).  
[ ] TEST-2: `tests/providers/fallbackChain.test.js` simulate failure of primary.  
[ ] TEST-3: `tests/recommendation/explanation.test.js`.  
[ ] TEST-4: `tests/playlist/playlistService.test.js`.  
[ ] TEST-5: Optional integration test `tests/chat/providerMetadata.integration.test.js` hitting chat route and verifying providerUsed.  
[ ] CI-1: Add GitHub workflow job(s): `env-validate`, `providers-validate`, `test-providers`.  
[ ] CI-2: Archive artifacts:  
```
reports/provider-validation.json
reports/audio-features/coverage.json
reports/mcp/health.json (if produced)
```  

### 4.9 Progress Automation (Optional)
[ ] AUTO-1: Script `scripts/update-pr-progress.js` (if automation pattern already used) to patch PR body via GitHub API (GH_TOKEN).  
Otherwise manually edit after each checkpoint.

---

## 5. Environment Variable Reference (Do Not Alter Values)
Required (fail if missing):
- MONGODB_URI  
- JWT_SECRET  
- SESSION_SECRET  
- SPOTIFY_CLIENT_ID  
- SPOTIFY_CLIENT_SECRET  

Optional (just status display):
- OPENAI_API_KEY  
- OPENROUTER_API_KEY  
- GEMINI_API_KEY / GOOGLE_API_KEY  
- DEFAULT_LLM_PROVIDER  
- LLM_FALLBACK_ENABLED  
- EMBEDDING_MODEL_ID  
- REDIS_URL  
- FEATURE_RECOMMENDATIONS / FEATURE_PLAYLISTS / FEATURE_ANALYTICS (ensure expected ones true)  
- AUDIO_FEATURE_COVERAGE_SAMPLE  

Validator Output Format:
```
VAR | required | present | status
```
Exit code 1 only if a required var missing.

---

## 6. Provenance & Explanation (Pre-Phase 4 Foundation)
Provenance object target (store-able in future):
```json
{
  "trackId": "string",
  "strategies": ["collaborative","content","semantic"],
  "scoreComponents": { "collaborative": 0.42, "content": 0.31, "semantic": 0.27 },
  "featuresUsed": ["danceability","energy","valence"],
  "diversityPenaltyApplied": 0.05,
  "noveltyDaysSinceLastPlay": 37,
  "explanationRef": "hash-or-id"
}
```
Explanation generation MUST:
- Reference only keys present in `featuresUsed`.
- Avoid qualitative hallucinations (e.g., no “haunting vocals” unless data model supports it).
- Deterministic template now; adaptive NLP later once provider abstraction stable.

---

## 7. Progress Checklist Template (Add to PR Body)
```
### Phase 2 Progress
Provider Abstraction
- [ ] P2-01 BaseProvider
- [ ] P2-02 OpenAIProvider
- [ ] P2-03 OpenRouterProvider
- [ ] P2-04 GeminiProvider
- [ ] P2-05 Registry + status
- [ ] P2-06 Fallback chain
- [ ] P2-09 Chat metadata injection

Env & Validation
- [ ] ENV-1 validate-env script
- [ ] ENV-2 provider validation script
- [ ] ENV-3 summary appended

Recommendation Prep
- [ ] REC-1 Provenance schema
- [ ] REC-2 provenance model scaffold
- [ ] REC-3 coverage script
- [ ] REC-5 fallback dataset
- [ ] REC-6 embedding ingestion scaffold
- [ ] REC-7 explanation generator
- [ ] REC-8 explanation tests

Playlist Spine
- [ ] PL-1 PlaylistService
- [ ] PL-2 route refactor
- [ ] PL-3 service test

Insights Spine
- [ ] INS-1 aggregateInsights stub
- [ ] INS-2 cache module
- [ ] INS-3 test placeholder

MCP (Light)
- [ ] MCP-1 health check script
- [ ] MCP-2 JSON report

CI / Tests
- [ ] TEST-1 provider selection
- [ ] TEST-2 fallback chain
- [ ] TEST-3 explanation test
- [ ] TEST-4 playlist service test
- [ ] TEST-5 provider metadata integration
- [ ] CI-1 workflows added

Deferred Security: (Rotation, deep scans, logging redaction)
Last Update: <ISO_TIMESTAMP>
```

---

## 8. New / Modified Files (Planned)
```
src/llm/providers/BaseProvider.js
src/llm/providers/OpenAIProvider.js
src/llm/providers/OpenRouterProvider.js
src/llm/providers/GeminiProvider.js
src/llm/providers/index.js
src/llm/providers/telemetry.js
src/chat/llm-provider-manager-bridge.js
src/recommendation/provenance/model.js
src/recommendation/explanations/generateExplanation.js
src/spotify/PlaylistService.js
src/insights/aggregateInsights.js
src/insights/cache/InsightsCache.js
scripts/validate-env.js
scripts/validate-llm-providers.js
scripts/check-audio-features-coverage.js
scripts/embed-tracks.js        (if absent)
scripts/mcp-health-check.js    (optional)
reports/.gitkeep
reports/provider-validation.json  (generated)
reports/audio-features/coverage.json (generated)
data/fallback/audio-features.sample.json
docs/PROVENANCE_SCHEMA.md
tests/providers/providerSelection.test.js
tests/providers/fallbackChain.test.js
tests/recommendation/explanation.test.js
tests/playlist/playlistService.test.js
tests/insights/insightsAggregation.stub.test.js
tests/chat/providerMetadata.integration.test.js
```

---

## 9. Example Implementation Snippets

Base Provider:
```js
class BaseProvider {
  constructor(name, opts = {}) { this.name = name; this.opts = opts; }
  isUsable() { return true; }
  async generate() { throw new Error(`NOT_IMPLEMENTED:${this.name}`); }
}
module.exports = BaseProvider;
```

Registry:
```js
const registry = [];
function register(instance) {
  if (instance?.isUsable()) registry.push(instance);
}
function getAllProvidersStatus() {
  return registry.map(p => ({ name: p.name, usable: p.isUsable() }));
}
function selectProvider(userSettings) {
  const desired = userSettings?.llmProvider || process.env.DEFAULT_LLM_PROVIDER;
  if (desired) {
    const match = registry.find(p => p.name === desired);
    if (match) return match;
  }
  return registry[0] || null;
}
module.exports = { register, selectProvider, getAllProvidersStatus };
```

Explanation Scaffold:
```js
function generateExplanation({ track, provenance }) {
  if (!track || !provenance) throw new Error("MISSING_INPUT");
  const f = track.audio_features || {};
  const used = provenance.featuresUsed || [];
  for (const key of used) {
    if (!(key in f)) throw new Error(`FEATURE_MISSING:${key}`);
  }
  const energy = f.energy != null ? f.energy : '?';
  const valence = f.valence != null ? f.valence : '?';
  return `Selected for its energy (${energy}) and mood alignment (valence ${valence}), matching your recent listening profile.`;
}
module.exports = { generateExplanation };
```

Audio Feature Coverage (outline):
```js
// scripts/check-audio-features-coverage.js
// Connect to Mongo, sample tracks, compute coverage, write JSON report.
```

---

## 10. Iteration Loop (Agent)
For each iteration:
1. Pick next unchecked task.
2. Implement minimal cohesive change.
3. Run: `npm run validate:env` & `npm run validate:providers`.
4. Run related tests (partial `jest path/to/test`).
5. Update PR progress block (manual or script).
6. Commit semantic message (e.g., `feat(providers): implement OpenRouter provider`).
7. If structural discrepancy found → add PR comment “GAP DISCOVERED: <details>” and create new task ID (e.g., GAP-1).

---

## 11. Completion Criteria (Phase 2 Ready to Merge)
- All Provider abstraction tasks completed with passing tests.
- Explanation + provenance scaffolds in place (not fully integrated yet).
- Audio feature coverage report generated.
- PlaylistService wraps existing logic successfully (no regression).
- Insights stubs created (Phase 7 ready).
- CI jobs (env & provider validation + tests) passing.
- PR progress checklist fully updated.
- No removal or mutation of existing `.env` or committed secret values (as per owner direction).

---

## 12. Planned Next Phases (Do Not Implement Yet)
- Phase 3: User Settings Persistence (Mongo `user_settings`) + frontend settings UI + dynamic provider override + strategy weights.
- Phase 4: Full hybrid recommendation: collaborative + content/audio + embedding semantic similarity + diversity/novelty scoring + real explanation integration.
- Phase 5: Intent classification module (recommend, refine, playlist_create, insight, mood, feedback) integrated into orchestrator pipeline.
- Phase 6: Advanced Playlist Automation (refinement flows, differential updates).
- Phase 7: Insights Aggregations (feature distributions, acceptance rate, novelty trend).
- Phase 8: Optional secure MCP admin panel (read-only).
- Phase 9: README/Product doc overhaul with diagrams.
- Phase 10: E2E flows, performance baselines, drift detection.

---

## 13. Explicit Deferrals (Reiterate)
- DO NOT remove or rotate secrets now.
- DO NOT implement secret scanners that block merge.
- DO NOT refactor security headers or logging exhaustively.
- These will be covered in “Security Hardening PR” (create tracking issue later).

---

### Final Instruction to Coding Agent
Proceed with Phase 2 tasks EXACTLY as defined. Preserve existing environment & secrets. Add new abstractions and scaffolds without breaking live flows. No mock logic. Update progress after each deliverable. Introduce GAP tasks if repository reality differs.

(End of Phase 2 Instruction File)
