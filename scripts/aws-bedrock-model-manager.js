#!/usr/bin/env node

/**
 * IMPORTANT DISCLAIMER:
 * This tool manages AWS Bedrock model testing and configuration.
 * It does NOT control which models GitHub Copilot uses.
 * GitHub Copilot's model selection is managed by GitHub's infrastructure.
 * 
 * AWS Bedrock Model Manager - Testing & Configuration Tool
 * 
 * Features:
 * - Visible model usage tracking in testing sessions
 * - Slash commands for dynamic model switching during tests
 * - Testing session state management with model metadata
 * - Token usage and latency tracking
 * - Model priority and defaults configuration
 * 
 * Usage:
 *   const manager = new BedrockModelManager();
 *   await manager.initialize();
 *   manager.displaySessionHeader();
 *   await manager.handleSlashCommand('/use claude-sonnet-4-5');
 */

const fs = require('fs').promises;
const path = require('path');

class BedrockModelManager {
  constructor(options = {}) {
    this.configPath = options.configPath || path.join(__dirname, '../config/aws-bedrock-models.json');
    this.config = null;
    this.currentModel = null;
    this.defaultModels = {
      coding: 'claude-sonnet-4-5',
      analysis: 'claude-3-opus',
      reasoning: 'deepseek-r1'
    };
    
    this.sessionState = {
      sessionId: `bedrock-${Date.now()}`,
      startTime: new Date(),
      currentModel: null,
      modelHistory: [],
      tokenUsage: {
        total: 0,
        byModel: {}
      },
      interactions: 0
    };

    this.slashCommands = {
      '/use': this.switchModel.bind(this),
      '/model': this.handleModelCommand.bind(this)
    };
  }

  /**
   * Initialize the model manager
   */
  async initialize() {
    console.log('🔧 Initializing AWS Bedrock Model Manager...');
    
    // Load configuration
    await this.loadConfiguration();
    
    // Set default model
    await this.setDefaultModel();
    
    console.log('✅ AWS Bedrock Model Manager initialized');
  }

  /**
   * Load model configuration
   */
  async loadConfiguration() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      console.log(`📋 Loaded ${Object.keys(this.config.modelRegistry).length} models from registry`);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Set default model for the testing session
   */
  async setDefaultModel() {
    const defaultKey = this.defaultModels.coding;
    const model = this.config.modelRegistry[defaultKey];
    
    if (!model) {
      throw new Error(`Default model ${defaultKey} not found in registry`);
    }
    
    this.currentModel = { key: defaultKey, ...model };
    this.sessionState.currentModel = this.currentModel;
    this.logModelChange(null, this.currentModel, 'Testing session initialization');
  }

  /**
   * Display testing session header with current model info
   */
  displaySessionHeader() {
    const model = this.currentModel;
    const region = process.env.AWS_REGION || 'us-east-1';
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  AWS Bedrock Model Manager – Testing & Configuration Tool ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Model: ${model.displayName.padEnd(49)} ║`);
    console.log(`║  ID: ${model.modelId.padEnd(52)} ║`);
    console.log(`║  Region: ${region.padEnd(50)} ║`);
    
    const purpose = this.getModelPurpose(model);
    console.log(`║  Purpose: ${purpose.padEnd(49)} ║`);
    
    const sessionTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`║  Testing Session Started: ${sessionTime.padEnd(34)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
  }

  /**
   * Display current model status
   */
  displayCurrentModel() {
    const model = this.currentModel;
    const region = process.env.AWS_REGION || 'us-east-1';
    
    console.log('');
    console.log('🤖 Running on AWS Bedrock');
    console.log(`• Model: ${model.displayName}`);
    console.log(`• Model ID: ${model.modelId}`);
    console.log(`• Region: ${region}`);
    
    if (model.requiresInferenceProfile && model.inferenceProfileArn) {
      console.log(`• Profile ARN: ${model.inferenceProfileArn}`);
    }
    
    const purpose = this.getModelPurpose(model);
    console.log(`• Purpose: ${purpose}`);
    console.log('');
  }

  /**
   * Get model purpose based on capabilities
   */
  getModelPurpose(model) {
    const capabilities = model.capabilities || [];
    
    if (capabilities.includes('coding')) {
      return 'Code generation & analysis';
    } else if (capabilities.includes('reasoning')) {
      return 'Complex reasoning & problem solving';
    } else if (capabilities.includes('vision')) {
      return 'Multimodal analysis (text & vision)';
    } else if (capabilities.includes('analysis')) {
      return 'Analysis & documentation';
    } else {
      return 'General text generation';
    }
  }

  /**
   * Handle slash commands
   */
  async handleSlashCommand(command, args = []) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const cmdArgs = parts.slice(1).concat(args);

    if (this.slashCommands[cmd]) {
      return await this.slashCommands[cmd](cmdArgs);
    } else {
      return {
        success: false,
        message: `Unknown command: ${cmd}. Use /model help for available commands.`
      };
    }
  }

