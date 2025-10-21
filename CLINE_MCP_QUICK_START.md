# Quick Setup Guide: Fix Cline MCP Settings Format

## 🔴 Problem

```
❌ Invalid MCP settings format
⚠️  No MCP servers installed (UI shows empty)
✓ github-mcp-server processes running in terminals 11-13
```

## ✅ Solution Already Applied!

The corrected `cline_mcp_settings.json` has been created at:

```
/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json
```

### ✨ Configuration Includes:

- ✅ **github** - GitHub repository management
- ✅ **filesystem** - File operations
- ✅ **memory** - Persistent context
- ✅ **git** - Git operations
- ✅ **sequential-thinking** - AI reasoning
- ✅ **fetch** - Web content retrieval
- ⚠️ **brave-search** - Web research (disabled by default)

### Validation Result:

```
✅ Valid Cline MCP configuration!
📊 Servers configured: 7
```

---

## 🔑 Step 1: Set Your Credentials

The configuration contains two placeholders that need your actual values:

### GitHub Token

```bash
# Find and replace:
REPLACE_WITH_YOUR_GITHUB_TOKEN

# With your GitHub Personal Access Token
# Get it from: https://github.com/settings/tokens
```

### Brave Search API Key (Optional)

```bash
# Find and replace:
REPLACE_WITH_YOUR_BRAVE_API_KEY

# Get from: https://api.search.brave.com/
```

### Option A: Edit File Directly

```bash
# On macOS/Linux
nano "/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json"
```

### Option B: Use Environment Variables

```bash
# Set in your shell
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"
export BRAVE_API_KEY="your_brave_key_here"
```

---

## 🔄 Step 2: Restart Cline

1. **Close** the Cline window/tab in VS Code
2. **Reopen** Cline or reload VS Code:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Linux/Windows)
   - Type "Developer: Reload Window"
   - Press Enter

---

## ✅ Step 3: Verify Installation

### In Cline, test each server:

**Test GitHub MCP:**

```
Show me the recent commits in the repo
```

**Test Filesystem MCP:**

```
List the files in /workspaces/Spotify-echo/src
```

**Test Git MCP:**

```
What are the last 5 commits?
```

**Test Fetch MCP:**

```
Fetch and summarize https://example.com
```

**Test Sequential Thinking:**

```
Think step-by-step: How would you optimize the music recommendation algorithm?
```

---

## 🔧 Troubleshooting

### Issue: "Still showing 'No MCP servers installed'"

**Solution:**

1. ✅ Check file was updated:

   ```bash
   cat "/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json" | head -20
   ```

2. ✅ Completely reload VS Code:

   - Close VS Code
   - Reopen it
   - Open Cline again

3. ✅ Check no syntax errors:
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json', 'utf8')))"
   ```

### Issue: "MCP server connection failed"

**Causes & Solutions:**

1. **Missing credentials** - Set `GITHUB_PERSONAL_ACCESS_TOKEN` env var
2. **Network issues** - Check internet connection
3. **Command not found** - Ensure npm/npx/uvx available:
   ```bash
   which npm npx uvx
   ```

### Issue: Specific server not working

1. Disable that server by adding `"disabled": true`
2. Restart Cline
3. Check if other servers work
4. Contact server maintainer

---

## 📊 Understanding the Format

### ✅ Correct Cline Format

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio", // ← REQUIRED
      "command": "npx", // ← REQUIRED
      "args": ["-y", "package-name"], // ← REQUIRED
      "env": {
        // ← OPTIONAL
        "API_KEY": "your-value"
      },
      "description": "..." // ← OPTIONAL
    }
  }
}
```

### ❌ Common Mistakes

```json
// ❌ Missing type field
{
  "command": "npx",
  "args": [...]
}

// ❌ Using ${input:...} pattern
{
  "type": "stdio",
  "env": {
    "TOKEN": "${input:github-token}"  // ← Cline doesn't support this
  }
}

// ❌ Not using stdio for command type
{
  "type": "docker",  // ← Only "stdio" supported
  "command": "docker",
  "args": [...]
}
```

---

## 📋 Configuration Details

| Server                  | Purpose            | Status      | Notes                               |
| ----------------------- | ------------------ | ----------- | ----------------------------------- |
| **github**              | Repo management    | ✅ Active   | Needs GitHub token                  |
| **filesystem**          | File operations    | ✅ Active   | Limited to /workspaces/Spotify-echo |
| **memory**              | Persistent context | ✅ Active   | No setup needed                     |
| **git**                 | Git commands       | ✅ Active   | Uses local git                      |
| **sequential-thinking** | AI reasoning       | ✅ Active   | No setup needed                     |
| **fetch**               | Web retrieval      | ✅ Active   | No setup needed                     |
| **brave-search**        | Web search         | ⏸️ Disabled | Optional - requires API key         |

---

## 🚀 Advanced: Run Validation Script

```bash
# Validate current configuration
node /workspaces/Spotify-echo/scripts/validate-cline-mcp.js

# Expected output:
# ✅ Valid Cline MCP configuration!
# 📊 Servers configured: 7
```

---

## 📚 Additional Resources

### Scripts Created for You

- **`/workspaces/Spotify-echo/scripts/convert-mcp-to-cline.js`** - Convert from VS Code format
- **`/workspaces/Spotify-echo/scripts/validate-cline-mcp.js`** - Validate configuration
- **`/workspaces/Spotify-echo/CLINE_MCP_SETTINGS_ANALYSIS.md`** - Detailed analysis

### Useful Commands

```bash
# Validate MCP settings
node /workspaces/Spotify-echo/scripts/validate-cline-mcp.js

# Check if specific command exists
which npm npx uvx git

# Set environment variables permanently
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="your_token"' >> ~/.bashrc
source ~/.bashrc
```

### Get Help

1. Check `/workspaces/Spotify-echo/CLINE_MCP_SETTINGS_ANALYSIS.md` for detailed troubleshooting
2. Review MCP server documentation at https://modelcontextprotocol.io/
3. Check Cline documentation at https://github.com/jnorthrup/cline

---

## ✨ What's Next?

Once verified, you can:

1. ✅ Ask Cline to help develop features
2. ✅ Use GitHub MCP for issue/PR management
3. ✅ Use Filesystem MCP for code exploration
4. ✅ Use Sequential Thinking for architecture decisions
5. ✅ Use Web search for research

---

**Last Updated:** October 20, 2025  
**Status:** ✅ Configuration Deployed  
**Validation:** ✅ All Checks Passed (7/7 servers)
