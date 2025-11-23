/**
 * Application Configuration Module
 * 
 * Validates and provides type-safe access to environment variables.
 * Fails fast on startup if required configuration is missing.
 * 
 * @module lib/config
 */

require('dotenv').config();

/**
 * Configuration validation error
 */
class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Validate that a required environment variable is present
 * @param {string} key - Environment variable name
 * @param {string} description - Human-readable description
 * @throws {ConfigurationError} If variable is missing
 */
function requireEnv(key, description) {
  const value = process.env[key];
  if (!value) {
    throw new ConfigurationError(
      `Missing required environment variable: ${key} (${description})`
    );
  }
  return value;
}

/**
 * Get optional environment variable with default value
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {string}
 */
function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

/**
 * Get boolean environment variable
 * @param {string} key - Environment variable name
 * @param {boolean} defaultValue - Default value
 * @returns {boolean}
 */
function getBoolEnv(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get integer environment variable
 * @param {string} key - Environment variable name
 * @param {number} defaultValue - Default value
 * @returns {number}
 */
function getIntEnv(key, defaultValue = 0) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Application configuration object
 */
const config = {
  // Environment
  env: getEnv('NODE_ENV', 'development'),
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
  isProduction: getEnv('NODE_ENV') === 'production',
  isTest: getEnv('NODE_ENV') === 'test',
  
  // Server
  port: getIntEnv('PORT', 3000),
  host: getEnv('HOST', '0.0.0.0'),
  
  // URLs
  baseUrl: getEnv('BASE_URL', 'http://localhost:3000'),
  frontendUrl: getEnv('FRONTEND_BASE_URL', 'http://localhost:3000'),
  backendUrl: getEnv('BACKEND_BASE_URL', 'http://localhost:3000'),
  
  // Staging URLs
  staging: {
    frontendUrl: getEnv('STAGING_FRONTEND_URL', ''),
    backendUrl: getEnv('STAGING_BACKEND_URL', ''),
  },
  
  // MongoDB (optional - app has fallback support)
  mongodb: {
    uri: getEnv('MONGODB_URI', ''),
    database: getEnv('MONGODB_DATABASE', 'echotune'),
    connectionTimeout: getIntEnv('MONGODB_CONNECTION_TIMEOUT', 30000)
  },
  
  // Redis
  redis: {
    url: getEnv('REDIS_URL', 'redis://localhost:6379'),
    password: getEnv('REDIS_PASSWORD', ''),
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getIntEnv('REDIS_PORT', 6379),
    database: getIntEnv('REDIS_DATABASE', 0)
  },
  
  // JWT
  jwt: {
    secret: getEnv('JWT_SECRET', 'dev-secret-change-in-production'),
    expiration: getEnv('JWT_EXPIRATION', '24h'),
    refreshExpiration: getEnv('JWT_REFRESH_EXPIRATION', '7d')
  },
  
  // Session
  session: {
    secret: getEnv('SESSION_SECRET', getEnv('JWT_SECRET', 'dev-session-secret')),
    maxAge: getIntEnv('SESSION_MAX_AGE', 86400000) // 24 hours
  },
  
  // Spotify API
  spotify: {
    clientId: getEnv('SPOTIFY_CLIENT_ID', ''),
    clientSecret: getEnv('SPOTIFY_CLIENT_SECRET', ''),
    redirectUri: getEnv('SPOTIFY_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
    
    // Staging credentials
    staging: {
      clientId: getEnv('STAGING_SPOTIFY_CLIENT_ID', ''),
      clientSecret: getEnv('STAGING_SPOTIFY_CLIENT_SECRET', ''),
      redirectUri: getEnv('STAGING_SPOTIFY_REDIRECT_URI', '')
    }
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: getIntEnv('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getIntEnv('RATE_LIMIT_MAX_REQUESTS', 100),
    spotifyMaxPerMin: getIntEnv('MAX_SPOTIFY_REQUESTS_PER_MIN', 100),
    backoffBaseMs: getIntEnv('RATE_LIMIT_BACKOFF_BASE_MS', 500),
    abortOnLimit: getBoolEnv('ABORT_ON_RATE_LIMIT', false)
  },
  
  // Logging
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    safeMode: getBoolEnv('SAFE_LOG', true),
    logFile: getEnv('LOG_FILE', 'logs/app.log'),
    errorLogFile: getEnv('ERROR_LOG_FILE', 'logs/error.log')
  },
  
  // Testing
  testing: {
    useRealApis: getBoolEnv('USE_REAL_APIS', false),
    liveValidation: getBoolEnv('LIVE_VALIDATION', false),
    testDatabaseUrl: getEnv('TEST_DATABASE_URL', 'mongodb://localhost:27017/echotune-test'),
    testRedisUrl: getEnv('TEST_REDIS_URL', 'redis://localhost:6379/1')
  },
  
  // Feature Flags
  features: {
    mockProvider: getBoolEnv('ENABLE_MOCK_PROVIDER', false),
    realtime: !getBoolEnv('DISABLE_REALTIME', false),
    tracing: getBoolEnv('ENABLE_TRACING', true),
    agentOps: getBoolEnv('ENABLE_AGENTOPS', false),
    caching: getBoolEnv('CACHING_ENABLED', true),
    compression: getBoolEnv('COMPRESSION_ENABLED', true),
    analytics: getBoolEnv('ENABLE_ANALYTICS_DASHBOARD', false),
    demoRoutes: getBoolEnv('ENABLE_DEMO_ROUTES', false)
  },
  
  // AI Providers
  ai: {
    openai: {
      apiKey: getEnv('OPENAI_API_KEY', ''),
      organizationId: getEnv('OPENAI_ORGANIZATION_ID', ''),
      model: getEnv('OPENAI_MODEL', 'gpt-4-turbo-preview')
    },
    gemini: {
      apiKey: getEnv('GEMINI_API_KEY', ''),
      model: getEnv('GEMINI_MODEL', 'gemini-pro'),
      useVertex: getBoolEnv('GEMINI_USE_VERTEX', false)
    },
    anthropic: {
      apiKey: getEnv('ANTHROPIC_API_KEY', ''),
      model: getEnv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022')
    },
    perplexity: {
      apiKey: getEnv('PERPLEXITY_API_KEY', '')
    },
    openRouter: {
      apiKey: getEnv('OPENROUTER_API_KEY', '')
    },
    provider: getEnv('LLM_PROVIDER', 'auto'),
    routingStrategy: getEnv('AI_ROUTING_STRATEGY', 'balanced'),
    fallbackEnabled: getBoolEnv('AI_FALLBACK_ENABLED', true),
    costOptimization: getBoolEnv('AI_COST_OPTIMIZATION', true),
    mockMode: getBoolEnv('AI_MOCK_MODE', false)
  },
  
  // GitHub Integration
  github: {
    token: getEnv('GITHUB_TOKEN', getEnv('GITHUB_PAT', '')),
    owner: getEnv('GITHUB_OWNER', 'primoscope'),
    repo: getEnv('GITHUB_REPO', 'Spotify-echo'),
    webhookSecret: getEnv('GITHUB_WEBHOOK_SECRET', '')
  },
  
  // Browser Automation
  browserAutomation: {
    browserbase: {
      apiKey: getEnv('BROWSERBASE_API_KEY', ''),
      projectId: getEnv('BROWSERBASE_PROJECT_ID', '')
    },
    playwright: {
      headless: getBoolEnv('PLAYWRIGHT_HEADLESS', true),
      timeout: getIntEnv('PLAYWRIGHT_TIMEOUT', 30000)
    }
  },
  
  // MCP Servers
  mcp: {
    port: getIntEnv('MCP_SERVER_PORT', 3001),
    configPath: getEnv('MCP_SERVERS_CONFIG_PATH', './mcp-servers-config.json'),
    enabled: {
      filesystem: getBoolEnv('MCP_FILESYSTEM_ENABLED', true),
      puppeteer: getBoolEnv('MCP_PUPPETEER_ENABLED', true),
      packageManagement: getBoolEnv('MCP_PACKAGE_MANAGEMENT_ENABLED', true),
      analytics: getBoolEnv('MCP_ANALYTICS_ENABLED', true)
    }
  },
  
  // Performance
  performance: {
    cacheTtl: getIntEnv('CACHE_TTL', 3600),
    compressionEnabled: getBoolEnv('COMPRESSION', true)
  },
  
  // Health Checks
  health: {
    checkInterval: getIntEnv('HEALTH_CHECK_INTERVAL', 30000),
    checkTimeout: getIntEnv('HEALTH_CHECK_TIMEOUT', 5000)
  }
};

/**
 * Validate all required configuration
 * @throws {ConfigurationError} If any required configuration is invalid
 */
function validateConfig() {
  const errors = [];
  
  // Validate MongoDB URI format (only if provided)
  if (config.mongodb.uri && !config.mongodb.uri.startsWith('mongodb://') && !config.mongodb.uri.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }
  
  // Validate Redis URL format (if provided)
  if (config.redis.url && !config.redis.url.startsWith('redis://') && !config.redis.url.startsWith('rediss://')) {
    errors.push('REDIS_URL must start with redis:// or rediss://');
  }
  
  // Validate JWT secret length (only in production)
  if (config.isProduction && config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long in production');
  }
  
  // Validate Spotify configuration (warnings only, not required for dev)
  if ((!config.spotify.clientId || config.spotify.clientId === 'your-client-id') && config.env !== 'development') {
    errors.push('SPOTIFY_CLIENT_ID must be set to a valid Spotify client ID');
  }
  
  if ((!config.spotify.clientSecret || config.spotify.clientSecret === 'your-client-secret') && config.env !== 'development') {
    errors.push('SPOTIFY_CLIENT_SECRET must be set to a valid Spotify client secret');
  }
  
  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Warn about production configuration
  if (config.isProduction) {
    if (config.features.mockProvider) {
      console.warn('WARNING: Mock provider is enabled in production');
    }
    
    if (config.features.demoRoutes) {
      console.warn('WARNING: Demo routes are enabled in production');
    }
    
    if (config.logging.level === 'debug' || config.logging.level === 'trace') {
      console.warn('WARNING: Verbose logging is enabled in production');
    }
  }
  
  if (errors.length > 0) {
    throw new ConfigurationError(
      'Configuration validation failed:\n' + errors.map(e => `  - ${e}`).join('\n')
    );
  }
}

/**
 * Get configuration summary for logging (sanitized)
 * @returns {Object} Sanitized configuration object
 */
function getConfigSummary() {
  return {
    env: config.env,
    port: config.port,
    database: config.mongodb.database,
    features: config.features,
    testing: {
      useRealApis: config.testing.useRealApis,
      liveValidation: config.testing.liveValidation
    },
    ai: {
      provider: config.ai.provider,
      mockMode: config.ai.mockMode
    },
    spotify: {
      configured: !!config.spotify.clientId && config.spotify.clientId !== 'your-client-id'
    }
  };
}

// Validate configuration on module load
try {
  validateConfig();
  console.log('✅ Configuration validated successfully');
  console.log('📋 Config summary:', JSON.stringify(getConfigSummary(), null, 2));
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

module.exports = config;
module.exports.validateConfig = validateConfig;
module.exports.getConfigSummary = getConfigSummary;
module.exports.ConfigurationError = ConfigurationError;
