# 🔍 Perplexity Browser Research Results

**Generated**: 2025-12-29T00:33:02.083816

### 🔮 EchoTune AI — 2026+ Research‑Driven Roadmap Update

This section extends the existing roadmap with new priorities derived from current music‑AI, Spotify, frontend, MCP, performance, security, and AI‑agent best practices.[1][2][3]

---

## 1) New High‑Priority Tasks from Research

### 1.1 Emotion‑Aware & Microgenre Discovery (Upgrade to Discovery Engine)

**Rationale:** AI music discovery is moving toward **emotional resonance**, microgenres, and cross‑platform signals, not just collaborative filtering.[1][2]

**Tasks**

- **[H] Emotion‑Aware Recommendation Layer**  
  - Add sentiment/emotion embedding for tracks using lyrics + Spotify audio features (valence, energy, tempo, mode) and simple classifier.[1][2]  
  - Extend user profiles with *time‑of‑day + mood* vectors and emotional history.  
  - Integrate into ranking for discovery modes and chat recommendations.  
  - *Complexity:* 8

- **[H] Microgenre Detection & Tagging v1**  
  - Use unsupervised clustering (e.g., k‑means/DBSCAN) on audio features + playlist co‑occurrence to tag **microgenres**.[1]  
  - Persist microgenre labels in MongoDB for use in discovery UI and analytics.  
  - Experiment UI: “Dive into this microgenre” entry points.  
  - *Complexity:* 7

- **[M] Cross‑Platform Virality Signals (TikTok/short‑video aware)**  
  - Add data model hooks to ingest “external popularity signals” (even as manual/admin fields initially).[1][2]  
  - Weight tracks with external virality higher in certain discovery modes (e.g., “Trending Social”).  
  - *Complexity:* 5

---

## 2) Updated Priorities Based on 2025–2026 Tech Trends

### 2.1 Priority Re‑ranking

- **Move to Critical**
  - **AI Transparency & Labeling** (already High → **Critical**)  
    - Align with growing regulation and expectations around AI transparency and provenance in music tools.[1][3]  
  - **Emotion‑Aware Recommendation Layer** (new, see 1.1)

- **Move to High**
  - **Microgenre Discovery Engine** (already planned → **High**)  
    - Explicit microgenre tagging and exposure are becoming central to AI‑accelerated “micro‑cult” listening.[1]  
  - **Performance Monitoring & p50/p95/p99** (in progress → **High**)  
    - Real‑time music/chat apps are highly latency sensitive; 200 ms p95 remains a competitive requirement.

- **Keep as Medium but Emphasize**
  - **Generative AI Integration (text‑to‑music, stem separation, remix)**  
    - Industry shows strong adoption of AI for **stem separation and mastering**, plus text‑to‑music and remix workflows.[1][2]

---

## 3) Implementation Suggestions for Emerging Technologies

### 3.1 Generative Music & Creative Tools

**Tasks**

- **[M] Text‑to‑Music Provider Abstraction**  
  - Design a generic “MusicGenerationProvider” interface (similar to LLM provider manager) for external text‑to‑music APIs (e.g., MusicLM‑like services).[2]  
  - Add server endpoints for generation requests + polling job status.  
  - *Complexity:* 6

- **[M] Stem Separation & Remix Pipeline v1**  
  - Integrate a stem‑separation backend (self‑hosted or SaaS) to split Spotify tracks the user owns rights to / uploads.[1][2]  
  - Provide simple UI: upload or select track → get stems (vocals/drums/bass/other) → create remix playlists.  
  - *Complexity:* 7

- **[M] AI‑Assisted Playlist Editing in Chat**  
  - Extend chat to act on playlists directly: “make this more upbeat,” “turn this into focus microgenre X,” etc.  
  - Use audio features + microgenre tags to auto‑apply edits.  
  - *Complexity:* 5

### 3.2 React 19 & Modern Frontend Patterns

**Tasks**

- **[H] React 19 Migration Plan & Pilot**  
  - Migrate a non‑critical route (e.g., Analytics or Settings) to **React 19 server components + concurrent rendering**.  
  - Adopt Suspense for data fetching around chat and discovery views to improve perceived latency.  
  - *Complexity:* 7

- **[M] Streaming UI for Large Lists & Analytics**  
  - Use Suspense + streaming SSR for long playlists/analytics tables to reduce TTFB and improve Lighthouse.[2]  
  - Integrate skeleton UIs and optimistic rendering for chat responses and provider failover status.  
  - *Complexity:* 6

### 3.3 MCP & AI Agent Integrations

**Tasks**

- **[M] MCP “Music Research & Curation” Tooling**  
  - Expose EchoTune endpoints (discovery, analytics, playlist ops) as MCP tools usable by AI agents (Cursor, Claude, etc.).  
  - Allow agents to auto‑curate playlists, run A/B tests on recommendation modes, generate reports.  
  - *Complexity:* 6

