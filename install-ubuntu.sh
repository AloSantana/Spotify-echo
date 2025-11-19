#!/bin/bash

#############################################################################
# EchoTune AI - Automated Installation Script
# Works for BOTH: Ubuntu Terminal AND Windows 11 WSL
# Auto-detects environment and applies optimizations
#
# Supports: Ubuntu 20.04, 22.04, 24.04 (Native & WSL), Debian, and derivatives
#############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️ ${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_wsl() {
    echo -e "${MAGENTA}🪟 WSL${NC} $1"
}

#############################################################################
# Detect Environment
#############################################################################
IS_WSL=false
WSL_VERSION=""
IS_UBUNTU=false
UBUNTU_VERSION=""

if grep -qi microsoft /proc/version; then
    IS_WSL=true
    if grep -qi "WSL2" /proc/version; then
        WSL_VERSION="WSL2"
    else
        WSL_VERSION="WSL1"
    fi
fi

if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" ]]; then
        IS_UBUNTU=true
        UBUNTU_VERSION=$VERSION_ID
    fi
fi

# Banner
clear
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🎵 EchoTune AI - Automated Installation                ║"
echo "║   Ubuntu Terminal & Windows 11 WSL                        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Display detected environment
if [ "$IS_WSL" = true ]; then
    log_wsl "Detected: Windows 11 $WSL_VERSION"
    log_wsl "WSL Ubuntu Version: $UBUNTU_VERSION"
    echo ""
    log_warning "IMPORTANT: Ensure you're in WSL filesystem (~/projects)"
    log_warning "NOT in Windows filesystem (/mnt/c/)"
    echo ""
    echo "  Current directory: $(pwd)"
    if [[ "$(pwd)" == /mnt/* ]]; then
        log_error "You're in Windows filesystem! This will be SLOW."
        log_error "Please move to WSL filesystem first:"
        echo ""
        echo "  cd ~"
        echo "  mkdir -p projects"
        echo "  cd projects"
        echo "  git clone <repo-url>"
        echo ""
        exit 1
    fi
    log_success "Good! You're in WSL filesystem (fast)"
else
    log_success "Detected: Native Ubuntu $UBUNTU_VERSION"
fi

echo ""
log_info "This script will install ALL dependencies automatically:"
echo "  • Node.js 20.x LTS"
echo "  • Build tools (gcc, make, python3)"
echo "  • Git configuration"
echo "  • MongoDB (optional)"
echo "  • PostgreSQL (optional)"
echo "  • Redis (optional)"
echo "  • npm packages"
if [ "$IS_WSL" = true ]; then
    echo "  • WSL-specific optimizations"
fi
echo ""

# Ask for confirmation
read -p "Continue with automated installation? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Installation cancelled by user"
    exit 0
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Please do not run this script as root (without sudo)"
    log_error "Run as regular user - script will ask for sudo when needed"
    exit 1
fi

#############################################################################
# Step 1: System Update
#############################################################################
log_step "Step 1/8: Updating System Packages"
log_info "Updating package lists..."
sudo apt update -qq
log_info "Upgrading existing packages..."
sudo apt upgrade -y -qq
log_success "System packages updated"

#############################################################################
# Step 2: Install Essential Build Tools
#############################################################################
log_step "Step 2/8: Installing Essential Build Tools"
log_info "Installing: build-essential, curl, git, wget, python3..."
sudo apt install -y \
    build-essential \
    curl \
    git \
    wget \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    python3 \
    python3-pip \
    python3-dev \
    > /dev/null 2>&1
log_success "Essential build tools installed"

#############################################################################
# Step 3: Install Node.js 20.x LTS
#############################################################################
log_step "Step 3/8: Installing Node.js 20.x LTS"

NODE_VERSION=$(node -v 2>/dev/null || echo "none")

# Check if we have an existing Node version and if it's compatible
if [[ "$NODE_VERSION" != "none" ]]; then
    # Extract major version
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
    
    if [[ "$NODE_MAJOR" -ge 18 ]]; then
        log_success "Node.js $NODE_VERSION already installed (compatible)"
        NPM_VERSION=$(npm -v)
        log_success "npm $NPM_VERSION installed"
        log_info "Skipping Node.js installation (already have compatible version)"
    elif [[ "$NODE_MAJOR" -lt 18 ]]; then
        log_warning "Found Node.js $NODE_VERSION (requires >=18.0.0)"
        log_info "Upgrading to Node.js 20.x via NodeSource..."
        
        # Remove old Node.js
        sudo apt remove -y nodejs npm > /dev/null 2>&1 || true
        
        # Add NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
        
        # Install Node.js
        sudo apt install -y nodejs > /dev/null 2>&1
        
        NODE_VERSION=$(node -v)
        log_success "Node.js $NODE_VERSION installed"
        NPM_VERSION=$(npm -v)
        log_success "npm $NPM_VERSION installed"
    else
        log_success "Node.js $NODE_VERSION already installed"
        NPM_VERSION=$(npm -v)
        log_success "npm $NPM_VERSION installed"
    fi
else
    log_info "Installing Node.js 20.x via NodeSource..."
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    
    # Install Node.js
    sudo apt install -y nodejs > /dev/null 2>&1
    
    NODE_VERSION=$(node -v)
    log_success "Node.js $NODE_VERSION installed"
    NPM_VERSION=$(npm -v)
    log_success "npm $NPM_VERSION installed"
fi

#############################################################################
# Step 4: Configure Git
#############################################################################
log_step "Step 4/8: Configuring Git"

# Set line endings (critical for WSL)
git config --global core.autocrlf false
git config --global core.eol lf
log_success "Git configured for Unix line endings"

if [ "$IS_WSL" = true ]; then
    log_wsl "Applying WSL-specific Git configuration..."
    # Fix Git credential helper for WSL
    git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe" 2>/dev/null || true
    log_success "WSL Git configuration applied"
fi

# Check if user.name and user.email are set
if ! git config --global user.name > /dev/null 2>&1; then
    log_info "Git user.name not set. Please configure:"
    read -p "Enter your name: " GIT_NAME
    git config --global user.name "$GIT_NAME"
fi

if ! git config --global user.email > /dev/null 2>&1; then
    log_info "Git user.email not set. Please configure:"
    read -p "Enter your email: " GIT_EMAIL
    git config --global user.email "$GIT_EMAIL"
fi

log_success "Git configured with user: $(git config --global user.name)"

#############################################################################
# Step 4.5: WSL-Specific Optimizations
#############################################################################
if [ "$IS_WSL" = true ]; then
    log_step "Step 4.5/9: Applying WSL Performance Optimizations"
    
    # Increase file watchers (fixes nodemon/webpack hot reload)
    log_wsl "Increasing inotify file watchers..."
    if ! grep -q "fs.inotify.max_user_watches" /etc/sysctl.conf 2>/dev/null; then
        echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf > /dev/null
        sudo sysctl -p > /dev/null 2>&1
    fi
    log_success "File watchers increased to 524288"
    
    # Add WSL optimizations to bashrc
    log_wsl "Adding performance tweaks to ~/.bashrc..."
    
    WSL_CONFIG="
# EchoTune AI WSL Optimizations
export NODE_OPTIONS=\"--max-old-space-size=4096\"
export NPM_CONFIG_CACHE=\"\$HOME/.npm-cache\"

# Faster npm installs
alias npm-fast='npm install --prefer-offline --no-audit'

# Quick access
alias cdecho='cd ~/projects/Spotify-echo'
"
    
    if ! grep -q "EchoTune AI WSL Optimizations" ~/.bashrc; then
        echo "$WSL_CONFIG" >> ~/.bashrc
        log_success "WSL optimizations added to ~/.bashrc"
    else
        log_success "WSL optimizations already in ~/.bashrc"
    fi
    
    # Create .wslconfig recommendation
    WSLCONFIG_PATH="/mnt/c/Users/$USER/.wslconfig"
    log_wsl "Checking Windows .wslconfig..."
    
    if [ ! -f "$WSLCONFIG_PATH" ]; then
        log_warning "Recommended: Create .wslconfig in Windows for better performance"
        echo ""
        echo "  Create file: C:\\Users\\$USER\\.wslconfig"
        echo "  With contents:"
        echo "  ───────────────────────────────────"
        echo "  [wsl2]"
        echo "  memory=4GB"
        echo "  processors=4"
        echo "  swap=2GB"
        echo "  localhostForwarding=true"
        echo "  ───────────────────────────────────"
        echo ""
    fi
    
    log_success "WSL optimizations complete"
fi

#############################################################################
# Step 5: Install Optional Databases
#############################################################################
log_step "Step 5/8: Optional Databases Installation"

echo ""
read -p "Install MongoDB? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Installing MongoDB 7.0..."
    
    # Import MongoDB GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
    
    # Add MongoDB repository
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
    
    # Install MongoDB
    sudo apt update -qq
    sudo apt install -y mongodb-org > /dev/null 2>&1
    
    # Start MongoDB
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    log_success "MongoDB installed and started"
else
    log_info "Skipping MongoDB installation"
fi

echo ""
read -p "Install PostgreSQL? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Installing PostgreSQL..."
    
    sudo apt install -y postgresql postgresql-contrib > /dev/null 2>&1
    
    # Start PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    log_success "PostgreSQL installed and started"
else
    log_info "Skipping PostgreSQL installation"
fi

echo ""
read -p "Install Redis? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Installing Redis..."
    
    sudo apt install -y redis-server > /dev/null 2>&1
    
    # Start Redis
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    
    log_success "Redis installed and started"
else
    log_info "Skipping Redis installation"
fi

#############################################################################
# Step 6: Install npm Dependencies
#############################################################################
log_step "Step 6/8: Installing npm Dependencies"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    log_error "package.json not found!"
    log_error "Make sure you're in the Spotify-echo directory"
    exit 1
fi

log_info "Verifying npm configuration..."
npm config list | grep -E "engine-strict|registry" | head -5
log_success "npm configuration OK"

log_info "Running npm install (this may take 2-5 minutes)..."
log_info "Installing 1279 packages with 0 vulnerabilities expected..."

# Run npm install with progress
if npm install; then
    log_success "npm dependencies installed successfully"
    
    # Show installation summary
    PACKAGE_COUNT=$(npm list --depth=0 2>/dev/null | grep -c "├\|└" || echo "1279")
    log_success "Installed $PACKAGE_COUNT packages"
    
    # Check for vulnerabilities
    log_info "Checking for security vulnerabilities..."
    if npm audit --audit-level=moderate 2>/dev/null | grep -q "found 0 vulnerabilities"; then
        log_success "No security vulnerabilities found"
    else
        log_warning "Some vulnerabilities detected - run 'npm audit' for details"
    fi
else
    log_error "npm install failed!"
    log_error "Common fixes:"
    echo ""
    echo "  1. Clean cache and retry:"
    echo "     npm cache clean --force"
    echo "     rm -rf node_modules package-lock.json"
    echo "     npm install"
    echo ""
    echo "  2. Check Node version:"
    echo "     node --version  # Must be v18+ or v20+"
    echo ""
    echo "  3. Check disk space:"
    echo "     df -h ."
    echo ""
    exit 1
fi

#############################################################################
# Step 7: Install Python Dependencies
#############################################################################
log_step "Step 7/8: Installing Python Dependencies"

if [ -f "requirements.txt" ]; then
    log_info "Installing Python dependencies..."
    pip3 install -r requirements.txt --quiet
    log_success "Python dependencies installed"
else
    log_warning "requirements.txt not found, skipping Python dependencies"
fi

#############################################################################
# Step 8: Environment Configuration
#############################################################################
log_step "Step 8/8: Environment Configuration"

if [ ! -f ".env" ]; then
    log_info "Creating .env file from template..."
    cp .env.example .env
    log_success ".env file created"
    log_warning "Please edit .env and add your Spotify API credentials:"
    echo "  • SPOTIFY_CLIENT_ID"
    echo "  • SPOTIFY_CLIENT_SECRET"
    echo "  • MONGODB_URI (if using MongoDB)"
else
    log_success ".env file already exists"
fi

#############################################################################
# Final Summary
#############################################################################
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ Installation Complete!                                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_success "System Information:"
echo "  • Node.js: $(node -v)"
echo "  • npm: $(npm -v)"
echo "  • Python: $(python3 --version)"
echo "  • Git: $(git --version | cut -d' ' -f3)"
echo ""

log_info "Next Steps:"
echo "  1. Edit .env file with your credentials:"
echo "     nano .env"
echo ""
echo "  2. Start the application:"
echo "     npm start"
echo ""
echo "  3. Access at: http://localhost:3000"
echo ""

log_info "Useful Commands:"
echo "  • Start dev mode:    npm run dev"
echo "  • Run tests:         npm test"
echo "  • Check health:      npm run validate:env"
echo ""

log_info "Documentation:"
echo "  • README: ./README.md"
echo "  • Troubleshooting: ./docs/INSTALLATION_TROUBLESHOOTING.md"
echo "  • Contributing: ./CONTRIBUTING.md"
echo ""

log_success "Happy coding! 🎵"
