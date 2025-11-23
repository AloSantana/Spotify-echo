# GitHub Coding Agent - Installation Guide

This guide explains the **Reliable Installation Agent** system for Spotify-Echo, which implements automated, retry-based installation and startup workflows.

## Overview

The Reliable Installation Agent is designed to handle the complete installation workflow for the Spotify-Echo application:

1. **Dependency Installation** (`npm install` / `npm ci`)
2. **Database Initialization** (Prisma client generation and schema sync)
3. **Application Startup** (`npm start` with crash detection)

Each step includes:
- Automatic error detection and analysis
- Pattern-based fix strategies
- Retry logic with configurable attempts
- Memory storage of errors and fixes for learning
- Detailed reporting and diagnostics

## Architecture

```
scripts/
├── reliable-install-agent.js       # Main orchestrator
└── agent-helpers/
    ├── error-analyzer.js           # Error pattern detection
    ├── fix-strategies.js           # Automated fix catalog
    └── memory-store.js             # Pattern memory & analytics

.agent-memory/                      # Persistent memory storage
├── error-patterns.json             # Historical errors
├── fix-history.json                # Fix attempts & results
└── metadata.json                   # Agent statistics
```

## Quick Start

### Basic Usage

```bash
# Run full installation workflow
node scripts/reliable-install-agent.js

# Run with more retries
node scripts/reliable-install-agent.js --max-retries 5

# Skip specific steps
node scripts/reliable-install-agent.js --skip-db
node scripts/reliable-install-agent.js --skip-start

# Verbose output for debugging
node scripts/reliable-install-agent.js --verbose
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Install and Start with Reliable Agent
  run: node scripts/reliable-install-agent.js --max-retries 3
  env:
    POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
    ENABLE_TRACING: false
```

## Error Categories

The agent detects and handles these error categories:

### Critical Errors
- **node_version**: Incompatible Node.js version
- **npm_install**: Package installation failures
- **prisma_client**: Prisma client not generated
- **database_connection**: Cannot connect to database

### High Priority Errors
- **prisma_migration**: Schema migration issues
- **env_missing**: Missing environment variables
- **module_not_found**: Missing modules
- **runtime_error**: JavaScript runtime errors

### Medium Priority Errors
- **opentelemetry**: Tracing/observability issues
- **port_in_use**: Port conflicts

## Fix Strategies

### Automatic Fixes

The agent can automatically apply these fixes:

1. **create_env_file**: Create or fix `.env` file
   - Creates from `.env.example` template
   - Sets default POSTGRES_URL if empty
   - Adds missing environment variables

2. **disable_tracing**: Disable OpenTelemetry
   - Sets `ENABLE_TRACING=false` in `.env`
   - Prevents tracing initialization errors

3. **generate_prisma**: Generate Prisma client
   - Runs `npm run db:generate`
   - Creates Prisma client for database access

4. **init_database**: Initialize database schema
   - Runs `npm run db:push`
   - Syncs Prisma schema with database

5. **clean_install**: Clean node_modules reinstall
   - Removes `node_modules/`
   - Runs `npm ci` for fresh install

6. **kill_port**: Free up port
   - Kills process using the port
   - Allows server to start

### Manual Fixes Required

Some errors require manual intervention:

- **database_connection**: Ensure PostgreSQL is running
- **runtime_error**: Fix code errors
- **unknown**: Review logs and diagnose

## Memory System

The agent learns from past errors and fixes:

### View Memory Statistics

```bash
node scripts/agent-helpers/memory-store.js report
```

Example output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AGENT MEMORY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Errors Recorded: 15
Total Fix Attempts: 12
Most Common Error: env_missing
Most Successful Strategy: create_env_file

Errors by Category:
  - env_missing: 6
  - prisma_client: 5
  - opentelemetry: 4

Fix Success Rates:
  - create_env_file: 100% (6/6)
  - disable_tracing: 100% (4/4)
  - generate_prisma: 80% (4/5)

Last Updated: 2025-11-23T22:00:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Export Memory

```bash
# Export all memory to JSON file
node scripts/agent-helpers/memory-store.js export agent-memory-backup.json

# Clear memory (use with caution)
node scripts/agent-helpers/memory-store.js clear
```

## Command-Line Options

```
node scripts/reliable-install-agent.js [options]

Options:
  --skip-install    Skip npm install step
  --skip-db         Skip database initialization
  --skip-start      Skip npm start validation
  --max-retries N   Maximum retries per step (default: 3)
  --verbose         Enable verbose logging
  --help, -h        Show help message
```

## Troubleshooting

### Agent Fails to Install Dependencies

1. Check Node.js version: `node --version` (requires >= 18.0.0)
2. Check npm version: `npm --version` (requires >= 8.0.0)
3. Review error analysis output
4. Try manual install: `npm ci`
5. Check for disk space issues

### Agent Fails to Initialize Database

1. Ensure POSTGRES_URL is set in `.env`:
   ```bash
   grep POSTGRES_URL .env
   ```

2. Verify PostgreSQL is running:
   ```bash
   # Local PostgreSQL
   psql -h localhost -U postgres -l
   
   # Docker PostgreSQL
   docker ps | grep postgres
   ```

