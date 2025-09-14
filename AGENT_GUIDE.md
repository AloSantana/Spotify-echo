# Agent Development Guide

## Overview
This guide provides comprehensive instructions for coding agents (GitHub Copilot, Claude, GPT, etc.) working on EchoTune AI. It establishes clear boundaries between product code and automation infrastructure, ensuring agents focus on the right areas while preserving system integrity.

## 🎯 Agent Focus Areas

### ✅ PRIMARY FOCUS (High Agent Value)
These areas benefit most from agent assistance and are safe for modification:

#### Core Product Logic (`src/orchestration/`, `src/recommendation/`, `src/chat/`, `src/spotify/`)
- **ChatRecommendationOrchestrator**: Core business logic orchestration
- **Recommendation Strategies**: Algorithm implementation and optimization
- **Chat Context Pipeline**: Conversation management and context assembly
- **Spotify Integration**: API wrapper and data transformation
- **Database Models**: Schema definitions and query optimization

#### Data & Analytics (`src/database/`, `src/cache/`)
- **MongoDB Collections**: Schema design and indexing
- **Caching Strategies**: Redis implementation and TTL policies
- **Performance Optimization**: Query tuning and data structure improvements
- **Analytics Models**: User behavior analysis and metrics

### ⚠️ SECONDARY FOCUS (Moderate Agent Value)
These areas can benefit from agent help with proper review:

#### API & Presentation (`src/api/`, `src/frontend/`)
- **REST API Endpoints**: Route handlers and request validation
- **Frontend Components**: React components and UI logic
- **Authentication**: OAuth flows and session management
- **Error Handling**: User-facing error responses

#### Testing & Quality (`tests/`)
- **Unit Tests**: Test cases for core business logic
- **Integration Tests**: End-to-end workflow testing
- **Performance Tests**: Load testing and benchmarking
- **Test Utilities**: Helper functions and mock implementations

### 🚫 AVOID MODIFICATION (Low Agent Value, High Risk)
These areas should generally be left unchanged by agents:

#### Enterprise Infrastructure (`src/infra/`, `mcp-server/`, `.github/workflows/`)
- **Service Mesh**: Complex networking and service discovery
- **Event Bus**: Message queue and event processing
- **Observability**: Monitoring, logging, and alerting systems
- **CI/CD Pipelines**: Deployment and automation workflows
- **MCP Orchestrators**: Model Context Protocol automation

#### Configuration & Secrets (`.env`, `config/`, `nginx/`)
- **Environment Variables**: Production configuration
- **Security Settings**: Authentication and authorization config
- **Infrastructure as Code**: Deployment scripts and manifests
- **Certificates**: SSL/TLS and security credentials

## 🏗️ Architecture Understanding

### System Planes
The codebase is organized into distinct planes, each with different agent interaction guidelines:

```
┌─────────────────┬──────────────────┬─────────────────┐
│ PRODUCT PLANE   │ INTELLIGENCE     │ PLATFORM PLANE  │
│ (Primary Focus) │ PLANE            │ (Secondary)     │
├─────────────────┼──────────────────┼─────────────────┤
│ • Orchestration │ • Recommendation │ • Database      │
│ • Chat System   │ • ML Algorithms  │ • Caching       │
│ • Spotify API   │ • AI Providers   │ • Auth & API    │
│ • User Context  │ • Embeddings     │ • Frontend      │
└─────────────────┴──────────────────┴─────────────────┘
┌─────────────────────────────────────────────────────┐
│ AUTOMATION PLANE (Avoid Modification)              │
│ • Infrastructure • CI/CD • MCP Servers • Monitoring│
└─────────────────────────────────────────────────────┘
```

### Key Components to Understand

