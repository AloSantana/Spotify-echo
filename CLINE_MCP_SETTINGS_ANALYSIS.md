# Cline MCP Settings Format Analysis & Auto-Fix Guide

## 🔍 Problem Summary

You're experiencing an **'Invalid MCP settings format'** error in Cline even though the github-mcp-server processes are running in terminals 11-13. This indicates a **configuration format incompatibility** between:

1. **Cursor MCP format** (`.cursor/mcp.json`) - Uses `mcpServers` key
2. **VS Code MCP format** (`.vscode/mcp.json`) - Uses `servers` key with `inputs`
3. **Cline MCP format** (`cline_mcp_settings.json`) - Has **different validation requirements**

---

## 📊 Configuration Format Comparison

### Current Issues Identified

| Aspect             | `.cursor/mcp.json`     | `.vscode/mcp.json`        | `cline_mcp_settings.json` | Status       |
| ------------------ | ---------------------- | ------------------------- | ------------------------- | ------------ |
| **Root Key**       | `mcpServers`           | `servers` + `inputs`      | `mcpServers`              | ⚠️ Different |
| **Server Type**    | `stdio` (implicit)     | Explicit `stdio` type     | **Required**              | ❌ Missing   |
| **Env Variables**  | Direct `env` object    | `${input:key}` references | **Must be explicit**      | ⚠️ Mixed     |
| **Command Format** | `command` + `args`     | `command` + `args`        | ✅ Same                   | ✓ Compatible |
| **Validation**     | Loose                  | Loose                     | **Strict**                | ⚠️ Issue     |
| **Current State**  | Populated (12 servers) | Populated (8 servers)     | **Empty** {}              | ❌ Critical  |

---

## 🔴 Root Causes

### 1. **Missing `type: "stdio"` Property**

```json
// ❌ INVALID for Cline
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"]
    }
  }
}

// ✅ VALID for Cline
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"]
    }
  }
}
```

### 2. **Environment Variable References**

Cline does NOT support `${input:key}` pattern. Must use direct values or process.env references:

```json
// ❌ INVALID for Cline
"env": {
  "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github-token}"
}

// ✅ VALID for Cline (environment variables resolved at runtime)
"env": {
  "GITHUB_PERSONAL_ACCESS_TOKEN": "${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}"
}
```

### 3. **Docker Command Handling**

VS Code `.vscode/mcp.json` uses docker containers, but Cline needs direct commands:

```json
// ❌ INVALID for Cline
{
  "command": "docker",
  "args": ["run", "-i", "--rm", "ghcr.io/github/github-mcp-server"]
}

// ✅ VALID for Cline (if docker available)
{
  "type": "stdio",
  "command": "docker",
  "args": ["run", "-i", "--rm", "ghcr.io/github/github-mcp-server"]
}

// ✅ BETTER for Cline (direct binary)
{
  "type": "stdio",
  "command": "/home/codespace/Documents/Cline/MCP/github.com/github/github-mcp-server/github-mcp-server",
  "args": ["stdio"]
}
```

### 4. **Current Cline Settings State**

The Cline MCP settings file is located at:

```
/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json
```

**Current Content:**

```json
{
  "mcpServers": {} // ← EMPTY! Servers aren't registered
}
```

---

## ✅ Correct Cline MCP Settings Format

### Template Structure

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "path/to/executable",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR_NAME": "value",
        "API_KEY": "your-key-here"
      },
      "disabled": false,
      "description": "Optional description"
    }
  }
}
```

### Required Fields for Each Server

- ✅ `type` - **Must be "stdio"**
- ✅ `command` - Path to executable or command name
- ✅ `args` - Array of command-line arguments
- ⚠️ `env` - Object with environment variables (optional but recommended)
- ⚠️ `disabled` - Boolean to enable/disable server (optional)
- ⚠️ `description` - Human-readable description (optional)

---

## 🔧 Auto-Fix Proposal #1: Direct GitHub MCP Server

For the currently running `github-mcp-server` processes, use the pre-built binary:

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "/home/codespace/Documents/Cline/MCP/github.com/github/github-mcp-server/github-mcp-server",
      "args": ["stdio"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_TOKEN_HERE"
      },
      "description": "GitHub repository management and automation (direct binary)"
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/workspaces/Spotify-echo"
      ],
      "description": "Secure file operations"
    },
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "description": "Persistent context and conversation history"
    },
    "git": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-git"],
      "description": "Git operations and repository management"
    },
    "brave-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "YOUR_BRAVE_API_KEY_HERE"
      },
      "description": "Privacy-focused web research"
    },
    "sequential-thinking": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "description": "Enhanced AI reasoning"
    }
  }
}
```

---

## 🔧 Auto-Fix Proposal #2: NPX-Based GitHub Server

