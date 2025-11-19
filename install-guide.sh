#!/bin/bash

#############################################################################
# EchoTune AI - Interactive Installation Guide
# Checks what you have and shows exactly what you need to install
# Works for: Ubuntu Terminal & Windows 11 WSL
#############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Tracking
MISSING_ITEMS=()
NEEDS_UPDATE=()
ALL_GOOD=()

#############################################################################
# Helper Functions
#############################################################################

print_header() {
    clear
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}║   🎵 ${BOLD}EchoTune AI - Installation Guide${NC}${CYAN}                  ║${NC}"
    echo -e "${CYAN}║   What do YOU need to install?                            ║${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_item() {
    local name="$1"
    local command="$2"
    local version_cmd="$3"
    local min_version="$4"
    
    if command -v "$command" &> /dev/null; then
        local version=$($version_cmd 2>&1 || echo "unknown")
        echo -e "${GREEN}✅${NC} $name: ${GREEN}$version${NC}"
        ALL_GOOD+=("$name")
        return 0
    else
        echo -e "${RED}❌${NC} $name: ${RED}NOT INSTALLED${NC}"
        MISSING_ITEMS+=("$name")
        return 1
    fi
}

check_version() {
    local name="$1"
    local command="$2"
    local version_cmd="$3"
    local min_version="$4"
    
    if command -v "$command" &> /dev/null; then
        local version=$($version_cmd 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1 || echo "0.0.0")
        local major=$(echo "$version" | cut -d. -f1)
        local required=$(echo "$min_version" | cut -d. -f1)
        
        if [ "$major" -ge "$required" ]; then
            echo -e "${GREEN}✅${NC} $name: ${GREEN}v$version${NC} (required: v$min_version+)"
            ALL_GOOD+=("$name")
            return 0
        else
            echo -e "${YELLOW}⚠️ ${NC} $name: ${YELLOW}v$version${NC} (needs: v$min_version+)"
            NEEDS_UPDATE+=("$name")
            return 1
        fi
    else
        echo -e "${RED}❌${NC} $name: ${RED}NOT INSTALLED${NC}"
        MISSING_ITEMS+=("$name")
        return 1
    fi
}

section_header() {
    echo ""
    echo -e "${BOLD}$1${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
}

#############################################################################
# Detect Environment
#############################################################################
IS_WSL=false
IS_UBUNTU=false
UBUNTU_VERSION=""

if grep -qi microsoft /proc/version; then
    IS_WSL=true
fi

if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" ]]; then
        IS_UBUNTU=true
        UBUNTU_VERSION=$VERSION_ID
    fi
fi

#############################################################################
# Main Check
#############################################################################
print_header

# Show environment
if [ "$IS_WSL" = true ]; then
    echo -e "${MAGENTA}🪟 Environment:${NC} Windows 11 WSL + Ubuntu $UBUNTU_VERSION"
else
    echo -e "${BLUE}🐧 Environment:${NC} Ubuntu $UBUNTU_VERSION (Native)"
fi
echo ""

section_header "📦 Checking Required Dependencies"

# Check Node.js
check_version "Node.js" "node" "node --version" "18"
NODE_OK=$?

# Check npm
check_version "npm" "npm" "npm --version" "8"
NPM_OK=$?

# Check Python
check_item "Python3" "python3" "python3 --version"
PYTHON_OK=$?

# Check pip
check_item "pip3" "pip3" "pip3 --version"
PIP_OK=$?

# Check Git
check_item "Git" "git" "git --version"
GIT_OK=$?

section_header "🔧 Checking Build Tools"

# Check gcc
check_item "gcc (C compiler)" "gcc" "gcc --version"
GCC_OK=$?

# Check make
check_item "make" "make" "make --version"
MAKE_OK=$?

# Check curl
check_item "curl" "curl" "curl --version"
CURL_OK=$?

section_header "🗄️ Checking Optional Databases"

# Check MongoDB
if check_item "MongoDB" "mongod" "mongod --version"; then
    MONGO_STATUS="installed"
else
    MONGO_STATUS="optional"
fi

# Check PostgreSQL
if check_item "PostgreSQL" "psql" "psql --version"; then
    POSTGRES_STATUS="installed"
else
    POSTGRES_STATUS="optional"
fi

# Check Redis
if check_item "Redis" "redis-server" "redis-server --version"; then
    REDIS_STATUS="installed"
else
    REDIS_STATUS="optional"
fi

