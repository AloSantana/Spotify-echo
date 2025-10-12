#!/usr/bin/env node

/**
 * Budget-Aware Perplexity API Client
 * 
 * Provides a safe wrapper around Perplexity API with:
 * - Automatic budget checking and enforcement
 * - Circuit breaker pattern for fault tolerance
 * - Rate limiting and request throttling
 * - Intelligent caching
 * - Graceful degradation
 * - Comprehensive error handling
 * 
 * Usage:
 *   const { BudgetAwarePerplexityClient } = require('./budget-aware-perplexity-client');
 *   const client = new BudgetAwarePerplexityClient();
 *   await client.initialize();
 *   const result = await client.query('Your research query here', options);
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class BudgetAwarePerplexityClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.PERPLEXITY_API_KEY;
    this.configPath = options.configPath || '.github/perplexity-config.yml';
    
    // Circuit breaker state
    this.circuitBreaker = {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureThreshold: options.failureThreshold || 3,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      consecutiveSuccesses: 0
    };
    
    // Rate limiting
    this.rateLimiter = {
      requestCount: 0,
      windowStart: Date.now(),
      maxRequestsPerMinute: options.maxRequestsPerMinute || 20,
      minDelayBetweenRequests: options.minDelay || 2000 // 2 seconds
    };
    
    // Budget tracking
    this.budgetInfo = {
      canProceed: true,
      remainingBudget: 0,
      usagePercentage: 0,
      state: 'UNKNOWN',
      lastCheck: null
    };
    
    // Cache
    this.cache = new Map();
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheMaxAge = options.cacheMaxAge || 24 * 60 * 60 * 1000; // 24 hours
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      budgetChecks: 0,
      blockedByCircuitBreaker: 0,
      blockedByBudget: 0
    };
    
    this.initialized = false;
  }
  
  /**
   * Initialize the client - must be called before making requests
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing Budget-Aware Perplexity Client...');
    
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable not set');
    }
    
    // Check initial budget
    await this.checkBudgetStatus();
    
    this.initialized = true;
    console.log('✅ Client initialized');
    console.log(`  Budget State: ${this.budgetInfo.state}`);
    console.log(`  Usage: ${this.budgetInfo.usagePercentage}%`);
    console.log(`  Can Proceed: ${this.budgetInfo.canProceed}`);
  }
  
  /**
   * Check budget status from Python cost management system
   */
  async checkBudgetStatus() {
    this.stats.budgetChecks++;
    
    // Don't check more than once per minute
    if (this.budgetInfo.lastCheck && 
        Date.now() - this.budgetInfo.lastCheck < 60000) {
      return this.budgetInfo.canProceed;
    }
    
    try {
      const result = execSync(
        'python3 scripts/perplexity_costs.py budget',
        { 
          encoding: 'utf-8', 
          timeout: 10000,
          cwd: path.resolve(__dirname, '..')
        }
      );
      
      const budgetData = JSON.parse(result);
      this.budgetInfo = {
        canProceed: budgetData.can_proceed || false,
        remainingBudget: budgetData.remaining_amount || 0,
        usagePercentage: budgetData.usage_percentage || 0,
        state: budgetData.state || 'UNKNOWN',
        lastCheck: Date.now()
      };
      
      return this.budgetInfo.canProceed;
      
    } catch (error) {
      console.warn(`⚠️ Budget check failed: ${error.message}`);
      // Fail safe - assume we can proceed but with caution
      this.budgetInfo.state = 'WARNING';
      this.budgetInfo.lastCheck = Date.now();
      return true;
    }
  }
  
  /**
   * Check if we can make a request (circuit breaker + budget)
   */
  async canMakeRequest() {
    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      const now = Date.now();
      if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.resetTimeout) {
        console.log('🔄 Circuit breaker: OPEN → HALF_OPEN');
        this.circuitBreaker.state = 'HALF_OPEN';
        this.circuitBreaker.consecutiveSuccesses = 0;
      } else {
        this.stats.blockedByCircuitBreaker++;
        return false;
      }
    }
    
    // Check budget periodically
    if (Date.now() - (this.budgetInfo.lastCheck || 0) > 60000) {
      await this.checkBudgetStatus();
    }
    
    if (!this.budgetInfo.canProceed) {
      this.stats.blockedByBudget++;
      return false;
    }
    
    return true;
  }
  
  /**
   * Wait for rate limit window
   */
  async waitForRateLimit() {
    const now = Date.now();
    const windowElapsed = now - this.rateLimiter.windowStart;
    
    // Reset window if a minute has passed
    if (windowElapsed >= 60000) {
      this.rateLimiter.requestCount = 0;
      this.rateLimiter.windowStart = now;
    }
    
    // Check if we're at the limit
    if (this.rateLimiter.requestCount >= this.rateLimiter.maxRequestsPerMinute) {
      const waitTime = 60000 - windowElapsed;
      console.log(`⏳ Rate limit: waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after waiting
      this.rateLimiter.requestCount = 0;
      this.rateLimiter.windowStart = Date.now();
    }
    
    this.rateLimiter.requestCount++;
  }
  
  /**
   * Record successful request
   */
  recordSuccess() {
    this.circuitBreaker.consecutiveSuccesses++;
    this.stats.successfulRequests++;
    
    if (this.circuitBreaker.state === 'HALF_OPEN' && 
        this.circuitBreaker.consecutiveSuccesses >= 2) {
      console.log('✅ Circuit breaker: HALF_OPEN → CLOSED');
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failureCount = 0;
    }
  }
  
  /**
   * Record failed request
   */
  recordFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    this.circuitBreaker.consecutiveSuccesses = 0;
    this.stats.failedRequests++;
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      console.warn(`⚡ Circuit breaker: ${this.circuitBreaker.state} → OPEN (${this.circuitBreaker.failureCount} failures)`);
      this.circuitBreaker.state = 'OPEN';
    }
  }
  
  /**
   * Generate cache key from query and options
   */
  getCacheKey(query, options = {}) {
    const keyData = {
      query: query.toLowerCase().trim(),
      model: options.model || 'default',
      maxTokens: options.maxTokens || 2000
    };
    return JSON.stringify(keyData);
  }
  
  /**
   * Main query method - makes API request with all safety features
   */
  async query(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Client not initialized - call initialize() first');
    }
    
    this.stats.totalRequests++;
    
    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(query, options);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
        console.log('📦 Using cached result');
        this.stats.cachedResponses++;
        return cached.result;
      }
    }
    
    // Check if we can make request
    const canProceed = await this.canMakeRequest();
    if (!canProceed) {
      throw new Error(
        this.circuitBreaker.state === 'OPEN' 
          ? 'Circuit breaker is OPEN - too many recent failures'
          : 'Budget limit reached - cannot make new API requests'
      );
    }
    
    // Wait for rate limit
    await this.waitForRateLimit();
    
    try {
      const axios = require('axios');
      
      // Select model based on budget usage
      let model = options.model || 'llama-3.1-sonar-huge-128k-online';
      if (this.budgetInfo.usagePercentage > 70) {
        model = 'llama-3.1-sonar-small-128k-online'; // Cheaper model
        console.log('💰 Using cheaper model due to budget constraints');
      }
      
      // Adjust max tokens based on budget
      let maxTokens = options.maxTokens || 2000;
      if (this.budgetInfo.usagePercentage > 70) {
        maxTokens = Math.min(maxTokens, 1000);
      }
      
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful AI assistant providing accurate and concise information.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        stream: false,
        return_citations: options.returnCitations !== false,
        search_domain_filter: options.domains || [],
        max_tokens: maxTokens
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: options.timeout || 30000
      });
      
      const result = {
        content: response.data.choices[0].message.content,
        citations: response.data.citations || [],
        model: model,
        usage: response.data.usage || {},
        timestamp: new Date().toISOString()
      };
      
      // Cache the result
      if (this.cacheEnabled) {
        const cacheKey = this.getCacheKey(query, options);
        this.cache.set(cacheKey, {
          result: result,
          timestamp: Date.now()
        });
      }
      
      // Record success
      this.recordSuccess();
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minDelayBetweenRequests));
      
      return result;
      
    } catch (error) {
      // Record failure
      this.recordFailure();
      
      // Handle specific error types
      if (error.response?.status === 429) {
        console.error('⚠️ Rate limit hit - increasing delay');
        await new Promise(resolve => setTimeout(resolve, 5000));
        throw new Error('Rate limit exceeded - try again later');
      }
      
      if (error.response?.status === 402 || error.message.includes('quota')) {
        console.error('💰 Budget/quota exceeded');
        this.budgetInfo.canProceed = false;
        throw new Error('API quota exceeded - budget limit reached');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      }
      
      throw new Error(`API request failed: ${error.message}`);
    }
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(1)
      : 0;
    
    return {
      ...this.stats,
      successRate: `${successRate}%`,
      circuitBreakerState: this.circuitBreaker.state,
      budgetState: this.budgetInfo.state,
      budgetUsage: `${this.budgetInfo.usagePercentage}%`
    };
  }
  
  /**
   * Print statistics
   */
  printStats() {
    const stats = this.getStats();
    console.log('\n📊 PERPLEXITY API STATISTICS');
    console.log('=' .repeat(50));
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful: ${stats.successfulRequests}`);
    console.log(`Failed: ${stats.failedRequests}`);
    console.log(`Cached: ${stats.cachedResponses}`);
    console.log(`Blocked by Circuit Breaker: ${stats.blockedByCircuitBreaker}`);
    console.log(`Blocked by Budget: ${stats.blockedByBudget}`);
    console.log(`Success Rate: ${stats.successRate}`);
    console.log(`Circuit Breaker: ${stats.circuitBreakerState}`);
    console.log(`Budget State: ${stats.budgetState} (${stats.budgetUsage} used)`);
  }
  
  /**
   * Reset circuit breaker manually (for testing/recovery)
   */
  resetCircuitBreaker() {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.consecutiveSuccesses = 0;
    console.log('🔄 Circuit breaker manually reset to CLOSED');
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}

module.exports = { BudgetAwarePerplexityClient };

// CLI interface for testing
if (require.main === module) {
  const client = new BudgetAwarePerplexityClient();
  
  (async () => {
    try {
      await client.initialize();
      
      const query = process.argv[2] || 'What are the latest trends in music recommendation systems?';
      console.log(`\n🔍 Query: ${query}\n`);
      
      const result = await client.query(query, {
        maxTokens: 500,
        returnCitations: true
      });
      
      console.log('\n✅ Result:');
      console.log(result.content);
      
      if (result.citations && result.citations.length > 0) {
        console.log('\n📚 Citations:');
        result.citations.forEach((citation, i) => {
          console.log(`  ${i + 1}. ${citation}`);
        });
      }
      
      client.printStats();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}
