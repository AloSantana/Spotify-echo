#!/usr/bin/env node

/**
 * Master QA Automation Orchestrator
 * 
 * This is the main entry point that orchestrates all QA automation tasks:
 * 1. Installation validation (npm & Docker)
 * 2. Test suite execution (unit, integration, E2E)
 * 3. UI/UX automation with screenshots
 * 4. API endpoint validation
 * 5. Authentication testing
 * 6. Error detection and GitHub issue generation
 * 7. Documentation updates
 * 8. Final status reporting
 */

const ComprehensiveQAAutomation = require('./comprehensive-qa-automation');
const DockerQA = require('./docker-qa-automation');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

class MasterQAOrchestrator {
    constructor() {
        this.runId = `master-qa-${Date.now()}`;
        this.startTime = Date.now();
        this.outputDir = path.join(process.cwd(), 'QA-AUTOMATION-RESULTS', this.runId);
        this.results = {
            runId: this.runId,
            timestamp: new Date().toISOString(),
            npmQA: null,
            dockerQA: null,
            comprehensiveQA: null,
            finalStatus: 'pending',
            productionReady: false,
            recommendations: [],
            githubIssues: []
        };

        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const emoji = {
            'INFO': 'ℹ️',
            'SUCCESS': '✅',
            'ERROR': '❌',
            'WARN': '⚠️',
            'DEBUG': '🔍'
        }[level] || 'ℹ️';

        console.log(`[${timestamp}] ${emoji} ${message}`);
    }

    async phase1_NpmInstallation() {
        this.log('═══════════════════════════════════════════════════════');
        this.log('PHASE 1: NPM Installation & Validation');
        this.log('═══════════════════════════════════════════════════════');

        try {
            this.log('Running npm install...');
            const npmResult = await execPromise('npm install', { cwd: process.cwd() });
            
            this.results.npmQA = {
                success: true,
                stdout: npmResult.stdout,
                stderr: npmResult.stderr,
                timestamp: new Date().toISOString()
            };

            this.log('✅ npm install completed successfully', 'SUCCESS');
            
            // Save npm install logs
            const logPath = path.join(this.outputDir, 'npm-install.log');
            fs.writeFileSync(logPath, npmResult.stdout + '\n' + npmResult.stderr);
            
            return true;
        } catch (error) {
            this.log(`❌ npm install failed: ${error.message}`, 'ERROR');
            this.results.npmQA = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return false;
        }
    }

    async phase2_DockerValidation() {
        this.log('═══════════════════════════════════════════════════════');
        this.log('PHASE 2: Docker Build & Validation');
        this.log('═══════════════════════════════════════════════════════');

        try {
            const dockerQA = new DockerQA();
            this.results.dockerQA = await dockerQA.run();
            
            if (this.results.dockerQA.buildSuccess) {
                this.log('✅ Docker validation completed successfully', 'SUCCESS');
                return true;
            } else {
                this.log('⚠️ Docker validation had issues', 'WARN');
                return false;
            }
        } catch (error) {
            this.log(`❌ Docker validation error: ${error.message}`, 'ERROR');
            this.results.dockerQA = {
                success: false,
                error: error.message
            };
            return false;
        }
    }

    async phase3_ComprehensiveQA() {
        this.log('═══════════════════════════════════════════════════════');
        this.log('PHASE 3: Comprehensive QA Suite');
        this.log('═══════════════════════════════════════════════════════');

        try {
            const qa = new ComprehensiveQAAutomation();
            // Don't call run() as it exits the process, call phases manually
            await qa.phase1_Installation();
            await qa.phase2_TestSuites();
            await qa.phase3_UIAutomation();
            await qa.phase4_APIValidation();
            await qa.phase5_Authentication();
            
            const report = await qa.generateReport();
            this.results.comprehensiveQA = qa.results;

            this.log('✅ Comprehensive QA completed', 'SUCCESS');
            return report;
        } catch (error) {
            this.log(`❌ Comprehensive QA error: ${error.message}`, 'ERROR');
            this.results.comprehensiveQA = {
                success: false,
                error: error.message
            };
            return null;
        }
    }

