# 🔧 Installation Troubleshooting Guide

This guide helps resolve common installation and setup issues for EchoTune AI.

## 📋 Table of Contents

- [Platform-Specific Setup](#platform-specific-setup)
- [Quick Diagnostics](#quick-diagnostics)
- [Node.js Version Issues](#nodejs-version-issues)
- [npm Installation Failures](#npm-installation-failures)
- [Dependency Issues](#dependency-issues)
- [Database Connection Problems](#database-connection-problems)
- [Docker Issues](#docker-issues)
- [MCP Server Issues](#mcp-server-issues)
- [Environment Configuration](#environment-configuration)
- [Getting Help](#getting-help)

## 🖥️ Platform-Specific Setup

### Ubuntu Linux

**Optimized installation for Ubuntu 20.04, 22.04, and 24.04:**

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install build essentials (required for native modules)
sudo apt install -y build-essential python3 python3-pip git curl

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install MongoDB (optional)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install PostgreSQL (optional)
sudo apt install -y postgresql postgresql-contrib

# Clone and setup EchoTune AI
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
npm install
```

### Windows 11 with WSL2 (Recommended)

**Optimized for Windows 11 + WSL2 + Ubuntu:**

```powershell
# In PowerShell (Administrator)
# Install WSL2 with Ubuntu
wsl --install -d Ubuntu-22.04
wsl --set-default-version 2

# Restart Windows, then open Ubuntu terminal
```

```bash
# Inside WSL Ubuntu terminal
# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y build-essential python3 git curl

# Install Node.js 20 via nvm (recommended for WSL)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Clone repository in WSL filesystem (NOT /mnt/c/)
cd ~
mkdir -p projects
cd projects
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Configure Git for line endings
git config core.autocrlf false
git config core.eol lf

# Install dependencies
npm install

# Access from Windows browser at http://localhost:3000
```

**WSL-Specific Optimizations:**

```bash
# Add to ~/.bashrc for better performance
export NODE_OPTIONS="--max-old-space-size=4096"
export NPM_CONFIG_CACHE="$HOME/.npm-cache"

# Disable Windows Defender scanning in WSL (improves npm install speed)
# In PowerShell (Administrator):
# Add-MpPreference -ExclusionProcess "/mnt/c/Windows/System32/wsl.exe"
```

### Native Windows 11 (Without WSL)

**For Windows 11 native development:**

```powershell
# Download and install Node.js 20 LTS from nodejs.org
# https://nodejs.org/en/download/

# Verify installation
node --version
npm --version

# Install Git for Windows
# https://git-scm.com/download/win

# Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Configure npm for Windows
npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"

# Install dependencies
npm install
```

### Generic Linux (Fedora, Arch, etc.)

**For other Linux distributions:**

```bash
# Fedora
sudo dnf install -y nodejs npm git gcc-c++ make python3

# Arch Linux
sudo pacman -S nodejs npm git base-devel python

# openSUSE
sudo zypper install nodejs npm git gcc-c++ make python3

# Verify and install Node 20 if needed
node --version
# If version < 20, use nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

## 🩺 Quick Diagnostics

Run these commands to diagnose your environment:

```bash
# Check Node.js version (must be >=18.0.0)
node --version

# Check npm version (must be >=8.0.0)
npm --version

# Check if MongoDB is accessible (if using local MongoDB)
mongosh --eval "db.adminCommand('ping')"

# Check if PostgreSQL is accessible (if using PostgreSQL)
pg_isready

# Validate environment configuration
npm run validate:env

# Check current Git branch and status
git branch
git status
```

## 🟢 Node.js Version Issues

### Problem: Unsupported Node.js Version

**Error Message:**
```
❌ Node.js Version Error
Current version:  Node.js 12.22.9
Required version: Node.js 18.0.0 or higher
```

or

```
npm ERR! engine Unsupported engine
npm ERR! Required: { node: '>=18.0.0', npm: '>=8.0.0' }
npm ERR! Actual:   { node: 'v12.22.9', npm: '8.5.1' }
```

### Solution: Upgrade Node.js

#### Option 1: Using nvm (Recommended)

```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc on macOS

# Install Node.js 20 LTS (recommended)
nvm install 20

# Use Node.js 20
nvm use 20

# Set as default
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

#### Option 2: Use Project's .nvmrc

The repository includes an `.nvmrc` file specifying the recommended Node version:

```bash
# Install and use the version specified in .nvmrc
nvm install
nvm use

# Or set it as default
nvm use
nvm alias default $(cat .nvmrc)
```

#### Option 3: Direct Installation

- **macOS (Homebrew):**
  ```bash
  brew install node@20
  brew link node@20
  ```

- **Ubuntu/Debian:**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **Windows:**
  - Download from [nodejs.org](https://nodejs.org/)
  - Choose "20.x.x LTS" version
  - Run installer with default options

### Problem: Node.js Too New or Experimental

If you're using a very new or experimental Node version and encounter issues:

```bash
# Switch to stable LTS (Node 20)
nvm install 20
nvm use 20
```

## 📦 npm Installation Failures

### Problem: npm install Fails Partway Through

**Common Errors:**
- `npm ERR! code EINTEGRITY`
- `npm ERR! network request failed`
- `npm ERR! A complete log of this run can be found in...`

### Solution: Clean Installation

```bash
# Step 1: Clean npm cache
npm cache clean --force

# Step 2: Remove existing node_modules and lock file
rm -rf node_modules package-lock.json

# Step 3: Verify Node/npm versions
node --version  # Must be >=18.0.0
npm --version   # Must be >=8.0.0

# Step 4: Clean install (recommended for reproducible builds)
npm ci

# If npm ci fails, try regular install
npm install
```

### Problem: Permission Errors During Installation

**Error:** `EACCES: permission denied`

**Solution:**

```bash
# DO NOT use sudo with npm install in user space

# Option 1: Fix npm permissions (recommended)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 2: Use nvm (preferred - avoids permission issues entirely)
# See Node.js installation section above
```

### Problem: Slow Installation

**Solutions:**

```bash
# Use a faster registry (optional)
npm config set registry https://registry.npmjs.org/

# Increase network timeout
npm config set fetch-timeout 60000

# Use npm ci instead of npm install (much faster with package-lock.json)
npm ci
```

## 🔗 Dependency Issues

### Problem: Deprecated Dependency Warnings

**Example:**
```
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory
```

**Solution:** 

✅ **These warnings are SAFE to ignore.** They come from transitive dependencies (dependencies of dependencies) and do NOT prevent installation or operation of EchoTune AI.

- Your installation will complete successfully
- The application will run normally
- Maintainers will update these in future releases
- You can suppress warnings with: `npm install --loglevel=error`

### Problem: Peer Dependency Warnings

**Example:**
```
npm warn peer zod@"^3.25.76 || ^4.1.8" from @ai-sdk/google@2.0.36
```

**Solution:**

✅ **These warnings are also SAFE to ignore.** The repository uses `zod@^3.25.76` which satisfies most peer dependency requirements. The warnings appear because some optional dependencies prefer zod 4.x, but they work fine with zod 3.x.

### Problem: Missing Peer Dependencies

**Error:** `ERESOLVE unable to resolve dependency tree`

**Solution:**

```bash
# Use legacy peer deps flag (temporary workaround)
npm install --legacy-peer-deps

# Or add to .npmrc (already configured in this project)
echo "legacy-peer-deps=false" >> .npmrc
echo "strict-peer-deps=false" >> .npmrc
```

## 💾 Database Connection Problems

### Problem: MongoDB Connection Failed

**Error:** 
```
MongoServerError: Authentication failed
MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Start MongoDB locally (if installed)
sudo systemctl start mongodb  # Linux
brew services start mongodb-community  # macOS

# Or use MongoDB Atlas (cloud) - edit .env:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/echotune

# Test connection
npm run validate:env
```

### Problem: PostgreSQL Connection Failed

**Error:**
```
Connection terminated unexpectedly
FATAL: password authentication failed
```

**Solution:**

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS

# Test connection with psql
psql -U postgres -h localhost

# Update .env with correct credentials:
POSTGRES_URL=postgresql://username:password@localhost:5432/echotune_ai

# Run Prisma migrations
npm run db:generate
npm run db:migrate
```

## 🐳 Docker Issues

### Problem: Docker Build Fails

**Error:** Build fails or uses wrong Node version

**Solution:**

```bash
# Rebuild with no cache
docker build --no-cache -t echotune-ai:latest .

# Check Docker base image Node version
docker run --rm node:20-alpine node --version

# Build with docker-compose
docker compose up --build --force-recreate

# View build logs
docker compose logs -f app
```

### Problem: Docker Container Exits Immediately

**Solution:**

```bash
# Check container logs
docker compose logs app

# Run container interactively to debug
docker run -it --entrypoint /bin/sh echotune-ai:latest

# Ensure .env file exists and has required variables
ls -la .env
cat .env

# Check Docker health endpoint
curl -fsS http://localhost:3000/health
```

## 🤖 MCP Server Issues

### Problem: MCP Server Errors During Installation

**Error:** Errors related to `@browserbasehq/mcp-server-browserbase` or other MCP servers

**Solution:**

✅ **MCP servers are OPTIONAL features** and should NOT cause installation failures:

1. MCP servers use `npx` for on-demand installation
2. They are NOT installed during `npm install`
3. They are only downloaded when explicitly started

**If MCP features are causing issues:**

```bash
# Disable MCP servers in .env
echo "SKIP_MCP_SERVERS=true" >> .env

# Or skip individual MCP servers
echo "BROWSERBASE_ENABLED=false" >> .env

# MCP servers will be skipped at runtime
npm start
```

**To use MCP features:**

- Ensure Node 18+ is installed
- Set required environment variables (see `.env.example`)
- Review [MCP_SERVERS_INTEGRATION_GUIDE.md](../MCP_SERVERS_INTEGRATION_GUIDE.md)

### Problem: npx Downloads Fail for MCP Servers

**Solution:**

```bash
# Clear npx cache
rm -rf ~/.npm/_npx

# Test npx
npx cowsay "test"

# If behind corporate proxy, configure:
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

## ⚙️ Environment Configuration

### Problem: Missing Environment Variables

**Error:**
```
Error: Missing required environment variable: SPOTIFY_CLIENT_ID
Cannot find module 'dotenv'
```

**Solution:**

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials (use nano, vim, or any text editor)
nano .env

# Minimum required variables:
# - SPOTIFY_CLIENT_ID
# - SPOTIFY_CLIENT_SECRET
# - SPOTIFY_REDIRECT_URI
# - MONGODB_URI or POSTGRES_URL

# Validate environment
npm run validate:env

# Test Spotify credentials
npm run auth:test-credentials
```

### Problem: Environment Variables Not Loading

**Solution:**

```bash
# Ensure .env file exists in project root
ls -la .env

# Check file format (no BOM, Unix line endings)
file .env

# Verify dotenv is installed
npm list dotenv

# If missing, install it
npm install dotenv

# Test loading
node -e "require('dotenv').config(); console.log(process.env.SPOTIFY_CLIENT_ID)"
```

## 🖥️ Platform-Specific Troubleshooting

### Ubuntu/Linux Issues

#### Problem: Permission Denied Errors

**Error:** `EACCES: permission denied, mkdir '/usr/local/lib/node_modules'`

**Solution:**

```bash
# Fix npm permissions (recommended - avoid sudo)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Now install packages without sudo
npm install -g npm@latest
```

#### Problem: Native Module Build Failures

**Error:** `node-gyp rebuild` fails or `make: command not found`

**Solution:**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential python3 python3-pip

# Fedora
sudo dnf install gcc gcc-c++ make python3

# Arch
sudo pacman -S base-devel python

# Then reinstall
npm ci
```

### Windows 11 WSL Issues

#### Problem: Slow npm install in WSL

**Cause:** Repository stored in Windows filesystem (`/mnt/c/`)

**Solution:**

```bash
# WRONG - Slow (Windows filesystem)
cd /mnt/c/Users/YourName/Projects/Spotify-echo

# CORRECT - Fast (WSL Linux filesystem)
cd ~/projects/Spotify-echo

# If repo is in wrong location, move it:
mv /mnt/c/Users/YourName/Projects/Spotify-echo ~/projects/
cd ~/projects/Spotify-echo
npm ci  # Much faster now!
```

#### Problem: File Watching Doesn't Work

**Symptoms:** `nodemon` or `npm run dev` doesn't reload on file changes

**Solution:**

```bash
# Increase inotify watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify
cat /proc/sys/fs/inotify/max_user_watches
```

#### Problem: Line Ending Issues (CRLF vs LF)

**Error:** `unexpected token` or script execution failures

**Solution:**

```bash
# Configure Git for WSL
git config --global core.autocrlf false
git config --global core.eol lf

# Fix existing files
dos2unix setup-wsl.sh  # If you have dos2unix
# OR
sed -i 's/\r$//' setup-wsl.sh  # Using sed

# Re-clone repository with correct settings
cd ~/projects
rm -rf Spotify-echo
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
npm install
```

#### Problem: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use fuser (if available)
fuser -k 3000/tcp
```

#### Problem: Cannot Access localhost from Windows

**Symptoms:** Can't open `http://localhost:3000` in Windows browser

**Solution:**

```bash
# Check WSL IP address
ip addr show eth0 | grep inet

# Use WSL IP instead
# Example: http://172.20.10.5:3000

# Or configure WSL networking (Windows 11 22H2+)
# Add to ~/.wslconfig in Windows:
[wsl2]
networkingMode=mirrored
```

### Native Windows Issues

#### Problem: Script Execution Policy

**Error:** `cannot be loaded because running scripts is disabled`

**Solution:**

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Verify
Get-ExecutionPolicy
```

#### Problem: Long Path Issues

**Error:** `ENAMETOOLONG` or paths over 260 characters

**Solution:**

```powershell
# Enable long paths (Windows 10+)
# Run PowerShell as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Or via Group Policy:
# gpedit.msc → Computer Configuration → Administrative Templates 
# → System → Filesystem → Enable Win32 long paths
```

#### Problem: Symlink Creation Failures

**Error:** `EPERM: operation not permitted, symlink`

**Solution:**

```powershell
# Enable Developer Mode (Windows 10+)
# Settings → Update & Security → For developers → Developer mode ON

# Or run terminal as Administrator
```

### Docker Platform Issues

#### Problem: Docker Build Fails on ARM (M1/M2 Mac)

**Solution:**

```bash
# Build for linux/amd64 explicitly
docker build --platform linux/amd64 -t echotune-ai:latest .

# Or in docker-compose.yml, add:
# platform: linux/amd64
```

#### Problem: Docker on WSL2 Performance

**Solution:**

```bash
# Store Dockerfile and project in WSL filesystem
# NOT in /mnt/c/

# Optimize Docker Desktop settings:
# - Enable WSL 2 integration
# - Limit resources: Memory 4GB, CPUs 2-4
```

## 🆘 Getting Help

If you're still experiencing issues after trying these solutions:

### Before Opening an Issue

1. **Search existing issues:** [GitHub Issues](https://github.com/primoscope/Spotify-echo/issues)
2. **Check documentation:**
   - [README.md](../README.md) - Quick start and overview
   - [CONTRIBUTING.md](../CONTRIBUTING.md) - Development setup
   - [docs/DEVELOPMENT.md](DEVELOPMENT.md) - Detailed development guide

### When Opening a New Issue

Include this diagnostic information:

```bash
# System information
echo "OS: $(uname -a)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Shell: $SHELL"

# Check for .nvmrc
cat .nvmrc

# Package versions
npm list --depth=0 2>/dev/null | head -20

# Git status
git branch
git log --oneline -n 5
```

**What to include in your issue:**

1. ✅ Full error message (not just last line)
2. ✅ Steps to reproduce the error
3. ✅ System information (OS, Node, npm versions)
4. ✅ What you've already tried
5. ❌ Don't include API keys or secrets

### Community Support

- **GitHub Discussions:** Ask questions and share tips
- **Pull Requests:** Contribute fixes and improvements
- **Documentation:** Help improve guides and troubleshooting

---

## 📚 Additional Resources

- **Node.js Installation:** https://nodejs.org/
- **nvm (Node Version Manager):** https://github.com/nvm-sh/nvm
- **npm Documentation:** https://docs.npmjs.com/
- **MongoDB Atlas:** https://www.mongodb.com/atlas
- **PostgreSQL Downloads:** https://www.postgresql.org/download/
- **Docker Documentation:** https://docs.docker.com/

---

**Last Updated:** 2025-11-19  
**Supported Node Versions:** 18.x, 20.x, 22.x  
**Recommended Node Version:** 20.x LTS
