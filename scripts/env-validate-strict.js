#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const requiredVars = [
  'MONGODB_URI',
  'SPOTIFY_CLIENT_ID', 
  'SPOTIFY_CLIENT_SECRET',
  'JWT_SECRET'
];

const placeholderPatterns = [
  /your_[a-zA-Z_]+/gi,
  /changeme/gi,
  /replace_me/gi,
  /xxx[x]*/gi,
  /placeholder/gi
];

console.log('🔍 Environment Validation');
console.log('=' .repeat(40));

let hasErrors = false;

// Check required variables
for (const envVar of requiredVars) {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ Missing required: ${envVar}`);
    hasErrors = true;
  } else if (placeholderPatterns.some(pattern => pattern.test(value))) {
    console.log(`❌ Placeholder detected in ${envVar}: ${value}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${envVar}: configured`);
  }
}

// Check for placeholder patterns in .env file
try {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  let placeholdersFound = [];
  for (const pattern of placeholderPatterns) {
    const matches = envContent.match(pattern);
    if (matches) {
      placeholdersFound = placeholdersFound.concat(matches);
    }
  }
  
  if (placeholdersFound.length > 0) {
    console.log(`❌ Placeholders in .env: ${placeholdersFound.join(', ')}`);
    hasErrors = true;
  }
} catch (error) {
  console.log('⚠️ Could not read .env file');
}

console.log(`\n${hasErrors ? '❌' : '✅'} Environment validation ${hasErrors ? 'FAILED' : 'PASSED'}`);

if (hasErrors) {
  console.log('\n🚨 CRITICAL: Fix environment issues before proceeding');
  process.exit(1);
}

console.log('\n✨ Environment ready for production');
process.exit(0);