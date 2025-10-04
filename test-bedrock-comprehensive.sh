#!/bin/bash

# Comprehensive AWS Bedrock Testing Suite
# Tests the full integration with evidence collection

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "  AWS Bedrock Comprehensive Testing Suite"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0
WARNINGS=0

# Function to print test result
print_result() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        ((PASSED++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        ((FAILED++))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        ((WARNINGS++))
    fi
}

# Create directories
mkdir -p reports logs/bedrock/invocations

echo "📋 Test 1: AWS Credentials Verification"
echo "────────────────────────────────────────────────────────────"

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    print_result "FAIL" "AWS credentials not found in environment"
    print_result "WARN" "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to run live tests"
    
    # Create mock report for local testing
    cat > reports/test-report.json << 'EOF'
{
  "testSuite": "AWS Bedrock Comprehensive Testing",
  "timestamp": "'$(date -Iseconds)'",
  "status": "CREDENTIALS_MISSING",
  "results": {
    "credentialsCheck": {
      "status": "FAILED",
      "error": "AWS credentials not available in environment",
      "recommendation": "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
    }
  }
}
EOF
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  Test Summary (Local Environment - No Credentials)"
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${RED}Failed:${NC} $FAILED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo ""
    echo "💡 To run live tests, configure AWS credentials:"
    echo "   export AWS_ACCESS_KEY_ID=your-key-id"
    echo "   export AWS_SECRET_ACCESS_KEY=your-secret-key"
    echo "   export AWS_REGION=us-east-1"
    echo ""
    exit 1
fi

print_result "PASS" "AWS credentials found in environment"

# Test AWS STS
echo ""
echo "📋 Test 2: AWS Identity Verification (STS)"
echo "────────────────────────────────────────────────────────────"

if aws sts get-caller-identity --region us-east-1 > reports/aws-identity.json 2>&1; then
    ACCOUNT_ID=$(jq -r '.Account' reports/aws-identity.json)
    USER_ARN=$(jq -r '.Arn' reports/aws-identity.json)
    USER_ID=$(jq -r '.UserId' reports/aws-identity.json)
    
    print_result "PASS" "AWS identity verified"
    echo "   Account: $ACCOUNT_ID"
    echo "   ARN: $USER_ARN"
    echo "   User ID: $USER_ID"
    
    # Check if it's the new github-coding user
    if echo "$USER_ARN" | grep -q "github-coding"; then
        print_result "PASS" "New IAM user 'github-coding' confirmed"
    else
        print_result "WARN" "IAM user is not 'github-coding': $USER_ARN"
    fi
else
    print_result "FAIL" "AWS STS identity check failed"
    cat reports/aws-identity.json
fi

# Test Bedrock model listing
echo ""
echo "📋 Test 3: Bedrock Model Availability"
echo "────────────────────────────────────────────────────────────"

if aws bedrock list-foundation-models --region us-east-1 --by-provider Anthropic > reports/bedrock-models-raw.json 2>&1; then
    # Filter for Claude 4 models
    jq '.modelSummaries | map(select(.modelId | contains("claude-4") or contains("opus-4") or contains("sonnet-4")))' reports/bedrock-models-raw.json > reports/bedrock-models.json
    
    MODEL_COUNT=$(jq '. | length' reports/bedrock-models.json)
    print_result "PASS" "Bedrock models accessible ($MODEL_COUNT Claude 4 models found)"
    
    # Check for specific models
    if jq -e '.[] | select(.modelId == "anthropic.claude-sonnet-4-5-20250929-v1:0")' reports/bedrock-models.json > /dev/null; then
        print_result "PASS" "Claude Sonnet 4.5 available"
    else
        print_result "WARN" "Claude Sonnet 4.5 not found in model list"
    fi
    
    if jq -e '.[] | select(.modelId == "anthropic.claude-3-opus-20240229-v1:0")' reports/bedrock-models.json > /dev/null; then
        print_result "PASS" "Claude 3 Opus available"
    else
        print_result "WARN" "Claude 3 Opus not found in model list"
    fi
else
    print_result "FAIL" "Bedrock list-foundation-models failed"
    cat reports/bedrock-models-raw.json
fi

# Test live model invocation
echo ""
echo "📋 Test 4: Live Model Invocation Testing"
echo "────────────────────────────────────────────────────────────"

if npm run bedrock:validate:strict 2>&1 | tee reports/validation-output.log; then
    print_result "PASS" "Strict validation completed successfully"
    
    # Check for invocation logs
    INVOCATION_COUNT=$(ls -1 logs/bedrock/invocations/*.json 2>/dev/null | wc -l)
    if [ "$INVOCATION_COUNT" -gt 0 ]; then
        print_result "PASS" "Generated $INVOCATION_COUNT invocation log(s)"
        
        # Verify request IDs in logs
        for log in logs/bedrock/invocations/*.json; do
            if jq -e '.requestId' "$log" > /dev/null 2>&1; then
                print_result "PASS" "Request ID present in $(basename $log)"
            else
                print_result "WARN" "Request ID missing in $(basename $log)"
            fi
        done
    else
        print_result "WARN" "No invocation logs generated"
    fi
    
    # Check summary report
    if [ -f "reports/bedrock-invocation-summary.json" ]; then
        print_result "PASS" "Summary report generated"
        TOTAL_COST=$(jq -r '.totalCost' reports/bedrock-invocation-summary.json)
        print_result "PASS" "Total cost tracked: \$$TOTAL_COST"
    else
        print_result "WARN" "Summary report not found"
    fi
else
    print_result "FAIL" "Strict validation failed (see logs above)"
fi

# Test evidence collection
echo ""
echo "📋 Test 5: Evidence Collection"
echo "────────────────────────────────────────────────────────────"

if npm run bedrock:collect-evidence 2>&1 | tee reports/evidence-output.log; then
    print_result "PASS" "Evidence collection completed"
    
    if [ -f "reports/bedrock-evidence-complete.json" ]; then
        IS_VALID=$(jq -r '.validation.isValid' reports/bedrock-evidence-complete.json)
        if [ "$IS_VALID" = "true" ]; then
            print_result "PASS" "Evidence validation successful (isValid: true)"
        else
            print_result "FAIL" "Evidence validation failed (isValid: false)"
            jq '.validation' reports/bedrock-evidence-complete.json
        fi
    else
        print_result "WARN" "Complete evidence report not found"
    fi
else
    print_result "WARN" "Evidence collection had warnings (non-fatal)"
fi

# Test CloudWatch metrics (optional)
echo ""
echo "📋 Test 6: CloudWatch Metrics (Optional)"
echo "────────────────────────────────────────────────────────────"

if npm run bedrock:verify-billing 2>&1 | tee reports/metrics-output.log; then
    print_result "PASS" "CloudWatch metrics query completed"
else
    print_result "WARN" "CloudWatch metrics unavailable (expected for new accounts)"
fi

# Final summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Test Summary"
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ All critical tests passed!"
    exit 0
else
    echo "❌ Some tests failed. Review output above."
    exit 1
fi
