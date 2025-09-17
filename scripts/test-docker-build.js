#!/usr/bin/env node

/**
 * Docker Build Test Script
 * Tests Docker build process with Puppeteer fix
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testDockerBuild() {
    console.log('🐋 Testing Docker build with Puppeteer fix...\n');
    
    const reportDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        testType: 'docker-build-validation',
        status: 'running',
        stages: {},
        errors: [],
        puppeteerFix: {
            applied: true,
            environmentVariables: [
                'PUPPETEER_SKIP_DOWNLOAD=true',
                'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true',
                'PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser'
            ]
        }
    };
    
    try {
        // Stage 1: Build Docker image
        console.log('📦 Stage 1: Building Docker image...');
        const buildResult = await runCommand('docker', ['build', '.', '-t', 'echotune-test:latest']);
        
        report.stages.build = {
            status: buildResult.success ? 'success' : 'failed',
            duration: buildResult.duration,
            output: buildResult.output.slice(-1000) // Last 1000 chars
        };
        
        if (!buildResult.success) {
            throw new Error('Docker build failed');
        }
        
        console.log('✅ Docker build successful!\n');
        
        // Stage 2: Test container startup
        console.log('🚀 Stage 2: Testing container startup...');
        const runResult = await runCommand('docker', [
            'run', '--rm', '-d',
            '--name', 'echotune-test-container',
            '-p', '3000:3000',
            '-e', 'NODE_ENV=production',
            '-e', 'MONGODB_URI=mongodb://localhost:27017/echotune',
            'echotune-test:latest'
        ]);
        
        if (runResult.success) {
            const containerId = runResult.output.trim();
            console.log(`✅ Container started with ID: ${containerId.slice(0, 12)}`);
            
            // Wait a moment for startup
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Stage 3: Health check
            console.log('🏥 Stage 3: Running health check...');
            const healthResult = await runCommand('curl', [
                '-f', 'http://localhost:3000/health'
            ]);
            
            report.stages.health = {
                status: healthResult.success ? 'success' : 'failed',
                response: healthResult.output
            };
            
            // Clean up container
            await runCommand('docker', ['stop', containerId]);
            console.log('🧹 Container stopped and cleaned up');
        }
        
        report.stages.run = {
            status: runResult.success ? 'success' : 'failed',
            containerId: runResult.output.trim().slice(0, 12)
        };
        
        // Stage 4: Image inspection
        console.log('🔍 Stage 4: Inspecting image...');
        const inspectResult = await runCommand('docker', ['image', 'inspect', 'echotune-test:latest']);
        
        if (inspectResult.success) {
            const imageData = JSON.parse(inspectResult.output)[0];
            report.stages.inspect = {
                status: 'success',
                size: imageData.Size,
                created: imageData.Created,
                layers: imageData.RootFS.Layers?.length || 0
            };
        }
        
        report.status = 'success';
        console.log('\n🎉 Docker build test completed successfully!');
        
    } catch (error) {
        report.status = 'failed';
        report.errors.push({
            message: error.message,
            timestamp: new Date().toISOString()
        });
        console.error('\n❌ Docker build test failed:', error.message);
    }
    
    // Generate report
    const reportPath = path.join(reportDir, 'docker-build-test.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate summary
    console.log('\n📊 Test Summary:');
    console.log(`Status: ${report.status}`);
    console.log(`Build: ${report.stages.build?.status || 'skipped'}`);
    console.log(`Run: ${report.stages.run?.status || 'skipped'}`);
    console.log(`Health: ${report.stages.health?.status || 'skipped'}`);
    console.log(`Report saved: ${reportPath}`);
    
    return report.status === 'success';
}

function runCommand(command, args) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const proc = spawn(command, args, { stdio: 'pipe' });
        
        let output = '';
        let error = '';
        
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        proc.on('close', (code) => {
            const duration = Date.now() - startTime;
            resolve({
                success: code === 0,
                output: output || error,
                duration,
                exitCode: code
            });
        });
    });
}

// Run if called directly
if (require.main === module) {
    testDockerBuild()
        .then((success) => process.exit(success ? 0 : 1))
        .catch((error) => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = { testDockerBuild };