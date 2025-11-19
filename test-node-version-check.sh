#!/bin/bash
# Test script to verify Node.js version checking works correctly

set -e

echo "════════════════════════════════════════════════════════════"
echo "Testing Node.js Version Check Script"
echo "════════════════════════════════════════════════════════════"
echo ""

# Test 1: Check with current Node version (should pass)
echo "Test 1: Checking with current Node.js version..."
node scripts/check-node-version.js
if [ $? -eq 0 ]; then
    echo "✅ Test 1 PASSED: Current Node version is compatible"
else
    echo "❌ Test 1 FAILED: Current Node version check failed"
    exit 1
fi
echo ""

# Test 2: Check script exists and is executable
echo "Test 2: Verifying setup scripts exist and are executable..."
if [ -x "./install-ubuntu.sh" ]; then
    echo "✅ install-ubuntu.sh is executable"
else
    echo "❌ install-ubuntu.sh is not executable"
    exit 1
fi

if [ -f "scripts/windows/setup.ps1" ]; then
    echo "✅ scripts/windows/setup.ps1 exists"
else
    echo "❌ scripts/windows/setup.ps1 not found"
    exit 1
fi
echo ""

# Test 3: Verify .nvmrc exists
echo "Test 3: Checking .nvmrc file..."
if [ -f ".nvmrc" ]; then
    nvmrc_version=$(cat .nvmrc)
    echo "✅ .nvmrc exists with version: $nvmrc_version"
else
    echo "❌ .nvmrc not found"
    exit 1
fi
echo ""

# Test 4: Verify package.json has correct engines
echo "Test 4: Checking package.json engines..."
node_engine=$(node -e "console.log(require('./package.json').engines.node)")
npm_engine=$(node -e "console.log(require('./package.json').engines.npm)")
echo "   Node.js requirement: $node_engine"
echo "   npm requirement: $npm_engine"

if [[ "$node_engine" == *">=18"* ]]; then
    echo "✅ Node.js engine requirement is correct"
else
    echo "❌ Node.js engine requirement is incorrect"
    exit 1
fi
echo ""

# Test 5: Check if README has troubleshooting section
echo "Test 5: Verifying documentation updates..."
if grep -q "Setup Script Issues" README.md; then
    echo "✅ README.md contains setup script troubleshooting"
else
    echo "❌ README.md missing setup script troubleshooting"
    exit 1
fi

if grep -q "Node.js Version Incompatibility" SETUP.md; then
    echo "✅ SETUP.md contains version troubleshooting"
else
    echo "❌ SETUP.md missing version troubleshooting"
    exit 1
fi
echo ""

echo "════════════════════════════════════════════════════════════"
echo "✅ All Tests Passed!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  • Node.js version check script works correctly"
echo "  • Setup scripts exist and are properly configured"
echo "  • .nvmrc file is present"
echo "  • package.json engines are correct"
echo "  • Documentation includes troubleshooting sections"
echo ""
