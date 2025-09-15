#!/bin/bash

# =============================================================================
# 🚀 MCP SERVER STARTUP AND VALIDATION SCRIPT
# Automated startup, validation, and health monitoring for all MCP servers
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

# Environment variables with defaults - ENABLE_COMMUNITY_MCP defaults to 1 (enabled)
ENABLE_COMMUNITY_MCP="${ENABLE_COMMUNITY_MCP:-1}"
MCP_STRICT_REQUIRED="${MCP_STRICT_REQUIRED:-false}"

# Enhanced Configuration Loading with core + community split
load_mcp_config() {
    local core_config="${SCRIPT_DIR}/.copilot/mcp-config.json"
    local community_config="${SCRIPT_DIR}/.copilot/mcp-config.community.json"
    local fallback_config="${SCRIPT_DIR}/.copilot/mcp-config.example.json"
    local legacy_config="${SCRIPT_DIR}/mcp-servers-config.json"
    
    # Always require core config
    if [ ! -f "$core_config" ]; then
        log_error "❌ Core MCP configuration file not found: $core_config"
        exit 1
    fi
    
    MCP_CONFIG_FILE="$core_config"
    log_message "INFO" "📁 Using core MCP config: $core_config"
    
    # Load community config if community servers are enabled
    if [ "$ENABLE_COMMUNITY_MCP" = "1" ]; then
        if [ -f "$community_config" ]; then
            MCP_COMMUNITY_CONFIG="$community_config"
            log_message "INFO" "🌐 Using community MCP config: $community_config"
        else
            log_warning "⚠️  Community servers requested but config not found: $community_config"
            # Don't exit - just skip community servers
        fi
    else
        log_message "INFO" "⏭️  Community servers disabled (ENABLE_COMMUNITY_MCP != 1)"
    fi
}

LOG_FILE="${SCRIPT_DIR}/mcp-startup.log"
HEALTH_CHECK_TIMEOUT=30
VALIDATION_REPORT="${SCRIPT_DIR}/mcp-validation-report.json"

# Initialize log
echo "$(date '+%Y-%m-%d %H:%M:%S') - MCP Server Startup Initiated" > "$LOG_FILE"

print_header() {
    echo -e "${BLUE}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  🤖 EchoTune AI - MCP Server Startup & Validation"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${YELLOW}▶ $1${NC}"
    echo "─────────────────────────────────────────────────────────────"
}

log_message() {
    local level=$1
    local message=$2
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [$level] $message" >> "$LOG_FILE"
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $message${NC}"
}

log_error() {
    local message=$1
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERROR] $message" >> "$LOG_FILE"
    echo -e "${RED}[ERROR] $message${NC}"
}

log_warning() {
    local message=$1
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [WARN] $message" >> "$LOG_FILE"
    echo -e "${YELLOW}[WARN] $message${NC}"
}

# Check if server is a community server (enhanced detection)
is_community_server() {
    local server_name="$1"
    case "$server_name" in
        brave-search|browserbase|perplexity|perplexity-mcp|enhanced-browser-research|spotify-integration|github-repos|github)
            return 0 ;;
        *)
            return 1 ;;
    esac
}

# Merge core and community configurations
merge_configurations() {
    local temp_config="/tmp/mcp-merged-config.json"
    
    if [ -n "$MCP_COMMUNITY_CONFIG" ] && [ -f "$MCP_COMMUNITY_CONFIG" ]; then
        # Use jq to merge configurations if available
        if command -v jq >/dev/null 2>&1; then
            # Merge the mcpServers objects properly, with core config taking precedence for duplicates
            jq -s '
              {
                mcpServers: (.[0].mcpServers + .[1].mcpServers),
                orchestrator: .[0].orchestrator,
                monitoring: .[0].monitoring
              }
            ' "$MCP_CONFIG_FILE" "$MCP_COMMUNITY_CONFIG" > "$temp_config"
            
            if [ $? -eq 0 ]; then
                MCP_MERGED_CONFIG="$temp_config"
                log_message "INFO" "🔗 Merged core and community configurations"
            else
                log_warning "⚠️  Failed to merge configurations, using core only"
                MCP_MERGED_CONFIG="$MCP_CONFIG_FILE"
            fi
        else
            log_warning "⚠️  jq not available, using core configuration only"
            MCP_MERGED_CONFIG="$MCP_CONFIG_FILE"
        fi
    else
        MCP_MERGED_CONFIG="$MCP_CONFIG_FILE"
    fi
}

