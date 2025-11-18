/**
 * Tests for Spotify Integration
 * Tests command parser, playback controller, and integration layer
 */

const SpotifyCommandParser = require('../src/chat/spotify-command-parser');
const { COMMAND_TYPES } = require('../src/chat/spotify-command-parser');

describe('Spotify Command Parser', () => {
  let parser;

  beforeEach(() => {
    parser = new SpotifyCommandParser();
  });

  describe('Command Detection', () => {
    test('should detect play command', () => {
      const command = parser.parse('play some rock music');
      expect(command.type).toBe(COMMAND_TYPES.PLAY);
      expect(command.confidence).toBeGreaterThan(0.5);
    });

    test('should detect pause command', () => {
      const command = parser.parse('pause');
      expect(command.type).toBe(COMMAND_TYPES.PAUSE);
    });

    test('should detect skip command', () => {
      const command = parser.parse('skip to next song');
      expect(command.type).toBe(COMMAND_TYPES.SKIP);
    });

    test('should detect queue command', () => {
      const command = parser.parse('add to queue');
      expect(command.type).toBe(COMMAND_TYPES.QUEUE);
    });

    test('should detect search command', () => {
      const command = parser.parse('search for indie music');
      expect(command.type).toBe(COMMAND_TYPES.SEARCH);
    });

    test('should detect shuffle command', () => {
      const command = parser.parse('turn on shuffle');
      expect(command.type).toBe(COMMAND_TYPES.SHUFFLE);
    });

    test('should detect volume command', () => {
      const command = parser.parse('set volume to 70%');
      expect(command.type).toBe(COMMAND_TYPES.VOLUME);
    });

    test('should detect now playing command', () => {
      const command = parser.parse('what\'s playing?');
      expect(command.type).toBe(COMMAND_TYPES.NOW_PLAYING);
    });
  });

  describe('Parameter Extraction', () => {
    test('should extract search query', () => {
      const command = parser.parse('play some energetic rock music');
      expect(command.params.query).toContain('energetic rock music');
    });

    test('should extract mood filter', () => {
      const command = parser.parse('play happy music');
      expect(command.params.filters.mood).toBe('happy');
    });

    test('should extract genre filter', () => {
      const command = parser.parse('play some rock music');
      expect(command.params.filters.genre).toBe('rock');
    });

    test('should extract energy level', () => {
      const command = parser.parse('play high energy music');
      expect(command.params.filters.energy).toBe('high');
    });

    test('should extract volume level', () => {
      const command = parser.parse('set volume to 75%');
      expect(command.params.level).toBe(75);
    });

    test('should detect relative volume', () => {
      const command = parser.parse('turn volume up');
      expect(command.params.relative).toBe(true);
    });

    test('should extract playlist name', () => {
      const command = parser.parse('create playlist "My Workout Mix"');
      expect(command.params.name).toBe('My Workout Mix');
    });

    test('should extract duration', () => {
      const command = parser.parse('create a 60 minute playlist');
      expect(command.params.duration).toBe(60);
    });
  });

  describe('Filter Detection', () => {
    test('should detect multiple filters', () => {
      const command = parser.parse('play energetic rock music for working out');
      expect(command.params.filters.genre).toBe('rock');
      expect(command.params.filters.activity).toBe('workout');
      expect(command.params.filters.energy).toBe('high');
    });

    test('should detect activity context', () => {
      const command = parser.parse('play music for studying');
      expect(command.params.filters.activity).toBe('study');
    });

    test('should detect tempo', () => {
      const command = parser.parse('play fast music');
      expect(command.params.filters.tempo).toBe('fast');
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence for clear commands', () => {
      const command = parser.parse('play Thunder by Imagine Dragons');
      expect(command.confidence).toBeGreaterThan(0.7);
    });

    test('should have low confidence for ambiguous input', () => {
      const command = parser.parse('maybe something');
      expect(command.confidence).toBeLessThan(0.5);
    });

    test('should return unknown for non-Spotify commands', () => {
      const command = parser.parse('tell me a joke');
      expect(command.type).toBe(COMMAND_TYPES.UNKNOWN);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const command = parser.parse('');
      expect(command.type).toBe(COMMAND_TYPES.UNKNOWN);
    });

    test('should handle null input', () => {
      const command = parser.parse(null);
      expect(command.type).toBe(COMMAND_TYPES.UNKNOWN);
    });

    test('should handle special characters', () => {
      const command = parser.parse('play "Blinding Lights" by The Weeknd');
      expect(command.type).toBe(COMMAND_TYPES.PLAY);
    });

    test('should be case insensitive', () => {
      const command = parser.parse('PLAY SOME MUSIC');
      expect(command.type).toBe(COMMAND_TYPES.PLAY);
    });
  });

  describe('hasSpotifyCommand', () => {
    test('should detect Spotify commands', () => {
      expect(parser.hasSpotifyCommand('play some music')).toBe(true);
      expect(parser.hasSpotifyCommand('pause')).toBe(true);
      expect(parser.hasSpotifyCommand('skip')).toBe(true);
    });

    test('should reject non-Spotify commands', () => {
      expect(parser.hasSpotifyCommand('tell me a joke')).toBe(false);
      expect(parser.hasSpotifyCommand('what\'s the weather')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(parser.hasSpotifyCommand('')).toBe(false);
      expect(parser.hasSpotifyCommand(null)).toBe(false);
    });
  });
});

describe('Playback Controller', () => {
  // Note: These are integration tests that would require mocking Spotify API
  // or using actual test credentials. Implement based on testing strategy.

  describe('Initialization', () => {
    test('should initialize with access token', () => {
      const PlaybackController = require('../src/spotify/playback-controller');
      const controller = new PlaybackController('test_token');
      expect(controller.accessToken).toBe('test_token');
    });

    test('should allow token updates', () => {
      const PlaybackController = require('../src/spotify/playback-controller');
      const controller = new PlaybackController('test_token');
      controller.setAccessToken('new_token');
      expect(controller.accessToken).toBe('new_token');
    });
  });

  // Add more tests with mocked Spotify API responses
});

describe('Spotify Chat Integration', () => {
  // Tests for integration layer
  // Would require mocking both parser and controller

  describe('Message Processing', () => {
    test('should detect Spotify commands in messages', async () => {
      const SpotifyChatIntegration = require('../src/chat/spotify-integration');
      const integration = new SpotifyChatIntegration();

      const message = 'play some rock music';
      // Note: Would need to mock controller for full test
      expect(integration.parser.hasSpotifyCommand(message)).toBe(true);
    });
  });
});

// Export for use in other test files
module.exports = {
  SpotifyCommandParser,
  COMMAND_TYPES,
};
