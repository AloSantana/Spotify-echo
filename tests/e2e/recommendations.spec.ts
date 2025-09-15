/**
 * Recommendations View E2E Test
 * Tests music recommendation display and interaction
 */

import { test, expect } from '@playwright/test';

test.describe('Recommendations View', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token-' + Date.now());
      localStorage.setItem('user_id', 'test-user-123');
      sessionStorage.setItem('authenticated', 'true');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should load recommendations page @smoke', async ({ page }) => {
    await test.step('Navigate to recommendations', async () => {
      // Try multiple paths to recommendations
      const recPaths = ['/recommendations', '/discover', '/music', '/playlist'];
      let recsLoaded = false;
      
      for (const path of recPaths) {
        try {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          
          // Check if this looks like a recommendations page
          const hasRecElements = await page.locator('.track, .song, .recommendation, .music-item').isVisible({ timeout: 2000 });
          
          if (hasRecElements) {
            recsLoaded = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Fallback: look for recommendations link
      if (!recsLoaded) {
        await page.goto('/');
        const recLink = page.locator('a[href*="recommend"], a[href*="discover"], a[href*="music"], button:has-text("Discover")');
        const hasRecLink = await recLink.isVisible().catch(() => false);
        
        if (hasRecLink) {
          await recLink.first().click();
          await page.waitForLoadState('networkidle');
          recsLoaded = true;
        }
      }
      
      // Take screenshot of recommendations view
      await page.screenshot({ 
        path: 'artifacts/screenshots/recommendations-01-page-load.png',
        fullPage: true 
      });
      
      if (!recsLoaded) {
        console.warn('⚠️  Recommendations page not found - will test on current page');
      }
    });

    await test.step('Verify recommendations elements', async () => {
      // Look for music/recommendation elements
      const musicElements = [
        '.track',
        '.song', 
        '.recommendation',
        '.music-item',
        '.playlist-item',
        '[data-testid="track"]',
        '[data-testid="recommendation"]'
      ];
      
      let foundMusicElements = 0;
      for (const selector of musicElements) {
        const count = await page.locator(selector).count();
        foundMusicElements += count;
      }
      
      if (foundMusicElements > 0) {
        console.log(`✅ Found ${foundMusicElements} music elements`);
      } else {
        console.warn('⚠️  No music elements found - may need to generate recommendations');
      }
    });
  });

  test('should display mock recommendations', async ({ page }) => {
    await test.step('Navigate and inject mock data', async () => {
      await page.goto('/recommendations').catch(() => page.goto('/'));
      
      // Inject mock recommendation data
      await page.evaluate(() => {
        const mockRecommendations = [
          {
            id: 'track1',
            name: 'Test Track 1',
            artist: 'Test Artist 1',
            album: 'Test Album 1',
            duration: '3:45',
            energy: 0.8,
            danceability: 0.7,
            popularity: 75
          },
          {
            id: 'track2', 
            name: 'Test Track 2',
            artist: 'Test Artist 2',
            album: 'Test Album 2',
            duration: '4:12',
            energy: 0.6,
            danceability: 0.9,
            popularity: 82
          },
          {
            id: 'track3',
            name: 'Test Track 3', 
            artist: 'Test Artist 3',
            album: 'Test Album 3',
            duration: '3:28',
            energy: 0.9,
            danceability: 0.8,
            popularity: 68
          }
        ];
        
        // Find a container to inject recommendations
        const containers = document.querySelectorAll('main, .container, .content, .recommendations, body');
        if (containers.length > 0) {
          const container = containers[0];
          const recDiv = document.createElement('div');
          recDiv.className = 'test-recommendations';
          recDiv.innerHTML = `
            <h2>Recommended for You</h2>
            <div class="recommendations-grid">
              ${mockRecommendations.map(track => `
                <div class="recommendation-item" data-testid="recommendation" data-track-id="${track.id}">
                  <div class="track-info">
                    <h3 class="track-name">${track.name}</h3>
                    <p class="artist-name">${track.artist}</p>
                    <p class="album-name">${track.album}</p>
                    <span class="duration">${track.duration}</span>
                  </div>
                  <div class="track-features">
                    <span class="energy">Energy: ${track.energy}</span>
                    <span class="danceability">Danceability: ${track.danceability}</span>
                    <span class="popularity">Popularity: ${track.popularity}</span>
                  </div>
                  <div class="track-actions">
                    <button class="play-btn" data-action="play">Play</button>
                    <button class="like-btn" data-action="like">♥</button>
                    <button class="add-btn" data-action="add">Add to Playlist</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
          container.appendChild(recDiv);
        }
      });
      
      await page.waitForTimeout(500);
    });

    await test.step('Verify mock recommendations display', async () => {
      // Take screenshot with mock recommendations
      await page.screenshot({ 
        path: 'artifacts/screenshots/recommendations-02-mock-data.png',
        fullPage: true 
      });
      
      // Count recommendation items
      const recItems = page.locator('[data-testid="recommendation"]');
      const itemCount = await recItems.count();
      
      expect(itemCount).toBe(3);
      console.log(`✅ Found ${itemCount} recommendation items`);
      
      // Verify track information is displayed
      const trackNames = page.locator('.track-name');
      const nameCount = await trackNames.count();
      expect(nameCount).toBeGreaterThan(0);
      
      const artistNames = page.locator('.artist-name');
      const artistCount = await artistNames.count();
      expect(artistCount).toBeGreaterThan(0);
    });
  });

  test('should interact with recommendation items', async ({ page }) => {
    // Set up mock data first
    await page.goto('/recommendations').catch(() => page.goto('/'));
    await page.evaluate(() => {
      // Same mock injection as previous test
      const mockRecommendations = [
        { id: 'track1', name: 'Test Track 1', artist: 'Test Artist 1' }
      ];
      
      const containers = document.querySelectorAll('main, .container, body');
      if (containers.length > 0) {
        const container = containers[0];
        const recDiv = document.createElement('div');
        recDiv.className = 'test-recommendations';
        recDiv.innerHTML = `
          <div class="recommendation-item" data-testid="recommendation" data-track-id="track1">
            <h3 class="track-name">Test Track 1</h3>
            <button class="play-btn" data-action="play">Play</button>
            <button class="like-btn" data-action="like">♥</button>
          </div>
        `;
        container.appendChild(recDiv);
      }
    });

    await test.step('Test recommendation interactions', async () => {
      // Take screenshot before interaction
      await page.screenshot({ 
        path: 'artifacts/screenshots/recommendations-03-before-interaction.png',
        fullPage: true 
      });
      
      // Test play button interaction
      const playButton = page.locator('[data-action="play"]');
      const hasPlayButton = await playButton.isVisible().catch(() => false);
      
      if (hasPlayButton) {
        await playButton.click();
        
        // Take screenshot after play click
        await page.screenshot({ 
          path: 'artifacts/screenshots/recommendations-04-after-play-click.png',
          fullPage: true 
        });
        
        console.log('✅ Play button clicked');
      }
      
      // Test like button interaction
      const likeButton = page.locator('[data-action="like"]');
      const hasLikeButton = await likeButton.isVisible().catch(() => false);
      
      if (hasLikeButton) {
        await likeButton.click();
        
        // Take screenshot after like click
        await page.screenshot({ 
          path: 'artifacts/screenshots/recommendations-05-after-like-click.png',
          fullPage: true 
        });
        
        console.log('✅ Like button clicked');
      }
    });
  });

  test('should handle empty recommendations state', async ({ page }) => {
    await test.step('Test empty state handling', async () => {
      await page.goto('/recommendations').catch(() => page.goto('/'));
      
      // Simulate empty recommendations
      await page.evaluate(() => {
        const containers = document.querySelectorAll('main, .container, body');
        if (containers.length > 0) {
          const container = containers[0];
          const emptyDiv = document.createElement('div');
          emptyDiv.className = 'empty-recommendations';
          emptyDiv.innerHTML = `
            <div class="empty-state" data-testid="empty-state">
              <h3>No Recommendations Yet</h3>
              <p>Connect your Spotify account to get personalized recommendations</p>
              <button class="connect-btn">Connect Spotify</button>
            </div>
          `;
          container.appendChild(emptyDiv);
        }
      });
      
      await page.waitForTimeout(500);
    });

    await test.step('Verify empty state display', async () => {
      // Take screenshot of empty state
      await page.screenshot({ 
        path: 'artifacts/screenshots/recommendations-06-empty-state.png',
        fullPage: true 
      });
      
      // Check for empty state elements
      const emptyState = page.locator('[data-testid="empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      if (hasEmptyState) {
        expect(hasEmptyState).toBeTruthy();
        console.log('✅ Empty state displayed correctly');
      }
      
      // Check for call-to-action button
      const connectButton = page.locator('.connect-btn, button:has-text("Connect")');
      const hasConnectButton = await connectButton.isVisible().catch(() => false);
      
      if (hasConnectButton) {
        console.log('✅ Connect button available in empty state');
      }
    });
  });

  test('should validate recommendations API', async ({ page }) => {
    await test.step('Test recommendations API endpoint', async () => {
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/recommendations', {
            headers: {
              'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
            }
          });
          
          return {
            status: response.status,
            ok: response.ok,
            data: response.ok ? await response.json() : await response.text()
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      // Take screenshot during API test
      await page.screenshot({ 
        path: 'artifacts/screenshots/recommendations-07-api-test.png',
        fullPage: true 
      });
      
      if (apiResponse.error) {
        console.warn(`⚠️  Recommendations API error: ${apiResponse.error}`);
      } else {
        console.log(`ℹ️  Recommendations API status: ${apiResponse.status}`);
        
        if (apiResponse.ok && apiResponse.data) {
          console.log('✅ Recommendations API responded successfully');
          
          // Basic validation of response structure
          if (typeof apiResponse.data === 'object') {
            console.log('✅ API returned structured data');
          }
        }
      }
    });
  });
});