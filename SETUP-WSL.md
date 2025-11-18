# EchoTune AI - WSL Setup Guide (Ubuntu on Windows 11/12)

## Prerequisites

### 1. Enable WSL on Windows 11/12

Open PowerShell as Administrator and run:

```powershell
# Enable WSL
wsl --install

# Or if WSL is already installed, update it
wsl --update

# Install Ubuntu (default) or specific version
wsl --install -d Ubuntu-22.04
```

Restart your computer when prompted.

### 2. Verify WSL Installation

Open Ubuntu from Start Menu or Windows Terminal:

```bash
# Check WSL version (should be WSL 2)
wsl -l -v

# Check Ubuntu version
lsb_release -a
```

## Automated Setup (Recommended)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Run the automated setup script
chmod +x setup-wsl.sh
./setup-wsl.sh
```

The script will automatically:
- ✅ Install Node.js 20.x LTS
- ✅ Install MongoDB (optional)
- ✅ Install Redis (optional)
- ✅ Install all npm dependencies
- ✅ Configure environment variables
- ✅ Generate Prisma client
- ✅ Run initial validation
- ✅ Test the server startup

## Manual Setup (Step by Step)

### Step 1: Update System Packages

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl git wget
```

### Step 2: Install Node.js 20.x LTS

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 3: Install MongoDB (Optional)

MongoDB is optional - the app will use SQLite as a fallback.

```bash
# Import MongoDB public GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list and install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### Step 4: Install Redis (Optional)

Redis is optional - the app will use in-memory caching as a fallback.

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis to start on boot
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Test Redis
redis-cli ping  # Should return PONG
```

### Step 5: Clone and Setup the Project

```bash
# Clone the repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Install Node.js dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables (use nano or vim)
nano .env
```

### Step 6: Configure Environment Variables

Edit `.env` file with your configuration:

```bash
# Required variables
JWT_SECRET=your-secret-key-here-change-this
NODE_ENV=development
PORT=3000

# MongoDB (if installed)
MONGODB_URI=mongodb://localhost:27017/echotune

# Redis (if installed)
REDIS_URL=redis://localhost:6379

# Spotify API (get from https://developer.spotify.com)
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Database URL for Prisma (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/echotune

# Optional: AI Service Keys
# OPENAI_API_KEY=your-openai-key
# GEMINI_API_KEY=your-gemini-key
```

### Step 7: Generate Prisma Client

```bash
# Generate Prisma client
npx prisma generate --schema=./prisma/schema.prisma
```

### Step 8: Start the Server

```bash
# Start in development mode
npm start

# Or use nodemon for auto-restart
npm run dev
```

The server should start at `http://localhost:3000`

## WSL-Specific Tips

### Accessing from Windows Browser

The app will be accessible at:
- `http://localhost:3000` (from Windows)
- `http://127.0.0.1:3000` (from Windows)
- `http://$(hostname -I | awk '{print $1}'):3000` (from network)

### File System Performance

For best performance, keep your project in the WSL file system:

```bash
# Good ✅ - Fast
/home/username/Spotify-echo

# Avoid ❌ - Slower
/mnt/c/Users/username/Spotify-echo
```

### WSL Integration with VS Code

Install VS Code extensions:
1. **Remote - WSL** (Microsoft)
2. **Remote Development** (Microsoft)

Open project in VS Code from WSL:
```bash
cd ~/Spotify-echo
code .
```

### Port Forwarding

Windows 11/12 automatically forwards WSL ports. Check with:

```powershell
# In PowerShell
netstat -ano | findstr :3000
```

### Service Management

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Stop MongoDB
sudo systemctl stop mongod

# Restart MongoDB
sudo systemctl restart mongod

# Same commands for Redis
sudo systemctl status redis-server
```

## Troubleshooting

### Issue: "Cannot find module 'dotenv'"

```bash
# Solution: Install dependencies
npm install
```

### Issue: MongoDB connection failed

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Or use SQLite fallback (no configuration needed)
```

### Issue: Port 3000 already in use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
PORT=3001 npm start
```

### Issue: "Permission denied" errors

```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ~/Spotify-echo
```

### Issue: WSL file system is slow

```bash
# Move project to WSL file system
mv /mnt/c/Users/yourname/Spotify-echo ~/Spotify-echo
cd ~/Spotify-echo
```

### Issue: Node.js version is too old

```bash
# Remove old Node.js
sudo apt remove nodejs npm

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Development Workflow

### Starting Development

```bash
# 1. Open WSL terminal
cd ~/Spotify-echo

# 2. Pull latest changes
git pull

# 3. Install/update dependencies
npm install

# 4. Regenerate Prisma client if schema changed
npx prisma generate

# 5. Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database Management

```bash
# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_migration_name

# View database in Prisma Studio
npx prisma studio
```

## Performance Optimization

### WSL 2 Configuration

Create or edit `%UserProfile%\.wslconfig` on Windows:

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
localhostForwarding=true
```

Restart WSL:
```powershell
wsl --shutdown
```

### Node.js Performance

```bash
# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Regenerate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Restart server
npm start
```

## Uninstallation

### Remove Application

```bash
cd ~
rm -rf Spotify-echo
```

### Remove Services (Optional)

```bash
# Remove MongoDB
sudo systemctl stop mongod
sudo systemctl disable mongod
sudo apt remove mongodb-org
sudo rm -rf /var/log/mongodb
sudo rm -rf /var/lib/mongodb

# Remove Redis
sudo systemctl stop redis-server
sudo systemctl disable redis-server
sudo apt remove redis-server
```

## Additional Resources

- [WSL Documentation](https://docs.microsoft.com/en-us/windows/wsl/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [MongoDB Installation Guide](https://www.mongodb.com/docs/manual/installation/)
- [Redis Quick Start](https://redis.io/docs/getting-started/)
- [VS Code WSL Guide](https://code.visualstudio.com/docs/remote/wsl)

## Getting Help

- Check existing issues on GitHub
- Review the main README.md
- See SETUP.md for general setup information
- Join our Discord community (if available)

## Quick Reference Commands

```bash
# Start services
sudo systemctl start mongod redis-server

# Stop services
sudo systemctl stop mongod redis-server

# Check service status
sudo systemctl status mongod redis-server

# Development server
npm run dev

# Production server
npm start

# Run tests
npm test

# Check logs
tail -f logs/app.log
```
