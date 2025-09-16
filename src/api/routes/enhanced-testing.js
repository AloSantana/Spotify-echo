const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { createRateLimit } = require('../middleware');

const router = express.Router();

// Rate limiting for testing endpoints
const testingRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Max 20 requests per 5 minutes for testing operations
  message: 'Too many testing requests, please wait before running more tests'
});

// Apply rate limiting
router.use(testingRateLimit);

// Store running test processes
const runningTests = new Map();

/**
 * Get all test suites
 * GET /api/testing/suites
 */
router.get('/suites', async (req, res) => {
  try {
    // Mock test suites data
    const testSuites = [
      {
        id: 'unit-tests',
        name: 'Unit Tests',
        type: 'unit',
        description: 'Component and function unit tests',
        files: ['src/**/*.test.js', 'src/**/*.spec.js'],
        totalTests: 247,
        passing: 241,
        failing: 6,
        skipped: 0,
        coverage: 87.3,
        lastRun: new Date(Date.now() - 1000 * 60 * 15),
        duration: 45.2,
        status: 'passing',
        environment: 'development'
      },
      {
        id: 'integration-tests',
        name: 'Integration Tests',
        type: 'integration',
        description: 'API and database integration tests',
        files: ['tests/integration/**/*.test.js'],
        totalTests: 89,
        passing: 85,
        failing: 3,
        skipped: 1,
        coverage: 73.8,
        lastRun: new Date(Date.now() - 1000 * 60 * 30),
        duration: 125.7,
        status: 'failing',
        environment: 'testing'
      },
      {
        id: 'e2e-tests',
        name: 'End-to-End Tests',
        type: 'e2e',
        description: 'Full user journey testing with Playwright',
        files: ['tests/e2e/**/*.spec.js'],
        totalTests: 34,
        passing: 32,
        failing: 2,
        skipped: 0,
        coverage: 68.2,
        lastRun: new Date(Date.now() - 1000 * 60 * 45),
        duration: 287.4,
        status: 'failing',
        environment: 'staging'
      },
      {
        id: 'performance-tests',
        name: 'Performance Tests',
        type: 'performance',
        description: 'Load and stress testing',
        files: ['tests/performance/**/*.js'],
        totalTests: 12,
        passing: 11,
        failing: 1,
        skipped: 0,
        coverage: 45.1,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2),
        duration: 456.8,
        status: 'failing',
        environment: 'production'
      },
      {
        id: 'security-tests',
        name: 'Security Tests',
        type: 'security',
        description: 'Security vulnerability scanning',
        files: ['tests/security/**/*.js'],
        totalTests: 67,
        passing: 64,
        failing: 3,
        skipped: 0,
        coverage: 82.5,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 6),
        duration: 89.3,
        status: 'failing',
        environment: 'production'
      }
    ];

    res.json({
      testSuites,
      summary: {
        totalSuites: testSuites.length,
        totalTests: testSuites.reduce((sum, suite) => sum + suite.totalTests, 0),
        totalPassing: testSuites.reduce((sum, suite) => sum + suite.passing, 0),
        totalFailing: testSuites.reduce((sum, suite) => sum + suite.failing, 0),
        overallCoverage: testSuites.reduce((sum, suite) => sum + suite.coverage, 0) / testSuites.length
      }
    });
  } catch (error) {
    console.error('Failed to get test suites:', error);
    res.status(500).json({
      error: 'Failed to retrieve test suites',
      message: error.message
    });
  }
});

/**
 * Create a new test suite
 * POST /api/testing/suites
 */
router.post('/suites', async (req, res) => {
  try {
    const { name, type, description, files, environment, timeout, retries } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name and type are required'
      });
    }

    const newSuite = {
      id: `${type}-${Date.now()}`,
      name,
      type,
      description: description || '',
      files: files || [],
      totalTests: 0,
      passing: 0,
      failing: 0,
      skipped: 0,
      coverage: 0,
      lastRun: null,
      duration: 0,
      status: 'not_run',
      environment: environment || 'development',
      timeout: timeout || 30000,
      retries: retries || 3,
      created: new Date()
    };

    // In a real implementation, this would be saved to a database
    res.status(201).json(newSuite);
  } catch (error) {
    console.error('Failed to create test suite:', error);
    res.status(500).json({
      error: 'Failed to create test suite',
      message: error.message
    });
  }
});

/**
 * Run a specific test suite
 * POST /api/testing/run/:suiteId
 */
