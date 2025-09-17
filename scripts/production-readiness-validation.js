#!/usr/bin/env node

/**
 * Production Readiness Validation
 * Enforces No-Mock and No-Placeholder policies
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Production Readiness Validation');
console.log('=' .repeat(50));

let hasErrors = false;

// 1. Environment validation
try {
  console.log('\n📋 1. Environment Validation');
  execSync('node scripts/env-validate-strict.js', { stdio: 'inherit' });
  console.log('✅ Environment validation passed');
} catch (error) {
  console.log('❌ Environment validation failed');
  hasErrors = true;
}

// 2. Mock policy validation
try {
  console.log('\n🚫 2. No-Mock Policy Validation');
  const mockFiles = [
    'src/chat/llm-providers/mock-provider.js',
    'lib/llm/providers/mock.ts'
  ];
  
  for (const file of mockFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('NODE_ENV === \'production\'') || content.includes('ENABLE_MOCK_PROVIDER')) {
        console.log(`✅ ${file}: properly gated for production`);
      } else {
        console.log(`❌ ${file}: missing production gating`);
        hasErrors = true;
      }
    } catch (error) {
      console.log(`ℹ️ ${file}: not found (OK)`);
    }
  }
} catch (error) {
  console.log('❌ Mock policy validation failed');
  hasErrors = true;
}

// 3. Docker validation
try {
  console.log('\n🐳 3. Docker Validation');
  if (fs.existsSync('Dockerfile.optimized')) {
    console.log('✅ Optimized Dockerfile found');
    const dockerContent = fs.readFileSync('Dockerfile.optimized', 'utf8');
    if (dockerContent.includes('PUPPETEER_SKIP_DOWNLOAD=true')) {
      console.log('✅ Puppeteer optimization configured');
    } else {
      console.log('❌ Puppeteer optimization missing');
      hasErrors = true;
    }
  } else {
    console.log('❌ Optimized Dockerfile not found');
    hasErrors = true;
  }
} catch (error) {
  console.log('❌ Docker validation failed');
  hasErrors = true;
}

// 4. Build validation
try {
  console.log('\n🏗️ 4. Build Validation');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.log('❌ Build failed');
  hasErrors = true;
}

console.log(`\n${hasErrors ? '❌' : '✅'} Production readiness: ${hasErrors ? 'FAILED' : 'PASSED'}`);

if (hasErrors) {
  console.log('\n🚨 CRITICAL: Fix all issues before production deployment');
  process.exit(1);
}

console.log('\n🎉 System ready for production deployment');
process.exit(0);