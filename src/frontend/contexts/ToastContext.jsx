/**
 * Toast Notification Context
 * 
 * Provides global toast notifications for the application
 * Supports success, error, warning, and info messages
 * Auto-dismisses with manual close option
 * Optimized with split context pattern to minimize re-renders.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Default durations (ms)
const TOAST_DURATIONS = {
  [TOAST_TYPES.SUCCESS]: 3000,
  [TOAST_TYPES.ERROR]: 5000,
  [TOAST_TYPES.WARNING]: 4000,
  [TOAST_TYPES.INFO]: 3000,
};

// Toast icons
const TOAST_ICONS = {
  [TOAST_TYPES.SUCCESS]: '✅',
  [TOAST_TYPES.ERROR]: '❌',
  [TOAST_TYPES.WARNING]: '⚠️',
  [TOAST_TYPES.INFO]: 'ℹ️',
};

// Toast colors (for inline styles, can be replaced with CSS classes)
const TOAST_COLORS = {
  [TOAST_TYPES.SUCCESS]: {
    background: '#10b981',
    text: '#ffffff',
    border: '#059669',
  },
  [TOAST_TYPES.ERROR]: {
    background: '#ef4444',
    text: '#ffffff',
    border: '#dc2626',
  },
  [TOAST_TYPES.WARNING]: {
    background: '#f59e0b',
    text: '#ffffff',
    border: '#d97706',
  },
  [TOAST_TYPES.INFO]: {
    background: '#3b82f6',
    text: '#ffffff',
    border: '#2563eb',
  },
};

const ToastStateContext = createContext();
const ToastActionsContext = createContext();

export const useToastState = () => {
  const context = useContext(ToastStateContext);
  if (!context) {
    throw new Error('useToastState must be used within a ToastProvider');
  }
  return context;
};

export const useToastActions = () => {
  const context = useContext(ToastActionsContext);
  if (!context) {
    throw new Error('useToastActions must be used within a ToastProvider');
  }
  return context;
};

export const useToast = () => {
  return { ...useToastState(), ...useToastActions() };
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [pausedToasts, setPausedToasts] = useState(new Set());

  // Generate unique ID for toast
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Remove a toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    setPausedToasts(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  // Add a new toast
  const addToast = useCallback((message, type = TOAST_TYPES.INFO, options = {}) => {
    const id = generateId();
    const duration = options.duration || TOAST_DURATIONS[type];
    const autoDismiss = options.autoDismiss !== false; // Default true

    const toast = {
      id,
      message,
      type,
      duration,
      autoDismiss,
      createdAt: Date.now(),
      action: options.action || null, // Optional action button
      onAction: options.onAction || null, // Optional action handler
      persistent: options.persistent || false, // Never auto-dismiss if true
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after duration if enabled
    if (autoDismiss && !toast.persistent) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [generateId, removeToast]);

  // Clear all toasts
  const clearAllToasts = useCallback(() => {
    setToasts([]);
    setPausedToasts(new Set());
  }, []);

  // Pause auto-dismiss for a toast (e.g., on hover)
  const pauseToast = useCallback((id) => {
    setPausedToasts(prev => new Set(prev).add(id));
  }, []);

  // Resume auto-dismiss for a toast
  const resumeToast = useCallback((id) => {
    setPausedToasts(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    // Find the toast and reset its timer
    setToasts(currentToasts => {
      const toast = currentToasts.find(t => t.id === id);
      if (toast && toast.autoDismiss && !toast.persistent) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }
      return currentToasts;
    });
  }, [removeToast]);

  // Convenience methods for different toast types
  const success = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.SUCCESS, options);
  }, [addToast]);

  const error = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.ERROR, options);
  }, [addToast]);

  const warning = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.WARNING, options);
  }, [addToast]);

  const info = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.INFO, options);
  }, [addToast]);

  // Show toast from API error
  const showApiError = useCallback((error, fallbackMessage = 'An error occurred') => {
    const message = error?.message || error?.details || fallbackMessage;
    const errorCode = error?.code ? ` (${error.code})` : '';
    
    return addToast(
      `${message}${errorCode}`,
      TOAST_TYPES.ERROR,
      { duration: 6000 }
    );
  }, [addToast]);

  // Show toast from API success
  const showApiSuccess = useCallback((message = 'Operation completed successfully') => {
    return addToast(message, TOAST_TYPES.SUCCESS);
  }, [addToast]);

  const stateValue = useMemo(() => ({
    toasts,
    pausedToasts,
    TOAST_TYPES,
    TOAST_ICONS,
    TOAST_COLORS,
  }), [toasts, pausedToasts]);

  const actionsValue = useMemo(() => ({
    addToast,
    removeToast,
    clearAllToasts,
    pauseToast,
    resumeToast,
    success,
    error,
    warning,
    info,
    showApiError,
    showApiSuccess,
  }), [
    addToast,
    removeToast,
    clearAllToasts,
    pauseToast,
    resumeToast,
    success,
    error,
    warning,
    info,
    showApiError,
    showApiSuccess,
  ]);

  return (
    <ToastStateContext.Provider value={stateValue}>
      <ToastActionsContext.Provider value={actionsValue}>
        {children}
      </ToastActionsContext.Provider>
    </ToastStateContext.Provider>
  );
}