#### 1. ChatRecommendationOrchestrator
```javascript
// Central integration point - safe to modify
const orchestrator = new ChatRecommendationOrchestrator();

// Core methods agents should understand:
await orchestrator.getUserContext(userId);        // User profiling
await orchestrator.generateRecommendations(...);  // Music recommendations  
await orchestrator.buildChatContext(...);         // LLM context assembly
await orchestrator.ingestFeedback(...);           // User feedback processing
```

#### 2. Recommendation Strategies
```javascript
// Strategy pattern - safe to add new strategies
class NewMusicStrategy {
  async run({ userId, context, limits }) {
    // Agent can implement new recommendation algorithms here
    return { candidates: [...], diagnostics: {...} };
  }
}
```

#### 3. Database Layer
```javascript
// MongoDB operations - safe to optimize queries
await db.collection('listening_history').find({
  userId: ObjectId(userId),
  playedAt: { $gte: cutoffDate }
}).sort({ playedAt: -1 });
```

## 📋 Agent Development Workflow

### 1. Before Making Changes
```bash
# Validate current structure
npm run validate:structure

# Check project health
npm run validate:structure:health

# Review architecture map
cat docs/ARCHITECTURE_MAP.json | jq '.coding_agent_guidelines'
```

### 2. Safe Development Practices

#### ✅ Do These Things:
- **Read existing code** in the target area before modifying
- **Follow established patterns** (strategy pattern, orchestrator pattern)
- **Add comprehensive tests** for new functionality
- **Update documentation** when changing public interfaces
- **Use TypeScript-style JSDoc** comments for clarity
- **Implement proper error handling** with fallbacks
- **Follow the existing code style** and conventions

#### ❌ Don't Do These Things:
- **Modify enterprise infrastructure** without explicit approval
- **Change MCP server configurations** or orchestration logic
- **Alter CI/CD pipelines** or deployment scripts
- **Remove or modify existing tests** without understanding impact
- **Hardcode secrets or configuration** values
- **Break existing public interfaces** without migration strategy

### 3. Code Modification Patterns

#### Adding New Recommendation Strategy:
```javascript
// 1. Create new strategy file in src/recommendation/strategies/
class MyNewStrategy {
  constructor(options = {}) {
    this.name = 'my-new-strategy';
    // Initialize strategy
  }
  
  async run(params) {
    // Implement recommendation logic
    return { candidates: [...], diagnostics: {...} };
  }
}

// 2. Register in strategies/index.js
this.registerStrategy('my-new-strategy', new MyNewStrategy());

// 3. Add tests in tests/recommendation/strategies/
describe('MyNewStrategy', () => {
  // Test implementation
});
```

#### Extending ChatRecommendationOrchestrator:
```javascript
// Add new method to orchestrator
async analyzeUserMood(userId, recentActivity) {
  // Implement mood analysis
  // This is safe because it's product logic
  return moodAnalysis;
}

// Update interface documentation in README.md
// Add unit tests for new functionality
```

#### Adding Database Indexes:
```javascript
// Modify scripts/apply-indexes.js
const INDEXES = [
  // Add new index definition
  {
    collection: 'user_moods',
    indexes: [
      { keys: { userId: 1, analyzedAt: -1 }, options: { name: 'idx_user_moods_time' } }
    ]
  }
];
```

### 4. Testing Guidelines

#### Required Tests for Agent Changes:
```javascript
// Unit tests for business logic
describe('ChatRecommendationOrchestrator', () => {
  test('should generate recommendations successfully', async () => {
    // Test core functionality
  });
});

// Integration tests for workflows  
describe('Recommendation Workflow', () => {
  test('should work end-to-end', async () => {
    // Test complete user journey
  });
});

// Performance tests for new algorithms
describe('Strategy Performance', () => {
  test('should complete within acceptable time', async () => {
    // Test performance requirements
  });
});
```

### 5. Documentation Updates

#### When to Update Documentation:
- **Adding new public interfaces** → Update README.md files
- **Changing strategy interfaces** → Update strategy documentation
- **Adding new database collections** → Update DATA_MODEL.md
- **Modifying API endpoints** → Update API documentation
- **Adding new configuration options** → Update configuration guides