If the direct binary doesn't work, use npm exec:

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npm",
      "args": ["exec", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_TOKEN_HERE"
      },
      "description": "GitHub integration via npm exec"
    }
  }
}
```

---

## 🔧 Auto-Fix Proposal #3: Convert from VS Code Format

Use this Node.js script to automatically convert `.vscode/mcp.json` to Cline format:

### File: `/workspaces/Spotify-echo/scripts/convert-mcp-to-cline.js`

```javascript
#!/usr/bin/env node

/**
 * Convert VS Code/Cursor MCP settings to Cline format
 * Usage: node scripts/convert-mcp-to-cline.js [source] [output]
 */

const fs = require('fs');
const path = require('path');

function convertVSCodeToCline(vscodeConfig) {
  const clineConfig = { mcpServers: {} };

  // Extract servers from VS Code format
  const servers = vscodeConfig.servers || {};

  for (const [serverName, serverConfig] of Object.entries(servers)) {
    // Skip problematic entries
    if (!serverConfig.command) {
      console.warn(`⚠️  Skipping ${serverName}: no command specified`);
      continue;
    }

    // Convert docker commands to direct binary if possible
    let command = serverConfig.command;
    let args = serverConfig.args || [];

    if (command === 'docker' && args[0] === 'run') {
      // Extract image name
      const imageIndex = args.indexOf('--rm') + 1;
      const imageName = args[imageIndex];
      console.log(
        `ℹ️  ${serverName}: Docker command detected, using npx instead`
      );

      // Map known docker images to npx packages
      const dockerToNpx = {
        'ghcr.io/github/github-mcp-server':
          '@modelcontextprotocol/server-github',
      };

      if (dockerToNpx[imageName]) {
        command = 'npx';
        args = ['-y', dockerToNpx[imageName]];
      }
    }

    // Convert environment variables
    const env = {};
    if (serverConfig.env) {
      for (const [key, value] of Object.entries(serverConfig.env)) {
        // Skip ${input:...} pattern - requires manual setup
        if (typeof value === 'string' && value.startsWith('${input:')) {
          console.log(`⚠️  ${serverName}.${key}: Replace manually - ${value}`);
          env[key] = `YOUR_${key}_HERE`;
        } else if (
          typeof value === 'string' &&
          value.startsWith('${workspaceFolder}')
        ) {
          env[key] = value.replace(
            '${workspaceFolder}',
            '/workspaces/Spotify-echo'
          );
        } else {
          env[key] = value;
        }
      }
    }

    // Build Cline-compatible server config
    clineConfig.mcpServers[serverName] = {
      type: 'stdio',
      command,
      args,
      ...(Object.keys(env).length > 0 && { env }),
    };

    if (serverConfig.description) {
      clineConfig.mcpServers[serverName].description = serverConfig.description;
    }
  }

  return clineConfig;
}

