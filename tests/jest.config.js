module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/test/**',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 75,
            lines: 75,
            statements: 75
        },
        './src/services/UserSettingsService.js': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        },
        './src/routes/settings.js': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85
        }
    },
    setupFilesAfterEnv: ['<rootDir>/setup.js'],
    testTimeout: 30000,
    maxWorkers: 1,
    forceExit: true,
    detectOpenHandles: false,
    transformIgnorePatterns: [
        'node_modules/(?!(mongodb|bson|@opentelemetry)/)'
    ],
    moduleFileExtensions: ['js', 'json', 'mjs'],
    globals: {
        'TextEncoder': TextEncoder,
        'TextDecoder': TextDecoder
    }
};
