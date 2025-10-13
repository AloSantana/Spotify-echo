import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration for EchoTune AI
 * Supports E2E, Visual Regression, and Browser Automation Testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* Test directories for different test types */
  testMatch: [
    '**/tests/e2e/**/*.spec.ts',
    '**/tests/e2e/**/*.spec.js',
    '**/tests/visual/**/*.spec.ts',
    '**/tests/visual/**/*.spec.js',
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.ts'
  ],
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 2,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }]
  ],
  
  /* Global setup and teardown */
  // globalSetup: './tests/setup/global-setup.js',
  // globalTeardown: './tests/setup/global-teardown.js',
  
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure',
    
    /* Screenshot settings - capture on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Custom viewport for consistent testing */
    viewport: { width: 1280, height: 800 },
    
    /* Ignore HTTPS errors in development */
    ignoreHTTPSErrors: true,
    
    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
    
    /* Action timeout */
    actionTimeout: 10 * 1000,
    
    /* Environment variables for tests */
    extraHTTPHeaders: {
      'X-Test-Mode': process.env.CI ? 'ci' : 'local',
    },
  },
  
  /* Global environment variables available to all tests */
  globalSetup: require.resolve('./tests/setup/global-env-setup.js'),

  /* Configure projects for major browsers and viewports */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: '**/tests/setup/auth.setup.ts',
    },
    
    // Desktop browsers
    {
      name: 'desktop-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 }
      },
      dependencies: ['setup'],
    },

    {
      name: 'desktop-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 800 }
      },
      dependencies: ['setup'],
    },

    {
      name: 'desktop-webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 800 }
      },
      dependencies: ['setup'],
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 }
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 }
      },
      dependencies: ['setup'],
    },

    // Visual regression specific project
    {
      name: 'visual-regression',
      testMatch: '**/tests/visual/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        // Ensure consistent rendering for visual tests
        deviceScaleFactor: 1,
        hasTouch: false,
      },
      dependencies: ['setup'],
    },
  ],

  /* Run local dev server before starting tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
  
  /* Output directories for test artifacts */
  outputDir: 'BROWSERSCREENSHOT-TESTING/test-results',
  
  /* Timeout settings */
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
    // Visual comparison settings
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
    toMatchScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },
  
  /* Metadata */
  metadata: {
    framework: 'EchoTune AI Testing Framework',
    version: '1.0.0',
    testTypes: ['e2e', 'visual-regression', 'browser-automation']
  },
});