#!/usr/bin/env node

/**
 * Convert VS Code/Cursor MCP settings to Cline format
 *
 * Usage:
 *   node scripts/convert-mcp-to-cline.js [source] [output]
 *
 * Examples:
 *   node scripts/convert-mcp-to-cline.js                    # Uses defaults
 *   node scripts/convert-mcp-to-cline.js .vscode/mcp.json   # Custom source
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_SOURCE = '/workspaces/Spotify-echo/.vscode/mcp.json';
const DEFAULT_OUTPUT = path.join(
  os.homedir(),
  '.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json'
);

/**
 * Convert VS Code MCP format to Cline format
 */
function convertVSCodeToCline(vscodeConfig) {
  const clineConfig = { mcpServers: {} };
  const conversionLog = [];

  // Extract servers from VS Code format
  const servers = vscodeConfig.servers || {};

  for (const [serverName, serverConfig] of Object.entries(servers)) {
    // Skip problematic entries
    if (!serverConfig.command) {
      console.warn(`⚠️  Skipping ${serverName}: no command specified`);
      conversionLog.push(`SKIP: ${serverName} - no command`);
      continue;
    }

    // Convert docker commands to direct binary if possible
    let command = serverConfig.command;
    let args = serverConfig.args ? [...serverConfig.args] : [];
    let conversionNotes = '';

    if (command === 'docker' && args[0] === 'run') {
      // Extract image name
      const rmIndex = args.indexOf('--rm');
      const imageName = args[rmIndex + 1];
      console.log(
        `ℹ️  ${serverName}: Docker command detected, attempting conversion...`
      );

      // Map known docker images to npx packages
      const dockerToNpx = {
        'ghcr.io/github/github-mcp-server':
          '@modelcontextprotocol/server-github',
      };

      if (dockerToNpx[imageName]) {
        command = 'npx';
        args = ['-y', dockerToNpx[imageName]];
        conversionNotes = 'Converted from Docker to npx';
        console.log(`   → Converted to: npx ${args.join(' ')}`);
        conversionLog.push(`CONVERT: ${serverName} - Docker → npx`);
      } else {
        console.log(
          `   ⚠️  Unknown Docker image: ${imageName}, keeping docker command`
        );
        conversionLog.push(`WARN: ${serverName} - Unknown Docker image`);
      }
    }

    // Convert environment variables
    const env = {};
    if (serverConfig.env && typeof serverConfig.env === 'object') {
      for (const [key, value] of Object.entries(serverConfig.env)) {
        // Handle ${input:...} pattern - Cline doesn't support this
        if (typeof value === 'string' && value.startsWith('${input:')) {
          const inputKey = value.match(/\$\{input:([^}]+)\}/)?.[1];
          console.log(
            `⚠️  ${serverName}.${key}: Requires manual setup - ${value}`
          );
          env[key] = `REPLACE_WITH_YOUR_${
            inputKey?.toUpperCase() || key.toUpperCase()
          }`;
          conversionLog.push(`MANUAL: ${serverName}.${key} - ${value}`);
        } else if (
          typeof value === 'string' &&
          value.startsWith('${workspaceFolder}')
        ) {
          // Replace workspace folder placeholder
          env[key] = value.replace(
            '${workspaceFolder}',
            '/workspaces/Spotify-echo'
          );
          conversionLog.push(
            `REPLACE: ${serverName}.${key} - workspace folder`
          );
        } else if (typeof value === 'string' && value.startsWith('${')) {
          // Other ${...} patterns
          console.log(
            `⚠️  ${serverName}.${key}: Contains placeholder - ${value}`
          );
          env[key] = value;
          conversionLog.push(`PLACEHOLDER: ${serverName}.${key} - ${value}`);
        } else {
          env[key] = value;
        }
      }
    }

    // Build Cline-compatible server config
    const clineServer = {
      type: 'stdio',
      command,
      args,
    };

    // Add env if not empty
    if (Object.keys(env).length > 0) {
      clineServer.env = env;
    }

    // Add description
    if (serverConfig.description) {
      clineServer.description = serverConfig.description;
    }

    clineConfig.mcpServers[serverName] = clineServer;
    conversionLog.push(`SUCCESS: ${serverName}`);
  }

  return { config: clineConfig, log: conversionLog };
}

