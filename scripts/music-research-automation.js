#!/usr/bin/env node

/**
 * Music Research Automation for EchoTune AI
 * 
 * Features:
 * - Automated music trend research using Perplexity API
 * - Genre analysis and emerging artist discovery
 * - Music industry insights and competitive analysis
 * - Integration with recommendation algorithms
 * - Weekly research reports for strategy planning
 * 
 * Enhanced with:
 * - Budget-aware API usage with circuit breaker pattern
 * - Request throttling and rate limiting
 * - Graceful degradation for API failures
 * - Comprehensive error handling and recovery
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class MusicResearchAutomator {
  constructor() {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    this.researchCache = new Map();
    this.researchResults = {
      trends: [],
      artists: [],
      genres: [],
      industry: [],
      insights: []
    };
    
    // Circuit breaker state
    this.circuitBreaker = {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureThreshold: 3,
      resetTimeout: 60000, // 1 minute
      consecutiveSuccesses: 0
    };
    
    // Rate limiting
    this.rateLimiter = {
      requestCount: 0,
      windowStart: Date.now(),
      maxRequestsPerMinute: 20, // Conservative limit
      requestQueue: []
    };
    
    // Budget tracking
    this.budgetInfo = {
      canProceed: true,
      remainingBudget: 0,
      usagePercentage: 0,
      state: 'UNKNOWN'
    };
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      budgetChecks: 0
    };
    
    if (!this.perplexityApiKey) {
      console.warn('⚠️ PERPLEXITY_API_KEY not found. Research features will be limited.');
    }
  }
  
  /**
   * Check budget status before proceeding with API-intensive operations
   */
  async checkBudgetStatus() {
    console.log('💰 Checking Perplexity API budget status...');
    this.stats.budgetChecks++;
    
    try {
      // Run budget check using Python script
      const result = execSync(
        'python3 scripts/perplexity_costs.py budget',
        { encoding: 'utf-8', timeout: 10000 }
      );
      
      const budgetData = JSON.parse(result);
      this.budgetInfo = {
        canProceed: budgetData.can_proceed || false,
        remainingBudget: budgetData.remaining_amount || 0,
        usagePercentage: budgetData.usage_percentage || 0,
        state: budgetData.state || 'UNKNOWN'
      };
      
      console.log(`  Budget State: ${this.budgetInfo.state}`);
      console.log(`  Usage: ${this.budgetInfo.usagePercentage}%`);
      console.log(`  Remaining: $${this.budgetInfo.remainingBudget.toFixed(2)}`);
      
      if (!this.budgetInfo.canProceed) {
        console.warn('  ⚠️ Budget limit reached - using degraded mode');
      }
      
      return this.budgetInfo.canProceed;
      
    } catch (error) {
      console.warn(`  ⚠️ Budget check failed: ${error.message}`);
      // Fail safe - assume we can proceed but with caution
      this.budgetInfo.canProceed = true;
      this.budgetInfo.state = 'WARNING';
      return true;
    }
  }
  
  /**
   * Circuit breaker check - prevent cascading failures
   */
  canMakeRequest() {
    const now = Date.now();
    
    // Check if circuit is OPEN
    if (this.circuitBreaker.state === 'OPEN') {
      // Check if timeout has elapsed
      if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.resetTimeout) {
        console.log('🔄 Circuit breaker moving to HALF_OPEN state');
        this.circuitBreaker.state = 'HALF_OPEN';
        this.circuitBreaker.consecutiveSuccesses = 0;
        return true;
      }
      
      console.warn('⚡ Circuit breaker is OPEN - request blocked');
      return false;
    }
    
    return true;
  }
  
  /**
   * Record successful request for circuit breaker
   */
  recordSuccess() {
    this.circuitBreaker.consecutiveSuccesses++;
    this.stats.successfulRequests++;
    
    if (this.circuitBreaker.state === 'HALF_OPEN' && 
        this.circuitBreaker.consecutiveSuccesses >= 2) {
      console.log('✅ Circuit breaker moving to CLOSED state');
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failureCount = 0;
    }
  }
  
  /**
   * Record failed request for circuit breaker
   */
  recordFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    this.circuitBreaker.consecutiveSuccesses = 0;
    this.stats.failedRequests++;
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      console.warn('⚡ Circuit breaker opening due to repeated failures');
      this.circuitBreaker.state = 'OPEN';
    }
  }
  
  /**
   * Rate limiting check
   */
  async waitForRateLimit() {
    const now = Date.now();
    const windowElapsed = now - this.rateLimiter.windowStart;
    
    // Reset window if a minute has passed
    if (windowElapsed >= 60000) {
      this.rateLimiter.requestCount = 0;
      this.rateLimiter.windowStart = now;
    }
    
    // Check if we're at the limit
    if (this.rateLimiter.requestCount >= this.rateLimiter.maxRequestsPerMinute) {
      const waitTime = 60000 - windowElapsed;
      console.log(`⏳ Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after waiting
      this.rateLimiter.requestCount = 0;
      this.rateLimiter.windowStart = Date.now();
    }
    
    this.rateLimiter.requestCount++;
  }

  async runWeeklyMusicResearch() {
    console.log('🎵 Starting Weekly Music Research Automation...\n');

    try {
      // Pre-flight budget check
      const budgetOk = await this.checkBudgetStatus();
      
      if (!budgetOk) {
        console.warn('⚠️ Budget limit reached - running in degraded mode');
        await this.runDegradedMode();
        return;
      }
      
      // Determine research scope based on budget state
      const researchScope = this.determineResearchScope();
      console.log(`📊 Research scope: ${researchScope.mode}`);
      console.log(`📝 Planning ${researchScope.maxQueries} API queries\n`);
      
      // Run research with proper sequencing to respect rate limits
      if (researchScope.includeTrends) {
        await this.researchMusicTrends(researchScope.queriesPerCategory);
      }
      
      if (researchScope.includeArtists) {
        await this.discoverEmergingArtists(researchScope.queriesPerCategory);
      }
      
      if (researchScope.includeGenres) {
        await this.analyzeGenreEvolution(researchScope.queriesPerCategory);
      }
      
      if (researchScope.includeIndustry) {
        await this.monitorIndustryDevelopments(researchScope.queriesPerCategory);
      }
      
      if (researchScope.includeCompetitive) {
        await this.competitiveAnalysis(researchScope.queriesPerCategory);
      }

      await this.generateMusicResearchReport();
      await this.updateRecommendationData();
      
      this.printStatistics();
      
      console.log('✅ Weekly music research completed successfully!');
      
    } catch (error) {
      console.error('❌ Music research failed:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Save partial results if any research was completed
      if (this.getTotalResearchCount() > 0) {
        console.log('💾 Saving partial research results...');
        await this.generateMusicResearchReport();
      }
      
      throw error;
    }
  }
  
  /**
   * Determine research scope based on budget state
   */
  determineResearchScope() {
    const state = this.budgetInfo.state;
    const percentage = this.budgetInfo.usagePercentage;
    
    // Full mode - under 50% budget usage
    if (percentage < 50) {
      return {
        mode: 'FULL',
        maxQueries: 25,
        queriesPerCategory: 5,
        includeTrends: true,
        includeArtists: true,
        includeGenres: true,
        includeIndustry: true,
        includeCompetitive: true
      };
    }
    
    // Reduced mode - 50-70% budget usage
    if (percentage < 70) {
      return {
        mode: 'REDUCED',
        maxQueries: 15,
        queriesPerCategory: 3,
        includeTrends: true,
        includeArtists: true,
        includeGenres: true,
        includeIndustry: false,
        includeCompetitive: false
      };
    }
    
    // Minimal mode - 70-90% budget usage
    if (percentage < 90) {
      return {
        mode: 'MINIMAL',
        maxQueries: 8,
        queriesPerCategory: 2,
        includeTrends: true,
        includeArtists: true,
        includeGenres: false,
        includeIndustry: false,
        includeCompetitive: false
      };
    }
    
    // Critical mode - over 90% budget usage
    return {
      mode: 'CRITICAL',
      maxQueries: 3,
      queriesPerCategory: 1,
      includeTrends: true,
      includeArtists: false,
      includeGenres: false,
      includeIndustry: false,
      includeCompetitive: false
    };
  }
  
  /**
   * Run degraded mode when budget is exhausted - use only cached data
   */
  async runDegradedMode() {
    console.log('🔄 Running in DEGRADED MODE - using cached data only\n');
    
    // Try to load previous research data
    try {
      const cachedReportPath = path.join('automation-artifacts', 'music-research-report.json');
      const cachedReport = JSON.parse(await fs.readFile(cachedReportPath, 'utf8'));
      
      console.log('📦 Found cached research report from:', cachedReport.reportInfo.generated);
      console.log('📊 Using cached data for current report\n');
      
      // Update timestamps but use cached content
      cachedReport.reportInfo.generated = new Date().toISOString();
      cachedReport.reportInfo.mode = 'DEGRADED - Budget Exhausted';
      cachedReport.reportInfo.note = 'This report uses cached data from previous research due to budget limits';
      
      // Save updated report
      const reportPath = path.join('automation-artifacts', 'music-research-report.json');
      await fs.writeFile(reportPath, JSON.stringify(cachedReport, null, 2));
      
      console.log('✅ Degraded mode report generated from cache');
      
    } catch (error) {
      console.error('❌ No cached data available for degraded mode:', error.message);
      
      // Create minimal report indicating budget exhaustion
      const minimalReport = {
        reportInfo: {
          title: 'Weekly Music Research Report - Budget Exhausted',
          generated: new Date().toISOString(),
          mode: 'DEGRADED',
          status: 'Budget limit reached - no new research performed'
        },
        message: 'Weekly budget for Perplexity API has been exhausted. Research will resume when budget resets.',
        budgetInfo: this.budgetInfo
      };
      
      const reportPath = path.join('automation-artifacts', 'music-research-report.json');
      await fs.writeFile(reportPath, JSON.stringify(minimalReport, null, 2));
    }
  }
  
  /**
   * Print execution statistics
   */
  printStatistics() {
    console.log('\n📊 EXECUTION STATISTICS');
    console.log('=' .repeat(50));
    console.log(`Total API Requests: ${this.stats.totalRequests}`);
    console.log(`Successful: ${this.stats.successfulRequests}`);
    console.log(`Failed: ${this.stats.failedRequests}`);
    console.log(`Cached Responses: ${this.stats.cachedResponses}`);
    console.log(`Budget Checks: ${this.stats.budgetChecks}`);
    console.log(`Circuit Breaker State: ${this.circuitBreaker.state}`);
    console.log(`Success Rate: ${((this.stats.successfulRequests / Math.max(this.stats.totalRequests, 1)) * 100).toFixed(1)}%`);
  }

  async researchMusicTrends(maxQueries = 4) {
    console.log('📈 Researching Current Music Trends...');

    const trendQueries = [
      'Latest music trends and viral songs in 2025, include streaming data and social media impact',
      'Emerging music genres and subgenres gaining popularity in 2025',
      'Current music production trends and audio engineering innovations',
      'Music streaming platform algorithm changes and their impact on discovery'
    ].slice(0, maxQueries);

    for (const query of trendQueries) {
      try {
        const research = await this.performPerplexityResearch(query, {
          category: 'trends',
          domains: ['spotify.com', 'billboard.com', 'musicindustryresearch.com', 'pitchfork.com']
        });

        this.researchResults.trends.push({
          query: query,
          findings: research.content,
          sources: research.citations,
          timestamp: new Date().toISOString(),
          relevanceScore: this.calculateRelevanceScore(research.content)
        });

        console.log(`  ✅ Trend research completed: ${query.substring(0, 50)}...`);
        
      } catch (error) {
        console.log(`  ❌ Trend research failed: ${error.message}`);
      }
    }
  }

  async discoverEmergingArtists(maxQueries = 4) {
    console.log('🎤 Discovering Emerging Artists...');

    const artistQueries = [
      'Breakout artists and new musicians gaining popularity in 2025, include streaming numbers',
      'Independent artists and labels making significant impact in music discovery',
      'Rising artists in electronic, indie, hip-hop, and alternative genres',
      'Artists with innovative approaches to music distribution and fan engagement'
    ].slice(0, maxQueries);

    for (const query of artistQueries) {
      try {
        const research = await this.performPerplexityResearch(query, {
          category: 'artists',
          domains: ['spotify.com', 'soundcloud.com', 'bandcamp.com', 'musicbusinessworldwide.com']
        });

        const artistData = this.extractArtistInformation(research.content);
        
        this.researchResults.artists.push({
          query: query,
          artists: artistData,
          sources: research.citations,
          timestamp: new Date().toISOString(),
          potentialForRecommendation: this.assessRecommendationPotential(artistData)
        });

        console.log(`  ✅ Artist discovery completed: Found ${artistData.length} potential artists`);
        
      } catch (error) {
        console.log(`  ❌ Artist discovery failed: ${error.message}`);
      }
    }
  }

  async analyzeGenreEvolution(maxGenres = 8) {
    console.log('🎼 Analyzing Genre Evolution...');

    const genres = ['electronic', 'indie', 'hip-hop', 'pop', 'rock', 'r&b', 'folk', 'jazz'].slice(0, maxGenres);
    
    for (const genre of genres) {
      try {
        const query = `${genre} music evolution and subgenres in 2025, include audio characteristics and cultural influences`;
        
        const research = await this.performPerplexityResearch(query, {
          category: 'genres',
          domains: ['allmusic.com', 'musictheory.org', 'everynoise.com']
        });

        const genreAnalysis = {
          genre: genre,
          evolution: research.content,
          subgenres: this.extractSubgenres(research.content),
          audioCharacteristics: this.extractAudioFeatures(research.content),
          sources: research.citations,
          timestamp: new Date().toISOString()
        };

        this.researchResults.genres.push(genreAnalysis);
        console.log(`  ✅ ${genre} genre analysis completed`);
        
      } catch (error) {
        console.log(`  ❌ ${genre} genre analysis failed: ${error.message}`);
      }
    }
  }

  async monitorIndustryDevelopments(maxQueries = 4) {
    console.log('🏢 Monitoring Music Industry Developments...');

    const industryQueries = [
      'Music streaming industry developments and algorithm changes in 2025',
      'AI and machine learning applications in music recommendation and discovery',
      'Music licensing, royalties, and artist compensation developments',
      'New music discovery platforms and technologies emerging in 2025'
    ].slice(0, maxQueries);

    for (const query of industryQueries) {
      try {
        const research = await this.performPerplexityResearch(query, {
          category: 'industry',
          domains: ['musicbusinessworldwide.com', 'midiaresearch.com', 'digitalmusicnews.com']
        });

        const industryInsight = {
          topic: query,
          findings: research.content,
          impact: this.assessIndustryImpact(research.content),
          actionItems: this.generateActionItems(research.content),
          sources: research.citations,
          timestamp: new Date().toISOString()
        };

        this.researchResults.industry.push(industryInsight);
        console.log(`  ✅ Industry research completed: ${query.substring(0, 40)}...`);
        
      } catch (error) {
        console.log(`  ❌ Industry research failed: ${error.message}`);
      }
    }
  }

  async competitiveAnalysis(maxPlatforms = 5) {
    console.log('🔍 Performing Competitive Analysis...');

    const platforms = ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Tidal'].slice(0, maxPlatforms);
    
    for (const platform of platforms) {
      try {
        const query = `${platform} music discovery features, recommendation algorithms, and user experience innovations in 2025`;
        
        const research = await this.performPerplexityResearch(query, {
          category: 'competitive',
          domains: ['techcrunch.com', 'theverge.com', 'musictech.net']
        });

        const competitiveInsight = {
          platform: platform,
          features: this.extractFeatures(research.content),
          strengths: this.identifyStrengths(research.content),
          opportunities: this.identifyOpportunities(research.content),
          sources: research.citations,
          timestamp: new Date().toISOString()
        };

        this.researchResults.insights.push(competitiveInsight);
        console.log(`  ✅ ${platform} competitive analysis completed`);
        
      } catch (error) {
        console.log(`  ❌ ${platform} competitive analysis failed: ${error.message}`);
      }
    }
  }

  async performPerplexityResearch(query, options = {}) {
    if (!this.perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }
    
    // Check circuit breaker
    if (!this.canMakeRequest()) {
      throw new Error('Circuit breaker is OPEN - too many recent failures');
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(query, options);
    if (this.researchCache.has(cacheKey)) {
      console.log('  📦 Using cached result');
      this.stats.cachedResponses++;
      return this.researchCache.get(cacheKey);
    }

    // Wait for rate limiter
    await this.waitForRateLimit();
    
    this.stats.totalRequests++;

    try {
      const axios = require('axios');
      
      // Use a more conservative model to save costs
      const model = this.budgetInfo.usagePercentage > 70 
        ? 'llama-3.1-sonar-small-128k-online'  // Cheaper model when budget is tight
        : 'llama-3.1-sonar-huge-128k-online';   // Full model when budget allows
      
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: model,
        messages: [
          {
            role: 'user',
            content: query
          }
        ],
        stream: false,
        return_citations: true,
        search_domain_filter: options.domains || [],
        max_tokens: this.budgetInfo.usagePercentage > 70 ? 1000 : 2000 // Reduce tokens when budget is tight
      }, {
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const result = {
        content: response.data.choices[0].message.content,
        citations: response.data.citations || [],
        timestamp: new Date().toISOString(),
        model: model
      };

      // Cache the result
      this.researchCache.set(cacheKey, result);
      
      // Record success
      this.recordSuccess();
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return result;
      
    } catch (error) {
      // Record failure
      this.recordFailure();
      
      // Check if this is a rate limit error
      if (error.response?.status === 429) {
        console.error('⚠️ Rate limit hit - increasing delay');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Check if this is a budget error
      if (error.response?.status === 402 || error.message.includes('quota')) {
        console.error('💰 Budget/quota exceeded');
        this.budgetInfo.canProceed = false;
      }
      
      console.error('Perplexity API error:', error.message);
      throw new Error(`Research failed: ${error.message}`);
    }
  }

  extractArtistInformation(content) {
    // Extract artist names and information from research content
    const artistPattern = /(?:artist|musician|band)[\s\w]*?([A-Z][a-zA-Z\s]+)(?:\s|,|\.)/gi;
    const matches = content.match(artistPattern) || [];
    
    return matches.slice(0, 10).map(match => ({
      name: match.trim(),
      context: this.getContextAroundMatch(content, match),
      potentialGenres: this.extractGenresFromContext(content, match)
    }));
  }

  extractSubgenres(content) {
    const subgenrePattern = /([\w-]+(?:\s[\w-]+)?)\s*(?:music|genre|style)/gi;
    const matches = content.match(subgenrePattern) || [];
    return [...new Set(matches.slice(0, 8))];
  }

  extractAudioFeatures(content) {
    const features = ['tempo', 'rhythm', 'melody', 'harmony', 'timbre', 'dynamics'];
    const extractedFeatures = {};
    
    features.forEach(feature => {
      const pattern = new RegExp(`${feature}[^.]*`, 'gi');
      const match = content.match(pattern);
      if (match) {
        extractedFeatures[feature] = match[0];
      }
    });
    
    return extractedFeatures;
  }

  calculateRelevanceScore(content) {
    // Simple relevance scoring based on music-related keywords
    const musicKeywords = ['music', 'artist', 'song', 'album', 'genre', 'streaming', 'playlist'];
    const words = content.toLowerCase().split(/\s+/);
    const relevantWords = words.filter(word => musicKeywords.some(keyword => word.includes(keyword)));
    
    return Math.min(relevantWords.length / words.length, 1.0);
  }

  assessRecommendationPotential(artists) {
    // Assess how suitable these artists are for recommendations
    return artists.filter(artist => 
      artist.context.toLowerCase().includes('popular') ||
      artist.context.toLowerCase().includes('trending') ||
      artist.context.toLowerCase().includes('streaming')
    ).length / Math.max(artists.length, 1);
  }

  assessIndustryImpact(content) {
    const impactKeywords = ['significant', 'major', 'important', 'breakthrough', 'revolutionary'];
    const hasHighImpact = impactKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    return hasHighImpact ? 'high' : 'medium';
  }

  generateActionItems(content) {
    // Generate actionable insights from industry research
    const actionItems = [];
    
    if (content.toLowerCase().includes('algorithm')) {
      actionItems.push('Review recommendation algorithm updates');
    }
    
    if (content.toLowerCase().includes('user experience')) {
      actionItems.push('Evaluate UX improvements for music discovery');
    }
    
    if (content.toLowerCase().includes('ai') || content.toLowerCase().includes('machine learning')) {
      actionItems.push('Investigate new AI/ML applications for music recommendations');
    }
    
    return actionItems;
  }

  extractFeatures(content) {
    const featurePattern = /(?:feature|capability|function)[\s\w]*?([a-zA-Z\s]+)(?:\s|,|\.)/gi;
    const matches = content.match(featurePattern) || [];
    return matches.slice(0, 5).map(match => match.trim());
  }

  identifyStrengths(content) {
    const strengthKeywords = ['strong', 'excellent', 'superior', 'advanced', 'innovative'];
    const sentences = content.split(/[.!?]/);
    
    return sentences.filter(sentence => 
      strengthKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
    ).slice(0, 3);
  }

  identifyOpportunities(content) {
    const opportunityKeywords = ['opportunity', 'potential', 'gap', 'lacking', 'could improve'];
    const sentences = content.split(/[.!?]/);
    
    return sentences.filter(sentence => 
      opportunityKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
    ).slice(0, 3);
  }

  async generateMusicResearchReport() {
    console.log('📊 Generating Music Research Report...');

    const report = {
      reportInfo: {
        title: 'Weekly Music Research Report',
        generated: new Date().toISOString(),
        period: this.getReportPeriod(),
        totalResearches: this.getTotalResearchCount()
      },
      executiveSummary: this.generateExecutiveSummary(),
      trends: {
        summary: `${this.researchResults.trends.length} trend analyses completed`,
        keyFindings: this.researchResults.trends.slice(0, 3),
        recommendations: this.generateTrendRecommendations()
      },
      artists: {
        summary: `${this.researchResults.artists.length} artist discovery sessions`,
        emergingArtists: this.getTopEmergingArtists(),
        recommendationPotential: this.calculateAverageRecommendationPotential()
      },
      genres: {
        summary: `${this.researchResults.genres.length} genres analyzed`,
        evolutionInsights: this.getGenreEvolutionInsights(),
        newSubgenres: this.getNewSubgenres()
      },
      industry: {
        summary: `${this.researchResults.industry.length} industry insights`,
        keyDevelopments: this.getKeyIndustryDevelopments(),
        actionItems: this.getAllActionItems()
      },
      competitive: {
        summary: `${this.researchResults.insights.length} platforms analyzed`,
        opportunities: this.getCompetitiveOpportunities(),
        threats: this.getCompetitiveThreats()
      },
      recommendations: this.generateOverallRecommendations()
    };

    // Save detailed report
    const reportPath = path.join('automation-artifacts', 'music-research-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate summary for display
    this.displayReportSummary(report);
    
    console.log(`📄 Full report saved to: ${reportPath}`);
  }

  generateExecutiveSummary() {
    const totalFindings = this.getTotalResearchCount();
    const avgRelevance = this.calculateAverageRelevanceScore();
    
    return `This week's music research covered ${totalFindings} different areas with an average relevance score of ${(avgRelevance * 100).toFixed(1)}%. Key focus areas included emerging trends, artist discovery, genre evolution, and competitive analysis.`;
  }

  generateTrendRecommendations() {
    const trends = this.researchResults.trends;
    const recommendations = [];
    
    trends.forEach(trend => {
      if (trend.relevanceScore > 0.7) {
        recommendations.push(`Consider integrating insights from: ${trend.query.substring(0, 60)}...`);
      }
    });
    
    return recommendations.slice(0, 3);
  }

  async updateRecommendationData() {
    console.log('🔄 Updating Recommendation Algorithm Data...');

    const updateData = {
      trends: this.researchResults.trends.filter(t => t.relevanceScore > 0.6),
      artists: this.getHighPotentialArtists(),
      genres: this.researchResults.genres,
      lastUpdated: new Date().toISOString()
    };

    // Save update data for recommendation system
    const updatePath = path.join('automation-artifacts', 'recommendation-updates.json');
    await fs.writeFile(updatePath, JSON.stringify(updateData, null, 2));

    console.log(`  ✅ Recommendation data updated: ${updatePath}`);
    console.log(`  📈 ${updateData.trends.length} trend insights available for integration`);
    console.log(`  🎤 ${updateData.artists.length} high-potential artists identified`);
  }

  displayReportSummary(report) {
    console.log('\n📋 MUSIC RESEARCH SUMMARY');
    console.log('=' .repeat(50));
    console.log(`📅 Period: ${report.reportInfo.period}`);
    console.log(`🔬 Total Research Items: ${report.reportInfo.totalResearches}`);
    console.log(`📈 Trends Analyzed: ${this.researchResults.trends.length}`);
    console.log(`🎤 Artists Discovered: ${this.researchResults.artists.length}`);
    console.log(`🎼 Genres Studied: ${this.researchResults.genres.length}`);
    console.log(`🏢 Industry Insights: ${this.researchResults.industry.length}`);
    console.log(`🔍 Competitive Analysis: ${this.researchResults.insights.length}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }

  // Helper methods
  generateCacheKey(query, options) {
    return `${query}_${JSON.stringify(options)}`.replace(/\s+/g, '_').toLowerCase();
  }

  getContextAroundMatch(content, match) {
    const index = content.indexOf(match);
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + match.length + 50);
    return content.substring(start, end);
  }

  extractGenresFromContext(content, artistMatch) {
    const context = this.getContextAroundMatch(content, artistMatch);
    const genres = ['rock', 'pop', 'hip-hop', 'electronic', 'indie', 'folk', 'jazz', 'classical'];
    return genres.filter(genre => context.toLowerCase().includes(genre));
  }

  getReportPeriod() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return `${weekAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`;
  }

  getTotalResearchCount() {
    return this.researchResults.trends.length + 
           this.researchResults.artists.length + 
           this.researchResults.genres.length + 
           this.researchResults.industry.length + 
           this.researchResults.insights.length;
  }

  calculateAverageRelevanceScore() {
    const allScores = this.researchResults.trends.map(t => t.relevanceScore);
    return allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  }

  getTopEmergingArtists() {
    return this.researchResults.artists
      .flatMap(a => a.artists)
      .filter(artist => artist.potentialGenres.length > 0)
      .slice(0, 10);
  }

  calculateAverageRecommendationPotential() {
    const potentials = this.researchResults.artists.map(a => a.potentialForRecommendation);
    return potentials.length > 0 ? potentials.reduce((a, b) => a + b, 0) / potentials.length : 0;
  }

  getGenreEvolutionInsights() {
    return this.researchResults.genres.map(g => ({
      genre: g.genre,
      subgenres: g.subgenres.length,
      evolution: g.evolution.substring(0, 100) + '...'
    }));
  }

  getNewSubgenres() {
    return this.researchResults.genres.flatMap(g => g.subgenres).slice(0, 10);
  }

  getKeyIndustryDevelopments() {
    return this.researchResults.industry
      .filter(i => i.impact === 'high')
      .map(i => i.topic);
  }

  getAllActionItems() {
    return this.researchResults.industry.flatMap(i => i.actionItems);
  }

  getCompetitiveOpportunities() {
    return this.researchResults.insights.flatMap(i => i.opportunities).slice(0, 5);
  }

  getCompetitiveThreats() {
    return this.researchResults.insights.flatMap(i => i.strengths).slice(0, 5);
  }

  getHighPotentialArtists() {
    return this.researchResults.artists
      .filter(a => a.potentialForRecommendation > 0.5)
      .flatMap(a => a.artists);
  }

  generateOverallRecommendations() {
    const recommendations = [];
    
    // Based on trends
    if (this.researchResults.trends.length > 0) {
      recommendations.push('Update recommendation algorithms with latest music trends');
    }
    
    // Based on artists
    if (this.getHighPotentialArtists().length > 5) {
      recommendations.push('Integrate emerging artists into discovery playlists');
    }
    
    // Based on industry insights
    if (this.getAllActionItems().length > 0) {
      recommendations.push('Implement industry best practices for user engagement');
    }
    
    return recommendations;
  }
}

// CLI interface
if (require.main === module) {
  const automator = new MusicResearchAutomator();
  automator.runWeeklyMusicResearch().catch(console.error);
}

module.exports = MusicResearchAutomator;