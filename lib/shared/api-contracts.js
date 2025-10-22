/**
 * API Contracts and Response Standards
 * 
 * This module defines standard response formats, error codes, and JSDoc typedefs
 * for consistent API responses across the application.
 * 
 * @module lib/shared/api-contracts
 */

const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} SuccessResponse
 * @property {boolean} success - Always true for successful responses
 * @property {*} data - The response payload
 * @property {ResponseMeta} meta - Metadata about the response
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false for error responses
 * @property {ErrorDetail} error - Error information
 */

/**
 * @typedef {Object} ResponseMeta
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} requestId - Unique request identifier
 * @property {PaginationInfo} [pagination] - Pagination info if applicable
 * @property {number} [duration] - Request duration in milliseconds
 */

/**
 * @typedef {Object} ErrorDetail
 * @property {string} code - Machine-readable error code
 * @property {string} message - Human-readable error message
 * @property {Object} [details] - Additional error context
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} requestId - Unique request identifier
 * @property {string} [stack] - Stack trace (only in development)
 */

/**
 * @typedef {Object} PaginationInfo
 * @property {number} page - Current page number (1-indexed)
 * @property {number} limit - Items per page
 * @property {number} total - Total number of items
 * @property {number} totalPages - Total number of pages
 * @property {boolean} hasNext - Whether there's a next page
 * @property {boolean} hasPrev - Whether there's a previous page
 */

/**
 * Standard error codes for consistent error handling
 */
const ERROR_CODES = {
  // Authentication & Authorization (1000-1999)
  UNAUTHORIZED: 'AUTH_001',
  FORBIDDEN: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  TOKEN_INVALID: 'AUTH_004',
  TOKEN_MISSING: 'AUTH_005',
  INSUFFICIENT_SCOPES: 'AUTH_006',
  
  // Validation Errors (2000-2999)
  VALIDATION_ERROR: 'VAL_001',
  INVALID_INPUT: 'VAL_002',
  MISSING_REQUIRED_FIELD: 'VAL_003',
  INVALID_FORMAT: 'VAL_004',
  OUT_OF_RANGE: 'VAL_005',
  
  // Resource Errors (3000-3999)
  NOT_FOUND: 'RES_001',
  ALREADY_EXISTS: 'RES_002',
  RESOURCE_LOCKED: 'RES_003',
  RESOURCE_CONFLICT: 'RES_004',
  
  // Rate Limiting (4000-4999)
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  QUOTA_EXCEEDED: 'RATE_002',
  TOO_MANY_REQUESTS: 'RATE_003',
  
  // External Service Errors (5000-5999)
  SPOTIFY_API_ERROR: 'EXT_001',
  SPOTIFY_RATE_LIMIT: 'EXT_002',
  SPOTIFY_UNAVAILABLE: 'EXT_003',
  DATABASE_ERROR: 'EXT_004',
  REDIS_ERROR: 'EXT_005',
  AI_PROVIDER_ERROR: 'EXT_006',
  MCP_SERVER_ERROR: 'EXT_007',
  
  // Internal Errors (6000-6999)
  INTERNAL_ERROR: 'INT_001',
  NOT_IMPLEMENTED: 'INT_002',
  CONFIGURATION_ERROR: 'INT_003',
  TIMEOUT: 'INT_004',
  
  // Business Logic Errors (7000-7999)
  INSUFFICIENT_CREDITS: 'BIZ_001',
  OPERATION_NOT_ALLOWED: 'BIZ_002',
  FEATURE_DISABLED: 'BIZ_003'
};

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_CODES = {
  // Authentication
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.TOKEN_EXPIRED]: 401,
  [ERROR_CODES.TOKEN_INVALID]: 401,
  [ERROR_CODES.TOKEN_MISSING]: 401,
  [ERROR_CODES.INSUFFICIENT_SCOPES]: 403,
  
  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
  [ERROR_CODES.INVALID_FORMAT]: 400,
  [ERROR_CODES.OUT_OF_RANGE]: 400,
  
  // Resources
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.ALREADY_EXISTS]: 409,
  [ERROR_CODES.RESOURCE_LOCKED]: 423,
  [ERROR_CODES.RESOURCE_CONFLICT]: 409,
  
  // Rate Limiting
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.QUOTA_EXCEEDED]: 429,
  [ERROR_CODES.TOO_MANY_REQUESTS]: 429,
  
  // External Services
  [ERROR_CODES.SPOTIFY_API_ERROR]: 502,
  [ERROR_CODES.SPOTIFY_RATE_LIMIT]: 429,
  [ERROR_CODES.SPOTIFY_UNAVAILABLE]: 503,
  [ERROR_CODES.DATABASE_ERROR]: 503,
  [ERROR_CODES.REDIS_ERROR]: 503,
  [ERROR_CODES.AI_PROVIDER_ERROR]: 502,
  [ERROR_CODES.MCP_SERVER_ERROR]: 502,
  
  // Internal
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.NOT_IMPLEMENTED]: 501,
  [ERROR_CODES.CONFIGURATION_ERROR]: 500,
  [ERROR_CODES.TIMEOUT]: 504,
  
  // Business Logic
  [ERROR_CODES.INSUFFICIENT_CREDITS]: 402,
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 403,
  [ERROR_CODES.FEATURE_DISABLED]: 503
};

