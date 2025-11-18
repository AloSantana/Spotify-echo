#!/bin/bash
# Run E2E Tests in Docker Containers
# This script orchestrates the complete E2E test pipeline in isolated containers

set -e

echo "===================================================================================="
echo "                    E2E TESTS IN DOCKER CONTAINERS"
echo "===================================================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.test.yml"
PROJECT_NAME="spotify-echo-e2e"
TIMEOUT=300  # 5 minutes timeout for tests

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}===================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}===================================================================${NC}"
}

# Function to cleanup
cleanup() {
    echo ""
    print_section "Cleanup"
    echo "Stopping and removing containers..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v 2>/dev/null || true
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT INT TERM

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env from .env.example and configure it."
    exit 1
fi

# ------------------------------------------------------------------------------
# 1. Build Images
# ------------------------------------------------------------------------------
print_section "Building Docker Images"

echo "Building application image..."
if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build app; then
    echo -e "${GREEN}✓ Application image built${NC}"
else
    echo -e "${RED}✗ Application image build failed${NC}"
    exit 1
fi

echo ""
echo "Building E2E test runner image..."
if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build e2e-tests; then
    echo -e "${GREEN}✓ E2E test runner image built${NC}"
else
    echo -e "${RED}✗ E2E test runner image build failed${NC}"
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. Start Services
# ------------------------------------------------------------------------------
print_section "Starting Services"

echo "Starting Redis..."
docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d redis

echo "Waiting for Redis to be healthy..."
REDIS_WAIT=0
while [ $REDIS_WAIT -lt 30 ]; do
    if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
        echo -e "${GREEN}✓ Redis is healthy${NC}"
        break
    fi
    sleep 1
    REDIS_WAIT=$((REDIS_WAIT + 1))
done

if [ $REDIS_WAIT -eq 30 ]; then
    echo -e "${RED}✗ Redis failed to become healthy${NC}"
    exit 1
fi

echo ""
echo "Starting Application..."
docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d app

echo "Waiting for Application to be healthy..."
APP_WAIT=0
while [ $APP_WAIT -lt 60 ]; do
    if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T app wget -qO- http://127.0.0.1:3000/health/simple 2>/dev/null | grep -q "ok"; then
        echo -e "${GREEN}✓ Application is healthy and responding${NC}"
        break
    fi
    sleep 2
    APP_WAIT=$((APP_WAIT + 2))
done

if [ $APP_WAIT -eq 60 ]; then
    echo -e "${RED}✗ Application failed to become healthy${NC}"
    echo ""
    echo "Application logs:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs app
    exit 1
fi

# ------------------------------------------------------------------------------
# 3. Run E2E Tests
# ------------------------------------------------------------------------------
print_section "Running E2E Tests"

echo "Starting E2E test runner..."
echo ""

# Run tests and capture exit code
set +e
docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" run --rm e2e-tests
TEST_EXIT_CODE=$?
set -e

# ------------------------------------------------------------------------------
# 4. Collect Results
# ------------------------------------------------------------------------------
print_section "Collecting Test Results"

# Copy test reports from container if they exist
echo "Copying test reports..."
docker cp "${PROJECT_NAME}-e2e-runner-1:/app/playwright-report" ./test-results-docker 2>/dev/null || \
docker cp "${PROJECT_NAME}_e2e-tests_run:/app/playwright-report" ./test-results-docker 2>/dev/null || \
echo "No test reports to copy"

docker cp "${PROJECT_NAME}-e2e-runner-1:/app/test-screenshots" ./test-screenshots-docker 2>/dev/null || \
docker cp "${PROJECT_NAME}_e2e-tests_run:/app/test-screenshots" ./test-screenshots-docker 2>/dev/null || \
echo "No screenshots to copy"

echo ""

# ------------------------------------------------------------------------------
# 5. Display Logs (on failure)
# ------------------------------------------------------------------------------
if [ $TEST_EXIT_CODE -ne 0 ]; then
    print_section "Test Logs (Failure)"
    
    echo -e "${RED}E2E tests failed with exit code: $TEST_EXIT_CODE${NC}"
    echo ""
    
    echo "Application logs:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs app | tail -100
    
    echo ""
    echo "Redis logs:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs redis | tail -50
fi

# ------------------------------------------------------------------------------
# 6. Summary
# ------------------------------------------------------------------------------
print_section "Test Summary"

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}===================================================================================="
    echo -e "                        ALL E2E TESTS PASSED"
    echo -e "====================================================================================${NC}"
    echo ""
    echo "Test reports available at:"
    echo "  - ./test-results-docker/"
    echo "  - ./test-screenshots-docker/"
    echo ""
    exit 0
else
    echo -e "${RED}===================================================================================="
    echo -e "                        E2E TESTS FAILED"
    echo -e "====================================================================================${NC}"
    echo ""
    echo "Review the logs above and test reports at:"
    echo "  - ./test-results-docker/"
    echo "  - ./test-screenshots-docker/"
    echo ""
    exit 1
fi
