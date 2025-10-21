/**
 * Centralized Error Handler Middleware for Express
 * 
 * Features:
 * - Standardized error response format
 * - Integration with structured logging
 * - PII scrubbing in error details
 * - Environment-aware error details (dev vs production)
 * - Automatic error code mapping
 * - Request context preservation
 */

const logger = require('../logger');
const config = require('../config');
const { ERROR_CODES, createErrorResponse } = require('../shared/api-contracts');

/**
 * Map common error types to standard error codes
 */
const ERROR_TYPE_MAP = {
  'ValidationError': ERROR_CODES.VALIDATION_ERROR,
  'CastError': ERROR_CODES.VALIDATION_ERROR,
  'MongoError': ERROR_CODES.DATABASE_ERROR,
  'MongoServerError': ERROR_CODES.DATABASE_ERROR,
  'JsonWebTokenError': ERROR_CODES.AUTHENTICATION_FAILED,
  'TokenExpiredError': ERROR_CODES.TOKEN_EXPIRED,
  'UnauthorizedError': ERROR_CODES.AUTHENTICATION_FAILED,
  'ForbiddenError': ERROR_CODES.FORBIDDEN,
  'NotFoundError': ERROR_CODES.NOT_FOUND,
  'ConflictError': ERROR_CODES.CONFLICT,
  'RateLimitError': ERROR_CODES.RATE_LIMIT_EXCEEDED,
  'SpotifyAPIError': ERROR_CODES.SPOTIFY_API_ERROR,
  'NetworkError': ERROR_CODES.SERVICE_UNAVAILABLE
};

/**
 * Map HTTP status codes to error codes
 */
const STATUS_CODE_MAP = {
  400: ERROR_CODES.VALIDATION_ERROR,
  401: ERROR_CODES.AUTHENTICATION_FAILED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  429: ERROR_CODES.RATE_LIMIT_EXCEEDED,
  500: ERROR_CODES.INTERNAL_ERROR,
  502: ERROR_CODES.SPOTIFY_API_ERROR,
  503: ERROR_CODES.SERVICE_UNAVAILABLE,
  504: ERROR_CODES.SERVICE_UNAVAILABLE
};

/**
 * Determine error code from error object
 */
function getErrorCode(error) {
  // Check if error has explicit code
  if (error.code && Object.values(ERROR_CODES).includes(error.code)) {
    return error.code;
  }
  
  // Map by error type/name
  if (error.name && ERROR_TYPE_MAP[error.name]) {
    return ERROR_TYPE_MAP[error.name];
  }
  
  // Map by HTTP status code
  if (error.statusCode && STATUS_CODE_MAP[error.statusCode]) {
    return STATUS_CODE_MAP[error.statusCode];
  }
  
  if (error.status && STATUS_CODE_MAP[error.status]) {
    return STATUS_CODE_MAP[error.status];
  }
  
  // Default to internal error
  return ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Determine HTTP status code from error
 */
function getStatusCode(error, errorCode) {
  // Use explicit status code if available
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 600) {
    return error.statusCode;
  }
  
  if (error.status && error.status >= 400 && error.status < 600) {
    return error.status;
  }
  
  // Map error code to status code
  const codeStatusMap = {
    [ERROR_CODES.VALIDATION_ERROR]: 400,
    [ERROR_CODES.AUTHENTICATION_FAILED]: 401,
    [ERROR_CODES.TOKEN_EXPIRED]: 401,
    [ERROR_CODES.FORBIDDEN]: 403,
    [ERROR_CODES.NOT_FOUND]: 404,
    [ERROR_CODES.CONFLICT]: 409,
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
    [ERROR_CODES.INTERNAL_ERROR]: 500,
    [ERROR_CODES.DATABASE_ERROR]: 500,
    [ERROR_CODES.SPOTIFY_API_ERROR]: 502,
    [ERROR_CODES.SERVICE_UNAVAILABLE]: 503
  };
  
  return codeStatusMap[errorCode] || 500;
}

/**
 * Extract validation errors from error object
 */
