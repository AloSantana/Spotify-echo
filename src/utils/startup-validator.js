/**
 * Startup Validation Utility
 * Validates critical environment configuration before server starts
 */

const logger = require('../infra/observability/logger');

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check for POSTGRES_URL (required for Prisma)
  if (!process.env.POSTGRES_URL) {
    errors.push({
      variable: 'POSTGRES_URL',
      message: 'PostgreSQL connection string is required',
      fix: [
        '1. Add POSTGRES_URL to your .env file',
        '2. Example: POSTGRES_URL=postgresql://user:password@localhost:5432/echotune',
        '3. For Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=echotune -p 5432:5432 -d postgres:15'
      ]
    });
  }

  // Check for Spotify credentials (required for core functionality)
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    warnings.push({
      variable: 'SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET',
      message: 'Spotify API credentials are missing - music features will not work',
      fix: [
        '1. Create a Spotify app at https://developer.spotify.com/dashboard',
        '2. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file',
        '3. Set SPOTIFY_REDIRECT_URI to match your callback URL'
      ]
    });
  }

  // Check for at least one LLM provider
  const hasLLMProvider = 
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.AZURE_OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY;

  if (!hasLLMProvider) {
    warnings.push({
      variable: 'LLM Provider Keys',
      message: 'No AI/LLM provider API keys configured - chat features will be limited',
      fix: [
        '1. Add at least one of: GEMINI_API_KEY, OPENAI_API_KEY, AZURE_OPENAI_API_KEY',
        '2. Get Gemini API key (free): https://makersuite.google.com/app/apikey',
        '3. Get OpenAI API key: https://platform.openai.com/api-keys'
      ]
    });
  }

  return { errors, warnings };
}

/**
 * Print validation results and exit if there are errors
 */
function validateAndExit() {
  const { errors, warnings } = validateEnvironment();

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    console.log('━'.repeat(80));
    warnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${warning.variable}`);
      console.log(`   ${warning.message}`);
      console.log('\n   How to fix:');
      warning.fix.forEach(step => console.log(`   ${step}`));
    });
    console.log('\n' + '━'.repeat(80));
    console.log('⚠️  App will start with limited functionality\n');
  }

  // Print errors and exit if any
  if (errors.length > 0) {
    console.error('\n❌ Critical Configuration Errors:');
    console.error('━'.repeat(80));
    errors.forEach((error, index) => {
      console.error(`\n${index + 1}. ${error.variable}`);
      console.error(`   ${error.message}`);
      console.error('\n   How to fix:');
      error.fix.forEach(step => console.error(`   ${step}`));
    });
    console.error('\n' + '━'.repeat(80));
    console.error('\n❌ Cannot start server - please fix the above errors\n');
    
    logger.error({
      msg: 'Startup validation failed',
      errors: errors.map(e => e.variable)
    });
    
    process.exit(1);
  }

  // Log successful validation
  logger.info({
    msg: 'Environment validation passed',
    warnings: warnings.length
  });
}

/**
 * Check if Prisma client is generated
 */
function checkPrismaClient() {
  try {
    require('@prisma/client');
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' || error.message.includes('did not initialize yet')) {
      console.error('\n❌ Prisma Client Error:');
      console.error('━'.repeat(80));
      console.error('\nThe Prisma client has not been generated yet.');
      console.error('\nHow to fix:');
      console.error('   1. Ensure POSTGRES_URL is set in your .env file');
      console.error('   2. Run: npm run db:generate');
      console.error('   3. Run: npm run db:push (to sync your database schema)');
      console.error('   4. Restart the server with: npm start');
      console.error('\n💡 Quick setup: npm run db:init');
      console.error('\n' + '━'.repeat(80) + '\n');
      
      logger.error({
        msg: 'Prisma client not generated',
        error: error.message
      });
      
      return false;
    }
    throw error;
  }
}

module.exports = {
  validateEnvironment,
  validateAndExit,
  checkPrismaClient
};
