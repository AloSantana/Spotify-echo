# Enhanced YOLO Mode - Full Automation Ready

**Status**: Optimized for autonomous development workflows
**Last Updated**: 2025-10-24
**Mode**: Production-ready with safety guards

## Core Philosophy
YOLO mode enables rapid, autonomous development while maintaining safety through intelligent guardrails and MCP server integration.

## Enhanced Allowlist

### Git Operations
- `git status`, `git diff`, `git log --oneline -10`
- `git add .`, `git commit -m "message"`
- `git push origin branch-name`
- `git checkout -b feature-branch`
- `git merge --no-ff branch-name`

### File Operations
- `ls`, `cat`, `head`, `tail`, `grep`, `find`
- `mkdir`, `touch`, `mv`, `cp` (within project scope)
- `jq` for JSON processing
- `rg` (ripgrep) for fast searching

### Development Commands
- All `npm run *` scripts from package.json
- `node scripts/*.js` - All automation scripts
- `npx` commands for project tooling
- `docker-compose up/down` for local development

### Testing & Validation
- `npm test`, `npm run test:*`
- `npm run lint`, `npm run lint:fix`
- `npm run validate:*`, `npm run qa:*`
- `npm run mcp:*` - All MCP operations
- `npm run ai:*` - AI provider testing

### API & Integration Testing
- `curl` for API testing (rate-limited)
- `wget` for file downloads (project scope)
- Database queries through npm scripts only

### Browser Automation
- All Playwright commands via npm scripts
- Comet browser integration commands
- Screenshot and recording operations

## Enhanced Blocklist

### System-Level Danger
- `rm -rf /`, `sudo rm -rf`
- `chmod 777`, `chown root`
- System service modifications
- Network configuration changes

### External Deployments
- Direct production deployments
- `vercel --prod`, `netlify deploy --prod`
- AWS CLI production operations
- Docker registry pushes to production

### Security & Secrets
- Direct environment variable modifications
- `.env` file editing (use .env.example as template)
- SSH key operations
- Certificate modifications

### Destructive Database Operations
- `DROP TABLE`, `TRUNCATE`
- Direct MongoDB/Redis mutations
- Schema modifications without migrations

## Resource Limits

### Time Constraints
- Max job duration: **20 minutes** (increased from 10m)
- Max API call timeout: **30 seconds**
- Max file operation timeout: **5 minutes**

### Memory Constraints
- Max memory target: **2GB** (increased from 1GB)
- Max file size for operations: **50MB**
- Max concurrent operations: **10**

### Rate Limiting
- API calls: 60 requests per minute
- File operations: 1000 operations per minute
- Git operations: 20 per minute

## MCP Server Integration

YOLO mode has full access to all MCP servers:

### Research & Analysis
- **perplexity-ask**: Real-time research and fact-checking
- **brave-search**: Web search for development insights
- **music-research**: Domain-specific research automation

### Development & Testing
- **github-integration**: Repository management and automation
- **testing**: Automated test execution and validation
- **browser-automation**: UI testing and validation
- **analytics**: Performance monitoring and metrics

### Infrastructure
- **filesystem**: Safe file operations within project scope
- **package-manager**: Dependency management and updates
- **memory**: Context retention between sessions
- **browserbase**: Advanced browser automation

## Comet Browser Integration

### Allowed Operations
```javascript
// Full browser automation is enabled in YOLO mode
const cometConfig = {
    headless: process.env.YOLO_HEADLESS === 'true',
    viewport: { width: 1920, height: 1080 },
    timeout: 30000,
    retries: 3,
    screenshot: true, // Auto-screenshot on failures
    recording: false  // Enable for debugging
};
```

### Comet Capabilities
- ✅ Navigate to any URL for testing
- ✅ Interact with DOM elements
- ✅ Form submissions and user interactions
- ✅ Screenshot and video recording
- ✅ Performance monitoring
- ✅ Accessibility testing
- ❌ Sensitive data extraction
- ❌ Login to production services

## Safety Mechanisms

### Automatic Rollback
- Git commits are created before major changes
- Automatic branch creation for experimental features
- Package.json backup before dependency changes

### Validation Gates
- All code changes trigger automated tests
- MCP servers validate operations before execution
- Performance impact assessment for major changes

### Monitoring & Alerts
- Resource usage monitoring
- Error rate tracking
- Performance degradation alerts

## Usage Patterns

### Enable YOLO Mode
```json
{
  "workflow": "feature-development",
  "yolo": true,
  "safety_level": "medium",
  "max_duration": "20m",
  "auto_commit": true
}
```

### Progressive Enhancement
```json
{
  "yolo": {
    "enabled": true,
    "progressive": {
      "start_safe": true,
      "increase_permissions": "on_success",
      "max_risk_level": "medium"
    }
  }
}
```

## Workflow Integration

### Development Cycle
1. **Research Phase**: Use Perplexity MCP for requirements analysis
2. **Planning Phase**: Generate tasks using GitHub MCP
3. **Implementation Phase**: Full YOLO automation with safety nets
4. **Testing Phase**: Comprehensive testing via MCP servers
5. **Validation Phase**: Browser testing with Comet integration

### Continuous Integration
- YOLO mode integrates with existing CI/CD pipelines
- Automated PR creation and review requests
- Real-time validation and feedback loops

## Performance Metrics

### Success Criteria
- ✅ Task completion rate: >85%
- ✅ Error recovery rate: >95%
- ✅ Test pass rate: >90%
- ✅ Performance within targets

### Monitoring Dashboard
```javascript
// YOLO mode provides real-time metrics
const yoloMetrics = {
    tasksCompleted: 0,
    errorsRecovered: 0,
    testsPassed: 0,
    performanceScore: 0,
    safetyViolations: 0
};
```

## Emergency Procedures

### Circuit Breaker
- Automatic disable on 3 consecutive failures
- Manual override available for critical issues
- Gradual re-enablement after issue resolution

### Rollback Protocol
1. Stop all active operations
2. Revert to last known good state
3. Analyze failure patterns
4. Implement fixes before re-enabling

## Configuration Examples

### Conservative YOLO
```json
{
  "yolo": {
    "enabled": true,
    "risk_level": "low",
    "require_confirmation": ["deploy", "schema_change"],
    "auto_rollback": true
  }
}
```

### Aggressive YOLO (Development Only)
```json
{
  "yolo": {
    "enabled": true,
    "risk_level": "high",
    "environment": "development",
    "skip_confirmations": true,
    "max_concurrent": 15
  }
}
```

## Best Practices

1. **Start Conservative**: Begin with low risk settings and increase gradually
2. **Monitor Metrics**: Keep track of success rates and performance
3. **Regular Reviews**: Weekly assessment of YOLO mode effectiveness
4. **Safety First**: Never compromise security for speed
5. **Documentation**: All YOLO operations are logged and documented

## Integration with Cursor

### Automatic Activation
- YOLO mode activates automatically for routine tasks
- Manual activation required for high-risk operations
- Context-aware risk assessment

### IDE Integration
- Real-time status indicator in Cursor
- Performance metrics display
- Quick disable/enable toggle
- Safety override controls

This enhanced YOLO mode configuration provides the perfect balance between automation speed and safety, enabling truly autonomous development workflows while maintaining production-quality standards.