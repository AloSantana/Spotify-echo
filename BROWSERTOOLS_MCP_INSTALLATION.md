# BrowserTools MCP Installation Guide

## Overview
BrowserTools MCP is a powerful browser monitoring and interaction tool that enables AI-powered applications to capture and analyze browser data through a Chrome extension.

## Installation Status
✅ **MCP Server Configured** - Added to cline_mcp_settings.json

## Architecture
There are three core components that work together:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│  MCP Client │ ──► │  MCP Server  │ ──► │  Node Server  │ ──► │   Chrome    │
│   (Cline)   │ ◄── │  (Protocol   │ ◄── │ (Middleware)  │ ◄── │  Extension  │
│             │     │   Handler)   │     │               │     │             │
└─────────────┘     └──────────────┘     └───────────────┘     └─────────────┘
```

## Components Installed

### 1. ✅ MCP Server (Configured)
- **Package**: `@agentdeskai/browser-tools-mcp@latest`
- **Location**: Configured in cline_mcp_settings.json
- **Status**: Running via npx
- **Configuration**:
```json
{
  "github.com/AgentDeskAI/browser-tools-mcp": {
    "command": "npx",
    "args": ["-y", "@agentdeskai/browser-tools-mcp@latest"],
    "env": {},
    "disabled": false,
    "autoApprove": []
  }
}
```

### 2. ⚠️ Node.js Middleware Server (Manual Setup Required)
The browser-tools-server acts as middleware between the Chrome extension and MCP server.

**To start the server:**
```bash
# Open a new terminal and run:
npx @agentdeskai/browser-tools-server@latest
```

**Important Notes:**
- Keep this terminal window open while using BrowserTools
- The server must be running for the MCP tools to communicate with Chrome
- Default port: Auto-discovered by the system
- You can stop it with Ctrl+C

### 3. ⚠️ Chrome Extension (Manual Installation Required)
The Chrome extension captures screenshots, console logs, network activity, and DOM elements.

**Installation Steps:**
1. Download the extension:
   - URL: https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip
   
2. Extract the ZIP file to a location on your computer

3. Install in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the extracted extension folder
   
4. Verify Installation:
   - Open Chrome DevTools (F12 or right-click → Inspect)
   - Look for "BrowserToolsMCP" panel in DevTools tabs
   - The panel should show connection status

## Available Tools

Once all components are running, you'll have access to these tools:

### Debugging Tools
- `getConsoleLogs` - Retrieve browser console logs
- `getConsoleErrors` - Get console error messages
- `getNetworkErrors` - Check network ERROR logs
- `getNetworkLogs` - Get ALL network request/response logs
- `takeScreenshot` - Capture current browser tab
- `getSelectedElement` - Get selected DOM element
- `wipeLogs` - Clear all stored logs
- `runDebuggerMode` - Run all debugging tools in sequence

### Auditing Tools (Lighthouse-powered)
- `runAccessibilityAudit` - WCAG compliance check
- `runPerformanceAudit` - Performance bottleneck analysis
- `runSEOAudit` - SEO optimization analysis
- `runBestPracticesAudit` - Web development best practices
- `runNextJSAudit` - NextJS-specific SEO improvements
- `runAuditMode` - Run all audits in sequence

## Quick Start Checklist

- [x] Install MCP server (configured in Cline)
- [ ] Start browser-tools-server in terminal
- [ ] Install Chrome extension
- [ ] Open Chrome DevTools → BrowserToolsMCP panel
- [ ] Verify connection status
- [ ] Test with a simple command (e.g., "take a screenshot")

## Troubleshooting

### Connection Issues
If you see "not connected" errors:

1. **Restart Everything:**
   - Close ALL Chrome windows (not just tabs)
   - Stop the browser-tools-server (Ctrl+C)
   - Restart browser-tools-server
   - Reopen Chrome and DevTools

2. **Check Components:**
   - Verify browser-tools-server is running in terminal
   - Ensure Chrome extension is enabled
   - Only have ONE DevTools panel open
   - Make sure BrowserToolsMCP panel is visible in DevTools

3. **Port Conflicts:**
   - The system uses auto-discovery for ports
   - Check terminal output for any port binding errors
   - Ensure no firewall is blocking local connections

### Extension Not Showing
- Check Chrome extensions page (`chrome://extensions/`)
- Verify extension is enabled
- Look for error messages in extension details
- Try reloading the extension

## Example Usage

Once setup is complete, you can use commands like:

```
# Debugging
"Check the console logs"
"Are there any errors in the browser?"
"Take a screenshot of the current page"

# Performance
"Run a performance audit on this page"
"Check accessibility issues"
"Analyze SEO for this page"

# Combined
"Enter debugger mode to diagnose this issue"
"Run audit mode to optimize this page"
```

## v1.2.0 Features

Recent updates include:
- ✨ Auto-paste screenshots into Cursor (enable in DevTools panel)
- 🔍 SEO, performance, accessibility analysis via Lighthouse
- ⚡ NextJS-specific SEO improvements
- 🐛 Debugger Mode for systematic issue diagnosis
- 🎯 Audit Mode for comprehensive optimization
- 🔧 Windows connectivity fixes
- 🔄 Improved networking with auto-reconnect

## Security & Privacy

All data is stored **locally** on your machine:
- No third-party API calls for log storage
- Logs captured by Chrome extension stay on your computer
- Communication happens via local WebSocket server
- Sensitive headers and cookies are removed before LLM processing

## Documentation & Support

- **Full Docs**: https://browsertools.agentdesk.ai/
- **GitHub**: https://github.com/AgentDeskAI/browser-tools-mcp
- **Roadmap**: https://github.com/orgs/AgentDeskAI/projects/1/views/1
- **Issues**: Open a ticket on GitHub
- **Creator**: [@tedx_ai on X](https://x.com/tedx_ai)

## Next Steps

1. Start the browser-tools-server in a terminal
2. Install the Chrome extension
3. Open DevTools → BrowserToolsMCP panel
4. Try asking: "Take a screenshot of the current page"
