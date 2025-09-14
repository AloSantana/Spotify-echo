/**
 * Intent Classification Module for EchoTune AI
 * Classifies user messages into specific intents for better response handling
 */

class IntentClassifier {
  constructor() {
    this.intents = {
      // Music recommendation intents
      recommend: {
        patterns: [
          /(?:recommend|suggest|find|show|play|discover|want|need|looking for).+(?:music|song|track|artist|album)/i,
          /(?:what should i listen to|what music|play something|find me)/i,
          /(?:similar to|like|based on)/i,
        ],
        keywords: ['recommend', 'suggest', 'find', 'discover', 'music', 'song', 'similar', 'like'],
        weight: 0.8,
      },

      // Refinement intents
      refine: {
        patterns: [
          /(?:more like|similar but|different|not quite|change|adjust|modify)/i,
          /(?:something else|try again|another|different style)/i,
          /(?:too|less|more) (?:upbeat|calm|energetic|slow|fast|happy|sad)/i,
        ],
        keywords: ['more', 'different', 'change', 'adjust', 'another', 'else', 'modify'],
        weight: 0.7,
      },

      // Playlist creation intents
      playlist_create: {
        patterns: [
          /(?:create|make|build|generate|new) (?:playlist|mix|collection)/i,
          /playlist (?:for|with|called|named)/i,
          /make me a playlist/i,
        ],
        keywords: ['create', 'make', 'playlist', 'mix', 'collection', 'generate'],
        weight: 0.9,
      },

      // Playlist extension intents
      playlist_extend: {
        patterns: [
          /(?:add|append|include|put) (?:to|in|into) (?:playlist|my playlist)/i,
          /(?:extend|expand|grow) (?:playlist|mix)/i,
          /(?:more songs|additional tracks|add these)/i,
        ],
        keywords: ['add', 'append', 'extend', 'expand', 'include', 'more songs'],
        weight: 0.8,
      },

      // Insights and analysis intents
      insight: {
        patterns: [
          /(?:analyze|analysis|insights?|stats?|statistics|trends?)/i,
          /(?:my (?:music|listening|taste|habits)|listening (?:history|data|patterns))/i,
          /(?:what (?:do i|am i) listen|how (?:much|often))/i,
          /(?:top (?:songs|artists|genres|tracks))/i,
        ],
        keywords: ['analyze', 'insights', 'stats', 'listening', 'habits', 'history', 'trends', 'top'],
        weight: 0.7,
      },

      // Mood-based intents
      mood: {
        patterns: [
          /(?:feeling|mood|emotion|vibe)(?:\s+(?:like|for|of))?/i,
          /(?:happy|sad|energetic|calm|excited|relaxed|angry|peaceful|upbeat|chill)/i,
          /(?:workout|study|sleep|drive|party|relax|focus|work)/i,
        ],
        keywords: ['feeling', 'mood', 'happy', 'sad', 'energetic', 'calm', 'workout', 'study', 'chill'],
        weight: 0.6,
      },

      // Feedback intents
      feedback: {
        patterns: [
          /(?:like|love|hate|dislike|not good|great|awesome|terrible)/i,
          /(?:thumbs? (?:up|down)|good|bad|perfect|not quite)/i,
          /(?:thanks?|thank you|appreciate|helpful|not helpful)/i,
        ],
        keywords: ['like', 'love', 'hate', 'good', 'bad', 'thanks', 'awesome', 'terrible'],
        weight: 0.5,
      },

      // General conversation
      general: {
        patterns: [
          /(?:hello|hi|hey|how are you|what's up)/i,
          /(?:help|what can you do|capabilities|features)/i,
          /(?:who are you|what are you|about)/i,
        ],
        keywords: ['hello', 'hi', 'help', 'who', 'what', 'how'],
        weight: 0.3,
      },
    };

    // Mood and activity mappings
    this.moodKeywords = {
      happy: ['happy', 'joyful', 'cheerful', 'upbeat', 'positive', 'euphoric'],
      sad: ['sad', 'melancholy', 'depressed', 'down', 'blue', 'somber'],
      energetic: ['energetic', 'pumped', 'hyped', 'excited', 'intense', 'powerful'],
      calm: ['calm', 'peaceful', 'serene', 'tranquil', 'relaxed', 'chill'],
      angry: ['angry', 'furious', 'aggressive', 'intense', 'rage'],
      romantic: ['romantic', 'love', 'intimate', 'passionate', 'tender'],
    };

    this.activityKeywords = {
      workout: ['workout', 'exercise', 'gym', 'run', 'fitness', 'training', 'working out'],
      study: ['study', 'studying', 'focus', 'concentration', 'work', 'reading', 'learning'],
      sleep: ['sleep', 'bedtime', 'lullaby', 'rest', 'drowsy'],
      drive: ['drive', 'driving', 'car', 'road trip', 'commute', 'travel'],
      party: ['party', 'dance', 'club', 'celebration', 'fun'],
      relax: ['relax', 'chill', 'unwind', 'peace', 'meditation'],
    };
  }

  classifyIntent(message, context = {}) {
    const normalizedMessage = message.toLowerCase().trim();
    const scores = {};
    const extractedEntities = this.extractEntities(normalizedMessage);

    // Calculate scores for each intent
    for (const [intentName, intentConfig] of Object.entries(this.intents)) {
      scores[intentName] = this.calculateIntentScore(
        normalizedMessage,
        intentConfig,
        context,
        extractedEntities
      );
    }

    // Find the highest scoring intent
    const sortedIntents = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    let primaryIntent = 'general';
    let confidence = 0.3;

    if (sortedIntents.length > 0) {
      [primaryIntent, confidence] = sortedIntents[0];
    }

    // Apply confidence thresholds
    if (confidence < 0.3) {
      primaryIntent = 'general';
      confidence = 0.3;
    }

    // Detect compound intents
    const secondaryIntents = sortedIntents
      .slice(1, 3)
      .filter(([, score]) => score > 0.2)
      .map(([intent]) => intent);

    return {
      primary: primaryIntent,
      secondary: secondaryIntents,
      confidence: Math.min(confidence, 1.0),
      entities: extractedEntities,
      allScores: scores,
      message: normalizedMessage,
      requiresSpotifyAuth: this.requiresSpotifyAuth(primaryIntent),
      suggestedActions: this.getSuggestedActions(primaryIntent, extractedEntities),
    };
  }

  calculateIntentScore(message, intentConfig, context, entities) {
    let score = 0;

    // Pattern matching
    for (const pattern of intentConfig.patterns) {
      if (pattern.test(message)) {
        score += 0.4;
        break;
      }
    }

    // Keyword matching
    const keywordMatches = intentConfig.keywords.filter(keyword =>
      message.includes(keyword.toLowerCase())
    );
    score += (keywordMatches.length / intentConfig.keywords.length) * 0.3;

    // Entity boosting
    if (entities.genres.length > 0 && ['recommend', 'mood'].includes(intentConfig.name)) {
      score += 0.1;
    }
    if (entities.artists.length > 0 && ['recommend', 'refine'].includes(intentConfig.name)) {
      score += 0.1;
    }
    if (entities.moods.length > 0 && intentConfig.name === 'mood') {
      score += 0.2;
    }
    if (entities.activities.length > 0 && ['recommend', 'playlist_create'].includes(intentConfig.name)) {
      score += 0.1;
    }

    // Context boosting
    if (context.previousIntent && this.isIntentSequenceValid(context.previousIntent, intentConfig.name)) {
      score += 0.1;
    }

    // Apply intent weight
    score *= intentConfig.weight;

    return Math.min(score, 1.0);
  }

  extractEntities(message) {
    const entities = {
      genres: [],
      artists: [],
      moods: [],
      activities: [],
      tracks: [],
      timeframe: null,
    };

    // Extract genres
    const genrePatterns = [
      /(?:rock|pop|jazz|classical|hip.?hop|rap|electronic|dance|edm|house|techno|country|folk|blues|metal|punk|indie|alternative|r&b|soul|funk|reggae|latin|world|ambient|experimental)/gi
    ];
    
    for (const pattern of genrePatterns) {
      const matches = message.match(pattern) || [];
      entities.genres.push(...matches.map(m => m.toLowerCase()));
    }

    // Extract moods
    for (const [mood, keywords] of Object.entries(this.moodKeywords)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          entities.moods.push(mood);
          break;
        }
      }
    }