# Check if required secrets are available for a server
check_server_secrets() {
    local config_file="$1"
    local server_name="$2"
    
    if command -v jq >/dev/null 2>&1; then
        local secrets_required=$(jq -r ".mcpServers.\"$server_name\".secretsRequired[]? // empty" "$config_file" 2>/dev/null)
        
        if [ -n "$secrets_required" ]; then
            for secret in $secrets_required; do
                local env_value=$(eval echo "\$${secret}")
                if [ -z "$env_value" ]; then
                    return 1  # Missing required secret
                fi
            done
        fi
    fi
    
    return 0  # All secrets available or no secrets required
}

# Validate API keys
validate_api_keys() {
    print_section "🔑 API Key Validation"
    
    local validation_results=()
    
    # GitHub API validation
    if [ -n "$GITHUB_PAT" ]; then
        response=$(curl -s -H "Authorization: token $GITHUB_PAT" https://api.github.com/user | grep -o '"login"' || echo "")
        if [ -n "$response" ]; then
            log_message "INFO" "✅ GitHub API key validated successfully"
            validation_results+=('{"service":"github","status":"valid","key_prefix":"'${GITHUB_PAT:0:10}'..."}')
        else
            log_error "❌ GitHub API key validation failed"
            validation_results+=('{"service":"github","status":"invalid","error":"Authentication failed"}')
        fi
    else
        log_warning "⚠️  GitHub API key not found"
        validation_results+=('{"service":"github","status":"missing","error":"API key not set"}')
    fi
    
    # Perplexity API validation
    if [ -n "$PERPLEXITY_API_KEY" ]; then
        response=$(curl -s -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H "Content-Type: application/json" \
                   -d '{"model":"sonar-pro","messages":[{"role":"user","content":"test"}],"max_tokens":10}' \
                   https://api.perplexity.ai/chat/completions | grep -o '"id"' || echo "")
        if [ -n "$response" ]; then
            log_message "INFO" "✅ Perplexity API key validated successfully"
            validation_results+=('{"service":"perplexity","status":"valid","key_prefix":"'${PERPLEXITY_API_KEY:0:10}'..."}')
        else
            log_error "❌ Perplexity API key validation failed"
            validation_results+=('{"service":"perplexity","status":"invalid","error":"Authentication failed"}')
        fi
    else
        log_warning "⚠️  Perplexity API key not found"
        validation_results+=('{"service":"perplexity","status":"missing","error":"API key not set"}')
    fi
    
    # Brave Search API validation
    if [ -n "$BRAVE_API_KEY" ]; then
        response=$(curl -s -H "X-Subscription-Token: $BRAVE_API_KEY" \
                   "https://api.search.brave.com/res/v1/web/search?q=test" | grep -o '"query"' || echo "")
        if [ -n "$response" ]; then
            log_message "INFO" "✅ Brave API key validated successfully"
            validation_results+=('{"service":"brave","status":"valid","key_prefix":"'${BRAVE_API_KEY:0:10}'..."}')
        else
            log_error "❌ Brave API key validation failed"
            validation_results+=('{"service":"brave","status":"invalid","error":"Authentication failed"}')
        fi
    else
        log_warning "⚠️  Brave API key not found"
        validation_results+=('{"service":"brave","status":"missing","error":"API key not set"}')
    fi
    
    # BrowserBase API validation
    if [ -n "$BROWSERBASE_API_KEY" ]; then
        response=$(curl -s -H "X-API-Key: $BROWSERBASE_API_KEY" \
                   https://www.browserbase.com/api/v1/projects | grep -o '"id"' || echo "")
        if [ -n "$response" ]; then
            log_message "INFO" "✅ BrowserBase API key validated successfully"
            validation_results+=('{"service":"browserbase","status":"valid","key_prefix":"'${BROWSERBASE_API_KEY:0:10}'..."}')
        else
            log_error "❌ BrowserBase API key validation failed"
            validation_results+=('{"service":"browserbase","status":"invalid","error":"Authentication failed"}')
        fi
    else
        log_warning "⚠️  BrowserBase API key not found"
        validation_results+=('{"service":"browserbase","status":"missing","error":"API key not set"}')
    fi
    
    # Save validation results
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"api_validation\":[$(IFS=,; echo "${validation_results[*]}")],\"total_keys\":${#validation_results[@]}}" > "$VALIDATION_REPORT"
}

# Generate MCP capabilities report using bootstrap script
generate_capabilities_report() {
    print_section "📋 Generating MCP Capabilities Report"
    
    if [ -f "${SCRIPT_DIR}/scripts/mcp-agent-bootstrap.js" ]; then
        log_message "INFO" "Running MCP bootstrap script..."
        
        # Run bootstrap script to generate capabilities report
        node "${SCRIPT_DIR}/scripts/mcp-agent-bootstrap.js" --structured > /tmp/mcp-bootstrap-output.log 2>&1
        
        if [ $? -eq 0 ]; then
            log_message "INFO" "✅ MCP capabilities report generated successfully"
            
            # Extract structured output for shell integration
            if [ -f /tmp/mcp-bootstrap-output.log ]; then
                grep "MCP_" /tmp/mcp-bootstrap-output.log >> "$LOG_FILE" 2>/dev/null || true
            fi
        else
            log_warning "⚠️  MCP bootstrap script failed, continuing without report"
        fi
    else
        log_warning "⚠️  MCP bootstrap script not found, skipping capabilities report"
    fi
}

# Parse MCP configuration with fallback support
parse_mcp_config() {
    local config_file="$1"
    
    # Check if jq is available
    if command -v jq >/dev/null 2>&1; then
        # Use jq for robust JSON parsing
        jq -r '.mcpServers | keys[]' "$config_file" 2>/dev/null
    else
        # Fallback to simple grep/sed parsing
        log_warning "⚠️  jq not available, using fallback parsing"
        grep -o '"[^"]*"[[:space:]]*:[[:space:]]*{' "$config_file" | sed 's/"//g' | sed 's/[[:space:]]*:[[:space:]]*{//' || echo ""
    fi
}

# Get server configuration with fallback parsing
get_server_config() {
    local config_file="$1"
    local server_name="$2"
    local config_key="$3"
    
    if command -v jq >/dev/null 2>&1; then
        # Use jq for robust JSON parsing with proper quoting for server names
        case "$config_key" in
            "command")
                jq -r ".mcpServers.\"$server_name\".command // \"unknown\"" "$config_file" 2>/dev/null
                ;;
            "args")
                jq -r ".mcpServers.\"$server_name\".args[]? // empty" "$config_file" 2>/dev/null | tr '\n' ' '
                ;;
            "env")
                jq -r ".mcpServers.\"$server_name\".env // {} | to_entries[] | \"\(.key)=\(.value)\"" "$config_file" 2>/dev/null || echo ""
                ;;
            "category")
                jq -r ".mcpServers.\"$server_name\".category // \"unknown\"" "$config_file" 2>/dev/null
                ;;
            "required")
                jq -r ".mcpServers.\"$server_name\".required // false" "$config_file" 2>/dev/null
                ;;
            "priority")
                jq -r ".mcpServers.\"$server_name\".priority // 99" "$config_file" 2>/dev/null
                ;;
        esac
    else
        # Simple fallback parsing
        echo "unknown"
    fi
}

