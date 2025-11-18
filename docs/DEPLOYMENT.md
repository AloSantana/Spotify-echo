# EchoTune AI Deployment Guide

## Overview

This guide covers deploying EchoTune AI to production, including setup for the modernized chat-first architecture with PostgreSQL, AI provider management, and Spotify integration.

## Prerequisites

### Required Services
- **Node.js** 20.x or higher
- **PostgreSQL** 15+ (for chat, preferences, state)
- **MongoDB** (optional, for analytics and listening history)
- **Redis** (optional, for session management and caching)
- **Domain** with SSL certificate
- **Spotify Developer Account** (API credentials)
- **AI Provider API Keys** (at least one: Gemini, OpenAI, Claude, or OpenRouter)

### Recommended Hosting
- **Application**: DigitalOcean App Platform, Heroku, Railway, Render
- **PostgreSQL**: Supabase, Neon, Railway, DigitalOcean Managed Database
- **MongoDB**: MongoDB Atlas (Free tier available)
- **Redis**: Redis Cloud, Upstash (Free tiers available)

## Environment Configuration

### Production Environment Variables

Create `.env.production` with the following configuration:

```env
# Node Environment
NODE_ENV=production
PORT=3000

# Application URL
APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Security (Generate strong secrets)
JWT_SECRET=<generate-256-bit-secret>
SESSION_SECRET=<generate-256-bit-secret>

# PostgreSQL (Primary database for chat, preferences, state)
POSTGRES_URL=postgresql://user:password@host:5432/echotune_ai?sslmode=require

# MongoDB (Optional, for analytics and listening history)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/echotune_ai?retryWrites=true&w=majority

# Redis (Optional, for sessions and caching)
REDIS_URL=redis://default:password@host:6379
REDIS_TLS_URL=rediss://default:password@host:6379

# Spotify API
SPOTIFY_CLIENT_ID=your_production_client_id
SPOTIFY_CLIENT_SECRET=your_production_client_secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/auth/callback

# AI Providers (At least one required)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# AI Provider Configuration
DEFAULT_LLM_PROVIDER=gemini
DEFAULT_LLM_MODEL=gemini-1.5-flash

# Feature Flags
ENABLE_SPOTIFY_INTEGRATION=true
ENABLE_POSTGRESQL=true
ENABLE_AI_PROVIDER_FACTORY=true
ENABLE_HEALTH_MONITORING=true

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# CORS Configuration
ALLOWED_ORIGINS=https://your-domain.com
```

### Generating Secure Secrets

```bash
# Generate JWT_SECRET (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Setup

### PostgreSQL Setup

#### Option 1: Managed PostgreSQL (Recommended)

**Supabase:**
1. Create account at https://supabase.com
2. Create new project
3. Copy connection string from Settings → Database
4. Add `?sslmode=require` to connection string

**Neon:**
1. Create account at https://neon.tech
2. Create new project
3. Copy connection string
4. SSL enabled by default

**Railway:**
1. Create account at https://railway.app
2. Add PostgreSQL database to project
3. Copy connection string from Variables tab

#### Option 2: Self-Hosted PostgreSQL

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE echotune_ai;
CREATE USER echotune_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE echotune_ai TO echotune_user;
\q

# Update connection string
POSTGRES_URL=postgresql://echotune_user:secure_password@localhost:5432/echotune_ai
```

#### Run Migrations

```bash
# Install Prisma CLI
npm install -g prisma

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify tables created
npx prisma studio
```

### MongoDB Setup (Optional)

#### MongoDB Atlas (Recommended)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create free tier cluster (M0)
3. Whitelist application IP addresses (or 0.0.0.0/0 for any IP)
4. Create database user
5. Get connection string and add to `.env.production`

#### Self-Hosted MongoDB

```bash
# Install MongoDB
sudo apt update
sudo apt install mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongo
use echotune_ai
db.createUser({
  user: "echotune_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})

# Update connection string
MONGODB_URI=mongodb://echotune_user:secure_password@localhost:27017/echotune_ai
```

