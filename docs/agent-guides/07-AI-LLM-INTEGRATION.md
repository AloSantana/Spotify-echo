# 07 — AI & LLM Integration

> **Quick Reference:** Provider architecture, circuit breaker state machine, fallback chain
> implementation, how to add a new provider, prompt engineering patterns, conversation
> memory management, streaming responses, telemetry, and the mock provider.

---

## 1. Provider Architecture Overview

All LLM providers implement a common `BaseProvider` interface. The `LLMProviderManager`
manages a pool of providers, health-monitors them, and routes requests through the
circuit-breaker fallback chain.

```
User Request
    │
    ▼
EchoTuneChatbot.processMessage()
    │
    ▼
LLMProviderManager.generate(prompt)
    │
    ├── circuitBreaker["gemini"].isAllowed() == true  →  GeminiProvider.generate()
    │       ├── SUCCESS  →  return response
    │       └── FAILURE  →  record failure, try next
    │
    ├── circuitBreaker["openai"].isAllowed() == true  →  OpenAIProvider.generate()
    │       └── SUCCESS  →  return response
    │
    └── circuitBreaker["mock"].isAllowed() == true   →  MockProvider.generate()
            └── ALWAYS SUCCESS
```

---

## 2. Base Provider Interface

Every provider must extend `BaseProvider` and implement these methods:

```javascript
// src/chat/llm-providers/base-provider.js
class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this._available = false;
  }

  /**
   * Initialize the provider (test API key, warm up client)
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  /**
   * Check if provider is currently available
   * @returns {boolean}
   */
  isAvailable() {
    return this._available;
  }

  /**
   * Generate a response for a given prompt
   * @param {string} prompt - Full assembled prompt string
   * @param {Object} options - { maxTokens, temperature, stream }
   * @returns {Promise<string>} - Generated text response
   */
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented');
  }

  /**
   * Generate a streaming response (optional)
   * @param {string} prompt
   * @param {Function} onChunk - Callback called with each text chunk
   * @returns {Promise<void>}
   */
  async generateStream(prompt, onChunk, options = {}) {
    // Default: fall back to non-streaming
    const response = await this.generate(prompt, options);
    onChunk(response);
  }

  /**
   * Get provider metadata
   * @returns {Object} - { name, models, maxTokens }
   */
  getMetadata() {
    return {
      name: this.name,
      models: [],
      maxTokens: 4096,
    };
  }
}
```

---

## 3. Provider Implementations

### 3.1 Gemini Provider
```javascript
// src/chat/llm-providers/gemini-provider.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'gemini';
    this.model = config.model || 'gemini-1.5-flash';
  }

  async initialize() {
    if (!this.config.apiKey) throw new Error('GEMINI_API_KEY not set');
    this.client = new GoogleGenerativeAI(this.config.apiKey);
    this.genModel = this.client.getGenerativeModel({ model: this.model });
    this._available = true;
  }

  async generate(prompt, options = {}) {
    const result = await this.genModel.generateContent(prompt);
    return result.response.text();
  }

  async generateStream(prompt, onChunk) {
    const result = await this.genModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) onChunk(text);
    }
  }
}
```

### 3.2 OpenAI Provider
```javascript
// src/chat/llm-providers/openai-provider.js
const OpenAI = require('openai');

class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'openai';
    this.model = config.model || 'gpt-3.5-turbo';
  }

  async initialize() {
    if (!this.config.apiKey) throw new Error('OPENAI_API_KEY not set');
    this.client = new OpenAI({ apiKey: this.config.apiKey });
    this._available = true;
  }

  async generate(prompt, options = {}) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
    });
    return response.choices[0].message.content;
  }

  async generateStream(prompt, onChunk, options = {}) {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: options.maxTokens || 1024,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) onChunk(text);
    }
  }
}
```

### 3.3 Mock Provider (Always Available)
```javascript
// src/chat/llm-providers/mock-provider.js
class MockLLMProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'mock';
    this._available = true;
  }

  async initialize() {
    this._available = true;  // Always available
  }

  async generate(prompt, _options = {}) {
    // Deterministic music-aware responses based on keyword detection
    if (/play|queue|spotify/i.test(prompt)) {
      return "I'd be happy to help with that! In demo mode, I can suggest music but can't control Spotify directly. Try connecting your Spotify account for full control. 🎵";
    }
    if (/recommend|suggest|discover/i.test(prompt)) {
      return "Here are some recommendations based on popular tracks: 'Blinding Lights' by The Weeknd (energy: 0.8), 'Levitating' by Dua Lipa (energy: 0.7). Connect Spotify for personalized picks!";
    }
    return "Hello! I'm EchoTune AI in demo mode. Ask me about music, or connect your Spotify account for full features. 🎶";
  }
}
```

