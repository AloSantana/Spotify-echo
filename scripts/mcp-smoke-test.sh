#!/bin/bash

# =============================================================================
# 🧪 MCP SMOKE TEST
# Automated validation of MCP bootstrap + startup orchestration
# Tests core functionality without external network calls
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="${ROOT_DIR}/reports"

# Environment variables with defaults
MCP_STRICT_REQUIRED="${MCP_STRICT_REQUIRED:-false}"
ENABLE_COMMUNITY_MCP="${ENABLE_COMMUNITY_MCP:-1}"

# Output files
CAPABILITIES_REPORT="${REPORTS_DIR}/mcp-capabilities.json"
START_SUMMARY_REPORT="${REPORTS_DIR}/mcp-start-summary.json"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

# Print header
print_header() {
    echo -e "${BLUE}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "🧪 MCP SMOKE TEST"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${NC}"
    echo "[mcp-smoke] mode: community=${ENABLE_COMMUNITY_MCP} strict=${MCP_STRICT_REQUIRED}"
    echo "Environment:"
    echo "  MCP_STRICT_REQUIRED: ${MCP_STRICT_REQUIRED}"
    echo "  ENABLE_COMMUNITY_MCP: ${ENABLE_COMMUNITY_MCP}"
    echo "  Reports directory: ${REPORTS_DIR}"
    echo ""
}

# Ensure reports directory exists
ensure_reports_directory() {
    log_info "📁 Ensuring reports directory exists..."
    
    if [ ! -d "$REPORTS_DIR" ]; then
        mkdir -p "$REPORTS_DIR"
        log_info "Created reports directory: $REPORTS_DIR"
    else
        log_info "Reports directory already exists: $REPORTS_DIR"
    fi
}

# Run MCP agent bootstrap
run_mcp_bootstrap() {
    log_info "🚀 Running MCP agent bootstrap..."
    
    cd "$ROOT_DIR"
    
    # Run bootstrap script
    if ! node scripts/mcp-agent-bootstrap.js; then
        log_error "MCP agent bootstrap failed with non-zero exit code"
        return 1
    fi
    
    # Verify capabilities report exists and is valid JSON
    if [ ! -f "$CAPABILITIES_REPORT" ]; then
        log_error "Capabilities report not found: $CAPABILITIES_REPORT"
        return 1
    fi
    
    # Validate JSON structure
    if ! jq empty "$CAPABILITIES_REPORT" >/dev/null 2>&1; then
        log_error "Capabilities report is not valid JSON: $CAPABILITIES_REPORT"
        return 1
    fi
    
    log_success "MCP agent bootstrap completed successfully"
    return 0
}

# Run MCP server startup
run_mcp_startup() {
    log_info "🔄 Running MCP server startup..."
    
    cd "$ROOT_DIR"
    
    # Set environment variables for the start script
    export MCP_STRICT_REQUIRED
    export SKIP_ENV_LOADING=1  # Skip .env loading to avoid parsing issues
    if [ -n "$ENABLE_COMMUNITY_MCP" ]; then
        export ENABLE_COMMUNITY_MCP
    fi
    
    # Run start script
    if ! ./start-mcp-servers.sh; then
        log_error "MCP server startup failed with non-zero exit code"
        return 1
    fi
    
    # Verify start summary report exists
    if [ ! -f "$START_SUMMARY_REPORT" ]; then
        log_error "Start summary report not found: $START_SUMMARY_REPORT"
        return 1
    fi
    
    log_success "MCP server startup completed successfully"
    return 0
}

# Validate startup results using Node helper
validate_startup_results() {
    log_info "🔍 Validating startup results..."
    
    cd "$ROOT_DIR"
    
    # Run validation helper
    if ! node scripts/validate-mcp-start.js; then
        log_error "MCP startup validation failed"
        return 1
    fi
    
    log_success "MCP startup validation completed successfully"
    return 0
}

# Extract summary metrics from validation output
extract_summary_metrics() {
    log_info "📊 Extracting summary metrics..."
    
    cd "$ROOT_DIR"
    
    # Run validation helper to get JSON output
    local validation_output
    validation_output=$(node scripts/validate-mcp-start.js 2>/dev/null || echo '{}')
    
    # Parse metrics from JSON output
    local required_started
    local required_total
    local optional_started
    local community_included
    
    required_started=$(echo "$validation_output" | jq -r '.requiredStarted // 0')
    required_total=$(echo "$validation_output" | jq -r '.requiredTotal // 0')
    optional_started=$(echo "$validation_output" | jq -r '.optionalStarted // 0')
    community_included=$(echo "$validation_output" | jq -r '.communityIncluded // false')
    
    # Output summary line (required for acceptance criteria)
    echo "MCP_SMOKE_RESULT required_started=${required_started} required_total=${required_total} optional_started=${optional_started} community_included=${community_included}"
    
    log_success "Summary metrics extracted successfully"
}

# Main execution
main() {
    print_header
    
    # Step 1: Ensure reports directory exists
    ensure_reports_directory
    
    # Step 2: Run MCP agent bootstrap
    if ! run_mcp_bootstrap; then
        log_error "🚨 Smoke test failed at bootstrap stage"
        exit 1
    fi
    
    # Step 3: Run MCP server startup
    if ! run_mcp_startup; then
        log_error "🚨 Smoke test failed at startup stage"
        exit 1
    fi
    
    # Step 4: Validate startup results
    if ! validate_startup_results; then
        log_error "🚨 Smoke test failed at validation stage"
        exit 1
    fi
    
    # Step 5: Extract and emit summary metrics
    extract_summary_metrics
    
    log_success "🎉 MCP smoke test completed successfully!"
    exit 0
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Environment variables:"
        echo "  MCP_STRICT_REQUIRED     Fail if any required server fails to start (default: false)"
        echo "  ENABLE_COMMUNITY_MCP    Include community/tier 3 servers (default: 1/enabled)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Basic smoke test (community enabled)"
        echo "  ENABLE_COMMUNITY_MCP=0 $0           # Disable community servers"
        echo "  MCP_STRICT_REQUIRED=true $0         # Strict mode"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac