#!/usr/bin/env node

/**
 * Test script for reliable-install-agent
 * Validates that the agent can handle various scenarios
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const envBackupPath = path.join(projectRoot, '.env.backup');

console.log('🧪 Testing Reliable Install Agent\n');

// Backup current .env if it exists
if (fs.existsSync(envPath)) {
  console.log('📋 Backing up current .env');
  fs.copyFileSync(envPath, envBackupPath);
}

try {
  // Test 1: Empty POSTGRES_URL
  console.log('\n━'.repeat(40));
  console.log('Test 1: Empty POSTGRES_URL detection');
  console.log('━'.repeat(40));
  
  const envContent = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');
  fs.writeFileSync(envPath, envContent);
  
  // Make POSTGRES_URL empty
  let content = fs.readFileSync(envPath, 'utf8');
  content = content.replace(/^POSTGRES_URL=.*$/m, 'POSTGRES_URL=');
  fs.writeFileSync(envPath, content);
  
  console.log('✅ Created .env with empty POSTGRES_URL');
  
  // Run the agent's fix strategy directly
  const { executeApplicableStrategies } = require('./agent-helpers/fix-strategies');
  
  executeApplicableStrategies('env_missing', {
    projectRoot,
    logger: console
  }).then(results => {
    console.log('\n📊 Fix Results:', results);
    
    // Check if POSTGRES_URL was fixed
    const updatedContent = fs.readFileSync(envPath, 'utf8');
    const match = updatedContent.match(/^POSTGRES_URL=(.+)$/m);
    
    if (match && match[1] && match[1].trim()) {
      console.log('✅ Test 1 PASSED: POSTGRES_URL was set to:', match[1].trim());
    } else {
      console.log('❌ Test 1 FAILED: POSTGRES_URL is still empty');
    }
  });
  
  // Test 2: Error analyzer
  console.log('\n━'.repeat(40));
  console.log('Test 2: Error Analyzer');
  console.log('━'.repeat(40));
  
  const { analyzeError } = require('./agent-helpers/error-analyzer');
  
  const testErrors = [
    {
      name: 'Prisma Error',
      text: 'Failed to load config file. Error: PrismaConfigEnvError: Missing required environment variable: POSTGRES_URL',
      expectedCategory: 'database_connection'
    },
    {
      name: 'Module Not Found',
      text: 'Error: Cannot find module \'express\'',
      expectedCategory: 'module_not_found'
    },
    {
      name: 'Port in Use',
      text: 'Error: listen EADDRINUSE: address already in use :::3000',
      expectedCategory: 'port_in_use'
    }
  ];
  
  testErrors.forEach(test => {
    const analysis = analyzeError(test.text);
    const passed = analysis.category === test.expectedCategory;
    console.log(`${passed ? '✅' : '❌'} ${test.name}: ${analysis.category} ${passed ? '(expected)' : `(expected: ${test.expectedCategory})`}`);
  });
  
  // Test 3: Memory store
  console.log('\n━'.repeat(40));
  console.log('Test 3: Memory Store');
  console.log('━'.repeat(40));
  
  const MemoryStore = require('./agent-helpers/memory-store');
  const store = new MemoryStore('.agent-memory-test');
  
  store.storeErrorPattern({
    category: 'test_error',
    severity: 'high',
    errorSnippet: 'Test error snippet',
    command: 'test command'
  });
  
  store.storeFix({
    errorCategory: 'test_error',
    strategy: 'test_strategy',
    success: true,
    message: 'Test fix applied'
  });
  
  const stats = store.getStatistics();
  console.log('✅ Memory store operations successful');
  console.log(`   - Errors recorded: ${stats.totalErrors}`);
  console.log(`   - Fixes attempted: ${stats.totalFixes}`);
  
  // Cleanup test memory
  fs.rmSync(path.join(projectRoot, '.agent-memory-test'), { recursive: true, force: true });
  
  console.log('\n━'.repeat(40));
  console.log('✅ All Tests Complete');
  console.log('━'.repeat(40));
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Restore original .env
  if (fs.existsSync(envBackupPath)) {
    console.log('\n📋 Restoring original .env');
    fs.copyFileSync(envBackupPath, envPath);
    fs.unlinkSync(envBackupPath);
  }
}
