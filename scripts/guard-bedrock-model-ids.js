#!/usr/bin/env node

/**
 * Bedrock Model ID Guard Script
 * 
 * Scans codebase for hardcoded AWS Bedrock model IDs and prevents their usage.
 * Enforces use of alias-based resolution for all Bedrock model references.
 * 
 * Features:
 * - Detects hardcoded model IDs (e.g., 'anthropic.claude-*')
 * - Scans JavaScript, TypeScript, JSON, and Markdown files
 * - Provides remediation suggestions
 * - Exit code 1 if violations found (for CI/CD integration)
 * 
 * Usage:
 *   node scripts/guard-bedrock-model-ids.js
 *   node scripts/guard-bedrock-model-ids.js --fix  # Auto-fix where possible
 *   node scripts/guard-bedrock-model-ids.js --strict  # Fail on any violation
 */

const fs = require('fs');
const path = require('path');

// Pattern to detect hardcoded Bedrock model IDs
const MODEL_ID_PATTERNS = [
  /anthropic\.claude-[a-z0-9-]+:[0-9]/gi,
  /amazon\.titan-[a-z0-9-]+/gi,
  /deepseek\.[a-z0-9-]+:[0-9]/gi,
  /ai21\.[a-z0-9-]+/gi,
  /cohere\.[a-z0-9-]+/gi,
  /meta\.llama[0-9]-[a-z0-9-]+/gi
];

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'test-artifacts',
  'validation-reports',
  'bedrock-aliases.json',
  'aws-bedrock-models.json',
  'BEDROCK_',
  'guard-bedrock-model-ids.js'
];

// File extensions to scan
const INCLUDE_EXTENSIONS = ['.js', '.ts', '.json', '.md'];

/**
 * Check if path should be excluded
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Recursively find files to scan
 */
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    
    if (shouldExclude(filePath)) {
      continue;
    }
    
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (INCLUDE_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

class ModelIdGuard {
  constructor(options = {}) {
    this.options = {
      fix: options.fix || false,
      strict: options.strict || false,
      verbose: options.verbose || false
    };
    
    this.violations = [];
    this.filesScanned = 0;
    this.filesWithViolations = 0;
  }

  /**
   * Scan file for hardcoded model IDs
   */
  async scanFile(filePath) {
    this.filesScanned++;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];
    
    for (const pattern of MODEL_ID_PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNumber - 1];
        
        violations.push({
          file: filePath,
          line: lineNumber,
          match: match[0],
          context: line.trim(),
          pattern: pattern.source
        });
      }
    }
    
    if (violations.length > 0) {
      this.filesWithViolations++;
      this.violations.push(...violations);
    }
    
    return violations;
  }

  /**
   * Scan all files in repository
   */
  async scan() {
    console.log('🔍 Scanning codebase for hardcoded Bedrock model IDs...\n');
    
    const rootDir = path.join(__dirname, '..');
    const files = findFiles(rootDir);
    
    if (this.options.verbose) {
      console.log(`Found ${files.length} files to scan\n`);
    }
    
    for (const file of files) {
      if (this.options.verbose) {
        console.log(`Scanning: ${path.relative(process.cwd(), file)}`);
      }
      await this.scanFile(file);
    }
    
    return this.violations;
  }

  /**
   * Generate remediation suggestions
   */
  generateRemediations() {
    const remediations = [];
    
    for (const violation of this.violations) {
      const suggestion = this.getSuggestion(violation.match);
      remediations.push({
        ...violation,
        suggestion
      });
    }
    
    return remediations;
  }

  /**
   * Get suggestion for hardcoded model ID
   */
  getSuggestion(modelId) {
    // Map common model IDs to aliases
    const aliasMap = {
      'anthropic.claude-3-opus-20240229-v1:0': 'claude-3-opus',
      'anthropic.claude-sonnet-4-5-20250929-v1:0': 'claude-sonnet-4-5',
      'anthropic.claude-3-5-sonnet-20241022-v2:0': 'claude-3-5-sonnet-v2',
      'anthropic.claude-3-5-sonnet-20240620-v1:0': 'claude-3-5-sonnet-v1',
      'anthropic.claude-3-5-haiku-20241022-v1:0': 'claude-3-5-haiku',
      'anthropic.claude-3-sonnet-20240229-v1:0': 'claude-3-sonnet',
      'anthropic.claude-3-haiku-20240307-v1:0': 'claude-3-haiku',
      'deepseek.r1-v1:0': 'deepseek-r1',
      'amazon.titan-text-express-v1': 'titan-text-express-v1'
    };
    
    const alias = aliasMap[modelId];
    
    if (alias) {
      return {
        alias,
        code: `
// Instead of hardcoded model ID:
const modelId = '${modelId}';

// Use alias resolution:
const { getModelId } = require('./src/infra/bedrock/alias-resolver');
const modelId = getModelId('${alias}');
`
      };
    }
    
    return {
      alias: 'unknown',
      code: `
// Replace hardcoded model ID with alias resolution:
const { getModelId } = require('./src/infra/bedrock/alias-resolver');
const modelId = getModelId('your-alias-here');

// Check config/bedrock-aliases.json for available aliases
`
    };
  }

  /**
   * Print report
   */
  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Bedrock Model ID Guard Report');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Files scanned: ${this.filesScanned}`);
    console.log(`Files with violations: ${this.filesWithViolations}`);
    console.log(`Total violations: ${this.violations.length}\n`);
    
    if (this.violations.length === 0) {
      console.log('✅ No hardcoded model IDs found!\n');
      return;
    }
    
    console.log('❌ Violations found:\n');
    
    const remediations = this.generateRemediations();
    
    // Group by file
    const byFile = {};
    for (const violation of remediations) {
      if (!byFile[violation.file]) {
        byFile[violation.file] = [];
      }
      byFile[violation.file].push(violation);
    }
    
    for (const [file, violations] of Object.entries(byFile)) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`\n📄 ${relPath}`);
      console.log('-'.repeat(80));
      
      for (const violation of violations) {
        console.log(`  Line ${violation.line}: ${violation.match}`);
        console.log(`  Context: ${violation.context}`);
        console.log(`  Suggestion: Use alias '${violation.suggestion.alias}'`);
        console.log();
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Remediation Guide');
    console.log('='.repeat(80) + '\n');
    
    console.log('To fix these violations:');
    console.log('1. Replace hardcoded model IDs with alias-based resolution');
    console.log('2. Use the AliasResolver module:');
    console.log('   const { getModelId } = require("./src/infra/bedrock/alias-resolver");');
    console.log('3. Check config/bedrock-aliases.json for available aliases');
    console.log('4. Update your code to use: getModelId("alias-name")');
    console.log('\nExample remediation:');
    console.log(this.getSuggestion(this.violations[0].match).code);
  }

  /**
   * Run guard
   */
  async run() {
    await this.scan();
    this.printReport();
    
    // Exit with error code if violations found
    if (this.violations.length > 0) {
      if (this.options.strict) {
        console.error('\n❌ Guard failed: Hardcoded model IDs detected (strict mode)');
        process.exit(1);
      } else {
        console.warn('\n⚠️  Warning: Hardcoded model IDs detected');
        console.warn('Run with --strict to enforce this check in CI/CD');
      }
    } else {
      console.log('✅ Guard passed: No hardcoded model IDs found');
    }
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    fix: args.includes('--fix'),
    strict: args.includes('--strict'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  const guard = new ModelIdGuard(options);
  
  guard.run().catch(error => {
    console.error('❌ Guard script failed:', error);
    process.exit(1);
  });
}

module.exports = { ModelIdGuard };
