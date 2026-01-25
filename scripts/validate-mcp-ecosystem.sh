#!/bin/bash
# MCP Ecosystem Validation Script
# Validates the GitHub Copilot MCP configuration

echo "🔍 Validating MCP Ecosystem Configuration..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

# Test 1: Check mcp.json exists
echo "📋 Checking core files..."
if [ -f ".github/copilot/mcp.json" ]; then
    pass "mcp.json exists"
else
    fail "mcp.json not found at .github/copilot/mcp.json"
fi

# Test 2: Validate mcp.json is valid JSON
if command -v python3 &> /dev/null; then
    if python3 -m json.tool .github/copilot/mcp.json > /dev/null 2>&1; then
        pass "mcp.json is valid JSON"
    else
        fail "mcp.json has invalid JSON syntax"
    fi
else
    warn "Python3 not found, skipping JSON validation"
fi

# Test 3: Check instructions.md exists
if [ -f ".github/copilot/instructions.md" ]; then
    pass "instructions.md exists"
else
    fail "instructions.md not found"
fi

# Test 4: Check setup guide exists
if [ -f "docs/MCP_SETUP_GUIDE.md" ]; then
    pass "MCP_SETUP_GUIDE.md exists"
else
    fail "MCP_SETUP_GUIDE.md not found"
fi

# Test 5: Check required agents exist
echo ""
echo "🤖 Checking custom agents..."

required_agents=(
    "mcp-power-developer.agent.md"
    "gemini-consultant.agent.md"
    "mcp-fullstack-developer.agent.md"
    "mcp-code-review-testing.agent.md"
)

for agent in "${required_agents[@]}"; do
    if [ -f ".github/copilot/agents/$agent" ]; then
        pass "Agent $agent exists"
    else
        fail "Agent $agent not found"
    fi
done

# Test 6: Validate agent frontmatter
echo ""
echo "📝 Validating agent frontmatter..."

for agent in .github/copilot/agents/*.agent.md; do
    if [ -f "$agent" ]; then
        # Check if file starts with ---
        if head -n 1 "$agent" | grep -q "^---$"; then
            # Check if frontmatter ends with ---
            if head -n 10 "$agent" | tail -n +2 | grep -q "^---$"; then
                pass "$(basename "$agent") has valid frontmatter"
            else
                fail "$(basename "$agent") missing closing frontmatter delimiter"
            fi
        else
            fail "$(basename "$agent") missing frontmatter"
        fi
    fi
done

# Test 7: Count MCP servers in mcp.json
echo ""
echo "🔧 Checking MCP servers..."

if [ -f ".github/copilot/mcp.json" ]; then
    if command -v python3 &> /dev/null; then
        SERVER_COUNT=$(python3 -c "import json; data=json.load(open('.github/copilot/mcp.json')); print(len(data.get('mcpServers', {})))")
        if [ "$SERVER_COUNT" -eq 10 ]; then
            pass "Found all 10 MCP servers"
        else
            warn "Found $SERVER_COUNT MCP servers (expected 10)"
        fi
    fi
fi

# Test 8: Check for required MCP servers
required_servers=(
    "sequential-thinking"
    "memory"
    "github"
    "git"
    "filesystem"
    "gemini-bridge"
    "playwright"
    "puppeteer"
    "brave-search"
    "fetch"
)

if command -v python3 &> /dev/null && [ -f ".github/copilot/mcp.json" ]; then
    for server in "${required_servers[@]}"; do
        if python3 -c "import json; data=json.load(open('.github/copilot/mcp.json')); exit(0 if '$server' in data.get('mcpServers', {}) else 1)" 2>/dev/null; then
            pass "MCP server '$server' configured"
        else
            fail "MCP server '$server' not found in configuration"
        fi
    done
fi

# Test 9: Check GitHub Secrets documentation
echo ""
echo "🔐 Checking secrets documentation..."

if grep -q "COPILOT_MCP_GITHUB_TOKEN" docs/MCP_SETUP_GUIDE.md 2>/dev/null; then
    pass "GitHub token secret documented"
else
    warn "GitHub token secret not documented"
fi

if grep -q "COPILOT_MCP_BRAVE_API" docs/MCP_SETUP_GUIDE.md 2>/dev/null; then
    pass "Brave API secret documented"
else
    warn "Brave API secret not documented"
fi

# Test 10: Check README exists
if [ -f ".github/copilot/README.md" ]; then
    pass "Copilot README exists"
else
    warn "Copilot README not found (recommended)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Passed${NC}:   $PASSED"
echo -e "${YELLOW}⚠️  Warnings${NC}: $WARNINGS"
echo -e "${RED}❌ Failed${NC}:   $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ MCP Ecosystem configuration is valid!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Add required GitHub Secrets (see docs/MCP_SETUP_GUIDE.md)"
    echo "2. Start using GitHub Copilot with MCP servers"
    echo "3. Verify MCP servers load correctly in Copilot session"
    exit 0
else
    echo -e "${RED}⚠️  MCP Ecosystem configuration has issues!${NC}"
    echo ""
    echo "Please fix the failed tests above."
    exit 1
fi