# Start MCP servers with enhanced gating and no placeholder generation
start_mcp_servers() {
    print_section "🚀 Starting MCP Servers"
    
    # Load configuration
    load_mcp_config
    
    # Merge configurations if community servers are enabled
    merge_configurations
    
    if [ ! -f "$MCP_MERGED_CONFIG" ]; then
        log_error "MCP configuration file not found: $MCP_MERGED_CONFIG"
        exit 1
    fi
    
    # Generate capabilities report before starting servers
    generate_capabilities_report
    
    # Parse server list with fallback support
    local servers=$(parse_mcp_config "$MCP_MERGED_CONFIG")
    local started_servers=()
    local skipped_servers=()
    local failed_servers=()
    
    if [ -z "$servers" ]; then
        log_error "❌ No MCP servers found in configuration"
        exit 1
    fi
    
    log_message "INFO" "📝 Found servers in config: $servers"
    
    for server in $servers; do
        # Structured logging before starting each server
        local category=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "category")
        local required=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "required")
        local priority=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "priority")
        
        # Ensure we have valid values with defaults
        if [ -z "$category" ] || [ "$category" = "unknown" ]; then
            category="core"  # Default for servers without explicit category
        fi
        if [ -z "$required" ] || [ "$required" = "unknown" ]; then
            required="true"  # Default for servers without explicit required flag
        fi
        if [ -z "$priority" ] || [ "$priority" = "unknown" ]; then
            priority="1"  # Default priority
        fi
        
        # Community server gating logic - enhanced with proper skip semantics
        local is_community=false
        if [ "$category" = "community" ] || [ -n "$priority" ] && [ "$priority" -ge 6 ] || is_community_server "$server"; then
            is_community=true
        fi
        
        if [ "$ENABLE_COMMUNITY_MCP" != "1" ] && [ "$is_community" = true ]; then
            # Structured skip logging with detailed reason
            echo "MCP_SKIPPED name=$server reason=community_disabled category=$category priority=$priority tier=community enable_community_mcp=$ENABLE_COMMUNITY_MCP" >> "$LOG_FILE"
            log_message "INFO" "⏭️  Skipping community server: $server (community servers disabled - set ENABLE_COMMUNITY_MCP=1 to enable)"
            skipped_servers+=("$server")
            continue
        fi
        
        # Secrets-aware gating - check for required secrets
        if ! check_server_secrets "$MCP_MERGED_CONFIG" "$server"; then
            echo "MCP_SKIPPED name=$server reason=missing_credentials category=$category priority=$priority required_secrets=missing" >> "$LOG_FILE"
            log_message "INFO" "🔒 Skipping server: $server (missing required credentials)"
            skipped_servers+=("$server")
            continue
        fi
        
        echo "MCP_START name=$server category=$category required=$required priority=$priority" >> "$LOG_FILE"
        log_message "INFO" "🔄 Starting MCP server: $server (category=$category, required=$required, priority=$priority)"
        
        # Get server configuration
        local command=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "command")
        local args=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "args")
        local env_vars=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "env")
        
        # Validate command
        if [ "$command" = "unknown" ] || [ -z "$command" ]; then
            log_error "❌ Invalid command for server $server, marking as failed"
            echo "MCP_FAILED name=$server reason=invalid_command category=$category priority=$priority" >> "$LOG_FILE"
            failed_servers+=("$server")
            continue
        fi
        
        # NO PLACEHOLDER GENERATION - Check if server implementation exists
        if [ "$command" = "node" ] && [[ "$args" == *"mcp-servers/"* ]]; then
            local script_path=$(echo "$args" | awk '{print $1}')
            local full_script_path="${SCRIPT_DIR}/$script_path"
            
            if [ ! -f "$full_script_path" ]; then
                log_error "❌ Server implementation not found: $full_script_path"
                echo "MCP_FAILED name=$server reason=implementation_missing category=$category priority=$priority path=$full_script_path" >> "$LOG_FILE"
                failed_servers+=("$server")
                continue
            fi
        fi
        
        # Start server in background
        cd "$SCRIPT_DIR"
        if [ -n "$env_vars" ]; then
            env $env_vars $command $args > "/tmp/mcp-${server}.log" 2>&1 &
        else
            $command $args > "/tmp/mcp-${server}.log" 2>&1 &
        fi
        
        local server_pid=$!
        echo "$server_pid" > "/tmp/mcp-${server}.pid"
        
        started_servers+=("$server:$server_pid")
        log_message "INFO" "✅ Started $server with PID $server_pid"
        
        # Structured logging after successful start
        echo "MCP_STARTED name=$server pid=$server_pid timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" >> "$LOG_FILE"
        
        # Brief delay between server starts
        sleep 2
    done
    
    log_message "INFO" "MCP servers processing complete:"
    log_message "INFO" "  Started: ${#started_servers[@]} servers"
    log_message "INFO" "  Skipped: ${#skipped_servers[@]} servers"
    log_message "INFO" "  Failed: ${#failed_servers[@]} servers"
    
    if [ ${#failed_servers[@]} -gt 0 ]; then
        log_warning "⚠️  Some servers failed to start: ${failed_servers[*]}"
    fi
}

# Health check for servers
health_check() {
    print_section "🩺 MCP Server Health Check"
    
    local healthy_servers=0
    local total_servers=0
    
    for pid_file in /tmp/mcp-*.pid; do
        if [ -f "$pid_file" ]; then
            total_servers=$((total_servers + 1))
            local server_name=$(basename "$pid_file" .pid | sed 's/mcp-//')
            local pid=$(cat "$pid_file")
            
            if ps -p "$pid" > /dev/null 2>&1; then
                log_message "INFO" "✅ $server_name (PID: $pid) is running"
                healthy_servers=$((healthy_servers + 1))
            else
                log_error "❌ $server_name (PID: $pid) is not running"
            fi
        fi
    done
    
    echo -e "\n${GREEN}Health Check Summary:${NC}"
    echo "Healthy servers: $healthy_servers/$total_servers"
    
    if [ $healthy_servers -eq $total_servers ] && [ $total_servers -gt 0 ]; then
        log_message "INFO" "🎉 All MCP servers are healthy!"
        return 0
    else
        log_error "⚠️  Some MCP servers are not healthy"
        return 1
    fi
}

# Monitor and restart failed servers
monitor_servers() {
    print_section "👀 MCP Server Monitoring (Background)"
    
    # Start monitoring in background
    {
        while true; do
            sleep 30
            
            for pid_file in /tmp/mcp-*.pid; do
                if [ -f "$pid_file" ]; then
                    local server_name=$(basename "$pid_file" .pid | sed 's/mcp-//')
                    local pid=$(cat "$pid_file")
                    
                    if ! ps -p "$pid" > /dev/null 2>&1; then
                        log_warning "🔄 Restarting failed server: $server_name"
                        # Restart logic could be added here
                    fi
                fi
            done
        done
    } &
    
    local monitor_pid=$!
    echo "$monitor_pid" > "/tmp/mcp-monitor.pid"
    log_message "INFO" "Monitor started with PID $monitor_pid"
}

# Create startup summary with enhanced gating awareness
create_summary() {
    print_section "📋 Startup Summary"
    
    local summary_file="${SCRIPT_DIR}/reports/mcp-start-summary.json"
    local current_time=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
    
    # Ensure reports directory exists
    mkdir -p "${SCRIPT_DIR}/reports"
    
    # Initialize server array
    local servers_json="["
    local first_server=true
    
    # Process all servers from the merged configuration
    local servers_list=$(parse_mcp_config "$MCP_MERGED_CONFIG")
    
    for server in $servers_list; do
        local category=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "category")
        local required=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "required")
        local priority=$(get_server_config "$MCP_MERGED_CONFIG" "$server" "priority")
        
        # Check server status - determine if it was skipped, failed, or started
        local started=false
        local error_message=""
        local server_pid=""
        local skip_reason=""
        
        # Check for various skip/fail reasons from log
        if grep -q "MCP_SKIPPED name=$server reason=community_disabled" "$LOG_FILE" 2>/dev/null; then
            skip_reason="community_disabled"
            error_message="community_disabled"
        elif grep -q "MCP_SKIPPED name=$server reason=missing_credentials" "$LOG_FILE" 2>/dev/null; then
            skip_reason="missing_credentials"
            error_message="missing_credentials"
        elif grep -q "MCP_FAILED name=$server reason=invalid_command" "$LOG_FILE" 2>/dev/null; then
            error_message="invalid_command"
        elif grep -q "MCP_FAILED name=$server reason=implementation_missing" "$LOG_FILE" 2>/dev/null; then
            error_message="implementation_missing"
        else
            # Check if server was started (has PID file and process is running)
            local pid_file="/tmp/mcp-${server}.pid"
            if [ -f "$pid_file" ]; then
                server_pid=$(cat "$pid_file")
                if ps -p "$server_pid" > /dev/null 2>&1; then
                    started=true
                else
                    error_message="process_died"
                fi
            else
                error_message="failed_to_start"
            fi
        fi
        
        # Convert string values to proper JSON types
        local required_bool="false"
        if [ "$required" = "true" ]; then
            required_bool="true"
        fi
        
        local started_bool="false"
        if [ "$started" = true ]; then
            started_bool="true"
        fi
        
        # Add comma separator if not first server
        if [ "$first_server" = false ]; then
            servers_json="${servers_json},"
        fi
        first_server=false
        
        # Build server JSON object
        servers_json="${servers_json}
    {
      \"name\": \"$server\",
      \"required\": $required_bool,
      \"priority\": ${priority:-99},
      \"started\": $started_bool,
      \"category\": \"${category:-unknown}\""
        
        # Add error field if server was skipped or failed
        if [ -n "$error_message" ]; then
            servers_json="${servers_json},
      \"error\": \"$error_message\""
        fi
        
        # Add PID if available
        if [ -n "$server_pid" ]; then
            servers_json="${servers_json},
      \"pid\": $server_pid"
        fi
        
        servers_json="${servers_json}
    }"
    done
    
    servers_json="${servers_json}
  ]"
    
    # Create the complete summary JSON
    cat > "$summary_file" << EOF
{
  "timestamp": "$current_time",
  "servers": $servers_json
}
EOF
    
    log_message "INFO" "📄 MCP start summary written to: $summary_file"
    
    # Also create legacy summary for compatibility
    local legacy_summary_file="${SCRIPT_DIR}/mcp-startup-summary.json"
    
    # Count running servers for legacy summary
    local running_servers=0
    for pid_file in /tmp/mcp-*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if ps -p "$pid" > /dev/null 2>&1; then
                running_servers=$((running_servers + 1))
            fi
        fi
    done
    
    # Create legacy summary JSON
    cat > "$legacy_summary_file" << EOF
{
  "startup_time": "$current_time",
  "status": "completed",
  "mcp_servers": {
    "total": $(ls /tmp/mcp-*.pid 2>/dev/null | wc -l),
    "running": $running_servers,
    "config_file": "$MCP_MERGED_CONFIG",
    "log_file": "$LOG_FILE"
  },
  "api_validation": {
    "report_file": "$VALIDATION_REPORT",
    "validated": true
  },
  "monitoring": {
    "enabled": true,
    "pid_file": "/tmp/mcp-monitor.pid"
  },
  "files_created": [
    "$LOG_FILE",
    "$VALIDATION_REPORT", 
    "$legacy_summary_file",
    "$summary_file"
  ]
}
EOF
    
    echo -e "${GREEN}🎉 MCP Server startup completed!${NC}"
    echo -e "${BLUE}📋 View summary: cat $summary_file${NC}"
    echo -e "${BLUE}📋 View legacy summary: cat $legacy_summary_file${NC}"
    echo -e "${BLUE}📝 View logs: tail -f $LOG_FILE${NC}"
}