    // Extract activities - prioritize longer matches
    const activityEntries = Object.entries(this.activityKeywords);
    
    // Sort by keyword length to prioritize longer matches (e.g., "working out" over "work")
    const allActivityKeywords = [];
    activityEntries.forEach(([activity, keywords]) => {
      keywords.forEach(keyword => {
        allActivityKeywords.push({ activity, keyword, length: keyword.length });
      });
    });
    
    allActivityKeywords.sort((a, b) => b.length - a.length);
    
    for (const { activity, keyword } of allActivityKeywords) {
      if (message.includes(keyword)) {
        entities.activities.push(activity);
        break; // Only match the first (longest) activity
      }
    }

    // Extract artist mentions
    const artistPattern = /(?:by|from|artist) ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const artistMatches = message.match(artistPattern) || [];
    entities.artists = artistMatches.map(match => 
      match.replace(/(?:by|from|artist)\s+/i, '').trim()
    );

    // Extract track mentions
    const trackPattern = /(?:song|track|piece) (?:called |named )?["']([^"']+)["']|"([^"]+)"/gi;
    const trackMatches = [...message.matchAll(trackPattern)];
    entities.tracks = trackMatches.map(match => match[1] || match[2]).filter(Boolean);

    // Extract timeframe
    const timeframePattern = /(?:last|past|recent|this) (?:week|month|year|few (?:days|weeks|months))/i;
    const timeframeMatch = message.match(timeframePattern);
    if (timeframeMatch) {
      entities.timeframe = timeframeMatch[0];
    }

    // Remove duplicates
    Object.keys(entities).forEach(key => {
      if (Array.isArray(entities[key])) {
        entities[key] = [...new Set(entities[key])];
      }
    });

    return entities;
  }

  isIntentSequenceValid(previousIntent, currentIntent) {
    const validSequences = {
      recommend: ['refine', 'feedback', 'playlist_create'],
      refine: ['recommend', 'feedback', 'playlist_create'],
      playlist_create: ['playlist_extend', 'recommend'],
      mood: ['recommend', 'playlist_create'],
      insight: ['recommend'],
    };

    return validSequences[previousIntent]?.includes(currentIntent) || false;
  }

  requiresSpotifyAuth(intent) {
    const authRequiredIntents = ['playlist_create', 'playlist_extend', 'insight'];
    return authRequiredIntents.includes(intent);
  }

  getSuggestedActions(intent, entities) {
    const actions = [];

    switch (intent) {
      case 'recommend':
        actions.push('generate_recommendations');
        if (entities.moods.length > 0) actions.push('apply_mood_filter');
        if (entities.activities.length > 0) actions.push('apply_activity_filter');
        if (entities.genres.length > 0) actions.push('apply_genre_filter');
        break;

      case 'playlist_create':
        actions.push('create_spotify_playlist');
        actions.push('generate_recommendations');
        break;

      case 'playlist_extend':
        actions.push('add_to_existing_playlist');
        actions.push('generate_recommendations');
        break;

      case 'insight':
        actions.push('analyze_listening_history');
        if (entities.timeframe) actions.push('apply_timeframe_filter');
        break;

      case 'refine':
        actions.push('refine_last_recommendations');
        break;

      case 'feedback':
        actions.push('process_user_feedback');
        actions.push('update_user_preferences');
        break;

      case 'mood':
        actions.push('generate_mood_recommendations');
        if (entities.activities.length > 0) actions.push('combine_mood_activity');
        break;

      default:
        actions.push('provide_general_response');
    }

    return actions;
  }

  getIntentDescription(intent) {
    const descriptions = {
      recommend: 'Music recommendation request',
      refine: 'Refinement of previous recommendations',
      playlist_create: 'Request to create a new playlist',
      playlist_extend: 'Request to add songs to existing playlist',
      insight: 'Request for listening analysis or insights',
      mood: 'Mood-based music request',
      feedback: 'User feedback on recommendations',
      general: 'General conversation or help request',
    };

    return descriptions[intent] || 'Unknown intent';
  }

  getStats() {
    return {
      totalIntents: Object.keys(this.intents).length,
      moodCategories: Object.keys(this.moodKeywords).length,
      activityCategories: Object.keys(this.activityKeywords).length,
      version: '1.0.0',
    };
  }
}

module.exports = IntentClassifier;
