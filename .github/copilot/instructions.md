# GitHub Copilot Instructions for Spotify-Echo

## Overview

This document provides general instructions for GitHub Copilot when working on the Spotify-Echo project. The project has a comprehensive MCP (Model Context Protocol) server ecosystem that enhances your capabilities significantly.

## Available MCP Servers

You have access to the following MCP servers that dramatically enhance your capabilities:

### 🧠 Core Reasoning & Memory
- **sequential-thinking**: Use for complex, multi-step tasks that require breaking down problems
- **memory**: Persist important decisions, patterns, and learnings across sessions

### 🤖 AI Consultation
- **gemini-bridge**: Consult Google Gemini AI (zero API cost) for:
  - Code review and security analysis
  - Architecture validation
  - Best practices research
  - Second opinions on critical decisions

### 🔄 GitHub & Version Control
- **github**: Full GitHub API access for issues, PRs, repository management
- **git**: Git operations including log, diff, blame, branch management

### 📂 File System
- **filesystem**: Safe read/write operations within project boundaries

### 🌐 Browser Automation
- **playwright**: Cross-browser E2E testing (Chromium, Firefox, WebKit)
- **puppeteer**: Chrome automation, screenshots, PDF generation

### 🔍 Search & Research
- **brave-search**: Privacy-focused web search (2000 free queries/month)
- **fetch**: HTTP requests, API documentation retrieval

## General Guidelines

### ALWAYS Use Sequential Thinking For:
- Complex debugging scenarios
- Multi-step refactoring tasks
- Architecture design decisions
- Security vulnerability assessment
- Performance optimization analysis

### ALWAYS Consult Gemini For:
- Security-critical code reviews (OAuth, authentication, API security)
- Complex architectural decisions
- Performance optimization validation
- Best practices verification
- Code quality assessment

### ALWAYS Use Memory To:
- Store architectural decisions and rationale
- Save security patterns and anti-patterns
- Record debugging insights and solutions
- Track project-specific conventions
- Build knowledge graph of the codebase

### ALWAYS Test With Playwright/Puppeteer:
- UI changes that affect user workflows
- E2E testing for critical paths
- Visual regression testing
- Cross-browser compatibility
- Accessibility validation

## Workflow Best Practices

### For Any Complex Task:
1. **Plan**: Use sequential-thinking to break down the problem
2. **Context**: Check memory for relevant previous decisions
3. **Research**: Use brave-search/fetch for documentation if needed
4. **Consult**: Use gemini-bridge for security/architecture validation
5. **Implement**: Make changes with appropriate tools
6. **Test**: Use playwright/puppeteer for E2E validation
7. **Review**: Consult Gemini for code review
8. **Document**: Store learnings in memory

### Security-First Approach:
- **NEVER** hard-code credentials or API keys
- **ALWAYS** consult Gemini for OAuth/authentication code
- **ALWAYS** validate input and sanitize output
- **ALWAYS** use secure dependencies and check for CVEs
- **ALWAYS** review error messages for data exposure

### Code Quality Standards:
- Use TypeScript with strict mode
- Write comprehensive tests (unit, integration, E2E)
- Document complex logic with clear comments
- Follow existing code patterns and conventions
- Optimize for readability and maintainability

## Project-Specific Context

### Technology Stack
- **Frontend**: JavaScript/TypeScript, React
- **Backend**: Node.js, Express
- **Database**: MongoDB (primary), Redis (caching)
- **AI Integration**: AWS Bedrock, OpenAI, Google Gemini
- **Authentication**: Spotify OAuth 2.0
- **Deployment**: Docker, DigitalOcean, Nginx

### Critical Components
1. **OAuth Flow** (src/auth/): Token handling, PKCE, refresh tokens
2. **AWS Bedrock Integration** (src/ai/): API key protection, validation
3. **Music Recommendations**: Collaborative filtering, content-based analysis
4. **MCP Server Ecosystem**: Enhanced development workflow

### Testing Requirements
- Unit tests for business logic
- Integration tests for external services (Spotify API, AWS Bedrock)
- E2E tests with Playwright for user workflows
- Security testing for OAuth and API endpoints

## Available Custom Agents

When you need specialized help, you can delegate to these custom agents:

### mcp-power-developer
Elite developer with full MCP ecosystem access. Use for:
- Complex implementation tasks
- Full-stack development
- Comprehensive feature development

### gemini-consultant
Specialized Gemini AI consultant. Use for:
- Security code reviews
- Architecture validation
- Best practices research
- Quality assessment

### mcp-fullstack-developer
Full-stack specialist with MCP integration. Use for:
- Frontend and backend development
- API implementation
- Database operations

### mcp-code-review-testing
Code review and testing expert. Use for:
- Pull request reviews
- Test coverage analysis
- Quality assurance
- Security auditing

## Key Reminders

### DO:
✅ Use sequential-thinking for complex problems
✅ Consult Gemini for security-critical code
✅ Store important context in memory
✅ Test with Playwright/Puppeteer for E2E validation
✅ Research with brave-search/fetch when needed
✅ Follow existing code patterns
✅ Write comprehensive tests
✅ Document important decisions

### DON'T:
❌ Skip security reviews for auth/API code
❌ Hard-code credentials or secrets
❌ Ignore test coverage
❌ Deploy without validation
❌ Skip documentation updates
❌ Ignore performance implications
❌ Make changes without understanding context

## Getting Help

- **For complex tasks**: Use sequential-thinking to break down the problem
- **For security reviews**: Consult gemini-bridge with model="pro"
- **For research**: Use brave-search or fetch for documentation
- **For testing**: Use playwright for E2E validation
- **For context**: Check memory for previous decisions

## MCP Server Usage Examples

### Sequential Thinking Example
```
When debugging a complex issue:
1. Use sequential-thinking to map out the problem
2. Break down into testable hypotheses
3. Validate each hypothesis systematically
4. Document findings in memory
```

### Gemini Consultation Example
```
When reviewing OAuth implementation:
1. Read the authentication code
2. Consult gemini-bridge with query:
   "Review this OAuth 2.0 implementation for security vulnerabilities,
    focusing on token handling and PKCE flow"
3. Implement recommended fixes
4. Store security patterns in memory
```

### Browser Testing Example
```
When implementing UI changes:
1. Make code changes
2. Use playwright to create E2E test
3. Run test across browsers
4. Capture screenshots for documentation
5. Store testing patterns in memory
```

## Success Metrics

Track your effectiveness by:
- Security issues caught before merge
- Test coverage maintained/improved
- Code quality scores
- Performance metrics
- Documentation completeness
- Successful deployments

---

**Remember**: You have powerful MCP tools at your disposal. Use them to deliver secure, well-tested, high-quality code that follows best practices and project conventions.
