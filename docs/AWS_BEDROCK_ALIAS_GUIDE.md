# AWS Bedrock Alias Resolution Guide

**Version**: 1.0.0  
**Last Updated**: January 15, 2025  
**Status**: Production Ready

---

## Overview

The AWS Bedrock Alias Resolution system provides a centralized, dynamic approach to managing AWS Bedrock model identifiers. Instead of hardcoding model IDs throughout the codebase, we use human-readable aliases that resolve to actual model IDs at runtime.

### Benefits

✅ **No Hardcoded Model IDs** - All model references use aliases  
✅ **Centralized Configuration** - Single source of truth in `config/bedrock-aliases.json`  
✅ **Dynamic Updates** - Model IDs can be updated without code changes  
✅ **Deprecation Management** - Automatic warnings and replacements for deprecated models  
✅ **Cost Tracking** - Integrated pricing data for accurate cost calculation  
✅ **Backward Compatibility** - Legacy model mappings for smooth migrations

---

## Quick Start

### 1. Basic Usage

```javascript
const { getModelId, getPricing, resolve } = require('./src/infra/bedrock/alias-resolver');

// Get model ID from alias
const modelId = getModelId('claude-3-opus');
// Returns: 'anthropic.claude-3-opus-20240229-v1:0'

// Get pricing information
const pricing = getPricing('claude-3-opus');
// Returns: { input: 0.015, output: 0.075, currency: 'USD', unit: 'per 1K tokens' }

// Get full model configuration
const config = resolve('claude-3-opus');
console.log(config.displayName);  // 'Claude 3 Opus'
console.log(config.capabilities); // ['reasoning', 'complex-analysis', ...]
```

### 2. Calculate Costs

```javascript
const { calculateCost } = require('./src/infra/bedrock/alias-resolver');

const usage = {
  input_tokens: 1000,
  output_tokens: 500
};

const cost = calculateCost('claude-3-opus', usage);
console.log(`Total cost: $${cost.totalCost.toFixed(6)}`);
// Total cost: $0.052500
```

### 3. List Available Models

```javascript
const { listAliases } = require('./src/infra/bedrock/alias-resolver');

// List all active models
const models = listAliases();
console.log(`Available models: ${models.length}`);

// Filter by provider
const anthropicModels = listAliases({ filterByProvider: 'anthropic' });

// Filter by capability
const codingModels = listAliases({ filterByCapability: 'coding' });

// Include deprecated models
const allModels = listAliases({ includeDeprecated: true });
```

---

## Available Aliases

### Active Models

| Alias | Display Name | Provider | Model ID | Priority |
|-------|--------------|----------|----------|----------|
| `claude-sonnet-4-5` | Claude Sonnet 4.5 | Anthropic | `anthropic.claude-sonnet-4-5-20250929-v1:0` | 1 |
| `claude-3-opus` | Claude 3 Opus | Anthropic | `anthropic.claude-3-opus-20240229-v1:0` | 2 |
| `claude-3-5-sonnet-v2` | Claude 3.5 Sonnet v2 | Anthropic | `anthropic.claude-3-5-sonnet-20241022-v2:0` | 3 |
| `claude-3-5-sonnet-v1` | Claude 3.5 Sonnet v1 | Anthropic | `anthropic.claude-3-5-sonnet-20240620-v1:0` | 4 |
| `claude-3-5-haiku` | Claude 3.5 Haiku | Anthropic | `anthropic.claude-3-5-haiku-20241022-v1:0` | 5 |
| `claude-3-sonnet` | Claude 3 Sonnet | Anthropic | `anthropic.claude-3-sonnet-20240229-v1:0` | 6 |
| `claude-3-haiku` | Claude 3 Haiku | Anthropic | `anthropic.claude-3-haiku-20240307-v1:0` | 8 |
| `deepseek-r1` | DeepSeek R1 | DeepSeek | `deepseek.r1-v1:0` | 10 |
| `titan-text-express-v1` | Titan Text Express v1 | Amazon | `amazon.titan-text-express-v1` | 20 |

### Deprecated Aliases

| Alias | Replacement | Deprecation Note |
|-------|-------------|------------------|
| `claude-v2-1` | `claude-3-sonnet` | Claude 2.1 is deprecated. Use Claude 3 or later. |
| `claude-instant-v1` | `claude-3-5-haiku` | Use Claude 3 Haiku or 3.5 Haiku for fast responses. |
| `claude-3-opus` | `claude-3-opus` | Claude 4 Opus does not exist in AWS Bedrock. |

### Legacy Mappings

For backward compatibility, these legacy aliases automatically map to current models:

