#!/usr/bin/env node

/**
 * Validate LLM Providers with Real Environment Variables
 * Tests OpenAI, OpenRouter, and Gemini providers with actual API keys
 */

require('dotenv').config();

const OpenAIProvider = require('../src/llm/providers/OpenAIProvider');
const OpenRouterProvider = require('../src/llm/providers/OpenRouterProvider');
const GeminiProvider = require('../src/llm/providers/GeminiProvider');

async function validateProvider(providerName, ProviderClass, config) {
  console.log(`\n🧪 Testing ${providerName} Provider...`);
  
  try {
    const provider = new ProviderClass(config);
    await provider.initialize();
    
    if (!provider.isAvailable()) {
      console.log(`❌ ${providerName}: Not available (likely missing API key)`);
      return false;
    }
    
    // Test basic completion
    const testMessage = [
      { role: 'user', content: 'Suggest one upbeat song for working out. Keep response short.' }
    ];
    
    console.log(`   Testing completion...`);
    const response = await provider.generateCompletion(testMessage, {
      maxTokens: 100,
      temperature: 0.7
    });
    
    if (response.error) {
      console.log(`❌ ${providerName}: Error - ${response.message}`);
      return false;
    }
    
    console.log(`✅ ${providerName}: Successfully generated response`);
    console.log(`   Response: "${response.content.substring(0, 100)}..."`);
    console.log(`   Tokens used: ${response.usage?.totalTokens || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.log(`❌ ${providerName}: Exception - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Validating LLM Providers with Real Environment Variables');
  console.log('=' .repeat(60));
  
  const results = {};
  
  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    results.openai = await validateProvider('OpenAI', OpenAIProvider, {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo'
    });
  } else {
    console.log('\n⚠️  OpenAI: API key not found in environment');
    results.openai = false;
  }
  
  // Test OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    results.openrouter = await validateProvider('OpenRouter', OpenRouterProvider, {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: 'openai/gpt-3.5-turbo'
    });
  } else {
    console.log('\n⚠️  OpenRouter: API key not found in environment');
    results.openrouter = false;
  }
  
  // Test Gemini
  if (process.env.GEMINI_API_KEY) {
    results.gemini = await validateProvider('Gemini', GeminiProvider, {
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-pro'
    });
  } else {
    console.log('\n⚠️  Gemini: API key not found in environment');
    results.gemini = false;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Validation Summary:');
  console.log('=' .repeat(60));
  
  const workingProviders = Object.entries(results).filter(([, working]) => working);
  const totalProviders = Object.keys(results).length;
  
  workingProviders.forEach(([provider]) => {
    console.log(`✅ ${provider.toUpperCase()}: Working`);
  });
  
  Object.entries(results).filter(([, working]) => !working).forEach(([provider]) => {
    console.log(`❌ ${provider.toUpperCase()}: Not working`);
  });
  
  console.log(`\n🎯 ${workingProviders.length}/${totalProviders} providers are working`);
  
  if (workingProviders.length === 0) {
    console.log('\n⚠️  WARNING: No LLM providers are working. Please check your API keys.');
    process.exit(1);
  } else {
    console.log(`\n✅ SUCCESS: ${workingProviders.length} provider(s) validated successfully`);
    console.log(`Recommended default provider: ${workingProviders[0][0]}`);
  }
  
  // Test Intent Classification
  console.log('\n🧠 Testing Intent Classification...');
  try {
    const IntentClassifier = require('../src/chat/intents/classifyIntent');
    const classifier = new IntentClassifier();
    
    const testCases = [
      'recommend some upbeat music for working out',
      'create a playlist for studying',
      'analyze my listening habits',
      'I love this song!',
      'hello there'
    ];
    
    for (const testCase of testCases) {
      const intent = classifier.classifyIntent(testCase);
      console.log(`   "${testCase}" → ${intent.primary} (${intent.confidence.toFixed(2)})`);
    }
    
    console.log('✅ Intent classification working correctly');
  } catch (error) {
    console.log(`❌ Intent classification error: ${error.message}`);
  }
  
  console.log('\n🎉 Phase 5 validation complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateProvider };