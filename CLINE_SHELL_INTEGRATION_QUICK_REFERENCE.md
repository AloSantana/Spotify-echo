# ⚡ Cline Shell Integration - Quick Reference

## 🎯 TL;DR - Quick Fix (3 minutes)

### Option A: Automatic Setup (Recommended)

```bash
bash /workspaces/Spotify-echo/setup-cline-shell-integration.sh
```

Then:

1. Open VS Code: `CMD/CTRL + Shift + P` → "Preferences: Open Settings (JSON)"
2. Add these settings:

```json
{
  "terminal.integrated.defaultProfile.linux": "bash",
  "terminal.integrated.shellIntegration.enabled": true
}
```

3. Reload: `CMD/CTRL + Shift + P` → "Developer: Reload Window"

### Option B: Manual Setup

**Step 1**: Add to `~/.bashrc`

```bash
export SHELL=/bin/bash
export TERM=xterm-256color
export CLINE_SHELL_INTEGRATION=1
shopt -s histappend
PROMPT_COMMAND="history -a; history -n"
```

**Step 2**: VS Code Settings (`CMD/CTRL + Shift + P` → Settings JSON)

```json
{
  "terminal.integrated.defaultProfile.linux": "bash",
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.profiles.linux": {
    "bash": {
      "path": "/bin/bash",
      "args": ["-l", "-i"],
      "env": {
        "SHELL": "/bin/bash",
        "TERM": "xterm-256color",
        "CLINE_SHELL_INTEGRATION": "1"
      }
    }
  }
}
```

**Step 3**: Set Default Shell

- `CMD/CTRL + Shift + P` → "Terminal: Select Default Profile"
- Choose: **bash**

**Step 4**: Restart

- Close all terminals
- Reload VS Code: `CMD/CTRL + Shift + P` → "Developer: Reload Window"

---

## ✅ Verification (1 minute)

Open new terminal and run:

```bash
# Check shell
echo $SHELL  # Should print: /bin/bash

# Check integration
echo $CLINE_SHELL_INTEGRATION  # Should print: 1

# Check terminal
echo $TERM  # Should print: xterm-256color
```

All three should show correct values. If not, the configuration didn't apply - reload VS Code.

---

## 🔍 Status Dashboard

| Item              | Status         | Expected              |
| ----------------- | -------------- | --------------------- |
| OS                | Ubuntu 24.04.3 | ✅ Supported          |
| Shell             | bash 5.2.21    | ✅ Supported          |
| VS Code           | 1.105.1        | ✅ Supported          |
| Shell Integration | Should be ON   | ✅ Enable in settings |

---

## 🛠️ Troubleshooting Quick Fixes

### ❌ Still seeing shell integration warning?

**Fix 1**: Reload VS Code

```bash
# Or press: CMD/CTRL + Shift + P → "Developer: Reload Window"
killall code  # Force close VS Code
code .  # Reopen
```

**Fix 2**: Check profile selection

```bash
# Press: CMD/CTRL + Shift + P
# Type: "Terminal: Select Default Profile"
# Confirm: "bash" is selected
```

**Fix 3**: Verify settings applied

```bash
# Check in terminal:
echo "SHELL=$SHELL, CLINE=$CLINE_SHELL_INTEGRATION, TERM=$TERM"
# Should show all three variables set
```

---

## 📋 Files Created

| File             | Purpose                     | Path                                         |
| ---------------- | --------------------------- | -------------------------------------------- |
| Setup Script     | Automated configuration     | `setup-cline-shell-integration.sh`           |
| Shell Config     | Bash integration settings   | `.dev-shell-config.sh`                       |
| VS Code Settings | Terminal configuration      | `.vscode-terminal-settings.json`             |
| Full Guide       | Comprehensive documentation | `CLINE_SHELL_INTEGRATION_FIX.md`             |
| Quick Ref        | This file                   | `CLINE_SHELL_INTEGRATION_QUICK_REFERENCE.md` |

---

## 🚀 After Setup

Cline should now:

- ✅ Capture command output correctly
- ✅ Show command exit codes
- ✅ Display command execution icons
- ✅ Track shell history properly
- ✅ Work with all shell features

---

## 📞 Still Having Issues?

Check the comprehensive guide:

```bash
cat CLINE_SHELL_INTEGRATION_FIX.md
```

Or see Cline's official troubleshooting:
https://github.com/cline/cline/wiki/Troubleshooting-%E2%80%90-Shell-Integration-Unavailable

---

**Last Updated**: October 20, 2025  
**Tested On**: Ubuntu 24.04.3 LTS, Bash 5.2.21, VS Code 1.105.1
