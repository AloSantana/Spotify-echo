#!/usr/bin/env node
/**
 * Phase 8 MCP Admin Implementation Test
 * Comprehensive validation script for admin MCP panel functionality
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class Phase8MCPAdminTester {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.results = {
      phase8: {
        adminRoutes: {},
        frontendComponents: {},
        security: {},
        integration: {},
        performance: {}
      }
    };
    this.testStartTime = Date.now();
  }

  // Helper method to make HTTP requests
  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Phase8-Test-Suite/1.0'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode,
              data: jsonData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: data,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async runAllTests() {
    console.log('🧪 Starting Phase 8: Optional In-App MCP Integration (Admin) Tests');
    console.log('=' .repeat(80));

    try {
      // 1. Test Admin Route Security
      await this.testAdminRouteSecurity();
      
      // 2. Test Frontend Component Integration
      await this.testFrontendComponents();
      
      // 3. Test Environment Configuration
      await this.testEnvironmentConfiguration();
      
      // 4. Test File Structure
      await this.testFileStructure();
      
      // 5. Generate comprehensive report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.results.phase8.criticalError = error.message;
    } finally {
      await this.generateReport();
    }
  }

  async testAdminRouteSecurity() {
    console.log('\n🔒 Testing Admin Route Security...');
    
    // Test that admin routes are properly defined in the file
    try {
      const adminRoutePath = path.join(process.cwd(), 'src', 'api', 'routes', 'admin.js');
      const adminRouteExists = await fs.access(adminRoutePath).then(() => true).catch(() => false);
      
      if (adminRouteExists) {
        const adminContent = await fs.readFile(adminRoutePath, 'utf8');
        
        // Check for Phase 8 MCP admin routes
        const hasMCPStatusRoute = adminContent.includes('/mcp/status');
        const hasCacheStatsRoute = adminContent.includes('/mcp/cache/stats');
        const hasSecurityScanRoute = adminContent.includes('/mcp/security/scan');
        const hasPerformanceRoute = adminContent.includes('/mcp/performance/baseline');
        const hasLogsRoute = adminContent.includes('/mcp/logs');
        const hasAdminMiddleware = adminContent.includes('requireAdminMCP');
        const hasRateLimiting = adminContent.includes('adminRateLimit');
        
        console.log(`   MCP Status route: ${hasMCPStatusRoute ? '✅' : '❌'}`);
        console.log(`   Cache Stats route: ${hasCacheStatsRoute ? '✅' : '❌'}`);
        console.log(`   Security Scan route: ${hasSecurityScanRoute ? '✅' : '❌'}`);
        console.log(`   Performance route: ${hasPerformanceRoute ? '✅' : '❌'}`);
        console.log(`   Logs route: ${hasLogsRoute ? '✅' : '❌'}`);
        console.log(`   Admin middleware: ${hasAdminMiddleware ? '✅' : '❌'}`);
        console.log(`   Rate limiting: ${hasRateLimiting ? '✅' : '❌'}`);
        
        this.results.phase8.security = {
          mcpStatusRoute: hasMCPStatusRoute,
          cacheStatsRoute: hasCacheStatsRoute,
          securityScanRoute: hasSecurityScanRoute,
          performanceRoute: hasPerformanceRoute,
          logsRoute: hasLogsRoute,
          adminMiddleware: hasAdminMiddleware,
          rateLimiting: hasRateLimiting
        };
      } else {
        console.log('❌ Admin routes file not found');
        this.results.phase8.security.adminRouteFile = false;
      }
    } catch (error) {
      console.log('❌ Security test failed:', error.message);
      this.results.phase8.security.error = error.message;
    }
  }

  async testFrontendComponents() {
    console.log('\n🖥️ Testing Frontend Components...');
    
    try {
      // Check if AdminMCPPanel component file exists
      const componentPath = path.join(process.cwd(), 'src', 'frontend', 'components', 'AdminMCPPanel.jsx');
      const componentExists = await fs.access(componentPath).then(() => true).catch(() => false);
      
      if (componentExists) {
        console.log('✅ Frontend: AdminMCPPanel component file exists');
        
        // Read component content to validate structure
        const componentContent = await fs.readFile(componentPath, 'utf8');
        
        // Check for key features
        const hasTabStructure = componentContent.includes('Tab') && componentContent.includes('tabValue');
        const hasMCPStatusTab = componentContent.includes('MCP Status');
        const hasCacheStatsTab = componentContent.includes('Cache Stats');
        const hasSecurityTab = componentContent.includes('Security');
        const hasPerformanceTab = componentContent.includes('Performance');
        const hasLogsTab = componentContent.includes('Logs');
        const hasAdminCheck = componentContent.includes('ENABLE_ADMIN_MCP_PANEL');
        const hasMaterialUI = componentContent.includes('@mui/material');
        const hasStateManagement = componentContent.includes('useState') && componentContent.includes('useEffect');
        const hasDataFetching = componentContent.includes('fetch');
        
        console.log(`   Tab structure: ${hasTabStructure ? '✅' : '❌'}`);
        console.log(`   MCP Status tab: ${hasMCPStatusTab ? '✅' : '❌'}`);
        console.log(`   Cache Stats tab: ${hasCacheStatsTab ? '✅' : '❌'}`);
        console.log(`   Security tab: ${hasSecurityTab ? '✅' : '❌'}`);
        console.log(`   Performance tab: ${hasPerformanceTab ? '✅' : '❌'}`);
        console.log(`   Logs tab: ${hasLogsTab ? '✅' : '❌'}`);
        console.log(`   Admin access check: ${hasAdminCheck ? '✅' : '❌'}`);
        console.log(`   Material UI integration: ${hasMaterialUI ? '✅' : '❌'}`);
        console.log(`   State management: ${hasStateManagement ? '✅' : '❌'}`);
        console.log(`   Data fetching: ${hasDataFetching ? '✅' : '❌'}`);
        
        this.results.phase8.frontendComponents.adminMCPPanel = {
          status: 'pass',
          componentExists: true,
          tabStructure: hasTabStructure,
          mcpStatusTab: hasMCPStatusTab,
          cacheStatsTab: hasCacheStatsTab,
          securityTab: hasSecurityTab,
          performanceTab: hasPerformanceTab,
          logsTab: hasLogsTab,
          adminAccessCheck: hasAdminCheck,
          materialUI: hasMaterialUI,
          stateManagement: hasStateManagement,
          dataFetching: hasDataFetching
        };
      } else {
        console.log('❌ Frontend: AdminMCPPanel component file not found');
        this.results.phase8.frontendComponents.adminMCPPanel = {
          status: 'fail',
          componentExists: false,
          error: 'Component file not found'
        };
      }
      
      // Check if component is integrated into App.jsx
      const appPath = path.join(process.cwd(), 'src', 'frontend', 'App.jsx');
      const appExists = await fs.access(appPath).then(() => true).catch(() => false);
      
      if (appExists) {
        const appContent = await fs.readFile(appPath, 'utf8');
        const hasAdminImport = appContent.includes('AdminMCPPanel');
        const hasAdminTab = appContent.includes('Admin Panel');
        const hasAdminRoute = appContent.includes('settingsAdmin');
        const hasConditionalDisplay = appContent.includes('isAdminEnabled');
        
        console.log(`   App.jsx import: ${hasAdminImport ? '✅' : '❌'}`);
        console.log(`   Admin tab: ${hasAdminTab ? '✅' : '❌'}`);
        console.log(`   Admin route: ${hasAdminRoute ? '✅' : '❌'}`);
        console.log(`   Conditional display: ${hasConditionalDisplay ? '✅' : '❌'}`);
        
        this.results.phase8.frontendComponents.appIntegration = {
          status: hasAdminImport && hasAdminTab ? 'pass' : 'fail',
          adminImport: hasAdminImport,
          adminTab: hasAdminTab,
          adminRoute: hasAdminRoute,
          conditionalDisplay: hasConditionalDisplay
        };
      }
      
    } catch (error) {
      console.log('❌ Frontend Components: Test failed:', error.message);
      this.results.phase8.frontendComponents.error = error.message;
    }
  }

  async testEnvironmentConfiguration() {
    console.log('\n🔧 Testing Environment Configuration...');
    
    // Test environment variables
    const requiredEnvVars = [
      'ENABLE_ADMIN_MCP_PANEL',
      'MCP_SERVER_PORT'
    ];
    
    const optionalEnvVars = [
      'ADMIN_USER_IDS',
      'ADMIN_ROLE'
    ];
    
    let requiredCount = 0;
    let optionalCount = 0;
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ Environment: ${envVar} is set`);
        requiredCount++;
      } else {
        console.log(`❌ Environment: ${envVar} is not set`);
      }
    }
    
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ Environment: ${envVar} is set (optional)`);
        optionalCount++;
      } else {
        console.log(`ℹ️ Environment: ${envVar} is not set (optional)`);
      }
    }
    
    this.results.phase8.environment = {
      requiredVarsSet: requiredCount,
      requiredVarsTotal: requiredEnvVars.length,
      optionalVarsSet: optionalCount,
      optionalVarsTotal: optionalEnvVars.length,
      adminPanelEnabled: process.env.ENABLE_ADMIN_MCP_PANEL === 'true'
    };
  }

  async testFileStructure() {
    console.log('\n📁 Testing File Structure...');
    
    const expectedFiles = [
      'src/api/routes/admin.js',
      'src/frontend/components/AdminMCPPanel.jsx',
      'src/frontend/App.jsx'
    ];
    
    const fileTests = [];
    
    for (const filePath of expectedFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      
      console.log(`   ${filePath}: ${exists ? '✅' : '❌'}`);
      fileTests.push({ file: filePath, exists });
    }
    
    this.results.phase8.fileStructure = {
      totalFiles: expectedFiles.length,
      existingFiles: fileTests.filter(f => f.exists).length,
      files: fileTests
    };
  }

  async generateReport() {
    const testDuration = Date.now() - this.testStartTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 PHASE 8 IMPLEMENTATION TEST RESULTS');
    console.log('='.repeat(80));
    
    // Calculate overall scores
    const securityTests = Object.values(this.results.phase8.security || {});
    const securityPassCount = securityTests.filter(test => test === true).length;
    const securityScore = securityTests.length > 0 ? (securityPassCount / securityTests.length * 100) : 0;
    
    console.log(`\n🔒 Security & Routes: ${securityPassCount}/${securityTests.length} passed (${securityScore.toFixed(1)}%)`);
    for (const [feature, result] of Object.entries(this.results.phase8.security || {})) {
      if (typeof result === 'boolean') {
        const status = result ? '✅' : '❌';
        console.log(`   ${status} ${feature.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
    }
    
    if (this.results.phase8.frontendComponents.adminMCPPanel) {
      const componentResult = this.results.phase8.frontendComponents.adminMCPPanel;
      const componentFeatures = [
        'tabStructure', 'mcpStatusTab', 'cacheStatsTab', 
        'securityTab', 'performanceTab', 'logsTab', 'adminAccessCheck',
        'materialUI', 'stateManagement', 'dataFetching'
      ];
      const componentPassCount = componentFeatures.filter(feature => componentResult[feature]).length;
      const componentScore = (componentPassCount / componentFeatures.length * 100);
      
      console.log(`\n🖥️ Frontend Component: ${componentPassCount}/${componentFeatures.length} features (${componentScore.toFixed(1)}%)`);
      for (const feature of componentFeatures) {
        const status = componentResult[feature] ? '✅' : '❌';
        const label = feature.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`   ${status} ${label}`);
      }
    }
    
    if (this.results.phase8.frontendComponents.appIntegration) {
      const appResult = this.results.phase8.frontendComponents.appIntegration;
      const appFeatures = ['adminImport', 'adminTab', 'adminRoute', 'conditionalDisplay'];
      const appPassCount = appFeatures.filter(feature => appResult[feature]).length;
      const appScore = (appPassCount / appFeatures.length * 100);
      
      console.log(`\n📱 App Integration: ${appPassCount}/${appFeatures.length} features (${appScore.toFixed(1)}%)`);
      for (const feature of appFeatures) {
        const status = appResult[feature] ? '✅' : '❌';
        const label = feature.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`   ${status} ${label}`);
      }
    }
    
    if (this.results.phase8.environment) {
      const env = this.results.phase8.environment;
      console.log('\n🔧 Environment Configuration:');
      console.log(`   Required variables: ${env.requiredVarsSet}/${env.requiredVarsTotal}`);
      console.log(`   Optional variables: ${env.optionalVarsSet}/${env.optionalVarsTotal}`);
      console.log(`   Admin panel enabled: ${env.adminPanelEnabled ? '✅' : '❌'}`);
    }
    
    if (this.results.phase8.fileStructure) {
      const files = this.results.phase8.fileStructure;
      console.log('\n📁 File Structure:');
      console.log(`   Required files: ${files.existingFiles}/${files.totalFiles}`);
    }
    
    // Overall Phase 8 score
    const totalTests = securityTests.length + 
                      (this.results.phase8.frontendComponents.adminMCPPanel ? 10 : 0) +
                      (this.results.phase8.frontendComponents.appIntegration ? 4 : 0) +
                      (this.results.phase8.fileStructure ? this.results.phase8.fileStructure.totalFiles : 0);
    
    const totalPassed = securityPassCount + 
                       (this.results.phase8.frontendComponents.adminMCPPanel ? 
                        componentFeatures.filter(f => this.results.phase8.frontendComponents.adminMCPPanel[f]).length : 0) +
                       (this.results.phase8.frontendComponents.appIntegration ?
                        appFeatures.filter(f => this.results.phase8.frontendComponents.appIntegration[f]).length : 0) +
                       (this.results.phase8.fileStructure ? this.results.phase8.fileStructure.existingFiles : 0);
    
    const overallScore = totalTests > 0 ? (totalPassed / totalTests * 100) : 0;
    
    console.log('\n' + '='.repeat(80));
    console.log(`🎯 PHASE 8 OVERALL SCORE: ${totalPassed}/${totalTests} tests passed (${overallScore.toFixed(1)}%)`);
    console.log(`⏱️ Test Duration: ${(testDuration / 1000).toFixed(2)} seconds`);
    
    if (overallScore >= 80) {
      console.log('🎉 Phase 8: Optional In-App MCP Integration (Admin) - IMPLEMENTATION SUCCESSFUL!');
    } else if (overallScore >= 60) {
      console.log('⚠️ Phase 8: Implementation mostly complete, some issues need attention');
    } else {
      console.log('❌ Phase 8: Implementation needs significant work');
    }
    
    // Save detailed results
    try {
      const reportPath = path.join(process.cwd(), 'reports', 'phase8-mcp-admin-results.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({
        phase: 8,
        name: 'Optional In-App MCP Integration (Admin)',
        timestamp: new Date().toISOString(),
        duration: testDuration,
        overallScore: overallScore,
        totalTests: totalTests,
        totalPassed: totalPassed,
        results: this.results.phase8
      }, null, 2));
      
      console.log(`\n📊 Detailed results saved to: ${reportPath}`);
    } catch (error) {
      console.log(`\n⚠️ Could not save results: ${error.message}`);
    }
    
    console.log('='.repeat(80));
  }
}

// Runner: execute tests when run directly
if (require.main === module) {
  (async () => {
    try {
      const tester = new Phase8MCPAdminTester();
      await tester.runAllTests();
      process.exit(0);
    } catch (err) {
      console.error('Test suite failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { Phase8MCPAdminTester };
