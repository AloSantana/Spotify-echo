'use strict';
/**
 * Structured logger (Pino) with environment‑aware formatting.
 * Provides a console-based fallback when pino is not installed.
 */

let logger;

try {
  // Try to use pino if available
  const pino = require('pino');
  const isProd = process.env.NODE_ENV === 'production';
  const baseConfig = {
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'token',
        'apiKey',
        'api_key',
        'secret'
      ],
      remove: true
    }
  };
  
  let transport = undefined;
  if (!isProd) {
    try {
      // Only use pino-pretty if it's available
      require.resolve('pino-pretty');
      transport = { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } };
    } catch { 
      // pino-pretty not available, use plain pino output
    }
  }
  
  logger = pino({ ...baseConfig, transport });
} catch (error) {
  // Pino not available, fallback to console-based logger
  const logLevels = { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 };
  const configuredLevel = logLevels[process.env.LOG_LEVEL] || logLevels.info;
  
  // Create a console-based logger that mimics pino's interface
  logger = {
    level: process.env.LOG_LEVEL || 'info',
    fatal: (...args) => configuredLevel >= logLevels.fatal && console.error('[FATAL]', ...args),
    error: (...args) => configuredLevel >= logLevels.error && console.error('[ERROR]', ...args),
    warn: (...args) => configuredLevel >= logLevels.warn && console.warn('[WARN]', ...args),
    info: (...args) => configuredLevel >= logLevels.info && console.log('[INFO]', ...args),
    debug: (...args) => configuredLevel >= logLevels.debug && console.log('[DEBUG]', ...args),
    trace: (...args) => configuredLevel >= logLevels.trace && console.log('[TRACE]', ...args),
    child: (bindings) => logger, // Return self for simple compatibility
  };
  
  console.log('[INFO] Pino not available, using console-based logger fallback');
}

module.exports = logger;