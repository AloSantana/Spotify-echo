#!/bin/bash

# AWS Bedrock Claude Testing Guide
# Quick commands to test and validate AWS Bedrock access

echo "=========================================="
echo "AWS Bedrock Claude Testing Suite"
echo "=========================================="
echo ""

# Check if AWS SDK is installed
if ! node -e "require('@aws-sdk/client-bedrock-runtime')" 2>/dev/null; then
    echo "⚠️  AWS SDK not found. Installing..."
    npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-iam @aws-sdk/client-sts --save-dev
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

echo "=========================================="
echo "Running AWS Bedrock Claude Test Suite"
echo "=========================================="
echo ""

# Run the comprehensive test
node scripts/test-aws-bedrock-claude.js

TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Tests PASSED - AWS Bedrock access is working!"
    echo ""
    echo "📊 View detailed results:"
    echo "   - AWS_BEDROCK_CLAUDE_TEST_RESULTS.md"
    echo "   - test-results/aws-bedrock-claude-test-*.md"
else
    echo "❌ Tests FAILED - Check results for details"
    echo ""
    echo "📊 View error analysis:"
    echo "   - AWS_BEDROCK_QUICK_SUMMARY.md (Quick overview)"
    echo "   - AWS_BEDROCK_CLAUDE_TEST_RESULTS.md (Full report)"
    echo ""
    echo "🛠️  Common fixes:"
    echo "   1. Check IAM permissions for bedrock:InvokeModel"
    echo "   2. Remove any explicit deny policies"
    echo "   3. Enable Claude models in AWS Bedrock console"
    echo "   4. Verify AWS account has Bedrock access"
fi

echo ""
echo "=========================================="
echo "Additional Commands"
echo "=========================================="
echo ""
echo "Check IAM user details:"
echo "  node scripts/check-aws-iam-user.js"
echo ""
echo "Re-run test with custom credentials:"
echo "  AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy node scripts/test-aws-bedrock-claude.js"
echo ""
echo "Re-run test with different region:"
echo "  AWS_REGION=us-west-2 node scripts/test-aws-bedrock-claude.js"
echo ""

exit $TEST_EXIT_CODE
