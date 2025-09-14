#!/usr/bin/env node

/**
 * LLM Provider Validation Script
 * Validates all configured LLM providers and reports their status
 */

const providerRegistry = require('../src/llm/providers');

async function validateLLMProviders() {
  console.log('🔍 Validating LLM Providers...\n');

  try {
    // Initialize provider registry
    const initialized = await providerRegistry.initialize();
    
    if (!initialized) {
      console.error('❌ Failed to initialize provider registry');
      process.exit(1);
    }

    // Get provider status
    const status = providerRegistry.getProviderStatus();
    
    console.log('📊 Provider Registry Status:');
    console.log(`   Initialized: ${status.initialized ? '✅' : '❌'}`);
    console.log(`   Default Provider: ${status.defaultProvider}`);
    console.log(`   Total Providers: ${status.totalProviders}`);
    console.log(`   Available: ${status.availableProviders.length}`);
    console.log(`   Unavailable: ${status.unavailableProviders.length}\n`);

    // Validate each available provider
    const validationResults = {};
    let allValid = true;

    for (const providerInfo of status.availableProviders) {
      console.log(`🔍 Validating ${providerInfo.name}...`);
      
      const validation = await providerRegistry.validateProvider(providerInfo.name);
      validationResults[providerInfo.name] = validation;
      
      if (validation.valid) {
        console.log(`   ✅ ${providerInfo.name}: ${validation.response}`);
        console.log(`   📈 Telemetry: ${validation.telemetry.successRate} success rate, ${validation.telemetry.averageLatency}ms avg latency`);
      } else {
        console.log(`   ❌ ${providerInfo.name}: ${validation.error}`);
        allValid = false;
      }
      console.log();
    }

    // Report unavailable providers
    if (status.unavailableProviders.length > 0) {
      console.log('⚠️  Unavailable Providers:');
      for (const providerInfo of status.unavailableProviders) {
        console.log(`   ❌ ${providerInfo.name}: Not available (missing API key or initialization failed)`);
      }
      console.log();
    }

    // Test provider switching
    console.log('🔄 Testing Provider Switching...');
    for (const providerInfo of status.availableProviders) {
      try {
        const response = await providerRegistry.generate(
          [{ role: 'user', content: 'Say "Provider switch test successful"' }],
          { provider: providerInfo.name, maxTokens: 20 }
        );
        console.log(`   ✅ ${providerInfo.name}: ${response.content.trim()}`);
      } catch (error) {
        console.log(`   ❌ ${providerInfo.name}: ${error.message}`);
        allValid = false;
      }
    }

    // Test fallback mechanism
    console.log('\n🔄 Testing Fallback Mechanism...');
    try {
      const response = await providerRegistry.generate(
        [{ role: 'user', content: 'Say "Fallback test successful"' }],
        { provider: 'nonexistent', maxTokens: 20 }
      );
      console.log(`   ✅ Fallback successful: ${response.content.trim()}`);
    } catch (error) {
      console.log(`   ❌ Fallback failed: ${error.message}`);
      allValid = false;
    }

    // Summary
    console.log('\n📋 Validation Summary:');
    console.log(`   Total providers: ${status.totalProviders}`);
    console.log(`   Available: ${status.availableProviders.length}`);
    console.log(`   Valid: ${Object.values(validationResults).filter(r => r.valid).length}`);
    console.log(`   Overall status: ${allValid ? '✅ All systems operational' : '⚠️ Some issues detected'}`);

    // Generate validation report
    const report = {
      timestamp: new Date().toISOString(),
      registry: status,
      validations: validationResults,
      summary: {
        totalProviders: status.totalProviders,
        availableProviders: status.availableProviders.length,
        validProviders: Object.values(validationResults).filter(r => r.valid).length,
        allValid
      }
    };

    // Save report to file
    const fs = require('fs');
    const reportPath = 'reports/llm-provider-validation.json';
    
    // Ensure reports directory exists
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Validation report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(allValid ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// CLI options handling
const args = process.argv.slice(2);
const options = {
  provider: null,
  verbose: false,
  skipValidation: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--provider':
      options.provider = args[++i];
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--skip-validation':
      options.skipValidation = true;
      break;
    case '--help':
      console.log(`
🔍 LLM Provider Validation Script

Usage: node scripts/validate-llm-providers.js [options]

Options:
  --provider <name>     Validate specific provider only
  --verbose             Enable verbose output
  --skip-validation     Skip actual API validation (status only)
  --help               Show this help message

Environment Variables:
  OPENAI_API_KEY       OpenAI API key
  OPENROUTER_API_KEY   OpenRouter API key  
  GEMINI_API_KEY       Google Gemini API key
  DEFAULT_LLM_PROVIDER Default provider name (openai|openrouter|gemini)

Examples:
  node scripts/validate-llm-providers.js
  node scripts/validate-llm-providers.js --provider openai
  node scripts/validate-llm-providers.js --verbose
      `);
      process.exit(0);
      break;
  }
}

// Run validation
if (require.main === module) {
  validateLLMProviders().catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = { validateLLMProviders };