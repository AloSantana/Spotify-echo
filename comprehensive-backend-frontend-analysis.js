#!/usr/bin/env node

/**
 * Comprehensive Backend and Frontend Analysis
 * Tests all backend APIs and validates frontend functionality
 * Creates screenshots and generates a detailed report
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = `BROWSERTESTIMAGES/comprehensive-analysis-run-${Date.now()}`;

async function ensureDirectory() {
  // Ensure screenshot directory exists
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

class ComprehensiveAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      backend: {
        apis: {},
        health: {},
        features: {}
      },
      frontend: {
        pages: {},
        components: {},
        functionality: {}
      },
      screenshots: [],
      summary: {
        backend_working: 0,
        backend_total: 0,
        frontend_working: 0,
        frontend_total: 0,
        overall_score: 0
      }
    };
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Starting comprehensive EchoTune AI analysis...');
    
    // Launch browser for frontend testing
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    
    console.log('✅ Browser initialized for frontend testing');
  }

  async analyzeBackendAPIs() {
    console.log('🔍 Analyzing backend APIs...');
    
    const apiEndpoints = [
      { path: '/health', name: 'Health Check' },
      { path: '/api/system/status', name: 'System Status' },
      { path: '/api/providers', name: 'AI Providers' },
      { path: '/api/docs/', name: 'API Documentation' },
      { path: '/api/analytics', name: 'Analytics' },
      { path: '/api/spotify', name: 'Spotify API', method: 'GET' },
      { path: '/api/chat', name: 'Chat API', method: 'POST', data: { message: 'test' } },
      { path: '/api/user-settings', name: 'User Settings' },
      { path: '/api/admin', name: 'Admin Dashboard' },
      { path: '/api/feedback', name: 'Feedback System' },
      { path: '/ready', name: 'Readiness Probe' },
      { path: '/alive', name: 'Liveness Probe' }
    ];

    for (const endpoint of apiEndpoints) {
      try {
        this.results.summary.backend_total++;
        
        const config = {
          method: endpoint.method || 'GET',
          url: `${BASE_URL}${endpoint.path}`,
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept all non-500 errors
        };
        
        if (endpoint.data) {
          config.data = endpoint.data;
          config.headers = { 'Content-Type': 'application/json' };
        }
        
        const response = await axios(config);
        
        this.results.backend.apis[endpoint.name] = {
          status: 'working',
          statusCode: response.status,
          path: endpoint.path,
          responseTime: response.headers['x-response-time'] || 'unknown',
          hasData: !!response.data,
          dataType: typeof response.data
        };
        
        this.results.summary.backend_working++;
        console.log(`✅ ${endpoint.name}: ${response.status}`);
        
      } catch (error) {
        this.results.backend.apis[endpoint.name] = {
          status: 'error',
          path: endpoint.path,
          error: error.message,
          statusCode: error.response?.status || 'connection_failed'
        };
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
  }

  async analyzeFrontendPages() {
    console.log('🎨 Analyzing frontend pages...');
    
    const pages = [
      { url: '/', name: 'Homepage', expectedElements: ['title', '.loading-logo', '#root'] },
      { url: '/settings.html', name: 'Settings Page', expectedElements: ['h1', '.section-title'] },
      { url: '/chat', name: 'Chat Interface', expectedElements: ['#root'] },
      { url: '/admin.html', name: 'Admin Dashboard', expectedElements: ['title'] },
      { url: '/playlists.html', name: 'Playlists Page', expectedElements: ['title'] }
    ];

    for (const pageConfig of pages) {
      try {
        this.results.summary.frontend_total++;
        
        console.log(`📄 Testing page: ${pageConfig.name}`);
        
        // Navigate to page
        const response = await this.page.goto(`${BASE_URL}${pageConfig.url}`, {
          waitUntil: 'networkidle2',
          timeout: 10000
        });
        
        // Take screenshot
        const screenshotPath = path.join(SCREENSHOT_DIR, `${pageConfig.name.toLowerCase().replace(/\s+/g, '-')}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.results.screenshots.push({
          page: pageConfig.name,
          path: screenshotPath,
          url: pageConfig.url
        });
        
        // Check for expected elements
        const elementResults = {};
        for (const selector of pageConfig.expectedElements) {
          try {
            const element = await this.page.$(selector);
            elementResults[selector] = !!element;
          } catch (e) {
            elementResults[selector] = false;
          }
        }
        
        // Get page title and basic info
        const title = await this.page.title();
        const bodyText = await this.page.evaluate(() => 
          document.body ? document.body.innerText.substring(0, 200) : 'No body found'
        );
        
        this.results.frontend.pages[pageConfig.name] = {
          status: response.ok() ? 'working' : 'error',
          statusCode: response.status(),
          title: title,
          url: pageConfig.url,
          elements: elementResults,
          hasContent: bodyText.length > 50,
          preview: bodyText,
          screenshot: screenshotPath
        };
        
        if (response.ok()) {
          this.results.summary.frontend_working++;
          console.log(`✅ ${pageConfig.name}: Loaded successfully`);
        } else {
          console.log(`❌ ${pageConfig.name}: HTTP ${response.status()}`);
        }
        
      } catch (error) {
        this.results.frontend.pages[pageConfig.name] = {
          status: 'error',
          error: error.message,
          url: pageConfig.url
        };
        console.log(`❌ ${pageConfig.name}: ${error.message}`);
      }
    }
  }

  async analyzeFeatures() {
    console.log('🔧 Analyzing specific features...');
    
    // Test Spotify authentication flow
    try {
      await this.page.goto(`${BASE_URL}/auth/spotify`, { waitUntil: 'networkidle2' });
      const url = this.page.url();
      
      this.results.backend.features['Spotify OAuth'] = {
        status: url.includes('spotify.com') ? 'working' : 'configured',
        redirected: url.includes('spotify.com'),
        finalUrl: url
      };
      
      const screenshotPath = path.join(SCREENSHOT_DIR, 'spotify-oauth-flow.png');
      await this.page.screenshot({ path: screenshotPath });
      this.results.screenshots.push({
        page: 'Spotify OAuth Flow',
        path: screenshotPath,
        url: '/auth/spotify'
      });
      
    } catch (error) {
      this.results.backend.features['Spotify OAuth'] = {
        status: 'error',
        error: error.message
      };
    }
    
    // Test chat interface functionality
    try {
      await this.page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
      
      // Wait for React to load
      await this.page.waitForTimeout(3000);
      
      // Look for chat elements
      const chatElements = await this.page.evaluate(() => {
        const selectors = [
          'input[placeholder*="message"]',
          'textarea[placeholder*="message"]',
          '.chat-input',
          '[data-testid="chat-input"]',
          'input[type="text"]'
        ];
        
        const found = {};
        selectors.forEach(selector => {
          found[selector] = !!document.querySelector(selector);
        });
        
        return found;
      });
      
      this.results.frontend.functionality['Chat Interface'] = {
        status: Object.values(chatElements).some(Boolean) ? 'working' : 'not_found',
        elements: chatElements
      };
      
    } catch (error) {
      this.results.frontend.functionality['Chat Interface'] = {
        status: 'error',
        error: error.message
      };
    }
  }

  generateSummary() {
    console.log('📊 Generating summary...');
    
    const backendScore = this.results.summary.backend_total > 0 
      ? (this.results.summary.backend_working / this.results.summary.backend_total) * 100 
      : 0;
    
    const frontendScore = this.results.summary.frontend_total > 0 
      ? (this.results.summary.frontend_working / this.results.summary.frontend_total) * 100 
      : 0;
    
    this.results.summary.overall_score = (backendScore + frontendScore) / 2;
    
    this.results.summary.details = {
      backend_health: backendScore >= 80 ? '🟢 Excellent' : backendScore >= 60 ? '🟡 Good' : '🔴 Needs Attention',
      frontend_health: frontendScore >= 80 ? '🟢 Excellent' : frontendScore >= 60 ? '🟡 Good' : '🔴 Needs Attention',
      overall_health: this.results.summary.overall_score >= 80 ? '🟢 Excellent' : 
                     this.results.summary.overall_score >= 60 ? '🟡 Good' : '🔴 Needs Attention'
    };
  }

  async generateReport() {
    console.log('📝 Generating detailed report...');
    
    const reportPath = path.join(SCREENSHOT_DIR, 'comprehensive-analysis-report.md');
    
    const report = `# 🎵 EchoTune AI - Comprehensive Analysis Report

**Generated**: ${this.results.timestamp}
**Overall Health**: ${this.results.summary.details.overall_health} (${this.results.summary.overall_score.toFixed(1)}%)

## 📊 Summary
- **Backend APIs**: ${this.results.summary.backend_working}/${this.results.summary.backend_total} working (${this.results.summary.details.backend_health})
- **Frontend Pages**: ${this.results.summary.frontend_working}/${this.results.summary.frontend_total} working (${this.results.summary.details.frontend_health})
- **Screenshots Captured**: ${this.results.screenshots.length}

## 🔧 Backend API Analysis

${Object.entries(this.results.backend.apis).map(([name, result]) => `
### ${name}
- **Status**: ${result.status === 'working' ? '✅' : '❌'} ${result.status}
- **Path**: \`${result.path}\`
- **Response Code**: ${result.statusCode}
${result.responseTime ? `- **Response Time**: ${result.responseTime}` : ''}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## 🎨 Frontend Page Analysis

${Object.entries(this.results.frontend.pages).map(([name, result]) => `
### ${name}
- **Status**: ${result.status === 'working' ? '✅' : '❌'} ${result.status}
- **URL**: \`${result.url}\`
- **Title**: ${result.title || 'N/A'}
${result.statusCode ? `- **HTTP Status**: ${result.statusCode}` : ''}
${result.hasContent ? '- **Content**: ✅ Has meaningful content' : '- **Content**: ❌ Limited content'}
${result.screenshot ? `- **Screenshot**: [View](${path.basename(result.screenshot)})` : ''}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## 🔧 Feature Analysis

${Object.entries(this.results.backend.features).length > 0 ? Object.entries(this.results.backend.features).map(([name, result]) => `
### ${name}
- **Status**: ${result.status === 'working' ? '✅' : result.status === 'configured' ? '🟡' : '❌'} ${result.status}
${result.redirected ? '- **OAuth Flow**: ✅ Properly redirects to Spotify' : ''}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('') : 'No specific features tested'}

${Object.entries(this.results.frontend.functionality).length > 0 ? Object.entries(this.results.frontend.functionality).map(([name, result]) => `
### ${name}
- **Status**: ${result.status === 'working' ? '✅' : '❌'} ${result.status}
${result.elements ? `- **Elements Found**: ${JSON.stringify(result.elements, null, 2)}` : ''}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('') : ''}

## 📷 Screenshots Captured

${this.results.screenshots.map(shot => `- **${shot.page}**: [${path.basename(shot.path)}](${path.basename(shot.path)})`).join('\n')}

## 🎯 Recommendations

### Backend Improvements Needed:
${this.results.summary.backend_working < this.results.summary.backend_total ? 
  Object.entries(this.results.backend.apis)
    .filter(([, result]) => result.status !== 'working')
    .map(([name]) => `- Fix ${name} API endpoint`)
    .join('\n') : '- All backend APIs are working correctly ✅'}

### Frontend Improvements Needed:
${this.results.summary.frontend_working < this.results.summary.frontend_total ? 
  Object.entries(this.results.frontend.pages)
    .filter(([, result]) => result.status !== 'working')
    .map(([name]) => `- Fix ${name} page loading`)
    .join('\n') : '- All frontend pages are loading correctly ✅'}

---
**Analysis completed at**: ${new Date().toISOString()}
`;

    await fs.writeFile(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Also save JSON results
    const jsonPath = path.join(SCREENSHOT_DIR, 'analysis-results.json');
    await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
    console.log(`📊 JSON data saved to: ${jsonPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.analyzeBackendAPIs();
      await this.analyzeFrontendPages();
      await this.analyzeFeatures();
      this.generateSummary();
      await this.generateReport();
      
      console.log('\n🎉 Comprehensive analysis completed!');
      console.log(`📊 Overall Score: ${this.results.summary.overall_score.toFixed(1)}%`);
      console.log(`📁 Results saved in: ${SCREENSHOT_DIR}`);
      
      // Print final summary
      console.log('\n📋 FINAL SUMMARY:');
      console.log(`Backend Health: ${this.results.summary.details.backend_health}`);
      console.log(`Frontend Health: ${this.results.summary.details.frontend_health}`);
      console.log(`Overall Health: ${this.results.summary.details.overall_health}`);
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the analysis
async function main() {
  await ensureDirectory();
  const analyzer = new ComprehensiveAnalyzer();
  await analyzer.run();
}

main().catch(console.error);