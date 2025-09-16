#!/usr/bin/env node

/**
 * Comprehensive UI Enhancement Validation Script
 * Tests all new components and backend integration features
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'BROWSERTESTIMAGES', `enhanced-ui-${Date.now()}`);
const VIEWPORT_DESKTOP = { width: 1280, height: 800 };
const VIEWPORT_MOBILE = { width: 390, height: 844 };

const TEST_RESULTS = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  components: {},
  screenshots: [],
  issues: []
};

class UIEnhancementValidator {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced UI Validation...');
    
    // Create screenshot directory
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async createPage(viewport = VIEWPORT_DESKTOP) {
    if (this.page) {
      await this.page.close();
    }
    
    this.page = await this.browser.newPage();
    await this.page.setViewport(viewport);
    
    // Set up error tracking
    this.page.on('pageerror', (error) => {
      TEST_RESULTS.issues.push({
        type: 'page-error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        TEST_RESULTS.issues.push({
          type: 'console-error',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async takeScreenshot(name, description = '') {
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    
    await this.page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    
    TEST_RESULTS.screenshots.push({
      name,
      filename,
      description,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  async testComponent(componentName, testFn) {
    TEST_RESULTS.totalTests++;
    console.log(`🔍 Testing component: ${componentName}`);
    
    try {
      const result = await testFn();
      TEST_RESULTS.passedTests++;
      TEST_RESULTS.components[componentName] = {
        status: 'passed',
        details: result || 'Component loaded successfully'
      };
      console.log(`✅ ${componentName}: PASSED`);
    } catch (error) {
      TEST_RESULTS.failedTests++;
      TEST_RESULTS.components[componentName] = {
        status: 'failed',
        error: error.message
      };
      console.log(`❌ ${componentName}: FAILED - ${error.message}`);
    }
  }

  async validateApp() {
    console.log('📱 Validating app loading and navigation...');
    
    await this.createPage(VIEWPORT_DESKTOP);
    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await this.takeScreenshot('01-app-homepage-desktop', 'Homepage loaded on desktop');

    // Test mobile viewport
    await this.createPage(VIEWPORT_MOBILE);
    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await this.takeScreenshot('02-app-homepage-mobile', 'Homepage loaded on mobile');
  }

  async validateComprehensiveSystemSettings() {
    await this.testComponent('ComprehensiveSystemSettings', async () => {
      await this.createPage(VIEWPORT_DESKTOP);
      await this.page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle0' });
      
      // Wait for settings to load
      await this.page.waitForSelector('[role="tabpanel"]', { timeout: 10000 });
      
      // Click on System Settings tab
      const systemSettingsTab = await this.page.$('button[role="tab"]:has-text("🏢 System Settings")');
      if (systemSettingsTab) {
        await systemSettingsTab.click();
        await this.page.waitForTimeout(2000);
      }
      
      await this.takeScreenshot('03-comprehensive-system-settings', 'Comprehensive System Settings panel');
      
      // Test tab navigation
      const tabs = ['AI/LLM Providers', 'Spotify Integration', 'Database Systems', 'System Health'];
      for (let i = 0; i < tabs.length; i++) {
        const tabSelector = `button[role="tab"]:nth-child(${i + 1})`;
        const tabElement = await this.page.$(tabSelector);
        if (tabElement) {
          await tabElement.click();
          await this.page.waitForTimeout(1000);
          await this.takeScreenshot(`04-system-settings-tab-${i}`, `System Settings - ${tabs[i]} tab`);
        }
      }
      
      return 'All system settings tabs accessible';
    });
  }

  async validateSpotifyWebPlayer() {
    await this.testComponent('EnhancedSpotifyWebPlayer', async () => {
      await this.createPage(VIEWPORT_DESKTOP);
      await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      
      // Navigate to Spotify Player tab
      const spotifyTab = await this.page.$('button[role="tab"]:has-text("🎵 Spotify Player")');
      if (spotifyTab) {
        await spotifyTab.click();
        await this.page.waitForTimeout(3000);
      }
      
      await this.takeScreenshot('05-spotify-web-player', 'Enhanced Spotify Web Player interface');
      
      // Check for player components
      const playerElements = [
        '.MuiCard-root', // Player cards
        '.MuiSlider-root', // Volume/progress sliders
        '.MuiFab-root', // Play button
      ];
      
      for (const selector of playerElements) {
        const element = await this.page.$(selector);
        if (!element) {
          throw new Error(`Missing player element: ${selector}`);
        }
      }
      
      return 'Spotify player UI components rendered';
    });
  }

  async validateRealTimeSystemMonitoring() {
    await this.testComponent('RealTimeSystemMonitoring', async () => {
      await this.createPage(VIEWPORT_DESKTOP);
      await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      
      // Navigate to System Monitor tab
      const monitorTab = await this.page.$('button[role="tab"]:has-text("📊 System Monitor")');
      if (monitorTab) {
        await monitorTab.click();
        await this.page.waitForTimeout(3000);
      }
      
      await this.takeScreenshot('06-system-monitoring', 'Real-time System Monitoring dashboard');
      
      // Check for monitoring components
      const monitoringElements = [
        '.MuiLinearProgress-root', // Progress bars
        '.MuiCard-root', // Status cards
        '.MuiList-root', // Status lists
      ];
      
      for (const selector of monitoringElements) {
        const elements = await this.page.$$(selector);
        if (elements.length === 0) {
          throw new Error(`Missing monitoring element: ${selector}`);
        }
      }
      
      return 'System monitoring components rendered';
    });
  }

  async validateBackendConnectedSettings() {
    await this.testComponent('BackendConnectedSettings', async () => {
      await this.createPage(VIEWPORT_DESKTOP);
      await this.page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle0' });
      
      // Navigate to Backend Config tab (should be default)
      await this.page.waitForSelector('[role="tabpanel"]', { timeout: 10000 });
      await this.takeScreenshot('07-backend-connected-settings', 'Backend Connected Settings interface');
      
      // Check for settings components
      const settingsElements = [
        '.MuiCard-root', // Settings cards
        '.MuiSwitch-root', // Toggle switches
        '.MuiButton-root', // Action buttons
      ];
      
      for (const selector of settingsElements) {
        const elements = await this.page.$$(selector);
        if (elements.length === 0) {
          throw new Error(`Missing settings element: ${selector}`);
        }
      }
      
      return 'Backend settings components rendered';
    });
  }

  async validateConnectedChatInterface() {
    await this.testComponent('ConnectedChatInterface', async () => {
      await this.createPage(VIEWPORT_DESKTOP);
      await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
      
      // Navigate to Connected Chat tab
      const chatTab = await this.page.$('button[role="tab"]:has-text("🔗 Connected Chat")');
      if (chatTab) {
        await chatTab.click();
        await this.page.waitForTimeout(2000);
      }
      
      await this.takeScreenshot('08-connected-chat-interface', 'Connected Chat Interface with backend integration');
      
      // Check for chat components
      const chatElements = [
        '.MuiTextField-root', // Input field
        '.MuiButton-root', // Send button
        '.MuiPaper-root', // Chat container
      ];
      
      for (const selector of chatElements) {
        const elements = await this.page.$$(selector);
        if (elements.length === 0) {
          throw new Error(`Missing chat element: ${selector}`);
        }
      }
      
      return 'Connected chat interface rendered';
    });
  }

  async validateResponsiveDesign() {
    await this.testComponent('ResponsiveDesign', async () => {
      const viewports = [
        { name: 'desktop', ...VIEWPORT_DESKTOP },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', ...VIEWPORT_MOBILE }
      ];
      
      for (const viewport of viewports) {
        await this.createPage(viewport);
        await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        await this.takeScreenshot(`09-responsive-${viewport.name}`, `Responsive design on ${viewport.name}`);
        
        // Test navigation menu on mobile
        if (viewport.name === 'mobile') {
          const menuButton = await this.page.$('.MuiIconButton-root');
          if (menuButton) {
            await menuButton.click();
            await this.page.waitForTimeout(1000);
            await this.takeScreenshot('10-mobile-menu', 'Mobile navigation menu');
          }
        }
      }
      
      return 'Responsive design validated across viewports';
    });
  }

  async validateBuildArtifacts() {
    await this.testComponent('BuildArtifacts', async () => {
      const distPath = path.join(__dirname, 'dist');
      
      try {
        const distStats = await fs.stat(distPath);
        if (!distStats.isDirectory()) {
          throw new Error('Dist directory not found');
        }
        
        // Check for main files
        const requiredFiles = ['index.html', 'assets'];
        for (const file of requiredFiles) {
          const filePath = path.join(distPath, file);
          await fs.access(filePath);
        }
        
        // Get build size info
        const assetsPath = path.join(distPath, 'assets');
        const assetFiles = await fs.readdir(assetsPath);
        const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
        const cssFiles = assetFiles.filter(f => f.endsWith('.css'));
        
        return `Build artifacts validated: ${jsFiles.length} JS files, ${cssFiles.length} CSS files`;
      } catch (error) {
        throw new Error(`Build artifacts validation failed: ${error.message}`);
      }
    });
  }

  async generateReport() {
    console.log('📊 Generating validation report...');
    
    const report = {
      ...TEST_RESULTS,
      summary: {
        successRate: (TEST_RESULTS.passedTests / TEST_RESULTS.totalTests * 100).toFixed(1),
        totalScreenshots: TEST_RESULTS.screenshots.length,
        totalIssues: TEST_RESULTS.issues.length
      }
    };
    
    // Save JSON report
    const reportPath = path.join(SCREENSHOT_DIR, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(SCREENSHOT_DIR, 'validation-report.md');
    await fs.writeFile(markdownPath, markdownReport);
    
    console.log(`📄 Reports saved to: ${SCREENSHOT_DIR}`);
    return report;
  }

  generateMarkdownReport(report) {
    const { summary, components, screenshots, issues } = report;
    
    return `# Enhanced UI Validation Report

## Summary
- **Total Tests**: ${report.totalTests}
- **Passed**: ${report.passedTests}
- **Failed**: ${report.failedTests}
- **Success Rate**: ${summary.successRate}%
- **Screenshots**: ${summary.totalScreenshots}
- **Issues Found**: ${summary.totalIssues}

## Component Results

${Object.entries(components).map(([name, result]) => 
  `### ${name}
- **Status**: ${result.status}
${result.status === 'passed' ? `- **Details**: ${result.details}` : `- **Error**: ${result.error}`}
`).join('\n')}

## Screenshots Captured

${screenshots.map((screenshot, index) => 
  `${index + 1}. **${screenshot.name}**: ${screenshot.description} (${screenshot.filename})`
).join('\n')}

## Issues Detected

${issues.length > 0 ? issues.map((issue, index) => 
  `${index + 1}. **${issue.type}**: ${issue.message} (${issue.timestamp})`
).join('\n') : 'No issues detected'}

## Recommendations

${summary.successRate >= 90 ? 
  '✅ **Excellent**: UI enhancements are working well with minimal issues.' :
  summary.successRate >= 70 ?
  '⚠️ **Good**: UI enhancements are mostly functional but some areas need attention.' :
  '❌ **Needs Improvement**: Several components require fixes before production deployment.'
}

---
*Report generated on ${report.timestamp}*
`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      
      console.log('🧪 Starting comprehensive UI validation...');
      
      await this.validateApp();
      await this.validateComprehensiveSystemSettings();
      await this.validateSpotifyWebPlayer();
      await this.validateRealTimeSystemMonitoring();
      await this.validateBackendConnectedSettings();
      await this.validateConnectedChatInterface();
      await this.validateResponsiveDesign();
      await this.validateBuildArtifacts();
      
      const report = await this.generateReport();
      
      console.log('\n📊 Validation Complete!');
      console.log(`✅ Passed: ${report.passedTests}/${report.totalTests} (${report.summary.successRate}%)`);
      console.log(`📸 Screenshots: ${report.summary.totalScreenshots}`);
      console.log(`⚠️  Issues: ${report.summary.totalIssues}`);
      console.log(`📁 Results: ${SCREENSHOT_DIR}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new UIEnhancementValidator();
  validator.run()
    .then(report => {
      process.exit(report.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = UIEnhancementValidator;