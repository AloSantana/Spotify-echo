# Comet Browser Integration Rules

**Integration Type**: Full browser automation and testing
**Priority**: High (P0 for UI validation)
**Status**: Ready for implementation
**Updated**: 2025-10-24

## Overview
Comet browser integration provides comprehensive browser automation capabilities for UI testing, validation, and automated workflows within the EchoTune AI development environment.

## Core Capabilities

### Browser Automation
- **Navigation**: Automated page navigation and URL handling
- **Interaction**: Click, type, scroll, drag-and-drop operations
- **Validation**: Element presence, text content, and state verification
- **Screenshot**: Automated screenshot capture for debugging
- **Performance**: Page load times, Core Web Vitals measurement

### Testing Integration
- **E2E Testing**: Full user journey automation
- **Visual Regression**: Screenshot comparison testing
- **Accessibility**: A11y compliance validation
- **Performance Testing**: Load time and responsiveness metrics
- **Cross-browser**: Multi-browser compatibility testing

## Configuration Patterns

### Basic Comet Setup
```javascript
// scripts/comet-browser-config.js
const CometBrowser = require('@comet/browser-automation');

class EchoTuneCometConfig {
    constructor(options = {}) {
        this.config = {
            // Browser Settings
            headless: process.env.NODE_ENV === 'production',
            viewport: {
                width: options.width || 1920,
                height: options.height || 1080
            },
            
            // Performance Settings
            timeout: {
                navigation: 30000,
                element: 10000,
                script: 15000
            },
            
            // Recording & Screenshots
            recording: {
                enabled: process.env.COMET_RECORDING === 'true',
                path: './test-recordings/',
                quality: 'high'
            },
            
            screenshot: {
                onFailure: true,
                path: './test-screenshots/',
                fullPage: true
            },
            
            // Network & Security
            network: {
                interceptRequests: true,
                blockImages: false, // Keep true for music UI
                blockCss: false
            },
            
            security: {
                ignoreHttpsErrors: false,
                allowInsecureContent: false
            },
            
            // EchoTune Specific
            musicPlayerDetection: true,
            audioAnalysis: true,
            spotifyIntegration: true
        };
    }
    
    async initialize() {
        try {
            this.browser = await CometBrowser.launch(this.config);
            console.log('✅ Comet browser initialized');
            return this.browser;
        } catch (error) {
            console.error('❌ Comet browser initialization failed:', error);
            throw error;
        }
    }
    
    async createPage() {
        const page = await this.browser.newPage();
        
        // Set up EchoTune-specific event listeners
        await this.setupMusicPlayerListeners(page);
        await this.setupSpotifyListeners(page);
        
        return page;
    }
    
    async setupMusicPlayerListeners(page) {
        // Listen for music player events
        await page.evaluateOnNewDocument(() => {
            window.echoTuneTestingMode = true;
            window.musicPlayerEvents = [];
            
            // Track music player state changes
            const originalPlay = HTMLAudioElement.prototype.play;
            HTMLAudioElement.prototype.play = function() {
                window.musicPlayerEvents.push({
                    type: 'play',
                    timestamp: Date.now(),
                    src: this.src
                });
                return originalPlay.call(this);
            };
        });
    }
    
    async setupSpotifyListeners(page) {
        // Spotify Web Playback SDK monitoring
        await page.evaluateOnNewDocument(() => {
            window.spotifyEvents = [];
            
            // Monitor Spotify player state
            if (window.Spotify) {
                const originalReady = window.Spotify.Player.prototype.addListener;
                // Add Spotify event tracking
            }
        });
    }
}

module.exports = EchoTuneCometConfig;
```

### Test Automation Scripts

