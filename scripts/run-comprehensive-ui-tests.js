#!/usr/bin/env node

/**
 * Comprehensive UI Test Orchestrator
 * 
 * Manages the full lifecycle of browser automation testing:
 * - Environment validation using real .env
 * - Server startup and health checks
 * - Playwright test execution with screenshot capture
 * - MCP server validation
 * - Report generation and artifact management
 * 
 * @requires Real .env configuration
 * @requires npm dependencies installed
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

class ComprehensiveUITestOrchestrator {
  constructor() {
    this.runId = `ui-test-${Date.now()}`;
    this.startTime = Date.now();
    this.serverProcess = null;
    this.results = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      phases: {
        envValidation: { status: 'pending', details: {} },
        serverStartup: { status: 'pending', details: {} },
        mcpValidation: { status: 'pending', details: {} },
        uiTests: { status: 'pending', details: {} },
        cleanup: { status: 'pending', details: {} }
      },
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      screenshots: [],
      errors: [],
      recommendations: []
    };
    
    this.outputDir = path.join(process.cwd(), 'test-results', 'comprehensive-ui', this.runId);
    this.screenshotDir = path.join(process.cwd(), 'artifacts', 'screenshots', 'comprehensive-ui');
    this.reportDir = path.join(process.cwd(), 'reports');
    
    this.ensureDirectories();
  }
  
  ensureDirectories() {
    [this.outputDir, this.screenshotDir, this.reportDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '✓',
      'WARN': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
  
  async runCommand(command, options = {}) {
    this.log(`Executing: ${command}`, 'DEBUG');
    
    try {
      const { stdout, stderr } = await execPromise(command, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      return { success: true, stdout, stderr };
    } catch (error) {
      return { 
        success: false, 
        stdout: error.stdout || '', 
        stderr: error.stderr || '', 
        error: error.message 
      };
    }
  }
  
  async validateEnvironment() {
    this.log('Phase 1: Validating environment with real .env...', 'INFO');
    
    try {
      const result = await this.runCommand('npm run validate:env');
      
      this.results.phases.envValidation.status = result.success ? 'passed' : 'failed';
      this.results.phases.envValidation.details = {
        success: result.success,
        output: result.stdout,
        errors: result.stderr
      };
      
      if (result.success) {
        this.log('Environment validation PASSED', 'INFO');
        
        // Check for critical variables
        const hasSpotify = process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET;
        const hasLLM = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
        const hasMongoDB = process.env.MONGODB_URI;
        
        this.log(`  - Spotify OAuth: ${hasSpotify ? '✓' : '✗'}`, 'INFO');
        this.log(`  - LLM Provider: ${hasLLM ? '✓' : '✗'}`, 'INFO');
        this.log(`  - MongoDB: ${hasMongoDB ? '✓' : '✗'}`, 'INFO');
        
        return true;
      } else {
        this.log('Environment validation FAILED', 'ERROR');
        this.results.errors.push('Environment validation failed');
        return false;
      }
    } catch (error) {
      this.log(`Environment validation error: ${error.message}`, 'ERROR');
      this.results.phases.envValidation.status = 'error';
      this.results.errors.push(error.message);
      return false;
    }
  }
  
  async startServer() {
    this.log('Phase 2: Starting EchoTune AI server...', 'INFO');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['start'], {
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          PORT: process.env.PORT || '3000'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let startupOutput = '';
      const timeout = setTimeout(() => {
        this.log('Server startup timeout', 'ERROR');
        this.results.phases.serverStartup.status = 'timeout';
        resolve(false);
      }, 60000); // 60 second timeout
      
      this.serverProcess.stdout.on('data', (data) => {
        startupOutput += data.toString();
        const output = data.toString();
        
        // Look for server ready indicators
        if (output.includes('Server listening') || 
            output.includes('started') ||
            output.includes('ready') ||
            output.includes('listening on port')) {
          clearTimeout(timeout);
          this.log('Server started successfully', 'INFO');
          this.results.phases.serverStartup.status = 'passed';
          this.results.phases.serverStartup.details = { port: process.env.PORT || '3000' };
          
          // Wait a bit for full initialization
          setTimeout(() => resolve(true), 3000);
        }
      });
      
      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('ERROR') || error.includes('EADDRINUSE')) {
          this.log(`Server error: ${error}`, 'WARN');
        }
      });
      
      this.serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`Failed to start server: ${error.message}`, 'ERROR');
        this.results.phases.serverStartup.status = 'error';
        this.results.errors.push(`Server startup error: ${error.message}`);
        resolve(false);
      });
    });
  }
  
  async waitForHealth() {
    this.log('Waiting for server health check...', 'INFO');
    
    const maxAttempts = 30;
    const delayMs = 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.runCommand('curl -s http://localhost:3000/health');
        if (result.success && result.stdout.includes('"ok":true')) {
          this.log('Server health check PASSED', 'INFO');
          return true;
        }
      } catch (e) {
        // Continue trying
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    this.log('Server health check FAILED', 'ERROR');
    return false;
  }
  
  async validateMCPServers() {
    this.log('Phase 3: Validating MCP servers...', 'INFO');
    
    try {
      // Quick MCP health check
      const result = await this.runCommand('npm run mcp:health:enhanced', { 
        timeout: 30000 
      });
      
      this.results.phases.mcpValidation.status = result.success ? 'passed' : 'warning';
      this.results.phases.mcpValidation.details = {
        success: result.success,
        output: result.stdout
      };
      
      if (result.success) {
        this.log('MCP validation completed', 'INFO');
      } else {
        this.log('MCP validation had warnings (non-blocking)', 'WARN');
      }
      
      return true; // Don't block on MCP failures
    } catch (error) {
      this.log(`MCP validation error (non-blocking): ${error.message}`, 'WARN');
      this.results.phases.mcpValidation.status = 'warning';
      return true;
    }
  }
  
  async runUITests() {
    this.log('Phase 4: Running comprehensive UI tests with Playwright...', 'INFO');
    
    try {
      const result = await this.runCommand(
        'npx playwright test tests/e2e/comprehensive-ui-automation.spec.js --project=desktop-chromium --reporter=json',
        { timeout: 300000 } // 5 minute timeout for full test suite
      );
      
      this.results.phases.uiTests.status = result.success ? 'passed' : 'failed';
      this.results.phases.uiTests.details = {
        success: result.success,
        output: result.stdout,
        errors: result.stderr
      };
      
      // Parse test results if available
      try {
        const resultsPath = path.join(process.cwd(), 'test-results', 'playwright-results.json');
        if (fs.existsSync(resultsPath)) {
          const testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
          this.results.summary.totalTests = testResults.stats?.expected || 0;
          this.results.summary.passed = testResults.stats?.passed || 0;
          this.results.summary.failed = testResults.stats?.failed || 0;
          this.results.summary.skipped = testResults.stats?.skipped || 0;
        }
      } catch (e) {
        this.log('Could not parse test results', 'DEBUG');
      }
      
      // Collect screenshots
      if (fs.existsSync(this.screenshotDir)) {
        const screenshots = fs.readdirSync(this.screenshotDir)
          .filter(f => f.endsWith('.png'))
          .map(f => path.join(this.screenshotDir, f));
        
        this.results.screenshots = screenshots;
        this.log(`Captured ${screenshots.length} screenshots`, 'INFO');
      }
      
      if (result.success) {
        this.log('UI tests PASSED', 'INFO');
      } else {
        this.log('UI tests FAILED', 'ERROR');
        this.results.errors.push('UI test execution failed');
      }
      
      return result.success;
    } catch (error) {
      this.log(`UI test error: ${error.message}`, 'ERROR');
      this.results.phases.uiTests.status = 'error';
      this.results.errors.push(error.message);
      return false;
    }
  }
  
  async cleanup() {
    this.log('Phase 5: Cleaning up...', 'INFO');
    
    try {
      if (this.serverProcess) {
        this.log('Stopping server...', 'INFO');
        this.serverProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }
      
      this.results.phases.cleanup.status = 'passed';
      this.log('Cleanup completed', 'INFO');
      return true;
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'ERROR');
      this.results.phases.cleanup.status = 'error';
      return false;
    }
  }
  
  async generateReport() {
    this.log('Generating comprehensive report...', 'INFO');
    
    const duration = Date.now() - this.startTime;
    this.results.summary.duration = duration;
    
    const report = {
      title: '🧪 EchoTune AI - Comprehensive UI Test Report',
      runId: this.runId,
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(2)}s`,
      summary: this.results.summary,
      phases: this.results.phases,
      screenshots: this.results.screenshots,
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    };
    
    // Write JSON report
    const jsonPath = path.join(this.reportDir, `ui-test-report-${this.runId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Write Markdown report
    const mdPath = path.join(this.reportDir, 'UI_TEST_REPORT.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report));
    
    this.log(`Report generated: ${jsonPath}`, 'INFO');
    this.log(`Markdown report: ${mdPath}`, 'INFO');
    
    return report;
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.errors.length > 0) {
      recommendations.push('Review errors and address failures before production deployment');
    }
    
    if (this.results.summary.failed > 0) {
      recommendations.push('Fix failing tests to ensure UI stability');
    }
    
    if (this.results.screenshots.length < 10) {
      recommendations.push('Ensure comprehensive screenshot coverage for all UI states');
    }
    
    return recommendations;
  }
  
  generateMarkdownReport(report) {
    const allPassed = Object.values(report.phases).every(p => p.status === 'passed');
    const status = allPassed ? '✅ PASSED' : '❌ FAILED';
    
    return `# 🧪 EchoTune AI - Comprehensive UI Test Report

**Generated**: ${report.timestamp}
**Run ID**: ${report.runId}
**Duration**: ${report.duration}
**Status**: ${status}

## 📊 Test Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| Passed | ${report.summary.passed} ✅ |
| Failed | ${report.summary.failed} ❌ |
| Skipped | ${report.summary.skipped} ⏭️ |
| Screenshots | ${report.screenshots.length} 📸 |

## 🔍 Test Phases

${Object.entries(report.phases).map(([name, phase]) => `
### ${name.replace(/([A-Z])/g, ' $1').trim()}
- **Status**: ${phase.status.toUpperCase()}
- **Details**: ${JSON.stringify(phase.details, null, 2)}
`).join('\n')}

## 📸 Screenshots Captured

Total screenshots: **${report.screenshots.length}**

${report.screenshots.slice(0, 10).map(s => `- \`${path.basename(s)}\``).join('\n')}
${report.screenshots.length > 10 ? `\n... and ${report.screenshots.length - 10} more` : ''}

## ⚠️ Errors

${report.errors.length > 0 ? report.errors.map(e => `- ${e}`).join('\n') : '_No errors detected_'}

## 💡 Recommendations

${report.recommendations.length > 0 ? report.recommendations.map(r => `- ${r}`).join('\n') : '_No recommendations_'}

---

*Generated by EchoTune AI Comprehensive UI Test Suite*
*Using real .env configuration for authentic integration testing*
`;
  }
  
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  EchoTune AI - Comprehensive UI Test Orchestrator     ║');
    console.log('║  Using Real .env Configuration                         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    try {
      // Phase 1: Environment
      const envValid = await this.validateEnvironment();
      if (!envValid) {
        this.log('Environment validation failed - aborting', 'ERROR');
        await this.generateReport();
        process.exit(1);
      }
      
      // Phase 2: Server
      const serverStarted = await this.startServer();
      if (!serverStarted) {
        this.log('Server startup failed - aborting', 'ERROR');
        await this.cleanup();
        await this.generateReport();
        process.exit(1);
      }
      
      // Wait for health
      const healthy = await this.waitForHealth();
      if (!healthy) {
        this.log('Server health check failed - aborting', 'ERROR');
        await this.cleanup();
        await this.generateReport();
        process.exit(1);
      }
      
      // Phase 3: MCP (non-blocking)
      await this.validateMCPServers();
      
      // Phase 4: UI Tests
      const testsPassed = await this.runUITests();
      
      // Phase 5: Cleanup
      await this.cleanup();
      
      // Generate report
      const report = await this.generateReport();
      
      // Summary
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  Test Execution Complete                               ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
      console.log(`Duration: ${report.duration}`);
      console.log(`Status: ${testsPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Tests: ${report.summary.passed}/${report.summary.totalTests} passed`);
      console.log(`Screenshots: ${report.screenshots.length} captured`);
      console.log(`\nDetailed report: ${path.join(this.reportDir, 'UI_TEST_REPORT.md')}\n`);
      
      process.exit(testsPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'ERROR');
      await this.cleanup();
      await this.generateReport();
      process.exit(1);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const orchestrator = new ComprehensiveUITestOrchestrator();
  orchestrator.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveUITestOrchestrator;
