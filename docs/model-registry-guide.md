# EchoTune AI - Model Registry & AI Provider Guide

## Overview

EchoTune AI features a comprehensive AI provider infrastructure with **30+ models** across **7 providers**, offering flexible model selection, automatic failover, and cost-aware routing.

**Last Updated**: 2025-11-18  
**Version**: v1.0

---

## Table of Contents

1. [Supported Providers](#supported-providers)
2. [Model Catalog](#model-catalog)
3. [Model Selection](#model-selection)
4. [Provider Management](#provider-management)
5. [User Configuration](#user-configuration)
6. [API Reference](#api-reference)

---

## Supported Providers

### 1. **Google Gemini** (`gemini`)
- **Status**: ✅ Production Ready
- **API Key**: `GEMINI_API_KEY`
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models`
- **Key Features**: 
  - Massive context windows (up to 2M tokens)
  - Multimodal (text, vision, audio)
  - Code execution capabilities
  - Free experimental models

### 2. **OpenAI** (`openai`)
- **Status**: ✅ Production Ready
- **API Key**: `OPENAI_API_KEY`
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Key Features**:
  - GPT-4o multimodal capabilities
  - Function calling
  - JSON mode
  - Industry-leading quality

### 3. **Anthropic Claude (via OpenRouter)** (`openrouter`)
- **Status**: ✅ Production Ready
- **API Key**: `OPENROUTER_API_KEY`
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Key Features**:
  - Claude 3.5 Sonnet and Opus 4.1
  - Extended thinking mode
  - Coding optimization
  - 200K context window

### 4. **Perplexity AI** (`perplexity`)
- **Status**: ✅ Production Ready
- **API Key**: `PERPLEXITY_API_KEY`
- **Endpoint**: `https://api.perplexity.ai/v1/chat/completions`
- **Key Features**:
  - Web search integration
  - Citation-grounded responses
  - Real-time data access
  - Sonar model family

### 5. **Grok-4 (xAI)** (`grok4`)
- **Status**: ✅ Production Ready
- **API Keys**: `XAI_API_KEY` or `OPENROUTER_API_KEY`
- **Endpoint**: `https://api.x.ai/v1/chat/completions`
- **Key Features**:
  - 256K context window
  - Code analysis
  - Multi-agent mode (Heavy variant)
  - Advanced reasoning

### 6. **AWS Bedrock** (`bedrock`)
- **Status**: ✅ Production Ready
- **Configuration**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_REGION`
- **Key Features**:
  - Multiple model providers (Claude, Llama, etc.)
  - Enterprise-grade infrastructure
  - Custom model fine-tuning
  - Cost optimization

### 7. **Mock Provider** (`mock`)
- **Status**: ✅ Always Available
- **Purpose**: Testing and development
- **No API Key Required**

---

## Model Catalog

### OpenAI Models

#### GPT-4o
```json
{
  "id": "gpt-4o",
  "provider": "openai",
  "name": "GPT-4o",
  "capabilities": ["text", "vision", "function-calling", "json-mode"],
  "contextWindow": 128000,
  "maxTokens": 128000,
  "costPer1kTokens": { "input": 0.0025, "output": 0.01 },
  "latencyTier": "medium",
  "qualityTier": "highest"
}
```
**Best For**: Complex multimodal tasks, vision understanding, advanced reasoning

#### GPT-4o Mini
```json
{
  "id": "gpt-4o-mini",
  "provider": "openai",
  "capabilities": ["text", "vision", "function-calling", "json-mode"],
  "contextWindow": 128000,
  "costPer1kTokens": { "input": 0.000375, "output": 0.00125 },
  "latencyTier": "fast",
  "qualityTier": "high"
}
```
**Best For**: Fast, cost-efficient tasks with good quality

#### GPT-4 Turbo
```json
{
  "id": "gpt-4-turbo",
  "provider": "openai",
  "capabilities": ["text", "vision", "function-calling", "json-mode"],
  "contextWindow": 128000,
  "costPer1kTokens": { "input": 0.01, "output": 0.03 },
  "latencyTier": "medium",
  "qualityTier": "highest"
}
```
**Best For**: High-performance tasks requiring latest knowledge

#### GPT-3.5 Turbo
```json
{
  "id": "gpt-3.5-turbo",
  "provider": "openai",
  "capabilities": ["text", "function-calling", "json-mode"],
  "contextWindow": 16385,
  "costPer1kTokens": { "input": 0.001, "output": 0.002 },
  "latencyTier": "fast",
  "qualityTier": "good"
}
```
**Best For**: Fast, simple chat tasks

---

### Google Gemini Models

#### Gemini 2.0 Flash (Experimental)
```json
{
  "id": "gemini-2.0-flash-exp",
  "provider": "gemini",
  "capabilities": ["text", "vision", "audio", "function-calling", "code-execution"],
  "contextWindow": 1000000,
  "costPer1kTokens": { "input": 0.0, "output": 0.0 },
  "latencyTier": "fast",
  "qualityTier": "experimental",
  "experimental": true
}
```
**Best For**: Cutting-edge features, free experimentation

#### Gemini 1.5 Pro
```json
{
  "id": "gemini-1.5-pro",
  "provider": "gemini",
  "capabilities": ["text", "vision", "audio", "function-calling", "code-execution"],
  "contextWindow": 2000000,
  "costPer1kTokens": { "input": 0.001, "output": 0.004 },
  "latencyTier": "medium",
  "qualityTier": "highest"
}
```
**Best For**: Massive context, complex reasoning, multimodal understanding

#### Gemini 1.5 Flash
```json
{
  "id": "gemini-1.5-flash",
  "provider": "gemini",
  "capabilities": ["text", "vision", "function-calling"],
  "contextWindow": 1000000,
  "costPer1kTokens": { "input": 0.000375, "output": 0.00125 },
  "latencyTier": "fast",
  "qualityTier": "high"
}
```
**Best For**: Fast, cost-efficient with large context

---

### Anthropic Claude Models (via OpenRouter)

#### Claude 3.5 Sonnet
```json
{
  "id": "anthropic/claude-3.5-sonnet",
  "provider": "openrouter",
  "capabilities": ["text", "vision", "function-calling", "artifacts"],
  "contextWindow": 200000,
  "costPer1kTokens": { "input": 0.003, "output": 0.015 },
  "latencyTier": "medium",
  "qualityTier": "highest"
}
```
**Best For**: Complex reasoning, analysis, writing

#### Claude 3 Haiku
```json
{
  "id": "anthropic/claude-3-haiku",
  "provider": "openrouter",
  "capabilities": ["text", "vision"],
  "contextWindow": 200000,
  "costPer1kTokens": { "input": 0.00025, "output": 0.00125 },
  "latencyTier": "very-fast",
  "qualityTier": "good"
}
```
**Best For**: Fast responses, simple tasks

#### Claude Opus 4.1
```json
{
  "id": "anthropic/claude-opus-4.1",
  "provider": "openrouter",
  "capabilities": ["text", "coding", "reasoning", "agents", "extended-thinking", "long-horizon-tasks"],
  "contextWindow": 200000,
  "maxTokens": 32000,
  "costPer1kTokens": { "input": 0.015, "output": 0.075 },
  "latencyTier": "medium",
  "qualityTier": "highest",
  "extendedThinking": true,
  "agentCapable": true,
  "codingOptimized": true
}
```
**Best For**: Advanced coding, agent workflows, complex multi-step tasks

---

### Perplexity Models

#### Sonar Small
```json
{
  "id": "sonar-small",
  "provider": "perplexity",
  "capabilities": ["text", "web-search", "citations"],
  "contextWindow": 4000,
  "costPer1kTokens": { "input": 0.0005, "output": 0.002 },
  "latencyTier": "fast",
  "qualityTier": "good"
}
```

#### Sonar Medium
```json
{
  "id": "sonar-medium",
  "provider": "perplexity",
  "capabilities": ["text", "web-search", "citations"],
  "contextWindow": 8000,
  "costPer1kTokens": { "input": 0.001, "output": 0.003 },
  "latencyTier": "medium",
  "qualityTier": "high"
}
```

#### Sonar Large
```json
{
  "id": "sonar-large",
  "provider": "perplexity",
  "capabilities": ["text", "web-search", "citations", "deep-research"],
  "contextWindow": 16000,
  "costPer1kTokens": { "input": 0.002, "output": 0.006 },
  "latencyTier": "medium",
  "qualityTier": "high"
}
```

#### Sonar Pro
```json
{
  "id": "sonar-pro",
  "provider": "perplexity",
  "capabilities": ["text", "web-search", "citations", "deep-research", "real-time-data"],
  "contextWindow": 32000,
  "costPer1kTokens": { "input": 0.003, "output": 0.009 },
  "latencyTier": "medium",
  "qualityTier": "highest"
}
```
**Best For**: Research, fact-checking, real-time information

---

### Grok-4 (xAI) Models

#### Grok-4
```json
{
  "id": "grok-4",
  "provider": "grok4",
  "capabilities": ["text", "code-analysis", "reasoning", "function-calling", "tool-calling"],
  "contextWindow": 256000,
  "costPer1kTokens": { "input": 0.005, "output": 0.015 },
  "latencyTier": "medium",
  "qualityTier": "highest"
}
```

#### Grok-4 Heavy
```json
{
  "id": "grok-4-heavy",
  "provider": "grok4",
  "capabilities": ["text", "code-analysis", "reasoning", "function-calling", "tool-calling", "multi-agent"],
  "contextWindow": 256000,
  "costPer1kTokens": { "input": 0.01, "output": 0.03 },
  "latencyTier": "slow",
  "qualityTier": "highest"
}
```

#### Grok Beta
```json
{
  "id": "grok-beta",
  "provider": "grok4",
  "capabilities": ["text", "code-analysis", "reasoning", "function-calling"],
  "contextWindow": 128000,
  "costPer1kTokens": { "input": 0.003, "output": 0.009 },
  "latencyTier": "medium",
  "qualityTier": "experimental",
  "experimental": true
}
```
**Best For**: Code analysis, technical reasoning, multi-agent workflows

---

### Meta Llama (via OpenRouter)

#### Llama 3.1 405B Instruct
```json
{
  "id": "meta-llama/llama-3.1-405b-instruct",
  "provider": "openrouter",
  "capabilities": ["text", "function-calling"],
  "contextWindow": 131072,
  "costPer1kTokens": { "input": 0.003, "output": 0.003 },
  "latencyTier": "slow",
  "qualityTier": "highest",
  "openSource": true
}
```
**Best For**: Open-source alternative with high quality

---

## Model Selection

### Automatic Model Recommendation

The Model Registry provides intelligent model recommendations based on task requirements:

```javascript
// Example: Recommend model for a task
const recommendation = modelRegistry.recommendModel({
  capabilities: ['text', 'function-calling'],
  maxCost: 0.005,
  maxLatency: 5000,
  preferOpenSource: false
});

console.log(recommendation);
// Returns: { id: 'gemini-1.5-flash', provider: 'gemini', ... }
```

### Selection Criteria

**Quality Tiers:**
- `highest` - Best quality, typically slower and more expensive
- `high` - Very good quality, balanced performance
- `good` - Acceptable quality, fast and cheap
- `experimental` - Cutting-edge features, may be unstable
- `testing` - Development/testing only

**Latency Tiers:**
- `very-fast` - <500ms average response time
- `fast` - 500ms-2s average response time
- `medium` - 2s-5s average response time
- `slow` - >5s average response time

**Cost Awareness:**
- Models are scored based on input/output token costs
- Lower cost = higher score in recommendation algorithm

---

## Provider Management

### Circuit Breaker Pattern

Each provider has automatic circuit breaker protection:

```javascript
{
  state: 'CLOSED',  // CLOSED, OPEN, HALF_OPEN
  failureThreshold: 5,
  latencyThreshold: 2000,  // ms
  timeout: 60000,  // Stay open for 1 minute
  halfOpenMaxRequests: 3
}
```

**States:**
- **CLOSED**: Normal operation
- **OPEN**: Too many failures, provider temporarily disabled
- **HALF_OPEN**: Testing if provider has recovered

### Automatic Failover

Provider fallback order (configurable):
1. Bedrock (if enabled and configured)
2. Gemini
3. Perplexity
4. Grok-4
5. OpenAI
6. OpenRouter
7. Mock (always available)

### API Key Rotation

Supports multiple API keys per provider with automatic rotation on rate limits or auth failures.

---

## User Configuration

### Environment Variables

```bash
# Primary Providers
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
OPENROUTER_API_KEY=your_openrouter_key
PERPLEXITY_API_KEY=your_perplexity_key
XAI_API_KEY=your_xai_key

# AWS Bedrock
BEDROCK_ENABLED=true
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
BEDROCK_REGION=us-east-1
BEDROCK_DEFAULT_MODEL=claude-sonnet-4-5

# Provider Preferences
DEFAULT_LLM_PROVIDER=gemini
```

### PostgreSQL User Preferences

User-specific model preferences are stored in the `user_preferences` table:

```sql
SELECT 
  preferred_llm_provider,
  enabled_providers
FROM user_preferences
WHERE user_id = 'user123';
```

**Fields:**
- `preferred_llm_provider`: Default provider (e.g., "gemini")
- `enabled_providers`: Array of enabled providers

---

## API Reference

### Get Available Models

```http
GET /api/llm-providers/models
```

**Response:**
```json
{
  "models": [
    {
      "id": "gpt-4o",
      "providerId": "openai",
      "name": "GPT-4o",
      "available": true,
      "capabilities": ["text", "vision", "function-calling"],
      "contextWindow": 128000,
      "costPer1kTokens": { "input": 0.0025, "output": 0.01 }
    }
  ],
  "totalModels": 30,
  "availableModels": 28
}
```

### Get Provider Status

```http
GET /api/llm-providers/status
```

**Response:**
```json
{
  "providers": {
    "gemini": {
      "name": "Google Gemini",
      "available": true,
      "status": "connected",
      "circuitBreaker": {
        "state": "CLOSED",
        "failureCount": 0
      }
    }
  },
  "current": "gemini",
  "fallbackOrder": ["bedrock", "gemini", "perplexity", ...]
}
```

### Send Message with Model Selection

```http
POST /api/chat/message
Content-Type: application/json

{
  "message": "Explain quantum computing",
  "provider": "gemini",
  "model": "gemini-1.5-pro",
  "options": {
    "maxTokens": 1000,
    "temperature": 0.7
  }
}
```

### Switch Active Provider

```http
POST /api/llm-providers/switch
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4o"
}
```

---

## Best Practices

### Cost Optimization

1. **Use Fast Models for Simple Tasks**: GPT-3.5 Turbo, Claude Haiku, Gemini Flash
2. **Reserve Premium Models**: Claude Opus, GPT-4o for complex reasoning
3. **Leverage Free Tiers**: Gemini experimental models
4. **Monitor Usage**: Track token consumption per provider

### Performance Optimization

1. **Prioritize Fast Models**: For real-time chat experiences
2. **Use Streaming**: Enable streaming for long responses
3. **Implement Caching**: Cache common queries
4. **Set Timeouts**: Prevent slow providers from blocking

### Reliability

1. **Enable Circuit Breakers**: Automatic failover on repeated failures
2. **Configure Multiple Providers**: Don't rely on a single provider
3. **Monitor Health**: Regular health checks
4. **Rotate Keys**: Use multiple API keys per provider

---

## Future Enhancements

### Planned Features:
- [ ] DeepSeek direct integration (currently via OpenRouter)
- [ ] Anthropic Claude direct API support
- [ ] Custom model fine-tuning interface
- [ ] Advanced cost tracking and budgeting
- [ ] Model performance analytics dashboard
- [ ] A/B testing framework for model selection
- [ ] Multi-model ensemble responses

---

## Troubleshooting

### Common Issues

**Problem**: Provider marked as unavailable
**Solution**: Check API key configuration and provider health status

**Problem**: High latency responses
**Solution**: Circuit breaker may be opening - check provider metrics

**Problem**: Rate limit errors
**Solution**: Enable API key rotation or upgrade plan

**Problem**: Model not available
**Solution**: Run model discovery: `/api/llm-providers/discover`

---

## Support

For issues or questions:
- Check provider health: `GET /api/llm-providers/status`
- View logs: Check server logs for detailed error messages
- Model registry stats: `GET /api/llm-providers/models/stats`

---

**Last Updated**: 2025-11-18  
**Model Count**: 30+  
**Provider Count**: 7  
**Status**: Production Ready ✅
