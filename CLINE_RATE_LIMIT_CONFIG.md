# Cline Rate Limit Configuration

## Overview

This document explains the Cline rate limit settings configured for this workspace to handle API rate limiting more gracefully.

## Problem

By default, Cline stops after 3 retry attempts when encountering API rate limits, which can be frustrating when working with rate-limited APIs.

## Solution

The workspace settings have been updated to:

1. **Increase retry attempts** from 3 to 10
2. **Add 7-second delay** between retries (especially after the first 2 tries)
3. **Apply to all Cline variants** installed in this workspace

## Settings Applied

### Location

`/workspaces/Spotify-echo/.vscode/settings.json`

### Configuration

```json
{
  "cline.apiRetryAttempts": 10,
  "cline.apiRetryDelay": 7000,
  "cline.rateLimitRetryDelay": 7000,
  "cline.maxRetryAttempts": 10,
  "cline.requestTimeout": 60000
}
```

### Supported Extensions

Settings are configured for all Cline variants:

- `jnorthrup.bao-cline` (Bao Cline)
- `maximumcomputeinc.cline-max` (Cline Max)
- `saoudrizwan.claude-dev` (Original Cline/Claude Dev)
- Standard `cline` extension

## How It Works

### Retry Strategy

1. **First attempt**: Immediate retry
2. **Second attempt**: 7-second delay
3. **Subsequent attempts** (3-10): 7-second delay between each

### Rate Limit Handling

- When Cline encounters a 429 (Rate Limit) error, it will:
  1. Wait 7 seconds
  2. Retry the request
  3. Repeat up to 10 times before giving up

### Timeout Settings

- Request timeout: 60 seconds (increased for slower APIs)

## Verification

Run the verification script to confirm settings:

```bash
./verify-cline-settings.sh
```

## Applying the Settings

### Method 1: Reload Window (Recommended)

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Reload Window"
3. Select "Developer: Reload Window"

### Method 2: Restart VS Code

1. Close VS Code completely
2. Reopen the workspace

### Method 3: Restart Cline

1. Close all Cline chat windows
2. Open a new Cline conversation

## Expected Behavior

### Before

```
❌ API Error: Rate limit exceeded (429)
❌ Retry 1/3 failed
❌ Retry 2/3 failed
❌ Retry 3/3 failed
❌ Giving up after 3 attempts
```

### After

```
⚠️  API Error: Rate limit exceeded (429)
⏳ Waiting 7 seconds before retry...
↻ Retry 1/10
⏳ Waiting 7 seconds before retry...
↻ Retry 2/10
⏳ Waiting 7 seconds before retry...
↻ Retry 3/10
✓ Request successful
```

## Customization

To adjust the settings further, edit `.vscode/settings.json`:

```json
{
  "cline.apiRetryAttempts": 15, // Increase to 15 attempts
  "cline.apiRetryDelay": 10000, // Increase to 10 seconds
  "cline.rateLimitRetryDelay": 10000, // Increase to 10 seconds
  "cline.maxRetryAttempts": 15 // Match retry attempts
}
```

## Troubleshooting

### Settings Not Applied

1. Check if settings file exists: `cat .vscode/settings.json`
2. Verify JSON syntax is valid (no trailing commas)
3. Reload VS Code window
4. Check VS Code output panel for errors

### Still Getting Rate Limited

1. Increase the delay to 10-15 seconds
2. Increase retry attempts to 15-20
3. Check if the API has specific rate limit requirements
4. Consider adding exponential backoff

### Extension-Specific Issues

Different Cline variants may use different setting keys. The configuration includes all known variants:

- `cline.*` - Standard Cline
- `claude-dev.*` - Original extension
- `bao-cline.*` - Bao Cline variant
- `cline-max.*` - Cline Max variant

## Files Modified

- `.vscode/settings.json` - Main configuration file
- `verify-cline-settings.sh` - Verification script
- `CLINE_RATE_LIMIT_CONFIG.md` - This documentation

## Additional Resources

- [Cline GitHub Repository](https://github.com/cline/cline)
- [VS Code Settings Documentation](https://code.visualstudio.com/docs/getstarted/settings)
- [API Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

## Version History

- **2025-10-21**: Initial configuration
  - Increased retry attempts from 3 to 10
  - Added 7-second delay between retries
  - Applied to all Cline variants

---

**Note**: These settings are workspace-specific and will only apply to this project. To apply globally, add them to your User Settings instead.
