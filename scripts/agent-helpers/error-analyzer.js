#!/usr/bin/env node

/**
 * Error Analyzer Module
 * Parses and categorizes errors from npm install, npm start, and related commands
 * Identifies error patterns and suggests fixes
 */

const ERROR_CATEGORIES = {
  NODE_VERSION: 'node_version',
  NPM_INSTALL: 'npm_install',
  PRISMA_CLIENT: 'prisma_client',
  PRISMA_MIGRATION: 'prisma_migration',
  DATABASE_CONNECTION: 'database_connection',
  ENV_MISSING: 'env_missing',
  MODULE_NOT_FOUND: 'module_not_found',
  OPENTELEMETRY: 'opentelemetry',
  RUNTIME_ERROR: 'runtime_error',
  PORT_IN_USE: 'port_in_use',
  UNKNOWN: 'unknown'
};

const ERROR_PATTERNS = [
  {
    category: ERROR_CATEGORIES.NODE_VERSION,
    patterns: [
      /Node\.js version .+ is not compatible/i,
      /requires node version/i,
      /unsupported engine/i
    ],
    severity: 'critical',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.NPM_INSTALL,
    patterns: [
      /npm ERR!/,
      /ERESOLVE/,
      /peer dep.*missing/i,
      /could not resolve dependency/i
    ],
    severity: 'critical',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.PRISMA_CLIENT,
    patterns: [
      /Prisma Client.*did not initialize yet/i,
      /prisma generate/i,
      /@prisma\/client.*not found/i,
      /\.prisma\/client/i
    ],
    severity: 'critical',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.PRISMA_MIGRATION,
    patterns: [
      /prisma migrate/i,
      /migration.*failed/i,
      /schema.*out of sync/i
    ],
    severity: 'high',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.DATABASE_CONNECTION,
    patterns: [
      /Can't reach database server/i,
      /Connection refused/i,
      /ECONNREFUSED/,
      /authentication failed/i,
      /invalid.*connection string/i,
      /POSTGRES_URL/
    ],
    severity: 'critical',
    fixable: false
  },
  {
    category: ERROR_CATEGORIES.ENV_MISSING,
    patterns: [
      /environment variable.*not set/i,
      /missing.*required.*variable/i,
      /missing required environment variable.*POSTGRES_URL/i,
      /PrismaConfigEnvError.*POSTGRES_URL/i,
      /\.env.*not found/i,
      /configuration.*missing/i
    ],
    severity: 'high',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.MODULE_NOT_FOUND,
    patterns: [
      /Cannot find module/i,
      /MODULE_NOT_FOUND/,
      /Error: Cannot find/i
    ],
    severity: 'high',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.OPENTELEMETRY,
    patterns: [
      /opentelemetry/i,
      /tracing.*failed/i,
      /@opentelemetry/i,
      /otlp.*exporter/i
    ],
    severity: 'medium',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.PORT_IN_USE,
    patterns: [
      /EADDRINUSE/,
      /port.*already in use/i,
      /address already in use/i
    ],
    severity: 'medium',
    fixable: true
  },
  {
    category: ERROR_CATEGORIES.RUNTIME_ERROR,
    patterns: [
      /TypeError/,
      /ReferenceError/,
      /SyntaxError/,
      /RangeError/
    ],
    severity: 'high',
    fixable: false
  }
];

/**
 * Analyze error output and categorize it
 * @param {string} errorOutput - The error output from a command
 * @returns {Object} Analysis result with category, severity, and suggestions
 */
