const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Comprehensive E2E Flows with Screenshot Capture
 * Tags: @flows, @auth, @settings, @chat, @recommendations, @errorflow
 * 
 * This test captures screenshots of EVERY step and error event
 * Screenshots stored under: BROWSERSCREENSHOT-TESTING/{runId}/
 */

class ScreenshotManager {
  constructor() {
    this.runId = `run-${Date.now()}`;
    this.stepCounter = 0;
    this.baseDir = path.join(process.cwd(), 'BROWSERSCREENSHOT-TESTING', this.runId);
    this.errors = [];
    this.coverage = {
      auth: [],
      settings: [],
      chat: [],
      recommendations: [],
      errorflow: []
    };
  }

  async ensureDirectories() {
    const dirs = ['auth', 'settings', 'chat', 'recommendations', 'errorflow'];
    for (const dir of dirs) {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  async captureStep(page, flowType, stepName, viewport = 'desktop') {
    this.stepCounter++;
    const slug = stepName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${this.stepCounter.toString().padStart(3, '0')}-${slug}-${viewport}.png`;
    const screenshotPath = path.join(this.baseDir, flowType, filename);
    
    try {
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        animations: 'disabled'
      });
      
      this.coverage[flowType].push({
        step: this.stepCounter,
        name: stepName,
        viewport,
        filename,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      console.log(`📸 Captured: ${flowType}/${filename}`);
    } catch (error) {
      console.error(`❌ Screenshot failed for ${stepName}:`, error.message);
      this.errors.push({
        step: this.stepCounter,
        name: stepName,
        viewport,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async captureError(page, flowType, errorName, errorDetails, viewport = 'desktop') {
    const slug = errorName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `error-${slug}-${viewport}.png`;
    const screenshotPath = path.join(this.baseDir, flowType, filename);
    
    try {
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        animations: 'disabled'
      });
      
      this.errors.push({
        name: errorName,
        details: errorDetails,
        viewport,
        filename,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      });
      
      console.log(`💥 Error captured: ${flowType}/${filename}`);
    } catch (screenshotError) {
      console.error('❌ Error screenshot failed:', screenshotError.message);
    }
  }

  async writeCoverageReport() {
    const reportPath = path.join(this.baseDir, 'coverage-report.json');
    const report = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      totalSteps: this.stepCounter,
      coverage: this.coverage,
      errors: this.errors,
      summary: {
        authSteps: this.coverage.auth.length,
        settingsSteps: this.coverage.settings.length,
        chatSteps: this.coverage.chat.length,
        recommendationsSteps: this.coverage.recommendations.length,
        errorflowSteps: this.coverage.errorflow.length,
        totalErrors: this.errors.length
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Coverage report: ${reportPath}`);
    
    return report;
  }
}

let screenshotManager;

test.beforeAll(async () => {
  screenshotManager = new ScreenshotManager();
  await screenshotManager.ensureDirectories();
  console.log(`🎬 Starting E2E flows with runId: ${screenshotManager.runId}`);
});

test.afterAll(async () => {
  const report = await screenshotManager.writeCoverageReport();
  
  // Write summary to reports directory
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const summaryPath = path.join(reportsDir, 'screenshot-coverage.json');
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2));
  
  console.log('\n📈 E2E Flow Summary:');
  console.log(`Total steps captured: ${report.totalSteps}`);
  console.log(`Screenshots by flow: auth=${report.summary.authSteps}, settings=${report.summary.settingsSteps}, chat=${report.summary.chatSteps}, recommendations=${report.summary.recommendationsSteps}, errorflow=${report.summary.errorflowSteps}`);
  console.log(`Errors captured: ${report.summary.totalErrors}`);
});

