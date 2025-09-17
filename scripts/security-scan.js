#!/usr/bin/env node

/**
 * Security Scanner - Authentic Dependency & Vulnerability Scanner
 * 
 * Integrates npm audit with SecurityAuditFramework for comprehensive
 * security validation. Supports allowlists and CI/CD integration.
 * 
 * @author EchoTune AI Team
 * @version 1.0.0
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SecurityScanner {
  constructor(options = {}) {
    this.options = {
      allowlistPath: options.allowlistPath || path.join(__dirname, '..', 'security', 'allowlist.json'),
      outputPath: options.outputPath || path.join(__dirname, '..', 'reports', 'security'),
      failOnHigh: options.failOnHigh !== false,
      failOnCritical: options.failOnCritical !== false,
      includeDevDependencies: options.includeDevDependencies !== false,
      ...options
    };

    this.allowlist = new Map();
    this.results = {
      npm: null,
      security: null,
      summary: null
    };
  }

  async scan() {
    console.log('🔒 Starting comprehensive security scan...');
    
    try {
      // Load security allowlist
      await this.loadAllowlist();
      
      // Run npm audit
      const npmResults = await this.runNpmAudit();
      
      // Process with SecurityAuditFramework
      const securityResults = await this.processWithSecurityFramework(npmResults);
      
      // Generate comprehensive report
      const summary = this.generateSummary(npmResults, securityResults);
      
      // Save results
      await this.saveResults(npmResults, securityResults, summary);
      
      // Check if CI should fail
      const shouldFail = this.shouldFailCI(summary);
      
      console.log(shouldFail ? '❌ Security scan failed - vulnerabilities found' : '✅ Security scan passed');
      
      return {
        passed: !shouldFail,
        summary,
        npmResults,
        securityResults
      };

    } catch (error) {
      console.error('❌ Security scan failed:', error);
      throw error;
    }
  }

  async loadAllowlist() {
    try {
      const allowlistData = await fs.readFile(this.options.allowlistPath, 'utf8');
      const allowlist = JSON.parse(allowlistData);
      
      // Process allowlist entries
      for (const entry of allowlist.entries || []) {
        // Check if entry is expired
        if (entry.expires && new Date(entry.expires) < new Date()) {
          console.log(`⚠️ Allowlist entry expired: ${entry.id}`);
          continue;
        }
        
        this.allowlist.set(entry.id, entry);
      }
      
      console.log(`📋 Loaded ${this.allowlist.size} allowlist entries`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📋 No allowlist found, creating default...');
        await this.createDefaultAllowlist();
      } else {
        console.error('❌ Failed to load allowlist:', error);
        throw error;
      }
    }
  }

  async createDefaultAllowlist() {
    const defaultAllowlist = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      entries: []
    };

    // Ensure security directory exists
    await fs.mkdir(path.dirname(this.options.allowlistPath), { recursive: true });
    
    await fs.writeFile(
      this.options.allowlistPath, 
      JSON.stringify(defaultAllowlist, null, 2)
    );
  }

  async runNpmAudit() {
    console.log('🔍 Running npm audit...');
    
    try {
      const auditCommand = `npm audit --json ${this.options.includeDevDependencies ? '' : '--omit=dev'}`;
      const { stdout, stderr } = await execAsync(auditCommand);
      
      let auditData;
      try {
        auditData = JSON.parse(stdout);
      } catch (parseError) {
        console.error('❌ Failed to parse npm audit output:', parseError);
        throw new Error('Invalid npm audit output');
      }

      console.log(`📊 Audit completed: ${auditData.metadata?.totalDependencies || 0} dependencies scanned`);
      
      return {
        metadata: auditData.metadata || {},
        vulnerabilities: auditData.vulnerabilities || {},
        auditReportVersion: auditData.auditReportVersion || 2,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      // npm audit exits with code 1 when vulnerabilities are found
      if (error.code === 1 && error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          console.log(`⚠️ Vulnerabilities found: ${auditData.metadata?.vulnerabilities || 'unknown'}`);
          
          return {
            metadata: auditData.metadata || {},
            vulnerabilities: auditData.vulnerabilities || {},
            auditReportVersion: auditData.auditReportVersion || 2,
            timestamp: new Date().toISOString()
          };
        } catch (parseError) {
          console.error('❌ Failed to parse npm audit error output:', parseError);
        }
      }
      
      console.error('❌ npm audit execution failed:', error.message);
      throw error;
    }
  }

  async processWithSecurityFramework(npmResults) {
    console.log('🛡️ Processing with SecurityAuditFramework...');
    
    try {
      // Import SecurityAuditFramework
      const SecurityAuditFramework = require('../src/security/audit/SecurityAuditFramework');
      const securityFramework = new SecurityAuditFramework();
      
      // Convert npm audit results to security framework format
      const securityData = this.convertNpmToSecurityFormat(npmResults);
      
      // Run comprehensive security analysis
      const results = await securityFramework.runComprehensiveAudit(securityData);
      
      return results;
      
    } catch (error) {
      console.warn('⚠️ SecurityAuditFramework not available, using npm audit only:', error.message);
      return null;
    }
  }

  convertNpmToSecurityFormat(npmResults) {
    const vulnerabilities = [];
    
    // Convert npm audit vulnerabilities to security framework format
    for (const [packageName, vulnerability] of Object.entries(npmResults.vulnerabilities || {})) {
      vulnerabilities.push({
        id: vulnerability.source || `npm-${packageName}`,
        package: packageName,
        severity: this.mapNpmSeverity(vulnerability.severity),
        title: vulnerability.title || `Vulnerability in ${packageName}`,
        description: vulnerability.overview || vulnerability.title,
        recommendation: vulnerability.recommendation,
        reference: vulnerability.url,
        via: vulnerability.via,
        range: vulnerability.range,
        nodes: vulnerability.nodes,
        fixAvailable: vulnerability.fixAvailable
      });
    }
    
    return {
      vulnerabilities,
      metadata: npmResults.metadata,
      timestamp: npmResults.timestamp
    };
  }

  mapNpmSeverity(npmSeverity) {
    const severityMap = {
      'info': 'low',
      'low': 'low',
      'moderate': 'medium',
      'high': 'high',
      'critical': 'critical'
    };
    
    return severityMap[npmSeverity] || 'unknown';
  }

  generateSummary(npmResults, securityResults) {
    const metadata = npmResults.metadata || {};
    const vulnerabilities = npmResults.vulnerabilities || {};
    
    // Count vulnerabilities by severity
    const severityCounts = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0
    };

    // Process npm vulnerabilities
    for (const vuln of Object.values(vulnerabilities)) {
      const severity = vuln.severity || 'info';
      if (severityCounts.hasOwnProperty(severity)) {
        severityCounts[severity]++;
      }
    }

    // Check allowlist and apply filtering
    const allowlistedVulns = this.filterAllowlistedVulnerabilities(vulnerabilities);
    const activeVulns = Object.keys(vulnerabilities).length - allowlistedVulns.length;

    const summary = {
      timestamp: new Date().toISOString(),
      totalDependencies: metadata.totalDependencies || 0,
      totalVulnerabilities: Object.keys(vulnerabilities).length,
      activeVulnerabilities: activeVulns,
      allowlistedVulnerabilities: allowlistedVulns.length,
      severityBreakdown: severityCounts,
      npmAuditVersion: npmResults.auditReportVersion,
      securityFrameworkResults: securityResults ? {
        score: securityResults.overallScore || 0,
        categories: Object.keys(securityResults.categories || {}).length
      } : null,
      recommendations: this.generateRecommendations(severityCounts, allowlistedVulns)
    };

    return summary;
  }

  filterAllowlistedVulnerabilities(vulnerabilities) {
    const allowlisted = [];
    
    for (const [packageName, vuln] of Object.entries(vulnerabilities)) {
      const vulnId = vuln.source || `npm-${packageName}`;
      
      if (this.allowlist.has(vulnId)) {
        const allowlistEntry = this.allowlist.get(vulnId);
        allowlisted.push({
          id: vulnId,
          package: packageName,
          reason: allowlistEntry.reason,
          expires: allowlistEntry.expires
        });
      }
    }
    
    return allowlisted;
  }

  generateRecommendations(severityCounts, allowlistedVulns) {
    const recommendations = [];
    
    if (severityCounts.critical > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: `Fix ${severityCounts.critical} critical vulnerabilities immediately`,
        command: 'npm audit fix --force'
      });
    }
    
    if (severityCounts.high > 0) {
      recommendations.push({
        priority: 'HIGH', 
        action: `Address ${severityCounts.high} high-severity vulnerabilities`,
        command: 'npm audit fix'
      });
    }
    
    if (severityCounts.moderate > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        action: `Consider fixing ${severityCounts.moderate} moderate vulnerabilities`,
        command: 'npm update && npm audit'
      });
    }
    
    // Check for expiring allowlist entries
    const expiringSoon = allowlistedVulns.filter(entry => {
      if (!entry.expires) return false;
      const expiryDate = new Date(entry.expires);
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return expiryDate < weekFromNow;
    });
    
    if (expiringSoon.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: `Review ${expiringSoon.length} allowlist entries expiring soon`,
        command: 'Review security/allowlist.json'
      });
    }
    
    return recommendations;
  }

  shouldFailCI(summary) {
    const { severityBreakdown, activeVulnerabilities } = summary;
    
    // Fail if there are active critical vulnerabilities and failOnCritical is enabled
    if (this.options.failOnCritical && severityBreakdown.critical > 0) {
      console.log(`❌ CI failure: ${severityBreakdown.critical} critical vulnerabilities found`);
      return true;
    }
    
    // Fail if there are active high vulnerabilities and failOnHigh is enabled
    if (this.options.failOnHigh && severityBreakdown.high > 0) {
      console.log(`❌ CI failure: ${severityBreakdown.high} high-severity vulnerabilities found`);
      return true;
    }
    
    return false;
  }

  async saveResults(npmResults, securityResults, summary) {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.options.outputPath, { recursive: true });
      
      // Save detailed npm audit results
      const npmPath = path.join(this.options.outputPath, 'npm-audit.json');
      await fs.writeFile(npmPath, JSON.stringify(npmResults, null, 2));
      
      // Save security framework results if available
      if (securityResults) {
        const securityPath = path.join(this.options.outputPath, 'security-audit.json');
        await fs.writeFile(securityPath, JSON.stringify(securityResults, null, 2));
      }
      
      // Save summary
      const summaryPath = path.join(this.options.outputPath, 'security-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(summary, npmResults);
      const markdownPath = path.join(this.options.outputPath, 'security-report.md');
      await fs.writeFile(markdownPath, markdownReport);
      
      console.log(`📄 Security reports saved to ${this.options.outputPath}`);
      
    } catch (error) {
      console.error('❌ Failed to save security results:', error);
      throw error;
    }
  }

  generateMarkdownReport(summary, npmResults) {
    const { severityBreakdown, totalVulnerabilities, activeVulnerabilities } = summary;
    
    return `# Security Audit Report

Generated: ${summary.timestamp}

## Summary

- **Total Dependencies**: ${summary.totalDependencies}
- **Total Vulnerabilities**: ${totalVulnerabilities}
- **Active Vulnerabilities**: ${activeVulnerabilities}
- **Allowlisted**: ${summary.allowlistedVulnerabilities}

## Vulnerability Breakdown

| Severity | Count |
|----------|-------|
| Critical | ${severityBreakdown.critical} |
| High | ${severityBreakdown.high} |
| Moderate | ${severityBreakdown.moderate} |
| Low | ${severityBreakdown.low} |
| Info | ${severityBreakdown.info} |

## Recommendations

${summary.recommendations.map(rec => 
  `### ${rec.priority}: ${rec.action}\n\n\`\`\`bash\n${rec.command}\n\`\`\``
).join('\n\n')}

## Detailed Vulnerabilities

${Object.entries(npmResults.vulnerabilities || {}).map(([pkg, vuln]) => 
  `### ${pkg} (${vuln.severity})\n\n${vuln.title || 'No title'}\n\n${vuln.overview || vuln.recommendation || 'No description'}`
).join('\n\n')}

---
*Generated by EchoTune Security Scanner v1.0.0*
`;
  }
}

// CLI execution
if (require.main === module) {
  const scanner = new SecurityScanner();
  
  scanner.scan()
    .then(results => {
      console.log('\n📋 SECURITY SCAN SUMMARY');
      console.log('========================');
      console.log(`Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Dependencies: ${results.summary.totalDependencies}`);
      console.log(`Vulnerabilities: ${results.summary.totalVulnerabilities}`);
      console.log(`Active: ${results.summary.activeVulnerabilities}`);
      
      if (results.summary.recommendations.length > 0) {
        console.log('\nRecommendations:');
        results.summary.recommendations.forEach(rec => {
          console.log(`  ${rec.priority}: ${rec.action}`);
        });
      }
      
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Security scan failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityScanner;