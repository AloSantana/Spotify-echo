/**
 * Structure Validation Script
 * 
 * Validates the EchoTune AI project structure against the ARCHITECTURE_MAP.json
 * and ensures proper folder contracts are maintained.
 * 
 * Usage:
 *   node scripts/validate-structure.js
 *   node scripts/validate-structure.js --fix
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

class StructureValidator {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.architectureMapPath = path.join(projectRoot, 'docs', 'ARCHITECTURE_MAP.json');
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  async validate(shouldFix = false) {
    console.log('🔍 Validating project structure...');
    
    try {
      // Load architecture map
      const architectureMap = this._loadArchitectureMap();
      
      // Validate folders exist and have README files
      await this._validateFoldersExist(architectureMap.folders, shouldFix);
      
      // Validate required files exist
      await this._validateRequiredFiles(shouldFix);
      
      // Validate coding agent guidelines
      await this._validateCodingAgentGuidelines(architectureMap);
      
      // Report results
      this._reportResults(shouldFix);
      
      return {
        valid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
        fixes: this.fixes
      };
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return { valid: false, errors: [error.message], warnings: [], fixes: [] };
    }
  }

  _loadArchitectureMap() {
    try {
      if (!fs.existsSync(this.architectureMapPath)) {
        throw new Error('ARCHITECTURE_MAP.json not found in docs/ directory');
      }
      
      const content = fs.readFileSync(this.architectureMapPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load ARCHITECTURE_MAP.json: ${error.message}`);
    }
  }

  async _validateFoldersExist(folders, shouldFix) {
    console.log('📁 Validating folder structure...');
    
    for (const [folderPath, config] of Object.entries(folders)) {
      const fullPath = path.join(this.projectRoot, folderPath);
      const readmePath = path.join(fullPath, 'README.md');
      
      // Check if folder exists
      if (!fs.existsSync(fullPath)) {
        if (config.plane === 'product' || config.plane === 'intelligence') {
          this.errors.push(`Missing critical folder: ${folderPath}`);
          
          if (shouldFix) {
            fs.mkdirSync(fullPath, { recursive: true });
            this.fixes.push(`Created folder: ${folderPath}`);
          }
        } else {
          this.warnings.push(`Missing optional folder: ${folderPath}`);
        }
        continue;
      }
      
      // Check if README exists for critical folders
      if (!fs.existsSync(readmePath)) {
        if (config.plane === 'product' || config.plane === 'intelligence') {
          this.errors.push(`Missing README.md in critical folder: ${folderPath}`);
          
          if (shouldFix) {
            this._createFolderReadme(readmePath, folderPath, config);
            this.fixes.push(`Created README.md in: ${folderPath}`);
          }
        } else {
          this.warnings.push(`Missing README.md in: ${folderPath}`);
        }
      } else {
        // Validate README content
        this._validateReadmeContent(readmePath, folderPath, config);
      }
    }
  }

  async _validateRequiredFiles(shouldFix) {
    console.log('📄 Validating required files...');
    
    const requiredFiles = [
      'docs/ARCHITECTURE_MAP.json',
      'docs/DATA_MODEL.md',
      'src/orchestration/ChatRecommendationOrchestrator.js',
      'src/recommendation/engine.js',
      'src/cache/RecommendationCache.js',
      'scripts/apply-indexes.js'
    ];
    
    for (const filePath of requiredFiles) {
      const fullPath = path.join(this.projectRoot, filePath);
      
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Missing required file: ${filePath}`);
        
        if (shouldFix) {
          // Create minimal file structure if missing
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Create placeholder file
          const placeholder = this._getFilePlaceholder(filePath);
          fs.writeFileSync(fullPath, placeholder);
          this.fixes.push(`Created placeholder file: ${filePath}`);
        }
      }
    }
  }

  async _validateCodingAgentGuidelines(architectureMap) {
    console.log('🤖 Validating coding agent guidelines...');
    
    const guidelines = architectureMap.coding_agent_guidelines;
    if (!guidelines) {
      this.warnings.push('No coding_agent_guidelines defined in ARCHITECTURE_MAP.json');
      return;
    }
    
    // Validate primary focus folders exist
    for (const folder of guidelines.primary_focus || []) {
      const fullPath = path.join(this.projectRoot, folder);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Primary focus folder missing: ${folder}`);
      }
    }
    
    // Validate secondary focus folders exist
    for (const folder of guidelines.secondary_focus || []) {
      const fullPath = path.join(this.projectRoot, folder);
      if (!fs.existsSync(fullPath)) {
        this.warnings.push(`Secondary focus folder missing: ${folder}`);
      }
    }
    
    // Check that safe_to_create folders have proper structure
    for (const folder of guidelines.safe_to_create || []) {
      const fullPath = path.join(this.projectRoot, folder);
      if (fs.existsSync(fullPath)) {
        const readmePath = path.join(fullPath, 'README.md');
        if (!fs.existsSync(readmePath)) {
          this.warnings.push(`Safe-to-create folder lacks README.md: ${folder}`);
        }
      }
    }
  }

  _validateReadmeContent(readmePath, folderPath, config) {
    try {
      const content = fs.readFileSync(readmePath, 'utf8');
      
      // Check for required sections
      const requiredSections = ['## Purpose', '## Public Interfaces'];
      
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          this.warnings.push(`README.md in ${folderPath} missing section: ${section}`);
        }
      }
      
      // Check if description matches config
      if (config.description && !content.toLowerCase().includes(config.description.toLowerCase().substring(0, 20))) {
        this.warnings.push(`README.md description in ${folderPath} may not match architecture map`);
      }
      
    } catch (error) {
      this.warnings.push(`Could not validate README.md content in ${folderPath}: ${error.message}`);
    }
  }

  _createFolderReadme(readmePath, folderPath, config) {
    const template = `# ${this._getFolderTitle(folderPath)}

## Purpose
${config.description}

## Public Interfaces
${config.public_interfaces ? config.public_interfaces.map(iface => `- ${iface}`).join('\n') : '- (Interfaces to be documented)'}

## Architecture
(Architecture documentation to be added)

## Stability
**Stability Level**: ${config.stability}

${config.stability === 'stable' ? 'This module has a stable API and can be safely used by other components.' : ''}
${config.stability === 'evolving' ? 'This module is under active development. APIs may change.' : ''}
${config.stability === 'experimental' ? 'This module is experimental. Use with caution.' : ''}

## Documentation
${config.documentation || 'Additional documentation to be added.'}
`;
    
    fs.writeFileSync(readmePath, template);
  }

  _getFolderTitle(folderPath) {
    const folderName = path.basename(folderPath);
    return folderName.split(/[-_]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  _getFilePlaceholder(filePath) {
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    
    if (ext === '.js') {
      return `/**
 * ${basename}
 * 
 * Placeholder implementation - to be completed.
 * 
 * @author EchoTune AI Team
 */

