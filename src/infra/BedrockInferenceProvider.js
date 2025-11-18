/**
 * AWS Bedrock Integration Service for Real-Time AI Inference
 * 
 * Provides AWS Bedrock Claude model integration with:
 * - Model management and selection
 * - Streaming and batch predictions
 * - Intelligent caching
 * - Error handling and fallback
 * - Alias-based model resolution
 * - Unified retry with telemetry
 * 
 * @module infra/BedrockInferenceProvider
 */

const { EventEmitter } = require('events');
const aliasResolver = require('./bedrock/alias-resolver');
const unifiedRetry = require('./bedrock/unified-retry');

class BedrockInferenceProvider extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // AWS Bedrock Configuration
            region: options.region || process.env.AWS_REGION || 'us-east-1',
            defaultModel: options.defaultModel || 'claude-sonnet-4-5',
            maxRetries: options.maxRetries || 3,
            timeout: options.timeout || 30000,
            
            // Performance Settings
            enableStreaming: options.enableStreaming ?? true,
            enableBatching: options.enableBatching ?? true,
            batchSize: options.batchSize || 10,
            batchTimeout: options.batchTimeout || 100,
            
            // Caching
            enableCaching: options.enableCaching ?? true,
            cacheTTL: options.cacheTTL || 300000, // 5 minutes
            
            // Model Configuration
            modelConfig: options.modelConfig || this.loadModelConfig(),
            
            ...options
        };
        
        this.client = null;
        this.models = new Map();
        this.cache = new Map();
        this.isInitialized = false;
        
        // Metrics
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalLatency: 0,
            averageLatency: 0,
            cacheHits: 0,
            cacheMisses: 0,
            modelsUsed: {},
            lastUpdated: new Date()
        };
    }
    
    /**
     * Initialize AWS Bedrock client
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            console.log('🚀 Initializing AWS Bedrock Inference Provider...');
            
            // Load AWS SDK
            const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
            
            // Initialize client
            this.client = new BedrockRuntimeClient({
                region: this.config.region,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            });
            
            // Load available models
            await this.loadModels();
            
            this.isInitialized = true;
            console.log('✅ AWS Bedrock Inference Provider initialized');
            
            this.emit('initialized');
        } catch (error) {
            console.error('❌ Failed to initialize AWS Bedrock:', error.message);
            throw new Error(`Bedrock initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Load model configuration using alias resolver
     */
    loadModelConfig() {
        try {
            // Use alias resolver for model configuration
            const aliases = aliasResolver.listAliases();
            const config = {};
            
            for (const alias of aliases) {
                if (!alias.deprecated) {
                    const metadata = aliasResolver.getMetadata(alias.alias);
                    config[alias.alias] = metadata;
                }
            }
            
            console.log(`📦 Loaded ${Object.keys(config).length} model aliases from alias resolver`);
            return config;
        } catch (error) {
            console.warn('⚠️  Could not load alias config, using defaults:', error.message);
            return this.getDefaultModelConfig();
        }
    }
    
    /**
     * Get default model configuration (fallback only)
     */
    getDefaultModelConfig() {
        // Fallback configuration - should rarely be used
        return {
            'claude-3-opus': {
                modelId: aliasResolver.getModelId('claude-3-opus'),
                displayName: 'Claude 3 Opus',
                provider: 'anthropic',
                capabilities: ['reasoning', 'complex-analysis', 'coding'],
                contextWindow: 200000,
                maxOutputTokens: 4096
            },
            'claude-sonnet-4-5': {
                modelId: aliasResolver.getModelId('claude-sonnet-4-5'),
                displayName: 'Claude Sonnet 4.5',
                provider: 'anthropic',
                capabilities: ['text-generation', 'coding', 'analysis'],
                contextWindow: 200000,
                maxOutputTokens: 4096
            }
        };
    }
    
    /**
     * Load available models
     */
    async loadModels() {
        for (const [key, config] of Object.entries(this.config.modelConfig)) {
            this.models.set(key, {
                ...config,
                isLoaded: true,
                loadedAt: new Date()
            });
        }
        
        console.log(`📦 Loaded ${this.models.size} Bedrock models`);
    }
    
    /**
     * Perform inference prediction
     * @param {string} modelName - Model name or key
     * @param {string|Array} input - Input text or messages
     * @param {Object} options - Inference options
     * @returns {Object} Prediction result
     */
    async predict(modelName, input, options = {}) {
        const startTime = Date.now();
        
        try {
            await this.initialize();
            
            // Get model configuration
            const modelKey = modelName || this.config.defaultModel;
            const modelConfig = this.models.get(modelKey);
            
            if (!modelConfig) {
                throw new Error(`Model '${modelKey}' not found`);
            }
            
            // Check cache
            if (this.config.enableCaching) {
                const cacheKey = this.generateCacheKey(modelKey, input, options);
                const cached = this.getFromCache(cacheKey);
                
                if (cached) {
                    this.metrics.cacheHits++;
                    this.emit('prediction', {
                        model: modelKey,
                        cached: true,
                        latency: Date.now() - startTime
                    });
                    
                    return {
                        text: cached.text,
                        usage: cached.usage,
                        cached: true,
                        latency: Date.now() - startTime,
                        model: modelKey
                    };
                }
                
                this.metrics.cacheMisses++;
            }
            
            // Prepare request
            const requestBody = this.buildRequestBody(input, options);
            
            // Invoke model (pass modelKey for inference profile detection)
            const result = await this.invokeModel(modelConfig.modelId, requestBody, {
                ...options,
                modelKey
            });
            
            // Cache result
            if (this.config.enableCaching) {
                const cacheKey = this.generateCacheKey(modelKey, input, options);
                this.addToCache(cacheKey, result);
            }
            
            // Update metrics
            const latency = Date.now() - startTime;
            this.updateMetrics(modelKey, latency, true);
            
            this.emit('prediction', {
                model: modelKey,
                latency,
                cached: false,
                success: true
            });
            
            return {
                text: result.text,
                usage: result.usage,
                cached: false,
                latency,
                model: modelKey,
                modelId: modelConfig.modelId
            };
            
        } catch (error) {
            const latency = Date.now() - startTime;
            this.updateMetrics(modelName, latency, false);
            
            this.emit('error', {
                model: modelName,
                error: error.message,
                latency
            });
            
            throw new Error(`Bedrock prediction failed: ${error.message}`);
        }
    }
    
    /**
     * Invoke Bedrock model with unified retry
     */
    async invokeModel(modelId, requestBody, options = {}) {
        const { InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
        
        // Get model config to check for inference profile ARN
        const modelKey = options.modelKey || this.config.defaultModel;
        const modelConfig = this.models.get(modelKey);
        
        // Resolve model ID using alias resolver
        const effectiveModelId = (modelConfig?.requiresInferenceProfile && modelConfig?.inferenceProfileArn)
            ? modelConfig.inferenceProfileArn
            : modelId;
        
        // Log model invocation details
        console.log(`🔄 Invoking model: ${effectiveModelId}`);
        if (modelConfig?.requiresInferenceProfile) {
            console.log('   Using inference profile ARN for cross-region access');
        }
        
        // Create command
        const command = new InvokeModelCommand({
            modelId: effectiveModelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
        });
        
        // Execute with unified retry layer
        const result = await unifiedRetry.execute(
            async () => {
                const response = await this.client.send(command);
                const responseBody = JSON.parse(new TextDecoder().decode(response.body));
                
                return {
                    text: responseBody.content?.[0]?.text || responseBody.completion || '',
                    usage: responseBody.usage || {
                        input_tokens: 0,
                        output_tokens: 0
                    },
                    stopReason: responseBody.stop_reason
                };
            },
            {
                model: modelKey,
                operationType: 'inference',
                calculateCost: (result) => {
                    if (result.usage) {
                        const cost = aliasResolver.calculateCost(modelKey, result.usage);
                        return cost.totalCost;
                    }
                    return 0;
                }
            }
        );
        
        return result;
    }
    
    /**
     * Streaming prediction
     */
    async predictStreaming(modelName, input, options = {}) {
        if (!this.config.enableStreaming) {
            throw new Error('Streaming not enabled');
        }
        
        await this.initialize();
        
        const modelKey = modelName || this.config.defaultModel;
        const modelConfig = this.models.get(modelKey);
        
        if (!modelConfig) {
            throw new Error(`Model '${modelKey}' not found`);
        }
        
        const { InvokeModelWithResponseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');
        
        const requestBody = this.buildRequestBody(input, options);
        
        const command = new InvokeModelWithResponseStreamCommand({
            modelId: modelConfig.modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
        });
        
        const response = await this.client.send(command);
        
        return {
            stream: response.body,
            modelId: modelConfig.modelId,
            model: modelKey
        };
    }
    
    /**
     * Batch prediction
     */
    async predictBatch(modelName, inputs, options = {}) {
        if (!this.config.enableBatching) {
            return Promise.all(inputs.map(input => this.predict(modelName, input, options)));
        }
        
        const results = [];
        
        // Process in batches
        for (let i = 0; i < inputs.length; i += this.config.batchSize) {
            const batch = inputs.slice(i, i + this.config.batchSize);
            const batchResults = await Promise.all(
                batch.map(input => this.predict(modelName, input, options))
            );
            results.push(...batchResults);
        }
        
        return results;
    }
    
    /**
     * Build request body for model invocation
     */
    buildRequestBody(input, options = {}) {
        // Handle different input formats
        let messages;
        if (typeof input === 'string') {
            messages = [{ role: 'user', content: input }];
        } else if (Array.isArray(input)) {
            messages = input;
        } else {
            throw new Error('Invalid input format');
        }
        
        // Build base request body
        const requestBody = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: options.maxTokens || 2000,
            messages
        };
        
        // Claude models require ONLY ONE sampling parameter (temperature OR top_p, not both)
        // Priority: temperature > top_p > top_k
        if (options.temperature !== undefined) {
            requestBody.temperature = options.temperature;
        } else if (options.topP !== undefined) {
            requestBody.top_p = options.topP;
        } else {
            // Default to temperature if no sampling parameter specified
            requestBody.temperature = 0.7;
        }
        
        // top_k can be used with temperature or top_p
        if (options.topK !== undefined) {
            requestBody.top_k = options.topK;
        }
        
        return requestBody;
    }
    
    /**
     * Cache management
     */
    generateCacheKey(model, input, options) {
        const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
        const optionsStr = JSON.stringify(options);
        return `${model}:${inputStr}:${optionsStr}`;
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }
        
        // Check TTL
        if (Date.now() - cached.timestamp > this.config.cacheTTL) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Prune cache if too large
        if (this.cache.size > 1000) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * Update metrics
     */
    updateMetrics(model, latency, success) {
        this.metrics.totalRequests++;
        
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        this.metrics.totalLatency += latency;
        this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.totalRequests;
        
        if (!this.metrics.modelsUsed[model]) {
            this.metrics.modelsUsed[model] = 0;
        }
        this.metrics.modelsUsed[model]++;
        
        this.metrics.lastUpdated = new Date();
    }
    
    /**
     * Get available models
     */
    getAvailableModels() {
        return Array.from(this.models.entries()).map(([key, config]) => ({
            key,
            displayName: config.displayName,
            provider: config.provider,
            capabilities: config.capabilities,
            isLoaded: config.isLoaded
        }));
    }
    
    /**
     * Get service metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            modelsLoaded: this.models.size,
            successRate: this.metrics.totalRequests > 0
                ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
                : 0
        };
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            await this.initialize();
            
            return {
                status: 'healthy',
                isInitialized: this.isInitialized,
                modelsLoaded: this.models.size,
                cacheSize: this.cache.size,
                metrics: this.getMetrics()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                isInitialized: this.isInitialized
            };
        }
    }
}

module.exports = BedrockInferenceProvider;
