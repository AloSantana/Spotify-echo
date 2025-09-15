#!/usr/bin/env node

/**
 * MCP Startup Validation Helper
 * Pure Node.js script (no external dependencies)
 * Validates MCP startup results and reports metrics
 */

const fs = require('fs');
const path = require('path');

class MCPStartValidator {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.startSummaryPath = path.join(this.reportsDir, 'mcp-start-summary.json');
    this.capabilitiesPath = path.join(this.reportsDir, 'mcp-capabilities.json');
    
    this.strictRequired = process.env.MCP_STRICT_REQUIRED === 'true';
    this.enableCommunityMCP = process.env.ENABLE_COMMUNITY_MCP === '1';
    
    this.results = {
      requiredStarted: 0,
      requiredTotal: 0,
      optionalStarted: 0,
      communityIncluded: false,
      coreBaselineOk: false,
      serversMissing: []
    };
    
    // Core baseline servers that must be present
    this.coreBaselineServers = ['filesystem', 'memory', 'sequential-thinking'];
    
    // Community servers list for detection
    this.communityServers = [
      'brave-search', 'browserbase', 'perplexity', 'perplexity-mcp', 
      'enhanced-browser-research', 'spotify-integration', 'github-repos', 'github'
    ];
  }

  /**
   * Log error to stderr
   */
  logError(message) {
    console.error(`[ERROR] ${message}`);
  }

  /**
   * Log info to stderr
   */
  logInfo(message) {
    console.error(`[INFO] ${message}`);
  }

  /**
   * Read and parse JSON file safely
   */
  readJsonFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read/parse ${filePath}: ${error.message}`);
    }
  }

  /**
   * Validate start summary JSON structure
   */
  validateStartSummary(startSummary) {
    const requiredFields = ['timestamp', 'servers'];
    
    for (const field of requiredFields) {
      if (!(field in startSummary)) {
        throw new Error(`Missing required field in start summary: ${field}`);
      }
    }

    if (!Array.isArray(startSummary.servers)) {
      throw new Error('Start summary "servers" field must be an array');
    }

    // Validate each server entry
    for (const server of startSummary.servers) {
      const serverRequiredFields = ['name', 'required', 'priority', 'started'];
      
      for (const field of serverRequiredFields) {
        if (!(field in server)) {
          throw new Error(`Missing required field in server entry "${server.name || 'unknown'}": ${field}`);
        }
      }

      if (typeof server.required !== 'boolean') {
        throw new Error(`Server "${server.name}" required field must be boolean`);
      }

      if (typeof server.priority !== 'number') {
        throw new Error(`Server "${server.name}" priority field must be number`);
      }

      if (typeof server.started !== 'boolean') {
        throw new Error(`Server "${server.name}" started field must be boolean`);
      }
    }

    return true;
  }

  /**
   * Validate core baseline servers are present and started
   */
  validateCoreBaseline(startSummary) {
    const serverNames = startSummary.servers.map(s => s.name.toLowerCase());
    const missingServers = [];
    const failedServers = [];
    
    for (const coreServer of this.coreBaselineServers) {
      const serverFound = startSummary.servers.find(s => 
        s.name.toLowerCase() === coreServer.toLowerCase()
      );
      
      if (!serverFound) {
        missingServers.push(coreServer);
      } else if (!serverFound.started) {
        failedServers.push(coreServer);
      }
    }
    
    this.results.serversMissing = [...missingServers, ...failedServers];
    this.results.coreBaselineOk = missingServers.length === 0 && failedServers.length === 0;
    
    if (!this.results.coreBaselineOk) {
      const errorMessage = `Core baseline validation failed. Missing: [${missingServers.join(', ')}], Failed: [${failedServers.join(', ')}]`;
      throw new Error(errorMessage);
    }
    
    return true;
  }

  /**
   * Detect community servers from capabilities or start summary (enhanced)
   */
  detectCommunityServers(capabilities, startSummary) {
    let communityFound = false;

    // Check capabilities for community servers
    if (capabilities && capabilities.servers) {
      for (const server of capabilities.servers) {
        if (server.category === 'community' || server.tier === 3 || 
            this.communityServers.includes(server.name.toLowerCase())) {
          communityFound = true;
          break;
        }
      }
    }

    // Check start summary for community servers
    if (startSummary && startSummary.servers) {
      for (const server of startSummary.servers) {
        if (server.category === 'community' || server.tier === 3 || 
            server.priority >= 6 || this.communityServers.includes(server.name.toLowerCase())) {
          communityFound = true;
          break;
        }
      }
    }

    return communityFound;
  }

  /**
   * Count server statistics from start summary
   */
  countServers(startSummary) {
    let requiredStarted = 0;
    let requiredTotal = 0;
    let optionalStarted = 0;

    for (const server of startSummary.servers) {
      if (server.required) {
        requiredTotal++;
        if (server.started) {
          requiredStarted++;
        }
      } else {
        if (server.started) {
          optionalStarted++;
        }
      }
    }

    return { requiredStarted, requiredTotal, optionalStarted };
  }

  /**
   * Validate MCP startup results
   */
  validate() {
    try {
      this.logInfo('Starting MCP startup validation...');

      // Read start summary
      const startSummary = this.readJsonFile(this.startSummaryPath);
      this.logInfo(`Read start summary with ${startSummary.servers?.length || 0} servers`);

      // Validate start summary structure
      this.validateStartSummary(startSummary);
      this.logInfo('Start summary structure validation passed');

      // Validate core baseline servers
      this.validateCoreBaseline(startSummary);
      this.logInfo('Core baseline validation passed');

      // Read capabilities (optional)
      let capabilities = null;
      try {
        capabilities = this.readJsonFile(this.capabilitiesPath);
        this.logInfo('Read capabilities report');
      } catch (error) {
        this.logInfo(`Capabilities report not available: ${error.message}`);
      }

      // Count servers
      const serverCounts = this.countServers(startSummary);
      this.results.requiredStarted = serverCounts.requiredStarted;
      this.results.requiredTotal = serverCounts.requiredTotal;
      this.results.optionalStarted = serverCounts.optionalStarted;

      // Sanity guard for no required servers
      if (this.results.requiredTotal === 0) {
        this.logInfo('[validate] WARN: No required servers defined; check config integrity.');
        if (this.strictRequired) {
          throw new Error('No required servers defined in configuration');
        }
      }

      // Detect community servers
      this.results.communityIncluded = this.detectCommunityServers(capabilities, startSummary);

      // Validate strict mode requirements
      if (this.strictRequired && this.results.requiredStarted < this.results.requiredTotal) {
        throw new Error(
          `Strict mode failure: ${this.results.requiredStarted}/${this.results.requiredTotal} required servers started`
        );
      }

      // Validate community MCP requirements
      if (this.enableCommunityMCP && !this.results.communityIncluded) {
        this.logInfo('Warning: ENABLE_COMMUNITY_MCP=1 but no community servers found');
      }

      this.logInfo(`Validation completed: ${this.results.requiredStarted}/${this.results.requiredTotal} required, ${this.results.optionalStarted} optional, community=${this.results.communityIncluded}`);
      
      // Output JSON result to stdout
      console.log(JSON.stringify(this.results));
      
      return true;
    } catch (error) {
      this.logError(`Validation failed: ${error.message}`);
      return false;
    }
  }
}

// Command line interface
if (require.main === module) {
  const validator = new MCPStartValidator();
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node validate-mcp-start.js');
    console.log('');
    console.log('Environment variables:');
    console.log('  MCP_STRICT_REQUIRED     Fail if any required server failed to start');
    console.log('  ENABLE_COMMUNITY_MCP    Assert community servers are included');
    console.log('');
    console.log('Output: JSON object with validation results to stdout');
    console.log('Logs: Progress messages to stderr');
    process.exit(0);
  }

  const success = validator.validate();
  process.exit(success ? 0 : 1);
}

module.exports = MCPStartValidator;