// Configure page error handling
test.beforeEach(async ({ page }) => {
  page.on('pageerror', async (error) => {
    console.error('🚨 Page error:', error.message);
    await screenshotManager.captureError(page, 'errorflow', 'page-error', error.message);
  });

  page.on('console', async (msg) => {
    if (msg.type() === 'error') {
      console.error('🚨 Console error:', msg.text());
      await screenshotManager.captureError(page, 'errorflow', 'console-error', msg.text());
    }
  });
});

test.describe('Authentication Flow', () => {
  test('auth flow with comprehensive screenshots @flows @auth', async ({ page }) => {
    // Step 1: Navigate to home page
    await page.goto('/');
    await screenshotManager.captureStep(page, 'auth', 'home-page-loaded');
    
    // Step 2: Check if already authenticated
    const isAuthenticated = await page.locator('[data-testid="user-profile"], .user-info, #logout-btn').count() > 0;
    if (isAuthenticated) {
      await screenshotManager.captureStep(page, 'auth', 'already-authenticated');
      return; // Skip auth flow if already logged in
    }
    
    // Step 3: Look for login/auth button
    await screenshotManager.captureStep(page, 'auth', 'looking-for-auth-button');
    
    const authSelectors = [
      'a[href*="auth"], a[href*="login"]',
      'button:has-text("Login"), button:has-text("Sign In")',
      '[data-testid="login-btn"], [data-testid="auth-btn"]',
      '.login-btn, .auth-btn, .spotify-login'
    ];
    
    let authButton = null;
    for (const selector of authSelectors) {
      authButton = page.locator(selector).first();
      if (await authButton.count() > 0) {
        break;
      }
    }
    
    if (await authButton.count() === 0) {
      await screenshotManager.captureError(page, 'auth', 'no-auth-button-found', 'No authentication button found on page');
      return;
    }
    
    // Step 4: Click auth button
    await authButton.click();
    await screenshotManager.captureStep(page, 'auth', 'auth-button-clicked');
    
    // Step 5: Wait for Spotify redirect or auth form
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await screenshotManager.captureStep(page, 'auth', 'auth-redirect-or-form');
      
      // Check if we're on Spotify auth page
      const currentUrl = page.url();
      if (currentUrl.includes('accounts.spotify.com')) {
        await screenshotManager.captureStep(page, 'auth', 'spotify-auth-page');
        
        // Try to fill in credentials if test tokens are available
        if (process.env.SPOTIFY_TEST_USERNAME && process.env.SPOTIFY_TEST_PASSWORD) {
          await page.fill('#login-username', process.env.SPOTIFY_TEST_USERNAME);
          await page.fill('#login-password', process.env.SPOTIFY_TEST_PASSWORD);
          await screenshotManager.captureStep(page, 'auth', 'credentials-filled');
          
          await page.click('#login-button');
          await screenshotManager.captureStep(page, 'auth', 'login-submitted');
          
          // Wait for redirect back
          await page.waitForURL('**/auth/callback**', { timeout: 15000 });
          await screenshotManager.captureStep(page, 'auth', 'callback-received');
        } else {
          await screenshotManager.captureStep(page, 'auth', 'spotify-auth-page-no-credentials');
        }
      }
    } catch (error) {
      await screenshotManager.captureError(page, 'auth', 'auth-flow-error', error.message);
    }
    
    // Step 6: Return to app and verify auth state
    await page.goto('/');
    await screenshotManager.captureStep(page, 'auth', 'return-to-app-after-auth');
    
    // Check for auth success indicators
    const authSuccess = await page.locator('[data-testid="user-profile"], .user-info, #logout-btn').count() > 0;
    if (authSuccess) {
      await screenshotManager.captureStep(page, 'auth', 'authentication-successful');
    } else {
      await screenshotManager.captureStep(page, 'auth', 'authentication-incomplete');
    }
  });
});

