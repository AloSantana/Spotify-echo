# Optional MCP Servers

The main `mcp.json` configuration includes the full set of MCP servers for EchoTune AI. Credential-based servers (MongoDB, PostgreSQL, Brave Search) use environment variable references (`${VAR_NAME}`) so they activate automatically when the corresponding variable is set.

## Servers Already in `mcp.json` That Require Credentials

These servers are already configured in `mcp.json` and will activate once the environment variables are set:

| Server | Required Variable | Purpose |
|---|---|---|
| `mongodb` | `MONGODB_URI` | Primary database queries and management |
| `postgres` | `POSTGRES_URL` | Prisma/PostgreSQL queries |
| `brave-search` | `BRAVE_API_KEY` | Web search for AI agents |
| `github` | `GITHUB_TOKEN` | Automatically provided by Copilot |

## Setting Environment Variables

For GitHub Copilot coding agent, set secrets in your repository settings:
**Settings → Secrets and variables → Copilot → New secret**

Add the following secrets as needed:

> ⚠️ **The values below are placeholders only. Never commit real credentials to the repository.**

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/echotune
POSTGRES_URL=postgresql://user:pass@host:5432/echotune
BRAVE_API_KEY=your_brave_api_key_here
```

Get a Brave Search API key from: https://brave.com/search/api/

## Additional Optional Servers

To add more servers, edit `.github/copilot/mcp.json` and append under `mcpServers`:

### Redis Cache Inspection

```json
"redis": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "mcp-server-redis"],
  "env": {
    "REDIS_URL": "${REDIS_URL}"
  }
}
```

### Slack Integration

```json
"slack": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-slack"],
  "env": {
    "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
    "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
  }
}
```

### AWS Cloud Services (Bedrock, S3, etc.)

```json
"aws": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "mcp-server-aws"],
  "env": {
    "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}",
    "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY}",
    "AWS_REGION": "${AWS_REGION}"
  }
}
```

### Sentry Error Tracking

```json
"sentry": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sentry"],
  "env": {
    "SENTRY_DSN": "${SENTRY_DSN}",
    "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN}"
  }
}
```

### Kubernetes

```json
"kubernetes": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "mcp-server-kubernetes"]
}
```

## Verifying Server Configuration

After adding or enabling a server:

1. Restart your Copilot session (or reload the window)
2. Check Copilot Output logs for connection errors
3. Test the server with a simple command (e.g., ask Copilot to list MongoDB collections)

## Getting Help

If you encounter issues with servers:
1. Check that all required environment variables are set
2. Verify credentials are valid and have necessary permissions
3. Ensure the npx package resolves correctly (try running the command manually)
4. Review the MCP server's documentation on GitHub

---

**Note:** The `mcp.json` is designed to work out-of-the-box for no-credential servers. Credential-based servers silently skip if the environment variable is unset — they do not break the session.