async function main() {
  const sourceFile =
    process.argv[2] || '/workspaces/Spotify-echo/.vscode/mcp.json';
  const outputFile =
    process.argv[3] ||
    '/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json';

  try {
    // Read source
    console.log(`📖 Reading: ${sourceFile}`);
    const vscodeConfig = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

    // Convert
    console.log('🔄 Converting...');
    const clineConfig = convertVSCodeToCline(vscodeConfig);

    // Display preview
    console.log('\n✨ Preview:');
    console.log(JSON.stringify(clineConfig, null, 2));

    // Save
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(clineConfig, null, 2), 'utf8');
    console.log(`\n✅ Saved to: ${outputFile}`);

    // Instructions
    console.log('\n📋 Next Steps:');
    console.log('1. Review the configuration above');
    console.log(
      '2. Replace placeholder values (YOUR_*_HERE) with actual credentials'
    );
    console.log('3. Test MCP servers in Cline');
    console.log('4. If a server fails, add "disabled": true to that entry');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
```

---

## 🔧 Auto-Fix Proposal #4: Validation Script

### File: `/workspaces/Spotify-echo/scripts/validate-cline-mcp.js`

```javascript
#!/usr/bin/env node

/**
 * Validate Cline MCP settings format
 */

const fs = require('fs');

function validateClineMCP(configPath) {
  const errors = [];
  const warnings = [];

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Check root structure
    if (!config.mcpServers) {
      errors.push('Missing "mcpServers" root key');
      return { valid: false, errors, warnings };
    }

    if (typeof config.mcpServers !== 'object') {
      errors.push('"mcpServers" must be an object');
      return { valid: false, errors, warnings };
    }

    // Check each server
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      // Check type
      if (!serverConfig.type) {
        errors.push(`${serverName}: Missing "type" (must be "stdio")`);
      } else if (serverConfig.type !== 'stdio') {
        errors.push(`${serverName}: Invalid type "${serverConfig.type}" (must be "stdio")`);
      }

      // Check command
      if (!serverConfig.command) {
        errors.push(`${serverName}: Missing "command"`);
      }

      // Check args format
      if (serverConfig.args && !Array.isArray(serverConfig.args)) {
        errors.push(`${serverName}: "args" must be an array`);
      }

      // Check env variables
      if (serverConfig.env && typeof serverConfig.env !== 'object') {
        errors.push(`${serverName}: "env" must be an object`);
      }

      // Warn about env variable patterns
      if (serverConfig.env) {
        for (const [key, value] of Object.entries(serverConfig.env)) {
          if (typeof value === 'string' && value.startsWith('${input:')) {
            warnings.push(`${serverName}.${key}: Contains "${value}" - Cline doesn't support ${input:} pattern`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      serverCount: Object.keys(config.mcpServers).length
    };

  } catch (error) {
    errors.push(`JSON parse error: ${error.message}`);
    return { valid: false, errors, warnings };
  }
}

// Main
const configPath = process.argv[2] ||
  '/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json';

const result = validateClineMCP(configPath);

console.log(`\n📋 Validating: ${configPath}\n`);

if (result.valid) {
  console.log('✅ Valid Cline MCP configuration!');
  console.log(`📊 Servers configured: ${result.serverCount}\n`);
} else {
  console.log('❌ Invalid Cline MCP configuration\n');
}

if (result.errors.length > 0) {
  console.log('🔴 Errors:');
  result.errors.forEach(e => console.log(`  • ${e}`));
  console.log();
}

if (result.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  result.warnings.forEach(w => console.log(`  • ${w}`));
  console.log();
}

process.exit(result.valid ? 0 : 1);
```

---

## 📋 Step-by-Step Fix Instructions

### Step 1: Create Cline Configuration

Create a file at:

```
/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json
```

**With this content:**

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npm",
      "args": ["exec", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "REPLACE_WITH_YOUR_GITHUB_TOKEN"
      },
      "description": "GitHub integration"
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/workspaces/Spotify-echo"
      ],
      "description": "File system access"
    },
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "description": "Persistent memory"
    },
    "git": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-git"],
      "description": "Git operations"
    }
  }
}
```

### Step 2: Replace Credentials

Replace these placeholders:

- `REPLACE_WITH_YOUR_GITHUB_TOKEN` - Your GitHub PAT
- `REPLACE_WITH_BRAVE_API_KEY` - Brave Search API key (if using)

### Step 3: Restart Cline

1. Close Cline window/tab
2. Reopen Cline
3. Check MCP server status

### Step 4: Validate

Run the validation script:

```bash
node /workspaces/Spotify-echo/scripts/validate-cline-mcp.js
```

---

## 🔍 Troubleshooting

### "No MCP servers installed" in Cline UI

**Causes:**

1. `cline_mcp_settings.json` is empty
2. Missing `type: "stdio"` in server configs
3. Invalid JSON syntax
4. Wrong file path for credentials

**Solution:**

```bash
# 1. Verify file exists
ls -la "/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json"

# 2. Check content
cat "/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json"

# 3. Validate JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('/home/codespace/.vscode-remote/data/User/globalStorage/jnorthrup.bao-cline/settings/cline_mcp_settings.json', 'utf8')))"

# 4. Restart Cline extension in VS Code
```

### Server processes running but "Invalid format" error

**Cause:** `type` field is missing

**Fix:**

```json
// ❌ Before
{
  "mcpServers": {
    "github": {
      "command": "npm",
      "args": ["exec", "@modelcontextprotocol/server-github"]
    }
  }
}

// ✅ After
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npm",
      "args": ["exec", "@modelcontextprotocol/server-github"]
    }
  }
}
```

### Environment variables not resolved

**Cause:** Using `${input:}` or `${env:}` patterns

**Fix:**

```bash
# Set in .env or environment
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token"

# Or use in config
{
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "direct_value_here"
  }
}
```

---

## 📚 Key Differences Summary

| Aspect         | Cursor        | VS Code          | Cline         |
| -------------- | ------------- | ---------------- | ------------- |
| **Root**       | `mcpServers`  | `servers`        | `mcpServers`  |
| **Type**       | Implicit      | `type: "stdio"`  | **Required**  |
| **Env**        | Direct values | `${input:}` refs | Direct values |
| **Validation** | Loose         | Loose            | **Strict**    |
| **Docker**     | Not typical   | Yes              | No (use npx)  |
| **Variables**  | ✅ Supported  | ✅ Supported     | ❌ Limited    |

---

## ✨ Testing Your MCP Servers

Once configured, test in Cline:

```
Can you list the files in /workspaces/Spotify-echo?
```

If this works, filesystem MCP is configured correctly.

```
Can you check the git log for the last 5 commits?
```

If this works, git MCP is configured correctly.

```
Can you search for "github api" using Brave?
```

If this works, brave-search MCP is configured correctly.

---

## 📖 References

- [MCP Specification](https://modelcontextprotocol.io/)
- [Cline Documentation](https://github.com/jnorthrup/cline)
- [MCP Server Directory](https://registry.modelcontextprotocol.io/)