    async phase4_ErrorAnalysis() {
        this.log('═══════════════════════════════════════════════════════');
        this.log('PHASE 4: Error Analysis & Issue Generation');
        this.log('═══════════════════════════════════════════════════════');

        const errors = [];

        // Collect errors from all phases
        if (this.results.npmQA && !this.results.npmQA.success) {
            errors.push({
                phase: 'npm-installation',
                severity: 'critical',
                message: 'npm install failed',
                details: this.results.npmQA.error
            });
        }

        if (this.results.dockerQA && !this.results.dockerQA.buildSuccess) {
            errors.push({
                phase: 'docker-build',
                severity: 'high',
                message: 'Docker build failed',
                details: this.results.dockerQA.logs || []
            });
        }

        if (this.results.comprehensiveQA && this.results.comprehensiveQA.summary) {
            const summary = this.results.comprehensiveQA.summary;
            summary.errors.forEach(error => {
                errors.push({
                    phase: 'comprehensive-tests',
                    severity: 'medium',
                    message: error,
                    details: null
                });
            });
        }

        this.results.errors = errors;

        if (errors.length > 0) {
            this.log(`Found ${errors.length} errors`, 'WARN');
            
            // Generate GitHub issue templates
            errors.forEach((error, index) => {
                const issue = this.generateGitHubIssue(error, index + 1);
                this.results.githubIssues.push(issue);
            });

            // Save issues to file
            const issuesPath = path.join(this.outputDir, 'github-issues.json');
            fs.writeFileSync(issuesPath, JSON.stringify(this.results.githubIssues, null, 2));
            this.log(`📝 GitHub issues template saved: ${issuesPath}`);
        } else {
            this.log('✅ No errors detected', 'SUCCESS');
        }

        return errors;
    }

    generateGitHubIssue(error, issueNumber) {
        return {
            title: `[QA] ${error.phase}: ${error.message}`,
            body: `## 🐛 Issue from QA Automation

**Phase:** ${error.phase}  
**Severity:** ${error.severity}  
**Run ID:** ${this.runId}  
**Timestamp:** ${new Date().toISOString()}

### Description
${error.message}

### Details
\`\`\`
${JSON.stringify(error.details, null, 2)}
\`\`\`

### Steps to Reproduce
1. Run comprehensive QA automation: \`npm run qa:all\`
2. Check phase: ${error.phase}
3. Review logs in: \`QA-AUTOMATION-RESULTS/${this.runId}\`

### Expected Behavior
This phase should complete successfully without errors.

### Actual Behavior
${error.message}

### Environment
- Node Version: ${process.version}
- Platform: ${process.platform}
- QA Run ID: ${this.runId}

### Action Items
- [ ] Investigate root cause
- [ ] Fix the issue
- [ ] Re-run QA automation
- [ ] Verify fix with \`npm run qa:all\`

---
*Auto-generated by Comprehensive QA Automation*
`,
            labels: ['bug', 'qa-automation', `severity-${error.severity}`, error.phase],
            assignees: [],
            milestone: null
        };
    }

