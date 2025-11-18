/**
 * Enhanced Spotify Commands
 * Extended natural language processing for Spotify playback control
 * Supports 15+ command types with sophisticated pattern matching
 */

const COMMAND_TYPES = {
  // Playback Control
  PLAY: 'play',
  PAUSE: 'pause',
  RESUME: 'resume',
  SKIP_NEXT: 'skip_next',
  SKIP_PREVIOUS: 'skip_previous',
  SEEK: 'seek',
  
  // Queue Management
  ADD_TO_QUEUE: 'add_to_queue',
  VIEW_QUEUE: 'view_queue',
  CLEAR_QUEUE: 'clear_queue',
  
  // Playback State
  SHUFFLE_ON: 'shuffle_on',
  SHUFFLE_OFF: 'shuffle_off',
  REPEAT_TRACK: 'repeat_track',
  REPEAT_CONTEXT: 'repeat_context',
  REPEAT_OFF: 'repeat_off',
  
  // Volume Control
  VOLUME_SET: 'volume_set',
  VOLUME_UP: 'volume_up',
  VOLUME_DOWN: 'volume_down',
  MUTE: 'mute',
  UNMUTE: 'unmute',
  
  // Device Management
  LIST_DEVICES: 'list_devices',
  SWITCH_DEVICE: 'switch_device',
  
  // Library Management
  LIKE_TRACK: 'like_track',
  UNLIKE_TRACK: 'unlike_track',
  SAVE_TO_LIBRARY: 'save_to_library',
  
  // Playlist Operations
  CREATE_PLAYLIST: 'create_playlist',
  ADD_TO_PLAYLIST: 'add_to_playlist',
  LIST_PLAYLISTS: 'list_playlists',
  
  // Search & Discovery
  SEARCH_TRACK: 'search_track',
  SEARCH_ARTIST: 'search_artist',
  SEARCH_ALBUM: 'search_album',
  SEARCH_PLAYLIST: 'search_playlist',
  RECOMMEND_SIMILAR: 'recommend_similar',
  RECOMMEND_MOOD: 'recommend_mood',
  RECOMMEND_GENRE: 'recommend_genre',
  
  // Information Queries
  NOW_PLAYING: 'now_playing',
  TRACK_INFO: 'track_info',
  ARTIST_INFO: 'artist_info',
  LYRICS: 'lyrics',
  
  // Advanced Features
  RECENTLY_PLAYED: 'recently_played',
  TOP_TRACKS: 'top_tracks',
  TOP_ARTISTS: 'top_artists',
  
  UNKNOWN: 'unknown',
};

/**
 * Enhanced pattern matching with context awareness
 */
