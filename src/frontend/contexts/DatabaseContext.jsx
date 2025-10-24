/**
 * Database Context - Modernized with new API infrastructure
 * 
 * Uses the centralized API client for all database operations
 * Includes proper loading states and error handling
 * Optimized with split context pattern to minimize re-renders.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../lib/api-client.js';

const DatabaseStateContext = createContext();
const DatabaseActionsContext = createContext();

export const useDatabaseState = () => {
  const context = useContext(DatabaseStateContext);
  if (!context) {
    throw new Error('useDatabaseState must be used within a DatabaseProvider');
  }
  return context;
};

export const useDatabaseActions = () => {
  const context = useContext(DatabaseActionsContext);
  if (!context) {
    throw new Error('useDatabaseActions must be used within a DatabaseProvider');
  }
  return context;
};

export const useDatabase = () => {
  return { ...useDatabaseState(), ...useDatabaseActions() };
};

export function DatabaseProvider({ children }) {
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState({
    mongodb: { connected: false, status: 'unknown' },
    sqlite: { connected: false, status: 'unknown' },
  });
  const [activeDatabases, setActiveDatabases] = useState([]);
  const [fallbackMode, setFallbackMode] = useState(false);
  
  // Loading states for each operation
  const [loading, setLoading] = useState({
    checkConnection: false,
    initFallback: false,
    saveUser: false,
    saveHistory: false,
    getRecommendations: false,
    getAnalytics: false,
  });
  
  // Error states
  const [errors, setErrors] = useState({
    checkConnection: null,
    initFallback: null,
    saveUser: null,
    saveHistory: null,
    getRecommendations: null,
    getAnalytics: null,
  });

  // Clear specific error
  const clearError = useCallback((operation) => {
    setErrors(prev => ({ ...prev, [operation]: null }));
  }, []);

  // Set loading state helper
  const setOperationLoading = useCallback((operation, isLoading) => {
    setLoading(prev => ({ ...prev, [operation]: isLoading }));
  }, []);

  // Set error state helper
  const setOperationError = useCallback((operation, error) => {
    setErrors(prev => ({ ...prev, [operation]: error }));
  }, []);

  // Check database connections
  const checkDatabaseConnections = useCallback(async () => {
    setOperationLoading('checkConnection', true);
    clearError('checkConnection');

    try {
      const data = await apiClient.get('/api/database/status');

      if (data.success) {
        setConnectionStatus(data.connections);
        setActiveDatabases(data.active);
        setFallbackMode(data.fallbackMode);
        return data;
      }
      
      // If success is false, handle as error
      throw new Error(data.error || 'Failed to check database status');
    } catch (error) {
      console.error('Database status check failed:', error);
      
      // Set error for UI display
      setOperationError('checkConnection', {
        message: 'Unable to check database status',
        details: error.message,
        code: error.code || 'DB_CHECK_FAILED'
      });
      
      // Assume fallback mode if check fails
      setFallbackMode(true);
      setConnectionStatus(prev => ({
        ...prev,
        sqlite: { connected: true, status: 'fallback' },
      }));
      setActiveDatabases(['sqlite']);
      
      return { success: false, error: error.message };
    } finally {
      setOperationLoading('checkConnection', false);
    }
  }, [clearError, setOperationLoading, setOperationError]);

  // Initialize on mount
  useEffect(() => {
    checkDatabaseConnections();
  }, [checkDatabaseConnections]);

  // Initialize fallback database
  const initializeFallbackDatabase = useCallback(async () => {
    setOperationLoading('initFallback', true);
    clearError('initFallback');

    try {
      const data = await apiClient.post('/api/database/init-fallback', {});

      if (data.success) {
        setFallbackMode(true);
        setConnectionStatus(prev => ({
          ...prev,
          sqlite: { connected: true, status: 'active' },
        }));
        setActiveDatabases(['sqlite']);
        return { success: true, data };
      }

      throw new Error(data.error || 'Failed to initialize fallback database');
    } catch (error) {
      console.error('Fallback database initialization failed:', error);
      
      setOperationError('initFallback', {
        message: 'Failed to initialize fallback database',
        details: error.message,
        code: error.code || 'FALLBACK_INIT_FAILED'
      });
      
      return { success: false, error: error.message };
    } finally {
      setOperationLoading('initFallback', false);
    }
  }, [clearError, setOperationLoading, setOperationError]);

  // Save user data
  const saveUserData = useCallback(async (userData) => {
    setOperationLoading('saveUser', true);
    clearError('saveUser');

    try {
      const data = await apiClient.post('/api/database/user', userData);
      
      if (data.success) {
        return { success: true, data };
      }
      
      throw new Error(data.error || 'Failed to save user data');
    } catch (error) {
      console.error('Save user data failed:', error);
      
      setOperationError('saveUser', {
        message: 'Failed to save user data',
        details: error.message,
        code: error.code || 'USER_SAVE_FAILED'
      });
      
      return { success: false, error: error.message };
    } finally {
      setOperationLoading('saveUser', false);
    }
  }, [clearError, setOperationLoading, setOperationError]);

  // Save listening history
  const saveListeningHistory = useCallback(async (historyData) => {
    setOperationLoading('saveHistory', true);
    clearError('saveHistory');

    try {
      const data = await apiClient.post('/api/database/listening-history', historyData);
      
      if (data.success) {
        return { success: true, data };
      }
      
      throw new Error(data.error || 'Failed to save listening history');
    } catch (error) {
      console.error('Save listening history failed:', error);
      
      setOperationError('saveHistory', {
        message: 'Failed to save listening history',
        details: error.message,
        code: error.code || 'HISTORY_SAVE_FAILED'
      });
      
      return { success: false, error: error.message };
    } finally {
      setOperationLoading('saveHistory', false);
    }
  }, [clearError, setOperationLoading, setOperationError]);

  // Get recommendations
  const getRecommendations = useCallback(async (userId, options = {}) => {
    setOperationLoading('getRecommendations', true);
    clearError('getRecommendations');

    try {
      const queryParams = new URLSearchParams({
        userId,
        ...options,
      });

      const data = await apiClient.get(`/api/database/recommendations?${queryParams}`);
      
      if (data.success) {
        return { success: true, data };
      }
      
      throw new Error(data.error || 'Failed to get recommendations');
    } catch (error) {
      console.error('Get recommendations failed:', error);
      
      setOperationError('getRecommendations', {
        message: 'Failed to get recommendations',
        details: error.message,
        code: error.code || 'RECOMMENDATIONS_FAILED'
      });
      
      return { success: false, error: error.message, recommendations: [] };
    } finally {
      setOperationLoading('getRecommendations', false);
    }
  }, [clearError, setOperationLoading, setOperationError]);

  // Get analytics
  const getAnalytics = useCallback(async (userId, options = {}) => {
    setOperationLoading('getAnalytics', true);
    clearError('getAnalytics');

    try {
      const queryParams = new URLSearchParams({
        userId,
        ...options,
      });

      const data = await apiClient.get(`/api/database/analytics?${queryParams}`);
      
      if (data.success) {
        return { success: true, data };
      }
      
      throw new Error(data.error || 'Failed to get analytics');
    } catch (error) {
      console.error('Get analytics failed:', error);
      
      setOperationError('getAnalytics', {
        message: 'Failed to get analytics data',
        details: error.message,
        code: error.code || 'ANALYTICS_FAILED'
      });
      
      return { success: false, error: error.message, analytics: null };
    } finally {
      setOperationLoading('getAnalytics', false);
    }
  }, [clearError, setOperationLoading, setOperationError]);

  // Helper functions
  const isConnected = useCallback((database) => {
    return connectionStatus[database]?.connected || false;
  }, [connectionStatus]);

  const hasActiveDatabase = useCallback(() => {
    return activeDatabases.length > 0;
  }, [activeDatabases]);

  const getActiveDatabase = useCallback(() => {
    return activeDatabases[0] || null;
  }, [activeDatabases]);

  // Check if any operation is loading
  const isLoading = useCallback((operation) => {
    if (operation) {
      return loading[operation] || false;
    }
    // Return true if any operation is loading
    return Object.values(loading).some(Boolean);
  }, [loading]);

  // Get error for specific operation
  const getError = useCallback((operation) => {
    return errors[operation] || null;
  }, [errors]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({
      checkConnection: null,
      initFallback: null,
      saveUser: null,
      saveHistory: null,
      getRecommendations: null,
      getAnalytics: null,
    });
  }, []);

  const stateValue = useMemo(() => {
    const isConnected = (database) => {
      return connectionStatus[database]?.connected || false;
    };

    const hasActiveDatabase = () => {
      return activeDatabases.length > 0;
    };

    const getActiveDatabase = () => {
      return activeDatabases[0] || null;
    };

    const isLoading = (operation) => {
      if (operation) {
        return loading[operation] || false;
      }
      return Object.values(loading).some(Boolean);
    };

    const getError = (operation) => {
      return errors[operation] || null;
    };

    return {
      connectionStatus,
      activeDatabases,
      fallbackMode,
      loading,
      errors,
      isConnected,
      hasActiveDatabase,
      getActiveDatabase,
      isLoading,
      getError,
    };
  }, [connectionStatus, activeDatabases, fallbackMode, loading, errors]);

  const actionsValue = useMemo(() => ({
    checkDatabaseConnections,
    initializeFallbackDatabase,
    saveUserData,
    saveListeningHistory,
    getRecommendations,
    getAnalytics,
    clearError,
    clearAllErrors,
  }), [
    checkDatabaseConnections,
    initializeFallbackDatabase,
    saveUserData,
    saveListeningHistory,
    getRecommendations,
    getAnalytics,
    clearError,
    clearAllErrors,
  ]);

  return (
    <DatabaseStateContext.Provider value={stateValue}>
      <DatabaseActionsContext.Provider value={actionsValue}>
        {children}
      </DatabaseActionsContext.Provider>
    </DatabaseStateContext.Provider>
  );
}
