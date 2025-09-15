#!/usr/bin/env node
/**
 * Route Manifest Generator for EchoTune AI
 * Scans server routes and generates test coverage manifest
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class RouteManifestGenerator {
  constructor() {
    this.routes = [];
    this.testFiles = [];
    this.routePatterns = [
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /\.route\s*\(\s*['"`]([^'"`]+)['"`]/gi
    ];
  }

  async generate() {
    console.log('🔍 Generating Route Manifest...\n');
    
    // 1. Scan for route definitions
    await this.scanRoutes();
    
    // 2. Scan for test files
    await this.scanTestFiles();
    
    // 3. Cross-reference routes with tests
    this.crossReferenceTests();
    
    // 4. Generate manifest
    const manifest = this.generateManifest();
    
    // 5. Write manifest file
    await this.writeManifest(manifest);
    
    // 6. Generate summary
    this.generateSummary(manifest);
    
    return manifest;
  }

  async scanRoutes() {
    console.log('📂 Scanning route definitions...');
    
    // Scan server routes
    const routeFiles = [
      'src/api/routes/**/*.js',
      'src/routes/**/*.js', 
      'src/server.js',
      'server.js',
      'src/index.js',
      'index.js'
    ];
    
    for (const pattern of routeFiles) {
      const files = glob.sync(pattern);
      for (const file of files) {
        if (fs.existsSync(file)) {
          await this.parseRouteFile(file);
        }
      }
    }
    
    console.log(`  Found ${this.routes.length} routes`);
  }

  async parseRouteFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath, '.js');
      
      for (const pattern of this.routePatterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1] ? match[1].toUpperCase() : 'GET';
          const route = match[2] || match[1];
          
          if (route && !route.includes('*') && !route.includes(':')) {
            this.routes.push({
              route: this.normalizeRoute(route),
              method,
              file: filePath,
              category: this.categorizeRoute(route, fileName),
              hasTest: false
            });
          }
        }
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not parse ${filePath}: ${error.message}`);
    }
  }

  normalizeRoute(route) {
    // Normalize route paths
    if (!route.startsWith('/')) {
      route = '/' + route;
    }
    return route.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  categorizeRoute(route, fileName) {
    // Categorize routes based on path and filename
    if (route.includes('/api/chat') || fileName.includes('chat')) return 'chat';
    if (route.includes('/api/auth') || fileName.includes('auth')) return 'auth';
    if (route.includes('/api/spotify') || fileName.includes('spotify')) return 'spotify';
    if (route.includes('/api/settings') || fileName.includes('settings')) return 'settings';
    if (route.includes('/api/recommendations') || fileName.includes('rec')) return 'recommendations';
    if (route.includes('/api/') || fileName.includes('api')) return 'api';
    if (route.includes('/health') || fileName.includes('health')) return 'health';
    return 'general';
  }

  async scanTestFiles() {
    console.log('🧪 Scanning test files...');
    
    const testPatterns = [
      'tests/**/*.test.js',
      'tests/**/*.spec.js', 
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ];
    
    for (const pattern of testPatterns) {
      const files = glob.sync(pattern);
      this.testFiles.push(...files);
    }
    
    console.log(`  Found ${this.testFiles.length} test files`);
  }

  crossReferenceTests() {
    console.log('🔗 Cross-referencing routes with tests...');
    
    for (const route of this.routes) {
      // Check if there's a test file that matches the route category or specific route
      const hasTest = this.testFiles.some(testFile => {
        const testName = path.basename(testFile, path.extname(testFile)).toLowerCase();
        const routePath = route.route.toLowerCase();
        const category = route.category.toLowerCase();
        
        // Check for exact matches, category matches, or route path matches
        return testName.includes(category) || 
               testName.includes(routePath.replace(/[\/\-]/g, '')) ||
               testFile.toLowerCase().includes(category);
      });
      
      route.hasTest = hasTest;
    }
  }

  generateManifest() {
    const timestamp = new Date().toISOString();
    const coverage = this.calculateCoverage();
    
    return {
      generated: timestamp,
      summary: {
        totalRoutes: this.routes.length,
        testedRoutes: this.routes.filter(r => r.hasTest).length,
        untested: this.routes.filter(r => !r.hasTest).length,
        coveragePercent: coverage
      },
      routes: this.routes.sort((a, b) => a.route.localeCompare(b.route)),
      categories: this.generateCategoryStats(),
      testFiles: this.testFiles
    };
  }

  calculateCoverage() {
    if (this.routes.length === 0) return 0;
    const tested = this.routes.filter(r => r.hasTest).length;
    return Math.round((tested / this.routes.length) * 100);
  }

  generateCategoryStats() {
    const categories = {};
    
    for (const route of this.routes) {
      if (!categories[route.category]) {
        categories[route.category] = {
          total: 0,
          tested: 0
        };
      }
      
      categories[route.category].total++;
      if (route.hasTest) {
        categories[route.category].tested++;
      }
    }
    
    // Add coverage percentage to each category
    for (const category in categories) {
      const stats = categories[category];
      stats.coverage = stats.total > 0 ? Math.round((stats.tested / stats.total) * 100) : 0;
    }
    
    return categories;
  }

  async writeManifest(manifest) {
    const outputDir = 'reports';
    const outputFile = path.join(outputDir, 'route-manifest.json');
    
    // Ensure reports directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
    console.log(`📝 Route manifest written to ${outputFile}`);
  }

  generateSummary(manifest) {
    console.log('\n📊 Route Coverage Summary:');
    console.log('='.repeat(50));
    console.log(`Total Routes: ${manifest.summary.totalRoutes}`);
    console.log(`Tested Routes: ${manifest.summary.testedRoutes}`);
    console.log(`Untested Routes: ${manifest.summary.untested}`);
    console.log(`Coverage: ${manifest.summary.coveragePercent}%`);
    
    console.log('\nBy Category:');
    for (const [category, stats] of Object.entries(manifest.categories)) {
      console.log(`  ${category}: ${stats.tested}/${stats.total} (${stats.coverage}%)`);
    }
    
    if (manifest.summary.untested > 0) {
      console.log('\nUntested Routes:');
      const untested = manifest.routes.filter(r => !r.hasTest);
      for (const route of untested.slice(0, 10)) { // Show first 10
        console.log(`  ${route.method} ${route.route} (${route.category})`);
      }
      if (untested.length > 10) {
        console.log(`  ... and ${untested.length - 10} more`);
      }
    }
    
    console.log('='.repeat(50));
  }
}

// Run generator if called directly
if (require.main === module) {
  const generator = new RouteManifestGenerator();
  generator.generate().catch(console.error);
}

module.exports = RouteManifestGenerator;