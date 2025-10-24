# 🚑 CURSOR IDE COMPLETE FIX INSTRUCTIONS

**Copy and paste these instructions into Cursor to fix all connection and setup issues**

---

## 🎯 COPY THIS TO CURSOR CHAT:

```
I need you to fix my Cursor IDE setup and resolve connection issues. Please execute these steps in order:

## Step 1: Clean Cursor Server Cache
Run these commands to clean corrupted Cursor server files:

# For macOS:
rm -rf ~/.cursor-server
rm -rf ~/.cursor/User/workspaceStorage  
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage

# For Linux:
rm -rf ~/.cursor-server
rm -rf ~/.cursor/User/workspaceStorage
rm -rf ~/.config/Cursor/User/workspaceStorage

# For Windows (in PowerShell):
Remove-Item -Recurse -Force ~/.cursor-server
Remove-Item -Recurse -Force "$env:APPDATA/Cursor/User/workspaceStorage"

## Step 2: Fix Node.js Version Issues
Ensure consistent Node.js version across all configurations:

# Check current Node version
node -v

# If using nvm, switch to Node 20:
nvm install 20.20.0
nvm use 20.20.0

# Update .nvmrc file
echo "20.20.0" > .nvmrc

## Step 3: Clean and Reinstall Dependencies
Remove corrupted node_modules and reinstall:

# Clear npm cache
npm cache clean --force

# Remove old dependencies
rm -rf node_modules
rm -f package-lock.json

# Fresh install with legacy peer deps (fixes conflicts)
npm install --legacy-peer-deps

## Step 4: Create/Update Environment Configuration
Create .env file with development defaults:

```bash
# Copy from .env.example or create basic .env
cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
# EchoTune AI - Local Development Configuration
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-change-in-production
SESSION_SECRET=dev-session-secret-change-in-production

# Database (Optional - will use mock if not provided)
# MONGODB_URI=mongodb://localhost:27017/echotune_ai
# REDIS_URL=redis://localhost:6379

# Enable mock provider for development
ENABLE_MOCK_PROVIDER=true

# Cursor and automation settings
COMET_HEADLESS=false
PERFORMANCE_MONITORING=true
A11Y_TESTING=true
YOLO_MODE=false

# Disable features that require external services
DISABLE_REALTIME=true
ENABLE_TRACING=false
ENABLE_AGENTOPS=false
EOF
```

## Step 5: Fix Cursor VSCode Configuration
Create proper .vscode configuration to avoid extension conflicts:

```bash
# Create .vscode directory
mkdir -p .vscode

# Create settings.json
cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "javascript.preferences.includePackageJsonAutoImports": "auto",
  "eslint.workingDirectories": ["."],
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/npm-debug.log*": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/*.code-search": true
  },
  "remote.SSH.defaultExtensions": [],
  "remote.SSH.enableRemoteCommand": false
}
EOF

# Create extensions.json (prevents Copilot conflicts)
cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ],
  "unwantedRecommendations": [
    "github.copilot",
    "ms-vscode.remote-ssh"
  ]
}
EOF
```

## Step 6: Test Basic Functionality
Verify everything works:

```bash
# Test Node.js
node -e "console.log('✅ Node.js', process.version, 'is working')"

# Test npm scripts
npm run --silent || echo "⚠️ Some scripts may not be available yet"

# Test basic server start (non-blocking)
npm run validate:env || echo "Environment validation script not found, continuing..."