---

## 4. Circuit Breaker — State Machine

Each provider has an independent `CircuitBreaker` instance. States and transitions:

```
                   5 failures in 60s
    ┌────────────────────────────────────────────────────┐
    │                                                    ▼
 CLOSED                                               OPEN
(allow all)                                    (block all)
    ▲                                                    │
    │ 3 consecutive successes                            │ 30s timeout
    │                                                    ▼
    └──────────────────────────────────────────────── HALF_OPEN
                                                  (allow 3 probe requests)
```

```javascript
// src/chat/circuit-breaker.js (key method)
isAllowed() {
  const state = this.getState(); // may auto-transition OPEN → HALF_OPEN

  if (state === 'CLOSED') return true;
  if (state === 'OPEN') return false;

  // HALF_OPEN: allow up to halfOpenMaxRequests (default: 3)
  if (this.halfOpenRequests < this.config.halfOpenMaxRequests) {
    this.halfOpenRequests++;
    return true;
  }
  return false;
}

recordSuccess() {
  if (this.state === 'HALF_OPEN') {
    this.successes++;
    if (this.successes >= this.config.successThreshold) {
      this.transitionTo('CLOSED');  // Provider recovered
    }
  }
  // In CLOSED: reset failure count
  this.failures = this.failures.filter(f => Date.now() - f < this.config.monitoringWindow);
}

recordFailure() {
  this.failures.push(Date.now());
  // Prune old failures outside monitoring window
  this.failures = this.failures.filter(f => Date.now() - f < this.config.monitoringWindow);

  if (this.state === 'HALF_OPEN') {
    this.transitionTo('OPEN');  // Probe failed → back to OPEN
    return;
  }

  if (this.failures.length >= this.config.failureThreshold) {
    this.transitionTo('OPEN');
  }
}
```

---

## 5. Fallback Chain Logic

```javascript
// src/chat/llm-provider-manager.js
class LLMProviderManager {
  constructor(providers, circuitBreakers) {
    this.providers = providers;       // Map<name, BaseProvider>
    this.breakers = circuitBreakers;  // Map<name, CircuitBreaker>

    // Ordered fallback chain (configured or default)
    this.fallbackChain = process.env.LLM_FALLBACK_CHAIN
      ? process.env.LLM_FALLBACK_CHAIN.split(',').map(s => s.trim())
      : ['bedrock', 'gemini', 'perplexity', 'grok4', 'openai', 'openrouter', 'mock'];
  }

  async generate(prompt, options = {}) {
    const errors = [];

    for (const providerName of this.fallbackChain) {
      const provider = this.providers.get(providerName);
      const breaker = this.breakers.get(providerName);

      if (!provider || !provider.isAvailable()) continue;
      if (breaker && !breaker.isAllowed()) {
        console.log(`⚡ Circuit OPEN for ${providerName}, skipping`);
        continue;
      }

      const startTime = Date.now();
      try {
        const response = await provider.generate(prompt, options);
        breaker?.recordSuccess();
        this.recordTelemetry(providerName, Date.now() - startTime, true);
        return { response, provider: providerName, latencyMs: Date.now() - startTime };
      } catch (error) {
        console.error(`❌ Provider ${providerName} failed:`, error.message);
        breaker?.recordFailure();
        this.recordTelemetry(providerName, Date.now() - startTime, false, error.message);
        errors.push({ provider: providerName, error: error.message });
      }
    }

    throw new Error(`ALL_PROVIDERS_DOWN: ${errors.map(e => `${e.provider}: ${e.error}`).join('; ')}`);
  }
}
```

---

## 6. How to Add a New Provider

1. **Create the provider file:**

```javascript
// src/chat/llm-providers/my-provider.js
const BaseProvider = require('./base-provider');
const axios = require('axios');

class MyProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'my-provider';
    this.apiKey = config.apiKey;
    this.model = config.model || 'my-model-v1';
    this.baseUrl = 'https://api.myprovider.com/v1';
  }

  async initialize() {
    if (!this.apiKey) throw new Error('MY_PROVIDER_API_KEY not set');
    // Optional: ping endpoint to verify key
    this._available = true;
  }

  async generate(prompt, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 1024,
      },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    return response.data.choices[0].message.content;
  }
}

module.exports = MyProvider;
```

