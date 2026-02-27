# GitHub Copilot Custom Agents - EchoTune AI Quick Reference

This repository includes **13 specialized AI agents** optimized for EchoTune AI development workflows with **10 MCP servers** for enhanced capabilities.

## 🤖 Available Custom Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **jules** ⭐ | Code quality, collaboration, refactoring | Code review, quality improvement, agent coordination |
| **rapid-implementer** | Fast, autonomous code implementation | Speed-focused feature development, end-to-end implementation |
| **architect** | System architecture and design | Designing Spotify integration systems, architectural decisions |
| **debug-detective** | Advanced debugging and root cause analysis | Investigating bugs (OAuth, API errors, MongoDB issues) |
| **deep-research** | Comprehensive research and analysis | Repository analysis, Spotify API research, problem investigation |
| **repo-optimizer** | Repository setup, tooling, improvements | Setting up configs, improving tools, enhancing functions |
| **testing-stability-expert** | Comprehensive testing, stability validation | Writing tests, ensuring reliability, quality assurance |
| **docs-master** | Documentation creation and verification | Writing docs, verifying accuracy, updating guides |
| **code-reviewer** | Code quality and security review | Reviewing PRs, checking security, ensuring best practices |
| **performance-optimizer** | Performance tuning and optimization | Fixing slow recommendations, Redis caching, MongoDB optimization |
| **full-stack-developer** | Complete web application development | Building full features, frontend+backend work |
| **devops-infrastructure** | Docker, Nginx, CI/CD, DigitalOcean | Infrastructure setup, deployment, DevOps tasks |
| **api-developer** | REST API design and implementation | Creating Spotify API integrations, endpoint design |

## ⚡ Quick Start Examples

```bash
# In GitHub Copilot Chat (VS Code, GitHub.com, etc.)

# Fast Spotify feature implementation
@agent:rapid-implementer Implement Spotify playlist creation with AI-curated tracks

# System design for recommendation engine
@agent:architect Design a scalable recommendation engine with collaborative filtering

# Debug OAuth issues
@agent:debug-detective Investigate why Spotify OAuth callback fails intermittently

# Deep research on music features
@agent:deep-research Analyze Spotify audio features usage and recommend improvements

# Testing the recommendation service
@agent:testing-stability-expert Create comprehensive tests for RecommendationService.js

# Documentation
@agent:docs-master Update API docs to reflect new /music/recommendations endpoint

# Code review for security
@agent:code-reviewer Review src/routes/auth/spotify.js for security issues

# Performance optimization
@agent:performance-optimizer Identify N+1 Spotify API calls and add Redis caching

# Full-stack feature development
@agent:full-stack-developer Build mood-based playlist generation feature end-to-end

# DevOps
@agent:devops-infrastructure Setup GitHub Actions deployment to DigitalOcean

# API development
@agent:api-developer Design and implement REST API for user music preferences
```

## 🔧 Agent + MCP Server Combinations

### Rapid Implementer
```
📁 filesystem - Batch read/write operations
🔧 git - Version control
🐙 github - Search patterns
🧠 memory - Remember implementation patterns
🧮 sequential-thinking - Plan complex features
```

### Debug Detective
```
📁 filesystem - Read code and logs
🔧 git - Analyze code history
🐙 github - Find similar issues
🧠 memory - Remember bug patterns
🧮 sequential-thinking - Systematic debugging
```

### Performance Optimizer
```
📁 filesystem - Read/write optimized code
🐙 github - Search optimization patterns
🧠 memory - Track performance metrics
🧮 sequential-thinking - Plan complex optimizations
```

## 🤝 Agent Collaboration Mode

```bash
# Complex task: Build AI music chat feature
# Step 1: Research
@agent:deep-research Research best practices for music recommendation chatbots

# Step 2: Architecture
@agent:architect Design the AI chat + music recommendation integration

# Step 3: Implementation
@agent:rapid-implementer Implement the chat feature based on architect's design

# Step 4: Testing
@agent:testing-stability-expert Create comprehensive tests for the chat service

# Step 5: Security review
@agent:code-reviewer Review chat implementation for security vulnerabilities

# Step 6: Documentation
@agent:docs-master Document the AI chat API and user guide
```

## 🌐 Environment Variables for MCP

```bash
# Required for GitHub integration
export GITHUB_TOKEN="ghp_your_token_here"

# Optional MCP servers (see .github/copilot/OPTIONAL_SERVERS.md)
export COPILOT_MCP_BRAVE_API_KEY="your_brave_api_key"
export COPILOT_MCP_POSTGRES_CONNECTION_STRING="postgresql://..."
```

## 📁 Agent Documentation

- [`rapid-implementer.agent.md`](.github/agents/rapid-implementer.agent.md) - Fast implementation patterns for EchoTune AI
- [`architect.agent.md`](.github/agents/architect.agent.md) - Architecture design and decisions
- [`debug-detective.agent.md`](.github/agents/debug-detective.agent.md) - Debugging Spotify/MongoDB/OAuth issues
- [`deep-research.agent.md`](.github/agents/deep-research.agent.md) - Research and analysis
- [`testing-stability-expert.agent.md`](.github/agents/testing-stability-expert.agent.md) - Testing patterns
- [`docs-master.agent.md`](.github/agents/docs-master.agent.md) - Documentation best practices
- [`code-reviewer.agent.md`](.github/agents/code-reviewer.agent.md) - Code review standards
- [`performance-optimizer.agent.md`](.github/agents/performance-optimizer.agent.md) - Performance patterns
- [`full-stack-developer.agent.md`](.github/agents/full-stack-developer.agent.md) - Full-stack development
- [`devops-infrastructure.agent.md`](.github/agents/devops-infrastructure.agent.md) - DevOps and infrastructure
- [`api-developer.agent.md`](.github/agents/api-developer.agent.md) - API design and implementation
- [`repo-optimizer.agent.md`](.github/agents/repo-optimizer.agent.md) - Repository optimization
- [`jules.agent.md`](.github/agents/jules.agent.md) - Collaborative coding and review

### For MCP Servers
- [`.github/copilot/mcp.json`](.github/copilot/mcp.json) - GitHub Copilot MCP config
- [`.github/copilot/OPTIONAL_SERVERS.md`](.github/copilot/OPTIONAL_SERVERS.md) - Optional MCP servers guide

### Workflow Guides
- [`AGENT_ORCHESTRATION.md`](.github/agents/AGENT_ORCHESTRATION.md) - Multi-agent coordination
- [`CODING_WORKFLOW.md`](.github/agents/CODING_WORKFLOW.md) - Optimized development workflows

## 💡 Tips for Best Results

1. **Be Specific**: Clear instructions get better results
   - ❌ "Fix the code"
   - ✅ "Fix the Spotify token refresh race condition in auth middleware"

2. **Use Right Agent**: Match task to agent expertise
   - Spotify API issues → api-developer or debug-detective
   - Performance → performance-optimizer
   - New features → rapid-implementer or full-stack-developer
   - Deployment → devops-infrastructure

3. **Leverage MCP**: Agents use MCP servers automatically
   - No need to manually specify tools
   - They choose optimal tools for the task

4. **Iterate**: Agents can work incrementally
   - Start with one agent, chain to others

5. **Verify**: Always review agent outputs
   - Agents are powerful but not perfect

---

**Version**: 1.0.0
**Last Updated**: 2026-02-27
**Repository**: EchoTune AI (Spotify-echo)