function extractValidationErrors(error) {
  const errors = [];
  
  // Mongoose validation errors
  if (error.name === 'ValidationError' && error.errors) {
    for (const field in error.errors) {
      errors.push({
        field,
        message: error.errors[field].message,
        value: error.errors[field].value
      });
    }
  }
  
  // Express-validator errors
  if (error.array && typeof error.array === 'function') {
    return error.array().map(err => ({
      field: err.param || err.path,
      message: err.msg,
      value: err.value
    }));
  }
  
  // Custom validation errors
  if (error.validationErrors && Array.isArray(error.validationErrors)) {
    return error.validationErrors;
  }
  
  return errors;
}

/**
 * Scrub sensitive data from error details
 */
function scrubErrorDetails(details) {
  if (!details || typeof details !== 'object') {
    return details;
  }
  
  const scrubbed = { ...details };
  const sensitiveKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'session'
  ];
  
  for (const key in scrubbed) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof scrubbed[key] === 'object') {
      scrubbed[key] = scrubErrorDetails(scrubbed[key]);
    }
  }
  
  return scrubbed;
}

/**
 * Format error for logging
 */
function formatErrorForLogging(error, req) {
  return {
    message: error.message,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode || error.status,
    stack: error.stack,
    // Request context
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.user?.id || req.session?.userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
    // Additional error details
    details: scrubErrorDetails(error.details || {}),
    validationErrors: extractValidationErrors(error)
  };
}

/**
 * Check if error should include stack trace in response
 */
function shouldIncludeStack(error) {
  // Include stack in development or if explicitly enabled
  if (config.env === 'development') {
    return true;
  }
  
  // Include for specific error types in production
  if (error.isOperational === false) {
    return config.logging.includeStackTraces === true;
  }
  
  return false;
}

/**
 * Main error handler middleware
 */
function errorHandler(error, req, res, next) {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }
  
  // Determine error code and status
  const errorCode = getErrorCode(error);
  const statusCode = getStatusCode(error, errorCode);
  
  // Log error with full context
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error', formatErrorForLogging(error, req));
  
  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: error.message || 'An error occurred',
      ...(config.env === 'development' && { type: error.name })
    }
  };
  
  // Add validation errors if present
  const validationErrors = extractValidationErrors(error);
  if (validationErrors.length > 0) {
    errorResponse.error.validationErrors = validationErrors;
  }
  
  // Add stack trace in development
  if (shouldIncludeStack(error)) {
    errorResponse.error.stack = error.stack;
  }
  
  // Add additional details (scrubbed)
  if (error.details) {
    errorResponse.error.details = scrubErrorDetails(error.details);
  }
  
  // Add request ID for tracking
  if (req.id) {
    errorResponse.error.requestId = req.id;
  }
  
  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl || req.url}`);
  error.name = 'NotFoundError';
  error.statusCode = 404;
  
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error class
 */
class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || ERROR_CODES.INTERNAL_ERROR;
    this.statusCode = options.statusCode || 500;
    this.details = options.details || {};
    this.isOperational = options.isOperational !== false;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error classes
 */
class ValidationError extends AppError {
  constructor(message, validationErrors = []) {
    super(message, {
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      details: { validationErrors }
    });
    this.validationErrors = validationErrors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, {
      code: ERROR_CODES.AUTHENTICATION_FAILED,
      statusCode: 401
    });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, {
      code: ERROR_CODES.FORBIDDEN,
      statusCode: 403
    });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, {
      code: ERROR_CODES.NOT_FOUND,
      statusCode: 404
    });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, {
      code: ERROR_CODES.CONFLICT,
      statusCode: 409
    });
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfterMs = 60000) {
    super(message, {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      statusCode: 429,
      details: { retryAfterMs }
    });
  }
}

class SpotifyAPIError extends AppError {
  constructor(message = 'Spotify API error', details = {}) {
    super(message, {
      code: ERROR_CODES.SPOTIFY_API_ERROR,
      statusCode: 502,
      details
    });
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      statusCode: 503
    });
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  SpotifyAPIError,
  ServiceUnavailableError,
  // Utilities
  getErrorCode,
  getStatusCode,
  extractValidationErrors,
  scrubErrorDetails,
  // Export for testing
  _test: {
    ERROR_TYPE_MAP,
    STATUS_CODE_MAP,
    formatErrorForLogging,
    shouldIncludeStack
  }
};
