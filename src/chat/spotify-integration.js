/**
 * Spotify Integration for Chat
 * Connects chat commands to Spotify playback controller
 */

const SpotifyCommandParser = require('./spotify-command-parser');
const { COMMAND_TYPES } = require('./spotify-command-parser');
const PlaybackController = require('../spotify/playback-controller');
const SpotifyAPIService = require('../spotify/api-service');

/**
 * Spotify Chat Integration Class
 */
class SpotifyChatIntegration {
  constructor() {
    this.parser = new SpotifyCommandParser();
    this.apiService = new SpotifyAPIService();
  }

  /**
   * Process chat message for Spotify commands
   * @param {string} message - User message
   * @param {string} accessToken - Spotify access token
   * @returns {Promise<Object>} Command execution result
   */
  async processMessage(message, accessToken) {
    // Check if message contains Spotify command
    if (!this.parser.hasSpotifyCommand(message)) {
      return {
        isSpotifyCommand: false,
        result: null,
      };
    }

    // Parse command
    const command = this.parser.parse(message);

    if (command.type === COMMAND_TYPES.UNKNOWN || command.confidence < 0.4) {
      return {
        isSpotifyCommand: true,
        command,
        result: {
          success: false,
          message: 'Sorry, I didn\'t understand that Spotify command. Try something like "play energetic rock music" or "pause".',
        },
      };
    }

    // Execute command
    try {
      const controller = new PlaybackController(accessToken);
      const result = await this.executeCommand(command, controller, accessToken);

      return {
        isSpotifyCommand: true,
        command,
        result,
      };
    } catch (error) {
      return {
        isSpotifyCommand: true,
        command,
        result: {
          success: false,
          message: error.message,
          error: error.message,
        },
      };
    }
  }

  /**
   * Execute parsed Spotify command
   * @param {Object} command - Parsed command
   * @param {PlaybackController} controller - Playback controller
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Execution result
   */
  async executeCommand(command, controller, accessToken) {
    switch (command.type) {
      case COMMAND_TYPES.PLAY:
        return await this.handlePlay(command, controller, accessToken);

      case COMMAND_TYPES.PAUSE:
        return await controller.pause();

      case COMMAND_TYPES.SKIP:
        return await controller.skip();

      case COMMAND_TYPES.PREVIOUS:
        return await controller.previous();

      case COMMAND_TYPES.QUEUE:
        return await this.handleQueue(command, controller, accessToken);

      case COMMAND_TYPES.SEARCH:
        return await this.handleSearch(command, accessToken);

      case COMMAND_TYPES.RECOMMEND:
        return await this.handleRecommend(command, accessToken);

      case COMMAND_TYPES.NOW_PLAYING:
        return await this.handleNowPlaying(controller);

      case COMMAND_TYPES.SHUFFLE:
        return await this.handleShuffle(command, controller);

      case COMMAND_TYPES.REPEAT:
        return await this.handleRepeat(command, controller);

      case COMMAND_TYPES.VOLUME:
        return await this.handleVolume(command, controller);

      case COMMAND_TYPES.DEVICE:
        return await this.handleDevice(command, controller);

      case COMMAND_TYPES.PLAYLIST_CREATE:
        return await this.handlePlaylistCreate(command, accessToken);

      default:
        return {
          success: false,
          message: `Command type "${command.type}" not yet implemented.`,
        };
    }
  }

