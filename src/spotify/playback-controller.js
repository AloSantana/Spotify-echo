/**
 * Spotify Playback Controller
 * Handles playback control, queue management, and device operations
 */

const axios = require('axios');

/**
 * Playback Controller Class
 */
class PlaybackController {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.spotify.com/v1';
  }

  /**
   * Update access token
   * @param {string} token - New access token
   */
  setAccessToken(token) {
    this.accessToken = token;
  }

  /**
   * Make Spotify API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('Access token is required');
    }

    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${this.baseURL}${endpoint}`;

    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: options.data,
        params: options.params,
      });

      return response.data;
    } catch (error) {
      // Handle specific Spotify API errors
      if (error.response?.status === 401) {
        throw new Error('Spotify authentication expired. Please reconnect.');
      }

      if (error.response?.status === 403) {
        throw new Error('Premium account required for playback control.');
      }

      if (error.response?.status === 404) {
        if (error.response.data?.error?.reason === 'NO_ACTIVE_DEVICE') {
          throw new Error('No active Spotify device found. Please open Spotify on a device.');
        }
        throw new Error('Resource not found.');
      }

      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 1;
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
      }

      throw new Error(
        error.response?.data?.error?.message || 
        error.message || 
        'Spotify API error'
      );
    }
  }

  /**
   * Get currently playing track
   * @returns {Promise<Object>} Now playing info
   */
  async getNowPlaying() {
    try {
      const data = await this.makeRequest('/me/player/currently-playing');
      
      if (!data || !data.item) {
        return {
          isPlaying: false,
          track: null,
        };
      }

      return {
        isPlaying: data.is_playing,
        track: {
          id: data.item.id,
          name: data.item.name,
          artists: data.item.artists.map(a => a.name),
          album: data.item.album.name,
          albumArt: data.item.album.images[0]?.url,
          uri: data.item.uri,
          duration_ms: data.item.duration_ms,
          progress_ms: data.progress_ms,
        },
        device: {
          id: data.device?.id,
          name: data.device?.name,
          type: data.device?.type,
          volume: data.device?.volume_percent,
        },
        shuffle: data.shuffle_state,
        repeat: data.repeat_state,
      };
    } catch (error) {
      if (error.message.includes('NO_ACTIVE_DEVICE')) {
        return {
          isPlaying: false,
          track: null,
          error: 'No active device',
        };
      }
      throw error;
    }
  }

  /**
   * Play a track, album, or playlist
   * @param {Object} options - Play options
   * @returns {Promise<void>}
   */
  async play(options = {}) {
    const { uri, uris, contextUri, deviceId } = options;

    const data = {};
    
    if (contextUri) {
      // Play album or playlist
      data.context_uri = contextUri;
    } else if (uris) {
      // Play multiple tracks
      data.uris = uris;
    } else if (uri) {
      // Play single track
      data.uris = [uri];
    }

    const params = deviceId ? { device_id: deviceId } : {};

    await this.makeRequest('/me/player/play', {
      method: 'PUT',
      data,
      params,
    });

    return { success: true, message: 'Playback started' };
  }

  /**
   * Pause playback
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async pause(deviceId = null) {
    const params = deviceId ? { device_id: deviceId } : {};

    await this.makeRequest('/me/player/pause', {
      method: 'PUT',
      params,
    });

    return { success: true, message: 'Playback paused' };
  }

  /**
   * Skip to next track
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async skip(deviceId = null) {
    const params = deviceId ? { device_id: deviceId } : {};

    await this.makeRequest('/me/player/next', {
      method: 'POST',
      params,
    });

    return { success: true, message: 'Skipped to next track' };
  }

  /**
   * Go to previous track
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async previous(deviceId = null) {
    const params = deviceId ? { device_id: deviceId } : {};

    await this.makeRequest('/me/player/previous', {
      method: 'POST',
      params,
    });

    return { success: true, message: 'Skipped to previous track' };
  }

  /**
   * Add track to queue
   * @param {string} uri - Track URI
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async addToQueue(uri, deviceId = null) {
    if (!uri) {
      throw new Error('Track URI is required');
    }

    const params = { uri };
    if (deviceId) {
      params.device_id = deviceId;
    }

    await this.makeRequest('/me/player/queue', {
      method: 'POST',
      params,
    });

    return { success: true, message: 'Track added to queue' };
  }

  /**
   * Set shuffle state
   * @param {boolean} state - Shuffle on/off
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async setShuffle(state, deviceId = null) {
    const params = { state };
    if (deviceId) {
      params.device_id = deviceId;
    }

    await this.makeRequest('/me/player/shuffle', {
      method: 'PUT',
      params,
    });

    return { 
      success: true, 
      message: `Shuffle ${state ? 'enabled' : 'disabled'}` 
    };
  }

  /**
   * Set repeat mode
   * @param {string} state - 'track', 'context', 'off'
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async setRepeat(state, deviceId = null) {
    if (!['track', 'context', 'off'].includes(state)) {
      throw new Error('Repeat state must be "track", "context", or "off"');
    }

    const params = { state };
    if (deviceId) {
      params.device_id = deviceId;
    }

    await this.makeRequest('/me/player/repeat', {
      method: 'PUT',
      params,
    });

    return { 
      success: true, 
      message: `Repeat set to ${state}` 
    };
  }

  /**
   * Set playback volume
   * @param {number} volumePercent - Volume (0-100)
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async setVolume(volumePercent, deviceId = null) {
    if (volumePercent < 0 || volumePercent > 100) {
      throw new Error('Volume must be between 0 and 100');
    }

    const params = { volume_percent: Math.round(volumePercent) };
    if (deviceId) {
      params.device_id = deviceId;
    }

    await this.makeRequest('/me/player/volume', {
      method: 'PUT',
      params,
    });

    return { 
      success: true, 
      message: `Volume set to ${Math.round(volumePercent)}%` 
    };
  }

  /**
   * Get available devices
   * @returns {Promise<Array>} List of devices
   */
  async getDevices() {
    const data = await this.makeRequest('/me/player/devices');
    
    return data.devices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      isActive: device.is_active,
      isPrivateSession: device.is_private_session,
      isRestricted: device.is_restricted,
      volume: device.volume_percent,
    }));
  }

  /**
   * Transfer playback to a device
   * @param {string} deviceId - Device ID
   * @param {boolean} play - Start playback after transfer
   * @returns {Promise<void>}
   */
  async transferPlayback(deviceId, play = true) {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    await this.makeRequest('/me/player', {
      method: 'PUT',
      data: {
        device_ids: [deviceId],
        play,
      },
    });

    return { 
      success: true, 
      message: 'Playback transferred' 
    };
  }

  /**
   * Seek to position in current track
   * @param {number} positionMs - Position in milliseconds
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async seek(positionMs, deviceId = null) {
    if (positionMs < 0) {
      throw new Error('Position must be non-negative');
    }

    const params = { position_ms: Math.round(positionMs) };
    if (deviceId) {
      params.device_id = deviceId;
    }

    await this.makeRequest('/me/player/seek', {
      method: 'PUT',
      params,
    });

    return { success: true, message: 'Playback position updated' };
  }

  /**
   * Get user's queue
   * @returns {Promise<Object>} Queue info
   */
  async getQueue() {
    const data = await this.makeRequest('/me/player/queue');
    
    return {
      currentlyPlaying: data.currently_playing ? {
        id: data.currently_playing.id,
        name: data.currently_playing.name,
        artists: data.currently_playing.artists.map(a => a.name),
        uri: data.currently_playing.uri,
      } : null,
      queue: data.queue.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name),
        uri: track.uri,
      })),
    };
  }

  /**
   * Resume playback
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<void>}
   */
  async resume(deviceId = null) {
    return this.play({ deviceId });
  }

  /**
   * Toggle playback (play/pause)
   * @returns {Promise<Object>} New state
   */
  async togglePlayback() {
    const nowPlaying = await this.getNowPlaying();
    
    if (nowPlaying.isPlaying) {
      await this.pause();
      return { 
        success: true, 
        message: 'Paused', 
        isPlaying: false 
      };
    } else {
      await this.resume();
      return { 
        success: true, 
        message: 'Playing', 
        isPlaying: true 
      };
    }
  }
}

module.exports = PlaybackController;
