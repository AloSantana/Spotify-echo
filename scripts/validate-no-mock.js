#!/usr/bin/env node

/**
 * NO_MOCK Policy Validator
 * Ensures no mock data or random values in production recommendation code
 */

const fs = require('fs');
const path = require('path');

function scanDirectory(dir) {
  const results = [];
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        results.push(...scanDirectory(fullPath));
      } else if (file.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Skip test files
        if (fullPath.includes('test') || fullPath.includes('spec')) {
          continue;
        }
        
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Check for Math.random() but allow ID generation functions
          const isIdGeneration = line.includes('generateSpanId') || 
                                line.includes('generateTraceId') ||
                                line.includes('return Math.random().toString(16)');
          
          if (line.includes('Math.random()') && 
              !line.includes('// allowed:') && 
              !line.includes('// mock:') &&
              !isIdGeneration) {
            results.push({
              file: fullPath,
              line: index + 1,
              content: line.trim(),
              violation: 'Math.random() usage'
            });
          }
          
          // Check for mock/placeholder patterns
          const suspiciousPatterns = [
            /mock.*data/i,
            /placeholder.*data/i,
            /dummy.*data/i,
            /fake.*data/i,
            /sample.*data/i
          ];
          
          // Skip comments
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return;
          }
          
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(line) && !line.includes('// allowed:')) {
              results.push({
                file: fullPath,
                line: index + 1,
                content: line.trim(),
                violation: `Suspicious pattern: ${pattern.toString()}`
              });
            }
          }
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan ${dir}: ${error.message}`);
  }
  
  return results;
}

function main() {
  console.log('🔍 NO_MOCK Policy Validation');
  console.log('============================\n');
  
  // Scan recommendation directory
  console.log('Scanning src/recommendation/...');
  const recViolations = scanDirectory(path.join(__dirname, '../src/recommendation'));
  
  // Scan LLM provider directory
  console.log('Scanning src/llm/providers/...');
  const llmViolations = scanDirectory(path.join(__dirname, '../src/llm/providers'));
  
  // Scan services directory
  console.log('Scanning src/services/...');
  const serviceViolations = scanDirectory(path.join(__dirname, '../src/services'));
  
  const allViolations = [...recViolations, ...llmViolations, ...serviceViolations];
  
  console.log('\n📊 Validation Results');
  console.log('=====================\n');
  
  if (allViolations.length === 0) {
    console.log('✅ NO_MOCK policy compliance: PASSED');
    console.log('   No Math.random() or mock data patterns found in production code');
    process.exit(0);
  } else {
    console.log('❌ NO_MOCK policy compliance: FAILED');
    console.log(`   Found ${allViolations.length} violations:\n`);
    
    allViolations.forEach(violation => {
      console.log(`   ${violation.file}:${violation.line}`);
      console.log(`   ${violation.violation}`);
      console.log(`   ${violation.content}`);
      console.log('');
    });
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory };