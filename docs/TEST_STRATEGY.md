# Test Strategy and Framework

This document outlines the comprehensive testing strategy for EchoTune AI, including test taxonomy, layer purposes, and guidelines for extending the test suite.

## Test Taxonomy

### Layer Structure

Our testing framework follows a layered approach with distinct purposes and scopes:

```
├── tests/unit/            # Isolated component testing
├── tests/integration/     # Component interaction testing  
├── tests/e2e/            # End-to-end user workflow testing
├── tests/visual/         # UI regression and visual validation
└── tests/performance/    # Performance and load testing
```

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual functions, classes, and modules in isolation.

**Characteristics**:
- Fast execution (< 1ms per test)
- No external dependencies
- Mock all external services
- High code coverage target (>85%)

**When to Add**:
- New utility functions
- Business logic functions
- Data transformation methods
- Algorithm implementations

**Example Structure**:
```javascript
// tests/unit/services/RecommendationEngine.test.js
describe('RecommendationEngine', () => {
  test('should calculate similarity scores correctly', () => {
    const engine = new RecommendationEngine();
    const result = engine.calculateSimilarity(trackA, trackB);
    expect(result).toBeBetween(0, 1);
  });
});
```

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test interactions between components, APIs, and external services.

**Characteristics**:
- Test component boundaries
- Use real databases (test instances)
- Mock external APIs only when necessary
- Medium execution time (< 5s per test)

**When to Add**:
- New API endpoints
- Database schema changes
- Service integrations
- Authentication flows

**Example Structure**:
```javascript
// tests/integration/api/chat.test.js
describe('Chat API Integration', () => {
  test('should process chat request and return recommendations', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Recommend workout music' });
    
    expect(response.status).toBe(200);
    expect(response.body.recommendations).toBeDefined();
  });
});
```

### 3. End-to-End Tests (`tests/e2e/`)

**Purpose**: Test complete user workflows from browser perspective.

**Characteristics**:
- Real browser interactions
- Full application stack
- User-centric scenarios
- Slower execution (30s-2min per test)

**When to Add**:
- New user features
- Critical user paths
- Cross-browser compatibility
- Authentication workflows

**Example Structure**:
```typescript
// tests/e2e/music-discovery.spec.ts
test('should discover music through chat interface', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('[data-testid="chat-input"]', 'Find me energetic workout music');
  await page.click('[data-testid="send-button"]');
  
  await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
});
```

### 4. Visual Tests (`tests/visual/`)

**Purpose**: Detect unintended UI changes and ensure visual consistency.

**Characteristics**:
- Screenshot comparison
- Multiple viewport sizes
- Baseline management
- Design regression detection

**When to Add**:
- New UI components
- Layout changes
- Theme updates
- Responsive design features

**Example Structure**:
```typescript
// tests/visual/chat-interface.spec.ts
test('should match chat interface baseline', async ({ page }) => {
  await page.goto('/chat');
  await expect(page).toHaveScreenshot('chat-interface-desktop.png');
});
```

### 5. Performance Tests (`tests/performance/`)

**Purpose**: Validate application performance under various load conditions.

**Characteristics**:
- Latency measurements
- Throughput testing
- Resource utilization
- Scalability validation

**When to Add**:
- New API endpoints
- Database queries
- Heavy computations
- Critical user paths

**Example Structure**:
```typescript
// tests/performance/recommendation-engine.spec.ts
test('should generate recommendations within performance threshold', async () => {
  const latencies = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await generateRecommendations(userId);
    latencies.push(performance.now() - start);
  }
  
  const p95 = calculatePercentile(latencies, 95);
  expect(p95).toBeLessThan(2000); // 2 second threshold
});
```

## Test Selection Strategy

### Intelligent Test Selection

Our framework uses git diff analysis to intelligently select relevant tests:

```javascript
// Impact rules determine which tests run based on changes
const impactRules = {
  'src/recommendation/': ['unit', 'integration', 'performance'],
  'src/chat/': ['unit', 'integration', 'e2e'],
  'src/frontend/': ['visual', 'e2e'],
  'package.json': ['unit', 'integration', 'e2e', 'performance'] // Critical changes
};
```

### Test Execution Commands

```bash
# Smart test selection based on changes
npm run test:all

# Individual test layers
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run test:perf

# Test planning and reporting
npm run test:plan        # Generate test selection matrix
npm run test:report      # Collect consolidated results
```

## Adding New Tests

### 1. Determine Test Layer

Ask these questions to determine the appropriate test layer:

- **Unit**: Does this test a single function/class in isolation?
- **Integration**: Does this test interaction between components?
- **E2E**: Does this test a complete user workflow?
- **Visual**: Does this verify UI appearance?
- **Performance**: Does this validate speed/efficiency?

