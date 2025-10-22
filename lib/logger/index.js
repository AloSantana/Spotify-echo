/**
 * Unified Logger with PII Scrubbing
 * 
 * Provides structured logging with automatic PII redaction, request IDs,
 * and integration with OpenTelemetry for distributed tracing.
 * 
 * @module lib/logger
 */

const pino = require('pino');
const config = require('../config');

/**
 * Patterns for detecting and redacting sensitive information
 */
const PII_PATTERNS = {
  // Tokens and API keys
  bearerToken: /Bearer\s+[A-Za-z0-9\-._~+/]+/gi,
  apiKey: /([a|A]pi[_-]?[k|K]ey|[a|A]ccess[_-]?[t|T]oken)\s*[:=]\s*['"]?([A-Za-z0-9\-._~+/]+)['"]?/gi,
  
  // Spotify tokens
  spotifyToken: /spotify[_-]?(access|refresh)[_-]?token['":=]?\s*['":=]?\s*([A-Za-z0-9\-._~+/=]+)/gi,
  
  // JWT tokens
  jwtToken: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi,
  
  // Email addresses (partial redaction)
  email: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  
  // Credit card numbers
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/gi,
  
  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/gi,
  
  // IP addresses (partial redaction)
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/gi,
  
  // Phone numbers
  phoneNumber: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/gi,
  
  // MongoDB connection strings
  mongoUri: /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/gi,
  
  // Redis URLs with passwords
  redisUri: /redis:\/\/([^:]*):([^@]+)@/gi,
  
  // Generic passwords
  password: /([p|P]ass(?:word)?|[p|P]wd)\s*[:=]\s*['"]?([^'"\s,;]+)['"]?/gi
};

/**
 * Redact sensitive information from a string
 * @param {string} text - Text to redact
 * @returns {string} - Redacted text
 */
function redactPII(text) {
  if (typeof text !== 'string') {
    return text;
  }
  
  if (!config.logging.safeMode) {
    return text;
  }
  
  let redacted = text;
  
  // Redact tokens and keys
  redacted = redacted.replace(PII_PATTERNS.bearerToken, 'Bearer [REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.apiKey, '$1: [REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.spotifyToken, 'spotify_$1_token: [REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.jwtToken, '[JWT_REDACTED]');
  
  // Partially redact emails (keep domain)
  redacted = redacted.replace(PII_PATTERNS.email, (match, user, domain) => {
    const visibleChars = Math.min(3, user.length);
    const redactedUser = user.substring(0, visibleChars) + '***';
    return `${redactedUser}@${domain}`;
  });
  
  // Redact credit cards (keep last 4 digits)
  redacted = redacted.replace(PII_PATTERNS.creditCard, (match) => {
    const cleaned = match.replace(/[\s-]/g, '');
    return `****-****-****-${cleaned.slice(-4)}`;
  });
  
  // Redact SSNs
  redacted = redacted.replace(PII_PATTERNS.ssn, '***-**-****');
  
  // Partially redact IP addresses
  redacted = redacted.replace(PII_PATTERNS.ipAddress, (match) => {
    const parts = match.split('.');
    return `${parts[0]}.${parts[1]}.***.***.`;
  });
  
  // Redact phone numbers
  redacted = redacted.replace(PII_PATTERNS.phoneNumber, '***-***-****');
  
  // Redact MongoDB credentials
  redacted = redacted.replace(PII_PATTERNS.mongoUri, 'mongodb$1://[USER]:[PASSWORD]@');
  
  // Redact Redis credentials
  redacted = redacted.replace(PII_PATTERNS.redisUri, 'redis://[USER]:[PASSWORD]@');
  
  // Redact passwords
  redacted = redacted.replace(PII_PATTERNS.password, '$1: [REDACTED]');
  
  return redacted;
}

/**
 * Redact sensitive fields from an object recursively
 * @param {Object} obj - Object to redact
 * @returns {Object} - Redacted object
 */
function redactObject(obj) {
  if (!config.logging.safeMode) {
    return obj;
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return redactPII(String(obj));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }
  
  const sensitiveFields = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'apiKey', 'api_key',
    'accessToken', 'access_token', 'refreshToken', 'refresh_token',
    'authorization', 'auth', 'bearer', 'sessionId', 'session_id',
    'cookie', 'cookies', 'creditCard', 'credit_card', 'ssn', 'cvv'
  ];
  
  const redactedObj = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      redactedObj[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      redactedObj[key] = redactPII(value);
    } else if (typeof value === 'object') {
      redactedObj[key] = redactObject(value);
    } else {
      redactedObj[key] = value;
    }
  }
  
  return redactedObj;
}

/**
 * Custom Pino serializer that redacts PII
 */
const safeSerializers = {
  req: (req) => {
    if (!req) return req;
    
    const serialized = {
      id: req.id,
      method: req.method,
      url: req.url,
      query: redactObject(req.query),
      params: redactObject(req.params),
      headers: redactObject(req.headers),
      remoteAddress: redactPII(req.socket?.remoteAddress || req.ip || 'unknown'),
      remotePort: req.socket?.remotePort
    };
    
    return serialized;
  },
  
  res: (res) => {
    if (!res) return res;
    
    return {
      statusCode: res.statusCode,
      headers: redactObject(res.getHeaders ? res.getHeaders() : {})
    };
  },
  
  err: (err) => {
    if (!err) return err;
    
    const serialized = {
      type: err.constructor.name,
      message: redactPII(err.message),
      stack: config.isDevelopment ? redactPII(err.stack) : undefined,
      code: err.code,
      statusCode: err.statusCode
    };
    
    // Include custom error properties
    if (err.details) {
      serialized.details = redactObject(err.details);
    }
    
    return serialized;
  }
};

/**
 * Create Pino logger instance
 */
const pinoConfig = {
  level: config.logging.level,
  serializers: safeSerializers,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
};

// Pretty print in development
if (config.isDevelopment && !config.isTest) {
  pinoConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  };
}

const logger = pino(pinoConfig);

/**
 * Create a child logger with additional context
 * @param {Object} bindings - Additional context to bind
 * @returns {Object} - Child logger
 */
function createChildLogger(bindings) {
  return logger.child(redactObject(bindings));
}

/**
 * Express middleware to attach logger to request
 */
function attachLogger(req, res, next) {
  // Create request-scoped logger
  req.log = createChildLogger({
    requestId: req.id,
    method: req.method,
    url: req.url
  });
  
  // Log incoming request
  req.log.info({ req }, 'Incoming request');
  
  // Log response
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
    
    req.log[logLevel]({
      res,
      duration,
      statusCode: res.statusCode
    }, 'Request completed');
  });
  
  next();
}

/**
 * Express error logging middleware
 */
function logErrors(err, req, res, next) {
  req.log.error({ err, req, res }, 'Request error');
  next(err);
}

/**
 * Create a logger for a specific module
 * @param {string} moduleName - Name of the module
 * @returns {Object} - Module-specific logger
 */
function createModuleLogger(moduleName) {
  return createChildLogger({ module: moduleName });
}

/**
 * Log with automatic PII redaction
 * @param {string} level - Log level
 * @param {Object} obj - Object to log
 * @param {string} msg - Log message
 */
function safeLog(level, obj, msg) {
  const redactedObj = redactObject(obj);
  const redactedMsg = redactPII(msg);
  logger[level](redactedObj, redactedMsg);
}

// Export logger with utility functions
module.exports = logger;
module.exports.createChildLogger = createChildLogger;
module.exports.attachLogger = attachLogger;
module.exports.logErrors = logErrors;
module.exports.createModuleLogger = createModuleLogger;
module.exports.safeLog = safeLog;
module.exports.redactPII = redactPII;
module.exports.redactObject = redactObject;

// Log initialization
logger.info({
  env: config.env,
  logLevel: config.logging.level,
  safeMode: config.logging.safeMode
}, 'Logger initialized');
