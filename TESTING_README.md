# 🧪 Comprehensive Testing & Validation

Quick reference for running comprehensive tests across the EchoTune AI repository.

## Quick Commands

```bash
# Run everything (recommended)
npm run test:comprehensive

# Run specific components
npm run test:installation        # Validate dependencies & setup
npm run test:mcp-servers         # Check MCP server health
node scripts/env-validate.js     # Check environment configuration
node scripts/comprehensive-api-testing.js  # Test all APIs
```

## What Gets Tested

### ✅ Installation & Setup
- Node.js version (v16+)
- npm and package dependencies
- Python and pip (for ML features)
- Project structure and critical files
- Playwright browsers for E2E tests

### ✅ MCP Server Health
- All 8+ MCP servers validated
- Connection status checked
- Configuration issues detected
- Automatic fixes applied where possible
- Missing dependencies identified

### ✅ Environment & Configuration
- Required environment variables
- Placeholder detection (catches `your_*`, `changeme`, etc.)
- API key validation
- Database connection strings

### ✅ APIs & Services
- **Spotify API**: OAuth, search, track data
- **MongoDB**: Database connectivity
- **Redis**: Cache functionality
- **LLM Providers**: OpenAI, Anthropic, Gemini, Perplexity, etc.
- **Infrastructure**: DigitalOcean, GitHub, Browserbase

### ✅ Authentication & Security
- Spotify OAuth flow
- JWT token generation/validation
- Session management
- Security best practices

### ✅ UI & Screenshots
- Landing page
- Chat interface
- Settings panel
- Provider selection
- Mobile responsiveness

## Test Reports

All tests generate reports in two formats:

### JSON Reports (`reports/*.json`)
- Machine-readable
- Schema v2 compliant
- Suitable for CI/CD parsing

### Markdown Reports (`reports/*.md`)
- Human-readable
- Executive summaries
- Detailed findings

Main report: `COMPREHENSIVE_TEST_REPORT.md` (copied to root)

## Exit Codes

- `0`: All tests passed ✅
- `1`: Critical tests failed ❌
- Tests may warn but not fail if marked as optional

## Common Workflows

### Before Committing
```bash
npm run test:installation  # Quick validation
npm run test:comprehensive # Full suite (if time permits)
```

### Before Deploying
```bash
npm install
npm run test:comprehensive
# Review COMPREHENSIVE_TEST_REPORT.md
```

### CI/CD Pipeline
```bash
npm ci  # Clean install
npm run test:installation  # Fast validation
npm run test:comprehensive # Full validation with secrets
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `node_modules not found` | Run `npm install` |
| `Placeholder detected in .env` | Update `.env` with real values |
| `API test failed (401)` | Verify API credentials |
| `Screenshots missing` | Ensure server is running (`npm start`) |
| `Tests timeout` | Increase timeout: `TEST_TIMEOUT=180000 npm run test:comprehensive` |

## Report Structure

```
reports/
├── installation-validation.json      # Dependency checks
├── installation-validation.md        # Summary
├── env-validation.json              # Environment config
├── api-test-results.json            # API connectivity
├── comprehensive-test-results.json  # Full aggregated results
└── ...
```

## Screenshots

```
BROWSERSCREENSHOT-TESTING/
├── {run-id}/
│   ├── auth/           # Authentication flows
│   ├── chat/           # Chat interface
│   ├── settings/       # Settings panel
│   ├── performance/    # Performance monitoring
│   └── ...
```

## Full Documentation

See [docs/COMPREHENSIVE_TEST_GUIDE.md](docs/COMPREHENSIVE_TEST_GUIDE.md) for:
- Detailed test descriptions
- CI/CD integration examples
- Advanced configuration
- Debugging techniques
- Best practices

## Test Strategy

See [docs/TEST_STRATEGY.md](docs/TEST_STRATEGY.md) for:
- Testing philosophy
- Multi-layered approach
- Schema specifications
- Performance thresholds

---

**Need Help?** Check the [Comprehensive Test Guide](docs/COMPREHENSIVE_TEST_GUIDE.md) or open an issue.