- `claude-3-opus` → `claude-3-opus`
- `claude-4-opus` → `claude-3-opus`
- `claude-opus` → `claude-3-opus`
- `claude-sonnet` → `claude-3-5-sonnet-v2`
- `claude-haiku` → `claude-3-5-haiku`

---

## Integration Patterns

### Pattern 1: Provider Integration

```javascript
// src/infra/BedrockInferenceProvider.js
const aliasResolver = require('./bedrock/alias-resolver');

class BedrockInferenceProvider {
    loadModelConfig() {
        const aliases = aliasResolver.listAliases();
        const config = {};
        
        for (const alias of aliases) {
            if (!alias.deprecated) {
                const metadata = aliasResolver.getMetadata(alias.alias);
                config[alias.alias] = metadata;
            }
        }
        
        return config;
    }
    
    async invokeModel(alias, requestBody) {
        const modelId = aliasResolver.getModelId(alias);
        // Use modelId for AWS SDK call
    }
}
```

### Pattern 2: Cost Tracking

```javascript
// Automatic cost calculation after inference
const result = await provider.predict('claude-3-opus', prompt);

const cost = aliasResolver.calculateCost('claude-3-opus', result.usage);

console.log(`Request cost: $${cost.totalCost.toFixed(6)}`);
console.log(`Input: ${cost.usage.input_tokens} tokens @ $${cost.inputCost.toFixed(6)}`);
console.log(`Output: ${cost.usage.output_tokens} tokens @ $${cost.outputCost.toFixed(6)}`);
```

### Pattern 3: Model Switching

```javascript
// src/chat/bedrock-model-switcher.js
const aliasResolver = require('../infra/bedrock/alias-resolver');

class BedrockModelSwitcher {
    constructor() {
        // Load models dynamically
        const aliases = aliasResolver.listAliases();
        this.models = {};
        
        for (const alias of aliases) {
            if (!alias.deprecated) {
                const metadata = aliasResolver.getMetadata(alias.alias);
                this.models[alias.alias] = metadata;
            }
        }
    }
    
    async switchToModel(alias) {
        if (!aliasResolver.hasAlias(alias)) {
            throw new Error(`Unknown model: ${alias}`);
        }
        
        const metadata = aliasResolver.getMetadata(alias);
        return metadata;
    }
}
```

---

## Configuration File

### Location
`config/bedrock-aliases.json`

### Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-15",
  "aliases": {
    "model-alias": {
      "modelId": "provider.model-id:version",
      "displayName": "Human Readable Name",
      "provider": "provider-name",
      "family": "model-family",
      "capabilities": ["capability1", "capability2"],
      "contextWindow": 200000,
      "maxOutputTokens": 4096,
      "requiresInferenceProfile": false,
      "inferenceProfileArn": null,
      "regions": ["us-east-1", "us-west-2"],
      "deprecated": false,
      "priority": 1,
      "pricing": {
        "input": 0.003,
        "output": 0.015,
        "currency": "USD",
        "unit": "per 1K tokens"
      },
      "notes": "Optional notes"
    }
  },
  "deprecatedAliases": {
    "old-alias": {
      "modelId": "OLD_ID",
      "deprecated": true,
      "deprecatedSince": "2025-01-15",
      "replacement": "new-alias",
      "deprecationNote": "Reason for deprecation"
    }
  },
  "legacyMappings": {
    "old-name": "new-alias"
  }
}
```

---

## Adding New Models

### Step 1: Update Configuration

Add the new model to `config/bedrock-aliases.json`:

```json
{
  "aliases": {
    "new-model": {
      "modelId": "provider.model-name:version",
      "displayName": "New Model Name",
      "provider": "provider",
      "family": "model-family",
      "capabilities": ["text-generation"],
      "contextWindow": 100000,
      "maxOutputTokens": 4096,
      "requiresInferenceProfile": false,
      "inferenceProfileArn": null,
      "regions": ["us-east-1"],
      "deprecated": false,
      "priority": 15,
      "pricing": {
        "input": 0.001,
        "output": 0.003,
        "currency": "USD",
        "unit": "per 1K tokens"
      }
    }
  }
}
```

### Step 2: Reload Configuration

The alias resolver automatically loads the configuration on first use. To force a reload:

```javascript
const { getInstance } = require('./src/infra/bedrock/alias-resolver');

const resolver = getInstance();
resolver.reload();
```

### Step 3: Verify

```javascript
const { hasAlias, getMetadata } = require('./src/infra/bedrock/alias-resolver');

