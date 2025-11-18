#!/bin/bash

#############################################################################
# EchoTune AI - Automated WSL Setup Script
# For Ubuntu on Windows 11/12 WSL
#############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Banner
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   EchoTune AI - WSL Setup Script                    ║"
echo "║   Ubuntu on Windows 11/12                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check if running on WSL
if ! grep -qi microsoft /proc/version; then
    log_warning "This script is designed for WSL. Detected system might not be WSL."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Please do not run this script as root (without sudo)"
    exit 1
fi

#############################################################################
# Step 1: System Update
#############################################################################
log_info "Step 1: Updating system packages..."
sudo apt update -qq
log_success "System packages updated"

#############################################################################
# Step 2: Install Essential Tools
#############################################################################
log_info "Step 2: Installing essential build tools..."
sudo apt install -y -qq build-essential curl git wget software-properties-common > /dev/null 2>&1
log_success "Essential tools installed"

#############################################################################
# Step 3: Check/Install Node.js
#############################################################################
log_info "Step 3: Checking Node.js installation..."

NODE_VERSION=$(node -v 2>/dev/null || echo "none")
if [[ "$NODE_VERSION" == "none" ]] || [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
    log_warning "Node.js 20.x not found. Installing..."
    
    # Remove old Node.js if exists
    if [[ "$NODE_VERSION" != "none" ]]; then
        sudo apt remove -y nodejs npm > /dev/null 2>&1 || true
    fi
    
    # Install Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt install -y nodejs > /dev/null 2>&1
    
    log_success "Node.js 20.x installed: $(node -v)"
else
    log_success "Node.js already installed: $NODE_VERSION"
fi

npm --version > /dev/null 2>&1
log_success "npm version: $(npm -v)"

#############################################################################
# Step 4: MongoDB (Optional)
#############################################################################
log_info "Step 4: MongoDB installation (optional)..."
read -p "Install MongoDB? (recommended for full features) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Installing MongoDB..."
    
    # Check if MongoDB is already installed
    if command -v mongod > /dev/null 2>&1; then
        log_success "MongoDB already installed"
    else
        # Import MongoDB GPG key
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
            sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
        
        # Add MongoDB repository
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
            sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
        
        # Install MongoDB
        sudo apt update -qq
        sudo apt install -y mongodb-org > /dev/null 2>&1
        
        # Start and enable MongoDB
        sudo systemctl start mongod
        sudo systemctl enable mongod > /dev/null 2>&1
        
        log_success "MongoDB installed and started"
    fi
else
    log_info "Skipping MongoDB installation (will use SQLite fallback)"
fi

#############################################################################
# Step 5: Redis (Optional)
#############################################################################
log_info "Step 5: Redis installation (optional)..."
read -p "Install Redis? (recommended for caching) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Installing Redis..."
    
    # Check if Redis is already installed
    if command -v redis-server > /dev/null 2>&1; then
        log_success "Redis already installed"
    else
        sudo apt install -y redis-server > /dev/null 2>&1
        sudo systemctl enable redis-server > /dev/null 2>&1
        sudo systemctl start redis-server
        log_success "Redis installed and started"
    fi
else
    log_info "Skipping Redis installation (will use in-memory cache)"
fi

#############################################################################
# Step 6: Install npm Dependencies
#############################################################################
log_info "Step 6: Installing npm dependencies..."
log_warning "This may take a few minutes..."

npm install --silent > /dev/null 2>&1 || npm install
log_success "npm dependencies installed"

#############################################################################
# Step 7: Setup Environment Variables
#############################################################################
log_info "Step 7: Setting up environment variables..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        log_success "Created .env from .env.example"
        
        # Generate random JWT secret if not set
        if ! grep -q "JWT_SECRET=" .env || grep -q "JWT_SECRET=\$" .env; then
            JWT_SECRET=$(openssl rand -base64 32)
            sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
            log_success "Generated random JWT_SECRET"
        fi
        
        # Set MongoDB URI if MongoDB was installed
        if command -v mongod > /dev/null 2>&1; then
            sed -i "s|MONGODB_URI=.*|MONGODB_URI=mongodb://localhost:27017/echotune|g" .env
            log_success "Configured MongoDB URI"
        fi
        
        # Set Redis URL if Redis was installed
        if command -v redis-server > /dev/null 2>&1; then
            sed -i "s|REDIS_URL=.*|REDIS_URL=redis://localhost:6379|g" .env
            log_success "Configured Redis URL"
        fi
        
        log_warning "IMPORTANT: Edit .env file to add your API keys:"
        log_warning "  - SPOTIFY_CLIENT_ID"
        log_warning "  - SPOTIFY_CLIENT_SECRET"
        log_warning "  - Other optional API keys (OpenAI, Gemini, etc.)"
    else
        log_error ".env.example not found!"
        exit 1
    fi
else
    log_info ".env file already exists, skipping..."
fi

#############################################################################
# Step 8: Generate Prisma Client
#############################################################################
log_info "Step 8: Generating Prisma client..."

if [ -f prisma/schema.prisma ]; then
    # Set a dummy DATABASE_URL if not set (Prisma requires it to generate)
    if ! grep -q "DATABASE_URL=" .env; then
        echo 'DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"' >> .env
    fi
    
    npx prisma generate --schema=./prisma/schema.prisma > /dev/null 2>&1
    log_success "Prisma client generated"
else
    log_warning "prisma/schema.prisma not found, skipping Prisma generation"
fi

#############################################################################
# Step 9: Validate Installation
#############################################################################
log_info "Step 9: Validating installation..."

# Check Node.js
node -v > /dev/null 2>&1 && log_success "Node.js: $(node -v)"

# Check npm
npm -v > /dev/null 2>&1 && log_success "npm: $(npm -v)"

# Check MongoDB
if command -v mongod > /dev/null 2>&1; then
    if sudo systemctl is-active --quiet mongod; then
        log_success "MongoDB: Running"
    else
        log_warning "MongoDB: Installed but not running"
    fi
else
    log_info "MongoDB: Not installed (using SQLite fallback)"
fi

# Check Redis
if command -v redis-server > /dev/null 2>&1; then
    if sudo systemctl is-active --quiet redis-server; then
        log_success "Redis: Running"
    else
        log_warning "Redis: Installed but not running"
    fi
else
    log_info "Redis: Not installed (using in-memory cache)"
fi

# Check if node_modules exists
if [ -d node_modules ]; then
    log_success "Dependencies: Installed"
else
    log_error "Dependencies: node_modules directory not found"
fi

#############################################################################
# Step 10: Test Server Startup
#############################################################################
log_info "Step 10: Testing server startup..."

timeout 10 npm start > /tmp/echotune-test.log 2>&1 &
SERVER_PID=$!
sleep 8

if ps -p $SERVER_PID > /dev/null; then
    log_success "Server started successfully!"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
else
    log_error "Server failed to start. Check /tmp/echotune-test.log for details"
    cat /tmp/echotune-test.log
fi

#############################################################################
# Installation Complete
#############################################################################
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ Installation Complete!                         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

log_success "EchoTune AI is ready to use!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit environment variables:"
echo "   ${BLUE}nano .env${NC}"
echo ""
echo "2. Add your API keys to .env:"
echo "   - SPOTIFY_CLIENT_ID (get from https://developer.spotify.com)"
echo "   - SPOTIFY_CLIENT_SECRET"
echo "   - Optional: OPENAI_API_KEY, GEMINI_API_KEY, etc."
echo ""
echo "3. Start the development server:"
echo "   ${BLUE}npm run dev${NC}"
echo ""
echo "4. Access the application:"
echo "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo "📖 Documentation:"
echo "   - Setup Guide: ${BLUE}cat SETUP-WSL.md${NC}"
echo "   - Troubleshooting: ${BLUE}cat SETUP.md${NC}"
echo "   - Main README: ${BLUE}cat README.md${NC}"
echo ""
echo "💡 Useful Commands:"
echo "   ${BLUE}npm start${NC}      - Start production server"
echo "   ${BLUE}npm run dev${NC}    - Start development server with auto-reload"
echo "   ${BLUE}npm test${NC}       - Run tests"
echo "   ${BLUE}npm run lint${NC}   - Check code quality"
echo ""

# Show service status
echo "🔧 Service Status:"
if command -v mongod > /dev/null 2>&1; then
    if sudo systemctl is-active --quiet mongod; then
        echo "   MongoDB: ${GREEN}Running${NC}"
    else
        echo "   MongoDB: ${YELLOW}Stopped${NC} (run: sudo systemctl start mongod)"
    fi
fi

if command -v redis-server > /dev/null 2>&1; then
    if sudo systemctl is-active --quiet redis-server; then
        echo "   Redis: ${GREEN}Running${NC}"
    else
        echo "   Redis: ${YELLOW}Stopped${NC} (run: sudo systemctl start redis-server)"
    fi
fi

echo ""
echo "🎉 Happy coding!"
echo ""
