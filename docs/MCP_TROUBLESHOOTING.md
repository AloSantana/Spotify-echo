# 🔧 MCP Server Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting steps for MCP (Model Context Protocol) server issues in EchoTune AI. The Enhanced MCP Validator v2.0 classifies failures into specific types and provides targeted remediation strategies.

## Failure Type Classifications

### 🕐 TIMEOUT Failures

**Symptoms:**
- Requests taking longer than configured timeout
- "Connection timeout" or "Request aborted" errors
- Server appears unresponsive

**Diagnosis Steps:**
1. Check server response time history in validation reports
2. Monitor server resource usage (CPU, memory)
3. Verify network latency between services
4. Check server logs for processing delays

**Remediation:**
```bash
# Check server health
curl -w "%{time_total}" http://localhost:3001/health

# Monitor server resources
top -p $(pgrep node)

# Increase timeout in mcp/servers.json
{
  "timeoutMs": 10000,  // Increase from 5000
  "retries": 3
}

# Restart server if unresponsive
pm2 restart mcp-server
```

### 🌐 NETWORK Failures

**Symptoms:**
- "Connection refused" errors
- "Network unreachable" messages
- DNS resolution failures

**Diagnosis Steps:**
1. Test network connectivity: `ping localhost`
2. Check if server is listening: `netstat -tlnp | grep :3001`
3. Verify firewall rules and port availability
4. Test DNS resolution if using hostnames

**Remediation:**
```bash
# Test direct connection
telnet localhost 3001

# Check listening ports
ss -tlnp | grep node

# Restart networking (if needed)
sudo systemctl restart networking

# Update server configuration
# Use IP addresses instead of hostnames if DNS issues persist
{
  "url": "http://127.0.0.1:3001"  // Instead of localhost
}
```

### 📡 PROTOCOL Failures

**Symptoms:**
- JSON parsing errors
- "Invalid response format" messages
- HTTP protocol violations

**Diagnosis Steps:**
1. Test API response format manually
2. Check server logs for malformed responses
3. Verify content-type headers
4. Validate JSON response structure

**Remediation:**
```bash
# Test response format
curl -H "Accept: application/json" http://localhost:3001/health | jq .

# Check for BOM or encoding issues
hexdump -C response.json | head

# Update server to return proper JSON
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "details": {}
}
```

### 🔐 AUTH Failures

**Symptoms:**
- 401 Unauthorized responses
- 403 Forbidden errors
- Authentication token issues

**Diagnosis Steps:**
1. Verify API keys and tokens
2. Check authentication headers
3. Test with valid credentials manually
4. Review server authentication configuration

**Remediation:**
```bash
# Test authentication
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/health

# Regenerate API keys if needed
export MCP_API_KEY="new-secret-key"

# Update server authentication middleware
# Ensure proper token validation
```

### ❓ UNKNOWN Failures

**Symptoms:**
- Unexpected error messages
- Server crashes or restarts
- Non-standard error responses

**Diagnosis Steps:**
1. Check server logs thoroughly
2. Review system error logs
3. Monitor for memory leaks or crashes
4. Analyze stack traces if available

**Remediation:**
```bash
# Check server logs
tail -f /var/log/mcp-server.log

# Monitor for crashes
journalctl -u mcp-server -f

# Check system resources
free -h && df -h

# Restart server with verbose logging
DEBUG=* npm start
```

## Health State Management

### 🟢 HEALTHY State

**Characteristics:**
- All health checks passing
- Response times within acceptable limits
- No consecutive failures
- Success rate > 95%

**Maintenance:**
- Continue regular monitoring
- Update dependencies as needed
- Optimize performance if response times increase

### 🟡 DEGRADED State

**Characteristics:**
- 1-2 recent failures but recovering
- Slightly elevated response times
- Success rate 85-95%
- Non-critical issues detected

**Actions:**
1. Monitor closely for trend patterns
2. Check for resource constraints
3. Consider scaling if load-related
4. Review recent changes

### 🔴 DOWN State

**Characteristics:**
- Multiple consecutive failures (≥2)
- Health checks consistently failing
- Success rate < 85%
- Server unreachable or returning errors

**Immediate Actions:**
```bash
# Quick diagnostic
./scripts/check-mcp-server.sh server-name

# Restart service
pm2 restart mcp-server

# Check dependencies
npm run health:dependencies

# Review configuration
cat mcp/servers.json | jq '.[] | select(.name=="server-name")'
```

### 🚨 DOWN_CRITICAL State

**Characteristics:**
- Critical server failing for ≥3 consecutive checks
- System functionality severely impacted
- Automatic merge blocking activated
- Immediate intervention required

