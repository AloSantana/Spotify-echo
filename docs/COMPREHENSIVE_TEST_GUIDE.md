# 📚 Comprehensive Test Guide for EchoTune AI

## Overview

This guide provides instructions for running the comprehensive test suite for EchoTune AI. The test suite validates installation, configuration, APIs, authentication, UI, and generates detailed reports.

## Quick Start

```bash
# Run the complete test suite
npm run test:comprehensive

# Run individual test components
npm run test:installation      # Installation validation only
npm run validate:all          # Alias for comprehensive tests
```

## Test Suite Components

### 1. Installation Validation (`scripts/validate-installation.js`)

**Purpose**: Validates that all dependencies and prerequisites are properly installed.

**Checks**:
- ✅ Node.js version (minimum v16.x)
- ✅ npm version and availability
- ✅ Node.js dependencies (node_modules)
- ✅ Critical npm packages (express, mongoose, redis, playwright, etc.)
- ✅ Python 3 installation
- ✅ pip3 availability
- ✅ Project structure (src/, scripts/, tests/, etc.)
- ✅ Configuration files (.env, .env.example, package.json)
- ✅ Playwright browsers

**Output**:
- `reports/installation-validation.json` - Detailed JSON report
- `reports/installation-validation.md` - Human-readable summary

**Example Output**:
```
🎵 EchoTune AI - Installation Validation Suite
==================================================

📦 Validating Node.js Installation...
✅ PASS: Node.js Version (v20.19.5)
✅ PASS: npm Version (v10.8.2)

📚 Validating Node.js Dependencies...
✅ PASS: package.json
❌ FAIL: node_modules (Dependencies not installed)
...
```

### 2. Master Test Orchestrator (`scripts/run-comprehensive-tests.js`)

**Purpose**: Orchestrates all test suites in sequence and aggregates results.

**Test Phases**:

#### Phase 1: Installation & Prerequisites
- Validates Node.js, npm, dependencies, and project structure
- **Required**: Critical for all other tests

#### Phase 2: Environment & Configuration
- Validates environment variables and configuration
- **Optional**: May fail in CI without all secrets

#### Phase 3: API & Service Testing
- Tests all API endpoints and external services
- Includes Spotify, MongoDB, Redis, LLM providers
- **Optional**: Requires API keys

#### Phase 4: Authentication & Security
- Tests authentication flows and security
- Validates JWT tokens, session management
- **Optional**: May require running server

#### Phase 5: UI & E2E Testing
- Captures comprehensive UI screenshots
- Tests all UI flows and components
- **Optional**: Requires running server

#### Phase 6: Aggregation & Reporting
- Aggregates all test results
- Generates comprehensive reports
- Creates visual documentation

**Output**:
- `reports/comprehensive-test-results.json` - Full test results
- `COMPREHENSIVE_TEST_REPORT.md` - Executive summary (also in `reports/`)
- Individual component reports in `reports/` directory
- Screenshots in `BROWSERSCREENSHOT-TESTING/` directory

### 3. Environment Validation (`scripts/env-validate.js`)

**Purpose**: Ensures production-ready configuration.

**Validation Rules**:
- Required: `MONGODB_URI`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `JWT_SECRET`
- Placeholder detection: Fails on `your_*`, `changeme`, `xxx...`
- Optional providers: OpenAI, Anthropic, Gemini, Perplexity, etc.

**Usage**:
```bash
node scripts/env-validate.js
```

### 4. API Comprehensive Testing (`scripts/comprehensive-api-testing.js`)

**Purpose**: Tests all API keys and external service integrations.

**Services Tested**:
- Spotify API (OAuth, Search, Track data)
- Perplexity API (AI research, citations)
- Brave API (Privacy-focused search)
- Browserbase API (Cloud browser automation)
- DigitalOcean API (Infrastructure)
- GitHub API (Repository management)
- MongoDB (Database connection)
- Redis (Cache connection)
- Gemini API (Google AI)
- OpenRouter API (LLM routing)

**Usage**:
```bash
node scripts/comprehensive-api-testing.js
```

### 5. UI Screenshot Capture (`scripts/comprehensive-screenshot-capture.js`)

**Purpose**: Captures comprehensive screenshots of all UI components.

**Coverage**:
- Landing page and navigation
- Enhanced chat interface
- Provider selection
- Settings panel
- Performance monitoring
- Testing automation UI
- Spotify player integration

**Usage**:
```bash
node scripts/comprehensive-screenshot-capture.js
```

## Report Schema

All tests generate reports conforming to schema v2:

