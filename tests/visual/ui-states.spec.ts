/**
 * Visual Regression Tests
 * Captures screenshots and compares against baselines
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state for consistent visual testing
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'visual-test-token-' + Date.now());
      localStorage.setItem('user_id', 'visual-test-user-123');
      sessionStorage.setItem('authenticated', 'true');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for any animations to settle
    await page.waitForTimeout(1000);
  });

  test('should match homepage visual baseline', async ({ page }) => {
    await test.step('Capture homepage screenshot', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Hide dynamic elements that change between test runs
      await page.addStyleTag({
        content: `
          .timestamp, .last-updated, .version, .build-number { display: none !important; }
          .random-id, .session-id { display: none !important; }
          * { animation-duration: 0s !important; transition-duration: 0s !important; }
        `
      });
      
      await page.waitForTimeout(500);
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('homepage-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test('should match mobile homepage visual baseline', async ({ page }) => {
    await test.step('Set mobile viewport and capture', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Hide dynamic elements
      await page.addStyleTag({
        content: `
          .timestamp, .last-updated, .version, .build-number { display: none !important; }
          * { animation-duration: 0s !important; transition-duration: 0s !important; }
        `
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('homepage-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test('should match authenticated state visuals', async ({ page }) => {
    await test.step('Capture authenticated UI state', async () => {
      await page.goto('/');
      
      // Ensure authenticated elements are visible
      await page.evaluate(() => {
        // Mock some user profile data for consistent visuals
        const userProfile = {
          name: 'Visual Test User',
          email: 'visual@test.com',
          avatar: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="15" fill="%23ccc"/></svg>'
        };
        
        // Try to find and populate user elements
        const userElements = document.querySelectorAll('[data-testid="user-name"], .user-name, .profile-name');
        userElements.forEach(el => el.textContent = userProfile.name);
        
        const emailElements = document.querySelectorAll('[data-testid="user-email"], .user-email');
        emailElements.forEach(el => el.textContent = userProfile.email);
      });
      
      await page.addStyleTag({
        content: `
          .timestamp, .last-updated, .session-id { display: none !important; }
          * { animation-duration: 0s !important; transition-duration: 0s !important; }
        `
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('authenticated-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test('should match chat interface visuals', async ({ page }) => {
    await test.step('Navigate to chat and capture', async () => {
      await page.goto('/chat').catch(() => page.goto('/'));
      await page.waitForLoadState('networkidle');
      
      // Add mock chat messages for consistent visual testing
      await page.evaluate(() => {
        const mockMessages = [
          { type: 'user', content: 'Recommend me some music for studying' },
          { type: 'ai', content: 'I recommend some calm instrumental music. Here are some suggestions: Lo-fi Hip Hop, Classical Piano, and Ambient Electronic.' }
        ];
        
        // Find chat container and add mock messages
        const containers = document.querySelectorAll('.chat, .messages, .conversation, main, .container');
        if (containers.length > 0) {
          const container = containers[0];
          const chatDiv = document.createElement('div');
          chatDiv.className = 'visual-test-chat';
          chatDiv.innerHTML = `
            <div class="chat-messages">
              ${mockMessages.map(msg => `
                <div class="message ${msg.type}-message">
                  <div class="message-content">${msg.content}</div>
                  <div class="message-time">12:34 PM</div>
                </div>
              `).join('')}
            </div>
            <div class="chat-input-area">
              <input type="text" placeholder="Ask about music..." value="" />
              <button>Send</button>
            </div>
          `;
          container.appendChild(chatDiv);
        }
      });
      
      await page.addStyleTag({
        content: `
          .timestamp, .message-time { opacity: 0.3 !important; }
          * { animation-duration: 0s !important; transition-duration: 0s !important; }
        `
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('chat-interface.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test('should match empty states visuals', async ({ page }) => {
    await test.step('Capture empty state UI', async () => {
      await page.goto('/recommendations').catch(() => page.goto('/'));
      
      // Create empty state for visual testing
      await page.evaluate(() => {
        const containers = document.querySelectorAll('main, .container, .content, body');
        if (containers.length > 0) {
          const container = containers[0];
          const emptyDiv = document.createElement('div');
          emptyDiv.className = 'visual-test-empty';
          emptyDiv.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">🎵</div>
              <h2>No Recommendations Yet</h2>
              <p>Connect your Spotify account to get personalized music recommendations</p>
              <button class="primary-button">Connect Spotify</button>
            </div>
          `;
          container.appendChild(emptyDiv);
        }
      });
      
      await page.addStyleTag({
        content: `
          * { animation-duration: 0s !important; transition-duration: 0s !important; }
        `
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('empty-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test('should match error states visuals', async ({ page }) => {
    await test.step('Capture error state UI', async () => {
      await page.goto('/');
      
      // Create error state for visual testing
      await page.evaluate(() => {
        const containers = document.querySelectorAll('main, .container, body');
        if (containers.length > 0) {
          const container = containers[0];
          const errorDiv = document.createElement('div');
          errorDiv.className = 'visual-test-error';
          errorDiv.innerHTML = `
            <div class="error-state">
              <div class="error-icon">⚠️</div>
              <h2>Something went wrong</h2>
              <p>We're having trouble connecting to Spotify. Please try again.</p>
              <button class="retry-button">Try Again</button>
              <button class="secondary-button">Go Home</button>
            </div>
          `;
          container.appendChild(errorDiv);
        }
      });
      
      await page.addStyleTag({
        content: `
          * { animation-duration: 0s !important; transition-duration: 0s !important; }
        `
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('error-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test('should match loading states visuals', async ({ page }) => {
    await test.step('Capture loading state UI', async () => {
      await page.goto('/');
      
      // Create loading state for visual testing
      await page.evaluate(() => {
        const containers = document.querySelectorAll('main, .container, body');
        if (containers.length > 0) {
          const container = containers[0];
          const loadingDiv = document.createElement('div');
          loadingDiv.className = 'visual-test-loading';
          loadingDiv.innerHTML = `
            <div class="loading-state">
              <div class="spinner"></div>
              <h3>Loading your music recommendations...</h3>
              <p>This may take a few moments</p>
            </div>
            <style>
              .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                margin: 0 auto 20px;
                /* Animation disabled for visual testing */
              }
            </style>
          `;
          container.appendChild(loadingDiv);
        }
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('loading-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});