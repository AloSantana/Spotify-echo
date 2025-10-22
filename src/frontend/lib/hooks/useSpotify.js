/**
 * Spotify Operations Hook
 * 
 * Features:
 * - Search tracks/artists/albums/playlists
 * - Playlist management
 * - Playback controls
 * - User library operations
 * - Automatic rate limiting to prevent API abuse
 * 
 * @module frontend/lib/hooks/useSpotify
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApi, usePost, usePut, useDelete } from './useApi';
import apiClient from '../api-client';

/**
 * Minimum delay between Spotify API requests (in ms)
 * Standard rate limiting to prevent API abuse
 */
const SPOTIFY_REQUEST_DELAY = 100; // 100ms between requests for normal rate limiting

/**
 * Rate limiter for Spotify requests
 */
class SpotifyRateLimiter {
  constructor(delayMs = SPOTIFY_REQUEST_DELAY) {
    this.delayMs = delayMs;
    this.lastRequestTime = 0;
    this.pendingRequests = [];
    this.processing = false;
  }

  async throttle(fn) {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.pendingRequests.length === 0) {
      return;
    }

    this.processing = true;

    while (this.pendingRequests.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const waitTime = Math.max(0, this.delayMs - timeSinceLastRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const { fn, resolve, reject } = this.pendingRequests.shift();

      try {
        this.lastRequestTime = Date.now();
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }
}

// Global rate limiter instance
const rateLimiter = new SpotifyRateLimiter();

/**
 * Hook for searching Spotify content
 * 
 * @param {Object} options - Search options
 * @returns {Object} Search state and functions
 */
export function useSpotifySearch(options = {}) {
  const {
    type = 'track',
    limit = 20,
    market = 'US',
    onSuccess = null,
    onError = null
  } = options;

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const search = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await rateLimiter.throttle(async () => {
        const response = await apiClient.get('/api/spotify/search', {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            q: query,
            type,
            limit,
            market
          }
        });

        return response;
      });

      if (result.success) {
        const items = result.data?.[`${type}s`]?.items || [];
        setSearchResults(items);
        
        if (onSuccess) {
          onSuccess(items);
        }
      } else {
        const error = result.error || { message: 'Search failed' };
        setSearchError(error);
        
        if (onError) {
          onError(error);
        }
      }
    } catch (error) {
      const normalizedError = {
        code: error.code || 'SEARCH_ERROR',
        message: error.message || 'Failed to search Spotify',
        details: error.details || {}
      };
      
      setSearchError(normalizedError);
      
      if (onError) {
        onError(normalizedError);
      }
    } finally {
      setIsSearching(false);
    }
  }, [type, limit, market, onSuccess, onError]);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  return {
    results: searchResults,
    loading: isSearching,
    error: searchError,
    search,
    clearResults
  };
}

/**
 * Hook for managing user playlists
 */
export function useSpotifyPlaylists() {
  const [state, execute, reset] = useApi('/api/spotify/playlists', {
    immediate: false
  });

  const [createState, createPlaylist] = usePost('/api/spotify/playlists');
  const [updateState, updatePlaylist] = usePut('/api/spotify/playlists/:id');
  const [deleteState, deletePlaylist] = useDelete('/api/spotify/playlists/:id');

  const getPlaylists = useCallback(async () => {
    return rateLimiter.throttle(() => execute());
  }, [execute]);

  const create = useCallback(async (playlistData) => {
    return rateLimiter.throttle(() => createPlaylist(playlistData));
  }, [createPlaylist]);

  const update = useCallback(async (playlistId, updates) => {
    const endpoint = `/api/spotify/playlists/${playlistId}`;
    return rateLimiter.throttle(() => 
      apiClient.put(endpoint, updates)
    );
  }, []);

  const remove = useCallback(async (playlistId) => {
    const endpoint = `/api/spotify/playlists/${playlistId}`;
    return rateLimiter.throttle(() =>
      apiClient.delete(endpoint)
    );
  }, []);

  return {
    playlists: state.data,
    loading: state.loading || createState.loading || updateState.loading || deleteState.loading,
    error: state.error || createState.error || updateState.error || deleteState.error,
    getPlaylists,
    createPlaylist: create,
    updatePlaylist: update,
    deletePlaylist: remove,
    reset
  };
}

/**
 * Hook for managing playlist tracks
 */
export function usePlaylistTracks(playlistId) {
  const endpoint = playlistId ? `/api/spotify/playlists/${playlistId}/tracks` : null;
  
  const [state, execute, reset] = useApi(endpoint, {
    immediate: false
  });

  const getTracks = useCallback(async () => {
    if (!playlistId) return null;
    return rateLimiter.throttle(() => execute());
  }, [playlistId, execute]);

  const addTracks = useCallback(async (trackUris) => {
    if (!playlistId) return null;
    
    return rateLimiter.throttle(async () => {
      const response = await apiClient.post(endpoint, { uris: trackUris });
      return response;
    });
  }, [playlistId, endpoint]);

  const removeTracks = useCallback(async (trackUris) => {
    if (!playlistId) return null;
    
    return rateLimiter.throttle(async () => {
      const response = await apiClient.delete(endpoint, {
        body: { uris: trackUris }
      });
      return response;
    });
  }, [playlistId, endpoint]);

  const reorderTracks = useCallback(async (rangeStart, insertBefore, rangeLength = 1) => {
    if (!playlistId) return null;
    
    return rateLimiter.throttle(async () => {
      const response = await apiClient.put(endpoint, {
        range_start: rangeStart,
        insert_before: insertBefore,
        range_length: rangeLength
      });
      return response;
    });
  }, [playlistId, endpoint]);

  return {
    tracks: state.data,
    loading: state.loading,
    error: state.error,
    getTracks,
    addTracks,
    removeTracks,
    reorderTracks,
    reset
  };
}

