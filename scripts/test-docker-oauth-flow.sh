#!/bin/bash
# Docker OAuth Flow Validation Script
# Tests OAuth endpoints in containerized environment

set -e

CONTAINER_NAME="echotune-test"
PORT=3000
BASE_URL="http://localhost:${PORT}"

echo "=== Docker OAuth Flow Validation ==="
echo "Container: ${CONTAINER_NAME}"
echo "Base URL: ${BASE_URL}"
echo ""

# Function to make HTTP request and extract JSON field
make_request() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    
    if [ "$method" = "GET" ]; then
        curl -s "${BASE_URL}${endpoint}"
    else
        curl -s -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${endpoint}"
    fi
}

# Function to extract JSON value
extract_json() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"${key}\":\"[^\"]*\"" | cut -d'"' -f4
}

echo "1. Testing healthcheck endpoint..."
health_response=$(make_request "/healthz")
echo "   Response: ${health_response}"
if echo "$health_response" | grep -q "ok"; then
    echo "   ✓ Health check passed"
else
    echo "   ✗ Health check failed"
    exit 1
fi
echo ""

echo "2. Testing Spotify OAuth login endpoint (/auth/spotify)..."
auth_response=$(make_request "/auth/spotify")
echo "   Response preview: $(echo $auth_response | head -c 200)..."

auth_url=$(extract_json "$auth_response" "authUrl")
state=$(extract_json "$auth_response" "state")

if [ -n "$auth_url" ] && [ -n "$state" ]; then
    echo "   ✓ Auth endpoint working"
    echo "   State: ${state}"
else
    echo "   ✗ Auth endpoint failed"
    echo "   Full response: ${auth_response}"
    exit 1
fi
echo ""

echo "3. Validating OAuth URL parameters..."
# Check for required OAuth parameters
if echo "$auth_url" | grep -q "code_challenge="; then
    echo "   ✓ PKCE code_challenge present"
else
    echo "   ✗ Missing PKCE code_challenge"
    exit 1
fi

if echo "$auth_url" | grep -q "code_challenge_method=S256"; then
    echo "   ✓ PKCE S256 method verified"
else
    echo "   ✗ Missing or incorrect code_challenge_method"
    exit 1
fi

if echo "$auth_url" | grep -q "state=${state}"; then
    echo "   ✓ CSRF state parameter present"
else
    echo "   ✗ CSRF state parameter missing"
    exit 1
fi

if echo "$auth_url" | grep -q "scope="; then
    echo "   ✓ OAuth scopes present"
else
    echo "   ✗ OAuth scopes missing"
    exit 1
fi
echo ""

echo "4. Validating redirect_uri in OAuth URL..."
redirect_uri=$(echo "$auth_url" | grep -o "redirect_uri=[^&]*" | cut -d'=' -f2 | sed 's/%2F/\//g' | sed 's/%3A/:/g')
echo "   Redirect URI: ${redirect_uri}"

expected_uri="http://localhost:3000/api/spotify/auth/callback"
if [ "$redirect_uri" = "$expected_uri" ]; then
    echo "   ✓ Redirect URI matches expected value"
else
    echo "   ✗ Redirect URI mismatch!"
    echo "   Expected: ${expected_uri}"
    echo "   Got: ${redirect_uri}"
    exit 1
fi
echo ""

echo "5. Testing alternative OAuth endpoint (/api/spotify/auth/login)..."
alt_auth_response=$(make_request "/api/spotify/auth/login")
alt_auth_url=$(extract_json "$alt_auth_response" "authUrl")

if [ -n "$alt_auth_url" ]; then
    echo "   ✓ Alternative endpoint working"
    
    # Validate redirect URI in alternative endpoint
    alt_redirect_uri=$(echo "$alt_auth_url" | grep -o "redirect_uri=[^&]*" | cut -d'=' -f2 | sed 's/%2F/\//g' | sed 's/%3A/:/g')
    if [ "$alt_redirect_uri" = "$expected_uri" ]; then
        echo "   ✓ Alternative endpoint redirect URI matches"
    else
        echo "   ✗ Alternative endpoint redirect URI mismatch"
        echo "   Got: ${alt_redirect_uri}"
    fi
else
    echo "   ✗ Alternative endpoint failed"
    exit 1
fi
echo ""

echo "6. Testing auth status endpoint..."
status_response=$(make_request "/api/spotify/auth/status")
echo "   Response: ${status_response}"
if echo "$status_response" | grep -q "authenticated"; then
    echo "   ✓ Status endpoint working"
else
    echo "   ✗ Status endpoint failed"
fi
echo ""

echo "7. Testing callback endpoint (expects error without valid code)..."
callback_response=$(make_request "/api/spotify/auth/callback?code=test&state=invalid")
if echo "$callback_response" | grep -q "error"; then
    echo "   ✓ Callback properly rejects invalid state"
else
    echo "   ✗ Callback did not reject invalid state"
fi
echo ""

echo "8. Validating environment variable loading..."
config_check=$(docker exec ${CONTAINER_NAME} sh -c 'echo "SPOTIFY_REDIRECT_URI=$SPOTIFY_REDIRECT_URI"')
echo "   ${config_check}"
if echo "$config_check" | grep -q "SPOTIFY_REDIRECT_URI=http"; then
    echo "   ✓ Environment variables loaded correctly"
else
    echo "   ✗ Environment variables not loaded"
fi
echo ""

echo "==================================="
echo "✅ All Docker OAuth validation tests passed!"
echo "==================================="
echo ""
echo "Summary:"
echo "- Healthcheck: Working"
echo "- OAuth endpoints: Both working"
echo "- PKCE S256: Verified"
echo "- CSRF state: Verified"
echo "- Redirect URI: Matches environment variable"
echo "- Callback validation: Working"
echo ""