if (hasAlias('new-model')) {
    const metadata = getMetadata('new-model');
    console.log('Model added successfully:', metadata.displayName);
}
```

---

## Deprecating Models

### Step 1: Move to Deprecated Aliases

```json
{
  "deprecatedAliases": {
    "old-model": {
      "modelId": "provider.old-model:1",
      "displayName": "Old Model",
      "deprecated": true,
      "deprecatedSince": "2025-01-15",
      "replacement": "new-model",
      "deprecationNote": "This model is deprecated. Use new-model instead."
    }
  }
}
```

### Step 2: Add Legacy Mapping (Optional)

```json
{
  "legacyMappings": {
    "old-model": "new-model"
  }
}
```

### Step 3: Test Deprecation Warnings

```javascript
// This will log a warning
const config = resolve('old-model', { allowDeprecated: true });

// This will throw an error
try {
    const config = resolve('old-model');
} catch (error) {
    console.error(error.message);
    // "Model alias 'old-model' is deprecated..."
}
```

---

## Validation & Testing

### Run Guard Script

Detect hardcoded model IDs in codebase:

```bash
node scripts/guard-bedrock-model-ids.js

# Strict mode (fail CI/CD if violations found)
node scripts/guard-bedrock-model-ids.js --strict

# Verbose output
node scripts/guard-bedrock-model-ids.js --verbose
```

### Validate Configuration

```bash
# JSON syntax validation
python3 -m json.tool config/bedrock-aliases.json

# Alias resolver validation
node -e "const { getConfigMetadata } = require('./src/infra/bedrock/alias-resolver'); console.log(JSON.stringify(getConfigMetadata(), null, 2))"
```

### Run Live Validation

```bash
# Test alias resolution with live AWS API calls
npm run bedrock:validate:strict

# Generate evidence artifacts
npm run bedrock:collect-evidence
```

---

## Configuration Hash & Validation Artifacts

Every validation run generates a configuration hash for traceability:

```javascript
const { getConfigHash, getConfigMetadata } = require('./src/infra/bedrock/alias-resolver');

console.log('Config Hash:', getConfigHash());
// Output: 'a1b2c3d4e5f6...'

const metadata = getConfigMetadata();
console.log('Version:', metadata.version);
console.log('Last Updated:', metadata.lastUpdated);
console.log('Total Aliases:', metadata.totalAliases);
```

This hash is included in validation reports for audit trails.

---

## Best Practices

### ✅ DO

1. **Always use aliases** instead of hardcoded model IDs
2. **Update pricing** when AWS announces price changes
3. **Document deprecations** with clear replacement guidance
4. **Version your config** with semantic versioning
5. **Run guard script** in CI/CD to prevent hardcoded IDs

### ❌ DON'T

1. **Don't hardcode model IDs** anywhere in application code
2. **Don't skip validation** when adding new models
3. **Don't remove deprecated aliases** without grace period
4. **Don't forget to update** inference profile ARNs when available
5. **Don't modify** alias resolver cache directly

---

## Troubleshooting

### Problem: Unknown alias error

**Error**: `Unknown model alias: 'my-model'`

**Solution**: Check if the alias exists in `config/bedrock-aliases.json`

```javascript
const { listAliases } = require('./src/infra/bedrock/alias-resolver');
console.log('Available:', listAliases().map(a => a.alias));
```

### Problem: Deprecated model warning

**Warning**: `⚠️  DEPRECATED: 'old-model' - Use 'new-model' instead`

**Solution**: Update your code to use the replacement alias

### Problem: Invalid model ID

**Error**: `The provided model identifier is invalid`

**Solution**: Verify the model ID in AWS Bedrock documentation and update `config/bedrock-aliases.json`

---

## Migration Guide

### From Hardcoded IDs to Aliases

**Before:**
```javascript
const modelId = 'anthropic.claude-3-opus-20240229-v1:0';
const result = await client.send(new InvokeModelCommand({ modelId, ... }));
```

**After:**
```javascript
const { getModelId } = require('./src/infra/bedrock/alias-resolver');
const modelId = getModelId('claude-3-opus');
const result = await client.send(new InvokeModelCommand({ modelId, ... }));
```

### From aws-bedrock-models.json to Alias System

1. **Identify all model references** in old config
2. **Create corresponding aliases** in `bedrock-aliases.json`
3. **Update code** to use alias resolver
4. **Run guard script** to verify no hardcoded IDs remain
5. **Archive old config** for reference

---

## Related Documentation

- [AWS Bedrock Comprehensive Test Guide](./AWS_BEDROCK_COMPREHENSIVE_TEST_GUIDE.md)
- [AWS Bedrock Coding Guide](./AWS_BEDROCK_CODING_GUIDE.md)
- [Bedrock Implementation Summary](../BEDROCK_IMPLEMENTATION_SUMMARY.md)
- [Unified Retry Layer](../src/infra/bedrock/unified-retry.js)

---

**Maintained by**: EchoTune AI Team  
**Last Review**: January 15, 2025  
**Next Review**: March 15, 2025