/**
 * Format server config for display
 */
function formatServerForDisplay(server) {
  const lines = [];
  lines.push('  type: stdio');
  lines.push(`  command: ${server.command}`);
  lines.push(`  args: [${server.args.map((a) => `"${a}"`).join(', ')}]`);

  if (server.env && Object.keys(server.env).length > 0) {
    lines.push('  env:');
    for (const [key, value] of Object.entries(server.env)) {
      lines.push(`    ${key}: "${value}"`);
    }
  }

  if (server.description) {
    lines.push(`  description: "${server.description}"`);
  }

  return lines.join('\n');
}

/**
 * Main conversion function
 */
async function main() {
  const sourceFile = process.argv[2] || DEFAULT_SOURCE;
  const outputFile = process.argv[3] || DEFAULT_OUTPUT;

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Cline MCP Settings Converter                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Check source file exists
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Source file not found: ${sourceFile}`);
      process.exit(1);
    }

    // Read source
    console.log(`📖 Reading: ${sourceFile}`);
    const vscodeConfig = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

    // Validate source format
    if (!vscodeConfig.servers && !vscodeConfig.mcpServers) {
      console.error('❌ Source must contain "servers" or "mcpServers" key');
      process.exit(1);
    }

    // Convert
    console.log('🔄 Converting...\n');
    const { config: clineConfig, log: conversionLog } =
      convertVSCodeToCline(vscodeConfig);

    const serverCount = Object.keys(clineConfig.mcpServers).length;
    if (serverCount === 0) {
      console.warn('⚠️  Warning: No servers were converted');
    } else {
      console.log(`✨ Converted ${serverCount} server(s)\n`);
    }

    // Display preview
    console.log('═'.repeat(56));
    console.log('PREVIEW OF CONVERTED CONFIGURATION');
    console.log('═'.repeat(56));
    console.log('{');
    console.log('  "mcpServers": {');

    let first = true;
    for (const [name, server] of Object.entries(clineConfig.mcpServers)) {
      if (!first) console.log(',\n');
      console.log(`    "${name}": {`);
      console.log(
        formatServerForDisplay(server)
          .split('\n')
          .map((l) => '      ' + l)
          .join('\n')
      );
      console.log('    }');
      first = false;
    }

    console.log('\n  }\n}');
    console.log('═'.repeat(56) + '\n');

    // Create output directory if needed
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      console.log(`📁 Creating directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save configuration
    fs.writeFileSync(outputFile, JSON.stringify(clineConfig, null, 2), 'utf8');
    console.log('✅ Configuration saved to:');
    console.log(`   ${outputFile}\n`);

    // Display conversion log
    console.log('═'.repeat(56));
    console.log('CONVERSION LOG');
    console.log('═'.repeat(56));
    conversionLog.forEach((log) => {
      const [status, msg] = log.split(': ');
      const statusSymbol =
        {
          SUCCESS: '✅',
          CONVERT: '🔄',
          MANUAL: '⚠️ ',
          REPLACE: '🔧',
          PLACEHOLDER: '❓',
          SKIP: '⏭️ ',
          WARN: '⚠️ ',
        }[status] || '•';

      console.log(`${statusSymbol} ${log}`);
    });
    console.log();

    // Instructions
    console.log('═'.repeat(56));
    console.log('NEXT STEPS');
    console.log('═'.repeat(56));
    console.log('1. ✏️  Review the configuration above');
    console.log('2. 🔑 Replace placeholder values with actual credentials:');
    conversionLog
      .filter((l) => l.startsWith('MANUAL'))
      .forEach((l) => console.log(`   • ${l.split(': ')[1]}`));
    console.log('3. 🧪 Restart Cline extension in VS Code');
    console.log(
      '4. ✅ Test MCP servers in Cline (e.g., "list files in /workspaces")'
    );
    console.log(
      '5. 📋 Run validation: node /workspaces/Spotify-echo/scripts/validate-cline-mcp.js\n'
    );
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.message.includes('JSON')) {
      console.error('   Hint: Source file may not be valid JSON');
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