// TODO: Implement ${basename}

module.exports = {};
`;
    } else if (ext === '.md') {
      return `# ${basename.replace(/[-_]/g, ' ')}

## Overview
This document is a placeholder and needs to be completed.

## Contents
- (To be documented)

## TODO
- [ ] Add comprehensive documentation
- [ ] Include examples and usage
- [ ] Validate content accuracy
`;
    } else if (ext === '.json') {
      return '{\n  "placeholder": true,\n  "todo": "Replace with actual configuration"\n}\n';
    }
    
    return `// ${basename} - Placeholder file\n// TODO: Implement functionality\n`;
  }

  _reportResults(shouldFix) {
    console.log('\n📋 Validation Results:');
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (shouldFix && this.fixes.length > 0) {
      console.log(`\n🔧 Applied Fixes (${this.fixes.length}):`);
      this.fixes.forEach(fix => console.log(`  - ${fix}`));
    }
    
    if (this.errors.length === 0) {
      console.log('\n✅ Structure validation passed!');
    } else {
      console.log('\n❌ Structure validation failed.');
      if (!shouldFix) {
        console.log('Run with --fix to automatically fix some issues.');
      }
    }
  }

  async checkProjectHealth() {
    console.log('\n🏥 Project Health Check:');
    
    const health = {
      totalFolders: 0,
      foldersWithReadme: 0,
      criticalFiles: 0,
      testCoverage: 0,
      score: 0
    };
    
    try {
      // Count folders and READMEs in src/
      const srcPath = path.join(this.projectRoot, 'src');
      if (fs.existsSync(srcPath)) {
        const folders = this._getFoldersRecursive(srcPath);
        health.totalFolders = folders.length;
        health.foldersWithReadme = folders.filter(folder => 
          fs.existsSync(path.join(folder, 'README.md'))
        ).length;
      }
      
      // Check critical files
      const criticalFiles = [
        'src/orchestration/ChatRecommendationOrchestrator.js',
        'src/recommendation/engine.js',
        'src/cache/RecommendationCache.js',
        'docs/ARCHITECTURE_MAP.json',
        'docs/DATA_MODEL.md'
      ];
      
      health.criticalFiles = criticalFiles.filter(file => 
        fs.existsSync(path.join(this.projectRoot, file))
      ).length;
      
      // Calculate health score
      const readmeScore = health.totalFolders > 0 ? (health.foldersWithReadme / health.totalFolders) * 30 : 0;
      const filesScore = (health.criticalFiles / criticalFiles.length) * 40;
      const structureScore = this.errors.length === 0 ? 30 : Math.max(0, 30 - this.errors.length * 5);
      
      health.score = Math.round(readmeScore + filesScore + structureScore);
      
      console.log(`  📁 Folders with README: ${health.foldersWithReadme}/${health.totalFolders}`);
      console.log(`  🔧 Critical files: ${health.criticalFiles}/${criticalFiles.length}`);
      console.log(`  📊 Health score: ${health.score}/100`);
      
      if (health.score >= 80) {
        console.log('  🟢 Excellent project health');
      } else if (health.score >= 60) {
        console.log('  🟡 Good project health');
      } else if (health.score >= 40) {
        console.log('  🟠 Fair project health - needs improvement');
      } else {
        console.log('  🔴 Poor project health - requires attention');
      }
      
    } catch (error) {
      console.warn('Could not complete health check:', error.message);
    }
    
    return health;
  }

  _getFoldersRecursive(dirPath) {
    const folders = [];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.')) {
          folders.push(itemPath);
          folders.push(...this._getFoldersRecursive(itemPath));
        }
      }
    } catch (error) {
      // Ignore errors for inaccessible directories
    }
    
    return folders;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const healthCheck = args.includes('--health');

  const validator = new StructureValidator();

  try {
    const results = await validator.validate(shouldFix);
    
    if (healthCheck) {
      await validator.checkProjectHealth();
    }
    
    process.exit(results.valid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { StructureValidator };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}