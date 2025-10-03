#!/bin/bash

# AWS Bedrock Model Testing Wrapper
# Enhanced shell wrapper with environment checks and validation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    cat << EOF
AWS Bedrock Model Testing Wrapper

USAGE:
    $0 [OPTIONS] [AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY [AWS_REGION]]

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    -q, --quick             Run quick tests (skip streaming and variations)
    --max-retries NUM       Set maximum retry attempts (default: 3)
    --region REGION         Set AWS region (default: us-east-1)
    --models MODEL1,MODEL2  Test specific models only

ENVIRONMENT VARIABLES:
    AWS_ACCESS_KEY_ID       AWS access key (required)
    AWS_SECRET_ACCESS_KEY   AWS secret access key (required)
    AWS_REGION              AWS region (default: us-east-1)

EXAMPLES:
    # Use environment variables
    export AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy
    $0

    # Provide credentials as arguments
    $0 YOUR_ACCESS_KEY YOUR_SECRET_KEY us-west-2

    # Run quick tests
    $0 --quick

    # Test specific models
    $0 --models claude-sonnet-4-5,claude-opus-4-1

EOF
    exit 0
}

# Parse command line options
VERBOSE=""
QUICK=""
MAX_RETRIES=""
TEST_REGION=""
SPECIFIC_MODELS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -v|--verbose)
            VERBOSE="--verbose"
            shift
            ;;
        -q|--quick)
            QUICK="--skip-streaming --skip-variations"
            shift
            ;;
        --max-retries)
            MAX_RETRIES="--max-retries $2"
            shift 2
            ;;
        --region)
            TEST_REGION="$2"
            shift 2
            ;;
        --models)
            SPECIFIC_MODELS="--models $2"
            shift 2
            ;;
        *)
            # Check if it's a positional argument (credentials)
            if [[ -z "$AWS_ACCESS_KEY_ID" ]]; then
                export AWS_ACCESS_KEY_ID="$1"
            elif [[ -z "$AWS_SECRET_ACCESS_KEY" ]]; then
                export AWS_SECRET_ACCESS_KEY="$1"
            elif [[ -z "$AWS_REGION" ]] && [[ -z "$TEST_REGION" ]]; then
                TEST_REGION="$1"
            fi
            shift
            ;;
    esac
done

# Set region if provided
if [[ -n "$TEST_REGION" ]]; then
    export AWS_REGION="$TEST_REGION"
fi

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}AWS Bedrock Model Testing Suite${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Environment validation
echo -e "${YELLOW}🔍 Validating Environment...${NC}"

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"

# Check if AWS SDK is installed
if ! node -e "require('@aws-sdk/client-bedrock-runtime')" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  AWS SDK not found. Installing...${NC}"
    npm install @aws-sdk/client-bedrock-runtime --save-dev
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ AWS SDK installed${NC}"
    else
        echo -e "${RED}❌ Failed to install AWS SDK${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ AWS SDK installed${NC}"
fi

# Check AWS credentials
if [[ -z "$AWS_ACCESS_KEY_ID" ]]; then
    echo -e "${RED}❌ AWS_ACCESS_KEY_ID is not set${NC}"
    echo "   Set it via environment variable or provide as argument"
    echo "   Run '$0 --help' for usage information"
    exit 1
fi
echo -e "${GREEN}✅ AWS_ACCESS_KEY_ID is set${NC}"

if [[ -z "$AWS_SECRET_ACCESS_KEY" ]]; then
    echo -e "${RED}❌ AWS_SECRET_ACCESS_KEY is not set${NC}"
    echo "   Set it via environment variable or provide as argument"
    echo "   Run '$0 --help' for usage information"
    exit 1
fi
echo -e "${GREEN}✅ AWS_SECRET_ACCESS_KEY is set${NC}"

# Set default region if not set
if [[ -z "$AWS_REGION" ]]; then
    export AWS_REGION="us-east-1"
    echo -e "${YELLOW}⚠️  AWS_REGION not set, using default: us-east-1${NC}"
else
    echo -e "${GREEN}✅ AWS_REGION: $AWS_REGION${NC}"
fi

# Check if config file exists
if [[ ! -f "config/aws-bedrock-models.json" ]]; then
    echo -e "${RED}❌ Configuration file not found: config/aws-bedrock-models.json${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuration file found${NC}"

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Running AWS Bedrock Comprehensive Tests${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Build test command
TEST_CMD="node scripts/test-aws-bedrock-comprehensive.js $VERBOSE $QUICK $MAX_RETRIES $SPECIFIC_MODELS"

# Display test configuration
echo "Test Configuration:"
echo "  Region: $AWS_REGION"
[[ -n "$VERBOSE" ]] && echo "  Mode: Verbose"
[[ -n "$QUICK" ]] && echo "  Mode: Quick (streaming and variations skipped)"
[[ -n "$MAX_RETRIES" ]] && echo "  Max Retries: ${MAX_RETRIES#--max-retries }"
[[ -n "$SPECIFIC_MODELS" ]] && echo "  Models: ${SPECIFIC_MODELS#--models }"
echo ""

# Run the comprehensive test
$TEST_CMD

TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Test Complete!${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Tests PASSED - AWS Bedrock access is working!${NC}"
    echo ""
    echo "📊 View detailed results:"
    echo "   - test-results/aws-bedrock-comprehensive-latest.json"
    echo "   - test-results/aws-bedrock-comprehensive-latest.md"
else
    echo -e "${RED}❌ Tests FAILED - Check results for details${NC}"
    echo ""
    echo "📊 View error analysis:"
    echo "   - test-results/aws-bedrock-comprehensive-latest.md"
    echo ""
    echo "🛠️  Common fixes:"
    echo "   1. Check IAM permissions for bedrock:InvokeModel"
    echo "   2. Remove any explicit deny policies"
    echo "   3. Enable Claude models in AWS Bedrock console"
    echo "   4. Verify AWS account has Bedrock access"
    echo "   5. Check model availability in your region"
fi

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Additional Commands${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo "Model Manager:"
echo "  npm run bedrock:manager        # Interactive model manager"
echo "  npm run bedrock:status         # Show current model status"
echo "  npm run bedrock:list           # List available models"
echo ""
echo "Test Variations:"
echo "  npm run test:bedrock           # Standard test suite"
echo "  npm run test:bedrock:verbose   # Verbose output"
echo "  npm run test:bedrock:quick     # Quick tests"
echo ""
echo "Help:"
echo "  $0 --help                      # Show help message"
echo ""

exit $TEST_EXIT_CODE
