# Test Strategy for EchoTune AI

## Overview

This document outlines the comprehensive testing strategy for EchoTune AI, covering all aspects of quality assurance, automation, and validation.

## Testing Philosophy

Our testing approach is built on the principle of **comprehensive validation** with **fail-fast feedback**. We implement a multi-layered testing strategy that ensures:

1. **Environment Integrity** - No placeholder secrets; real configuration validation
2. **Provider Resilience** - Auto-detection and testing of all LLM providers
3. **Functional Completeness** - End-to-end validation of recommendation engine
4. **Visual Consistency** - Comprehensive screenshot capture and comparison
5. **Performance Standards** - Latency monitoring with soft/hard thresholds
6. **Deployment Readiness** - Docker and infrastructure validation

## Test Architecture

### Schema v2 Reporting

All tests generate reports conforming to our standardized schema v2:

```json
{
  "schemaVersion": "2.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "runId": "run-1234567890-abcde",
  "success": true,
  "summary": {
    "totalTests": 10,
    "passedTests": 9,
    "failedTests": 1,
    "warningsCount": 2,
    "errorsCount": 0
  },
  "env": { ... },
  "providers": { ... },
  "recommendation": { ... },
  "docker": { ... },
  "screenshots": { ... },
  "performance": { ... }
}
```

## Test Layers

### 1. Environment Validation (`scripts/env-validate.js`)

**Purpose**: Ensures production-ready configuration before any testing begins.

**Validation Rules**:
- **Required Variables**: `MONGODB_URI`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `JWT_SECRET`
- **Placeholder Detection**: Fails on patterns like `your_*`, `changeme`, `xxx...`
- **Optional Providers**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc.
- **Test Bypass**: `SPOTIFY_TEST_ACCESS_TOKEN`, `SPOTIFY_TEST_REFRESH_TOKEN`

**Failure Policy**: FAIL - Environment validation is a hard requirement.

**Output**: `reports/env-validation.json`

### 2. Provider Detection & Testing (`scripts/providers/detect-providers.js`)

**Purpose**: Auto-detects available LLM providers and validates connectivity.

**Supported Providers**:
- OpenAI (models endpoint)
- Anthropic (Claude messages endpoint)
- Google Gemini (Generative AI API)
- Groq (OpenAI-compatible API)
- Perplexity (chat completions)
- Vertex AI (GCP authentication)
- xAI/Grok (models endpoint)

**Testing Strategy**:
- Environment variable detection with placeholder filtering
- Connectivity testing with appropriate endpoints
- Latency measurement and ranking
- Error categorization (auth, network, service)

**Failure Policy**: WARN - No providers is acceptable; individual provider failures don't fail the build.

**Output**: `reports/provider-status.json`, `reports/provider-latencies.json`

### 3. Recommendation Engine Probe (`scripts/recommendation-probe.js`)

**Purpose**: Validates the core music recommendation functionality.

**Test Scenarios**:
1. **Direct Endpoint Testing**: `GET /api/recommendations?strategy=hybrid`
2. **Strategy Validation**: Tests `hybrid`, `collaborative`, `content-based`
3. **Chat Fallback**: `POST /api/chat` with music request if direct endpoint fails
4. **Metrics Collection**: Latency, recommendation count, fallback usage

**Success Criteria**:
- At least one recommendation strategy works OR chat fallback provides recommendations
- Response times are reasonable (<15s for primary, <20s for fallback)

**Failure Policy**: WARN - Recommendation issues don't fail the build but are flagged.

**Output**: `reports/recommendation-engine.json`

### 4. Playwright E2E Flows with Screenshots (`tests/e2e/comprehensive-flows.spec.js`)

**Purpose**: Comprehensive browser-based testing with exhaustive screenshot capture.

**Flow Coverage**:
- **Authentication Flow** (`@auth`): Login, OAuth, callback handling
- **Settings Flow** (`@settings`): Configuration, provider selection
- **Chat Flow** (`@chat`): Message input, AI responses, provider switching
- **Recommendations Flow** (`@recommendations`): Strategy selection, music display
- **Error Flow** (`@errorflow`): 404 pages, network errors, JavaScript errors

**Screenshot Strategy**:
- **Every Step**: Screenshots captured for each test step
- **Multiple Viewports**: Desktop (1280x800) and Mobile (390x844)
- **Error Capture**: Automatic screenshots on page errors and console errors
- **Organized Storage**: `BROWSERSCREENSHOT-TESTING/{runId}/{flow}/`

**Naming Convention**: `{stepNumber}-{slug}-{viewport}.png`

**Failure Policy**: WARN - E2E issues don't fail the build but provide valuable feedback.

**Output**: `BROWSERSCREENSHOT-TESTING/`, `reports/screenshot-coverage.json`

### 5. Docker Validation (`scripts/docker-validate.js`)

**Purpose**: Validates containerization and deployment readiness.

**Validation Steps**:
1. **Build**: Docker image build with timing and size measurement
2. **Run**: Container startup with environment injection
3. **Health Check**: Endpoint availability within 2-minute timeout
4. **Endpoint Testing**: `/health`, `/api/chat`, `/api/recommendations`
5. **Log Collection**: Container logs capture for debugging

**Environment Strategy**:
- Minimal required environment for Docker testing
- Real secrets where available, test defaults otherwise
- Health check with progressive backoff (40 attempts, 3s intervals)

**Failure Policy**: FAIL - Docker validation failures indicate deployment issues.

**Output**: `reports/docker-validation.json`, `reports/docker-logs/`

### 6. Performance Smoke Testing (`scripts/perf-smoke-test.js`)

**Purpose**: Validates system performance under typical load.

**Test Parameters**:
- **Request Count**: 10 sequential chat requests
- **Metrics**: p50, p95, min, max, average latency
- **Provider Analysis**: Performance comparison across providers
- **Thresholds**: Soft warning at p95>3500ms, hard fail at p95>5000ms (if enforced)

**Test Messages**: Varied music requests to simulate real usage:
- "Can you recommend some music?"
- "Suggest jazz music for studying"
- "I want upbeat music for working out"

**Threshold Policy**:
- **Soft Threshold**: p95 > 3500ms → Warning
- **Hard Threshold**: p95 > 5000ms → Failure (only if `ENFORCE_PERF_THRESHOLDS=true`)

**Failure Policy**: CONDITIONAL - Fails only if hard thresholds are enforced and exceeded.

**Output**: `reports/perf-chat.json`

## Failure Policies

### Hard Failures (Build Breaking)
- Environment validation failures
- Docker build/runtime failures (if not skipped)
- Hard performance threshold violations (when enforced)
- Report aggregation failures

### Soft Failures (Warnings Only)
- No providers enabled
- Individual provider connectivity issues
- E2E test failures
- Soft performance threshold violations
- Missing baseline images
- Recommendation fallback usage

## Quality Gates

### Merge Requirements
- All required environment variables valid (no placeholders)
- At least one provider working OR test bypass tokens available
- Basic recommendation functionality (direct endpoint OR chat fallback)

### Optional Validations
- Docker build and runtime success
- E2E flows complete with screenshot coverage
- Performance within acceptable thresholds

This strategy ensures comprehensive validation while maintaining rapid development feedback.