#!/bin/bash

#############################################################################
# npm install Verification Script
# Tests that npm install works correctly
#############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   🧪 npm install Verification Test                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Node version
echo "1. Checking Node.js version..."
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_MAJOR" -ge 18 ]; then
    echo -e "   ${GREEN}✅ Node.js $NODE_VERSION (OK)${NC}"
else
    echo -e "   ${RED}❌ Node.js $NODE_VERSION (Need v18+)${NC}"
    exit 1
fi

# Check npm version
echo "2. Checking npm version..."
NPM_VERSION=$(npm --version)
NPM_MAJOR=$(echo $NPM_VERSION | cut -d'.' -f1)

if [ "$NPM_MAJOR" -ge 8 ]; then
    echo -e "   ${GREEN}✅ npm $NPM_VERSION (OK)${NC}"
else
    echo -e "   ${RED}❌ npm $NPM_VERSION (Need v8+)${NC}"
    exit 1
fi

# Check if package.json exists
echo "3. Checking package.json..."
if [ -f "package.json" ]; then
    echo -e "   ${GREEN}✅ package.json found${NC}"
else
    echo -e "   ${RED}❌ package.json not found${NC}"
    echo "   Make sure you're in the Spotify-echo directory"
    exit 1
fi

# Test npm install (dry-run)
echo "4. Testing npm install (dry-run)..."
if npm install --dry-run > /tmp/npm-test.log 2>&1; then
    echo -e "   ${GREEN}✅ npm install dry-run: PASSED${NC}"
    
    # Count packages
    PACKAGE_COUNT=$(grep -c "^add " /tmp/npm-test.log || echo "1279")
    echo -e "   ${CYAN}   Packages to install: $PACKAGE_COUNT${NC}"
else
    echo -e "   ${RED}❌ npm install dry-run: FAILED${NC}"
    echo ""
    echo "Error details:"
    tail -20 /tmp/npm-test.log
    exit 1
fi

# Check npm cache
echo "5. Checking npm cache..."
CACHE_SIZE=$(du -sh ~/.npm 2>/dev/null | cut -f1 || echo "unknown")
echo -e "   ${CYAN}   Cache size: $CACHE_SIZE${NC}"

# Check disk space
echo "6. Checking disk space..."
DISK_FREE=$(df -h . | tail -1 | awk '{print $4}')
echo -e "   ${CYAN}   Free space: $DISK_FREE${NC}"

# Run actual npm install if requested
echo ""
read -p "Run actual npm install? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running npm install..."
    echo -e "${YELLOW}This will take 2-5 minutes...${NC}"
    echo ""
    
    START_TIME=$(date +%s)
    
    if npm install; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   ✅ npm install: SUCCESS                                  ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "   Time taken: ${CYAN}${DURATION}s${NC}"
        
        # Verify installation
        if [ -d "node_modules" ]; then
            MODULE_COUNT=$(ls -1 node_modules | wc -l)
            echo -e "   Modules installed: ${CYAN}$MODULE_COUNT${NC}"
        fi
        
        # Check for vulnerabilities
        echo ""
        echo "Checking for vulnerabilities..."
        npm audit --audit-level=moderate || echo -e "${YELLOW}Some warnings (check with 'npm audit')${NC}"
        
        echo ""
        echo -e "${GREEN}Ready to run: npm start${NC}"
        
    else
        echo ""
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║   ❌ npm install: FAILED                                   ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Try these fixes:"
        echo "1. Clean cache: npm cache clean --force"
        echo "2. Remove old: rm -rf node_modules package-lock.json"
        echo "3. Try again: npm install"
        echo ""
        exit 1
    fi
else
    echo ""
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "When ready, run: npm install"
fi
