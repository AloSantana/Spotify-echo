#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Docker helper script for EchoTune AI on Windows
.DESCRIPTION
    Builds and runs Docker containers on Windows hosts
.PARAMETER Action
    Action to perform: 'build', 'run', 'stop', or 'logs' (default: 'build')
.EXAMPLE
    .\scripts\windows\docker.ps1 -Action build
.EXAMPLE
    .\scripts\windows\docker.ps1 -Action run
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('build', 'run', 'stop', 'logs', 'clean')]
    [string]$Action = 'build'
)

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ImageName = "spotify-echo:local"
$ContainerName = "spotify-echo-app"

Write-Host "🐳 EchoTune AI - Docker Operations" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Action: $Action" -ForegroundColor Yellow
Write-Host ""

# Check Docker installation
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker version: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# Perform requested action
switch ($Action) {
    'build' {
        Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
        $commitSha = git rev-parse --short HEAD 2>$null
        if (-not $commitSha) { $commitSha = "unknown" }
        $buildTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        
        docker build `
            --build-arg BUILD_SHA=$commitSha `
            --build-arg BUILD_TIME=$buildTime `
            -t $ImageName `
            .
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker image built successfully: $ImageName" -ForegroundColor Green
        } else {
            Write-Host "❌ Docker build failed" -ForegroundColor Red
            exit 1
        }
    }
    'run' {
        Write-Host "🚀 Starting Docker container..." -ForegroundColor Yellow
        
        # Check if .env exists
        if (Test-Path ".env") {
            Write-Host "📋 Using .env file for environment variables" -ForegroundColor Green
            docker run -d `
                --name $ContainerName `
                --env-file .env `
                -p 3000:3000 `
                $ImageName
        } else {
            Write-Host "⚠️  .env file not found, starting without env file" -ForegroundColor Yellow
            docker run -d `
                --name $ContainerName `
                -p 3000:3000 `
                $ImageName
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Container started: $ContainerName" -ForegroundColor Green
            Write-Host "🌐 Server available at: http://localhost:3000" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "⏳ Waiting for health check..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            
            # Check health
            try {
                $health = Invoke-RestMethod -Uri "http://localhost:3000/healthz" -TimeoutSec 10
                Write-Host "✅ Health check passed!" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Health check failed. Check logs with: .\scripts\windows\docker.ps1 -Action logs" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Failed to start container" -ForegroundColor Red
            exit 1
        }
    }
    'stop' {
        Write-Host "🛑 Stopping Docker container..." -ForegroundColor Yellow
        docker stop $ContainerName 2>$null
        docker rm $ContainerName 2>$null
        Write-Host "✅ Container stopped and removed" -ForegroundColor Green
    }
    'logs' {
        Write-Host "📋 Container logs:" -ForegroundColor Yellow
        Write-Host ""
        docker logs $ContainerName
    }
    'clean' {
        Write-Host "🧹 Cleaning up Docker resources..." -ForegroundColor Yellow
        docker stop $ContainerName 2>$null
        docker rm $ContainerName 2>$null
        docker rmi $ImageName 2>$null
        Write-Host "✅ Cleanup complete" -ForegroundColor Green
    }
}

Write-Host ""
