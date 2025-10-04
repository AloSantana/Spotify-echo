#!/usr/bin/env node

/**
 * Bedrock Model Switcher Demo
 * 
 * Demonstrates /use command functionality for switching between Claude models
 * 
 * Usage:
 *   node scripts/demo-bedrock-model-switcher.js
 */

const bedrockModelSwitcher = require('../src/chat/bedrock-model-switcher');

async function demo() {
    console.log('🚀 Bedrock Model Switcher Demo');
    console.log('='.repeat(80));
    console.log('');

    // Test 1: List available models
    console.log('1️⃣  Listing available models...');
    console.log('Command: /model list');
    console.log('');
    
    const listResult = await bedrockModelSwitcher.processCommand('model', ['list']);
    console.log(bedrockModelSwitcher.formatResponse(listResult));
    console.log('');

    // Test 2: Get current status
    console.log('2️⃣  Getting current status...');
    console.log('Command: /model status');
    console.log('');
    
    const statusResult = bedrockModelSwitcher.processCommand('model', ['status']);
    console.log(bedrockModelSwitcher.formatResponse(statusResult));
    console.log('');

    // Test 3: Switch to Claude Sonnet 4.5
    console.log('3️⃣  Switching to Claude Sonnet 4.5...');
    console.log('Command: /use claude-sonnet-4-5');
    console.log('');
    
    try {
        const switchResult1 = await bedrockModelSwitcher.processCommand('use', ['claude-sonnet-4-5']);
        console.log(bedrockModelSwitcher.formatResponse(switchResult1));
    } catch (error) {
        console.log(`Note: ${error.message}`);
        console.log('This is expected if Bedrock is not enabled or credentials are not configured.');
    }
    console.log('');

    // Test 4: Switch to Claude Opus 4.1
    console.log('4️⃣  Switching to Claude Opus 4.1...');
    console.log('Command: /use claude-3-opus');
    console.log('');
    
    try {
        const switchResult2 = await bedrockModelSwitcher.processCommand('use', ['claude-3-opus']);
        console.log(bedrockModelSwitcher.formatResponse(switchResult2));
    } catch (error) {
        console.log(`Note: ${error.message}`);
        console.log('This is expected if Bedrock is not enabled or credentials are not configured.');
    }
    console.log('');

    // Test 5: Try invalid model
    console.log('5️⃣  Testing error handling...');
    console.log('Command: /use invalid-model');
    console.log('');
    
    const errorResult = await bedrockModelSwitcher.processCommand('use', ['invalid-model']);
    console.log(bedrockModelSwitcher.formatResponse(errorResult));
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ Demo complete!');
    console.log('');
    console.log('💡 To enable Bedrock:');
    console.log('   1. Set BEDROCK_ENABLED=true');
    console.log('   2. Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    console.log('   3. Ensure IAM permissions for bedrock:InvokeModel');
}

// Run demo
if (require.main === module) {
    demo().catch(error => {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    });
}

module.exports = demo;
