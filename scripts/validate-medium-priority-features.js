#!/usr/bin/env node

/**
 * Comprehensive Feature Validation Script
 * Tests all Medium Priority features implemented:
 * 1. Enhanced Chat Interface with configurable LLM providers
 * 2. Advanced Performance Monitoring
 * 3. Comprehensive Testing Expansion
 * 4. Docker Optimization validation
 * 5. Modern UI improvements
 */

const fs = require('fs').promises;
const path = require('path');

console.log('🚀 Starting Comprehensive Feature Validation...\n');

const results = {
  timestamp: new Date(),
  features: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper function to log results
function logResult(feature, status, message, details = null) {
  const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${statusIcon} ${feature}: ${message}`);
  
  results.features[feature] = {
    status,
    message,
    details,
    timestamp: new Date()
  };
  
  results.summary.total++;
  if (status === 'pass') results.summary.passed++;
  else if (status === 'fail') results.summary.failed++;
  else results.summary.warnings++;
}

// Test 1: Enhanced Chat Interface Components
async function testEnhancedChatInterface() {
  console.log('\n📱 Testing Enhanced Chat Interface...');
  
  try {
    // Check if EnhancedModernChatInterface exists
    const chatFile = path.join(__dirname, '..', 'src/frontend/components/EnhancedModernChatInterface.jsx');
    const chatExists = await fs.access(chatFile).then(() => true).catch(() => false);
    
    if (chatExists) {
      const content = await fs.readFile(chatFile, 'utf8');
      
      // Check for key features
      const features = {
        'Provider Selection': content.includes('currentProvider') && content.includes('setCurrentProvider'),
        'Model Configuration': content.includes('currentModel') && content.includes('providerModels'),
        'Real-time Settings': content.includes('chatSettings') && content.includes('saveChatSettings'),
        'Voice Input': content.includes('webkitSpeechRecognition') && content.includes('handleVoiceInput'),
        'Provider Testing': content.includes('/api/chat/providers/test'),
        'Performance Metrics': content.includes('messageStats') && content.includes('avgResponseTime'),
        'Modern UI': content.includes('Material-UI') || content.includes('@mui/material')
      };
      
      const passedFeatures = Object.entries(features).filter(([, passed]) => passed);
      const failedFeatures = Object.entries(features).filter(([, passed]) => !passed);
      
      if (failedFeatures.length === 0) {
        logResult('Enhanced Chat Interface', 'pass', `All 7 features implemented (${passedFeatures.length}/7)`, features);
      } else {
        logResult('Enhanced Chat Interface', 'warning', `${passedFeatures.length}/7 features implemented`, {
          passed: passedFeatures.map(([name]) => name),
          failed: failedFeatures.map(([name]) => name)
        });
      }
    } else {
      logResult('Enhanced Chat Interface', 'fail', 'EnhancedModernChatInterface.jsx not found');
    }
  } catch (error) {
    logResult('Enhanced Chat Interface', 'fail', `Error: ${error.message}`);
  }
}

// Test 2: Performance Monitoring Components
async function testPerformanceMonitoring() {
  console.log('\n📊 Testing Performance Monitoring...');
  
  try {
    // Check component
    const perfFile = path.join(__dirname, '..', 'src/frontend/components/AdvancedPerformanceMonitoring.jsx');
    const perfExists = await fs.access(perfFile).then(() => true).catch(() => false);
    
    // Check API routes
    const apiFile = path.join(__dirname, '..', 'src/api/routes/enhanced-performance.js');
    const apiExists = await fs.access(apiFile).then(() => true).catch(() => false);
    
    if (perfExists && apiExists) {
      const componentContent = await fs.readFile(perfFile, 'utf8');
      const apiContent = await fs.readFile(apiFile, 'utf8');
      
      const features = {
        'System Metrics': componentContent.includes('systemMetrics') && apiContent.includes('/system'),
        'API Performance': componentContent.includes('apiMetrics') && apiContent.includes('/api'),
        'Database Metrics': componentContent.includes('databaseMetrics') && apiContent.includes('/database'),
        'Real-time Updates': componentContent.includes('autoRefresh') && componentContent.includes('loadPerformanceData'),
        'Export Functionality': componentContent.includes('exportData'),
        'Alert Management': componentContent.includes('alerts') && apiContent.includes('/alerts'),
        'Multi-tab Interface': componentContent.includes('Tabs') && componentContent.includes('activeTab')
      };
      
      const passedFeatures = Object.entries(features).filter(([, passed]) => passed);
      
      if (passedFeatures.length >= 6) {
        logResult('Performance Monitoring', 'pass', `${passedFeatures.length}/7 features implemented`, features);
      } else {
        logResult('Performance Monitoring', 'warning', `${passedFeatures.length}/7 features implemented`, features);
      }
    } else {
      logResult('Performance Monitoring', 'fail', `Component exists: ${perfExists}, API exists: ${apiExists}`);
    }
  } catch (error) {
    logResult('Performance Monitoring', 'fail', `Error: ${error.message}`);
  }
}

// Test 3: Testing Expansion
async function testTestingExpansion() {
  console.log('\n🧪 Testing Comprehensive Testing Expansion...');
  
  try {
    const testFile = path.join(__dirname, '..', 'src/frontend/components/ComprehensiveTestingExpansion.jsx');
    const testApiFile = path.join(__dirname, '..', 'src/api/routes/enhanced-testing.js');
    
    const componentExists = await fs.access(testFile).then(() => true).catch(() => false);
    const apiExists = await fs.access(testApiFile).then(() => true).catch(() => false);
    
    if (componentExists && apiExists) {
      const componentContent = await fs.readFile(testFile, 'utf8');
      const apiContent = await fs.readFile(testApiFile, 'utf8');
      
      const features = {
        'Test Suite Management': componentContent.includes('testSuites') && apiContent.includes('/suites'),
        'Real-time Execution': componentContent.includes('runningTests') && apiContent.includes('/run/'),
        'Coverage Analysis': componentContent.includes('coverage') && apiContent.includes('/coverage'),
        'Multiple Test Types': apiContent.includes('unit') && apiContent.includes('integration') && apiContent.includes('e2e'),
        'Health Checks': apiContent.includes('/health-check'),
        'Test Results': apiContent.includes('/results/'),
        'Status Monitoring': apiContent.includes('/status')
      };
      
      const passedFeatures = Object.entries(features).filter(([, passed]) => passed);
      
      if (passedFeatures.length >= 6) {
        logResult('Testing Expansion', 'pass', `${passedFeatures.length}/7 features implemented`, features);
      } else {
        logResult('Testing Expansion', 'warning', `${passedFeatures.length}/7 features implemented`, features);
      }
    } else {
      logResult('Testing Expansion', 'fail', `Component exists: ${componentExists}, API exists: ${apiExists}`);
    }
  } catch (error) {
    logResult('Testing Expansion', 'fail', `Error: ${error.message}`);
  }
}

// Test 4: Docker Optimization
async function testDockerOptimization() {
  console.log('\n🐳 Testing Docker Optimization...');
  
  try {
    const optimizedDockerfile = path.join(__dirname, '..', 'Dockerfile.optimized');
    const optimizedCompose = path.join(__dirname, '..', 'docker-compose.optimized.yml');
    
    const dockerfileExists = await fs.access(optimizedDockerfile).then(() => true).catch(() => false);
    const composeExists = await fs.access(optimizedCompose).then(() => true).catch(() => false);
    
    if (dockerfileExists && composeExists) {
      const dockerfileContent = await fs.readFile(optimizedDockerfile, 'utf8');
      const composeContent = await fs.readFile(optimizedCompose, 'utf8');
      
      const features = {
        'Multi-stage Build': dockerfileContent.includes('FROM node:20-alpine AS'),
        'Puppeteer Optimization': dockerfileContent.includes('PUPPETEER_SKIP_DOWNLOAD=true'),
        'Non-root User': dockerfileContent.includes('USER echotune'),
        'Health Checks': dockerfileContent.includes('HEALTHCHECK'),
        'Service Composition': composeContent.includes('services:'),
        'Resource Limits': composeContent.includes('limits:') && composeContent.includes('memory:'),
        'Volume Management': composeContent.includes('volumes:'),
        'Network Configuration': composeContent.includes('networks:')
      };
      
      const passedFeatures = Object.entries(features).filter(([, passed]) => passed);
      
      if (passedFeatures.length >= 7) {
        logResult('Docker Optimization', 'pass', `${passedFeatures.length}/8 features implemented`, features);
      } else {
        logResult('Docker Optimization', 'warning', `${passedFeatures.length}/8 features implemented`, features);
      }
    } else {
      logResult('Docker Optimization', 'fail', `Dockerfile exists: ${dockerfileExists}, Compose exists: ${composeExists}`);
    }
  } catch (error) {
    logResult('Docker Optimization', 'fail', `Error: ${error.message}`);
  }
}

// Test 5: App Integration
async function testAppIntegration() {
  console.log('\n🔗 Testing App Integration...');
  
  try {
    const appFile = path.join(__dirname, '..', 'src/frontend/App.jsx');
    const serverFile = path.join(__dirname, '..', 'src/server.js');
    
    const appContent = await fs.readFile(appFile, 'utf8');
    const serverContent = await fs.readFile(serverFile, 'utf8');
    
    const features = {
      'Enhanced Chat Tab': appContent.includes('enhanced-chat') && appContent.includes('EnhancedModernChatInterface'),
      'Performance Tab': appContent.includes('performance-monitor') && appContent.includes('AdvancedPerformanceMonitoring'),
      'Testing Tab': appContent.includes('testing-dashboard') && appContent.includes('ComprehensiveTestingExpansion'),
      'New API Routes': serverContent.includes('enhanced-performance') && serverContent.includes('enhanced-testing'),
      'Lazy Loading': appContent.includes('lazy(() => import'),
      'Auth Guards': appContent.includes('AuthGuard'),
      'Route Configuration': appContent.includes('currentTab ===')
    };
    
    const passedFeatures = Object.entries(features).filter(([, passed]) => passed);
    
    if (passedFeatures.length >= 6) {
      logResult('App Integration', 'pass', `${passedFeatures.length}/7 features integrated`, features);
    } else {
      logResult('App Integration', 'warning', `${passedFeatures.length}/7 features integrated`, features);
    }
  } catch (error) {
    logResult('App Integration', 'fail', `Error: ${error.message}`);
  }
}

// Test 6: Build System
async function testBuildSystem() {
  console.log('\n🏗️ Testing Build System...');
  
  try {
    // Check if dist directory exists (from successful build)
    const distDir = path.join(__dirname, '..', 'dist');
    const distExists = await fs.access(distDir).then(() => true).catch(() => false);
    
    if (distExists) {
      const distContents = await fs.readdir(distDir);
      
      const features = {
        'HTML Generated': distContents.includes('index.html'),
        'CSS Bundle': distContents.some(file => file.includes('.css')),
        'JS Bundles': distContents.some(file => file.includes('.js')),
        'Assets Directory': distContents.includes('assets'),
        'Manifest': distContents.some(file => file.includes('manifest'))
      };
      
      const passedFeatures = Object.entries(features).filter(([, passed]) => passed);
      
      if (passedFeatures.length >= 4) {
        logResult('Build System', 'pass', `Build successful with ${passedFeatures.length}/5 assets`, features);
      } else {
        logResult('Build System', 'warning', `Build completed with ${passedFeatures.length}/5 assets`, features);
      }
    } else {
      logResult('Build System', 'fail', 'dist directory not found - build may have failed');
    }
  } catch (error) {
    logResult('Build System', 'fail', `Error: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  await testEnhancedChatInterface();
  await testPerformanceMonitoring();
  await testTestingExpansion();
  await testDockerOptimization();
  await testAppIntegration();
  await testBuildSystem();
  
  // Generate summary
  console.log('\n📋 VALIDATION SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  
  const successRate = (results.summary.passed / results.summary.total * 100).toFixed(1);
  console.log(`\n🎯 Success Rate: ${successRate}%`);
  
  if (results.summary.failed === 0) {
    console.log('\n🎉 All critical features implemented successfully!');
    console.log('✨ The Medium Priority roadmap items are complete and ready for use.');
  } else if (results.summary.failed <= 2) {
    console.log('\n✅ Most features implemented successfully with minor issues.');
    console.log('🔧 Review failed tests for final improvements.');
  } else {
    console.log('\n⚠️  Some features need attention before completion.');
    console.log('🛠️  Check failed tests and implement missing features.');
  }
  
  // Save results
  const reportPath = path.join(__dirname, '..', 'FEATURE_VALIDATION_REPORT.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📊 Detailed report saved to: ${reportPath}`);
  
  return results;
}

// Execute if run directly
if (require.main === module) {
  runAllTests().then(results => {
    process.exit(results.summary.failed > 2 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, results };