#!/usr/bin/env node

/**
 * Docker Environment QA Automation
 * 
 * Validates Docker container build, deployment, and functionality
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Helper to check which docker compose command is available
async function getDockerComposeCommand() {
    try {
        await execPromise('docker compose version');
        return 'docker compose';
    } catch {
        try {
            await execPromise('docker-compose --version');
            return 'docker-compose';
        } catch {
            return null;
        }
    }
}

class DockerQA {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            dockerAvailable: false,
            buildSuccess: false,
            composeSuccess: false,
            containerHealth: {},
            smokeTests: {},
            logs: []
        };
    }

    log(message, level = 'INFO') {
        const logEntry = `[${level}] ${message}`;
        console.log(logEntry);
        this.results.logs.push({ timestamp: new Date().toISOString(), level, message });
    }

    async checkDockerAvailable() {
        this.log('Checking Docker availability...');
        try {
            const result = await execPromise('docker --version');
            this.results.dockerAvailable = true;
            this.log(`✅ Docker available: ${result.stdout.trim()}`);
            return true;
        } catch (error) {
            this.log('❌ Docker not available', 'ERROR');
            this.results.dockerAvailable = false;
            return false;
        }
    }

    async buildDockerImage() {
        this.log('Building Docker image...');
        return new Promise((resolve) => {
            const child = spawn('docker', ['build', '-t', 'echotune-qa:test', '.'], {
                cwd: process.cwd(),
                stdio: 'inherit'
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.log('✅ Docker build successful');
                    this.results.buildSuccess = true;
                    resolve(true);
                } else {
                    this.log(`❌ Docker build failed with exit code ${code}`, 'ERROR');
                    this.results.buildSuccess = false;
                    resolve(false);
                }
            });

            child.on('error', (error) => {
                this.log(`❌ Docker build error: ${error.message}`, 'ERROR');
                this.results.buildSuccess = false;
                resolve(false);
            });
        });
    }

    async testDockerCompose() {
        this.log('Testing docker compose configuration...');
        try {
            // Get available docker compose command
            const composeCmd = await getDockerComposeCommand();
            if (!composeCmd) {
                this.log('⚠️ Neither docker compose nor docker-compose found', 'WARN');
                this.results.composeSuccess = false;
                return false;
            }
            
            this.log(`Using: ${composeCmd}`);
            
            // Validate docker-compose.yml
            const validateResult = await execPromise(`${composeCmd} config --quiet`);
            if (validateResult.stderr) {
                this.log(`⚠️ docker compose validation warnings: ${validateResult.stderr}`, 'WARN');
            }
            
            this.log('✅ docker compose configuration valid');
            this.results.composeSuccess = true;
            
            // Don't actually start services in QA to avoid port conflicts
            this.log('ℹ️  Skipping actual docker compose up to avoid conflicts', 'INFO');
            
            return true;
        } catch (error) {
            this.log(`❌ docker compose validation failed: ${error.message}`, 'ERROR');
            this.results.composeSuccess = false;
            return false;
        }
    }

    async testContainerHealth() {
        this.log('Testing container health (simulated)...');
        
        // Since we don't want to actually run containers, we'll check the configuration
        try {
            const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
            if (fs.existsSync(dockerfilePath)) {
                const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
                this.results.containerHealth.dockerfileExists = true;
                this.results.containerHealth.hasHealthCheck = dockerfile.includes('HEALTHCHECK');
                
                if (this.results.containerHealth.hasHealthCheck) {
                    this.log('✅ Dockerfile includes health check');
                } else {
                    this.log('⚠️ Dockerfile missing health check', 'WARN');
                }
            }

            // Check docker-compose health check
            const composePath = path.join(process.cwd(), 'docker-compose.yml');
            if (fs.existsSync(composePath)) {
                const compose = fs.readFileSync(composePath, 'utf8');
                this.results.containerHealth.composeExists = true;
                this.results.containerHealth.hasComposeHealthCheck = compose.includes('healthcheck:');
                
                if (this.results.containerHealth.hasComposeHealthCheck) {
                    this.log('✅ docker-compose includes health check');
                } else {
                    this.log('⚠️ docker-compose missing health check', 'WARN');
                }
            }

            return true;
        } catch (error) {
            this.log(`❌ Container health check error: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async runSmokeTests() {
        this.log('Running Docker smoke tests...');
        
        // Test 1: Check if image was built
        try {
            const images = await execPromise('docker images echotune-qa:test --format "{{.Repository}}:{{.Tag}}"');
            this.results.smokeTests.imageExists = images.stdout.includes('echotune-qa:test');
            
            if (this.results.smokeTests.imageExists) {
                this.log('✅ Docker image exists');
            } else {
                this.log('⚠️ Docker image not found', 'WARN');
            }
        } catch (error) {
            this.log(`⚠️ Could not check Docker images: ${error.message}`, 'WARN');
            this.results.smokeTests.imageExists = false;
        }

        // Test 2: Check critical files exist
        const criticalFiles = [
            'Dockerfile',
            'docker-compose.yml',
            '.dockerignore',
            'package.json'
        ];

        this.results.smokeTests.criticalFiles = {};
        criticalFiles.forEach(file => {
            const exists = fs.existsSync(path.join(process.cwd(), file));
            this.results.smokeTests.criticalFiles[file] = exists;
            if (exists) {
                this.log(`✅ ${file} exists`);
            } else {
                this.log(`❌ ${file} missing`, 'ERROR');
            }
        });

        return true;
    }

    generateReport() {
        const outputDir = path.join(process.cwd(), 'QA-AUTOMATION-RESULTS', 'docker-qa');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const reportPath = path.join(outputDir, 'docker-qa-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

        this.log(`📄 Docker QA report saved: ${reportPath}`);

        // Generate markdown
        let md = '# 🐳 Docker Environment QA Report\n\n';
        md += `**Timestamp:** ${this.results.timestamp}\n\n`;
        md += '## Summary\n\n';
        md += `- Docker Available: ${this.results.dockerAvailable ? '✅' : '❌'}\n`;
        md += `- Build Success: ${this.results.buildSuccess ? '✅' : '❌'}\n`;
        md += `- Compose Valid: ${this.results.composeSuccess ? '✅' : '❌'}\n\n`;

        if (this.results.containerHealth) {
            md += '## Container Health\n\n';
            Object.entries(this.results.containerHealth).forEach(([key, value]) => {
                md += `- ${key}: ${value ? '✅' : '❌'}\n`;
            });
            md += '\n';
        }

        if (this.results.smokeTests) {
            md += '## Smoke Tests\n\n';
            if (this.results.smokeTests.criticalFiles) {
                md += '### Critical Files\n\n';
                Object.entries(this.results.smokeTests.criticalFiles).forEach(([file, exists]) => {
                    md += `- ${file}: ${exists ? '✅' : '❌'}\n`;
                });
                md += '\n';
            }
        }

        const mdPath = path.join(outputDir, 'DOCKER-QA-REPORT.md');
        fs.writeFileSync(mdPath, md);
        this.log(`📄 Docker QA markdown report saved: ${mdPath}`);

        return { reportPath, mdPath };
    }

    async run() {
        this.log('🐳 Starting Docker QA Automation');

        const dockerAvailable = await this.checkDockerAvailable();
        if (!dockerAvailable) {
            this.log('⚠️ Docker not available, skipping Docker tests', 'WARN');
            this.generateReport();
            return this.results;
        }

        await this.buildDockerImage();
        await this.testDockerCompose();
        await this.testContainerHealth();
        await this.runSmokeTests();

        const report = this.generateReport();

        this.log('═══════════════════════════════════════════════');
        this.log('🐳 Docker QA Complete');
        this.log('═══════════════════════════════════════════════');

        if (!this.results.buildSuccess) {
            this.log('❌ Docker build failed', 'ERROR');
            return this.results;
        }

        this.log('✅ Docker QA passed');
        return this.results;
    }
}

if (require.main === module) {
    const dockerQA = new DockerQA();
    dockerQA.run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DockerQA;
