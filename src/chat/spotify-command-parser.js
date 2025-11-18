/**
 * Spotify Command Parser
 * Parses natural language input to extract Spotify commands and intents
 */

/**
 * Command types supported by the parser
 */
const COMMAND_TYPES = {
  PLAY: 'play',
  PAUSE: 'pause',
  SKIP: 'skip',
  PREVIOUS: 'previous',
  QUEUE: 'queue',
  SEARCH: 'search',
  PLAYLIST_CREATE: 'playlist_create',
  DEVICE: 'device',
  SHUFFLE: 'shuffle',
  REPEAT: 'repeat',
  VOLUME: 'volume',
  NOW_PLAYING: 'now_playing',
  RECOMMEND: 'recommend',
  UNKNOWN: 'unknown',
};

/**
 * Pattern matching for command detection
 */
const COMMAND_PATTERNS = {
  // Playback control
  play: [
    /\b(play|start|resume)\b/i,
    /\b(put on|turn on)\b/i,
  ],
  pause: [
    /\b(pause|stop|hold)\b/i,
  ],
  skip: [
    /\b(skip|next|forward)\b/i,
  ],
  previous: [
    /\b(previous|back|last|prior)\b/i,
  ],
  queue: [
    /\b(queue|add to queue|play next|play later)\b/i,
  ],
  
  // Search and discovery
  search: [
    /\b(find|search|look for|show me)\b/i,
  ],
  recommend: [
    /\b(recommend|suggest|discover|similar|like)\b/i,
  ],
  
  // Playlist operations
  playlist_create: [
    /\b(create|make|build|generate).*playlist/i,
  ],
  
  // Device control
  device: [
    /\b(device|switch|transfer|change device)\b/i,
  ],
  
  // Playback state
  shuffle: [
    /\b(shuffle|random|mix)\b/i,
  ],
  repeat: [
    /\b(repeat|loop)\b/i,
  ],
  volume: [
    /\b(volume|louder|quieter|loud|quiet)\b/i,
  ],
  
  // Info queries
  now_playing: [
    /\b(now playing|what[''']s playing|current song|this song)\b/i,
  ],
};

/**
 * Mood/energy keywords for filtering
 */
const MOOD_KEYWORDS = {
  happy: ['happy', 'cheerful', 'upbeat', 'joyful', 'bright'],
  sad: ['sad', 'melancholy', 'depressing', 'somber', 'blue'],
  energetic: ['energetic', 'intense', 'powerful', 'high energy', 'hype'],
  calm: ['calm', 'relaxing', 'chill', 'peaceful', 'mellow'],
  angry: ['angry', 'aggressive', 'intense', 'heavy', 'rage'],
  romantic: ['romantic', 'love', 'sensual', 'intimate'],
};

/**
 * Genre keywords
 */
const GENRE_KEYWORDS = [
  'rock', 'pop', 'hip hop', 'rap', 'electronic', 'edm', 'dance',
  'jazz', 'classical', 'country', 'r&b', 'soul', 'funk',
  'metal', 'punk', 'indie', 'alternative', 'folk', 'blues',
  'reggae', 'latin', 'world', 'ambient', 'house', 'techno',
];

/**
 * Activity keywords
 */
const ACTIVITY_KEYWORDS = {
  workout: ['workout', 'gym', 'exercise', 'running', 'cardio', 'training'],
  study: ['study', 'focus', 'concentration', 'work', 'productivity'],
  party: ['party', 'dance', 'celebration', 'fun', 'night out'],
  sleep: ['sleep', 'bedtime', 'rest', 'night', 'lullaby'],
  drive: ['drive', 'road trip', 'car', 'driving'],
  relax: ['relax', 'unwind', 'chill', 'lounge'],
};

/**
 * Spotify Command Parser Class
 */
class SpotifyCommandParser {
  constructor() {
    this.commandTypes = COMMAND_TYPES;
  }

  /**
   * Parse user input to extract Spotify command
   * @param {string} input - User's natural language input
   * @returns {Object} Parsed command object
   */
  parse(input) {
    if (!input || typeof input !== 'string') {
      return this.createUnknownCommand(input);
    }

    const normalizedInput = input.toLowerCase().trim();

    // Detect command type
    const commandType = this.detectCommandType(normalizedInput);

    // Extract parameters based on command type
    const params = this.extractParameters(normalizedInput, commandType);

    return {
      type: commandType,
      originalInput: input,
      params,
      confidence: this.calculateConfidence(commandType, params),
    };
  }

  /**
   * Detect command type from input
   * @param {string} input - Normalized input
   * @returns {string} Command type
   */
  detectCommandType(input) {
    // Check each command pattern
    for (const [type, patterns] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return type;
        }
      }
    }

    return COMMAND_TYPES.UNKNOWN;
  }

  /**
   * Extract parameters based on command type
   * @param {string} input - Normalized input
   * @param {string} commandType - Detected command type
   * @returns {Object} Extracted parameters
   */
  extractParameters(input, commandType) {
    const params = {};

    switch (commandType) {
      case COMMAND_TYPES.PLAY:
      case COMMAND_TYPES.SEARCH:
        params.query = this.extractQuery(input, commandType);
        params.filters = this.extractFilters(input);
        break;

      case COMMAND_TYPES.QUEUE:
        params.query = this.extractQuery(input, commandType);
        params.position = this.extractQueuePosition(input);
        break;

      case COMMAND_TYPES.PLAYLIST_CREATE:
        params.name = this.extractPlaylistName(input);
        params.description = this.extractPlaylistDescription(input);
        params.duration = this.extractDuration(input);
        params.filters = this.extractFilters(input);
        break;

      case COMMAND_TYPES.VOLUME:
        params.level = this.extractVolumeLevel(input);
        params.relative = this.isRelativeVolume(input);
        break;

      case COMMAND_TYPES.DEVICE:
        params.deviceName = this.extractDeviceName(input);
        break;

      case COMMAND_TYPES.RECOMMEND:
        params.query = this.extractQuery(input, commandType);
        params.filters = this.extractFilters(input);
        params.count = this.extractCount(input);
        break;

      default:
        // For simple commands (pause, skip, etc.), no params needed
        break;
    }

    return params;
  }

  /**
   * Extract search query from input
   * @param {string} input - Input text
   * @param {string} commandType - Command type
   * @returns {string} Extracted query
   */
  extractQuery(input, commandType) {
    // Remove command keywords
    let query = input;

    // Remove common command words
    const commandWords = [
      'play', 'start', 'find', 'search', 'show me', 'put on',
      'recommend', 'suggest', 'queue', 'add', 'to queue',
    ];

    for (const word of commandWords) {
      query = query.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    }

    // Clean up
    query = query.trim();

    return query || null;
  }

  /**
   * Extract filters (mood, genre, activity, etc.)
   * @param {string} input - Input text
   * @returns {Object} Filter object
   */
  extractFilters(input) {
    const filters = {};

    // Extract mood
    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        filters.mood = mood;
        break;
      }
    }

    // Extract genre
    for (const genre of GENRE_KEYWORDS) {
      if (input.includes(genre)) {
        filters.genre = genre;
        break;
      }
    }

    // Extract activity
    for (const [activity, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        filters.activity = activity;
        break;
      }
    }

    // Extract energy level
    if (input.includes('high energy') || input.includes('energetic')) {
      filters.energy = 'high';
    } else if (input.includes('low energy') || input.includes('calm')) {
      filters.energy = 'low';
    }

    // Extract tempo
    if (input.includes('fast') || input.includes('quick')) {
      filters.tempo = 'fast';
    } else if (input.includes('slow')) {
      filters.tempo = 'slow';
    }

    return filters;
  }

  /**
   * Extract playlist name from input
   * @param {string} input - Input text
   * @returns {string} Playlist name
   */
  extractPlaylistName(input) {
    // Look for "name it" or "call it"
    const nameMatch = input.match(/(?:name|call) it ["']?([^"']+)["']?/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }

    // Look for quoted name
    const quotedMatch = input.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      return quotedMatch[1].trim();
    }

    return null;
  }

  /**
   * Extract playlist description
   * @param {string} input - Input text
   * @returns {string} Description
   */
  extractPlaylistDescription(input) {
    // Use the query as description
    return this.extractQuery(input, COMMAND_TYPES.PLAYLIST_CREATE);
  }

  /**
   * Extract duration in minutes
   * @param {string} input - Input text
   * @returns {number} Duration in minutes
   */
  extractDuration(input) {
    // Look for time patterns
    const minuteMatch = input.match(/(\d+)\s*(?:minute|min)/i);
    if (minuteMatch) {
      return parseInt(minuteMatch[1]);
    }

    const hourMatch = input.match(/(\d+)\s*(?:hour|hr)/i);
    if (hourMatch) {
      return parseInt(hourMatch[1]) * 60;
    }

    return null;
  }

  /**
   * Extract volume level
   * @param {string} input - Input text
   * @returns {number} Volume level (0-100)
   */
  extractVolumeLevel(input) {
    // Look for percentage
    const percentMatch = input.match(/(\d+)\s*%/);
    if (percentMatch) {
      return parseInt(percentMatch[1]);
    }

    // Look for numeric value
    const numMatch = input.match(/\b(\d+)\b/);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      return num <= 100 ? num : null;
    }

    return null;
  }

  /**
   * Check if volume command is relative
   * @param {string} input - Input text
   * @returns {boolean} Is relative
   */
  isRelativeVolume(input) {
    return /\b(up|down|louder|quieter|increase|decrease)\b/i.test(input);
  }

  /**
   * Extract device name
   * @param {string} input - Input text
   * @returns {string} Device name
   */
  extractDeviceName(input) {
    // Look for "to" or "on"
    const deviceMatch = input.match(/(?:to|on)\s+["']?([^"']+)["']?/i);
    if (deviceMatch) {
      return deviceMatch[1].trim();
    }

    return null;
  }

  /**
   * Extract queue position
   * @param {string} input - Input text
   * @returns {string} Position ('next', 'end')
   */
  extractQueuePosition(input) {
    if (/\b(next|first)\b/i.test(input)) {
      return 'next';
    }
    if (/\b(end|last|later)\b/i.test(input)) {
      return 'end';
    }
    return 'end'; // Default
  }

  /**
   * Extract count for recommendations
   * @param {string} input - Input text
   * @returns {number} Count
   */
  extractCount(input) {
    const countMatch = input.match(/(\d+)\s*(?:songs|tracks)/i);
    if (countMatch) {
      return parseInt(countMatch[1]);
    }
    return 10; // Default
  }

  /**
   * Calculate confidence score for parsed command
   * @param {string} commandType - Command type
   * @param {Object} params - Extracted parameters
   * @returns {number} Confidence (0-1)
   */
  calculateConfidence(commandType, params) {
    if (commandType === COMMAND_TYPES.UNKNOWN) {
      return 0;
    }

    let confidence = 0.6; // Base confidence

    // Increase confidence if we extracted meaningful parameters
    if (params.query && params.query.length > 0) {
      confidence += 0.2;
    }

    if (params.filters && Object.keys(params.filters).length > 0) {
      confidence += 0.1;
    }

    if (params.name || params.deviceName) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Create unknown command result
   * @param {string} input - Input text
   * @returns {Object} Command object
   */
  createUnknownCommand(input) {
    return {
      type: COMMAND_TYPES.UNKNOWN,
      originalInput: input,
      params: {},
      confidence: 0,
    };
  }

  /**
   * Check if input contains Spotify command
   * @param {string} input - Input text
   * @returns {boolean} Has Spotify command
   */
  hasSpotifyCommand(input) {
    if (!input || typeof input !== 'string') {
      return false;
    }

    const normalized = input.toLowerCase();
    
    // Check for command patterns
    for (const patterns of Object.values(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(normalized)) {
          return true;
        }
      }
    }

    return false;
  }
}

module.exports = SpotifyCommandParser;
module.exports.COMMAND_TYPES = COMMAND_TYPES;
