#!/usr/bin/env node

/**
 * Workflow Smoke Test Suite
 * 
 * Validates that critical GitHub Actions workflows have proper configuration
 * and can execute without syntax errors or missing dependencies.
 * 
 * Tests:
 * - YAML syntax validation
 * - Required script existence
 * - Environment variable configuration
 * - Budget management integration
 * - Error handling patterns
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

class WorkflowSmokeTest {
  constructor() {
    this.workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    this.scriptsDir = path.join(process.cwd(), 'scripts');
    
    this.results = {
      passed: [],
      warnings: [],
      failed: []
    };
    
    // Critical workflows that must pass
    this.criticalWorkflows = [
      'perplexity-budget-guard.yml',
      'music-research-automation.yml',
      'autonomous-perplexity-development-cycle.yml',
      'autonomous-coding-perplexity-cycle.yml',
      'ai-budget-monitor.yml'
    ];
  }
  
  async run() {
    console.log('🧪 Starting Workflow Smoke Tests\n');
    console.log('=' .repeat(60));
    
    try {
      await this.validateYAMLSyntax();
      await this.validateScriptReferences();
      await this.validateBudgetIntegration();
      await this.validateErrorHandling();
      await this.validateTimeouts();
      
      this.printResults();
      
      return this.results.failed.length === 0;
      
    } catch (error) {
      console.error('\n❌ Smoke test suite failed:', error.message);
      return false;
    }
  }
  
  async validateYAMLSyntax() {
    console.log('\n📝 Validating YAML Syntax...');
    
    for (const workflow of this.criticalWorkflows) {
      try {
        const workflowPath = path.join(this.workflowsDir, workflow);
        const content = await fs.readFile(workflowPath, 'utf8');
        
        // Try to parse as YAML
        yaml.load(content);
        
        this.results.passed.push(`✅ ${workflow} - Valid YAML syntax`);
        console.log(`  ✅ ${workflow}`);
        
      } catch (error) {
        this.results.failed.push(`❌ ${workflow} - Invalid YAML: ${error.message}`);
        console.log(`  ❌ ${workflow} - ${error.message}`);
      }
    }
  }
  
  async validateScriptReferences() {
    console.log('\n📂 Validating Script References...');
    
    const scriptChecks = [
      { workflow: 'perplexity-budget-guard.yml', script: 'budget_guard.py' },
      { workflow: 'perplexity-budget-guard.yml', script: 'perplexity_costs.py' },
      { workflow: 'perplexity-budget-guard.yml', script: 'perplexity_cache.py' },
      { workflow: 'music-research-automation.yml', script: 'music-research-automation.js' },
      { workflow: 'ai-budget-monitor.yml', script: 'cost_monitor.py' }
    ];
    
    for (const check of scriptChecks) {
      const scriptPath = path.join(this.scriptsDir, check.script);
      
      try {
        await fs.access(scriptPath);
        this.results.passed.push(`✅ ${check.workflow} → ${check.script} exists`);
        console.log(`  ✅ ${check.script}`);
        
      } catch (error) {
        this.results.failed.push(`❌ ${check.workflow} → ${check.script} missing`);
        console.log(`  ❌ ${check.script} - NOT FOUND`);
      }
    }
  }
  
  async validateBudgetIntegration() {
    console.log('\n💰 Validating Budget Integration...');
    
    const workflowsNeedingBudgetCheck = [
      'music-research-automation.yml',
      'autonomous-perplexity-development-cycle.yml',
      'autonomous-coding-perplexity-cycle.yml'
    ];
    
    for (const workflow of workflowsNeedingBudgetCheck) {
      try {
        const workflowPath = path.join(this.workflowsDir, workflow);
        const content = await fs.readFile(workflowPath, 'utf8');
        
        // Check for budget-check job
        if (content.includes('budget-check:') || content.includes('budget-monitor:')) {
          this.results.passed.push(`✅ ${workflow} - Has budget check`);
          console.log(`  ✅ ${workflow}`);
        } else {
          this.results.warnings.push(`⚠️ ${workflow} - Missing budget check job`);
          console.log(`  ⚠️ ${workflow} - No budget check found`);
        }
        
      } catch (error) {
        this.results.failed.push(`❌ ${workflow} - Cannot read: ${error.message}`);
        console.log(`  ❌ ${workflow}`);
      }
    }
  }
  
  async validateErrorHandling() {
    console.log('\n🛡️ Validating Error Handling...');
    
    for (const workflow of this.criticalWorkflows) {
      try {
        const workflowPath = path.join(this.workflowsDir, workflow);
        const content = await fs.readFile(workflowPath, 'utf8');
        
        const hasErrorHandling = 
          content.includes('if:') &&
          (content.includes('failure()') || 
           content.includes('always()') ||
           content.includes('continue-on-error'));
        
        if (hasErrorHandling) {
          this.results.passed.push(`✅ ${workflow} - Has error handling`);
          console.log(`  ✅ ${workflow}`);
        } else {
          this.results.warnings.push(`⚠️ ${workflow} - Limited error handling`);
          console.log(`  ⚠️ ${workflow} - Consider adding error handling`);
        }
        
      } catch (error) {
        this.results.failed.push(`❌ ${workflow} - Cannot validate: ${error.message}`);
        console.log(`  ❌ ${workflow}`);
      }
    }
  }
  
  async validateTimeouts() {
    console.log('\n⏱️ Validating Timeout Configuration...');
    
    for (const workflow of this.criticalWorkflows) {
      try {
        const workflowPath = path.join(this.workflowsDir, workflow);
        const content = await fs.readFile(workflowPath, 'utf8');
        
        if (content.includes('timeout-minutes:')) {
          this.results.passed.push(`✅ ${workflow} - Has timeout protection`);
          console.log(`  ✅ ${workflow}`);
        } else {
          this.results.warnings.push(`⚠️ ${workflow} - No timeout set (could hang indefinitely)`);
          console.log(`  ⚠️ ${workflow} - Consider adding timeouts`);
        }
        
      } catch (error) {
        this.results.failed.push(`❌ ${workflow} - Cannot validate: ${error.message}`);
        console.log(`  ❌ ${workflow}`);
      }
    }
  }
  
  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 SMOKE TEST RESULTS\n');
    
    console.log(`✅ Passed: ${this.results.passed.length}`);
    console.log(`⚠️ Warnings: ${this.results.warnings.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}`);
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILURES:');
      this.results.failed.forEach(item => console.log(`  ${item}`));
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.warnings.forEach(item => console.log(`  ${item}`));
    }
    
    console.log('\n' + '=' .repeat(60));
    
    if (this.results.failed.length === 0) {
      console.log('✅ All critical tests passed!');
    } else {
      console.log('❌ Some tests failed - see above for details');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new WorkflowSmokeTest();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { WorkflowSmokeTest };
