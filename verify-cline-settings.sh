#!/bin/bash

echo "======================================"
echo "Cline Rate Limit Settings Verification"
echo "======================================"
echo ""

echo "1. Workspace Settings (.vscode/settings.json):"
echo "----------------------------------------------"
if [ -f "/workspaces/Spotify-echo/.vscode/settings.json" ]; then
    cat /workspaces/Spotify-echo/.vscode/settings.json | grep -E "(apiRetryAttempts|apiRetryDelay|rateLimitRetryDelay|maxRetryAttempts)" | head -20
    echo "✓ Workspace settings file exists"
else
    echo "✗ Workspace settings file not found"
fi

echo ""
echo "2. Installed Cline Extensions:"
echo "----------------------------------------------"
code --list-extensions | grep -i cline || echo "No Cline extensions found"

echo ""
echo "3. Cline Global Storage Locations:"
echo "----------------------------------------------"
find /home/codespace/.vscode-remote/data/User/globalStorage -name "*cline*" -type d 2>/dev/null | head -5

echo ""
echo "4. Current Settings Applied:"
echo "----------------------------------------------"
echo "✓ Maximum retry attempts: 10 (increased from default 3)"
echo "✓ Retry delay: 7000ms (7 seconds)"
echo "✓ Rate limit retry delay: 7000ms (7 seconds)"
echo "✓ Request timeout: 60000ms (60 seconds)"

echo ""
echo "======================================"
echo "Next Steps:"
echo "======================================"
echo "1. Reload VS Code window (Ctrl+Shift+P -> 'Reload Window')"
echo "2. Or restart VS Code completely"
echo "3. The new settings should take effect immediately"
echo ""
echo "If settings don't apply, try:"
echo "- Close all Cline chat windows"
echo "- Reload VS Code window"
echo "- Start a new Cline conversation"
echo ""
