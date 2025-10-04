/**
 * @ai-generated AWS Bedrock Claude Sonnet 4.5 (anthropic.claude-sonnet-4-20250514-v1:0)
 * @region us-east-1
 * @purpose Performance monitoring and optimization utilities
 * 
 * Performance Monitoring Utilities for EchoTune AI Frontend
 * 
 * Features:
 * - Web Vitals monitoring (FCP, LCP, FID, CLS, TTFB)
 * - Custom performance marks and measures
 * - Component render time tracking
 * - Bundle size monitoring
 * - Memory usage tracking
 * - Performance budgets enforcement
 */

import bedrockTracker from './bedrock-attribution.js';

/**
 * Web Vitals monitoring
 */
export class WebVitalsMonitor {
  constructor() {
    this.metrics = {};
    this.thresholds = {
      FCP: 1800, // First Contentful Paint (ms)
      LCP: 2500, // Largest Contentful Paint (ms)
      FID: 100,  // First Input Delay (ms)
      CLS: 0.1,  // Cumulative Layout Shift
      TTFB: 600  // Time to First Byte (ms)
    };
  }

  /**
   * Initialize Web Vitals monitoring
   */
  async initialize() {
    if (typeof window === 'undefined') return;

    try {
      const { onCLS, onFID, onFCP, onLCP, onTTFB } = await import('web-vitals');

      onCLS((metric) => this.handleMetric('CLS', metric));
      onFID((metric) => this.handleMetric('FID', metric));
      onFCP((metric) => this.handleMetric('FCP', metric));
      onLCP((metric) => this.handleMetric('LCP', metric));
      onTTFB((metric) => this.handleMetric('TTFB', metric));

      bedrockTracker.logInteraction({
        type: 'performance_monitor_initialized',
        component: 'WebVitalsMonitor',
        thresholds: this.thresholds
      });
    } catch (error) {
      console.warn('Web Vitals not available:', error);
    }
  }

  /**
   * Handle metric update
   * @param {string} name - Metric name
   * @param {Object} metric - Metric data
   */
  handleMetric(name, metric) {
    const value = metric.value;
    const threshold = this.thresholds[name];
    const passes = value <= threshold;

    this.metrics[name] = {
      value,
      threshold,
      passes,
      rating: metric.rating,
      delta: metric.delta,
      timestamp: Date.now()
    };

    // Log to console
    console.log(
      `[Performance] ${name}:`,
      `${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'}`,
      `(${passes ? '✓' : '✗'} ${metric.rating})`
    );

    // Track with Bedrock
    bedrockTracker.logInteraction({
      type: 'web_vital_measured',
      metric: name,
      value,
      threshold,
      passes,
      rating: metric.rating
    });

    // Send to analytics endpoint (if available)
    this.sendToAnalytics(name, metric);
  }

  /**
   * Send metric to analytics
   * @param {string} name - Metric name
   * @param {Object} metric - Metric data
   */
  async sendToAnalytics(name, metric) {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: name,
          value: metric.value,
          rating: metric.rating,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      // Analytics is optional, don't fail on error
      console.debug('Analytics not available:', error.message);
    }
  }

  /**
   * Get all metrics
   * @returns {Object} All collected metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Check if all metrics pass thresholds
   * @returns {boolean} True if all metrics pass
   */
  allMetricsPass() {
    return Object.values(this.metrics).every(m => m.passes);
  }

  /**
   * Get performance score (0-100)
   * @returns {number} Performance score
   */
  getPerformanceScore() {
    const metrics = Object.entries(this.metrics);
    if (metrics.length === 0) return 0;

    const scores = metrics.map(([name, data]) => {
      const ratio = data.value / data.threshold;
      if (ratio <= 0.5) return 100;
      if (ratio <= 1.0) return 90;
      if (ratio <= 1.5) return 50;
      return 0;
    });

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
}

/**
 * Custom performance tracking
 */