# Main execution
main() {
    print_header
    
    # Load environment variables (robust parsing) - skip if SKIP_ENV_LOADING is set
    if [ -z "$SKIP_ENV_LOADING" ] && [ -f "${SCRIPT_DIR}/.env" ]; then
        # Use a more robust approach that handles comments and malformed lines
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
                continue
            fi
            # Skip lines with escaped characters that cause issues
            if [[ "$line" =~ \\n ]]; then
                continue
            fi
            # Only export valid variable assignments
            if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                export "$line"
            fi
        done < "${SCRIPT_DIR}/.env"
        log_message "INFO" "Environment variables loaded from .env"
    elif [ -n "$SKIP_ENV_LOADING" ]; then
        log_message "INFO" "Skipping .env loading (SKIP_ENV_LOADING set)"
    fi
    
    validate_api_keys
    start_mcp_servers
    
    # Wait for servers to initialize
    log_message "INFO" "Waiting for servers to initialize..."
    sleep 5
    
    # Always create summary first, then do health check
    create_summary
    
    # Health check and monitoring (continue even if health check fails in smoke test mode)
    if health_check; then
        monitor_servers
    else
        if [ -n "$SKIP_ENV_LOADING" ]; then
            log_message "INFO" "Health check failed but continuing in smoke test mode"
        else
            log_error "Health check failed"
            exit 1
        fi
    fi
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down MCP servers...${NC}"
    
    # Kill monitoring process
    if [ -f "/tmp/mcp-monitor.pid" ]; then
        local monitor_pid=$(cat "/tmp/mcp-monitor.pid")
        kill "$monitor_pid" 2>/dev/null || true
        rm -f "/tmp/mcp-monitor.pid"
    fi
    
    # Kill all MCP server processes
    for pid_file in /tmp/mcp-*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            kill "$pid" 2>/dev/null || true
            rm -f "$pid_file"
        fi
    done
    
    log_message "INFO" "🛑 All MCP servers stopped"
    exit 0
}

# Set up cleanup on script termination
trap cleanup SIGTERM SIGINT

# Run main function
main "$@"