router.post('/run/:suiteId', async (req, res) => {
  try {
    const { suiteId } = req.params;
    const { options = {} } = req.body;

    if (runningTests.has(suiteId)) {
      return res.status(409).json({
        error: 'Test already running',
        message: `Test suite ${suiteId} is already running`
      });
    }

    // Mark test as running
    runningTests.set(suiteId, { startTime: Date.now(), status: 'running' });

    // Simulate test execution
    const testExecution = simulateTestExecution(suiteId, options);
    
    // Don't wait for completion, return immediately
    res.json({
      message: `Test suite ${suiteId} started`,
      suiteId,
      startTime: new Date(),
      estimatedDuration: getEstimatedDuration(suiteId)
    });

    // Handle test completion asynchronously
    testExecution.then(result => {
      runningTests.delete(suiteId);
      console.log(`Test suite ${suiteId} completed:`, result);
    }).catch(error => {
      runningTests.delete(suiteId);
      console.error(`Test suite ${suiteId} failed:`, error);
    });

  } catch (error) {
    console.error('Failed to run test suite:', error);
    runningTests.delete(req.params.suiteId);
    res.status(500).json({
      error: 'Failed to run test suite',
      message: error.message
    });
  }
});

/**
 * Stop a running test suite
 * POST /api/testing/stop/:suiteId
 */
router.post('/stop/:suiteId', async (req, res) => {
  try {
    const { suiteId } = req.params;

    if (!runningTests.has(suiteId)) {
      return res.status(404).json({
        error: 'Test not running',
        message: `Test suite ${suiteId} is not currently running`
      });
    }

    // Remove from running tests
    runningTests.delete(suiteId);

    res.json({
      message: `Test suite ${suiteId} stopped`,
      suiteId,
      stoppedAt: new Date()
    });
  } catch (error) {
    console.error('Failed to stop test suite:', error);
    res.status(500).json({
      error: 'Failed to stop test suite',
      message: error.message
    });
  }
});

/**
 * Get test results for a specific suite
 * GET /api/testing/results/:suiteId
 */
router.get('/results/:suiteId', async (req, res) => {
  try {
    const { suiteId } = req.params;

    // Mock test results
    const mockResults = {
      suiteId,
      timestamp: new Date(),
      status: runningTests.has(suiteId) ? 'running' : 'completed',
      summary: {
        total: Math.floor(Math.random() * 100) + 50,
        passed: Math.floor(Math.random() * 80) + 40,
        failed: Math.floor(Math.random() * 10),
        skipped: Math.floor(Math.random() * 5),
        duration: Math.floor(Math.random() * 300) + 30,
        coverage: Math.round((Math.random() * 30 + 70) * 100) / 100
      },
      tests: [
        {
          name: 'should authenticate user successfully',
          file: 'src/auth/auth.test.js',
          status: 'passed',
          duration: 125,
          assertions: 5
        },
        {
          name: 'should handle invalid credentials',
          file: 'src/auth/auth.test.js',
          status: 'passed',
          duration: 89,
          assertions: 3
        },
        {
          name: 'should validate user permissions',
          file: 'src/auth/auth.test.js',
          status: 'failed',
          duration: 267,
          assertions: 4,
          error: 'Expected 403 but received 200',
          stack: 'at /src/auth/auth.test.js:25:10'
        }
      ],
      coverage: {
        statements: 87.3,
        branches: 82.1,
        functions: 91.7,
        lines: 86.9,
        uncoveredLines: [
          { file: 'src/auth/auth.js', lines: [45, 67, 89] },
          { file: 'src/api/routes.js', lines: [123, 156] }
        ]
      }
    };

    res.json(mockResults);
  } catch (error) {
    console.error('Failed to get test results:', error);
    res.status(500).json({
      error: 'Failed to retrieve test results',
      message: error.message
    });
  }
});

/**
 * Get overall test coverage
 * GET /api/testing/coverage
 */
router.get('/coverage', async (req, res) => {
  try {
    const coverageData = {
      timestamp: new Date(),
      overall: {
        statements: 78.5,
        branches: 71.2,
        functions: 85.3,
        lines: 77.9
      },
      byDirectory: {
        'src/api': { statements: 82.1, branches: 75.6, functions: 88.2, lines: 81.4 },
        'src/auth': { statements: 91.2, branches: 87.3, functions: 95.1, lines: 90.8 },
        'src/chat': { statements: 69.4, branches: 62.1, functions: 74.5, lines: 68.7 },
        'src/spotify': { statements: 85.7, branches: 79.2, functions: 89.3, lines: 84.6 },
        'src/utils': { statements: 92.3, branches: 88.9, functions: 94.7, lines: 91.5 }
      },
      trends: [
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), coverage: 75.2 },
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), coverage: 76.1 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), coverage: 77.3 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), coverage: 76.8 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), coverage: 78.1 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), coverage: 78.9 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), coverage: 78.5 }
      ]
    };

    res.json(coverageData);
  } catch (error) {
    console.error('Failed to get coverage data:', error);
    res.status(500).json({
      error: 'Failed to retrieve coverage data',
      message: error.message
    });
  }
});

