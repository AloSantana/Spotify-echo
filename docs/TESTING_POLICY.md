# 🧪 Testing Policy

This document defines the comprehensive testing policy for EchoTune AI, with explicit enforcement of the **"No Mock Policy"** for production recommendation code.

## 🎯 Overview

EchoTune AI maintains the highest standards of code quality through comprehensive testing strategies. Our testing policy ensures reliability, performance, and accuracy across all components, with special emphasis on recommendation algorithms that directly impact user experience.

## 🚫 **NO MOCK POLICY**

### Policy Statement
**Production recommendation code MUST NOT contain mock data, random values, or placeholder algorithms.**

This policy applies to:
- `src/recommendation/` - All recommendation algorithms and logic
- `src/llm/providers/` - LLM provider implementations
- `src/services/` - Core service implementations
- Any code path that affects music recommendations or user-facing features

### Rationale
- **User Trust**: Mock data undermines recommendation quality and user trust
- **Production Accuracy**: Ensures algorithms work with real data patterns
- **Performance Validity**: Real data reveals actual performance characteristics
- **Security**: Prevents accidental deployment of test credentials or dummy data

### Permitted Exceptions
Mock data is **ONLY** permitted in the following contexts:

1. **Test Files**: Files containing `test`, `spec`, or located in `tests/` directory
2. **Development Tools**: Scripts in `scripts/dev/` or marked with `// DEV_ONLY`
3. **Documentation Examples**: When explicitly marked with `// Example only`
4. **Fallback Mechanisms**: Emergency fallbacks clearly marked with `// Emergency fallback`

### Enforcement
- **Automated Validation**: `scripts/validate-no-mock.js` runs in CI/CD
- **Pre-commit Hooks**: Prevent commits containing violations
- **Code Review**: Manual review for compliance
- **Agent Validation**: GitHub Copilot agents verify compliance

### Violation Examples
```javascript
// ❌ PROHIBITED - Random recommendations
function getRecommendations() {
  return tracks[Math.floor(Math.random() * tracks.length)];
}

// ❌ PROHIBITED - Mock data in production
const mockTracks = [
  { id: 'mock1', name: 'Sample Song' }
];

// ❌ PROHIBITED - Placeholder algorithms
function calculateSimilarity() {
  return 0.5; // placeholder
}
```

### Compliant Examples
```javascript
// ✅ APPROVED - Real algorithm implementation
function getRecommendations(userId, preferences) {
  return collaborativeFilter.recommend(userId, preferences);
}

// ✅ APPROVED - Test file usage
// File: tests/recommendation.test.js
const mockTracks = [
  { id: 'test1', name: 'Test Song' }
]; // allowed: test file

// ✅ APPROVED - Documented fallback
function getRecommendations(userId) {
  try {
    return await realAlgorithm(userId);
  } catch (error) {
    // Emergency fallback: return popular tracks
    return await getPopularTracks();
  }
}
```

## 🏗️ Testing Architecture

### Test Types and Coverage Requirements

#### 1. Unit Tests
- **Coverage Requirement**: 90% minimum for recommendation code
- **Scope**: Individual functions and methods
- **Tools**: Jest, Mocha
- **Location**: `tests/unit/`

```javascript
// Example unit test structure
describe('RecommendationEngine', () => {
  it('should return personalized recommendations', async () => {
    const engine = new RecommendationEngine();
    await engine.trainModel(realTrainingData);
    
    const recommendations = await engine.getRecommendations('user123');
    
    expect(recommendations).toHaveLength(10);
    expect(recommendations[0]).toHaveProperty('track_id');
    expect(recommendations[0]).toHaveProperty('score');
  });
});
```

#### 2. Integration Tests
- **Coverage Requirement**: All API endpoints and service integrations
- **Scope**: Component interactions, database operations
- **Tools**: Supertest, Playwright
- **Location**: `tests/integration/`

#### 3. End-to-End Tests
- **Coverage Requirement**: Critical user journeys
- **Scope**: Full application workflows
- **Tools**: Playwright, Cypress
- **Location**: `tests/e2e/`

#### 4. Performance Tests
- **Coverage Requirement**: All recommendation algorithms
- **Scope**: Response times, memory usage, throughput
- **Tools**: Artillery, k6
- **Location**: `tests/performance/`

### Test Data Strategy

#### Real Data Usage
- **Production Snapshots**: Anonymized production data for realistic testing
- **Synthetic Data**: Generated data that mirrors real patterns
- **Edge Cases**: Boundary conditions and error scenarios

#### Test Data Sources
1. **Spotify API Responses**: Real API response structures
2. **User Listening History**: Anonymized listening patterns
3. **Audio Features**: Actual Spotify audio feature data
4. **Edge Cases**: Malformed data, empty responses, rate limits