test.describe('Settings Flow', () => {
  test('settings navigation and configuration @flows @settings', async ({ page }) => {
    // Step 1: Navigate to home
    await page.goto('/');
    await screenshotManager.captureStep(page, 'settings', 'home-page-for-settings');
    
    // Step 2: Look for settings page/button
    const settingsSelectors = [
      'a[href*="settings"]',
      'button:has-text("Settings")',
      '[data-testid="settings"], .settings-btn',
      'a:has-text("Settings"), a:has-text("Preferences")'
    ];
    
    let settingsButton = null;
    for (const selector of settingsSelectors) {
      settingsButton = page.locator(selector).first();
      if (await settingsButton.count() > 0) {
        break;
      }
    }
    
    if (await settingsButton.count() === 0) {
      // Try navigating directly to settings
      await page.goto('/settings');
      await screenshotManager.captureStep(page, 'settings', 'direct-navigation-to-settings');
    } else {
      // Step 3: Click settings
      await settingsButton.click();
      await screenshotManager.captureStep(page, 'settings', 'settings-button-clicked');
    }
    
    // Step 4: Wait for settings page to load
    await page.waitForLoadState('networkidle');
    await screenshotManager.captureStep(page, 'settings', 'settings-page-loaded');
    
    // Step 5: Look for AI provider settings
    const providerSettings = page.locator('select[name*="provider"], input[name*="provider"], .provider-select');
    if (await providerSettings.count() > 0) {
      await screenshotManager.captureStep(page, 'settings', 'provider-settings-found');
      
      // Try to interact with provider setting
      try {
        if (await page.locator('select[name*="provider"]').count() > 0) {
          await page.selectOption('select[name*="provider"]', 'auto');
          await screenshotManager.captureStep(page, 'settings', 'provider-changed-to-auto');
        }
      } catch (error) {
        await screenshotManager.captureError(page, 'settings', 'provider-setting-error', error.message);
      }
    }
    
    // Step 6: Look for other settings
    const allSettings = await page.locator('input, select, textarea').count();
    await screenshotManager.captureStep(page, 'settings', `found-${allSettings}-settings-controls`);
    
    // Step 7: Try to save settings if save button exists
    const saveButton = page.locator('button:has-text("Save"), input[type="submit"]').first();
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await screenshotManager.captureStep(page, 'settings', 'settings-saved');
    }
  });
});

test.describe('Chat Flow', () => {
  test('chat interaction with AI providers @flows @chat', async ({ page }) => {
    // Step 1: Navigate to chat page
    await page.goto('/chat');
    await screenshotManager.captureStep(page, 'chat', 'chat-page-initial');
    
    // If chat page doesn't exist, try root
    if (page.url().includes('404') || !(await page.locator('input, textarea').count() > 0)) {
      await page.goto('/');
      await screenshotManager.captureStep(page, 'chat', 'fallback-to-home-for-chat');
    }
    
    // Step 2: Look for chat input
    const chatInputSelectors = [
      'textarea[placeholder*="message"], textarea[placeholder*="chat"]',
      'input[placeholder*="message"], input[placeholder*="chat"]',
      '[data-testid="chat-input"], .chat-input',
      'textarea, input[type="text"]'
    ];
    
    let chatInput = null;
    for (const selector of chatInputSelectors) {
      chatInput = page.locator(selector).first();
      if (await chatInput.count() > 0) {
        break;
      }
    }
    
    if (await chatInput.count() === 0) {
      await screenshotManager.captureError(page, 'chat', 'no-chat-input-found', 'No chat input field found');
      return;
    }
    
    await screenshotManager.captureStep(page, 'chat', 'chat-input-found');
    
    // Step 3: Test music recommendation request
    const testMessage = 'Can you recommend some upbeat pop music for a workout?';
    await chatInput.fill(testMessage);
    await screenshotManager.captureStep(page, 'chat', 'test-message-entered');
    
    // Step 4: Submit the message
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      '[data-testid="send-btn"], .send-btn'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = page.locator(selector).first();
      if (await submitButton.count() > 0) {
        break;
      }
    }
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    } else {
      // Try Enter key
      await chatInput.press('Enter');
    }
    
    await screenshotManager.captureStep(page, 'chat', 'message-submitted');
    
    // Step 5: Wait for response
    try {
      await page.waitForSelector('.message, .chat-message, .response', { timeout: 15000 });
      await screenshotManager.captureStep(page, 'chat', 'response-received');
      
      // Check for recommendations in response
      const hasRecommendations = await page.locator('.recommendation, .track, .song').count() > 0;
      if (hasRecommendations) {
        await screenshotManager.captureStep(page, 'chat', 'recommendations-in-response');
      }
      
    } catch (error) {
      await screenshotManager.captureError(page, 'chat', 'no-response-timeout', 'No chat response within timeout');
    }
    
    // Step 6: Test provider switching if available
    const providerSelector = page.locator('select[name*="provider"], .provider-select');
    if (await providerSelector.count() > 0) {
      const providers = await providerSelector.locator('option').allTextContents();
      if (providers.length > 1) {
        await providerSelector.selectOption({ index: 1 });
        await screenshotManager.captureStep(page, 'chat', 'provider-switched');
        
        // Test with different provider
        await chatInput.fill('Recommend some jazz music');
        await submitButton.click();
        await screenshotManager.captureStep(page, 'chat', 'second-message-different-provider');
        
        try {
          await page.waitForSelector('.message, .chat-message, .response', { timeout: 10000 });
          await screenshotManager.captureStep(page, 'chat', 'second-response-received');
        } catch (error) {
          await screenshotManager.captureError(page, 'chat', 'second-response-timeout', 'Second response timeout');
        }
      }
    }
  });
});