## 🔧 Development Tools

### Essential Commands for Agents:
```bash
# Structure validation
npm run validate:structure          # Check folder structure
npm run validate:structure:fix      # Auto-fix structure issues

# Database management
npm run apply:indexes              # Apply database indexes
npm run apply:indexes:dry-run      # Preview index changes

# Evaluation and testing
npm run eval:recs                  # Evaluate recommendation strategies
npm test                          # Run test suite
npm run test:integration          # Integration tests

# Code quality
npm run lint                      # Lint code
npm run lint:fix                  # Auto-fix lint issues
npm run format                    # Format code
```

### Useful Development Scripts:
```bash
# Test specific components
node -e "const { ChatRecommendationOrchestrator } = require('./src/orchestration/ChatRecommendationOrchestrator'); console.log('✅ Orchestrator loads successfully');"

# Evaluate recommendation strategies
npm run eval:recs -- --strategy collaborative --verbose

# Check database schema
npm run apply:indexes -- --analyze

# Monitor structure health
npm run validate:structure:health
```

## 🚨 Warning Signs to Avoid

### 🔴 Stop Immediately If:
- Modifying files in `mcp-server/enhanced-*`
- Changing `.github/workflows/` files
- Altering `src/infra/` components
- Modifying production environment configurations
- Removing existing error handling or fallback mechanisms

### 🟡 Proceed with Caution If:
- Adding new external dependencies
- Changing database schema significantly
- Modifying authentication or security logic
- Altering API response formats
- Changing existing public interfaces

### 🟢 Safe to Proceed:
- Adding new recommendation algorithms
- Improving existing business logic
- Adding comprehensive tests
- Updating documentation
- Optimizing database queries
- Enhancing error messages

## 📚 Learning Resources

### Key Files to Study:
1. **docs/ARCHITECTURE_MAP.json** - System organization and boundaries
2. **src/orchestration/ChatRecommendationOrchestrator.js** - Core integration patterns
3. **src/recommendation/strategies/** - Strategy pattern implementation
4. **docs/DATA_MODEL.md** - Database design and optimization
5. **tests/orchestration/** - Testing patterns and examples

### Code Patterns to Follow:
1. **Strategy Pattern** - For recommendation algorithms
2. **Orchestrator Pattern** - For service integration
3. **Repository Pattern** - For database access
4. **Factory Pattern** - For component creation
5. **Fallback Pattern** - For error handling

## 🎯 Success Metrics for Agent Contributions

### Quality Indicators:
- ✅ All tests pass after changes
- ✅ Code follows established patterns
- ✅ Documentation is updated appropriately
- ✅ Error handling is comprehensive
- ✅ Performance requirements are met

### Performance Benchmarks:
- **Orchestrator Latency**: < 900ms P95 for chat-to-recommendations
- **Cache Hit Rate**: > 40% for repeated user interactions
- **Test Coverage**: > 60% for new components
- **Documentation Coverage**: 100% for public interfaces

### Integration Checklist:
- [ ] Structure validation passes (`npm run validate:structure`)
- [ ] All tests pass (`npm test`)
- [ ] Code is properly documented
- [ ] Error handling is implemented
- [ ] Performance is within acceptable limits
- [ ] Public interfaces are stable

## 🤝 Collaboration Guidelines

### When to Seek Human Review:
- Changes affecting multiple system planes
- New external integrations or dependencies
- Significant algorithm or performance changes
- Security-related modifications
- Breaking changes to existing interfaces

### When Agent Autonomy is Appropriate:
- Adding new recommendation strategies
- Improving existing business logic
- Adding comprehensive test coverage
- Optimizing database queries
- Enhancing error messages and logging

---

**Remember**: The goal is to enhance EchoTune AI's core music recommendation and discovery capabilities while preserving the stability and integrity of the enterprise infrastructure. Focus on product value and user experience improvements.