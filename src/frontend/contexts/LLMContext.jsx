/**
 * LLM Context - Modernized with new API infrastructure
 * 
 * Uses the centralized API client for HTTP operations
 * Maintains EventSource for streaming functionality
 * Includes proper loading states and error handling
 * Optimized with split context pattern to minimize re-renders.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../lib/api-client.js';

const LLMStateContext = createContext();
const LLMActionsContext = createContext();

export const useLLMState = () => {
  const context = useContext(LLMStateContext);
  if (!context) {
    throw new Error('useLLMState must be used within an LLMProvider');
  }
  return context;
};

export const useLLMActions = () => {
  const context = useContext(LLMActionsContext);
  if (!context) {
    throw new Error('useLLMActions must be used within an LLMProvider');
  }
  return context;
};

export const useLLM = () => {
  return { ...useLLMState(), ...useLLMActions() };
};

export function LLMProvider({ children }) {
  const [currentProvider, setCurrentProvider] = useState('gemini'); // Default to Gemini
  const [providers, setProviders] = useState({
    gemini: { name: 'Google Gemini', status: 'unknown', available: false }, // Gemini first
    mock: { name: 'Demo Mode (Mock)', status: 'connected', available: true },
    openai: { name: 'OpenAI GPT', status: 'unknown', available: false },
    azure: { name: 'Azure OpenAI', status: 'unknown', available: false },
    openrouter: { name: 'OpenRouter', status: 'unknown', available: false },
  });
  
  // Loading states for each operation
  const [loading, setLoading] = useState({
    refreshProviders: false,
    switchProvider: false,
    sendMessage: false,
    healthCheck: false,
  });
  
  // Error states
  const [errors, setErrors] = useState({
    refreshProviders: null,
    switchProvider: null,
    sendMessage: null,
    healthCheck: null,
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

  const mapProvidersFromUnified = (list) => {
    const updated = { ...providers };
    for (const p of list) {
      const key = p.id;
      if (!updated[key]) continue;
      updated[key] = {
        ...updated[key],
        name: p.name || updated[key].name,
        status: p.status || 'unknown',
        available: !!p.available,
        model: p.model,
      };
    }
    return updated;
  };

  const refreshProviders = useCallback(async () => {
    setOperationLoading('refreshProviders', true);
    clearError('refreshProviders');
    
    try {
      // Try unified providers endpoint first using apiClient
      let updatedProviders = null;
      try {
        const data = await apiClient.get('/api/providers');
        if (data.success && Array.isArray(data.providers)) {
          updatedProviders = mapProvidersFromUnified(data.providers);
        }
      } catch (unifiedError) {
        console.log('Unified endpoint not available, trying fallback');
      }

      if (!updatedProviders) {
        // Fallback to chat providers endpoint
        const data = await apiClient.get('/api/chat/providers');
        if (data.success && Array.isArray(data.providers)) {
          updatedProviders = { ...providers };
          for (const p of data.providers) {
            const key = p.id;
            if (!updatedProviders[key]) continue;
            updatedProviders[key] = {
              ...updatedProviders[key],
              status: p.status,
              available: p.available,
              model: p.model,
            };
          }
        }
      }

      if (updatedProviders) {
        setProviders(updatedProviders);
        // Auto-select best available provider - prioritize Gemini first
        const providerPriority = ['gemini', 'openai', 'openrouter', 'mock'];
        
        setCurrentProvider(current => {
          if (!updatedProviders[current]?.available) {
            return providerPriority.find((key) => updatedProviders[key]?.available) || 'mock';
          }
          return current;
        });
      }
    } catch (error) {
      console.error('Failed to refresh providers:', error);
      
      setOperationError('refreshProviders', {
        message: 'Failed to refresh LLM providers',
        details: error.message,
        code: error.code || 'PROVIDER_REFRESH_FAILED'
      });
      
      // Fallback to mock provider on error
      setCurrentProvider('mock');
    } finally {
      setOperationLoading('refreshProviders', false);
    }
  }, [setOperationLoading, setOperationError, clearError]); // Fixed dependencies

  useEffect(() => {
    refreshProviders();
  }, []); // Only run on mount

  const switchProvider = async (providerId) => {
    if (!providers[providerId]?.available) {
      console.warn(`Provider ${providerId} is not available`);
      return false;
    }

    setOperationLoading('switchProvider', true);
    clearError('switchProvider');

    try {
      // Try unified switch endpoint first using apiClient
      try {
        const data = await apiClient.post('/api/providers/switch', { provider: providerId });
        if (data.success) {
          setCurrentProvider(providerId);
          return true;
        }
      } catch (unifiedError) {
        console.log('Unified switch endpoint not available, trying fallback');
      }

      // Fallback: test provider via chat test endpoint
      const data = await apiClient.post('/api/chat/test', {
        message: 'Hello',
        provider: providerId,
      });

      if (data.success || data.response) {
        setCurrentProvider(providerId);
        return true;
      } else {
        throw new Error('Provider test failed');
      }
    } catch (error) {
      console.error('Provider switch error:', error);
      
      setOperationError('switchProvider', {
        message: `Failed to switch to ${providerId}`,
        details: error.message,
        code: error.code || 'PROVIDER_SWITCH_FAILED'
      });
      
      return false;
    } finally {
      setOperationLoading('switchProvider', false);
    }
  };

  // Enhanced provider health tracking
  const [providerHealth, setProviderHealth] = useState({});
  const [streamingState, setStreamingState] = useState({
    isStreaming: false,
    currentMessage: '',
    canAbort: false,
    controller: null
  });

  // Poll provider health periodically
  useEffect(() => {
    const pollHealth = async () => {
      setOperationLoading('healthCheck', true);
      
      try {
        const data = await apiClient.get('/api/chat/providers/health');
        if (data.success || data.providers) {
          setProviderHealth(data.providers || {});
        }
      } catch (error) {
        console.error('Failed to poll provider health:', error);
        
        setOperationError('healthCheck', {
          message: 'Health check failed',
          details: error.message,
          code: error.code || 'HEALTH_CHECK_FAILED'
        });
      } finally {
        setOperationLoading('healthCheck', false);
      }
    };

    pollHealth(); // Initial poll
    const interval = setInterval(pollHealth, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [setOperationLoading, setOperationError]);

  const sendStreamingMessage = async (message, context = {}, onDelta, onComplete) => {
    if (!message.trim()) return null;

    const sessionId = context.sessionId || 'default';
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create AbortController for cancellation
    const controller = new AbortController();
    setStreamingState({
      isStreaming: true,
      currentMessage: '',
      canAbort: true,
      controller
    });

    try {
      const queryParams = new URLSearchParams({
        sessionId,
        message: message.trim(),
        provider: currentProvider,
        model: context.model || ''
      });

      const eventSource = new EventSource(`/api/chat/stream?${queryParams}`);
      
      let streamedContent = '';
      let startTime = Date.now();

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('Connected to stream:', data.requestId);
      });

      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        streamedContent += data.delta || '';
        
        setStreamingState(prev => ({
          ...prev,
          currentMessage: streamedContent
        }));

        if (onDelta) {
          onDelta(data.delta, streamedContent, data.isPartial);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);
        const totalTime = Date.now() - startTime;
        
        setStreamingState({
          isStreaming: false,
          currentMessage: '',
          canAbort: false,
          controller: null
        });

        eventSource.close();
        
        if (onComplete) {
          onComplete({
            success: true,
            response: streamedContent,
            provider: data.provider || currentProvider,
            requestId: data.requestId,
            totalTime: data.totalTime || totalTime
          });
        }
      });

      eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        console.error('Stream error:', data.error);
        
        setStreamingState({
          isStreaming: false,
          currentMessage: '',
          canAbort: false,
          controller: null
        });

        eventSource.close();
        
        if (onComplete) {
          onComplete({
            success: false,
            error: data.error,
            final: data.final
          });
        }
      });

      eventSource.addEventListener('retry', (event) => {
        const data = JSON.parse(event.data);
        console.log('Retrying...', data);
        // Visual feedback for retry could be added here
      });

      eventSource.addEventListener('heartbeat', (event) => {
        // Keep connection alive, could update UI with last heartbeat
      });

      // Handle manual abort
      controller.signal.addEventListener('abort', () => {
        eventSource.close();
        setStreamingState({
          isStreaming: false,
          currentMessage: '',
          canAbort: false,
          controller: null
        });
        
        if (onComplete) {
          onComplete({
            success: false,
            error: 'Stream cancelled by user'
          });
        }
      });

      return { success: true, streaming: true, requestId };

    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingState({
        isStreaming: false,
        currentMessage: '',
        canAbort: false,
        controller: null
      });
      
      return {
        success: false,
        error: 'Failed to start streaming'
      };
    }
  };

  const abortStream = () => {
    if (streamingState.controller) {
      streamingState.controller.abort();
    }
  };

  const switchProviderEnhanced = async (providerId, model = null) => {
    if (!providers[providerId]?.available) {
      throw new Error(`Provider ${providerId} is not available`);
    }

    setOperationLoading('switchProvider', true);
    clearError('switchProvider');

    try {
      const data = await apiClient.post('/api/chat/providers/switch', { 
        provider: providerId, 
        model 
      });

      if (data.success) {
        setCurrentProvider(providerId);
        
        // Update provider model if specified
        if (model) {
          setProviders(prev => ({
            ...prev,
            [providerId]: {
              ...prev[providerId],
              model
            }
          }));
        }

        return data;
      } else {
        throw new Error('Failed to switch provider');
      }
    } catch (error) {
      console.error('Provider switch error:', error);
      
      setOperationError('switchProvider', {
        message: `Failed to switch to ${providerId}`,
        details: error.message,
        code: error.code || 'PROVIDER_SWITCH_ENHANCED_FAILED'
      });
      
      throw error;
    } finally {
      setOperationLoading('switchProvider', false);
    }
  };

  const sendMessage = async (message, context = {}) => {
    if (!message.trim()) return null;

    setOperationLoading('sendMessage', true);
    clearError('sendMessage');

    try {
      const endpoint = context.isDemo ? '/api/chat/test' : '/api/chat';

      const requestBody = {
        message: message.trim(),
        provider: currentProvider,
        ...context,
      };

      const data = await apiClient.post(endpoint, requestBody);

      if (data.success || data.response) {
        return {
          success: true,
          response: data.response || data.message,
          action: data.action,
          data: data.data,
          provider: currentProvider,
        };
      } else {
        // If provider fails, try fallback to mock
        if (currentProvider !== 'mock') {
          console.warn(`Provider ${currentProvider} failed, falling back to mock`);
          
          try {
            const fallbackData = await apiClient.post('/api/chat/test', {
              message: message.trim(),
              provider: 'mock',
            });

            if (fallbackData.success || fallbackData.response) {
              setCurrentProvider('mock');
              return {
                success: true,
                response: fallbackData.response,
                provider: 'mock',
                fallback: true,
              };
            }
          } catch (fallbackError) {
            console.error('Fallback to mock failed:', fallbackError);
          }
        }

        throw new Error(data.message || 'Message send failed');
      }
    } catch (error) {
      console.error('Message send error:', error);
      
      setOperationError('sendMessage', {
        message: 'Failed to send message',
        details: error.message,
        code: error.code || 'MESSAGE_SEND_FAILED'
      });
      
      return {
        success: false,
        error: error.message || 'Connection error. Please check your internet connection.',
      };
    } finally {
      setOperationLoading('sendMessage', false);
    }
  };

  const getProviderStatus = (providerId) => {
    return providers[providerId]?.status || 'unknown';
  };

  const isProviderAvailable = (providerId) => {
    return providers[providerId]?.available || false;
  };

  // Helper to check if any operation is loading
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
      refreshProviders: null,
      switchProvider: null,
      sendMessage: null,
      healthCheck: null,
    });
  }, []);

  const stateValue = useMemo(() => {
    const getProviderStatus = (providerId) => {
      return providers[providerId]?.status || 'unknown';
    };

    const isProviderAvailable = (providerId) => {
      return providers[providerId]?.available || false;
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
      currentProvider,
      providers,
      providerHealth,
      streamingState,
      loading,
      errors,
      getProviderStatus,
      isProviderAvailable,
      isLoading,
      getError,
    };
  }, [currentProvider, providers, providerHealth, streamingState, loading, errors]);

  const actionsValue = useMemo(() => ({
    refreshProviders,
    switchProvider,
    switchProviderEnhanced,
    sendMessage,
    sendStreamingMessage,
    abortStream,
    clearError,
    clearAllErrors,
  }), [
    refreshProviders,
    switchProvider,
    switchProviderEnhanced,
    sendMessage,
    sendStreamingMessage,
    abortStream,
    clearError,
    clearAllErrors,
  ]);

  return (
    <LLMStateContext.Provider value={stateValue}>
      <LLMActionsContext.Provider value={actionsValue}>
        {children}
      </LLMActionsContext.Provider>
    </LLMStateContext.Provider>
  );
}
