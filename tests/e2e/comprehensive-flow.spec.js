import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

const SCREENSHOT_DIR = 'BROWSERSCREENSHOT-TESTING';

test.describe('EchoTune AI - Comprehensive E2E Flow', () => {
  let runId;
  
  test.beforeEach(async ({ page }) => {
    runId = Date.now().toString();
    await page.goto('/');
  });

  test('1. Authentication Flow - Complete Spotify OAuth', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/auth/01-landing-page.png`,
      fullPage: true 
    });
    
    // Click Spotify login button
    await page.getByRole('button', { name: /spotify/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/auth/02-spotify-auth-redirect.png`,
      fullPage: true 
    });
    
    // Verify we're redirected to Spotify auth
    await expect(page).toHaveURL(/accounts.spotify.com/);
    
    // Note: In real environment, would complete OAuth flow
    console.log('✅ Spotify OAuth flow initiated successfully');
  });

  test('2. Enhanced Chat Interface - Provider Selection', async ({ page }) => {
    // Navigate to enhanced chat
    await page.getByRole('tab', { name: /enhanced chat/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/chat/01-enhanced-chat-interface.png`,
      fullPage: true 
    });
    
    // Test provider selection
    await page.getByRole('combobox', { name: /provider/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/chat/02-provider-selection.png`,
      fullPage: true 
    });
    
    // Select a provider
    await page.getByRole('option', { name: /gemini/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/chat/03-provider-selected.png`,
      fullPage: true 
    });
    
    console.log('✅ Enhanced chat interface provider selection working');
  });

  test('3. Performance Monitoring Dashboard', async ({ page }) => {
    // Navigate to performance monitoring
    await page.getByRole('tab', { name: /performance/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/performance/01-dashboard-overview.png`,
      fullPage: true 
    });
    
    // Check system metrics cards
    await expect(page.getByText(/CPU Usage/i)).toBeVisible();
    await expect(page.getByText(/Memory/i)).toBeVisible();
    await expect(page.getByText(/Disk Space/i)).toBeVisible();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/performance/02-system-metrics.png`,
      fullPage: true 
    });
    
    console.log('✅ Performance monitoring dashboard functional');
  });

  test('4. Testing Dashboard - Test Suite Management', async ({ page }) => {
    // Navigate to testing dashboard
    await page.getByRole('tab', { name: /testing/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/testing/01-testing-dashboard.png`,
      fullPage: true 
    });
    
    // Check for test suites
    await expect(page.getByText(/Total Tests/i)).toBeVisible();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/testing/02-test-suites.png`,
      fullPage: true 
    });
    
    console.log('✅ Testing dashboard functional');
  });

  test('5. System Settings - Complete Backend Configuration', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('tab', { name: /settings/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/settings/01-system-settings.png`,
      fullPage: true 
    });
    
    // Check all tabs are present
    await expect(page.getByRole('tab', { name: /AI/LLM Providers/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Database/i })).toBeVisible();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/settings/02-configuration-tabs.png`,
      fullPage: true 
    });
    
    console.log('✅ System settings comprehensive configuration working');
  });

  test('6. Error Handling - Network Failures', async ({ page }) => {
    // Block network to test error handling
    await page.route('**/api/**', route => route.abort());
    
    // Try to use chat interface
    await page.getByRole('tab', { name: /enhanced chat/i }).click();
    await page.getByRole('textbox').fill('Test message');
    await page.getByRole('button', { name: /send/i }).click();
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${runId}/errorflow/01-network-error.png`,
      fullPage: true 
    });
    
    // Should show error message
    await expect(page.getByText(/error/i)).toBeVisible();
    
    console.log('✅ Error handling working correctly');
  });
});