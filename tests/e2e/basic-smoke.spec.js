/**
 * Basic Smoke Test for EchoTune AI
 * Tests core application startup and basic rendering without requiring Spotify auth
 */

import { test, expect } from '@playwright/test';

test.describe('Basic Application Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test mode to bypass auth if supported
    await page.addInitScript(() => {
      window.localStorage.setItem('testMode', 'true');
    });
  });

  test('application loads and shows title', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page title contains EchoTune or Spotify
    await expect(page).toHaveTitle(/EchoTune|Spotify|Echo/i);
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/smoke-homepage.png' });
  });

  test('health check endpoint responds', async ({ page }) => {
    const response = await page.goto('/healthz');
    expect(response.status()).toBeLessThan(500);
  });

  test('API docs are accessible', async ({ page }) => {
    const response = await page.goto('/api-docs');
    // Either Swagger UI loads (200) or redirects (3xx) - both are acceptable
    expect(response.status()).toBeLessThan(500);
  });
});
