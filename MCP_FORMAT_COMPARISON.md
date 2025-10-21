# MCP Settings Format Comparison: Cursor vs VS Code vs Cline

## 🎯 Visual Format Comparison

### Format 1: CURSOR (.cursor/mcp.json)

```json
{
  "$schema": "https://modelcontextprotocol.io/schema/cursor-mcp.json",
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "token_value"
      }
    }
  }
}
```

**Characteristics:**

- ✅ Root key: `mcpServers`
- ⚠️ Type field: Optional/implicit
- ✅ Command format: `command` + `args`
- ✅ Environment: Direct values
- ✅ Validation: Loose
- ⚠️ Docker: Supported
- ✅ Placeholders: Not typical

---

### Format 2: VS CODE (.vscode/mcp.json)

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "github-token",
      "password": true
    }
  ],
  "servers": {
    "github": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN=${input:github-token}",
        "ghcr.io/github/github-mcp-server"
      ],
      "description": "..."
    }
  }
}
```

**Characteristics:**

- ⚠️ Root keys: `inputs` + `servers`
- ✅ Type field: Explicit `stdio`
- ✅ Command format: `command` + `args`
- ✅ Environment: Supports `${input:}` references
- ✅ Validation: Loose
- ✅ Docker: Full support
- ✅ Placeholders: `${input:key}`, `${workspaceFolder}`

---

### Format 3: CLINE (cline_mcp_settings.json) ✅ **CORRECT**

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npm",
      "args": ["exec", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "direct_value_or_placeholder"
      },
      "description": "GitHub integration"
    }
  }
}
```

**Characteristics:**

- ✅ Root key: `mcpServers` (REQUIRED)
- ✅ Type field: REQUIRED - must be `"stdio"`
- ✅ Command format: `command` + `args`
- ✅ Environment: Direct values only (NO `${input:}`)
- ✅ Validation: STRICT
- ❌ Docker: Not supported (use `npm exec`)
- ⚠️ Placeholders: Limited support

---

## 📊 Detailed Comparison Table

### Field Requirements

| Field         | Cursor      | VS Code     | Cline           |
| ------------- | ----------- | ----------- | --------------- |
| `mcpServers`  | ✅ Required | ❌ N/A      | ✅ Required     |
| `servers`     | ❌ N/A      | ✅ Required | ❌ N/A          |
| `type`        | ❌ No       | ✅ Yes      | ✅ **REQUIRED** |
| `command`     | ✅ Yes      | ✅ Yes      | ✅ Yes          |
| `args`        | ✅ Yes      | ✅ Yes      | ✅ Yes          |
| `env`         | ✅ Optional | ✅ Optional | ✅ Optional     |
| `description` | ⚠️ Some     | ✅ Yes      | ✅ Optional     |
| `inputs`      | ❌ No       | ✅ Required | ❌ No           |

### Feature Support

| Feature                    | Cursor      | VS Code      | Cline           |
| -------------------------- | ----------- | ------------ | --------------- |
| **Direct env values**      | ✅          | ✅           | ✅              |
| **`${input:key}` pattern** | ❌          | ✅           | ❌              |
| **`${env:KEY}` pattern**   | ❌          | ✅           | ❌              |
| **`${workspaceFolder}`**   | ❌          | ✅           | ❌              |
| **Docker type**            | ✅          | ✅           | ❌              |
| **Stdio type**             | ⚠️ Implicit | ✅           | ✅ **Required** |
| **Custom types**           | ❌          | ❌           | ❌              |
| **Env var references**     | ✅ Direct   | ✅ Via input | ✅ Direct       |

### Command Execution

| Format      | Docker Support | NPX Support | Direct Binary |
| ----------- | -------------- | ----------- | ------------- |
| **Cursor**  | ✅ Yes         | ✅ Yes      | ✅ Yes        |
| **VS Code** | ✅ Yes         | ✅ Yes      | ✅ Yes        |
| **Cline**   | ❌ No          | ✅ Yes      | ✅ Yes        |

---

## 🔄 Conversion Examples

### Example 1: GitHub Server

#### ❌ INCORRECT (Cursor/VS Code format in Cline)

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "ghcr.io/github/github-mcp-server"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github-token}"
      }
    }
  }
}
```

**Problems:**

1. ❌ Missing `type: "stdio"`
2. ❌ Docker command not supported in Cline
3. ❌ `${input:}` pattern not supported

#### ✅ CORRECT (Cline format)

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npm",
      "args": ["exec", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_actual_token_here"
      }
    }
  }
}
```

**Fixes:**

1. ✅ Added `type: "stdio"`
2. ✅ Changed Docker → npm exec
3. ✅ Replaced `${input:}` → direct value

---

### Example 2: Filesystem Server

#### ❌ INCORRECT

