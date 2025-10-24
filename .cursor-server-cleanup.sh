#!/bin/bash
# Cursor Server Cleanup and Reset Script
# This script fixes common Cursor IDE connection and background agent issues

set -e

echo "🔧 Starting Cursor server cleanup and configuration reset..."

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Clean Cursor server directories
cleanup_cursor_server() {
    local os=$(detect_os)
    echo "🗑️  Cleaning Cursor server directories for $os..."
    
    case $os in
        "macos")
            rm -rf ~/.cursor-server
            rm -rf ~/.cursor/User/workspaceStorage
            rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage
            ;;
        "linux")
            rm -rf ~/.cursor-server
            rm -rf ~/.cursor/User/workspaceStorage
            rm -rf ~/.config/Cursor/User/workspaceStorage
            ;;
        "windows")
            rm -rf ~/.cursor-server
            rm -rf "$APPDATA/Cursor/User/workspaceStorage"
            ;;
    esac
}

# Clean npm and node modules
cleanup_npm() {
    echo "📦 Cleaning npm cache and node modules..."
    
    # Clear npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Remove node_modules if it exists
    if [ -d "node_modules" ]; then
        echo "Removing existing node_modules..."
        rm -rf node_modules
    fi
    
    # Remove package-lock.json to force fresh install
    if [ -f "package-lock.json" ]; then
        echo "Removing package-lock.json for fresh dependency resolution..."
        rm package-lock.json
    fi
}

# Check and fix Node.js version
check_node_version() {
    echo "🔍 Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi
    
    local node_version=$(node -v | sed 's/v//')
    local major_version=$(echo $node_version | cut -d. -f1)
    
    echo "Current Node.js version: $node_version"
    
    if [ $major_version -lt 18 ]; then
        echo "⚠️  Node.js version $node_version is below minimum requirement (18+)"
        echo "Please update Node.js to version 18 or higher"
        
        # Check if nvm is available
        if command -v nvm &> /dev/null; then
            echo "🔧 Found nvm. Installing Node.js 20..."
            nvm install 20
            nvm use 20
        else
            echo "Please install Node.js 20+ manually or install nvm first"
            exit 1
        fi
    else
        echo "✅ Node.js version is compatible"
    fi
}

# Fix Docker version mismatch
fix_docker_config() {
    echo "🐳 Checking Docker configuration..."
    
    # Update .nvmrc to match package.json requirement
    if [ -f ".nvmrc" ]; then
        echo "20.20.0" > .nvmrc
        echo "Updated .nvmrc to use Node.js 20.20.0"
    fi
    
    # Update Dockerfile to use consistent Node version
    if [ -f "Dockerfile" ]; then
        sed -i.bak 's/FROM node:20-alpine/FROM node:20.20.0-alpine/g' Dockerfile
        echo "Updated Dockerfile to use consistent Node.js version"
    fi
}

# Create or update .env file
setup_env_file() {
    echo "🔐 Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo "Created .env from .env.example"
        else
            cat > .env << 'EOF'
# EchoTune AI - Local Development Configuration
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-change-in-production
SESSION_SECRET=dev-session-secret-change-in-production

# Database (Optional - will use mock if not provided)
MONGODB_URI=mongodb://localhost:27017/echotune_ai
REDIS_URL=redis://localhost:6379

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
            echo "Created basic .env file with development defaults"
        fi
    else
        echo "✅ .env file already exists"
    fi
}

# Install dependencies with proper flags
install_dependencies() {
    echo "📦 Installing npm dependencies..."
    
    # Use npm ci if package-lock.json exists, otherwise npm install
    if [ -f "package-lock.json" ]; then
        npm ci --legacy-peer-deps
    else
        npm install --legacy-peer-deps
    fi
    
    echo "✅ Dependencies installed successfully"
}

# Create Cursor configuration directory
setup_cursor_config() {
    echo "⚙️  Setting up Cursor configuration..."
    
    # Ensure .vscode directory exists for Cursor compatibility
    mkdir -p .vscode
    
    # Create settings.json if it doesn't exist
    if [ ! -f ".vscode/settings.json" ]; then
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
  }
}
EOF
        echo "Created .vscode/settings.json"
    fi
    
    # Create extensions.json to avoid Copilot conflicts
    if [ ! -f ".vscode/extensions.json" ]; then
        cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ],
  "unwantedRecommendations": [
    "github.copilot"
  ]
}
EOF
        echo "Created .vscode/extensions.json (excludes problematic extensions)"
    fi
}

# Test the setup
test_setup() {
    echo "🧪 Testing setup..."
    
    # Test npm scripts
    echo "Testing npm scripts availability..."
    npm run --silent 2>/dev/null || echo "⚠️  Some npm scripts may not be available"
    
    # Test basic imports
    node -e "console.log('✅ Node.js is working correctly')" 2>/dev/null || {
        echo "❌ Node.js test failed"
        exit 1
    }
    
    echo "✅ Basic setup test completed"
}

# Main execution
main() {
    echo "🚀 Starting Cursor IDE and project setup..."
    echo "==========================================="
    
    cleanup_cursor_server
    cleanup_npm
    check_node_version
    fix_docker_config
    setup_env_file
    setup_cursor_config
    install_dependencies
    test_setup
    
    echo "==========================================="
    echo "✅ Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart Cursor IDE completely"
    echo "2. Open this project folder in Cursor"
    echo "3. Try running: npm run dev"
    echo "4. If issues persist, run: npm run validate:env"
    echo ""
    echo "For background agents:"
    echo "1. Go to Cursor Settings > Background Agents"
    echo "2. Grant GitHub access if needed"
    echo "3. Select this repository"
    echo "4. Set up machine environment interactively"
}

# Run main function
main "$@"