/**
 * Smart Features Service
 * AI-powered smart playlist generation, personalization, and advanced search
 */

const { getChatPersistenceService } = require('./ChatPersistenceService');

class SmartFeaturesService {
  constructor(llmProviderManager, spotifyService) {
    this.llmManager = llmProviderManager;
    this.spotifyService = spotifyService;
    this.persistenceService = getChatPersistenceService();
  }

  /**
   * Generate smart playlist based on natural language prompt
   */
  async generateSmartPlaylist(userId, prompt, options = {}) {
    try {
      const {
        duration = 30, // minutes
        provider,
        model,
        spotifyAccessToken
      } = options;

      // Use AI to analyze the prompt and extract requirements
      const analysis = await this.analyzePlaylistPrompt(prompt, provider, model);

      // Get user's listening history for personalization
      const history = await this.getUserListeningHistory(userId);

      // Build track selection criteria
      const criteria = {
        ...analysis,
        targetDuration: duration * 60 * 1000, // Convert to ms
        userHistory: history
      };

      // Generate playlist using Spotify API and AI recommendations
      const tracks = await this.selectTracksForPlaylist(criteria, spotifyAccessToken);

      // Create playlist in Spotify
      const playlist = await this.createSpotifyPlaylist(
        userId,
        analysis.suggestedName || `AI Playlist ${Date.now()}`,
        tracks,
        spotifyAccessToken
      );

      // Save to database
      await this.persistenceService.savePlaylist(userId, {
        spotifyId: playlist.id,
        name: playlist.name,
        description: `AI-generated: ${prompt}`,
        generatedByAI: true,
        generationPrompt: prompt,
        generatedWith: `${provider}/${model}`,
        tags: analysis.tags || [],
        mood: analysis.mood,
        targetEnergy: analysis.energy,
        targetDuration: duration
      });

      return {
        success: true,
        playlist,
        tracks,
        analysis,
        message: `Created playlist "${playlist.name}" with ${tracks.length} tracks`
      };
    } catch (error) {
      console.error('Smart playlist generation error:', error);
      throw new Error(`Failed to generate smart playlist: ${error.message}`);
    }
  }

