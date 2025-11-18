# Staging Deployment Guide

Complete guide for deploying EchoTune AI to a staging environment for testing before production.

## Table of Contents
- [Staging Philosophy](#staging-philosophy)
- [Prerequisites](#prerequisites)
- [Infrastructure Setup](#infrastructure-setup)
- [Deployment Steps](#deployment-steps)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Web Server Configuration](#web-server-configuration)
- [SSL/HTTPS Setup](#ssl-https-setup)
- [Health Checks](#health-checks)
- [Smoke Testing](#smoke-testing)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Staging Philosophy

**Purpose of Staging:**
- Test changes in production-like environment
- Validate deployments before production
- QA testing and user acceptance
- Performance testing under load
- Integration testing with real APIs (non-production credentials)

**Staging vs Production:**
| Aspect | Staging | Production |
|--------|---------|------------|
| Data | Test/synthetic data | Real user data |
| APIs | Test/sandbox APIs | Production APIs |
| Traffic | Internal team only | Public users |
| Monitoring | Basic | Comprehensive |
| Backups | Optional | Required |
| Uptime | Best effort | 99.9%+ |

---

## Prerequisites

### Required Accounts

**DigitalOcean (Recommended):**
- DigitalOcean account
- SSH key uploaded
- Personal access token

**Alternative Platforms:**
- AWS: EC2, RDS, ElastiCache
- Google Cloud: Compute Engine, Cloud SQL
- Azure: App Service, Database

### Required Credentials

**Spotify (Test App):**
- Create separate Spotify app for staging
- Test client ID and secret
- Redirect URI: `https://staging.yourdomain.com/callback`

**AI Providers (Test Keys):**
- OpenAI test API key
- Google Gemini test API key
- OpenRouter test API key

### Local Tools

```bash
# SSH client
ssh -V

# Docker (for local testing)
docker --version

# git
git --version

# Optional: doctl (DigitalOcean CLI)
doctl version
```

---

## Infrastructure Setup

### Option 1: DigitalOcean Droplet

**Create Droplet:**
```bash
# Via web interface:
# 1. Click "Create" → "Droplets"
# 2. Choose Ubuntu 22.04 LTS
# 3. Select plan: Basic $12/month (2GB RAM)
# 4. Add SSH key
# 5. Choose datacenter region
# 6. Set hostname: echotune-staging
# 7. Click "Create Droplet"

# Via doctl CLI:
doctl compute droplet create echotune-staging \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-2gb \
  --region nyc3 \
  --ssh-keys <your-ssh-key-id> \
  --enable-monitoring \
  --enable-ipv6
```

**Recommended Specifications:**
- **RAM:** 2GB minimum, 4GB recommended
- **CPU:** 2 vCPUs
- **Storage:** 50GB SSD
- **Bandwidth:** 2TB transfer

### Option 2: DigitalOcean App Platform

**Deploy via App Platform:**
```bash
# 1. Connect GitHub repository
# 2. Select branch: staging
# 3. Configure:
#    - Type: Web Service
#    - Source: Dockerfile
#    - HTTP Port: 3000
# 4. Add environment variables
# 5. Deploy
```

**Advantages:**
- Automatic HTTPS
- Zero-downtime deployments
- Automatic scaling
- Built-in monitoring

**Limitations:**
- Less control
- Higher cost for same resources
- Limited customization

### Domain Setup

**Configure DNS:**
```bash
# Add A record
Type: A
Name: staging
Value: <droplet-ip>
TTL: 300

# Verify DNS propagation
dig staging.yourdomain.com
nslookup staging.yourdomain.com
```

---

## Deployment Steps

### 1. Initial Server Setup

**Connect to server:**
```bash
ssh root@<droplet-ip>
```

**Update system:**
```bash
# Update package list
apt update

# Upgrade packages
apt upgrade -y

# Install essentials
apt install -y curl git build-essential
```

### 2. Install Node.js

```bash
# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version   # Should be 10.x
```

### 3. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
usermod -aG docker $USER

# Start Docker service
systemctl enable docker
systemctl start docker

# Verify installation
docker --version
docker-compose --version
```

### 4. Create Application User

```bash
# Create non-root user
adduser echotune

# Add to docker group
usermod -aG docker echotune

# Grant sudo privileges (if needed)
usermod -aG sudo echotune

# Switch to app user
su - echotune
```

### 5. Clone Repository

```bash
# As echotune user
cd /home/echotune

# Clone repository
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo

# Checkout staging branch (if exists)
git checkout staging
```

### 6. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with staging credentials
nano .env
# (See Environment Configuration section below)
```

### 7. Install Dependencies

```bash
# Install Node dependencies
npm install --production

# Verify installation
npm list --depth=0
```

### 8. Build Application

```bash
# Build Docker image
docker build -t echotune-staging:latest -f Dockerfile.production .

# Verify image
docker images | grep echotune
```

### 9. Start Application

**Option A: Direct (for testing):**
```bash
# Start application
npm start

# Test
curl http://localhost:3000/health
```

**Option B: Docker Compose (recommended):**
```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 10. Configure Process Manager

**Using PM2 (if not using Docker):**
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name echotune-staging

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd
# (Follow instructions from output)

# Verify
pm2 status
pm2 logs
```

### 11. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/echotune-staging

# Add configuration (see Web Server Configuration section)

# Enable site
sudo ln -s /etc/nginx/sites-available/echotune-staging /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 12. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d staging.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 13. Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Verify rules
sudo ufw status
```

### 14. Verify Deployment

```bash
# Check application
curl https://staging.yourdomain.com/health

# Check logs
tail -f /var/log/nginx/access.log
docker-compose logs -f app

# Test functionality
open https://staging.yourdomain.com
```

### 15. Setup Monitoring

```bash
# Install monitoring agent (DigitalOcean)
curl -sSL https://insights.nyc3.cdn.digitaloceanspaces.com/install.sh | sudo bash

# Or setup custom monitoring (see Monitoring section)
```

---

## Environment Configuration

**Staging .env file:**
```bash
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=3000
NODE_ENV=staging
BASE_URL=https://staging.yourdomain.com

# =============================================================================
# SPOTIFY CONFIGURATION (STAGING APP)
# =============================================================================
SPOTIFY_CLIENT_ID=your_staging_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_staging_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://staging.yourdomain.com/callback
SPOTIFY_SCOPES=user-read-private user-read-email user-library-read playlist-read-private playlist-modify-public

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_TYPE=sqlite
SQLITE_PATH=/home/echotune/Spotify-echo/data/staging.db

# Optional: MongoDB for staging
# MONGODB_URI=mongodb://localhost:27017/echotune-staging

# =============================================================================
# REDIS CONFIGURATION (Optional but recommended)
# =============================================================================
REDIS_URL=redis://localhost:6379
REDIS_DB=1

# =============================================================================
# SECURITY
# =============================================================================
JWT_SECRET=<generate-strong-secret>
SESSION_SECRET=<generate-strong-secret>
ENCRYPTION_KEY=<generate-strong-key>

# Generate secrets:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# =============================================================================
# AI PROVIDERS (TEST KEYS)
# =============================================================================
OPENAI_API_KEY=sk-test-...
GEMINI_API_KEY=test-...
OPENROUTER_API_KEY=sk-or-test-...

# =============================================================================
# CORS
# =============================================================================
CORS_ORIGIN=https://staging.yourdomain.com

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=debug
LOG_FILE=/home/echotune/Spotify-echo/logs/staging.log

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_REAL_TIME=true
ENABLE_CACHING=true
ENABLE_ANALYTICS=true
```

**Security Best Practices:**
- Use separate credentials for staging
- Never use production credentials
- Rotate secrets regularly
- Store .env securely (not in git)
- Use environment-specific Spotify apps

---

## Database Setup

### SQLite (Default)

```bash
# Create data directory
mkdir -p /home/echotune/Spotify-echo/data

# Set permissions
chmod 755 /home/echotune/Spotify-echo/data

# Database will be created automatically on first run
```

### MongoDB (Optional)

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh --eval "db.adminCommand('ping')"

# Create staging database
mongosh
> use echotune-staging
> db.createUser({
  user: "echotune",
  pwd: "<strong-password>",
  roles: [{role: "readWrite", db: "echotune-staging"}]
})
> exit

# Update .env
MONGODB_URI=mongodb://echotune:<password>@localhost:27017/echotune-staging
```

### Redis (Optional but Recommended)

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: supervised systemd
# Set: bind 127.0.0.1 ::1
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis

# Verify
redis-cli ping
# Should return: PONG

# Update .env
REDIS_URL=redis://localhost:6379
REDIS_DB=1
```

---

## Web Server Configuration

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/echotune-staging

upstream echotune_staging {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name staging.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name staging.yourdomain.com;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Access Logs
    access_log /var/log/nginx/echotune-staging-access.log;
    error_log /var/log/nginx/echotune-staging-error.log;

    # Static Files
    location /static/ {
        alias /home/echotune/Spotify-echo/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js Application
    location / {
        proxy_pass http://echotune_staging;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Health Check
    location /health {
        proxy_pass http://echotune_staging;
        access_log off;
    }
}
```

---

## SSL/HTTPS Setup

### Automatic SSL with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d staging.yourdomain.com

# Follow prompts:
# - Enter email for renewal notifications
# - Agree to terms of service
# - Choose to redirect HTTP to HTTPS

# Verify auto-renewal
sudo certbot renew --dry-run

# Check certificate
sudo certbot certificates
```

### Manual Renewal

```bash
# Renew certificate
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

---

## Health Checks

### Application Health

```bash
# Simple health check
curl https://staging.yourdomain.com/health/simple

# Expected response:
{"status":"ok","timestamp":"2025-01-17T22:30:00.000Z"}

# Detailed health check
curl https://staging.yourdomain.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-17T22:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}
```

### Service Health

```bash
# Check all services
systemctl status nginx
systemctl status mongod  # if using MongoDB
systemctl status redis

# Docker services
docker-compose ps

# Check ports
netstat -tln | grep -E ':(3000|6379|27017|443|80)'
```

---

## Smoke Testing

### Automated Smoke Tests

**Create smoke test script:**
```bash
#!/bin/bash
# scripts/smoke-test-staging.sh

BASE_URL="https://staging.yourdomain.com"

echo "Running smoke tests for staging..."

# Test 1: Homepage
echo "Test 1: Homepage"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)
if [ $STATUS -eq 200 ]; then
    echo "✓ Homepage: PASS"
else
    echo "✗ Homepage: FAIL (HTTP $STATUS)"
    exit 1
fi

# Test 2: Health endpoint
echo "Test 2: Health endpoint"
HEALTH=$(curl -s $BASE_URL/health/simple)
if [[ $HEALTH == *"ok"* ]]; then
    echo "✓ Health endpoint: PASS"
else
    echo "✗ Health endpoint: FAIL"
    exit 1
fi

# Test 3: API endpoints
echo "Test 3: API endpoints"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/chat)
if [ $STATUS -eq 200 ] || [ $STATUS -eq 401 ]; then
    echo "✓ API endpoints: PASS"
else
    echo "✗ API endpoints: FAIL (HTTP $STATUS)"
    exit 1
fi

# Test 4: Static assets
echo "Test 4: Static assets"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/static/styles.css)
if [ $STATUS -eq 200 ]; then
    echo "✓ Static assets: PASS"
else
    echo "✗ Static assets: FAIL (HTTP $STATUS)"
    exit 1
fi

# Test 5: Database connectivity
echo "Test 5: Database"
if docker-compose exec -T app node -e "const db = require('./src/database/database-manager'); db.testConnection().then(() => process.exit(0)).catch(() => process.exit(1))"; then
    echo "✓ Database: PASS"
else
    echo "✗ Database: FAIL"
    exit 1
fi

echo ""
echo "All smoke tests passed! ✓"
```

**Run smoke tests:**
```bash
chmod +x scripts/smoke-test-staging.sh
./scripts/smoke-test-staging.sh
```

### Manual Testing Checklist

- [ ] Homepage loads
- [ ] Spotify login button visible
- [ ] OAuth flow redirects correctly
- [ ] Chat interface accessible
- [ ] Settings page loads
- [ ] Admin dashboard accessible (if applicable)
- [ ] Playlists page functional
- [ ] API endpoints respond
- [ ] Real-time features work (Socket.IO)
- [ ] Database queries execute
- [ ] Redis caching works
- [ ] Logs are being written
- [ ] Error handling works

---

## Rollback Procedures

### Quick Rollback

**If deployment fails:**
```bash
# Stop new version
docker-compose down

# Restore previous version
git checkout <previous-commit>

# Rebuild and start
docker-compose build
docker-compose up -d

# Verify
curl https://staging.yourdomain.com/health
```

### Database Rollback

**If database migration fails:**
```bash
# Restore from backup
sudo systemctl stop mongod
sudo rm -rf /var/lib/mongodb/*
sudo tar -xzf /backups/mongodb-backup-<date>.tar.gz -C /var/lib/mongodb/
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo systemctl start mongod
```

### Configuration Rollback

```bash
# Restore previous environment
cp .env.backup .env

# Restart application
docker-compose restart app
```

---

## Monitoring

### Basic Monitoring

**Check logs:**
```bash
# Application logs
docker-compose logs -f app

# Nginx logs
tail -f /var/log/nginx/echotune-staging-access.log
tail -f /var/log/nginx/echotune-staging-error.log

# System logs
journalctl -u nginx -f
journalctl -u mongod -f
```

**System metrics:**
```bash
# CPU and memory
htop

# Disk usage
df -h

# Network
netstat -tln
```

### DigitalOcean Monitoring

**Enable built-in monitoring:**
- Graphs available in droplet dashboard
- CPU, memory, disk, bandwidth
- Set up alerts for thresholds

**Custom alerts:**
```bash
# Via DigitalOcean API
curl -X POST "https://api.digitalocean.com/v2/monitoring/alerts" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": {
      "email": ["your-email@example.com"],
      "slack": []
    },
    "type": "v1/insights/droplet/memory_utilization_percent",
    "compare": "GreaterThan",
    "value": 90,
    "window": "5m"
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose logs app

# Check environment
docker-compose exec app env | grep -E '(SPOTIFY|MONGODB|REDIS)'

# Verify dependencies
docker-compose exec app npm list --depth=0
```

#### 2. 502 Bad Gateway

```bash
# Check if app is running
docker-compose ps

# Check application port
netstat -tln | grep 3000

# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### 3. SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate
sudo certbot certificates

# Test SSL
curl -vI https://staging.yourdomain.com
```

#### 4. Database Connection Failures

```bash
# SQLite: Check file permissions
ls -la /home/echotune/Spotify-echo/data/

# MongoDB: Check service
sudo systemctl status mongod

# Redis: Check service
sudo systemctl status redis
```

#### 5. High Memory Usage

```bash
# Check memory
free -h

# Check process memory
ps aux --sort=-%mem | head -10

# Restart services
docker-compose restart
```

---

## Next Steps

**After staging deployment:**
1. Run comprehensive smoke tests
2. Perform QA testing
3. Load testing (see Production Testing guide)
4. Review [Production Deployment](deploy-production.md) for next steps

**Resources:**
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Last Updated:** 2025-01-17  
**Version:** 1.0.0  
**Status:** Production Ready