  /**
   * Handle play command
   * @param {Object} command - Command object
   * @param {PlaybackController} controller - Controller
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Result
   */
  async handlePlay(command, controller, accessToken) {
    const { query, filters } = command.params;

    if (!query || query.trim().length === 0) {
      // Resume playback
      return await controller.resume();
    }

    // Search for tracks matching query and filters
    const searchResults = await this.apiService.searchTracks(query, {
      accessToken,
      limit: 10,
      ...filters,
    });

    if (!searchResults.tracks || searchResults.tracks.length === 0) {
      return {
        success: false,
        message: `No tracks found for "${query}".`,
      };
    }

    // Play first result
    const track = searchResults.tracks[0];
    await controller.play({ uri: track.uri });

    return {
      success: true,
      message: `Now playing: ${track.name} by ${track.artists[0].name}`,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name),
        uri: track.uri,
      },
      alternatives: searchResults.tracks.slice(1, 5).map(t => ({
        id: t.id,
        name: t.name,
        artists: t.artists.map(a => a.name),
        uri: t.uri,
      })),
    };
  }

  /**
   * Handle queue command
   * @param {Object} command - Command object
   * @param {PlaybackController} controller - Controller
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Result
   */
  async handleQueue(command, controller, accessToken) {
    const { query } = command.params;

    if (!query) {
      return {
        success: false,
        message: 'Please specify what to add to the queue.',
      };
    }

    // Search for track
    const searchResults = await this.apiService.search(query, 'track', {
      accessToken,
      limit: 1,
    });

    if (!searchResults.tracks || searchResults.tracks.length === 0) {
      return {
        success: false,
        message: `No tracks found for "${query}".`,
      };
    }

    const track = searchResults.tracks[0];
    await controller.addToQueue(track.uri);

    return {
      success: true,
      message: `Added "${track.name}" by ${track.artists[0].name} to queue`,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name),
        uri: track.uri,
      },
    };
  }

  /**
   * Handle search command
   * @param {Object} command - Command object
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Result
   */
  async handleSearch(command, accessToken) {
    const { query, filters } = command.params;

    if (!query) {
      return {
        success: false,
        message: 'Please specify what to search for.',
      };
    }

    const searchResults = await this.apiService.searchTracks(query, {
      accessToken,
      limit: 10,
      ...filters,
    });

    if (!searchResults.tracks || searchResults.tracks.length === 0) {
      return {
        success: false,
        message: `No tracks found for "${query}".`,
      };
    }

    return {
      success: true,
      message: `Found ${searchResults.tracks.length} tracks for "${query}"`,
      tracks: searchResults.tracks.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name),
        album: track.album?.name,
        uri: track.uri,
      })),
    };
  }

  /**
   * Handle recommend command
   * @param {Object} command - Command object
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Result
   */
  async handleRecommend(command, accessToken) {
    const { query, filters, count } = command.params;

    // Use search as recommendations (simplified)
    const searchResults = await this.apiService.searchTracks(query || 'popular', {
      accessToken,
      limit: count || 10,
      ...filters,
    });

    if (!searchResults.tracks || searchResults.tracks.length === 0) {
      return {
        success: false,
        message: 'Could not generate recommendations.',
      };
    }

    return {
      success: true,
      message: `Here are ${searchResults.tracks.length} recommendations`,
      recommendations: searchResults.tracks.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name),
        album: track.album?.name,
        uri: track.uri,
      })),
    };
  }

  /**
   * Handle now playing command
   * @param {PlaybackController} controller - Controller
   * @returns {Promise<Object>} Result
   */
  async handleNowPlaying(controller) {
    const nowPlaying = await controller.getNowPlaying();

    if (!nowPlaying.track) {
      return {
        success: true,
        message: 'Nothing is currently playing.',
        nowPlaying: null,
      };
    }

    return {
      success: true,
      message: `Now playing: ${nowPlaying.track.name} by ${nowPlaying.track.artists.join(', ')}`,
      nowPlaying: {
        track: nowPlaying.track,
        device: nowPlaying.device,
        isPlaying: nowPlaying.isPlaying,
        shuffle: nowPlaying.shuffle,
        repeat: nowPlaying.repeat,
      },
    };
  }

  /**
   * Handle shuffle command
   * @param {Object} command - Command object
   * @param {PlaybackController} controller - Controller
   * @returns {Promise<Object>} Result
   */
  async handleShuffle(command, controller) {
    const input = command.originalInput.toLowerCase();
    const state = !/\b(off|disable)\b/i.test(input);

    return await controller.setShuffle(state);
  }

  /**
   * Handle repeat command
   * @param {Object} command - Command object
   * @param {PlaybackController} controller - Controller
   * @returns {Promise<Object>} Result
   */
  async handleRepeat(command, controller) {
    const input = command.originalInput.toLowerCase();

    let state = 'context'; // Default

    if (/\b(off|disable)\b/i.test(input)) {
      state = 'off';
    } else if (/\b(track|song|this)\b/i.test(input)) {
      state = 'track';
    }

    return await controller.setRepeat(state);
  }

  /**
   * Handle volume command
   * @param {Object} command - Command object
   * @param {PlaybackController} controller - Controller
   * @returns {Promise<Object>} Result
   */
  async handleVolume(command, controller) {
    const { level, relative } = command.params;

    if (level !== null) {
      return await controller.setVolume(level);
    }

    if (relative) {
      // Get current volume and adjust
      const nowPlaying = await controller.getNowPlaying();
      const currentVolume = nowPlaying.device?.volume || 50;

      const input = command.originalInput.toLowerCase();
      const delta = /\b(up|louder|increase)\b/i.test(input) ? 10 : -10;

      const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
      return await controller.setVolume(newVolume);
    }

    return {
      success: false,
      message: 'Please specify a volume level (0-100) or "up"/"down".',
    };
  }

  /**
   * Handle device command
   * @param {Object} command - Command object
   * @param {PlaybackController} controller - Controller
   * @returns {Promise<Object>} Result
   */
  async handleDevice(command, controller) {
    const { deviceName } = command.params;

    // Get available devices
    const devices = await controller.getDevices();

    if (!deviceName) {
      return {
        success: true,
        message: `Available devices: ${devices.map(d => `${d.name} (${d.type})`).join(', ')}`,
        devices,
      };
    }

    // Find device by name (case-insensitive partial match)
    const device = devices.find(d => 
      d.name.toLowerCase().includes(deviceName.toLowerCase())
    );

    if (!device) {
      return {
        success: false,
        message: `Device "${deviceName}" not found. Available devices: ${devices.map(d => d.name).join(', ')}`,
        devices,
      };
    }

    await controller.transferPlayback(device.id);

    return {
      success: true,
      message: `Playback transferred to ${device.name}`,
      device,
    };
  }

  /**
   * Handle playlist creation command
   * @param {Object} command - Command object
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Result
   */
  async handlePlaylistCreate(command, accessToken) {
    // This is a placeholder for AI-powered playlist generation
    // Full implementation would integrate with recommendation engine

    const { name, description, duration, filters } = command.params;

    return {
      success: false,
      message: 'AI playlist generation is not yet fully implemented. Coming soon!',
      playlistParams: {
        name: name || 'New Playlist',
        description,
        duration,
        filters,
      },
    };
  }
}

module.exports = SpotifyChatIntegration;
