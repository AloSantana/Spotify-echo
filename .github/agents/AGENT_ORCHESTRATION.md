# Agent Orchestration & Multi-Agent Workflows

This guide explains how to coordinate multiple AI agents with MCP servers for complex EchoTune AI development tasks.

## Overview

The EchoTune AI repository provides:
- **13 specialized agents** with distinct expertise
- **10 MCP servers** providing enhanced capabilities
- **Seamless integration** between agents and MCP servers
- **Optimized workflows** for music recommendation system development

## Agent Orchestration Principles

### 1. Task Decomposition

```
Complex Task: "Build AI-powered mood-based playlist feature"

Decomposition:
├── @agent:deep-research
│   └── Research mood-music correlation approaches and Spotify audio features
├── @agent:architect
│   └── Design mood detection + recommendation pipeline architecture
├── @agent:api-developer
│   └── Design API endpoints: POST /api/v1/music/mood-playlist
├── @agent:rapid-implementer
│   └── Implement mood detection, Spotify integration, AI ranking
├── @agent:testing-stability-expert
│   └── Create tests (unit + integration + edge cases)
├── @agent:code-reviewer
│   └── Security review: auth, Spotify token handling, input validation
├── @agent:performance-optimizer
│   └── Optimize: Redis caching, batch Spotify API calls
└── @agent:docs-master
    └── Document new API endpoint and usage examples
```

### 2. Sequential vs Parallel Execution

**Sequential** (tasks depend on each other):
```
Step 1: @agent:architect - Design recommendation architecture
  ↓ (wait for completion)
Step 2: @agent:rapid-implementer - Implement the design
  ↓ (wait for completion)
Step 3: @agent:testing-stability-expert - Create tests
  ↓ (wait for completion)
Step 4: @agent:docs-master - Document the feature
```

**Parallel** (independent tasks):
```
@agent:docs-master - Update API documentation
+
@agent:performance-optimizer - Profile MongoDB queries
+
@agent:testing-stability-expert - Add integration tests
(All can run simultaneously)
```

## EchoTune AI Workflow Patterns

### Pattern 1: Spotify Feature Development

```bash
# Phase 1: Design
@agent:architect "Design a listening history analysis feature that computes user taste profiles from Spotify audio features"

# Phase 2: API Design
@agent:api-developer "Design REST API for GET /api/v1/user/taste-profile endpoint"

# Phase 3: Implementation
@agent:rapid-implementer "Implement taste profile computation from listening history with Redis caching"

# Phase 4: Testing
@agent:testing-stability-expert "Create comprehensive tests for taste profile service, including Spotify API mocks"

# Phase 5: Review
@agent:code-reviewer "Security review of taste profile endpoint - check auth, MongoDB injection, data leakage"

# Phase 6: Docs
@agent:docs-master "Document taste profile API endpoint with examples"
```

### Pattern 2: Bug Fix (OAuth Issue)

```bash
# Step 1: Investigation
@agent:debug-detective "Investigate intermittent 401 errors on /api/v1/music/recommendations - analyze token refresh logic"

# Step 2: Fix
@agent:rapid-implementer "Fix token refresh race condition based on debug-detective's findings"

# Step 3: Regression Prevention
@agent:testing-stability-expert "Add tests to prevent token refresh race conditions from recurring"
```

### Pattern 3: Performance Sprint

```bash
# Step 1: Profile
@agent:performance-optimizer "Profile recommendation endpoint - identify slow Spotify API calls and missing Redis caching"

# Step 2: Implement
@agent:rapid-implementer "Implement batch audio features fetching and Redis caching based on performance analysis"

# Step 3: Verify
@agent:testing-stability-expert "Verify performance optimizations maintain correctness"
```

### Pattern 4: Repository Health Check

```bash
# Weekly health check workflow
@agent:repo-optimizer "Audit dependencies for outdated packages and security vulnerabilities"
@agent:testing-stability-expert "Run full test suite and report coverage gaps"
@agent:code-reviewer "Scan for new security issues in recent commits"
@agent:performance-optimizer "Profile critical recommendation paths for regressions"
@agent:docs-master "Verify API documentation matches implementation"
```

## Troubleshooting

### Agent Not Meeting Expectations
1. Be more specific in the prompt
2. Break task into smaller subtasks
3. Try different agent better suited to task

### Multiple Agents Conflicting
1. Use sequential workflow for dependent tasks
2. Review each agent's output before next step
3. Use git branches to isolate agent work

---

**Related Documentation**:
- [Agent README](.github/agents/README.md)
- [MCP Config](.github/copilot/mcp.json)
- [Coding Workflow](.github/agents/CODING_WORKFLOW.md)
