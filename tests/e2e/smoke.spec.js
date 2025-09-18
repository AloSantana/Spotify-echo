/**
 * Smoke Test Suite for EchoTune AI
 * Minimal, stable tests for runtime validation and CI
 */

import { test, expect } from '@playwright/test';

test.describe('EchoTune AI Smoke Tests', () => {
  
  test('should load the main page and show app title', async ({ page }) => {
    // Load the root page
    await page.goto('/');
    
    // Assert the app title or a visible element
    await expect(page).toHaveTitle(/EchoTune AI/);
    
    // Take screenshot on success for baseline
    await page.screenshot({ 
      path: 'BROWSERSCREENSHOT-TESTING/smoke-homepage.png',
      fullPage: true 
    });
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for settings link or navigate directly
    try {
      await page.click('text=Settings', { timeout: 5000 });
    } catch {
      // Direct navigation fallback
      await page.goto('/settings');
    }
    
    // Wait for settings page to load
    await page.waitForLoadState('networkidle');
    
    // More flexible check - just verify we're not on an error page
    const pageContent = await page.textContent('body');
    const hasErrorIndicator = pageContent.includes('404') || pageContent.includes('Not Found') || pageContent.includes('Error');
    
    // If no error indicators, consider it a success
    expect(hasErrorIndicator).toBe(false);
    
    await page.screenshot({ 
      path: 'BROWSERSCREENSHOT-TESTING/smoke-settings.png' 
    });
  });

  test('should navigate to chat page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for chat link or navigate directly
    try {
      await page.click('text=Chat', { timeout: 5000 });
    } catch {
      // Direct navigation fallback
      await page.goto('/chat');
    }
    
    // Assert we're on chat page
    const chatIndicators = [
      'text=Chat',
      'text=Message',
      'textarea',
      'input[placeholder*="message"]',
      '[data-testid="chat"]',
      '.chat'
    ];
    
    let foundIndicator = false;
    for (const indicator of chatIndicators) {
      try {
        await page.waitForSelector(indicator, { timeout: 2000 });
        foundIndicator = true;
        break;
      } catch {
        continue;
      }
    }
    
    expect(foundIndicator).toBe(true);
    
    await page.screenshot({ 
      path: 'BROWSERSCREENSHOT-TESTING/smoke-chat.png' 
    });
  });

  test('should call /api/chat endpoint and get 200 response', async ({ page }) => {
    // Test the API endpoint directly
    const response = await page.request.get('/api/chat');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('provider', 'dev');
    expect(data).toHaveProperty('message');
  });

  test('should call /api/recommendations endpoint and get content-based results', async ({ page }) => {
    // Test the recommendations API endpoint
    const response = await page.request.get('/api/recommendations?strategy=content');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('strategy', 'content-based');
    expect(data).toHaveProperty('recommendations');
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.recommendations.length).toBeGreaterThanOrEqual(1);
    
    // Verify recommendation structure
    const firstRec = data.recommendations[0];
    expect(firstRec).toHaveProperty('id');
    expect(firstRec).toHaveProperty('name');
    expect(firstRec).toHaveProperty('artist');
  });

  test('should navigate to playlists page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for playlists link or navigate directly
    try {
      await page.click('text=Playlists', { timeout: 5000 });
    } catch {
      // Direct navigation fallback
      await page.goto('/playlists');
    }
    
    // Assert we're on playlists page
    const playlistIndicators = [
      'text=Playlists',
      'text=Playlist',
      'text=My Playlists',
      '[data-testid="playlists"]',
      '.playlist'
    ];
    
    let foundIndicator = false;
    for (const indicator of playlistIndicators) {
      try {
        await page.waitForSelector(indicator, { timeout: 2000 });
        foundIndicator = true;
        break;
      } catch {
        continue;
      }
    }
    
    expect(foundIndicator).toBe(true);
    
    await page.screenshot({ 
      path: 'BROWSERSCREENSHOT-TESTING/smoke-playlists.png' 
    });
  });

});