test.describe('Recommendations Flow', () => {
  test('recommendations page and functionality @flows @recommendations', async ({ page }) => {
    // Step 1: Navigate to recommendations
    await page.goto('/recommendations');
    await screenshotManager.captureStep(page, 'recommendations', 'recommendations-page-initial');
    
    // Try alternative routes if main route fails
    if (page.url().includes('404')) {
      await page.goto('/reco');
      await screenshotManager.captureStep(page, 'recommendations', 'alternative-reco-route');
    }
    
    if (page.url().includes('404')) {
      await page.goto('/');
      await screenshotManager.captureStep(page, 'recommendations', 'fallback-to-home');
      
      // Look for recommendations link/button on home page
      const recoSelectors = [
        'a[href*="reco"]',
        'button:has-text("Recommend")',
        '[data-testid="recommendations"], .recommendations-btn'
      ];
      
      for (const selector of recoSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          await screenshotManager.captureStep(page, 'recommendations', 'recommendations-link-clicked');
          break;
        }
      }
    }
    
    // Step 2: Wait for page to load
    await page.waitForLoadState('networkidle');
    await screenshotManager.captureStep(page, 'recommendations', 'page-loaded');
    
    // Step 3: Look for strategy selector
    const strategySelector = page.locator('select[name*="strategy"], .strategy-select');
    if (await strategySelector.count() > 0) {
      await screenshotManager.captureStep(page, 'recommendations', 'strategy-selector-found');
      
      // Test different strategies
      const strategies = ['hybrid', 'collaborative', 'content-based'];
      for (const strategy of strategies) {
        try {
          await strategySelector.selectOption(strategy);
          await screenshotManager.captureStep(page, 'recommendations', `strategy-${strategy}-selected`);
          
          // Wait for recommendations to load
          await page.waitForTimeout(2000);
          await screenshotManager.captureStep(page, 'recommendations', `${strategy}-recommendations-loaded`);
          
        } catch (error) {
          await screenshotManager.captureError(page, 'recommendations', `strategy-${strategy}-error`, error.message);
        }
      }
    }
    
    // Step 4: Look for recommendation cards/items
    const recoItems = await page.locator('.recommendation, .track, .song, .music-item').count();
    await screenshotManager.captureStep(page, 'recommendations', `found-${recoItems}-recommendation-items`);
    
    // Step 5: Test interaction with recommendations if available
    if (recoItems > 0) {
      const firstReco = page.locator('.recommendation, .track, .song, .music-item').first();
      await firstReco.hover();
      await screenshotManager.captureStep(page, 'recommendations', 'first-recommendation-hovered');
      
      // Look for play/preview button
      const playButton = firstReco.locator('button:has-text("Play"), .play-btn, [data-testid="play"]');
      if (await playButton.count() > 0) {
        await playButton.click();
        await screenshotManager.captureStep(page, 'recommendations', 'play-button-clicked');
      }
    }
    
    // Step 6: Test refresh/reload recommendations
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Reload"), .refresh-btn');
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await screenshotManager.captureStep(page, 'recommendations', 'recommendations-refreshed');
      
      await page.waitForTimeout(3000);
      await screenshotManager.captureStep(page, 'recommendations', 'after-refresh-loaded');
    }
  });
});

