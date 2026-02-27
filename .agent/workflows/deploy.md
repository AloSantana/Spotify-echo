# /deploy - Deploy to Production Workflow

## Trigger
`/deploy [environment]`

## Steps

1. **Verify** all tests pass: `npm test && pytest tests/`
2. **Security audit**: `npm audit --audit-level=high`
3. **Build** Docker image: `docker build -t echotune .`
4. **Deploy** using `@agent:devops-infrastructure`
   - Push to DigitalOcean
   - Update Nginx config if needed
   - Restart containers
5. **Verify** health check: `curl https://yourdomain.com/health`

## Pre-deploy Checklist
- [ ] All tests passing
- [ ] No critical security vulnerabilities
- [ ] .env.example updated with new variables
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
