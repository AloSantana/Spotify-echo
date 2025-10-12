#!/usr/bin/env node

/**
 * Coding Agent Startup Script with MCP Server Integration
 * Automatically starts all configured MCP servers for enhanced development capabilities
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load MCP configuration
const CONFIG_PATH = path.join(__dirname, '..', '.openmcp', 'connection.json');
const MCP_CONFIG_PATH = path.join(__dirname, '..', '.mcp-config');

class MCPServerManager {
  constructor() {
    this.servers = new Map();
    this.config = null;
    this.mcpSettings = new Map();
  }

  async loadConfiguration() {
    try {
      // Load connection.json
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      this.config = JSON.parse(configData);
      
      // Load .mcp-config
      if (fs.existsSync(MCP_CONFIG_PATH)) {
        const mcpConfig = fs.readFileSync(MCP_CONFIG_PATH, 'utf8');
        mcpConfig.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.+)$/);
          if (match) {
            this.mcpSettings.set(match[1].trim(), match[2].trim());
          }
        });
      }
      
      console.log('✅ Configuration loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading configuration:', error.message);
      return false;
    }
  }

  async startServer(name, serverConfig) {
    return new Promise((resolve, reject) => {
      const { command, args, env, disabled, autostart } = serverConfig;
      
      // Skip if server is disabled or autostart is false
      if (disabled || !autostart) {
        console.log(`⏭️  Skipping ${name} (disabled=${disabled}, autostart=${autostart})`);
        resolve({ name, status: 'skipped' });
        return;
      }

      // Check if server is enabled in .mcp-config
      const enabledKey = `${name.replace(/-/g, '_')}_enabled`;
      if (this.mcpSettings.has(enabledKey) && this.mcpSettings.get(enabledKey) === 'false') {
        console.log(`⏭️  Skipping ${name} (disabled in .mcp-config)`);
        resolve({ name, status: 'skipped' });
        return;
      }

      console.log(`🚀 Starting ${name} MCP server...`);
      
      // Prepare environment variables
      const processEnv = { ...process.env, ...env };
      
      // Replace environment variable placeholders
      Object.keys(processEnv).forEach(key => {
        if (typeof processEnv[key] === 'string') {
          processEnv[key] = processEnv[key].replace(/\$\{([^}]+)\}/g, (match, varName) => {
            const [name, defaultValue] = varName.split(':-');
            return process.env[name] || defaultValue || '';
          });
        }
      });

      const serverProcess = spawn(command, args, {
        env: processEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle server output
      serverProcess.stdout.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[${name}] ${data.toString().trim()}`);
      });

      serverProcess.on('error', (error) => {
        console.error(`❌ Error starting ${name}:`, error.message);
        reject({ name, error: error.message });
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ ${name} exited with code ${code}`);
        } else {
          console.log(`✅ ${name} exited gracefully`);
        }
      });

      // Store server process
      this.servers.set(name, serverProcess);

      // Give server time to start
      setTimeout(() => {
        console.log(`✅ ${name} started successfully`);
        resolve({ name, status: 'started', pid: serverProcess.pid });
      }, 1000);
    });
  }

  async startAllServers() {
    if (!this.config || !this.config.mcpServers) {
      console.error('❌ No MCP servers configured');
      return [];
    }

    console.log('\n🔧 Starting MCP Servers...');
    console.log('=' .repeat(50));

    const results = [];
    const serverNames = Object.keys(this.config.mcpServers);
    
    for (const name of serverNames) {
      const serverConfig = this.config.mcpServers[name];
      try {
        const result = await this.startServer(name, serverConfig);
        results.push(result);
      } catch (error) {
        results.push({ name, status: 'error', error: error.message });
      }
    }

    return results;
  }

  async healthCheck() {
    console.log('\n🏥 Running MCP Server Health Check...');
    console.log('=' .repeat(50));

    const activeServers = [];
    const inactiveServers = [];

    this.servers.forEach((process, name) => {
      if (process.killed) {
        inactiveServers.push(name);
      } else {
        activeServers.push(name);
      }
    });

    console.log(`✅ Active servers: ${activeServers.length}`);
    activeServers.forEach(name => console.log(`   - ${name}`));

    if (inactiveServers.length > 0) {
      console.log(`❌ Inactive servers: ${inactiveServers.length}`);
      inactiveServers.forEach(name => console.log(`   - ${name}`));
    }

    return { active: activeServers, inactive: inactiveServers };
  }

  async shutdown() {
    console.log('\n🛑 Shutting down MCP servers...');
    
    const promises = [];
    this.servers.forEach((process, name) => {
      promises.push(new Promise((resolve) => {
        console.log(`   Stopping ${name}...`);
        process.kill('SIGTERM');
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      }));
    });

    await Promise.all(promises);
    console.log('✅ All MCP servers stopped');
  }
}

// Main execution
async function main() {
  console.log('\n🎯 Spotify Echo - MCP-Enhanced Coding Agent');
  console.log('=' .repeat(50));
  console.log('Starting MCP servers for enhanced development capabilities\n');

  const manager = new MCPServerManager();

  // Load configuration
  const configLoaded = await manager.loadConfiguration();
  if (!configLoaded) {
    console.error('❌ Failed to load configuration. Exiting...');
    process.exit(1);
  }

  // Start all servers
  const results = await manager.startAllServers();

  // Display results
  console.log('\n📊 Startup Summary:');
  console.log('=' .repeat(50));
  const started = results.filter(r => r.status === 'started');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log(`✅ Started: ${started.length} servers`);
  started.forEach(r => console.log(`   - ${r.name} (PID: ${r.pid})`));

  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length} servers`);
    skipped.forEach(r => console.log(`   - ${r.name}`));
  }

  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length} servers`);
    errors.forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }

  // Health check
  if (manager.mcpSettings.get('mcp_health_check_enabled') === 'true') {
    setTimeout(() => manager.healthCheck(), 5000);
  }

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Received shutdown signal...');
    await manager.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Received termination signal...');
    await manager.shutdown();
    process.exit(0);
  });

  // Keep process alive
  console.log('\n💡 MCP servers are running. Press Ctrl+C to stop.');
  console.log('=' .repeat(50));
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { MCPServerManager };
