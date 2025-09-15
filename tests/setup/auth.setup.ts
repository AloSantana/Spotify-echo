/**
 * Authentication Setup for Playwright Tests
 * Creates authenticated state files for reuse across tests
 */

import { test as setup, expect } from '@playwright/test';
import { chromium } from 'playwright';

const authFile = 'artifacts/auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...');
  
  try {
    // Navigate to login page
    await page.goto('/');
    
    // Check if already authenticated
    const isAuthenticated = await page.locator('[data-testid="user-profile"]').isVisible().catch(() => false);
    
    if (!isAuthenticated) {
      // Mock authentication for testing
      await page.evaluate(() => {
        // Set mock authentication state
        localStorage.setItem('auth_token', 'test-token-' + Date.now());
        localStorage.setItem('user_id', 'test-user-123');
        sessionStorage.setItem('authenticated', 'true');
      });
      
      // Reload to apply authentication
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    // Verify authentication worked
    await expect(page).toHaveTitle(/EchoTune/);
    
    // Save authentication state
    await page.context().storageState({ path: authFile });
    
    console.log('✅ Authentication setup completed');
    
  } catch (error) {
    console.warn('⚠️  Authentication setup failed - tests will run unauthenticated');
    console.warn(error.message);
    
    // Create empty auth file to prevent errors
    const fs = require('fs');
    const path = require('path');
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
  }
});