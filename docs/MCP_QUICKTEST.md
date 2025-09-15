# MCP Quick Test Guide

Fast local validation for MCP server readiness and graceful degradation behavior.

## Prerequisites

- Node.js 18+ (currently using Node.js 20.19.5)
- Executable permissions for shell scripts
- Valid MCP configuration in `.copilot/mcp-config.json` or fallback example file

## Quick Run

Copy and paste this command to run the basic smoke test:

```bash
bash scripts/mcp-smoke-test.sh
```

This will:
1. Verify the `reports/` directory exists
2. Run MCP agent bootstrap to generate capabilities report
3. Start MCP servers (community servers skipped by default)
4. Validate startup results and structural integrity
5. Output a concise summary line

## Enabling Community Servers

To include community/tier 3 servers in the smoke test:

```bash
ENABLE_COMMUNITY_MCP=1 bash scripts/mcp-smoke-test.sh
```

When enabled, the test will:
- Include servers with `category=community` or `priority>=6`
- Validate that at least one community server appears in the results
- Report `community_included=true` in the summary output

## Strict Mode

For stricter validation where any required server failure causes test failure:

```bash
MCP_STRICT_REQUIRED=true bash scripts/mcp-smoke-test.sh
```

In strict mode:
- The test fails if ANY required server fails to start
- Optional servers can still fail without affecting the overall result
- Useful for CI/CD pipelines where MCP reliability is critical

## Combined Example

```bash
MCP_STRICT_REQUIRED=true ENABLE_COMMUNITY_MCP=1 bash scripts/mcp-smoke-test.sh
```

## Interpreting Output

### Success Example

```
🧪 MCP SMOKE TEST
═══════════════════════════════════════════════════════════════
Environment:
  MCP_STRICT_REQUIRED: false
  ENABLE_COMMUNITY_MCP: 1
  Reports directory: /path/to/reports

[INFO] 📁 Ensuring reports directory exists...
[INFO] 🚀 Running MCP agent bootstrap...
[SUCCESS] MCP agent bootstrap completed successfully
[INFO] 🔄 Running MCP server startup...
[SUCCESS] MCP server startup completed successfully
[INFO] 🔍 Validating startup results...
[SUCCESS] MCP startup validation completed successfully
[INFO] 📊 Extracting summary metrics...
MCP_SMOKE_RESULT required_started=4 required_total=4 optional_started=8 community_included=true
[SUCCESS] Summary metrics extracted successfully
[SUCCESS] 🎉 MCP smoke test completed successfully!
```

### Summary Line Format

The summary line contains key metrics:
- `required_started`: Number of required servers that started successfully
- `required_total`: Total number of required servers configured
- `optional_started`: Number of optional servers that started successfully  
- `community_included`: Whether community servers were included in the test

### Failure Modes

**Bootstrap Failure:**
```
[ERROR] MCP agent bootstrap failed with non-zero exit code
[ERROR] 🚨 Smoke test failed at bootstrap stage
```

**Startup Failure:**
```
[ERROR] MCP server startup failed with non-zero exit code
[ERROR] 🚨 Smoke test failed at startup stage
```

**Validation Failure:**
```
[ERROR] MCP startup validation failed
[ERROR] 🚨 Smoke test failed at validation stage
```

**Strict Mode Failure:**
```
[ERROR] Validation failed: Strict mode failure: 3/4 required servers started
```

## Testing Failure Scenarios

### Simulating a Strict Failure

To test the strict mode failure path, you can temporarily edit the MCP configuration:

1. **Back up the configuration:**
   ```bash
   cp .copilot/mcp-config.example.json .copilot/mcp-config.example.json.bak
   ```

2. **Edit the filesystem command** (make it invalid):
   ```bash
   # Change "command": "node" to "command": "nonexistent-command" for filesystem server
   sed -i.bak 's/"command": "node"/"command": "nonexistent-command"/' .copilot/mcp-config.example.json
   ```

3. **Run strict mode test:**
   ```bash
   MCP_STRICT_REQUIRED=true bash scripts/mcp-smoke-test.sh
   ```

4. **Expect failure** with exit code > 0 and message referencing the failed required server

5. **Restore the configuration:**
   ```bash
   mv .copilot/mcp-config.example.json.bak .copilot/mcp-config.example.json
   ```

**Expected output:**
```
[ERROR] Validation failed: Strict mode failure: 3/4 required servers started
[ERROR] 🚨 Smoke test failed at validation stage
```

## Troubleshooting

**"No MCP configuration file found":**
- Ensure `.copilot/mcp-config.json` or `.copilot/mcp-config.example.json` exists
- Check file permissions are readable

**"Capabilities report not found":**
- Verify `node scripts/mcp-agent-bootstrap.js` runs successfully
- Check Node.js version is 18+
- Ensure reports directory is writable

**"Start summary report not found":**
- Check `./start-mcp-servers.sh` completes successfully
- Verify the script has executable permissions
- Review logs in `/tmp/mcp-*.log` files

**JSON validation errors:**
- Reports may be malformed due to script interruption
- Re-run the test to regenerate clean reports
- Check for disk space issues

## File Locations

- **Smoke test script:** `scripts/mcp-smoke-test.sh`
- **Validation helper:** `scripts/validate-mcp-start.js`
- **Bootstrap script:** `scripts/mcp-agent-bootstrap.js`
- **Startup script:** `start-mcp-servers.sh`
- **Reports directory:** `reports/`
- **Capabilities report:** `reports/mcp-capabilities.json`
- **Start summary:** `reports/mcp-start-summary.json`

## Integration with CI/CD

The smoke test is designed for automated use in CI/CD pipelines. Exit codes:
- `0`: All tests passed
- `1`: One or more tests failed

Example GitHub Actions usage:
```yaml
- name: Run MCP Smoke Test
  run: bash scripts/mcp-smoke-test.sh
  
- name: Run MCP Smoke Test (Strict + Community)
  run: |
    MCP_STRICT_REQUIRED=true ENABLE_COMMUNITY_MCP=1 \
    bash scripts/mcp-smoke-test.sh
```