### Redis Setup (Optional)

#### Redis Cloud (Recommended)

1. Create account at https://redis.com/try-free
2. Create free database
3. Copy endpoint and password
4. Add to `.env.production`

#### Self-Hosted Redis

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_strong_password

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis

# Update connection string
REDIS_URL=redis://:your_strong_password@localhost:6379
```

## Application Deployment

### Option 1: DigitalOcean App Platform

#### Step 1: Prepare Repository

```bash
# Ensure .env.production is in .gitignore
echo ".env.production" >> .gitignore

# Commit all changes
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

#### Step 2: Create App

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repository
4. Select branch (e.g., `main`)

#### Step 3: Configure Build Settings

```yaml
# App Spec (auto-detected)
name: echotune-ai
services:
  - name: web
    github:
      repo: your-username/Spotify-echo
      branch: main
      deploy_on_push: true
    build_command: |
      npm install
      npx vite build
      npx prisma generate
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /
```

#### Step 4: Add Environment Variables

In DigitalOcean dashboard:
1. Go to App Settings → Environment Variables
2. Add all variables from `.env.production`
3. Mark sensitive variables as encrypted

#### Step 5: Deploy

1. Review configuration
2. Click "Create Resources"
3. Wait for deployment to complete
4. Access app at provided URL

### Option 2: Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create echotune-ai

# Add buildpacks
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<your-secret>
# ... add all other environment variables

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Add Redis addon (optional)
heroku addons:create heroku-redis:mini

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy

# Open app
heroku open
```

### Option 3: Railway

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose repository
5. Add environment variables in Variables tab
6. Add PostgreSQL database (optional: Redis)
7. Deploy automatically on push

### Option 4: Docker Deployment

#### Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build frontend
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=postgresql://postgres:password@postgres:5432/echotune_ai
      - MONGODB_URI=mongodb://mongo:27017/echotune_ai
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - mongo
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=echotune_ai
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  mongo_data:
```

#### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

## SSL/HTTPS Setup

### Option 1: Automatic SSL (App Platform/Railway)

Most platforms provide automatic SSL certificates. Enable in dashboard.

### Option 2: Let's Encrypt (Self-Hosted)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Option 3: Cloudflare SSL

1. Add domain to Cloudflare
2. Update nameservers
3. Enable SSL in Cloudflare dashboard
4. Select "Full (strict)" SSL mode

## Nginx Configuration

### Production Nginx Config

```nginx
upstream echotune_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss text/javascript;

    # Static files
    location /static/ {
        alias /app/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api/ {
        proxy_pass http://echotune_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support (for Socket.IO)
    location /socket.io/ {
        proxy_pass http://echotune_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://echotune_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Post-Deployment Tasks

### 1. Verify Deployment

```bash
# Check application health
curl https://your-domain.com/api/health

# Check PostgreSQL connection
curl https://your-domain.com/api/health/postgres

# Check AI provider health
curl https://your-domain.com/api/health/providers
```

### 2. Test Spotify Integration

1. Navigate to https://your-domain.com
2. Click "Connect Spotify"
3. Authorize application
4. Test natural language commands in chat

### 3. Monitor Application

```bash
# View application logs
# DigitalOcean
doctl apps logs <app-id> --follow

# Heroku
heroku logs --tail

# Docker
docker-compose logs -f app

# Railway
railway logs
```

### 4. Database Backups

#### PostgreSQL Backups

```bash
# Manual backup
pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $POSTGRES_URL < backup_20250118.sql

# Automated backups (cron)
0 2 * * * pg_dump $POSTGRES_URL > /backups/echotune_$(date +\%Y\%m\%d).sql
```

#### MongoDB Backups

```bash
# Manual backup
mongodump --uri="$MONGODB_URI" --out=/backups/mongo_$(date +%Y%m%d)

