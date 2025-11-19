# 🛠️ EchoTune AI Development Guide

Complete guide for setting up, developing, and testing EchoTune AI locally.

## 📋 Prerequisites

### Required Software

- **Node.js**: Version **20.x LTS** (required)
  - Check your version: `node --version`
  - Download: https://nodejs.org/
  
- **npm**: Version 8.x or higher (comes with Node.js)
  - Check your version: `npm --version`

- **Git**: For version control
  - Check: `git --version`
  - Download: https://git-scm.com/

### Recommended Tools

- **Docker** (optional, for containerized development)
  - Check: `docker --version`
  - Download: https://docs.docker.com/get-docker/

- **nvm** (Node Version Manager)
  - Makes switching Node versions easy
  - Install: https://github.com/nvm-sh/nvm

### Database Requirements

EchoTune AI uses a hybrid database architecture:

- **MongoDB** (primary - listening history & analytics)
  - Free tier: https://www.mongodb.com/cloud/atlas
  - Or local: `brew install mongodb-community` (macOS)
  
- **PostgreSQL** (chat, user preferences, state)
  - Free tier: https://www.elephantsql.com/
  - Or local: `brew install postgresql` (macOS)
  
- **Redis** (optional - caching)
  - Local: `brew install redis` (macOS)
  - Free tier: https://redis.com/try-free/

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
```

### 2. Install Node.js 20

Using nvm (recommended):

```bash
# Install and use Node 20
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x
```

Without nvm:
- The repository includes `.nvmrc` file with the required version
- Download Node 20 LTS from https://nodejs.org/

### 3. Install Dependencies

```bash
npm install
```

This will:
- Check your Node.js version (must be >= 18.0.0)
- Install all npm dependencies
- Run Prisma client generation automatically

### 4. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

#### Required Environment Variables

```env
# Spotify API (Required for OAuth)
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Database - MongoDB (Primary)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/echotune

# Database - PostgreSQL (Chat & State)
POSTGRES_URL=postgresql://user:pass@host:5432/echotune

# Session Security
SESSION_SECRET=generate_random_64_char_string
JWT_SECRET=generate_random_64_char_string

# AI Providers (at least one required)
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
```

#### Optional Environment Variables

```env
# Redis Cache
REDIS_URL=redis://localhost:6379

# AI Providers (Optional)
AZURE_OPENAI_API_KEY=your_azure_key
OPENROUTER_API_KEY=your_openrouter_key

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
```

### 5. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations (PostgreSQL)
npm run db:migrate

# Alternative: Push schema without migrations
npm run db:push
```

### 6. Start Development Server

```bash
npm run dev
```

The application will start on http://localhost:3000

## 🧪 Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with watch mode (auto-rerun on changes)
npm run test:watch
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm test -- tests/integration/health.test.js
```

### End-to-End (E2E) Tests

```bash
# Install Playwright browsers (first time only)
npm run playwright:install

# Run E2E smoke tests
npm run test:e2e:smoke

# Run all E2E tests headless
npm run test:e2e:headless

# Run with UI (for debugging)
npm run test:e2e
```

### Full Test Suite (CI)

```bash
# Run all tests (unit + integration)
npm run test:ci

# Run browser automation tests with server
npm run test:browser
```

### Test Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## 🐳 Docker Development

### Build Docker Image

```bash
npm run docker:build
```

### Run with Docker

```bash
# Single container
npm run docker:run

# Full stack with docker-compose
npm run docker:compose
```

### Docker Environment Variables

Create a `.env.docker` file with your configuration:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongo:27017/echotune
POSTGRES_URL=postgresql://postgres:5432/echotune
REDIS_URL=redis://redis:6379
```

## 📝 Development Workflow

### 1. Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Run linter
npm run lint

# Run tests
npm test

# Commit changes
git add .
git commit -m "feat: your feature description"
```

### 2. Code Quality

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Security scan
npm run security:scan
```

### 3. Database Changes

When modifying Prisma schema:

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate new Prisma client
npm run db:generate

# 3. Create and apply migration
npm run db:migrate

# Or push directly without migration (development only)
npm run db:push
```

## 🔍 Troubleshooting

### Node Version Mismatch

**Error**: `npm install` fails with engine errors

**Solution**:
```bash
# Check current version
node --version

# Install Node 20
nvm install 20
nvm use 20

# Or update .nvmrc
echo "20.19.5" > .nvmrc
nvm use
```

### Prisma Generation Fails

**Error**: `@prisma/client` not found

**Solution**:
```bash
# Manually generate Prisma client
npx prisma generate

# Verify generation
ls node_modules/.prisma/client
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
```

### Database Connection Failed

**Error**: Cannot connect to MongoDB/PostgreSQL

**Solution**:
1. Check database URLs in `.env`
2. Verify database is running
3. Check firewall/network settings
4. For MongoDB Atlas: whitelist your IP address

### Playwright Browser Download

**Error**: Browsers not installed

**Solution**:
```bash
# Install all browsers
npx playwright install --with-deps

# Or specific browser
npx playwright install chromium
```

### TypeScript Errors in Tests

**Error**: Jest fails to parse TypeScript E2E tests

**Solution**: E2E tests (`.spec.ts`/`.spec.js`) are for Playwright, not Jest.
```bash
# Run E2E tests with Playwright
npm run test:e2e

# Run unit/integration with Jest
npm test
```

## 📚 Additional Resources

- [Main README](../README.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

## 🆘 Getting Help

If you encounter issues not covered here:

1. Check [GitHub Issues](https://github.com/primoscope/Spotify-echo/issues)
2. Search [GitHub Discussions](https://github.com/primoscope/Spotify-echo/discussions)
3. Review [Closed Issues](https://github.com/primoscope/Spotify-echo/issues?q=is%3Aissue+is%3Aclosed) for similar problems
4. Create a new issue with:
   - Node version (`node --version`)
   - npm version (`npm --version`)
   - Operating system
   - Error messages (full stack trace)
   - Steps to reproduce

## 🎯 Next Steps

After setup:

1. ✅ Review [Architecture Documentation](../ARCHITECTURE.md)
2. ✅ Explore the [API Endpoints](http://localhost:3000/api-docs)
3. ✅ Run the test suite: `npm test`
4. ✅ Make your first contribution!

---

**Happy Coding! 🎵**
