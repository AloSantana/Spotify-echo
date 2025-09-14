#!/usr/bin/env node

/**
 * MCP Health Check Script
 * Simple health enumeration for MCP servers
 */

const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

/**
 * Known MCP servers in the EchoTune ecosystem
 */
const MCP_SERVERS = [
  {
    name: 'enhanced-mcp-orchestrator',
    url: 'http://localhost:3002/health',
    description: 'Enhanced MCP orchestrator health endpoint'
  },
  {
    name: 'mcp-server-main',
    url: 'http://localhost:3001/health',
    description: 'Main MCP server health endpoint'
  },
  {
    name: 'filesystem-mcp',
    url: 'http://localhost:3003/health',
    description: 'Filesystem MCP server'
  },
  {
    name: 'memory-mcp',
    url: 'http://localhost:3004/health',
    description: 'Memory MCP server'
  }
];

/**
 * Check health of a single MCP server
 */
function checkServerHealth(server) {
  return new Promise((resolve) => {
    const protocol = server.url.startsWith('https:') ? https : http;
    const timeout = 5000; // 5 seconds
    
    const startTime = Date.now();
    
    const req = protocol.get(server.url, (res) => {
      const latency = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const healthData = res.statusCode === 200 ? JSON.parse(data) : null;
          resolve({
            name: server.name,
            status: 'healthy',
            statusCode: res.statusCode,
            latency: latency,
            url: server.url,
            description: server.description,
            response: healthData,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          resolve({
            name: server.name,
            status: 'unhealthy',
            statusCode: res.statusCode,
            latency: latency,
            url: server.url,
            description: server.description,
            error: 'Invalid JSON response',
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve({
        name: server.name,
        status: 'timeout',
        statusCode: null,
        latency: timeout,
        url: server.url,
        description: server.description,
        error: 'Request timeout',
        timestamp: new Date().toISOString()
      });
    });
    
    req.on('error', (error) => {
      const latency = Date.now() - startTime;
      resolve({
        name: server.name,
        status: 'error',
        statusCode: null,
        latency: latency,
        url: server.url,
        description: server.description,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
  });
}

/**
 * Check health of all MCP servers
 */
async function checkAllServers() {
  console.log('🔍 Checking MCP Server Health');
  console.log('=' .repeat(50));
  
  const healthChecks = await Promise.all(
    MCP_SERVERS.map(server => checkServerHealth(server))
  );
  
  // Display results
  const healthyServers = [];
  const unhealthyServers = [];
  
  for (const check of healthChecks) {
    const statusIcon = check.status === 'healthy' ? '✅' : 
                      check.status === 'timeout' ? '⏰' : '❌';
    
    console.log(`${statusIcon} ${check.name}`);
    console.log(`   URL: ${check.url}`);
    console.log(`   Status: ${check.status}`);
    console.log(`   Latency: ${check.latency}ms`);
    
    if (check.error) {
      console.log(`   Error: ${check.error}`);
    }
    
    if (check.response && check.response.status) {
      console.log(`   Response: ${check.response.status}`);
    }
    
    console.log('');
    
    if (check.status === 'healthy') {
      healthyServers.push(check);
    } else {
      unhealthyServers.push(check);
    }
  }
  
  // Summary
  console.log('📊 Health Check Summary:');
  console.log('=' .repeat(50));
  console.log(`✅ Healthy servers: ${healthyServers.length}/${MCP_SERVERS.length}`);
  console.log(`❌ Unhealthy servers: ${unhealthyServers.length}/${MCP_SERVERS.length}`);
  
  if (healthyServers.length > 0) {
    console.log('\n🟢 Healthy servers:');
    healthyServers.forEach(server => {
      console.log(`  - ${server.name} (${server.latency}ms)`);
    });
  }
  
  if (unhealthyServers.length > 0) {
    console.log('\n🔴 Unhealthy servers:');
    unhealthyServers.forEach(server => {
      console.log(`  - ${server.name}: ${server.error || server.status}`);
    });
  }
  
  // Generate health report
  const healthReport = {
    timestamp: new Date().toISOString(),
    totalServers: MCP_SERVERS.length,
    healthyCount: healthyServers.length,
    unhealthyCount: unhealthyServers.length,
    healthPercentage: ((healthyServers.length / MCP_SERVERS.length) * 100).toFixed(1),
    servers: healthChecks,
    summary: {
      healthy: healthyServers.map(s => ({ name: s.name, latency: s.latency })),
      unhealthy: unhealthyServers.map(s => ({ name: s.name, error: s.error || s.status }))
    }
  };
  
  return healthReport;
}

/**
 * Save health report to file
 */
async function saveHealthReport(report) {
  try {
    const reportsDir = path.join(process.cwd(), 'reports', 'mcp');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, 'health.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`💾 Health report saved: ${reportPath}`);
    return reportPath;
  } catch (error) {
    console.error(`❌ Failed to save health report: ${error.message}`);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const healthReport = await checkAllServers();
    await saveHealthReport(healthReport);
    
    // Exit with appropriate code
    const hasUnhealthyServers = healthReport.unhealthyCount > 0;
    
    if (hasUnhealthyServers) {
      console.log(`\n⚠️  Some MCP servers are not responding. Check the logs above.`);
      console.log(`Health score: ${healthReport.healthPercentage}%`);
    } else {
      console.log(`\n🎉 All MCP servers are healthy!`);
      console.log(`Health score: ${healthReport.healthPercentage}%`);
    }
    
    // Don't exit with error code for now - this is just informational
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during MCP health check:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkAllServers, checkServerHealth, saveHealthReport };