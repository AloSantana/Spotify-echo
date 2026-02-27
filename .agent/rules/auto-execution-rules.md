# Auto-Execution Rules for EchoTune AI

## General Rules

1. **Always run tests** after modifying service logic
2. **Always lint** JavaScript files after editing
3. **Never commit** `.env` files or files containing secrets
4. **Always check** MongoDB query efficiency after adding queries

## Auto-Approved Operations

### Development
- `npm install` - Install Node.js dependencies
- `npm test` - Run Jest tests
- `npm run lint` - Run ESLint
- `npm start` / `npm run dev` - Start application
- `pip install` - Install Python packages
- `pytest` - Run Python tests

### Git (in development)
- `git status` - Check status
- `git diff` - View changes
- `git add .` - Stage changes
- `git commit` - Commit changes

### Docker
- `docker-compose up/down` - Manage containers
- `docker ps` - List containers
- `docker logs` - View logs

## Auto-Rejected Operations
- Committing `.env` files
- Publishing to npm
- Deleting the `main` branch
- Modifying production database directly
