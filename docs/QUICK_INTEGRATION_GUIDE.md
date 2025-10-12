# Quick Integration Guide

This guide provides quick examples for integrating the new UI components into your code.

## Table of Contents
1. [LoadingState](#loadingstate)
2. [ErrorFallback](#errorfallback)
3. [ResponsiveContainer](#responsivecontainer)
4. [useResponsive Hook](#useresponsive-hook)
5. [PerformanceMonitor](#performancemonitor)

---

## LoadingState

### Replace Basic Loading Indicators

**Before:**
```jsx
{loading && <div>Loading...</div>}
```

**After:**
```jsx
import LoadingState from './components/LoadingState';

{loading && <LoadingState message="Loading..." />}
```

### In Buttons

**Before:**
```jsx
<button disabled={loading}>
  {loading ? 'Saving...' : 'Save'}
</button>
```

**After:**
```jsx
<button disabled={loading}>
  {loading && <LoadingState size="small" variant="inline" showSpinner />}
  {loading ? 'Saving...' : 'Save'}
</button>
```

---

## ErrorFallback

### Add Error Recovery

**Before:**
```jsx
{error && <div>Error: {error.message}</div>}
```

**After:**
```jsx
import ErrorFallback from './components/ErrorFallback';

{error && (
  <ErrorFallback 
    error={error} 
    variant="inline"
    resetError={() => {
      setError(null);
      retryOperation();
    }}
  />
)}
```

### Wrap Components with Error Boundary

**Before:**
```jsx
function App() {
  return (
    <Router>
      <YourApp />
    </Router>
  );
}
```

**After:**
```jsx
import { EnhancedErrorBoundary } from './components/ErrorFallback';

function App() {
  return (
    <EnhancedErrorBoundary>
      <Router>
        <YourApp />
      </Router>
    </EnhancedErrorBoundary>
  );
}
```

---

## ResponsiveContainer

### Make Layouts Responsive

**Before:**
```jsx
<div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
  <Content />
</div>
```

**After:**
```jsx
import ResponsiveContainer from './components/ResponsiveContainer';

<ResponsiveContainer maxWidth="lg" centered padding="default">
  <Content />
</ResponsiveContainer>
```

### Create Responsive Grids

**Before:**
```jsx
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px' 
}}>
  <Card1 />
  <Card2 />
  <Card3 />
</div>
```

**After:**
```jsx
<ResponsiveContainer layout="grid" columns={3} gap="large">
  <Card1 />
  <Card2 />
  <Card3 />
</ResponsiveContainer>
```
*Note: Automatically stacks to 1 column on mobile!*

---

## useResponsive Hook

### Conditional Rendering by Device

**Before:**
```jsx
// Using media queries in CSS or checking window.innerWidth
```

**After:**
```jsx
import { useResponsive } from '../utils/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </>
  );
}
```

### Responsive Styling

```jsx
import { useResponsive } from '../utils/useResponsive';

function MyComponent() {
  const { isMobile, width } = useResponsive();

  return (
    <div style={{
      fontSize: isMobile ? '14px' : '16px',
      padding: width < 400 ? '10px' : '20px'
    }}>
      Content
    </div>
  );
}
```

---

## PerformanceMonitor

### Add to Development Environment

**In App.jsx:**
```jsx
import PerformanceMonitor from './components/PerformanceMonitor';

function App() {
  return (
    <>
      {/* Your app content */}
      <YourApp />

      {/* Add performance monitor in development */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor position="bottom-right" />
      )}
    </>
  );
}
```

### Monitor Component Performance

```jsx
import { usePerformanceMonitor } from '../utils/usePerformanceMonitor';

function MyComponent() {
  const { renderTime, logMetrics } = usePerformanceMonitor('MyComponent', {
    logRenders: true,
    warnThreshold: 16.67 // Warn if render takes longer than 60fps (16.67ms)
  });

  // Log metrics on demand
  useEffect(() => {
    logMetrics();
  }, []);

  return <div>Component content</div>;
}
```

### Track Async Operations

```jsx
import { useAsyncPerformance } from '../utils/usePerformanceMonitor';

function MyComponent() {
  const { trackAsync, getMetrics } = useAsyncPerformance();

  const fetchData = async () => {
    const data = await trackAsync('fetchUserData', () =>
      fetch('/api/user').then(r => r.json())
    );
    return data;
  };

  // View metrics
  console.log(getMetrics());

  return <div>Content</div>;
}
```

---

## Common Patterns

### Async Data Fetching with Loading and Error

```jsx
import { useState, useEffect } from 'react';
import LoadingState from './components/LoadingState';
import ErrorFallback from './components/ErrorFallback';

function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading data..." />;
  }

  if (error) {
    return <ErrorFallback error={error} resetError={fetchData} />;
  }

  return <div>{/* Render your data */}</div>;
}
```

### Responsive Layout with Loading

```jsx
import ResponsiveContainer from './components/ResponsiveContainer';
import LoadingState from './components/LoadingState';
import { useResponsive } from '../utils/useResponsive';

function Dashboard() {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingState size="large" message="Loading dashboard..." />;
  }

  return (
    <ResponsiveContainer 
      layout="grid" 
      columns={isMobile ? 1 : 3} 
      gap="large"
      maxWidth="xl"
      centered
    >
      <StatCard />
      <ChartCard />
      <ActivityCard />
    </ResponsiveContainer>
  );
}
```

---

## Migration Checklist

Use this checklist when updating existing components:

- [ ] Replace inline loading indicators with `<LoadingState />`
- [ ] Replace error messages with `<ErrorFallback />`
- [ ] Wrap route components with `<EnhancedErrorBoundary />`
- [ ] Add responsive behavior with `useResponsive()` hook
- [ ] Wrap layouts with `<ResponsiveContainer />` for consistency
- [ ] Add performance monitoring in development
- [ ] Test on mobile, tablet, and desktop
- [ ] Verify accessibility (keyboard navigation, screen readers)
- [ ] Check loading states for all async operations
- [ ] Ensure all errors have recovery options

---

## Testing

### Test Loading States

```javascript
import { render, screen } from '@testing-library/react';
import LoadingState from './components/LoadingState';

test('shows loading state', () => {
  render(<LoadingState message="Loading..." />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

### Test Error Boundaries

```javascript
import { render, screen } from '@testing-library/react';
import { EnhancedErrorBoundary } from './components/ErrorFallback';

test('catches component errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <EnhancedErrorBoundary>
      <ThrowError />
    </EnhancedErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

### Test Responsive Behavior

```javascript
import { renderHook } from '@testing-library/react-hooks';
import { useResponsive } from '../utils/useResponsive';

test('detects mobile viewport', () => {
  global.innerWidth = 500;
  const { result } = renderHook(() => useResponsive());
  
  expect(result.current.isMobile).toBe(true);
  expect(result.current.isDesktop).toBe(false);
});
```

---

## Need Help?

- 📖 Read the full documentation: [UI_IMPROVEMENTS.md](./UI_IMPROVEMENTS.md)
- 📊 See the roadmap: [ROADMAP_IMPLEMENTATION.md](./ROADMAP_IMPLEMENTATION.md)
- 🐛 Found a bug? Open an issue on GitHub
- 💡 Have ideas? Contribute to the project!
