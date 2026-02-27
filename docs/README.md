# 📚 EchoTune AI - Documentation Index

> Complete documentation guide for EchoTune AI's next-generation music recommendation platform

## 🚀 Quick Start

| Documentation | Description | Audience |
|---------------|-------------|----------|
| **[README.md](../README.md)** | Project overview & quick setup | Everyone |
| **[API Documentation](../API_DOCUMENTATION.md)** | Complete API reference | Developers |

## 🏗️ Architecture & Design

| Document | Description |
|----------|-------------|
| **[System Architecture](architecture/ARCHITECTURE.md)** | Complete system design overview |
| **[Database Schema](architecture/database-schema.md)** | MongoDB collections and Redis cache |
| **[Security Model](guides/security-model.md)** | Authentication and security architecture |

## 🚀 Deployment & Operations

| Guide | Description | Platform |
|-------|-------------|----------|
| **[DigitalOcean Deployment](deployment/digitalocean-deployment.md)** | Production deployment on DigitalOcean | DigitalOcean |
| **[Docker Guide](deployment/docker-guide.md)** | Containerized deployment | Docker |
| **[Local Development](deployment/deployment-guide.md)** | Local setup and development | Local |
| **[Troubleshooting](deployment/troubleshooting.md)** | Common deployment issues | All |

## 📖 Developer Guides

| Guide | Description |
|-------|-------------|
| **[Coding Standards](guides/coding-standards.md)** | Development guidelines and best practices |
| **[GitHub Automation](guides/github-automation.md)** | CI/CD setup and automation |
| **[Agent System](guides/AGENTS.md)** | AI agent workflow and configuration |
| **[Cursor + Perplexity Integration](../CURSOR_IDE_SETUP.md)** | Cursor MCP config, Perplexity server, browser research workflow |
| **[Prompt System Guide](guides/PROMPT_SYSTEM_GUIDE.md)** | Prompt catalog usage and Perplexity models |

## 🔌 API Reference

| Document | Description |
|----------|-------------|
| **[Enhanced API Features](api/ENHANCED_API_FEATURES.md)** | Advanced API capabilities |
| **[OpenAPI Specification](api/openapi-spec.yaml)** | Machine-readable API spec |
| **[Authentication Details](api/authentication.md)** | OAuth flow and security |

## 📊 Reports & Analysis

| Report | Date | Status |
|--------|------|--------|
| **[Cleanup Plan](DOCUMENTATION_CLEANUP_PLAN.md)** | 2024-01 | ✅ Completed |
| **[Integration Reports](reports/archived/)** | Various | 📁 Archived |
| **[Testing Results](reports/archived/)** | Various | 📁 Archived |

## 🛠️ Tools & Utilities

| Tool | Description | Location |
|------|-------------|----------|
| **[Copilot Commands](guides/COPILOT_SLASH_COMMANDS.md)** | Slash command reference | Guides |
| **[Data Management](guides/DATA_MANAGEMENT.md)** | Data processing tools | Guides |
| **[Prompt System](guides/PROMPT_SYSTEM_GUIDE.md)** | LLM prompt configuration | Guides |

## 📋 Project Organization

### Directory Structure
```
docs/
├── README.md                   # This index file
├── architecture/               # System design documentation
│   ├── ARCHITECTURE.md         # Complete system architecture
│   └── database-schema.md      # Database design
├── deployment/                 # Deployment guides
│   ├── digitalocean-deployment.md
│   ├── docker-guide.md
│   ├── deployment-guide.md
│   └── troubleshooting.md
├── api/                       # API documentation
│   ├── ENHANCED_API_FEATURES.md
│   └── openapi-spec.yaml
├── guides/                    # Developer guides
│   ├── coding-standards.md
│   ├── github-automation.md
│   └── ...
└── reports/                   # Historical reports
    └── archived/              # Archived reports and summaries
```

## 🎯 Documentation by User Type

### 👨‍💻 Developers
1. Start with [README.md](../README.md) for project overview
2. Review [API Documentation](../API_DOCUMENTATION.md) for integration
3. Follow [Coding Standards](guides/coding-standards.md) for development
4. Check [Architecture](architecture/ARCHITECTURE.md) for system understanding

### 🚀 DevOps Engineers
1. Review [System Architecture](architecture/ARCHITECTURE.md)
2. Follow [DigitalOcean Deployment](deployment/digitalocean-deployment.md)
3. Use [Docker Guide](deployment/docker-guide.md) for containerization
4. Reference [Troubleshooting](deployment/troubleshooting.md) for issues

### 🤝 Contributors
1. Read [Contributing Guidelines](../CONTRIBUTING.md)
2. Follow [Coding Standards](guides/coding-standards.md)
3. Set up [GitHub Automation](guides/github-automation.md)
4. Review [Agent System](guides/AGENTS.md) if working on AI features

