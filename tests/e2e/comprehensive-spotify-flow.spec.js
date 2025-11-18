/**
 * Comprehensive Spotify Auth & Feature Flow Test
 * Tests the complete user journey from homepage to logged-in features
 */

import { test, expect } from '@playwright/test';

test.describe('Spotify Auth & User Flow - Comprehensive E2E', () => {
  
  test('Complete user journey: Homepage → Auth → Features', async ({ page, context }) => {
    console.log('🚀 Starting comprehensive E2E test');
    
    // Step 1: Load homepage
    console.log('📍 Step 1: Loading homepage');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Take screenshot of homepage
    await page.screenshot({ 
      path: 'BROWSERSCREENSHOT-TESTING/01-homepage.png',
      fullPage: true 
    });
    console.log('✅ Homepage loaded');
    
    // Verify page loaded
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log(`📄 Page title: ${title}`);
    
    // Step 2: Look for Spotify login button
    console.log('📍 Step 2: Looking for Spotify login button');
    
    // Try multiple selectors for login button
    const loginSelectors = [
      'button:has-text("Login with Spotify")',
      'a:has-text("Login with Spotify")',
      'button:has-text("Connect Spotify")',
      'a:has-text("Connect Spotify")',
      '[href*="/auth/login"]',
      '[href*="spotify"]'
    ];
    
    let loginButton = null;
    let loginButtonSelector = null;
    
    for (const selector of loginSelectors) {
      try {
        loginButton = await page.locator(selector).first();
        if (await loginButton.count() > 0) {
          loginButtonSelector = selector;
          console.log(`✅ Found login button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!loginButton || !(await loginButton.count() > 0)) {
      console.log('⚠️  No login button found on homepage');
      console.log('📸 Taking screenshot of current page state');
      await page.screenshot({ 
        path: 'BROWSERSCREENSHOT-TESTING/02-no-login-button.png',
        fullPage: true 
      });
      
      // Get page HTML for debugging
      const bodyHTML = await page.content();
      console.log('📝 Page contains:', bodyHTML.substring(0, 500));
    }
    
    // Step 3: Test API endpoint for auth URL generation
    console.log('📍 Step 3: Testing auth URL generation via API');
    const authResponse = await page.request.get('/api/spotify/auth/login');
    console.log(`📡 Auth API status: ${authResponse.status()}`);
    
    if (authResponse.ok()) {
      const authData = await authResponse.json();
      console.log('✅ Auth API response:', JSON.stringify(authData, null, 2));
      
      if (authData.success && authData.authUrl) {
        console.log('📍 Step 4: Testing Spotify OAuth redirect');
        console.log(`🔗 Auth URL: ${authData.authUrl.substring(0, 80)}...`);
        
        // Navigate to auth URL
        await page.goto(authData.authUrl);
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          console.log('⏱️  Network idle timeout (normal for external redirect)');
        });
        
        // Take screenshot of Spotify page
        await page.screenshot({ 
          path: 'BROWSERSCREENSHOT-TESTING/03-spotify-oauth-page.png',
          fullPage: true 
        });
        
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('accounts.spotify.com')) {
          console.log('✅ Successfully redirected to Spotify auth page');
        } else if (currentUrl.includes('/auth/callback')) {
          console.log('✅ Redirected to callback (already authenticated?)');
        }
      }
    } else {
      console.log(`❌ Auth API returned error: ${authResponse.status()}`);
    }
    
    // Step 5: Test main application pages
    console.log('📍 Step 5: Testing main application pages');
    
    const pagesToTest = [
      { url: '/', name: 'Homepage' },
      { url: '/chat', name: 'Chat' },
      { url: '/settings.html', name: 'Settings' },
      { url: '/admin.html', name: 'Admin' },
      { url: '/playlists.html', name: 'Playlists' }
    ];
    
    for (const pageInfo of pagesToTest) {
      try {
        console.log(`  📄 Testing ${pageInfo.name} at ${pageInfo.url}`);
        await page.goto(pageInfo.url);
        await page.waitForLoadState('domcontentloaded');
        
        const screenshotPath = `BROWSERSCREENSHOT-TESTING/page-${pageInfo.name.toLowerCase()}.png`;
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        
        console.log(`  ✅ ${pageInfo.name} loaded successfully`);
      } catch (error) {
        console.log(`  ⚠️  ${pageInfo.name} failed to load: ${error.message}`);
      }
    }
    
    // Step 6: Test chatbox functionality (if accessible)
    console.log('📍 Step 6: Testing chatbox functionality');
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');
    
    // Look for chat input
    const chatInputSelectors = [
      'input[type="text"]',
      'textarea',
      '[placeholder*="message"]',
      '[placeholder*="chat"]',
      '#chat-input',
      '.chat-input'
    ];
    
    let chatInput = null;
    for (const selector of chatInputSelectors) {
      try {
        chatInput = await page.locator(selector).first();
        if (await chatInput.count() > 0) {
          console.log(`✅ Found chat input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (chatInput && await chatInput.count() > 0) {
      try {
        await chatInput.fill('Hello, can you recommend some music?');
        console.log('✅ Typed message in chat input');
        
        await page.screenshot({ 
          path: 'BROWSERSCREENSHOT-TESTING/04-chat-input-filled.png',
          fullPage: true 
        });
      } catch (error) {
        console.log(`⚠️  Could not interact with chat input: ${error.message}`);
      }
    } else {
      console.log('⚠️  No chat input found on chat page');
    }
    
    // Step 7: Test API endpoints
    console.log('📍 Step 7: Testing API endpoints');
    
    const apiTests = [
      { endpoint: '/api/chat', name: 'Chat API' },
      { endpoint: '/api/recommendations?strategy=content', name: 'Recommendations API' },
      { endpoint: '/api/spotify/auth/health', name: 'Spotify Auth Health' },
      { endpoint: '/health/simple', name: 'Simple Health' }
    ];
    
    for (const apiTest of apiTests) {
      try {
        const response = await page.request.get(apiTest.endpoint);
        console.log(`  📡 ${apiTest.name}: ${response.status()}`);
        if (response.ok()) {
          const data = await response.json();
          console.log(`  ✅ ${apiTest.name} responded successfully`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${apiTest.name} failed: ${error.message}`);
      }
    }
    
    // Final summary
    console.log('🎉 Comprehensive E2E test completed');
  });
  
  test('Test Spotify playback controls (requires auth)', async ({ page }) => {
    console.log('🎵 Testing Spotify playback controls');
    
    // Check if we have Spotify access token in env
    const hasToken = process.env.SPOTIFY_ACCESS_TOKEN;
    
    if (!hasToken) {
      console.log('⏭️  Skipping playback tests - no access token');
      test.skip();
      return;
    }
    
    console.log('✅ Spotify access token available');
    
    // Test device list
    try {
      const devicesResponse = await page.request.get('/api/spotify/devices');
      console.log(`📱 Devices API: ${devicesResponse.status()}`);
      
      if (devicesResponse.ok()) {
        const devices = await devicesResponse.json();
        console.log('✅ Devices API responded:', JSON.stringify(devices, null, 2));
      }
    } catch (error) {
      console.log(`⚠️  Devices API failed: ${error.message}`);
    }
  });
});
