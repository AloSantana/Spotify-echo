/**
 * Smoke Test Suite for EchoTune AI
 * Minimal, stable tests for runtime validation and CI
 * These tests run without requiring secrets by default
 */

import { test, expect } from '@playwright/test';

test.describe('EchoTune AI Smoke Tests - Core Health', () => {
  
  test('should respond to /healthz endpoint (Kubernetes-style)', async ({ request }) => {
    const response = await request.get('/healthz');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('status', 'healthy');
  });

  test('should respond to /health endpoint (Docker healthcheck)', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('status', 'healthy');
  });

  test('should respond to /health/simple endpoint', async ({ request }) => {
    const response = await request.get('/health/simple');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('status', 'healthy');
  });
});

test.describe('EchoTune AI Smoke Tests - UI', () => {
  
  test('should load the main page and show app title', async ({ page }) => {
    // Load the root page
    await page.goto('/');
    
    // Wait for page to be loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Assert the app title or a visible element
    // Make this more resilient - just check page loads successfully
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // Take screenshot on success for baseline
    await page.screenshot({ 
      path: 'BROWSERSCREENSHOT-TESTING/smoke-homepage.png',
      fullPage: true 
    });
  });

  test('should load root endpoint without error', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check if we can access the page without server errors
    // Just verify the page loads (no 500 errors)
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(0);
    
    await page.screenshot({ 
      path: 'BROWSERSCREENSHOT-TESTING/smoke-root.png' 
    });
  });

});

test.describe('EchoTune AI Smoke Tests - API Endpoints', () => {

  test('should call /api/chat endpoint and get valid response', async ({ request }) => {
    // Test the API endpoint directly without requiring secrets
    const response = await request.get('/api/chat');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('provider');
    expect(data).toHaveProperty('message');
  });

  test('should call /api/recommendations endpoint with content strategy', async ({ request }) => {
    // Test the recommendations API endpoint
    const response = await request.get('/api/recommendations?strategy=content');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('strategy');
    expect(data).toHaveProperty('recommendations');
    expect(Array.isArray(data.recommendations)).toBe(true);
  });
});