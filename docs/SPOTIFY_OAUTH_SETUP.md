# Spotify OAuth Configuration Guide

This guide explains how to properly configure Spotify OAuth authentication to resolve the "INVALID_CLIENT: Invalid redirect URI" error.

## Understanding the Error

The error **'INVALID_CLIENT: Invalid redirect URI'** occurs when:
1. The redirect URI in your application doesn't match what's registered in Spotify Developer Dashboard
2. The redirect URI format is incorrect
3. Multiple OAuth flows are using different redirect URIs

## Current Application OAuth Architecture

The EchoTune AI application uses **TWO OAuth entry points**:

### Option 1: Main Auth Route (Recommended)
- **Login URL**: `http://localhost:3000/auth/spotify`
- **Callback URL**: `http://localhost:3000/auth/callback`
- **Flow**: Redirects to `/api/spotify/auth/callback` for processing
- **File**: `src/routes/auth.js`

### Option 2: API Route (Alternative)
- **Login URL**: `http://localhost:3000/api/spotify/auth/login`
- **Callback URL**: `http://localhost:3000/api/spotify/auth/callback`
- **Flow**: Direct callback processing
- **File**: `src/api/routes/spotify.js`

Both routes use the same redirect URI from environment variables but provide different entry points.

## Step-by-Step Configuration

### 1. Register Redirect URI in Spotify Developer Dashboard

**Important**: You must register the EXACT redirect URI in your Spotify app settings.

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Select your application (or create a new one)
4. Click **"Edit Settings"**
5. In the **"Redirect URIs"** section, add:
   ```
   http://localhost:3000/auth/callback
   ```
6. Click **"Add"**
7. Click **"Save"** at the bottom

**Screenshot example:**
```
Redirect URIs:
┌────────────────────────────────────────────┐
│ http://localhost:3000/auth/callback      │  [Add]
└────────────────────────────────────────────┘
```

### 2. Configure Your .env File

Update your `.env` file with the correct configuration:

```bash
# Spotify OAuth Configuration
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Server Configuration (must match redirect URI port)
PORT=3000
NODE_ENV=development
```

**Critical Notes:**
- The `SPOTIFY_REDIRECT_URI` must EXACTLY match what you registered in Spotify Dashboard
- The `PORT` must match the port in your redirect URI
- Use `http://` for localhost (not `https://`)
- No trailing slashes

### 3. Verify Configuration

Run the health check endpoint to verify your configuration:

```bash
curl http://localhost:3000/auth/health
```

Expected response:
```json
{
  "ok": true,
  "clientConfigured": true,
  "redirectUri": "http://localhost:3000/auth/callback",
  "scopes": [...],
  "checks": {
    "clientId": true,
    "clientSecret": true,
    "redirectUri": true
  }
}
```

### 4. Test Authentication Flow

1. Start the application:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/auth/spotify
   ```

3. You should be redirected to Spotify's login page

4. After logging in, you should be redirected back to:
   ```
   http://localhost:3000/auth/callback?code=...&state=...
   ```

5. The application will process the callback and complete authentication

## Common Redirect URI Formats

### Development (Local)
```bash
# Standard format (recommended)
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Alternative API route
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/auth/callback

# Custom port
SPOTIFY_REDIRECT_URI=http://localhost:8080/auth/callback
```

### Production
```bash
# HTTPS is required for production
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/callback

# With subdomain
SPOTIFY_REDIRECT_URI=https://app.yourdomain.com/auth/callback
```

## Troubleshooting

### Error: "INVALID_CLIENT: Invalid redirect URI"

**Cause**: Mismatch between registered and actual redirect URI

**Solution**:
1. Check your `.env` file for `SPOTIFY_REDIRECT_URI`
2. Verify it EXACTLY matches what's in Spotify Dashboard
3. Check for typos: `callback` vs `callbacks`, `http` vs `https`
4. Ensure no trailing slashes
5. Verify the port matches (3000 vs 8080, etc.)

**Debug Steps**:
```bash
# Check what redirect URI the app is using
curl http://localhost:3000/auth/health | jq '.redirectUri'

# Check the authorization URL
curl http://localhost:3000/api/spotify/auth/login | jq '.authUrl'
```

### Error: "Application not registered"

**Cause**: Incorrect Client ID or Client Secret

**Solution**:
1. Go to Spotify Developer Dashboard
2. Copy the exact Client ID and Client Secret
3. Update your `.env` file
4. Restart the application

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in the OAuth request doesn't match any registered URIs

**Solution**:
1. Add the exact redirect URI to Spotify Dashboard (see Step 1 above)
2. Make sure to click "Save" after adding
3. Wait a few seconds for changes to propagate
4. Restart your application

### Multiple Redirect URIs

You can register multiple redirect URIs for different environments:

**Spotify Dashboard Configuration:**
```
Redirect URIs:
- http://localhost:3000/auth/callback          (Development)
- http://localhost:3000/api/spotify/auth/callback  (API Route)
- https://yourdomain.com/auth/callback          (Production)
- https://staging.yourdomain.com/auth/callback  (Staging)
```

Then use environment variables to switch between them:
```bash
# .env.development
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# .env.production
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/callback

# .env.staging
SPOTIFY_REDIRECT_URI=https://staging.yourdomain.com/auth/callback
```

## Understanding the OAuth Flow

### Complete Authentication Flow:

1. **User initiates login**
   - User visits: `http://localhost:3000/auth/spotify`
   - Application generates state and PKCE challenge
   - Application stores state in Redis/memory

