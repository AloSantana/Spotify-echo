/**
 * Bedrock Model Switch Command Handler
 * 
 * Provides /use command support for switching between Claude models on Bedrock
 * Uses alias resolver for dynamic model configuration
 * 
 * Usage:
 *   /use claude-3-opus
 *   /use claude-sonnet-4-5
 */

const LLMProviderManager = require('./llm-provider-manager');
const aliasResolver = require('../infra/bedrock/alias-resolver');

class BedrockModelSwitcher {
    constructor() {
        // Load models from alias resolver
        this.models = {};
        
        try {
            const aliases = aliasResolver.listAliases();
            for (const alias of aliases) {
                if (!alias.deprecated) {
                    const metadata = aliasResolver.getMetadata(alias.alias);
                    this.models[alias.alias] = {
                        modelId: metadata.modelId,
                        displayName: metadata.displayName,
                        capabilities: metadata.capabilities,
                        description: this.getDescription(alias.alias, metadata),
                        pricing: metadata.pricing,
                        note: metadata.notes
                    };
                }
            }
        } catch (error) {
            console.error('Failed to load models from alias resolver:', error.message);
        }
    }

    /**
     * Get description for model
     */
    getDescription(alias, metadata) {
        const descriptions = {
            'claude-3-opus': 'Best for complex reasoning and architectural analysis. Highest intelligence in Claude 3 family.',
            'claude-sonnet-4-5': 'Optimized for code generation and analysis',
            'claude-3-5-sonnet-v2': 'Latest Sonnet with enhanced capabilities',
            'claude-3-5-haiku': 'Fast and efficient for simple tasks',
            'deepseek-r1': 'Advanced reasoning model'
        };
        
        return descriptions[alias] || metadata.notes || `${metadata.displayName} model`;
    }

    /**
     * Process /use command
     */
    async processCommand(command, args = []) {
        const commandLower = command.toLowerCase();
        
        // Handle /use <model> command
        if (commandLower === 'use' && args.length > 0) {
            const modelKey = args[0].toLowerCase();
            return await this.switchToModel(modelKey);
        }
        
        // Handle /model status
        if (commandLower === 'model' && args[0] === 'status') {
            return this.getModelStatus();
        }
        
        // Handle /model list
        if (commandLower === 'model' && args[0] === 'list') {
            return this.listModels();
        }
        
        return { success: false, error: 'Unknown command' };
    }

    /**
     * Switch to specified model
     */
    async switchToModel(modelKey) {
        const model = this.models[modelKey];
        
        if (!model) {
            return {
                success: false,
                error: `Unknown model: ${modelKey}`,
                availableModels: Object.keys(this.models)
            };
        }

        try {
            // Switch provider to bedrock with specific model
            const result = await LLMProviderManager.switchProvider('bedrock', modelKey);
            
            return {
                success: true,
                message: `✅ Switched to ${model.displayName}`,
                model: {
                    key: modelKey,
                    displayName: model.displayName,
                    modelId: model.modelId,
                    capabilities: model.capabilities,
                    description: model.description,
                    pricing: {
                        input: `$${model.pricing.input}/1K tokens`,
                        output: `$${model.pricing.output}/1K tokens`
                    }
                },
                provider: result.provider,
                region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                hint: error.message.includes('not available') 
                    ? 'Ensure BEDROCK_ENABLED=true and AWS credentials are configured'
                    : 'Check provider health with /model status'
            };
        }
    }

    /**
     * Get current model status
     */
    getModelStatus() {
        try {
            const status = LLMProviderManager.getProviderStatus();
            const bedrockStatus = status?.bedrock || {};
            
            return {
                success: true,
                currentProvider: LLMProviderManager.currentProvider || 'unknown',
                bedrock: {
                    name: bedrockStatus.name || 'AWS Bedrock',
                    available: bedrockStatus.available || false,
                    status: bedrockStatus.status || 'unknown',
                    region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
                    enabled: process.env.BEDROCK_ENABLED === 'true',
                    error: bedrockStatus.error || null
                },
                availableModels: Object.keys(this.models)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to get status'
            };
        }
    }

    /**
     * List available models
     */
    listModels() {
        return {
            success: true,
            models: Object.entries(this.models).map(([key, model]) => ({
                key,
                displayName: model.displayName,
                capabilities: model.capabilities,
                description: model.description,
                pricing: {
                    input: `$${model.pricing.input}/1K tokens`,
                    output: `$${model.pricing.output}/1K tokens`
                },
                command: `/use ${key}`
            }))
        };
    }

    /**
     * Format command response for display
     */
    formatResponse(response) {
        if (!response.success) {
            return `❌ Error: ${response.error}${response.hint ? '\n💡 ' + response.hint : ''}`;
        }

        if (response.models) {
            // List models response
            let output = '📋 Available Bedrock Models:\n\n';
            response.models.forEach(model => {
                output += `**${model.displayName}** (\`${model.key}\`)\n`;
                output += `   ${model.description}\n`;
                output += `   Capabilities: ${model.capabilities.join(', ')}\n`;
                output += `   Pricing: Input ${model.pricing.input}, Output ${model.pricing.output}\n`;
                output += `   Command: \`${model.command}\`\n\n`;
            });
            return output;
        }

        if (response.model) {
            // Model switch response
            let output = response.message + '\n\n';
            output += '**Model Details:**\n';
            output += `- Display Name: ${response.model.displayName}\n`;
            output += `- Model ID: ${response.model.modelId}\n`;
            output += `- Region: ${response.region}\n`;
            output += `- Capabilities: ${response.model.capabilities.join(', ')}\n`;
            output += `- Description: ${response.model.description}\n`;
            output += '\n**Pricing:**\n';
            output += `- Input: ${response.model.pricing.input}\n`;
            output += `- Output: ${response.model.pricing.output}\n`;
            return output;
        }

        if (response.bedrock) {
            // Status response
            let output = '📊 Bedrock Provider Status:\n\n';
            output += `- Current Provider: ${response.currentProvider}\n`;
            output += `- Bedrock Available: ${response.bedrock.available ? '✅' : '❌'}\n`;
            output += `- Status: ${response.bedrock.status}\n`;
            output += `- Region: ${response.bedrock.region}\n`;
            output += `- Enabled: ${response.bedrock.enabled ? '✅' : '❌'}\n`;
            if (response.bedrock.error) {
                output += `- Error: ${response.bedrock.error}\n`;
            }
            output += `\n**Available Models:** ${response.availableModels.join(', ')}\n`;
            return output;
        }

        return JSON.stringify(response, null, 2);
    }
}

// Singleton instance
const bedrockModelSwitcher = new BedrockModelSwitcher();

module.exports = bedrockModelSwitcher;
module.exports.BedrockModelSwitcher = BedrockModelSwitcher;
