/**
 * Auth Context - Modernized with new API infrastructure
 * 
 * Uses the centralized API client for all authentication operations
 * Includes proper loading states and error handling
 * Optimized with split context pattern to minimize re-renders.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../lib/api-client.js';

const AuthStateContext = createContext();
const AuthActionsContext = createContext();

export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
};

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
};

export const useAuth = () => {
  return { ...useAuthState(), ...useAuthActions() };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState({
    initial: true,
    login: false,
    logout: false,
    refresh: false,
    checkStatus: false,
  });
  
  // Error states
  const [errors, setErrors] = useState({
    login: null,
    logout: null,
    refresh: null,
    checkStatus: null,
  });

  // Set loading state helper
  const setOperationLoading = useCallback((operation, isLoading) => {
    setLoading(prev => ({ ...prev, [operation]: isLoading }));
  }, []);

  // Set error state helper
  const setOperationError = useCallback((operation, error) => {
    setErrors(prev => ({ ...prev, [operation]: error }));
  }, []);

  // Clear specific error
  const clearError = useCallback((operation) => {
    setErrors(prev => ({ ...prev, [operation]: null }));
  }, []);

  // Clear all auth data
  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('echotune_user');
    localStorage.removeItem('echotune_token');
    localStorage.removeItem('echotune_refresh_token');
    apiClient.setAuthToken(null);
  }, []);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    setOperationLoading('checkStatus', true);
    clearError('checkStatus');

    try {
      // Check for stored user data
      const storedUser = localStorage.getItem('echotune_user');
      const storedToken = localStorage.getItem('echotune_token');
      const storedRefresh = localStorage.getItem('echotune_refresh_token');

      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setAccessToken(storedToken);
        setRefreshToken(storedRefresh);
        
        // Update API client with stored token
        apiClient.setAuthToken(storedToken);
      }

      // Verify token validity with backend
      if (storedToken) {
        const data = await apiClient.get('/api/auth/status');

        if (data.success && data.user) {
          setUser(data.user);
          setAccessToken(data.accessToken || storedToken);
          setRefreshToken(data.refreshToken || storedRefresh);
          
          // Update local storage
          localStorage.setItem('echotune_user', JSON.stringify(data.user));
          if (data.accessToken) {
            localStorage.setItem('echotune_token', data.accessToken);
            apiClient.setAuthToken(data.accessToken);
          }
          if (data.refreshToken) {
            localStorage.setItem('echotune_refresh_token', data.refreshToken);
          }
        } else {
          // Token invalid, clear everything
          clearAuth();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      
      setOperationError('checkStatus', {
        message: 'Failed to verify authentication status',
        details: error.message,
        code: error.code || 'AUTH_CHECK_FAILED'
      });
      
      // In case of error, use local storage only
      const storedUser = localStorage.getItem('echotune_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          clearAuth();
        }
      }
    } finally {
      setOperationLoading('initial', false);
      setOperationLoading('checkStatus', false);
    }
  }, [setOperationLoading, setOperationError, clearAuth]);

  // Initialize on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login (redirect to Spotify OAuth)
  const login = useCallback(() => {
    setOperationLoading('login', true);
    clearError('login');
    
    try {
      // Redirect to Spotify OAuth
      window.location.href = '/auth/spotify';
    } catch (error) {
      console.error('Login error:', error);
      
      setOperationError('login', {
        message: 'Failed to initiate login',
        details: error.message,
        code: error.code || 'LOGIN_FAILED'
      });
      
      setOperationLoading('login', false);
    }
  }, [setOperationLoading, setOperationError, clearError]);

  // Logout
  const logout = useCallback(async () => {
    setOperationLoading('logout', true);
    clearError('logout');

    try {
      // Call logout endpoint
      await apiClient.post('/api/auth/logout', {});
      
      // Clear all auth data
      clearAuth();
      
      // Redirect to home or login page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      
      setOperationError('logout', {
        message: 'Logout failed, but local session cleared',
        details: error.message,
        code: error.code || 'LOGOUT_FAILED'
      });
      
      // Clear local auth even if server logout fails
      clearAuth();
    } finally {
      setOperationLoading('logout', false);
    }
  }, [setOperationLoading, setOperationError, clearError, clearAuth]);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    setOperationLoading('refresh', true);
    clearError('refresh');

    try {
      const currentRefreshToken = refreshToken || localStorage.getItem('echotune_refresh_token');
      
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const data = await apiClient.post('/api/auth/refresh', {
        refreshToken: currentRefreshToken
      });

      if (data.success && data.accessToken) {
        setAccessToken(data.accessToken);
        localStorage.setItem('echotune_token', data.accessToken);
        apiClient.setAuthToken(data.accessToken);
        
        if (data.refreshToken) {
          setRefreshToken(data.refreshToken);
          localStorage.setItem('echotune_refresh_token', data.refreshToken);
        }
        
        return data.accessToken;
      } else {
        // Refresh failed, clear auth
        clearAuth();
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      
      setOperationError('refresh', {
        message: 'Failed to refresh authentication',
        details: error.message,
        code: error.code || 'REFRESH_FAILED'
      });
      
      // Clear auth on refresh failure
      clearAuth();
      return null;
    } finally {
      setOperationLoading('refresh', false);
    }
  }, [refreshToken, setOperationLoading, setOperationError, clearError, clearAuth]);

  const clearAllErrors = useCallback(() => {
    setErrors({
      login: null,
      logout: null,
      refresh: null,
      checkStatus: null,
    });
  }, []);

  const stateValue = useMemo(() => {
    const isAuthenticated = !!user && !!accessToken;

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
      user,
      accessToken,
      refreshToken,
      loading,
      errors,
      isAuthenticated,
      isLoading,
      getError,
    };
  }, [user, accessToken, refreshToken, loading, errors]);

  const actionsValue = useMemo(() => ({
    login,
    logout,
    checkAuthStatus,
    refreshAccessToken,
    clearError,
    clearAllErrors,
  }), [
    login,
    logout,
    checkAuthStatus,
    refreshAccessToken,
    clearError,
    clearAllErrors
  ]);

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}
