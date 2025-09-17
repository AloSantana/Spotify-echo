#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const timestamp = Date.now();
const SCREENSHOT_DIR = `BROWSERTESTIMAGES/backend-frontend-analysis-${timestamp}`;

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function analyzeBackend() {
  console.log('🔍 Analyzing Backend APIs...');
  
  const results = {
    working: [],
    errors: []
  };
  
  const endpoints = [
    { name: 'Health Check', path: '/health' },
    { name: 'System Status', path: '/api/system/status' }, 
    { name: 'Providers', path: '/api/providers' },
    { name: 'Readiness', path: '/ready' },
    { name: 'Liveness', path: '/alive' },
    { name: 'User Settings', path: '/api/user-settings' },
    { name: 'Spotify Auth Status', path: '/api/spotify/auth/status' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint.path}`, { timeout: 5000 });
      results.working.push({
        name: endpoint.name,
        path: endpoint.path, 
        status: response.status,
        hasData: !!response.data
      });
      console.log(`✅ ${endpoint.name}: ${response.status}`);
    } catch (error) {
      results.errors.push({
        name: endpoint.name,
        path: endpoint.path,
        error: error.message,
        status: error.response?.status || 'failed'
      });
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
  
  return results;
}

async function analyzeFrontend() {
  console.log('🎨 Analyzing Frontend Pages...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  const results = {
    pages: [],
    screenshots: []
  };
  
  const pages = [
    { name: 'Homepage', url: '/' },
    { name: 'Settings', url: '/settings.html' },
    { name: 'Chat', url: '/chat.html' },
    { name: 'Admin', url: '/admin.html' },
    { name: 'Playlists', url: '/playlists.html' }
  ];
  
  for (const pageConfig of pages) {
    try {
      console.log(`📄 Testing: ${pageConfig.name}`);
      
      const response = await page.goto(`${BASE_URL}${pageConfig.url}`, {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      const title = await page.title();
      const screenshot = path.join(SCREENSHOT_DIR, `${pageConfig.name.toLowerCase()}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      
      results.pages.push({
        name: pageConfig.name,
        url: pageConfig.url,
        status: response.status(),
        title: title,
        working: response.ok()
      });
      
      results.screenshots.push({
        page: pageConfig.name,
        file: path.basename(screenshot)
      });
      
      console.log(`✅ ${pageConfig.name}: ${response.status()} - ${title}`);
      
    } catch (error) {
      results.pages.push({
        name: pageConfig.name,
        url: pageConfig.url,
        error: error.message,
        working: false
      });
      console.log(`❌ ${pageConfig.name}: ${error.message}`);
    }
  }
  
  await browser.close();
  return results;
}

async function generateReport(backendResults, frontendResults) {
  console.log('📊 Generating Analysis Report...');
  
  const workingBackend = backendResults.working.length;
  const totalBackend = backendResults.working.length + backendResults.errors.length;
  const workingFrontend = frontendResults.pages.filter(p => p.working).length;
  const totalFrontend = frontendResults.pages.length;
  
  const backendScore = (workingBackend / totalBackend) * 100;
  const frontendScore = (workingFrontend / totalFrontend) * 100;
  const overallScore = (backendScore + frontendScore) / 2;
  
  const report = `# 🎵 EchoTune AI - Backend & Frontend Analysis

**Generated**: ${new Date().toISOString()}
**Overall Health**: ${overallScore.toFixed(1)}%

## 📊 Summary
- **Backend APIs**: ${workingBackend}/${totalBackend} working (${backendScore.toFixed(1)}%)
- **Frontend Pages**: ${workingFrontend}/${totalFrontend} working (${frontendScore.toFixed(1)}%)
- **Screenshots**: ${frontendResults.screenshots.length} captured

## 🔧 Backend API Status

### ✅ Working APIs (${workingBackend})
${backendResults.working.map(api => `- **${api.name}**: HTTP ${api.status} \`${api.path}\``).join('\n')}

### ❌ Failed APIs (${backendResults.errors.length})
${backendResults.errors.map(api => `- **${api.name}**: ${api.error} \`${api.path}\``).join('\n')}

## 🎨 Frontend Page Status

### ✅ Working Pages (${workingFrontend})
${frontendResults.pages.filter(p => p.working).map(page => `- **${page.name}**: HTTP ${page.status} - "${page.title}"`).join('\n')}

### ❌ Failed Pages (${totalFrontend - workingFrontend})
${frontendResults.pages.filter(p => !p.working).map(page => `- **${page.name}**: ${page.error || 'Unknown error'}`).join('\n')}

## 📷 Screenshots Captured
${frontendResults.screenshots.map(shot => `- **${shot.page}**: ${shot.file}`).join('\n')}

## 🎯 Analysis Summary

### Backend Health: ${backendScore >= 80 ? '🟢 Excellent' : backendScore >= 60 ? '🟡 Good' : '🔴 Needs Attention'}
- **System Status**: ${backendResults.working.find(api => api.name === 'System Status') ? '✅ Working' : '❌ Failed'}
- **API Providers**: ${backendResults.working.find(api => api.name === 'Providers') ? '✅ Working' : '❌ Failed'}
- **Health Checks**: ${backendResults.working.find(api => api.name.includes('Health') || api.name.includes('Ready') || api.name.includes('Live')) ? '✅ Working' : '❌ Failed'}

### Frontend Health: ${frontendScore >= 80 ? '🟢 Excellent' : frontendScore >= 60 ? '🟡 Good' : '🔴 Needs Attention'}
- **Core Pages**: ${frontendResults.pages.filter(p => ['Homepage', 'Settings'].includes(p.name) && p.working).length}/2 working
- **Feature Pages**: ${frontendResults.pages.filter(p => ['Chat', 'Admin', 'Playlists'].includes(p.name) && p.working).length}/3 working

### Overall Status: ${overallScore >= 80 ? '🟢 Production Ready' : overallScore >= 60 ? '🟡 Mostly Functional' : '🔴 Needs Development'}

---
**Analysis completed**: ${new Date().toISOString()}
**Directory**: ${SCREENSHOT_DIR}
`;

  const reportPath = path.join(SCREENSHOT_DIR, 'analysis-report.md');
  fs.writeFileSync(reportPath, report);
  
  const jsonPath = path.join(SCREENSHOT_DIR, 'analysis-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    backend: backendResults,
    frontend: frontendResults,
    scores: { backend: backendScore, frontend: frontendScore, overall: overallScore }
  }, null, 2));
  
  console.log(`📄 Report saved: ${reportPath}`);
  console.log(`📊 Data saved: ${jsonPath}`);
  
  return { backendScore, frontendScore, overallScore };
}

async function main() {
  try {
    console.log('🚀 Starting EchoTune AI Analysis...');
    
    const backendResults = await analyzeBackend();
    const frontendResults = await analyzeFrontend();
    const scores = await generateReport(backendResults, frontendResults);
    
    console.log('\n🎉 Analysis Complete!');
    console.log(`📊 Backend: ${scores.backendScore.toFixed(1)}%`);
    console.log(`🎨 Frontend: ${scores.frontendScore.toFixed(1)}%`);
    console.log(`🎯 Overall: ${scores.overallScore.toFixed(1)}%`);
    console.log(`📁 Results: ${SCREENSHOT_DIR}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

main();