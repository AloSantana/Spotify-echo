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

// Run tests if called directly
if (require.main === module) {
  const tester = new Phase8MCPAdminTester();
  tester.runAllTests().catch(console.error);
}

module.exports = Phase8MCPAdminTester;

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

  async runAllTests() {
    console.log('🧪 Starting Phase 8: Optional In-App MCP Integration (Admin) Tests');
    console.log('=' .repeat(80));

    try {
      // 1. Test Admin Route Security
      await this.testAdminRouteSecurity();
      
      // 2. Test MCP Status Endpoint
      await this.testMCPStatusEndpoint();
      
      // 3. Test Cache Statistics Endpoint
      await this.testCacheStatsEndpoint();
      
      // 4. Test Security Scan Endpoint
      await this.testSecurityScanEndpoint();
      
      // 5. Test Performance Baseline Endpoint
      await this.testPerformanceBaselineEndpoint();
      
      // 6. Test Logs Endpoint
      await this.testLogsEndpoint();
      
      // 7. Test Frontend Component Integration
      await this.testFrontendComponents();
      
      // 8. Test Environment Configuration
      await this.testEnvironmentConfiguration();
      
      // 9. Test Error Handling
      await this.testErrorHandling();
      
      // 10. Generate comprehensive report
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
    
    try {
      // Test without admin panel enabled
      process.env.ENABLE_ADMIN_MCP_PANEL = 'false';
      
      const response = await axios.get(`${this.baseUrl}/api/admin/mcp/status`);
      
      if (response.status === 403) {
        console.log('✅ Security: Admin panel correctly disabled when ENABLE_ADMIN_MCP_PANEL=false');
        this.results.phase8.security.disabledPanelBlocked = true;
      } else {
        console.log('❌ Security: Admin panel should be blocked when disabled');
        this.results.phase8.security.disabledPanelBlocked = false;
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Security: Admin panel correctly blocked');
        this.results.phase8.security.disabledPanelBlocked = true;
      } else {
        console.log('❌ Security test failed:', error.message);
        this.results.phase8.security.disabledPanelBlocked = false;
      }
    }
    
    // Enable admin panel for remaining tests
    process.env.ENABLE_ADMIN_MCP_PANEL = 'true';
  }

  async testMCPStatusEndpoint() {
    console.log('\n📊 Testing MCP Status Endpoint...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/mcp/status`);
      
      if (response.status === 200 && response.data.success) {
        const { data } = response.data;
        
        // Validate response structure
        const hasRequiredFields = data.timestamp && 
                                 data.servers && 
                                 data.systemHealth &&
                                 typeof data.lastValidation !== 'undefined';
        
        if (hasRequiredFields) {
          console.log('✅ MCP Status: Valid response structure');
          console.log(`   Servers monitored: ${Object.keys(data.servers).length}`);
          console.log(`   System health available: ${!!data.systemHealth.memoryUsage}`);
          
          this.results.phase8.adminRoutes.mcpStatus = {
            status: 'pass',
            serversMonitored: Object.keys(data.servers).length,
            systemHealthAvailable: !!data.systemHealth.memoryUsage,
            responseTime: response.headers['x-response-time'] || 'N/A'
          };
        } else {
          console.log('❌ MCP Status: Invalid response structure');
          this.results.phase8.adminRoutes.mcpStatus = {
            status: 'fail',
            error: 'Invalid response structure'
          };
        }
      } else {
        console.log('❌ MCP Status: Endpoint failed');
        this.results.phase8.adminRoutes.mcpStatus = {
          status: 'fail',
          error: 'Endpoint returned error'
        };
      }
    } catch (error) {
      console.log('❌ MCP Status: Request failed:', error.message);
      this.results.phase8.adminRoutes.mcpStatus = {
        status: 'fail',
        error: error.message
      };
    }
  }

  async testCacheStatsEndpoint() {
    console.log('\n🗄️ Testing Cache Statistics Endpoint...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/mcp/cache/stats`);
      
      if (response.status === 200 && response.data.success) {
        const { data } = response.data;
        
        // Validate cache stats structure
        const hasValidStructure = data.timestamp && 
                                 typeof data.redis !== 'undefined' &&
                                 typeof data.nodeCache !== 'undefined' &&
                                 typeof data.insights !== 'undefined';
        
        if (hasValidStructure) {
          console.log('✅ Cache Stats: Valid response structure');
          console.log(`   Redis status: ${data.redis ? data.redis.status : 'Not configured'}`);
          console.log(`   NodeCache status: ${data.nodeCache ? data.nodeCache.status : 'Not available'}`);
          
          this.results.phase8.adminRoutes.cacheStats = {
            status: 'pass',
            redisAvailable: !!data.redis,
            nodeCacheAvailable: !!data.nodeCache,
            insightsAvailable: !!data.insights
          };
        } else {
          console.log('❌ Cache Stats: Invalid response structure');
          this.results.phase8.adminRoutes.cacheStats = {
            status: 'fail',
            error: 'Invalid response structure'
          };
        }
      } else {
        console.log('❌ Cache Stats: Endpoint failed');
        this.results.phase8.adminRoutes.cacheStats = {
          status: 'fail',
          error: 'Endpoint returned error'
        };
      }
    } catch (error) {
      console.log('❌ Cache Stats: Request failed:', error.message);
      this.results.phase8.adminRoutes.cacheStats = {
        status: 'fail',
        error: error.message
      };
    }
  }

  async testSecurityScanEndpoint() {
    console.log('\n🛡️ Testing Security Scan Endpoint...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/mcp/security/scan`);
      
      if (response.status === 200 && response.data.success) {
        const { data } = response.data;
        
        // Validate security scan structure
        const hasValidStructure = data.timestamp && 
                                 Array.isArray(data.vulnerabilities) &&
                                 Array.isArray(data.recommendations);
        
        if (hasValidStructure) {
          console.log('✅ Security Scan: Valid response structure');
          console.log(`   Vulnerabilities found: ${data.vulnerabilities.length}`);
          console.log(`   Recommendations: ${data.recommendations.length}`);
          
          this.results.phase8.adminRoutes.securityScan = {
            status: 'pass',
            vulnerabilitiesCount: data.vulnerabilities.length,
            recommendationsCount: data.recommendations.length,
            lastScanAvailable: !!data.lastScan
          };
        } else {
          console.log('❌ Security Scan: Invalid response structure');
          this.results.phase8.adminRoutes.securityScan = {
            status: 'fail',
            error: 'Invalid response structure'
          };
        }
      } else {
        console.log('❌ Security Scan: Endpoint failed');
        this.results.phase8.adminRoutes.securityScan = {
          status: 'fail',
          error: 'Endpoint returned error'
        };
      }
    } catch (error) {
      console.log('❌ Security Scan: Request failed:', error.message);
      this.results.phase8.adminRoutes.securityScan = {
        status: 'fail',
        error: error.message
      };
    }
  }

  async testPerformanceBaselineEndpoint() {
    console.log('\n⚡ Testing Performance Baseline Endpoint...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/mcp/performance/baseline`);
      
      if (response.status === 200 && response.data.success) {
        const { data } = response.data;
        
        // Validate performance baseline structure
        const hasValidStructure = data.timestamp && 
                                 data.current &&
                                 data.current.memory &&
                                 typeof data.current.uptime === 'number';
        
        if (hasValidStructure) {
          console.log('✅ Performance Baseline: Valid response structure');
          console.log(`   Current memory usage: ${Math.round(data.current.memory.heapUsed / 1024 / 1024)}MB`);
          console.log(`   System uptime: ${Math.round(data.current.uptime / 60)} minutes`);
          
          this.results.phase8.adminRoutes.performanceBaseline = {
            status: 'pass',
            currentMemoryMB: Math.round(data.current.memory.heapUsed / 1024 / 1024),
            systemUptimeMinutes: Math.round(data.current.uptime / 60),
            baselineAvailable: !!data.baseline,
            driftCalculated: !!data.drift
          };
        } else {
          console.log('❌ Performance Baseline: Invalid response structure');
          this.results.phase8.adminRoutes.performanceBaseline = {
            status: 'fail',
            error: 'Invalid response structure'
          };
        }
      } else {
        console.log('❌ Performance Baseline: Endpoint failed');
        this.results.phase8.adminRoutes.performanceBaseline = {
          status: 'fail',
          error: 'Endpoint returned error'
        };
      }
    } catch (error) {
      console.log('❌ Performance Baseline: Request failed:', error.message);
      this.results.phase8.adminRoutes.performanceBaseline = {
        status: 'fail',
        error: error.message
      };
    }
  }

  async testLogsEndpoint() {
    console.log('\n📄 Testing Logs Endpoint...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/mcp/logs?lines=50&level=info`);
      
      if (response.status === 200 && response.data.success) {
        const { data } = response.data;
        
        // Validate logs structure
        const hasValidStructure = data.timestamp && 
                                 Array.isArray(data.logs) &&
                                 typeof data.totalLines === 'number' &&
                                 data.level;
        
        if (hasValidStructure) {
          console.log('✅ Logs: Valid response structure');
          console.log(`   Total log entries: ${data.totalLines}`);
          console.log(`   Log sources: ${data.logs.length}`);
          console.log(`   Filter level: ${data.level}`);
          
          this.results.phase8.adminRoutes.logs = {
            status: 'pass',
            totalLogEntries: data.totalLines,
            logSources: data.logs.length,
            filterLevel: data.level
          };
        } else {
          console.log('❌ Logs: Invalid response structure');
          this.results.phase8.adminRoutes.logs = {
            status: 'fail',
            error: 'Invalid response structure'
          };
        }
      } else {
        console.log('❌ Logs: Endpoint failed');
        this.results.phase8.adminRoutes.logs = {
          status: 'fail',
          error: 'Endpoint returned error'
        };
      }
    } catch (error) {
      console.log('❌ Logs: Request failed:', error.message);
      this.results.phase8.adminRoutes.logs = {
        status: 'fail',
        error: error.message
      };
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
        
        console.log(`   Tab structure: ${hasTabStructure ? '✅' : '❌'}`);
        console.log(`   MCP Status tab: ${hasMCPStatusTab ? '✅' : '❌'}`);
        console.log(`   Cache Stats tab: ${hasCacheStatsTab ? '✅' : '❌'}`);
        console.log(`   Security tab: ${hasSecurityTab ? '✅' : '❌'}`);
        console.log(`   Performance tab: ${hasPerformanceTab ? '✅' : '❌'}`);
        console.log(`   Logs tab: ${hasLogsTab ? '✅' : '❌'}`);
        console.log(`   Admin access check: ${hasAdminCheck ? '✅' : '❌'}`);
        
        this.results.phase8.frontendComponents.adminMCPPanel = {
          status: 'pass',
          componentExists: true,
          tabStructure: hasTabStructure,
          mcpStatusTab: hasMCPStatusTab,
          cacheStatsTab: hasCacheStatsTab,
          securityTab: hasSecurityTab,
          performanceTab: hasPerformanceTab,
          logsTab: hasLogsTab,
          adminAccessCheck: hasAdminCheck
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
        
        console.log(`   App.jsx integration: ${hasAdminImport && hasAdminTab ? '✅' : '❌'}`);
        
        this.results.phase8.frontendComponents.appIntegration = {
          status: hasAdminImport && hasAdminTab ? 'pass' : 'fail',
          adminImport: hasAdminImport,
          adminTab: hasAdminTab,
          adminRoute: hasAdminRoute
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

  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');
    
    try {
      // Test with invalid endpoint
      const response = await axios.get(`${this.baseUrl}/api/admin/mcp/invalid-endpoint`);
      console.log('❌ Error Handling: Invalid endpoint should return 404');
      this.results.phase8.errorHandling.invalidEndpoint = false;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Error Handling: Invalid endpoint correctly returns 404');
        this.results.phase8.errorHandling.invalidEndpoint = true;
      } else {
        console.log('❌ Error Handling: Unexpected error response:', error.message);
        this.results.phase8.errorHandling.invalidEndpoint = false;
      }
    }
    
    // Test rate limiting behavior
    try {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(axios.get(`${this.baseUrl}/api/admin/mcp/status`));
      }
      
      await Promise.all(requests);
      console.log('✅ Error Handling: Rate limiting allows reasonable request volume');
      this.results.phase8.errorHandling.rateLimiting = true;
    } catch (error) {
      console.log('ℹ️ Error Handling: Rate limiting may be active:', error.message);
      this.results.phase8.errorHandling.rateLimiting = 'limited';
    }
  }

  async generateReport() {
    const testDuration = Date.now() - this.testStartTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 PHASE 8 IMPLEMENTATION TEST RESULTS');
    console.log('='.repeat(80));
    
    // Calculate overall scores
    const adminRouteTests = Object.values(this.results.phase8.adminRoutes);
    const adminRoutesPassCount = adminRouteTests.filter(test => test.status === 'pass').length;
    const adminRoutesScore = adminRouteTests.length > 0 ? (adminRoutesPassCount / adminRouteTests.length * 100) : 0;
    
    console.log(`\n🔌 Admin API Endpoints: ${adminRoutesPassCount}/${adminRouteTests.length} passed (${adminRoutesScore.toFixed(1)}%)`);
    for (const [endpoint, result] of Object.entries(this.results.phase8.adminRoutes)) {
      const status = result.status === 'pass' ? '✅' : '❌';
      console.log(`   ${status} ${endpoint}`);
    }
    
    if (this.results.phase8.frontendComponents.adminMCPPanel) {
      const componentResult = this.results.phase8.frontendComponents.adminMCPPanel;
      const componentFeatures = [
        'tabStructure', 'mcpStatusTab', 'cacheStatsTab', 
        'securityTab', 'performanceTab', 'logsTab', 'adminAccessCheck'
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
    
    if (this.results.phase8.security) {
      console.log('\n🔒 Security Features:');
      for (const [feature, result] of Object.entries(this.results.phase8.security)) {
        const status = result ? '✅' : '❌';
        console.log(`   ${status} ${feature.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
    }
    
    if (this.results.phase8.environment) {
      const env = this.results.phase8.environment;
      console.log('\n🔧 Environment Configuration:');
      console.log(`   Required variables: ${env.requiredVarsSet}/${env.requiredVarsTotal}`);
      console.log(`   Optional variables: ${env.optionalVarsSet}/${env.optionalVarsTotal}`);
      console.log(`   Admin panel enabled: ${env.adminPanelEnabled ? '✅' : '❌'}`);
    }
    
    // Overall Phase 8 score
    const totalTests = adminRouteTests.length + 
                      (this.results.phase8.frontendComponents.adminMCPPanel ? 7 : 0) +
                      Object.keys(this.results.phase8.security || {}).length;
    const totalPassed = adminRoutesPassCount + 
                       (this.results.phase8.frontendComponents.adminMCPPanel ? 
                        componentFeatures.filter(f => this.results.phase8.frontendComponents.adminMCPPanel[f]).length : 0) +
                       Object.values(this.results.phase8.security || {}).filter(Boolean).length;
    
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
    console.log('='.repeat(80));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new Phase8MCPAdminTester();
  tester.runAllTests().catch(console.error);
}

module.exports = Phase8MCPAdminTester;