  /**
   * Analyze playlist prompt with AI
   */
  async analyzePlaylistPrompt(prompt, provider, model) {
    const systemPrompt = `You are a music playlist expert. Analyze the following playlist request and extract:
1. Mood/vibe (happy, energetic, calm, etc.)
2. Genres (if mentioned)
3. Energy level (0-1 scale)
4. Tempo preference (slow/medium/fast)
5. Suggested playlist name
6. Tags/keywords
7. Any specific artists or tracks mentioned

Respond in JSON format only.`;

    const userPrompt = `Playlist request: "${prompt}"

Analyze this and provide the requirements in JSON format with these fields:
{
  "mood": "string",
  "genres": ["string"],
  "energy": 0.0-1.0,
  "tempo": "slow|medium|fast",
  "suggestedName": "string",
  "tags": ["string"],
  "artists": ["string"],
  "tracks": ["string"],
  "valence": 0.0-1.0,
  "danceability": 0.0-1.0,
  "acousticness": 0.0-1.0
}`;

    try {
      const response = await this.llmManager.generateResponse({
        provider: provider || 'gemini',
        model: model || 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: 500
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback to basic analysis
      return this.basicPromptAnalysis(prompt);
    } catch (error) {
      console.warn('AI analysis failed, using basic analysis:', error.message);
      return this.basicPromptAnalysis(prompt);
    }
  }

  /**
   * Basic prompt analysis (fallback)
   */
  basicPromptAnalysis(prompt) {
    const lower = prompt.toLowerCase();
    
    // Detect mood
    let mood = 'neutral';
    if (/happy|cheerful|upbeat|joyful/.test(lower)) mood = 'happy';
    else if (/sad|melancholy|depressing/.test(lower)) mood = 'sad';
    else if (/energetic|intense|powerful|workout/.test(lower)) mood = 'energetic';
    else if (/calm|relaxing|chill|peaceful/.test(lower)) mood = 'calm';

    // Detect genres
    const genrePatterns = {
      rock: /rock|metal|punk/,
      pop: /pop/,
      electronic: /electronic|edm|techno|house/,
      hiphop: /hip hop|rap/,
      jazz: /jazz/,
      classical: /classical/,
      indie: /indie/,
      country: /country/
    };
    
    const genres = [];
    for (const [genre, pattern] of Object.entries(genrePatterns)) {
      if (pattern.test(lower)) genres.push(genre);
    }

    // Energy mapping
    const energyMap = {
      energetic: 0.8,
      calm: 0.3,
      happy: 0.7,
      sad: 0.4,
      neutral: 0.5
    };

    return {
      mood,
      genres: genres.length > 0 ? genres : ['various'],
      energy: energyMap[mood] || 0.5,
      tempo: mood === 'energetic' ? 'fast' : mood === 'calm' ? 'slow' : 'medium',
      suggestedName: this.generatePlaylistName(prompt),
      tags: [mood, ...genres],
      artists: [],
      tracks: [],
      valence: mood === 'happy' ? 0.7 : mood === 'sad' ? 0.3 : 0.5,
      danceability: mood === 'energetic' ? 0.7 : 0.5,
      acousticness: mood === 'calm' ? 0.6 : 0.3
    };
  }

  /**
   * Generate playlist name from prompt
   */
  generatePlaylistName(prompt) {
    // Take first 50 chars or until punctuation
    const short = prompt.substring(0, 50).split(/[.!?]/)[0];
    return short.charAt(0).toUpperCase() + short.slice(1);
  }

  /**
   * Get user listening history
   */
  async getUserListeningHistory(userId) {
    // This would query MongoDB listening history
    // For now, return empty array
    return [];
  }

  /**
   * Select tracks for playlist based on criteria
   */
  async selectTracksForPlaylist(criteria, accessToken) {
    const {
      mood,
      genres,
      energy,
      targetDuration,
      artists,
      tracks: specificTracks
    } = criteria;

    const selectedTracks = [];
    let totalDuration = 0;

    // Use Spotify's recommendation API
    try {
      const params = {
        limit: 50,
        target_energy: energy,
        target_valence: criteria.valence || 0.5,
        target_danceability: criteria.danceability || 0.5,
        target_acousticness: criteria.acousticness || 0.5
      };

      // Add seed genres if available
      if (genres && genres.length > 0) {
        params.seed_genres = genres.slice(0, 5).join(',');
      }

      // Add seed artists if available
      if (artists && artists.length > 0) {
        params.seed_artists = artists.slice(0, 2).join(',');
      }

      // Get recommendations from Spotify
      const recommendations = await this.spotifyService.getRecommendations(params, accessToken);

      // Select tracks until we reach target duration
      for (const track of recommendations.tracks || []) {
        if (totalDuration >= targetDuration) break;
        
        selectedTracks.push({
          uri: track.uri,
          name: track.name,
          artists: track.artists.map(a => a.name),
          duration_ms: track.duration_ms
        });
        
        totalDuration += track.duration_ms;
      }

      return selectedTracks;
    } catch (error) {
      console.error('Track selection error:', error);
      throw new Error('Failed to select tracks for playlist');
    }
  }

  /**
   * Create playlist in Spotify
   */
  async createSpotifyPlaylist(userId, name, tracks, accessToken) {
    try {
      // Create empty playlist
      const playlist = await this.spotifyService.createPlaylist(
        userId,
        {
          name,
          description: 'Created by EchoTune AI',
          public: false
        },
        accessToken
      );

      // Add tracks to playlist
      if (tracks.length > 0) {
        const trackUris = tracks.map(t => t.uri);
        await this.spotifyService.addTracksToPlaylist(
          playlist.id,
          trackUris,
          accessToken
        );
      }

      return playlist;
    } catch (error) {
      console.error('Playlist creation error:', error);
      throw new Error('Failed to create Spotify playlist');
    }
  }

  /**
   * Real-time personalization - adjust user preferences
   */
  async updatePersonalization(userId, adjustments) {
    try {
      const { direction, attributes } = adjustments;
      // direction: 'more' or 'less'
      // attributes: ['energetic', 'instrumental', 'pop']

      // Get current preferences
      const prefs = await this.persistenceService.getUserPreferences(userId);

      // Adjust preferences
      const updates = {};
      
      if (attributes.includes('energetic')) {
        updates.energyPreference = direction === 'more' 
          ? Math.min((prefs.energyPreference || 0.5) + 0.1, 1.0)
          : Math.max((prefs.energyPreference || 0.5) - 0.1, 0.0);
      }

      if (attributes.includes('instrumental')) {
        // Adjust instrumentalness preference
        updates.preferredGenres = prefs.preferredGenres || [];
        if (direction === 'more') {
          updates.preferredGenres.push('instrumental');
        }
      }

      // Apply updates
      await this.persistenceService.updateUserPreferences(userId, updates);

      return {
        success: true,
        message: `Preferences updated: ${direction} ${attributes.join(', ')}`,
        newPreferences: updates
      };
    } catch (error) {
      console.error('Personalization update error:', error);
      throw new Error('Failed to update personalization');
    }
  }

  /**
   * Advanced semantic search
   */
  async semanticSearch(query, userId, options = {}) {
    try {
      const { provider, model, accessToken } = options;

      // Use AI to understand search intent
      const intent = await this.analyzeSearchIntent(query, provider, model);

      // Perform search based on intent
      const results = await this.performSearch(intent, accessToken);

      return {
        success: true,
        intent,
        results,
        query
      };
    } catch (error) {
      console.error('Semantic search error:', error);
      throw new Error('Failed to perform semantic search');
    }
  }

  /**
   * Analyze search intent with AI
   */
  async analyzeSearchIntent(query, provider, model) {
    const systemPrompt = `Analyze this music search query and determine:
1. Search type (track, artist, album, playlist, mood, genre)
2. Key terms
3. Mood/vibe if mentioned
4. Genre if mentioned
5. Any specific attributes (year, popularity, etc.)

Respond in JSON format only.`;

    try {
      const response = await this.llmManager.generateResponse({
        provider: provider || 'gemini',
        model: model || 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Search query: "${query}"\n\nAnalyze and respond in JSON.` }
        ],
        temperature: 0.2,
        maxTokens: 300
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { type: 'track', terms: [query], mood: null, genre: null };
    } catch (error) {
      return { type: 'track', terms: [query], mood: null, genre: null };
    }
  }

  /**
   * Perform search based on intent
   */
  async performSearch(intent, accessToken) {
    try {
      const searchTerm = intent.terms.join(' ');
      const results = await this.spotifyService.search(
        searchTerm,
        [intent.type || 'track', 'artist'],
        { limit: 20 },
        accessToken
      );

      return results;
    } catch (error) {
      console.error('Search execution error:', error);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }
}

module.exports = SmartFeaturesService;