2. **Register in chatbot.js:**

```javascript
// src/chat/chatbot.js — in initializeProviders()
const MyProvider = require('./llm-providers/my-provider');

if (providerConfigs.myProvider?.apiKey) {
  const myProvider = new MyProvider(providerConfigs.myProvider);
  this.providers.set('my-provider', myProvider);
  hasConfiguredProvider = true;
}
```

3. **Add to config:**

```javascript
// src/api/routes/chat.js — chatbotConfig
const chatbotConfig = {
  llmProviders: {
    // ... existing providers ...
    myProvider: {
      apiKey: process.env.MY_PROVIDER_API_KEY,
      model: process.env.MY_PROVIDER_MODEL || 'my-model-v1',
    },
  },
};
```

4. **Add to fallback chain:**

```javascript
// src/chat/llm-provider-manager.js
const FALLBACK_ORDER = ['bedrock', 'gemini', 'my-provider', 'openai', 'openrouter', 'mock'];
```

5. **Add environment variable:**

```bash
# .env
MY_PROVIDER_API_KEY=your_key_here
MY_PROVIDER_MODEL=my-model-v1
```

---

## 7. Prompt Engineering for Music Context

The system prompt is assembled dynamically by `buildPrompt()` with user and playback context:

```javascript
// src/chat/context/buildPrompt.js
function buildPrompt(userMessage, context = {}) {
  const { userProfile, playbackState, conversationHistory, preferences } = context;

  const systemPrompt = `You are EchoTune AI, an intelligent music assistant integrated with Spotify.
Your personality: friendly, knowledgeable about music, concise, and action-oriented.

CURRENT USER CONTEXT:
- User: ${userProfile?.displayName || 'Music Lover'}
- Preferred genres: ${preferences?.favoriteGenres?.join(', ') || 'not specified'}
- Energy preference: ${preferences?.energyLevel ? `${Math.round(preferences.energyLevel * 100)}% energy` : 'flexible'}

CURRENT PLAYBACK STATE:
${playbackState?.isPlaying
  ? `- Now playing: "${playbackState.track?.name}" by ${playbackState.track?.artists?.[0]?.name}`
  : '- Nothing currently playing'
}
- Device: ${playbackState?.device?.name || 'unknown'}

CONVERSATION HISTORY (last ${Math.min(conversationHistory?.length || 0, 10)} messages):
${(conversationHistory || []).slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}

CAPABILITIES:
- You can control Spotify: play, pause, skip, previous, volume, shuffle, repeat, queue
- You can search for specific tracks, artists, or albums
- You can generate playlist recommendations based on mood/activity/genre
- You can answer questions about music, artists, and albums

RESPONSE GUIDELINES:
- If the user wants to play music, describe what you're playing and confirm the action
- Keep responses under 150 words unless explaining something complex
- Use music-appropriate emoji sparingly 🎵 🎸 🎹
- If you can't do something, suggest what you CAN do

User message: ${userMessage}`;

  return systemPrompt;
}
```

---

## 8. Conversation Memory Management

`ConversationManager` maintains a rolling window of conversation history per session:

```javascript
// src/chat/conversation-manager.js
class ConversationManager {
  constructor() {
    this.sessions = new Map();    // In-memory cache
    this.maxMessages = 20;        // Max messages per window
    this.sessionTimeout = 30 * 60 * 1000;  // 30 min inactivity
  }

  getContext(sessionId) {
    return this.sessions.get(sessionId) || {
      messages: [],
      startTime: Date.now(),
      lastActivity: Date.now(),
    };
  }

  addMessage(sessionId, role, content, metadata = {}) {
    const session = this.getContext(sessionId);
    session.messages.push({ role, content, timestamp: new Date(), metadata });
    session.lastActivity = Date.now();

    // Rolling window — keep only last maxMessages
    if (session.messages.length > this.maxMessages) {
      session.messages = session.messages.slice(-this.maxMessages);
    }

    this.sessions.set(sessionId, session);
  }

  // Persist session to MongoDB before eviction
  async persistSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const db = mongoManager.getCollection('echotune_chat_sessions');
    await db.updateOne(
      { sessionId },
      {
        $set: {
          messages: session.messages,
          lastActivity: new Date(session.lastActivity),
          messageCount: session.messages.length,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          sessionId,
          userId: new ObjectId(userId),
          startTime: new Date(session.startTime),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  // Restore session from MongoDB on cache miss
  async restoreSession(sessionId) {
    const db = mongoManager.getCollection('echotune_chat_sessions');
    const stored = await db.findOne({ sessionId });
    if (stored) {
      this.sessions.set(sessionId, {
        messages: stored.messages || [],
        startTime: stored.startTime.getTime(),
        lastActivity: stored.lastActivity.getTime(),
      });
    }
  }

  startPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActivity > this.sessionTimeout) {
          this.sessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}
```

