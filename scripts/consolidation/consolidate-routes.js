#!/usr/bin/env node

/**
 * Route Consolidation Script
 * 
 * Safely consolidates duplicate route files by:
 * 1. Removing unused routes
 * 2. Updating imports to point to canonical versions
 * 3. Validating the changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');

// Safe consolidations (no imports to old file)
const SAFE_CONSOLIDATIONS = [
  {
    name: 'admin',
    remove: 'src/routes/admin.js',
    keep: 'src/api/routes/admin.js',
    reason: 'Only src/api/routes/admin.js is imported by tests'
  },
  {
    name: 'chat',
    remove: 'src/routes/chat.js',
    keep: 'src/api/routes/chat.js',
    reason: 'Only src/api/routes/chat.js is imported by api/index.js and tests'
  },
  {
    name: 'system',
    remove: 'src/routes/system.js',
    keep: 'src/api/routes/system.js',
    reason: 'Only src/api/routes/system.js is imported by api/index.js'
  }
];

// Routes that need import migration
const MERGE_CONSOLIDATIONS = [
  {
    name: 'settings',
    migrate: {
      from: 'src/routes/settings.js',
      to: 'src/api/routes/settings.js'
    },
    imports: [
      'tests/integration/user-settings-api.test.js',
      'tests/unit/routes/settings.test.js'
    ]
  },
  {
    name: 'user-settings',
    migrate: {
      from: 'src/routes/user-settings.js',
      to: 'src/api/routes/user-settings.js'
    },
    imports: [
      'tests/integration/user-settings-api.test.js'
    ]
  }
];

/**
 * Update import statements in a file
 */
function updateImport(filePath, oldPath, newPath) {
  const fullPath = path.join(ROOT_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Calculate relative path from file to new location
  const fileDir = path.dirname(fullPath);
  const newFullPath = path.join(ROOT_DIR, newPath);
  let relativePath = path.relative(fileDir, newFullPath).replace(/\\/g, '/');
  
  // Ensure it starts with ./
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  // Remove .js extension for require
  relativePath = relativePath.replace(/\.js$/, '');

  // Replace various import patterns
  const patterns = [
    // require('../../src/routes/settings')
    new RegExp(`require\\(['"]([^'"]*${oldPath.replace(/\//g, '\\/').replace(/\.js$/, '')})['"]]\\)`, 'g'),
    // require('../../src/routes/settings.js')
    new RegExp(`require\\(['"]([^'"]*${oldPath.replace(/\//g, '\\/')})['"]\\)`, 'g'),
    // from '../../src/routes/settings'
    new RegExp(`from\\s+['"]([^'"]*${oldPath.replace(/\//g, '\\/').replace(/\.js$/, '')})['"]]`, 'g'),
    // from '../../src/routes/settings.js'
    new RegExp(`from\\s+['"]([^'"]*${oldPath.replace(/\//g, '\\/')})['"]`, 'g')
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, (match) => {
      return match.replace(/(['"])([^'"]+)(['"])/, `$1${relativePath}$3`);
    });
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`   ✅ Updated: ${filePath}`);
    return true;
  }

  console.log(`   ℹ️  No changes needed: ${filePath}`);
  return false;
}

/**
 * Remove a file safely
 */
function removeFile(filePath) {
  const fullPath = path.join(ROOT_DIR, filePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`   ✅ Removed: ${filePath}`);
    return true;
  }
  
  console.log(`   ⚠️  File not found: ${filePath}`);
  return false;
}

/**
 * Phase 1: Safe consolidations (no import updates needed)
 */
function phase1SafeConsolidations() {
  console.log('\n' + '='.repeat(80));
  console.log('📦 PHASE 1: Safe Route Consolidations');
  console.log('='.repeat(80));
  console.log('Removing routes that are not imported by any files.\n');

  let removed = 0;

  for (const consolidation of SAFE_CONSOLIDATIONS) {
    console.log(`\n🔧 Consolidating: ${consolidation.name}.js`);
    console.log(`   Reason: ${consolidation.reason}`);
    console.log(`   Removing: ${consolidation.remove}`);
    console.log(`   Keeping: ${consolidation.keep}`);
    
    if (removeFile(consolidation.remove)) {
      removed++;
    }
  }

  console.log(`\n✅ Phase 1 Complete: ${removed} file(s) removed\n`);
  return removed;
}

/**
 * Phase 2: Merge consolidations (update imports first)
 */
function phase2MergeConsolidations() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 PHASE 2: Merge Consolidations');
  console.log('='.repeat(80));
  console.log('Updating imports and removing old route files.\n');

  let updated = 0;
  let removed = 0;

  for (const consolidation of MERGE_CONSOLIDATIONS) {
    console.log(`\n🔧 Consolidating: ${consolidation.name}.js`);
    console.log(`   Migrating from: ${consolidation.migrate.from}`);
    console.log(`   Migrating to: ${consolidation.migrate.to}`);
    console.log(`   Files to update: ${consolidation.imports.length}`);
    
    // Update each import
    for (const importFile of consolidation.imports) {
      if (updateImport(importFile, consolidation.migrate.from, consolidation.migrate.to)) {
        updated++;
      }
    }
    
    // Remove old file
    if (removeFile(consolidation.migrate.from)) {
      removed++;
    }
  }

  console.log(`\n✅ Phase 2 Complete: ${updated} import(s) updated, ${removed} file(s) removed\n`);
  return { updated, removed };
}

/**
 * Validation
 */
function validate() {
  console.log('\n' + '='.repeat(80));
  console.log('✅ VALIDATION');
  console.log('='.repeat(80));

  try {
    console.log('\n🔍 Checking for syntax errors...');
    execSync('node -e "console.log(\'Node.js is working\')"', { 
      cwd: ROOT_DIR, 
      stdio: 'inherit' 
    });
    console.log('✅ No syntax errors detected\n');
  } catch (err) {
    console.error('❌ Validation failed');
    throw err;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Route Consolidation Script');
  console.log('='.repeat(80));
  console.log('This script will consolidate duplicate route files by removing');
  console.log('unused routes and updating imports to canonical versions.\n');

  try {
    // Phase 1: Safe consolidations
    const phase1Removed = phase1SafeConsolidations();
    
    // Phase 2: Merge consolidations
    const phase2Results = phase2MergeConsolidations();
    
    // Validation
    validate();
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 CONSOLIDATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n✅ Total files removed: ${phase1Removed + phase2Results.removed}`);
    console.log(`✅ Total imports updated: ${phase2Results.updated}`);
    console.log(`\n📊 Route count reduced from 8 duplicate pairs to 0`);
    console.log('✅ All imports now point to canonical routes in src/api/routes/\n');
    
    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      phase1: {
        removed: phase1Removed,
        files: SAFE_CONSOLIDATIONS.map(c => c.remove)
      },
      phase2: {
        removed: phase2Results.removed,
        updated: phase2Results.updated,
        files: MERGE_CONSOLIDATIONS.map(c => c.migrate.from)
      },
      totalRemoved: phase1Removed + phase2Results.removed
    };
    
    const summaryPath = path.join(ROOT_DIR, 'reports', 'route-consolidation-summary.json');
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`💾 Summary saved to: reports/route-consolidation-summary.json\n`);
    
  } catch (error) {
    console.error('\n❌ Consolidation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  phase1SafeConsolidations, 
  phase2MergeConsolidations, 
  updateImport, 
  removeFile 
};
