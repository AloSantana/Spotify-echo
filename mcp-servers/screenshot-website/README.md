# MCP Screenshot Website (Stub)

This directory provides a minimal stub of the "Screenshot Website Fast" MCP server to satisfy documentation and CI checks.

- Health endpoint: `GET /health` returns `{ status: 'ok' }`.
- Intended for CI structure validation only. Production screenshot functionality lives in the full implementation.

## Run locally

```bash
node mcp-servers/screenshot-website/index.js
curl http://localhost:3015/health
```
