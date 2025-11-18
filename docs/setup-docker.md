# Docker-Based Local Environment Setup Guide

Complete guide for running EchoTune AI in Docker containers for local development.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Images Overview](#docker-images-overview)
- [Building Images](#building-images)
- [Running with Docker Compose](#running-with-docker-compose)
- [Volume Management](#volume-management)
- [Network Configuration](#network-configuration)
- [Logging and Debugging](#logging-and-debugging)
- [Health Checks](#health-checks)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

**Docker:**
```bash
# Verify Docker installation
docker --version
# Required: Docker 20.10+

# macOS/Windows: Docker Desktop
# Linux: Docker Engine
```

**Docker Compose:**
```bash
# Verify Docker Compose installation
docker-compose --version
# Required: Docker Compose v2.0+
```

**System Requirements:**
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 5GB free space for images and volumes
- **CPU:** 2 cores minimum

### Environment Setup

```bash
# Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Create environment file
cp .env.example .env
# Edit .env with your actual credentials (see below)
```

---

## Quick Start

**5-Step Docker Setup:**

```bash
# 1. Build all Docker images
./scripts/docker-build.sh

# 2. Start all services
docker-compose up -d

# 3. Check service health
docker-compose ps

# 4. View logs
docker-compose logs -f app

# 5. Open application
open http://localhost:3000
```

---

## Docker Images Overview

### Available Dockerfiles

**1. `Dockerfile` (Main)**
- **Purpose:** Standard production build
- **Base:** node:20-alpine
- **Size:** ~300MB
- **Use:** General production deployment

**2. `Dockerfile.optimized`**
- **Purpose:** Multi-stage optimized build
- **Base:** node:20-alpine
- **Size:** ~250MB (20% smaller)
- **Use:** Production with size constraints

**3. `Dockerfile.production`**
- **Purpose:** Production-hardened build
- **Base:** node:20-alpine
- **Size:** ~280MB
- **Features:** Non-root user, health checks, security scanning
- **Use:** Production deployment with security requirements

**4. `Dockerfile.test`**
- **Purpose:** E2E test runner
- **Base:** mcr.microsoft.com/playwright:v1.56.1
- **Size:** ~900MB (includes Chromium)
- **Use:** Running Playwright E2E tests in containers

### Image Comparison

| Dockerfile | Size | Security | Performance | Use Case |
|------------|------|----------|-------------|----------|
| Dockerfile | ~300MB | Good | Good | General production |
| Dockerfile.optimized | ~250MB | Good | Excellent | Size-constrained environments |
| Dockerfile.production | ~280MB | Excellent | Good | Security-critical deployments |
| Dockerfile.test | ~900MB | N/A | N/A | E2E testing only |

---

## Building Images

### Automated Build Script

**Build all images:**
```bash
chmod +x scripts/docker-build.sh
./scripts/docker-build.sh
```

**Output:**
- Builds all 4 Dockerfile variants
- Validates image existence
- Reports image sizes
- Warns if sizes exceed thresholds
- Color-coded success/failure

### Manual Build

**Build specific image:**
```bash
# Main image
docker build -t spotify-echo:latest -f Dockerfile .

# Optimized image
docker build -t spotify-echo:optimized -f Dockerfile.optimized .

# Production image
docker build -t spotify-echo:production -f Dockerfile.production .

# Test image
docker build -t spotify-echo:test -f Dockerfile.test .
```

**Build with cache:**
```bash
# Use build cache (faster)
docker build -t spotify-echo:latest .

# No cache (clean build)
docker build --no-cache -t spotify-echo:latest .
```

### Build Time Optimization

**Speed up builds:**
```bash
# 1. Use .dockerignore (already configured)
# Excludes: node_modules, .git, test files, docs

# 2. Enable BuildKit (faster builds)
export DOCKER_BUILDKIT=1
docker build -t spotify-echo:latest .

# 3. Multi-stage with cache mounts (Dockerfile.optimized)
# Already implemented in Dockerfile.optimized
```

---

## Running with Docker Compose

### Available Compose Files

**1. `docker-compose.yml` (Development)**
```bash
docker-compose up -d
```
- **Services:** app, redis
- **Ports:** 3000 (app), 8080 (socket.io), 6379 (redis)
- **Volumes:** Bind mounts for hot-reload
- **Use:** Local development with code changes

**2. `docker-compose.dev.yml` (Development)**
```bash
docker-compose -f docker-compose.dev.yml up -d
```
- **Services:** app, redis, mongo (optional)
- **Features:** Nodemon, debug logs, dev dependencies
- **Use:** Full development environment

**3. `docker-compose.optimized.yml` (Optimized)**
```bash
docker-compose -f docker-compose.optimized.yml up -d
```
- **Image:** Dockerfile.optimized
- **Resource limits:** Defined CPU/memory
- **Use:** Testing production-like environment locally

**4. `docker-compose.production.yml` (Production)**
```bash
docker-compose -f docker-compose.production.yml up -d
```
- **Image:** Dockerfile.production
- **Security:** Non-root user, read-only filesystem
- **Scaling:** Replica configuration
- **Use:** Local production simulation

**5. `docker-compose.test.yml` (E2E Testing)**
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```
- **Services:** app, redis, e2e-tests
- **Purpose:** Automated E2E testing in containers
- **Use:** CI/CD pipelines, automated testing

### Common Commands

**Start services:**
```bash
# Foreground (see logs)
docker-compose up

# Background (detached)
docker-compose up -d

# Specific services
docker-compose up -d app redis
```

**Stop services:**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop app
```

**View services:**
```bash
# List running services
docker-compose ps

# Show service logs
docker-compose logs app

# Follow logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

**Restart services:**
```bash
# Restart all
docker-compose restart

# Restart specific
docker-compose restart app
```

---

## Volume Management

### Volume Types

**1. Bind Mounts (Development)**
```yaml
volumes:
  - ./src:/app/src:ro        # Source code (read-only)
  - ./data:/app/data         # Database files
  - ./logs:/app/logs         # Application logs
```

**2. Named Volumes (Production)**
```yaml
volumes:
  echotune-data:             # Persistent application data
  redis-data:                # Redis cache
```

### Managing Volumes

**List volumes:**
```bash
docker volume ls | grep echotune
```

**Inspect volume:**
```bash
docker volume inspect echotune-data
```

**Backup volume:**
```bash
# Backup data volume
docker run --rm \
  -v echotune-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/data-backup-$(date +%Y%m%d).tar.gz /data
```

**Restore volume:**
```bash
# Restore data volume
docker run --rm \
  -v echotune-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/data-backup-20250117.tar.gz -C /
```

**Clean up volumes:**
```bash
# Remove all unused volumes
docker volume prune

# Remove specific volume (data will be lost!)
docker volume rm echotune-data
```

---

## Network Configuration

### Docker Networks

**Default network:**
```bash
# List networks
docker network ls

# Inspect default network
docker network inspect spotify-echo_default
```

**Custom network:**
```yaml
networks:
  echotune-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

### Service Communication

**Internal DNS:**
```javascript
// Services communicate using service names
const redisClient = redis.createClient({
  host: 'redis',  // Docker DNS resolves to redis container
  port: 6379
});
```

**External access:**
```yaml
ports:
  - "3000:3000"   # host:container
  - "127.0.0.1:6379:6379"  # Bind to localhost only
```

---

## Logging and Debugging

### View Logs

**Service logs:**
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app

# Follow logs
docker-compose logs -f app

# Last N lines
docker-compose logs --tail=50 app

# With timestamps
docker-compose logs -t app
```

**Container logs:**
```bash
# Find container ID
docker ps

# View logs
docker logs <container-id>

# Follow logs
docker logs -f <container-id>
```

### Debug Container

**Execute commands in running container:**
```bash
# Interactive shell
docker-compose exec app sh

# Run specific command
docker-compose exec app npm run test

# As root (for debugging)
docker-compose exec --user root app sh
```

**Inspect container:**
```bash
# Container details
docker inspect <container-id>

# Running processes
docker-compose exec app ps aux

# Check environment
docker-compose exec app env

# Network connectivity
docker-compose exec app ping redis
```

### Debug Build Issues

**Build with progress:**
```bash
# See detailed build output
docker-compose build --progress=plain app
```

**Check layers:**
```bash
# See image layers
docker history spotify-echo:latest

# Check image size breakdown
docker inspect spotify-echo:latest | grep Size
```

---

## Health Checks

### Built-in Health Checks

**Check service health:**
```bash
# View health status
docker-compose ps

# Detailed health info
docker inspect --format='{{json .State.Health}}' <container-id> | jq
```

**Health check configuration (Dockerfile):**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1
```

### Manual Health Verification

**Application health:**
```bash
# Simple health endpoint
curl http://localhost:3000/health/simple

# Detailed health
curl http://localhost:3000/health

# Redis health
docker-compose exec redis redis-cli ping
```

**Database connectivity:**
```bash
# SQLite (in container)
docker-compose exec app ls -lh data/echotune.db

# MongoDB (if using)
docker-compose exec mongo mongosh --eval "db.admin Command({ping:1})"
```

---

## Performance Optimization

### Resource Limits

**Set limits in docker-compose.yml:**
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Build Cache Optimization

**Leverage layer caching:**
```dockerfile
# Copy package files first (cache dependencies)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code last (changes frequently)
COPY . .
```

### Runtime Optimization

**Use production mode:**
```yaml
environment:
  - NODE_ENV=production
  - NODE_OPTIONS=--max-old-space-size=512
```

**Enable compression:**
```javascript
// Already enabled in server.js
app.use(compression());
```

### Monitor Performance

**Container stats:**
```bash
# Real-time stats
docker stats

# Specific container
docker stats <container-id>

# JSON format
docker stats --no-stream --format "{{json .}}"
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Symptom:** Container exits immediately

**Diagnosis:**
```bash
# Check container logs
docker-compose logs app

# Check exit code
docker ps -a | grep spotify-echo
```

**Solutions:**
```bash
# Verify environment variables
docker-compose config

# Check port conflicts
lsof -i :3000
lsof -i :6379

# Rebuild without cache
docker-compose build --no-cache app
```

#### 2. Cannot Connect to Redis

**Symptom:** "Error: connect ECONNREFUSED redis:6379"

**Solutions:**
```bash
# Verify Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connectivity
docker-compose exec app ping redis

# Restart Redis
docker-compose restart redis
```

#### 3. Database Files Not Persisting

**Symptom:** Data lost after container restart

**Solutions:**
```bash
# Check volume configuration
docker-compose config | grep volumes

# Verify volume exists
docker volume ls | grep data

# Use named volume instead of bind mount
# (see docker-compose.production.yml example)
```

#### 4. Slow Build Times

**Solutions:**
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Use .dockerignore (already configured)
cat .dockerignore

# Prune build cache periodically
docker builder prune

# Use multi-stage builds (Dockerfile.optimized)
```

#### 5. Out of Disk Space

**Diagnosis:**
```bash
# Check Docker disk usage
docker system df

# Detailed breakdown
docker system df -v
```

**Solutions:**
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Complete cleanup (careful!)
docker system prune -a --volumes
```

#### 6. Permission Denied Errors

**Symptom:** "EACCES: permission denied"

**Solutions:**
```bash
# Check file permissions on host
ls -la data/

# Fix permissions
chmod -R 755 data/

# Use root in container (temporary)
docker-compose exec --user root app sh

# Fix ownership in Dockerfile
USER node
```

#### 7. Hot Reload Not Working

**Symptom:** Code changes not reflected

**Solutions:**
```bash
# Verify volume mount
docker-compose config | grep volumes

# Use polling (for some systems)
environment:
  - CHOKIDAR_USEPOLLING=true

# Restart with fresh volumes
docker-compose down -v
docker-compose up -d
```

#### 8. Cannot Access Application

**Symptom:** "Connection refused" on http://localhost:3000

**Solutions:**
```bash
# Check container is running
docker-compose ps app

# Check port mapping
docker port <container-id>

# Verify application is listening
docker-compose exec app netstat -tln | grep 3000

# Check firewall/antivirus
# May block Docker networking
```

#### 9. High Memory Usage

**Diagnosis:**
```bash
# Check container stats
docker stats

# Check Node.js memory
docker-compose exec app node -e "console.log(process.memoryUsage())"
```

**Solutions:**
```bash
# Set Node.js memory limit
environment:
  - NODE_OPTIONS=--max-old-space-size=512

# Enable resource limits
deploy:
  resources:
    limits:
      memory: 512M
```

#### 10. Build Fails: "COPY failed"

**Symptom:** "COPY . . failed: no such file or directory"

**Solutions:**
```bash
# Build from correct directory
cd /path/to/Spotify-echo
docker build -t spotify-echo:latest .

# Check .dockerignore isn't excluding required files
cat .dockerignore

# Verify files exist
ls -la package.json
```

#### 11. Test Container Fails

**Symptom:** E2E tests fail in Docker but pass locally

**Solutions:**
```bash
# Check test logs
docker-compose -f docker-compose.test.yml logs e2e-tests

# Verify app is healthy before tests
docker-compose -f docker-compose.test.yml ps

# Increase wait time for app startup
# (see scripts/run-e2e-docker.sh)

# Run tests manually
docker-compose exec e2e-tests npx playwright test
```

#### 12. Environment Variables Not Working

**Symptom:** "Required environment variable missing"

**Solutions:**
```bash
# Check .env file exists
ls -la .env

# Verify docker-compose picks up .env
docker-compose config | grep SPOTIFY_CLIENT_ID

# Use env_file explicitly
env_file:
  - .env

# Check variable names match
cat .env.example
```

#### 13. Docker Compose Version Issues

**Symptom:** "unsupported Compose file version"

**Solutions:**
```bash
# Check Docker Compose version
docker-compose --version

# Update Docker Compose
# macOS/Windows: Update Docker Desktop
# Linux: Follow official docs

# Use compatible version
# Change version: "3.8" to version: "3.3"
```

#### 14. Network Issues Between Containers

**Symptom:** "getaddrinfo ENOTFOUND redis"

**Solutions:**
```bash
# Check all containers on same network
docker network inspect spotify-echo_default

# Restart networking
docker-compose down
docker-compose up -d

# Use explicit network configuration
networks:
  - echotune-network
```

#### 15. Image Too Large

**Symptom:** Docker image >1GB

**Solutions:**
```bash
# Use alpine base image (already using)
# FROM node:20-alpine

# Use .dockerignore (already configured)

# Multi-stage build (use Dockerfile.optimized)
docker build -f Dockerfile.optimized -t spotify-echo:optimized .

# Remove unnecessary dependencies
RUN npm ci --only=production --ignore-scripts

# Check image size
docker images | grep spotify-echo
```

---

## Next Steps

**After Docker setup:**
1. Follow [Local Development Setup](setup-local.md) for detailed usage
2. See [MCP & AI Integration Guide](mcp-ai-integration.md) for AI providers
3. Read [Architecture Overview](architecture-overview.md) for system design
4. Review [Staging Deployment](deploy-staging.md) for deployment

**Resources:**
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

---

**Last Updated:** 2025-01-17  
**Version:** 1.0.0  
**Status:** Production Ready
