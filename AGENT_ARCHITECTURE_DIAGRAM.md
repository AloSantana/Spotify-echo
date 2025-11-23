# GitHub Coding Agent - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Reliable Installation Agent                      │
│                  (scripts/reliable-install-agent.js)                │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │   STEP 1:    │───▶│   STEP 2:    │───▶│   STEP 3:    │        │
│  │   Install    │    │   Database   │    │   Start App  │        │
│  │Dependencies  │    │     Init     │    │              │        │
│  └──────────────┘    └──────────────┘    └──────────────┘        │
│         │                    │                    │                │
│         └────────────────────┴────────────────────┘                │
│                            │                                       │
│                            ▼                                       │
│                     On Error/Failure                              │
│                            │                                       │
└────────────────────────────┼───────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   Error     │  │    Fix      │  │   Memory    │
    │  Analyzer   │  │ Strategies  │  │   Store     │
    │             │  │             │  │             │
    │ - Detect    │  │ - Apply     │  │ - Record    │
    │ - Classify  │  │ - Validate  │  │ - Learn     │
    │ - Suggest   │  │ - Report    │  │ - Analyze   │
    └─────────────┘  └─────────────┘  └─────────────┘
```

## Component Details

### 1. Main Agent Orchestrator
```
┌────────────────────────────────────────────────────┐
│         Reliable Installation Agent                │
├────────────────────────────────────────────────────┤
│                                                    │
│  Initialization                                    │
│  ├─ Check Node.js version (>= 18.0.0)            │
│  ├─ Load configuration & options                  │
│  └─ Initialize memory store                       │
│                                                    │
│  Step 1: Install Dependencies                     │
│  ├─ npm ci (if package-lock.json exists)         │
│  ├─ npm install (otherwise)                       │
│  └─ Retry up to N times on failure               │
│                                                    │
│  Step 2: Initialize Database                      │
│  ├─ Check POSTGRES_URL in .env                   │
│  ├─ npm run db:generate                           │
│  ├─ npm run db:push                               │
│  └─ Retry up to N times on failure               │
│                                                    │
│  Step 3: Start Application                        │
│  ├─ npm start (spawn process)                     │
│  ├─ Monitor for 10 seconds                        │
│  ├─ Detect crashes                                │
│  └─ Retry up to N times on failure               │
│                                                    │
│  Finalization                                      │
│  ├─ Generate final report                         │
│  ├─ Update memory statistics                      │
│  └─ Exit with appropriate code                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 2. Error Analyzer Flow
```
┌─────────────┐
│ Error       │
│ Output      │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Pattern Matching                    │
│  ├─ Node version                     │
│  ├─ npm install errors               │
│  ├─ Prisma client errors             │
│  ├─ Database connection errors       │
│  ├─ Environment variable errors      │
│  ├─ Module not found errors          │
│  ├─ OpenTelemetry errors             │
│  ├─ Port in use errors               │
│  └─ Runtime errors                   │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Analysis Result                     │
│  ├─ Category                         │
│  ├─ Severity (critical/high/med/low) │
│  ├─ Fixable? (yes/no)                │
│  ├─ Error snippet                    │
│  └─ Suggested fixes                  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Store in Memory                     │
│  ├─ Error pattern                    │
│  ├─ Timestamp                        │
│  ├─ Context                          │
│  └─ Command that failed              │
└──────────────────────────────────────┘
```

### 3. Fix Strategy Selection
```
┌──────────────┐
│ Error        │
│ Category     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Match to Applicable Strategies             │
│                                             │
│  env_missing ────────┬─ create_env_file    │
│                      │                      │
│  prisma_client ──────┼─ generate_prisma    │
│                      │                      │
│  prisma_migration ───┼─ init_database      │
│                      │                      │
│  npm_install ────────┼─ clean_install      │
│                      │                      │
│  module_not_found ───┼─ clean_install      │
│                      │                      │
│  opentelemetry ──────┼─ disable_tracing    │
│                      │                      │
│  port_in_use ────────┴─ kill_port          │
│                                             │
└────────────────────┬────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Execute Strategies    │
        │  (one at a time)       │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Record Results        │
        │  ├─ Strategy name      │
        │  ├─ Success/failure    │
        │  ├─ Message            │
        │  └─ Duration           │
        └────────────────────────┘
```

### 4. Memory Store Structure
```
.agent-memory/
├── error-patterns.json
│   ├─ id (unique)
│   ├─ timestamp
│   ├─ category
│   ├─ severity
│   ├─ errorSnippet
│   ├─ command
│   └─ context
│
├── fix-history.json
│   ├─ id (unique)
│   ├─ timestamp
│   ├─ errorId (reference)
│   ├─ errorCategory
│   ├─ strategy
│   ├─ success (boolean)
│   ├─ message
│   ├─ duration
│   └─ context
│
└── metadata.json
    ├─ lastRun
    ├─ lastResult
    ├─ totalRuns
    └─ lastUpdated

Analytics:
├─ Total errors by category
├─ Success rates by strategy
├─ Most common error
└─ Most successful strategy
```

## Workflow Sequence

