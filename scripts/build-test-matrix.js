#!/usr/bin/env node
/**
 * Test Matrix Builder for EchoTune AI
 * Uses git diff and MCP servers to intelligently select tests based on changes
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class TestMatrixBuilder {
  constructor() {
    this.testMatrix = {
      unit: { selected: false, reason: '' },
      integration: { selected: false, reason: '' },
      e2e: { selected: false, reason: '' },
      visual: { selected: false, reason: '' },
      performance: { selected: false, reason: '' }
    };
    this.changedFiles = [];
    this.changedDirectories = new Set();
    this.impactRules = this.defineImpactRules();
  }

  defineImpactRules() {
    return {
      // Critical paths that require full testing
      critical: {
        patterns: ['package.json', 'server.js', 'src/server.js', '.env', 'docker'],
        tests: ['unit', 'integration', 'e2e', 'performance']
      },
      
      // Recommendation engine changes
      recommendation: {
        patterns: ['reco/', 'src/recommendation', 'src/ml', 'recommendation'],
        tests: ['unit', 'integration', 'performance']
      },
      
      // Chat and AI features
      chat: {
        patterns: ['src/chat', 'src/ai', 'chat/', 'ai/', 'llm'],
        tests: ['unit', 'integration', 'e2e']
      },
      
      // Frontend and UI changes
      frontend: {
        patterns: ['src/frontend', 'frontend/', 'public/', 'static/', 'pwa/', '.js', '.css', '.html'],
        tests: ['visual', 'e2e']
      },
      
      // Event ingestion and data processing
      events: {
        patterns: ['events/', 'src/ingestion', 'scripts/'],
        tests: ['integration', 'performance']
      },
      
      // Database and persistence
      database: {
        patterns: ['src/database', 'database/', 'mongodb', 'redis', 'migration'],
        tests: ['unit', 'integration']
      },
      
      // API routes and endpoints
      api: {
        patterns: ['src/api', 'src/routes', 'api/', 'routes/'],
        tests: ['unit', 'integration']
      },
      
      // MCP servers and automation
      mcp: {
        patterns: ['mcp-server', 'mcp-servers', 'scripts/mcp'],
        tests: ['integration', 'e2e']
      },
      
      // Authentication and security
      auth: {
        patterns: ['src/auth', 'auth/', 'security/', 'oauth'],
        tests: ['unit', 'integration', 'e2e']
      }
    };
  }

  async build() {
    console.log('🔨 Building Test Matrix...\n');
    
    // 1. Get changed files from git
    await this.getChangedFiles();
    
    // 2. Apply impact rules
    this.applyImpactRules();
    
    // 3. Use MCP intelligence (if available)
    await this.applyMCPIntelligence();
    
    // 4. Ensure minimum test coverage
    this.ensureMinimumCoverage();
    
    // 5. Load route manifest for coverage analysis
    await this.analyzeRouteCoverage();
    
    // 6. Generate final matrix
    const matrix = this.generateMatrix();
    
    // 7. Write matrix file
    await this.writeMatrix(matrix);
    
    // 8. Display summary
    this.displaySummary(matrix);
    
    return matrix;
  }

  async getChangedFiles() {
    console.log('📂 Analyzing changed files...');
    
    try {
      // Try to get diff against main branch
      const { stdout } = await execAsync('git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null || echo ""');
      this.changedFiles = stdout.trim().split('\n').filter(f => f.length > 0);
      
      if (this.changedFiles.length === 0) {
        // Fallback: use environment variable for testing
        const simulatedChanges = process.env.SIMULATED_CHANGES;
        if (simulatedChanges) {
          this.changedFiles = simulatedChanges.split(',').map(f => f.trim());
          console.log('  Using simulated changes for testing');
        } else {
          // Default: assume working directory changes
          this.changedFiles = ['src/', 'scripts/', 'package.json'];
          console.log('  No git changes detected - using default test selection');
        }
      }
      
      // Extract changed directories
      this.changedFiles.forEach(file => {
        const dir = path.dirname(file);
        this.changedDirectories.add(dir);
      });
      
      console.log(`  Found ${this.changedFiles.length} changed files`);
      console.log(`  Changed directories: ${Array.from(this.changedDirectories).join(', ')}`);
      
    } catch (error) {
      console.warn(`  ⚠️  Git diff failed: ${error.message}`);
      // Fallback to safe defaults
      this.changedFiles = ['src/', 'package.json'];
      this.changedDirectories.add('src');
    }
  }

  applyImpactRules() {
    console.log('🎯 Applying impact rules...');
    
    for (const [category, rule] of Object.entries(this.impactRules)) {
      const hasMatch = rule.patterns.some(pattern => {
        return this.changedFiles.some(file => {
          return file.toLowerCase().includes(pattern.toLowerCase()) ||
                 file.toLowerCase().endsWith(pattern.toLowerCase());
        });
      });
      
      if (hasMatch) {
        console.log(`  📌 Detected ${category} changes`);
        rule.tests.forEach(testType => {
          this.testMatrix[testType].selected = true;
          this.testMatrix[testType].reason += `${category} changes; `;
        });
      }
    }
  }

  async applyMCPIntelligence() {
    console.log('🤖 Applying MCP intelligence...');
    
    try {
      // Try to use MCP git server for enhanced analysis
      const mcpAnalysis = await this.getMCPAnalysis();
      if (mcpAnalysis) {
        console.log('  ✅ MCP analysis available');
        this.integrateQCPAnalysis(mcpAnalysis);
      } else {
        console.log('  ℹ️  MCP analysis not available - using fallback logic');
        this.applyFallbackLogic();
      }
    } catch (error) {
      console.log(`  ⚠️  MCP integration failed: ${error.message}`);
      this.applyFallbackLogic();
    }
  }

  async getMCPAnalysis() {
    // Placeholder for MCP server integration
    // In a real implementation, this would connect to MCP servers
    // For now, return null to use fallback logic
    return null;
  }

  integrateQCPAnalysis(analysis) {
    // Integrate MCP server analysis results
    // This would process results from filesystem, memory, and git MCP servers
    console.log('  Processing MCP analysis results...');
  }

  applyFallbackLogic() {
    // Enhanced fallback logic based on file patterns and heuristics
    const criticalFiles = ['package.json', 'server.js', 'src/server.js', '.env'];
    const hasCriticalChanges = this.changedFiles.some(file => 
      criticalFiles.some(critical => file.includes(critical))
    );
    
    if (hasCriticalChanges) {
      console.log('  📢 Critical files changed - enabling comprehensive testing');
      Object.keys(this.testMatrix).forEach(testType => {
        this.testMatrix[testType].selected = true;
        this.testMatrix[testType].reason += 'critical file changes; ';
      });
    }
  }

  ensureMinimumCoverage() {
    console.log('✅ Ensuring minimum test coverage...');
    
    // Always run unit and integration tests unless explicitly disabled
    if (!this.testMatrix.unit.selected) {
      this.testMatrix.unit.selected = true;
      this.testMatrix.unit.reason += 'minimum coverage; ';
    }
    
    if (!this.testMatrix.integration.selected) {
      this.testMatrix.integration.selected = true;
      this.testMatrix.integration.reason += 'minimum coverage; ';
    }
  }

  async analyzeRouteCoverage() {
    console.log('🛣️  Analyzing route coverage...');
    
    try {
      const manifestPath = 'reports/route-manifest.json';
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Find routes affected by changed files
        const affectedRoutes = manifest.routes.filter(route => {
          return this.changedFiles.some(file => {
            const routeFile = route.file || '';
            return routeFile.includes(file) || file.includes(path.dirname(routeFile));
          });
        });
        
        console.log(`  Found ${affectedRoutes.length} potentially affected routes`);
        
        // If affected routes are untested, prioritize integration tests
        const untestedAffected = affectedRoutes.filter(route => !route.hasTest);
        if (untestedAffected.length > 0) {
          console.log(`  ⚠️  ${untestedAffected.length} affected routes lack tests`);
          this.testMatrix.integration.selected = true;
          this.testMatrix.integration.reason += 'untested affected routes; ';
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Route analysis failed: ${error.message}`);
    }
  }

  generateMatrix() {
    const timestamp = new Date().toISOString();
    
    return {
      generated: timestamp,
      changedFiles: this.changedFiles,
      changedDirectories: Array.from(this.changedDirectories),
      testMatrix: this.testMatrix,
      summary: {
        selectedTests: Object.keys(this.testMatrix).filter(key => this.testMatrix[key].selected),
        totalTests: Object.keys(this.testMatrix).length,
        selectedCount: Object.values(this.testMatrix).filter(t => t.selected).length
      },
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze test selection and provide recommendations
    if (this.testMatrix.visual.selected && !this.testMatrix.e2e.selected) {
      recommendations.push('Consider enabling E2E tests when visual tests are selected');
    }
    
    if (this.testMatrix.performance.selected) {
      recommendations.push('Performance tests selected - ensure adequate test duration');
    }
    
    if (this.changedFiles.some(f => f.includes('frontend'))) {
      recommendations.push('Frontend changes detected - verify visual regression coverage');
    }
    
    return recommendations;
  }

  async writeMatrix(matrix) {
    const outputDir = 'reports';
    const outputFile = path.join(outputDir, 'test-matrix.json');
    
    // Ensure reports directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(matrix, null, 2));
    console.log(`📝 Test matrix written to ${outputFile}`);
  }

  displaySummary(matrix) {
    console.log('\n📊 Test Matrix Summary:');
    console.log('='.repeat(50));
    console.log(`Selected Tests: ${matrix.summary.selectedCount}/${matrix.summary.totalTests}`);
    console.log(`Tests to Run: ${matrix.summary.selectedTests.join(', ')}`);
    
    console.log('\nTest Selection Reasons:');
    for (const [testType, config] of Object.entries(matrix.testMatrix)) {
      const status = config.selected ? '✅' : '❌';
      const reason = config.reason.trim() || 'not triggered';
      console.log(`  ${status} ${testType}: ${reason}`);
    }
    
    if (matrix.recommendations.length > 0) {
      console.log('\nRecommendations:');
      matrix.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
    }
    
    console.log('='.repeat(50));
  }
}

// Run builder if called directly
if (require.main === module) {
  const builder = new TestMatrixBuilder();
  builder.build().catch(console.error);
}

module.exports = TestMatrixBuilder;