### 🏢 Product Managers
1. Start with [README.md](../README.md) for feature overview
2. Review [Enhanced API Features](api/ENHANCED_API_FEATURES.md)
3. Check [Archived Reports](reports/archived/) for project progress

## 📈 Documentation Standards

### ✅ Documentation Quality Guidelines
- **Clear Structure**: Use consistent headers and formatting
- **Complete Examples**: Include working code samples
- **Up-to-date**: Regular updates with version changes
- **Accessible**: Clear language for different skill levels
- **Searchable**: Good cross-references and linking

### 🔄 Maintenance Schedule
- **Weekly**: Update README and API docs if features change
- **Monthly**: Review and update deployment guides
- **Quarterly**: Architecture review and documentation audit
- **As needed**: Troubleshooting guide updates

## 🔍 Finding Information

### Quick Reference
| Need | Go To |
|------|-------|
| Setup instructions | [README.md](../README.md) |
| API endpoints | [API Documentation](../API_DOCUMENTATION.md) |
| Deployment help | [deployment/](deployment/) |
| Development guide | [guides/coding-standards.md](guides/coding-standards.md) |
| System overview | [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) |
| Agent + Perplexity | [Cursor IDE Setup](../CURSOR_IDE_SETUP.md) |
| Prompts catalog | [Prompt System Guide](guides/PROMPT_SYSTEM_GUIDE.md) |
| Troubleshooting | [deployment/troubleshooting.md](deployment/troubleshooting.md) |

### Search Tips
- Use GitHub's search functionality to find specific terms
- Check the commit history for recent changes
- Look in [reports/archived/](reports/archived/) for historical information

## 📞 Getting Help

### Documentation Issues
- **Missing Information**: Create an issue with the "documentation" label
- **Outdated Content**: Submit a PR with corrections
- **New Guide Needed**: Discuss in issues before creating

### Technical Support
- **Bug Reports**: Use the issue template
- **Feature Requests**: Follow the contribution guidelines
- **General Questions**: Check existing documentation first

## 🗺️ Plans & Agent Instructions

| Document | Description |
|----------|-------------|
| [App Improvement Plan](./APP_IMPROVEMENT_PLAN.md) | End-to-end plan across frontend, backend, LLM chat, MongoDB, Docker, CI |
| [GitHub Coding Agent Instructions](./AGENT_INSTRUCTIONS_GITHUB_CODING_AGENT.md) | Implementation steps for GitHub Coding Agent |
| [Cursor Editor Instructions](./AGENT_INSTRUCTIONS_CURSOR.md) | Ordered editor tasks for Cursor |

---

## 🤖 AI Agent Guides (Build-from-Scratch)

These guides enable an AI agent to build an equivalent EchoTune AI application from scratch.
MongoDB + DigitalOcean App Platform focused.

| Guide | Description |
|-------|-------------|
| **[Agent Guides Index](./agent-guides/README.md)** | Start here — navigation table + critical facts |
| [00 — Vision & Mission](./agent-guides/00-VISION-AND-MISSION.md) | Project vision, mission pillars, full 8-phase roadmap |
| [01 — Architecture](./agent-guides/01-ARCHITECTURE-GUIDE.md) | System diagrams, request flows, design patterns |
| [02 — Tech Stack](./agent-guides/02-TECH-STACK.md) | All libraries/versions, MongoDB & DigitalOcean rationale |
| [03 — Data Models](./agent-guides/03-DATA-MODELS.md) | All MongoDB schemas, indexes, TTLs, Redis patterns |
| [04 — Feature Spec](./agent-guides/04-FEATURE-SPECIFICATION.md) | User stories & acceptance criteria for every feature |
| [05 — API Reference](./agent-guides/05-API-REFERENCE.md) | Every HTTP endpoint + Socket.IO events |
| [06 — Spotify Integration](./agent-guides/06-SPOTIFY-INTEGRATION.md) | OAuth PKCE, scopes, tokens, playback, audio features |
| [07 — AI/LLM Integration](./agent-guides/07-AI-LLM-INTEGRATION.md) | Providers, circuit breaker, fallback chain, streaming |
| [08 — Recommendation Engine](./agent-guides/08-RECOMMENDATION-ENGINE.md) | 4 strategies with full code implementations |
| [09 — Frontend Guide](./agent-guides/09-FRONTEND-GUIDE.md) | React SPA structure, components, Socket.IO client |
| [10 — Deployment Guide](./agent-guides/10-DEPLOYMENT-GUIDE.md) | MongoDB Atlas + DigitalOcean App Platform step-by-step |
| [11 — Build Checklist](./agent-guides/11-BUILD-CHECKLIST.md) | Phase-by-phase ordered build checklist with acceptance tests |

---

**Documentation Version**: 2.3.0  
**Last Updated**: 2026-02-27  
**Maintainer**: EchoTune AI Team

> 💡 **Tip**: This documentation is version controlled. Check the git history for changes and updates.
