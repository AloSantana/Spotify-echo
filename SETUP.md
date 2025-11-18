# EchoTune AI - Setup Guide

## Quick Start

If you encounter the error: `Cannot find module 'dotenv'`, follow these steps:

### 1. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- dotenv (environment variable management)
- express (web server)
- All other dependencies listed in package.json

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual configuration
nano .env  # or use your preferred editor
```

### 3. Generate Prisma Client

```bash
npx prisma generate --schema=./prisma/schema.prisma
```

### 4. Start the Server

```bash
npm start
```

## Common Issues

### Error: "Cannot find module 'dotenv'"

**Cause**: Dependencies not installed after cloning/pulling the repository.

**Solution**:
```bash
npm install
```

### Error: "Prisma client not initialized"

**Cause**: Prisma client needs to be generated before first use.

**Solution**:
```bash
npx prisma generate --schema=./prisma/schema.prisma
```

### Error: "Maximum call stack size exceeded"

**Cause**: Circular reference in environment variables.

**Solution**: Check your `.env` file for variables that reference themselves, like:
```bash
# BAD - causes infinite loop
OPENAI_API_KEY=${OPENAI_API_KEY}

# GOOD - comment out or set actual value
# OPENAI_API_KEY=your-key-here
```

### MongoDB Connection Failed

**Cause**: MongoDB not running or incorrect connection string.

**Solution**: 
- The app will use SQLite fallback automatically
- Or configure correct MONGODB_URI in .env file

## Development Workflow

1. **First time setup**:
   ```bash
   git clone <repository>
   cd Spotify-echo
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npx prisma generate
   npm start
   ```

2. **After pulling updates**:
   ```bash
   git pull
   npm install  # Install any new dependencies
   npx prisma generate  # Regenerate Prisma client if schema changed
   npm start
   ```

3. **Running tests**:
   ```bash
   npm test          # Run all tests
   npm run test:unit # Run unit tests only
   npm run lint      # Check code quality
   ```

## Environment Variables

Required environment variables are defined in `.env.example`. At minimum, you need:

- `JWT_SECRET` - Secret for JWT token signing
- `MONGODB_URI` - MongoDB connection string (optional, will use SQLite fallback)
- `DATABASE_URL` - PostgreSQL URL for Prisma (optional)

For full list of environment variables, see `.env.example`.

## Getting Help

- Check existing issues on GitHub
- Review the main README.md for detailed documentation
- Ensure all dependencies are installed with `npm install`
