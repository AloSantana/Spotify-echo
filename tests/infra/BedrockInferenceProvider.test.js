/**
 * Unit tests for AWS Bedrock Inference Provider
 * Tests model management, caching, and prediction functionality
 */

const BedrockInferenceProvider = require('../../src/infra/BedrockInferenceProvider');

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
    return {
        BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
            send: jest.fn()
        })),
        InvokeModelCommand: jest.fn(),
        InvokeModelWithResponseStreamCommand: jest.fn()
    };
});

describe('BedrockInferenceProvider', () => {
    let provider;
    
    beforeEach(() => {
        // Reset provider before each test
        provider = new BedrockInferenceProvider({
            enableCaching: true,
            enableStreaming: true,
            enableBatching: true
        });
        
        // Clear environment variables
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_ACCESS_KEY_ID = 'test_key';
        process.env.AWS_SECRET_ACCESS_KEY = 'test_secret';
    });
    
    afterEach(() => {
        // Cleanup
        if (provider) {
            provider.removeAllListeners();
        }
    });
    
    describe('Constructor', () => {
        test('should initialize with default configuration', () => {
            const provider = new BedrockInferenceProvider();
            
            expect(provider.config.region).toBe('us-east-1');
            expect(provider.config.defaultModel).toBe('claude-sonnet-4-5');
            expect(provider.config.enableCaching).toBe(true);
            expect(provider.isInitialized).toBe(false);
        });
        
        test('should accept custom configuration', () => {
            const provider = new BedrockInferenceProvider({
                region: 'us-west-2',
                defaultModel: 'claude-opus-4-1',
                maxRetries: 5,
                enableCaching: false
            });
            
            expect(provider.config.region).toBe('us-west-2');
            expect(provider.config.defaultModel).toBe('claude-opus-4-1');
            expect(provider.config.maxRetries).toBe(5);
            expect(provider.config.enableCaching).toBe(false);
        });
        
        test('should initialize with empty metrics', () => {
            expect(provider.metrics.totalRequests).toBe(0);
            expect(provider.metrics.successfulRequests).toBe(0);
            expect(provider.metrics.failedRequests).toBe(0);
            expect(provider.metrics.cacheHits).toBe(0);
            expect(provider.metrics.cacheMisses).toBe(0);
        });
    });
    
    describe('getDefaultModelConfig', () => {
        test('should provide default model configuration', () => {
            const config = provider.getDefaultModelConfig();
            
            expect(config['claude-sonnet-4-5']).toBeDefined();
            expect(config['claude-opus-4-1']).toBeDefined();
            expect(config['claude-sonnet-4-5'].modelId).toContain('anthropic');
            expect(config['claude-opus-4-1'].capabilities).toContain('reasoning');
        });
        
        test('should validate model configuration structure', () => {
            const config = provider.getDefaultModelConfig();
            
            for (const [key, modelConfig] of Object.entries(config)) {
                expect(modelConfig).toHaveProperty('modelId');
                expect(modelConfig).toHaveProperty('displayName');
                expect(modelConfig).toHaveProperty('provider');
                expect(modelConfig).toHaveProperty('capabilities');
                expect(modelConfig).toHaveProperty('contextWindow');
                expect(modelConfig).toHaveProperty('maxOutputTokens');
                
                expect(Array.isArray(modelConfig.capabilities)).toBe(true);
                expect(modelConfig.contextWindow).toBeGreaterThan(0);
                expect(modelConfig.maxOutputTokens).toBeGreaterThan(0);
            }
        });
    });
    
    describe('loadModels', () => {
        test('should load models into models map', async () => {
            await provider.loadModels();
            
            expect(provider.models.size).toBeGreaterThan(0);
            expect(provider.models.has('claude-sonnet-4-5')).toBe(true);
            expect(provider.models.has('claude-opus-4-1')).toBe(true);
        });
        
        test('should mark models as loaded with timestamp', async () => {
            await provider.loadModels();
            
            const model = provider.models.get('claude-sonnet-4-5');
            expect(model.isLoaded).toBe(true);
            expect(model.loadedAt).toBeInstanceOf(Date);
        });
    });
    
    describe('buildRequestBody', () => {
        test('should build request body from string input', () => {
            const body = provider.buildRequestBody('Hello, world!');
            
            expect(body.anthropic_version).toBe('bedrock-2023-05-31');
            expect(body.max_tokens).toBe(2000);
            expect(body.messages).toEqual([
                { role: 'user', content: 'Hello, world!' }
            ]);
            expect(body.temperature).toBe(0.7);
        });
        
        test('should build request body from messages array', () => {
            const messages = [
                { role: 'user', content: 'Question 1' },
                { role: 'assistant', content: 'Answer 1' },
                { role: 'user', content: 'Question 2' }
            ];
            
            const body = provider.buildRequestBody(messages);
            
            expect(body.messages).toEqual(messages);
        });
        
        test('should apply custom options', () => {
            const body = provider.buildRequestBody('Test', {
                maxTokens: 4000,
                temperature: 0.5,
                topP: 0.95,
                topK: 50
            });
            
            expect(body.max_tokens).toBe(4000);
            expect(body.temperature).toBe(0.5);
            expect(body.top_p).toBe(0.95);
            expect(body.top_k).toBe(50);
        });
        
        test('should throw error for invalid input format', () => {
            expect(() => provider.buildRequestBody(123)).toThrow('Invalid input format');
            expect(() => provider.buildRequestBody(null)).toThrow('Invalid input format');
        });
    });
    
    describe('Cache Management', () => {
        test('should generate consistent cache keys', () => {
            const key1 = provider.generateCacheKey('claude-sonnet-4-5', 'input1', {});
            const key2 = provider.generateCacheKey('claude-sonnet-4-5', 'input1', {});
            const key3 = provider.generateCacheKey('claude-sonnet-4-5', 'input2', {});
            
            expect(key1).toBe(key2); // Same inputs should generate same key
            expect(key1).not.toBe(key3); // Different inputs should generate different keys
        });
        
        test('should add and retrieve from cache', () => {
            const key = 'test_key';
            const data = { text: 'Test response', usage: { tokens: 100 } };
            
            provider.addToCache(key, data);
            const retrieved = provider.getFromCache(key);
            
            expect(retrieved).toEqual(data);
        });
        
        test('should return null for non-existent cache key', () => {
            const retrieved = provider.getFromCache('non_existent_key');
            expect(retrieved).toBeNull();
        });
        
        test('should prune cache when size exceeds limit', () => {
            // Add more than 1000 entries
            for (let i = 0; i < 1005; i++) {
                provider.addToCache(`key_${i}`, { text: `Response ${i}` });
            }
            
            expect(provider.cache.size).toBeLessThanOrEqual(1000);
        });
    });
    
    describe('updateMetrics', () => {
        test('should update metrics for successful request', () => {
            provider.updateMetrics('claude-sonnet-4-5', 150, true);
            
            expect(provider.metrics.totalRequests).toBe(1);
            expect(provider.metrics.successfulRequests).toBe(1);
            expect(provider.metrics.failedRequests).toBe(0);
            expect(provider.metrics.totalLatency).toBe(150);
            expect(provider.metrics.averageLatency).toBe(150);
            expect(provider.metrics.modelsUsed['claude-sonnet-4-5']).toBe(1);
        });
        
        test('should update metrics for failed request', () => {
            provider.updateMetrics('claude-opus-4-1', 200, false);
            
            expect(provider.metrics.totalRequests).toBe(1);
            expect(provider.metrics.successfulRequests).toBe(0);
            expect(provider.metrics.failedRequests).toBe(1);
        });
        
        test('should calculate average latency correctly', () => {
            provider.updateMetrics('claude-sonnet-4-5', 100, true);
            provider.updateMetrics('claude-sonnet-4-5', 200, true);
            provider.updateMetrics('claude-sonnet-4-5', 150, true);
            
            expect(provider.metrics.averageLatency).toBe(150); // (100+200+150)/3
        });
        
        test('should track usage per model', () => {
            provider.updateMetrics('claude-sonnet-4-5', 100, true);
            provider.updateMetrics('claude-sonnet-4-5', 150, true);
            provider.updateMetrics('claude-opus-4-1', 200, true);
            
            expect(provider.metrics.modelsUsed['claude-sonnet-4-5']).toBe(2);
            expect(provider.metrics.modelsUsed['claude-opus-4-1']).toBe(1);
        });
    });
    
    describe('getAvailableModels', () => {
        test('should return list of available models', async () => {
            await provider.loadModels();
            const models = provider.getAvailableModels();
            
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
            
            models.forEach(model => {
                expect(model).toHaveProperty('key');
                expect(model).toHaveProperty('displayName');
                expect(model).toHaveProperty('provider');
                expect(model).toHaveProperty('capabilities');
                expect(model).toHaveProperty('isLoaded');
            });
        });
    });
    
    describe('getMetrics', () => {
        test('should return comprehensive metrics', async () => {
            await provider.loadModels();
            provider.updateMetrics('claude-sonnet-4-5', 100, true);
            provider.updateMetrics('claude-sonnet-4-5', 150, false);
            
            const metrics = provider.getMetrics();
            
            expect(metrics).toHaveProperty('totalRequests');
            expect(metrics).toHaveProperty('successfulRequests');
            expect(metrics).toHaveProperty('failedRequests');
            expect(metrics).toHaveProperty('averageLatency');
            expect(metrics).toHaveProperty('cacheSize');
            expect(metrics).toHaveProperty('modelsLoaded');
            expect(metrics).toHaveProperty('successRate');
            
            expect(metrics.totalRequests).toBe(2);
            expect(metrics.successfulRequests).toBe(1);
            expect(metrics.failedRequests).toBe(1);
            expect(metrics.successRate).toBe(50); // 1 success out of 2 requests
        });
        
        test('should handle zero requests gracefully', () => {
            const metrics = provider.getMetrics();
            
            expect(metrics.totalRequests).toBe(0);
            expect(metrics.successRate).toBe(0);
        });
    });
    
    describe('Event Emission', () => {
        test('should emit initialized event', async () => {
            const initSpy = jest.fn();
            provider.on('initialized', initSpy);
            
            await provider.initialize();
            
            expect(initSpy).toHaveBeenCalled();
        });
    });
});
