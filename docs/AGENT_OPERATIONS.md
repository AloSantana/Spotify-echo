# 🤖 Agent Operations Guide

This document outlines the operational procedures and best practices for GitHub Copilot Coding Agents working on EchoTune AI.

## 📋 Overview

EchoTune AI leverages advanced AI coding agents with comprehensive MCP (Model Context Protocol) server integration to automate development workflows, ensure code quality, and maintain production readiness.

## 🎯 Core Agent Responsibilities

### 1. Code Quality Assurance
- **NO_MOCK Policy Enforcement**: Ensure no mock data or random values in production recommendation code
- **Security Validation**: Check for exposed credentials, validate input sanitization
- **Performance Optimization**: Identify bottlenecks, suggest caching strategies
- **Testing Coverage**: Maintain comprehensive test coverage for new features

### 2. MCP Server Management
- **Health Monitoring**: Continuously monitor MCP server status and performance
- **Integration Validation**: Verify all MCP servers are properly configured and operational
- **Workflow Orchestration**: Coordinate multi-server workflows for complex operations
- **Error Recovery**: Implement fallback mechanisms for MCP server failures

### 3. Documentation Maintenance
- **Auto-Documentation**: Generate and update technical documentation
- **API Documentation**: Maintain OpenAPI specifications and endpoint documentation
- **Configuration Updates**: Keep environment and deployment configurations current
- **Change Logs**: Document significant changes and their impact

## 🔧 Operational Procedures

### Pre-Development Checklist
1. **Environment Validation**
   ```bash
   npm run validate:env
   npm run validate:api-keys
   ```

2. **MCP Server Status Check**
   ```bash
   npm run mcp:health:all
   ./start-mcp-servers.sh
   ```

3. **Code Quality Baseline**
   ```bash
   npm run validate
   npm run test
   node scripts/validate-no-mock.js
   ```

### Development Workflow
1. **Branch Creation**: Use descriptive branch names following convention
2. **Feature Implementation**: Follow established patterns and architecture
3. **Testing**: Write tests for new functionality before implementation
4. **Documentation**: Update relevant documentation files
5. **MCP Integration**: Leverage appropriate MCP servers for automation
6. **Validation**: Run comprehensive validation suite

### Post-Development Checklist
1. **Code Review Preparation**
   ```bash
   npm run validate:all
   npm run mcp:test:all
   ```

2. **Performance Impact Assessment**
   - Monitor memory usage
   - Check response times
   - Validate database query efficiency

3. **Security Scan**
   - Check for credential leaks
   - Validate input sanitization
   - Review authentication flows

## 🛡️ Security Guidelines

### API Key Management
- **Never hardcode credentials** in source code
- **Use environment variables** for all sensitive data
- **Rotate keys regularly** and update documentation
- **Implement least privilege access** for service accounts

### Data Protection
- **Encrypt sensitive data** at rest and in transit
- **Sanitize all inputs** to prevent injection attacks
- **Log security events** for audit trails
- **Implement rate limiting** for all external APIs

## 📊 Monitoring and Observability

### Health Check Endpoints
- **Application Health**: `/health`
- **Database Status**: `/health/db`
- **MCP Server Status**: `/health/mcp`
- **External API Status**: `/health/apis`

### Key Metrics
- **Response Times**: API endpoint latency
- **Error Rates**: 4xx/5xx response percentages
- **MCP Server Uptime**: Availability across all servers
- **Resource Usage**: CPU, memory, disk utilization

### Alerting Thresholds
- **Critical**: Service downtime, database connectivity issues
- **Warning**: High error rates (>5%), slow response times (>2s)
- **Info**: MCP server restarts, configuration changes

## 🔄 Incident Response

### Severity Levels
1. **Critical (P0)**: Service completely down, data loss risk
2. **High (P1)**: Major functionality impacted, user-facing errors
3. **Medium (P2)**: Minor functionality issues, degraded performance
4. **Low (P3)**: Non-critical issues, cosmetic problems

### Response Procedures
1. **Immediate Assessment**: Determine scope and impact
2. **Containment**: Isolate affected systems or components
3. **Investigation**: Use monitoring tools and logs to identify root cause
4. **Resolution**: Implement fix with appropriate testing
5. **Documentation**: Record incident details and lessons learned

## 🎛️ MCP Server Operations

### Server Categories
- **Core Servers**: Essential for basic functionality (filesystem, git)
- **Enhanced Servers**: Advanced features (analytics, validation)
- **Community Servers**: Third-party integrations (GitHub, databases)
- **Custom Servers**: EchoTune-specific implementations

### Management Commands
```bash
# Start all MCP servers
./start-mcp-servers.sh

# Health check
npm run mcp:health:all

# Individual server management
npm run mcp:filesystem
npm run mcp:analytics
npm run mcp:github-repos

# Validation and testing
npm run mcp:validate:all
npm run mcp:test:all
```

### Configuration Management
- **Primary Config**: `.copilot/mcp-config.json`
- **Fallback Config**: `.copilot/mcp-config.example.json`
- **Validation**: `scripts/mcp-agent-bootstrap.js`
- **Health Monitoring**: Automated via orchestrator

## 📝 Best Practices

### Code Development
- **Follow existing patterns** in the codebase
- **Use TypeScript-style JSDoc** comments for documentation
- **Implement proper error handling** with try/catch blocks
- **Write tests first** for new functionality
- **Leverage MCP servers** for automation where possible

### Performance Optimization
- **Use caching strategically** for expensive operations
- **Implement connection pooling** for database operations
- **Optimize database queries** with proper indexing
- **Monitor resource usage** and scale accordingly

### Deployment
- **Use environment-specific configurations**
- **Implement blue-green deployments** for zero downtime
- **Run comprehensive tests** before production deployment
- **Have rollback plans** ready for critical deployments

## 🔗 Related Resources

- [Testing Policy](./TESTING_POLICY.md)
- [MCP Server Inventory](./MCP_SERVER_INVENTORY.md)
- [Recommendation Pipeline Skeleton](./RECOMMENDATION_PIPELINE_SKELETON.md)
- [Agent MCP Adoption ADR](./decisions/0001-agent-mcp-adoption.md)

---

**Last Updated**: Auto-generated by Agent Operations Documentation System
**Version**: 1.0.0
**Owner**: EchoTune AI Development Team