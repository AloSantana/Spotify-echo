#!/usr/bin/env node

/**
 * API Validation Report Generator
 * Generates comprehensive Markdown reports from test results
 */

const fs = require('fs');
const path = require('path');

class APIValidationReportGenerator {
    constructor(inventoryPath, resultsPath) {
        this.inventory = null;
        this.results = null;
        this.inventoryPath = inventoryPath;
        this.resultsPath = resultsPath;
    }

    /**
     * Load data files
     */
    loadData() {
        try {
            if (fs.existsSync(this.inventoryPath)) {
                this.inventory = JSON.parse(fs.readFileSync(this.inventoryPath, 'utf8'));
            }
            if (fs.existsSync(this.resultsPath)) {
                this.results = JSON.parse(fs.readFileSync(this.resultsPath, 'utf8'));
            }
            return true;
        } catch (error) {
            console.error('Error loading data:', error.message);
            return false;
        }
    }

    /**
     * Generate Markdown report
     */
    generateMarkdownReport() {
        let md = '# 🧪 Comprehensive API Validation Report\n\n';
        
        // Executive Summary
        md += '## 📊 Executive Summary\n\n';
        md += `**Generated:** ${new Date().toISOString()}\n\n`;
        
        if (this.results) {
            md += `**Test Results:**\n`;
            md += `- Total Endpoints Tested: ${this.results.summary.total}\n`;
            md += `- ✅ Passed: ${this.results.summary.passed}\n`;
            md += `- ❌ Failed: ${this.results.summary.failed}\n`;
            md += `- ⏭️ Skipped: ${this.results.summary.skipped}\n`;
            md += `- Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%\n\n`;
        }

        if (this.inventory) {
            md += `**Endpoint Inventory:**\n`;
            md += `- Total Discovered: ${this.inventory.summary.total}\n`;
            md += `- Require Authentication: ${this.inventory.summary.authRequired}\n`;
            md += `- With Validation: ${this.inventory.summary.withValidation}\n\n`;
        }

        // Coverage Matrix
        if (this.results && this.results.coverageMatrix) {
            md += '## 📈 Coverage Matrix\n\n';
            md += '| Endpoint | Method | Happy Path | Auth Required | Invalid Method | Category |\n';
            md += '|----------|--------|------------|---------------|----------------|----------|\n';

            for (const [endpoint, data] of Object.entries(this.results.coverageMatrix)) {
                const happyPath = this.getScenarioStatus(data.scenarios.happy_path);
                const authRequired = this.getScenarioStatus(data.scenarios.auth_required);
                const invalidMethod = this.getScenarioStatus(data.scenarios.invalid_method);

                md += `| ${endpoint} | ${data.method} | ${happyPath} | ${authRequired} | ${invalidMethod} | ${data.category} |\n`;
            }

            md += '\n';
        }

        // Endpoint Inventory by Category
        if (this.inventory) {
            md += '## 📂 Endpoint Inventory by Category\n\n';
            
            for (const [category, count] of Object.entries(this.inventory.summary.byCategory)) {
                md += `### ${category} (${count} endpoints)\n\n`;
                
                const categoryEndpoints = this.inventory.mountedEndpoints.filter(e => e.category === category);
                
                md += '| Method | Path | Auth | Validation |\n';
                md += '|--------|------|------|------------|\n';
                
                for (const endpoint of categoryEndpoints) {
                    const authBadge = endpoint.requiresAuth ? '🔒 Yes' : '🔓 No';
                    const valBadge = endpoint.hasValidation ? '✓' : '—';
                    md += `| ${endpoint.method} | ${endpoint.fullPath} | ${authBadge} | ${valBadge} |\n`;
                }
                
                md += '\n';
            }
        }

        // Failed Tests
        if (this.results && this.results.detailedResults) {
            const failed = this.results.detailedResults.filter(r => r.failed > 0);
            
            if (failed.length > 0) {
                md += '## ❌ Failed Tests\n\n';
                
                for (const result of failed) {
                    md += `### ${result.method} ${result.endpoint}\n\n`;
                    md += `**Category:** ${result.category}\n\n`;
                    md += '**Failed Scenarios:**\n\n';
                    
                    for (const scenario of result.scenarios) {
                        if (!scenario.skipped && !scenario.passed) {
                            md += `- **${scenario.scenario}**: Status ${scenario.statusCode || 'error'}`;
                            if (scenario.error) {
                                md += ` - ${scenario.error}`;
                            }
                            md += '\n';
                        }
                    }
                    md += '\n';
                }
            }
        }

        // Recommendations
        md += '## 💡 Recommendations\n\n';
        
        const recommendations = this.generateRecommendations();
        for (const rec of recommendations) {
            md += `### ${rec.title}\n\n`;
            md += `**Priority:** ${rec.priority}\n\n`;
            md += `${rec.description}\n\n`;
        }

        // Test Execution Details
        if (this.results) {
            md += '## 🔍 Test Execution Details\n\n';
            md += `- **Base URL:** ${this.results.baseUrl}\n`;
            md += `- **Environment:** ${this.results.environment}\n`;
            md += `- **Timestamp:** ${this.results.timestamp}\n`;
            md += `- **Total Scenarios Executed:** ${this.countTotalScenarios()}\n\n`;
        }

        // How to Run
        md += '## 🚀 How to Run Locally\n\n';
        md += '```bash\n';
        md += '# 1. Discover endpoints\n';
        md += 'node scripts/discover-api-endpoints.js\n\n';
        md += '# 2. Run comprehensive tests\n';
        md += 'node scripts/comprehensive-api-tests.js\n\n';
        md += '# 3. Generate report\n';
        md += 'node scripts/generate-api-report.js\n';
        md += '```\n\n';

        // CI Integration
        md += '## 🔄 CI Integration\n\n';
        md += 'Tests run automatically in GitHub Actions on every push/PR.\n\n';
        md += 'Required environment variables:\n';
        md += '- `BASE_URL` - API base URL\n';
        md += '- `SPOTIFY_CLIENT_ID` - Spotify credentials\n';
        md += '- `SPOTIFY_CLIENT_SECRET` - Spotify credentials\n';
        md += '- `TEST_AUTH_TOKEN` - Optional test authentication token\n\n';

        return md;
    }