- **[L] AI Dev‑Agent Safe Ops Layer**  
  - Create restricted internal MCP / API surface for coding agents (Grok, Copilot, etc.) with strict auth and rate‑limits, allowing them to assist in performance tuning, log analysis, and test generation safely.  
  - *Complexity:* 8

---

## 4) Performance Optimization Opportunities

### 4.1 Backend & Data

**Tasks**

- **[H] Latency Budget & Provider Routing Optimization**  
  - Define per‑request latency SLOs (chat vs discovery vs analytics).  
  - Enhance circuit breaker routing with **latency‑aware load balancing**, using rolling p95 per provider.[1][2]  
  - *Complexity:* 6

- **[M] MongoDB Query & Index Audit for Music Analytics**  
  - Implement compound indexes tailored to top analytics queries (e.g., userId + createdAt, trackId + eventType).[2]  
  - Validate plans using `explain()`; store findings in `WORKFLOW_STATE.md`.  
  - *Complexity:* 5

- **[M] Response Streaming for Large Analytics / Discovery Results**  
  - Convert heavy analytics and discovery responses to **chunked streaming** from Node to frontend to avoid timeouts and reduce p95.[2]  
  - *Complexity:* 5

### 4.2 Frontend & Client

**Tasks**

- **[H] Performance Monitoring: Full p50/p95/p99 + Per‑Route Metrics**  
  - Complete existing monitoring: record per‑route latency (API and client), error rates, and Core Web Vitals.  
  - Add dashboards to Analytics for ops visibility and goal tracking (API p95 < 200 ms, failover < 100 ms).  
  - *Complexity:* 6

- **[M] Image/Asset & Bundle Optimization for Lighthouse > 90**  
  - Code‑split heavy views (analytics, discovery), lazy‑load charts, optimize fonts and icons.  
  - Add prefetching for high‑probability next pages (e.g., from chat → discovery).  
  - *Complexity:* 4

---

## 5) Security Enhancement Recommendations

### 5.1 Platform & API Security

**Tasks**

- **[H] Comprehensive OAuth & Token Hardening**  
  - Ensure Spotify OAuth PKCE flow uses shortest practical token lifetimes, strict scopes, and proper refresh rotation.[2]  
  - Add automated checks to detect over‑scoped or unused permissions.  
  - *Complexity:* 4

- **[H] Centralized Secrets & Provider Key Management**  
  - Move all provider keys (OpenAI, Gemini, OpenRouter, Spotify, generative music APIs) to a single secrets manager (e.g., cloud KMS or Vault).  
  - Integrate rotation policies and access logs; update MCP and dev tools to read from this layer.  
  - *Complexity:* 6

- **[M] Rate Limiting & Abuse Detection on Chat & Discovery**  
  - Implement per‑user and per‑IP rate limits for chat, playlist writes, and generative features.  
  - Simple anomaly detection: sudden spikes in requests, unusual geographic patterns.  
  - *Complexity:* 5

### 5.2 Data Privacy, AI Transparency & Compliance

**Tasks**

- **[C] AI Provenance & Transparency Framework**  
  - Tag all AI‑influenced actions (recommendations, generative tracks, remix suggestions) with metadata, surfaced in UI as **“AI‑Augmented”** or similar.[1][3]  
  - Store provenance in MongoDB for auditability and future regulatory needs.  
  - *Complexity:* 6

- **[M] Privacy‑Preserving Personalization**  
  - Introduce clear user controls for:  
    - using mood/time/location signals,  
    - opting out of AI personalization.  
  - Ensure data retention policies for telemetry (enforced by MongoDB TTL indexes) match privacy expectations.[1][3]  
  - *Complexity:* 5

- **[M] Secure AI‑Agent Collaboration Guidelines**  
  - Document guardrails for GitHub Copilot and other coding agents (no secret leakage, no production‑data in prompts).  
  - Add pre‑commit hooks to detect accidental credential or PII inclusion.  
  - *Complexity:* 3

---

## 6) Suggested Integration into Existing Milestones

- **Extend M2 (Context‑Aware Conversations)**  
  - Add Emotion‑Aware Recommendation Layer, AI Provenance tags, and context opt‑out UX.
- **Extend M3 (Discovery Modes & Audio Features)**  
  - Include Microgenre Detection, cross‑platform virality weighting, and AI‑assisted playlist editing.
- **Extend M4 (Analytics Dashboard)**  
  - Add latency/SLI dashboards, MongoDB index audit views, and security/abuse metrics panels.
- **New Milestone M5 — Generative & Creative Studio**
  - Text‑to‑music provider abstraction, stem separation/remix, collaborative creation tools, and React 19 streaming UX for creative workflows.