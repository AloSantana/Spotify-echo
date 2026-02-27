# 10 — Deployment Guide

> **Quick Reference:** MongoDB Atlas cluster setup, DigitalOcean App Platform step-by-step
> deployment, annotated `digitalocean-app.yaml`, all environment variables, Nginx configuration,
> Docker local development, health checks, backup strategy, scaling, and monitoring.

---

## 1. MongoDB Atlas Setup

### Step 1: Create Atlas Account and Cluster

1. Go to https://cloud.mongodb.com and sign up
2. Click **Build a Cluster** → Choose **M0 Free** (or M10+ for production)
3. Select provider: **AWS** (same region as your DigitalOcean app recommended)
4. Set cluster name: `echotune-cluster`
5. Click **Create Cluster** (takes ~3 minutes)

### Step 2: Create Database User

1. Left sidebar → **Database Access** → **Add New Database User**
2. Authentication method: **Password**
3. Username: `echotune`
4. Password: Generate secure password (save it — you'll need it for `MONGODB_URI`)
5. Built-in role: **Atlas admin** (or custom: readWrite on `echotune` database)
6. Click **Add User**

### Step 3: Configure Network Access

1. Left sidebar → **Network Access** → **Add IP Address**
2. For DigitalOcean App Platform: Click **Allow Access from Anywhere** (`0.0.0.0/0`)
   - Note: DigitalOcean App Platform does not have fixed egress IPs on basic plans
3. For development: Add your IP address
4. Click **Confirm**

### Step 4: Get Connection String

1. Left sidebar → **Database** → Click **Connect** on your cluster
2. Choose **Connect your application** → Driver: **Node.js** → Version: **5.5+**
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://echotune:<password>@echotune-cluster.abc1234.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name: append `echotune` before `?`:
   ```
   mongodb+srv://echotune:<password>@echotune-cluster.abc1234.mongodb.net/echotune?retryWrites=true&w=majority
   ```

> **Agent Note:** `MONGODB_DB_NAME=echotune` must also be set separately — the MongoDBManager
> reads this env var to select the database within the connection.

---

## 2. Spotify App Registration

(Required before deploying — OAuth will fail without this)

1. Go to https://developer.spotify.com/dashboard → **Create app**
2. App name: `EchoTune AI`
3. App description: `AI-powered music discovery`
4. Redirect URIs (add both):
   - `http://localhost:3000/auth/callback` (development)
   - `https://<your-app-name>.ondigitalocean.app/auth/callback` (production)
5. Enable: **Web API** ✓, **Web Playback SDK** ✓
6. Save → Copy **Client ID** and **Client Secret**

---

## 3. DigitalOcean App Platform — Step-by-Step

### Step 1: Fork/Push Repository
Ensure your code is in a GitHub repository that DigitalOcean can access.

### Step 2: Create App

1. Go to https://cloud.digitalocean.com/apps
2. Click **Create App**
3. Choose **GitHub** → Authorize DigitalOcean → Select your repository
4. Branch: `main`
5. **Autodeploy**: ✅ Enable (deploys on every push to main)
6. Click **Next**

### Step 3: Configure Service

DigitalOcean will auto-detect the `digitalocean-app.yaml` file. If prompted to use it:
- Click **Use Spec**
- The YAML at repo root will configure everything automatically

If configuring manually:
- **Type**: Web Service
- **Name**: `web`
- **Environment**: Node.js
- **Build command**: `npm install && npm run build`
- **Run command**: `npm start`
- **HTTP port**: `3000`
- **Instance size**: Basic (XXS) for start (~$5/month)

### Step 4: Set Environment Variables

In the App Platform dashboard → your app → **Settings** → **App-Level Environment Variables**:

Click **Edit** and add all required variables (see Section 4 below).

> **Critical:** Variables marked as **SECRET** in `digitalocean-app.yaml` are encrypted at
> rest. Always use the **Secret** type for API keys, tokens, and credentials.

### Step 5: Configure Health Check

Go to **Settings** → **Health Checks**:
- **HTTP path**: `/api/health`
- **Initial delay**: 30 seconds
- **Period**: 10 seconds
- **Timeout**: 5 seconds
- **Success threshold**: 1
- **Failure threshold**: 3

### Step 6: Deploy

Click **Deploy** → Watch build logs → Confirm health check passes green.

Your app URL: `https://<app-name>-<random-id>.ondigitalocean.app`

**Update Spotify Redirect URI** to this URL:
`https://<app-name>-<random-id>.ondigitalocean.app/auth/callback`

---

## 4. `digitalocean-app.yaml` — Annotated

```yaml
# digitalocean-app.yaml
name: echotune-ai       # App name on DigitalOcean

services:
- name: web             # Service name (shown in DO dashboard)
  source_dir: /         # Root of repository

  github:
    repo: your-github-username/Spotify-echo  # ← UPDATE THIS
    branch: main
    deploy_on_push: true   # Auto-deploy on git push

  run_command: npm start                      # node server.js
  build_command: npm install && npm run build # Installs deps + Vite build

  environment_slug: node-js   # Node.js runtime
  instance_count: 1           # Scale to 2-3 for Phase 4
  instance_size_slug: basic-xxs  # ~$5/month; upgrade to basic-xs ($12) for production

  health_check:
    http_path: /api/health        # Must return 200
    initial_delay_seconds: 30     # Wait 30s for Node to start
    period_seconds: 10            # Check every 10s
    timeout_seconds: 5            # Fail if > 5s response
    success_threshold: 1          # 1 success = healthy
    failure_threshold: 3          # 3 failures = restart

  routes:
  - path: /                        # Handle all routes (SPA)

  envs:
  # ── Core ──────────────────────────────────────────────────
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3000"

  # ── Database (REQUIRED) ───────────────────────────────────
  - key: MONGODB_URI
    value: ${MONGODB_URI}         # ← Set as Secret in DO dashboard
    type: SECRET
  - key: MONGODB_DB_NAME
    value: echotune
  - key: REDIS_URL
    value: ${REDIS_URL}           # ← Optional; in-memory fallback if missing
    type: SECRET

  # ── Auth Security (REQUIRED) ──────────────────────────────
  - key: JWT_SECRET
    value: ${JWT_SECRET}          # ← Min 32 chars random string
    type: SECRET
  - key: SESSION_SECRET
    value: ${SESSION_SECRET}      # ← Min 32 chars random string
    type: SECRET

  # ── Spotify (REQUIRED) ────────────────────────────────────
  - key: SPOTIFY_CLIENT_ID
    value: ${SPOTIFY_CLIENT_ID}
    type: SECRET
  - key: SPOTIFY_CLIENT_SECRET
    value: ${SPOTIFY_CLIENT_SECRET}
    type: SECRET
  - key: SPOTIFY_REDIRECT_URI
    value: https://echotune-ai-${APP_ID}.ondigitalocean.app/auth/callback
    # ↑ DO injects ${APP_ID} automatically

  # ── AI Providers (at least one REQUIRED for chat) ─────────
  - key: GEMINI_API_KEY
    value: ${GEMINI_API_KEY}      # Google AI Studio → API Keys
    type: SECRET
  - key: OPENAI_API_KEY
    value: ${OPENAI_API_KEY}
    type: SECRET
  - key: OPENROUTER_API_KEY
    value: ${OPENROUTER_API_KEY}  # openrouter.ai
    type: SECRET

  # ── Rate Limiting ─────────────────────────────────────────
  - key: RATE_LIMIT_WINDOW_MS
    value: "900000"               # 15 minutes
  - key: RATE_LIMIT_MAX_REQUESTS
    value: "100"
  - key: AUTH_RATE_LIMIT_MAX
    value: "5"

  # ── CORS ──────────────────────────────────────────────────
  - key: CORS_ORIGINS
    value: https://echotune-ai-${APP_ID}.ondigitalocean.app

  # ── Logging / Observability ───────────────────────────────
  - key: LOG_LEVEL
    value: "info"
  - key: ENABLE_METRICS
    value: "true"
```

---

## 5. Environment Variables Reference

### Required (App Won't Start Without These)
| Variable | Example | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | Atlas connection string |
| `MONGODB_DB_NAME` | `echotune` | Database name |
| `JWT_SECRET` | `<32+ random chars>` | JWT signing secret |
| `SESSION_SECRET` | `<32+ random chars>` | Express session secret |
| `SPOTIFY_CLIENT_ID` | `abc123...` | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | `def456...` | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | `https://app.../auth/callback` | Must match Spotify dashboard |

### Required for AI Features (At Least One)
| Variable | Provider | Get It At |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | aistudio.google.com |
| `OPENAI_API_KEY` | OpenAI GPT | platform.openai.com |
| `OPENROUTER_API_KEY` | OpenRouter | openrouter.ai |
| `ANTHROPIC_API_KEY` | Claude | console.anthropic.com |
| `XAI_API_KEY` | Grok 4 | x.ai/api |

> **Note:** If no AI key is provided, the app runs in **Demo Mode** using the mock provider.
> All features except real LLM responses work normally.

### Optional (Performance & Features)
| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | none (in-memory) | Redis connection string |
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | `production` enables optimizations |
| `LOG_LEVEL` | `info` | `debug`\|`info`\|`warn`\|`error` |
| `MONGODB_MAX_POOL_SIZE` | `10` | MongoDB connection pool size |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Per-IP requests per window |
| `CACHE_TTL` | `3600000` | Default cache TTL (ms) |
| `ENABLE_METRICS` | `true` | Expose `/metrics` Prometheus endpoint |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |

---

## 6. Nginx Reverse Proxy Configuration

Used in Docker Compose and self-hosted deployments. DigitalOcean App Platform handles
this automatically — Nginx config is only needed for Docker-based deployments.

```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;

events {
  worker_connections 1024;
  use epoll;
  multi_accept on;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  # Access log format
  log_format main '$remote_addr - "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"';
  access_log /var/log/nginx/access.log main;

  sendfile on;
  keepalive_timeout 65;
  client_max_body_size 10M;

  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_types text/plain text/css application/json application/javascript image/svg+xml;

  # Security headers
  add_header X-Frame-Options DENY always;
  add_header X-Content-Type-Options nosniff always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Rate limiting zones
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=auth:10m rate=2r/s;

  server {
    listen 80;
    server_name _;

    # Redirect HTTP to HTTPS (production)
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name echotune.example.com;  # ← Your domain

    ssl_certificate /etc/letsencrypt/live/echotune.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/echotune.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Serve Vite-built static assets directly (bypasses Node.js)
    location /assets/ {
      root /app/dist;
      expires 1y;
      add_header Cache-Control "public, immutable";
    }

    # Auth endpoints (stricter rate limit)
    location /auth/ {
      limit_req zone=auth burst=5 nodelay;
      proxy_pass http://app:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api/ {
      limit_req zone=api burst=20 nodelay;
      proxy_pass http://app:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO (WebSocket upgrade)
    location /socket.io/ {
      proxy_pass http://app:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_read_timeout 86400;
    }

    # SPA fallback (React Router)
    location / {
      try_files $uri $uri/ /index.html;
      root /app/dist;
    }
  }
}
```

---

## 7. Docker Local Development

### docker-compose.yml (Standard)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - redis
    command: npm run dev

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

### docker-compose.full-stack.yml (With Nginx)
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      target: runtime
    env_file: .env
    environment:
      - NODE_ENV=production
    depends_on:
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./dist:/app/dist:ro
    depends_on:
      - app

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Running Locally
```bash
# Quick start (Node + Redis)
docker-compose up

# Full stack with Nginx
npm run build    # Build frontend first
docker-compose -f docker-compose.full-stack.yml up --build

# Run just the app (no Docker)
npm install
cp .env.example .env  # Edit with your credentials
npm run dev           # nodemon server.js on port 3000
```

---

## 8. Health Check Implementation

```javascript
// src/api/health/health-routes.js
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const health = { status: 'healthy', services: {}, timestamp: new Date().toISOString() };

  // Check MongoDB
  try {
    await mongoManager.client.db('admin').command({ ping: 1 });
    health.services.mongodb = { status: 'connected', latencyMs: Date.now() - startTime };
  } catch {
    health.services.mongodb = { status: 'disconnected' };
    health.status = 'degraded';
  }

  // Check Redis (optional)
  if (redisClient) {
    try {
      await redisClient.ping();
      health.services.redis = { status: 'connected' };
    } catch {
      health.services.redis = { status: 'disconnected' };
      // Redis failure is not critical — app degrades gracefully
    }
  }

  health.uptime = process.uptime();
  health.version = process.env.npm_package_version || '1.0.0';
  health.environment = process.env.NODE_ENV || 'development';

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({ success: health.status === 'healthy', ...health });
});

// Also expose at /healthz for DO health check compatibility
router.get('/z', (req, res) => res.status(200).send('OK'));
```

---

## 9. Backup Strategy

### MongoDB Atlas Automated Backups
Atlas M10+ clusters include automated backups. For free tier (M0):

```bash
# Manual backup script (run via cron on a separate server or GitHub Actions)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump \
  --uri="$MONGODB_URI" \
  --db=echotune \
  --out="/backups/echotune_$DATE" \
  --gzip

# Upload to DigitalOcean Spaces (S3-compatible)
aws s3 sync /backups "s3://echotune-backups/$(date +%Y/%m/)" \
  --endpoint-url https://nyc3.digitaloceanspaces.com

# Keep only last 30 days
find /backups -mtime +30 -exec rm -rf {} \;
```

### Backup Schedule (Recommended)
| Frequency | Retention | Storage |
|---|---|---|
| Daily | 30 days | DigitalOcean Spaces |
| Weekly | 12 weeks | DigitalOcean Spaces |
| Monthly | 12 months | Cold storage |

---

## 10. Scaling Strategy

### Horizontal Scaling (App Platform)
```yaml
# digitalocean-app.yaml — increase instance count
instance_count: 3  # Scale from 1 → 3
instance_size_slug: basic-xs  # Upgrade from xxs ($5) → xs ($12)
```

**Requirements before scaling horizontally:**
1. ✅ MongoDB Atlas (already centralized)
2. ✅ Redis (centralized cache — required for session consistency across instances)
3. ✅ Socket.IO sticky sessions or Redis adapter (for WebSocket consistency)

### Socket.IO Redis Adapter (Required for Multiple Instances)
```javascript
// server.js — add when scaling to 2+ instances
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### MongoDB Atlas Scaling
- M0 → M10: Enables dedicated resources + backups
- M10 → M20: Enables read replicas
- Enable read replicas for recommendation queries (heavy aggregations)

```javascript
// Use secondary preferred for read-heavy recommendation queries
const db = client.db('echotune', { readPreference: 'secondaryPreferred' });
```

---

## 11. SSL / HTTPS

### DigitalOcean App Platform
SSL is **automatic**. DigitalOcean provisions and renews Let's Encrypt certificates.
No configuration required — HTTPS is on by default.

### Custom Domain
1. App Platform dashboard → **Settings** → **Domains**
2. Add your domain: `echotune.yourdomain.com`
3. Add CNAME record in your DNS: `echotune.yourdomain.com → <app>.ondigitalocean.app`
4. DigitalOcean auto-provisions SSL certificate

---

## 12. Monitoring

### Built-in Prometheus Metrics (Available at `/metrics`)
```
echotune_llm_request_duration_seconds  — LLM call latency histogram
echotune_http_request_duration_seconds — HTTP request latency
echotune_active_sessions_total         — Active user sessions
echotune_recommendations_generated     — Recommendation count
```

### DigitalOcean App Platform Logs
```bash
# View app logs (requires doctl CLI)
doctl apps logs <app-id> --type=RUN --follow

# Or via Dashboard:
# App Platform → your app → Insights → Runtime Logs
```

### Health Dashboard
Poll `/api/health` every 30 seconds from your monitoring tool (UptimeRobot, Grafana, etc.):
```bash
# Quick health check
curl https://your-app.ondigitalocean.app/api/health | jq .
```

---

## 13. Post-Deployment Checklist

```
□ MongoDB Atlas connection string tested (ping returns pong)
□ Spotify redirect URI matches deployed URL exactly
□ /api/health returns { status: "healthy" }
□ /auth/login returns Spotify authorization URL
□ Full OAuth flow completes (login → callback → JWT issued)
□ Chat sends message and receives response
□ At least one LLM provider is healthy (/api/llm/providers)
□ Socket.IO connects (browser console shows "Socket.IO connected")
□ npm test passes in CI
□ HTTPS active (padlock in browser)
□ LOG_LEVEL=info (not debug) in production
□ MONGODB_URI is SECRET type (not plain text) in DO dashboard
```

---

## Cross-References

- Environment variables used by auth → `06-SPOTIFY-INTEGRATION.md`
- MongoDB collections initialized at startup → `03-DATA-MODELS.md`
- Health check endpoint implementation → `05-API-REFERENCE.md`
- Full build sequence → `11-BUILD-CHECKLIST.md`
