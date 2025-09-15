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
      communityIncluded: false
    };
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
   * Detect community servers from capabilities or start summary
   */
  detectCommunityServers(capabilities, startSummary) {
    let communityFound = false;

    // Check capabilities for community servers
    if (capabilities && capabilities.servers) {
      for (const server of capabilities.servers) {
        if (server.category === 'community' || server.tier === 3) {
          communityFound = true;
          break;
        }
      }
    }

    // Check start summary for community servers or tier 3
    if (startSummary && startSummary.servers) {
      for (const server of startSummary.servers) {
        if (server.category === 'community' || server.tier === 3 || server.priority >= 6) {
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