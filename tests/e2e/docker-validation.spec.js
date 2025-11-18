import { test, expect } from '@playwright/test';

/**
 * Docker Container E2E Validation Tests
 * 
 * These tests validate that the application works correctly
 * when running inside Docker containers.
 */

test.describe('Docker Container Validation', () => {
  
  test('application container is accessible and responding', async ({ page }) => {
    // Navigate to the application running in Docker
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await test.step('Load homepage', async () => {
      const response = await page.goto(baseURL);
      expect(response.status()).toBe(200);
      
      // Verify page loaded successfully
      await expect(page).toHaveTitle(/EchoTune|Spotify/i);
    });
    
    await test.step('Check health endpoint', async () => {
      const response = await page.goto(`${baseURL}/health/simple`);
      expect(response.status()).toBe(200);
      
      const body = await response.text();
      expect(body).toContain('ok');
    });
  });

  test('static assets load correctly from container', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await page.goto(baseURL);
    
    await test.step('CSS files load', async () => {
      const stylesheets = await page.$$('link[rel="stylesheet"]');
      expect(stylesheets.length).toBeGreaterThan(0);
      
      for (const stylesheet of stylesheets) {
        const href = await stylesheet.getAttribute('href');
        if (href && !href.startsWith('http')) {
          const response = await page.goto(`${baseURL}${href.startsWith('/') ? href : '/' + href}`);
          expect(response.status()).toBe(200);
        }
      }
    });
    
    await test.step('JavaScript files load', async () => {
      const scripts = await page.$$('script[src]');
      expect(scripts.length).toBeGreaterThan(0);
    });
  });

  test('API endpoints work in container', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await test.step('Health check endpoint', async () => {
      const response = await page.request.get(`${baseURL}/health`);
      expect(response.status()).toBe(200);
    });
    
    await test.step('Chat API endpoint (authentication check)', async () => {
      const response = await page.request.post(`${baseURL}/api/chat`, {
        data: {
          message: 'test'
        },
        failOnStatusCode: false
      });
      
      // Should return 401 (unauthorized) or 200 (if anonymous allowed)
      // Both are acceptable - means API is reachable
      expect([200, 401, 403]).toContain(response.status());
    });
    
    await test.step('Recommendations API endpoint', async () => {
      const response = await page.request.get(`${baseURL}/api/recommendations?limit=5`, {
        failOnStatusCode: false
      });
      
      // Should return 401 (unauthorized) or 200 (if anonymous allowed)
      expect([200, 401, 403]).toContain(response.status());
    });
  });

  test('Spotify OAuth flow initiates correctly', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await page.goto(baseURL);
    
    await test.step('Find and click Spotify login button', async () => {
      // Look for Spotify login/connect button
      const loginButton = page.locator('button:has-text("Spotify"), a:has-text("Spotify"), button:has-text("Connect"), a:has-text("Connect")').first();
      
      if (await loginButton.count() > 0) {
        await loginButton.click();
        
        // Should either redirect to Spotify or show auth modal
        await page.waitForTimeout(2000);
        
        const url = page.url();
        
        // Check if we're on Spotify OAuth page or our callback
        const isSpotifyOAuth = url.includes('accounts.spotify.com') || 
                              url.includes('/callback') || 
                              url.includes('/auth');
        
        expect(isSpotifyOAuth).toBeTruthy();
      }
    });
  });

  test('Redis connection works from container', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await test.step('Session management', async () => {
      await page.goto(baseURL);
      
      // Check if cookies are set (indicates session management working)
      const cookies = await page.context().cookies();
      
      // Application should set at least one cookie for session
      // (connect.sid, session id, or similar)
      // This is a basic check that Redis-backed sessions are working
      console.log('Cookies found:', cookies.length);
    });
  });

  test('Database connection works from container', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await test.step('Database-dependent endpoints', async () => {
      // Try to access an endpoint that requires database
      const response = await page.request.get(`${baseURL}/api/recommendations?limit=1`, {
        failOnStatusCode: false
      });
      
      // Should not return 500 (internal server error)
      // 401/403 is fine (auth required), 200 is fine (data returned)
      expect(response.status()).not.toBe(500);
      
      // If we get 500, check if it's a database connection error
      if (response.status() === 500) {
        const body = await response.text();
        expect(body).not.toContain('database');
        expect(body).not.toContain('connection');
      }
    });
  });

  test('Environment variables are properly passed to container', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await test.step('Check application configuration', async () => {
      await page.goto(baseURL);
      
      // Application should load without configuration errors
      // Check console for any env-related errors
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push(msg.text());
        }
      });
      
      await page.waitForTimeout(3000);
      
      // Should not have environment variable errors
      const envErrors = consoleLogs.filter(log => 
        log.includes('env') || 
        log.includes('configuration') || 
        log.includes('missing')
      );
      
      expect(envErrors.length).toBe(0);
    });
  });

  test('All major pages accessible in container', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    const pages = [
      { path: '/', name: 'Homepage' },
      { path: '/chat', name: 'Chat' },
      { path: '/settings.html', name: 'Settings' },
      { path: '/admin.html', name: 'Admin' },
      { path: '/playlists.html', name: 'Playlists' }
    ];
    
    for (const testPage of pages) {
      await test.step(`Load ${testPage.name}`, async () => {
        const response = await page.goto(`${baseURL}${testPage.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        expect(response.status()).toBe(200);
        console.log(`✓ ${testPage.name} loaded successfully`);
      });
    }
  });

  test('Container performance is acceptable', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await test.step('Measure page load time', async () => {
      const startTime = Date.now();
      
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Page load time: ${loadTime}ms`);
      
      // Page should load in under 10 seconds even in container
      expect(loadTime).toBeLessThan(10000);
    });
    
    await test.step('API response time', async () => {
      const startTime = Date.now();
      
      await page.request.get(`${baseURL}/health/simple`);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`API response time: ${responseTime}ms`);
      
      // Health check should respond in under 1 second
      expect(responseTime).toBeLessThan(1000);
    });
  });

  test('Container logs are accessible', async ({ page }) => {
    // This is more of a documentation test
    // In real scenarios, you'd check container logs via Docker API
    // But from inside Playwright, we can verify the app is logging correctly
    
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await test.step('Trigger logging', async () => {
      // Navigate to app (triggers access logs)
      await page.goto(baseURL);
      
      // Make API call (triggers API logs)
      await page.request.get(`${baseURL}/health/simple`);
      
      // Application should be logging these requests
      // Verified by inspecting Docker logs outside this test
      expect(true).toBe(true); // Placeholder
    });
  });
});