3. Test connection string:
   ```bash
   npm run db:generate
   ```

### Agent Fails to Start Application

1. Check for port conflicts:
   ```bash
   lsof -i :3000
   # Or change port: PORT=3001 node scripts/reliable-install-agent.js
   ```

2. Review server logs in output
3. Check if Prisma client is generated:
   ```bash
   ls -la node_modules/.prisma/client/
   ```

4. Disable tracing if causing issues:
   ```bash
   echo "ENABLE_TRACING=false" >> .env
   ```

## Integration with Other Tools

### With npm Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "setup": "node scripts/reliable-install-agent.js",
    "setup:ci": "node scripts/reliable-install-agent.js --skip-start",
    "setup:quick": "node scripts/reliable-install-agent.js --skip-db"
  }
}
```

### With Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .

# Use reliable agent for setup
RUN node scripts/reliable-install-agent.js --skip-start

CMD ["npm", "start"]
```

### With Make

```makefile
# Makefile
.PHONY: setup
setup:
	@node scripts/reliable-install-agent.js

.PHONY: setup-ci
setup-ci:
	@node scripts/reliable-install-agent.js --skip-start --max-retries 5
```

## Best Practices

### For Developers

1. **Run the agent after pulling changes**:
   ```bash
   git pull
   node scripts/reliable-install-agent.js
   ```

2. **Use verbose mode when debugging**:
   ```bash
   node scripts/reliable-install-agent.js --verbose
   ```

3. **Check memory report periodically**:
   ```bash
   node scripts/agent-helpers/memory-store.js report
   ```

### For CI/CD

1. **Set appropriate retry count**:
   ```bash
   node scripts/reliable-install-agent.js --max-retries 5
   ```

2. **Skip start in CI** (unless testing startup):
   ```bash
   node scripts/reliable-install-agent.js --skip-start
   ```

3. **Export memory for analysis**:
   ```bash
   node scripts/agent-helpers/memory-store.js export ci-memory-${BUILD_ID}.json
   ```

### For Production

1. **Ensure environment variables are set**:
   - `POSTGRES_URL`: Production database
   - `ENABLE_TRACING`: Set to `true` for observability
   - All required API keys

2. **Use clean install**:
   ```bash
   rm -rf node_modules
   node scripts/reliable-install-agent.js
   ```

3. **Monitor agent memory** for recurring issues

## Environment Setup

### Minimal Required Variables

```bash
# .env
POSTGRES_URL=postgresql://user:password@host:5432/database
NODE_ENV=development
PORT=3000
ENABLE_TRACING=false
```

### Recommended Variables

```bash
# .env (extended)
POSTGRES_URL=postgresql://user:password@host:5432/database
NODE_ENV=development
PORT=3000

# Optional services
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/echotune

# Feature flags
ENABLE_TRACING=false
ENABLE_AGENTOPS=false
ENABLE_MOCK_PROVIDER=true

# Spotify API (optional for initial setup)
# SPOTIFY_CLIENT_ID=your_client_id
# SPOTIFY_CLIENT_SECRET=your_client_secret
# SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# AI Providers (optional for initial setup)
# GEMINI_API_KEY=your_gemini_key
# OPENAI_API_KEY=your_openai_key
```

## Advanced Usage

### Custom Error Patterns

Add custom error patterns to `scripts/agent-helpers/error-analyzer.js`:

```javascript
{
  category: ERROR_CATEGORIES.YOUR_CATEGORY,
  patterns: [
    /your.*error.*pattern/i,
    /another pattern/
  ],
  severity: 'high',
  fixable: true
}
```

### Custom Fix Strategies

Add custom fix strategies to `scripts/agent-helpers/fix-strategies.js`:

```javascript
YOUR_STRATEGY: {
  name: 'your_strategy',
  description: 'Your fix description',
  applies: ['your_category'],
  async execute({ projectRoot, logger }) {
    // Your fix logic
    return { success: true, message: 'Fix applied' };
  }
}
```

## Support

### Getting Help

1. Run with `--help` flag:
   ```bash
   node scripts/reliable-install-agent.js --help
   ```

2. Check memory report for patterns:
   ```bash
   node scripts/agent-helpers/memory-store.js report
   ```

3. Review `.agent-memory/` files for historical data

4. Enable verbose logging:
   ```bash
   node scripts/reliable-install-agent.js --verbose
   ```

### Reporting Issues

When reporting issues, include:
- Full error output
- Memory report: `node scripts/agent-helpers/memory-store.js report`
- Environment: Node version, OS, etc.
- `.env` file (with secrets redacted)

## Contributing

To improve the agent:

1. Add new error patterns in `error-analyzer.js`
2. Add new fix strategies in `fix-strategies.js`
3. Test with: `node scripts/reliable-install-agent.js --verbose`
4. Export memory: `node scripts/agent-helpers/memory-store.js export test-results.json`
5. Submit PR with improvements

## License

See LICENSE file in repository root.

## Related Documentation

- [Setup Guide](SETUP.md) - General setup instructions
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [README](README.md) - Project overview
