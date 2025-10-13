# 🚀 Quick Start: Running QA Automation

This guide helps you quickly get started with the comprehensive QA automation system.

## Prerequisites

Before running QA automation, ensure you have:

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **Docker** (optional): For Docker validation tests
- **Git**: For version control

## Installation

```bash
# Clone the repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Install dependencies
npm install
```

## Running QA Automation

### Option 1: Full Automation (Recommended)

Run everything at once - NPM, Docker, tests, UI automation, and reports:

```bash
npm run qa:all
```

This will:
1. ✅ Validate NPM installation
2. ✅ Build and validate Docker image
3. ✅ Run all test suites (unit, integration, E2E)
4. ✅ Execute UI/UX automation with screenshots
5. ✅ Validate API endpoints
6. ✅ Test authentication flows
7. ✅ Generate comprehensive reports
8. ✅ Update README with results

### Option 2: Individual Phases

Run specific parts of the QA suite:

```bash
# NPM installation and tests only
npm run qa:npm

# Docker build and validation only
npm run qa:docker

# Comprehensive QA without master orchestrator
npm run qa:full
```

### Option 3: Specific Test Types

```bash
# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run comprehensive test suite
npm run test:comprehensive

# Run Playwright E2E tests
npx playwright test
```

## Understanding Results

### Exit Codes

- **Exit 0**: All tests passed ✅
- **Exit 1**: Issues detected ⚠️

### Output Directories

All QA results are saved to:

```
QA-AUTOMATION-RESULTS/
└── master-qa-{timestamp}/
    ├── MASTER-QA-REPORT.md      # 📄 Main report
    ├── screenshots/              # 📸 UI screenshots
    └── logs/                     # 📝 Execution logs
```

### Reading Reports

1. **MASTER-QA-REPORT.md**: Executive summary with recommendations
2. **qa-report.json**: Structured data for CI/CD integration
3. **github-issues.json**: Auto-generated issue templates

## Environment Configuration

### Optional: Spotify Credentials

For authentication testing (optional):

```bash
# Create .env file
cp .env.example .env

# Edit .env and add:
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

### Optional: Docker Configuration

For Docker testing (optional):

```bash
# Ensure Docker is running
docker --version

# Test Docker setup
docker ps
```

## Troubleshooting

### Issue: "npm install failed"

```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Docker not available"

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Or on macOS
brew install --cask docker
```

### Issue: "Playwright browsers not installed"

```bash
# Install Playwright browsers
npx playwright install

# Install system dependencies
npx playwright install-deps
```

### Issue: "Port 3000 already in use"

```bash
# Find and kill process using port 3000
lsof -ti :3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

## CI/CD Integration

### GitHub Actions

The QA automation runs automatically on:
- Every push to `main`, `develop`, `staging`
- Every pull request to `main`, `develop`
- Manual workflow dispatch

View results in:
- GitHub Actions tab
- PR comments
- Downloadable artifacts

### Running Locally Before Push

```bash
# Always run QA before pushing
npm run qa:all

# If all tests pass, commit and push
git add .
git commit -m "Your changes"
git push
```

## What Gets Tested

### ✅ Installation
- NPM dependencies install correctly
- No conflicting packages
- All required files present

### ✅ Build
- Docker image builds successfully
- No build errors or warnings
- Correct base images used

### ✅ Tests
- All unit tests pass
- Integration tests pass
- E2E tests execute successfully
- Test coverage meets thresholds

### ✅ UI/UX
- Authentication flow works
- Dashboard renders correctly
- Playback controls function
- Settings are accessible
- Error states handled properly

### ✅ API
- Health endpoints respond
- Authentication endpoints work
- API routes are accessible
- Proper status codes returned

### ✅ Security
- No exposed secrets
- Dependencies scanned
- Authentication working
- HTTPS configured properly

## Next Steps

After running QA automation:

1. **Review Reports**: Check `MASTER-QA-REPORT.md`
2. **Check Screenshots**: Look for visual regressions
3. **Fix Issues**: Address any failures
4. **Re-run QA**: Verify fixes with `npm run qa:all`
5. **Deploy**: If all tests pass, deploy to staging/production

## Getting Help

- **Documentation**: See `QA-AUTOMATION-README.md` for detailed info
- **Issues**: Check `github-issues.json` for auto-generated templates
- **Logs**: Review logs in `QA-AUTOMATION-RESULTS/*/logs/`
- **Support**: Create a GitHub issue with QA run ID

## Best Practices

1. **Run QA regularly**: Before every commit
2. **Keep tests fast**: Mock external services
3. **Monitor trends**: Track test duration
4. **Fix failures quickly**: Don't let them pile up
5. **Update tests**: Keep tests current with code changes

---

**Quick Reference**

```bash
# Full automation
npm run qa:all

# Individual phases
npm run qa:npm      # NPM tests
npm run qa:docker   # Docker tests
npm run qa:full     # Comprehensive suite

# View results
cat QA-AUTOMATION-RESULTS/*/MASTER-QA-REPORT.md
```

---

*For detailed documentation, see [QA-AUTOMATION-README.md](./QA-AUTOMATION-README.md)*
