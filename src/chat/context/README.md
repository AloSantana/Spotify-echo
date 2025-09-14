# Chat Context Layer

## Purpose
Dynamic context assembly pipeline for LLM interactions. Assembles user profiles, conversation history, and music context with intelligent token budgeting and fallback mechanisms.

## Public Interfaces

### ContextAssembler
Assembles comprehensive user context from multiple data sources:

```javascript
const { ContextAssembler } = require('./assembleUserProfile');

const assembler = new ContextAssembler();
const context = await assembler.assemble(userId, {
  includeHistory: true,
  maxHistoryDays: 7,
  includePreferences: true,
  includeRecentActivity: true
});
```

### PromptBuilder  
Builds optimized prompts with token budgeting:

```javascript
const { PromptBuilder } = require('./buildPrompt');

const builder = new PromptBuilder();
const prompt = await builder.build(userContext, query, {
  maxTokens: 3000,
  template: 'music-recommendation',
  strategy: 'conversation-first'
});
```

## Architecture

The chat context pipeline provides intelligent context assembly for conversational music discovery, ensuring optimal token usage while maintaining conversation quality and personalization.

## Files

- `assembleUserProfile.js` - User profile and listening history assembly
- `summarizeRecentSessions.js` - Conversation history summarization
- `extractPreferenceVectors.js` - Music preference quantification
- `buildPrompt.js` - Optimized prompt construction with token budgeting
- `tokenBudgeting.js` - Token budget management and optimization utilities