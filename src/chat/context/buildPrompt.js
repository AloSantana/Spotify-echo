/**
 * Prompt Builder with Token Budgeting
 * 
 * Builds optimized prompts for LLM interactions with intelligent token budgeting,
 * content prioritization, and fallback mechanisms for music recommendation contexts.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

class PromptBuilder {
  constructor(options = {}) {
    this.options = {
      defaultMaxTokens: 4000,
      reserveTokens: 500, // Reserve for response
      tokensPerCharacter: 0.25, // Rough estimate: 4 chars = 1 token
      safetyMargin: 100,
      defaultStrategy: 'balanced',
      templates: {
        'music-recommendation': 'music_recommendation',
        'conversation': 'general_conversation',
        'discovery': 'music_discovery'
      },
      ...options
    };

    this.tokenCountCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the prompt builder
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.initialized = true;
      console.log('PromptBuilder initialized');
    } catch (error) {
      console.error('Failed to initialize PromptBuilder:', error);
      throw error;
    }
  }

  /**
   * Build optimized prompt with token budgeting
   * @param {Object} userContext - User context from assembler
   * @param {string} userQuery - Current user query
   * @param {Object} options - Build options
   * @returns {Object} Optimized prompt with metadata
   */
  async build(userContext, userQuery, options = {}) {
    await this.initialize();

    const opts = {
      maxTokens: this.options.defaultMaxTokens,
      template: 'music-recommendation',
      strategy: this.options.defaultStrategy,
      includeExamples: false,
      includeInstructions: true,
      safetyCheck: true,
      ...options
    };

    const startTime = Date.now();

    try {
      // Calculate available tokens
      const availableTokens = opts.maxTokens - this.options.reserveTokens - this.options.safetyMargin;

      // Apply token budgeting strategy
      const budgetedContext = await this._applyTokenBudgeting(
        userContext, 
        userQuery, 
        availableTokens, 
        opts.strategy
      );

      // Build prompt from template
      const prompt = await this._buildFromTemplate(
        budgetedContext, 
        userQuery, 
        opts.template, 
        opts
      );

      // Validate and apply safety checks
      const finalPrompt = opts.safetyCheck ? 
        await this._applySafetyChecks(prompt) : 
        prompt;

      // Calculate final token count
      const finalTokenCount = this._estimateTokenCount(finalPrompt.text);

      return {
        text: finalPrompt.text,
        metadata: {
          originalTokens: this._estimateTokenCount(JSON.stringify(userContext) + userQuery),
          finalTokens: finalTokenCount,
          tokensUsed: finalTokenCount,
          tokensAvailable: availableTokens,
          utilizationRate: finalTokenCount / availableTokens,
          strategy: opts.strategy,
          template: opts.template,
          truncated: budgetedContext.truncated,
          buildTime: Date.now() - startTime,
          source: 'PromptBuilder'
        },
        context: budgetedContext,
        safety: finalPrompt.safety || { passed: true }
      };

    } catch (error) {
      console.error('Error building prompt:', error);
      return this._getFallbackPrompt(userQuery, opts);
    }
  }

  /**
   * Build quick prompt for simple queries
   * @param {string} userQuery - User query
   * @param {Object} basicContext - Minimal context
   * @returns {Object} Quick prompt
   */
  async buildQuick(userQuery, basicContext = {}) {
    await this.initialize();

    const template = this._getTemplate('conversation');
    const context = {
      user: basicContext.user || { preferences: {} },
      query: userQuery,
      timestamp: new Date().toISOString()
    };

    const promptText = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return this._getContextValue(context, key) || match;
    });

    return {
      text: promptText,
      metadata: {
        type: 'quick',
        tokens: this._estimateTokenCount(promptText),
        buildTime: Date.now(),
        source: 'PromptBuilder'
      }
    };
  }

  // Private methods

  async _applyTokenBudgeting(userContext, userQuery, availableTokens, strategy) {
    const budgetingStrategies = {
      'conversation-first': this._budgetConversationFirst.bind(this),
      'profile-first': this._budgetProfileFirst.bind(this),
      'balanced': this._budgetBalanced.bind(this),
      'minimal': this._budgetMinimal.bind(this)
    };

    const budgetingFunction = budgetingStrategies[strategy] || budgetingStrategies.balanced;
    return await budgetingFunction(userContext, userQuery, availableTokens);
  }

  async _budgetConversationFirst(userContext, userQuery, availableTokens) {
    const allocations = {
      query: 0.15,
      conversation: 0.40,
      preferences: 0.25,
      recentActivity: 0.15,
      history: 0.05
    };

    return this._applyProportionalBudgeting(userContext, userQuery, availableTokens, allocations);
  }

  async _budgetProfileFirst(userContext, userQuery, availableTokens) {
    const allocations = {
      query: 0.15,
      conversation: 0.20,
      preferences: 0.35,
      recentActivity: 0.25,
      history: 0.05
    };

    return this._applyProportionalBudgeting(userContext, userQuery, availableTokens, allocations);
  }

  async _budgetBalanced(userContext, userQuery, availableTokens) {
    const allocations = {
      query: 0.15,
      conversation: 0.30,
      preferences: 0.25,
      recentActivity: 0.20,
      history: 0.10
    };

    return this._applyProportionalBudgeting(userContext, userQuery, availableTokens, allocations);
  }

  async _budgetMinimal(userContext, userQuery, availableTokens) {
    const allocations = {
      query: 0.20,
      conversation: 0.40,
      preferences: 0.30,
      recentActivity: 0.10,
      history: 0.00
    };

    return this._applyProportionalBudgeting(userContext, userQuery, availableTokens, allocations);
  }

  async _applyProportionalBudgeting(userContext, userQuery, availableTokens, allocations) {
    const components = {
      query: userQuery,
      conversation: this._extractConversationContext(userContext),
      preferences: this._extractPreferencesContext(userContext),
      recentActivity: this._extractRecentActivityContext(userContext),
      history: this._extractHistoryContext(userContext)
    };

    const budgetedComponents = {};
    let totalUsedTokens = 0;
    let truncated = false;

    // Apply allocations
    for (const [component, allocation] of Object.entries(allocations)) {
      const content = components[component];
      const targetTokens = Math.floor(availableTokens * allocation);
      
      if (content) {
        const { text, tokens, wasTruncated } = this._truncateToTokens(content, targetTokens);
        budgetedComponents[component] = text;
        totalUsedTokens += tokens;
        
        if (wasTruncated) {
          truncated = true;
        }
      } else {
        budgetedComponents[component] = '';
      }
    }

    return {
      ...budgetedComponents,
      metadata: {
        totalTokens: totalUsedTokens,
        availableTokens,
        utilization: totalUsedTokens / availableTokens,
        truncated,
        strategy: 'proportional'
      }
    };
  }

  _extractConversationContext(userContext) {
    if (!userContext.recentSessions || userContext.recentSessions.length === 0) {
      return '';
    }

    const recentMessages = userContext.recentSessions
      .flatMap(session => session.messages || [])
      .slice(-10); // Last 10 messages

    return recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  _extractPreferencesContext(userContext) {
    const parts = [];

    if (userContext.preferences?.explicit?.favoriteGenres) {
      parts.push(`Favorite genres: ${userContext.preferences.explicit.favoriteGenres.join(', ')}`);
    }

    if (userContext.preferences?.derived?.topGenres) {
      const topGenres = userContext.preferences.derived.topGenres
        .slice(0, 5)
        .map(g => `${g.genre} (${g.percentage.toFixed(1)}%)`)
        .join(', ');
      parts.push(`Listening patterns: ${topGenres}`);
    }

    if (userContext.preferences?.derived?.audioFeatureProfile) {
      const features = userContext.preferences.derived.audioFeatureProfile;
      const featureDesc = Object.entries(features)
        .map(([feature, data]) => `${feature}: ${data.mean.toFixed(2)}`)
        .join(', ');
      parts.push(`Audio preferences: ${featureDesc}`);
    }

    return parts.join('\n');
  }

  _extractRecentActivityContext(userContext) {
    const parts = [];

    if (userContext.recentActivity?.recentTrackCount) {
      parts.push(`Recently played ${userContext.recentActivity.recentTrackCount} tracks`);
    }

    if (userContext.recentActivity?.recentGenres?.length > 0) {
      parts.push(`Recent genres: ${userContext.recentActivity.recentGenres.slice(0, 5).join(', ')}`);
    }

    if (userContext.recentActivity?.recentArtists?.length > 0) {
      parts.push(`Recent artists: ${userContext.recentActivity.recentArtists.slice(0, 3).join(', ')}`);
    }

    return parts.join('\n');
  }

  _extractHistoryContext(userContext) {
    if (!userContext.listeningHistory || userContext.listeningHistory.length === 0) {
      return '';
    }

    const recentTracks = userContext.listeningHistory
      .slice(0, 10)
      .map(track => `${track.name} by ${track.artist}`)
      .join(', ');

    return `Recent listening history: ${recentTracks}`;
  }

  _truncateToTokens(text, maxTokens) {
    if (!text) return { text: '', tokens: 0, wasTruncated: false };

    const estimatedTokens = this._estimateTokenCount(text);
    
    if (estimatedTokens <= maxTokens) {
      return { text, tokens: estimatedTokens, wasTruncated: false };
    }

    // Truncate by approximate character count
    const targetChars = Math.floor(maxTokens / this.options.tokensPerCharacter);
    const truncatedText = text.substring(0, targetChars) + '...';
    
    return { 
      text: truncatedText, 
      tokens: this._estimateTokenCount(truncatedText), 
      wasTruncated: true 
    };
  }

  async _buildFromTemplate(budgetedContext, userQuery, templateName, options) {
    const template = this._getTemplate(templateName);
    
    const templateContext = {
      user_query: userQuery,
      user_preferences: budgetedContext.preferences || '',
      conversation_history: budgetedContext.conversation || '',
      recent_activity: budgetedContext.recentActivity || '',
      listening_history: budgetedContext.history || '',
      timestamp: new Date().toISOString(),
      instructions: options.includeInstructions ? this._getInstructions(templateName) : '',
      examples: options.includeExamples ? this._getExamples(templateName) : ''
    };

    let promptText = template;
    
    // Replace template variables
    for (const [key, value] of Object.entries(templateContext)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      promptText = promptText.replace(regex, value || '');
    }

    // Clean up extra whitespace
    promptText = promptText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

    return { text: promptText };
  }

  _getTemplate(templateName) {
    const templates = {
      music_recommendation: `You are EchoTune AI, an expert music recommendation assistant. Help the user discover new music based on their preferences and listening history.

User Query: {{user_query}}

User Context:
{{user_preferences}}

{{conversation_history}}

Recent Activity:
{{recent_activity}}

{{listening_history}}

{{instructions}}

{{examples}}

Please provide personalized music recommendations with explanations for why each track might appeal to the user.`,

      general_conversation: `You are EchoTune AI, a conversational music discovery assistant. Engage naturally with the user about music.

User: {{user_query}}

{{user_preferences}}

{{conversation_history}}

Respond naturally and helpfully about music.`,

      music_discovery: `You are EchoTune AI, helping users discover new music. Focus on exploration and broadening musical horizons.

Discovery Request: {{user_query}}

User Profile:
{{user_preferences}}

{{recent_activity}}

{{instructions}}

Suggest music that expands their current listening while respecting their core preferences.`
    };

    return templates[this.options.templates[templateName]] || templates[templateName] || templates.music_recommendation;
  }

  _getInstructions(templateName) {
    const instructions = {
      music_recommendation: `
Instructions:
- Provide 5-10 specific track recommendations
- Explain why each track matches their taste
- Include artist name, track name, and brief description
- Consider their audio feature preferences and listening patterns
- Suggest both familiar and discovery tracks`,

      music_discovery: `
Instructions:
- Focus on expanding their musical horizons
- Suggest artists and genres they might not know
- Explain connections to their current preferences
- Encourage exploration while maintaining relevance`
    };

    return instructions[templateName] || '';
  }

  _getExamples(templateName) {
    const examples = {
      music_recommendation: `
Example format:
1. "Song Title" by Artist Name
   - Why: [Brief explanation of match]
   - Style: [Genre/style description]

2. "Another Song" by Another Artist
   - Why: [Brief explanation of match]
   - Style: [Genre/style description]`
    };

    return examples[templateName] || '';
  }

  async _applySafetyChecks(prompt) {
    // Basic safety checks
    const safety = {
      passed: true,
      warnings: []
    };

    // Check for inappropriate content (simplified)
    const inappropriatePatterns = [
      /explicit content/i,
      /inappropriate/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(prompt.text)) {
        safety.warnings.push('Potential inappropriate content detected');
      }
    }

    // Check prompt length
    const tokenCount = this._estimateTokenCount(prompt.text);
    if (tokenCount > this.options.defaultMaxTokens) {
      safety.warnings.push(`Prompt exceeds recommended token limit: ${tokenCount}`);
    }

    return { 
      ...prompt, 
      safety 
    };
  }

  _estimateTokenCount(text) {
    if (!text) return 0;
    
    // Use cached count if available
    const cacheKey = text.length < 100 ? text : text.substring(0, 100) + '...' + text.length;
    if (this.tokenCountCache.has(cacheKey)) {
      return this.tokenCountCache.get(cacheKey);
    }

    // Simple estimation: average of 4 characters per token
    const estimatedTokens = Math.ceil(text.length * this.options.tokensPerCharacter);
    
    // Cache the result
    this.tokenCountCache.set(cacheKey, estimatedTokens);
    
    // Limit cache size
    if (this.tokenCountCache.size > 1000) {
      const firstKey = this.tokenCountCache.keys().next().value;
      this.tokenCountCache.delete(firstKey);
    }
    
    return estimatedTokens;
  }

  _getContextValue(context, key) {
    const keys = key.split('.');
    let value = context;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return undefined;
    }
    
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  _getFallbackPrompt(userQuery, options) {
    const fallbackText = `You are EchoTune AI, a music recommendation assistant.

User Query: ${userQuery}

Please provide helpful music recommendations based on this query.`;

    return {
      text: fallbackText,
      metadata: {
        type: 'fallback',
        tokens: this._estimateTokenCount(fallbackText),
        buildTime: 0,
        source: 'PromptBuilder',
        fallback: true
      },
      safety: { passed: true }
    };
  }
}

module.exports = { PromptBuilder };