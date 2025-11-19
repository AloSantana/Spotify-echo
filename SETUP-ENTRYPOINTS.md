# 🚀 Setup Entrypoints - Quick Reference

This document provides a clear reference for all setup methods available in the EchoTune AI repository.

## 📋 Platform-Specific Setup Commands

### Linux / Ubuntu (Native or WSL)

#### Option 1: Simple npm install (Recommended)
```bash
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
npm install
npm start
```

#### Option 2: Automated Setup Script
```bash
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
./install-ubuntu.sh
```

#### Option 3: Check Dependencies First
```bash
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
./install-guide.sh    # Shows what you need
./install-ubuntu.sh   # Installs everything
```

### Windows (PowerShell)

#### Option 1: Simple npm install (Recommended)
```powershell
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
npm install
npm start
```

#### Option 2: Automated Setup Script
```powershell
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
.\scripts\windows\setup.ps1
```

### macOS

#### Simple npm install (Recommended)
```bash
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
npm install
npm start
```

## ⚠️ Common Mistakes to Avoid

### ❌ Wrong: Running PowerShell Script in Bash/WSL
```bash
# This will NOT work in bash or WSL
.\scripts\windows\setup.ps1
# Error: .scriptswindowssetup.ps1: command not found
```

### ✅ Correct: Use Platform-Appropriate Scripts
```bash
# For Linux/WSL (bash)
./install-ubuntu.sh

# For Windows (PowerShell)
.\scripts\windows\setup.ps1
```

## 📁 Available Setup Scripts

| Script | Platform | Purpose | Location |
|--------|----------|---------|----------|
| `install-ubuntu.sh` | Linux/WSL | Automated installation with Node.js setup | `./install-ubuntu.sh` |
| `install-guide.sh` | Linux/WSL | Check what dependencies you need | `./install-guide.sh` |
| `test-npm-install.sh` | Linux/WSL | Test npm install compatibility | `./test-npm-install.sh` |
| `setup.ps1` | Windows | Automated PowerShell setup | `.\scripts\windows\setup.ps1` |
| `run.ps1` | Windows | Start the application | `.\scripts\windows\run.ps1` |
| `test.ps1` | Windows | Run tests | `.\scripts\windows\test.ps1` |

## 🔍 Version Requirements

### Node.js
- **Minimum:** 18.0.0
- **Recommended:** 20.x LTS (as specified in `.nvmrc`)
- **Tested on:** 20.19.5

### npm
- **Minimum:** 8.0.0
- **Recommended:** 10.x (comes with Node.js 20+)

## ✅ Version Check

The repository automatically checks your Node.js version during `npm install`:

```bash
npm install

> spotify-echo@1.0.0 preinstall
> node scripts/check-node-version.js

✅ Node.js version 20.19.5 is compatible (>= 18.0.0)
```

If you have an incompatible version, you'll see:

```
═══════════════════════════════════════════════════════════════
  ❌ Node.js Version Error
═══════════════════════════════════════════════════════════════

  Current version:  Node.js 12.22.9
  Required version: Node.js 18.0.0 or higher

  💡 How to upgrade:

  Using nvm (recommended):
    nvm install 20
    nvm use 20

  Or download from: https://nodejs.org/
═══════════════════════════════════════════════════════════════
```

## 🛠️ Troubleshooting

### Issue: "command not found"

**Problem:** Getting shell errors when running setup scripts.

**Solutions:**

1. **Make sure you're using the right script for your platform:**
   - Linux/WSL: Use `./install-ubuntu.sh` (not `.\scripts\windows\setup.ps1`)
   - Windows: Use `.\scripts\windows\setup.ps1` (in PowerShell, not bash)

2. **Ensure script is executable (Linux/WSL only):**
   ```bash
   chmod +x install-ubuntu.sh
   ./install-ubuntu.sh
   ```

3. **Use npm directly (works everywhere):**
   ```bash
   npm install
   ```

### Issue: Node.js version too old

**Problem:** Getting `npm ERR! code EBADENGINE`

**Solution:** Upgrade Node.js to version 18 or higher:

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
npm install
```

### Issue: WSL Performance

**Problem:** npm install is very slow in WSL.

**Solution:** Make sure you're in the WSL filesystem (not `/mnt/c/`):

```bash
# Check current location
pwd

# Should show: /home/username/...
# NOT: /mnt/c/Users/...

# If in wrong location, move to WSL filesystem:
cd ~/projects
git clone <repo-url>
cd Spotify-echo
npm install  # Much faster!
```

## 📚 Additional Documentation

- **Main Setup Guide:** [README.md](README.md#-quick-start)
- **Detailed Setup:** [SETUP.md](SETUP.md)
- **Ubuntu/WSL Quick Start:** [QUICK-START-UBUNTU-WSL.md](QUICK-START-UBUNTU-WSL.md)
- **Troubleshooting:** [README.md](README.md#-troubleshooting-installation)

## 🎯 Quick Decision Tree

```
Are you on...?

├─ Linux or WSL
│  ├─ Want automated setup? → ./install-ubuntu.sh
│  ├─ Want to check first?  → ./install-guide.sh
│  └─ Want simple?          → npm install
│
├─ Windows (PowerShell)
│  ├─ Want automated setup? → .\scripts\windows\setup.ps1
│  └─ Want simple?          → npm install
│
└─ macOS
   └─ Want simple?          → npm install
```

## ✅ Verification

After installation, verify everything works:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Verify environment
npm run validate:env

# Start the application
npm start

# Access at: http://localhost:3000
```
