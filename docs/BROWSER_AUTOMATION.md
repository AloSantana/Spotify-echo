# Browser Automation and Visual Testing Guide

This document provides comprehensive guidance for using Playwright browser automation, managing visual regression testing, and maintaining screenshot baselines in the EchoTune AI testing framework.

## Overview

Our browser automation framework is built on Playwright and provides:

- **Cross-browser testing** (Chromium, Firefox, Safari)
- **Visual regression detection** with baseline management
- **Mobile and desktop viewport testing**
- **Automated screenshot capture** with metadata tracking
- **Professional naming conventions** for artifacts

## Playwright Configuration

### Project Structure

```typescript
// playwright.config.mjs
export default defineConfig({
  projects: [
    // Desktop browsers
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] }},
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] }},
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] }},
    
    // Mobile viewports  
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] }},
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] }},
    
    // Visual regression specific
    { name: 'visual-regression', testMatch: '**/visual/**/*.spec.ts' }
  ]
});
```

### Test Directories

```
tests/
├── e2e/          # End-to-end user workflows
├── visual/       # Visual regression tests
└── setup/        # Global setup and utilities
```

## Writing Browser Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication or common state
    await page.goto('/');
    await setupAuthState(page);
  });

  test('should perform user action @smoke', async ({ page }) => {
    await test.step('Navigate to feature', async () => {
      await page.goto('/feature');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Interact with UI', async () => {
      await page.click('[data-testid="action-button"]');
      await expect(page.locator('[data-testid="result"]')).toBeVisible();
    });

    await test.step('Verify outcome', async () => {
      const result = await page.locator('[data-testid="result"]').textContent();
      expect(result).toContain('Expected outcome');
    });
  });
});
```

### Authentication Setup

Tests can use pre-configured authentication state:

```typescript
// Uses global auth setup from tests/setup/auth.setup.ts
test.use({ storageState: 'artifacts/auth/user.json' });

test('authenticated feature test', async ({ page }) => {
  // User is already authenticated
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
});
```

### Manual Authentication in Tests

```typescript
test('custom auth flow', async ({ page }) => {
  await page.goto('/');
  
  // Set mock authentication
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test-token-' + Date.now());
    localStorage.setItem('user_id', 'test-user-123');
    sessionStorage.setItem('authenticated', 'true');
  });
  
  await page.reload();
  await page.waitForLoadState('networkidle');
});
```

## Screenshot Management

### Automatic Screenshot Capture

Screenshots are automatically captured:

- **On test failure** (full page)
- **During test steps** (manual capture)
- **For visual regression** (baseline comparison)

### Naming Convention

Screenshots follow this standardized format:

```
{specName}/{twoDigitStep}-{shortSlug}-{status}.png

