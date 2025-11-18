# PostgreSQL Setup Guide for EchoTune AI

## Overview

EchoTune AI uses a **hybrid database architecture**:

- **PostgreSQL**: Chat sessions, user preferences, system configuration, and real-time state
- **MongoDB**: Listening history (200K+ records), analytics, and bulk data
- **Redis**: Session management and caching (optional)

This separation provides optimal performance for different data access patterns.

## Quick Start

### Option 1: Docker Compose (Recommended for Development)

1. Add PostgreSQL service to `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: echotune_postgres
    environment:
      POSTGRES_DB: echotune_ai
      POSTGRES_USER: echotune
      POSTGRES_PASSWORD: echotune_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U echotune"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

2. Set environment variable in `.env`:

```bash
POSTGRES_URL=postgresql://echotune:echotune_password@localhost:5432/echotune_ai
```

3. Start services:

```bash
docker-compose up -d postgres
```

### Option 2: Local PostgreSQL Installation

#### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16

createdb echotune_ai
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

sudo -u postgres psql -c "CREATE DATABASE echotune_ai;"
sudo -u postgres psql -c "CREATE USER echotune WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE echotune_ai TO echotune;"
```

#### Windows

Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

Then set `.env`:

```bash
POSTGRES_URL=postgresql://postgres:your_password@localhost:5432/echotune_ai
```

### Option 3: Managed PostgreSQL Services

#### Supabase (Free tier available)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings → Database
4. Update `.env`:

```bash
POSTGRES_URL=postgresql://postgres.[project-ref]:[your-password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

#### Neon (Serverless PostgreSQL)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update `.env`:

```bash
POSTGRES_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
```

#### Railway

1. Create account at [railway.app](https://railway.app)
2. Add PostgreSQL service to your project
3. Copy `DATABASE_URL` from service variables
4. Update `.env`:

```bash
POSTGRES_URL=${{Postgres.DATABASE_URL}}
```

## Database Schema

The Prisma schema defines the following models:

### Core Models

- **User**: User accounts and Spotify profile information
- **UserPreferences**: AI provider settings, music preferences, UI theme
- **ChatSession**: Chat conversation sessions with context and metadata
- **ChatMessage**: Individual messages with Spotify integration and recommendations
- **Playlist**: AI-generated and user playlists with Spotify sync

### System Models

- **SystemConfig**: Application-wide configuration (key-value store)
- **ProviderHealth**: AI provider health monitoring and metrics
- **FeatureFlag**: Feature flag management for A/B testing

## Database Migration

### Initial Migration

Generate and apply the initial database schema:

```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Or in production
npx prisma migrate deploy
```

### Updating Schema

After modifying `prisma/schema.prisma`:

```bash
# Create and apply migration
npx prisma migrate dev --name your_migration_name
```

### Viewing Database

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
```

## Data Access Layer

### Using Prisma Client

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.DATABASE_LOGGING === 'true' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error']
});

// Example: Create user with preferences
const user = await prisma.user.create({
  data: {
    spotifyId: 'spotify_user_id',
    email: 'user@example.com',
    displayName: 'John Doe',
    preferences: {
      create: {
        preferredLLMProvider: 'gemini',
        theme: 'dark',
        defaultView: 'chat'
      }
    }
  },
  include: {
    preferences: true
  }
});

// Example: Create chat message
const message = await prisma.chatMessage.create({
  data: {
    sessionId: session.id,
    userId: user.id,
    role: 'user',
    content: 'Find me upbeat workout music',
    createdAt: new Date()
  }
});

// Always disconnect when done
await prisma.$disconnect();
```

### Connection Pooling

For serverless environments, consider using Prisma's connection pooling:

```javascript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL
    }
  },
  // Add connection pooling
  datasourceUrl: process.env.DATABASE_URL + '?pgbouncer=true&connection_limit=1'
});
```

## MongoDB Coexistence

### When to Use PostgreSQL vs MongoDB

**Use PostgreSQL for:**
- ✅ Chat sessions and messages (transactional, relational)
- ✅ User preferences (frequent reads/writes, structured)
- ✅ System configuration (consistent, cacheable)
- ✅ Provider health (real-time monitoring)
- ✅ Feature flags (runtime configuration)

**Use MongoDB for:**
- ✅ Listening history (200K+ records, append-only)
- ✅ Analytics data (time-series, aggregations)
- ✅ Track metadata cache (flexible schema)
- ✅ Recommendation results (complex nested data)

### Accessing Both Databases

```javascript
// PostgreSQL (Prisma)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// MongoDB
const { MongoClient } = require('mongodb');
const mongoClient = new MongoClient(process.env.MONGODB_URI);
const mongodb = mongoClient.db('echotune_ai');

// Example: Get user preferences from PostgreSQL
const preferences = await prisma.userPreferences.findUnique({
  where: { userId: user.id }
});

// Example: Get listening history from MongoDB
const history = await mongodb.collection('listening_history')
  .find({ userId: user.spotifyId })
  .sort({ played_at: -1 })
  .limit(50)
  .toArray();
```

## Performance Optimization

### Indexing Strategy

Indexes are automatically created for:
- Primary keys (id fields)
- Unique constraints (spotifyId, email)
- Foreign keys (userId, sessionId)
- Frequently queried fields (createdAt, isActive)

### Query Optimization

```javascript
// Use select to fetch only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    displayName: true,
    email: true
  }
});

// Use include for relations
const session = await prisma.chatSession.findUnique({
  where: { id: sessionId },
  include: {
    messages: {
      orderBy: { createdAt: 'asc' },
      take: 10 // Limit messages
    },
    user: {
      select: {
        displayName: true,
        preferences: true
      }
    }
  }
});

// Use pagination for large result sets
const messages = await prisma.chatMessage.findMany({
  where: { sessionId },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize
});
```

### Connection Management

```javascript
// Reuse Prisma Client instance
let prismaClient;

function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prismaClient?.$disconnect();
});
```

## Backup and Maintenance

### Backup

```bash
# Backup database
pg_dump -U echotune -d echotune_ai > backup.sql

# Restore from backup
psql -U echotune -d echotune_ai < backup.sql
```

### Regular Maintenance

```bash
# Vacuum database (reclaim storage)
psql -U echotune -d echotune_ai -c "VACUUM ANALYZE;"

# Check database size
psql -U echotune -d echotune_ai -c "SELECT pg_size_pretty(pg_database_size('echotune_ai'));"
```

## Troubleshooting

### Connection Issues

```bash
# Test PostgreSQL connection
psql -U echotune -d echotune_ai -c "SELECT version();"

# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
```

### Migration Issues

```bash
# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Mark migration as applied without running
npx prisma migrate resolve --applied "migration_name"
```

### Prisma Client Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# Clear Prisma cache
rm -rf node_modules/.prisma
```

## Security Best Practices

1. **Never commit credentials**: Use environment variables
2. **Use SSL in production**: Add `?sslmode=require` to connection string
3. **Limit user permissions**: Create separate users for app vs migrations
4. **Enable connection pooling**: Use PgBouncer or Prisma pooling
5. **Regular updates**: Keep PostgreSQL and Prisma up to date
6. **Backup regularly**: Automated daily backups to separate storage

## Next Steps

1. Set up PostgreSQL using your preferred method
2. Run `npx prisma migrate dev` to create tables
3. Open `npx prisma studio` to explore the database
4. Update application code to use Prisma Client
5. Test chat functionality with PostgreSQL storage

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [EchoTune AI Architecture](./ARCHITECTURE.md)
