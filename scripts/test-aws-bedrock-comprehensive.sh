#!/bin/bash

# AWS Bedrock Comprehensive Model Testing Script
# Wrapper for test-aws-bedrock-comprehensive.js with helpful defaults

set -e

echo "==========================================="
echo "AWS Bedrock Comprehensive Model Testing"
echo "==========================================="
echo ""

# Check if AWS SDK is installed
if ! node -e "require('@aws-sdk/client-bedrock-runtime')" 2>/dev/null; then
    echo "⚠️  AWS SDK not found. Installing..."
    npm install @aws-sdk/client-bedrock-runtime --save-dev
    echo "✅ AWS SDK installed"
    echo ""
fi

# Set AWS credentials if provided as arguments
if [ ! -z "$1" ] && [ ! -z "$2" ]; then
    export AWS_ACCESS_KEY_ID="$1"
    export AWS_SECRET_ACCESS_KEY="$2"
    export AWS_REGION="${3:-us-east-1}"
    echo "✅ Using provided AWS credentials"
    echo "   Region: $AWS_REGION"
    echo ""
fi

# Check for credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS credentials not found"
    echo ""
    echo "Usage:"
    echo "  1. Set environment variables:"
    echo "     export AWS_ACCESS_KEY_ID=your_key"
    echo "     export AWS_SECRET_ACCESS_KEY=your_secret"
    echo "     export AWS_REGION=us-east-1  # optional"
    echo ""
    echo "  2. Or provide as arguments:"
    echo "     ./scripts/test-aws-bedrock-comprehensive.sh AWS_KEY AWS_SECRET us-east-1"
    echo ""
    exit 1
fi

echo "==========================================="
echo "Running Comprehensive Bedrock Tests"
echo "==========================================="
echo ""

# Run the comprehensive test
node scripts/test-aws-bedrock-comprehensive.js "$@"

TEST_EXIT_CODE=$?

echo ""
echo "==========================================="
echo "Test Complete!"
echo "==========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Tests PASSED - AWS Bedrock models are accessible!"
    echo ""
    echo "📊 View detailed results:"
    echo "   - test-results/aws-bedrock-comprehensive-latest.md"
    echo "   - test-results/aws-bedrock-comprehensive-latest.json"
else
    echo "❌ Tests FAILED - Check results for details"
    echo ""
    echo "📊 View error analysis:"
    echo "   - test-results/aws-bedrock-comprehensive-latest.md"
    echo "   - test-results/aws-bedrock-comprehensive-latest.json"
    echo ""
    echo "🛠️  Common fixes:"
    echo "   1. Check IAM permissions for bedrock:InvokeModel"
    echo "   2. Remove any explicit deny policies"
    echo "   3. Enable models in AWS Bedrock console"
    echo "   4. Verify AWS account has Bedrock access"
    echo "   5. Try different region (--region us-west-2)"
fi

echo ""
echo "==========================================="
echo "Additional Commands"
echo "==========================================="
echo ""
echo "Test specific models:"
echo "  npm run test:bedrock -- --models claude-3-5-sonnet-v2,claude-sonnet-4-5"
echo ""
echo "Test with verbose output:"
echo "  npm run test:bedrock:verbose"
echo ""
echo "Quick test (skip streaming and variations):"
echo "  npm run test:bedrock:quick"
echo ""
echo "Include deprecated models:"
echo "  npm run test:bedrock:deprecated"
echo ""
echo "Test in different region:"
echo "  AWS_REGION=us-west-2 npm run test:bedrock"
echo ""
echo "View help:"
echo "  node scripts/test-aws-bedrock-comprehensive.js --help"
echo ""

exit $TEST_EXIT_CODE