  /**
   * Switch to a different model
   */
  async switchModel(args) {
    if (args.length === 0) {
      return {
        success: false,
        message: 'Usage: /use <model-key>\nExample: /use claude-3-opus'
      };
    }

    const modelKey = args[0];
    const model = this.config.modelRegistry[modelKey];

    if (!model) {
      return {
        success: false,
        message: `Model "${modelKey}" not found. Use /model list to see available models.`,
        availableModels: Object.keys(this.config.modelRegistry)
      };
    }

    const previousModel = this.currentModel;
    this.currentModel = { key: modelKey, ...model };
    this.sessionState.currentModel = this.currentModel;
    
    this.logModelChange(previousModel, this.currentModel, 'User requested via /use command');

    console.log('');
    console.log(`✓ Now using ${model.displayName}`);
    console.log(`  Model ID: ${model.modelId}`);
    console.log(`  Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log('  All subsequent completions will use this model.');
    console.log('');

    return {
      success: true,
      message: `Switched to ${model.displayName}`,
      model: this.currentModel
    };
  }

  /**
   * Handle /model commands
   */
  async handleModelCommand(args) {
    const subcommand = args[0] || 'status';

    switch (subcommand) {
      case 'status':
        return await this.showModelStatus();
      case 'list':
        return await this.listModels();
      case 'reset':
        return await this.resetToDefault();
      case 'help':
        return this.showHelp();
      default:
        return {
          success: false,
          message: `Unknown subcommand: ${subcommand}. Use /model help for available commands.`
        };
    }
  }

  /**
   * Show current model status
   */
  async showModelStatus() {
    this.displayCurrentModel();
    
    const tokenStats = this.sessionState.tokenUsage.byModel[this.currentModel.key] || {
      total: 0,
      interactions: 0
    };

    console.log('📊 Testing Session Statistics');
    console.log(`• Interactions: ${this.sessionState.interactions}`);
    console.log(`• Total Tokens: ${this.sessionState.tokenUsage.total}`);
    console.log(`• Current Model Tokens: ${tokenStats.total}`);
    console.log(`• Model Switches: ${this.sessionState.modelHistory.length}`);
    console.log('');

    return {
      success: true,
      model: this.currentModel,
      stats: this.sessionState
    };
  }

  /**
   * List all available models
   */
  async listModels() {
    console.log('');
    console.log('📋 Available AWS Bedrock Models');
    console.log('═'.repeat(60));
    console.log('');

    const models = Object.entries(this.config.modelRegistry)
      .filter(([, model]) => !model.deprecated)
      .sort((a, b) => a[1].priority - b[1].priority);

    for (const [key, model] of models) {
      const isCurrentModel = key === this.currentModel.key;
      const marker = isCurrentModel ? '→' : ' ';
      
      console.log(`${marker} ${key}`);
      console.log(`  Name: ${model.displayName}`);
      console.log(`  Family: ${model.family}`);
      console.log(`  Purpose: ${this.getModelPurpose(model)}`);
      console.log(`  Command: /use ${key}`);
      console.log('');
    }

    console.log('Usage: /use <model-key>');
    console.log('');

    return {
      success: true,
      models: models.map(([key, model]) => ({
        key,
        name: model.displayName,
        current: key === this.currentModel.key
      }))
    };
  }

  /**
   * Reset to default model
   */
  async resetToDefault() {
    const defaultKey = this.defaultModels.coding;
    const model = this.config.modelRegistry[defaultKey];

    if (!model) {
      return {
        success: false,
        message: `Default model ${defaultKey} not found`
      };
    }

    const previousModel = this.currentModel;
    this.currentModel = { key: defaultKey, ...model };
    this.sessionState.currentModel = this.currentModel;
    
    this.logModelChange(previousModel, this.currentModel, 'Reset to default');

    console.log('');
    console.log(`✓ Reset to default model: ${model.displayName}`);
    console.log(`  Model ID: ${model.modelId}`);
    console.log('');

    return {
      success: true,
      message: `Reset to ${model.displayName}`,
      model: this.currentModel
    };
  }

  /**
   * Show help for slash commands
   */
  showHelp() {
    console.log('');
    console.log('🔍 AWS Bedrock Model Manager Commands');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Model Selection:');
    console.log('  /use <model-key>          Switch to a specific model');
    console.log('  /use claude-3-opus      Switch to Claude Opus 4.1');
    console.log('  /use claude-sonnet-4-5    Switch to Claude Sonnet 4.5');
    console.log('  /use deepseek-r1          Switch to DeepSeek R1');
    console.log('');
    console.log('Model Information:');
    console.log('  /model status             Show current model info');
    console.log('  /model list               List all available models');
    console.log('  /model reset              Reset to default model');
    console.log('  /model help               Show this help message');
    console.log('');
    console.log('Quick Switches:');
    console.log('  /use claude-3-opus      → Complex analysis & architecture');
    console.log('  /use claude-sonnet-4-5    → Code generation (default)');
    console.log('  /use claude-3-5-sonnet-v2 → Multimodal with vision');
    console.log('  /use deepseek-r1          → Reasoning & problem solving');
    console.log('');

    return {
      success: true,
      message: 'Help displayed'
    };
  }

  /**
   * Log model change
   */
  logModelChange(previousModel, newModel, reason) {
    const change = {
      timestamp: new Date(),
      from: previousModel ? previousModel.displayName : null,
      to: newModel.displayName,
      reason
    };

    this.sessionState.modelHistory.push(change);

    if (previousModel) {
      console.log('');
      console.log('📝 Model Changed');
      console.log(`• Previous: ${previousModel.displayName}`);
      console.log(`• Current: ${newModel.displayName} (${newModel.modelId})`);
      console.log(`• Region: ${process.env.AWS_REGION || 'us-east-1'}`);
      console.log(`• Reason: ${reason}`);
      console.log('');
    }
  }

  /**
   * Track interaction with token usage
   */
  trackInteraction(tokenUsage = {}) {
    this.sessionState.interactions++;
    
    const tokens = tokenUsage.total || 0;
    this.sessionState.tokenUsage.total += tokens;
    
    const modelKey = this.currentModel.key;
    if (!this.sessionState.tokenUsage.byModel[modelKey]) {
      this.sessionState.tokenUsage.byModel[modelKey] = {
        total: 0,
        interactions: 0
      };
    }
    
    this.sessionState.tokenUsage.byModel[modelKey].total += tokens;
    this.sessionState.tokenUsage.byModel[modelKey].interactions++;
  }

  /**
   * Display completion header with model info
   */
  displayCompletionHeader(purpose = 'Code generation') {
    const model = this.currentModel;
    
    console.log('');
    console.log('─'.repeat(60));
    console.log(`✓ Using ${model.displayName} for ${purpose.toLowerCase()}`);
    console.log(`  Model ID: ${model.modelId}`);
    console.log(`  Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log('─'.repeat(60));
    console.log('');
  }

  /**
   * Get testing session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this.sessionState.startTime.getTime();
    const durationMinutes = Math.floor(duration / 60000);

    return {
      sessionId: this.sessionState.sessionId,
      duration: `${durationMinutes} minutes`,
      currentModel: this.currentModel.displayName,
      interactions: this.sessionState.interactions,
      totalTokens: this.sessionState.tokenUsage.total,
      modelSwitches: this.sessionState.modelHistory.length,
      modelsUsed: Object.keys(this.sessionState.tokenUsage.byModel)
    };
  }

  /**
   * Export testing session state
   */
  async exportSessionState(outputPath) {
    const state = {
      ...this.sessionState,
      summary: this.getSessionSummary(),
      exportedAt: new Date()
    };

    await fs.writeFile(outputPath, JSON.stringify(state, null, 2));
    console.log(`✓ Testing session state exported to: ${outputPath}`);
  }
}

// CLI execution
async function main() {
  const manager = new BedrockModelManager();
  
  try {
    await manager.initialize();
    manager.displaySessionHeader();
    
    // Example: Process command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      const command = args[0];
      const commandArgs = args.slice(1);
      
      if (command.startsWith('/')) {
        const result = await manager.handleSlashCommand(command, commandArgs);
        
        if (!result.success) {
          console.error(`❌ ${result.message}`);
          process.exit(1);
        }
      } else {
        console.log('Use slash commands to interact:');
        console.log('  /model status    - Show current model');
        console.log('  /model list      - List available models');
        console.log('  /use <model-key> - Switch model');
        console.log('  /model help      - Show all commands');
      }
    } else {
      // Interactive mode
      manager.showHelp();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = BedrockModelManager;

// Run if called directly
if (require.main === module) {
  main();
}
