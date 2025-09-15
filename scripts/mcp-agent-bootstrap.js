#!/usr/bin/env node

/**
 * MCP Agent Bootstrap Script
 * Reads MCP configuration and generates server capabilities report
 * No external network calls - operates on local configuration only
 */

const fs = require('fs');
const path = require('path');

class MCPAgentBootstrap {
  constructor() {
    this.configPath = null;
    this.config = null;
    this.capabilities = new Map();
  }

  /**
   * Load MCP configuration with fallback logic
   */
  loadConfiguration() {
    const primaryConfigPath = path.join(process.cwd(), '.copilot', 'mcp-config.json');
    const fallbackConfigPath = path.join(process.cwd(), '.copilot', 'mcp-config.example.json');

    // Try primary configuration first
    if (fs.existsSync(primaryConfigPath)) {
      try {
        this.configPath = primaryConfigPath;
        this.config = JSON.parse(fs.readFileSync(primaryConfigPath, 'utf8'));
        console.log(`✅ Loaded primary MCP configuration: ${primaryConfigPath}`);
        return true;
      } catch (error) {
        console.warn(`⚠️  Failed to load primary config: ${error.message}`);
      }
    }

    // Fallback to example configuration
    if (fs.existsSync(fallbackConfigPath)) {
      try {
        this.configPath = fallbackConfigPath;
        this.config = JSON.parse(fs.readFileSync(fallbackConfigPath, 'utf8'));
        console.log(`📋 Loaded fallback MCP configuration: ${fallbackConfigPath}`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to load fallback config: ${error.message}`);
        return false;
      }
    }

    console.error('❌ No MCP configuration found');
    return false;
  }

  /**
   * Generate server capabilities metadata
   */
  generateServerCapabilities() {
    if (!this.config || !this.config.mcpServers) {
      console.error('❌ No MCP servers configuration found');
      return [];
    }

    const servers = [];

    for (const [serverName, serverConfig] of Object.entries(this.config.mcpServers)) {
      const serverMetadata = {
        name: serverName,
        category: serverConfig.category || 'unknown',
        required: serverConfig.required || false,
        priority: serverConfig.priority || 99,
        plannedUsage: serverConfig.plannedUsage || [],
        capabilities: serverConfig.capabilities || [],
        command: serverConfig.command || 'unknown',
        args: serverConfig.args || [],
        env: this.sanitizeEnvironment(serverConfig.env || {}),
        healthCheck: serverConfig.healthCheck || null,
        detected: false, // Local check only, no network calls
        status: 'unknown' // Will be determined by orchestrator
      };

      // Check if server files exist locally (basic detection)
      serverMetadata.detected = this.detectServerLocally(serverConfig);

      servers.push(serverMetadata);
    }

    // Sort by priority and category
    servers.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.category.localeCompare(b.category);
    });

    return servers;
  }

  /**
   * Sanitize environment variables for safe logging
   */
  sanitizeEnvironment(env) {
    const sanitized = {};
    const sensitiveKeys = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'DSN'];

    for (const [key, value] of Object.entries(env)) {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toUpperCase().includes(sensitive)
      );

      if (isSensitive) {
        sanitized[key] = value ? '[REDACTED]' : '[NOT_SET]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Detect if server exists locally (no network calls)
   */
  detectServerLocally(serverConfig) {
    try {
      const { command, args } = serverConfig;

      // Check for Node.js based servers
      if (command === 'node' && args && args.length > 0) {
        const scriptPath = path.resolve(args[0]);
        return fs.existsSync(scriptPath);
      }

      // Check for NPX packages (assume available if command exists)
      if (command === 'npx' && args && args.length > 0) {
        // Basic check for package.json or known MCP packages
        const packageName = args[0];
        return this.isKnownMCPPackage(packageName);
      }

      // For other commands, do basic existence check
      return true; // Assume available for validation
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if package is a known MCP package
   */
  isKnownMCPPackage(packageName) {
    const knownMCPPackages = [
      '@modelcontextprotocol/server-git',
      '@modelcontextprotocol/server-sequential-thinking',
      '@modelcontextprotocol/server-filesystem',
      '@modelcontextprotocol/server-memory',
      '@modelcontextprotocol/server-sqlite'
    ];

    return knownMCPPackages.includes(packageName);
  }

  /**
   * Generate comprehensive capabilities report
   */
  generateCapabilitiesReport() {
    const servers = this.generateServerCapabilities();
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        configurationFile: this.configPath,
        totalServers: servers.length,
        generator: 'mcp-agent-bootstrap',
        version: '1.0.0'
      },
      summary: {
        byCategory: this.categorizeServers(servers),
        byPriority: this.prioritizeServers(servers),
        byStatus: this.statusSummary(servers),
        requiredServers: servers.filter(s => s.required).length,
        optionalServers: servers.filter(s => !s.required).length
      },
      servers: servers,
      orchestrator: this.config.orchestrator || null,
      monitoring: this.config.monitoring || null,
      development: this.config.development || null
    };

    return report;
  }

  /**
   * Categorize servers by type
   */
  categorizeServers(servers) {
    const categories = {};
    
    for (const server of servers) {
      const category = server.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(server.name);
    }

    return categories;
  }

  /**
   * Group servers by priority
   */
  prioritizeServers(servers) {
    const priorities = {};
    
    for (const server of servers) {
      const priority = server.priority;
      if (!priorities[priority]) {
        priorities[priority] = [];
      }
      priorities[priority].push(server.name);
    }

    return priorities;
  }

  /**
   * Summarize server status
   */
  statusSummary(servers) {
    const summary = {
      detected: 0,
      notDetected: 0,
      unknown: 0
    };

    for (const server of servers) {
      if (server.detected) {
        summary.detected++;
      } else if (server.detected === false) {
        summary.notDetected++;
      } else {
        summary.unknown++;
      }
    }

    return summary;
  }

  /**
   * Save capabilities report to file
   */
  saveCapabilitiesReport(report) {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'mcp-capabilities.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Capabilities report saved: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error(`❌ Failed to save report: ${error.message}`);
      return null;
    }
  }

  /**
   * Display summary information
   */
  displaySummary(report) {
    console.log('\n🤖 MCP Agent Bootstrap Summary');
    console.log('================================');
    console.log(`📅 Generated: ${report.metadata.generatedAt}`);
    console.log(`📁 Config: ${report.metadata.configurationFile}`);
    console.log(`🖥️  Total Servers: ${report.metadata.totalServers}`);
    console.log('');

    console.log('📊 Server Categories:');
    for (const [category, servers] of Object.entries(report.summary.byCategory)) {
      console.log(`  ${category}: ${servers.length} servers`);
    }
    console.log('');

    console.log('🎯 Priority Distribution:');
    for (const [priority, servers] of Object.entries(report.summary.byPriority)) {
      console.log(`  Priority ${priority}: ${servers.length} servers`);
    }
    console.log('');

    console.log('🔍 Detection Status:');
    console.log(`  ✅ Detected: ${report.summary.byStatus.detected}`);
    console.log(`  ❌ Not Detected: ${report.summary.byStatus.notDetected}`);
    console.log(`  ❓ Unknown: ${report.summary.byStatus.unknown}`);
    console.log('');

    console.log('⚙️  Server Requirements:');
    console.log(`  🔴 Required: ${report.summary.requiredServers}`);
    console.log(`  🟡 Optional: ${report.summary.optionalServers}`);
  }

  /**
   * Validate configuration
   */
  validateConfiguration() {
    if (!this.config) {
      return { valid: false, errors: ['No configuration loaded'] };
    }

    const errors = [];
    const warnings = [];

    // Validate basic structure
    if (!this.config.mcpServers) {
      errors.push('Missing mcpServers configuration');
    }

    // Validate servers
    if (this.config.mcpServers) {
      for (const [serverName, serverConfig] of Object.entries(this.config.mcpServers)) {
        if (!serverConfig.command) {
          errors.push(`Server '${serverName}' missing command`);
        }

        if (!serverConfig.capabilities || serverConfig.capabilities.length === 0) {
          warnings.push(`Server '${serverName}' has no capabilities defined`);
        }

        if (!serverConfig.category) {
          warnings.push(`Server '${serverName}' has no category defined`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Main execution function
   */
  async run(options = {}) {
    console.log('🚀 MCP Agent Bootstrap Starting...');
    console.log('');

    // Load configuration
    if (!this.loadConfiguration()) {
      process.exit(1);
    }

    // Validate configuration
    const validation = this.validateConfiguration();
    if (!validation.valid) {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      console.log('');
    }

    // Generate capabilities report
    const report = this.generateCapabilitiesReport();

    // Save report
    const reportPath = this.saveCapabilitiesReport(report);
    if (!reportPath) {
      process.exit(1);
    }

    // Display summary
    if (!options.quiet) {
      this.displaySummary(report);
    }

    // Output for shell scripts (structured logging)
    if (options.structured) {
      console.log(`MCP_SERVERS_COUNT=${report.metadata.totalServers}`);
      console.log(`MCP_CONFIG_FILE=${this.configPath}`);
      console.log(`MCP_REPORT_FILE=${reportPath}`);
      console.log(`MCP_REQUIRED_SERVERS=${report.summary.requiredServers}`);
      console.log(`MCP_OPTIONAL_SERVERS=${report.summary.optionalServers}`);
    }

    console.log('✅ MCP Agent Bootstrap completed successfully!');
    return report;
  }
}

// Command line interface
if (require.main === module) {
  const options = {
    quiet: process.argv.includes('--quiet'),
    structured: process.argv.includes('--structured'),
    validate: process.argv.includes('--validate')
  };

  const bootstrap = new MCPAgentBootstrap();
  
  if (options.validate) {
    // Validation only mode
    if (!bootstrap.loadConfiguration()) {
      process.exit(1);
    }
    
    const validation = bootstrap.validateConfiguration();
    if (validation.valid) {
      console.log('✅ Configuration is valid');
      if (validation.warnings.length > 0) {
        console.warn('⚠️  Warnings:');
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }
      process.exit(0);
    } else {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  } else {
    // Full bootstrap mode
    bootstrap.run(options).catch(error => {
      console.error('❌ Bootstrap failed:', error.message);
      process.exit(1);
    });
  }
}

module.exports = MCPAgentBootstrap;