/**
 * Get running test status
 * GET /api/testing/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date(),
      runningTests: Array.from(runningTests.entries()).map(([suiteId, info]) => ({
        suiteId,
        startTime: new Date(info.startTime),
        duration: Date.now() - info.startTime,
        status: info.status
      })),
      systemHealth: {
        availableMemory: Math.round((1 - (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal)) * 100),
        cpuLoad: Math.random() * 50 + 25, // Mock CPU load
        diskSpace: Math.random() * 20 + 70 // Mock available disk space
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Failed to get test status:', error);
    res.status(500).json({
      error: 'Failed to retrieve test status',
      message: error.message
    });
  }
});

/**
 * Run quick health check tests
 * POST /api/testing/health-check
 */
router.post('/health-check', async (req, res) => {
  try {
    const healthChecks = await Promise.allSettled([
      checkDatabaseConnection(),
      checkAPIEndpoints(),
      checkExternalServices(),
      checkSystemResources()
    ]);

    const results = {
      timestamp: new Date(),
      overall: healthChecks.every(check => check.status === 'fulfilled' && check.value.status === 'healthy') ? 'healthy' : 'unhealthy',
      checks: {
        database: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'error', message: healthChecks[0].reason.message },
        api: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'error', message: healthChecks[1].reason.message },
        external: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'error', message: healthChecks[2].reason.message },
        system: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: 'error', message: healthChecks[3].reason.message }
      }
    };

    res.json(results);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Helper functions

function simulateTestExecution(suiteId, options) {
  return new Promise((resolve) => {
    const duration = getEstimatedDuration(suiteId);
    
    setTimeout(() => {
      const result = {
        suiteId,
        status: Math.random() > 0.2 ? 'passed' : 'failed',
        duration,
        totalTests: Math.floor(Math.random() * 100) + 20,
        passed: Math.floor(Math.random() * 80) + 15,
        failed: Math.floor(Math.random() * 10),
        coverage: Math.round((Math.random() * 30 + 60) * 100) / 100,
        completedAt: new Date()
      };
      
      resolve(result);
    }, Math.min(duration * 100, 10000)); // Simulate faster for demo
  });
}

function getEstimatedDuration(suiteId) {
  const durations = {
    'unit-tests': 45,
    'integration-tests': 125,
    'e2e-tests': 287,
    'performance-tests': 456,
    'security-tests': 89
  };
  
  return durations[suiteId] || 60;
}

async function checkDatabaseConnection() {
  // Mock database check
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: Math.random() > 0.1 ? 'healthy' : 'unhealthy',
        responseTime: Math.floor(Math.random() * 100) + 20,
        connections: Math.floor(Math.random() * 50) + 10
      });
    }, 100);
  });
}

async function checkAPIEndpoints() {
  // Mock API endpoints check
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: Math.random() > 0.05 ? 'healthy' : 'unhealthy',
        endpoints: {
          '/health': { status: 'healthy', responseTime: 15 },
          '/api/chat': { status: 'healthy', responseTime: 234 },
          '/api/spotify': { status: 'healthy', responseTime: 156 }
        }
      });
    }, 200);
  });
}

async function checkExternalServices() {
  // Mock external services check
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: Math.random() > 0.15 ? 'healthy' : 'degraded',
        services: {
          spotify: { status: 'healthy', responseTime: 189 },
          openai: { status: 'healthy', responseTime: 456 },
          mongodb: { status: 'healthy', responseTime: 67 }
        }
      });
    }, 300);
  });
}

async function checkSystemResources() {
  // Mock system resources check
  return new Promise((resolve) => {
    setTimeout(() => {
      const memUsage = process.memoryUsage();
      resolve({
        status: 'healthy',
        memory: {
          usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
          available: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024)
        },
        cpu: {
          usage: Math.round(Math.random() * 50 + 25)
        }
      });
    }, 50);
  });
}

module.exports = router;