# Restore
mongorestore --uri="$MONGODB_URI" /backups/mongo_20250118

# Automated backups
0 2 * * * mongodump --uri="$MONGODB_URI" --out=/backups/mongo_$(date +\%Y\%m\%d)
```

## Performance Optimization

### 1. Enable Caching

```javascript
// In server.js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

// Cache Spotify API responses
app.get('/api/spotify/search', async (req, res) => {
  const cacheKey = `search:${req.query.q}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Fetch from Spotify API
  const results = await spotifySearch(req.query.q);
  
  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(results));
  
  res.json(results);
});
```

### 2. Connection Pooling

PostgreSQL connection pooling is handled by Prisma automatically. Configure in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
  
  // Connection pool settings
  connectionLimit = 10
}
```

### 3. CDN Integration

Use CDN for static assets:

```javascript
// In production
const CDN_URL = process.env.CDN_URL || '';

app.use('/static', express.static('dist', {
  setHeaders: (res, path) => {
    if (CDN_URL) {
      res.setHeader('X-CDN-URL', CDN_URL);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));
```

## Monitoring & Logging

### Application Monitoring

**Option 1: PM2**

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "echotune-ai" -- start

# Monitor
pm2 monit

# Logs
pm2 logs echotune-ai

# Auto-restart on crash
pm2 startup
pm2 save
```

**Option 2: New Relic**

```bash
# Install New Relic agent
npm install newrelic

# Add to server.js
require('newrelic');

# Configure
# Create newrelic.js with license key
```

**Option 3: Sentry**

```javascript
// Install Sentry
npm install @sentry/node

// In server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Error handling
app.use(Sentry.Handlers.errorHandler());
```

### Health Check Endpoint

```javascript
// Add to routes
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      postgres: await checkPostgres(),
      mongodb: await checkMongoDB(),
      redis: await checkRedis(),
      spotify: await checkSpotifyAPI(),
      aiProviders: await checkAIProviders(),
    }
  };
  
  const allHealthy = Object.values(health.services).every(s => s.status === 'ok');
  res.status(allHealthy ? 200 : 503).json(health);
});
```

## Scaling

### Horizontal Scaling

```bash
# DigitalOcean App Platform
# Increase instance count in dashboard

# Heroku
heroku ps:scale web=3

# Docker Swarm
docker service scale echotune-ai_app=3
```

### Database Scaling

**PostgreSQL:**
- Use read replicas for heavy read workloads
- Consider connection pooling (PgBouncer)
- Upgrade to larger instance

**MongoDB:**
- Use MongoDB Atlas auto-scaling
- Configure sharding for large datasets

## Troubleshooting

### Common Issues

**PostgreSQL Connection Failed**
```bash
# Check connection string
npx prisma db push --skip-generate

# Verify SSL mode
POSTGRES_URL=postgresql://...?sslmode=require
```

**Spotify OAuth Failing**
```bash
# Verify redirect URI matches exactly
SPOTIFY_REDIRECT_URI=https://your-domain.com/auth/callback

# Check Spotify Developer Dashboard whitelist
```

**AI Provider Errors**
```bash
# Check API keys
curl https://your-domain.com/api/health/providers

# View provider health logs
docker-compose logs app | grep "provider"
```

## Security Checklist

- [ ] All secrets stored as environment variables
- [ ] SSL/HTTPS enabled
- [ ] Database connections use SSL
- [ ] CORS configured for specific origins
- [ ] Rate limiting enabled
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] API keys rotated regularly
- [ ] Database backups automated
- [ ] Monitoring and alerts configured
- [ ] Error logging without sensitive data

## Support & Resources

- [PostgreSQL Setup Guide](./POSTGRESQL_SETUP.md)
- [Spotify Integration Guide](./SPOTIFY_INTEGRATION.md)
- [Modernization Roadmap](./MODERNIZATION_ROADMAP.md)
- [Main README](../README.md)

For deployment issues, check application logs and health endpoints first.
