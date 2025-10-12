import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for monitoring component performance
 * 
 * Tracks render times, mount/unmount cycles, and provides
 * performance metrics for optimization.
 * 
 * @param {string} componentName - Name of the component being monitored
 * @param {object} options - Configuration options
 * @returns {object} Performance metrics and utilities
 * 
 * @example
 * const { renderTime, logMetrics } = usePerformanceMonitor('MyComponent');
 */
export const usePerformanceMonitor = (componentName, options = {}) => {
  const {
    logRenders = false,
    warnThreshold = 16.67, // 60fps = 16.67ms per frame
  } = options;

  const mountTime = useRef(performance.now());
  const renderCount = useRef(0);
  const [metrics, setMetrics] = useState({
    totalRenderTime: 0,
    averageRenderTime: 0,
    slowestRender: 0,
    renderCount: 0,
  });

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - mountTime.current;

    // Update metrics
    setMetrics((prev) => {
      const newTotal = prev.totalRenderTime + renderTime;
      const newCount = renderCount.current;
      return {
        totalRenderTime: newTotal,
        averageRenderTime: newTotal / newCount,
        slowestRender: Math.max(prev.slowestRender, renderTime),
        renderCount: newCount,
      };
    });

    // Log slow renders
    if (logRenders && renderTime > warnThreshold) {
      console.warn(
        `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (threshold: ${warnThreshold}ms)`
      );
    }

    // Reset mount time for next render
    mountTime.current = performance.now();
  });

  const logMetrics = () => {
    console.log(`[Performance] ${componentName} Metrics:`, {
      renders: metrics.renderCount,
      averageTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
      slowestRender: `${metrics.slowestRender.toFixed(2)}ms`,
      totalTime: `${metrics.totalRenderTime.toFixed(2)}ms`,
    });
  };

  return {
    renderTime: metrics.averageRenderTime,
    metrics,
    logMetrics,
  };
};

/**
 * Hook for tracking component mount/unmount lifecycle
 * 
 * @param {string} componentName - Name of the component
 * @param {function} onMount - Callback on mount
 * @param {function} onUnmount - Callback on unmount
 */
export const useLifecycleMonitor = (componentName, onMount, onUnmount) => {
  useEffect(() => {
    const mountTime = performance.now();
    console.log(`[Lifecycle] ${componentName} mounted at ${mountTime.toFixed(2)}ms`);

    if (onMount) {
      onMount(mountTime);
    }

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime;
      console.log(
        `[Lifecycle] ${componentName} unmounted after ${lifetime.toFixed(2)}ms`
      );

      if (onUnmount) {
        onUnmount(unmountTime, lifetime);
      }
    };
  }, [componentName, onMount, onUnmount]);
};

/**
 * Hook for tracking async operations performance
 * 
 * @returns {object} Tracking utilities
 */
export const useAsyncPerformance = () => {
  const [operations, setOperations] = useState({});

  const trackAsync = async (operationName, asyncFunction) => {
    const startTime = performance.now();
    
    try {
      const result = await asyncFunction();
      const duration = performance.now() - startTime;

      setOperations((prev) => ({
        ...prev,
        [operationName]: {
          duration,
          success: true,
          timestamp: Date.now(),
        },
      }));

      // Log slow operations (> 1 second)
      if (duration > 1000) {
        console.warn(
          `[Performance] Slow async operation: ${operationName} took ${duration.toFixed(2)}ms`
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      setOperations((prev) => ({
        ...prev,
        [operationName]: {
          duration,
          success: false,
          error: error.message,
          timestamp: Date.now(),
        },
      }));

      throw error;
    }
  };

  const getMetrics = () => operations;

  const clearMetrics = () => setOperations({});

  return {
    trackAsync,
    getMetrics,
    clearMetrics,
  };
};

/**
 * Hook for Web Vitals monitoring
 * 
 * Tracks Core Web Vitals (LCP, FID, CLS) and provides insights
 * for performance optimization.
 * 
 * @returns {object} Web Vitals metrics
 */
export const useWebVitals = () => {
  const [vitals, setVitals] = useState({
    lcp: null, // Largest Contentful Paint
    fid: null, // First Input Delay
    cls: null, // Cumulative Layout Shift
    fcp: null, // First Contentful Paint
    ttfb: null, // Time to First Byte
  });

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Check if web-vitals is available
    import('web-vitals')
      .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => setVitals((prev) => ({ ...prev, cls: metric.value })));
        getFID((metric) => setVitals((prev) => ({ ...prev, fid: metric.value })));
        getFCP((metric) => setVitals((prev) => ({ ...prev, fcp: metric.value })));
        getLCP((metric) => setVitals((prev) => ({ ...prev, lcp: metric.value })));
        getTTFB((metric) => setVitals((prev) => ({ ...prev, ttfb: metric.value })));
      })
      .catch(() => {
        // web-vitals not available, gracefully degrade
        console.info('[Performance] web-vitals library not available');
      });
  }, []);

  return vitals;
};

/**
 * Hook for memory usage monitoring
 * 
 * @returns {object} Memory usage info
 */
export const useMemoryMonitor = () => {
  const [memory, setMemory] = useState(null);

  useEffect(() => {
    // Check if memory API is available
    if (!performance.memory) {
      return;
    }

    const updateMemory = () => {
      setMemory({
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usedPercentage: (
          (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        ).toFixed(2),
      });
    };

    // Update immediately
    updateMemory();

    // Update every 5 seconds
    const interval = setInterval(updateMemory, 5000);

    return () => clearInterval(interval);
  }, []);

  return memory;
};

/**
 * Utility function to measure function execution time
 * 
 * @param {function} fn - Function to measure
 * @param {string} label - Label for logging
 * @returns {function} Wrapped function with performance tracking
 */
export const measurePerformance = (fn, label) => {
  return async (...args) => {
    const startTime = performance.now();
    
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[Performance] ${label} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
};

export default usePerformanceMonitor;