test.describe('Error Flow Testing', () => {
  test('error scenarios and handling @flows @errorflow', async ({ page }) => {
    // Step 1: Test 404 page
    await page.goto('/nonexistent-page-123');
    await screenshotManager.captureStep(page, 'errorflow', '404-page');
    
    // Step 2: Test malformed API request
    try {
      await page.goto('/api/chat');
      await screenshotManager.captureStep(page, 'errorflow', 'direct-api-access');
    } catch (error) {
      await screenshotManager.captureError(page, 'errorflow', 'api-access-error', error.message);
    }
    
    // Step 3: Test JavaScript errors by injecting bad code
    await page.goto('/');
    await page.evaluate(() => {
      // Intentionally cause a JavaScript error
      window.nonExistentFunction();
    });
    await screenshotManager.captureStep(page, 'errorflow', 'javascript-error-injected');
    
    // Step 4: Test network error simulation
    await page.route('**/api/**', route => route.abort());
    await page.goto('/chat');
    
    const chatInput = page.locator('textarea, input').first();
    if (await chatInput.count() > 0) {
      await chatInput.fill('Test message with network blocked');
      await page.keyboard.press('Enter');
      await screenshotManager.captureStep(page, 'errorflow', 'network-error-simulation');
      
      await page.waitForTimeout(5000);
      await screenshotManager.captureStep(page, 'errorflow', 'after-network-error');
    }
    
    // Step 5: Reset network and test recovery
    await page.unroute('**/api/**');
    await page.reload();
    await screenshotManager.captureStep(page, 'errorflow', 'network-recovered');
  });
});

// Mobile viewport tests
test.describe('Mobile Viewport Tests', () => {
  test('mobile auth flow @flows @auth @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    await page.goto('/');
    await screenshotManager.captureStep(page, 'auth', 'mobile-home-page', 'mobile');
    
    // Test mobile navigation/menu
    const mobileMenuSelectors = [
      '.mobile-menu, .hamburger, .menu-toggle',
      'button[aria-label*="menu"]',
      '[data-testid="mobile-menu"]'
    ];
    
    for (const selector of mobileMenuSelectors) {
      const menuButton = page.locator(selector).first();
      if (await menuButton.count() > 0) {
        await menuButton.click();
        await screenshotManager.captureStep(page, 'auth', 'mobile-menu-opened', 'mobile');
        break;
      }
    }
  });
  
  test('mobile chat interface @flows @chat @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    await page.goto('/chat');
    await screenshotManager.captureStep(page, 'chat', 'mobile-chat-interface', 'mobile');
    
    const chatInput = page.locator('textarea, input').first();
    if (await chatInput.count() > 0) {
      await chatInput.fill('Mobile test message');
      await screenshotManager.captureStep(page, 'chat', 'mobile-message-entered', 'mobile');
      
      await page.keyboard.press('Enter');
      await screenshotManager.captureStep(page, 'chat', 'mobile-message-sent', 'mobile');
    }
  });
});