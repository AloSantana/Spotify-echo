const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function takeScreenshots() {
  const outputDir = path.join(__dirname, 'BROWSERTESTIMAGES', 'enhanced-ui');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Starting enhanced UI screenshot capture...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Take main dashboard screenshot
    console.log('📸 Capturing main dashboard...');
    await page.screenshot({ path: path.join(outputDir, '1-main-dashboard-enhanced.png'), fullPage: true });
    
    // Navigate to different tabs and capture screenshots
    const tabs = ['chat', 'discovery', 'analytics', 'playlist'];
    
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      console.log(`📸 Capturing ${tab} interface...`);
      
      try {
        // Click on the tab
        await page.click(`[value="${tab}"]`);
        await page.waitForTimeout(2000); // Wait for content to load
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join(outputDir, `${i + 2}-${tab}-interface-enhanced.png`), 
          fullPage: true 
        });
      } catch (error) {
        console.log(`⚠️ Could not capture ${tab}: ${error.message}`);
      }
    }

    // Try mobile view
    console.log('📱 Capturing mobile view...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(outputDir, '6-mobile-view-enhanced.png'), fullPage: true });

    console.log('✅ Enhanced UI screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${outputDir}`);

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);