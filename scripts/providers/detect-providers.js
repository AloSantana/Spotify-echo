#!/usr/bin/env node

/**
 * Provider Detection & Testing Script
 * Auto-detects and tests available LLM providers
 * Outputs: provider-status.json, provider-latencies.json
 */

const fs = require('fs');
const path = require('path');

class ProviderDetector {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        envVar: 'OPENAI_API_KEY',
        testEndpoint: 'https://api.openai.com/v1/models',
        available: false,
        tested: false,
        error: null,
        latency: null
      },
      anthropic: {
        name: 'Anthropic',
        envVar: 'ANTHROPIC_API_KEY',
        testEndpoint: 'https://api.anthropic.com/v1/messages',
        available: false,
        tested: false,
        error: null,
        latency: null
      },
      gemini: {
        name: 'Google Gemini',
        envVar: 'GEMINI_API_KEY',
        testEndpoint: 'https://generativelanguage.googleapis.com/v1/models',
        available: false,
        tested: false,
        error: null,
        latency: null
      },
      groq: {
        name: 'Groq',
        envVar: 'GROQ_API_KEY', 
        testEndpoint: 'https://api.groq.com/openai/v1/models',
        available: false,
        tested: false,
        error: null,
        latency: null
      },
      perplexity: {
        name: 'Perplexity',
        envVar: 'PERPLEXITY_API_KEY',
        testEndpoint: 'https://api.perplexity.ai/chat/completions',
        available: false,
        tested: false,
        error: null,
        latency: null
      },
      vertexai: {
        name: 'Vertex AI',
        envVar: 'GCP_PROJECT_ID',
        testEndpoint: null, // Uses GCP SDK
        available: false,
        tested: false,
        error: null,
        latency: null
      },
      xai: {
        name: 'xAI (Grok)',
        envVar: 'XAI_API_KEY',
        testEndpoint: 'https://api.x.ai/v1/models',
        available: false,
        tested: false,
        error: null,
        latency: null
      }
    };
    
    this.placeholderPatterns = [
      /^your_/i,
      /^changeme/i,
      /^replace_me/i,
      /^xxx+$/i,
      /^placeholder/i,
      /^test[_-]?value/i,
      /^sample[_-]?/i
    ];
  }

  isPlaceholder(value) {
    if (!value || typeof value !== 'string') return true;
    return this.placeholderPatterns.some(pattern => pattern.test(value));
  }

  async detectProviders() {
    console.log('🔍 Detecting available LLM providers...\n');

    // Load environment
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }

    // Check provider availability
    for (const [key, provider] of Object.entries(this.providers)) {
      const envValue = process.env[provider.envVar];
      
      if (envValue && !this.isPlaceholder(envValue)) {
        provider.available = true;
        console.log(`✅ ${provider.name}: Available`);
      } else {
        console.log(`❌ ${provider.name}: Not available (${provider.envVar} missing or placeholder)`);
      }
    }

    return this.providers;
  }

  async testProvider(key, provider) {
    if (!provider.available) {
      provider.tested = true;
      provider.error = 'Provider not available';
      return;
    }

    console.log(`🧪 Testing ${provider.name}...`);
    const startTime = Date.now();

    try {
      if (key === 'vertexai') {
        await this.testVertexAI(provider);
      } else if (key === 'anthropic') {
        await this.testAnthropic(provider);
      } else if (key === 'gemini') {
        await this.testGemini(provider);
      } else {
        await this.testGenericProvider(provider);
      }
      
      provider.latency = Date.now() - startTime;
      provider.tested = true;
      console.log(`  ✅ ${provider.name}: Responding (${provider.latency}ms)`);
    } catch (error) {
      provider.latency = Date.now() - startTime;
      provider.tested = true;
      provider.error = error.message;
      console.log(`  ❌ ${provider.name}: Failed - ${error.message}`);
    }
  }

  async testGenericProvider(provider) {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(provider.testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env[provider.envVar]}`,
        'User-Agent': 'EchoTune-AI-Test/1.0'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Just check if we get a valid response, don't need to parse
    await response.text();
  }

  async testAnthropic(provider) {
    const fetch = (await import('node-fetch')).default;
    
    // Test with a minimal request to Claude
    const response = await fetch(provider.testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env[provider.envVar],
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      timeout: 15000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  async testGemini(provider) {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${provider.testEndpoint}?key=${process.env[provider.envVar]}`, {
      method: 'GET',
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async testVertexAI(provider) {
    try {
      // Check if GCP credentials are available
      const projectId = process.env.GCP_PROJECT_ID;
      if (!projectId) {
        throw new Error('GCP_PROJECT_ID not configured');
      }

      // Try to load Google Auth Library
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });

      // Test authentication
      await auth.getAccessToken();
      
    } catch (error) {
      throw new Error(`Vertex AI setup error: ${error.message}`);
    }
  }

  async testProviders() {
    console.log('\n🧪 Testing provider connectivity...\n');

    const testPromises = Object.entries(this.providers).map(([key, provider]) => 
      this.testProvider(key, provider)
    );

    await Promise.allSettled(testPromises);
  }

  generateReports() {
    console.log('\n📊 Provider Detection Summary:');
    console.log('='.repeat(50));

    const statusReport = {
      timestamp: new Date().toISOString(),
      providersTotal: Object.keys(this.providers).length,
      providersAvailable: 0,
      providersTested: 0,
      providersWorking: 0,
      providers: {}
    };

    const latencyReport = {
      timestamp: new Date().toISOString(),
      latencies: {},
      stats: {
        fastest: null,
        slowest: null,
        average: 0,
        median: 0
      }
    };

    const latencies = [];

    for (const [key, provider] of Object.entries(this.providers)) {
      statusReport.providers[key] = {
        name: provider.name,
        available: provider.available,
        tested: provider.tested,
        working: provider.tested && !provider.error,
        error: provider.error,
        latency: provider.latency
      };

      if (provider.available) statusReport.providersAvailable++;
      if (provider.tested) statusReport.providersTested++;
      if (provider.tested && !provider.error) statusReport.providersWorking++;

      if (provider.latency !== null) {
        latencyReport.latencies[key] = {
          name: provider.name,
          latency: provider.latency,
          working: !provider.error
        };
        latencies.push(provider.latency);
      }

      // Console output
      const status = provider.available ? 
        (provider.tested ? 
          (provider.error ? `❌ Failed: ${provider.error}` : `✅ Working (${provider.latency}ms)`) 
          : '⏳ Not tested'
        ) : '❌ Not available';
      console.log(`  ${provider.name}: ${status}`);
    }

    // Calculate latency stats
    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      latencyReport.stats.fastest = Math.min(...latencies);
      latencyReport.stats.slowest = Math.max(...latencies);
      latencyReport.stats.average = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
      latencyReport.stats.median = latencies[Math.floor(latencies.length / 2)];
    }

    console.log(`\n📈 Summary: ${statusReport.providersWorking}/${statusReport.providersAvailable} available providers working`);
    if (latencies.length > 0) {
      console.log(`⚡ Latency: ${latencyReport.stats.fastest}ms (fastest) | ${latencyReport.stats.average}ms (avg) | ${latencyReport.stats.slowest}ms (slowest)`);
    }
    console.log('='.repeat(50));

    return { statusReport, latencyReport };
  }

  writeReports(statusReport, latencyReport) {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Write provider status report
      const statusPath = path.join(reportsDir, 'provider-status.json');
      fs.writeFileSync(statusPath, JSON.stringify(statusReport, null, 2));

      // Write provider latency report
      const latencyPath = path.join(reportsDir, 'provider-latencies.json');
      fs.writeFileSync(latencyPath, JSON.stringify(latencyReport, null, 2));

      console.log('\n📄 Reports written:');
      console.log(`  Status: ${statusPath}`);
      console.log(`  Latencies: ${latencyPath}`);

    } catch (error) {
      console.error('❌ Failed to write reports:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      await this.detectProviders();
      await this.testProviders();
      
      const { statusReport, latencyReport } = this.generateReports();
      this.writeReports(statusReport, latencyReport);

      // Exit with success if at least one provider is working
      if (statusReport.providersWorking > 0) {
        console.log('\n✅ Provider detection completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️ No working providers found, but this is not a critical failure');
        process.exit(0); // Don't fail the build for missing providers
      }

    } catch (error) {
      console.error('💥 Provider detection failed:', error.message);
      
      // Write error report
      const errorReport = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        providers: this.providers
      };

      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(reportsDir, 'provider-status.json'), 
        JSON.stringify(errorReport, null, 2)
      );

      process.exit(1);
    }
  }
}

// Run detection if called directly
if (require.main === module) {
  const detector = new ProviderDetector();
  detector.run();
}

module.exports = ProviderDetector;