2. **Redirect to Spotify**
   - Application redirects to: `https://accounts.spotify.com/authorize`
   - With parameters:
     ```
     response_type=code
     client_id=YOUR_CLIENT_ID
     redirect_uri=http://localhost:3000/auth/callback
     state=RANDOM_STATE
     code_challenge=PKCE_CHALLENGE
     code_challenge_method=S256
     scope=user-read-private user-read-email ...
     ```

3. **User authorizes**
   - User logs in to Spotify (if not already logged in)
   - User grants permissions to the application
   - Spotify redirects back to the redirect_uri

4. **Callback processing**
   - Spotify redirects to: `http://localhost:3000/auth/callback?code=...&state=...`
   - Application receives the callback at `/auth/callback`
   - Application redirects to `/api/spotify/auth/callback` for processing
   - Application verifies state matches stored value
   - Application exchanges code for access token using PKCE verifier

5. **Token exchange**
   - Application POSTs to: `https://accounts.spotify.com/api/token`
   - With parameters:
     ```
     grant_type=authorization_code
     code=AUTHORIZATION_CODE
     redirect_uri=http://localhost:3000/auth/callback
     client_id=YOUR_CLIENT_ID
     client_secret=YOUR_CLIENT_SECRET
     code_verifier=PKCE_VERIFIER
     ```

6. **Success**
   - Spotify returns access_token and refresh_token
   - Application stores tokens
   - Application creates JWT for user
   - User is authenticated

## Security Best Practices

1. **Always use HTTPS in production**
   - Never use `http://` for production redirect URIs
   - Obtain an SSL certificate (Let's Encrypt is free)

2. **Use PKCE (Proof Key for Code Exchange)**
   - The application already implements PKCE
   - This protects against authorization code interception
   - Required for modern OAuth implementations

3. **Validate state parameter**
   - The application validates state to prevent CSRF attacks
   - Never skip state validation

4. **Store tokens securely**
   - Access tokens are stored in secure HTTP-only cookies
   - Refresh tokens are encrypted
   - Never expose tokens in URLs or client-side code

5. **Use minimal scopes**
   - Only request permissions your application actually needs
   - Current scopes:
     ```
     user-read-private
     user-read-email
     playlist-modify-public
     playlist-modify-private
     user-read-recently-played
     user-top-read
     user-library-read
     user-library-modify
     ```

## Testing Authentication

### Manual Test

1. Clear any existing authentication:
   ```bash
   # Clear cookies in browser
   # Or use incognito/private browsing
   ```

2. Start the application:
   ```bash
   LOG_LEVEL=info npm start
   ```

3. Open browser dev tools (F12)

4. Navigate to login:
   ```
   http://localhost:3000/auth/spotify
   ```

5. Check Network tab for:
   - Initial redirect to Spotify
   - Callback redirect from Spotify
   - Token exchange request

6. Verify success:
   - You should be redirected to the application
   - Check for authentication cookie
   - Test protected endpoints

### Automated Test

```bash
# Check OAuth configuration
curl http://localhost:3000/auth/health

# Check Spotify API endpoint
curl http://localhost:3000/api/spotify/auth/login

# Verify redirect URI
curl -I http://localhost:3000/auth/spotify
```

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
PORT=3000
SPOTIFY_CLIENT_ID=your_dev_client_id
SPOTIFY_CLIENT_SECRET=your_dev_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Staging
```bash
NODE_ENV=staging
PORT=3000
DOMAIN=staging.yourdomain.com
SPOTIFY_CLIENT_ID=your_staging_client_id
SPOTIFY_CLIENT_SECRET=your_staging_client_secret
SPOTIFY_REDIRECT_URI=https://staging.yourdomain.com/auth/callback
SSL_ENABLED=true
```

### Production
```bash
NODE_ENV=production
PORT=3000
DOMAIN=yourdomain.com
SPOTIFY_CLIENT_ID=your_prod_client_id
SPOTIFY_CLIENT_SECRET=your_prod_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/callback
SSL_ENABLED=true
```

## Quick Checklist

Before testing authentication, verify:

- [ ] Spotify app created in Developer Dashboard
- [ ] Client ID and Client Secret copied to `.env`
- [ ] Redirect URI registered in Spotify Dashboard
- [ ] Redirect URI in `.env` matches Dashboard exactly
- [ ] Port in `.env` matches redirect URI port
- [ ] Application running on correct port
- [ ] No firewall blocking the port
- [ ] Browser allows cookies from localhost
- [ ] Redis or fallback memory storage working

## Getting Help

If you're still experiencing issues:

1. Check the application logs:
   ```bash
   LOG_LEVEL=debug npm start
   ```

2. Check the browser console for errors

3. Verify all steps in this guide

4. Check Spotify's OAuth documentation:
   https://developer.spotify.com/documentation/web-api/concepts/authorization

5. Review the implementation:
   - `src/routes/auth.js` - Main auth flow
   - `src/api/routes/spotify.js` - API auth endpoints
   - `src/utils/auth-helpers.js` - PKCE and JWT utilities

## Related Documentation

- [Spotify Web API Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [ISSUES_SUMMARY.md](../ISSUES_SUMMARY.md) - All detected issues and solutions
- [QUICK_START_LOGGING.md](../QUICK_START_LOGGING.md) - Clean logging setup

---

**Last Updated:** 2025-10-20
**Version:** 1.0.0
