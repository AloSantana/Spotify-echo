# Logging Configuration Guide

This guide explains how to control logging verbosity in EchoTune AI and configure the observability services.

## Table of Contents

- [Quick Start](#quick-start)
- [LOG_LEVEL Environment Variable](#log_level-environment-variable)
- [OpenTelemetry Tracing](#opentelemetry-tracing)
- [Phase 9 Observability Services](#phase-9-observability-services)
- [Production Configuration](#production-configuration)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Recommended Development Setup

Create or update your `.env` file:

```bash
# Standard logging (recommended)
LOG_LEVEL=info

# Disable excessive OpenTelemetry console output
ENABLE_TRACING=true  # Uses no-op exporter for spans

# Optional: Disable Phase 9 services if not needed
# ENABLE_APM=false
# ENABLE_BI=false
# ENABLE_REAL_TIME_ANALYTICS=false
# ENABLE_ADVANCED_ALERTING=false
```

Start the application:

```bash
npm start
```

---

## LOG_LEVEL Environment Variable

The `LOG_LEVEL` environment variable controls the verbosity of application logs.

### Available Log Levels

| Level | Description | Use Case | Console Output |
|-------|-------------|----------|----------------|
| `trace` | Most verbose | Deep debugging, OpenTelemetry spans | Maximum (spans, debug, info, warnings, errors) |
| `debug` | Detailed debugging | APM alerts, BI insights, pattern detection | High (debug, info, warnings, errors) |
| `info` | Standard information | Normal development | Moderate (info, warnings, errors) |
| `warn` | Warnings only | Production | Low (warnings, errors) |
| `error` | Errors only | Production troubleshooting | Minimal (errors only) |

### Setting LOG_LEVEL

#### In .env File (Recommended)
```bash
LOG_LEVEL=info
```

#### Via Command Line
```bash
LOG_LEVEL=debug npm start
```

#### In Docker
```dockerfile
ENV LOG_LEVEL=warn
```

### What Each Level Shows

#### LOG_LEVEL=trace
**Includes everything from debug level, plus:**
- OpenTelemetry span exports to console
- Full trace IDs and span details
- DNS lookup traces
- TCP connection traces
- HTTP request/response traces

**Example Output:**
```
resource: {
  attributes: {
    'service.name': 'echotune-api',
    'service.version': '1.0.0',
    ...
  }
},
traceId: '4d44d014bc4d39ec55633948f2058636',
spanId: '8a9c2b1f3e4d5c6a',
...
```

#### LOG_LEVEL=debug
**Includes everything from info level, plus:**
- 🔍 Anomaly detection alerts
- 🚨 Real-time alerts (High CPU Usage, etc.)
- ⚠️ APM anomalies and warnings
- 💡 BI insights generation
- 🔍 Analytics pattern detection
- 📊 Metric updates and baselines

**Example Output:**
```
🔍 Anomaly detected: statistical_outlier in system.cpu_usage
🚨 Real-time alert triggered: High CPU Usage
⚠️ APM Anomaly: cpu is 213% above average
💡 BI Insights: 3 new insights generated
🔍 Analytics Pattern: spike_detection detected in apm-performance
```

#### LOG_LEVEL=info (Default)
**Standard operational logs:**
- ✅ Service initialization
- 🔌 Connection establishment
- 📊 Major operational events
- ⚪ Feature flags (enabled/disabled)
- 🚀 Server start/stop

**Example Output:**
```
✅ Advanced APM Service initialized successfully
✅ Business Intelligence Dashboard Service initialized successfully
🔌 WebSocket server started on port 8080
⚪ AgentOps disabled (ENABLE_AGENTOPS=false or no API key)
🚀 Server started on port 3000
```

#### LOG_LEVEL=warn
**Warnings and errors only:**
- ⚠️ Configuration warnings
- ⚠️ Connection issues
- ❌ Errors

**Example Output:**
```
⚠️ MongoDB connection timeout - retrying...
⚠️ SPOTIFY_REDIRECT_URI not configured - using default
❌ Failed to initialize OpenAI provider
```

#### LOG_LEVEL=error
**Errors only:**
- ❌ Critical errors
- ❌ Unhandled exceptions
- ❌ Service failures

---

## OpenTelemetry Tracing

### How It Works

The application uses OpenTelemetry for distributed tracing. The tracing exporter behavior is controlled by LOG_LEVEL:

| LOG_LEVEL | Exporter Type | Console Output |
|-----------|--------------|----------------|
| trace, debug | ConsoleSpanExporter | Full span details |
| info, warn, error | NoOpSpanExporter | No console output |
| (with OTLP endpoint) | OTLPTraceExporter | Sent to OTLP endpoint |

### Configuration Options

#### Development (Console Output)
```bash
# Full trace output
LOG_LEVEL=trace
ENABLE_TRACING=true

# Or debug level
LOG_LEVEL=debug
ENABLE_TRACING=true
```

#### Development (Quiet)
```bash
# No console span output (recommended)
LOG_LEVEL=info
ENABLE_TRACING=true
```

#### Production (OTLP Endpoint)
```bash
LOG_LEVEL=warn
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otlp-collector:4318/v1/traces
OTEL_SERVICE_NAME=echotune-api
```

#### Disable Tracing
```bash
ENABLE_TRACING=false
```

### Custom Span Creation

The application automatically instruments:
- HTTP requests and responses
- Express middleware and routes
- MongoDB operations
- Redis operations

Manual spans can be created:
```javascript
const { getTracer } = require('./src/infra/observability/tracing');
const tracer = getTracer('my-service');

tracer.startActiveSpan('my-operation', (span) => {
  try {
    // Your code here
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: error.message 
    });
    throw error;
  } finally {
    span.end();
  }
});
```

---

## Phase 9 Observability Services

Phase 9 includes four comprehensive observability and analytics services:

1. **Advanced APM Service** - Application Performance Monitoring
2. **Business Intelligence Dashboard Service** - BI Dashboards and KPIs
3. **Real-Time Analytics & Visualization Service** - Live Data Streaming
4. **Advanced Alerting & Anomaly Detection Service** - Intelligent Alerts

### Controlling Phase 9 Services

#### Enable/Disable Individual Services

```bash
# In .env
ENABLE_APM=true                      # Application Performance Monitoring
ENABLE_BI=true                       # Business Intelligence Dashboards
ENABLE_REAL_TIME_ANALYTICS=true      # Real-Time Analytics
ENABLE_ADVANCED_ALERTING=true        # Alerting & Anomaly Detection
```

#### Service Logging Behavior

Each Phase 9 service respects the LOG_LEVEL setting:

| Service | LOG_LEVEL=info | LOG_LEVEL=debug |
|---------|---------------|-----------------|
| APM | Silent | CPU alerts, anomalies, recommendations |
| BI | Silent | Insights, reports, KPI updates |
| Analytics | Silent | Pattern detection, alerts |
| Alerting | Silent | Anomaly detection, incidents |

### Accessing Service Data

Even with verbose logging disabled, all services remain fully functional via API endpoints:

```bash
# APM Metrics
curl http://localhost:3000/api/phase9/apm/metrics

# BI Dashboards
curl http://localhost:3000/api/phase9/bi/dashboards

# Real-Time Analytics
curl http://localhost:3000/api/phase9/analytics/streams

# Alerting System
curl http://localhost:3000/api/phase9/alerting/alerts

# Comprehensive Status
curl http://localhost:3000/api/phase9/overview
```

### Performance Tuning

Reduce Phase 9 resource usage in development:

```bash
# Increase collection intervals (less frequent monitoring)
APM_COLLECTION_INTERVAL=10000        # Default: 5000ms
BI_REFRESH_INTERVAL=60000            # Default: 30000ms
ANALYTICS_UPDATE_INTERVAL=5000       # Default: 1000ms
ALERTING_DETECTION_INTERVAL=60000    # Default: 30000ms

# Or disable services entirely
ENABLE_APM=false
ENABLE_BI=false
ENABLE_REAL_TIME_ANALYTICS=false
ENABLE_ADVANCED_ALERTING=false
```

---

## Production Configuration

### Recommended Production Settings

```bash
# Production environment
NODE_ENV=production
LOG_LEVEL=warn

# Observability
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector:4318/v1/traces
OTEL_SERVICE_NAME=echotune-api-prod

# Phase 9 Services (all enabled for production monitoring)
ENABLE_APM=true
ENABLE_BI=true
ENABLE_REAL_TIME_ANALYTICS=true
ENABLE_ADVANCED_ALERTING=true

# Alerting Thresholds (tighter for production)
APM_CPU_THRESHOLD=70
APM_MEMORY_THRESHOLD=80
APM_RESPONSE_TIME_THRESHOLD=500
APM_ERROR_RATE_THRESHOLD=2

# Structured Logging
PINO_PRETTY=false  # Disable pretty printing in production
```

### Log Aggregation

#### With Pino Transport (Production)

```javascript
// Configure in production
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'warn',
  transport: {
    target: 'pino/file',
    options: { destination: '/var/log/echotune/app.log' }
  }
});
```

#### With External Log Aggregator

```bash
# Ship logs to external service
LOG_AGGREGATOR_URL=https://logs.example.com
LOG_AGGREGATOR_KEY=your-key-here
```

### Metrics and Monitoring

Access Prometheus metrics:
```bash
curl http://localhost:3000/metrics
```

View health status:
```bash
curl http://localhost:3000/healthz
```

---

## Troubleshooting

### Issue: Too Much Console Output

**Solution:**
```bash
# Reduce verbosity
LOG_LEVEL=info  # or warn

# Disable OpenTelemetry console output
# (automatically disabled when LOG_LEVEL != trace/debug)
```

### Issue: Not Seeing Debug Information

**Solution:**
```bash
# Enable debug logging
LOG_LEVEL=debug

# Or full trace output
LOG_LEVEL=trace
```

### Issue: Phase 9 Alerts Are Spamming Console

**Solution:**
```bash
# Option 1: Reduce verbosity (recommended)
LOG_LEVEL=info

# Option 2: Disable specific services
ENABLE_ADVANCED_ALERTING=false
ENABLE_APM=false

# Option 3: Increase detection intervals
ALERTING_DETECTION_INTERVAL=300000  # 5 minutes
APM_COLLECTION_INTERVAL=30000       # 30 seconds
```

### Issue: OpenTelemetry Spans in Console

**Solution:**
```bash
# Disable console span export
LOG_LEVEL=info  # or warn/error

# Console spans only appear with LOG_LEVEL=trace or LOG_LEVEL=debug
```

### Issue: Missing Log Messages

**Solution:**
```bash
# Check current log level
echo $LOG_LEVEL

# Ensure it's not too restrictive
LOG_LEVEL=info  # or debug for more detail

# Verify logger is initialized
# Check for "Pino not available, using console-based logger fallback"
```

### Issue: Performance Impact from Logging

**Solution:**
```bash
# Production settings
NODE_ENV=production
LOG_LEVEL=warn

# Disable Phase 9 in development if not needed
ENABLE_APM=false
ENABLE_BI=false
ENABLE_REAL_TIME_ANALYTICS=false
ENABLE_ADVANCED_ALERTING=false

# Disable OpenTelemetry auto-instrumentation
ENABLE_TRACING=false
```

---

## Examples

### Development Environment

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=info
ENABLE_TRACING=true
ENABLE_APM=true
ENABLE_BI=false
ENABLE_REAL_TIME_ANALYTICS=false
ENABLE_ADVANCED_ALERTING=false
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://staging-collector:4318/v1/traces
ENABLE_APM=true
ENABLE_BI=true
ENABLE_REAL_TIME_ANALYTICS=true
ENABLE_ADVANCED_ALERTING=true
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://prod-collector:4318/v1/traces
ENABLE_APM=true
ENABLE_BI=true
ENABLE_REAL_TIME_ANALYTICS=true
ENABLE_ADVANCED_ALERTING=true
APM_CPU_THRESHOLD=70
APM_MEMORY_THRESHOLD=80
```

---

## Best Practices

1. **Use appropriate log levels:**
   - Development: `info` or `debug`
   - Staging: `info`
   - Production: `warn` or `error`

2. **Never log sensitive data:**
   - Passwords, tokens, API keys are automatically redacted
   - Review custom log statements

3. **Monitor log volume:**
   - High log volume can impact performance
   - Use log sampling in high-traffic scenarios

4. **Use structured logging:**
   - Pino provides JSON-structured logs
   - Easier to parse and analyze

5. **Configure log rotation:**
   - Prevent disk space issues
   - Use logrotate or similar tools

6. **Test log levels:**
   - Verify each level shows expected information
   - Ensure no sensitive data leaks

7. **Document log messages:**
   - Clear, actionable messages
   - Include context for debugging

---

## Related Documentation

- [ISSUES_SUMMARY.md](../ISSUES_SUMMARY.md) - Common issues and solutions
- [.env.example](../.env.example) - Environment configuration template
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Pino Logger Documentation](https://getpino.io/)

---

**Last Updated:** 2025-10-20
**Version:** 1.0.0
