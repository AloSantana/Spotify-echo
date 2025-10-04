/**
 * AWS Bedrock Provider Adapter
 * 
 * Wraps BedrockInferenceProvider with uniform LLM provider interface
 * for integration with chat and routing systems.
 * 
 * Features:
 * - Unified interface (initialize, generateCompletion, generateStreaming)
 * - Telemetry and metrics integration
 * - Health checking and error handling
 * - Model selection based on capabilities
 * 
 * @module chat/llm-providers/bedrock-provider
 */

const BedrockInferenceProvider = require('../../infra/BedrockInferenceProvider');
const BaseProvider = require('./base-provider');

class BedrockProvider extends BaseProvider {
    constructor(config = {}) {
        super('bedrock');
        
        this.config = {
            enabled: process.env.BEDROCK_ENABLED === 'true',
            region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
            defaultModel: process.env.BEDROCK_DEFAULT_MODEL || 'claude-sonnet-4-5',
            maxRetries: config.maxRetries || 3,
            timeout: config.timeout || 30000,
            enableCaching: config.enableCaching ?? true,
            ...config
        };
        
        this.provider = null;
        this.initialized = false;
        this.healthy = false;
        this.lastError = null;
        
        // Pricing matrix for cost tracking
        this.pricing = {
            'claude-sonnet-4-5': {
                input: 0.003,  // $0.003 per 1K tokens
                output: 0.015  // $0.015 per 1K tokens
            },
            'claude-opus-4-1': {
                input: 0.015,  // $0.015 per 1K tokens
                output: 0.075  // $0.075 per 1K tokens
            }
        };
    }
    
