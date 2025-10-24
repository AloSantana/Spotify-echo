// scripts/profile-react-performance.js

/**
 * @file This script provides tools to measure React component performance,
 * specifically focusing on re-render counts and component update timing.
 * It's designed to be used with the React DevTools Profiler to establish
 * a performance baseline before optimizations.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import App from '../src/frontend/components/App';

// Profiler configuration
const PROFILER_CONFIG = {
  id: 'EchoTuneProfiler', // A unique ID for the Profiler
  onRender: (
    id, // the "id" prop of the Profiler tree that has just committed
    phase, // "mount" (if the tree just mounted) or "update" (if it re-rendered)
    actualDuration, // time spent rendering the committed update
    baseDuration, // estimated time to render the entire subtree without memoization
    startTime, // when React began rendering this update
    commitTime, // when React committed this update
    interactions // the Set of interactions belonging to this update
  ) => {
    // Log performance data to the console
    console.log({
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
    });
  },
};

/**
 * Wraps the main App component with the React Profiler to collect performance data.
 * @param {object} props - Component props.
 * @returns {JSX.Element} The App component wrapped in a Profiler.
 */
const ProfiledApp = (props) => (
  <React.Profiler {...PROFILER_CONFIG}>
    <App {...props} />
  </React.Profiler>
);

/**
 * Renders the application with performance profiling enabled.
 * This function should be called to start the profiling session.
 */
function startProfiling() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.render(<ProfiledApp />, rootElement);
    console.log('React performance profiling started.');
  } else {
    console.error('Root element not found. Could not start profiling.');
  }
}

// To use this script, you would typically run it in a browser environment
// that has your React application's HTML structure.
// Example:
// 1. Ensure your HTML has a <div id="root"></div>.
// 2. Load this script in your browser.
// 3. Call startProfiling() from the browser console.

export { startProfiling, ProfiledApp };
