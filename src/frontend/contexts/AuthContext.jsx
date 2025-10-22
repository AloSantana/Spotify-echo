/**
 * Auth Context - Modernized with new API infrastructure
 * 
 * Uses the centralized API client for all authentication operations
 * Includes proper loading states and error handling
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/api-client.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
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
  }, [setOperationLoading, setOperationError, clearError]);

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

  // Helper functions
  const isAuthenticated = useCallback(() => {
    return !!user && !!accessToken;
  }, [user, accessToken]);

  const isLoading = useCallback((operation) => {
    if (operation) {
      return loading[operation] || false;
    }
    // Return true if any operation is loading
    return Object.values(loading).some(Boolean);
  }, [loading]);

  const getError = useCallback((operation) => {
    return errors[operation] || null;
  }, [errors]);

  const clearAllErrors = useCallback(() => {
    setErrors({
      login: null,
      logout: null,
      refresh: null,
      checkStatus: null,
    });
  }, []);

  const value = {
    // State
    user,
    accessToken,
    refreshToken,
    loading,
    errors,
    
    // Auth operations
    login,
    logout,
    checkAuthStatus,
    refreshAccessToken,
    
    // Helper functions
    isAuthenticated,
    isLoading,
    getError,
    clearError,
    clearAllErrors,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Export everything for easy access
export default {
  AuthProvider,
  useAuth,
};