function analyzeError(errorOutput) {
  if (!errorOutput || typeof errorOutput !== 'string') {
    return {
      category: ERROR_CATEGORIES.UNKNOWN,
      severity: 'unknown',
      fixable: false,
      patterns: [],
      suggestions: []
    };
  }

  const matchedPatterns = [];
  const categories = new Set();
  let highestSeverity = 'low';
  let anyFixable = false;

  // Check all patterns
  for (const errorDef of ERROR_PATTERNS) {
    for (const pattern of errorDef.patterns) {
      if (pattern.test(errorOutput)) {
        matchedPatterns.push({
          category: errorDef.category,
          severity: errorDef.severity,
          fixable: errorDef.fixable,
          pattern: pattern.toString()
        });
        categories.add(errorDef.category);
        
        // Track highest severity
        if (errorDef.severity === 'critical') highestSeverity = 'critical';
        else if (errorDef.severity === 'high' && highestSeverity !== 'critical') highestSeverity = 'high';
        else if (errorDef.severity === 'medium' && !['critical', 'high'].includes(highestSeverity)) highestSeverity = 'medium';
        
        if (errorDef.fixable) anyFixable = true;
        break; // Only match once per error definition
      }
    }
  }

  // If no patterns matched, it's unknown
  if (categories.size === 0) {
    categories.add(ERROR_CATEGORIES.UNKNOWN);
  }

  // Get primary category (first matched or unknown)
  const primaryCategory = matchedPatterns.length > 0 
    ? matchedPatterns[0].category 
    : ERROR_CATEGORIES.UNKNOWN;

  return {
    category: primaryCategory,
    allCategories: Array.from(categories),
    severity: highestSeverity,
    fixable: anyFixable,
    matchedPatterns,
    errorSnippet: extractErrorSnippet(errorOutput),
    suggestions: getSuggestions(primaryCategory, errorOutput)
  };
}

/**
 * Extract the most relevant error snippet
 * @param {string} errorOutput - Full error output
 * @returns {string} Relevant snippet
 */
function extractErrorSnippet(errorOutput) {
  const lines = errorOutput.split('\n');
  
  // Find lines with "Error:", "ERR!", or stack traces
  const errorLines = lines.filter(line => 
    /error:/i.test(line) || 
    /ERR!/i.test(line) ||
    /at\s+\w+/i.test(line) // Stack trace
  );

  // Return first 5 error lines or first 10 lines if no errors found
  return (errorLines.length > 0 ? errorLines : lines)
    .slice(0, 5)
    .join('\n');
}

/**
 * Get fix suggestions based on error category
 * @param {string} category - Error category
 * @param {string} errorOutput - Full error output
 * @returns {Array<string>} List of suggestions
 */
function getSuggestions(category, errorOutput) {
  const suggestions = [];

  switch (category) {
    case ERROR_CATEGORIES.NODE_VERSION:
      suggestions.push('Upgrade Node.js to version 18 or higher');
      suggestions.push('Use nvm: nvm install 20 && nvm use 20');
      suggestions.push('Then run: npm install');
      break;

    case ERROR_CATEGORIES.NPM_INSTALL:
      suggestions.push('Try: npm ci (clean install from lock file)');
      suggestions.push('Or: rm -rf node_modules package-lock.json && npm install');
      suggestions.push('Check for conflicting peer dependencies');
      break;

    case ERROR_CATEGORIES.PRISMA_CLIENT:
      suggestions.push('Ensure POSTGRES_URL is set in .env');
      suggestions.push('Run: npm run db:generate');
      suggestions.push('Run: npm run db:push (to sync schema)');
      suggestions.push('Alternative: npm run db:init (combined command)');
      break;

    case ERROR_CATEGORIES.PRISMA_MIGRATION:
      suggestions.push('Run: npm run db:push (force sync without migrations)');
      suggestions.push('Or: npm run db:migrate (create and apply migrations)');
      suggestions.push('Check that POSTGRES_URL points to accessible database');
      break;

    case ERROR_CATEGORIES.DATABASE_CONNECTION:
      suggestions.push('Ensure PostgreSQL is running');
      suggestions.push('Verify POSTGRES_URL in .env is correct');
      suggestions.push('Format: postgresql://user:password@host:port/database');
      suggestions.push('For local: docker run --name postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres:15');
      break;

    case ERROR_CATEGORIES.ENV_MISSING:
      suggestions.push('Copy: cp .env.example .env');
      suggestions.push('Edit .env and set required variables');
      suggestions.push('At minimum, set POSTGRES_URL');
      break;

    case ERROR_CATEGORIES.MODULE_NOT_FOUND:
      suggestions.push('Run: npm install');
      suggestions.push('Verify package.json has the required dependency');
      suggestions.push('Check if module path is correct');
      break;

    case ERROR_CATEGORIES.OPENTELEMETRY:
      suggestions.push('Set ENABLE_TRACING=false in .env to disable tracing');
      suggestions.push('Or install required OpenTelemetry exporters');
      suggestions.push('Check tracing configuration in src/infra/observability/tracing.js');
      break;

    case ERROR_CATEGORIES.PORT_IN_USE:
      suggestions.push('Kill process using port: lsof -ti:3000 | xargs kill -9');
      suggestions.push('Or change PORT in .env: PORT=3001');
      suggestions.push('Or: npx kill-port 3000');
      break;

    case ERROR_CATEGORIES.RUNTIME_ERROR:
      suggestions.push('Check the stack trace for the problematic file and line');
      suggestions.push('Verify all required environment variables are set');
      suggestions.push('Check logs for more context');
      break;

    default:
      suggestions.push('Review the full error output');
      suggestions.push('Check application logs');
      suggestions.push('Verify environment configuration');
  }

  return suggestions;
}