**Emergency Response:**
```bash
# Immediate escalation protocol
1. Alert operations team
2. Check system-wide health: npm run health:all
3. Engage emergency procedures
4. Consider failover to backup systems

# Emergency restart
sudo systemctl restart all-mcp-services

# Check system logs
journalctl --since "10 minutes ago" --priority=err
```

## Server-Specific Troubleshooting

### Filesystem Server (Port 3001)
```bash
# Check file permissions
ls -la /path/to/mcp-files

# Verify disk space
df -h

# Test file operations
touch /tmp/mcp-test && rm /tmp/mcp-test
```

### Enhanced MCP Orchestrator (Port 3002)
```bash
# Check orchestration status
curl http://localhost:3002/orchestration/status

# Verify sub-service connections
npm run mcp:validate-all

# Check memory usage (orchestrator is memory-intensive)
ps aux | grep orchestrator
```

### Package Management (Port 3003)
```bash
# Test package registry connectivity
curl https://registry.npmjs.org/

# Check security scanning
npm audit

# Verify API rate limits
curl -H "User-Agent: EchoTune-MCP" https://registry.npmjs.org/express
```

### Code Sandbox (Port 3004)
```bash
# Check container runtime
docker ps | grep sandbox

# Verify security policies
cat /etc/sandbox/security.conf

# Test code execution
curl -X POST http://localhost:3004/execute -d '{"code":"console.log(\"test\")"}'
```

### Analytics Server (Port 3005)
```bash
# Check metrics collection
curl http://localhost:3005/metrics

# Verify data pipeline
npm run analytics:validate

# Check storage backend
redis-cli ping
```

## Automated Remediation

### Auto-Recovery Scripts

Create automated recovery scripts for common issues:

```bash
#!/bin/bash
# auto-recover-mcp.sh

SERVER_NAME=$1
FAILURE_TYPE=$2

case $FAILURE_TYPE in
  "TIMEOUT")
    echo "Restarting $SERVER_NAME due to timeout..."
    pm2 restart $SERVER_NAME
    ;;
  "NETWORK")
    echo "Checking network connectivity for $SERVER_NAME..."
    systemctl restart networking
    sleep 10
    pm2 restart $SERVER_NAME
    ;;
  "PROTOCOL")
    echo "Clearing cache and restarting $SERVER_NAME..."
    redis-cli flushdb
    pm2 restart $SERVER_NAME
    ;;
  *)
    echo "Generic restart for $SERVER_NAME..."
    pm2 restart $SERVER_NAME
    ;;
esac
```

### Health Check Automation

```bash
# Set up automated health monitoring
crontab -e

# Add health check every 5 minutes
*/5 * * * * /usr/local/bin/node /path/to/scripts/mcp-health-check.js

# Set up alerting for critical failures
*/1 * * * * /path/to/scripts/check-critical-mcp.sh
```

## Monitoring and Alerting

### Prometheus Metrics

Key metrics to monitor:
- `mcp_server_response_time_seconds`
- `mcp_server_success_rate`
- `mcp_server_consecutive_failures`
- `mcp_server_health_state`

### Alert Rules

```yaml
groups:
- name: mcp-servers
  rules:
  - alert: MCPServerDown
    expr: mcp_server_health_state{state="DOWN"} == 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "MCP Server {{ $labels.server }} is down"
      
  - alert: MCPCriticalServerDown
    expr: mcp_server_health_state{state="DOWN_CRITICAL"} == 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Critical MCP Server {{ $labels.server }} is down"
```

### Slack Integration

```javascript
// Send alerts to Slack
if (server.state === 'DOWN_CRITICAL') {
  await sendSlackAlert({
    channel: '#mcp-alerts',
    message: `🚨 CRITICAL: MCP Server ${server.name} is down`,
    color: 'danger'
  });
}
```

## Preventive Measures

### 1. Regular Health Checks
- Implement comprehensive health endpoints
- Monitor resource usage trends
- Set up proactive alerting

### 2. Graceful Degradation
- Implement circuit breakers
- Use fallback mechanisms
- Cache responses when possible

### 3. Load Testing
- Regularly test server capacity
- Identify performance bottlenecks
- Plan for traffic spikes

### 4. Documentation
- Keep troubleshooting logs
- Document resolution procedures
- Share knowledge across team

## Emergency Contacts

### Escalation Matrix

1. **Level 1**: Development Team
   - Slack: #mcp-support
   - Email: dev-team@echotune.ai

2. **Level 2**: Operations Team
   - Phone: +1-XXX-XXX-XXXX
   - Slack: #ops-emergency

3. **Level 3**: Infrastructure Team
   - Phone: +1-XXX-XXX-XXXX
   - Email: infra@echotune.ai

### On-Call Procedures

1. Check automated diagnostics
2. Follow failure-specific remediation
3. Escalate if not resolved within 15 minutes
4. Document resolution for future reference

---

*Last Updated: $(date)*
*MCP Validator Version: 2.0.0*