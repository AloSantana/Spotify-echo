# Windows Setup Guide for EchoTune AI

This guide provides comprehensive instructions for setting up, running, and testing EchoTune AI on Windows hosts.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Docker on Windows](#docker-on-windows)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed on your Windows machine:

### Required

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git for Windows** - [Download from git-scm.com](https://git-scm.com/download/win)

### Optional

- **Python 3.8+** - [Download from python.org](https://www.python.org/downloads/) (for ML features)
- **Docker Desktop** - [Download from docker.com](https://www.docker.com/products/docker-desktop) (for containerized deployment)

### PowerShell

Windows PowerShell 5.1+ or PowerShell 7+ is recommended. PowerShell comes pre-installed on Windows 10/11.

To check your PowerShell version:
```powershell
$PSVersionTable.PSVersion
```

## Quick Start

1. **Clone the repository:**
   ```powershell
   git clone https://github.com/primoscope/Spotify-echo.git
   cd Spotify-echo
   ```

2. **Run the setup script:**
   ```powershell
   .\scripts\windows\setup.ps1
   ```

3. **Edit your `.env` file with your configuration**

4. **Start the application:**
   ```powershell
   .\scripts\windows\run.ps1
   ```

5. **Open your browser to** `http://localhost:3000`

## Setup

### Automated Setup (Recommended)

Run the setup script in PowerShell:

```powershell
.\scripts\windows\setup.ps1
```

This script will:
- Check for required dependencies (Node.js, npm)
- Check for optional dependencies (Python)
- Create `.env` file from template if needed
- Install Node.js dependencies
- Install Python dependencies (if Python is available)
- Install Playwright browsers for E2E testing

### Manual Setup

If you prefer to set up manually:

1. **Install Node.js dependencies:**
   ```powershell
   npm ci
   ```

2. **Create environment file:**
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your configuration
   notepad .env
   ```

3. **Install Python dependencies (optional):**
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Install Playwright browsers:**
   ```powershell
   npm run playwright:install
   ```

## Running the Application

### Using PowerShell Script (Recommended)

```powershell
.\scripts\windows\run.ps1
```

### Using npm

```powershell
npm start
```

The application will start on `http://localhost:3000` by default.

### Development Mode with Auto-Reload

```powershell
npm run dev
```

This starts the server with nodemon, which automatically restarts when you make changes.

## Testing

### Running Smoke Tests

Using PowerShell script:
```powershell
.\scripts\windows\test.ps1 -Type smoke
```

Or using npm:
```powershell
# Start the server first
npm start

# In another terminal, run smoke tests
npm run test:e2e:smoke
```

### Running All E2E Tests

```powershell
.\scripts\windows\test.ps1 -Type e2e
```

### Running Unit Tests

```powershell
.\scripts\windows\test.ps1 -Type unit
```

### Running All Tests

```powershell
.\scripts\windows\test.ps1 -Type all
```

## Docker on Windows

### Prerequisites for Docker

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Enable WSL 2 (Windows Subsystem for Linux 2) if prompted
3. Ensure Docker is running (check system tray)

### Building Docker Image

Using PowerShell script:
```powershell
.\scripts\windows\docker.ps1 -Action build
```

Or using docker command directly:
```powershell
docker build -t spotify-echo:local .
```

### Running Docker Container

Using PowerShell script:
```powershell
.\scripts\windows\docker.ps1 -Action run
```

Or using docker command with `.env` file:
```powershell
docker run -d --name spotify-echo-app --env-file .env -p 3000:3000 spotify-echo:local
```

### Checking Container Logs

```powershell
.\scripts\windows\docker.ps1 -Action logs
```

Or:
```powershell
docker logs spotify-echo-app
```

### Stopping Container

```powershell
.\scripts\windows\docker.ps1 -Action stop
```

Or:
```powershell
docker stop spotify-echo-app
docker rm spotify-echo-app
```

### Cleaning Up

```powershell
.\scripts\windows\docker.ps1 -Action clean
```

## Environment Variables

### Using .env File (Recommended)

EchoTune AI uses the `.env` file at the repository root as the canonical configuration source.

1. **Create `.env` from template:**
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Edit `.env` with your configuration:**
   ```powershell
   notepad .env
   ```

3. **Required variables:**
   - `PORT` - Server port (default: 3000)
   - `NODE_ENV` - Environment (development/production)

4. **Optional variables for full features:**
   - `SPOTIFY_CLIENT_ID` - Your Spotify application client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify application client secret
   - Various AI API keys (OpenAI, Gemini, etc.)

### .env File Structure

The `.env` file should contain key-value pairs:
```env
PORT=3000
NODE_ENV=development
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### Using Environment Variables Directly

You can also set environment variables in PowerShell:

```powershell
$env:PORT = "3000"
$env:NODE_ENV = "production"
npm start
```

Or use the cross-env npm package (automatically handled by npm scripts):
```powershell
npm run start:ci
```

## Troubleshooting

### Line Ending Issues

If you encounter issues with shell scripts, it may be due to line ending differences between Windows (CRLF) and Unix (LF).

**Solution:** The repository includes a `.gitattributes` file that automatically handles line endings. If you cloned the repository before this file was added:

```powershell
# Refresh line endings
git rm --cached -r .
git reset --hard
```

### PowerShell Execution Policy

If you get an error running PowerShell scripts:

```
cannot be loaded because running scripts is disabled on this system
```

**Solution:** Update your execution policy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use

If port 3000 is already in use:

1. **Find the process:**
   ```powershell
   netstat -ano | findstr :3000
   ```

2. **Kill the process:**
   ```powershell
   taskkill /PID <PID> /F
   ```

Or use a different port:
```powershell
$env:PORT = "3001"
npm start
```

### npm ci Fails

If `npm ci` fails:

1. **Delete lock file and node_modules:**
   ```powershell
   Remove-Item package-lock.json
   Remove-Item -Recurse -Force node_modules
   ```

2. **Reinstall:**
   ```powershell
   npm install
   ```

### Docker Build Fails

Common issues:

1. **Docker not running:** Ensure Docker Desktop is running
2. **WSL 2 not enabled:** Follow Docker Desktop's prompts to enable WSL 2
3. **Disk space:** Ensure you have sufficient disk space

**Check Docker:**
```powershell
docker --version
docker ps
```

### Playwright Tests Fail

If Playwright tests fail:

1. **Reinstall browsers:**
   ```powershell
   npm run playwright:install
   ```

2. **Check if server is running:**
   ```powershell
   curl http://localhost:3000/healthz
   ```

3. **Run with debug output:**
   ```powershell
   $env:DEBUG = "pw:api"
   npm run test:e2e:smoke
   ```

## Additional Resources

- [Main README](../README.md) - General project documentation
- [Docker Documentation](https://docs.docker.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/primoscope/Spotify-echo/issues)
2. Review the [Troubleshooting](#troubleshooting) section
3. Check container logs: `docker logs spotify-echo-app`
4. Open a new issue with details about your problem

## Contributing

Contributions to improve Windows support are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
