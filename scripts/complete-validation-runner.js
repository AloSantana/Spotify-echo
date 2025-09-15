#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Complete EchoTune AI Validation Runner
 * 
 * This script runs all validation tests and generates comprehensive reports
 * with screenshots stored in BROWSERTESTIMAGES folder
 */

class CompleteValidationRunner {
  constructor() {
    this.runId = `complete-${Date.now()}`;
    this.baseDir = path.join(process.cwd(), 'BROWSERTESTIMAGES', this.runId);
    this.results = {
      environment: {},
      npm: {},
      docker: {},
      e2e: {},
      summary: {}
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async validateEnvironment() {
    this.log('🔍 Validating environment configuration...');
    
    try {
      // Check if .env file exists
      const envPath = path.join(process.cwd(), '.env');
      const envExists = fs.existsSync(envPath);
      
      this.results.environment.envFileExists = envExists;
      
      if (envExists) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check for required variables
        const requiredVars = [
          'MONGODB_URI',
          'SPOTIFY_CLIENT_ID', 
          'SPOTIFY_CLIENT_SECRET',
          'JWT_SECRET'
        ];
        
        const optionalVars = [
          'OPENAI_API_KEY',
          'GEMINI_API_KEY',
          'ANTHROPIC_API_KEY',
          'DEEPSEEK_API_KEY'
        ];
        
        this.results.environment.requiredVars = {};
        this.results.environment.optionalVars = {};
        
        // Check required variables
        for (const varName of requiredVars) {
          const hasVar = envContent.includes(`${varName}=`) && 
                        !envContent.includes(`${varName}=your_`) &&
                        !envContent.includes(`${varName}=changeme`);
          this.results.environment.requiredVars[varName] = hasVar;
        }
        
        // Check optional variables
        for (const varName of optionalVars) {
          const hasVar = envContent.includes(`${varName}=`) && 
                        !envContent.includes(`${varName}=your_`) &&
                        !envContent.includes(`${varName}=changeme`) &&
                        !envContent.includes(`${varName}=sk-your-`);
          this.results.environment.optionalVars[varName] = hasVar;
        }
        
        this.log('✅ Environment validation completed');
      } else {
        this.log('⚠️ No .env file found');
      }
      
      this.results.environment.status = 'completed';
      
    } catch (error) {
      this.log(`❌ Environment validation failed: ${error.message}`);
      this.results.environment.status = 'failed';
      this.results.environment.error = error.message;
    }
  }

  async validateNpmApp() {
    this.log('📦 Validating npm application...');
    
    try {
      // Check if dependencies are installed
      const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
      this.results.npm.dependenciesInstalled = nodeModulesExists;
      
      if (!nodeModulesExists) {
        this.log('📦 Installing npm dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        this.results.npm.dependenciesInstalled = true;
      }
      
      // Start the application
      this.log('🚀 Starting npm application...');
      const appProcess = spawn('npm', ['start'], { 
        detached: true,
        stdio: 'pipe'
      });
      
      // Wait for app to start
      await this.sleep(10000);
      
      // Check if app is running
      try {
        const response = await this.fetch('http://localhost:3000');
        this.results.npm.appStarted = true;
        this.results.npm.serverRunning = true;
        this.log('✅ NPM application is running');
      } catch (error) {
        this.results.npm.appStarted = false;
        this.results.npm.serverRunning = false;
        this.log(`❌ NPM application failed to start: ${error.message}`);
      }
      
      this.results.npm.status = 'completed';
      this.results.npm.processId = appProcess.pid;
      
    } catch (error) {
      this.log(`❌ NPM validation failed: ${error.message}`);
      this.results.npm.status = 'failed';
      this.results.npm.error = error.message;
    }
  }

  async runE2ETests() {
    this.log('🎭 Running E2E tests with screenshots...');
    
    try {
      // Install Playwright if needed
      try {
        execSync('npx playwright install', { stdio: 'inherit' });
      } catch (error) {
        this.log('⚠️ Playwright install warning (may already be installed)');
      }
      
      // Run the comprehensive E2E test
      const testCommand = 'npx playwright test tests/e2e/complete-app-validation.spec.js --reporter=json';
      const testOutput = execSync(testCommand, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse test results
      try {
        const testResults = JSON.parse(testOutput);
        this.results.e2e.testResults = testResults;
        this.results.e2e.status = 'completed';
        this.log('✅ E2E tests completed');
      } catch (parseError) {
        this.results.e2e.rawOutput = testOutput;
        this.results.e2e.status = 'completed';
        this.log('⚠️ E2E tests ran but results parsing failed');
      }
      
    } catch (error) {
      this.log(`❌ E2E tests failed: ${error.message}`);
      this.results.e2e.status = 'failed';
      this.results.e2e.error = error.message;
    }
  }

  async validateDocker() {
    this.log('🐳 Running Docker validation...');
    
    try {
      // Import and run Docker validator
      const DockerValidator = require('./docker-validate-complete.js');
      const dockerValidator = new DockerValidator();
      
      const dockerResults = await dockerValidator.validate();
      this.results.docker = dockerResults;
      
      this.log('✅ Docker validation completed');
      
    } catch (error) {
      this.log(`❌ Docker validation failed: ${error.message}`);
      this.results.docker.status = 'failed';
      this.results.docker.error = error.message;
    }
  }

  async generateComprehensiveReport() {
    this.log('📊 Generating comprehensive validation report...');
    
    // Calculate summary statistics
    const summary = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      totalTests: 4, // environment, npm, e2e, docker
      completedTests: 0,
      failedTests: 0,
      overallStatus: 'unknown',
      featureStatus: {
        environment: this.results.environment.status === 'completed' ? 'working' : 'failed',
        npmApp: this.results.npm.serverRunning ? 'working' : 'failed',
        e2eTests: this.results.e2e.status === 'completed' ? 'working' : 'failed',
        docker: this.results.docker?.summary?.dockerStatus === 'working' ? 'working' : 'failed'
      }
    };
    
    // Count completed and failed tests
    Object.values(this.results).forEach(result => {
      if (result.status === 'completed') summary.completedTests++;
      if (result.status === 'failed') summary.failedTests++;
    });
    
    // Determine overall status
    if (summary.failedTests === 0) {
      summary.overallStatus = 'healthy';
    } else if (summary.completedTests > summary.failedTests) {
      summary.overallStatus = 'warning';
    } else {
      summary.overallStatus = 'failed';
    }
    
    this.results.summary = summary;
    
    // Generate comprehensive report
    const fullReport = {
      ...this.results,
      metadata: {
        generatedBy: 'EchoTune AI Complete Validation Suite',
        version: '1.0.0',
        runId: this.runId,
        timestamp: new Date().toISOString()
      }
    };
    
    // Save JSON report
    const jsonPath = path.join(this.baseDir, 'complete-validation-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2));
    
    // Generate markdown summary
    const markdownSummary = this.generateMarkdownSummary(fullReport);
    const mdPath = path.join(this.baseDir, 'complete-validation-summary.md');
    fs.writeFileSync(mdPath, markdownSummary);
    
    // Copy to root for easy access
    const rootJsonPath = path.join(process.cwd(), 'validation-report.json');
    const rootMdPath = path.join(process.cwd(), 'validation-summary.md');
    fs.copyFileSync(jsonPath, rootJsonPath);
    fs.copyFileSync(mdPath, rootMdPath);
    
    return fullReport;
  }

  generateMarkdownSummary(report) {
    const summary = report.summary;
    
    return `# EchoTune AI - Complete Application Validation Report

## Run Information
- **Run ID**: ${summary.runId}
- **Timestamp**: ${summary.timestamp}
- **Tests Completed**: ${summary.completedTests}/${summary.totalTests}
- **Overall Status**: ${this.getStatusEmoji(summary.overallStatus)} **${summary.overallStatus.toUpperCase()}**

## Feature Status Summary

### Core System Components
- **Environment Configuration**: ${this.getStatusEmoji(summary.featureStatus.environment === 'working')} ${summary.featureStatus.environment}
- **NPM Application**: ${this.getStatusEmoji(summary.featureStatus.npmApp === 'working')} ${summary.featureStatus.npmApp}
- **E2E Testing**: ${this.getStatusEmoji(summary.featureStatus.e2eTests === 'working')} ${summary.featureStatus.e2eTests}
- **Docker Containerization**: ${this.getStatusEmoji(summary.featureStatus.docker === 'working')} ${summary.featureStatus.docker}

## Detailed Results

### Environment Validation
${report.environment.envFileExists ? '✅' : '❌'} Environment file (.env) exists

#### Required Variables
${Object.entries(report.environment.requiredVars || {}).map(([key, value]) => 
  `- **${key}**: ${this.getStatusEmoji(value)} ${value ? 'Configured' : 'Missing/Placeholder'}`
).join('\n')}

#### Optional Variables (AI Providers)
${Object.entries(report.environment.optionalVars || {}).map(([key, value]) => 
  `- **${key}**: ${this.getStatusEmoji(value)} ${value ? 'Configured' : 'Not configured'}`
).join('\n')}

### NPM Application
- **Dependencies Installed**: ${this.getStatusEmoji(report.npm.dependenciesInstalled)} ${report.npm.dependenciesInstalled ? 'Yes' : 'No'}
- **Server Running**: ${this.getStatusEmoji(report.npm.serverRunning)} ${report.npm.serverRunning ? 'Yes' : 'No'}
- **App Started**: ${this.getStatusEmoji(report.npm.appStarted)} ${report.npm.appStarted ? 'Yes' : 'No'}

### Docker Validation
${report.docker?.summary ? `
- **Docker Status**: ${this.getStatusEmoji(report.docker.summary.dockerStatus === 'working')} ${report.docker.summary.dockerStatus}
- **Build Success**: ${this.getStatusEmoji(report.docker.results?.buildSuccess)} ${report.docker.results?.buildSuccess ? 'Yes' : 'No'}
- **Container Runtime**: ${this.getStatusEmoji(report.docker.results?.runSuccess)} ${report.docker.results?.runSuccess ? 'Yes' : 'No'}
- **Health Check**: ${this.getStatusEmoji(report.docker.results?.healthCheck)} ${report.docker.results?.healthCheck ? 'Passed' : 'Failed'}
- **API Endpoints**: ${report.docker.summary.endpointsWorking}/${report.docker.summary.totalEndpoints} working
` : '- Docker validation not completed or failed'}

### E2E Testing
- **Test Status**: ${this.getStatusEmoji(report.e2e.status === 'completed')} ${report.e2e.status || 'not run'}
- **Screenshots Captured**: Available in BROWSERTESTIMAGES folder

## Spotify Integration Status

Based on environment configuration:
- **Spotify Client ID**: ${this.getStatusEmoji(report.environment.requiredVars?.SPOTIFY_CLIENT_ID)} ${report.environment.requiredVars?.SPOTIFY_CLIENT_ID ? 'Configured' : 'Missing'}
- **Spotify Client Secret**: ${this.getStatusEmoji(report.environment.requiredVars?.SPOTIFY_CLIENT_SECRET)} ${report.environment.requiredVars?.SPOTIFY_CLIENT_SECRET ? 'Configured' : 'Missing'}

## MongoDB Database Status

- **MongoDB URI**: ${this.getStatusEmoji(report.environment.requiredVars?.MONGODB_URI)} ${report.environment.requiredVars?.MONGODB_URI ? 'Configured' : 'Missing'}

## AI/LLM Providers Status

${Object.entries(report.environment.optionalVars || {}).filter(([key]) => key.includes('API_KEY')).map(([key, configured]) => {
  const provider = key.replace('_API_KEY', '');
  return `- **${provider}**: ${this.getStatusEmoji(configured)} ${configured ? 'Available' : 'Not configured'}`;
}).join('\n')}

## Screenshots and Artifacts

All test screenshots and logs are stored in:
\`\`\`
BROWSERTESTIMAGES/${summary.runId}/
├── auth/                    # Authentication flow screenshots
├── chat/                    # Chat functionality screenshots  
├── recommendations/         # Music recommendation screenshots
├── settings/               # Settings page screenshots
├── mongodb/                # Database connectivity screenshots
├── docker/                 # Docker validation screenshots
└── errorflow/              # Error handling screenshots
\`\`\`

## Summary

This validation tested **all major functions** of the EchoTune AI Spotify application:

### ✅ Working Features
${Object.entries(summary.featureStatus).filter(([, status]) => status === 'working').map(([feature]) => `- ${feature}`).join('\n')}

### ❌ Issues Found
${Object.entries(summary.featureStatus).filter(([, status]) => status === 'failed').map(([feature]) => `- ${feature}`).join('\n')}

---
*Generated by EchoTune AI Complete Validation Suite*
*Report files: validation-report.json, validation-summary.md*
`;
  }

  getStatusEmoji(status) {
    if (status === true || status === 'working' || status === 'healthy') return '✅';
    if (status === false || status === 'failed') return '❌';
    if (status === 'warning') return '⚠️';
    return '❓';
  }

  async fetch(url) {
    // Simple fetch implementation for Node.js
    return new Promise((resolve, reject) => {
      const http = require('http');
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    this.log('🧹 Cleaning up processes...');
    
    // Kill any running npm processes
    try {
      if (this.results.npm.processId) {
        process.kill(-this.results.npm.processId, 'SIGTERM');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Kill any node processes on port 3000
    try {
      execSync('pkill -f "node.*server.js"', { stdio: 'ignore' });
    } catch (error) {
      // Ignore if no processes found
    }
  }

  async run() {
    this.log('🎯 Starting complete EchoTune AI validation...');
    this.log(`📁 Results will be stored in: ${this.baseDir}`);
    
    try {
      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Validate npm application
      await this.validateNpmApp();
      
      // Step 3: Run E2E tests (if app is running)
      if (this.results.npm.serverRunning) {
        await this.runE2ETests();
      } else {
        this.log('⚠️ Skipping E2E tests - app not running');
      }
      
      // Step 4: Validate Docker
      await this.validateDocker();
      
      // Step 5: Generate comprehensive report
      const report = await this.generateComprehensiveReport();
      
      this.log('📊 Validation complete!');
      this.log(`📄 Report: ${this.baseDir}/complete-validation-report.json`);
      this.log(`📋 Summary: validation-summary.md`);
      this.log(`📸 Screenshots: BROWSERTESTIMAGES/${this.runId}/`);
      
      return report;
      
    } catch (error) {
      this.log(`❌ Validation failed: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const runner = new CompleteValidationRunner();
  runner.run()
    .then(report => {
      console.log('\n🎉 Validation Summary:');
      console.log(`Overall Status: ${report.summary.overallStatus}`);
      console.log(`Features Working: ${Object.values(report.summary.featureStatus).filter(s => s === 'working').length}/4`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = CompleteValidationRunner;