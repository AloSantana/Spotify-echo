#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup script for EchoTune AI on Windows
.DESCRIPTION
    Installs dependencies and sets up the development environment for Windows hosts
.EXAMPLE
    .\scripts\windows\setup.ps1
#>

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "🚀 EchoTune AI - Windows Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
    
    # Parse version and check if it meets requirements
    $versionNumber = $nodeVersion -replace 'v', ''
    $majorVersion = [int]($versionNumber -split '\.')[0]
    
    if ($majorVersion -lt 18) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host "  ❌ Node.js Version Error" -ForegroundColor Red
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Current version:  Node.js $versionNumber" -ForegroundColor Red
        Write-Host "  Required version: Node.js 18.0.0 or higher" -ForegroundColor Red
        Write-Host ""
        Write-Host "  This project requires Node.js 18 or higher." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  💡 How to upgrade:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  1. Download Node.js 20.x LTS from: https://nodejs.org/" -ForegroundColor White
        Write-Host "  2. Run the installer and follow the prompts" -ForegroundColor White
        Write-Host "  3. Restart PowerShell and run this script again" -ForegroundColor White
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm installation
Write-Host "📦 Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
    
    # Parse npm version and check if it meets requirements
    $npmVersionNumber = $npmVersion
    $npmMajorVersion = [int]($npmVersionNumber -split '\.')[0]
    
    if ($npmMajorVersion -lt 8) {
        Write-Host "⚠️  npm version $npmVersion is older than required (8.0.0+)" -ForegroundColor Yellow
        Write-Host "    Upgrade recommended: npm install -g npm@latest" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ npm not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Python installation (optional)
Write-Host "📦 Checking Python installation (optional)..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Python not found. Some features may require Python 3.8+" -ForegroundColor Yellow
}

# Check for .env file
Write-Host ""
Write-Host "🔐 Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Write-Host "📋 Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created. Please edit it with your configuration." -ForegroundColor Green
    } else {
        Write-Host "⚠️  No .env.example found. You may need to create .env manually." -ForegroundColor Yellow
    }
}

# Install Node.js dependencies
Write-Host ""
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
try {
    npm ci
    Write-Host "✅ Node.js dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Install Python dependencies if requirements.txt exists
if (Test-Path "requirements.txt") {
    Write-Host ""
    Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
    try {
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        Write-Host "✅ Python dependencies installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Failed to install Python dependencies (optional)" -ForegroundColor Yellow
    }
}

# Install Playwright browsers
Write-Host ""
Write-Host "🌐 Installing Playwright browsers..." -ForegroundColor Yellow
try {
    npm run playwright:install
    Write-Host "✅ Playwright browsers installed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Failed to install Playwright browsers. Run manually: npm run playwright:install" -ForegroundColor Yellow
}

# Success message
Write-Host ""
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env file with your configuration" -ForegroundColor White
Write-Host "  2. Run the app: .\scripts\windows\run.ps1" -ForegroundColor White
Write-Host "  3. Run tests: .\scripts\windows\test.ps1" -ForegroundColor White
Write-Host ""
