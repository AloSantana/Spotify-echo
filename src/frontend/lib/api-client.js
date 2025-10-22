/**
 * Centralized API Client for Frontend
 * 
 * Features:
 * - Integrates with backend API contracts
 * - Retry logic with exponential backoff
 * - Request/response interceptors
 * - Error normalization
 * - Request ID tracking
 * - Rate limit handling
 * - Automatic token refresh
 * 
 * @module frontend/lib/api-client
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Response success status
 * @property {*} data - Response data (on success)
 * @property {Object} error - Error details (on failure)
 * @property {Object} meta - Response metadata
 */

/**
 * @typedef {Object} RequestConfig
 * @property {string} method - HTTP method
 * @property {Object} [headers] - Request headers
 * @property {*} [body] - Request body
 * @property {number} [timeout] - Request timeout in ms
 * @property {boolean} [skipAuth] - Skip authentication header
 * @property {number} [maxRetries] - Maximum retry attempts
 * @property {AbortSignal} [signal] - Abort signal for cancellation
 */

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
  maxRetries: 3,
  backoffBaseMs: 500,
  maxBackoffMs: 30000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * API Client class
 */
class ApiClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }

  /**
   * Generate unique request ID
   * @private
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate exponential backoff delay
   * @private
   */
  calculateBackoff(attemptNumber) {
    const delay = Math.min(
      this.config.backoffBaseMs * Math.pow(2, attemptNumber),
      this.config.maxBackoffMs
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Parse Retry-After header
   * @private
   */
  parseRetryAfter(retryAfterHeader) {
    if (!retryAfterHeader) return null;
    
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
    
    const date = new Date(retryAfterHeader);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }
    
    return null;
  }

  /**
   * Delay execution
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   * @private
   */
  isRetryableError(error, response) {
    // Network errors are retryable
    if (!response) return true;
    
    // Check status code
    if (this.config.retryStatusCodes.includes(response.status)) {
      return true;
    }
    
    return false;
  }

  /**
   * Normalize error response
   * @private
   */
  normalizeError(error, requestId) {
    // Already normalized error
    if (error.code && error.message) {
      return {
        code: error.code,
        message: error.message,
        details: error.details || {},
        requestId: error.requestId || requestId,
        timestamp: error.timestamp || new Date().toISOString()
      };
    }

    // Network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network request failed. Please check your connection.',
        details: { originalError: error.message },
        requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Timeout error
    if (error.name === 'AbortError') {
      return {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out. Please try again.',
        details: {},
        requestId,
        timestamp: new Date().toISOString()
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: { originalError: error.toString() },
      requestId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Build full URL
   * @private
   */
  buildUrl(endpoint) {
    // Handle absolute URLs
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    
    // Handle relative URLs
    const base = this.config.baseURL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  /**
   * Build request headers
   * @private
   */
  async buildHeaders(config, requestId) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...config.headers
    };

    // Add authentication if not skipped
    if (!config.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Get authentication token
   * @private
   */
  async getAuthToken() {
    // Try to get token from localStorage
    const token = localStorage.getItem('spotify_access_token');
    
    if (token) {
      // Check if token is expired
      const expiresAt = localStorage.getItem('spotify_token_expires_at');
      if (expiresAt && Date.now() < parseInt(expiresAt, 10)) {
        return token;
      }
      
      // Try to refresh token
      try {
        await this.refreshAuthToken();
        return localStorage.getItem('spotify_access_token');
      } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Refresh authentication token
   * @private
   */
  async refreshAuthToken() {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.buildUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      localStorage.setItem('spotify_access_token', data.data.access_token);
      localStorage.setItem('spotify_token_expires_at', 
        Date.now() + (data.data.expires_in * 1000));
      
      if (data.data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.data.refresh_token);
      }
    }
  }

  /**
   * Execute request with retry logic
   * @private
   */
  async executeRequest(url, config, requestId, attemptNumber = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.config.timeout);

    try {
      // Apply request interceptors
      let modifiedConfig = { ...config };
      for (const interceptor of this.requestInterceptors) {
        modifiedConfig = await interceptor(modifiedConfig, requestId);
      }

      // Build headers
      const headers = await this.buildHeaders(modifiedConfig, requestId);

      // Make request
      const fetchConfig = {
        method: modifiedConfig.method,
        headers,
        signal: modifiedConfig.signal || controller.signal
      };

      if (modifiedConfig.body && modifiedConfig.method !== 'GET') {
        fetchConfig.body = JSON.stringify(modifiedConfig.body);
      }

      const response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle non-OK responses
      if (!response.ok) {
        // Check if retryable
        if (this.isRetryableError(null, response) && attemptNumber < this.config.maxRetries) {
          const retryAfterMs = this.parseRetryAfter(response.headers.get('retry-after'));
          const backoffMs = retryAfterMs || this.calculateBackoff(attemptNumber);
          
          console.warn(`Request failed, retrying after ${backoffMs}ms (attempt ${attemptNumber + 1}/${this.config.maxRetries})`);
          
          await this.delay(backoffMs);
          return this.executeRequest(url, config, requestId, attemptNumber + 1);
        }

        // Non-retryable or max retries exceeded
        throw {
          response,
          data,
          status: response.status
        };
      }

      // Apply response interceptors
      let result = data;
      for (const interceptor of this.responseInterceptors) {
        result = await interceptor(result, response, requestId);
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      // Check if retryable
      if (this.isRetryableError(error, null) && attemptNumber < this.config.maxRetries) {
        const backoffMs = this.calculateBackoff(attemptNumber);
        
        console.warn(`Request failed, retrying after ${backoffMs}ms (attempt ${attemptNumber + 1}/${this.config.maxRetries})`);
        
        await this.delay(backoffMs);
        return this.executeRequest(url, config, requestId, attemptNumber + 1);
      }

      // Apply error interceptors
      let processedError = error;
      for (const interceptor of this.errorInterceptors) {
        processedError = await interceptor(processedError, requestId);
      }

      throw processedError;
    }
  }

  /**
   * Make HTTP request
   * @param {string} endpoint - API endpoint
   * @param {RequestConfig} config - Request configuration
   * @returns {Promise<ApiResponse>}
   */
  async request(endpoint, config = {}) {
    const requestId = this.generateRequestId();
    const url = this.buildUrl(endpoint);

    try {
      const response = await this.executeRequest(url, config, requestId);
      
      // Return standardized response
      if (response && typeof response === 'object' && 'success' in response) {
        return response;
      }
      
      // Wrap non-standard response
      return {
        success: true,
        data: response,
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      // Extract error from response
      const errorData = error.data || error;
      
      // Normalize error
      const normalizedError = errorData.error 
        ? errorData.error 
        : this.normalizeError(error, requestId);

      // Return error response
      return {
        success: false,
        error: normalizedError
      };
    }
  }

  /**
   * GET request
   */
  get(endpoint, config = {}) {
    return this.request(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  post(endpoint, body, config = {}) {
    return this.request(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  put(endpoint, body, config = {}) {
    return this.request(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  patch(endpoint, body, config = {}) {
    return this.request(endpoint, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  delete(endpoint, config = {}) {
    return this.request(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor) {
    this.errorInterceptors.push(interceptor);
  }
}

// Create and export default instance
const apiClient = new ApiClient();

// Add default request interceptor for logging
if (process.env.NODE_ENV === 'development') {
  apiClient.addRequestInterceptor(async (config, requestId) => {
    console.log(`[API Request ${requestId}]`, config.method, config);
    return config;
  });

  apiClient.addResponseInterceptor(async (response, httpResponse, requestId) => {
    console.log(`[API Response ${requestId}]`, response);
    return response;
  });
}

// Add error interceptor for logging
apiClient.addErrorInterceptor(async (error, requestId) => {
  console.error(`[API Error ${requestId}]`, error);
  return error;
});

export { ApiClient };
export default apiClient;
