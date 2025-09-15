#!/usr/bin/env node
/**
 * Visual Baseline Approval Script
 * Copies latest captured screenshots to visual baseline directory
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class VisualBaselineApprover {
  constructor() {
    this.sourceDir = 'test-results';
    this.baselineDir = 'visual-baseline';
    this.approved = [];
    this.errors = [];
  }

  async approve() {
    console.log('🖼️  Visual Baseline Approval Tool\n');
    
    // 1. Ensure directories exist
    this.ensureDirectories();
    
    // 2. Find latest test results
    const screenshots = this.findLatestScreenshots();
    
    if (screenshots.length === 0) {
      console.log('❌ No screenshots found to approve');
      console.log(`   Run visual tests first: npm run test:visual`);
      return;
    }
    
    console.log(`📸 Found ${screenshots.length} screenshots to review\n`);
    
    // 3. Process each screenshot
    for (const screenshot of screenshots) {
      await this.processScreenshot(screenshot);
    }
    
    // 4. Generate summary
    this.generateSummary();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
      console.log(`📁 Created baseline directory: ${this.baselineDir}`);
    }
  }

  findLatestScreenshots() {
    const patterns = [
      'test-results/**/*-actual.png',
      'test-results/**/*.png',
      'artifacts/test-results/**/*.png',
      'playwright-report/**/*.png'
    ];
    
    let screenshots = [];
    
    for (const pattern of patterns) {
      const files = glob.sync(pattern);
      screenshots.push(...files);
    }
    
    // Remove duplicates and filter for actual screenshots
    screenshots = [...new Set(screenshots)];
    screenshots = screenshots.filter(file => {
      const basename = path.basename(file);
      return basename.endsWith('.png') && 
             !basename.includes('-diff') && 
             !basename.includes('-expected');
    });
    
    return screenshots;
  }

  async processScreenshot(screenshotPath) {
    try {
      const basename = path.basename(screenshotPath);
      const testName = this.extractTestName(basename);
      
      // Generate baseline filename
      const baselineFilename = basename.replace('-actual', '').replace(/^.*-/, '');
      const baselinePath = path.join(this.baselineDir, baselineFilename);
      
      console.log(`📸 Processing: ${testName}`);
      console.log(`   Source: ${screenshotPath}`);
      console.log(`   Target: ${baselinePath}`);
      
      // Check if baseline already exists
      if (fs.existsSync(baselinePath)) {
        console.log(`   ⚠️  Baseline exists - will overwrite`);
      }
      
      // Copy screenshot to baseline
      fs.copyFileSync(screenshotPath, baselinePath);
      
      this.approved.push({
        testName,
        screenshot: basename,
        baselinePath,
        action: fs.existsSync(baselinePath) ? 'updated' : 'created'
      });
      
      console.log(`   ✅ Approved as baseline\n`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      this.errors.push({
        screenshot: screenshotPath,
        error: error.message
      });
    }
  }

  extractTestName(filename) {
    // Extract meaningful test name from filename
    let testName = filename
      .replace('.png', '')
      .replace('-actual', '')
      .replace(/^\d+/, '') // Remove leading numbers
      .replace(/[_-]/g, ' ')
      .trim();
    
    // Capitalize first letter
    testName = testName.charAt(0).toUpperCase() + testName.slice(1);
    
    return testName;
  }

  generateSummary() {
    console.log('📊 Visual Baseline Approval Summary');
    console.log('='.repeat(50));
    
    if (this.approved.length > 0) {
      console.log(`✅ Approved ${this.approved.length} screenshot(s):`);
      for (const item of this.approved) {
        console.log(`   • ${item.testName} (${item.action})`);
      }
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Failed to approve ${this.errors.length} screenshot(s):`);
      for (const error of this.errors) {
        console.log(`   • ${path.basename(error.screenshot)}: ${error.error}`);
      }
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Review the approved baselines in the visual-baseline directory');
    console.log('   2. Commit the new/updated baseline images to version control');
    console.log('   3. Future test runs will compare against these baselines');
    
    if (this.approved.length > 0) {
      console.log('\n🔧 Git commands to commit baselines:');
      console.log('   git add visual-baseline/');
      console.log('   git commit -m "Update visual regression baselines"');
    }
  }
}

// Run approval if called directly
if (require.main === module) {
  const approver = new VisualBaselineApprover();
  approver.approve().catch(console.error);
}

module.exports = VisualBaselineApprover;