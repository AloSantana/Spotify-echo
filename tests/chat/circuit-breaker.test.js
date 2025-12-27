/**
 * Circuit Breaker Tests
 * Tests the circuit breaker pattern implementation for LLM provider failover
 */

const {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  getCircuitBreakerManager,
  DEFAULT_CONFIG,
} = require('../../src/chat/circuit-breaker');

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-provider', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      monitoringWindow: 5000,
      volumeThreshold: 5,
    });
  });

  afterEach(() => {
    breaker.removeAllListeners();
  });

  describe('Initial State', () => {
    test('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('should allow requests when CLOSED', () => {
      expect(breaker.isAllowed()).toBe(true);
    });

    test('should have zero stats initially', () => {
      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalSuccesses).toBe(0);
      expect(stats.totalFailures).toBe(0);
    });
  });

  describe('Success Recording', () => {
    test('should record successes and update stats', () => {
      breaker.recordSuccess(100);
      breaker.recordSuccess(150);

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(0);
    });

    test('should emit success event', (done) => {
      breaker.on('success', (data) => {
        expect(data.provider).toBe('test-provider');
        expect(data.latencyMs).toBe(100);
        expect(data.state).toBe(CircuitState.CLOSED);
        done();
      });

      breaker.recordSuccess(100);
    });
  });

  describe('Failure Recording', () => {
    test('should record failures and update stats', () => {
      breaker.recordFailure('Test error');

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalFailures).toBe(1);
    });

    test('should emit failure event', (done) => {
      breaker.on('failure', (data) => {
        expect(data.provider).toBe('test-provider');
        expect(data.error).toBe('Test error');
        done();
      });

      breaker.recordFailure('Test error');
    });
  });

  describe('Circuit Opening', () => {
    test('should not open before volume threshold', () => {
      // Only 3 failures, below volumeThreshold of 5
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure('Error');
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('should open after failure threshold with volume', () => {
      // Need at least 5 requests (volumeThreshold) with 3 failures (failureThreshold)
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('Error');
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('should block requests when OPEN', () => {
      // Force open
      breaker.forceOpen();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.isAllowed()).toBe(false);
    });

    test('should emit stateChange event on open', (done) => {
      breaker.on('stateChange', (data) => {
        if (data.to === CircuitState.OPEN) {
          expect(data.from).toBe(CircuitState.CLOSED);
          expect(data.provider).toBe('test-provider');
          done();
        }
      });

      // Trigger circuit open
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('Error');
      }
    });
  });

  describe('Circuit Recovery', () => {
    test('should transition to HALF_OPEN after timeout', async () => {
      // Force open
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should now be HALF_OPEN
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    test('should allow limited requests in HALF_OPEN', async () => {
      breaker.forceOpen();
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should allow first request
      expect(breaker.isAllowed()).toBe(true);
    });

    test('should close after success threshold in HALF_OPEN', async () => {
      breaker.forceOpen();
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Record successes (need 2 for successThreshold)
      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('should re-open on failure in HALF_OPEN', async () => {
      breaker.forceOpen();
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Force transition to HALF_OPEN by checking state
      breaker.getState();

      // Any failure reopens
      breaker.recordFailure('Error');

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Force Operations', () => {
    test('should force open circuit', () => {
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('should force close circuit', () => {
      breaker.forceOpen();
      breaker.forceClose();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('should reset circuit breaker', () => {
      // Add some state
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('Error');
      }
      
      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalFailures).toBe(0);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CircuitBreakerManager({
      failureThreshold: 3,
      timeout: 500,
      volumeThreshold: 5,
    });
  });

  afterEach(() => {
    manager.removeAllListeners();
    manager.resetAll();
  });

  describe('Breaker Management', () => {
    test('should create breaker on demand', () => {
      const breaker = manager.getBreaker('provider1');
      expect(breaker).toBeDefined();
      expect(breaker.providerKey).toBe('provider1');
    });

    test('should return same breaker for same provider', () => {
      const breaker1 = manager.getBreaker('provider1');
      const breaker2 = manager.getBreaker('provider1');
      expect(breaker1).toBe(breaker2);
    });

    test('should track multiple providers', () => {
      manager.getBreaker('provider1');
      manager.getBreaker('provider2');
      manager.getBreaker('provider3');

      const summary = manager.getSummary();
      expect(summary.totalBreakers).toBe(3);
    });
  });

  describe('Availability Checking', () => {
    test('should report provider as available when CLOSED', () => {
      expect(manager.isAvailable('provider1')).toBe(true);
    });

    test('should report provider as unavailable when OPEN', () => {
      // Force failures to open circuit
      for (let i = 0; i < 5; i++) {
        manager.recordFailure('provider1', 'Error');
      }

      expect(manager.isAvailable('provider1')).toBe(false);
    });

    test('should filter available providers', () => {
      const providers = ['p1', 'p2', 'p3'];

      // Open circuit for p2
      for (let i = 0; i < 5; i++) {
        manager.recordFailure('p2', 'Error');
      }

      const available = manager.getAvailableProviders(providers);
      expect(available).toContain('p1');
      expect(available).toContain('p3');
      expect(available).not.toContain('p2');
    });
  });

  describe('Provider Selection', () => {
    test('should select first available provider', () => {
      const providers = ['p1', 'p2', 'p3'];
      const selected = manager.selectBestProvider(providers);
      expect(providers).toContain(selected);
    });

    test('should skip unavailable providers', () => {
      const providers = ['p1', 'p2', 'p3'];

      // Open circuit for p1
      for (let i = 0; i < 5; i++) {
        manager.recordFailure('p1', 'Error');
      }

      const selected = manager.selectBestProvider(providers);
      expect(selected).not.toBe('p1');
    });

    test('should return null when no providers available', () => {
      const providers = ['p1', 'p2'];

      // Open circuits for all
      for (const p of providers) {
        for (let i = 0; i < 5; i++) {
          manager.recordFailure(p, 'Error');
        }
      }

      const selected = manager.selectBestProvider(providers);
      expect(selected).toBeNull();
    });
  });

  describe('Summary and Stats', () => {
    test('should provide accurate summary', () => {
      manager.recordSuccess('p1', 100);
      manager.recordSuccess('p2', 200);
      manager.recordFailure('p3', 'Error');

      const summary = manager.getSummary();
      expect(summary.totalBreakers).toBe(3);
      expect(summary.breakers.p1).toBeDefined();
      expect(summary.breakers.p2).toBeDefined();
      expect(summary.breakers.p3).toBeDefined();
    });

    test('should count states correctly', () => {
      // p1 stays closed
      manager.recordSuccess('p1', 100);

      // p2 opens
      for (let i = 0; i < 5; i++) {
        manager.recordFailure('p2', 'Error');
      }

      const summary = manager.getSummary();
      expect(summary.closedCount).toBe(1);
      expect(summary.openCount).toBe(1);
    });
  });

  describe('Reset Operations', () => {
    test('should reset single breaker', () => {
      for (let i = 0; i < 5; i++) {
        manager.recordFailure('p1', 'Error');
      }

      expect(manager.isAvailable('p1')).toBe(false);

      manager.reset('p1');
      expect(manager.isAvailable('p1')).toBe(true);
    });

    test('should reset all breakers', () => {
      const providers = ['p1', 'p2', 'p3'];

      for (const p of providers) {
        for (let i = 0; i < 5; i++) {
          manager.recordFailure(p, 'Error');
        }
      }

      expect(manager.getAvailableProviders(providers)).toHaveLength(0);

      manager.resetAll();

      expect(manager.getAvailableProviders(providers)).toHaveLength(3);
    });
  });
});

describe('getCircuitBreakerManager (Singleton)', () => {
  test('should return same instance', () => {
    const manager1 = getCircuitBreakerManager();
    const manager2 = getCircuitBreakerManager();
    expect(manager1).toBe(manager2);
  });
});

describe('DEFAULT_CONFIG', () => {
  test('should have sensible defaults', () => {
    expect(DEFAULT_CONFIG.failureThreshold).toBe(5);
    expect(DEFAULT_CONFIG.successThreshold).toBe(3);
    expect(DEFAULT_CONFIG.timeout).toBe(30000);
    expect(DEFAULT_CONFIG.monitoringWindow).toBe(60000);
    expect(DEFAULT_CONFIG.volumeThreshold).toBe(10);
    expect(DEFAULT_CONFIG.errorRateThreshold).toBe(0.5);
  });
});
