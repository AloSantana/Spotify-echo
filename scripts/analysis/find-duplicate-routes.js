#!/usr/bin/env node

/**
 * Find Duplicate Route Files
 * 
 * This script analyzes the repository to find potentially duplicate route files
 * between src/routes/ and src/api/routes/ directories.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Directories to analyze
const ROUTE_DIRS = [
  'src/routes',
  'src/api/routes',
  'src/backend/routes'
];

const ROOT_DIR = path.join(__dirname, '../..');

/**
 * Get file hash for content comparison
 */
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Get file size
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Get all JS files in a directory recursively
 */
function getJSFiles(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.js')) {
        files.push({
          fullPath,
          relativePath: path.relative(ROOT_DIR, fullPath),
          basename: path.basename(item, '.js'),
          hash: getFileHash(fullPath),
          size: getFileSize(fullPath)
        });
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Find duplicate files by name
 */
function findDuplicatesByName(files) {
  const byName = {};
  
  for (const file of files) {
    const name = file.basename;
    if (!byName[name]) {
      byName[name] = [];
    }
    byName[name].push(file);
  }
  
  return Object.entries(byName)
    .filter(([name, files]) => files.length > 1)
    .map(([name, files]) => ({
      name,
      files: files.map(f => ({
        path: f.relativePath,
        size: f.size,
        hash: f.hash
      }))
    }));
}

/**
 * Find exact duplicates by content hash
 */
function findExactDuplicates(files) {
  const byHash = {};
  
  for (const file of files) {
    const hash = file.hash;
    if (!byHash[hash]) {
      byHash[hash] = [];
    }
    byHash[hash].push(file);
  }
  
  return Object.entries(byHash)
    .filter(([hash, files]) => files.length > 1)
    .map(([hash, files]) => ({
      hash: hash.substring(0, 8),
      files: files.map(f => f.relativePath)
    }));
}

/**
 * Main analysis
 */
function main() {
  console.log('🔍 Analyzing route files for duplicates...\n');
  
  const allFiles = [];
  
  // Collect all files
  for (const dir of ROUTE_DIRS) {
    const fullPath = path.join(ROOT_DIR, dir);
    const files = getJSFiles(fullPath);
    console.log(`📂 Found ${files.length} files in ${dir}`);
    allFiles.push(...files);
  }
  
  console.log(`\n📊 Total files analyzed: ${allFiles.length}\n`);
  
  // Find duplicates by name
  const nameDuplicates = findDuplicatesByName(allFiles);
  
  console.log(`\n🔄 Files with duplicate names: ${nameDuplicates.length}\n`);
  console.log('━'.repeat(80));
  
  for (const dup of nameDuplicates) {
    console.log(`\n📝 ${dup.name}.js (${dup.files.length} copies):`);
    
    // Check if any are exact duplicates
    const hashes = new Set(dup.files.map(f => f.hash));
    const isExactDuplicate = hashes.size === 1;
    
    if (isExactDuplicate) {
      console.log('   ⚠️  EXACT DUPLICATES - Same content!');
    } else {
      console.log('   ℹ️  Different content - possible refactoring needed');
    }
    
    for (const file of dup.files) {
      console.log(`   - ${file.path} (${file.size} bytes, hash: ${file.hash.substring(0, 8)})`);
    }
  }
  
  // Find exact duplicates by content
  const exactDuplicates = findExactDuplicates(allFiles);
  
  if (exactDuplicates.length > 0) {
    console.log('\n━'.repeat(80));
    console.log(`\n⚠️  Exact duplicates (identical content): ${exactDuplicates.length}\n`);
    
    for (const dup of exactDuplicates) {
      console.log(`\nHash: ${dup.hash}`);
      for (const file of dup.files) {
        console.log(`   - ${file}`);
      }
    }
  }
  
  // Summary and recommendations
  console.log('\n' + '━'.repeat(80));
  console.log('\n📋 Summary & Recommendations:\n');
  
  const exactCount = exactDuplicates.reduce((sum, dup) => sum + dup.files.length - 1, 0);
  const nameOnlyCount = nameDuplicates.length - exactDuplicates.length;
  
  console.log(`✅ ${allFiles.length} total route files`);
  console.log(`❌ ${exactCount} exact duplicates to remove`);
  console.log(`⚠️  ${nameOnlyCount} name duplicates to review`);
  
  if (exactCount > 0) {
    console.log('\n🎯 Action Items:');
    console.log('   1. Review exact duplicates and keep one canonical version');
    console.log('   2. Update all imports to point to canonical version');
    console.log('   3. Delete duplicate files');
    console.log('   4. Run tests to verify no breakage');
  }
  
  if (nameOnlyCount > 0) {
    console.log('\n⚠️  Review name duplicates:');
    console.log('   1. Check if they serve different purposes');
    console.log('   2. Consider renaming if they differ significantly');
    console.log('   3. Merge if they\'re similar implementations');
  }
  
  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.length,
    duplicatesByName: nameDuplicates,
    exactDuplicates: exactDuplicates,
    summary: {
      exactDuplicateCount: exactCount,
      nameOnlyDuplicateCount: nameOnlyCount
    }
  };
  
  const reportPath = path.join(ROOT_DIR, 'reports', 'duplicate-routes-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n💾 Detailed report saved to: reports/duplicate-routes-analysis.json');
  console.log('\n✨ Analysis complete!\n');
}

if (require.main === module) {
  main();
}

module.exports = { getJSFiles, findDuplicatesByName, findExactDuplicates };