```json
{
  "command": "npx",
  "args": ["@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
}
```

**Problems:**

1. ❌ Missing `type: "stdio"`
2. ❌ Using `${workspaceFolder}` placeholder

#### ✅ CORRECT

```json
{
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/workspaces/Spotify-echo"
  ]
}
```

**Fixes:**

1. ✅ Added `type: "stdio"`
2. ✅ Replaced placeholder with actual path
3. ✅ Added `-y` flag for npx

---

### Example 3: Custom Server with Environment

#### ❌ INCORRECT

```json
{
  "command": "./my-server",
  "args": ["start"],
  "env": {
    "API_KEY": "${input:api-key}",
    "DEBUG": "${env:DEBUG}"
  }
}
```

**Problems:**

1. ❌ Missing `type: "stdio"`
2. ❌ Using `${input:}` pattern
3. ❌ Using `${env:}` reference

#### ✅ CORRECT

```json
{
  "type": "stdio",
  "command": "./my-server",
  "args": ["start"],
  "env": {
    "API_KEY": "your_actual_api_key",
    "DEBUG": "true"
  }
}
```

**Fixes:**

1. ✅ Added `type: "stdio"`
2. ✅ Used actual values for env vars
3. ✅ No placeholder references

---

## 🛠️ Migration Checklist

When converting from Cursor/VS Code to Cline:

- [ ] Change root key from `servers` to `mcpServers` (if needed)
- [ ] Add `"type": "stdio"` to each server
- [ ] Replace Docker commands with `npm exec` or `npx`
- [ ] Replace `${input:key}` with actual values
- [ ] Replace `${workspaceFolder}` with actual path
- [ ] Replace `${env:KEY}` with actual values or move to .env
- [ ] Remove `inputs` section (not used by Cline)
- [ ] Test with validator script
- [ ] Restart Cline extension

---

## 🧪 Validation Examples

### ❌ Example: Invalid Cline Configuration

```json
{
  "mcpServers": {
    "bad-server": {
      "command": "npm",
      "args": ["exec", "my-server"]
      // ❌ Missing type field
    }
  }
}
```

**Validation Error:**

```
❌ Invalid Cline MCP configuration
🔴 Critical Errors:
   1. bad-server: Missing "type" field (must be "stdio")
```

### ✅ Example: Valid Cline Configuration

```json
{
  "mcpServers": {
    "good-server": {
      "type": "stdio",
      "command": "npm",
      "args": ["exec", "my-server"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

**Validation Success:**

```
✅ Valid Cline MCP configuration!
📊 Servers configured: 1
✅ good-server
   Type: stdio
   Command: npm
   Args: exec my-server
   Env: DEBUG=true
```

---

## 🔧 Quick Reference: Format Fixes

### Missing Type Field

```diff
{
  "mcpServers": {
    "server": {
+     "type": "stdio",
      "command": "npm",
      "args": [...]
    }
  }
}
```

### Docker Command

```diff
{
  "mcpServers": {
    "server": {
      "type": "stdio",
-     "command": "docker",
-     "args": ["run", "-i", "--rm", "image"]
+     "command": "npm",
+     "args": ["exec", "@package/name"]
    }
  }
}
```

### Placeholder Variables

```diff
{
  "env": {
-   "TOKEN": "${input:github-token}",
-   "PATH": "${workspaceFolder}/src"
+   "TOKEN": "actual_token_value",
+   "PATH": "/workspaces/Spotify-echo/src"
  }
}
```

### Unused Input Section

```diff
{
-  "inputs": [
-    { "type": "promptString", "id": "github-token" }
-  ],
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npm",
      "args": ["exec", "@modelcontextprotocol/server-github"],
      "env": {
-       "TOKEN": "${input:github-token}"
+       "TOKEN": "actual_value"
      }
    }
  }
}
```

---

## 📚 Summary

### Key Takeaways

1. **Cline requires `type: "stdio"`** - This is the most critical difference
2. **No `${input:}` support** - Must use direct values or environment variables
3. **No Docker command type** - Use `npm exec` or `npx` instead
4. **Stricter validation** - All required fields must be present
5. **Simplified structure** - Only `mcpServers` root key (no `inputs`)

### Three Rules for Cline MCP

1. ✅ **Every server must have `type: "stdio"`**
2. ✅ **Commands must be direct executables** (npm, npx, uvx, or path to binary)
3. ✅ **Environment values must be actual values** (no placeholder references)

### Testing Your Configuration

```bash
# Validate format
node /workspaces/Spotify-echo/scripts/validate-cline-mcp.js

# Test in Cline
# Ask: "List the files in /workspaces/Spotify-echo/src"
```

---

**Last Updated:** October 20, 2025  
**Format Version:** 3.0 (Cline-compatible)  
**Compatibility:** Cline 2.2.14+
