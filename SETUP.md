# EchoTune AI - Setup Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js 18.0.0 or higher** (20.x LTS recommended)
- **npm 8.0.0 or higher**
- **Spotify Developer Account** (free)

### Platform-Specific Setup

#### Linux / Ubuntu / WSL

```bash
# 1. Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# 2. Install dependencies (simplest approach)
npm install

# OR use automated setup script
./install-ubuntu.sh

# 3. Configure environment
cp .env.example .env
nano .env  # Add your Spotify credentials

# 4. Start the app
npm start
```

#### Windows (PowerShell)

```powershell
# 1. Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# 2. Run setup script
.\scripts\windows\setup.ps1

# OR install manually
npm install

# 3. Configure environment
copy .env.example .env
notepad .env  # Add your Spotify credentials

# 4. Start the app
npm start
```

#### macOS

```bash
# 1. Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
nano .env  # Add your Spotify credentials

# 4. Start the app
npm start
```

## Common Issues

### Error: Node.js Version Incompatibility

**Problem:**
```
npm ERR! code EBADENGINE
npm ERR! engine Unsupported engine
npm ERR! Required: { node: '>=18.0.0', npm: '>=8.0.0' }
npm ERR! Actual:   { npm: '8.5.1', node: 'v12.22.9' }
```

**Cause**: Your Node.js version is too old (requires >=18.0.0).

**Solution:**
```bash
# Check current version
node --version

# Install Node.js 20.x using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Now install dependencies
npm install
```

### Error: "Cannot find module 'dotenv'"

**Cause**: Dependencies not installed after cloning/pulling the repository.

**Solution**:
```bash
npm install
```

### Error: Setup Script "command not found"

**Problem:** Getting errors when trying to run setup scripts

**Common Cases:**

1. **Trying to run PowerShell script from bash:**
   ```bash
   # ❌ WRONG (in bash/WSL)
   .\scripts\windows\setup.ps1
   # Error: .scriptswindowssetup.ps1: command not found
   ```
   
   **Solution:**
   ```bash
   # ✅ Use the correct script for Linux/WSL
   ./install-ubuntu.sh
   
   # OR just use npm directly
   npm install
   ```

2. **Script not executable:**
   ```bash
   # Make script executable
   chmod +x install-ubuntu.sh
   ./install-ubuntu.sh
   ```

3. **Wrong directory:**
   ```bash
   # Make sure you're in the project root
   pwd  # Should show: .../Spotify-echo
   ls   # Should show: package.json, README.md, etc.
   ```

### Error: "Prisma client not initialized"

**Cause**: Prisma client needs to be generated before first use.

**Solution**:
```bash
npx prisma generate --schema=./prisma/schema.prisma
```

### Error: "Maximum call stack size exceeded"

**Cause**: Circular reference in environment variables.

**Solution**: Check your `.env` file for variables that reference themselves:
```bash
# BAD - causes infinite loop
OPENAI_API_KEY=${OPENAI_API_KEY}

# GOOD - comment out or set actual value
# OPENAI_API_KEY=your-key-here
```

### MongoDB Connection Failed

**Cause**: MongoDB not running or incorrect connection string.

**Solution**: 
- The app will use SQLite fallback automatically
- Or configure correct MONGODB_URI in .env file

### Installation Dependencies

If you encounter the error: `Cannot find module 'dotenv'`, follow these steps:

1. **Install Dependencies:**
   ```bash
   npm install
   ```
   This installs all required dependencies including:
   - dotenv (environment variable management)
   - express (web server)
   - All other dependencies listed in package.json

2. **Configure Environment Variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your actual configuration
   nano .env  # or use your preferred editor
   ```

3. **Generate Prisma Client (if using PostgreSQL):**
   ```bash
   npx prisma generate --schema=./prisma/schema.prisma
   ```

4. **Start the Server:**
   ```bash
   npm start
   ```

## Detailed Setup Instructions

See the main [README.md](README.md) for comprehensive setup instructions including:
- Spotify API configuration
- Database setup (MongoDB, PostgreSQL, Redis)
- AI provider configuration
- Docker deployment
- Troubleshooting guide

## Development Workflow

1. **First time setup**:
   ```bash
   git clone <repository>
   cd Spotify-echo
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npx prisma generate
   npm start
   ```

2. **After pulling updates**:
   ```bash
   git pull
   npm install  # Install any new dependencies
   npx prisma generate  # Regenerate Prisma client if schema changed
   npm start
   ```

3. **Running tests**:
   ```bash
   npm test          # Run all tests
   npm run test:unit # Run unit tests only
   npm run lint      # Check code quality
   ```

## Environment Variables

Required environment variables are defined in `.env.example`. At minimum, you need:

- `JWT_SECRET` - Secret for JWT token signing
- `MONGODB_URI` - MongoDB connection string (optional, will use SQLite fallback)
- `DATABASE_URL` - PostgreSQL URL for Prisma (optional)

For full list of environment variables, see `.env.example`.

## Getting Help

- Check existing issues on GitHub
- Review the main README.md for detailed documentation
- Ensure all dependencies are installed with `npm install`
