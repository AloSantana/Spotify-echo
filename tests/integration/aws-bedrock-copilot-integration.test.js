/**
 * Integration tests for AWS Bedrock Copilot Integration
 * Tests model switching, session management, and slash commands
 */

const fs = require('fs').promises;
const path = require('path');
const BedrockCopilotIntegration = require('../../scripts/aws-bedrock-copilot-integration');

// Mock configuration for testing
const mockConfig = {
  modelRegistry: {
    'test-model-1': {
      modelId: 'test.model-1',
      displayName: 'Test Model 1',
      provider: 'test',
      family: 'test-family',
      capabilities: ['text-generation', 'coding'],
      priority: 1,
      deprecated: false
    },
    'test-model-2': {
      modelId: 'test.model-2',
      displayName: 'Test Model 2',
      provider: 'test',
      family: 'test-family',
      capabilities: ['text-generation', 'analysis'],
      priority: 2,
      deprecated: false
    },
    'deprecated-model': {
      modelId: 'test.deprecated',
      displayName: 'Deprecated Model',
      provider: 'test',
      family: 'test-family',
      capabilities: ['text-generation'],
      priority: 99,
      deprecated: true
    }
  },
  metadata: {
    version: '1.0.0'
  }
};

describe('BedrockCopilotIntegration', () => {
  let integration;
  let tempConfigPath;

  beforeEach(async () => {
    // Create temporary config file
    tempConfigPath = path.join(__dirname, 'temp-bedrock-config.json');
    await fs.writeFile(tempConfigPath, JSON.stringify(mockConfig, null, 2));

    // Create integration instance with mock config
    integration = new BedrockCopilotIntegration({
      configPath: tempConfigPath
    });
    
    // Override default models to use test models
    integration.defaultModels = {
      coding: 'test-model-1',
      analysis: 'test-model-2',
      reasoning: 'test-model-1'
    };
  });

  afterEach(async () => {
    // Cleanup temp config
    try {
      await fs.unlink(tempConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('initialization', () => {
    test('should load configuration successfully', async () => {
      await integration.initialize();
      
      expect(integration.config).toBeDefined();
      expect(integration.config.modelRegistry).toBeDefined();
      expect(Object.keys(integration.config.modelRegistry)).toHaveLength(3);
    });

    test('should set default model on initialization', async () => {
      await integration.initialize();
      
      expect(integration.currentModel).toBeDefined();
      expect(integration.currentModel.key).toBe('test-model-1');
      expect(integration.currentModel.displayName).toBe('Test Model 1');
    });

    test('should throw error if config file not found', async () => {
      integration.configPath = '/non/existent/path.json';
      
      await expect(integration.initialize()).rejects.toThrow();
    });

    test('should initialize session state', async () => {
      await integration.initialize();
      
      expect(integration.sessionState).toBeDefined();
      expect(integration.sessionState.sessionId).toBeDefined();
      expect(integration.sessionState.startTime).toBeDefined();
      expect(integration.sessionState.currentModel).toBeDefined();
      expect(integration.sessionState.interactions).toBe(0);
    });
  });

  describe('model switching', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should switch to valid model', async () => {
      const result = await integration.switchModel(['test-model-2']);
      
      expect(result.success).toBe(true);
      expect(integration.currentModel.key).toBe('test-model-2');
      expect(integration.currentModel.displayName).toBe('Test Model 2');
    });

    test('should reject switching to non-existent model', async () => {
      const result = await integration.switchModel(['non-existent-model']);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(integration.currentModel.key).toBe('test-model-1'); // Should stay on current
    });

    test('should log model changes', async () => {
      await integration.switchModel(['test-model-2']);
      
      expect(integration.sessionState.modelHistory).toHaveLength(2); // Initial + switch
      const lastChange = integration.sessionState.modelHistory[1];
      expect(lastChange.to).toBe('Test Model 2');
    });

    test('should require model key argument', async () => {
      const result = await integration.switchModel([]);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Usage');
    });
  });

  describe('slash commands', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should handle /use command', async () => {
      const result = await integration.handleSlashCommand('/use test-model-2');
      
      expect(result.success).toBe(true);
      expect(integration.currentModel.key).toBe('test-model-2');
    });

    test('should handle /model status command', async () => {
      const result = await integration.handleSlashCommand('/model status');
      
      expect(result.success).toBe(true);
      expect(result.model).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    test('should handle /model list command', async () => {
      const result = await integration.handleSlashCommand('/model list');
      
      expect(result.success).toBe(true);
      expect(result.models).toBeDefined();
      expect(result.models.length).toBeGreaterThan(0);
      // Should not include deprecated models
      expect(result.models.find(m => m.key === 'deprecated-model')).toBeUndefined();
    });

    test('should handle /model reset command', async () => {
      // Switch to different model first
      await integration.switchModel(['test-model-2']);
      expect(integration.currentModel.key).toBe('test-model-2');
      
      // Reset to default
      const result = await integration.handleSlashCommand('/model reset');
      
      expect(result.success).toBe(true);
      expect(integration.currentModel.key).toBe('test-model-1');
    });

    test('should handle /model help command', async () => {
      const result = await integration.handleSlashCommand('/model help');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Help displayed');
    });

    test('should reject unknown slash commands', async () => {
      const result = await integration.handleSlashCommand('/unknown');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command');
    });

    test('should reject unknown /model subcommands', async () => {
      const result = await integration.handleSlashCommand('/model unknown');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown subcommand');
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should track interactions', () => {
      integration.trackInteraction({ total: 100 });
      integration.trackInteraction({ total: 150 });
      
      expect(integration.sessionState.interactions).toBe(2);
      expect(integration.sessionState.tokenUsage.total).toBe(250);
    });

    test('should track tokens per model', () => {
      integration.trackInteraction({ total: 100 });
      
      const modelKey = integration.currentModel.key;
      expect(integration.sessionState.tokenUsage.byModel[modelKey]).toBeDefined();
      expect(integration.sessionState.tokenUsage.byModel[modelKey].total).toBe(100);
      expect(integration.sessionState.tokenUsage.byModel[modelKey].interactions).toBe(1);
    });

    test('should generate session summary', async () => {
      await integration.initialize();
      integration.trackInteraction({ total: 100 });
      await integration.switchModel(['test-model-2']);
      integration.trackInteraction({ total: 200 });
      
      const summary = integration.getSessionSummary();
      
      expect(summary.sessionId).toBeDefined();
      expect(summary.interactions).toBe(2);
      expect(summary.totalTokens).toBe(300);
      expect(summary.modelSwitches).toBeGreaterThan(0);
      expect(summary.modelsUsed.length).toBeGreaterThan(0);
    });

    test('should export session state', async () => {
      await integration.initialize();
      integration.trackInteraction({ total: 100 });
      
      const exportPath = path.join(__dirname, 'temp-session-export.json');
      await integration.exportSessionState(exportPath);
      
      const exported = JSON.parse(await fs.readFile(exportPath, 'utf-8'));
      
      expect(exported.sessionId).toBe(integration.sessionState.sessionId);
      expect(exported.summary).toBeDefined();
      expect(exported.exportedAt).toBeDefined();
      
      // Cleanup
      await fs.unlink(exportPath);
    });
  });

  describe('model purpose detection', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should detect coding models', () => {
      const model = { capabilities: ['text-generation', 'coding'] };
      const purpose = integration.getModelPurpose(model);
      
      expect(purpose).toContain('Code generation');
    });

    test('should detect reasoning models', () => {
      const model = { capabilities: ['text-generation', 'reasoning'] };
      const purpose = integration.getModelPurpose(model);
      
      expect(purpose).toContain('reasoning');
    });

    test('should detect vision models', () => {
      const model = { capabilities: ['text-generation', 'vision'] };
      const purpose = integration.getModelPurpose(model);
      
      expect(purpose).toContain('vision');
    });

    test('should handle generic models', () => {
      const model = { capabilities: ['text-generation'] };
      const purpose = integration.getModelPurpose(model);
      
      expect(purpose).toContain('General text generation');
    });
  });

  describe('display methods', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should display session header without errors', () => {
      // This test mainly ensures no exceptions are thrown
      expect(() => integration.displaySessionHeader()).not.toThrow();
    });

    test('should display current model without errors', () => {
      expect(() => integration.displayCurrentModel()).not.toThrow();
    });

    test('should display completion header without errors', () => {
      expect(() => integration.displayCompletionHeader('Testing')).not.toThrow();
    });

    test('should show help without errors', () => {
      const result = integration.showHelp();
      expect(result.success).toBe(true);
    });
  });
});
