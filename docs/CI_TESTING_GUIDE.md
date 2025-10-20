# CI/CD Testing Guide

## Docker E2E Tests Workflow

The `.github/workflows/docker-e2e-tests.yml` workflow provides comprehensive testing for Docker builds and browser automation.

### Workflow Triggers

```yaml
on:
  pull_request:    # Runs on all PRs
  push:
    branches: [main]  # Runs on main branch pushes
  workflow_dispatch:  # Manual trigger
```

### What Gets Tested

#### Job 1: docker-build-and-test

1. **Environment Setup**
   - Checkout code
   - Setup Node.js 20
   - Install dependencies

2. **Environment Loading (Guarded)**
   - Checks if `.env` file exists
   - Loads variables if present (without printing)
   - Continues safely if not present

3. **Docker Build**
   - Builds image with commit SHA and timestamp
   - Tags as `spotify-echo:ci`
   - Verifies build succeeds

4. **Container Startup**
   - Starts container with `.env` if available
   - Exposes port 3000
   - Monitors startup process

5. **Health Check Validation**
   - Waits up to 120 seconds for `/healthz` endpoint
   - Retries every 5 seconds
   - Validates JSON response structure
   - Tests all health endpoints (`/healthz`, `/health`, `/health/simple`)

6. **Playwright Tests**
   - Installs Playwright browsers with dependencies
   - Runs smoke test suite
   - Tests run against `http://127.0.0.1:3000`
   - Screenshots captured for baseline

7. **Cleanup**
   - Stops container on success
   - Prints logs and stops container on failure
   - Uploads test artifacts (screenshots, reports)

#### Job 2: windows-compatibility

1. **Script Validation**
   - Verifies PowerShell scripts exist and are readable
   - Tests setup.ps1, run.ps1, test.ps1, docker.ps1

2. **Line Ending Verification**
   - Checks `.gitattributes` file exists
   - Validates line ending configuration

3. **Package Installation**
   - Tests `npm ci` on Windows
   - Verifies cross-env availability

### Running Locally

You can simulate the CI workflow locally:

```bash
# 1. Build Docker image
export BUILD_SHA=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

docker build \
  --build-arg BUILD_SHA="$BUILD_SHA" \
  --build-arg BUILD_TIME="$BUILD_TIME" \
  -t spotify-echo:local \
  .

# 2. Start container
docker run -d \
  --name spotify-echo-local \
  --env-file .env \
  -p 3000:3000 \
  spotify-echo:local

# 3. Wait for health check
echo "Waiting for health check..."
for i in {1..24}; do
  if curl -f -s http://127.0.0.1:3000/healthz > /dev/null 2>&1; then
    echo "✅ Health check passed!"
    break
  fi
  echo "Attempt $i/24..."
  sleep 5
done

# 4. Verify all health endpoints
curl -s http://127.0.0.1:3000/healthz | jq '.'
curl -s http://127.0.0.1:3000/health | jq '.'
curl -s http://127.0.0.1:3000/health/simple | jq '.'

# 5. Run Playwright tests
npm run playwright:install
npm run test:e2e:smoke

# 6. Cleanup
docker stop spotify-echo-local
docker rm spotify-echo-local
```

### On Windows (PowerShell)

```powershell
# Build
.\scripts\windows\docker.ps1 -Action build

# Run
.\scripts\windows\docker.ps1 -Action run

# Verify health
Start-Sleep -Seconds 10
Invoke-RestMethod -Uri "http://127.0.0.1:3000/healthz"

# Run tests
npm run playwright:install
npm run test:e2e:smoke

# Cleanup
.\scripts\windows\docker.ps1 -Action stop
```

### Environment Variables in CI

The workflow handles `.env` file if present in the repository:

```yaml
- name: Load environment from .env (if present)
  id: load-env
  run: |
    if [ -f .env ]; then
      echo "✅ .env file found - loading variables (secrets will not be printed)"
      set -a
      source .env
      set +a
      echo "ENV_LOADED=true" >> $GITHUB_OUTPUT
    else
      echo "⚠️  .env file not found - skipping env load"
      echo "ENV_LOADED=false" >> $GITHUB_OUTPUT
    fi
```

**Important:** This step never echoes the contents of `.env` to logs.

### Test Artifacts

The workflow uploads test artifacts on completion:

- `BROWSERSCREENSHOT-TESTING/` - Screenshots from tests
- `playwright-report/` - HTML test reports
- `test-results/` - JSON test results

Access artifacts from the GitHub Actions UI:
1. Go to the Actions tab
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download artifacts

### Debugging Failed Runs

If the workflow fails:

1. **Check Build Logs**
   - Look for Docker build errors
   - Verify all dependencies are in package.json

2. **Check Container Logs**
   - Workflow prints logs on failure
   - Look for module not found errors
   - Check for configuration issues

3. **Check Health Check**
   - Did the endpoint respond within 120s?
   - Were there any startup errors?
   - Check network configuration

4. **Check Test Output**
   - Review Playwright test results
   - Check screenshots in artifacts
   - Look for timing issues

### Common Issues

#### Issue: Health check times out

**Possible Causes:**
- Server takes too long to start
- Missing dependencies prevent startup
- Port not properly exposed

**Solution:**
- Check container logs
- Verify all runtime dependencies in package.json
- Increase health check timeout if needed

#### Issue: Playwright tests fail

**Possible Causes:**
- Server not fully started
- Endpoints changed
- Browser installation issues

**Solution:**
- Verify server is running: `curl http://127.0.0.1:3000/healthz`
- Check test expectations match actual endpoints
- Ensure `playwright:install` ran successfully

#### Issue: Windows job fails

**Possible Causes:**
- PowerShell script syntax errors
- Line ending issues (CRLF vs LF)
- Missing dependencies

**Solution:**
- Verify `.gitattributes` is applied
- Check PowerShell script has proper line endings (CRLF)
- Test scripts locally on Windows

### Performance Optimization

The workflow includes several optimizations:

1. **Caching**
   - Node.js dependencies cached
   - Docker layer caching enabled

2. **Parallel Jobs**
   - Docker test and Windows validation run in parallel
   - Independent jobs complete faster

3. **Resource Limits**
   - 30-minute timeout for docker job
   - 15-minute timeout for windows job

### Success Criteria

A successful workflow run shows:
- ✅ Docker image built
- ✅ Container started and healthy
- ✅ All health endpoints responding
- ✅ Playwright browsers installed
- ✅ All smoke tests passed
- ✅ Windows scripts validated
- ✅ Artifacts uploaded

## Additional Resources

- [Docker Build Documentation](https://docs.docker.com/engine/reference/commandline/build/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev/)
- [Windows Setup Guide](docs/WINDOWS_SETUP.md)
