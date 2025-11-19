/**
 * Jest Configuration for EchoTune AI
 * Simplified configuration that excludes Playwright E2E tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test discovery - exclude Playwright tests
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
    '**/tests/**/*.test.js',
  ],
  
  // Explicitly exclude Playwright tests and other non-Jest files
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/tests/e2e/',  // Exclude all E2E tests (Playwright)
    '\\.spec\\.(js|ts)$',  // Exclude all .spec files (Playwright convention)
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Transform configuration
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
  ],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Timeouts
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Don't bail on first failure
  bail: false,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
