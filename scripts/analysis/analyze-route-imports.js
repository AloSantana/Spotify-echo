#!/usr/bin/env node

/**
 * Route Import Dependency Analyzer
 * 
 * Analyzes which files import each route to determine safe consolidation strategy
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');

// Route files to analyze
const ROUTE_PAIRS = [
  { name: 'admin', paths: ['src/routes/admin.js', 'src/api/routes/admin.js'] },
  { name: 'chat', paths: ['src/routes/chat.js', 'src/api/routes/chat.js'] },
  { name: 'health', paths: ['src/routes/health.js', 'src/routes/internal/health.js'] },
  { name: 'metrics', paths: ['src/routes/internal/metrics.js', 'src/routes/metrics.js'] },
  { name: 'performance', paths: ['src/routes/performance.js', 'src/api/routes/performance.js'] },
  { name: 'settings', paths: ['src/routes/settings.js', 'src/api/routes/settings.js'] },
  { name: 'system', paths: ['src/routes/system.js', 'src/api/routes/system.js'] },
  { name: 'user-settings', paths: ['src/routes/user-settings.js', 'src/api/routes/user-settings.js'] }
];

/**
 * Search for imports of a specific file
 */
function findImports(targetPath) {
  const imports = [];
  const targetVariants = [
    targetPath,
    targetPath.replace(/\.js$/, ''),
    './' + targetPath,
    '../' + targetPath,
    '../../' + targetPath,
    '../../../' + targetPath
  ];

  function searchFile(filePath) {
    if (filePath.includes('node_modules') || filePath.includes('.git')) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for require() or import statements
        const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
        
        const match = requireMatch || importMatch;
        if (match) {
          const importPath = match[1];
          
          // Check if this import matches our target
          for (const variant of targetVariants) {
            if (importPath.includes(variant) || variant.includes(importPath)) {
              imports.push({
                file: filePath.replace(ROOT_DIR + '/', ''),
                line: index + 1,
                statement: line.trim()
              });
              break;
            }
          }
        }
      });
    } catch (err) {
      // Ignore read errors
    }
  }

  function traverseDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules') {
            traverseDirectory(fullPath);
          }
        } else if (item.endsWith('.js') || item.endsWith('.ts')) {
          searchFile(fullPath);
        }
      }
    } catch (err) {
      // Ignore directory errors
    }
  }

  traverseDirectory(ROOT_DIR);
  return imports;
}

/**
 * Analyze route pair
 */
function analyzeRoutePair(pair) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 Analyzing: ${pair.name}.js`);
  console.log('='.repeat(80));

  const results = pair.paths.map(routePath => {
    console.log(`\n🔍 Searching for imports of: ${routePath}`);
    const imports = findImports(routePath);
    
    if (imports.length === 0) {
      console.log('   ⚠️  No imports found!');
    } else {
      console.log(`   ✅ Found ${imports.length} import(s):`);
      imports.forEach(imp => {
        console.log(`      - ${imp.file}:${imp.line}`);
        console.log(`        ${imp.statement}`);
      });
    }

    return {
      path: routePath,
      imports: imports,
      importCount: imports.length
    };
  });

  // Determine consolidation recommendation
  console.log(`\n💡 Consolidation Recommendation:`);
  
  const [route1, route2] = results;
  
  if (route1.importCount === 0 && route2.importCount === 0) {
    console.log('   ⚠️  Neither file is imported - both may be unused!');
    console.log('   🎯 Action: Investigate if routes are registered directly');
  } else if (route1.importCount === 0) {
    console.log(`   ✅ Safe to remove: ${route1.path}`);
    console.log(`   ✅ Keep: ${route2.path}`);
  } else if (route2.importCount === 0) {
    console.log(`   ✅ Safe to remove: ${route2.path}`);
    console.log(`   ✅ Keep: ${route1.path}`);
  } else {
    console.log('   ⚠️  Both files are imported - merge required!');
    console.log(`   📝 ${route1.path}: ${route1.importCount} import(s)`);
    console.log(`   📝 ${route2.path}: ${route2.importCount} import(s)`);
    console.log('   🎯 Action: Migrate imports to more comprehensive version');
  }

  return results;
}

/**
 * Main analysis
 */
function main() {
  console.log('🔍 Route Import Dependency Analysis');
  console.log('=' .repeat(80));
  console.log('This tool identifies which files import each route to determine');
  console.log('safe consolidation strategies.\n');

  const allResults = {};

  for (const pair of ROUTE_PAIRS) {
    const results = analyzeRoutePair(pair);
    allResults[pair.name] = results;
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 SUMMARY & ACTION PLAN');
  console.log('='.repeat(80));

  let safeToRemove = 0;
  let needsMerge = 0;
  let possiblyUnused = 0;

  for (const [name, results] of Object.entries(allResults)) {
    const [route1, route2] = results;
    
    if (route1.importCount === 0 && route2.importCount === 0) {
      possiblyUnused++;
      console.log(`\n⚠️  ${name}.js - Possibly unused (no imports found)`);
    } else if (route1.importCount === 0 || route2.importCount === 0) {
      safeToRemove++;
      const toRemove = route1.importCount === 0 ? route1.path : route2.path;
      const toKeep = route1.importCount === 0 ? route2.path : route1.path;
      console.log(`\n✅ ${name}.js - Safe to consolidate`);
      console.log(`   Remove: ${toRemove}`);
      console.log(`   Keep: ${toKeep}`);
    } else {
      needsMerge++;
      console.log(`\n⚠️  ${name}.js - Needs careful merge`);
      console.log(`   ${route1.path}: ${route1.importCount} imports`);
      console.log(`   ${route2.path}: ${route2.importCount} imports`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 CONSOLIDATION STATISTICS:');
  console.log(`   ✅ Safe to consolidate: ${safeToRemove}`);
  console.log(`   ⚠️  Needs merge: ${needsMerge}`);
  console.log(`   ⚠️  Possibly unused: ${possiblyUnused}`);
  console.log('='.repeat(80));

  // Save detailed report
  const reportPath = path.join(ROOT_DIR, 'reports', 'route-import-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: allResults,
    summary: {
      safeToRemove,
      needsMerge,
      possiblyUnused
    }
  }, null, 2));

  console.log(`\n💾 Detailed report saved to: reports/route-import-analysis.json\n`);
}

if (require.main === module) {
  main();
}

module.exports = { findImports, analyzeRoutePair };