### Successful Run
```
User: npm run setup
  │
  ▼
Agent: Check Node version ✅
  │
  ▼
Agent: npm ci ✅
  │
  ▼
Agent: Check POSTGRES_URL ⚠️  (empty)
  │
  ▼
Agent: Apply create_env_file strategy ✅
  │
  ▼
Agent: npm run db:init ✅
  │
  ▼
Agent: npm start (10s validation) ✅
  │
  ▼
Agent: Final Report
  ├─ Install: ✅ Success (1 attempt)
  ├─ Database: ✅ Success (1 attempt)
  └─ Start: ✅ Success (1 attempt)
  │
  ▼
Exit: 0 (success)
```

### Failed Run with Retry
```
User: npm run setup
  │
  ▼
Agent: Check Node version ✅
  │
  ▼
Agent: npm ci ✅
  │
  ▼
Agent: npm run db:init ❌
  │
  ▼
Analyzer: Category = prisma_client
Analyzer: Fixable = yes
  │
  ▼
Strategy: generate_prisma ✅
Memory: Store error + fix
  │
  ▼
Agent: npm run db:init (retry 2) ✅
  │
  ▼
Agent: npm start (10s validation) ✅
  │
  ▼
Agent: Final Report
  ├─ Install: ✅ Success (1 attempt)
  ├─ Database: ✅ Success (2 attempts)
  └─ Start: ✅ Success (1 attempt)
  │
  ▼
Exit: 0 (success)
```

### Unrecoverable Failure
```
User: npm run setup
  │
  ▼
Agent: Check Node version ✅
  │
  ▼
Agent: npm ci ✅
  │
  ▼
Agent: npm run db:init ❌
  │
  ▼
Analyzer: Category = database_connection
Analyzer: Fixable = no
  │
  ▼
Agent: npm run db:init (retry 2) ❌
Agent: npm run db:init (retry 3) ❌
  │
  ▼
Agent: Final Report
  ├─ Install: ✅ Success (1 attempt)
  ├─ Database: ❌ Failed (3 attempts)
  └─ Start: ⏭️  Skipped
  │
  ├─ Reason: Database connection refused
  ├─ Fix: Ensure PostgreSQL is running
  └─ Command: docker run --name postgres ...
  │
  ▼
Exit: 1 (failure)
```

## Integration Points

### npm Scripts
```
package.json
  └─ scripts
     ├─ setup ────────────▶ reliable-install-agent.js
     ├─ setup:ci ─────────▶ reliable-install-agent.js --skip-start
     ├─ setup:quick ──────▶ reliable-install-agent.js --skip-db
     └─ agent:memory ─────▶ memory-store.js report
```

### CI/CD Integration
```
GitHub Actions
  └─ job: setup
     └─ run: npm run setup:ci
         │
         ├─ Set environment variables
         ├─ Run agent (skip start)
         └─ Validate success
```

### Docker Integration
```
Dockerfile
  └─ RUN npm run setup:ci
     │
     ├─ Install dependencies
     ├─ Initialize database
     └─ Skip start (handled by CMD)
```

## Error Pattern Examples

### Pattern 1: Prisma Client Not Generated
```
Error: @prisma/client did not initialize yet
  │
  ▼
Analyzer: prisma_client (critical, fixable)
  │
  ▼
Strategy: generate_prisma
  │
  └─ Execute: npm run db:generate
```

### Pattern 2: Empty POSTGRES_URL
```
Error: Missing required environment variable: POSTGRES_URL
  │
  ▼
Analyzer: env_missing (high, fixable)
  │
  ▼
Strategy: create_env_file
  │
  ├─ Detect: POSTGRES_URL= (empty)
  └─ Fix: POSTGRES_URL=postgresql://...
```

### Pattern 3: Port Already in Use
```
Error: EADDRINUSE :::3000
  │
  ▼
Analyzer: port_in_use (medium, fixable)
  │
  ▼
Strategy: kill_port
  │
  └─ Execute: lsof -ti:3000 | xargs kill -9
```

## Memory Learning Loop

```
Run 1:
  Error: prisma_client
  Fix: generate_prisma ❌ (failed)
  Store: Error + Failed Fix

Run 2:
  Error: prisma_client
  Query: Similar past errors (1 found)
  Fix: generate_prisma ✅ (succeeded)
  Store: Error + Successful Fix

Run 3:
  Error: prisma_client
  Query: Similar past errors (2 found)
  Analysis: 50% success rate for generate_prisma
  Fix: generate_prisma ✅ (succeeded)
  Store: Error + Successful Fix
  Update: 66% success rate

Future Runs:
  Query memory for similar errors
  Prioritize strategies with high success rates
  Learn from past failures
```

## CLI Usage Matrix

| Command | Install | Database | Start | Use Case |
|---------|---------|----------|-------|----------|
| `npm run setup` | ✅ | ✅ | ✅ | Full setup |
| `npm run setup:ci` | ✅ | ✅ | ❌ | CI/CD |
| `npm run setup:quick` | ✅ | ❌ | ✅ | Dev (DB ready) |
| `--skip-install` | ❌ | ✅ | ✅ | Dependencies OK |
| `--skip-db` | ✅ | ❌ | ✅ | Database OK |
| `--skip-start` | ✅ | ✅ | ❌ | Build only |
| `--max-retries 5` | 5× | 5× | 5× | More attempts |
| `--verbose` | 📝 | 📝 | 📝 | Debug logs |

---

**Architecture Version**: 1.0.0
**Last Updated**: November 23, 2025
**Status**: ✅ Production Ready
