#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run script for EchoTune AI on Windows
.DESCRIPTION
    Starts the EchoTune AI server on Windows hosts
.EXAMPLE
    .\scripts\windows\run.ps1
#>

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting EchoTune AI Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "Run setup first: .\scripts\windows\setup.ps1" -ForegroundColor Yellow
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules not found. Installing dependencies..." -ForegroundColor Red
    npm ci
}

# Start the server
Write-Host "🌐 Starting server on http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    npm start
} catch {
    Write-Host ""
    Write-Host "❌ Server stopped with error" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