Examples:
auth/01-home-page-success.png
auth/02-login-options-success.png
auth/03-authenticated-failure.png
chat/01-interface-empty-success.png
settings/02-before-changes-success.png
```

### Manual Screenshot Capture

```typescript
test('feature with manual screenshots', async ({ page }) => {
  await page.goto('/feature');
  
  // Capture specific state
  await page.screenshot({ 
    path: 'artifacts/screenshots/feature-01-initial-state.png',
    fullPage: true 
  });
  
  // Perform action
  await page.click('[data-testid="toggle"]');
  
  // Capture changed state
  await page.screenshot({ 
    path: 'artifacts/screenshots/feature-02-after-toggle.png',
    fullPage: true 
  });
});
```

## Visual Regression Testing

### Writing Visual Tests

Visual tests should focus on UI consistency and design regression detection:

```typescript
// tests/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure consistent visual state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Hide dynamic elements
    await page.addStyleTag({
      content: `
        .timestamp, .version, .random-id { display: none !important; }
        * { animation-duration: 0s !important; transition-duration: 0s !important; }
      `
    });
    
    await page.waitForTimeout(500); // Allow styles to apply
  });

  test('should match homepage desktop baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match homepage mobile baseline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});
```

### Visual Test Best Practices

#### 1. Disable Animations and Transitions

```typescript
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `
});
```

#### 2. Hide Dynamic Content

```typescript
await page.addStyleTag({
  content: `
    .timestamp, .last-updated, .session-id, .random-id,
    .build-number, .version { display: none !important; }
  `
});
```

#### 3. Use Consistent Test Data

```typescript
// Inject consistent mock data
await page.evaluate(() => {
  const mockUser = {
    name: 'Visual Test User',
    email: 'visual@test.com',
    avatar: 'data:image/svg+xml,<svg>...</svg>'
  };
  
  // Populate user elements
  document.querySelectorAll('[data-testid="user-name"]')
    .forEach(el => el.textContent = mockUser.name);
});
```

#### 4. Wait for Stability

```typescript
test('visual test with proper waits', async ({ page }) => {
  await page.goto('/feature');
  
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for specific elements
  await page.waitForSelector('[data-testid="content"]', { state: 'visible' });
  
  // Additional stability wait
  await page.waitForTimeout(500);
  
  await expect(page).toHaveScreenshot('feature-stable.png');
});
```

## Baseline Management

### Visual Baseline Directory Structure

```
visual-baseline/
├── homepage-desktop.png
├── homepage-mobile.png
├── chat-interface-desktop.png
├── settings-form-desktop.png
├── error-state-desktop.png
└── loading-state-desktop.png
```

### Baseline Approval Workflow

#### 1. Run Visual Tests

```bash
# Run visual tests to generate new screenshots
npm run test:visual
```

#### 2. Review Differences

After test run, check for visual differences:

```bash
# View test results
open playwright-report/index.html

# Check artifacts directory
ls -la artifacts/test-results/
```

#### 3. Approve New Baselines

```bash
# Use the baseline approval script
npm run visual:approve

# This copies latest screenshots to visual-baseline/ directory
```

#### 4. Commit Approved Baselines

```bash
# Review changes
git diff visual-baseline/

# Commit new baselines
git add visual-baseline/
git commit -m "Update visual regression baselines for new feature"
```

### Manual Baseline Management

```bash
# Copy specific screenshot to baseline
cp test-results/visual-ui-states-spec-chromium/homepage-desktop-actual.png \
   visual-baseline/homepage-desktop.png

# Or use the approval script for all
node scripts/visual-baseline-approve.js
```

## Advanced Testing Patterns

### Testing Different UI States

```typescript
test.describe('UI State Testing', () => {
  test('should capture all modal states', async ({ page }) => {
    await page.goto('/feature');
    
    // Closed state
    await expect(page).toHaveScreenshot('modal-closed.png');
    
    // Open state
    await page.click('[data-testid="open-modal"]');
    await page.waitForSelector('[data-testid="modal"]');
    await expect(page).toHaveScreenshot('modal-open.png');
    
    // Error state
    await page.click('[data-testid="trigger-error"]');
    await page.waitForSelector('[data-testid="error-message"]');
    await expect(page).toHaveScreenshot('modal-error.png');
  });
});
```

### Cross-Browser Visual Testing

```typescript
// Run on specific browser projects
test.describe('Cross-Browser Visuals', () => {
  ['desktop-chromium', 'desktop-firefox', 'desktop-webkit'].forEach(browserName => {
    test(`should look consistent in ${browserName}`, async ({ page }) => {
      await page.goto('/feature');
      await expect(page).toHaveScreenshot(`feature-${browserName}.png`);
    });
  });
});
```

### Responsive Design Testing

```typescript
test.describe('Responsive Visual Testing', () => {
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'large', width: 1920, height: 1080 }
  ];

  viewports.forEach(viewport => {
    test(`should render correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ 
        width: viewport.width, 
        height: viewport.height 
      });
      
      await page.goto('/responsive-feature');
      await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`);
    });
  });
});
```

## Performance and Browser Automation

### Page Load Performance

```typescript
test('should load within performance budget', async ({ page }) => {
  const startTime = performance.now();
  
  await page.goto('/feature');
  await page.waitForLoadState('networkidle');
  
  const loadTime = performance.now() - startTime;
  expect(loadTime).toBeLessThan(3000); // 3 second budget
});
```

### Memory Usage Monitoring