/**
 * Format analysis result for display
 * @param {Object} analysis - Analysis result
 * @returns {string} Formatted output
 */
function formatAnalysis(analysis) {
  const lines = [];
  lines.push('━'.repeat(80));
  lines.push('📊 ERROR ANALYSIS');
  lines.push('━'.repeat(80));
  lines.push('');
  lines.push(`Category: ${analysis.category.toUpperCase()}`);
  lines.push(`Severity: ${analysis.severity.toUpperCase()}`);
  lines.push(`Fixable: ${analysis.fixable ? '✅ Yes' : '❌ No (requires manual intervention)'}`);
  lines.push('');
  
  if (analysis.matchedPatterns.length > 0) {
    lines.push('Matched Patterns:');
    analysis.matchedPatterns.forEach(p => {
      lines.push(`  - ${p.category} (${p.severity})`);
    });
    lines.push('');
  }

  if (analysis.errorSnippet) {
    lines.push('Error Snippet:');
    lines.push(analysis.errorSnippet);
    lines.push('');
  }

  if (analysis.suggestions.length > 0) {
    lines.push('💡 Suggested Fixes:');
    analysis.suggestions.forEach((suggestion, i) => {
      lines.push(`  ${i + 1}. ${suggestion}`);
    });
    lines.push('');
  }

  lines.push('━'.repeat(80));
  return lines.join('\n');
}

module.exports = {
  ERROR_CATEGORIES,
  analyzeError,
  formatAnalysis,
  extractErrorSnippet,
  getSuggestions
};

// CLI usage
if (require.main === module) {
  const fs = require('fs');
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node error-analyzer.js <error-file>');
    console.error('   or: echo "error text" | node error-analyzer.js -');
    process.exit(1);
  }

  const input = args[0];
  let errorText = '';

  if (input === '-') {
    // Read from stdin
    const stdin = process.stdin;
    stdin.setEncoding('utf8');
    stdin.on('data', chunk => errorText += chunk);
    stdin.on('end', () => {
      const analysis = analyzeError(errorText);
      console.log(formatAnalysis(analysis));
    });
  } else {
    // Read from file
    try {
      errorText = fs.readFileSync(input, 'utf8');
      const analysis = analyzeError(errorText);
      console.log(formatAnalysis(analysis));
    } catch (error) {
      console.error('Error reading file:', error.message);
      process.exit(1);
    }
  }
}
