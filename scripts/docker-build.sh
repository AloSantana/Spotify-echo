#!/bin/bash
# Docker Build Script - Builds and validates all Docker images

set -e

echo "===================================================================================="
echo "                    DOCKER BUILD & VALIDATION SCRIPT"
echo "===================================================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build metadata
BUILD_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo -e "${BLUE}Build Information:${NC}"
echo "  SHA: $BUILD_SHA"
echo "  Time: $BUILD_TIME"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}===================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}===================================================================${NC}"
}

# Function to check if image exists
image_exists() {
    docker images -q "$1" | grep -q .
}

# Function to get image size
get_image_size() {
    docker images --format "{{.Size}}" "$1" | head -1
}

# Track build status
BUILDS_PASSED=0
BUILDS_FAILED=0

# ------------------------------------------------------------------------------
# 1. Build main Dockerfile
# ------------------------------------------------------------------------------
print_section "Building Main Dockerfile (spotify-echo:latest)"

if docker build \
    --build-arg BUILD_SHA="$BUILD_SHA" \
    --build-arg BUILD_TIME="$BUILD_TIME" \
    -t spotify-echo:latest \
    -f Dockerfile \
    .; then
    echo -e "${GREEN}✓ Main Dockerfile build SUCCESS${NC}"
    SIZE=$(get_image_size "spotify-echo:latest")
    echo -e "  Image size: ${GREEN}$SIZE${NC}"
    BUILDS_PASSED=$((BUILDS_PASSED + 1))
else
    echo -e "${RED}✗ Main Dockerfile build FAILED${NC}"
    BUILDS_FAILED=$((BUILDS_FAILED + 1))
fi

# ------------------------------------------------------------------------------
# 2. Build optimized Dockerfile (if exists)
# ------------------------------------------------------------------------------
if [ -f "Dockerfile.optimized" ]; then
    print_section "Building Dockerfile.optimized (spotify-echo:optimized)"
    
    if docker build \
        --build-arg BUILD_SHA="$BUILD_SHA" \
        --build-arg BUILD_TIME="$BUILD_TIME" \
        -t spotify-echo:optimized \
        -f Dockerfile.optimized \
        .; then
        echo -e "${GREEN}✓ Optimized Dockerfile build SUCCESS${NC}"
        SIZE=$(get_image_size "spotify-echo:optimized")
        echo -e "  Image size: ${GREEN}$SIZE${NC}"
        BUILDS_PASSED=$((BUILDS_PASSED + 1))
    else
        echo -e "${RED}✗ Optimized Dockerfile build FAILED${NC}"
        BUILDS_FAILED=$((BUILDS_FAILED + 1))
    fi
fi

# ------------------------------------------------------------------------------
# 3. Build production Dockerfile (if exists)
# ------------------------------------------------------------------------------
if [ -f "Dockerfile.production" ]; then
    print_section "Building Dockerfile.production (spotify-echo:production)"
    
    if docker build \
        --build-arg BUILD_SHA="$BUILD_SHA" \
        --build-arg BUILD_TIME="$BUILD_TIME" \
        -t spotify-echo:production \
        -f Dockerfile.production \
        .; then
        echo -e "${GREEN}✓ Production Dockerfile build SUCCESS${NC}"
        SIZE=$(get_image_size "spotify-echo:production")
        echo -e "  Image size: ${GREEN}$SIZE${NC}"
        BUILDS_PASSED=$((BUILDS_PASSED + 1))
    else
        echo -e "${RED}✗ Production Dockerfile build FAILED${NC}"
        BUILDS_FAILED=$((BUILDS_FAILED + 1))
    fi
fi

# ------------------------------------------------------------------------------
# 4. Build test Dockerfile
# ------------------------------------------------------------------------------
if [ -f "Dockerfile.test" ]; then
    print_section "Building Dockerfile.test (spotify-echo:e2e-tests)"
    
    if docker build \
        -t spotify-echo:e2e-tests \
        -f Dockerfile.test \
        .; then
        echo -e "${GREEN}✓ Test Dockerfile build SUCCESS${NC}"
        SIZE=$(get_image_size "spotify-echo:e2e-tests")
        echo -e "  Image size: ${GREEN}$SIZE${NC}"
        BUILDS_PASSED=$((BUILDS_PASSED + 1))
    else
        echo -e "${RED}✗ Test Dockerfile build FAILED${NC}"
        BUILDS_FAILED=$((BUILDS_FAILED + 1))
    fi
fi

# ------------------------------------------------------------------------------
# 5. Image validation
# ------------------------------------------------------------------------------
print_section "Image Validation"

echo "Validating built images..."

for IMAGE in "spotify-echo:latest" "spotify-echo:optimized" "spotify-echo:production" "spotify-echo:e2e-tests"; do
    if image_exists "$IMAGE"; then
        echo -e "${GREEN}✓${NC} $IMAGE exists"
        
        # Check image size
        SIZE=$(get_image_size "$IMAGE")
        echo "  Size: $SIZE"
        
        # Extract size in MB for validation (rough check)
        SIZE_MB=$(echo "$SIZE" | sed 's/[^0-9.]//g')
        if [ ! -z "$SIZE_MB" ]; then
            # Warn if image is over 1GB
            if (( $(echo "$SIZE_MB > 1000" | bc -l 2>/dev/null || echo 0) )); then
                echo -e "  ${YELLOW}⚠ Warning: Image size exceeds 1GB${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}○${NC} $IMAGE not found (may be optional)"
    fi
done

# ------------------------------------------------------------------------------
# 6. Summary
# ------------------------------------------------------------------------------
print_section "Build Summary"

echo ""
echo -e "Total Builds: $((BUILDS_PASSED + BUILDS_FAILED))"
echo -e "${GREEN}Passed: $BUILDS_PASSED${NC}"
if [ $BUILDS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $BUILDS_FAILED${NC}"
else
    echo -e "Failed: 0"
fi
echo ""

if [ $BUILDS_FAILED -eq 0 ]; then
    echo -e "${GREEN}===================================================================================="
    echo -e "                        ALL DOCKER BUILDS SUCCESSFUL"
    echo -e "====================================================================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run docker-compose up to start the application"
    echo "  2. Run ./scripts/run-e2e-docker.sh to test in containers"
    echo "  3. Run docker-compose -f docker-compose.test.yml up to run E2E tests"
    echo ""
    exit 0
else
    echo -e "${RED}===================================================================================="
    echo -e "                        DOCKER BUILD FAILURES DETECTED"
    echo -e "====================================================================================${NC}"
    echo ""
    echo "Review the output above to identify and fix build issues."
    echo ""
    exit 1
fi
