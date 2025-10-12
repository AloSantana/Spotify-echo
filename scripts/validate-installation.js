#!/usr/bin/env node

/**
 * Installation Validation Script
 * Validates that all dependencies and prerequisites are properly installed
 * Part of comprehensive test suite for EchoTune AI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class InstallationValidator {
    constructor() {
        this.results = {
            schemaVersion: '2.0',
            timestamp: new Date().toISOString(),
            runId: `install-${Date.now()}`,
            success: true,
            summary: {
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 0,
                warningsCount: 0
            },
            checks: [],
            errors: []
        };
    }

    logCheck(name, status, details = {}) {
        this.results.summary.totalChecks++;
        
        const check = {
            name,
            status,
            timestamp: new Date().toISOString(),
            ...details
        };
        
        this.results.checks.push(check);
        
        if (status === 'pass') {
            this.results.summary.passedChecks++;
            console.log(`✅ PASS: ${name}`);
            if (details.message) console.log(`   ${details.message}`);
        } else if (status === 'fail') {
            this.results.summary.failedChecks++;
            this.results.success = false;
            console.log(`❌ FAIL: ${name}`);
            if (details.message) console.log(`   ${details.message}`);
        } else if (status === 'warning') {
            this.results.summary.warningsCount++;
            console.log(`⚠️  WARN: ${name}`);
            if (details.message) console.log(`   ${details.message}`);
        }
    }

    execCommand(command, description) {
        try {
            const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
            return { success: true, output: output.trim() };
        } catch (error) {
            return { success: false, error: error.message, output: error.stdout || error.stderr };
        }
    }

    async validateNodeVersion() {
        console.log('\n📦 Validating Node.js Installation...');
        
        const result = this.execCommand('node --version', 'Node.js version');
        if (result.success) {
            const version = result.output;
            const versionNum = parseInt(version.replace('v', '').split('.')[0]);
            
            if (versionNum >= 16) {
                this.logCheck('Node.js Version', 'pass', {
                    message: `${version} (minimum: v16.x)`,
                    version
                });
            } else {
                this.logCheck('Node.js Version', 'fail', {
                    message: `${version} - requires v16.x or higher`,
                    version
                });
            }
        } else {
            this.logCheck('Node.js Version', 'fail', {
                message: 'Node.js not found'
            });
        }
    }

    async validateNpmVersion() {
        const result = this.execCommand('npm --version', 'npm version');
        if (result.success) {
            this.logCheck('npm Version', 'pass', {
                message: `v${result.output}`,
                version: result.output
            });
        } else {
            this.logCheck('npm Version', 'fail', {
                message: 'npm not found'
            });
        }
    }

    async validateNodeDependencies() {
        console.log('\n📚 Validating Node.js Dependencies...');
        
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            this.logCheck('package.json', 'fail', {
                message: 'package.json not found'
            });
            return;
        }
        
        this.logCheck('package.json', 'pass', {
            message: 'Found in project root'
        });
        
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
            this.logCheck('node_modules', 'pass', {
                message: 'Dependencies installed'
            });
            
            // Check critical dependencies
            const criticalDeps = [
                'express',
                'mongoose',
                'redis',
                'playwright',
                '@playwright/test',
                'axios',
                'dotenv'
            ];
            
            for (const dep of criticalDeps) {
                const depPath = path.join(nodeModulesPath, dep);
                if (fs.existsSync(depPath)) {
                    this.logCheck(`Dependency: ${dep}`, 'pass', {
                        message: 'Installed'
                    });
                } else {
                    this.logCheck(`Dependency: ${dep}`, 'warning', {
                        message: 'Not found - may be optional'
                    });
                }
            }
        } else {
            this.logCheck('node_modules', 'fail', {
                message: 'Dependencies not installed - run npm install'
            });
        }
    }

    async validatePythonSetup() {
        console.log('\n🐍 Validating Python Installation...');
        
        const pythonResult = this.execCommand('python3 --version', 'Python version');
        if (pythonResult.success) {
            this.logCheck('Python3 Version', 'pass', {
                message: pythonResult.output,
                version: pythonResult.output
            });
        } else {
            this.logCheck('Python3 Version', 'warning', {
                message: 'Python3 not found - ML features may be limited'
            });
        }
        
        const pipResult = this.execCommand('pip3 --version', 'pip version');
        if (pipResult.success) {
            this.logCheck('pip3 Version', 'pass', {
                message: pipResult.output
            });
        } else {
            this.logCheck('pip3 Version', 'warning', {
                message: 'pip3 not found - Python dependencies cannot be installed'
            });
        }
        
        // Check if requirements.txt exists
        const requirementsPath = path.join(process.cwd(), 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            this.logCheck('requirements.txt', 'pass', {
                message: 'Found in project root'
            });
        } else {
            this.logCheck('requirements.txt', 'warning', {
                message: 'Not found - Python dependencies may not be defined'
            });
        }
    }

    async validateProjectStructure() {
        console.log('\n📁 Validating Project Structure...');
        
        const criticalPaths = [
            { path: 'src', type: 'directory', critical: true },
            { path: 'scripts', type: 'directory', critical: true },
            { path: 'tests', type: 'directory', critical: true },
            { path: 'package.json', type: 'file', critical: true },
            { path: 'server.js', type: 'file', critical: true },
            { path: '.env.example', type: 'file', critical: false },
            { path: 'README.md', type: 'file', critical: false },
            { path: 'playwright.config.mjs', type: 'file', critical: false }
        ];
        
        for (const item of criticalPaths) {
            const itemPath = path.join(process.cwd(), item.path);
            const exists = fs.existsSync(itemPath);
            
            if (exists) {
                this.logCheck(`Project Structure: ${item.path}`, 'pass', {
                    message: `${item.type} exists`
                });
            } else {
                if (item.critical) {
                    this.logCheck(`Project Structure: ${item.path}`, 'fail', {
                        message: `Critical ${item.type} not found`
                    });
                } else {
                    this.logCheck(`Project Structure: ${item.path}`, 'warning', {
                        message: `Optional ${item.type} not found`
                    });
                }
            }
        }
    }

    async validateEnvironmentSetup() {
        console.log('\n🔧 Validating Environment Setup...');
        
        const envExamplePath = path.join(process.cwd(), '.env.example');
        const envPath = path.join(process.cwd(), '.env');
        
        if (fs.existsSync(envExamplePath)) {
            this.logCheck('.env.example', 'pass', {
                message: 'Template file exists'
            });
        }
        
        if (fs.existsSync(envPath)) {
            this.logCheck('.env file', 'pass', {
                message: 'Environment file configured'
            });
        } else {
            this.logCheck('.env file', 'warning', {
                message: 'Not found - create from .env.example'
            });
        }
    }

    async validatePlaywrightBrowsers() {
        console.log('\n🎭 Validating Playwright Browsers...');
        
        // Check if Playwright is installed
        const playwrightPath = path.join(process.cwd(), 'node_modules', '@playwright', 'test');
        if (!fs.existsSync(playwrightPath)) {
            this.logCheck('Playwright Installation', 'warning', {
                message: 'Playwright not installed - E2E tests unavailable'
            });
            return;
        }
        
        this.logCheck('Playwright Installation', 'pass', {
            message: 'Package installed'
        });
        
        // Try to check if browsers are installed
        const result = this.execCommand('npx playwright --version', 'Playwright version');
        if (result.success) {
            this.logCheck('Playwright Browsers', 'pass', {
                message: result.output
            });
        } else {
            this.logCheck('Playwright Browsers', 'warning', {
                message: 'Install browsers with: npx playwright install'
            });
        }
    }

    async generateReport() {
        const reportDir = path.join(process.cwd(), 'reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const reportPath = path.join(reportDir, 'installation-validation.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        console.log(`\n📊 Installation Validation Report saved to: ${reportPath}`);
        
        // Generate markdown summary
        const mdPath = path.join(reportDir, 'installation-validation.md');
        const markdown = this.generateMarkdown();
        fs.writeFileSync(mdPath, markdown);
        
        console.log(`📄 Markdown summary saved to: ${mdPath}`);
    }

    generateMarkdown() {
        const summary = this.results.summary;
        const successRate = ((summary.passedChecks / summary.totalChecks) * 100).toFixed(1);
        
        let md = `# Installation Validation Report\n\n`;
        md += `**Generated**: ${this.results.timestamp}\n`;
        md += `**Run ID**: ${this.results.runId}\n`;
        md += `**Overall Status**: ${this.results.success ? '✅ PASS' : '❌ FAIL'}\n\n`;
        
        md += `## Summary\n\n`;
        md += `- **Total Checks**: ${summary.totalChecks}\n`;
        md += `- **Passed**: ${summary.passedChecks} (${successRate}%)\n`;
        md += `- **Failed**: ${summary.failedChecks}\n`;
        md += `- **Warnings**: ${summary.warningsCount}\n\n`;
        
        md += `## Detailed Results\n\n`;
        
        const checksByStatus = {
            pass: this.results.checks.filter(c => c.status === 'pass'),
            fail: this.results.checks.filter(c => c.status === 'fail'),
            warning: this.results.checks.filter(c => c.status === 'warning')
        };
        
        if (checksByStatus.fail.length > 0) {
            md += `### ❌ Failed Checks\n\n`;
            for (const check of checksByStatus.fail) {
                md += `- **${check.name}**: ${check.message || 'Failed'}\n`;
            }
            md += `\n`;
        }
        
        if (checksByStatus.warning.length > 0) {
            md += `### ⚠️ Warnings\n\n`;
            for (const check of checksByStatus.warning) {
                md += `- **${check.name}**: ${check.message || 'Warning'}\n`;
            }
            md += `\n`;
        }
        
        md += `### ✅ Passed Checks\n\n`;
        for (const check of checksByStatus.pass) {
            md += `- **${check.name}**: ${check.message || 'Passed'}\n`;
        }
        
        md += `\n---\n*Generated by EchoTune AI Installation Validator*\n`;
        
        return md;
    }

    async run() {
        console.log('🎵 EchoTune AI - Installation Validation Suite');
        console.log('='.repeat(50));
        
        try {
            await this.validateNodeVersion();
            await this.validateNpmVersion();
            await this.validateNodeDependencies();
            await this.validatePythonSetup();
            await this.validateProjectStructure();
            await this.validateEnvironmentSetup();
            await this.validatePlaywrightBrowsers();
            
            await this.generateReport();
            
            console.log('\n' + '='.repeat(50));
            console.log(`\n📊 Summary: ${this.results.summary.passedChecks}/${this.results.summary.totalChecks} checks passed`);
            
            if (this.results.summary.failedChecks > 0) {
                console.log(`\n⚠️  ${this.results.summary.failedChecks} critical issues found`);
            }
            
            if (this.results.summary.warningsCount > 0) {
                console.log(`\n💡 ${this.results.summary.warningsCount} warnings - review recommended`);
            }
            
            if (this.results.success) {
                console.log('\n✅ Installation validation PASSED\n');
                return 0;
            } else {
                console.log('\n❌ Installation validation FAILED\n');
                return 1;
            }
            
        } catch (error) {
            console.error('\n❌ Validation error:', error.message);
            this.results.errors.push({
                message: error.message,
                stack: error.stack
            });
            return 1;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const validator = new InstallationValidator();
    validator.run().then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = InstallationValidator;
