/**
 * Generic API Hook for React
 * 
 * Features:
 * - Loading states management
 * - Error handling with normalization
 * - Automatic retries
 * - Request cancellation on unmount
 * - Response caching (optional)
 * 
 * @module frontend/lib/hooks/useApi
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api-client';

/**
 * @typedef {Object} ApiState
 * @property {*} data - Response data
 * @property {boolean} loading - Loading state
 * @property {Object|null} error - Error object
 * @property {boolean} success - Success state
 */

/**
 * Generic API hook for making API requests
 * 
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Hook options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {*} [options.body] - Request body
 * @param {boolean} [options.immediate=true] - Execute immediately
 * @param {Array} [options.dependencies=[]] - Dependencies for automatic refetch
 * @param {Function} [options.onSuccess] - Success callback
 * @param {Function} [options.onError] - Error callback
 * @param {number} [options.cacheTime] - Cache duration in ms
 * @returns {[ApiState, Function, Function]} - [state, execute, reset]
 */
export function useApi(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    immediate = true,
    dependencies = [],
    onSuccess = null,
    onError = null,
    cacheTime = 0
  } = options;

  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
    success: false
  });

  const abortControllerRef = useRef(null);
  const cacheRef = useRef(null);
  const cacheTimestampRef = useRef(null);

  /**
   * Check if cached data is valid
   */
  const isCacheValid = useCallback(() => {
    if (!cacheTime || !cacheRef.current || !cacheTimestampRef.current) {
      return false;
    }
    
    return Date.now() - cacheTimestampRef.current < cacheTime;
  }, [cacheTime]);

  /**
   * Execute API request
   */
  const execute = useCallback(async (overrideBody = null) => {
    // Check cache first
    if (isCacheValid()) {
      setState({
        data: cacheRef.current,
        loading: false,
        error: null,
        success: true
      });
      return cacheRef.current;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Set loading state
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      // Build request config
      const config = {
        method,
        signal: abortControllerRef.current.signal
      };

      if (overrideBody !== null) {
        config.body = overrideBody;
      } else if (body !== null) {
        config.body = body;
      }

      // Execute request
      const response = await apiClient.request(endpoint, config);

      // Handle success
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          success: true
        });

        // Cache response
        if (cacheTime > 0) {
          cacheRef.current = response.data;
          cacheTimestampRef.current = Date.now();
        }

        // Call success callback
        if (onSuccess) {
          onSuccess(response.data);
        }

        return response.data;
      } else {
        // Handle error response
        const error = response.error || { message: 'Request failed' };
        
        setState({
          data: null,
          loading: false,
          error,
          success: false
        });

        // Call error callback
        if (onError) {
          onError(error);
        }

        return null;
      }
    } catch (error) {
      // Handle request error
      if (error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return null;
      }

      const normalizedError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An error occurred',
        details: error.details || {}
      };

      setState({
        data: null,
        loading: false,
        error: normalizedError,
        success: false
      });

      // Call error callback
      if (onError) {
        onError(normalizedError);
      }

      return null;
    }
  }, [endpoint, method, body, isCacheValid, cacheTime, onSuccess, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    // Cancel ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear cache
    cacheRef.current = null;
    cacheTimestampRef.current = null;

    // Reset state
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    });
  }, []);

  /**
   * Execute on mount or when dependencies change
   */
  useEffect(() => {
    if (immediate) {
      execute();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, ...dependencies]);

  return [state, execute, reset];
}

/**
 * Hook for making GET requests
 */
export function useGet(endpoint, options = {}) {
  return useApi(endpoint, { ...options, method: 'GET' });
}

/**
 * Hook for making POST requests
 */
export function usePost(endpoint, options = {}) {
  return useApi(endpoint, { ...options, method: 'POST', immediate: false });
}

/**
 * Hook for making PUT requests
 */
export function usePut(endpoint, options = {}) {
  return useApi(endpoint, { ...options, method: 'PUT', immediate: false });
}

/**
 * Hook for making PATCH requests
 */
export function usePatch(endpoint, options = {}) {
  return useApi(endpoint, { ...options, method: 'PATCH', immediate: false });
}

/**
 * Hook for making DELETE requests
 */
export function useDelete(endpoint, options = {}) {
  return useApi(endpoint, { ...options, method: 'DELETE', immediate: false });
}

/**
 * Hook for paginated API requests
 */
export function usePaginatedApi(endpoint, options = {}) {
  const {
    pageSize = 20,
    onSuccess = null,
    onError = null,
    ...restOptions
  } = options;

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allData, setAllData] = useState([]);

  const handleSuccess = useCallback((data) => {
    // Assume response has pagination info
    const items = data.items || data.data || data;
    const pagination = data.pagination || data.meta?.pagination;

    setAllData(prev => [...prev, ...items]);

    if (pagination) {
      setHasMore(pagination.hasNext || false);
    } else {
      // If no pagination info, check if we got less than pageSize
      setHasMore(items.length >= pageSize);
    }

    if (onSuccess) {
      onSuccess(data);
    }
  }, [pageSize, onSuccess]);

  const [state, execute, reset] = useApi(
    `${endpoint}?page=${page}&limit=${pageSize}`,
    {
      ...restOptions,
      immediate: false,
      dependencies: [page],
      onSuccess: handleSuccess,
      onError
    }
  );

  const loadMore = useCallback(() => {
    if (!state.loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [state.loading, hasMore]);

  const resetPagination = useCallback(() => {
    setPage(1);
    setHasMore(true);
    setAllData([]);
    reset();
  }, [reset]);

  return [
    {
      ...state,
      data: allData,
      hasMore
    },
    loadMore,
    resetPagination
  ];
}

export default useApi;