```json
{
  "schemaVersion": "2.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "runId": "run-1234567890-abcde",
  "success": true,
  "summary": {
    "totalTests": 10,
    "passedTests": 9,
    "failedTests": 1,
    "warningsCount": 2,
    "errorsCount": 0
  },
  "env": { ... },
  "providers": { ... },
  "screenshots": { ... },
  "performance": { ... }
}
```

## Usage Examples

### Running Full Suite

```bash
# Install dependencies first (if not already done)
npm install

# Run comprehensive tests
npm run test:comprehensive
```

### Running Individual Components

```bash
# Installation validation only
npm run test:installation

# Environment validation
node scripts/env-validate.js

# API testing (requires API keys)
node scripts/comprehensive-api-testing.js

# Screenshot capture (requires running server)
node scripts/comprehensive-screenshot-capture.js
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Comprehensive Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run installation validation
        run: npm run test:installation
      
      - name: Run comprehensive tests
        run: npm run test:comprehensive
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          SPOTIFY_CLIENT_ID: ${{ secrets.SPOTIFY_CLIENT_ID }}
          # Add other secrets as needed
      
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: reports/
```

## Interpreting Results

### Success Criteria

- **Installation**: All critical checks pass (Node.js, npm, project structure)
- **Environment**: No placeholder secrets, all required variables set
- **APIs**: At least 75% of configured services operational
- **Authentication**: OAuth flow works, JWT tokens valid
- **UI**: All critical pages load, no JavaScript errors

### Common Issues

#### 1. Installation Failures

```
❌ FAIL: node_modules (Dependencies not installed)
```

**Solution**: Run `npm install`

#### 2. Environment Validation Failures

```
❌ FAIL: MONGODB_URI contains placeholder value
```

**Solution**: Update `.env` with real values from `.env.example`

#### 3. API Test Failures

```
❌ FAIL: SPOTIFY_API (401 Unauthorized)
```

**Solution**: Verify API credentials are correct and active

#### 4. Missing Screenshots

```
⚠️  No screenshots directory found
```

**Solution**: Ensure server is running before screenshot capture: `npm start`

## Advanced Usage

### Custom Test Configuration

Create a `.testrc.json` file to customize test behavior:

```json
{
  "skipOptionalTests": false,
  "screenshotViewports": [
    { "width": 1280, "height": 800 },
    { "width": 390, "height": 844 }
  ],
  "apiTimeout": 30000,
  "retryFailedTests": true,
  "generatePdf": false
}
```

### Debugging Failed Tests

```bash
# Enable verbose logging
DEBUG=* npm run test:comprehensive

# Run with specific timeout
TEST_TIMEOUT=120000 npm run test:comprehensive

# Skip optional tests
SKIP_OPTIONAL=true npm run test:comprehensive
```

### Report Customization

Reports can be customized by modifying the generator scripts:

```javascript
// scripts/generate-comprehensive-report.js (if created)
const reportOptions = {
  format: 'markdown', // or 'html', 'pdf'
  includeScreenshots: true,
  detailLevel: 'full', // or 'summary'
  theme: 'default'
};
```

## Best Practices

1. **Run tests before committing**: Ensure all tests pass locally
2. **Review reports**: Check generated reports for warnings
3. **Update environment**: Keep `.env` synchronized with `.env.example`
4. **Regular testing**: Run comprehensive suite weekly
5. **CI integration**: Automate tests in GitHub Actions
6. **Document failures**: Log and track recurring test failures
7. **Keep dependencies updated**: Run `npm audit` and `npm update` regularly

## Troubleshooting

### Tests Hang or Timeout

- Increase timeout: `TEST_TIMEOUT=180000 npm run test:comprehensive`
- Check server availability: Ensure `http://localhost:3000` is accessible
- Verify network connectivity for external API calls

### Permission Errors

```bash
# Make scripts executable
chmod +x scripts/*.js

# Or run with node explicitly
node scripts/run-comprehensive-tests.js
```

### Report Generation Fails

```bash
# Ensure reports directory exists
mkdir -p reports

# Check disk space
df -h

# Verify write permissions
ls -la reports/
```

## Support

For issues or questions:

1. Check existing documentation in `docs/`
2. Review test output and error messages
3. Consult `docs/TEST_STRATEGY.md` for architecture details
4. Open an issue with:
   - Test output/error messages
   - Environment details (Node version, OS)
   - Steps to reproduce

## Related Documentation

- [Test Strategy](docs/TEST_STRATEGY.md) - Overall testing architecture
- [Deployment Guide](DEPLOY_CHECKLIST.md) - Production deployment
- [API Documentation](API_DOCUMENTATION.md) - API reference
- [Contributing Guide](CONTRIBUTING.md) - Development guidelines

---

**Last Updated**: 2025-10-12
**Version**: 1.0.0
**Maintainer**: EchoTune AI Team