    async phase5_Documentation() {
        this.log('═══════════════════════════════════════════════════════');
        this.log('PHASE 5: Documentation Updates');
        this.log('═══════════════════════════════════════════════════════');

        try {
            await this.updateReadme();
            await this.generateComprehensiveReport();
            this.log('✅ Documentation updated', 'SUCCESS');
            return true;
        } catch (error) {
            this.log(`❌ Documentation update error: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async updateReadme() {
        const readmePath = path.join(process.cwd(), 'README.md');
        if (!fs.existsSync(readmePath)) {
            this.log('⚠️ README.md not found, creating new one', 'WARN');
            fs.writeFileSync(readmePath, '# Spotify Echo\n\n');
        }

        let readme = fs.readFileSync(readmePath, 'utf8');

        // Remove old QA section
        readme = readme.replace(/<!-- QA-AUTOMATION-START -->[\s\S]*<!-- QA-AUTOMATION-END -->/g, '');

        // Add new QA section
        const qaSection = this.generateReadmeQASection();
        
        // Insert before any existing sections or append
        if (readme.includes('## ')) {
            readme = readme.replace('## ', `${qaSection}\n\n## `);
        } else {
            readme += `\n\n${qaSection}\n`;
        }

        fs.writeFileSync(readmePath, readme);
        this.log('✅ README.md updated with latest QA results');
    }

    generateReadmeQASection() {
        const timestamp = new Date().toISOString().split('T')[0];
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

        let section = `<!-- QA-AUTOMATION-START -->\n`;
        section += `## 🧪 Latest QA Automation Results\n\n`;
        section += `**Last Run:** ${timestamp}  \n`;
        section += `**Duration:** ${duration}s  \n`;
        section += `**Status:** ${this.results.productionReady ? '✅ PRODUCTION READY' : '⚠️ ISSUES DETECTED'}\n\n`;

        section += `### Installation & Build\n`;
        section += `- **NPM Install:** ${this.results.npmQA?.success ? '✅ PASS' : '❌ FAIL'}\n`;
        section += `- **Docker Build:** ${this.results.dockerQA?.buildSuccess ? '✅ PASS' : '❌ FAIL'}\n\n`;

        if (this.results.comprehensiveQA) {
            const summary = this.results.comprehensiveQA.summary;
            section += `### Test Results\n`;
            section += `- **Total Tests:** ${summary.totalTests}\n`;
            section += `- **Passed:** ${summary.passed} ✅\n`;
            section += `- **Failed:** ${summary.failed} ❌\n`;
            section += `- **Skipped:** ${summary.skipped} ⏭️\n\n`;

            if (this.results.comprehensiveQA.screenshots.length > 0) {
                section += `### UI Screenshots\n`;
                section += `${this.results.comprehensiveQA.screenshots.length} screenshots captured for regression testing.\n\n`;
            }
        }

        if (this.results.errors && this.results.errors.length > 0) {
            section += `### ⚠️ Issues Detected\n`;
            this.results.errors.slice(0, 5).forEach((error, i) => {
                section += `${i + 1}. **${error.phase}:** ${error.message}\n`;
            });
            if (this.results.errors.length > 5) {
                section += `\n... and ${this.results.errors.length - 5} more issues\n`;
            }
            section += `\n`;
        }

        section += `### 📊 Full Reports\n`;
        section += `Detailed reports available in: [\`QA-AUTOMATION-RESULTS/${this.runId}\`](./QA-AUTOMATION-RESULTS/${this.runId})\n\n`;

        section += `### Running QA Automation\n`;
        section += `\`\`\`bash\n`;
        section += `# Run full QA suite\n`;
        section += `npm run qa:all\n\n`;
        section += `# Run specific phases\n`;
        section += `npm run qa:npm      # NPM installation & tests\n`;
        section += `npm run qa:docker   # Docker build & validation\n`;
        section += `npm run qa:full     # Comprehensive automation\n`;
        section += `\`\`\`\n\n`;

        section += `<!-- QA-AUTOMATION-END -->\n`;

        return section;
    }

    async generateComprehensiveReport() {
        const reportPath = path.join(this.outputDir, 'MASTER-QA-REPORT.md');
        
        let report = `# 🎯 Master QA Automation Report\n\n`;
        report += `**Run ID:** ${this.runId}\n`;
        report += `**Timestamp:** ${this.results.timestamp}\n`;
        report += `**Duration:** ${((Date.now() - this.startTime) / 1000).toFixed(2)}s\n\n`;

        report += `---\n\n`;

        // Executive Summary
        report += `## 📋 Executive Summary\n\n`;
        if (this.results.productionReady) {
            report += `✅ **PRODUCTION READY** - All critical tests passed.\n\n`;
        } else {
            report += `⚠️ **NOT PRODUCTION READY** - Issues detected requiring attention.\n\n`;
        }

        // Phase Results
        report += `## 🔍 Phase-by-Phase Results\n\n`;

        report += `### Phase 1: NPM Installation\n`;
        report += `- **Status:** ${this.results.npmQA?.success ? '✅ PASS' : '❌ FAIL'}\n`;
        if (!this.results.npmQA?.success && this.results.npmQA?.error) {
            report += `- **Error:** ${this.results.npmQA.error}\n`;
        }
        report += `\n`;

        report += `### Phase 2: Docker Validation\n`;
        report += `- **Status:** ${this.results.dockerQA?.buildSuccess ? '✅ PASS' : '❌ FAIL'}\n`;
        report += `- **Docker Available:** ${this.results.dockerQA?.dockerAvailable ? 'Yes' : 'No'}\n`;
        report += `- **Compose Valid:** ${this.results.dockerQA?.composeSuccess ? 'Yes' : 'No'}\n\n`;

        report += `### Phase 3: Comprehensive QA\n`;
        if (this.results.comprehensiveQA && this.results.comprehensiveQA.summary) {
            const summary = this.results.comprehensiveQA.summary;
            report += `- **Total Tests:** ${summary.totalTests}\n`;
            report += `- **Passed:** ${summary.passed} ✅\n`;
            report += `- **Failed:** ${summary.failed} ❌\n`;
            report += `- **Skipped:** ${summary.skipped} ⏭️\n\n`;
        }

        // Error Summary
        if (this.results.errors && this.results.errors.length > 0) {
            report += `## ⚠️ Issues & Errors\n\n`;
            this.results.errors.forEach((error, i) => {
                report += `### ${i + 1}. ${error.message}\n`;
                report += `- **Phase:** ${error.phase}\n`;
                report += `- **Severity:** ${error.severity}\n`;
                if (error.details) {
                    report += `- **Details:** \`${JSON.stringify(error.details)}\`\n`;
                }
                report += `\n`;
            });
        }

        // Recommendations
        report += `## 🎯 Recommendations\n\n`;
        if (this.results.productionReady) {
            report += `1. ✅ Deploy to staging environment\n`;
            report += `2. ✅ Run smoke tests in staging\n`;
            report += `3. ✅ Monitor for 24 hours\n`;
            report += `4. ✅ Proceed with production deployment\n\n`;
        } else {
            report += `1. ❌ Address all critical and high severity issues\n`;
            report += `2. ❌ Re-run QA automation after fixes\n`;
            report += `3. ❌ Review failed test logs\n`;
            report += `4. ❌ Update documentation as needed\n\n`;
        }

        // Next Steps
        report += `## 📝 Next Steps\n\n`;
        if (this.results.githubIssues.length > 0) {
            report += `**GitHub Issues Generated:** ${this.results.githubIssues.length}\n\n`;
            report += `Review and create issues from: \`${path.join(this.outputDir, 'github-issues.json')}\`\n\n`;
        }

        report += `**Full Reports Location:** \`${this.outputDir}\`\n\n`;

        report += `---\n\n`;
        report += `*Generated by EchoTune AI Master QA Automation System*\n`;

        fs.writeFileSync(reportPath, report);
        this.log(`📄 Master report saved: ${reportPath}`);

        return reportPath;
    }

    determineProductionReadiness() {
        const npmOk = this.results.npmQA?.success !== false;
        const dockerOk = this.results.dockerQA?.buildSuccess !== false;
        const testsOk = !this.results.comprehensiveQA?.summary || 
                       this.results.comprehensiveQA.summary.failed === 0;
        const noErrors = !this.results.errors || this.results.errors.length === 0;

        this.results.productionReady = npmOk && dockerOk && testsOk && noErrors;
        this.results.finalStatus = this.results.productionReady ? 'READY' : 'NOT READY';

        return this.results.productionReady;
    }

    async run() {
        this.log('🚀 Starting Master QA Automation Orchestrator');
        this.log('═══════════════════════════════════════════════════════');

        try {
            // Phase 1: NPM Installation
            await this.phase1_NpmInstallation();

            // Phase 2: Docker Validation
            await this.phase2_DockerValidation();

            // Phase 3: Comprehensive QA
            await this.phase3_ComprehensiveQA();

            // Phase 4: Error Analysis
            await this.phase4_ErrorAnalysis();

            // Phase 5: Documentation
            await this.phase5_Documentation();

            // Determine production readiness
            const ready = this.determineProductionReadiness();

            // Final Summary
            this.log('═══════════════════════════════════════════════════════');
            this.log('📊 FINAL RESULTS');
            this.log('═══════════════════════════════════════════════════════');
            this.log(`Status: ${this.results.finalStatus}`);
            this.log(`Production Ready: ${ready ? 'YES ✅' : 'NO ❌'}`);
            this.log(`Errors Detected: ${this.results.errors?.length || 0}`);
            this.log(`Reports Location: ${this.outputDir}`);
            this.log('═══════════════════════════════════════════════════════');

            if (ready) {
                this.log('🎉 ALL TESTS PASSED - READY FOR PRODUCTION!', 'SUCCESS');
                process.exit(0);
            } else {
                this.log('⚠️ ISSUES DETECTED - REVIEW BEFORE DEPLOYMENT', 'WARN');
                process.exit(1);
            }
        } catch (error) {
            this.log(`❌ Fatal error: ${error.message}`, 'ERROR');
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const orchestrator = new MasterQAOrchestrator();
    orchestrator.run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = MasterQAOrchestrator;
