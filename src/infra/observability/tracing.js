'use strict';

/**
 * OpenTelemetry Tracing Skeleton
 * Configures tracing for the application with automatic instrumentation
 */

let NodeSDK, getNodeAutoInstrumentations, Resource, SemanticResourceAttributes, opentelemetry;

try {
  NodeSDK = require('@opentelemetry/sdk-node').NodeSDK;
  getNodeAutoInstrumentations = require('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
  Resource = require('@opentelemetry/resources').Resource;
  SemanticResourceAttributes = require('@opentelemetry/semantic-conventions').SemanticResourceAttributes;
  opentelemetry = require('@opentelemetry/api');
} catch (error) {
  console.warn('OpenTelemetry modules not available, tracing disabled:', error.message);
}

let sdk = null;
let isInitialized = false;
const logger = require('./logger');

/**
 * Initialize OpenTelemetry tracing
 */
function initializeTracing() {
  if (isInitialized) {
    logger.warn('OpenTelemetry tracing already initialized');
    return;
  }

  if (!NodeSDK || !getNodeAutoInstrumentations || !Resource || !SemanticResourceAttributes) {
    logger.warn('OpenTelemetry modules not available, skipping tracing initialization');
    return;
  }

  try {
    const serviceName = process.env.OTEL_SERVICE_NAME || 'echotune-api';
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    logger.info({
      msg: 'Initializing OpenTelemetry tracing',
      serviceName,
      otlpEndpoint: otlpEndpoint ? 'configured' : 'using console exporter'
    });

    // Configure resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    });

    // Configure tracing exporter
    let traceExporter;
    if (otlpEndpoint) {
      const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
      traceExporter = new OTLPTraceExporter({
        url: otlpEndpoint,
        headers: {},
      });
      logger.info('Using OTLP trace exporter');
    } else {
      // Only use ConsoleSpanExporter if LOG_LEVEL is trace or debug
      const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
      const enableConsoleExporter = logLevel === 'trace' || logLevel === 'debug';
      
      if (enableConsoleExporter) {
        const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
        traceExporter = new ConsoleSpanExporter();
        logger.info('Using Console span exporter for development (LOG_LEVEL=' + logLevel + ')');
      } else {
        // Use a no-op exporter to avoid console spam
        const { SpanExporter, ExportResult, ExportResultCode } = require('@opentelemetry/sdk-trace-base');
        class NoOpSpanExporter extends SpanExporter {
          export(spans, resultCallback) {
            resultCallback({ code: ExportResultCode.SUCCESS });
          }
          shutdown() {
            return Promise.resolve();
          }
        }
        traceExporter = new NoOpSpanExporter();
        logger.info('Using No-Op span exporter (set LOG_LEVEL=trace or LOG_LEVEL=debug for console output)');
      }
    }

    // Initialize the SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Configure specific instrumentations
          '@opentelemetry/instrumentation-http': {
            requestHook: (span, request) => {
              // Add request ID correlation if available
              const requestId = request.headers['x-request-id'];
              if (requestId) {
                span.setAttributes({
                  'request.id': requestId
                });
              }
            }
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true
          },
          '@opentelemetry/instrumentation-mongodb': {
            enabled: true
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true
          }
        })
      ],
    });

    sdk.start();
    isInitialized = true;

    logger.info({
      msg: 'OpenTelemetry tracing initialized successfully',
      serviceName,
      instrumentations: 'auto-instrumentations enabled'
    });

  } catch (error) {
    logger.error({
      msg: 'Failed to initialize OpenTelemetry tracing',
      error: error.message
    });
    // Don't throw - fail gracefully
  }
}

/**
 * Create a manual span for external operations
 * Integrates with timeExternal wrapper
 */
function createManualSpan(service, operation, fn) {
  const tracer = opentelemetry.trace.getTracer('echotune-manual');
  
  return tracer.startActiveSpan(`${service}.${operation}`, async (span) => {
    try {
      // Set span attributes
      span.setAttributes({
        'service': service,
        'operation': operation,
        'component': 'external-api'
      });

      const result = await fn();
      
      span.setStatus({ 
        code: opentelemetry.SpanStatusCode.OK 
      });
      
      return result;
    } catch (error) {
      span.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: error.message
      });
      
      span.setAttributes({
        'error': true,
        'error.message': error.message,
        'error.name': error.name
      });
      
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Enhanced timeExternal that creates manual spans
 */
function timeExternalWithTracing(service, operation, fn) {
  return createManualSpan(service, operation, fn);
}

/**
 * Stop tracing (cleanup)
 */
function stopTracing() {
  if (sdk && isInitialized) {
    return sdk.shutdown()
      .then(() => {
        logger.info('OpenTelemetry tracing stopped');
        isInitialized = false;
      })
      .catch((error) => {
        logger.error({
          msg: 'Error stopping OpenTelemetry tracing',
          error: error.message
        });
      });
  }
}

/**
 * Get current tracer
 */
function getTracer(name = 'echotune-app') {
  return opentelemetry.trace.getTracer(name);
}

/**
 * Get active span
 */
function getActiveSpan() {
  return opentelemetry.trace.getActiveSpan();
}

/**
 * Add request ID to active span if available
 */
function addRequestIdToSpan(requestId) {
  const span = getActiveSpan();
  if (span && requestId) {
    span.setAttributes({
      'request.id': requestId
    });
  }
}

module.exports = {
  initializeTracing,
  stopTracing,
  createManualSpan,
  timeExternalWithTracing,
  getTracer,
  getActiveSpan,
  addRequestIdToSpan,
  isInitialized: () => isInitialized
};