```typescript
test('should not have memory leaks', async ({ page }) => {
  await page.goto('/feature');
  
  const initialMemory = await page.evaluate(() => {
    return performance.memory ? performance.memory.usedJSHeapSize : 0;
  });
  
  // Perform operations that might leak memory
  for (let i = 0; i < 10; i++) {
    await page.click('[data-testid="action"]');
    await page.waitForTimeout(100);
  }
  
  const finalMemory = await page.evaluate(() => {
    return performance.memory ? performance.memory.usedJSHeapSize : 0;
  });
  
  const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
  expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
});
```

## Debugging and Troubleshooting

### Running Tests in Debug Mode

```bash
# Debug mode with browser visible
npx playwright test --debug tests/visual/homepage.spec.ts

# Generate trace files
npx playwright test --trace on tests/visual/homepage.spec.ts

# View traces
npx playwright show-trace trace.zip
```

### Common Visual Test Issues

#### 1. Flaky Screenshots

```typescript
// Solution: Add proper waits and disable animations
test('stable visual test', async ({ page }) => {
  await page.goto('/feature');
  
  // Wait for all async operations
  await page.waitForLoadState('networkidle');
  
  // Wait for specific content
  await page.waitForFunction(() => 
    document.querySelectorAll('.loading').length === 0
  );
  
  // Disable animations
  await page.addStyleTag({
    content: '* { animation: none !important; transition: none !important; }'
  });
  
  await expect(page).toHaveScreenshot('stable-feature.png');
});
```

#### 2. Font Rendering Differences

```typescript
// Solution: Use system fonts or wait for font loading
test('consistent font rendering', async ({ page }) => {
  await page.goto('/feature');
  
  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready);
  
  await expect(page).toHaveScreenshot('consistent-fonts.png');
});
```

#### 3. Dynamic Content Issues

```typescript
// Solution: Mock or hide dynamic content
test('without dynamic content', async ({ page }) => {
  await page.goto('/feature');
  
  // Mock current time
  await page.addInitScript(() => {
    Date.now = () => 1609459200000; // Fixed timestamp
  });
  
  // Hide dynamic elements
  await page.addStyleTag({
    content: '.timestamp, .last-updated { visibility: hidden !important; }'
  });
  
  await expect(page).toHaveScreenshot('static-content.png');
});
```

## CI Integration

### Visual Testing in CI

The CI pipeline automatically:

1. **Runs visual tests** on pull requests
2. **Uploads artifacts** (screenshots, diffs)
3. **Compares with baselines** in version control
4. **Reports differences** as test failures

### Artifact Management

```yaml
# .github/workflows/test-and-validate.yml
- name: Upload visual test results
  uses: actions/upload-artifact@v4
  with:
    name: visual-test-results
    path: |
      playwright-report/
      test-results/
      artifacts/screenshots/
```

### Baseline Updates in CI

```yaml
- name: Check for baseline updates
  run: |
    if [ -n "$(git diff --name-only visual-baseline/)" ]; then
      echo "Visual baselines need approval"
      echo "Run: npm run visual:approve && git commit"
      exit 1
    fi
```

## Best Practices Summary

### DO

✅ **Use consistent test data** across visual tests  
✅ **Disable animations** for stable screenshots  
✅ **Wait for network idle** before capturing  
✅ **Hide dynamic content** (timestamps, IDs)  
✅ **Test multiple viewports** for responsive design  
✅ **Use descriptive screenshot names**  
✅ **Commit baseline images** to version control  
✅ **Review visual diffs** before approving changes  

### DON'T

❌ **Capture screenshots of loading states**  
❌ **Include timestamps** in visual tests  
❌ **Skip viewport testing** for responsive features  
❌ **Auto-approve** visual changes without review  
❌ **Test on unstable content**  
❌ **Ignore browser differences**  
❌ **Commit generated screenshots** (only baselines)  

### Performance Guidelines

- **Visual tests** should complete in < 30 seconds
- **Screenshot capture** should be < 2 seconds per image
- **Baseline approval** should be manual process
- **Artifact cleanup** should happen after test runs

---

For visual testing questions or issues, refer to the [Playwright documentation](https://playwright.dev/docs/test-snapshots) or consult existing test examples in the `tests/visual/` directory.