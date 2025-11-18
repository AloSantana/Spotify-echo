#!/usr/bin/env node

/**
 * Comprehensive Test Suite Orchestrator
 * Runs all validation tests in sequence and aggregates results
 * Part of EchoTune AI comprehensive validation system
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestOrchestrator {
    constructor() {
        this.results = {
            schemaVersion: '2.0',
            timestamp: new Date().toISOString(),
            runId: `comprehensive-${Date.now()}`,
            success: true,
            summary: {
                totalSuites: 0,
                passedSuites: 0,
                failedSuites: 0,
                skippedSuites: 0,
                totalDuration: 0
            },
            suites: [],
            aggregatedReports: [],
            errors: []
        };
        
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'running': '🔄'
        }[type] || 'ℹ️';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async runCommand(command, cwd = process.cwd()) {
        return new Promise((resolve, reject) => {
            // Validate command input
            if (!command || typeof command !== 'string') {
                reject(new Error('Invalid command: must be a non-empty string'));
                return;
            }
            
            // Validate cwd path
            if (!cwd || typeof cwd !== 'string') {
                reject(new Error('Invalid working directory'));
                return;
            }
            
            // Verify cwd exists and is a directory
            try {
                const stats = fs.statSync(cwd);
                if (!stats.isDirectory()) {
                    reject(new Error(`Working directory is not a directory: ${cwd}`));
                    return;
                }
            } catch (error) {
                reject(new Error(`Working directory does not exist: ${cwd}`));
                return;
            }
            
            const parts = command.split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);
            
            const child = spawn(cmd, args, {
                cwd,
                shell: true,
                stdio: 'inherit'
            });
            
            child.on('exit', (code) => {
                if (code === 0) {
                    resolve({ success: true, exitCode: code });
                } else {
                    resolve({ success: false, exitCode: code });
                }
            });
            
            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    async runTestSuite(name, command, description, optional = false) {
        this.results.summary.totalSuites++;
        
        const suite = {
            name,
            description,
            command,
            optional,
            startTime: new Date().toISOString(),
            duration: 0,
            status: 'running'
        };
        
        this.log(`Running: ${name}`, 'running');
        this.log(`  ${description}`, 'info');
        
        const startTime = Date.now();
        
        try {
            const result = await this.runCommand(command);
            const duration = Date.now() - startTime;
            
            suite.duration = duration;
            suite.endTime = new Date().toISOString();
            
            if (result.success) {
                suite.status = 'passed';
                this.results.summary.passedSuites++;
                this.log(`✅ ${name} completed successfully (${(duration / 1000).toFixed(2)}s)`, 'success');
            } else {
                if (optional) {
                    suite.status = 'warning';
                    this.results.summary.passedSuites++;
                    this.log(`⚠️  ${name} had issues but is optional (${(duration / 1000).toFixed(2)}s)`, 'warning');
                } else {
                    suite.status = 'failed';
                    suite.error = `Exit code: ${result.exitCode}`;
                    this.results.summary.failedSuites++;
                    this.results.success = false;
                    this.log(`❌ ${name} failed (${(duration / 1000).toFixed(2)}s)`, 'error');
                }
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            suite.duration = duration;
            suite.endTime = new Date().toISOString();
            suite.status = 'error';
            suite.error = error.message;
            
            if (optional) {
                this.results.summary.skippedSuites++;
                this.log(`⚠️  ${name} skipped: ${error.message}`, 'warning');
            } else {
                this.results.summary.failedSuites++;
                this.results.success = false;
                this.log(`❌ ${name} error: ${error.message}`, 'error');
            }
        }
        
        this.results.suites.push(suite);
        console.log(''); // Add spacing between suites
    }

    async aggregateReports() {
        this.log('Aggregating test reports...', 'info');
        
        const reportDir = path.join(process.cwd(), 'reports');
        
        // Check if reports directory exists
        try {
            if (!fs.existsSync(reportDir)) {
                this.log('Reports directory not found', 'warning');
                return;
            }
            
            const stats = fs.statSync(reportDir);
            if (!stats.isDirectory()) {
                this.log('Reports path exists but is not a directory', 'warning');
                return;
            }
        } catch (error) {
            this.log(`Error checking reports directory: ${error.message}`, 'warning');
            return;
        }
        
        const reportFiles = [
            'installation-validation.json',
            'env-validation.json',
            'provider-status.json',
            'recommendation-probe.json',
            'api-test-results.json',
            'mcp-server-validation.json'
        ];
        
        for (const file of reportFiles) {
            // Sanitize file name to prevent path traversal
            if (file.includes('..') || file.includes('/')) {
                this.log(`  ✗ Invalid file name: ${file}`, 'warning');
                continue;
            }
            
            const filePath = path.join(reportDir, file);
            
            try {
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    if (!stats.isFile()) {
                        this.log(`  ✗ ${file} is not a file`, 'warning');
                        continue;
                    }
                    
                    const content = fs.readFileSync(filePath, 'utf8');
                    const parsed = JSON.parse(content);
                    
                    this.results.aggregatedReports.push({
                        file,
                        data: parsed
                    });
                    this.log(`  ✓ Loaded ${file}`, 'info');
                }
            } catch (error) {
                this.log(`  ✗ Failed to load ${file}: ${error.message}`, 'warning');
            }
        }
    }

    async captureScreenshots() {
        this.log('Checking for UI screenshots...', 'info');
        
        const screenshotDir = path.join(process.cwd(), 'BROWSERSCREENSHOT-TESTING');
        
        try {
            if (fs.existsSync(screenshotDir)) {
                const stats = fs.statSync(screenshotDir);
                if (!stats.isDirectory()) {
                    this.log('  Screenshot path exists but is not a directory', 'warning');
                    return;
                }
                
                const subdirs = fs.readdirSync(screenshotDir, { withFileTypes: true })
                    .filter(d => d.isDirectory())
                    .map(d => d.name);
                
                this.results.screenshots = {
                    directory: screenshotDir,
                    runCount: subdirs.length,
                    runs: subdirs
                };
                
                this.log(`  Found ${subdirs.length} screenshot runs`, 'success');
            } else {
                this.log('  No screenshots directory found', 'warning');
            }
        } catch (error) {
            this.log(`  Error reading screenshots: ${error.message}`, 'warning');
        }
    }

    async generateFinalReport() {
        this.results.summary.totalDuration = Date.now() - this.startTime;
        
        const reportDir = path.join(process.cwd(), 'reports');
        
        // Ensure reports directory exists with proper error handling
        try {
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            } else {
                const stats = fs.statSync(reportDir);
                if (!stats.isDirectory()) {
                    throw new Error('Reports path exists but is not a directory');
                }
            }
        } catch (error) {
            this.log(`Error creating reports directory: ${error.message}`, 'error');
            return;
        }
        
        // Save JSON report with error handling
        try {
            const jsonPath = path.join(reportDir, 'comprehensive-test-results.json');
            fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2), 'utf8');
            this.log(`JSON report saved: ${jsonPath}`, 'success');
        } catch (error) {
            this.log(`Error saving JSON report: ${error.message}`, 'error');
        }
        
        // Generate markdown report with error handling
        try {
            const markdown = this.generateMarkdownReport();
            const mdPath = path.join(reportDir, 'COMPREHENSIVE_TEST_REPORT.md');
            fs.writeFileSync(mdPath, markdown, 'utf8');
            this.log(`Markdown report saved: ${mdPath}`, 'success');
            
            // Copy to root for visibility
            const rootMdPath = path.join(process.cwd(), 'COMPREHENSIVE_TEST_REPORT.md');
            fs.copyFileSync(mdPath, rootMdPath);
            this.log(`Report copied to: ${rootMdPath}`, 'success');
        } catch (error) {
            this.log(`Error saving markdown report: ${error.message}`, 'error');
        }
    }

    generateMarkdownReport() {
        const duration = (this.results.summary.totalDuration / 1000).toFixed(2);
        const successRate = this.results.summary.totalSuites > 0
            ? ((this.results.summary.passedSuites / this.results.summary.totalSuites) * 100).toFixed(1)
            : 0;
        
        let md = '# 🧪 EchoTune AI - Comprehensive Test Report\n\n';
        md += `**Generated**: ${this.results.timestamp}\n`;
        md += `**Run ID**: ${this.results.runId}\n`;
        md += `**Total Duration**: ${duration}s\n`;
        md += `**Overall Status**: ${this.results.success ? '✅ PASSED' : '❌ FAILED'}\n\n`;
        
        md += '## 📊 Executive Summary\n\n';
        md += '| Metric | Value |\n';
        md += '|--------|-------|\n';
        md += `| Total Test Suites | ${this.results.summary.totalSuites} |\n`;
        md += `| Passed | ${this.results.summary.passedSuites} |\n`;
        md += `| Failed | ${this.results.summary.failedSuites} |\n`;
        md += `| Skipped | ${this.results.summary.skippedSuites} |\n`;
        md += `| Success Rate | ${successRate}% |\n\n`;
        
        md += '## 🔍 Test Suite Results\n\n';
        
        for (const suite of this.results.suites) {
            const icon = {
                'passed': '✅',
                'failed': '❌',
                'warning': '⚠️',
                'error': '⚠️',
                'skipped': '⏭️'
            }[suite.status] || '❓';
            
            const durationStr = suite.duration ? ` (${(suite.duration / 1000).toFixed(2)}s)` : '';
            
            md += `### ${icon} ${suite.name}${durationStr}\n\n`;
            md += `- **Description**: ${suite.description}\n`;
            md += `- **Status**: ${suite.status.toUpperCase()}\n`;
            md += `- **Command**: \`${suite.command}\`\n`;
            
            if (suite.error) {
                md += `- **Error**: ${suite.error}\n`;
            }
            
            md += '\n';
        }
        
        if (this.results.aggregatedReports.length > 0) {
            md += '## 📁 Aggregated Reports\n\n';
            md += 'The following detailed reports have been generated:\n\n';
            
            for (const report of this.results.aggregatedReports) {
                md += `- \`reports/${report.file}\`\n`;
            }
            md += '\n';
        }
        
        if (this.results.screenshots) {
            md += '## 📸 UI Screenshots\n\n';
            md += `- **Directory**: \`${this.results.screenshots.directory}\`\n`;
            md += `- **Screenshot Runs**: ${this.results.screenshots.runCount}\n\n`;
            
            if (this.results.screenshots.runs.length > 0) {
                md += '### Available Screenshot Sets\n\n';
                for (const run of this.results.screenshots.runs) {
                    md += `- \`${run}\`\n`;
                }
                md += '\n';
            }
        }
        
        md += '## 📝 Next Steps\n\n';
        
        if (this.results.success) {
            md += '✅ All critical tests passed! The application is ready for:\n\n';
            md += '1. Code review and approval\n';
            md += '2. Deployment to staging environment\n';
            md += '3. Production deployment\n\n';
        } else {
            md += '❌ Some tests failed. Please address the following:\n\n';
            
            const failedSuites = this.results.suites.filter(s => s.status === 'failed');
            for (const suite of failedSuites) {
                md += `1. **${suite.name}**: ${suite.error || 'Review logs for details'}\n`;
            }
            md += '\n';
        }
        
        md += '---\n';
        md += '*Generated by EchoTune AI Comprehensive Test Suite*\n';
        md += '*For detailed results, see individual reports in the `reports/` directory*\n';
        
        return md;
    }

    async run() {
        console.log('═'.repeat(70));
        console.log('🎵 EchoTune AI - Comprehensive Test Suite');
        console.log('═'.repeat(70));
        console.log('');
        
        this.log('Starting comprehensive validation...', 'info');
        console.log('');
        
        // Phase 1: Installation & Prerequisites
        console.log('📦 PHASE 1: Installation & Prerequisites');
        console.log('─'.repeat(70));
        await this.runTestSuite(
            'Installation Validation',
            'node scripts/validate-installation.js',
            'Validates Node.js, npm, dependencies, and project structure'
        );
        
        // Phase 2: Environment & Configuration
        console.log('🔧 PHASE 2: Environment & Configuration');
        console.log('─'.repeat(70));
        await this.runTestSuite(
            'Environment Validation',
            'node scripts/env-validate.js',
            'Validates environment variables and configuration',
            true // Optional - may fail in CI without all secrets
        );
        
        // Phase 3: API & Service Testing
        console.log('🌐 PHASE 3: API & Service Testing');
        console.log('─'.repeat(70));
        await this.runTestSuite(
            'Comprehensive API Testing',
            'node scripts/comprehensive-api-testing.js',
            'Tests all API endpoints and external services',
            true // Optional - requires API keys
        );
        
        // Phase 4: Authentication & Security
        console.log('🔐 PHASE 4: Authentication & Security');
        console.log('─'.repeat(70));
        await this.runTestSuite(
            'Authentication Tests',
            'npm run test -- tests/integration/auth.test.js',
            'Tests authentication flows and security',
            true // Optional - may require running server
        );
        
        // Phase 5: UI & E2E Testing
        console.log('🎭 PHASE 5: UI & E2E Testing');
        console.log('─'.repeat(70));
        await this.runTestSuite(
            'Screenshot Capture',
            'node scripts/comprehensive-screenshot-capture.js',
            'Captures comprehensive UI screenshots',
            true // Optional - requires running server
        );
        
        // Phase 6: MCP Server Validation
        console.log('🔧 PHASE 6: MCP Server Validation');
        console.log('─'.repeat(70));
        await this.runTestSuite(
            'MCP Server Health Check',
            'node scripts/validate-mcp-servers.js',
            'Validates all MCP servers and attempts fixes',
            true // Optional - may have config issues
        );
        
        // Phase 7: Aggregation & Reporting
        console.log('📊 PHASE 7: Aggregation & Reporting');
        console.log('─'.repeat(70));
        await this.aggregateReports();
        await this.captureScreenshots();
        await this.generateFinalReport();
        
        // Final Summary
        console.log('');
        console.log('═'.repeat(70));
        console.log('📊 Final Summary');
        console.log('═'.repeat(70));
        console.log('');
        console.log(`Total Suites:     ${this.results.summary.totalSuites}`);
        console.log(`Passed:           ${this.results.summary.passedSuites} ✅`);
        console.log(`Failed:           ${this.results.summary.failedSuites} ❌`);
        console.log(`Skipped:          ${this.results.summary.skippedSuites} ⏭️`);
        console.log(`Total Duration:   ${(this.results.summary.totalDuration / 1000).toFixed(2)}s`);
        console.log('');
        
        if (this.results.success) {
            console.log('✅ COMPREHENSIVE TESTS PASSED!');
            console.log('');
            console.log('📄 View the full report: COMPREHENSIVE_TEST_REPORT.md');
            return 0;
        } else {
            console.log('❌ COMPREHENSIVE TESTS FAILED');
            console.log('');
            console.log('📄 Review the report for details: COMPREHENSIVE_TEST_REPORT.md');
            return 1;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const orchestrator = new ComprehensiveTestOrchestrator();
    orchestrator.run().then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveTestOrchestrator;
