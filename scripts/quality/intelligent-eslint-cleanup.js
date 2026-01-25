#!/usr/bin/env node

/**
 * Intelligent ESLint Cleanup Script
 * 
 * Performs targeted ESLint fixes with priority-based approach:
 * 1. Critical errors (syntax, undefined vars)
 * 2. Production code warnings
 * 3. Test code warnings (lower priority)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');

/**
 * Get ESLint stats (simplified version to avoid huge output)
 */
function getESLintSummary() {
  try {
    const output = execSync('npx eslint . 2>&1 | tail -20', {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    });
    
    // Parse summary line like "✖ 3490 problems (385 errors, 3105 warnings)"
    const match = output.match(/✖\s+(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/);
    
    if (match) {
      return {
        total: parseInt(match[1]),
        errors: parseInt(match[2]),
        warnings: parseInt(match[3])
      };
    }
    
    return null;
  } catch (err) {
    // ESLint returns non-zero when there are issues, so catch and parse
    const output = err.stdout || err.message;
    const match = output.match(/✖\s+(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/);
    
    if (match) {
      return {
        total: parseInt(match[1]),
        errors: parseInt(match[2]),
        warnings: parseInt(match[3])
      };
    }
    
    return null;
  }
}

/**
 * Run ESLint auto-fix
 */
function runAutoFix(pattern = '.') {
  console.log(`\n🔧 Running ESLint auto-fix on: ${pattern}`);
  
  try {
    execSync(`npx eslint ${pattern} --fix 2>&1 | tail -20`, {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    });
    console.log('✅ Auto-fix completed');
    return true;
  } catch (err) {
    console.log('⚠️  Auto-fix completed with some remaining issues');
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Intelligent ESLint Cleanup');
  console.log('='.repeat(80));
  
  // Get baseline stats
  console.log('\n📊 Analyzing current ESLint state...');
  const before = getESLintSummary();
  
  if (!before) {
    console.log('⚠️  Could not parse ESLint stats, continuing anyway...');
  } else {
    console.log('\n📈 Current State:');
    console.log(`   Total: ${before.errors} errors, ${before.warnings} warnings`);
  }
  
  // Strategy: Auto-fix everything possible
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1: Auto-fix all fixable issues');
  console.log('='.repeat(80));
  
  runAutoFix('.');
  
  // Get new stats
  const after = getESLintSummary();
  
  if (before && after) {
    console.log('\n📊 Results:');
    console.log(`   Errors: ${before.errors} → ${after.errors} (${before.errors - after.errors} fixed)`);
    console.log(`   Warnings: ${before.warnings} → ${after.warnings} (${before.warnings - after.warnings} fixed)`);
    
    const errorReduction = before.errors > 0 ? Math.round(((before.errors - after.errors) / before.errors) * 100) : 0;
    const warningReduction = before.warnings > 0 ? Math.round(((before.warnings - after.warnings) / before.warnings) * 100) : 0;
    
    console.log(`   Error Reduction: ${errorReduction}%`);
    console.log(`   Warning Reduction: ${warningReduction}%`);
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      before: before,
      after: after,
      reduction: {
        errors: before.errors - after.errors,
        warnings: before.warnings - after.warnings,
        errorPercent: errorReduction,
        warningPercent: warningReduction
      }
    };
    
    const reportPath = path.join(ROOT_DIR, 'reports', 'eslint-cleanup-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Report saved to: reports/eslint-cleanup-report.json`);
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 CLEANUP SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Fixed: ${before.errors - after.errors} errors`);
    console.log(`✅ Fixed: ${before.warnings - after.warnings} warnings`);
    console.log(`⚠️  Remaining: ${after.errors} errors, ${after.warnings} warnings`);
    
    if (after.errors < 50 && after.warnings < 500) {
      console.log('\n🎯 GOAL ACHIEVED! Code quality targets met!\n');
    } else if (after.errors < 100) {
      console.log('\n🎯 GOOD PROGRESS! Close to code quality targets.\n');
    } else {
      console.log('\n⚠️  MORE WORK NEEDED. Continue with manual fixes.\n');
    }
  } else {
    console.log('\n✅ Auto-fix completed. Run `npm run lint` to see results.\n');
  }
}

if (require.main === module) {
  main();
}

module.exports = { getESLintSummary, runAutoFix };