# Try starting development server
echo "Testing server start..."
echo "Run 'npm run dev' manually to test server"
```

## Step 7: Fix Background Agent Issues
For Cursor Background Agents:

1. **Restart Cursor completely** (quit and reopen)
2. **Disable Privacy Mode**: Go to Cursor Settings > General > Privacy Mode = Off
3. **Background Agents Setup**:
   - Go to Cursor Settings > Background Agents
   - Click "Go To GitHub" to grant access
   - Select this repository (primoscope/Spotify-echo)
   - Click "Refresh" until you see "Access Granted"
   - Click "Base Environment" > "Setup machine interactively"
   - In the agent chat, run: "Install Node.js 20 and npm dependencies for this JavaScript/React project"

## Step 8: Additional Docker Fixes (if using Docker)
Update Dockerfile for consistency:

```bash
# Update Dockerfile to use consistent Node version
sed -i.bak 's/FROM node:20-alpine/FROM node:20.20.0-alpine/g' Dockerfile
echo "✅ Updated Dockerfile for consistent Node.js version"
```

## Step 9: Verify Everything Works
Test all components:

```bash
# Test npm installation
npm ls --depth=0 | head -10

# Test environment
node -e "require('dotenv').config(); console.log('✅ Environment loaded, PORT:', process.env.PORT || '3000')"

# Test basic server (if you have server.js)
echo "To test server: npm run dev"
echo "To test builds: npm run build"
echo "To test automation: npm run comet:test:headless"
```

## Step 10: Final Restart and Validation
```bash
echo "🎯 SETUP COMPLETE!"
echo ""
echo "Next steps:"
echo "1. RESTART CURSOR COMPLETELY (Command+Q or Ctrl+Q then reopen)"
echo "2. Open this project folder in Cursor"
echo "3. Try: npm run dev"
echo "4. Check Background Agents work in Cursor Settings"
echo ""
echo "If issues persist:"
echo "- Check Node.js version: node -v (should be 20.x)"
echo "- Run: npm run validate:env"
echo "- Check Cursor Settings > Background Agents"
echo "- Disable any Remote SSH or Copilot extensions"
```

Execute these steps in order and let me know if you encounter any errors. After completion, restart Cursor completely and try opening the project.
```

---

## 🚨 QUICK EMERGENCY FIX (Copy to Terminal):

If you just want to quickly fix the immediate issues, run this in your terminal:

```bash
# Quick fix script - run this in your project directory
bash .cursor-server-cleanup.sh
```

Or manually:

```bash
# Emergency cleanup (macOS/Linux)
rm -rf ~/.cursor-server node_modules package-lock.json
npm cache clean --force
echo "20.20.0" > .nvmrc
nvm use 20.20.0 2>/dev/null || echo "Install Node 20 manually"
npm install --legacy-peer-deps
echo "✅ Quick fix complete - restart Cursor now"
```

---

## 📝 TROUBLESHOOTING SPECIFIC ERRORS:

### "Failed to connect to the remote extension host server"
```bash
# Fix 1: Clean Cursor server cache
rm -rf ~/.cursor-server

# Fix 2: Remove conflicting extensions
echo 'Remove github.copilot from .vscode/extensions.json'

# Fix 3: Check for version conflicts
node -v
npm -v
```

### "[invalid_argument] Error"
```bash
# This usually means API key or configuration issue
# Check your .env file has valid values
cat .env | grep -E "API_KEY|SECRET"

# Reset to development mode
echo "NODE_ENV=development" >> .env
echo "ENABLE_MOCK_PROVIDER=true" >> .env
```

### "Extension 'github.copilot' not found"
```bash
# Remove copilot references from VS Code config
rm -rf .vscode/settings.json
echo '{"unwantedRecommendations": ["github.copilot"]}' > .vscode/extensions.json
```

### Background Agent Setup Failing
1. Disable Privacy Mode in Cursor Settings
2. Grant GitHub access explicitly
3. Use fresh environment setup
4. Install dependencies manually in agent chat

---

## ✅ SUCCESS CHECKLIST:

After running the fixes, you should see:
- [ ] `node -v` shows 20.x.x
- [ ] `npm run dev` starts without errors
- [ ] Cursor opens project without connection errors
- [ ] Background Agents show "Access Granted"
- [ ] No "invalid_argument" errors in Cursor chat
- [ ] MCP servers connect successfully

---

**🎉 Once fixed, your Spotify-echo project will be fully operational with all the enhanced automation features!**