#!/bin/bash

###############################################################################
# Bedrock-Powered Roadmap Implementation Executor
#
# Executes roadmap tasks using REAL AWS Bedrock models with comprehensive
# telemetry, cost tracking, and evidence collection.
#
# Usage:
#   ./execute-bedrock-roadmap.sh [--test] [--max-tasks N]
#
# Options:
#   --test         Run in test mode with limited tasks
#   --max-tasks N  Maximum number of tasks to execute (default: 10)
#   --help         Show this help message
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
TEST_MODE=false
MAX_TASKS=10
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --test)
      TEST_MODE=true
      shift
      ;;
    --max-tasks)
      MAX_TASKS="$2"
      shift 2
      ;;
    --help)
      head -n 20 "$0" | grep "^#"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Banner
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "   🚀 Bedrock-Powered Spotify App Roadmap Implementation"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo -e "${RED}❌ AWS credentials not found${NC}"
  echo "   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
  exit 1
fi
echo -e "${GREEN}✅ AWS credentials configured${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check if required files exist
REQUIRED_FILES=(
  "$SCRIPT_DIR/bedrock-roadmap-orchestrator.js"
  "$PROJECT_ROOT/src/infra/BedrockInferenceProvider.js"
  "$PROJECT_ROOT/src/infra/bedrock/alias-resolver.js"
  "$PROJECT_ROOT/src/infra/bedrock/unified-retry.js"
  "$PROJECT_ROOT/config/bedrock-aliases.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Required file not found: $file${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✅ All required files present${NC}"

echo ""

# Execute based on mode
if [ "$TEST_MODE" = true ]; then
  echo -e "${YELLOW}🧪 Running in TEST mode${NC}"
  echo -e "${YELLOW}   This will execute a limited test run with real AWS calls${NC}"
  echo -e "${YELLOW}   Expected cost: ~$0.01 - $0.05${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  node "$SCRIPT_DIR/test-bedrock-roadmap-live.js"
else
  echo -e "${BLUE}🎯 Running FULL roadmap implementation${NC}"
  echo -e "${YELLOW}   Maximum tasks: $MAX_TASKS${NC}"
  echo -e "${YELLOW}   This will make multiple REAL AWS Bedrock API calls${NC}"
  echo -e "${YELLOW}   Estimated cost: $0.05 - $0.50 (depends on task complexity)${NC}"
  echo ""
  
  # Confirmation prompt
  read -p "Continue? (yes/no): " -n 3 -r
  echo
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Aborted by user${NC}"
    exit 0
  fi
  
  cd "$PROJECT_ROOT"
  MAX_TASKS=$MAX_TASKS node "$SCRIPT_DIR/bedrock-roadmap-orchestrator.js"
fi

EXIT_CODE=$?

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Execution completed successfully${NC}"
  echo ""
  echo "📁 Evidence artifacts saved to: reports/bedrock-roadmap/"
  echo ""
  echo "📊 Next steps:"
  echo "   1. Review the generated evidence reports"
  echo "   2. Validate AWS request IDs and costs"
  echo "   3. Commit code improvements to repository"
  echo "   4. Create PR with comprehensive evidence"
else
  echo -e "${RED}❌ Execution failed with exit code $EXIT_CODE${NC}"
  echo ""
  echo "🔍 Troubleshooting:"
  echo "   1. Check AWS credentials and permissions"
  echo "   2. Verify network connectivity to AWS"
  echo "   3. Review error logs above"
  echo "   4. Check if models are available in your region"
fi

echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

exit $EXIT_CODE