    /**
     * Initialize Bedrock provider
     */
    async initialize() {
        if (this.initialized) {
            return { success: true, provider: 'bedrock' };
        }
        
        try {
            // Check if enabled
            if (!this.config.enabled) {
                console.log('⏭️  Bedrock provider disabled (BEDROCK_ENABLED != true)');
                this.healthy = false;
                return { success: false, error: 'Provider disabled', provider: 'bedrock' };
            }
            
            // Validate AWS credentials
            if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                console.error('❌ AWS credentials not found for Bedrock provider');
                this.healthy = false;
                this.lastError = 'Missing AWS credentials';
                return { success: false, error: 'Missing AWS credentials', provider: 'bedrock' };
            }
            
            console.log('🚀 Initializing AWS Bedrock provider...');
            
            // Initialize underlying provider
            this.provider = new BedrockInferenceProvider({
                region: this.config.region,
                defaultModel: this.config.defaultModel,
                maxRetries: this.config.maxRetries,
                timeout: this.config.timeout,
                enableCaching: this.config.enableCaching
            });
            
            await this.provider.initialize();
            
            // Setup telemetry listeners for AI metrics integration
            this.setupMetricsIntegration();
            
            this.initialized = true;
            this.healthy = true;
            
            console.log(`✅ Bedrock provider initialized (region: ${this.config.region})`);
            
            return { success: true, provider: 'bedrock' };
            
        } catch (error) {
            console.error('❌ Failed to initialize Bedrock provider:', error.message);
            this.healthy = false;
            this.lastError = error.message;
            
            // Categorize error for better diagnostics
            if (error.message.includes('AccessDenied') || error.name === 'AccessDeniedException') {
                this.lastError = 'AccessDenied - Check IAM permissions for Bedrock';
            } else if (error.message.includes('ResourceNotFoundException')) {
                this.lastError = 'Model not found - Verify model availability in region';
            }
            
            return { success: false, error: this.lastError, provider: 'bedrock' };
        }
    }
    
    /**
     * Setup AI metrics integration
     */
    setupMetricsIntegration() {
        if (!this.provider) {
            return;
        }
        
        // Listen for telemetry events from underlying provider
        this.provider.on('telemetry', (data) => {
            try {
                // Import AI metrics (lazy load to avoid circular dependencies)
                const AIMetrics = require('../../metrics/ai-metrics');
                const aiMetrics = new AIMetrics();
                
                // Record token usage
                if (data.usage) {
                    aiMetrics.recordTokenUsage('bedrock', data.model, 'input', data.usage.input_tokens || 0);
                    aiMetrics.recordTokenUsage('bedrock', data.model, 'output', data.usage.output_tokens || 0);
                }
                
                // Record cost
                if (data.cost) {
                    aiMetrics.recordCost('bedrock', data.model, data.cost);
                }
                
                // Record latency/duration
                if (data.latency) {
                    aiMetrics.recordAIRequest('bedrock', data.model, 'completion', data.latency / 1000); // Convert to seconds
                }
                
                // Record provider health
                aiMetrics.recordProviderHealth('bedrock', data.model, true);
                
            } catch (error) {
                console.warn('Failed to record AI metrics:', error.message);
            }
        });
        
        // Listen for prediction events
        this.provider.on('prediction', (data) => {
            if (data.success && data.latency) {
                try {
                    const AIMetrics = require('../../metrics/ai-metrics');
                    const aiMetrics = new AIMetrics();
                    aiMetrics.recordAIRequest('bedrock', data.model, 'prediction', data.latency / 1000);
                } catch (error) {
                    console.warn('Failed to record prediction metrics:', error.message);
                }
            }
        });
    }
    
    /**
     * Generate completion
     */
    async generateCompletion(messages, options = {}) {
        if (!this.initialized || !this.healthy) {
            throw new Error(`Bedrock provider not ready: ${this.lastError || 'not initialized'}`);
        }
        
        try {
            const startTime = Date.now();
            const modelKey = options.model || this.config.defaultModel;
            
            // Convert messages to input string
            const input = this.messagesToString(messages);
            
            // Invoke model
            const result = await this.provider.predict(modelKey, input, {
                maxTokens: options.maxTokens || 4096,
                temperature: options.temperature || 0.7,
                topP: options.topP,
                topK: options.topK,
                stopSequences: options.stopSequences
            });
            
            const latency = Date.now() - startTime;
            
            // Calculate cost
            const cost = this.calculateCost(modelKey, result.usage);
            
            // Record telemetry
            this.recordTelemetry(modelKey, result.usage, cost, latency);
            
            return {
                content: result.text,
                model: modelKey,
                usage: result.usage,
                cost: cost,
                latency: latency,
                provider: 'bedrock',
                stopReason: result.stopReason,
                metadata: {
                    region: this.config.region,
                    requestId: result.requestId // If available from provider
                }
            };
            
        } catch (error) {
            console.error(`❌ Bedrock completion error: ${error.message}`);
            
            // Mark as unhealthy if critical error
            if (error.message.includes('AccessDenied') || error.name === 'AccessDeniedException') {
                this.healthy = false;
                this.lastError = 'AccessDenied';
            }
            
            throw error;
        }
    }
    
    /**
     * Generate streaming completion
     */
    async *generateStreaming(messages, options = {}) {
        if (!this.initialized || !this.healthy) {
            throw new Error(`Bedrock provider not ready: ${this.lastError || 'not initialized'}`);
        }
        
        try {
            const modelKey = options.model || this.config.defaultModel;
            const input = this.messagesToString(messages);
            
            // Use streaming prediction
            const stream = await this.provider.predictStreaming(modelKey, input, {
                maxTokens: options.maxTokens || 4096,
                temperature: options.temperature || 0.7,
                topP: options.topP,
                topK: options.topK
            });
            
            for await (const chunk of stream) {
                yield {
                    content: chunk.text || '',
                    delta: chunk.text || '',
                    model: modelKey,
                    provider: 'bedrock',
                    done: chunk.done || false
                };
            }
            
        } catch (error) {
            console.error(`❌ Bedrock streaming error: ${error.message}`);
            
            if (error.message.includes('AccessDenied')) {
                this.healthy = false;
                this.lastError = 'AccessDenied';
            }
            
            throw error;
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        if (!this.initialized) {
            return { healthy: false, error: 'Not initialized' };
        }
        
        try {
            // Use underlying provider's health check if available
            if (this.provider && typeof this.provider.healthCheck === 'function') {
                const result = await this.provider.healthCheck();
                this.healthy = result.healthy || false;
                return result;
            }
            
            // Otherwise perform basic check
            return { healthy: this.healthy, provider: 'bedrock', region: this.config.region };
            
        } catch (error) {
            this.healthy = false;
            return { healthy: false, error: error.message };
        }
    }
    
    /**
     * Get available models
     */
    getAvailableModels() {
        if (!this.provider) {
            return [];
        }
        
        return this.provider.getAvailableModels().map(model => ({
            ...model,
            provider: 'bedrock'
        }));
    }
    
    /**
     * Get telemetry data
     */
    getTelemetry() {
        if (!this.provider) {
            return null;
        }
        
        return {
            provider: 'bedrock',
            metrics: this.provider.getMetrics(),
            healthy: this.healthy,
            initialized: this.initialized,
            region: this.config.region,
            defaultModel: this.config.defaultModel
        };
    }
    
    /**
     * Convert messages array to string for Bedrock
     */
    messagesToString(messages) {
        if (typeof messages === 'string') {
            return messages;
        }
        
        return messages.map(msg => {
            const role = msg.role === 'user' ? 'Human' : 'Assistant';
            return `${role}: ${msg.content}`;
        }).join('\n\n');
    }
    
    /**
     * Calculate cost based on token usage
     */
    calculateCost(modelKey, usage) {
        const modelPricing = this.pricing[modelKey];
        if (!modelPricing || !usage) {
            return 0;
        }
        
        const inputCost = (usage.input_tokens / 1000) * modelPricing.input;
        const outputCost = (usage.output_tokens / 1000) * modelPricing.output;
        
        return inputCost + outputCost;
    }
    
    /**
     * Record telemetry for metrics system
     */
    recordTelemetry(modelKey, usage, cost, latency) {
        // Emit event for metrics collection
        if (this.provider) {
            this.provider.emit('telemetry', {
                provider: 'bedrock',
                model: modelKey,
                usage: usage,
                cost: cost,
                latency: latency,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = BedrockProvider;
