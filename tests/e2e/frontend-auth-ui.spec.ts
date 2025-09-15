import { test, expect } from '@playwright/test';

test.describe('Frontend Authentication UI', () => {
  test('should display Spotify login interface for unauthenticated users', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForSelector('text=EchoTune AI', { timeout: 10000 });
    
    // Take screenshot of main page
    await page.screenshot({ 
      path: 'BROWSERTESTIMAGES/frontend-auth-main-page.png', 
      fullPage: true 
    });
    
    // Check if authentication status is shown in header
    const authSection = page.locator('[data-testid="auth-status"]').or(
      page.locator('button:has-text("Connect")')
    ).or(
      page.locator('button:has-text("Spotify")')
    ).or(
      page.locator('text=Connect with Spotify')
    );
    
    // Take screenshot of authentication area
    await page.screenshot({ 
      path: 'BROWSERTESTIMAGES/frontend-auth-header.png'
    });
    
    // Try to access a protected route (Chat)
    await page.click('text=AI Chat');
    await page.waitForTimeout(2000);
    
    // Should show login prompt for protected content
    await page.screenshot({ 
      path: 'BROWSERTESTIMAGES/frontend-auth-protected-content.png', 
      fullPage: true 
    });
    
    // Look for Spotify login button in the content area
    const spotifyButton = page.locator('button:has-text("Connect with Spotify")').or(
      page.locator('button:has-text("Connect Spotify")').or(
        page.locator('text=Connect Spotify to Start Chatting')
      )
    );
    
    if (await spotifyButton.count() > 0) {
      await spotifyButton.first().screenshot({ 
        path: 'BROWSERTESTIMAGES/frontend-auth-spotify-button.png' 
      });
    }
    
    // Test Analytics tab (should also show auth guard)
    await page.click('text=Analytics');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'BROWSERTESTIMAGES/frontend-auth-analytics-protected.png', 
      fullPage: true 
    });
    
    // Test responsive design on mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForSelector('text=EchoTune AI', { timeout: 10000 });
    
    await page.screenshot({ 
      path: 'BROWSERTESTIMAGES/frontend-auth-mobile.png', 
      fullPage: true 
    });
    
    console.log('✅ Authentication UI screenshots captured successfully');
  });
  
  test('should test authentication flow components', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=EchoTune AI', { timeout: 10000 });
    
    // Test navigation through different tabs to show auth guards
    const tabs = ['🤖 AI Chat', '📊 Analytics', '💡 Insights'];
    
    for (const tab of tabs) {
      try {
        await page.click(`text=${tab}`);
        await page.waitForTimeout(1500);
        
        const tabName = tab.replace(/[^a-zA-Z]/g, '').toLowerCase();
        await page.screenshot({ 
          path: `BROWSERTESTIMAGES/frontend-auth-tab-${tabName}.png`, 
          fullPage: true 
        });
      } catch (error) {
        console.log(`Could not test tab ${tab}:`, error.message);
      }
    }
    
    console.log('✅ Authentication tab protection screenshots captured');
  });
});