export class PerformanceTracker {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
  }

  /**
   * Create performance mark
   * @param {string} name - Mark name
   */
  mark(name) {
    if (typeof performance === 'undefined') return;

    try {
      performance.mark(name);
      this.marks.set(name, performance.now());

      bedrockTracker.logInteraction({
        type: 'performance_mark',
        mark: name,
        timestamp: performance.now()
      });
    } catch (error) {
      console.warn('Performance mark failed:', error);
    }
  }

  /**
   * Measure performance between marks
   * @param {string} name - Measure name
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   * @returns {number} Duration in milliseconds
   */
  measure(name, startMark, endMark) {
    if (typeof performance === 'undefined') return 0;

    try {
      const measure = performance.measure(name, startMark, endMark);
      const duration = measure.duration;
      
      this.measures.set(name, {
        duration,
        startMark,
        endMark,
        timestamp: Date.now()
      });

      bedrockTracker.logInteraction({
        type: 'performance_measure',
        measure: name,
        duration,
        startMark,
        endMark
      });

      return duration;
    } catch (error) {
      console.warn('Performance measure failed:', error);
      return 0;
    }
  }

  /**
   * Get measure duration
   * @param {string} name - Measure name
   * @returns {number} Duration in milliseconds
   */
  getMeasureDuration(name) {
    const measure = this.measures.get(name);
    return measure ? measure.duration : 0;
  }

  /**
   * Clear all marks and measures
   */
  clearAll() {
    if (typeof performance === 'undefined') return;

    try {
      performance.clearMarks();
      performance.clearMeasures();
      this.marks.clear();
      this.measures.clear();
    } catch (error) {
      console.warn('Performance clear failed:', error);
    }
  }
}

/**
 * Component render tracking
 */
export class ComponentRenderTracker {
  constructor() {
    this.renders = new Map();
  }

  /**
   * Track component render
   * @param {string} componentName - Component name
   * @param {number} renderTime - Render time in milliseconds
   */
  trackRender(componentName, renderTime) {
    if (!this.renders.has(componentName)) {
      this.renders.set(componentName, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastRender: 0
      });
    }

    const stats = this.renders.get(componentName);
    stats.count++;
    stats.totalTime += renderTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, renderTime);
    stats.maxTime = Math.max(stats.maxTime, renderTime);
    stats.lastRender = Date.now();

    // Log slow renders
    if (renderTime > 16) { // > 1 frame at 60fps
      console.warn(
        `[Slow Render] ${componentName}: ${renderTime.toFixed(2)}ms`
      );

      bedrockTracker.logInteraction({
        type: 'slow_component_render',
        component: componentName,
        renderTime,
        threshold: 16
      });
    }
  }

  /**
   * Get component render stats
   * @param {string} componentName - Component name
   * @returns {Object} Render statistics
   */
  getStats(componentName) {
    return this.renders.get(componentName);
  }

  /**
   * Get all component stats
   * @returns {Array} All component statistics
   */
  getAllStats() {
    return Array.from(this.renders.entries()).map(([name, stats]) => ({
      component: name,
      ...stats
    }));
  }

  /**
   * Get slowest components
   * @param {number} limit - Number of components to return
   * @returns {Array} Slowest components
   */
  getSlowestComponents(limit = 10) {
    return this.getAllStats()
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.intervalId = null;
  }

  /**
   * Start monitoring memory usage
   * @param {number} interval - Sampling interval in milliseconds
   */
  start(interval = 5000) {
    if (typeof performance === 'undefined' || !performance.memory) {
      console.warn('Memory monitoring not available');
      return;
    }

    this.intervalId = setInterval(() => {
      const memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      this.samples.push(memory);

      // Keep only last 100 samples
      if (this.samples.length > 100) {
        this.samples.shift();
      }

      // Check for memory leaks
      this.checkMemoryLeak();
    }, interval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for potential memory leaks
   */
  checkMemoryLeak() {
    if (this.samples.length < 10) return;

    const recent = this.samples.slice(-10);
    const trend = recent.reduce((acc, sample, i) => {
      if (i === 0) return 0;
      return acc + (sample.usedJSHeapSize - recent[i - 1].usedJSHeapSize);
    }, 0);

    // If memory consistently increases, might be a leak
    if (trend > 10000000) { // 10MB increase
      console.warn('[Memory] Potential memory leak detected');

      bedrockTracker.logInteraction({
        type: 'memory_leak_warning',
        trend,
        samples: recent.length
      });
    }
  }

  /**
   * Get current memory usage
   * @returns {Object} Memory usage information
   */
  getCurrentUsage() {
    if (typeof performance === 'undefined' || !performance.memory) {
      return null;
    }

    return {
      usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
      totalMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
      limitMB: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2),
      usagePercent: (
        (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      ).toFixed(2)
    };
  }
}

// Create singleton instances
export const webVitalsMonitor = new WebVitalsMonitor();
export const performanceTracker = new PerformanceTracker();
export const componentRenderTracker = new ComponentRenderTracker();
export const memoryMonitor = new MemoryMonitor();

// Initialize Web Vitals monitoring
if (typeof window !== 'undefined') {
  webVitalsMonitor.initialize();
  memoryMonitor.start();
}

export default {
  WebVitalsMonitor,
  PerformanceTracker,
  ComponentRenderTracker,
  MemoryMonitor,
  webVitalsMonitor,
  performanceTracker,
  componentRenderTracker,
  memoryMonitor
};
