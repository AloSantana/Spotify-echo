#!/usr/bin/env node

/**
 * Comprehensive MCP Integration & Screenshot Capture
 * Creates full validation report with BROWSERSCREENSHOT-TESTING directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ComprehensivePR45Validator {
    constructor() {
        this.runId = `pr45-final-${Date.now()}`;
        this.screenshotDir = path.join(process.cwd(), 'BROWSERSCREENSHOT-TESTING', this.runId);
        this.reportsDir = path.join(process.cwd(), 'reports');
        this.results = {
            timestamp: new Date().toISOString(),
            runId: this.runId,
            validation: {
                screenshots: { success: false, count: 0, directory: this.screenshotDir },
                environment: { success: false, score: 0 },
                docker: { success: false, score: 0 },
                endpoints: { success: false, tested: 0 },
                build: { success: false, time: 0 }
            },
            overall: { success: false, score: 0 }
        };
    }

    async createDirectories() {
        const dirs = [
            this.screenshotDir,
            path.join(this.screenshotDir, 'auth'),
            path.join(this.screenshotDir, 'settings'), 
            path.join(this.screenshotDir, 'chat'),
            path.join(this.screenshotDir, 'recommendations'),
            path.join(this.screenshotDir, 'errorflow'),
            this.reportsDir
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    async captureScreenshots() {
        console.log('📸 Capturing comprehensive screenshots...');
        
        try {
            // Install Playwright browsers if needed
            try {
                execSync('npx playwright install chromium', { stdio: 'pipe' });
            } catch (error) {
                console.warn('Playwright install warning:', error.message);
            }

            // Run Playwright tests to generate screenshots
            const playwrightResult = execSync('npx playwright test --reporter=json', { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            // Count generated screenshots
            const screenshotCount = this.countScreenshots();
            this.results.validation.screenshots.count = screenshotCount;
            this.results.validation.screenshots.success = screenshotCount > 0;
            
            console.log(`✅ Screenshots captured: ${screenshotCount} images`);
            
        } catch (error) {
            console.error('Screenshot capture error:', error.message);
            this.results.validation.screenshots.success = false;
        }
    }

    countScreenshots() {
        if (!fs.existsSync(this.screenshotDir)) return 0;
        
        let count = 0;
        const countFiles = (dir) => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    countFiles(fullPath);
                } else if (item.endsWith('.png') || item.endsWith('.jpg')) {
                    count++;
                }
            }
        };
        
        countFiles(this.screenshotDir);
        return count;
    }

    async validateEnvironment() {
        console.log('🔍 Validating environment...');
        
        try {
            const StrictValidator = require('./env-validate-strict.js');
            const validator = new StrictValidator();
            const results = await validator.run();
            
            this.results.validation.environment.success = results.overall.success;
            this.results.validation.environment.score = results.overall.score;
            
        } catch (error) {
            console.error('Environment validation error:', error.message);
            this.results.validation.environment.success = false;
        }
    }

    async validateBuild() {
        console.log('🔨 Validating build...');
        
        try {
            const startTime = Date.now();
            execSync('npm run build', { stdio: 'pipe' });
            const buildTime = (Date.now() - startTime) / 1000;
            
            this.results.validation.build.success = true;
            this.results.validation.build.time = buildTime;
            
            console.log(`✅ Build successful in ${buildTime}s`);
            
        } catch (error) {
            console.error('Build validation failed:', error.message);
            this.results.validation.build.success = false;
        }
    }

    async validateEndpoints() {
        console.log('🔗 Validating API endpoints...');
        
        const endpoints = [
            '/health',
            '/api/simple-settings',
            '/api/performance/system',
            '/api/testing/status'
        ];

        let successCount = 0;
        
        // Start server for testing
        try {
            execSync('npm start &', { stdio: 'ignore' });
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for startup
            
            for (const endpoint of endpoints) {
                try {
                    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000${endpoint}`, {
                        encoding: 'utf8'
                    });
                    
                    if (parseInt(result) < 400) {
                        successCount++;
                        console.log(`✅ Endpoint working: ${endpoint}`);
                    } else {
                        console.warn(`⚠️  Endpoint issue: ${endpoint} (${result})`);
                    }
                } catch (error) {
                    console.warn(`⚠️  Endpoint failed: ${endpoint} - ${error.message}`);
                }
            }
            
        } catch (error) {
            console.error('Server startup failed:', error.message);
        } finally {
            // Cleanup
            try {
                execSync('pkill -f "node server.js"', { stdio: 'ignore' });
            } catch (error) {
                // Ignore cleanup errors
            }
        }

        this.results.validation.endpoints.tested = endpoints.length;
        this.results.validation.endpoints.success = successCount > 0;
    }

    async validateDocker() {
        console.log('🐳 Validating Docker build...');
        
        try {
            // Test Docker build with optimized Dockerfile
            execSync('docker build -f Dockerfile.optimized -t echotune-test:latest .', { 
                stdio: 'pipe' 
            });
            
            this.results.validation.docker.success = true;
            this.results.validation.docker.score = 100;
            
            console.log('✅ Docker build successful');
            
        } catch (error) {
            console.error('Docker build failed:', error.message);
            this.results.validation.docker.success = false;
        }
    }

    calculateOverallScore() {
        const validations = this.results.validation;
        const scores = [
            validations.screenshots.success ? 100 : 0,
            validations.environment.score || 0,
            validations.docker.score || 0,
            validations.endpoints.success ? 100 : 0,
            validations.build.success ? 100 : 0
        ];
        
        this.results.overall.score = scores.reduce((a, b) => a + b, 0) / scores.length;
        this.results.overall.success = this.results.overall.score >= 80;
    }

    async generateReport() {
        // Save comprehensive report
        fs.writeFileSync(
            path.join(this.reportsDir, 'pr45-final-validation-report.json'),
            JSON.stringify(this.results, null, 2)
        );

        // Generate markdown summary
        const markdownReport = `# PR 45 Final Validation Report

## Overall Status: ${this.results.overall.success ? '✅ PASSED' : '❌ FAILED'} (${this.results.overall.score.toFixed(1)}%)

### Validation Results
- **Screenshots**: ${this.results.validation.screenshots.success ? '✅' : '❌'} (${this.results.validation.screenshots.count} captured)
- **Environment**: ${this.results.validation.environment.success ? '✅' : '❌'} (${this.results.validation.environment.score}%)
- **Docker Build**: ${this.results.validation.docker.success ? '✅' : '❌'} 
- **API Endpoints**: ${this.results.validation.endpoints.success ? '✅' : '❌'} (${this.results.validation.endpoints.tested} tested)
- **Build System**: ${this.results.validation.build.success ? '✅' : '❌'} (${this.results.validation.build.time}s)

### Screenshots Directory
All screenshots saved to: \`BROWSERSCREENSHOT-TESTING/${this.runId}/\`

### Fixes Applied
${this.fixes.map(fix => `- ${fix}`).join('\n')}

### Issues Found
${this.errors.length > 0 ? this.errors.map(error => `- ${error}`).join('\n') : 'None'}

Generated: ${this.results.timestamp}
`;

        fs.writeFileSync(
            path.join(this.reportsDir, 'pr45-final-validation-report.md'),
            markdownReport
        );
        
        console.log('📄 Reports generated in reports/ directory');
    }

    async run() {
        await this.createDirectories();
        
        await this.fix1_ScreenshotDirectoryStandardization();
        await this.fix2_PlaywrightConfigMismatch();
        await this.fix3_NoMockPolicyFrontend();
        await this.fix4_EnsureAPIEndpoints();
        await this.fix5_ConsolidateDockerValidation();
        
        await this.validateEnvironment();
        await this.validateBuild();
        await this.validateEndpoints();
        await this.validateDocker();
        await this.captureScreenshots();
        
        this.calculateOverallScore();
        await this.generateReport();
        
        console.log(`\n🎯 PR 45 Validation Complete: ${this.results.overall.success ? 'READY FOR MERGE' : 'NEEDS FIXES'}`);
        console.log(`📊 Overall Score: ${this.results.overall.score.toFixed(1)}%`);
        console.log(`📸 Screenshots: BROWSERSCREENSHOT-TESTING/${this.runId}/`);
        
        return this.results;
    }
}

// Run if called directly
if (require.main === module) {
    (async () => {
        const validator = new ComprehensivePR45Validator();
        await validator.run();
    })();
}

module.exports = ComprehensivePR45Validator;