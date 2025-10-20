#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test script for EchoTune AI on Windows
.DESCRIPTION
    Runs tests for EchoTune AI on Windows hosts
.PARAMETER Type
    Type of tests to run: 'unit', 'integration', 'e2e', 'smoke', or 'all' (default: 'smoke')
.EXAMPLE
    .\scripts\windows\test.ps1
.EXAMPLE
    .\scripts\windows\test.ps1 -Type e2e
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('unit', 'integration', 'e2e', 'smoke', 'all')]
    [string]$Type = 'smoke'
)

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "🧪 EchoTune AI - Running Tests" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Test Type: $Type" -ForegroundColor Yellow
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules not found. Installing dependencies..." -ForegroundColor Red
    npm ci
}

# Run tests based on type
switch ($Type) {
    'unit' {
        Write-Host "🧪 Running unit tests..." -ForegroundColor Yellow
        npm run test:unit
    }
    'integration' {
        Write-Host "🧪 Running integration tests..." -ForegroundColor Yellow
        npm run test:integration
    }
    'e2e' {
        Write-Host "🧪 Running E2E tests..." -ForegroundColor Yellow
        Write-Host "⚠️  Make sure the server is running on http://localhost:3000" -ForegroundColor Yellow
        Write-Host ""
        npm run test:e2e
    }
    'smoke' {
        Write-Host "🧪 Running smoke tests..." -ForegroundColor Yellow
        Write-Host "⚠️  Make sure the server is running on http://localhost:3000" -ForegroundColor Yellow
        Write-Host ""
        # Run only smoke tests with Playwright
        npx playwright test tests/e2e/smoke.spec.js --project=desktop-chromium
    }
    'all' {
        Write-Host "🧪 Running all tests..." -ForegroundColor Yellow
        npm test
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Tests completed successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Tests failed!" -ForegroundColor Red
    Write-Host ""
    exit 1
}