/**
 * Create a standardized success response
 * 
 * @param {*} data - The response data
 * @param {Object} options - Additional options
 * @param {string} [options.requestId] - Request ID (generated if not provided)
 * @param {PaginationInfo} [options.pagination] - Pagination information
 * @param {number} [options.duration] - Request duration in ms
 * @returns {SuccessResponse}
 */
function createSuccessResponse(data, options = {}) {
  const meta = {
    timestamp: new Date().toISOString(),
    requestId: options.requestId || uuidv4()
  };
  
  if (options.pagination) {
    meta.pagination = options.pagination;
  }
  
  if (typeof options.duration === 'number') {
    meta.duration = options.duration;
  }
  
  return {
    success: true,
    data,
    meta
  };
}

/**
 * Create a standardized error response
 * 
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} message - Human-readable error message
 * @param {Object} options - Additional options
 * @param {Object} [options.details] - Additional error context
 * @param {string} [options.requestId] - Request ID
 * @param {Error} [options.originalError] - Original error object (for stack trace)
 * @returns {ErrorResponse}
 */
function createErrorResponse(code, message, options = {}) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const error = {
    code,
    message,
    timestamp: new Date().toISOString(),
    requestId: options.requestId || uuidv4()
  };
  
  if (options.details) {
    error.details = options.details;
  }
  
  // Include stack trace only in development
  if (isDevelopment && options.originalError && options.originalError.stack) {
    error.stack = options.originalError.stack;
  }
  
  return {
    success: false,
    error
  };
}

/**
 * Get HTTP status code for an error code
 * 
 * @param {string} errorCode - Error code from ERROR_CODES
 * @returns {number} - HTTP status code
 */
function getStatusCode(errorCode) {
  return ERROR_STATUS_CODES[errorCode] || 500;
}

/**
 * Create pagination information
 * 
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {PaginationInfo}
 */
function createPaginationInfo(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Validate and sanitize pagination parameters
 * 
 * @param {number} page - Requested page number
 * @param {number} limit - Requested items per page
 * @param {Object} options - Validation options
 * @param {number} [options.maxLimit=100] - Maximum allowed limit
 * @param {number} [options.defaultLimit=20] - Default limit if not provided
 * @returns {{page: number, limit: number}} - Sanitized pagination params
 */
function sanitizePaginationParams(page, limit, options = {}) {
  const maxLimit = options.maxLimit || 100;
  const defaultLimit = options.defaultLimit || 20;
  
  // Sanitize page
  let sanitizedPage = parseInt(page, 10);
  if (isNaN(sanitizedPage) || sanitizedPage < 1) {
    sanitizedPage = 1;
  }
  
  // Sanitize limit
  let sanitizedLimit = parseInt(limit, 10);
  if (isNaN(sanitizedLimit) || sanitizedLimit < 1) {
    sanitizedLimit = defaultLimit;
  } else if (sanitizedLimit > maxLimit) {
    sanitizedLimit = maxLimit;
  }
  
  return {
    page: sanitizedPage,
    limit: sanitizedLimit
  };
}

/**
 * Express middleware to attach response helpers to res object
 */
function attachResponseHelpers(req, res, next) {
  // Generate request ID if not present
  if (!req.id) {
    req.id = uuidv4();
  }
  
  // Track request start time
  req.startTime = Date.now();
  
  /**
   * Send standardized success response
   * @param {*} data - Response data
   * @param {Object} options - Additional options
   */
  res.success = function(data, options = {}) {
    const duration = Date.now() - req.startTime;
    const response = createSuccessResponse(data, {
      requestId: req.id,
      duration,
      ...options
    });
    
    return this.json(response);
  };
  
  /**
   * Send standardized error response
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   */
  res.error = function(code, message, options = {}) {
    const statusCode = getStatusCode(code);
    const response = createErrorResponse(code, message, {
      requestId: req.id,
      ...options
    });
    
    return this.status(statusCode).json(response);
  };
  
  next();
}

module.exports = {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  createSuccessResponse,
  createErrorResponse,
  getStatusCode,
  createPaginationInfo,
  sanitizePaginationParams,
  attachResponseHelpers
};
