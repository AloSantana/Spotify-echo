#!/usr/bin/env node

/**
 * Docker Validation Script
 * Build image, run container, health check, endpoint verification
 * Outputs: docker-validation.json, docker logs
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DockerValidator {
  constructor() {
    this.imageName = 'echotune-app:local';
    this.containerName = 'echotune-test-container';
    this.port = 3000;
    this.healthCheckTimeout = 120000; // 2 minutes
    this.report = {
      timestamp: new Date().toISOString(),
      success: false,
      build: {
        success: false,
        duration: 0,
        imageSize: null,
        error: null
      },
      run: {
        success: false,
        containerId: null,
        port: this.port,
        error: null
      },
      healthCheck: {
        success: false,
        duration: 0,
        attempts: 0,
        error: null
      },
      endpoints: {
        tested: [],
        working: 0,
        total: 0
      },
      logs: {
        build: [],
        runtime: [],
        errors: []
      },
      cleanup: {
        containerStopped: false,
        containerRemoved: false,
        imageCleaned: false
      }
    };
    
    this.endpointsToTest = [
      { path: '/health', method: 'GET', expected: 200 },
      { path: '/api/chat', method: 'POST', expected: [200, 400, 401] }, // 400/401 acceptable without auth
      { path: '/api/recommendations', method: 'GET', expected: [200, 400, 401] }
    ];
  }

  async validateDocker() {
    console.log('🐳 Starting Docker validation...\n');

    try {
      // 1. Check Docker availability
      await this.checkDockerAvailable();
      
      // 2. Build Docker image
      await this.buildImage();
      
      // 3. Run container
      await this.runContainer();
      
      // 4. Health check
      await this.performHealthCheck();
      
      // 5. Test endpoints
      await this.testEndpoints();
      
      // 6. Collect logs
      await this.collectLogs();
      
      this.report.success = this.report.build.success && 
                           this.report.run.success && 
                           this.report.healthCheck.success;

    } catch (error) {
      console.error('💥 Docker validation failed:', error.message);
      this.report.logs.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      });
    } finally {
      // Always cleanup
      await this.cleanup();
    }

    return this.report;
  }

  async checkDockerAvailable() {
    console.log('🔍 Checking Docker availability...');
    
    try {
      const { stdout } = await execAsync('docker --version');
      console.log(`✅ Docker available: ${stdout.trim()}`);
    } catch (error) {
      throw new Error(`Docker not available: ${error.message}`);
    }
  }

  async buildImage() {
    console.log('🏗️ Building Docker image...');
    
    const startTime = Date.now();
    
    try {
      // Check if Dockerfile exists
      const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
      if (!fs.existsSync(dockerfilePath)) {
        throw new Error('Dockerfile not found in project root');
      }

      // Build the image
      const buildCommand = `docker build -t ${this.imageName} .`;
      console.log(`Executing: ${buildCommand}`);
      
      const { stdout, stderr } = await execAsync(buildCommand, { 
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      this.report.build.duration = Date.now() - startTime;
      this.report.build.success = true;
      
      this.report.logs.build.push({
        timestamp: new Date().toISOString(),
        type: 'stdout',
        content: stdout
      });
      
      if (stderr) {
        this.report.logs.build.push({
          timestamp: new Date().toISOString(),
          type: 'stderr', 
          content: stderr
        });
      }

      // Get image size
      try {
        const { stdout: sizeOutput } = await execAsync(`docker images ${this.imageName} --format "{{.Size}}"`);
        this.report.build.imageSize = sizeOutput.trim();
        console.log(`✅ Image built successfully in ${this.report.build.duration}ms (${this.report.build.imageSize})`);
      } catch (sizeError) {
        console.log(`✅ Image built successfully in ${this.report.build.duration}ms (size unknown)`);
      }

    } catch (error) {
      this.report.build.duration = Date.now() - startTime;
      this.report.build.error = error.message;
      this.report.logs.errors.push({
        timestamp: new Date().toISOString(),
        phase: 'build',
        error: error.message
      });
      
      console.error(`❌ Image build failed: ${error.message}`);
      throw error;
    }
  }

  async runContainer() {
    console.log('🚀 Running Docker container...');
    
    try {
      // Stop and remove any existing container
      await this.stopAndRemoveContainer().catch(() => {}); // Ignore errors
      
      // Run the container
      const envVars = this.buildEnvVars();
      const runCommand = `docker run -d --name ${this.containerName} -p ${this.port}:${this.port} ${envVars} ${this.imageName}`;
      
      console.log(`Executing: docker run -d --name ${this.containerName} -p ${this.port}:${this.port} [ENV_VARS] ${this.imageName}`);
      
      const { stdout } = await execAsync(runCommand);
      const containerId = stdout.trim();
      
      this.report.run.success = true;
      this.report.run.containerId = containerId;
      
      console.log(`✅ Container started: ${containerId.substring(0, 12)}`);
      
      // Wait a moment for container to start
      await this.sleep(3000);

    } catch (error) {
      this.report.run.error = error.message;
      this.report.logs.errors.push({
        timestamp: new Date().toISOString(),
        phase: 'run',
        error: error.message
      });
      
      console.error(`❌ Container run failed: ${error.message}`);
      throw error;
    }
  }

  buildEnvVars() {
    // Build minimal environment for Docker run
    const envVars = [];
    
    // Required vars with defaults for testing
    envVars.push('-e NODE_ENV=production');
    envVars.push(`-e PORT=${this.port}`);
    envVars.push('-e JWT_SECRET=test-jwt-secret-for-docker-validation');
    envVars.push('-e MONGODB_URI=mongodb://localhost:27017/echotune_test');
    
    // Optional vars from environment
    const optionalVars = [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET', 
      'OPENAI_API_KEY',
      'GEMINI_API_KEY'
    ];
    
    for (const varName of optionalVars) {
      const value = process.env[varName];
      if (value && value !== 'your_key_here' && !value.startsWith('your_')) {
        envVars.push(`-e ${varName}=${value}`);
      }
    }
    
    return envVars.join(' ');
  }

  async performHealthCheck() {
    console.log('🏥 Performing health check...');
    
    const startTime = Date.now();
    const maxAttempts = 40; // 2 minutes with 3s intervals
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      this.report.healthCheck.attempts = attempts;
      
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`http://localhost:${this.port}/health`, {
          timeout: 5000
        });
        
        if (response.ok) {
          this.report.healthCheck.success = true;
          this.report.healthCheck.duration = Date.now() - startTime;
          console.log(`✅ Health check passed on attempt ${attempts} (${this.report.healthCheck.duration}ms)`);
          return;
        } else {
          console.log(`  Attempt ${attempts}: HTTP ${response.status}`);
        }
        
      } catch (error) {
        console.log(`  Attempt ${attempts}: ${error.message}`);
      }
      
      if (attempts < maxAttempts) {
        await this.sleep(3000);
      }
    }
    
    this.report.healthCheck.duration = Date.now() - startTime;
    this.report.healthCheck.error = `Health check failed after ${attempts} attempts`;
    console.error(`❌ Health check failed after ${attempts} attempts`);
  }

  async testEndpoints() {
    console.log('🧪 Testing application endpoints...');
    
    if (!this.report.healthCheck.success) {
      console.log('⚠️ Skipping endpoint tests - health check failed');
      return;
    }
    
    this.report.endpoints.total = this.endpointsToTest.length;
    
    for (const endpoint of this.endpointsToTest) {
      await this.testSingleEndpoint(endpoint);
    }
    
    console.log(`📊 Endpoint test results: ${this.report.endpoints.working}/${this.report.endpoints.total} working`);
  }

  async testSingleEndpoint(endpoint) {
    const startTime = Date.now();
    
    try {
      const fetch = (await import('node-fetch')).default;
      const url = `http://localhost:${this.port}${endpoint.path}`;
      
      const options = {
        method: endpoint.method,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Docker-Validation-Test'
        }
      };
      
      // Add body for POST requests
      if (endpoint.method === 'POST' && endpoint.path === '/api/chat') {
        options.body = JSON.stringify({
          message: 'Docker validation test',
          provider: 'auto'
        });
      }
      
      const response = await fetch(url, options);
      const latency = Date.now() - startTime;
      
      const expectedStatuses = Array.isArray(endpoint.expected) ? endpoint.expected : [endpoint.expected];
      const isWorking = expectedStatuses.includes(response.status);
      
      if (isWorking) {
        this.report.endpoints.working++;
        console.log(`  ✅ ${endpoint.method} ${endpoint.path}: ${response.status} (${latency}ms)`);
      } else {
        console.log(`  ❌ ${endpoint.method} ${endpoint.path}: ${response.status} (expected ${endpoint.expected}) (${latency}ms)`);
      }
      
      this.report.endpoints.tested.push({
        path: endpoint.path,
        method: endpoint.method,
        status: response.status,
        expected: endpoint.expected,
        working: isWorking,
        latency,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const latency = Date.now() - startTime;
      console.log(`  ❌ ${endpoint.method} ${endpoint.path}: ${error.message} (${latency}ms)`);
      
      this.report.endpoints.tested.push({
        path: endpoint.path,
        method: endpoint.method,
        status: 'error',
        expected: endpoint.expected,
        working: false,
        latency,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async collectLogs() {
    console.log('📋 Collecting container logs...');
    
    if (!this.report.run.containerId) {
      console.log('⚠️ No container ID available for log collection');
      return;
    }
    
    try {
      const { stdout, stderr } = await execAsync(`docker logs ${this.containerName}`);
      
      if (stdout) {
        this.report.logs.runtime.push({
          timestamp: new Date().toISOString(),
          type: 'stdout',
          content: stdout
        });
      }
      
      if (stderr) {
        this.report.logs.runtime.push({
          timestamp: new Date().toISOString(),
          type: 'stderr',
          content: stderr
        });
      }
      
      // Write logs to file
      const logsDir = path.join(process.cwd(), 'reports', 'docker-logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const logPath = path.join(logsDir, 'container.log');
      const combinedLogs = stdout + '\n' + stderr;
      fs.writeFileSync(logPath, combinedLogs);
      
      console.log(`📄 Logs written to: ${logPath}`);
      
    } catch (error) {
      console.error(`❌ Failed to collect logs: ${error.message}`);
      this.report.logs.errors.push({
        timestamp: new Date().toISOString(),
        phase: 'logs',
        error: error.message
      });
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up Docker resources...');
    
    try {
      await this.stopAndRemoveContainer();
      
      // Optionally remove image (commented out to save build time in CI)
      // await execAsync(`docker rmi ${this.imageName}`).catch(() => {});
      // this.report.cleanup.imageCleaned = true;
      
    } catch (error) {
      console.error(`⚠️ Cleanup error: ${error.message}`);
    }
  }

  async stopAndRemoveContainer() {
    try {
      await execAsync(`docker stop ${this.containerName}`);
      this.report.cleanup.containerStopped = true;
      console.log('  ✅ Container stopped');
    } catch (error) {
      // Container might not be running
    }
    
    try {
      await execAsync(`docker rm ${this.containerName}`);
      this.report.cleanup.containerRemoved = true;
      console.log('  ✅ Container removed');
    } catch (error) {
      // Container might not exist
    }
  }

  generateSummary() {
    console.log('\n📊 Docker Validation Summary:');
    console.log('='.repeat(50));
    
    console.log(`Build: ${this.report.build.success ? '✅' : '❌'} ${this.report.build.success ? `(${this.report.build.duration}ms, ${this.report.build.imageSize || 'unknown size'})` : this.report.build.error}`);
    console.log(`Run: ${this.report.run.success ? '✅' : '❌'} ${this.report.run.success ? `(${this.report.run.containerId?.substring(0, 12)})` : this.report.run.error}`);
    console.log(`Health: ${this.report.healthCheck.success ? '✅' : '❌'} ${this.report.healthCheck.success ? `(${this.report.healthCheck.duration}ms, ${this.report.healthCheck.attempts} attempts)` : this.report.healthCheck.error}`);
    console.log(`Endpoints: ${this.report.endpoints.working}/${this.report.endpoints.total} working`);
    
    if (this.report.logs.errors.length > 0) {
      console.log(`Errors: ${this.report.logs.errors.length}`);
    }
    
    console.log(`Overall: ${this.report.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(50));
  }

  writeReport() {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Write Docker validation report
      const reportPath = path.join(reportsDir, 'docker-validation.json');
      fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));

      console.log(`\n📄 Report written to: ${reportPath}`);

    } catch (error) {
      console.error('❌ Failed to write report:', error.message);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      await this.validateDocker();
      this.generateSummary();
      this.writeReport();

      if (this.report.success) {
        console.log('\n✅ Docker validation completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Docker validation failed');
        process.exit(1);
      }

    } catch (error) {
      console.error('💥 Docker validation error:', error.message);
      
      // Write error report
      const errorReport = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        report: this.report
      };

      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(reportsDir, 'docker-validation.json'), 
        JSON.stringify(errorReport, null, 2)
      );

      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DockerValidator();
  validator.run();
}

module.exports = DockerValidator;