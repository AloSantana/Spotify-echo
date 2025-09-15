#!/usr/bin/env node

/**
 * Test Report Aggregator - Schema v2
 * Collects all test artifacts and generates comprehensive JSON + Markdown reports
 * Outputs: test-run-report.json, test-run-report.md
 */

const fs = require('fs');
const path = require('path');

class TestReportAggregator {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.screenshotDir = path.join(process.cwd(), 'BROWSERSCREENSHOT-TESTING');
    this.baselineDir = path.join(process.cwd(), 'visual-baseline');
    
    this.aggregatedReport = {
      schemaVersion: '2.0',
      timestamp: new Date().toISOString(),
      runId: this.generateRunId(),
      success: false,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        warningsCount: 0,
        errorsCount: 0
      },
      env: {},
      providers: {},
      recommendation: {},
      docker: {},
      screenshots: {},
      performance: {},
      routeCoverage: {},
      visualCoverage: {},
      mcp: {},
      warnings: [],
      failures: [],
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  generateRunId() {
    return `run-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  async aggregateReports() {
    console.log('📊 Aggregating test reports...\n');

    try {
      // 1. Load individual reports
      await this.loadEnvironmentReport();
      await this.loadProviderReports();
      await this.loadRecommendationReport();
      await this.loadDockerReport();
      await this.loadPerformanceReport();
      await this.loadScreenshotCoverage();
      await this.loadRouteCoverage();
      await this.loadVisualCoverage();
      await this.loadMCPReport();

      // 2. Calculate overall success
      this.calculateOverallSuccess();

      // 3. Generate comprehensive reports
      await this.writeJsonReport();
      await this.writeMarkdownReport();

      console.log('✅ Report aggregation completed successfully');

    } catch (error) {
      console.error('💥 Report aggregation failed:', error.message);
      this.aggregatedReport.failures.push({
        component: 'aggregator',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }

    return this.aggregatedReport;
  }

  async loadEnvironmentReport() {
    try {
      const envPath = path.join(this.reportsDir, 'env-validation.json');
      if (fs.existsSync(envPath)) {
        const envData = JSON.parse(fs.readFileSync(envPath, 'utf8'));
        this.aggregatedReport.env = {
          success: envData.success,
          requiredValid: envData.summary?.requiredValid || 0,
          totalRequired: envData.summary?.totalRequired || 0,
          optionalValid: envData.summary?.optionalValid || 0,
          testBypassAvailable: envData.summary?.testBypassAvailable || 0,
          hasPlaceholders: envData.summary?.hasPlaceholders || false,
          errors: envData.errors || [],
          warnings: envData.warnings || []
        };

        this.aggregatedReport.warnings.push(...(envData.warnings || []));
        if (!envData.success) {
          this.aggregatedReport.failures.push({
            component: 'environment',
            errors: envData.errors
          });
        }

        console.log(`✅ Environment report loaded: ${this.aggregatedReport.env.requiredValid}/${this.aggregatedReport.env.totalRequired} required vars`);
      } else {
        console.log('⚠️ Environment report not found');
        this.aggregatedReport.env.success = false;
        this.aggregatedReport.warnings.push('Environment validation report missing');
      }
    } catch (error) {
      console.error('❌ Failed to load environment report:', error.message);
      this.aggregatedReport.env.success = false;
      this.aggregatedReport.failures.push({
        component: 'environment',
        error: error.message
      });
    }
  }

  async loadProviderReports() {
    try {
      const statusPath = path.join(this.reportsDir, 'provider-status.json');
      const latencyPath = path.join(this.reportsDir, 'provider-latencies.json');
      
      if (fs.existsSync(statusPath)) {
        const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        
        this.aggregatedReport.providers = {
          total: statusData.providersTotal || 0,
          available: statusData.providersAvailable || 0,
          working: statusData.providersWorking || 0,
          tested: statusData.providersTested || 0,
          providers: statusData.providers || {},
          success: (statusData.providersWorking || 0) > 0
        };

        // Load latency data if available
        if (fs.existsSync(latencyPath)) {
          const latencyData = JSON.parse(fs.readFileSync(latencyPath, 'utf8'));
          this.aggregatedReport.providers.latencies = latencyData.latencies || {};
          this.aggregatedReport.providers.stats = latencyData.stats || {};
        }

        console.log(`✅ Provider reports loaded: ${this.aggregatedReport.providers.working}/${this.aggregatedReport.providers.available} working`);
      } else {
        console.log('⚠️ Provider reports not found');
        this.aggregatedReport.providers.success = false;
        this.aggregatedReport.warnings.push('Provider detection reports missing');
      }
    } catch (error) {
      console.error('❌ Failed to load provider reports:', error.message);
      this.aggregatedReport.providers.success = false;
      this.aggregatedReport.failures.push({
        component: 'providers',
        error: error.message
      });
    }
  }

  async loadRecommendationReport() {
    try {
      const recoPath = path.join(this.reportsDir, 'recommendation-engine.json');
      if (fs.existsSync(recoPath)) {
        const recoData = JSON.parse(fs.readFileSync(recoPath, 'utf8'));
        
        this.aggregatedReport.recommendation = {
          success: recoData.success,
          hybridAvailable: recoData.hybridEndpoint?.available || false,
          recommendationCount: recoData.hybridEndpoint?.recommendationCount || 0,
          fallbackUsed: recoData.fallbackUsed || false,
          hybridFlagState: recoData.hybridFlagState,
          totalLatency: recoData.totalLatency || 0,
          endpointsTested: (recoData.endpointsTested || []).length,
          errors: recoData.errors || [],
          warnings: recoData.warnings || []
        };

        this.aggregatedReport.warnings.push(...(recoData.warnings || []));
        if (!recoData.success) {
          this.aggregatedReport.failures.push({
            component: 'recommendations',
            errors: recoData.errors
          });
        }

        console.log(`✅ Recommendation report loaded: ${this.aggregatedReport.recommendation.success ? 'working' : 'failed'}`);
      } else {
        console.log('⚠️ Recommendation report not found');
        this.aggregatedReport.recommendation.success = false;
        this.aggregatedReport.warnings.push('Recommendation engine report missing');
      }
    } catch (error) {
      console.error('❌ Failed to load recommendation report:', error.message);
      this.aggregatedReport.recommendation.success = false;
      this.aggregatedReport.failures.push({
        component: 'recommendations',
        error: error.message
      });
    }
  }

  async loadDockerReport() {
    try {
      const dockerPath = path.join(this.reportsDir, 'docker-validation.json');
      if (fs.existsSync(dockerPath)) {
        const dockerData = JSON.parse(fs.readFileSync(dockerPath, 'utf8'));
        
        this.aggregatedReport.docker = {
          success: dockerData.success,
          buildSuccess: dockerData.build?.success || false,
          buildDuration: dockerData.build?.duration || 0,
          imageSize: dockerData.build?.imageSize,
          runSuccess: dockerData.run?.success || false,
          healthCheckSuccess: dockerData.healthCheck?.success || false,
          healthCheckDuration: dockerData.healthCheck?.duration || 0,
          endpointsTested: (dockerData.endpoints?.tested || []).length,
          endpointsWorking: dockerData.endpoints?.working || 0,
          errors: [],
          warnings: []
        };

        // Collect errors from all phases
        if (dockerData.build?.error) this.aggregatedReport.docker.errors.push(`Build: ${dockerData.build.error}`);
        if (dockerData.run?.error) this.aggregatedReport.docker.errors.push(`Run: ${dockerData.run.error}`);
        if (dockerData.healthCheck?.error) this.aggregatedReport.docker.errors.push(`Health: ${dockerData.healthCheck.error}`);

        if (!dockerData.success) {
          this.aggregatedReport.failures.push({
            component: 'docker',
            errors: this.aggregatedReport.docker.errors
          });
        }

        console.log(`✅ Docker report loaded: ${dockerData.success ? 'passed' : 'failed'}`);
      } else {
        console.log('ℹ️ Docker report not found (optional)');
        this.aggregatedReport.docker.success = null; // null means not tested
      }
    } catch (error) {
      console.error('❌ Failed to load Docker report:', error.message);
      this.aggregatedReport.docker.success = false;
      this.aggregatedReport.failures.push({
        component: 'docker',
        error: error.message
      });
    }
  }

  async loadPerformanceReport() {
    try {
      const perfPath = path.join(this.reportsDir, 'perf-chat.json');
      if (fs.existsSync(perfPath)) {
        const perfData = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
        
        this.aggregatedReport.performance = {
          success: perfData.success,
          testCount: perfData.testCount || 0,
          successRate: perfData.metrics?.successRate || 0,
          p50: perfData.metrics?.p50 || 0,
          p95: perfData.metrics?.p95 || 0,
          average: perfData.metrics?.average || 0,
          softThresholdExceeded: perfData.thresholds?.softExceeded || false,
          hardThresholdExceeded: perfData.thresholds?.hardExceeded || false,
          fastestProvider: perfData.providers?.fastest,
          slowestProvider: perfData.providers?.slowest,
          errors: perfData.errors || [],
          warnings: perfData.warnings || []
        };

        this.aggregatedReport.warnings.push(...(perfData.warnings || []));
        if (!perfData.success) {
          this.aggregatedReport.failures.push({
            component: 'performance',
            errors: perfData.errors
          });
        }

        console.log(`✅ Performance report loaded: p50=${this.aggregatedReport.performance.p50}ms, p95=${this.aggregatedReport.performance.p95}ms`);
      } else {
        console.log('ℹ️ Performance report not found (optional)');
        this.aggregatedReport.performance.success = null;
      }
    } catch (error) {
      console.error('❌ Failed to load performance report:', error.message);
      this.aggregatedReport.performance.success = false;
      this.aggregatedReport.failures.push({
        component: 'performance',
        error: error.message
      });
    }
  }

  async loadScreenshotCoverage() {
    try {
      const screenshotReportPath = path.join(this.reportsDir, 'screenshot-coverage.json');
      if (fs.existsSync(screenshotReportPath)) {
        const screenshotData = JSON.parse(fs.readFileSync(screenshotReportPath, 'utf8'));
        
        this.aggregatedReport.screenshots = {
          runId: screenshotData.runId,
          totalSteps: screenshotData.totalSteps || 0,
          totalErrors: screenshotData.errors?.length || 0,
          flows: {
            auth: screenshotData.summary?.authSteps || 0,
            settings: screenshotData.summary?.settingsSteps || 0,
            chat: screenshotData.summary?.chatSteps || 0,
            recommendations: screenshotData.summary?.recommendationsSteps || 0,
            errorflow: screenshotData.summary?.errorflowSteps || 0
          },
          success: (screenshotData.totalSteps || 0) > 0
        };

        console.log(`✅ Screenshot coverage loaded: ${this.aggregatedReport.screenshots.totalSteps} steps captured`);
      } else {
        console.log('ℹ️ Screenshot coverage report not found (optional)');
        this.aggregatedReport.screenshots.success = null;
      }
    } catch (error) {
      console.error('❌ Failed to load screenshot coverage:', error.message);
      this.aggregatedReport.screenshots.success = false;
      this.aggregatedReport.failures.push({
        component: 'screenshots',
        error: error.message
      });
    }
  }

  async loadRouteCoverage() {
    try {
      const routePath = path.join(this.reportsDir, 'route-manifest.json');
      if (fs.existsSync(routePath)) {
        const routeData = JSON.parse(fs.readFileSync(routePath, 'utf8'));
        
        this.aggregatedReport.routeCoverage = {
          totalRoutes: (routeData.routes || []).length,
          testedRoutes: (routeData.routes || []).filter(r => r.tested).length,
          coverage: routeData.coverage || 0,
          success: true
        };

        console.log(`✅ Route coverage loaded: ${this.aggregatedReport.routeCoverage.testedRoutes}/${this.aggregatedReport.routeCoverage.totalRoutes} routes`);
      } else {
        console.log('ℹ️ Route manifest not found (optional)');
        this.aggregatedReport.routeCoverage.success = null;
      }
    } catch (error) {
      console.error('❌ Failed to load route coverage:', error.message);
      this.aggregatedReport.routeCoverage.success = false;
    }
  }

  async loadVisualCoverage() {
    try {
      // Check if visual baseline directory exists
      if (fs.existsSync(this.baselineDir)) {
        const baselineFiles = fs.readdirSync(this.baselineDir).filter(f => f.endsWith('.png'));
        
        // Check for latest screenshot run
        let runtimeFiles = 0;
        if (fs.existsSync(this.screenshotDir)) {
          const runs = fs.readdirSync(this.screenshotDir);
          if (runs.length > 0) {
            const latestRun = runs.sort().pop();
            const runDir = path.join(this.screenshotDir, latestRun);
            
            // Count all PNG files in the run directory recursively
            const countFiles = (dir) => {
              let count = 0;
              const items = fs.readdirSync(dir);
              for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                  count += countFiles(fullPath);
                } else if (item.endsWith('.png')) {
                  count++;
                }
              }
              return count;
            };
            
            runtimeFiles = countFiles(runDir);
          }
        }

        this.aggregatedReport.visualCoverage = {
          baselineStates: baselineFiles.length,
          runtimeStates: runtimeFiles,
          coverage: baselineFiles.length > 0 ? Math.round((runtimeFiles / baselineFiles.length) * 100) : 0,
          success: true
        };

        console.log(`✅ Visual coverage loaded: ${runtimeFiles} runtime vs ${baselineFiles.length} baseline images`);
      } else {
        console.log('ℹ️ Visual baseline directory not found');
        this.aggregatedReport.visualCoverage.success = null;
      }
    } catch (error) {
      console.error('❌ Failed to load visual coverage:', error.message);
      this.aggregatedReport.visualCoverage.success = false;
    }
  }

  async loadMCPReport() {
    try {
      // Look for various MCP report files
      const mcpFiles = [
        'mcp-validation-report.json',
        'mcp-status-report.json',
        'mcp-health-report.json'
      ];

      let mcpData = null;
      for (const filename of mcpFiles) {
        const mcpPath = path.join(this.reportsDir, filename);
        if (fs.existsSync(mcpPath)) {
          mcpData = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
          break;
        }
      }

      if (mcpData) {
        this.aggregatedReport.mcp = {
          serversChecked: mcpData.serversChecked || mcpData.totalServers || 0,
          serversWorking: mcpData.serversWorking || mcpData.healthyServers || 0,
          failed: mcpData.failed || mcpData.failedServers || [],
          usedGitDiff: mcpData.usedGitDiff || false,
          success: (mcpData.serversWorking || mcpData.healthyServers || 0) > 0
        };

        console.log(`✅ MCP report loaded: ${this.aggregatedReport.mcp.serversWorking}/${this.aggregatedReport.mcp.serversChecked} servers working`);
      } else {
        console.log('ℹ️ MCP report not found (optional)');
        this.aggregatedReport.mcp.success = null;
      }
    } catch (error) {
      console.error('❌ Failed to load MCP report:', error.message);
      this.aggregatedReport.mcp.success = false;
    }
  }

  calculateOverallSuccess() {
    const requiredComponents = ['env', 'providers', 'recommendation'];
    const optionalComponents = ['docker', 'performance', 'screenshots', 'routeCoverage', 'visualCoverage', 'mcp'];

    // Count tests
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Required components must pass
    for (const component of requiredComponents) {
      totalTests++;
      if (this.aggregatedReport[component].success === true) {
        passedTests++;
      } else if (this.aggregatedReport[component].success === false) {
        failedTests++;
      }
    }

    // Optional components count towards totals but don't fail the build
    for (const component of optionalComponents) {
      if (this.aggregatedReport[component].success !== null) {
        totalTests++;
        if (this.aggregatedReport[component].success === true) {
          passedTests++;
        } else {
          failedTests++;
        }
      }
    }

    this.aggregatedReport.summary = {
      totalTests,
      passedTests,
      failedTests,
      warningsCount: this.aggregatedReport.warnings.length,
      errorsCount: this.aggregatedReport.failures.length
    };

    // Overall success: all required components must pass
    const requiredPassed = requiredComponents.every(comp => 
      this.aggregatedReport[comp].success === true
    );

    this.aggregatedReport.success = requiredPassed;

    console.log('\n📊 Overall Results:');
    console.log(`  Tests: ${passedTests}/${totalTests} passed`);
    console.log(`  Warnings: ${this.aggregatedReport.summary.warningsCount}`);
    console.log(`  Failures: ${this.aggregatedReport.summary.errorsCount}`);
    console.log(`  Overall: ${this.aggregatedReport.success ? '✅ PASSED' : '❌ FAILED'}`);
  }

  async writeJsonReport() {
    const reportPath = path.join(this.reportsDir, 'test-run-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.aggregatedReport, null, 2));
    console.log(`\n📄 JSON report written to: ${reportPath}`);
  }

  async writeMarkdownReport() {
    const reportPath = path.join(this.reportsDir, 'test-run-report.md');
    const markdown = this.generateMarkdown();
    fs.writeFileSync(reportPath, markdown);
    console.log(`📄 Markdown report written to: ${reportPath}`);
  }

  generateMarkdown() {
    const report = this.aggregatedReport;
    
    let md = '# Test Run Report\n\n';
    md += `**Run ID:** ${report.runId}  \n`;
    md += `**Timestamp:** ${report.timestamp}  \n`;
    md += `**Schema Version:** ${report.schemaVersion}  \n`;
    md += `**Overall Status:** ${report.success ? '✅ PASSED' : '❌ FAILED'}  \n\n`;

    // Summary
    md += '## Summary\n\n';
    md += '| Metric | Value |\n';
    md += '|--------|-------|\n';
    md += `| Total Tests | ${report.summary.totalTests} |\n`;
    md += `| Passed | ${report.summary.passedTests} |\n`;
    md += `| Failed | ${report.summary.failedTests} |\n`;
    md += `| Warnings | ${report.summary.warningsCount} |\n`;
    md += `| Errors | ${report.summary.errorsCount} |\n\n`;

    // Environment
    md += '## Environment Validation\n\n';
    md += `**Status:** ${this.statusIcon(report.env.success)}  \n`;
    md += `**Required Variables:** ${report.env.requiredValid}/${report.env.totalRequired} valid  \n`;
    md += `**Optional Providers:** ${report.env.optionalValid} available  \n`;
    md += `**Test Bypass Tokens:** ${report.env.testBypassAvailable}  \n\n`;

    // Providers
    md += '## Provider Detection\n\n';
    md += `**Status:** ${this.statusIcon(report.providers.success)}  \n`;
    md += `**Providers:** ${report.providers.working}/${report.providers.available} working  \n`;
    
    if (report.providers.stats?.fastest) {
      md += `**Fastest Response:** ${report.providers.stats.fastest}ms  \n`;
    }
    
    md += '\n### Provider Details\n\n';
    md += '| Provider | Status | Latency |\n';
    md += '|----------|--------|----------|\n';
    
    Object.entries(report.providers.providers || {}).forEach(([key, provider]) => {
      const status = provider.working ? '✅' : provider.available ? '❌' : '➖';
      const latency = provider.latency ? `${provider.latency}ms` : 'N/A';
      md += `| ${provider.name || key} | ${status} | ${latency} |\n`;
    });
    md += '\n';

    // Recommendations
    md += '## Recommendation Engine\n\n';
    md += `**Status:** ${this.statusIcon(report.recommendation.success)}  \n`;
    md += `**Hybrid Available:** ${report.recommendation.hybridAvailable ? '✅' : '❌'}  \n`;
    md += `**Recommendation Count:** ${report.recommendation.recommendationCount}  \n`;
    md += `**Fallback Used:** ${report.recommendation.fallbackUsed ? '⚠️' : '➖'}  \n`;
    md += `**Total Latency:** ${report.recommendation.totalLatency}ms  \n\n`;

    // Docker (if tested)
    if (report.docker.success !== null) {
      md += '## Docker Validation\n\n';
      md += `**Status:** ${this.statusIcon(report.docker.success)}  \n`;
      md += `**Build:** ${report.docker.buildSuccess ? '✅' : '❌'} (${report.docker.buildDuration}ms)  \n`;
      md += `**Health Check:** ${report.docker.healthCheckSuccess ? '✅' : '❌'} (${report.docker.healthCheckDuration}ms)  \n`;
      md += `**Endpoints:** ${report.docker.endpointsWorking}/${report.docker.endpointsTested} working  \n`;
      if (report.docker.imageSize) {
        md += `**Image Size:** ${report.docker.imageSize}  \n`;
      }
      md += '\n';
    }

    // Performance (if tested)
    if (report.performance.success !== null) {
      md += '## Performance Testing\n\n';
      md += `**Status:** ${this.statusIcon(report.performance.success)}  \n`;
      md += `**Tests:** ${report.performance.testCount} requests  \n`;
      md += `**Success Rate:** ${report.performance.successRate}%  \n`;
      md += `**Latency p50:** ${report.performance.p50}ms  \n`;
      md += `**Latency p95:** ${report.performance.p95}ms  \n`;
      
      if (report.performance.softThresholdExceeded) {
        md += '**Soft Threshold:** ⚠️ Exceeded  \n';
      }
      if (report.performance.hardThresholdExceeded) {
        md += '**Hard Threshold:** ❌ Exceeded  \n';
      }
      
      if (report.performance.fastestProvider) {
        md += `**Fastest Provider:** ${report.performance.fastestProvider}  \n`;
      }
      md += '\n';
    }

    // Screenshots (if tested)
    if (report.screenshots.success !== null && report.screenshots.totalSteps > 0) {
      md += '## Screenshot Coverage\n\n';
      md += `**Total Steps:** ${report.screenshots.totalSteps}  \n`;
      md += `**Errors Captured:** ${report.screenshots.totalErrors}  \n`;
      
      md += '\n### Flow Coverage\n\n';
      md += '| Flow | Steps |\n';
      md += '|------|-------|\n';
      Object.entries(report.screenshots.flows).forEach(([flow, steps]) => {
        md += `| ${flow} | ${steps} |\n`;
      });
      md += '\n';
    }

    // Warnings
    if (report.warnings.length > 0) {
      md += '## Warnings\n\n';
      report.warnings.forEach(warning => {
        md += `- ⚠️ ${warning}\n`;
      });
      md += '\n';
    }

    // Failures
    if (report.failures.length > 0) {
      md += '## Failures\n\n';
      report.failures.forEach(failure => {
        md += `### ${failure.component}\n\n`;
        if (failure.errors && Array.isArray(failure.errors)) {
          failure.errors.forEach(error => {
            md += `- ❌ ${error}\n`;
          });
        } else if (failure.error) {
          md += `- ❌ ${failure.error}\n`;
        }
        md += '\n';
      });
    }

    // TODO Section
    md += '## TODO (Deferred)\n\n';
    md += '- [ ] Contract tests for API endpoints\n';
    md += '- [ ] Visual diff gating with baseline images\n';
    md += '- [ ] Performance trends and regression detection\n';
    md += '- [ ] Semantic similarity testing for AI responses\n';
    md += '- [ ] Load testing with concurrent users\n';
    md += '- [ ] Security testing and vulnerability scanning\n\n';

    // Metadata
    md += '## Metadata\n\n';
    md += `**Node Version:** ${report.metadata.nodeVersion}  \n`;
    md += `**Platform:** ${report.metadata.platform} (${report.metadata.arch})  \n`;
    md += `**Environment:** ${report.metadata.environment}  \n`;
    md += `**Working Directory:** ${report.metadata.cwd}  \n`;

    return md;
  }

  statusIcon(success) {
    if (success === true) return '✅';
    if (success === false) return '❌';
    return '➖'; // null/not tested
  }

  async run() {
    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.reportsDir)) {
        fs.mkdirSync(this.reportsDir, { recursive: true });
      }

      const report = await this.aggregateReports();

      if (report.success) {
        console.log('\n✅ Test report aggregation completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Test report aggregation completed with failures');
        process.exit(1);
      }

    } catch (error) {
      console.error('💥 Test report aggregation failed:', error.message);
      
      // Write error report
      const errorReport = {
        schemaVersion: '2.0',
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        partialData: this.aggregatedReport
      };

      fs.writeFileSync(
        path.join(this.reportsDir, 'test-run-report.json'), 
        JSON.stringify(errorReport, null, 2)
      );

      process.exit(1);
    }
  }
}

// Run aggregation if called directly
if (require.main === module) {
  const aggregator = new TestReportAggregator();
  aggregator.run();
}

module.exports = TestReportAggregator;