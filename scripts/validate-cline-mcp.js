#!/usr/bin/env node

/**
 * Validate Cline MCP settings format and content
 *
 * Usage:
 *   node scripts/validate-cline-mcp.js [config-path]
 *
 * Examples:
 *   node scripts/validate-cline-mcp.js                     # Uses default
 *   node scripts/validate-cline-mcp.js /path/to/config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_CONFIG = path.join(
  os.homedir(),
  '.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json'
);

/**
 * Validate Cline MCP configuration
 */
function validateClineMCP(configPath) {
  const errors = [];
  const warnings = [];
  const info = [];

  try {
    // Check file exists
    if (!fs.existsSync(configPath)) {
      errors.push(`Configuration file not found: ${configPath}`);
      return { valid: false, errors, warnings, info, config: null };
    }

    // Read file
    const content = fs.readFileSync(configPath, 'utf8');
    let config;

    try {
      config = JSON.parse(content);
    } catch (e) {
      errors.push(`Invalid JSON: ${e.message}`);
      return { valid: false, errors, warnings, info, config: null };
    }

    // Check root structure
    if (!config.mcpServers) {
      errors.push('Missing "mcpServers" root key');
      return { valid: false, errors, warnings, info, config };
    }

    if (
      typeof config.mcpServers !== 'object' ||
      Array.isArray(config.mcpServers)
    ) {
      errors.push('"mcpServers" must be an object (not array or primitive)');
      return { valid: false, errors, warnings, info, config };
    }

    const serverCount = Object.keys(config.mcpServers).length;
    info.push(`Found ${serverCount} MCP server(s)`);

    if (serverCount === 0) {
      warnings.push('"mcpServers" is empty - no servers configured');
    }

    // Validate each server
    const serverStatus = {};
    for (const [serverName, serverConfig] of Object.entries(
      config.mcpServers
    )) {
      const serverErrors = [];
      const serverWarnings = [];

      // Validate type field (REQUIRED for Cline)
      if (serverConfig.type === undefined) {
        serverErrors.push('Missing "type" field (must be "stdio")');
      } else if (typeof serverConfig.type !== 'string') {
        serverErrors.push(
          `"type" must be a string, got: ${typeof serverConfig.type}`
        );
      } else if (serverConfig.type !== 'stdio') {
        serverErrors.push(
          `Invalid type "${serverConfig.type}" (must be "stdio")`
        );
      }

      // Validate command field (REQUIRED)
      if (serverConfig.command === undefined) {
        serverErrors.push('Missing "command" field');
      } else if (typeof serverConfig.command !== 'string') {
        serverErrors.push(
          `"command" must be a string, got: ${typeof serverConfig.command}`
        );
      } else if (serverConfig.command.trim() === '') {
        serverErrors.push('"command" cannot be empty');
      }

      // Validate args field (RECOMMENDED)
      if (serverConfig.args !== undefined) {
        if (!Array.isArray(serverConfig.args)) {
          serverErrors.push(
            `"args" must be an array, got: ${typeof serverConfig.args}`
          );
        } else {
          // Check array contents
          for (let i = 0; i < serverConfig.args.length; i++) {
            if (typeof serverConfig.args[i] !== 'string') {
              serverErrors.push(
                `"args[${i}]" must be string, got: ${typeof serverConfig.args[
                  i
                ]}`
              );
            }
          }
        }
      }

      // Validate env field (OPTIONAL)
      if (serverConfig.env !== undefined) {
        if (
          typeof serverConfig.env !== 'object' ||
          Array.isArray(serverConfig.env)
        ) {
          serverErrors.push(
            `"env" must be an object, got: ${typeof serverConfig.env}`
          );
        } else {
          // Check environment variable patterns
          for (const [key, value] of Object.entries(serverConfig.env)) {
            if (typeof value === 'string') {
              // Warn about unsupported patterns
              if (value.startsWith('${input:')) {
                serverWarnings.push(
                  `env.${key}: Contains "${value}" - Cline doesn't support \${input:} pattern`
                );
              } else if (value.startsWith('${env:')) {
                serverWarnings.push(
                  `env.${key}: Contains "${value}" - May need manual setup`
                );
              } else if (value.startsWith('${')) {
                serverWarnings.push(
                  `env.${key}: Contains unknown placeholder "${value}"`
                );
              }
            }
          }
        }
      }

      // Validate disabled field (OPTIONAL)
      if (serverConfig.disabled !== undefined) {
        if (typeof serverConfig.disabled !== 'boolean') {
          serverWarnings.push(
            `"disabled" should be boolean, got: ${typeof serverConfig.disabled}`
          );
        }
      }

      // Validate description field (OPTIONAL)
      if (serverConfig.description !== undefined) {
        if (typeof serverConfig.description !== 'string') {
          serverWarnings.push(
            `"description" should be string, got: ${typeof serverConfig.description}`
          );
        }
      }

      // Check for extra fields
      const validFields = [
        'type',
        'command',
        'args',
        'env',
        'disabled',
        'description',
      ];
      for (const field of Object.keys(serverConfig)) {
        if (!validFields.includes(field)) {
          serverWarnings.push(`Unexpected field "${field}" (ignored by Cline)`);
        }
      }

      serverStatus[serverName] = {
        valid: serverErrors.length === 0,
        errors: serverErrors,
        warnings: serverWarnings,
        config: serverConfig,
      };

      // Add to global errors/warnings
      if (serverErrors.length > 0) {
        serverErrors.forEach((e) => errors.push(`${serverName}: ${e}`));
      }
      if (serverWarnings.length > 0) {
        serverWarnings.forEach((w) => warnings.push(`${serverName}: ${w}`));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      config,
      serverStatus,
      serverCount,
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error.message}`);
    return { valid: false, errors, warnings, info, config: null };
  }
}

/**
 * Format validation results for display
 */
function displayResults(configPath, result) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Cline MCP Configuration Validator                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Validating: ${configPath}\n`);

  // Info messages
  if (result.info.length > 0) {
    console.log('ℹ️  Info:');
    result.info.forEach((msg) => console.log(`   • ${msg}`));
    console.log();
  }

  // Validity status
  if (result.valid) {
    console.log('✅ Valid Cline MCP configuration!\n');
  } else {
    console.log('❌ Invalid Cline MCP configuration\n');
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('🔴 Critical Errors:');
    result.errors.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e}`);
    });
    console.log();
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w}`);
    });
    console.log();
  }

  // Server status detail
  if (result.serverStatus) {
    console.log('═'.repeat(56));
    console.log('SERVER DETAILS');
    console.log('═'.repeat(56));

    for (const [serverName, status] of Object.entries(result.serverStatus)) {
      const statusIcon = status.valid ? '✅' : '❌';
      console.log(`\n${statusIcon} ${serverName}`);
      console.log(`   Type: ${status.config.type}`);
      console.log(`   Command: ${status.config.command}`);
      if (status.config.args) {
        console.log(`   Args: ${status.config.args.join(' ')}`);
      }
      if (status.config.env && Object.keys(status.config.env).length > 0) {
        console.log(
          `   Env: ${Object.keys(status.config.env).length} variable(s)`
        );
        for (const [key, value] of Object.entries(status.config.env)) {
          const displayValue =
            value.length > 40 ? value.substring(0, 37) + '...' : value;
          console.log(`        • ${key}=${displayValue}`);
        }
      }

      if (status.errors.length > 0) {
        console.log('   Errors:');
        status.errors.forEach((e) => console.log(`     • ${e}`));
      }

      if (status.warnings.length > 0) {
        console.log('   Warnings:');
        status.warnings.forEach((w) => console.log(`     • ${w}`));
      }
    }
    console.log();
  }

  // Recommendations
  if (!result.valid) {
    console.log('═'.repeat(56));
    console.log('RECOMMENDATIONS');
    console.log('═'.repeat(56));

    if (result.errors.some((e) => e.includes('type'))) {
      console.log('\n1. Add "type": "stdio" to each server:');
      console.log('   "server-name": {');
      console.log('     "type": "stdio",');
      console.log('     "command": "...",');
      console.log('     "args": [...]');
      console.log('   }');
    }

    if (result.warnings.some((w) => w.includes('${input:'))) {
      console.log('\n2. Replace ${input:...} patterns with actual values:');
      console.log('   ❌ "token": "${input:github-token}"');
      console.log('   ✅ "token": "your_actual_token_here"');
    }

    if (result.errors.length === 0 && result.serverCount === 0) {
      console.log('\n3. Add MCP servers to configuration:');
      console.log('   "mcpServers": {');
      console.log('     "github": { ... },');
      console.log('     "filesystem": { ... }');
      console.log('   }');
    }

    console.log('\n4. After fixing, restart Cline extension in VS Code');
    console.log('5. Test by asking Cline to perform actions using MCP tools\n');
  }

  // Summary
  console.log('═'.repeat(56));
  if (result.valid) {
    console.log(
      `✨ All checks passed! ${result.serverCount} server(s) ready.\n`
    );
  } else {
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    console.log(`⚠️  ${errorCount} error(s), ${warningCount} warning(s)\n`);
  }
}

/**
 * Main function
 */
async function main() {
  const configPath = process.argv[2] || DEFAULT_CONFIG;
  const result = validateClineMCP(configPath);

  displayResults(configPath, result);

  process.exit(result.valid ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