### 2. Follow Naming Conventions

```
tests/{layer}/{category}/{feature}.{spec|test}.{js|ts}

Examples:
tests/unit/services/RecommendationEngine.test.js
tests/integration/api/chat.test.js
tests/e2e/user-onboarding.spec.ts
tests/visual/homepage.spec.ts
tests/performance/api-latency.spec.ts
```

### 3. Use Test Utilities

Leverage shared utilities for consistency:

```javascript
// Available in all tests
import { testUtils, mocks } from '../setup/test-utils';

// Create mock data
const user = testUtils.createMockUser();
const track = testUtils.createMockTrack();

// Use mock services
mocks.spotify.getTrack.mockResolvedValue(track);
```

### 4. Follow Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup for each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  test('should do something specific', async () => {
    // Arrange
    const input = createTestInput();
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toMatchExpectedOutput();
  });
});
```

## Performance Testing Guidelines

### Performance Thresholds

Thresholds are defined in `config/perf-thresholds.json`:

```json
{
  "api": {
    "chat": {
      "p95": 2000,     // 95th percentile < 2s
      "errorRate": 0.05 // < 5% error rate
    }
  }
}
```

### Writing Performance Tests

```typescript
test('API endpoint performance', async ({ page }) => {
  const measurements = [];
  
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const response = await page.evaluate(() => 
      fetch('/api/endpoint').then(r => r.json())
    );
    measurements.push(performance.now() - start);
  }
  
  const p95 = calculatePercentile(measurements, 95);
  expect(p95).toBeLessThan(THRESHOLDS.api.endpoint.p95);
});
```

## Visual Testing Guidelines

### Visual Baseline Management

```bash
# After UI changes, approve new baselines
npm run visual:approve

# Commit approved baselines
git add visual-baseline/
git commit -m "Update visual baselines for new feature"
```

### Visual Test Best Practices

1. **Disable animations** for consistent screenshots
2. **Use consistent test data** for repeatability
3. **Test multiple viewports** (desktop/mobile)
4. **Hide dynamic content** (timestamps, random IDs)

```typescript
test('visual consistency', async ({ page }) => {
  await page.goto('/feature');
  
  // Hide dynamic elements
  await page.addStyleTag({
    content: '.timestamp { display: none !important; }'
  });
  
  // Wait for stability
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveScreenshot('feature-view.png');
});
```

## Quality Gates

### Coverage Requirements

- **Unit Tests**: 85% line coverage minimum
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: All critical user paths covered
- **Visual Tests**: All major UI states covered

### Performance Requirements

- **API Response Time**: P95 < 2 seconds
- **Page Load Time**: < 3 seconds
- **Memory Usage**: No memory leaks detected

### Test Success Criteria

Tests must pass these criteria to merge:

1. All selected tests pass (>95% pass rate)
2. No new test failures introduced
3. Coverage thresholds maintained
4. Performance thresholds met
5. Visual differences within acceptable range

## Continuous Integration

### Test Matrix Selection

The CI system automatically selects tests based on:

- **Changed files**: Runs relevant test layers
- **Pull request scope**: Scales test execution
- **Branch type**: Different rules for main vs feature branches

### Parallel Execution

Tests run in parallel across multiple dimensions:

- **Browser**: Chromium, Firefox, Safari
- **Viewport**: Desktop, Mobile
- **Environment**: Test, Staging

### Artifact Collection

All test runs produce:

- Test results (JSON, JUnit)
- Coverage reports (HTML, LCOV)
- Screenshots (success/failure)
- Performance metrics (timing, memory)
- Consolidated reports (JSON, Markdown)

## Troubleshooting

### Common Issues

1. **Flaky tests**: Use retry mechanisms and better waits
2. **Slow tests**: Optimize test data and mocking
3. **Visual differences**: Check for animations or dynamic content
4. **Performance variance**: Use multiple measurements and percentiles

### Debugging Tests

```bash
# Run tests in debug mode
npm run test:e2e -- --debug

# Generate detailed reports
npm run test:report

# View visual differences
open reports/visual-diff/
```

### Test Environment Issues

```bash
# Validate environment setup
node scripts/env-validate.js

# Check test dependencies
npm run test:plan

# Verify test selection
cat reports/test-matrix.json
```

## Future Enhancements

### Planned Improvements

1. **Contract Testing**: OpenAPI schema validation
2. **A/B Test Support**: Statistical significance testing
3. **Chaos Testing**: Fault injection and resilience
4. **Historical Trends**: Performance regression tracking

### Contributing

When adding new test types or frameworks:

1. Update this documentation
2. Add to test selection matrix
3. Include in CI pipeline
4. Update quality gates
5. Provide examples and utilities

---

For specific questions about testing strategy, consult the team or refer to existing test examples in each layer.