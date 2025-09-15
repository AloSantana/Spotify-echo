#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Docker Validation Script for EchoTune AI
 * Tests Docker build, run, and functionality
 */

class DockerValidator {
  constructor() {
    this.runId = `docker-${Date.now()}`;
    this.baseDir = path.join(process.cwd(), 'BROWSERTESTIMAGES', this.runId);
    this.logDir = path.join(this.baseDir, 'docker-logs');
    this.containerName = 'echotune-validation';
    this.imageName = 'echotune-app:validation';
    this.results = {
      dockerInstalled: false,
      buildSuccess: false,
      runSuccess: false,
      healthCheck: false,
      endpointsWorking: {},
      buildTime: null,
      imageSize: null,
      logs: []
    };

    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.results.logs.push(logMessage);
  }

  async checkDockerInstallation() {
    this.log('🐳 Checking Docker installation...');
    try {
      const version = execSync('docker --version', { encoding: 'utf8' });
      this.log(`✅ Docker found: ${version.trim()}`);
      this.results.dockerInstalled = true;
      return true;
    } catch (error) {
      this.log(`❌ Docker not found: ${error.message}`);
      this.results.dockerInstalled = false;
      return false;
    }
  }

  async buildDockerImage() {
    this.log('🔨 Building Docker image...');
    const startTime = Date.now();
    
    try {
      // Clean up any existing image
      try {
        execSync(`docker rmi ${this.imageName}`, { stdio: 'ignore' });
      } catch (e) {
        // Ignore if image doesn't exist
      }

      // Build the image
      const buildCommand = `docker build -t ${this.imageName} .`;
      this.log(`Executing: ${buildCommand}`);
      
      const buildOutput = execSync(buildCommand, { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      const buildTime = Date.now() - startTime;
      this.results.buildTime = buildTime;
      
      // Save build output
      fs.writeFileSync(
        path.join(this.logDir, 'docker-build.log'),
        buildOutput
      );
      
      // Get image size
      try {
        const sizeOutput = execSync(`docker images ${this.imageName} --format "table {{.Size}}"`, { encoding: 'utf8' });
        const sizeLines = sizeOutput.trim().split('\n');
        this.results.imageSize = sizeLines[1] || 'unknown';
      } catch (e) {
        this.results.imageSize = 'unknown';
      }
      
      this.log(`✅ Docker build successful in ${buildTime}ms`);
      this.log(`📦 Image size: ${this.results.imageSize}`);
      this.results.buildSuccess = true;
      return true;
    } catch (error) {
      this.log(`❌ Docker build failed: ${error.message}`);
      this.results.buildSuccess = false;
      
      // Save error output
      fs.writeFileSync(
        path.join(this.logDir, 'docker-build-error.log'),
        error.toString()
      );
      return false;
    }
  }

  async runDockerContainer() {
    this.log('🚀 Starting Docker container...');
    
    try {
      // Stop and remove any existing container
      try {
        execSync(`docker stop ${this.containerName}`, { stdio: 'ignore' });
        execSync(`docker rm ${this.containerName}`, { stdio: 'ignore' });
      } catch (e) {
        // Ignore if container doesn't exist
      }

      // Create .env file content for container
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Run container with environment variables
      const runCommand = `docker run -d --name ${this.containerName} -p 3001:3000 --env-file .env ${this.imageName}`;
      this.log(`Executing: ${runCommand}`);
      
      const containerId = execSync(runCommand, { encoding: 'utf8' }).trim();
      this.log(`✅ Container started with ID: ${containerId}`);
      
      // Wait for container to start
      await this.sleep(5000);
      
      // Check if container is running
      const status = execSync(`docker ps --filter "name=${this.containerName}" --format "{{.Status}}"`, { encoding: 'utf8' }).trim();
      
      if (status) {
        this.log(`✅ Container is running: ${status}`);
        this.results.runSuccess = true;
        return true;
      } else {
        this.log('❌ Container failed to start');
        this.results.runSuccess = false;
        return false;
      }
    } catch (error) {
      this.log(`❌ Failed to run container: ${error.message}`);
      this.results.runSuccess = false;
      return false;
    }
  }

  async performHealthCheck() {
    this.log('🔍 Performing health check...');
    
    try {
      // Wait a bit more for the app to fully start
      await this.sleep(10000);
      
      // Try to curl the health endpoint
      try {
        const healthResponse = execSync('curl -f http://localhost:3001/health', { 
          encoding: 'utf8',
          timeout: 10000
        });
        this.log(`✅ Health check passed: ${healthResponse}`);
        this.results.healthCheck = true;
        return true;
      } catch (healthError) {
        // Try the root endpoint
        try {
          const rootResponse = execSync('curl -f http://localhost:3001/', { 
            encoding: 'utf8',
            timeout: 10000
          });
          this.log(`✅ Root endpoint responding`);
          this.results.healthCheck = true;
          return true;
        } catch (rootError) {
          this.log(`❌ Health check failed: ${healthError.message}`);
          this.results.healthCheck = false;
          return false;
        }
      }
    } catch (error) {
      this.log(`❌ Health check error: ${error.message}`);
      this.results.healthCheck = false;
      return false;
    }
  }

  async testEndpoints() {
    this.log('🧪 Testing API endpoints...');
    
    const endpoints = [
      { path: '/', name: 'homepage' },
      { path: '/api/health', name: 'health' },
      { path: '/api/chat', name: 'chat', method: 'POST' },
      { path: '/api/recommendations', name: 'recommendations' }
    ];

    for (const endpoint of endpoints) {
      try {
        let command;
        if (endpoint.method === 'POST') {
          command = `curl -X POST -H "Content-Type: application/json" -d '{"message":"test"}' http://localhost:3001${endpoint.path}`;
        } else {
          command = `curl -f http://localhost:3001${endpoint.path}`;
        }
        
        const response = execSync(command, { 
          encoding: 'utf8',
          timeout: 10000
        });
        
        this.log(`✅ ${endpoint.name} endpoint working`);
        this.results.endpointsWorking[endpoint.name] = true;
      } catch (error) {
        this.log(`❌ ${endpoint.name} endpoint failed: ${error.message}`);
        this.results.endpointsWorking[endpoint.name] = false;
      }
    }
  }

  async collectLogs() {
    this.log('📋 Collecting container logs...');
    
    try {
      const logs = execSync(`docker logs ${this.containerName}`, { encoding: 'utf8' });
      fs.writeFileSync(
        path.join(this.logDir, 'container-runtime.log'),
        logs
      );
      this.log('✅ Container logs collected');
    } catch (error) {
      this.log(`❌ Failed to collect logs: ${error.message}`);
    }
  }

  async cleanup() {
    this.log('🧹 Cleaning up Docker resources...');
    
    try {
      // Stop and remove container
      execSync(`docker stop ${this.containerName}`, { stdio: 'ignore' });
      execSync(`docker rm ${this.containerName}`, { stdio: 'ignore' });
      
      // Optionally remove image (commented out to avoid rebuilding)
      // execSync(`docker rmi ${this.imageName}`, { stdio: 'ignore' });
      
      this.log('✅ Cleanup completed');
    } catch (error) {
      this.log(`⚠️ Cleanup warning: ${error.message}`);
    }
  }

  generateReport() {
    const report = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalTests: 5,
        passedTests: Object.values(this.results).filter(v => v === true).length,
        dockerStatus: this.results.dockerInstalled && this.results.buildSuccess && this.results.runSuccess ? 'working' : 'failed',
        endpointsWorking: Object.values(this.results.endpointsWorking).filter(v => v === true).length,
        totalEndpoints: Object.keys(this.results.endpointsWorking).length
      }
    };

    // Save JSON report
    const jsonPath = path.join(this.baseDir, 'docker-validation-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const mdPath = path.join(this.baseDir, 'docker-validation-summary.md');
    fs.writeFileSync(mdPath, markdownReport);

    return report;
  }

  generateMarkdownReport(report) {
    const { results, summary } = report;
    
    return `# Docker Validation Report

## Run Information
- **Run ID**: ${report.runId}
- **Timestamp**: ${report.timestamp}

## Docker Validation Results

### Core Docker Tests
- **Docker Installed**: ${this.getStatusEmoji(results.dockerInstalled)} ${results.dockerInstalled ? 'Yes' : 'No'}
- **Build Success**: ${this.getStatusEmoji(results.buildSuccess)} ${results.buildSuccess ? 'Yes' : 'No'}
- **Container Run Success**: ${this.getStatusEmoji(results.runSuccess)} ${results.runSuccess ? 'Yes' : 'No'}
- **Health Check**: ${this.getStatusEmoji(results.healthCheck)} ${results.healthCheck ? 'Passed' : 'Failed'}

### Build Information
- **Build Time**: ${results.buildTime ? `${results.buildTime}ms` : 'N/A'}
- **Image Size**: ${results.imageSize || 'N/A'}

### API Endpoints Tested
${Object.entries(results.endpointsWorking).map(([endpoint, working]) => 
  `- **${endpoint}**: ${this.getStatusEmoji(working)} ${working ? 'Working' : 'Failed'}`
).join('\n')}

## Overall Status: ${this.getStatusEmoji(summary.dockerStatus === 'working')} ${summary.dockerStatus.toUpperCase()}

### Summary
- **Tests Passed**: ${summary.passedTests}/5
- **Endpoints Working**: ${summary.endpointsWorking}/${summary.totalEndpoints}
- **Docker Status**: ${summary.dockerStatus}

---
*Generated by EchoTune AI Docker Validation Suite*
`;
  }

  getStatusEmoji(status) {
    return status ? '✅' : '❌';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validate() {
    this.log('🎯 Starting Docker validation...');
    
    // Check Docker installation
    if (!(await this.checkDockerInstallation())) {
      return this.generateReport();
    }

    // Build Docker image
    if (!(await this.buildDockerImage())) {
      return this.generateReport();
    }

    // Run Docker container
    if (!(await this.runDockerContainer())) {
      await this.collectLogs();
      await this.cleanup();
      return this.generateReport();
    }

    // Perform health check
    await this.performHealthCheck();

    // Test endpoints
    await this.testEndpoints();

    // Collect logs
    await this.collectLogs();

    // Cleanup
    await this.cleanup();

    // Generate final report
    const report = this.generateReport();
    
    this.log(`📊 Docker validation complete - Report: ${this.baseDir}/docker-validation-report.json`);
    this.log(`🐳 Docker Status: ${report.summary.dockerStatus}`);
    
    return report;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DockerValidator();
  validator.validate().catch(console.error);
}

module.exports = DockerValidator;