    /**
     * Get scenario status badge
     */
    getScenarioStatus(scenario) {
        if (!scenario) return '—';
        if (scenario.status === 'skipped') return '⏭️ Skipped';
        if (scenario.status === 'pass') return `✅ ${scenario.statusCode}`;
        return `❌ ${scenario.statusCode || 'Error'}`;
    }

    /**
     * Count total scenarios executed
     */
    countTotalScenarios() {
        if (!this.results || !this.results.detailedResults) return 0;
        
        let total = 0;
        for (const result of this.results.detailedResults) {
            total += result.scenarios.filter(s => !s.skipped).length;
        }
        return total;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];

        if (this.results && this.results.summary.failed > 0) {
            recommendations.push({
                title: 'Fix Failing Endpoints',
                priority: '🔴 HIGH',
                description: `${this.results.summary.failed} endpoint(s) are currently failing. Review the "Failed Tests" section above and address each failure.`
            });
        }

        if (this.inventory && this.inventory.summary.authRequired === 0) {
            recommendations.push({
                title: 'Review Authentication Requirements',
                priority: '🟡 MEDIUM',
                description: 'No endpoints appear to require authentication. Review sensitive endpoints and ensure proper auth middleware is applied.'
            });
        }

        if (this.results && this.results.summary.skipped > this.results.summary.passed) {
            recommendations.push({
                title: 'Increase Test Coverage',
                priority: '🟡 MEDIUM',
                description: 'Many test scenarios are being skipped. Consider adding test authentication tokens and expanding test coverage.'
            });
        }

        recommendations.push({
            title: 'Add Integration Tests',
            priority: '🟢 LOW',
            description: 'Current tests focus on endpoint availability. Consider adding integration tests for complex workflows and data validation.'
        });

        return recommendations;
    }

    /**
     * Save report to file
     */
    saveReport(content, filename) {
        const outputPath = path.join(__dirname, '..', filename);
        fs.writeFileSync(outputPath, content);
        console.log(`✅ Report saved: ${outputPath}`);
        return outputPath;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('📝 Generating API Validation Report...\n');

    const inventoryPath = path.join(__dirname, '../api-endpoint-inventory.json');
    const resultsPath = path.join(__dirname, '../comprehensive-api-test-results.json');

    const generator = new APIValidationReportGenerator(inventoryPath, resultsPath);
    
    if (!generator.loadData()) {
        console.log('⚠️ Could not load data files. Ensure you have run:');
        console.log('   1. node scripts/discover-api-endpoints.js');
        console.log('   2. node scripts/comprehensive-api-tests.js\n');
        process.exit(1);
    }

    // Generate Markdown report
    const markdownReport = generator.generateMarkdownReport();
    generator.saveReport(markdownReport, 'API-VALIDATION-REPORT.md');

    console.log('\n✅ Report generation complete!\n');
}

if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = { APIValidationReportGenerator, main };
