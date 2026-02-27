# Optimized Coding Workflow for EchoTune AI

This guide provides optimized development workflows leveraging custom agents and MCP servers for maximum productivity and code quality.

## Quick Reference: Development Scenarios

### 🎵 New Spotify Feature
```
Time: 30-60 minutes | Quality: Production-ready
Agents: architect → api-developer → rapid-implementer → testing-stability-expert → code-reviewer → docs-master
```

### 🐛 Bug Fix (OAuth/API)
```
Time: 15-30 minutes | Quality: Regression-proof
Agents: debug-detective → rapid-implementer → testing-stability-expert
```

### ⚡ Performance Optimization
```
Time: 20-40 minutes | Quality: Benchmarked improvement
Agents: performance-optimizer → rapid-implementer → testing-stability-expert
```

### 📚 Documentation Update
```
Time: 10-20 minutes | Quality: Verified accuracy
Agents: docs-master → code-reviewer
```

### 🔒 Security Audit
```
Time: 30-45 minutes | Quality: Production-secure
Agents: code-reviewer → testing-stability-expert → docs-master
```

## Workflow 1: New Music Feature (Full Cycle)

### Stage 1: Architecture (5-10 min)
```bash
@agent:architect "Analyze codebase and design structure for AI-powered playlist mood matching feature. Include:
- Service layer organization
- MongoDB schema changes
- Spotify API integration points
- Redis caching strategy
- API endpoint design"
```

### Stage 2: API Design (5 min)
```bash
@agent:api-developer "Design REST API endpoints for playlist mood matching:
- POST /api/v1/music/mood-playlist (body: { mood, limit })
- GET /api/v1/music/mood-playlist/:id
Include request/response schemas and error codes"
```

### Stage 3: Implementation (20-30 min)
```bash
@agent:rapid-implementer "Implement mood-based playlist feature:
- src/services/MoodPlaylistService.js (business logic)
- src/routes/api/v1/mood-playlist.js (Express route)
- src/models/MoodPlaylist.js (MongoDB schema)
Include Redis caching, error handling, Spotify token refresh"
```

### Stage 4: Testing (10-15 min)
```bash
@agent:testing-stability-expert "Create comprehensive tests for mood playlist feature:
- tests/unit/services/MoodPlaylistService.test.js
- tests/integration/api/mood-playlist.test.js
Cover: auth validation, Spotify API mocking, cache hits, error scenarios"
```

### Stage 5: Security Review (5-10 min)
```bash
@agent:code-reviewer "Security review of mood playlist implementation:
- Check auth middleware usage
- Validate MongoDB queries
- Verify Spotify token handling
- Check input sanitization"
```

### Stage 6: Documentation (5-10 min)
```bash
@agent:docs-master "Document mood playlist feature:
- Add endpoint to docs/API.md
- Update README.md features list
- Add usage example to docs/DEVELOPMENT.md"
```

### Total Time: ~60-90 minutes for production-ready feature

## Workflow 2: Spotify OAuth Bug Fix

### Step 1: Investigation (10 min)
```bash
@agent:debug-detective "Investigate Spotify auth bug: users get 401 after 1 hour even when actively using app.
- Analyze src/middleware/spotifyAuth.js
- Check token refresh logic
- Review MongoDB token storage
- Look for race conditions in concurrent requests"
```

### Step 2: Fix (5-10 min)
```bash
# Implement fix based on debug-detective's findings
@agent:rapid-implementer "Fix token refresh issue based on debug-detective's analysis:
- Add mutex lock for token refresh
- Implement proactive refresh (5 min before expiry)
- Add retry logic for 401 responses"
```

### Step 3: Prevention (5 min)
```bash
@agent:testing-stability-expert "Add regression tests for token refresh:
- Test concurrent requests during token refresh
- Test proactive refresh timing
- Test retry logic on 401"
```

## Workflow 3: Performance Optimization Sprint

### Phase 1: Profiling (10 min)
```bash
@agent:performance-optimizer "Profile recommendation endpoint performance:
- Identify slow MongoDB queries
- Find N+1 Spotify API call patterns
- Check Redis cache hit rates
- Measure response times"
```

### Phase 2: Implementation (15-20 min)
```bash
@agent:rapid-implementer "Implement performance fixes:
- Add batch audio features fetching
- Add Redis caching for user top tracks (TTL: 1h)
- Add MongoDB indexes for recommendation queries
- Implement parallel Promise.all() data fetching"
```

### Phase 3: Benchmarking (5 min)
```bash
@agent:testing-stability-expert "Benchmark performance improvements:
- Measure before/after response times
- Verify cache hit rates
- Confirm no correctness regression"
```

## Measuring Success

### Code Quality Metrics
- **Security**: Zero critical vulnerabilities
- **Testing**: ≥80% code coverage on services
- **Performance**: Recommendations served < 300ms (p95)
- **Documentation**: 100% of public API endpoints documented

### Expected Time Savings

| Task | Manual | With Agents | Savings |
|------|--------|-------------|---------|
| Feature Development | 120 min | 60-90 min | 30-50% |
| Bug Fix | 45 min | 20-30 min | 33-56% |
| Code Review | 30 min | 10-15 min | 50-67% |
| Documentation | 60 min | 25-30 min | 50-58% |
| Security Audit | 90 min | 50-60 min | 33-44% |

## Best Practices Summary

1. **Start with Architecture**: Use architect to analyze and plan
2. **Test Early**: Don't wait until the end to add tests
3. **Review Security**: Always run security review before merge
4. **Document as You Go**: Update docs alongside code
5. **Cache Aggressively**: Profile before optimizing
6. **Iterate**: Refine agent requests based on results
7. **Validate Spotify Mocks**: Ensure tests mock Spotify API properly

---

**Pro Tip**: For Spotify-specific tasks, always ensure your tests mock the Spotify API client properly to avoid real API calls during testing.

**Related**: [Agent README](.github/agents/README.md) | [Agent Orchestration](.github/agents/AGENT_ORCHESTRATION.md)
