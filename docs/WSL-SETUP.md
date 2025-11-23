# Windows WSL Setup Guide for EchoTune AI

This guide provides step-by-step instructions for setting up and running EchoTune AI on Windows using WSL (Windows Subsystem for Linux) with Ubuntu.

## Prerequisites

### 1. Install WSL and Ubuntu
```bash
# In Windows PowerShell (as Administrator)
wsl --install

# Or install a specific Ubuntu version
wsl --install -d Ubuntu-22.04
```

Restart your computer after installation.

### 2. Update Ubuntu
```bash
# In WSL Ubuntu terminal
sudo apt update && sudo apt upgrade -y
```

### 3. Install Node.js (using nvm - recommended)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js 20.x (required)
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

### 4. Install PostgreSQL

**Option A: Using Docker (Recommended)**
```bash
# Install Docker Desktop for Windows with WSL 2 backend
# Then in WSL:
docker run --name echotune-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=echotune \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps
```

**Option B: Native PostgreSQL in WSL**
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo service postgresql start

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE echotune;
CREATE USER echotune WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE echotune TO echotune;
\q
EOF
```

### 5. Install MongoDB (Optional)
MongoDB is optional - the app has SQLite fallback if MongoDB is not available.

```bash
# Option A: Docker (Recommended)
docker run --name echotune-mongo \
  -p 27017:27017 \
  -d mongo:7

# Option B: Native installation
# Follow MongoDB installation guide for Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
```

## EchoTune AI Setup

### 1. Clone the Repository
```bash
cd ~
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your settings
nano .env
```

**Minimal Required Configuration:**
```bash
# Required for Prisma
POSTGRES_URL=postgresql://echotune:password@localhost:5432/echotune

# Optional - for Spotify features
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# Optional - for AI features
GEMINI_API_KEY=your_gemini_api_key_here

# Disable optional features for testing
ENABLE_TRACING=false
ENABLE_AGENTOPS=false
```

**Get Spotify Credentials:**
1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Add `http://localhost:3000/auth/callback` to Redirect URIs
4. Copy Client ID and Client Secret to .env

**Get Gemini API Key (Free):**
1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Add to .env file

### 3. Install Dependencies
```bash
# Install all npm packages
npm install

# This will automatically run Prisma client generation if POSTGRES_URL is set
```

### 4. Initialize Database
```bash
# Generate Prisma client (if not done automatically)
npm run db:generate

# Sync database schema
npm run db:push

# Or use the combined init script
npm run db:init
```

### 5. Start the Server
```bash
# Development mode with hot reload
npm run dev

# Or production mode
npm start
```

The server should start on http://localhost:3000

### 6. Verify Installation
Open your browser and go to:
- **Health Check**: http://localhost:3000/health
- **Main App**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs

## Troubleshooting

### Error: "Prisma client did not initialize yet"
```bash
# Solution 1: Ensure POSTGRES_URL is set
echo $POSTGRES_URL

# Solution 2: Manually generate Prisma client
npm run db:generate

# Solution 3: Run full database setup
npm run db:init
```

### Error: "OpenTelemetry tracing error"
This is a non-fatal warning. To disable it:
```bash
# Add to .env
ENABLE_TRACING=false
```

### Error: "ECONNREFUSED ::1:5432"
PostgreSQL is not running or connection string is incorrect.

```bash
# Check if PostgreSQL is running (Docker)
docker ps | grep postgres

# Check if PostgreSQL is running (Native)
sudo service postgresql status

# Start PostgreSQL (Native)
sudo service postgresql start

# Test connection
psql postgresql://echotune:password@localhost:5432/echotune -c "SELECT version();"
```

### Error: "MongoDB connection failed"
MongoDB is optional. The app will use SQLite fallback automatically. If you see:
```
✅ SQLite fallback database ready
📦 Database running in fallback mode (sqlite)
```
This is normal and the app will work fine.

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### WSL File System Performance
For better performance, keep your project files in the WSL filesystem (`/home/username/`), not in Windows filesystem (`/mnt/c/`).

```bash
# Good
cd ~/Spotify-echo

# Slower (avoid)
cd /mnt/c/Users/YourName/Projects/Spotify-echo
```

### Environment Variables Not Loading
```bash
# Ensure .env file exists
ls -la .env

# Check file permissions
chmod 600 .env

# Manually load .env for testing
export $(cat .env | grep -v '^#' | xargs)
```

## Development Workflow

### Daily Workflow
```bash
# 1. Start PostgreSQL (if using Docker)
docker start echotune-postgres

# 2. Start MongoDB (optional)
docker start echotune-mongo

# 3. Start the development server
npm run dev

# 4. Make changes - server will auto-reload
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Database Management
```bash
# View database with Prisma Studio
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create a new migration
npm run db:migrate

# Push schema changes without migration
npm run db:push
```

## Performance Tips for WSL

1. **Use WSL 2** (default on recent Windows versions)
   ```bash
   wsl --set-version Ubuntu-22.04 2
   ```

2. **Allocate more resources to WSL** (edit `%UserProfile%\.wslconfig`):
   ```ini
   [wsl2]
   memory=8GB
   processors=4
   ```

3. **Keep files in WSL filesystem** for better I/O performance

4. **Use Windows Terminal** for better terminal experience

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [WSL Documentation](https://docs.microsoft.com/en-us/windows/wsl/)
- [Docker Documentation](https://docs.docker.com/)

## Getting Help

If you encounter issues:
1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Create a new issue with:
   - Your WSL Ubuntu version
   - Node.js version (`node --version`)
   - Error messages
   - Steps to reproduce
