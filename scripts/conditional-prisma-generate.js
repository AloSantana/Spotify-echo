#!/usr/bin/env node

/**
 * Conditional Prisma Generate
 * Only runs prisma generate if POSTGRES_URL is configured
 * This prevents postinstall from failing when env is not yet set up
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const hasPostgresUrl = !!process.env.POSTGRES_URL;

if (hasPostgresUrl) {
  console.log('✅ POSTGRES_URL found - generating Prisma client...');
  try {
    execSync('prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Prisma client generated successfully!');
  } catch (error) {
    console.error('❌ Failed to generate Prisma client:', error.message);
    console.error('\n💡 You can run "npm run db:generate" manually after setting up POSTGRES_URL\n');
    // Don't fail postinstall - let app handle it at startup
  }
} else {
  console.log('\n📋 Skipping Prisma client generation (POSTGRES_URL not set)');
  console.log('   To generate Prisma client later:');
  console.log('   1. Copy .env.example to .env');
  console.log('   2. Set POSTGRES_URL in .env');
  console.log('   3. Run: npm run db:generate');
  console.log('   4. Run: npm run db:push (to sync schema)\n');
}
