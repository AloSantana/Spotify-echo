# Local Development Setup Guide

Complete guide for setting up Spotify-echo (EchoTune AI) for local development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Variables](#environment-variables)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or higher
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify: `node --version`

- **npm**: v10.x or higher (comes with Node.js)
  - Verify: `npm --version`

- **Git**: Latest version
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify: `git --version`

### Optional but Recommended

- **Redis**: v7.x or higher
  - **macOS**: `brew install redis`
  - **Ubuntu/Debian**: `sudo apt install redis-server`
  - **Windows**: Use WSL or Redis Docker container
  - Verify: `redis-cli ping` (should return "PONG")

- **MongoDB**: v6.x or higher (optional - SQLite fallback available)
  - **macOS**: `brew install mongodb-community`
  - **Ubuntu/Debian**: Follow [MongoDB installation guide](https://www.mongodb.com/docs/manual/installation/)
  - **Windows**: Download from [mongodb.com](https://www.mongodb.com/try/download/community)

### External Services

You'll need accounts and API keys for:

1. **Spotify Developer Account** (required)
   - Create app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   - Get `Client ID` and `Client Secret`
   - Add redirect URI: `http://localhost:3000/callback`

2. **OpenAI API** (optional)
   - Get API key from [platform.openai.com](https://platform.openai.com/api-keys)

3. **Google Gemini API** (optional)
   - Get API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

4. **OpenRouter API** (optional)
   - Get API key from [openrouter.ai](https://openrouter.ai/)

---

## Quick Start

For experienced developers who want to get started quickly:

```bash
# 1. Clone and install
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start services (if using Redis/MongoDB)
redis-server  # In separate terminal
mongod  # In separate terminal (optional)

# 4. Run application
npm start

# 5. Open browser
open http://localhost:3000
```

---

## Detailed Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install ~1,100 packages including:
- Express.js (backend framework)
- React dependencies (frontend)
- Playwright (E2E testing)
- Database drivers (MongoDB, SQLite, Redis)
- AI provider SDKs (OpenAI, Gemini)

**Expected time**: 2-5 minutes depending on your internet connection.

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Now edit `.env` with your preferred text editor:

```bash
# Use your favorite editor
nano .env
# or
code .env
# or
vi .env
```

**Minimum required configuration:**

```bash
# Spotify (REQUIRED)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# Security (REQUIRED)
JWT_SECRET=your_random_secret_here_min_32_chars
SESSION_SECRET=your_random_session_secret_here_min_32_chars

# Server (REQUIRED)
PORT=3000
NODE_ENV=development
```

**Generate secure secrets:**

```bash
# On macOS/Linux
openssl rand -hex 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

See [Environment Variables](#environment-variables) section for complete list.

---

## Database Configuration

Spotify-echo supports three database backends with automatic fallback:

### Option 1: SQLite (Easiest - No Setup Required)

SQLite works out of the box with zero configuration:

```bash
# .env
# Leave MongoDB URI commented or empty
# MONGODB_URI=

# SQLite database will be created at: ./data/echotune.db
```

**Pros:**
- ✅ Zero configuration
- ✅ Perfect for development
- ✅ No external services needed

**Cons:**
- ⚠️ Limited concurrency
- ⚠️ Not recommended for production

### Option 2: MongoDB (Recommended for Production)

**Install MongoDB:**

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongo --eval "db.version()"
```

**Configure:**

```bash
# .env
MONGODB_URI=mongodb://localhost:27017/echotune
```

**Pros:**
- ✅ Production-ready
- ✅ Better performance
- ✅ Advanced querying

**Cons:**
- ⚠️ Requires MongoDB service running
- ⚠️ Additional setup steps

### Option 3: MongoDB Atlas (Cloud)

**Setup:**

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Add your IP to whitelist
4. Create database user
5. Get connection string

**Configure:**

```bash
# .env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/echotune?retryWrites=true&w=majority
```

**Pros:**
- ✅ No local MongoDB needed
- ✅ Free tier available
- ✅ Managed service

### Redis Configuration (Optional but Recommended)

Redis is used for caching and session management:

**Install and Start:**

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Verify
redis-cli ping  # Should return "PONG"
```

**Configure:**

```bash
# .env
REDIS_URL=redis://localhost:6379
```

**Alternative: Redis Cloud (Free)**

1. Create account at [redis.com/try-free](https://redis.com/try-free/)
2. Create database
3. Get connection URL

```bash
# .env
REDIS_URL=redis://default:password@redis-xxxxx.cloud.redislabs.com:12345
```

---

## Environment Variables

### Complete `.env` Configuration

```bash
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# =============================================================================
# SPOTIFY CONFIGURATION (REQUIRED)
# =============================================================================
# Get these from: https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_SCOPES=user-read-private user-read-email user-library-read user-top-read playlist-modify-public playlist-modify-private

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
# MongoDB (primary database)
MONGODB_URI=mongodb://localhost:27017/echotune
# Leave empty to use SQLite fallback

# Redis (caching and sessions - optional but recommended)
REDIS_URL=redis://localhost:6379

# =============================================================================
# SECURITY (REQUIRED)
# =============================================================================
# Generate with: openssl rand -hex 32
JWT_SECRET=your_jwt_secret_min_32_characters_here
SESSION_SECRET=your_session_secret_min_32_characters_here

# =============================================================================
# AI PROVIDERS (OPTIONAL)
# =============================================================================
# OpenAI (recommended for best chat experience)
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro

# OpenRouter (alternative AI provider)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-3-opus

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_MOCK_PROVIDER=false
DISABLE_REALTIME=false
ENABLE_TRACING=false
ENABLE_AGENTOPS=false

# =============================================================================
# DEVELOPMENT OPTIONS
# =============================================================================
LOG_LEVEL=info
PRETTY_LOGS=true
```

### Validation

Validate your environment configuration:

```bash
npm run validate-env
```

Or manually:

```bash
node scripts/validate-env.js
```

---

## Verification

### Step 1: Start Application

```bash
npm start
```

**Expected output:**

```
🎵 EchoTune AI Server Starting...
✓ Environment: development
✓ Port: 3000
✓ Redis: Connected
✓ Database: Connected (sqlite)
✓ Spotify API: Configured
✓ AI Providers: 2 available
✓ Server running at http://localhost:3000
```

### Step 2: Health Check

Open browser or use curl:

```bash
curl http://localhost:3000/health/simple
```

**Expected response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

### Step 3: Access Application

Open browser:

```
http://localhost:3000
```

You should see the EchoTune AI homepage.

### Step 4: Test Spotify Authentication

1. Click "Connect with Spotify" button
2. You should be redirected to Spotify login
3. After login, you'll be redirected back to the application
4. Your Spotify profile should be displayed

### Step 5: Run Tests

```bash
# Unit and integration tests
npm test

# E2E tests
npm run test:e2e

# Specific test file
npm test -- tests/integration/database.test.js
```

---

## Troubleshooting

### Application Won't Start

**Symptom:** Error when running `npm start`

**Solutions:**

1. **Port already in use:**
   ```bash
   # Change port in .env
   PORT=3001
   
   # Or kill process using port 3000
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Missing dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment variable errors:**
   ```bash
   # Verify .env exists
   ls -la .env
   
   # Validate configuration
   npm run validate-env
   ```

### Database Connection Failed

**Symptom:** "MongoDB connection error" or "Database initialization failed"

**Solutions:**

1. **Use SQLite fallback:**
   ```bash
   # Comment out MongoDB URI in .env
   # MONGODB_URI=mongodb://localhost:27017/echotune
   ```

2. **Check MongoDB status:**
   ```bash
   # macOS
   brew services list | grep mongodb
   brew services start mongodb-community
   
   # Ubuntu/Linux
   sudo systemctl status mongod
   sudo systemctl start mongod
   ```

3. **Test MongoDB connection:**
   ```bash
   mongo --eval "db.version()"
   ```

### Redis Connection Failed

**Symptom:** "Redis connection error"

**Solutions:**

1. **Redis is optional:** Application will work without Redis, but sessions won't persist

2. **Start Redis:**
   ```bash
   # macOS
   brew services start redis
   
   # Ubuntu/Linux
   sudo systemctl start redis
   ```

3. **Verify Redis:**
   ```bash
   redis-cli ping
   # Should return "PONG"
   ```

### Spotify OAuth Fails

**Symptom:** "Invalid redirect URI" or "OAuth error"

**Solutions:**

1. **Check redirect URI in Spotify Dashboard:**
   - Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   - Open your app
   - Click "Edit Settings"
   - Add redirect URI: `http://localhost:3000/callback`
   - Click "Save"

2. **Verify .env configuration:**
   ```bash
   grep SPOTIFY .env
   # Should show your Client ID, Secret, and Redirect URI
   ```

3. **Check scopes:**
   ```bash
   # Ensure scopes in .env include minimum required:
   SPOTIFY_SCOPES=user-read-private user-read-email user-library-read
   ```

### Tests Fail

**Symptom:** Tests fail when running `npm test`

**Solutions:**

1. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

2. **Run specific test suite:**
   ```bash
   # Only unit tests
   npm run test:unit
   
   # Only integration tests
   npm run test:integration
   
   # Only E2E tests
   npm run test:e2e
   ```

3. **Check test environment:**
   ```bash
   # Ensure NODE_ENV is set
   export NODE_ENV=test
   npm test
   ```

### Performance Issues

**Symptom:** Application is slow or unresponsive

**Solutions:**

1. **Enable Redis caching:**
   ```bash
   # Start Redis and configure in .env
   REDIS_URL=redis://localhost:6379
   ```

2. **Check database indexes:**
   ```bash
   node scripts/database/apply-indexes.js
   ```

3. **Monitor resource usage:**
   ```bash
   # Check CPU and memory
   top  # macOS/Linux
   # or
   htop  # if installed
   ```

### Hot Reload Not Working

**Symptom:** Changes to code don't reflect in browser

**Solutions:**

1. **Use development mode:**
   ```bash
   npm run dev
   # Instead of npm start
   ```

2. **Clear cache:**
   ```bash
   # Clear browser cache
   # Or use Incognito/Private mode
   ```

3. **Restart server:**
   ```bash
   # Stop with Ctrl+C
   # Start again
   npm run dev
   ```

---

## Next Steps

Once your local development environment is set up:

1. **Explore the application:**
   - Connect your Spotify account
   - Try music recommendations
   - Test chat functionality

2. **Read additional documentation:**
   - [Setup with Docker](./setup-docker.md)
   - [API Documentation](./api-documentation.md)
   - [Architecture Overview](./architecture-overview.md)

3. **Start developing:**
   - See [Development Guide](./development-guide.md)
   - Review [Contributing Guidelines](../CONTRIBUTING.md)

4. **Run tests:**
   - See [Testing Guide](./testing-guide.md)

---

## Support

If you encounter issues not covered in this guide:

1. Check [Troubleshooting Guide](./troubleshooting.md)
2. Search [GitHub Issues](https://github.com/primoscope/Spotify-echo/issues)
3. Create a new issue with:
   - Your operating system
   - Node.js version (`node --version`)
   - Complete error message
   - Steps to reproduce

---

**Last Updated:** January 2025  
**Maintained by:** EchoTune AI Team
