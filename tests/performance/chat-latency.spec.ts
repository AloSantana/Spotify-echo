/**
 * Chat Performance Smoke Test
 * Tests chat API latency and performance thresholds
 */

import { test, expect } from '@playwright/test';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  chatResponseTime: 5000, // 5 seconds max
  pageLoadTime: 3000,     // 3 seconds max
  apiResponseTime: 2000   // 2 seconds max
};

test.describe('Chat Performance Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'perf-test-token-' + Date.now());
      localStorage.setItem('user_id', 'perf-test-user-123');
      sessionStorage.setItem('authenticated', 'true');
    });
  });

  test('should load chat interface within performance threshold', async ({ page }) => {
    const startTime = performance.now();
    
    await test.step('Measure page load time', async () => {
      await page.goto('/chat').catch(() => page.goto('/'));
      await page.waitForLoadState('networkidle');
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      console.log(`📊 Chat page load time: ${loadTime.toFixed(2)}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime);
    });
  });

  test('should handle chat API requests within threshold', async ({ page }) => {
    await page.goto('/chat').catch(() => page.goto('/'));
    
    const latencies = [];
    const numRequests = 10;
    
    await test.step(`Perform ${numRequests} chat API requests`, async () => {
      for (let i = 0; i < numRequests; i++) {
        const startTime = performance.now();
        
        const response = await page.evaluate(async (requestNum) => {
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
              },
              body: JSON.stringify({
                message: `Performance test message ${requestNum}`,
                context: { test: true }
              })
            });
            
            return {
              status: response.status,
              ok: response.ok,
              timestamp: Date.now()
            };
          } catch (error) {
            return { error: error.message };
          }
        }, i + 1);
        
        const endTime = performance.now();
        const latency = endTime - startTime;
        latencies.push(latency);
        
        console.log(`🚀 Request ${i + 1}: ${latency.toFixed(2)}ms, Status: ${response.status || 'Error'}`);
        
        // Small delay between requests
        await page.waitForTimeout(100);
      }
    });

    await test.step('Analyze performance metrics', async () => {
      const successfulRequests = latencies.filter(l => l > 0);
      
      if (successfulRequests.length === 0) {
        console.warn('⚠️  No successful API requests - endpoint may not be available');
        return;
      }
      
      const avgLatency = successfulRequests.reduce((sum, lat) => sum + lat, 0) / successfulRequests.length;
      const maxLatency = Math.max(...successfulRequests);
      const minLatency = Math.min(...successfulRequests);
      
      // Calculate percentiles
      const sortedLatencies = successfulRequests.sort((a, b) => a - b);
      const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
      const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
      
      const stats = {
        total: numRequests,
        successful: successfulRequests.length,
        avgLatency: avgLatency.toFixed(2),
        minLatency: minLatency.toFixed(2),
        maxLatency: maxLatency.toFixed(2),
        p50: p50.toFixed(2),
        p95: p95.toFixed(2)
      };
      
      console.log('📊 Chat API Performance Statistics:');
      console.log(`  Total Requests: ${stats.total}`);
      console.log(`  Successful: ${stats.successful}`);
      console.log(`  Average Latency: ${stats.avgLatency}ms`);
      console.log(`  Min Latency: ${stats.minLatency}ms`);
      console.log(`  Max Latency: ${stats.maxLatency}ms`);
      console.log(`  P50 Latency: ${stats.p50}ms`);
      console.log(`  P95 Latency: ${stats.p95}ms`);
      
      // Write results to file
      const results = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/chat',
        thresholds: PERFORMANCE_THRESHOLDS,
        statistics: stats,
        rawLatencies: latencies,
        passed: p95 < PERFORMANCE_THRESHOLDS.apiResponseTime
      };
      
      await page.evaluate((data) => {
        // Store results in sessionStorage for potential collection
        sessionStorage.setItem('performance_results', JSON.stringify(data));
      }, results);
      
      // Performance assertions
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
      expect(avgLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime * 0.7); // 70% of threshold
    });
  });

  test('should handle concurrent chat requests efficiently', async ({ page }) => {
    await page.goto('/chat').catch(() => page.goto('/'));
    
    await test.step('Test concurrent API requests', async () => {
      const concurrentRequests = 5;
      const startTime = performance.now();
      
      // Create concurrent promises
      const requestPromises = Array.from({ length: concurrentRequests }, (_, i) => {
        return page.evaluate(async (requestNum) => {
          const requestStart = performance.now();
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
              },
              body: JSON.stringify({
                message: `Concurrent test message ${requestNum}`,
                context: { concurrent: true, batch: requestNum }
              })
            });
            
            const requestEnd = performance.now();
            return {
              status: response.status,
              latency: requestEnd - requestStart,
              ok: response.ok
            };
          } catch (error) {
            const requestEnd = performance.now();
            return {
              error: error.message,
              latency: requestEnd - requestStart
            };
          }
        }, i + 1);
      });
      
      // Wait for all requests to complete
      const results = await Promise.all(requestPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`⚡ Concurrent requests completed in: ${totalTime.toFixed(2)}ms`);
      
      // Analyze concurrent performance
      const successfulRequests = results.filter(r => r.ok);
      const avgConcurrentLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
      
      console.log(`📊 Concurrent Performance:`);
      console.log(`  Total Requests: ${concurrentRequests}`);
      console.log(`  Successful: ${successfulRequests.length}`);
      console.log(`  Average Latency: ${avgConcurrentLatency.toFixed(2)}ms`);
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      
      // Concurrent requests should not take much longer than sequential
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime * 2);
    });
  });

  test('should handle memory usage efficiently during chat operations', async ({ page }) => {
    await page.goto('/chat').catch(() => page.goto('/'));
    
    await test.step('Monitor memory usage during chat operations', async () => {
      // Get initial memory baseline
      const initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (!initialMemory) {
        console.warn('⚠️  Memory API not available - skipping memory test');
        return;
      }
      
      console.log(`📊 Initial Memory: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Perform multiple chat operations
      for (let i = 0; i < 5; i++) {
        await page.evaluate(async (num) => {
          // Simulate chat operations that might create memory pressure
          const mockData = new Array(1000).fill(0).map(() => ({
            id: Math.random(),
            message: `Test message ${num}`,
            timestamp: Date.now(),
            data: new Array(100).fill('x').join('')
          }));
          
          // Store in sessionStorage temporarily
          sessionStorage.setItem(`test_data_${num}`, JSON.stringify(mockData));
          
          // Simulate API call
          try {
            await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: `Memory test ${num}` })
            });
          } catch (error) {
            // Ignore API errors for memory test
          }
        }, i);
        
        await page.waitForTimeout(200);
      }
      
      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
        
        console.log(`📊 Final Memory: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📊 Memory Increase: ${memoryIncreaseMB.toFixed(2)} MB`);
        
        // Memory increase should be reasonable (less than 50MB for this test)
        expect(memoryIncreaseMB).toBeLessThan(50);
      }
      
      // Clean up test data
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          sessionStorage.removeItem(`test_data_${i}`);
        }
      });
    });
  });
});