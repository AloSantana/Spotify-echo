# GitHub Copilot Configuration for Spotify-Echo

This directory contains the complete configuration for GitHub Copilot Coding Agent with MCP (Model Context Protocol) server ecosystem.

## 📁 Directory Structure

```
.github/copilot/
├── mcp.json                    # MCP server configuration (10 servers)
├── instructions.md             # General Copilot instructions
├── agents/                     # Custom coding agents
│   ├── mcp-power-developer.agent.md         # Elite dev with full MCP
│   ├── gemini-consultant.agent.md           # Gemini AI specialist
│   ├── mcp-fullstack-developer.agent.md     # Full-stack dev
│   ├── mcp-code-review-testing.agent.md     # Code review & testing
│   └── [other specialized agents...]
├── runbooks/                   # Task-specific runbooks
└── tasks/                      # Task templates
```

## 🚀 Quick Start

### For Repository Owners

1. **Add Required Secrets** (see [Setup Guide](../../docs/MCP_SETUP_GUIDE.md)):
   - `COPILOT_MCP_GITHUB_TOKEN` - GitHub Personal Access Token
   - `COPILOT_MCP_BRAVE_API` - Brave Search API key (optional)

2. **Verify Configuration**:
   ```bash
   cat mcp.json | python3 -m json.tool  # Validate JSON
   ```

3. **That's it!** GitHub Copilot will automatically use the MCP ecosystem.

### For Developers

**Start a Copilot session and you automatically get access to:**

- 🧠 Sequential thinking for complex problems
- 💾 Persistent memory across sessions
- 🤖 Gemini AI consultation (zero cost)
- 🔄 GitHub & Git integration
- 📂 File system operations
- 🌐 Browser automation (Playwright, Puppeteer)
- 🔍 Web search (Brave) & HTTP requests (Fetch)

## 🎯 Available MCP Servers (10)

| Server | Purpose | Cost |
|--------|---------|------|
| sequential-thinking | Step-by-step reasoning | Free |
| memory | Persistent context | Free |
| github | GitHub API access | Free |
| git | Git operations | Free |
| filesystem | File read/write | Free |
| gemini-bridge | Google Gemini AI | **FREE** |
| playwright | Cross-browser testing | Free |
| puppeteer | Chrome automation | Free |
| brave-search | Web search | **2000 free/mo** |
| fetch | HTTP requests | Free |

**Total Cost**: $0/month (with free tiers)

## 🤖 Custom Agents (4+)

### Core MCP Agents

1. **mcp-power-developer** - Elite developer with full MCP ecosystem
   ```
   @mcp-power-developer Implement user authentication with OAuth
   ```

2. **gemini-consultant** - Security & code review specialist
   ```
   @gemini-consultant Review this code for security vulnerabilities
   ```

3. **mcp-fullstack-developer** - Full-stack development
   ```
   @mcp-fullstack-developer Build API endpoint for recommendations
   ```

4. **mcp-code-review-testing** - Code review & E2E testing
   ```
   @mcp-code-review-testing Review PR and create Playwright tests
   ```

### Specialized Agents (from existing)

- api-integration-specialist
- error-handling-specialist
- frontend-ui-specialist
- mcp-ai-reasoning-architect
- mcp-devops-infrastructure
- mcp-research-documentation
- performance-optimization-specialist
- security-specialist
- spotify-oauth-specialist

## 📚 Documentation

- **[MCP Setup Guide](../../docs/MCP_SETUP_GUIDE.md)** - Complete setup instructions
- **[Copilot Instructions](instructions.md)** - General usage guidelines
- **[Agent Templates](agents/)** - Individual agent documentation

## 💡 Usage Examples

### Complex Problem Solving
```
@copilot Use sequential thinking to debug this race condition
```

### Security Review with Gemini
```
@copilot Use Gemini to review src/auth/oauth.js for vulnerabilities
```

### E2E Testing
```
@copilot Create Playwright test for the login flow
```

### Research
```
@copilot Search for best practices on MongoDB connection pooling
```

### Store Knowledge
```
@copilot Store in memory: "We use PKCE flow for OAuth authentication"
```

## 🔧 Configuration Files

### mcp.json
Main configuration file that defines all MCP servers. Each server includes:
- Command to run
- Arguments
- Environment variables (using GitHub Secrets)
- Description

### instructions.md
General guidelines for GitHub Copilot including:
- When to use each MCP server
- Best practices
- Security guidelines
- Code quality standards

### agents/*.agent.md
Custom agent definitions with:
- Name and description
- Available tools
- Workflows and methodologies
- Project-specific context

## 🔐 Security

- All API keys stored in GitHub Secrets
- Never hard-code credentials
- Use secrets placeholder: `${{ secrets.SECRET_NAME }}`
- Regular security reviews with Gemini AI

## 📊 Monitoring

Track MCP usage and effectiveness:
- Security issues caught before merge
- Test coverage improvements
- Code quality metrics
- Development velocity

## 🆘 Troubleshooting

**MCP servers not loading?**
1. Check `.github/copilot/mcp.json` is valid JSON
2. Verify GitHub Secrets are set
3. Restart Copilot session

**Need help?**
- See [MCP Setup Guide](../../docs/MCP_SETUP_GUIDE.md)
- Check [Troubleshooting section](../../docs/MCP_SETUP_GUIDE.md#troubleshooting)

## 🔄 Updates

This configuration is version-controlled. To update:

1. Edit configuration files
2. Test changes thoroughly
3. Update documentation
4. Submit PR for review

## 📖 Resources

- [GitHub Copilot MCP Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
- [Gemini Bridge](https://github.com/eLyiN/gemini-bridge)

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-25  
**Maintained by**: Spotify-Echo Team
