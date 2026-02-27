# EchoTune AI - Agent Toolkit Architecture

> Comprehensive AI Agent Capability Expansion Toolkit for EchoTune AI

---

## 📋 Overview

The Agent Toolkit consists of:

- **13 Specialist Agents** - Role-based AI personas (`.github/agents/`)
- **Rules** - Global behavioral rules and YOLO execution mode
- **Workflows** - Slash command procedures
- **MCP Config** - Model Context Protocol server configurations

---

## 🏗️ Directory Structure

```plaintext
.agent/
├── ARCHITECTURE.md          # This file
├── mcp_config.json          # MCP client configuration
├── rules/                   # Global Rules
│   ├── auto-execution-rules.md
│   └── yolo.md
└── workflows/               # Slash Command Workflows
    ├── create.md
    ├── debug.md
    ├── deploy.md
    ├── enhance.md
    ├── plan.md
    └── test.md
```

---

## 🤖 Agents (13)

Specialist AI personas for EchoTune AI development.

| Agent | Focus | Key Skills |
|-------|-------|-----------|
| `jules` | Code quality, collaboration | Refactoring, multi-agent coordination |
| `rapid-implementer` | Fast end-to-end implementation | Express.js, MongoDB, Spotify API |
| `architect` | System architecture | EchoTune AI system design |
| `debug-detective` | Root cause analysis | OAuth debugging, API tracing |
| `deep-research` | Comprehensive analysis | Spotify features research |
| `full-stack-developer` | Complete web features | React + Express + MongoDB |
| `repo-optimizer` | Repository setup | Tooling, configuration |
| `testing-stability-expert` | Test coverage | Jest, pytest, Spotify mocks |
| `performance-optimizer` | Speed optimization | Redis caching, MongoDB indexes |
| `code-reviewer` | Security & quality | Auth, injection prevention |
| `docs-master` | Documentation | API docs, user guides |
| `api-developer` | REST API design | Express routes, Spotify OAuth |
| `devops-infrastructure` | Deployment | Docker, Nginx, DigitalOcean |

---

## 🔄 Workflows (6)

Invoke with `/command` in Copilot Chat:

| Command | Description |
|---------|-------------|
| `/create` | Create new features |
| `/debug` | Debug issues |
| `/deploy` | Deploy application |
| `/enhance` | Improve existing code |
| `/plan` | Task breakdown and planning |
| `/test` | Run and create tests |

---

## 🎯 Usage

```bash
# Use an agent
@agent:rapid-implementer Implement Spotify playlist sync feature

# Use a workflow
/plan Add collaborative filtering to recommendation engine

# Combine agents
@agent:architect Design → @agent:rapid-implementer Implement → @agent:testing-stability-expert Test
```
