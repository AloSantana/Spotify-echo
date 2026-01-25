# MCP Server Setup Guide for GitHub Copilot Coding Agent

This guide explains how to set up the MCP (Model Context Protocol) servers for the GitHub Copilot coding agent in this repository.

## Overview

This repository is configured with 10 MCP servers that enhance the coding agent's capabilities:

| Server | Purpose | Requires Secret |
|--------|---------|-----------------|
| `sequential-thinking` | Step-by-step reasoning | No |
| `memory` | Persistent context | No |
| `github` | GitHub API access | Yes |
| `git` | Git operations | No |
| `filesystem` | File read/write | No |
| `gemini` | Google AI consultation | Yes |
| `playwright` | Browser testing | No |
| `puppeteer` | Chrome automation | No |
| `brave-search` | Web search | Yes (optional) |
| `fetch` | HTTP requests | No |

## Required Secrets

Add the following secrets to enable full functionality:

### 1. GitHub Personal Access Token (Required)

**Secret Name:** `COPILOT_MCP_GITHUB_TOKEN`

**How to get it:**
1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org membership)
   - `read:user` (Read user profile data)
4. Generate and copy the token

**Where to add it:**
1. Go to your repository: `Settings → Secrets and variables → Copilot`
2. Click "New repository secret"
3. Name: `COPILOT_MCP_GITHUB_TOKEN`
4. Value: Paste your token

### 2. Google AI API Key (Required for Gemini)

**Secret Name:** `COPILOT_MCP_GOOGLE_API_KEY`

**How to get it:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

**Where to add it:**
1. Go to your repository: `Settings → Secrets and variables → Copilot`
2. Click "New repository secret"
3. Name: `COPILOT_MCP_GOOGLE_API_KEY`
4. Value: Paste your API key

**Cost:** Google AI offers a generous free tier. Check [Google AI pricing](https://ai.google.dev/pricing) for details.

### 3. Brave Search API Key (Optional)

**Secret Name:** `COPILOT_MCP_BRAVE_API`

**How to get it:**
1. Go to [Brave Search API](https://brave.com/search/api/)
2. Sign up for a free account
3. Get your API key (2000 free queries/month)

**Where to add it:**
1. Go to your repository: `Settings → Secrets and variables → Copilot`
2. Click "New repository secret"
3. Name: `COPILOT_MCP_BRAVE_API`
4. Value: Paste your API key

## Verification

After adding the secrets, the coding agent will automatically have access to all MCP servers. You can verify by:

1. Opening a new Copilot coding agent session
2. Asking the agent to use a specific MCP tool
3. Example: "Use sequential-thinking to analyze this problem step by step"

## Available Custom Agents

This repository includes specialized agents that leverage the MCP servers:

### 1. MCP Power Developer (`@mcp-power-developer`)
Elite developer with full MCP ecosystem access. Use for:
- Complex coding tasks
- Multi-step implementations
- Code with Gemini review

### 2. Gemini Consultant (`@gemini-consultant`)
Specialized for AI-powered analysis. Use for:
- Security reviews
- Code quality analysis
- Architecture decisions

### 3. Research Assistant (`@research-assistant`)
Research specialist. Use for:
- Documentation research
- Best practices lookup
- Technology comparisons

## Troubleshooting

### MCP server not responding
- Verify the secret is correctly added
- Check that the secret name matches exactly (case-sensitive)
- Try regenerating and updating the API key

### Gemini not working
- Ensure `COPILOT_MCP_GOOGLE_API_KEY` is set
- Verify your Google AI API key is valid
- Check if you've exceeded the free tier limits

### GitHub operations failing
- Verify `COPILOT_MCP_GITHUB_TOKEN` is set
- Ensure the token has required scopes
- Check if the token has expired

## Quick Reference

### Adding Secrets Location
```
Repository → Settings → Secrets and variables → Copilot → New repository secret
```

### Required Secrets Summary
| Secret Name | Required | Source |
|-------------|----------|--------|
| `COPILOT_MCP_GITHUB_TOKEN` | Yes | [GitHub Tokens](https://github.com/settings/tokens) |
| `COPILOT_MCP_GOOGLE_API_KEY` | Yes | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `COPILOT_MCP_BRAVE_API` | Optional | [Brave API](https://brave.com/search/api/) |

## MCP Configuration Details

The MCP servers are configured in `.github/copilot/mcp.json`. All servers use `npx` for zero-install execution and API key authentication (no CLI-based auth required).

### Architecture

```
GitHub Copilot Coding Agent
    ↓
MCP Server Ecosystem
    ├── Sequential Thinking (reasoning)
    ├── Memory (persistence)
    ├── GitHub API (issues, PRs)
    ├── Git (version control)
    ├── Filesystem (file ops)
    ├── Gemini AI (consultation)
    ├── Playwright (browser automation)
    ├── Puppeteer (Chrome automation)
    ├── Brave Search (web search)
    └── Fetch (HTTP requests)
```

## Best Practices

### When to Use Sequential Thinking
- Complex problem-solving requiring step-by-step analysis
- Planning multi-file refactorings
- Designing new features or architectures

### When to Use Memory
- Storing important architecture decisions
- Remembering debugging patterns that worked
- Tracking project-specific conventions

### When to Consult Gemini
- Security-critical code (auth, OAuth, JWT)
- Performance optimization of complex algorithms
- Getting a second opinion on architectural decisions
- Code review with detailed analysis

### When to Use Brave Search
- Finding latest documentation for libraries
- Researching best practices
- Looking up error messages and solutions

## Additional Resources

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [GitHub Copilot MCP Guide](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
- [Google AI Pricing](https://ai.google.dev/pricing)
- [Brave Search API Docs](https://brave.com/search/api/)
