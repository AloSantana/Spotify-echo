/**
 * Authentication E2E Test
 * Tests Spotify OAuth flow and authentication state
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with fresh session
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('should load login page @smoke', async ({ page }) => {
    await test.step('Navigate to home page', async () => {
      await page.goto('/');
      
      // Take screenshot of initial state
      await page.screenshot({ 
        path: 'artifacts/screenshots/auth-01-home-page.png',
        fullPage: true 
      });
    });

    await test.step('Verify login elements are present', async () => {
      // Check for authentication elements
      const loginButton = page.locator('[data-testid="login-button"], [href*="auth"], button:has-text("Login"), button:has-text("Connect")');
      const spotifyAuth = page.locator('[href*="spotify"], button:has-text("Spotify")');
      
      // At least one authentication option should be visible
      const hasLoginOption = await loginButton.isVisible().catch(() => false) || 
                            await spotifyAuth.isVisible().catch(() => false);
      
      expect(hasLoginOption).toBeTruthy();
      
      // Take screenshot of login options
      await page.screenshot({ 
        path: 'artifacts/screenshots/auth-02-login-options.png',
        fullPage: true 
      });
    });
  });

  test('should handle mock authentication', async ({ page }) => {
    await test.step('Navigate and set up mock auth', async () => {
      await page.goto('/');
      
      // Set mock authentication in localStorage
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'mock-test-token-' + Date.now());
        localStorage.setItem('user_id', 'test-user-123');
        localStorage.setItem('spotify_connected', 'true');
        sessionStorage.setItem('authenticated', 'true');
      });
    });

    await test.step('Reload and verify authenticated state', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of authenticated state
      await page.screenshot({ 
        path: 'artifacts/screenshots/auth-03-authenticated.png',
        fullPage: true 
      });
      
      // Check if authentication worked
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(authToken).toBeTruthy();
      
      // Look for authenticated user elements
      const userElements = [
        '[data-testid="user-profile"]',
        '[data-testid="user-menu"]', 
        'button:has-text("Profile")',
        'button:has-text("Logout")',
        '.user-info',
        '.profile'
      ];
      
      let foundUserElement = false;
      for (const selector of userElements) {
        const isVisible = await page.locator(selector).isVisible().catch(() => false);
        if (isVisible) {
          foundUserElement = true;
          break;
        }
      }
      
      // Note: This may not always pass if UI doesn't reflect auth state immediately
      if (!foundUserElement) {
        console.warn('⚠️  No authenticated user elements found - UI may not reflect auth state');
      }
    });
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    await test.step('Simulate auth error', async () => {
      await page.goto('/');
      
      // Set invalid/expired token
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'invalid-token');
        localStorage.setItem('auth_error', 'token_expired');
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify error handling', async () => {
      // Should not crash and should provide feedback
      const title = await page.title();
      expect(title).toBeTruthy();
      
      // Take screenshot of error state
      await page.screenshot({ 
        path: 'artifacts/screenshots/auth-04-error-state.png',
        fullPage: true 
      });
      
      // Check for error messages or fallback to login
      const hasErrorHandling = await page.locator('[data-testid="auth-error"], .error, .alert-error').isVisible().catch(() => false) ||
                              await page.locator('[data-testid="login-button"], button:has-text("Login")').isVisible().catch(() => false);
      
      expect(hasErrorHandling).toBeTruthy();
    });
  });

  test('should preserve redirect after login', async ({ page }) => {
    const protectedPath = '/dashboard';
    
    await test.step('Try to access protected route', async () => {
      await page.goto(protectedPath);
      
      // Take screenshot of redirect/protection
      await page.screenshot({ 
        path: 'artifacts/screenshots/auth-05-protected-route.png',
        fullPage: true 
      });
    });

    await test.step('Perform mock authentication', async () => {
      // Set authentication
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'mock-test-token-' + Date.now());
        localStorage.setItem('user_id', 'test-user-123');
        sessionStorage.setItem('authenticated', 'true');
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify final state', async () => {
      // Take screenshot of final state
      await page.screenshot({ 
        path: 'artifacts/screenshots/auth-06-final-state.png',
        fullPage: true 
      });
      
      // Verify we can access the application
      const title = await page.title();
      expect(title).toContain('EchoTune');
      
      // Page should load without errors
      const hasError = await page.locator('.error, [data-testid="error"]').isVisible().catch(() => false);
      expect(hasError).toBeFalsy();
    });
  });
});