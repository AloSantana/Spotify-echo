# Budget Management System - Quick Reference

## 🎯 Overview

The EchoTune AI project implements comprehensive budget management for Perplexity API usage to prevent cost overruns while maintaining automation capabilities.

**Weekly Budget:** $3.00 (~$12/month)
**Enforcement:** Automatic with multiple layers of protection

## 🚦 Budget States

| State | Usage | Behavior | Actions |
|-------|-------|----------|---------|
| **OK** | 0-50% | Normal operation | Full research, all models available |
| **WARNING** | 50-70% | Reduced operation | Cheaper models, fewer queries |
| **MINIMAL** | 70-90% | Critical only | Minimal queries, basic models |
| **HARD_STOP** | 90-100% | Blocked | No new API calls, degraded mode |

## 📊 How It Works

### 1. Weekly Budget Tracking
- Budget resets every Monday at 00:00 UTC
- Tracked by ISO week (e.g., "2025-W02")
- Automatic rollover and reset
- Historical usage stored for 12 weeks

### 2. Pre-flight Checks
All Perplexity workflows include a `budget-check` job:
```yaml
budget-check:
  runs-on: ubuntu-latest
  outputs:
    can_proceed: ${{ steps.check.outputs.can_proceed }}
    budget_state: ${{ steps.check.outputs.state }}
```

### 3. Adaptive Behavior
Workflows automatically adjust based on budget:
- **50%+ usage:** Reduce query count, use cheaper models
- **70%+ usage:** Minimal queries only, skip non-critical research
- **90%+ usage:** All requests blocked, use cached data

### 4. Circuit Breaker Pattern
Prevents cascading failures:
- Opens after 3 consecutive failures
- Blocks requests for 60 seconds
- Half-open state for testing recovery
- Automatic reset when stable

### 5. Rate Limiting
- Maximum 20 requests per minute
- 2-second delay between requests
- Automatic backoff on rate limit errors

## 🛠️ Tools & Scripts

### Budget Check Script
```bash
# Check current budget status
python3 scripts/perplexity_costs.py budget

# Get weekly usage
python3 scripts/perplexity_costs.py usage

# Estimate cost for planned operation
python3 scripts/perplexity_costs.py estimate --tokens-in 1000 --tokens-out 500

# Clean old logs
python3 scripts/perplexity_costs.py cleanup --retention-weeks 12
```

### Budget-Aware Client (Node.js)
```javascript
const { BudgetAwarePerplexityClient } = require('./scripts/budget-aware-perplexity-client');

const client = new BudgetAwarePerplexityClient();
await client.initialize();

const result = await client.query('Your research question', {
  maxTokens: 1000,
  returnCitations: true
});

client.printStats();
```

### Music Research Automation
```bash
# Run with automatic budget awareness
PERPLEXITY_API_KEY=your_key node scripts/music-research-automation.js

# The script will:
# 1. Check budget before starting
# 2. Adapt research scope based on usage
# 3. Use degraded mode if budget exhausted
# 4. Print comprehensive statistics
```

## 📈 Monitoring

### GitHub Actions
Budget status is checked automatically:
- **Budget Guard:** Every 6 hours
- **Research Workflows:** Before each run
- **Autonomous Cycles:** Pre-flight checks

### Manual Monitoring
```bash
# Quick status check
python3 scripts/perplexity_costs.py budget | jq '.'

# View detailed usage
python3 scripts/perplexity_costs.py usage --week 2025-W02 | jq '.'
```

### Budget Status Issues
When budget approaches/exceeds limits:
- GitHub issue created automatically
- Labels applied: `budget-status`, `budget-warning`
- Updated every 6 hours
- Auto-closes when budget resets

## 🚨 Emergency Procedures

### Budget Exceeded
1. **Automatic Response:**
   - All Perplexity requests blocked
   - Workflows switch to degraded mode
   - Repository label `ai-analysis-disabled` added

2. **Manual Override (if urgent):**
   ```bash
   # Add override label
   gh label create "override-budget-guard" --description "Override budget" --color "blue"
   ```

3. **Wait for Reset:**
   - Budget resets Monday 00:00 UTC
   - Deferred issues automatically retried
   - Status issue updated with reset time

### Workflow Failures
1. Check workflow logs in GitHub Actions
2. Verify budget status: `python3 scripts/perplexity_costs.py budget`
3. Review circuit breaker state in logs
4. Check for API key issues

## 💡 Best Practices

### For Developers
1. **Always use the budget-aware client** instead of direct API calls
2. **Check budget before expensive operations**
3. **Implement graceful degradation** for budget exhaustion
4. **Cache aggressively** to reduce API calls
5. **Test with degraded mode** to ensure fallbacks work

### For Automation
1. **Add pre-flight budget checks** to all Perplexity workflows
2. **Use adaptive scoping** based on budget state
3. **Implement timeouts** to prevent hangs
4. **Add error handling** for budget exhaustion
5. **Log statistics** for monitoring and optimization

### For Cost Optimization
1. **Use cheaper models** when appropriate:
   - `llama-3.1-sonar-small-128k-online` for simple queries
   - `llama-3.1-sonar-huge-128k-online` for complex analysis
2. **Reduce max_tokens** when full response not needed
3. **Batch similar queries** to reduce overhead
4. **Cache responses** with 24-hour expiration
5. **Schedule workflows** to avoid overlapping runs

## 📝 Configuration

### Budget Settings (`.github/perplexity-config.yml`)
```yaml
weekly_budget_usd: 3.00
warn_threshold_pct: 70
hard_stop_threshold_pct: 100
default_model: sonar

model_policies:
  - name: sonar
    input_cost_per_million: 1.00
    output_cost_per_million: 1.00
    max_tokens: 4096
```

### Schedule Optimization
Current schedules (reduced for budget efficiency):
- **Autonomous Coding:** Every 12 hours (was 4h)
- **Autonomous Development:** Every 12 hours (was 6h)
- **Budget Guard:** Every 6 hours (was 4h)
- **Music Research:** Weekly Monday 9am UTC

## 📚 Additional Resources

- [Full Integration Guide](docs/github-perplexity-integration-guide.md)
- [Budget Guard Script](scripts/budget_guard.py)
- [Cost Management](scripts/perplexity_costs.py)
- [Budget-Aware Client](scripts/budget-aware-perplexity-client.js)
- [Music Research Automation](scripts/music-research-automation.js)

## 🆘 Support

If you encounter issues:
1. Check the [workflow smoke tests](scripts/workflow-smoke-test.js)
2. Review GitHub Actions logs
3. Verify API key configuration
4. Check budget status and circuit breaker state
5. Open an issue with error logs and budget status

---

**Last Updated:** 2025-10-12
**System Status:** ✅ All workflows operational with budget controls
