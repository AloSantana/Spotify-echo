#!/usr/bin/env node

/**
 * QA Automation Setup Validator
 * 
 * Validates that all QA automation components are properly installed
 * and configured before running the comprehensive QA suite.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QASetupValidator {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    log(message, type = 'INFO') {
        const emoji = {
            'INFO': 'ℹ️',
            'SUCCESS': '✅',
            'ERROR': '❌',
            'WARN': '⚠️'
        }[type] || 'ℹ️';
        console.log(`${emoji} ${message}`);
    }

    check(name, condition, errorMessage = '') {
        if (condition) {
            this.results.passed.push(name);
            this.log(`${name}: OK`, 'SUCCESS');
            return true;
        } else {
            this.results.failed.push({ name, error: errorMessage });
            this.log(`${name}: FAIL${errorMessage ? ' - ' + errorMessage : ''}`, 'ERROR');
            return false;
        }
    }

    warn(name, message) {
        this.results.warnings.push({ name, message });
        this.log(`${name}: ${message}`, 'WARN');
    }

    async validate() {
        this.log('═══════════════════════════════════════════════════════');
        this.log('QA Automation Setup Validation');
        this.log('═══════════════════════════════════════════════════════');

        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        this.check(
            'Node.js Version',
            majorVersion >= 16,
            `Node.js 16+ required, found ${nodeVersion}`
        );

        // Check NPM
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            this.check('NPM', true, `version ${npmVersion}`);
        } catch (error) {
            this.check('NPM', false, 'NPM not found');
        }

        // Check required scripts
        const scriptsPath = path.join(process.cwd(), 'scripts');
        const requiredScripts = [
            'master-qa-orchestrator.js',
            'comprehensive-qa-automation.js',
            'docker-qa-automation.js'
        ];

        requiredScripts.forEach(script => {
            const scriptPath = path.join(scriptsPath, script);
            this.check(
                `Script: ${script}`,
                fs.existsSync(scriptPath),
                `File not found: ${scriptPath}`
            );
        });

        // Check package.json scripts
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const requiredNpmScripts = ['qa:all', 'qa:npm', 'qa:docker', 'qa:full'];
            
            requiredNpmScripts.forEach(scriptName => {
                this.check(
                    `NPM Script: ${scriptName}`,
                    packageJson.scripts && packageJson.scripts[scriptName],
                    `Script missing in package.json`
                );
            });
        } else {
            this.check('package.json', false, 'File not found');
        }

        // Check Docker (optional)
        try {
            const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
            this.check('Docker', true, dockerVersion);
        } catch (error) {
            this.warn('Docker', 'Docker not available (optional for full QA)');
        }

        // Check Playwright (optional)
        try {
            const playwrightVersion = execSync('npx playwright --version', { encoding: 'utf8' }).trim();
            this.check('Playwright', true, playwrightVersion);
        } catch (error) {
            this.warn('Playwright', 'Not installed - will be installed on first run');
        }

        // Check output directories
        const outputDirs = [
            'QA-AUTOMATION-RESULTS',
            'BROWSERTESTIMAGES',
            'BROWSERSCREENSHOT-TESTING'
        ];

        outputDirs.forEach(dir => {
            const dirPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(dirPath)) {
                this.log(`Output directory ${dir} will be created on first run`, 'INFO');
            }
        });

        // Check .gitignore
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignore = fs.readFileSync(gitignorePath, 'utf8');
            if (gitignore.includes('QA-AUTOMATION-RESULTS')) {
                this.check('.gitignore', true, 'QA directories properly ignored');
            } else {
                this.warn('.gitignore', 'QA result directories not in .gitignore');
            }
        }

        // Check documentation
        const docs = [
            'QA-AUTOMATION-README.md',
            'QA-QUICK-START.md'
        ];

        docs.forEach(doc => {
            const docPath = path.join(process.cwd(), doc);
            this.check(
                `Documentation: ${doc}`,
                fs.existsSync(docPath),
                `File not found: ${docPath}`
            );
        });

        // Check GitHub workflow
        const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'qa-automation.yml');
        this.check(
            'GitHub Workflow',
            fs.existsSync(workflowPath),
            'CI/CD workflow not found'
        );

        // Summary
        this.log('═══════════════════════════════════════════════════════');
        this.log('Validation Summary');
        this.log('═══════════════════════════════════════════════════════');
        this.log(`Passed: ${this.results.passed.length}`, 'SUCCESS');
        this.log(`Failed: ${this.results.failed.length}`, this.results.failed.length > 0 ? 'ERROR' : 'SUCCESS');
        this.log(`Warnings: ${this.results.warnings.length}`, this.results.warnings.length > 0 ? 'WARN' : 'INFO');

        if (this.results.failed.length > 0) {
            this.log('═══════════════════════════════════════════════════════');
            this.log('Failed Checks:', 'ERROR');
            this.results.failed.forEach(({ name, error }) => {
                this.log(`  - ${name}: ${error}`, 'ERROR');
            });
            this.log('═══════════════════════════════════════════════════════');
            this.log('Please fix the above issues before running QA automation', 'ERROR');
            process.exit(1);
        } else {
            this.log('═══════════════════════════════════════════════════════');
            this.log('✅ All checks passed! Ready to run QA automation', 'SUCCESS');
            this.log('');
            this.log('Run: npm run qa:all', 'INFO');
            this.log('═══════════════════════════════════════════════════════');
            process.exit(0);
        }
    }
}

// Run validation
if (require.main === module) {
    const validator = new QASetupValidator();
    validator.validate().catch(error => {
        console.error('Validation error:', error);
        process.exit(1);
    });
}

module.exports = QASetupValidator;