### Testing Environment Strategy

#### Local Development
```bash
# Environment setup
npm install
npm run test:setup

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Validate NO_MOCK compliance
npm run test:no-mock
```

#### Continuous Integration
```yaml
# CI Pipeline Testing
- name: Unit Tests
  run: npm run test:unit -- --coverage
  
- name: Integration Tests
  run: npm run test:integration
  
- name: NO_MOCK Policy Validation
  run: node scripts/validate-no-mock.js
  
- name: Performance Benchmarks
  run: npm run test:performance
```

#### Staging Environment
- **Pre-production validation** with production-like data
- **Load testing** with realistic user volumes
- **Integration testing** with external services
- **Security testing** and vulnerability scanning

## 🔧 Testing Tools and Configuration

### Primary Testing Stack
- **Test Runner**: Jest for unit/integration tests
- **E2E Testing**: Playwright for browser automation
- **API Testing**: Supertest for HTTP endpoint testing
- **Performance**: Artillery for load testing
- **Coverage**: Istanbul for code coverage reporting

### Configuration Files
- `jest.config.js` - Jest configuration
- `playwright.config.mjs` - Playwright configuration
- `.lighthouserc.json` - Performance testing
- `tests/setup.js` - Global test setup

### Test Data Management
```javascript
// Test data factory pattern
class TestDataFactory {
  static createUser(overrides = {}) {
    return {
      id: 'test-user-' + Date.now(),
      spotifyId: 'spotify-' + Date.now(),
      preferences: this.createPreferences(),
      ...overrides
    };
  }
  
  static createTrack(overrides = {}) {
    return {
      id: 'track-' + Date.now(),
      name: 'Test Track',
      artists: ['Test Artist'],
      audio_features: this.createAudioFeatures(),
      ...overrides
    };
  }
}
```

## 📊 Quality Metrics and Thresholds

### Code Coverage Thresholds
- **Overall Coverage**: 85% minimum
- **Recommendation Code**: 90% minimum
- **Critical Paths**: 95% minimum
- **New Code**: 95% minimum

### Performance Thresholds
- **API Response Time**: < 200ms (95th percentile)
- **Recommendation Generation**: < 500ms
- **Database Queries**: < 100ms average
- **Memory Usage**: < 512MB for recommendation processes

### Reliability Metrics
- **Test Success Rate**: > 99%
- **Flaky Test Rate**: < 1%
- **Build Success Rate**: > 95%
- **Deployment Success Rate**: > 99%

## 🔍 Test Validation and Monitoring

### Automated Validation
```bash
# Pre-commit validation
npm run lint
npm run test:unit
node scripts/validate-no-mock.js

# CI/CD validation
npm run test:all
npm run validate:security
npm run test:performance
```

### Manual Testing Checklist
- [ ] **Functionality**: All features work as expected
- [ ] **Usability**: User interface is intuitive and responsive
- [ ] **Performance**: System meets performance requirements
- [ ] **Security**: No security vulnerabilities or data leaks
- [ ] **Compatibility**: Works across supported browsers and devices

### Test Result Reporting
- **Coverage Reports**: Generated after each test run
- **Performance Reports**: Benchmark comparisons over time
- **Security Reports**: Vulnerability scan results
- **Quality Reports**: Code quality metrics and trends

## 🚨 Incident Response Testing

### Disaster Recovery Testing
- **Database Failures**: Test failover and recovery procedures
- **Service Outages**: Validate graceful degradation
- **Security Breaches**: Practice incident response procedures
- **Data Corruption**: Test backup and restore processes

### Chaos Engineering
- **Random Failures**: Introduce controlled failures to test resilience
- **Load Spikes**: Simulate traffic surges
- **Dependency Failures**: Test behavior when external services fail
- **Network Issues**: Simulate network partitions and latency

## 📋 Compliance and Audit

### Regulatory Compliance
- **GDPR**: User data protection and privacy
- **CCPA**: California privacy regulations
- **SOX**: Financial data integrity (if applicable)
- **Security Standards**: Industry security best practices

### Audit Trail
- **Test Execution Logs**: Detailed records of all test runs
- **Code Coverage History**: Coverage trends over time
- **Performance Baselines**: Historical performance data
- **Compliance Reports**: Regular compliance verification

## 🔗 Related Resources

- [Agent Operations Guide](./AGENT_OPERATIONS.md)
- [MCP Server Inventory](./MCP_SERVER_INVENTORY.md)
- [NO_MOCK Validation Script](../scripts/validate-no-mock.js)
- [Testing Documentation](../tests/README.md)

---

**Last Updated**: Auto-generated by Testing Policy Documentation System
**Version**: 1.0.0
**Owner**: EchoTune AI Quality Assurance Team