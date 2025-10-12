# GitHub Actions Workflow Troubleshooting Guide

## 🔍 Common Issues & Solutions

### 1. Budget Exceeded Errors

**Symptoms:**
- Workflows failing with "Budget limit reached" error
- `ai-analysis-disabled` label on repository
- Budget status issue showing HARD_STOP state

**Solution:**
```bash
# Check current budget status
python3 scripts/perplexity_costs.py budget

# Expected output:
# {
#   "can_proceed": false,
#   "state": "HARD_STOP",
#   "usage_percentage": 95.5,
#   "remaining_amount": 0.14
# }

# Wait for weekly reset (Monday 00:00 UTC) or add override label:
gh label create "override-budget-guard" --description "Override budget" --color "blue"
```

**Prevention:**
- Monitor budget usage regularly
- Reduce workflow frequency if approaching limit
- Use caching to reduce API calls
- Optimize queries to use fewer tokens

---

### 2. Workflow Timeout Errors

**Symptoms:**
- Workflow shows "cancelled" status
- Log shows "The job was canceled because it exceeded the maximum execution time"

**Solution:**
1. Check current timeouts in workflow files:
   ```yaml
   timeout-minutes: 30  # Adjust as needed
   ```

2. For long-running workflows:
   - Increase timeout value
   - Split into smaller jobs
   - Optimize slow operations
   - Add progress logging

3. Test timeout values:
   ```bash
   # Add timeout to test runs
   timeout 25m node scripts/music-research-automation.js
   ```

**Current Timeouts:**
- Music Research: 30 minutes
- Autonomous Development: 60 minutes
- Autonomous Coding: 120 minutes
- Budget Guard: 10 minutes
- AI Budget Monitor: 10 minutes

---

### 3. Circuit Breaker Errors

**Symptoms:**
- Error: "Circuit breaker is OPEN - too many recent failures"
- Multiple consecutive API failures in logs
- Requests blocked for 60 seconds

**Solution:**
1. **Check logs for root cause:**
   ```bash
   # Look for API errors before circuit breaker opened
   gh run view --log | grep "ERROR"
   ```

2. **Common causes:**
   - API key invalid or expired
   - Network connectivity issues
   - Rate limit exceeded
   - Budget limit reached

3. **Manual reset (if needed):**
   ```javascript
   const client = new BudgetAwarePerplexityClient();
   await client.initialize();
   client.resetCircuitBreaker();
   ```

4. **Wait for automatic reset:**
   - Circuit breaker resets after 60 seconds
   - Moves to HALF_OPEN state
   - Closes after 2 successful requests

---

### 4. Missing Scripts or Dependencies

**Symptoms:**
- Error: "Cannot find module 'xyz'"
- Error: "No such file or directory: scripts/xyz.py"
- Workflow step fails with "command not found"

**Solution:**
1. **Run smoke tests:**
   ```bash
   node scripts/workflow-smoke-test.js
   ```

2. **Install missing dependencies:**
   ```bash
   # Node.js
   npm install
   
   # Python
   pip install -r requirements.txt
   ```

3. **Verify script existence:**
   ```bash
   ls -la scripts/budget_guard.py
   ls -la scripts/perplexity_costs.py
   ls -la scripts/music-research-automation.js
   ```

4. **Check for typos in workflow files:**
   ```yaml
   # Correct
   run: python3 scripts/budget_guard.py
   
   # Incorrect
   run: python3 scripts/budgetguard.py  # Missing underscore
   ```

---

### 5. API Authentication Failures

**Symptoms:**
- Error: "401 Unauthorized"
- Error: "Invalid API key"
- Error: "PERPLEXITY_API_KEY not configured"

**Solution:**
1. **Verify API key is set:**
   ```bash
   # In GitHub Actions (check secrets)
   gh secret list
   
   # Should show: PERPLEXITY_API_KEY
   ```

2. **Test API key:**
   ```bash
   # Set key in environment
   export PERPLEXITY_API_KEY="your_key_here"
   
   # Test with Python
   python3 << 'EOF'
   import os, requests
   key = os.getenv('PERPLEXITY_API_KEY')
   r = requests.post('https://api.perplexity.ai/chat/completions',
     headers={'Authorization': f'Bearer {key}'},
     json={'model': 'sonar', 'messages': [{'role': 'user', 'content': 'test'}]})
   print(f"Status: {r.status_code}")
   EOF
   ```

3. **Update expired keys:**
   ```bash
   # Generate new key from Perplexity dashboard
   # Update in GitHub
   gh secret set PERPLEXITY_API_KEY
   ```

---

### 6. Rate Limit Errors

**Symptoms:**
- Error: "429 Too Many Requests"
- Error: "Rate limit exceeded"
- Multiple requests failing in quick succession

**Solution:**
1. **Automatic handling is built-in:**
   - Client waits 5 seconds on 429 error
   - Rate limiter enforces 20 req/min max
   - 2-second delay between requests

2. **If still hitting limits:**
   ```javascript
   // Reduce request rate
   const client = new BudgetAwarePerplexityClient({
     maxRequestsPerMinute: 15,  // Lower than 20
     minDelay: 3000              // 3 seconds instead of 2
   });
   ```

3. **Check for parallel requests:**
   - Avoid Promise.all() with multiple API calls
   - Use sequential processing instead
   - Batch similar queries

---

### 7. Workflow Not Triggering

**Symptoms:**
- Scheduled workflow doesn't run
- Manual workflow dispatch doesn't start
- Comment trigger doesn't work

**Solution:**
1. **Check schedule syntax:**
   ```yaml
   on:
     schedule:
       - cron: '0 */12 * * *'  # Every 12 hours
   ```
   
   Verify at: https://crontab.guru/

