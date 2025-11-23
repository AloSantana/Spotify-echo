#!/usr/bin/env node

/**
 * Memory Store Module
 * Simple JSON-based persistence for error patterns and fixes
 * Helps the agent learn from past failures and successes
 */

const fs = require('fs');
const path = require('path');

class MemoryStore {
  constructor(memoryDir = '.agent-memory') {
    this.memoryDir = path.join(process.cwd(), memoryDir);
    this.errorPatternsFile = path.join(this.memoryDir, 'error-patterns.json');
    this.fixHistoryFile = path.join(this.memoryDir, 'fix-history.json');
    this.metadataFile = path.join(this.memoryDir, 'metadata.json');
    
    this.ensureMemoryDir();
  }

  /**
   * Ensure memory directory exists
   */
  ensureMemoryDir() {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  /**
   * Load JSON file or return default value
   */
  loadJson(filePath, defaultValue = []) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Warning: Could not load ${filePath}:`, error.message);
    }
    return defaultValue;
  }

  /**
   * Save JSON file
   */
  saveJson(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Store an error pattern
   * @param {Object} pattern - Error pattern to store
   */
  storeErrorPattern(pattern) {
    const patterns = this.loadJson(this.errorPatternsFile);
    
    const entry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      category: pattern.category,
      severity: pattern.severity,
      errorSnippet: pattern.errorSnippet,
      command: pattern.command || 'unknown',
      matchedPatterns: pattern.matchedPatterns || [],
      context: pattern.context || {}
    };

    patterns.push(entry);
    
    // Keep only last 100 patterns
    if (patterns.length > 100) {
      patterns.splice(0, patterns.length - 100);
    }

    this.saveJson(this.errorPatternsFile, patterns);
    return entry.id;
  }

  /**
   * Store a fix attempt
   * @param {Object} fix - Fix attempt to store
   */
  storeFix(fix) {
    const history = this.loadJson(this.fixHistoryFile);
    
    const entry = {
      id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      errorId: fix.errorId || null,
      errorCategory: fix.errorCategory,
      strategy: fix.strategy,
      success: fix.success,
      message: fix.message,
      duration: fix.duration || 0,
      context: fix.context || {}
    };

    history.push(entry);
    
    // Keep only last 200 fixes
    if (history.length > 200) {
      history.splice(0, history.length - 200);
    }

    this.saveJson(this.fixHistoryFile, history);
    return entry.id;
  }

  /**
   * Get all error patterns
   */
  getErrorPatterns() {
    return this.loadJson(this.errorPatternsFile);
  }

  /**
   * Get fix history
   */
  getFixHistory() {
    return this.loadJson(this.fixHistoryFile);
  }

  /**
   * Find similar error patterns
   * @param {string} category - Error category to match
   * @param {number} limit - Maximum number of results
   */
  findSimilarErrors(category, limit = 5) {
    const patterns = this.getErrorPatterns();
    return patterns
      .filter(p => p.category === category)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Find successful fixes for a category
   * @param {string} category - Error category
   * @param {number} limit - Maximum number of results
   */
  findSuccessfulFixes(category, limit = 5) {
    const history = this.getFixHistory();
    return history
      .filter(f => f.errorCategory === category && f.success)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get statistics about errors and fixes
   */
  getStatistics() {
    const patterns = this.getErrorPatterns();
    const history = this.getFixHistory();

    const errorsByCategory = {};
    patterns.forEach(p => {
      errorsByCategory[p.category] = (errorsByCategory[p.category] || 0) + 1;
    });

    const fixesByStrategy = {};
    const successRates = {};
    history.forEach(f => {
      fixesByStrategy[f.strategy] = (fixesByStrategy[f.strategy] || 0) + 1;
      
      if (!successRates[f.strategy]) {
        successRates[f.strategy] = { total: 0, successful: 0 };
      }
      successRates[f.strategy].total++;
      if (f.success) {
        successRates[f.strategy].successful++;
      }
    });

    // Calculate success rates
    Object.keys(successRates).forEach(strategy => {
      const { total, successful } = successRates[strategy];
      successRates[strategy].rate = total > 0 ? (successful / total * 100).toFixed(1) : 0;
    });

    return {
      totalErrors: patterns.length,
      totalFixes: history.length,
      errorsByCategory,
      fixesByStrategy,
      successRates,
      mostCommonError: Object.entries(errorsByCategory)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      mostSuccessfulStrategy: Object.entries(successRates)
        .sort((a, b) => b[1].rate - a[1].rate)[0]?.[0] || 'none'
    };
  }

  /**
   * Update metadata
   * @param {Object} metadata - Metadata to store
   */
  updateMetadata(metadata) {
    const current = this.loadJson(this.metadataFile, {});
    const updated = {
      ...current,
      ...metadata,
      lastUpdated: new Date().toISOString()
    };
    this.saveJson(this.metadataFile, updated);
    return updated;
  }

  /**
   * Get metadata
   */
  getMetadata() {
    return this.loadJson(this.metadataFile, {});
  }

  /**
   * Clear all memory (use with caution)
   */
  clear() {
    this.saveJson(this.errorPatternsFile, []);
    this.saveJson(this.fixHistoryFile, []);
    this.saveJson(this.metadataFile, {});
    console.log('✅ Memory cleared');
  }

  /**
   * Export memory to a single JSON file
   * @param {string} outputPath - Output file path
   */
  export(outputPath) {
    const data = {
      exportedAt: new Date().toISOString(),
      errorPatterns: this.getErrorPatterns(),
      fixHistory: this.getFixHistory(),
      metadata: this.getMetadata(),
      statistics: this.getStatistics()
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Memory exported to ${outputPath}`);
    return data;
  }

  /**
   * Generate a report
   */
  generateReport() {
    const stats = this.getStatistics();
    const metadata = this.getMetadata();

    const lines = [];
    lines.push('━'.repeat(80));
    lines.push('📊 AGENT MEMORY REPORT');
    lines.push('━'.repeat(80));
    lines.push('');
    lines.push(`Total Errors Recorded: ${stats.totalErrors}`);
    lines.push(`Total Fix Attempts: ${stats.totalFixes}`);
    lines.push(`Most Common Error: ${stats.mostCommonError}`);
    lines.push(`Most Successful Strategy: ${stats.mostSuccessfulStrategy}`);
    lines.push('');

    if (Object.keys(stats.errorsByCategory).length > 0) {
      lines.push('Errors by Category:');
      Object.entries(stats.errorsByCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
          lines.push(`  - ${category}: ${count}`);
        });
      lines.push('');
    }

    if (Object.keys(stats.successRates).length > 0) {
      lines.push('Fix Success Rates:');
      Object.entries(stats.successRates)
        .sort((a, b) => b[1].rate - a[1].rate)
        .forEach(([strategy, data]) => {
          lines.push(`  - ${strategy}: ${data.rate}% (${data.successful}/${data.total})`);
        });
      lines.push('');
    }

    if (metadata.lastUpdated) {
      lines.push(`Last Updated: ${metadata.lastUpdated}`);
    }

    lines.push('━'.repeat(80));
    return lines.join('\n');
  }
}

module.exports = MemoryStore;

// CLI usage
if (require.main === module) {
  const store = new MemoryStore();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'report':
      console.log(store.generateReport());
      break;

    case 'stats':
      console.log(JSON.stringify(store.getStatistics(), null, 2));
      break;

    case 'export':
      const outputPath = args[1] || 'agent-memory-export.json';
      store.export(outputPath);
      break;

    case 'clear':
      store.clear();
      break;

    default:
      console.log('Usage: node memory-store.js <command>');
      console.log('Commands:');
      console.log('  report - Display memory report');
      console.log('  stats - Display statistics as JSON');
      console.log('  export [file] - Export all memory to file');
      console.log('  clear - Clear all memory');
  }
}