#### Music Recommendation Testing
```javascript
// scripts/comet-music-tests.js
const EchoTuneCometConfig = require('./comet-browser-config');

class MusicRecommendationTests {
    constructor() {
        this.comet = new EchoTuneCometConfig();
        this.testResults = [];
    }
    
    async runComprehensiveTests() {
        const browser = await this.comet.initialize();
        
        try {
            // Test Suite 1: Basic Navigation
            await this.testBasicNavigation();
            
            // Test Suite 2: Music Player Functionality
            await this.testMusicPlayer();
            
            // Test Suite 3: Recommendation Engine
            await this.testRecommendationEngine();
            
            // Test Suite 4: Spotify Integration
            await this.testSpotifyIntegration();
            
            // Test Suite 5: Performance
            await this.testPerformance();
            
            return this.generateReport();
            
        } finally {
            await browser.close();
        }
    }
    
    async testBasicNavigation() {
        const page = await this.comet.createPage();
        
        try {
            // Navigate to app
            await page.goto('http://localhost:3000');
            
            // Verify main elements load
            await page.waitForSelector('[data-testid="app-header"]', { timeout: 10000 });
            await page.waitForSelector('[data-testid="music-recommendations"]', { timeout: 15000 });
            
            // Test navigation
            const navigationLinks = await page.$$('[data-testid="nav-link"]');
            for (const link of navigationLinks) {
                await link.click();
                await page.waitForTimeout(1000); // Allow navigation
                
                // Verify page loaded
                const isLoaded = await page.evaluate(() => {
                    return document.readyState === 'complete';
                });
                
                if (!isLoaded) {
                    throw new Error('Navigation failed - page not loaded');
                }
            }
            
            this.testResults.push({
                test: 'Basic Navigation',
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Basic Navigation',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            // Take screenshot on failure
            await page.screenshot({
                path: `./test-screenshots/navigation-failure-${Date.now()}.png`,
                fullPage: true
            });
        } finally {
            await page.close();
        }
    }
    
    async testMusicPlayer() {
        const page = await this.comet.createPage();
        
        try {
            await page.goto('http://localhost:3000');
            
            // Wait for music player to load
            await page.waitForSelector('[data-testid="music-player"]', { timeout: 15000 });
            
            // Test play button
            const playButton = await page.$('[data-testid="play-button"]');
            if (playButton) {
                await playButton.click();
                
                // Wait for music to start
                await page.waitForTimeout(2000);
                
                // Check if music is playing
                const isPlaying = await page.evaluate(() => {
                    const audioElements = document.querySelectorAll('audio');
                    return Array.from(audioElements).some(audio => !audio.paused);
                });
                
                if (!isPlaying) {
                    throw new Error('Music player failed to start playback');
                }
            }
            
            // Test volume controls
            const volumeSlider = await page.$('[data-testid="volume-slider"]');
            if (volumeSlider) {
                await volumeSlider.click();
                // Test volume adjustment
            }
            
            // Test skip/next functionality
            const nextButton = await page.$('[data-testid="next-button"]');
            if (nextButton) {
                await nextButton.click();
                await page.waitForTimeout(1000);
            }
            
            this.testResults.push({
                test: 'Music Player',
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Music Player',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            await page.screenshot({
                path: `./test-screenshots/music-player-failure-${Date.now()}.png`,
                fullPage: true
            });
        } finally {
            await page.close();
        }
    }
    
    async testRecommendationEngine() {
        const page = await this.comet.createPage();
        
        try {
            await page.goto('http://localhost:3000');
            
            // Test recommendation request
            const searchInput = await page.$('[data-testid="search-input"]');
            if (searchInput) {
                await searchInput.type('electronic music');
                
                const searchButton = await page.$('[data-testid="search-button"]');
                if (searchButton) {
                    await searchButton.click();
                    
                    // Wait for recommendations to load
                    await page.waitForSelector('[data-testid="recommendation-item"]', { timeout: 20000 });
                    
                    // Verify recommendations are displayed
                    const recommendations = await page.$$('[data-testid="recommendation-item"]');
                    if (recommendations.length === 0) {
                        throw new Error('No recommendations were generated');
                    }
                    
                    // Test recommendation interaction
                    await recommendations[0].click();
                    await page.waitForTimeout(2000);
                    
                    // Verify detailed view opens
                    const detailView = await page.$('[data-testid="track-detail"]');
                    if (!detailView) {
                        throw new Error('Recommendation detail view failed to open');
                    }
                }
            }
            
            this.testResults.push({
                test: 'Recommendation Engine',
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Recommendation Engine',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            await page.screenshot({
                path: `./test-screenshots/recommendation-failure-${Date.now()}.png`,
                fullPage: true
            });
        } finally {
            await page.close();
        }
    }
    
    async testPerformance() {
        const page = await this.comet.createPage();
        
        try {
            // Enable performance metrics
            await page.coverage.startJSCoverage();
            await page.coverage.startCSSCoverage();
            
            const startTime = Date.now();
            await page.goto('http://localhost:3000');
            
            // Wait for main content to load
            await page.waitForSelector('[data-testid="music-recommendations"]', { timeout: 15000 });
            const loadTime = Date.now() - startTime;
            
            // Get performance metrics
            const metrics = await page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                return {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
                };
            });
            
            // Performance thresholds
            const thresholds = {
                loadTime: 5000,     // 5 seconds max
                firstPaint: 1500,   // 1.5 seconds max
                firstContentfulPaint: 2000  // 2 seconds max
            };
            
            const performanceIssues = [];
            if (loadTime > thresholds.loadTime) {
                performanceIssues.push(`Load time too slow: ${loadTime}ms`);
            }
            if (metrics.firstPaint > thresholds.firstPaint) {
                performanceIssues.push(`First paint too slow: ${metrics.firstPaint}ms`);
            }
            if (metrics.firstContentfulPaint > thresholds.firstContentfulPaint) {
                performanceIssues.push(`First contentful paint too slow: ${metrics.firstContentfulPaint}ms`);
            }
            
            if (performanceIssues.length > 0) {
                throw new Error(`Performance issues: ${performanceIssues.join(', ')}`);
            }
            
            this.testResults.push({
                test: 'Performance',
                status: 'PASSED',
                metrics: {
                    loadTime,
                    ...metrics
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Performance',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } finally {
            await page.close();
        }
    }
    
    generateReport() {
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        
        return {
            summary: {
                total: this.testResults.length,
                passed,
                failed,
                passRate: `${((passed / this.testResults.length) * 100).toFixed(1)}%`
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = MusicRecommendationTests;
```

### NPM Scripts Integration

Add these scripts to package.json:

```json
{
  "scripts": {
    "comet:test": "node scripts/comet-music-tests.js",
    "comet:test:headless": "COMET_HEADLESS=true node scripts/comet-music-tests.js",
    "comet:test:record": "COMET_RECORDING=true node scripts/comet-music-tests.js",
    "comet:performance": "node scripts/comet-performance-tests.js",
    "comet:accessibility": "node scripts/comet-a11y-tests.js",
    "comet:visual-regression": "node scripts/comet-visual-tests.js",
    "test:comet:full": "npm run comet:test && npm run comet:performance && npm run comet:accessibility"
  }
}
```

## Integration with Existing Workflow

### CI/CD Pipeline Integration
```yaml
# .github/workflows/comet-tests.yml
name: Comet Browser Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  comet-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start application
      run: |
        npm run start &
        npx wait-on http://localhost:3000
    
    - name: Run Comet tests
      run: npm run test:comet:full
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: comet-test-results
        path: |
          test-screenshots/
          test-recordings/
          comet-test-report.json
```

### MCP Server Integration

Comet browser integrates with the existing `browser-automation` MCP server:

```javascript
// Enhanced MCP integration
const mcpHandler = new EnhancedMCPHandler();

// Use MCP for browser operations
const browserResult = await mcpHandler.callMCP(
    'browser-automation',
    'runTest',
    {
        testSuite: 'music-recommendations',
        browser: 'comet',
        config: cometConfig
    }
);
```

## Best Practices

### Test Organization
- **Page Objects**: Create reusable page object models
- **Test Data**: Use fixtures for consistent test data
- **Selectors**: Use data-testid attributes for reliable element selection
- **Assertions**: Comprehensive validation of UI states and behaviors

### Performance Optimization
- **Parallel Execution**: Run tests concurrently where possible
- **Resource Management**: Clean up browser instances properly
- **Smart Waiting**: Use dynamic waits instead of fixed timeouts
- **Network Optimization**: Block unnecessary resources during testing

### Error Handling
- **Screenshots**: Automatic capture on test failures
- **Logs**: Comprehensive logging of test execution
- **Retry Logic**: Automatic retry for flaky tests
- **Graceful Degradation**: Continue testing even if some tests fail

## Monitoring & Analytics

### Test Metrics
- Test execution time
- Success/failure rates
- Performance benchmarks
- Browser resource usage

### Integration with Analytics MCP
```javascript
// Send test results to analytics
await mcpHandler.callMCP(
    'analytics',
    'recordTestResults',
    {
        testSuite: 'comet-browser',
        results: testReport,
        timestamp: new Date().toISOString()
    }
);
```

This Comet browser integration provides comprehensive testing capabilities while maintaining the high automation standards expected in the EchoTune AI development environment.