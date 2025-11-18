# Design System Documentation

**Updated:** 2025-11-18  
**Framework:** Material-UI v5  
**Phase:** 2 - UI Framework Modernization

## Overview

The EchoTune AI Design System provides a comprehensive set of accessible, performant, and beautiful components built with React, Material-UI v5, and modern web standards. The system maintains the Spotify-inspired aesthetic while ensuring consistency and accessibility across the entire application.

### Key Principles

1. **Accessibility First**: WCAG 2.1 AA compliance throughout
2. **Performance**: Optimized for speed and efficiency with code splitting and lazy loading
3. **Consistency**: Unified design language across all components via centralized theme
4. **Spotify-Inspired**: Green accent colors (#1db954) and dark-first design
5. **Developer Experience**: Well-documented Material-UI components with prop validation

### Technology Stack

- **UI Framework**: Material-UI (MUI) v5.x
- **Styling**: Emotion (CSS-in-JS) via MUI
- **Icons**: Material Icons (@mui/icons-material)
- **Theme**: Custom MUI theme with dark/light mode support
- **Typography**: Inter font family (Google Fonts)

## Design Tokens

Design tokens are centrally defined in `src/frontend/theme/muiTheme.js` and applied consistently across all Material-UI components.

### Colors

#### Brand Colors (Spotify-Inspired)

**Primary - Spotify Green**
- Main: `#1db954` (Spotify brand green)
- Light: `#1ed760` (Hover state)
- Dark: `#1aa34a` (Active state)
- Contrast Text: `#ffffff`

**Secondary - Dark Backgrounds**
- Main: `#191414` (Spotify dark background)
- Light: `#1a1a1a` (Card/Paper background)
- Dark: `#121212` (Page background)
- Contrast Text: `#ffffff`

All color combinations meet WCAG 2.1 AA contrast ratio requirements (4.5:1 minimum for normal text, 3:1 for large text).

#### Semantic Colors
- **Success**: `#1db954` (Matches primary - positive actions)
- **Warning**: `#f39c12` (Caution, important information)
- **Error**: `#e22134` (Errors, destructive actions)
- **Info**: `#3498db` (Informational content)

#### Theme-Specific Colors

**Dark Mode** (Default)
- Background Default: `#121212`
- Background Paper: `#1a1a1a`
- Text Primary: `#ffffff`
- Text Secondary: `#b3b3b3`

**Light Mode**
- Background Default: `#ffffff`
- Background Paper: `#f5f5f5`
- Text Primary: `#121212`
- Text Secondary: `#5e5e5e`

### Typography

#### Font Families
- Sans: Inter, system-ui, sans-serif
- Mono: JetBrains Mono, Consolas, monospace

#### Font Sizes
- xs: 0.75rem (12px)
- sm: 0.875rem (14px)
- base: 1rem (16px)
- lg: 1.125rem (18px)
- xl: 1.25rem (20px)
- 2xl: 1.5rem (24px)
- 3xl: 1.875rem (30px)

#### Font Weights
- normal: 400
- medium: 500
- semibold: 600
- bold: 700

### Spacing

Consistent spacing scale based on 4px increments:
- 1: 0.25rem (4px)
- 2: 0.5rem (8px)
- 3: 0.75rem (12px)
- 4: 1rem (16px)
- 6: 1.5rem (24px)
- 8: 2rem (32px)
- 12: 3rem (48px)

## Components

### Button

Versatile button component with multiple variants and full accessibility support.

#### Variants
- **Primary**: Main call-to-action buttons
- **Secondary**: Secondary actions
- **Outlined**: Less prominent actions
- **Text**: Subtle, inline actions
- **Danger**: Destructive actions
- **Success**: Positive confirmations

#### Sizes
- **Small**: Compact spaces, dense UIs
- **Medium**: Default size for most use cases
- **Large**: Prominent actions, marketing pages

#### Features
- ✅ Full keyboard navigation (Space, Enter)
- ✅ ARIA attributes (label, describedby, expanded, pressed, controls)
- ✅ Loading states with spinner
- ✅ Disabled states
- ✅ Icon support (start and end)
- ✅ Focus management
- ✅ Touch-optimized (44px minimum touch target)

#### Usage Example

```jsx
import Button from './components/Button';

// Primary button
<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>

// Button with icon
<Button 
  variant="secondary" 
  startIcon={<PlayIcon />}
  ariaLabel="Play song"
>
  Play
</Button>

// Loading state
<Button loading>
  Saving...
</Button>
```

### Input

Accessible input field with error handling and validation support.

#### Features
- ✅ Label association for screen readers
- ✅ Error states with accessible messaging
- ✅ Help text support
- ✅ Character count with live updates
- ✅ Start and end adornments (icons, text)
- ✅ Multiple input types (text, email, password, etc.)
- ✅ Focus management
- ✅ Required field indication

#### Usage Example

```jsx
import Input from './components/Input';

// Basic input
<Input
  label="Email address"
  type="email"
  required
  helpText="We'll never share your email"
/>

// Input with error
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
  required
/>

// Input with character count
<Input
  label="Bio"
  maxLength={160}
  showCharacterCount
/>
```

### Card

Flexible card component for grouping related content.

#### Variants
- **Flat**: No shadow, minimal border
- **Elevated**: Subtle shadow for depth
- **Outlined**: Prominent border

#### Features
- ✅ Interactive variant (clickable cards)
- ✅ Keyboard navigation for interactive cards
- ✅ Semantic HTML structure
- ✅ Subcomponents (Header, Content, Actions, Media)
- ✅ Flexible layout system
- ✅ Focus management

#### Usage Example

```jsx
import Card from './components/Card';

// Basic card
<Card variant="elevated">
  <Card.Header>
    <h3>Song Title</h3>
  </Card.Header>
  <Card.Content>
    <p>Artist Name</p>
  </Card.Content>
  <Card.Actions align="right">
    <Button variant="text">Share</Button>
    <Button variant="primary">Play</Button>
  </Card.Actions>
</Card>

// Interactive card
<Card
  interactive
  onClick={handleCardClick}
  ariaLabel="Song card, click to play"
>
  <Card.Media 
    src="/album-art.jpg" 
    alt="Album artwork"
    aspectRatio="1/1"
  />
  <Card.Content>
    <h3>Amazing Song</h3>
    <p>Artist Name</p>
  </Card.Content>
</Card>
```

## Accessibility Utilities

Comprehensive utilities for building accessible interfaces.

### ARIA Attributes Generator

```jsx
import { generateAriaAttributes } from './utils/accessibility';

const attrs = generateAriaAttributes({
  role: 'button',
  label: 'Play song',
  expanded: false,
  controls: 'playlist-menu'
});
// Returns: { role: 'button', 'aria-label': 'Play song', ... }
```

### Keyboard Navigation Handler

```jsx
import { createKeyboardNavigationHandler } from './utils/accessibility';

const handleKeyboard = createKeyboardNavigationHandler({
  onEnter: () => console.log('Enter pressed'),
  onSpace: () => console.log('Space pressed'),
  onEscape: () => console.log('Escape pressed'),
  onArrowUp: () => console.log('Up arrow pressed'),
  onArrowDown: () => console.log('Down arrow pressed')
});

<div onKeyDown={handleKeyboard}>...</div>
```

### Focus Management

```jsx
import { focusManager } from './utils/accessibility';

// Save current focus and move to modal
focusManager.pushFocus(modalElement);

// Restore previous focus when closing modal
focusManager.popFocus();

// Trap focus within container
const cleanup = focusManager.trapFocus(dialogElement);
// Call cleanup() when done
```

### Screen Reader Announcements

```jsx
import { screenReader } from './utils/accessibility';

// Polite announcement
screenReader.announce('Item added to playlist');

// Assertive announcement (interrupts)
screenReader.announce('Error: Connection lost', 'assertive');
```

### Color Contrast Validation

```jsx
import { validateColorContrast } from './utils/accessibility';

const result = validateColorContrast('#0ea5e9', '#ffffff');
console.log(result);
// {
//   ratio: "4.56",
//   passesAA: true,
//   passesAAA: false,
//   passesAALarge: true,
//   passesAAALarge: true
// }
```

## Performance Monitoring

Built-in performance monitoring utilities for tracking Web Vitals and component performance.

### Web Vitals Monitoring

```jsx
import { webVitalsMonitor } from './utils/performance';

// Automatically tracks FCP, LCP, FID, CLS, TTFB
const metrics = webVitalsMonitor.getMetrics();
const score = webVitalsMonitor.getPerformanceScore();
```

### Component Render Tracking

```jsx
import { componentRenderTracker } from './utils/performance';

function MyComponent() {
  const startTime = performance.now();
  
  useEffect(() => {
    const renderTime = performance.now() - startTime;
    componentRenderTracker.trackRender('MyComponent', renderTime);
  });
  
  return <div>...</div>;
}

// Get stats
const stats = componentRenderTracker.getStats('MyComponent');
const slowest = componentRenderTracker.getSlowestComponents(10);
```

## AWS Bedrock Attribution

All components and utilities in this design system were generated using AWS Bedrock Claude Sonnet 4.5.

### Session Information
- **Model**: anthropic.claude-sonnet-4-20250514-v1:0
- **Region**: us-east-1
- **Purpose**: Comprehensive frontend refactoring with accessibility and performance focus

### Attribution Tracking

```jsx
import bedrockTracker from './utils/bedrock-attribution';

// Track interactions
bedrockTracker.logInteraction({
  type: 'component_usage',
  component: 'Button',
  variant: 'primary'
});

// Get session summary
const summary = bedrockTracker.getSessionSummary();

// Export for validation
const sessionData = bedrockTracker.exportSessionData();
```

## Best Practices

### Accessibility
1. Always provide meaningful labels for interactive elements
2. Ensure keyboard navigation works for all interactive components
3. Use semantic HTML elements
4. Maintain color contrast ratios (WCAG AA minimum: 4.5:1)
5. Provide alternative text for images
6. Use ARIA attributes appropriately
7. Test with screen readers

### Performance
1. Use lazy loading for images
2. Implement code splitting for large components
3. Monitor component render times
4. Optimize bundle sizes
5. Use production builds
6. Enable compression (gzip/brotli)

### Component Usage
1. Use design tokens for consistent styling
2. Follow semantic HTML structure
3. Provide accessible labels
4. Handle loading and error states
5. Test with keyboard navigation
6. Verify screen reader compatibility

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- iOS Safari: Latest 2 versions
- Android Chrome: Latest 2 versions

## New Components (Phase 2)

### EmptyState Component

A reusable component for displaying empty states with consistent styling and UX patterns.

**Location**: `src/frontend/components/EmptyState.jsx`

**Features**:
- Predefined icon library for common scenarios
- Three size variants: `compact`, `default`, `large`
- Optional primary and secondary action buttons
- Responsive design (mobile-first)
- WCAG 2.1 AA compliant
- Smooth animations and transitions

**Usage Example**:
```jsx
import EmptyState from './components/EmptyState';

<EmptyState
  icon="playlist"
  title="No playlists yet"
  description="Create your first playlist to get started"
  actionLabel="Create Playlist"
  onAction={handleCreatePlaylist}
  variant="default"
/>
```

**Predefined Variants**:
- `EmptyPlaylists` - For empty playlist views
- `EmptySearchResults` - For search with no results
- `EmptyLibrary` - For empty music libraries
- `EmptyRecommendations` - For recommendation failures
- `ErrorState` - For error scenarios

**Icon Options**:
- `music`, `playlist`, `playlists`, `search`, `library`, `album`, `empty`, `error`
- Custom icons supported via `customIcon` prop

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Material-UI Documentation](https://mui.com/)
- [Material Design Guidelines](https://m3.material.io/)
- [Web Vitals](https://web.dev/vitals/)
- [React Documentation](https://react.dev/)

## Contributing

When adding new components:
1. Follow accessibility guidelines (WCAG 2.1 AA)
2. Use Material-UI components when possible
3. Include comprehensive tests (80%+ coverage)
4. Add JSDoc/PropTypes documentation
5. Include usage examples
6. Test keyboard navigation
7. Verify screen reader compatibility
8. Measure performance impact
9. Follow the centralized theme system

---

**Last Updated**: 2025-11-18  
**Framework**: Material-UI v5  
**Version**: 2.0.0 (Phase 2)
