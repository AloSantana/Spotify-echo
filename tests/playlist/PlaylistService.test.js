const PlaylistService = require('../../src/spotify/PlaylistService');
const SpotifyAPIService = require('../../src/spotify/api-service');

describe('PlaylistService - Phase 6 Implementation', () => {
  let playlistService;
  let mockAccessToken;
  let mockUserId;

  beforeEach(() => {
    playlistService = new PlaylistService();
    mockAccessToken = 'mock_spotify_token_for_testing';
    mockUserId = 'test_user_123';
  });

  afterEach(() => {
    playlistService.clearCache();
  });

  describe('Playlist Creation', () => {
    test('should create personalized playlist with valid tracks', async () => {
      // Mock tracks with proper format
      const mockTracks = [
        {
          id: 'track1',
          name: 'Test Track 1',
          artists: [{ name: 'Test Artist 1' }],
          uri: 'spotify:track:track1'
        },
        {
          id: 'track2',
          name: 'Test Track 2',
          artists: [{ name: 'Test Artist 2' }],
          uri: 'spotify:track:track2'
        }
      ];

      // Mock the SpotifyAPIService methods
      jest.spyOn(playlistService.spotifyAPI, 'createPlaylist').mockResolvedValue({
        id: 'playlist123',
        name: 'Test Playlist',
        spotify_url: 'https://open.spotify.com/playlist/playlist123'
      });

      jest.spyOn(playlistService.spotifyAPI, 'addTracksToPlaylist').mockResolvedValue({
        success: true,
        added_tracks: 2,
        snapshot_id: 'snapshot123'
      });

      const result = await playlistService.createPersonalizedPlaylist(
        mockUserId,
        'Test Playlist',
        mockTracks,
        { description: 'Test playlist description' },
        mockAccessToken
      );

      expect(result.success).toBe(true);
      expect(result.playlist.name).toBe('Test Playlist');
      expect(result.addedTracks).toBe(2);
      expect(result.spotifyUrl).toBe('https://open.spotify.com/playlist/playlist123');
    });

    test('should handle empty tracks array', async () => {
      await expect(
        playlistService.createPersonalizedPlaylist(
          mockUserId,
          'Empty Playlist',
          [],
          {},
          mockAccessToken
        )
      ).rejects.toThrow('At least one track is required');
    });

    test('should handle missing required parameters', async () => {
      const mockTracks = [{ uri: 'spotify:track:test' }];

      // Missing userId
      await expect(
        playlistService.createPersonalizedPlaylist(
          null,
          'Test Playlist',
          mockTracks,
          {},
          mockAccessToken
        )
      ).rejects.toThrow('userId, name, and accessToken are required');

      // Missing name
      await expect(
        playlistService.createPersonalizedPlaylist(
          mockUserId,
          null,
          mockTracks,
          {},
          mockAccessToken
        )
      ).rejects.toThrow('userId, name, and accessToken are required');

      // Missing access token
      await expect(
        playlistService.createPersonalizedPlaylist(
          mockUserId,
          'Test Playlist',
          mockTracks,
          {},
          null
        )
      ).rejects.toThrow('userId, name, and accessToken are required');
    });
  });

  describe('Track Management', () => {
    test('should append tracks to existing playlist', async () => {
      const mockTracks = [
        { uri: 'spotify:track:newtrack1', name: 'New Track 1' },
        { uri: 'spotify:track:newtrack2', name: 'New Track 2' }
      ];

      jest.spyOn(playlistService.spotifyAPI, 'addTracksToPlaylist').mockResolvedValue({
        success: true,
        added_tracks: 2,
        snapshot_id: 'snapshot456'
      });

      const result = await playlistService.appendTracks(
        mockUserId,
        'playlist123',
        mockTracks,
        mockAccessToken
      );

      expect(result.success).toBe(true);
      expect(result.addedTracks).toBe(2);
      expect(result.snapshot_id).toBe('snapshot456');
    });

    test('should remove tracks from playlist', async () => {
      const trackUris = ['spotify:track:track1', 'spotify:track:track2'];

      // Mock axios delete request
      const axios = require('axios');
      jest.spyOn(axios, 'delete').mockResolvedValue({
        data: { snapshot_id: 'snapshot789' }
      });

      const result = await playlistService.removeTracks(
        'playlist123',
        trackUris,
        mockAccessToken
      );

      expect(result.success).toBe(true);
      expect(result.removedTracks).toBe(2);
      expect(result.snapshot_id).toBe('snapshot789');
    });
  });

  describe('Track Normalization', () => {
    test('should normalize various track formats', async () => {
      const mixedTracks = [
        // Spotify URI string
        'spotify:track:track1',
        // Full track object
        {
          id: 'track2',
          name: 'Full Track',
          artists: [{ name: 'Artist' }],
          uri: 'spotify:track:track2'
        },
        // Minimal track object
        {
          trackId: 'track3',
          trackName: 'Minimal Track',
          artistName: 'Artist Name'
        }
      ];

      const normalized = await playlistService.normalizeTracks(mixedTracks, mockAccessToken);

      expect(normalized).toHaveLength(3);
      expect(normalized[0].uri).toBe('spotify:track:track1');
      expect(normalized[1].name).toBe('Full Track');
      expect(normalized[2].name).toBe('Minimal Track');
    });

    test('should filter out invalid tracks', async () => {
      const invalidTracks = [
        null,
        undefined,
        '',
        { invalid: 'track' },
        { name: 'No URI Track' }
      ];

      const normalized = await playlistService.normalizeTracks(invalidTracks, mockAccessToken);

      expect(normalized).toHaveLength(0);
    });
  });

  describe('Playlist Management', () => {
    test('should ensure playlist exists and create new one if needed', async () => {
      // Mock no existing playlist
      jest.spyOn(playlistService, 'getCachedPlaylistByKey').mockReturnValue(null);
      
      jest.spyOn(playlistService, 'createPersonalizedPlaylist').mockResolvedValue({
        success: true,
        playlist: {
          id: 'newplaylist123',
          name: 'EchoTune workout Playlist'
        }
      });

      const result = await playlistService.ensurePlaylistExists(
        mockUserId,
        'workout',
        { name: 'EchoTune workout Playlist' },
        mockAccessToken
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(result.playlist.id).toBe('newplaylist123');
    });

    test('should return existing playlist if found', async () => {
      // Mock existing playlist
      jest.spyOn(playlistService, 'getCachedPlaylistByKey').mockReturnValue('existing123');
      jest.spyOn(playlistService, 'getPlaylistInfo').mockResolvedValue({
        id: 'existing123',
        name: 'Existing Playlist'
      });

      const result = await playlistService.ensurePlaylistExists(
        mockUserId,
        'workout',
        {},
        mockAccessToken
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.playlist.id).toBe('existing123');
    });
  });

  describe('Token Validation', () => {
    test('should validate valid Spotify token', async () => {
      const axios = require('axios');
      jest.spyOn(axios, 'get').mockResolvedValue({
        data: {
          id: 'user123',
          display_name: 'Test User'
        }
      });

      const result = await playlistService.validateToken(mockAccessToken);

      expect(result.valid).toBe(true);
      expect(result.user.id).toBe('user123');
    });

    test('should detect invalid token', async () => {
      const axios = require('axios');
      jest.spyOn(axios, 'get').mockRejectedValue({
        response: { status: 401 }
      });

      const result = await playlistService.validateToken('invalid_token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });
  });

  describe('Service Statistics', () => {
    test('should return service stats', () => {
      const stats = playlistService.getStats();

      expect(stats.service).toBe('PlaylistService');
      expect(stats.cachedPlaylists).toBeDefined();
      expect(stats.spotifyAPI).toBeDefined();
    });

    test('should track errors in stats', async () => {
      // Trigger an error
      try {
        await playlistService.createPersonalizedPlaylist(null, null, [], {}, null);
      } catch (error) {
        // Error expected
      }

      const stats = playlistService.getStats();
      expect(stats.lastError).toBeDefined();
      expect(stats.lastError.message).toContain('required');
    });
  });

  describe('Cache Management', () => {
    test('should cache playlist data', async () => {
      // Create a playlist to populate cache
      jest.spyOn(playlistService.spotifyAPI, 'createPlaylist').mockResolvedValue({
        id: 'cached123',
        name: 'Cached Playlist'
      });
      jest.spyOn(playlistService.spotifyAPI, 'addTracksToPlaylist').mockResolvedValue({
        success: true,
        added_tracks: 0
      });

      await playlistService.createPersonalizedPlaylist(
        mockUserId,
        'Cached Playlist',
        [],
        {},
        mockAccessToken
      );

      expect(playlistService.playlistCache.has('cached123')).toBe(true);
    });

    test('should clear cache', () => {
      // Add something to cache
      playlistService.playlistCache.set('test', {});
      expect(playlistService.playlistCache.size).toBe(1);

      playlistService.clearCache();
      expect(playlistService.playlistCache.size).toBe(0);
    });
  });
});

describe('PlaylistService Error Handling', () => {
  let playlistService;

  beforeEach(() => {
    playlistService = new PlaylistService();
  });

  test('should handle Spotify API errors gracefully', async () => {
    jest.spyOn(playlistService.spotifyAPI, 'createPlaylist').mockRejectedValue({
      response: { status: 403 },
      message: 'Insufficient permissions'
    });

    await expect(
      playlistService.createPersonalizedPlaylist(
        'user123',
        'Test Playlist',
        [{ uri: 'spotify:track:test' }],
        {},
        'token'
      )
    ).rejects.toThrow('Failed to create playlist');
  });

  test('should handle rate limiting', async () => {
    jest.spyOn(playlistService.spotifyAPI, 'createPlaylist').mockRejectedValue({
      response: { status: 429 },
      message: 'Rate limit exceeded'
    });

    await expect(
      playlistService.createPersonalizedPlaylist(
        'user123',
        'Test Playlist',
        [{ uri: 'spotify:track:test' }],
        {},
        'token'
      )
    ).rejects.toThrow('Rate limit exceeded');
  });

  test('should handle network errors', async () => {
    jest.spyOn(playlistService.spotifyAPI, 'createPlaylist').mockRejectedValue(
      new Error('Network error')
    );

    await expect(
      playlistService.createPersonalizedPlaylist(
        'user123',
        'Test Playlist',
        [{ uri: 'spotify:track:test' }],
        {},
        'token'
      )
    ).rejects.toThrow('Failed to create playlist');
  });
});