2. **For manual dispatch:**
   ```bash
   # Trigger manually
   gh workflow run "Workflow Name"
   
   # Check if it's running
   gh run list --workflow="Workflow Name"
   ```

3. **For comment triggers:**
   - Verify user has proper permissions (OWNER, COLLABORATOR, MEMBER)
   - Check trigger phrases match exactly
   - Look for typos in workflow conditions

4. **Check workflow is enabled:**
   ```bash
   # List workflows
   gh workflow list
   
   # Enable if needed
   gh workflow enable "Workflow Name"
   ```

---

### 8. MCP Server Connectivity Issues

**Symptoms:**
- Error: "Failed to connect to MCP server"
- Error: "Docker not available"
- MCP validation failing

**Solution:**
1. **Run MCP validation:**
   ```bash
   bash mcp-config/validate_mcp.sh
   ```

2. **Check Docker:**
   ```bash
   # Test Docker availability
   docker info
   
   # Pull required images
   docker pull ghcr.io/github/github-mcp-server
   ```

3. **Install missing packages:**
   ```bash
   # NPX packages (auto-installed)
   npx @modelcontextprotocol/server-filesystem --help
   
   # Python packages
   pip install mcp-server-git
   
   # Global NPM packages
   npm install -g github-repos-manager-mcp
   ```

4. **Check configuration files:**
   ```bash
   # Verify JSON syntax
   jq empty .vscode/mcp.json
   jq empty mcp-config/mcp_servers.json
   ```

---

### 9. Degraded Mode Not Working

**Symptoms:**
- Workflow fails completely when budget exhausted
- No cached data available
- Error: "No cached data available for degraded mode"

**Solution:**
1. **Ensure cache directory exists:**
   ```bash
   mkdir -p automation-artifacts
   ls -la automation-artifacts/
   ```

2. **Check for previous reports:**
   ```bash
   # Should have from previous successful run
   ls -la automation-artifacts/music-research-report.json
   ```

3. **Generate initial cache:**
   ```bash
   # Run once when budget available
   PERPLEXITY_API_KEY=your_key node scripts/music-research-automation.js
   ```

4. **Verify fallback logic:**
   ```javascript
   // Should use cached data when budget exhausted
   if (!budgetOk) {
     await this.runDegradedMode();
   }
   ```

---

### 10. High API Costs

**Symptoms:**
- Budget exhausted rapidly
- Usage much higher than expected
- Multiple expensive queries

**Solution:**
1. **Analyze usage:**
   ```bash
   python3 scripts/perplexity_costs.py usage | jq '.requests'
   ```

2. **Check for inefficient queries:**
   ```bash
   # Review logs for token usage
   gh run view --log | grep "tokens"
   ```

3. **Optimization strategies:**
   - Use cheaper models (sonar vs sonar-pro)
   - Reduce max_tokens parameter
   - Cache aggressively
   - Batch similar queries
   - Skip non-critical research

4. **Reduce schedule frequency:**
   ```yaml
   # Before: Every 4 hours
   - cron: '0 */4 * * *'
   
   # After: Every 12 hours
   - cron: '0 */12 * * *'
   ```

---

## 🔧 Debugging Tools

### 1. Workflow Smoke Tests
```bash
# Run comprehensive tests
node scripts/workflow-smoke-test.js

# Should show:
# ✅ Passed: 20+
# ⚠️ Warnings: <5
# ❌ Failed: 0
```

### 2. Budget Status Check
```bash
# Quick check
python3 scripts/perplexity_costs.py budget | jq '.'

# Detailed usage
python3 scripts/perplexity_costs.py usage | jq '.'
```

### 3. View Workflow Logs
```bash
# List recent runs
gh run list --limit 10

# View specific run
gh run view RUN_ID --log

# Watch live run
gh run watch
```

### 4. Test Scripts Locally
```bash
# Test music research (with budget check)
PERPLEXITY_API_KEY=your_key node scripts/music-research-automation.js

# Test budget guard
python3 scripts/budget_guard.py --verbose --dry-run

# Test MCP validation
bash mcp-config/validate_mcp.sh
```

---

## 📊 Monitoring Dashboard

### Key Metrics to Monitor
1. **Budget Usage:** Should stay under 70% during the week
2. **Workflow Success Rate:** Should be >95%
3. **API Request Count:** Should match expected patterns
4. **Circuit Breaker State:** Should be CLOSED
5. **Timeout Occurrences:** Should be rare

### Where to Check
- **GitHub Actions:** Repository → Actions tab
- **Budget Status:** Issues with `budget-status` label
- **Error Reports:** Issues with `workflow-failure` label
- **Artifacts:** Download from workflow runs

---

## 🆘 Emergency Contacts

### When to Escalate
- Repeated workflow failures across multiple types
- Budget exceeded and override not working
- API keys compromised
- Data loss or corruption
- Security concerns

### How to Report
1. Create GitHub issue with:
   - Workflow run link
   - Error logs
   - Budget status
   - Steps to reproduce

2. Include outputs from:
   ```bash
   node scripts/workflow-smoke-test.js > smoke-test.txt
   python3 scripts/perplexity_costs.py budget > budget.json
   gh run list --limit 20 > recent-runs.txt
   ```

---

## 📚 Additional Resources

- [Budget Management Guide](BUDGET_MANAGEMENT.md)
- [Perplexity Integration Guide](github-perplexity-integration-guide.md)
- [Workflow Smoke Tests](../scripts/workflow-smoke-test.js)
- [Budget-Aware Client](../scripts/budget-aware-perplexity-client.js)

---

**Last Updated:** 2025-10-12  
**Status:** ✅ All systems operational
