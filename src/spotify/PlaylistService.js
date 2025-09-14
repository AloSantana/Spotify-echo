const SpotifyAPIService = require('./api-service');
const { traceManager } = require('../utils/agentops-trace-manager');

/**
 * PlaylistService - Comprehensive Spotify Playlist Management
 * 
 * Handles all playlist operations with Spotify Web API including:
 * - Creating personalized playlists
 * - Managing tracks (add, remove, reorder)
 * - Automatic playlist synchronization
 * - Token refresh and error handling
 * 
 * Enforces NO_MOCK policy - all operations use real Spotify API
 */
class PlaylistService {
  constructor() {
    this.spotifyAPI = new SpotifyAPIService();
    this.tokenRefreshCallbacks = new Map();
    this.playlistCache = new Map();
    this.lastError = null;
  }

  /**
   * Create a personalized playlist with tracks
   * @param {string} userId - Spotify user ID
   * @param {string} name - Playlist name
   * @param {Array} tracks - Array of track objects or URIs
   * @param {Object} config - Playlist configuration
   * @param {string} accessToken - Spotify access token
   * @returns {Object} Created playlist information
   */
  async createPersonalizedPlaylist(userId, name, tracks, config = {}, accessToken) {
    return await traceManager.traceSpotifyOperation(
      'createPersonalizedPlaylist',
      async () => {
        try {
          if (!userId || !name || !accessToken) {
            throw new Error('userId, name, and accessToken are required');
          }

          if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
            throw new Error('At least one track is required');
          }

          // Validate and normalize tracks
          const normalizedTracks = await this.normalizeTracks(tracks, accessToken);
          
          if (normalizedTracks.length === 0) {
            throw new Error('No valid tracks found');
          }

          // Create playlist configuration
          const playlistConfig = {
            name: name,
            description: config.description || 'Created by EchoTune AI - Personalized music discovery',
            public: config.public !== undefined ? config.public : false,
            collaborative: config.collaborative || false,
            ...config
          };

          console.log(`Creating playlist "${name}" for user ${userId} with ${normalizedTracks.length} tracks`);

          // Create the playlist on Spotify
          const playlist = await this.spotifyAPI.createPlaylist(
            userId, 
            playlistConfig, 
            { accessToken }
          );

          if (!playlist || !playlist.id) {
            throw new Error('Failed to create playlist on Spotify');
          }

          // Add tracks to the playlist in batches (Spotify allows max 100 tracks per request)
          const trackUris = normalizedTracks.map(track => track.uri).filter(uri => uri);
          let addedTracks = 0;

          for (let i = 0; i < trackUris.length; i += 100) {
            const batch = trackUris.slice(i, i + 100);
            try {
              const result = await this.spotifyAPI.addTracksToPlaylist(
                playlist.id,
                batch,
                { accessToken }
              );
              addedTracks += result.added_tracks || batch.length;
              
              // Update snapshot_id from last successful batch
              if (result.snapshot_id) {
                playlist.snapshot_id = result.snapshot_id;
              }
            } catch (error) {
              console.error(`Failed to add track batch ${i}-${i + batch.length}:`, error.message);
              // Continue with remaining batches
            }
          }

          // Cache the playlist
          const playlistData = {
            ...playlist,
            tracks: normalizedTracks.slice(0, addedTracks),
            trackCount: addedTracks,
            createdAt: new Date().toISOString(),
            source: 'echotune_ai'
          };

          this.playlistCache.set(playlist.id, playlistData);

          console.log(`✅ Successfully created playlist "${name}" with ${addedTracks}/${trackUris.length} tracks`);

          return {
            success: true,
            playlist: playlistData,
            spotifyUrl: playlist.spotify_url,
            addedTracks,
            totalAttempted: trackUris.length,
            warnings: addedTracks < trackUris.length ? 
              [`Only ${addedTracks} of ${trackUris.length} tracks were added successfully`] : []
          };

        } catch (error) {
          this.lastError = error;
          console.error('Create personalized playlist error:', error);
          
          // Handle specific Spotify API errors
          if (error.response?.status === 401) {
            throw new Error('Spotify access token expired. Please re-authenticate.');
          } else if (error.response?.status === 403) {
            throw new Error('Insufficient permissions to create playlists. Please grant playlist modification access.');
          } else if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded. Please try again in a few minutes.');
          }
          
          throw new Error(`Failed to create playlist: ${error.message}`);
        }
      }
    );
  }

  /**
   * Append tracks to an existing playlist
   * @param {string} userId - Spotify user ID
   * @param {string} playlistId - Playlist ID
   * @param {Array} tracks - Array of track objects or URIs
   * @param {string} accessToken - Spotify access token
   * @returns {Object} Operation result
   */
  async appendTracks(userId, playlistId, tracks, accessToken) {
    return await traceManager.traceSpotifyOperation(
      'appendTracks',
      async () => {
        try {
          if (!playlistId || !tracks || !accessToken) {
            throw new Error('playlistId, tracks, and accessToken are required');
          }

          if (!Array.isArray(tracks) || tracks.length === 0) {
            throw new Error('At least one track is required');
          }

          // Validate and normalize tracks
          const normalizedTracks = await this.normalizeTracks(tracks, accessToken);
          
          if (normalizedTracks.length === 0) {
            throw new Error('No valid tracks to add');
          }

          console.log(`Adding ${normalizedTracks.length} tracks to playlist ${playlistId}`);

          // Add tracks in batches
          const trackUris = normalizedTracks.map(track => track.uri).filter(uri => uri);
          let addedTracks = 0;
          let lastSnapshot = null;

          for (let i = 0; i < trackUris.length; i += 100) {
            const batch = trackUris.slice(i, i + 100);
            try {
              const result = await this.spotifyAPI.addTracksToPlaylist(
                playlistId,
                batch,
                { accessToken }
              );
              addedTracks += result.added_tracks || batch.length;
              lastSnapshot = result.snapshot_id;
            } catch (error) {
              console.error(`Failed to add track batch ${i}-${i + batch.length}:`, error.message);
            }
          }

          // Update cache if we have it
          if (this.playlistCache.has(playlistId)) {
            const cached = this.playlistCache.get(playlistId);
            cached.tracks = [...cached.tracks, ...normalizedTracks.slice(0, addedTracks)];
            cached.trackCount = cached.tracks.length;
            cached.snapshot_id = lastSnapshot;
            cached.updatedAt = new Date().toISOString();
          }

          console.log(`✅ Successfully added ${addedTracks}/${trackUris.length} tracks to playlist`);

          return {
            success: true,
            addedTracks,
            totalAttempted: trackUris.length,
            snapshot_id: lastSnapshot,
            warnings: addedTracks < trackUris.length ? 
              [`Only ${addedTracks} of ${trackUris.length} tracks were added successfully`] : []
          };

        } catch (error) {
          this.lastError = error;
          console.error('Append tracks error:', error);
          
          if (error.response?.status === 401) {
            throw new Error('Spotify access token expired. Please re-authenticate.');
          } else if (error.response?.status === 404) {
            throw new Error('Playlist not found or access denied.');
          }
          
          throw new Error(`Failed to add tracks: ${error.message}`);
        }
      }
    );
  }

  /**
   * Ensure playlist exists, create if not found
   * @param {string} userId - Spotify user ID
   * @param {string} key - Unique key for playlist identification
   * @param {Object} config - Playlist configuration
   * @param {string} accessToken - Spotify access token
   * @returns {Object} Playlist information
   */
  async ensurePlaylistExists(userId, key, config = {}, accessToken) {
    try {
      // Check if we have a cached playlist for this key
      const cachedPlaylistId = this.getCachedPlaylistByKey(key);
      
      if (cachedPlaylistId) {
        try {
          // Verify playlist still exists on Spotify
          const playlist = await this.getPlaylistInfo(cachedPlaylistId, accessToken);
          if (playlist) {
            console.log(`✅ Using existing playlist: ${playlist.name} (${cachedPlaylistId})`);
            return {
              success: true,
              playlist,
              created: false
            };
          }
        } catch (error) {
          console.log(`Cached playlist ${cachedPlaylistId} no longer exists, creating new one`);
          this.removeCachedPlaylistByKey(key);
        }
      }

      // Create new playlist
      const playlistName = config.name || `EchoTune ${key} Playlist`;
      const result = await this.createPersonalizedPlaylist(
        userId,
        playlistName,
        config.initialTracks || [],
        {
          ...config,
          description: config.description || `Auto-managed playlist for ${key}`
        },
        accessToken
      );

      if (result.success) {
        // Cache the playlist with the key
        this.setCachedPlaylistByKey(key, result.playlist.id);
        
        return {
          success: true,
          playlist: result.playlist,
          created: true
        };
      }

      throw new Error('Failed to create playlist');

    } catch (error) {
      this.lastError = error;
      console.error('Ensure playlist exists error:', error);
      throw error;
    }
  }

  /**
   * Get playlist information
   * @param {string} playlistId - Playlist ID
   * @param {string} accessToken - Spotify access token
   * @returns {Object} Playlist information
   */
  async getPlaylistInfo(playlistId, accessToken) {
    try {
      const response = await this.spotifyAPI.rateLimiter.checkLimit();
      
      const url = `${this.spotifyAPI.baseURL}/playlists/${playlistId}`;
      const axios = require('axios');
      
      const result = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const playlist = this.spotifyAPI.normalizePlaylist(result.data);
      
      // Update cache
      this.playlistCache.set(playlistId, {
        ...playlist,
        tracks: result.data.tracks.items.map(item => this.spotifyAPI.normalizeTrack(item.track)),
        updatedAt: new Date().toISOString()
      });

      return playlist;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Playlist not found
      }
      throw error;
    }
  }

  /**
   * Remove tracks from playlist
   * @param {string} playlistId - Playlist ID
   * @param {Array} trackUris - Array of track URIs to remove
   * @param {string} accessToken - Spotify access token
   * @returns {Object} Operation result
   */
  async removeTracks(playlistId, trackUris, accessToken) {
    try {
      if (!playlistId || !trackUris || !accessToken) {
        throw new Error('playlistId, trackUris, and accessToken are required');
      }

      const axios = require('axios');
      
      // Remove tracks in batches of 100
      let removedTracks = 0;
      let lastSnapshot = null;

      for (let i = 0; i < trackUris.length; i += 100) {
        const batch = trackUris.slice(i, i + 100);
        
        try {
          const response = await axios.delete(
            `${this.spotifyAPI.baseURL}/playlists/${playlistId}/tracks`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              data: {
                tracks: batch.map(uri => ({ uri }))
              }
            }
          );

          removedTracks += batch.length;
          lastSnapshot = response.data.snapshot_id;
          
        } catch (error) {
          console.error(`Failed to remove track batch ${i}-${i + batch.length}:`, error.message);
        }
      }

      // Update cache
      if (this.playlistCache.has(playlistId)) {
        const cached = this.playlistCache.get(playlistId);
        cached.tracks = cached.tracks.filter(track => !trackUris.includes(track.uri));
        cached.trackCount = cached.tracks.length;
        cached.snapshot_id = lastSnapshot;
        cached.updatedAt = new Date().toISOString();
      }

      return {
        success: true,
        removedTracks,
        totalAttempted: trackUris.length,
        snapshot_id: lastSnapshot
      };

    } catch (error) {
      this.lastError = error;
      console.error('Remove tracks error:', error);
      throw new Error(`Failed to remove tracks: ${error.message}`);
    }
  }

  /**
   * Normalize track data from various formats
   * @param {Array} tracks - Array of track objects or URIs
   * @param {string} accessToken - Spotify access token for validation
   * @returns {Array} Normalized track objects
   */
  async normalizeTracks(tracks, accessToken) {
    const normalized = [];

    for (const track of tracks) {
      try {
        let normalizedTrack = null;

        if (typeof track === 'string') {
          // Handle Spotify URIs
          if (track.startsWith('spotify:track:')) {
            normalizedTrack = {
              uri: track,
              id: track.replace('spotify:track:', ''),
              name: 'Unknown Track',
              artists: [{ name: 'Unknown Artist' }]
            };
          }
        } else if (track && typeof track === 'object') {
          // Handle track objects
          normalizedTrack = {
            uri: track.uri || track.spotifyUri || (track.id ? `spotify:track:${track.id}` : null) || (track.trackId ? `spotify:track:${track.trackId}` : null),
            id: track.id || track.trackId,
            name: track.name || track.trackName || 'Unknown Track',
            artists: track.artists || [{ name: track.artist || track.artistName || 'Unknown Artist' }],
            album: track.album || { name: track.albumName || 'Unknown Album' },
            duration_ms: track.duration_ms || 0,
            popularity: track.popularity || 0
          };
        }

        if (normalizedTrack && normalizedTrack.uri) {
          normalized.push(normalizedTrack);
        } else {
          console.warn('Skipping invalid track:', track);
        }

      } catch (error) {
        console.warn('Error normalizing track:', track, error.message);
      }
    }

    return normalized;
  }

  /**
   * Get cached playlist by key
   */
  getCachedPlaylistByKey(key) {
    // In a real implementation, this would use a persistent store
    // For now, use a simple Map (will be lost on restart)
    return this.playlistKeyCache?.get(key) || null;
  }

  /**
   * Set cached playlist by key
   */
  setCachedPlaylistByKey(key, playlistId) {
    if (!this.playlistKeyCache) {
      this.playlistKeyCache = new Map();
    }
    this.playlistKeyCache.set(key, playlistId);
  }

  /**
   * Remove cached playlist by key
   */
  removeCachedPlaylistByKey(key) {
    if (this.playlistKeyCache) {
      this.playlistKeyCache.delete(key);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      service: 'PlaylistService',
      cachedPlaylists: this.playlistCache.size,
      lastError: this.lastError ? {
        message: this.lastError.message,
        timestamp: new Date().toISOString()
      } : null,
      spotifyAPI: this.spotifyAPI.getStats()
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.playlistCache.clear();
    if (this.playlistKeyCache) {
      this.playlistKeyCache.clear();
    }
    console.log('Playlist service cache cleared');
  }

  /**
   * Validate Spotify access token
   */
  async validateToken(accessToken) {
    try {
      const axios = require('axios');
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      return {
        valid: true,
        user: response.data
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.status === 401 ? 'Token expired' : 'Invalid token'
      };
    }
  }
}

module.exports = PlaylistService;