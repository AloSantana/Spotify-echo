# AWS Bedrock Integration Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EchoTune AI Application                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ LLM Request
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LLM Provider Manager                            │
│                                                                       │
│  Fallback Order: bedrock → gemini → perplexity → openai → mock     │
└─────────────────────────────────────────────────────────────────────┘
                    │                              │
     Bedrock Enabled│                              │ Fallback
                    ▼                              ▼
┌───────────────────────────────────┐   ┌──────────────────────────┐
│     BedrockProvider Adapter       │   │   Other Providers        │
│                                   │   │  (Gemini, OpenAI, etc)   │
│  - Health checking                │   └──────────────────────────┘
│  - Cost calculation               │
│  - Metrics integration            │
│  - Error categorization           │
└───────────────────────────────────┘
                    │
                    │ Wraps
                    ▼
┌───────────────────────────────────┐
│  BedrockInferenceProvider         │
│                                   │
│  - Model management               │
│  - Request/response handling      │
│  - Streaming support              │
│  - Caching                        │
└───────────────────────────────────┘
                    │
                    │ AWS SDK
                    ▼
┌───────────────────────────────────┐
│       AWS Bedrock API             │
│                                   │
│  Models:                          │
│  - Claude Sonnet 4.5              │
│  - Claude Opus 4.1                │
└───────────────────────────────────┘
```

## Evidence Collection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Validation Trigger                                │
│            (npm run bedrock:validate:strict)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              validate-bedrock-live.js                                │
│                                                                       │
│  1. Validate AWS credentials                                         │
│  2. Test Claude Sonnet 4.5 invocation                               │
│  3. Test Claude Opus 4.1 invocation                                 │
│  4. Calculate costs                                                  │
│  5. Save per-invocation logs                                        │
│  6. Generate summary report                                         │
└─────────────────────────────────────────────────────────────────────┘
                    │                              │
      Invocation logs│                             │ Summary
                    ▼                              ▼
┌────────────────────────────┐      ┌──────────────────────────────┐
│ logs/bedrock/invocations/  │      │ reports/                     │
│                            │      │  bedrock-invocation-         │
│ <timestamp>-model.json     │      │  summary.json                │
│  - requestId               │      │                              │
│  - token usage             │      │  - totalInvocations          │
│  - cost                    │      │  - totalCost                 │
│  - latency                 │      │  - successRate               │
└────────────────────────────┘      └──────────────────────────────┘
                    │                              │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│            collect-bedrock-evidence.js                               │
│                                                                       │
│  1. AWS identity (STS)                                              │
│  2. List models (Bedrock)                                           │
│  3. List inference profiles                                         │
│  4. Aggregate invocation logs                                       │
│  5. Validate evidence                                               │
│  6. Generate comprehensive report                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│             reports/bedrock-evidence-complete.json                   │
│                                                                       │
│  {                                                                   │
│    "identity": { ... },                                             │
│    "models": [ ... ],                                               │
│    "invocations": [ ... ],                                          │
│    "validation": {                                                  │
│      "isValid": true,                                               │
│      "hasRequestIds": true,                                         │
│      "hasPlaceholders": false                                       │
│    }                                                                │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## CI/CD Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│              GitHub Actions Trigger                                  │
│     (push, PR, or manual workflow dispatch)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│      .github/workflows/bedrock-real-validation.yml                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │    Setup     │ │  Identity    │ │   Models     │
        │   - Node.js  │ │  - STS call  │ │  - List API  │
        │   - Deps     │ │  - Verify    │ │  - Anthropic │
        └──────────────┘ └──────────────┘ └──────────────┘
                  │               │               │
                  └───────────────┼───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │     Live Validation           │
                  │  - Strict mode enabled        │
                  │  - Both models tested         │
                  │  - Logs generated             │
                  └───────────────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  Evidence    │ │  CloudWatch  │ │   Artifacts  │
        │  Collection  │ │   Metrics    │ │    Upload    │
        └──────────────┘ └──────────────┘ └──────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │   Validation Summary          │
                  │  - PR comment                 │
                  │  - Job summary                │
                  │  - Exit code (0/1)            │
                  └───────────────────────────────┘
```

## Model Switching Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    User Command                                      │
│              /use claude-opus-4-1                                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│            bedrock-model-switcher.js                                 │
│                                                                       │
│  1. Validate model key                                              │
│  2. Check provider health                                           │
│  3. Call switchProvider()                                           │
│  4. Generate confirmation                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│          LLMProviderManager.switchProvider()                         │
│                                                                       │
│  1. Verify provider available                                       │
│  2. Check circuit breaker                                           │
│  3. Update currentProvider                                          │
│  4. Set model on provider                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Response                                          │
│                                                                       │
│  ✅ Switched to Claude Opus 4.1                                     │
│  - Model ID: anthropic.claude-opus-4-1-20250805-v1:0               │
│  - Region: us-east-1                                                │
│  - Capabilities: reasoning, complex-analysis, coding                │
│  - Pricing: Input $0.015/1K, Output $0.075/1K                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Metrics Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              BedrockProvider.generateCompletion()                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Invoke     │ │   Calculate  │ │    Emit      │
        │   Model      │ │     Cost     │ │  Telemetry   │
        └──────────────┘ └──────────────┘ └──────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              setupMetricsIntegration()                               │
│         (Listens for telemetry events)                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Record     │ │   Record     │ │   Record     │
        │   Tokens     │ │    Cost      │ │   Latency    │
        │              │ │              │ │              │
        │ ai-metrics   │ │ ai-metrics   │ │ ai-metrics   │
        └──────────────┘ └──────────────┘ └──────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Prometheus Metrics                                   │
│                                                                       │
│  echotune_ai_tokens_used_total{provider="bedrock",model="..."}      │
│  echotune_ai_cost_usd_total{provider="bedrock",model="..."}        │
│  echotune_ai_request_duration_seconds{provider="bedrock",...}       │
└─────────────────────────────────────────────────────────────────────┘
```

## Cost Tracking Data Flow

```
Invocation → Token Count → Pricing Matrix → Cost Calculation → Storage
     │            │              │                 │               │
     │            │              │                 │               ▼
     │            │              │                 │    ┌──────────────────┐
     │            │              │                 │    │  Invocation Log  │
     │            │              │                 │    │   - cost field   │
     │            │              │                 │    │   - breakdown    │
     │            │              │                 │    └──────────────────┘
     │            │              │                 │
     │            │              │                 ▼
     │            │              │      ┌──────────────────┐
     │            │              │      │  Summary Report  │
     │            │              │      │   - totalCost    │
     │            │              │      └──────────────────┘
     │            │              │
     │            │              ▼
     │            │    ┌──────────────────┐
     │            │    │  Pricing Matrix  │
     │            │    │  Sonnet 4.5:     │
     │            │    │   $0.003/1K in   │
     │            │    │   $0.015/1K out  │
     │            │    │  Opus 4.1:       │
     │            │    │   $0.015/1K in   │
     │            │    │   $0.075/1K out  │
     │            │    └──────────────────┘
     │            │
     │            ▼
     │  ┌──────────────────┐
     │  │   Token Usage    │
     │  │   - input: 45    │
     │  │   - output: 128  │
     │  └──────────────────┘
     │
     ▼
┌──────────────────┐
│  API Response    │
│  - text          │
│  - usage         │
│  - requestId     │
└──────────────────┘
```

---

**Generated:** January 15, 2025  
**Status:** Production Ready  
**Version:** 1.0.0
