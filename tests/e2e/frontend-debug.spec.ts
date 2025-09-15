import { test, expect } from '@playwright/test';

test.describe('Frontend Debug', () => {
  test('should debug frontend loading issues', async ({ page }) => {
    // Listen for console messages
    page.on('console', (msg) => {
      console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.log(`PAGE ERROR: ${error.message}`);
    });

    // Navigate to the app
    console.log('Navigating to app...');
    await page.goto('http://localhost:3000');
    
    // Wait a moment for the app to load
    await page.waitForTimeout(5000);
    
    // Take a screenshot
    await page.screenshot({ path: 'BROWSERTESTIMAGES/frontend-debug.png', fullPage: true });
    
    // Check what's actually on the page
    const content = await page.textContent('body');
    console.log('Page content:', content?.substring(0, 500));
    
    // Check if React is loaded
    const reactLoaded = await page.evaluate(() => {
      return typeof window.React !== 'undefined' || document.querySelector('#root').children.length > 0;
    });
    console.log('React loaded:', reactLoaded);
    
    // Try to find navigation elements
    const navElements = await page.locator('nav, [role="navigation"], .MuiTabs-root').count();
    console.log('Navigation elements found:', navElements);
    
    // Try to find any buttons
    const buttons = await page.locator('button').count();
    console.log('Buttons found:', buttons);
    
    // Check for any error messages
    const errors = await page.locator('[role="alert"], .error, .alert').count();
    console.log('Error elements found:', errors);
  });
});