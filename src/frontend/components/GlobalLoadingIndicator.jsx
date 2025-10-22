/**
 * Global Loading Indicator Component
 *
 * Displays a loading bar at the top of the screen for global operations
 * Can be controlled via context or directly via props
 */

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Global Loading Context
const GlobalLoadingContext = createContext();

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

// Provider Component
export function GlobalLoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(new Set());

  // Start loading with optional message
  const startLoading = useCallback((taskId = 'default', msg = '') => {
    setLoadingTasks((prev) => {
      const newSet = new Set(prev);
      newSet.add(taskId);
      return newSet;
    });

    if (msg) setMessage(msg);

    setIsLoading(true);
    setProgress(0);
  }, []);

  // Stop loading for specific task
  const stopLoading = useCallback((taskId = 'default') => {
    setLoadingTasks((prev) => {
      const newSet = new Set(prev);
      newSet.delete(taskId);

      // If no more tasks, stop loading
      if (newSet.size === 0) {
        setIsLoading(false);
        setProgress(100);
        setMessage('');

        // Reset progress after animation
        setTimeout(() => setProgress(0), 300);
      }

      return newSet;
    });
  }, []);

  // Update progress (0-100)
  const updateProgress = useCallback((value) => {
    setProgress(Math.min(100, Math.max(0, value)));
  }, []);

  // Update message
  const updateMessage = useCallback((msg) => {
    setMessage(msg);
  }, []);

  // Check if specific task is loading
  const isTaskLoading = useCallback(
    (taskId) => {
      return loadingTasks.has(taskId);
    },
    [loadingTasks]
  );

  const value = {
    isLoading,
    progress,
    message,
    loadingTasks: Array.from(loadingTasks),
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
    isTaskLoading,
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
      <GlobalLoadingBar />
    </GlobalLoadingContext.Provider>
  );
}

// Loading Bar Component
function GlobalLoadingBar() {
  const { isLoading, progress, message } = useGlobalLoading();
  const [isVisible, setIsVisible] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      // Animate to 30% if no specific progress
      if (progress === 0) {
        const timer = setTimeout(() => setDisplayProgress(30), 100);
        return () => clearTimeout(timer);
      } else {
        setDisplayProgress(progress);
      }
    } else {
      // Complete animation before hiding
      setDisplayProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setDisplayProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, progress]);

  if (!isVisible) return null;

  return (
    <>
      <style>
        {`
          .global-loading-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background-color: rgba(59, 130, 246, 0.1);
            z-index: 10000;
            pointer-events: none;
          }

          .global-loading-bar-progress {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #06b6d4);
            transition: width 0.3s ease;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          }

          .global-loading-bar-pulse {
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          .global-loading-message {
            position: fixed;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10001;
            pointer-events: none;
            animation: slideDown 0.3s ease;
          }

          @keyframes slideDown {
            from {
              transform: translateX(-50%) translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>

      <div className="global-loading-bar">
        <div
          className={`global-loading-bar-progress ${progress === 0 ? 'global-loading-bar-pulse' : ''}`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {message && isLoading && <div className="global-loading-message">{message}</div>}
    </>
  );
}

// Standalone Loading Indicator Component
export function LoadingIndicator({
  size = 'medium',
  color = '#3b82f6',
  text = 'Loading...',
  showText = true,
  className = '',
  style = {},
}) {
  const sizes = {
    small: { spinner: 16, fontSize: 12 },
    medium: { spinner: 24, fontSize: 14 },
    large: { spinner: 32, fontSize: 16 },
  };

  const currentSize = sizes[size] || sizes.medium;

  return (
    <div
      className={`loading-indicator ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        ...style,
      }}
    >
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .loading-spinner {
            animation: spin 1s linear infinite;
          }
        `}
      </style>

      <svg
        className="loading-spinner"
        width={currentSize.spinner}
        height={currentSize.spinner}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="loading"
      >
        <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.25" strokeWidth="2" />
        <path d="M12 2C6.48 2 2 6.48 2 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>

      {showText && (
        <span style={{ fontSize: currentSize.fontSize, color: '#555' }}>
          {text}
        </span>
      )}
    </div>
  );
}

// Convenience wrapper to mount provider easily
export function WithGlobalLoading({ children }) {
  return <GlobalLoadingProvider>{children}</GlobalLoadingProvider>;
}

// Default export bundle for convenience
export default {
  GlobalLoadingProvider,
  useGlobalLoading,
  LoadingIndicator,
  WithGlobalLoading,
};