---

## 9. Streaming Response Implementation

Streaming sends text chunks to the client as they're generated, reducing perceived latency.

**Server-side (Express route):**
```javascript
// POST /api/chat/stream
router.post('/stream', requireAuth, async (req, res) => {
  const { message, sessionId } = req.body;
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const chatbot = await initializeChatbot();
  const prompt = buildPrompt(message, await getContext(req.user.userId, sessionId));

  let fullResponse = '';
  
  try {
    await chatbot.generateStream(prompt, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
    });
    
    res.write(`data: ${JSON.stringify({ chunk: '', done: true, fullResponse })}\n\n`);
    res.end();
    
    // Persist completed message
    await conversationManager.addMessage(sessionId, 'assistant', fullResponse);
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
    res.end();
  }
});
```

**Client-side (React):**
```javascript
// src/frontend/components/EnhancedStreamingChatInterface.jsx
async function sendStreamingMessage(message) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, sessionId }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop(); // Incomplete line stays in buffer
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.chunk) {
          setCurrentResponse(prev => prev + data.chunk);
        }
        if (data.done) {
          finalizeMessage(data.fullResponse);
        }
      }
    }
  }
}
```

---

## 10. LLM Telemetry

```javascript
// src/chat/llm-telemetry.js
class LLMTelemetry {
  recordCall(provider, model, latencyMs, success, errorCode = null) {
    // Prometheus metrics
    llmRequestDuration.labels({ provider, model, success: String(success) }).observe(latencyMs / 1000);
    llmRequestCounter.labels({ provider, model, success: String(success) }).inc();

    // MongoDB analytics event
    analyticsEvents.insertOne({
      eventType: 'chat.message',
      metadata: { provider, model, responseMs: latencyMs, success, errorCode },
      timestamp: new Date(),
      createdAt: new Date(),
    });
  }
}

// Prometheus metric definitions
const llmRequestDuration = new promClient.Histogram({
  name: 'echotune_llm_request_duration_seconds',
  help: 'LLM request duration in seconds',
  labelNames: ['provider', 'model', 'success'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
```

---

## 11. Provider Key Pool (Multiple API Keys)

For high-volume deployments, rotate across multiple API keys to avoid per-key rate limits:

```javascript
// src/chat/utils/key-pool.js
class KeyPool {
  constructor(keys) {
    this.keys = keys.filter(Boolean);  // Remove empty strings
    this.currentIndex = 0;
  }

  getKey() {
    if (this.keys.length === 0) return null;
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }
}

// Usage: provide comma-separated keys in env var
// OPENAI_API_KEYS=sk-key1,sk-key2,sk-key3
const openaiKeyPool = new KeyPool(
  (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || '').split(',')
);
```

---

## 12. Provider Configuration File

```json
// src/config/llm-providers.json
{
  "providers": {
    "gemini": {
      "name": "Google Gemini",
      "models": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
      "defaultModel": "gemini-1.5-flash",
      "maxTokens": 8192,
      "supportsStreaming": true,
      "envKey": "GEMINI_API_KEY"
    },
    "openai": {
      "name": "OpenAI",
      "models": ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4o"],
      "defaultModel": "gpt-3.5-turbo",
      "maxTokens": 4096,
      "supportsStreaming": true,
      "envKey": "OPENAI_API_KEY"
    },
    "mock": {
      "name": "Demo Mode",
      "models": ["mock-v1"],
      "defaultModel": "mock-v1",
      "maxTokens": 1024,
      "supportsStreaming": true,
      "envKey": null,
      "alwaysAvailable": true
    }
  }
}
```

---

## Cross-References

- How chatbot integrates with Spotify commands → `06-SPOTIFY-INTEGRATION.md`
- API endpoint for chat → `05-API-REFERENCE.md`
- Conversation stored in MongoDB → `03-DATA-MODELS.md` (chat_sessions)
- Frontend chat components → `09-FRONTEND-GUIDE.md`