const ENHANCED_PATTERNS = {
  // Playback Control - Natural language variations
  play: {
    patterns: [
      /\b(play|start|resume|put on|turn on)\b(?!.*playlist)/i,
      /\blet['']s (hear|listen to)\b/i,
      /\b(cue up|fire up)\b/i,
    ],
    contextKeywords: ['music', 'song', 'track', 'album'],
  },
  
  pause: {
    patterns: [
      /\b(pause|stop|hold|wait)\b/i,
      /\b(hold up|hang on)\b/i,
    ],
    negateKeywords: ['don''t stop'],
  },
  
  resume: {
    patterns: [
      /\b(resume|continue|unpause)\b/i,
      /\b(start again|keep playing)\b/i,
    ],
  },
  
  skip_next: {
    patterns: [
      /\b(skip|next|forward)\b/i,
      /\b(move on|change song)\b/i,
      /\b(don['']t like this)\b/i,
    ],
  },
  
  skip_previous: {
    patterns: [
      /\b(previous|back|last|prior|go back)\b/i,
      /\b(play that again|replay)\b/i,
    ],
  },
  
  seek: {
    patterns: [
      /\b(jump to|skip to|go to)\s+(\d+:\d+|\d+\s*(min|sec|minute|second))/i,
      /\b(forward|rewind)\s+(\d+)\s*(sec|second|min|minute)/i,
    ],
    extractTime: true,
  },
  
  // Queue Management
  add_to_queue: {
    patterns: [
      /\b(add|queue|play next|play later)\b.*\b(queue|next|later)\b/i,
      /\bqueue up\b/i,
    ],
  },
  
  view_queue: {
    patterns: [
      /\b(show|view|see|what['']s in).*queue/i,
      /\bwhat['']s (next|coming up|playing next)/i,
    ],
  },
  
  clear_queue: {
    patterns: [
      /\b(clear|empty|remove all from).*queue/i,
    ],
  },
  
  // Shuffle & Repeat
  shuffle_on: {
    patterns: [
      /\b(shuffle|randomize|mix)(\s+(on|enable|start))?/i,
      /\bplay.*random/i,
    ],
    excludePatterns: [/shuffle\s+(off|disable)/i],
  },
  
  shuffle_off: {
    patterns: [
      /\bshuffle\s+(off|disable|stop)/i,
      /\b(turn off|disable).*shuffle/i,
    ],
  },
  
  repeat_track: {
    patterns: [
      /\brepeat\s+(this|track|song|current)/i,
      /\bloop\s+(this|track|song)/i,
    ],
  },
  
  repeat_context: {
    patterns: [
      /\brepeat\s+(all|playlist|album|everything)/i,
    ],
  },
  
  repeat_off: {
    patterns: [
      /\brepeat\s+off/i,
      /\b(turn off|disable|stop).*repeat/i,
    ],
  },
  
  // Volume Control
  volume_set: {
    patterns: [
      /\bvolume\s+(\d+)%?/i,
      /\bset volume to\s+(\d+)/i,
    ],
    extractNumber: true,
  },
  
  volume_up: {
    patterns: [
      /\b(louder|increase|raise|turn up|crank up).*volume/i,
      /\bvolume up/i,
    ],
  },
  
  volume_down: {
    patterns: [
      /\b(quieter|decrease|lower|turn down).*volume/i,
      /\bvolume down/i,
    ],
  },
  
  mute: {
    patterns: [
      /\bmute/i,
      /\bsilence/i,
      /\bvolume\s+(0|zero)/i,
    ],
  },
  
  unmute: {
    patterns: [
      /\bunmute/i,
      /\bturn.*back on/i,
    ],
  },
  
  // Device Management
  list_devices: {
    patterns: [
      /\b(show|list|see|what).*devices/i,
      /\bwhere can i play/i,
    ],
  },
  
  switch_device: {
    patterns: [
      /\b(switch|change|transfer|move to).*device/i,
      /\bplay on\s+(\w+)/i,
    ],
    extractDevice: true,
  },
  
  // Library Management
  like_track: {
    patterns: [
      /\b(like|love|favorite|save)(\s+this)?(\s+(song|track))?/i,
      /\badd to (liked|favorites)/i,
    ],
  },
  
  unlike_track: {
    patterns: [
      /\b(unlike|dislike|unfavorite|remove from liked)/i,
    ],
  },
  
  save_to_library: {
    patterns: [
      /\b(save|add to library|add to collection)/i,
    ],
  },
  
  // Playlist Operations
  create_playlist: {
    patterns: [
      /\b(create|make|build|generate).*playlist/i,
      /\bnew playlist/i,
    ],
    extractName: true,
  },
  
  add_to_playlist: {
    patterns: [
      /\badd.*to.*playlist/i,
      /\bput.*in.*playlist/i,
    ],
    extractPlaylist: true,
  },
  
  list_playlists: {
    patterns: [
      /\b(show|list|see).*playlists/i,
      /\bwhat playlists/i,
    ],
  },
  
  // Search Commands
  search_track: {
    patterns: [
      /\b(find|search|look for|play)\s+(song|track)/i,
      /\bplay\s+["'](.+)["']/i,
    ],
    extractQuery: true,
  },
  
  search_artist: {
    patterns: [
      /\b(find|search|look for|play).*artist/i,
      /\bmusic by\s+(.+)/i,
    ],
    extractQuery: true,
  },
  
  search_album: {
    patterns: [
      /\b(find|search|look for|play).*album/i,
    ],
    extractQuery: true,
  },
  
  // Recommendations
  recommend_similar: {
    patterns: [
      /\b(similar|like|more|recommend).*this/i,
      /\bmore songs like/i,
    ],
  },
  
  recommend_mood: {
    patterns: [
      /\b(happy|sad|energetic|calm|chill|upbeat|mellow|intense).*music/i,
      /\bsomething (happy|sad|energetic|calm|chill|upbeat|mellow)/i,
    ],
    extractMood: true,
  },
  
  recommend_genre: {
    patterns: [
      /\b(play|find|recommend).*\b(rock|pop|jazz|hip hop|electronic|classical|country|metal|indie|folk|blues|r&b|soul|funk|reggae|punk|techno|house|dubstep|trap|edm)\b/i,
    ],
    extractGenre: true,
  },
  
  // Information Queries
  now_playing: {
    patterns: [
      /\b(now playing|what['']s playing|current song|this song|what is this)/i,
      /\bwho sings this/i,
    ],
  },
  
  track_info: {
    patterns: [
      /\b(info|information|details|tell me about).*track/i,
    ],
  },
  
  artist_info: {
    patterns: [
      /\b(info|information|details|tell me about).*artist/i,
    ],
  },
  
  lyrics: {
    patterns: [
      /\b(lyrics|words|sing along)/i,
      /\bwhat (are|is) the lyrics/i,
    ],
  },
  
  // History & Stats
  recently_played: {
    patterns: [
      /\b(recently|last|previous).*played/i,
      /\bwhat did i (listen|hear|play)/i,
    ],
  },
  
  top_tracks: {
    patterns: [
      /\b(top|favorite|most played).*tracks/i,
      /\bmy top songs/i,
    ],
  },
  
  top_artists: {
    patterns: [
      /\b(top|favorite|most played).*artists/i,
      /\bmy top artists/i,
    ],
  },
};

/**
 * Mood and energy detection
 */
const MOOD_PATTERNS = {
  happy: /\b(happy|cheerful|upbeat|joyful|bright|fun|party|celebration)/i,
  sad: /\b(sad|melancholy|depressing|somber|blue|lonely|heartbreak)/i,
  energetic: /\b(energetic|intense|powerful|high energy|hype|pump up|workout|gym)/i,
  calm: /\b(calm|relaxing|chill|peaceful|mellow|ambient|meditation|sleep)/i,
  romantic: /\b(romantic|love|sensual|intimate|date night)/i,
  angry: /\b(angry|aggressive|intense|heavy|rage|mad)/i,
  focused: /\b(focus|concentrate|study|work|productive|coding)/i,
};

/**
 * Enhanced command parser
 */
class EnhancedSpotifyCommandParser {
  /**
   * Parse natural language input to extract Spotify command
   */
  parse(input) {
    const normalized = input.trim().toLowerCase();
    
    // Try each command pattern
    for (const [commandType, config] of Object.entries(ENHANCED_PATTERNS)) {
      for (const pattern of config.patterns) {
        const match = normalized.match(pattern);
        if (match) {
          // Check exclude patterns
          if (config.excludePatterns) {
            const excluded = config.excludePatterns.some(p => normalized.match(p));
            if (excluded) continue;
          }
          
          // Check negate keywords
          if (config.negateKeywords) {
            const negated = config.negateKeywords.some(k => normalized.includes(k));
            if (negated) continue;
          }
          
          // Extract parameters
          const params = this.extractParameters(normalized, match, config);
          
          return {
            command: commandType,
            confidence: 0.9,
            originalInput: input,
            parameters: params,
            metadata: this.extractMetadata(normalized)
          };
        }
      }
    }
    
    // No match found
    return {
      command: COMMAND_TYPES.UNKNOWN,
      confidence: 0,
      originalInput: input,
      parameters: {},
      metadata: this.extractMetadata(normalized)
    };
  }
  
  /**
   * Extract parameters from matched pattern
   */
  extractParameters(input, match, config) {
    const params = {};
    
    if (config.extractQuery && match[1]) {
      params.query = match[1].trim();
    }
    
    if (config.extractNumber && match[1]) {
      params.value = parseInt(match[1]);
    }
    
    if (config.extractTime && match[1]) {
      params.time = this.parseTimeString(match[1]);
    }
    
    if (config.extractMood) {
      params.mood = this.detectMood(input);
    }
    
    if (config.extractGenre) {
      params.genre = this.detectGenre(input);
    }
    
    if (config.extractDevice && match[1]) {
      params.device = match[1].trim();
    }
    
    if (config.extractName) {
      const nameMatch = input.match(/named?\s+["']?([^"']+)["']?/i);
      if (nameMatch) {
        params.name = nameMatch[1].trim();
      }
    }
    
    if (config.extractPlaylist) {
      const playlistMatch = input.match(/playlist\s+["']?([^"']+)["']?/i);
      if (playlistMatch) {
        params.playlist = playlistMatch[1].trim();
      }
    }
    
    return params;
  }
  
  /**
   * Extract metadata (mood, genre, energy)
   */
  extractMetadata(input) {
    return {
      mood: this.detectMood(input),
      genre: this.detectGenre(input),
      hasTrackName: this.hasTrackName(input),
      hasArtistName: this.hasArtistName(input),
    };
  }
  
  /**
   * Detect mood from input
   */
  detectMood(input) {
    for (const [mood, pattern] of Object.entries(MOOD_PATTERNS)) {
      if (pattern.test(input)) {
        return mood;
      }
    }
    return null;
  }
  
  /**
   * Detect genre from input
   */
  detectGenre(input) {
    const genreMatch = input.match(/\b(rock|pop|jazz|hip hop|rap|electronic|edm|classical|country|metal|indie|folk|blues|r&b|soul|funk|reggae|punk|techno|house|dubstep|trap)\b/i);
    return genreMatch ? genreMatch[1].toLowerCase() : null;
  }
  
  /**
   * Check if input contains track name
   */
  hasTrackName(input) {
    return /["']([^"']+)["']/.test(input) || /\bplay\s+\w+\s+by\b/i.test(input);
  }
  
  /**
   * Check if input contains artist name
   */
  hasArtistName(input) {
    return /\bby\s+\w+/i.test(input);
  }
  
  /**
   * Parse time string to milliseconds
   */
  parseTimeString(timeStr) {
    const minuteMatch = timeStr.match(/(\d+):(\d+)/);
    if (minuteMatch) {
      return (parseInt(minuteMatch[1]) * 60 + parseInt(minuteMatch[2])) * 1000;
    }
    
    const secondMatch = timeStr.match(/(\d+)\s*(sec|second)/i);
    if (secondMatch) {
      return parseInt(secondMatch[1]) * 1000;
    }
    
    const minuteOnlyMatch = timeStr.match(/(\d+)\s*(min|minute)/i);
    if (minuteOnlyMatch) {
      return parseInt(minuteOnlyMatch[1]) * 60 * 1000;
    }
    
    return 0;
  }
  
  /**
   * Get command confidence score
   */
  getConfidence(command) {
    if (command === COMMAND_TYPES.UNKNOWN) return 0;
    return 0.9;
  }
}

module.exports = {
  EnhancedSpotifyCommandParser,
  COMMAND_TYPES,
  ENHANCED_PATTERNS,
  MOOD_PATTERNS
};
