#!/usr/bin/env node
/**
 * Consolidated Test Report Collector
 * Aggregates all test results into unified JSON and Markdown reports
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class TestReportCollector {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      testRun: {
        id: 'test-run-' + Date.now(),
        environment: process.env.NODE_ENV || 'development',
        branch: process.env.GITHUB_REF_NAME || 'local',
        commit: process.env.GITHUB_SHA || 'unknown'
      },
      summary: {},
      results: {},
      metrics: {},
      artifacts: []
    };
  }

  async collect() {
    console.log('📊 Collecting Test Reports...\n');
    
    // 1. Collect Jest/Unit test results
    await this.collectJestResults();
    
    // 2. Collect Playwright test results
    await this.collectPlaywrightResults();
    
    // 3. Collect route manifest
    await this.collectRouteManifest();
    
    // 4. Collect test matrix
    await this.collectTestMatrix();
    
    // 5. Collect performance results
    await this.collectPerformanceResults();
    
    // 6. Collect MCP health data
    await this.collectMCPHealth();
    
    // 7. Collect environment validation
    await this.collectEnvironmentValidation();
    
    // 8. Calculate aggregate metrics
    this.calculateMetrics();
    
    // 9. Write reports
    await this.writeReports();
    
    // 10. Display summary
    this.displaySummary();
  }

  async collectJestResults() {
    console.log('🧪 Collecting Jest results...');
    
    const jestFiles = glob.sync('coverage/coverage-final.json');
    if (jestFiles.length > 0) {
      try {
        const coverageData = JSON.parse(fs.readFileSync(jestFiles[0], 'utf8'));
        
        // Extract coverage summary
        let totalLines = 0;
        let coveredLines = 0;
        
        for (const file in coverageData) {
          const fileCoverage = coverageData[file];
          if (fileCoverage.s) {
            totalLines += Object.keys(fileCoverage.s).length;
            coveredLines += Object.values(fileCoverage.s).filter(hits => hits > 0).length;
          }
        }
        
        this.reportData.results.jest = {
          coverage: {
            totalLines,
            coveredLines,
            percentage: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
          },
          files: Object.keys(coverageData).length
        };
        
        console.log(`   ✅ Coverage: ${this.reportData.results.jest.coverage.percentage}%`);
      } catch (error) {
        console.log(`   ⚠️  Error reading Jest results: ${error.message}`);
      }
    } else {
      console.log('   ℹ️  No Jest coverage data found');
    }
  }

  async collectPlaywrightResults() {
    console.log('🎭 Collecting Playwright results...');
    
    const playwrightFiles = glob.sync('reports/playwright-results.json');
    if (playwrightFiles.length > 0) {
      try {
        const playwrightData = JSON.parse(fs.readFileSync(playwrightFiles[0], 'utf8'));
        
        this.reportData.results.playwright = {
          suites: playwrightData.suites?.length || 0,
          tests: playwrightData.tests?.length || 0,
          passed: playwrightData.tests?.filter(t => t.status === 'passed').length || 0,
          failed: playwrightData.tests?.filter(t => t.status === 'failed').length || 0,
          duration: playwrightData.stats?.duration || 0
        };
        
        console.log(`   ✅ Tests: ${this.reportData.results.playwright.passed}/${this.reportData.results.playwright.tests} passed`);
      } catch (error) {
        console.log(`   ⚠️  Error reading Playwright results: ${error.message}`);
      }
    } else {
      console.log('   ℹ️  No Playwright results found');
    }
  }

  async collectRouteManifest() {
    console.log('🛣️  Collecting route manifest...');
    
    const manifestFile = 'reports/route-manifest.json';
    if (fs.existsSync(manifestFile)) {
      try {
        const manifestData = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
        
        this.reportData.results.routes = {
          total: manifestData.summary.totalRoutes,
          tested: manifestData.summary.testedRoutes,
          coverage: manifestData.summary.coveragePercent,
          categories: manifestData.categories
        };
        
        console.log(`   ✅ Route coverage: ${this.reportData.results.routes.coverage}%`);
      } catch (error) {
        console.log(`   ⚠️  Error reading route manifest: ${error.message}`);
      }
    } else {
      console.log('   ℹ️  No route manifest found');
    }
  }

  async collectTestMatrix() {
    console.log('🔨 Collecting test matrix...');
    
    const matrixFile = 'reports/test-matrix.json';
    if (fs.existsSync(matrixFile)) {
      try {
        const matrixData = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
        
        this.reportData.results.testMatrix = {
          selectedTests: matrixData.summary.selectedTests,
          totalTestTypes: matrixData.summary.totalTests,
          changedFiles: matrixData.changedFiles.length,
          recommendations: matrixData.recommendations
        };
        
        console.log(`   ✅ Selected tests: ${matrixData.summary.selectedTests.join(', ')}`);
      } catch (error) {
        console.log(`   ⚠️  Error reading test matrix: ${error.message}`);
      }
    } else {
      console.log('   ℹ️  No test matrix found');
    }
  }

  async collectPerformanceResults() {
    console.log('⚡ Collecting performance results...');
    
    // Look for performance data in session storage or files
    const perfFiles = glob.sync('reports/perf-*.json');
    if (perfFiles.length > 0) {
      try {
        const perfData = JSON.parse(fs.readFileSync(perfFiles[0], 'utf8'));
        
        this.reportData.results.performance = {
          chatLatencyP95: perfData.statistics?.p95 || 'N/A',
          endpoint: perfData.endpoint || '/api/chat',
          passed: perfData.passed || false
        };
        
        console.log(`   ✅ Chat P95 latency: ${this.reportData.results.performance.chatLatencyP95}ms`);
      } catch (error) {
        console.log(`   ⚠️  Error reading performance results: ${error.message}`);
      }
    } else {
      console.log('   ℹ️  No performance results found');
      this.reportData.results.performance = {
        chatLatencyP95: 'Not measured',
        endpoint: '/api/chat',
        passed: null
      };
    }
  }

  async collectMCPHealth() {
    console.log('🤖 Collecting MCP health data...');
    
    const mcpFiles = glob.sync('reports/mcp-health.md');
    if (mcpFiles.length > 0) {
      try {
        const mcpContent = fs.readFileSync(mcpFiles[0], 'utf8');
        
        // Parse MCP health info (basic parsing)
        const lines = mcpContent.split('\n');
        let healthyServers = 0;
        let totalServers = 0;
        
        for (const line of lines) {
          if (line.includes('✅') || line.includes('Healthy')) {
            healthyServers++;
            totalServers++;
          } else if (line.includes('❌') || line.includes('Failed')) {
            totalServers++;
          }
        }
        
        this.reportData.results.mcp = {
          healthyServers,
          totalServers,
          healthPercentage: totalServers > 0 ? Math.round((healthyServers / totalServers) * 100) : 0
        };
        
        console.log(`   ✅ MCP health: ${healthyServers}/${totalServers} servers healthy`);
      } catch (error) {
        console.log(`   ⚠️  Error reading MCP health: ${error.message}`);
      }
    } else {
      console.log('   ℹ️  No MCP health data found');
      this.reportData.results.mcp = {
        healthyServers: 0,
        totalServers: 0,
        healthPercentage: 0
      };
    }
  }

  async collectEnvironmentValidation() {
    console.log('🔍 Collecting environment validation...');
    
    // Try to run environment validation
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/env-validate.js', { stdio: 'pipe' });
      
      this.reportData.results.environment = {
        valid: true,
        missingSecrets: 0,
        errors: []
      };
      
      console.log('   ✅ Environment validation passed');
    } catch (error) {
      this.reportData.results.environment = {
        valid: false,
        missingSecrets: 1, // Estimate
        errors: [error.message.substring(0, 200)]
      };
      
      console.log('   ❌ Environment validation failed');
    }
  }

  calculateMetrics() {
    console.log('📊 Calculating aggregate metrics...');
    
    const results = this.reportData.results;
    
    this.reportData.metrics = {
      // Coverage metrics
      apiRouteCoveragePercent: results.routes?.coverage || 0,
      testCodeCoveragePercent: results.jest?.coverage?.percentage || 0,
      
      // Test metrics
      totalTestsRun: (results.playwright?.tests || 0) + (results.jest?.files || 0),
      testsPassedPercent: this.calculatePassRate(),
      
      // Performance metrics
      latencyP95Chat: results.performance?.chatLatencyP95 || 'N/A',
      
      // System health
      mcpFailedServers: (results.mcp?.totalServers || 0) - (results.mcp?.healthyServers || 0),
      envSecretsMissingCount: results.environment?.missingSecrets || 0,
      
      // Change impact
      changedCriticalModules: this.identifyCriticalChanges(),
      
      // Visual coverage
      visualCoveragePercent: this.calculateVisualCoverage()
    };
  }

  calculatePassRate() {
    const playwright = this.reportData.results.playwright || {};
    const totalTests = playwright.tests || 0;
    const passedTests = playwright.passed || 0;
    
    if (totalTests === 0) return 0;
    return Math.round((passedTests / totalTests) * 100);
  }

  identifyCriticalChanges() {
    const matrix = this.reportData.results.testMatrix;
    if (!matrix || !matrix.selectedTests) return [];
    
    // Identify critical modules based on selected tests
    const criticalTests = ['performance', 'e2e'];
    return matrix.selectedTests.filter(test => criticalTests.includes(test));
  }

  calculateVisualCoverage() {
    // Count visual test files
    const visualTests = glob.sync('tests/visual/**/*.spec.ts');
    const baselineImages = glob.sync('visual-baseline/*.png');
    
    if (visualTests.length === 0) return 0;
    return Math.round((baselineImages.length / (visualTests.length * 5)) * 100); // Estimate 5 screenshots per test
  }

  async writeReports() {
    console.log('📝 Writing reports...');
    
    // Ensure reports directory exists
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }
    
    // Write JSON report
    const jsonPath = 'reports/test-run-report.json';
    fs.writeFileSync(jsonPath, JSON.stringify(this.reportData, null, 2));
    console.log(`   ✅ JSON report: ${jsonPath}`);
    
    // Write Markdown report
    const markdownPath = 'reports/test-run-report.md';
    const markdownContent = this.generateMarkdownReport();
    fs.writeFileSync(markdownPath, markdownContent);
    console.log(`   ✅ Markdown report: ${markdownPath}`);
  }

  generateMarkdownReport() {
    const data = this.reportData;
    const metrics = data.metrics;
    const results = data.results;
    
    return `# EchoTune AI - Test Run Report

**Generated:** ${data.timestamp}  
**Environment:** ${data.testRun.environment}  
**Branch:** ${data.testRun.branch}  
**Commit:** ${data.testRun.commit}

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| API Route Coverage | ${metrics.apiRouteCoveragePercent}% | ${metrics.apiRouteCoveragePercent >= 80 ? '✅' : '⚠️'} |
| Test Code Coverage | ${metrics.testCodeCoveragePercent}% | ${metrics.testCodeCoveragePercent >= 75 ? '✅' : '⚠️'} |
| Tests Passed | ${metrics.testsPassedPercent}% | ${metrics.testsPassedPercent >= 90 ? '✅' : '❌'} |
| Chat P95 Latency | ${metrics.latencyP95Chat}ms | ${typeof metrics.latencyP95Chat === 'number' && metrics.latencyP95Chat < 2000 ? '✅' : '⚠️'} |
| MCP Failed Servers | ${metrics.mcpFailedServers} | ${metrics.mcpFailedServers === 0 ? '✅' : '❌'} |
| Missing Secrets | ${metrics.envSecretsMissingCount} | ${metrics.envSecretsMissingCount === 0 ? '✅' : '❌'} |

## 🧪 Test Results

### Unit & Integration Tests (Jest)
- **Coverage:** ${results.jest?.coverage?.percentage || 0}%
- **Files Tested:** ${results.jest?.files || 0}
- **Lines Covered:** ${results.jest?.coverage?.coveredLines || 0}/${results.jest?.coverage?.totalLines || 0}

### End-to-End Tests (Playwright)
- **Total Tests:** ${results.playwright?.tests || 0}
- **Passed:** ${results.playwright?.passed || 0}
- **Failed:** ${results.playwright?.failed || 0}
- **Duration:** ${results.playwright?.duration || 0}ms

## 🛣️ API Coverage

- **Total Routes:** ${results.routes?.total || 0}
- **Tested Routes:** ${results.routes?.tested || 0}
- **Coverage:** ${results.routes?.coverage || 0}%

${results.routes?.categories ? this.formatCategoryTable(results.routes.categories) : ''}

## ⚡ Performance Metrics

- **Chat API P95 Latency:** ${metrics.latencyP95Chat}ms
- **Performance Tests:** ${results.performance?.passed ? '✅ Passed' : '❌ Failed or Not Run'}

## 🤖 MCP Server Health

- **Healthy Servers:** ${results.mcp?.healthyServers || 0}/${results.mcp?.totalServers || 0}
- **Health Percentage:** ${results.mcp?.healthPercentage || 0}%

## 🔧 Test Selection

**Selected Test Types:** ${results.testMatrix?.selectedTests?.join(', ') || 'None'}  
**Changed Files:** ${results.testMatrix?.changedFiles || 0}

${results.testMatrix?.recommendations?.length > 0 ? `
**Recommendations:**
${results.testMatrix.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

## 🎯 Quality Gates

${this.generateQualityGates()}

## 📁 Artifacts

- JSON Report: \`reports/test-run-report.json\`
- Route Manifest: \`reports/route-manifest.json\`
- Test Matrix: \`reports/test-matrix.json\`
- Visual Baselines: \`visual-baseline/\`

---
*Report generated by EchoTune AI Testing Framework v1.0.0*
`;
  }

  formatCategoryTable(categories) {
    let table = '\n### By Category\n\n| Category | Tested | Total | Coverage |\n|----------|--------|-------|----------|\n';
    
    for (const [category, stats] of Object.entries(categories)) {
      table += `| ${category} | ${stats.tested} | ${stats.total} | ${stats.coverage}% |\n`;
    }
    
    return table;
  }

  generateQualityGates() {
    const metrics = this.reportData.metrics;
    const gates = [
      { name: 'API Route Coverage', value: metrics.apiRouteCoveragePercent, threshold: 80, unit: '%' },
      { name: 'Test Coverage', value: metrics.testCodeCoveragePercent, threshold: 75, unit: '%' },
      { name: 'Test Pass Rate', value: metrics.testsPassedPercent, threshold: 90, unit: '%' },
      { name: 'MCP Server Health', value: 100 - (metrics.mcpFailedServers * 10), threshold: 90, unit: '%' },
      { name: 'Environment Secrets', value: metrics.envSecretsMissingCount, threshold: 0, unit: '', invert: true }
    ];
    
    let gateResults = '';
    
    for (const gate of gates) {
      const passed = gate.invert ? gate.value <= gate.threshold : gate.value >= gate.threshold;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      gateResults += `- **${gate.name}:** ${gate.value}${gate.unit} (threshold: ${gate.threshold}${gate.unit}) - ${status}\n`;
    }
    
    return gateResults;
  }

  displaySummary() {
    console.log('\n📊 Test Report Summary');
    console.log('='.repeat(50));
    
    const metrics = this.reportData.metrics;
    
    console.log(`📈 Key Metrics:`);
    console.log(`   API Route Coverage: ${metrics.apiRouteCoveragePercent}%`);
    console.log(`   Test Code Coverage: ${metrics.testCodeCoveragePercent}%`);
    console.log(`   Tests Passed: ${metrics.testsPassedPercent}%`);
    console.log(`   Chat P95 Latency: ${metrics.latencyP95Chat}ms`);
    console.log(`   MCP Failed Servers: ${metrics.mcpFailedServers}`);
    
    console.log(`\n📁 Reports Generated:`);
    console.log(`   • reports/test-run-report.json`);
    console.log(`   • reports/test-run-report.md`);
    
    console.log('\n✅ Test report collection completed!');
  }
}

// Run collection if called directly
if (require.main === module) {
  const collector = new TestReportCollector();
  collector.collect().catch(console.error);
}

module.exports = TestReportCollector;