/**
 * Hook for user library operations
 */
export function useSpotifyLibrary() {
  const [savedTracks, setSavedTracks] = useState([]);
  const [savedAlbums, setSavedAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSavedTracks = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await rateLimiter.throttle(async () => {
        const { limit = 50, offset = 0 } = options;
        const response = await apiClient.get(
          `/api/spotify/me/tracks?limit=${limit}&offset=${offset}`
        );
        return response;
      });

      if (result.success) {
        setSavedTracks(result.data?.items || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError({ message: err.message || 'Failed to get saved tracks' });
    } finally {
      setLoading(false);
    }
  }, []);

  const getSavedAlbums = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await rateLimiter.throttle(async () => {
        const { limit = 50, offset = 0 } = options;
        const response = await apiClient.get(
          `/api/spotify/me/albums?limit=${limit}&offset=${offset}`
        );
        return response;
      });

      if (result.success) {
        setSavedAlbums(result.data?.items || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError({ message: err.message || 'Failed to get saved albums' });
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTrack = useCallback(async (trackId) => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.put(`/api/spotify/me/tracks`, {
        ids: [trackId]
      });
      
      if (response.success) {
        // Refresh saved tracks
        await getSavedTracks();
      }
      
      return response;
    });
  }, [getSavedTracks]);

  const removeTrack = useCallback(async (trackId) => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.delete(`/api/spotify/me/tracks`, {
        body: { ids: [trackId] }
      });
      
      if (response.success) {
        // Refresh saved tracks
        await getSavedTracks();
      }
      
      return response;
    });
  }, [getSavedTracks]);

  const saveAlbum = useCallback(async (albumId) => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.put(`/api/spotify/me/albums`, {
        ids: [albumId]
      });
      
      if (response.success) {
        // Refresh saved albums
        await getSavedAlbums();
      }
      
      return response;
    });
  }, [getSavedAlbums]);

  const removeAlbum = useCallback(async (albumId) => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.delete(`/api/spotify/me/albums`, {
        body: { ids: [albumId] }
      });
      
      if (response.success) {
        // Refresh saved albums
        await getSavedAlbums();
      }
      
      return response;
    });
  }, [getSavedAlbums]);

  return {
    savedTracks,
    savedAlbums,
    loading,
    error,
    getSavedTracks,
    getSavedAlbums,
    saveTrack,
    removeTrack,
    saveAlbum,
    removeAlbum
  };
}

/**
 * Hook for playback controls
 */
export function useSpotifyPlayback() {
  const [playbackState, setPlaybackState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentPlayback = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await rateLimiter.throttle(async () => {
        const response = await apiClient.get('/api/spotify/me/player');
        return response;
      });

      if (result.success) {
        setPlaybackState(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError({ message: err.message || 'Failed to get playback state' });
    } finally {
      setLoading(false);
    }
  }, []);

  const play = useCallback(async (options = {}) => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.put('/api/spotify/me/player/play', options);
      
      if (response.success) {
        await getCurrentPlayback();
      }
      
      return response;
    });
  }, [getCurrentPlayback]);

  const pause = useCallback(async () => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.put('/api/spotify/me/player/pause');
      
      if (response.success) {
        await getCurrentPlayback();
      }
      
      return response;
    });
  }, [getCurrentPlayback]);

  const skipToNext = useCallback(async () => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.post('/api/spotify/me/player/next');
      
      if (response.success) {
        await getCurrentPlayback();
      }
      
      return response;
    });
  }, [getCurrentPlayback]);

  const skipToPrevious = useCallback(async () => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.post('/api/spotify/me/player/previous');
      
      if (response.success) {
        await getCurrentPlayback();
      }
      
      return response;
    });
  }, [getCurrentPlayback]);

  const setVolume = useCallback(async (volumePercent) => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.put(
        `/api/spotify/me/player/volume?volume_percent=${volumePercent}`
      );
      return response;
    });
  }, []);

  const seek = useCallback(async (positionMs) => {
    return rateLimiter.throttle(async () => {
      const response = await apiClient.put(
        `/api/spotify/me/player/seek?position_ms=${positionMs}`
      );
      return response;
    });
  }, []);

  return {
    playbackState,
    loading,
    error,
    getCurrentPlayback,
    play,
    pause,
    skipToNext,
    skipToPrevious,
    setVolume,
    seek
  };
}

/**
 * Hook for getting track recommendations
 */
export function useSpotifyRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getRecommendations = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await rateLimiter.throttle(async () => {
        const queryString = new URLSearchParams(params).toString();
        const response = await apiClient.get(
          `/api/spotify/recommendations?${queryString}`
        );
        return response;
      });

      if (result.success) {
        setRecommendations(result.data?.tracks || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError({ message: err.message || 'Failed to get recommendations' });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recommendations,
    loading,
    error,
    getRecommendations
  };
}

export default {
  useSpotifySearch,
  useSpotifyPlaylists,
  usePlaylistTracks,
  useSpotifyLibrary,
  useSpotifyPlayback,
  useSpotifyRecommendations
};
