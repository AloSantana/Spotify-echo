# GitHub Copilot MCP Configuration

This directory contains the MCP (Model Context Protocol) configuration for GitHub Copilot coding agent.

## Files

### `mcp.json`
GitHub Copilot MCP server configuration enabling external tool integration for the coding agent.

**Purpose**: Extends GitHub Copilot with 10 external MCP servers for enhanced capabilities.

**Distinction from Repository MCP Servers**:
- **This configuration** (`.github/copilot/mcp.json`): External MCP servers accessed by GitHub Copilot
- **Repository servers** (`mcp-server/`, ports 3001-3010): Internal application MCP infrastructure

Both systems are complementary and work together.

## MCP Servers Configured

1. **sequential-thinking** - Step-by-step reasoning for complex problems
2. **memory** - Persistent context across Copilot sessions
3. **github** - GitHub API access (requires `COPILOT_MCP_GITHUB_TOKEN`)
4. **git** - Git operations (log, diff, blame)
5. **filesystem** - File system operations
6. **gemini** - Google Gemini AI consultation (requires `COPILOT_MCP_GOOGLE_API_KEY`)
7. **playwright** - Cross-browser automation
8. **puppeteer** - Chrome automation & screenshots
9. **brave-search** - Web search (requires `COPILOT_MCP_BRAVE_API`)
10. **fetch** - HTTP requests and content retrieval

## Required Secrets

Add these in: `Repository → Settings → Secrets and variables → Copilot`

- `COPILOT_MCP_GITHUB_TOKEN` (required)
- `COPILOT_MCP_GOOGLE_API_KEY` (required)
- `COPILOT_MCP_BRAVE_API` (optional)

## Custom Agents

### GitHub Copilot MCP Agents
Located in `agents/`:
- `mcp-power-developer.agent.md` - Gemini AI + sequential thinking
- `gemini-consultant.agent.md` - Google Gemini AI specialist
- `research-assistant.agent.md` - Brave Search + AI synthesis

### Existing Repository Agents
- `mcp-fullstack-developer.agent.md` - Internal MCP integration
- `mcp-research-documentation.agent.md` - Perplexity research
- Plus 10+ other specialized agents

## Documentation

See `docs/MCP_SETUP_GUIDE.md` for complete setup instructions.

## Related

- **Internal MCP**: `docs/MCP_INTEGRATION.md`
- **Troubleshooting**: `docs/MCP_TROUBLESHOOTING.md`
- **Server Inventory**: `docs/MCP_SERVER_INVENTORY.md`
