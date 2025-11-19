# 🔧 EchoTune AI Troubleshooting Guide

Common issues and their solutions for EchoTune AI development.

## 📋 Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Server Startup Issues](#server-startup-issues)
- [Test Issues](#test-issues)
- [Docker Issues](#docker-issues)
- [API Issues](#api-issues)
- [Browser Automation Issues](#browser-automation-issues)

---

## Installation Issues

### npm install fails with Node version error

**Error**:
```
npm WARN EBADENGINE Unsupported engine
npm ERR! engine Unsupported engine
```

**Cause**: Node.js version is too old (< 18.0.0)

**Solution**:
```bash
# Check current version
node --version

# Install Node 20 with nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
# https://nodejs.org/en/download/

# Verify
node --version  # Should show v20.x.x
```

### Prisma client generation fails

**Error**:
```
Error: @prisma/client did not initialize yet. 
Please run "prisma generate"
```

**Cause**: Prisma client not generated

**Solution**:
```bash
# Set required environment variable
export DATABASE_URL="postgresql://localhost:5432/test"

# Generate Prisma client
npm run db:generate

# Or manually
npx prisma generate
```

### Missing environment variable: DATABASE_URL

**Error**:
```
PrismaConfigEnvError: Missing required environment variable: DATABASE_URL
```

**Cause**: prisma.config.ts requires DATABASE_URL

**Solution**:
```bash
# Add to your .env file
echo "DATABASE_URL=postgresql://test:test@localhost:5432/echotune_test" >> .env
echo "POSTGRES_URL=postgresql://test:test@localhost:5432/echotune_test" >> .env

# Or export temporarily
export DATABASE_URL="postgresql://test:test@localhost:5432/test"
npm run db:generate
```

---

## Database Issues

### MongoDB connection failed

**Error**:
```
❌ MongoDB connection failed: querySrv ENOTFOUND
```

**Cause**: MongoDB not running or incorrect connection string

**Solution**:

1. **Check MongoDB Atlas connection**:
   - Verify MongoDB URI in `.env`
   - Check if IP address is whitelisted in Atlas
   - Verify credentials are correct

2. **Use SQLite fallback** (automatic):
   - EchoTune AI automatically falls back to SQLite
   - No action needed for development

3. **Run local MongoDB**:
```bash
# With Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# Update .env
MONGODB_URI=mongodb://localhost:27017/echotune
```

### PostgreSQL connection failed

**Error**:
```
Error: connect ECONNREFUSED localhost:5432
```

**Cause**: PostgreSQL not running

**Solution**:

1. **Start PostgreSQL**:
```bash
# With Docker
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=echotune \
  -e POSTGRES_PASSWORD=echotune_dev \
  -e POSTGRES_DB=echotune \
  --name postgres \
  postgres:16-alpine

# Update .env
POSTGRES_URL=postgresql://echotune:echotune_dev@localhost:5432/echotune
```

2. **Or use docker-compose**:
```bash
npm run docker:compose:full
```

### Redis connection failed

**Error**:
```
Error: connect ECONNREFUSED localhost:6379
```

**Cause**: Redis not running (optional service)

**Solution**:

1. **Start Redis**:
```bash
# With Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Update .env
REDIS_URL=redis://localhost:6379
```

2. **Or skip Redis**:
   - Redis is optional
   - App will use in-memory cache as fallback

---

## Server Startup Issues

### Port already in use

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:

1. **Find and kill process**:
```bash
# Find process on port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

2. **Or use different port**:
```bash
PORT=3001 npm start
```

### OpenTelemetry initialization failed

**Error**:
```
ERROR: Failed to initialize OpenTelemetry tracing
error: "Class extends value undefined is not a constructor or null"
```

**Cause**: OpenTelemetry dependency issue (non-critical)

**Solution**:
```bash
# Disable tracing if not needed
echo "ENABLE_TRACING=false" >> .env

# Or ignore - server continues with console logging
```

### Spotify API credentials missing

**Error**:
```
WARN: Spotify client ID not configured
```

**Cause**: Missing Spotify API credentials

**Solution**:

1. **Get Spotify credentials**:
   - Go to https://developer.spotify.com/dashboard
   - Create an app
   - Get Client ID and Client Secret

2. **Add to .env**:
```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback
```

---

## Test Issues

### Jest tries to run Playwright tests

**Error**:
```
Playwright Test needs to be invoked via 'npx playwright test'
```

**Cause**: Jest attempting to run .spec.ts/.spec.js files

**Solution**:
- Already fixed in `jest.config.js`
- Playwright tests are excluded via `testPathIgnorePatterns`
- Use separate commands:
  - `npm test` for Jest (unit/integration)
  - `npm run test:e2e` for Playwright

### Tests timeout

**Error**:
```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Solution**:

1. **Increase Jest timeout**:
```javascript
// In your test file
jest.setTimeout(60000); // 60 seconds
```

2. **Or use test:unit with filters**:
```bash
npm test -- tests/unit/specific-test.test.js
```

### Playwright browsers not installed

**Error**:
```
Error: browserType.launch: Executable doesn't exist
```

**Solution**:
```bash
# Install Playwright browsers
npm run playwright:install

# Or specific browser
npx playwright install chromium
```

---

## Docker Issues

### Docker build fails

**Error**:
```
ERROR [stage] failed to solve
```

**Solution**:

1. **Check Docker daemon**:
```bash
docker info
```

2. **Clear Docker cache**:
```bash
docker system prune -a
```

3. **Build with no cache**:
```bash
docker build --no-cache -t echotune-ai .
```

### Docker container exits immediately

**Error**:
```
docker: Error response from daemon: Container exits
```

**Solution**:

1. **Check logs**:
```bash
docker logs <container-id>
```

2. **Verify environment variables**:
```bash
docker run --env-file .env echotune-ai env
```

3. **Use docker-compose with databases**:
```bash
npm run docker:compose:full
```

---

## API Issues

### 404 Not Found

**Error**: API endpoints return 404

**Solution**:

1. **Check server is running**:
```bash
curl http://localhost:3000/healthz
```

2. **Verify endpoint exists**:
```bash
# View API docs
open http://localhost:3000/api-docs
```

3. **Check correct port**:
```bash
# Default is 3000
PORT=3000 npm start
```

### CORS errors in browser

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:

Add to `.env`:
```env
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Browser Automation Issues

### Puppeteer/Playwright Chrome not found

**Error**:
```
Error: Could not find Chrome
```

**Solution**:

1. **Skip browser downloads during install**:
```bash
# Already configured in Dockerfile
PUPPETEER_SKIP_DOWNLOAD=true
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

2. **Install Playwright browsers**:
```bash
npx playwright install chromium --with-deps
```

### Headless browser tests fail in CI

**Error**: Tests pass locally but fail in CI

**Solution**:

1. **Install system dependencies**:
```yaml
# In GitHub Actions
- name: Install Playwright
  run: npx playwright install --with-deps chromium
```

2. **Use proper config**:
```javascript
// playwright.config.mjs
use: {
  headless: true,
  video: 'retain-on-failure',
}
```

---

## General Debugging

### Enable verbose logging

```bash
# Add to .env
DEBUG=true
LOG_LEVEL=debug
VERBOSE_LOGGING=true

# Run with detailed logs
npm start
```

### Check system requirements

```bash
# Node version
node --version  # Should be >= 20.x

# npm version  
npm --version   # Should be >= 8.x

# Memory available
free -h

# Disk space
df -h
```

### Clean restart

```bash
# Remove all generated files
rm -rf node_modules coverage dist

# Clean npm cache
npm cache clean --force

# Reinstall
npm install

# Regenerate Prisma
npm run db:generate

# Restart
npm start
```

---

## Getting More Help

If your issue isn't covered here:

1. **Check logs**: Look for error messages in console output
2. **Search issues**: https://github.com/primoscope/Spotify-echo/issues
3. **Ask questions**: https://github.com/primoscope/Spotify-echo/discussions
4. **Report bugs**: Create a new issue with:
   - Node/npm versions
   - Operating system
   - Full error messages
   - Steps to reproduce

## Quick Diagnostic Script

```bash
#!/bin/bash
echo "=== EchoTune AI Diagnostics ==="
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Docker version: $(docker --version 2>/dev/null || echo 'Not installed')"
echo "MongoDB running: $(pgrep mongod >/dev/null && echo 'Yes' || echo 'No')"
echo "PostgreSQL running: $(pgrep postgres >/dev/null && echo 'Yes' || echo 'No')"
echo "Redis running: $(pgrep redis-server >/dev/null && echo 'Yes' || echo 'No')"
echo "Port 3000 available: $(lsof -ti:3000 >/dev/null && echo 'In use' || echo 'Available')"
```

Save as `diagnostic.sh`, make executable with `chmod +x diagnostic.sh`, and run with `./diagnostic.sh`.
