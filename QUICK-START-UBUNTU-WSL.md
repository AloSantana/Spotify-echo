# 🚀 Quick Start: Ubuntu & Windows 11 WSL

This guide gets you up and running on **Ubuntu** (native or WSL) in under 5 minutes.

## ⚡ Simple Installation (Recommended)

### Just use npm install!

```bash
# Install Node.js 20.x first (if needed)
node --version  # Check if you have v20.x.x

# Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Install dependencies - that's it!
npm install

# Start the app
npm start
```

**That's all you need!** The project handles everything automatically.

---

## 🛠️ Optional Helper Scripts

Only use these if you need help:

### Option 1: Check What Dependencies You Need

```bash
./install-guide.sh
```

Shows what's missing and how to install it.

### Option 2: Fully Automated Setup (if you prefer automation)

```bash
./install-ubuntu.sh
```

Installs everything automatically (Node.js, build tools, etc.)

### Option 3: Test npm install First

```bash
./test-npm-install.sh
```

Verifies npm install will work before running it.

---

## 🪟 Windows 11 WSL Setup

### Step 1: Install WSL (if not already installed)

In **PowerShell** (as Administrator):

```powershell
wsl --install -d Ubuntu-22.04
wsl --set-default-version 2
```

Restart Windows, then open Ubuntu terminal.

### Step 2: Install Node.js 20.x (in WSL Ubuntu terminal)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Verify
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### Step 3: Important - Use WSL Filesystem!

⚠️ **CRITICAL:** Clone the repo in WSL filesystem, NOT Windows filesystem!

```bash
# ❌ WRONG - Windows filesystem (SLOW - 2-3 minutes npm install)
cd /mnt/c/Users/YourName/Projects

# ✅ RIGHT - WSL filesystem (FAST - 20-30 seconds npm install)
cd ~
mkdir -p projects
cd projects
```

### Step 4: Clone and Install

```bash
# Clone repository (in WSL filesystem!)
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Just run npm install - that's it!
npm install

# Start the app
npm start
```

Access from Windows browser: http://localhost:3000

---

## 🐧 Native Ubuntu Setup

### Standard Installation

```bash
# 1. Install Node.js 20.x (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# 2. Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# 3. Install dependencies
npm install

# 4. Start the app
npm start
```

That's it! No scripts needed.

---

## 🔧 Verification

After installation, verify everything works:

```bash
# Check versions
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x

# Test npm install
./test-npm-install.sh

# Verify environment
npm run validate:env
```

---

## 🎵 Start the Application

```bash
# Copy environment template
cp .env.example .env

# Edit with your Spotify credentials
nano .env

# Start the application
npm start

# Access at: http://localhost:3000
```

From Windows (if using WSL), access in your Windows browser:
- http://localhost:3000

---

## ⚡ Performance Tips

### WSL Performance

```bash
# Make sure you're in WSL filesystem
pwd  # Should show /home/username/...

# NOT in Windows filesystem
pwd  # Should NOT show /mnt/c/...

# If in wrong location, move to WSL:
cd ~/projects
```

### npm install Speed

| Location | Time | Status |
|----------|------|--------|
| WSL filesystem (`~/projects`) | ~20-30s | ✅ FAST |
| Windows filesystem (`/mnt/c/`) | ~2-3min | ❌ SLOW |
| Native Ubuntu | ~15-25s | ✅ FASTEST |

### Optimization Script Applied

The installer adds these to your `~/.bashrc`:

```bash
# Node.js memory optimization
export NODE_OPTIONS="--max-old-space-size=4096"

# npm cache optimization
export NPM_CONFIG_CACHE="$HOME/.npm-cache"
```

Reload: `source ~/.bashrc`

---

## 🐛 Troubleshooting

### npm install fails

```bash
# Clean and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# OR use npm ci (faster, cleaner)
npm ci
```

### Permission errors

```bash
# Fix npm permissions (never use sudo!)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### File watching not working (WSL)

```bash
# Increase watchers (already done by install-ubuntu.sh)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Wrong Node version

```bash
# Check current version
node --version

# Install Node 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 📚 Additional Resources

- **Full Troubleshooting:** `./docs/INSTALLATION_TROUBLESHOOTING.md`
- **Contributing Guide:** `./CONTRIBUTING.md`
- **Installation Status:** `./INSTALLATION_STATUS.md`
- **Main README:** `./README.md`

---

## 🎯 Quick Commands Reference

```bash
# Primary Installation Method
npm install                  # Install all dependencies
npm start                    # Start application
npm test                     # Run tests

# Development
npm run dev                  # Development mode with hot reload

# Verification
npm run validate:env         # Check environment
npm run validate:all         # Full validation

# Useful
npm run auth:url             # Get Spotify auth URL
npm run auth:test-credentials # Test Spotify API

# Optional Helper Scripts (only if needed)
./install-guide.sh           # Check what dependencies you need
./install-ubuntu.sh          # Automated Ubuntu/WSL setup
./test-npm-install.sh        # Test npm install compatibility
```

---

## ✅ Installation Complete Checklist

- [ ] Node.js 20.x installed
- [ ] npm 10.x installed
- [ ] Repository cloned (in WSL filesystem if using WSL)
- [ ] npm install completed successfully
- [ ] .env file configured with Spotify credentials
- [ ] Application starts with `npm start`
- [ ] Accessible at http://localhost:3000

---

**Questions?** Check `./docs/INSTALLATION_TROUBLESHOOTING.md` or open an issue.

**Happy coding! 🎵**
