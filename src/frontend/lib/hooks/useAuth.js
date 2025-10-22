/**
 * Authentication Hook
 * 
 * Features:
 * - Login/logout operations
 * - Token management with auto-refresh
 * - Auth state tracking
 * - Automatic session persistence
 * 
 * @module frontend/lib/hooks/useAuth
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api-client';

/**
 * @typedef {Object} AuthUser
 * @property {string} id - User ID
 * @property {string} display_name - Display name
 * @property {string} email - Email address
 * @property {Object} images - Profile images
 * @property {string} country - Country code
 * @property {string} product - Spotify product type
 */

/**
 * @typedef {Object} AuthState
 * @property {AuthUser|null} user - Current user
 * @property {boolean} isAuthenticated - Authentication status
 * @property {boolean} loading - Loading state
 * @property {Object|null} error - Error object
 * @property {string|null} accessToken - Access token
 */

/**
 * Hook for managing authentication
 * 
 * @returns {Object} Auth state and functions
 */
export function useAuth() {
  const [state, setState] = useState({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null,
    accessToken: null
  });

  const tokenRefreshTimerRef = useRef(null);
  const isRefreshingRef = useRef(false);

  /**
   * Load authentication state from localStorage
   */
  const loadAuthState = useCallback(() => {
    try {
      const accessToken = localStorage.getItem('spotify_access_token');
      const expiresAt = localStorage.getItem('spotify_token_expires_at');
      const userStr = localStorage.getItem('spotify_user');

      if (accessToken && expiresAt) {
        const now = Date.now();
        const expires = parseInt(expiresAt, 10);

        if (now < expires) {
          // Token is valid
          const user = userStr ? JSON.parse(userStr) : null;
          
          setState({
            user,
            isAuthenticated: true,
            loading: false,
            error: null,
            accessToken
          });

          // Schedule token refresh
          scheduleTokenRefresh(expires - now);
          return true;
        }
      }

      // No valid token found
      setState(prev => ({
        ...prev,
        loading: false,
        isAuthenticated: false
      }));
      return false;

    } catch (error) {
      console.error('Failed to load auth state:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        isAuthenticated: false,
        error: { message: 'Failed to load authentication state' }
      }));
      return false;
    }
  }, []);

  /**
   * Save authentication state to localStorage
   */
  const saveAuthState = useCallback((user, accessToken, refreshToken, expiresIn) => {
    try {
      const expiresAt = Date.now() + (expiresIn * 1000);

      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
      
      if (refreshToken) {
        localStorage.setItem('spotify_refresh_token', refreshToken);
      }
      
      if (user) {
        localStorage.setItem('spotify_user', JSON.stringify(user));
      }

      setState({
        user,
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken
      });

      // Schedule token refresh
      scheduleTokenRefresh(expiresIn * 1000);

    } catch (error) {
      console.error('Failed to save auth state:', error);
      setState(prev => ({
        ...prev,
        error: { message: 'Failed to save authentication state' }
      }));
    }
  }, []);

  /**
   * Clear authentication state
   */
  const clearAuthState = useCallback(() => {
    try {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_token_expires_at');
      localStorage.removeItem('spotify_refresh_token');
      localStorage.removeItem('spotify_user');

      // Clear refresh timer
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }

      setState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        accessToken: null
      });

    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  }, []);

  /**
   * Schedule automatic token refresh
   */
  const scheduleTokenRefresh = useCallback((expiresInMs) => {
    // Clear existing timer
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
    }

    // Refresh 5 minutes before expiration
    const refreshTime = Math.max(expiresInMs - (5 * 60 * 1000), 0);

    tokenRefreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, refreshTime);
  }, []);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async () => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      const refreshToken = localStorage.getItem('spotify_refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/api/auth/refresh', {
        refresh_token: refreshToken
      }, {
        skipAuth: true
      });

      if (response.success && response.data) {
        const { access_token, refresh_token, expires_in, user } = response.data;
        
        saveAuthState(
          user || state.user,
          access_token,
          refresh_token || refreshToken,
          expires_in
        );

        return true;
      } else {
        throw new Error(response.error?.message || 'Token refresh failed');
      }

    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Clear auth state on refresh failure
      clearAuthState();
      
      setState(prev => ({
        ...prev,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Session expired. Please login again.'
        }
      }));

      return false;

    } finally {
      isRefreshingRef.current = false;
    }
  }, [state.user, saveAuthState, clearAuthState]);

  /**
   * Login with Spotify
   */
  const login = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Redirect to Spotify OAuth
      window.location.href = '/api/auth/login';

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error.message || 'Login failed'
        }
      }));
    }
  }, []);

  /**
   * Handle OAuth callback
   */
  const handleCallback = useCallback(async (code) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await apiClient.post('/api/auth/callback', {
        code
      }, {
        skipAuth: true
      });

      if (response.success && response.data) {
        const { access_token, refresh_token, expires_in, user } = response.data;
        
        saveAuthState(user, access_token, refresh_token, expires_in);
        
        return true;
      } else {
        throw new Error(response.error?.message || 'Callback failed');
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: {
          code: 'CALLBACK_FAILED',
          message: error.message || 'Authentication callback failed'
        }
      }));
      return false;
    }
  }, [saveAuthState]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Call logout endpoint (optional, for server-side cleanup)
      await apiClient.post('/api/auth/logout', {}).catch(() => {
        // Ignore errors, we're logging out anyway
      });

      clearAuthState();

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      clearAuthState();
    }
  }, [clearAuthState]);

  /**
   * Get current user profile
   */
  const getCurrentUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/spotify/me');

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          user: response.data,
          error: null
        }));

        // Update stored user
        localStorage.setItem('spotify_user', JSON.stringify(response.data));

        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to get user profile');
      }

    } catch (error) {
      console.error('Get user profile failed:', error);
      return null;
    }
  }, []);

  /**
   * Check if token needs refresh
   */
  const checkTokenExpiration = useCallback(() => {
    const expiresAt = localStorage.getItem('spotify_token_expires_at');
    
    if (!expiresAt) {
      return false;
    }

    const now = Date.now();
    const expires = parseInt(expiresAt, 10);
    const timeUntilExpiry = expires - now;

    // Refresh if less than 5 minutes remaining
    if (timeUntilExpiry < (5 * 60 * 1000)) {
      refreshToken();
      return true;
    }

    return false;
  }, [refreshToken]);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    loadAuthState();

    // Cleanup on unmount
    return () => {
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
      }
    };
  }, [loadAuthState]);

  /**
   * Check token expiration periodically
   */
  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    // Check every minute
    const intervalId = setInterval(() => {
      checkTokenExpiration();
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [state.isAuthenticated, checkTokenExpiration]);

  return {
    ...state,
    login,
    logout,
    handleCallback,
    refreshToken,
    getCurrentUser,
    checkTokenExpiration
  };
}

/**
 * Hook for checking if user is authenticated
 */
export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Hook for getting current user
 */
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}

/**
 * Hook for protected routes
 */
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login
      window.location.href = '/login';
    }
  }, [isAuthenticated, loading]);

  return { isAuthenticated, loading };
}

export default useAuth;
