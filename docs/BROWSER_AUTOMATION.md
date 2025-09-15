# Browser Automation for EchoTune AI

## Overview

This document describes the browser automation framework for EchoTune AI, focusing on comprehensive screenshot capture, error handling, and visual regression testing.

## Architecture

### Screenshot Management System

The browser automation framework uses a sophisticated screenshot management system that captures every step of user interaction across multiple viewports and flows.

#### Run Management
- **Run ID**: Unique identifier for each test execution (`run-{timestamp}-{random}`)
- **Directory Structure**: Organized by run ID and flow type
- **Retention**: Screenshots retained for debugging and baseline comparison

#### Flow Organization
```
BROWSERSCREENSHOT-TESTING/
  {runId}/
    auth/                 # Authentication flow screenshots
    settings/             # Settings page interactions
    chat/                 # Chat interface testing
    recommendations/      # Music recommendation flows
    errorflow/           # Error scenario documentation
    coverage-report.json # Comprehensive coverage data
```

## Screenshot Capture Strategy

### Step-by-Step Documentation

Every user interaction is documented with a screenshot:

1. **Pre-Action**: Screenshot before interaction
2. **Post-Action**: Screenshot after interaction
3. **Error States**: Screenshot on any error or exception
4. **State Changes**: Screenshot when page state changes

### Naming Convention

Screenshots follow a standardized naming pattern:
```
{stepNumber}-{actionSlug}-{viewport}.png
```

Examples:
- `001-home-page-loaded-desktop.png`
- `002-auth-button-clicked-mobile.png`
- `003-spotify-auth-page-desktop.png`
- `error-network-timeout-mobile.png`

### Viewport Testing

#### Desktop Viewport (1280x800)
- Standard desktop browser experience
- Full navigation and interaction testing
- Comprehensive form validation
- Modal and dropdown interactions

#### Mobile Viewport (390x844)
- Mobile-responsive design validation
- Touch interface simulation
- Mobile navigation patterns
- Responsive layout verification

## Flow Testing Strategy

### Authentication Flow (`@auth`)

**Objective**: Validate user authentication and OAuth integration

**Test Steps**:
1. **Home Page Access**: Initial page load and state
2. **Auth Button Discovery**: Dynamic element location
3. **Login Interaction**: Click authentication button
4. **Spotify Redirect**: OAuth flow initiation
5. **Callback Handling**: Return to application
6. **Auth State Verification**: User session validation

**Screenshot Capture Points**:
- Home page initial state
- Auth button located and highlighted
- Spotify authentication page
- Post-authentication state
- User profile/logout indicators

### Settings Flow (`@settings`)

**Objective**: Validate configuration management and user preferences

**Test Steps**:
1. **Settings Access**: Navigate to settings page
2. **Provider Configuration**: AI provider selection
3. **Preference Updates**: User setting modifications
4. **Save Functionality**: Settings persistence

### Chat Flow (`@chat`)

**Objective**: Validate conversational AI interface and provider switching

**Test Steps**:
1. **Chat Interface Access**: Navigate to chat page
2. **Input Field Location**: Find and validate chat input
3. **Message Composition**: Enter test music request
4. **Response Waiting**: Monitor for AI response
5. **Provider Switching**: Test multiple AI providers

### Recommendations Flow (`@recommendations`)

**Objective**: Validate music recommendation engine functionality

**Test Steps**:
1. **Recommendations Access**: Navigate to recommendations page
2. **Strategy Selection**: Test different recommendation strategies
3. **Music Display**: Validate recommendation rendering
4. **Interaction Testing**: Play/preview button functionality

### Error Flow (`@errorflow`)

**Objective**: Document error states and recovery mechanisms

**Test Scenarios**:
1. **404 Pages**: Non-existent route handling
2. **API Errors**: Direct API access attempts
3. **JavaScript Errors**: Intentional script errors
4. **Network Failures**: Simulated network issues

## Error Handling & Debugging

### Automatic Error Detection

#### Page Errors
```javascript
page.on('pageerror', async (error) => {
  console.error('🚨 Page error:', error.message);
  await screenshotManager.captureError(page, 'errorflow', 'page-error', error.message);
});
```

#### Console Errors
```javascript
page.on('console', async (msg) => {
  if (msg.type() === 'error') {
    console.error('🚨 Console error:', msg.text());
    await screenshotManager.captureError(page, 'errorflow', 'console-error', msg.text());
  }
});
```

## Visual Regression Testing

### Baseline Management

#### Baseline Creation
- Manual curation of stable, representative screenshots
- Stored in `visual-baseline/` directory
- Organized by flow and viewport
- Version controlled for consistency

#### Coverage Calculation

**Coverage Metrics**:
- **Runtime States**: Screenshots captured during test execution
- **Baseline States**: Curated baseline images for comparison
- **Coverage Percentage**: (Runtime / Baseline) × 100

## Integration with CI/CD

### GitHub Actions Integration

**Artifact Upload**:
```yaml
- name: Upload screenshot artifacts
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: e2e-screenshots
    path: |
      BROWSERSCREENSHOT-TESTING/
      reports/screenshot-coverage.json
    retention-days: 30
```

## Best Practices

### Test Design

**Stability Patterns**:
- Multiple selector strategies for element location
- Wait conditions for dynamic content
- Graceful degradation for missing elements
- Consistent timing and synchronization

**Screenshot Quality**:
- Standardized viewport sizes
- Disabled animations for timing consistency
- Full-page capture for complete context
- High-quality PNG format for clarity

## Troubleshooting Guide

### Common Issues

**Screenshot Failures**:
- Check disk space and permissions
- Verify screenshot directory creation
- Review browser context initialization

**Element Location Issues**:
- Update selector strategies
- Add wait conditions for dynamic content
- Check for timing and synchronization issues

This comprehensive browser automation framework ensures thorough visual validation while providing excellent debugging capabilities and maintainable test infrastructure.