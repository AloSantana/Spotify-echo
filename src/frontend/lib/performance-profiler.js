// src/frontend/lib/performance-profiler.js

/**
 * A simple in-memory profiler to collect React component render data.
 * This is designed to be used with the React Profiler component.
 */

let profilingData = [];
let isProfiling = false;

/**
 * The onRender callback for the React Profiler.
 * This function is called by React whenever a component within the profiled tree commits an update.
 *
 * @param {string} id - The "id" prop of the Profiler tree that has just committed.
 * @param {'mount' | 'update'} phase - Identifies if the tree has just been mounted or re-rendered.
 * @param {number} actualDuration - Time spent rendering the committed update.
 * @param {number} baseDuration - Estimated time to render the entire subtree without memoization.
 * @param {number} startTime - When React began rendering this update.
 * @param {number} commitTime - When React committed this update.
 * @param {Set<string>} interactions - The set of interactions that were being tracked when this update was scheduled.
 */
export function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
  interactions
) {
  if (isProfiling) {
    profilingData.push({
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
    });
  }
}

/**
 * Starts the profiling session.
 */
export function startProfiling() {
  profilingData = [];
  isProfiling = true;
  console.log('React performance profiling started.');
}

/**
 * Stops the profiling session.
 */
export function stopProfiling() {
  isProfiling = false;
  console.log('React performance profiling stopped.');
}

/**
 * Returns the captured profiling data.
 * @returns {Array} The array of captured render data.
 */
export function getProfilingData() {
  return profilingData;
}

/**
 * Clears all captured profiling data.
 */
export function clearProfilingData() {
  profilingData = [];
}

// Expose controls on the window object for easy access from automation scripts
if (process.env.NODE_ENV === 'development') {
  window.__PERFORMANCE_PROFILER__ = {
    startProfiling,
    stopProfiling,
    getProfilingData,
    clearProfilingData,
  };
}
