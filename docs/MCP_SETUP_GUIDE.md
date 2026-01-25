# MCP Server Ecosystem Setup Guide

## Overview

This guide explains how to set up and configure the complete MCP (Model Context Protocol) server ecosystem for GitHub Copilot Coding Agent in the Spotify-Echo project.

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Available MCP Servers](#available-mcp-servers)
3. [Required Secrets](#required-secrets)
4. [Setup Instructions](#setup-instructions)
5. [Verification Steps](#verification-steps)
6. [Troubleshooting](#troubleshooting)
7. [Usage Guide](#usage-guide)

## What is MCP?

The Model Context Protocol (MCP) is an open protocol that enables AI assistants like GitHub Copilot to securely connect to external tools and data sources. Our MCP ecosystem includes:

- **10 MCP Servers** providing enhanced capabilities
- **4 Custom Agents** with specialized expertise
- **Zero API costs** for Gemini AI consultation
- **Automated workflows** for development, testing, and deployment

## Available MCP Servers

### 🧠 Core Reasoning & Memory

#### sequential-thinking
- **Purpose**: Step-by-step reasoning for complex problems
- **Command**: `npx -y @modelcontextprotocol/server-sequential-thinking`
- **Use Cases**: Complex debugging, multi-step refactoring, architecture decisions
- **API Costs**: Free

#### memory
- **Purpose**: Persistent context across sessions
- **Command**: `npx -y @modelcontextprotocol/server-memory`
- **Use Cases**: Store decisions, patterns, project knowledge
- **API Costs**: Free

### 🤖 AI Consultation

#### gemini-bridge
- **Purpose**: Consult Google Gemini AI for code analysis
- **Command**: `uvx gemini-bridge`
- **Environment Variables**:
  - `GEMINI_BRIDGE_TIMEOUT`: `120` (seconds)
- **Use Cases**: Security review, code quality, architecture validation
- **API Costs**: **ZERO** - Uses free Gemini CLI
- **Source**: [eLyiN/gemini-bridge](https://github.com/eLyiN/gemini-bridge)
- **Available Models**:
  - `flash`: Fast responses, good for quick reviews
  - `pro`: Advanced reasoning, use for complex analysis

### 🔄 GitHub & Version Control

#### github
- **Purpose**: Full GitHub API access (issues, PRs, repos)
- **Command**: `npx -y @modelcontextprotocol/server-github`
- **Environment Variables**:
  - `GITHUB_PERSONAL_ACCESS_TOKEN`: Required (from secrets)
- **Use Cases**: Issue management, PR automation, repository operations
- **API Costs**: Free (GitHub API)

#### git
- **Purpose**: Git operations (log, diff, blame, status)
- **Command**: `npx -y @modelcontextprotocol/server-git`
- **Use Cases**: Version control, code history, branch management
- **API Costs**: Free

### 📂 File System

#### filesystem
- **Purpose**: Read/write file operations
- **Command**: `npx -y @modelcontextprotocol/server-filesystem .`
- **Use Cases**: Code editing, file management
- **API Costs**: Free

### 🌐 Browser Automation

#### playwright
- **Purpose**: Cross-browser testing (Chromium, Firefox, WebKit)
- **Command**: `npx -y @playwright/mcp`
- **Use Cases**: E2E testing, cross-browser validation
- **API Costs**: Free
- **Source**: Microsoft official MCP server

#### puppeteer
- **Purpose**: Chrome automation & screenshots
- **Command**: `npx -y @modelcontextprotocol/server-puppeteer`
- **Use Cases**: UI automation, screenshot capture, PDF generation
- **API Costs**: Free

### 🔍 Search & Research

#### brave-search
- **Purpose**: Privacy-focused web search
- **Command**: `npx -y @modelcontextprotocol/server-brave-search`
- **Environment Variables**:
  - `BRAVE_API_KEY`: Required (from secrets)
- **Use Cases**: Documentation search, best practices research
- **API Costs**: **FREE tier: 2000 queries/month**
- **Paid tier**: $5/month for 20,000 queries

#### fetch
- **Purpose**: HTTP requests and content retrieval
- **Command**: `npx -y @modelcontextprotocol/server-fetch`
- **Use Cases**: API testing, documentation retrieval
- **API Costs**: Free

## Required Secrets

The following secrets must be added to your GitHub repository settings for full MCP functionality.

### 1. COPILOT_MCP_GITHUB_TOKEN

**Purpose**: Enables GitHub MCP server to access repository data, issues, and PRs.

**Permissions Required**:
- `repo` (Full repository access)
- `read:org` (Read organization data)
- `workflow` (Update GitHub Actions workflows)

**How to Create**:
1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name: `Copilot MCP GitHub Token`
4. Select scopes:
   - ✅ `repo` (all sub-scopes)
   - ✅ `read:org`
   - ✅ `workflow`
5. Generate token and **copy it immediately** (you won't see it again)
6. Add to repository:
   - Go to Repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `COPILOT_MCP_GITHUB_TOKEN`
   - Value: (paste your token)
   - Click "Add secret"

### 2. COPILOT_MCP_BRAVE_API

**Purpose**: Enables Brave Search MCP server for web research.

**How to Obtain**:
1. Visit [Brave Search API](https://brave.com/search/api/)
2. Click "Get Started" or "Sign Up"
3. Create an account or sign in
4. Navigate to API Keys section
5. Generate a new API key
6. **Free Tier**: 2000 queries/month (sufficient for most projects)
7. Copy the API key

**How to Add to GitHub**:
1. Go to Repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `COPILOT_MCP_BRAVE_API`
4. Value: (paste your Brave API key)
5. Click "Add secret"

**Optional**: If you need more than 2000 queries/month, upgrade to paid tier ($5/month for 20,000 queries).

### 3. Gemini CLI Authentication (Optional)

**Note**: Gemini Bridge uses the Gemini CLI which is **free** and requires a Google account.

**Setup** (if needed in your environment):
1. Install Gemini CLI: `uvx gemini-bridge` (auto-installs on first use)
2. Authenticate: Follow prompts if authentication is required
3. No API key needed - uses Google account authentication

**No GitHub Secret Required** for Gemini - authentication happens via Google account.

## Setup Instructions

### Step 1: Verify MCP Configuration

The MCP configuration is already set up in `.github/copilot/mcp.json`. Verify it exists:

```bash
cat .github/copilot/mcp.json
```

You should see all 10 MCP servers configured.

### Step 2: Add Required Secrets

Add the required secrets to your GitHub repository as described in the [Required Secrets](#required-secrets) section above.

**Required for full functionality**:
- ✅ `COPILOT_MCP_GITHUB_TOKEN` (mandatory for GitHub operations)
- ✅ `COPILOT_MCP_BRAVE_API` (optional but recommended for research)

### Step 3: Verify Agent Configuration

Check that all custom agents are available:

```bash
ls -la .github/copilot/agents/
```

You should see:
- `mcp-power-developer.agent.md` - Elite developer with full MCP ecosystem
- `gemini-consultant.agent.md` - Gemini AI consultation specialist
- `mcp-fullstack-developer.agent.md` - Full-stack development
- `mcp-code-review-testing.agent.md` - Code review and testing
- (plus other existing agents)

### Step 4: Review Instructions

Check the general Copilot instructions:

```bash
cat .github/copilot/instructions.md
```

This file guides GitHub Copilot on when and how to use MCP servers.

## Verification Steps

### 1. Test MCP Configuration

GitHub Copilot will automatically load MCP servers when you start a coding session. You can verify by:

1. Open a coding session with GitHub Copilot
2. Ask: "What MCP servers do you have access to?"
3. You should see all 10 servers listed

### 2. Test Sequential Thinking

Try a complex task:

```
@copilot Use sequential thinking to analyze the OAuth authentication flow
and identify potential security vulnerabilities.
```

### 3. Test Gemini Consultation

Ask for code review:

```
@copilot Use Gemini to review the src/auth/oauth.js file for security issues.
```

### 4. Test GitHub Integration

Test GitHub MCP:

```
@copilot List all open issues in this repository using the GitHub MCP server.
```

### 5. Test Browser Automation

For UI testing:

```
@copilot Create a Playwright test for the login flow.
```

### 6. Test Memory

Store and retrieve context:

```
@copilot Store in memory: "We use Spotify OAuth 2.0 with PKCE flow for authentication"
```

Then later:

```
@copilot What authentication method do we use? Check memory.
```

## Troubleshooting

### Issue: MCP Servers Not Loading

**Symptoms**: Copilot doesn't recognize MCP tools

**Solutions**:
1. Verify `.github/copilot/mcp.json` exists and is valid JSON
2. Check file permissions: `ls -la .github/copilot/mcp.json`
3. Restart your Copilot session
4. Check GitHub Copilot logs for errors

### Issue: GitHub MCP Server Fails

**Symptoms**: "Authentication failed" or "Token invalid"

**Solutions**:
1. Verify `COPILOT_MCP_GITHUB_TOKEN` secret is set
2. Check token has required permissions (repo, read:org, workflow)
3. Regenerate token if expired
4. Update secret in repository settings

### Issue: Brave Search Not Working

**Symptoms**: "API key invalid" or "Rate limit exceeded"

**Solutions**:
1. Verify `COPILOT_MCP_BRAVE_API` secret is set correctly
2. Check you haven't exceeded free tier (2000 queries/month)
3. Verify API key is active at https://brave.com/search/api/
4. Regenerate API key if needed

### Issue: Gemini Bridge Timeout

**Symptoms**: "Timeout waiting for Gemini response"

**Solutions**:
1. Check internet connectivity
2. Verify `GEMINI_BRIDGE_TIMEOUT` is set to 120 in mcp.json
3. Try using `flash` model instead of `pro` for faster responses
4. Authenticate Gemini CLI: `uvx gemini-bridge --auth`

### Issue: Playwright/Puppeteer Fails

**Symptoms**: "Browser not found" or "Installation failed"

**Solutions**:
1. Install browsers: `npx playwright install`
2. Install Chromium for Puppeteer: `npx puppeteer install`
3. Check system dependencies are installed
4. Use Docker container with pre-installed browsers

## Usage Guide

### Basic Workflow

1. **Start with Sequential Thinking** for complex tasks
   ```
   @copilot Use sequential thinking to plan how to implement user profile editing
   ```

2. **Check Memory** for context
   ```
   @copilot Check memory for our authentication approach
   ```

3. **Research** with Brave Search or Fetch
   ```
   @copilot Search for best practices for MongoDB connection pooling
   ```

4. **Consult Gemini** for critical decisions
   ```
   @copilot Use Gemini to review this API endpoint for security issues
   ```

5. **Implement** with filesystem
   ```
   @copilot Update src/api/users.js to add profile editing endpoint
   ```

6. **Test** with Playwright
   ```
   @copilot Create Playwright test for profile editing workflow
   ```

7. **Review** with Gemini
   ```
   @copilot Use Gemini to review my changes
   ```

8. **Store Learnings** in memory
   ```
   @copilot Store in memory: "Profile editing uses PUT /api/users/:id endpoint"
   ```

### Custom Agent Usage

Delegate tasks to specialized agents:

```
@mcp-power-developer Implement a new feature for playlist recommendations
```

```
@gemini-consultant Review the OAuth implementation for security vulnerabilities
```

```
@mcp-code-review-testing Review PR #123 and create E2E tests
```

## Cost Summary

| MCP Server | API Costs | Free Tier | Notes |
|------------|-----------|-----------|-------|
| sequential-thinking | Free | Unlimited | No API calls |
| memory | Free | Unlimited | Local storage |
| github | Free | GitHub API limits | Standard GitHub API |
| git | Free | Unlimited | Local git operations |
| filesystem | Free | Unlimited | Local file operations |
| gemini-bridge | **FREE** | Unlimited | Uses free Gemini CLI |
| playwright | Free | Unlimited | Local browser automation |
| puppeteer | Free | Unlimited | Local browser automation |
| brave-search | **FREE** | 2000/month | $5/month for 20k queries |
| fetch | Free | Unlimited | HTTP requests only |

**Total Monthly Cost**: **$0** (with free tiers) or **$5/month** (if you need >2000 Brave searches)

## Advanced Configuration

### Custom MCP Server Timeout

Edit `.github/copilot/mcp.json` to adjust timeouts:

```json
{
  "mcpServers": {
    "gemini-bridge": {
      "env": {
        "GEMINI_BRIDGE_TIMEOUT": "180"  // Increase to 3 minutes
      }
    }
  }
}
```

### Adding Additional MCP Servers

To add more MCP servers, edit `.github/copilot/mcp.json`:

```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "npx",
      "args": ["-y", "your-mcp-server-package"],
      "description": "Your server description",
      "env": {
        "YOUR_ENV_VAR": "${{ secrets.YOUR_SECRET }}"
      }
    }
  }
}
```

## Best Practices

1. **ALWAYS use sequential-thinking** for complex problems
2. **ALWAYS consult Gemini** for security-critical code
3. **Store important decisions** in memory
4. **Test with Playwright/Puppeteer** for UI changes
5. **Research with Brave Search** before implementation
6. **Use GitHub MCP** for issue and PR automation
7. **Keep API keys secure** in GitHub Secrets
8. **Monitor API usage** to stay within free tiers

## Support & Resources

- **MCP Documentation**: https://modelcontextprotocol.io/
- **GitHub Copilot MCP Guide**: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp
- **Gemini Bridge**: https://github.com/eLyiN/gemini-bridge
- **Awesome MCP Servers**: https://github.com/punkpeye/awesome-mcp-servers
- **Brave Search API**: https://brave.com/search/api/

## Contributing

If you discover new useful MCP servers or improvements to the configuration, please:

1. Test thoroughly
2. Document usage and benefits
3. Update this guide
4. Submit a PR

---

**Last Updated**: 2026-01-25

**Maintainer**: Spotify-Echo Team
