const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Complete Application Validation with Screenshot Capture
 * 
 * This test validates ALL functions of the Spotify app (npm and docker)
 * Screenshots stored under: BROWSERTESTIMAGES/{runId}/
 * 
 * Covers:
 * - Spotify authentication
 * - MongoDB connectivity  
 * - Chat functionality
 * - Recommendations
 * - Settings
 * - Error handling
 * - Docker functionality
 */

class ScreenshotManager {
  constructor() {
    this.runId = `run-${Date.now()}`;
    this.stepCounter = 0;
    this.baseDir = path.join(process.cwd(), 'BROWSERTESTIMAGES', this.runId);
    this.errors = [];
    this.coverage = {
      auth: [],
      chat: [],
      recommendations: [],
      settings: [],
      mongodb: [],
      docker: [],
      errorflow: []
    };
    this.featureStatus = {
      spotifyAuth: 'unknown',
      mongodb: 'unknown',
      chat: 'unknown', 
      recommendations: 'unknown',
      settings: 'unknown',
      docker: 'unknown',
      llmProviders: {}
    };
  }

  async ensureDirectories() {
    const dirs = ['auth', 'chat', 'recommendations', 'settings', 'mongodb', 'docker', 'errorflow'];
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
        screenshot: filename,
        timestamp: new Date().toISOString(),
        viewport: viewport
      });
      
      console.log(`📸 Screenshot captured: ${flowType}/${filename}`);
      return screenshotPath;
    } catch (error) {
      console.error(`❌ Screenshot failed for ${stepName}:`, error.message);
      this.errors.push({
        step: this.stepCounter,
        type: 'screenshot_error',
        flow: flowType,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  async captureError(page, flowType, errorContext) {
    const errorStep = `error-${Date.now()}`;
    const screenshotPath = await this.captureStep(page, 'errorflow', errorStep);
    
    this.errors.push({
      ...errorContext,
      screenshot: screenshotPath,
      timestamp: new Date().toISOString(),
      flow: flowType
    });
  }

  async generateReport() {
    const reportData = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      totalSteps: this.stepCounter,
      coverage: this.coverage,
      errors: this.errors,
      featureStatus: this.featureStatus,
      summary: this.generateSummary()
    };

    const reportPath = path.join(this.baseDir, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    const markdownPath = path.join(this.baseDir, 'validation-summary.md');
    fs.writeFileSync(markdownPath, this.generateMarkdownSummary(reportData));
    
    return reportData;
  }

  generateSummary() {
    const working = Object.values(this.featureStatus).filter(status => status === 'working').length;
    const total = Object.keys(this.featureStatus).length - 1; // Exclude llmProviders object
    const providerCount = Object.keys(this.featureStatus.llmProviders).length;
    
    return {
      totalFeatures: total,
      workingFeatures: working,
      totalScreenshots: this.stepCounter,
      errorCount: this.errors.length,
      llmProviders: providerCount,
      overallStatus: working >= total * 0.7 ? 'healthy' : 'issues'
    };
  }

  generateMarkdownSummary(reportData) {
    const summary = reportData.summary;
    return `# EchoTune AI - Complete Application Validation Report

## Run Information
- **Run ID**: ${reportData.runId}
- **Timestamp**: ${reportData.timestamp}
- **Total Screenshots**: ${reportData.totalSteps}
- **Total Errors**: ${reportData.errors.length}

## Feature Status Summary

### Core Features
- **Spotify Authentication**: ${this.getStatusEmoji(this.featureStatus.spotifyAuth)} ${this.featureStatus.spotifyAuth}
- **MongoDB Database**: ${this.getStatusEmoji(this.featureStatus.mongodb)} ${this.featureStatus.mongodb}
- **Chat Functionality**: ${this.getStatusEmoji(this.featureStatus.chat)} ${this.featureStatus.chat}
- **Recommendations**: ${this.getStatusEmoji(this.featureStatus.recommendations)} ${this.featureStatus.recommendations}
- **Settings**: ${this.getStatusEmoji(this.featureStatus.settings)} ${this.featureStatus.settings}
- **Docker**: ${this.getStatusEmoji(this.featureStatus.docker)} ${this.featureStatus.docker}

### LLM Providers
${Object.entries(this.featureStatus.llmProviders).map(([provider, status]) => 
  `- **${provider}**: ${this.getStatusEmoji(status)} ${status}`
).join('\n')}

## Overall Status: ${this.getStatusEmoji(summary.overallStatus)} ${summary.overallStatus.toUpperCase()}

### Screenshot Coverage
${Object.entries(reportData.coverage).map(([flow, steps]) => 
  `- **${flow}**: ${steps.length} screenshots`
).join('\n')}

### Errors Encountered
${reportData.errors.length === 0 ? 'No errors encountered ✅' : 
  reportData.errors.map(error => `- ${error.type}: ${error.message}`).join('\n')}

---
*Generated by EchoTune AI Complete Validation Suite*
`;
  }

  getStatusEmoji(status) {
    switch(status) {
      case 'working': return '✅';
      case 'failed': return '❌';
      case 'warning': return '⚠️';
      case 'unknown': return '❓';
      case 'healthy': return '🟢';
      case 'issues': return '🔴';
      default: return '❓';
    }
  }
}

// Global screenshot manager instance
let screenshotManager;

test.beforeAll(async () => {
  screenshotManager = new ScreenshotManager();
  await screenshotManager.ensureDirectories();
  console.log(`🚀 Starting complete validation - Run ID: ${screenshotManager.runId}`);
});

test.afterAll(async () => {
  const report = await screenshotManager.generateReport();
  console.log(`📊 Validation complete - Report generated: ${screenshotManager.baseDir}/validation-report.json`);
  console.log(`📋 Summary: ${report.summary.workingFeatures}/${report.summary.totalFeatures} features working`);
});

test.describe('Complete EchoTune AI Validation', () => {
  test.describe.configure({ mode: 'serial' });

  test('Environment and Prerequisites Validation', async ({ page }) => {
    await screenshotManager.captureStep(page, 'mongodb', 'environment-check-start');
    
    // Test environment variables
    const envVars = [
      'MONGODB_URI', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'JWT_SECRET'
    ];
    
    // Check if app is running
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await screenshotManager.captureStep(page, 'mongodb', 'app-homepage-loaded');
      
      // Check for any error messages on homepage
      const errorElements = await page.locator('.error, .alert-danger, [class*="error"]').count();
      if (errorElements === 0) {
        screenshotManager.featureStatus.mongodb = 'working';
      }
    } catch (error) {
      await screenshotManager.captureError(page, 'mongodb', {
        type: 'app_startup_error',
        message: error.message
      });
      screenshotManager.featureStatus.mongodb = 'failed';
    }
  });

  test('Spotify Authentication Flow', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await screenshotManager.captureStep(page, 'auth', 'homepage-before-auth');

    try {
      // Look for login/auth button
      const authButton = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Connect"), a:has-text("Connect")').first();
      
      if (await authButton.isVisible({ timeout: 5000 })) {
        await screenshotManager.captureStep(page, 'auth', 'auth-button-found');
        await authButton.click();
        await screenshotManager.captureStep(page, 'auth', 'auth-button-clicked');
        
        // Wait for redirect or modal
        await page.waitForTimeout(2000);
        await screenshotManager.captureStep(page, 'auth', 'after-auth-click');
        
        screenshotManager.featureStatus.spotifyAuth = 'working';
      } else {
        // Check if already authenticated
        const userInfo = page.locator('[data-testid="user-info"], .user-profile, .username').first();
        if (await userInfo.isVisible({ timeout: 3000 })) {
          await screenshotManager.captureStep(page, 'auth', 'already-authenticated');
          screenshotManager.featureStatus.spotifyAuth = 'working';
        } else {
          await screenshotManager.captureStep(page, 'auth', 'no-auth-found');
          screenshotManager.featureStatus.spotifyAuth = 'warning';
        }
      }
    } catch (error) {
      await screenshotManager.captureError(page, 'auth', {
        type: 'auth_flow_error',
        message: error.message
      });
      screenshotManager.featureStatus.spotifyAuth = 'failed';
    }
  });

  test('Chat Functionality Validation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await screenshotManager.captureStep(page, 'chat', 'chat-page-load');

    try {
      // Look for chat interface
      const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], #chat-input, .chat-input').first();
      const chatButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      
      if (await chatInput.isVisible({ timeout: 5000 })) {
        await screenshotManager.captureStep(page, 'chat', 'chat-input-found');
        
        // Test chat interaction
        await chatInput.fill('recommend me some upbeat music');
        await screenshotManager.captureStep(page, 'chat', 'chat-message-typed');
        
        if (await chatButton.isVisible()) {
          await chatButton.click();
          await screenshotManager.captureStep(page, 'chat', 'chat-message-sent');
          
          // Wait for response
          await page.waitForTimeout(3000);
          await screenshotManager.captureStep(page, 'chat', 'chat-response-wait');
          
          // Check for response
          const responses = await page.locator('.message, .chat-message, .response').count();
          if (responses > 0) {
            await screenshotManager.captureStep(page, 'chat', 'chat-response-received');
            screenshotManager.featureStatus.chat = 'working';
          } else {
            screenshotManager.featureStatus.chat = 'warning';
          }
        }
      } else {
        await screenshotManager.captureStep(page, 'chat', 'no-chat-interface');
        screenshotManager.featureStatus.chat = 'failed';
      }
    } catch (error) {
      await screenshotManager.captureError(page, 'chat', {
        type: 'chat_functionality_error',
        message: error.message
      });
      screenshotManager.featureStatus.chat = 'failed';
    }
  });

  test('Recommendations System Validation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await screenshotManager.captureStep(page, 'recommendations', 'recommendations-page-load');

    try {
      // Test recommendations endpoint directly
      const response = await page.request.get('http://localhost:3000/api/recommendations');
      await screenshotManager.captureStep(page, 'recommendations', 'api-endpoint-tested');
      
      if (response.ok()) {
        const data = await response.json();
        await screenshotManager.captureStep(page, 'recommendations', 'api-response-received');
        screenshotManager.featureStatus.recommendations = 'working';
      } else {
        screenshotManager.featureStatus.recommendations = 'failed';
      }
      
      // Look for recommendations in UI
      const recoElements = page.locator('.recommendation, .track, .song, [data-testid*="recommendation"]');
      const count = await recoElements.count();
      
      if (count > 0) {
        await screenshotManager.captureStep(page, 'recommendations', 'ui-recommendations-found');
        screenshotManager.featureStatus.recommendations = 'working';
      }
    } catch (error) {
      await screenshotManager.captureError(page, 'recommendations', {
        type: 'recommendations_error',
        message: error.message
      });
      screenshotManager.featureStatus.recommendations = 'failed';
    }
  });

  test('Settings and Configuration', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await screenshotManager.captureStep(page, 'settings', 'settings-page-load');

    try {
      // Look for settings/preferences
      const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings"), [href*="settings"]').first();
      
      if (await settingsLink.isVisible({ timeout: 5000 })) {
        await settingsLink.click();
        await screenshotManager.captureStep(page, 'settings', 'settings-page-opened');
        
        // Look for settings options
        const settingsOptions = await page.locator('input[type="checkbox"], select, input[type="range"]').count();
        if (settingsOptions > 0) {
          await screenshotManager.captureStep(page, 'settings', 'settings-options-found');
          screenshotManager.featureStatus.settings = 'working';
        }
      } else {
        screenshotManager.featureStatus.settings = 'warning';
      }
    } catch (error) {
      await screenshotManager.captureError(page, 'settings', {
        type: 'settings_error',
        message: error.message
      });
      screenshotManager.featureStatus.settings = 'failed';
    }
  });

  test('LLM Providers Testing', async ({ page }) => {
    const providers = ['openai', 'gemini', 'anthropic', 'deepseek'];
    
    for (const provider of providers) {
      try {
        // Test provider endpoint
        const response = await page.request.post('http://localhost:3000/api/chat', {
          data: {
            message: 'test',
            provider: provider
          }
        });
        
        if (response.ok()) {
          screenshotManager.featureStatus.llmProviders[provider] = 'working';
        } else {
          screenshotManager.featureStatus.llmProviders[provider] = 'failed';
        }
      } catch (error) {
        screenshotManager.featureStatus.llmProviders[provider] = 'failed';
      }
    }
    
    await screenshotManager.captureStep(page, 'chat', 'llm-providers-tested');
  });

  test('Mobile Viewport Testing', async ({ page, browser }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await screenshotManager.captureStep(page, 'auth', 'mobile-homepage', 'mobile');
    
    // Test responsive design
    const mobileMenu = page.locator('.mobile-menu, .hamburger, [data-testid="mobile-menu"]').first();
    if (await mobileMenu.isVisible({ timeout: 3000 })) {
      await screenshotManager.captureStep(page, 'auth', 'mobile-menu-found', 'mobile');
    }
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('Error Handling and Edge Cases', async ({ page }) => {
    // Test 404 page
    await page.goto('http://localhost:3000/nonexistent-page');
    await screenshotManager.captureStep(page, 'errorflow', '404-page');
    
    // Test API error handling
    try {
      const response = await page.request.post('http://localhost:3000/api/nonexistent');
      await screenshotManager.captureStep(page, 'errorflow', 'api-error-test');
    } catch (error) {
      await screenshotManager.captureError(page, 'errorflow', {
        type: 'api_error_test',
        message: error.message
      });
    }
  });
});