#############################################################################
# Summary and Installation Guide
#############################################################################
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                     SUMMARY                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ${#MISSING_ITEMS[@]} -eq 0 ] && [ ${#NEEDS_UPDATE[@]} -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 GREAT! Everything is already installed!${NC}"
    echo ""
    echo "You're ready to run:"
    echo -e "  ${CYAN}npm install${NC}"
    echo -e "  ${CYAN}npm start${NC}"
    echo ""
    exit 0
fi

if [ ${#MISSING_ITEMS[@]} -gt 0 ]; then
    echo -e "${RED}${BOLD}❌ Missing (${#MISSING_ITEMS[@]} items):${NC}"
    for item in "${MISSING_ITEMS[@]}"; do
        echo "   • $item"
    done
    echo ""
fi

if [ ${#NEEDS_UPDATE[@]} -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}⚠️  Needs Update (${#NEEDS_UPDATE[@]} items):${NC}"
    for item in "${NEEDS_UPDATE[@]}"; do
        echo "   • $item"
    done
    echo ""
fi

echo -e "${BOLD}📖 Installation Instructions Below${NC}"
echo ""

#############################################################################
# Installation Instructions
#############################################################################

# Node.js Installation
if [ $NODE_OK -ne 0 ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ 📦 How to Install Node.js 20.x                            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BOLD}Method 1: Using NodeSource (Recommended)${NC}"
    echo ""
    echo "Run these commands:"
    echo -e "${GREEN}# Install Node.js 20.x${NC}"
    echo "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "sudo apt-get install -y nodejs"
    echo ""
    echo -e "${GREEN}# Verify installation${NC}"
    echo "node --version    # Should show v20.x.x"
    echo "npm --version     # Should show 10.x.x"
    echo ""
    
    echo -e "${BOLD}Method 2: Using nvm (Alternative)${NC}"
    echo ""
    echo "Run these commands:"
    echo -e "${GREEN}# Install nvm${NC}"
    echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "source ~/.bashrc"
    echo ""
    echo -e "${GREEN}# Install Node.js 20${NC}"
    echo "nvm install 20"
    echo "nvm use 20"
    echo "nvm alias default 20"
    echo ""
    
    read -p "Press ENTER to continue..."
    clear
    print_header
fi

# Build Tools
if [ $GCC_OK -ne 0 ] || [ $MAKE_OK -ne 0 ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ 🔧 How to Install Build Tools                             ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo "Run this command to install all build tools at once:"
    echo ""
    echo -e "${GREEN}sudo apt-get update${NC}"
    echo -e "${GREEN}sudo apt-get install -y build-essential${NC}"
    echo ""
    echo "This installs:"
    echo "  • gcc (C compiler)"
    echo "  • g++ (C++ compiler)"
    echo "  • make"
    echo "  • Other essential build tools"
    echo ""
    
    read -p "Press ENTER to continue..."
    clear
    print_header
fi

# Python
if [ $PYTHON_OK -ne 0 ] || [ $PIP_OK -ne 0 ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ 🐍 How to Install Python & pip                            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo "Run these commands:"
    echo ""
    echo -e "${GREEN}sudo apt-get update${NC}"
    echo -e "${GREEN}sudo apt-get install -y python3 python3-pip python3-dev${NC}"
    echo ""
    echo -e "${GREEN}# Verify installation${NC}"
    echo "python3 --version"
    echo "pip3 --version"
    echo ""
    
    read -p "Press ENTER to continue..."
    clear
    print_header
fi

# Git
if [ $GIT_OK -ne 0 ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ 📚 How to Install Git                                     ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo "Run these commands:"
    echo ""
    echo -e "${GREEN}sudo apt-get update${NC}"
    echo -e "${GREEN}sudo apt-get install -y git${NC}"
    echo ""
    echo -e "${GREEN}# Configure Git${NC}"
    echo "git config --global user.name \"Your Name\""
    echo "git config --global user.email \"your.email@example.com\""
    echo ""
    if [ "$IS_WSL" = true ]; then
        echo -e "${MAGENTA}WSL-Specific:${NC} Configure line endings"
        echo "git config --global core.autocrlf false"
        echo "git config --global core.eol lf"
        echo ""
    fi
    
    read -p "Press ENTER to continue..."
    clear
    print_header
fi

# curl
if [ $CURL_OK -ne 0 ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ 🌐 How to Install curl                                    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo "Run these commands:"
    echo ""
    echo -e "${GREEN}sudo apt-get update${NC}"
    echo -e "${GREEN}sudo apt-get install -y curl${NC}"
    echo ""
    
    read -p "Press ENTER to continue..."
    clear
    print_header
fi

#############################################################################
# Optional Databases
#############################################################################
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║ 🗄️  Optional Databases (Install if needed)                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$MONGO_STATUS" != "installed" ]; then
    echo -e "${BOLD}MongoDB 7.0 (For music data storage)${NC}"
    echo ""
    echo -e "${GREEN}# Add MongoDB repository${NC}"
    echo "curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \\"
    echo "  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg"
    echo ""
    echo "echo \"deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \\"
    echo "  https://repo.mongodb.org/apt/ubuntu \$(lsb_release -cs)/mongodb-org/7.0 multiverse\" | \\"
    echo "  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list"
    echo ""
    echo -e "${GREEN}# Install MongoDB${NC}"
    echo "sudo apt-get update"
    echo "sudo apt-get install -y mongodb-org"
    echo ""
    echo -e "${GREEN}# Start MongoDB${NC}"
    echo "sudo systemctl start mongod"
    echo "sudo systemctl enable mongod"
    echo ""
else
    echo -e "${GREEN}✅ MongoDB already installed${NC}"
    echo ""
fi

if [ "$POSTGRES_STATUS" != "installed" ]; then
    echo -e "${BOLD}PostgreSQL (For chat history & preferences)${NC}"
    echo ""
    echo -e "${GREEN}sudo apt-get install -y postgresql postgresql-contrib${NC}"
    echo -e "${GREEN}sudo systemctl start postgresql${NC}"
    echo -e "${GREEN}sudo systemctl enable postgresql${NC}"
    echo ""
else
    echo -e "${GREEN}✅ PostgreSQL already installed${NC}"
    echo ""
fi

if [ "$REDIS_STATUS" != "installed" ]; then
    echo -e "${BOLD}Redis (For caching)${NC}"
    echo ""
    echo -e "${GREEN}sudo apt-get install -y redis-server${NC}"
    echo -e "${GREEN}sudo systemctl start redis-server${NC}"
    echo -e "${GREEN}sudo systemctl enable redis-server${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Redis already installed${NC}"
    echo ""
fi

#############################################################################
# WSL-Specific Optimizations
#############################################################################
if [ "$IS_WSL" = true ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ 🪟 WSL Performance Optimizations                           ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BOLD}1. Increase file watchers (fixes hot reload)${NC}"
    echo ""
    echo -e "${GREEN}echo \"fs.inotify.max_user_watches=524288\" | sudo tee -a /etc/sysctl.conf${NC}"
    echo -e "${GREEN}sudo sysctl -p${NC}"
    echo ""
    
    echo -e "${BOLD}2. Add performance tweaks to ~/.bashrc${NC}"
    echo ""
    echo -e "${GREEN}cat >> ~/.bashrc << 'EOF'${NC}"
    echo "# EchoTune AI WSL Optimizations"
    echo "export NODE_OPTIONS=\"--max-old-space-size=4096\""
    echo "export NPM_CONFIG_CACHE=\"\$HOME/.npm-cache\""
    echo "EOF"
    echo ""
    echo -e "${GREEN}source ~/.bashrc${NC}"
    echo ""
    
    echo -e "${BOLD}3. Create .wslconfig for better WSL performance${NC}"
    echo ""
    echo "Create file: ${YELLOW}C:\\Users\\$USER\\.wslconfig${NC}"
    echo "With contents:"
    echo ""
    echo "[wsl2]"
    echo "memory=4GB"
    echo "processors=4"
    echo "swap=2GB"
    echo "localhostForwarding=true"
    echo ""
    echo "Then restart WSL:"
    echo -e "${GREEN}wsl --shutdown${NC} (run in PowerShell)"
    echo ""
fi

#############################################################################
# Quick Install Command
#############################################################################
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║ ⚡ Quick Install All Required Tools                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "Run this ONE command to install everything at once:"
echo ""
echo -e "${BOLD}${GREEN}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \\${NC}"
echo -e "${GREEN}sudo apt-get update && \\${NC}"
echo -e "${GREEN}sudo apt-get install -y \\${NC}"
echo -e "${GREEN}  nodejs build-essential python3 python3-pip git curl wget${NC}"
echo ""

#############################################################################
# Test npm install (if in repo)
#############################################################################
if [ -f "package.json" ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ 🧪 Testing npm install                                     ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ ${#MISSING_ITEMS[@]} -eq 0 ] && [ ${#NEEDS_UPDATE[@]} -eq 0 ]; then
        echo "Running test installation (dry-run)..."
        echo ""
        
        if npm install --dry-run > /tmp/npm-test.log 2>&1; then
            echo -e "${GREEN}✅ npm install test: PASSED${NC}"
            echo ""
            echo "Ready to run:"
            echo -e "   ${CYAN}npm install${NC}"
            echo ""
        else
            echo -e "${RED}❌ npm install test: FAILED${NC}"
            echo ""
            echo "Error details:"
            tail -20 /tmp/npm-test.log
            echo ""
            echo -e "${YELLOW}Possible fixes:${NC}"
            echo ""
            echo "1. Clean npm cache:"
            echo -e "   ${CYAN}npm cache clean --force${NC}"
            echo ""
            echo "2. Remove old files:"
            echo -e "   ${CYAN}rm -rf node_modules package-lock.json${NC}"
            echo ""
            echo "3. Check permissions:"
            echo -e "   ${CYAN}ls -la package.json${NC}"
            echo ""
            echo "4. Try with npm ci (faster):"
            echo -e "   ${CYAN}npm ci${NC}"
            echo ""
        fi
    fi
fi

#############################################################################
# npm install Troubleshooting
#############################################################################
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║ 🔧 npm install Troubleshooting                             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}If npm install fails, try these fixes:${NC}"
echo ""

echo -e "${YELLOW}Problem: EACCES permission denied${NC}"
echo "Fix: Never use sudo with npm in user directory"
echo -e "   ${GREEN}mkdir -p ~/.npm-global${NC}"
echo -e "   ${GREEN}npm config set prefix '~/.npm-global'${NC}"
echo -e "   ${GREEN}echo 'export PATH=~/.npm-global/bin:\$PATH' >> ~/.bashrc${NC}"
echo -e "   ${GREEN}source ~/.bashrc${NC}"
echo ""

echo -e "${YELLOW}Problem: EINTEGRITY or checksum failed${NC}"
echo "Fix: Clear npm cache"
echo -e "   ${GREEN}npm cache clean --force${NC}"
echo -e "   ${GREEN}rm -rf node_modules package-lock.json${NC}"
echo -e "   ${GREEN}npm install${NC}"
echo ""

echo -e "${YELLOW}Problem: gyp ERR! (native module build failed)${NC}"
echo "Fix: Install build tools"
echo -e "   ${GREEN}sudo apt-get install -y build-essential python3${NC}"
echo ""

echo -e "${YELLOW}Problem: EBADENGINE (wrong Node version)${NC}"
echo "Fix: Upgrade Node.js to v20.x"
echo -e "   ${GREEN}node --version${NC}  # Check current version"
echo -e "   ${GREEN}# Then follow Node.js installation steps above${NC}"
echo ""

if [ "$IS_WSL" = true ]; then
    echo -e "${MAGENTA}WSL-Specific: npm install is SLOW${NC}"
    echo "Fix: Make sure you're in WSL filesystem!"
    echo -e "   ${RED}WRONG: /mnt/c/Users/...${NC}  (Windows filesystem - SLOW)"
    echo -e "   ${GREEN}RIGHT: ~/projects/...${NC}     (WSL filesystem - FAST)"
    echo ""
    echo "Current directory: $(pwd)"
    if [[ "$(pwd)" == /mnt/* ]]; then
        echo -e "   ${RED}⚠️  You're in Windows filesystem! Move to WSL filesystem.${NC}"
    else
        echo -e "   ${GREEN}✅ Good! You're in WSL filesystem.${NC}"
    fi
    echo ""
fi

echo -e "${BOLD}Recommended: Use npm ci (faster, more reliable)${NC}"
echo -e "   ${CYAN}npm ci${NC}  # Clean install from package-lock.json"
echo ""

#############################################################################
# Final Instructions
#############################################################################
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║ 🚀 Next Steps                                              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -f "package.json" ]; then
    echo "1. Run this guide again after installing missing items:"
    echo -e "   ${CYAN}./install-guide.sh${NC}"
    echo ""

    echo "2. Clone EchoTune AI:"
    if [ "$IS_WSL" = true ]; then
        echo -e "   ${CYAN}cd ~/projects${NC}  # IMPORTANT: Use WSL filesystem!"
    else
        echo -e "   ${CYAN}cd ~/projects${NC}"
    fi
    echo -e "   ${CYAN}git clone https://github.com/primoscope/Spotify-echo.git${NC}"
    echo -e "   ${CYAN}cd Spotify-echo${NC}"
    echo ""
fi

echo "3. Install npm dependencies:"
echo -e "   ${CYAN}npm install${NC}  # or ${CYAN}npm ci${NC} (faster)"
echo ""

echo "4. Configure environment:"
echo -e "   ${CYAN}cp .env.example .env${NC}"
echo -e "   ${CYAN}nano .env${NC}  # Add your Spotify API credentials"
echo ""

echo "5. Verify installation:"
echo -e "   ${CYAN}npm run validate:env${NC}"
echo ""

echo "6. Start the application:"
echo -e "   ${CYAN}npm start${NC}"
echo "   Access at: http://localhost:3000"
echo ""

echo -e "${GREEN}📚 More help: ./docs/INSTALLATION_TROUBLESHOOTING.md${NC}"
echo -e "${GREEN}🤖 Automated install: ./install-ubuntu.sh${NC}"
echo ""
