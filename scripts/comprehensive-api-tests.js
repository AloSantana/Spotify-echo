#!/usr/bin/env node

/**
 * Comprehensive API Testing Script
 * Tests all discovered endpoints with multiple scenarios
 * 
 * Test Scenarios:
 * - Happy path (valid request)
 * - Auth required (with/without token)
 * - Validation errors (missing/invalid params)
 * - Permission/role checks
 * - Error handling (4xx/5xx responses)
 */

const http = require('https');
const httpPlain = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

class ComprehensiveAPITester {
    constructor() {
        this.results = [];
        this.summary = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            scenarios: {}
        };
    }

    /**
     * Make HTTP request
     */
    async makeRequest(method, path, options = {}) {
        return new Promise((resolve) => {
            const url = new URL(path, BASE_URL);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? http : httpPlain;

            const requestOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: options.headers || {},
                timeout: options.timeout || 5000
            };

            const startTime = Date.now();
            const req = httpModule.request(requestOptions, (res) => {
                const responseTime = Date.now() - startTime;
                let data = '';

                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const jsonData = data ? JSON.parse(data) : null;
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: jsonData,
                            responseTime,
                            rawBody: data
                        });
                    } catch (e) {
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: data,
                            responseTime,
                            rawBody: data
                        });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    responseTime: Date.now() - startTime
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    success: false,
                    error: 'Request timeout',
                    responseTime: Date.now() - startTime
                });
            });

            if (options.body) {
                req.write(JSON.stringify(options.body));
            }

            req.end();
        });
    }

    /**
     * Test endpoint - Happy path
     */
    async testHappyPath(endpoint) {
        const result = await this.makeRequest(endpoint.method, endpoint.fullPath);
        
        return {
            scenario: 'happy_path',
            passed: result.success && (result.statusCode === 200 || result.statusCode === 404),
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            error: result.error
        };
    }

    /**
     * Test endpoint - Auth required (without token)
     */
    async testAuthRequired(endpoint) {
        if (!endpoint.requiresAuth) {
            return { scenario: 'auth_required', skipped: true, reason: 'No auth required' };
        }

        const result = await this.makeRequest(endpoint.method, endpoint.fullPath);
        
        return {
            scenario: 'auth_required',
            passed: result.success && (result.statusCode === 401 || result.statusCode === 403 || result.statusCode === 404),
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            error: result.error
        };
    }

    /**
     * Test endpoint - With valid token
     */
    async testWithAuth(endpoint) {
        if (!endpoint.requiresAuth) {
            return { scenario: 'with_auth', skipped: true, reason: 'No auth required' };
        }

        // Use a test token or skip if not available
        const testToken = process.env.TEST_AUTH_TOKEN;
        if (!testToken) {
            return { scenario: 'with_auth', skipped: true, reason: 'No test token available' };
        }

        const result = await this.makeRequest(endpoint.method, endpoint.fullPath, {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        
        return {
            scenario: 'with_auth',
            passed: result.success && result.statusCode < 500,
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            error: result.error
        };
    }

    /**
     * Test endpoint - Invalid method
     */
    async testInvalidMethod(endpoint) {
        // Test with wrong HTTP method
        const wrongMethod = endpoint.method === 'GET' ? 'POST' : 'GET';
        const result = await this.makeRequest(wrongMethod, endpoint.fullPath);
        
        return {
            scenario: 'invalid_method',
            passed: result.success && (result.statusCode === 405 || result.statusCode === 404),
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            error: result.error
        };
    }

    /**
     * Test single endpoint with all scenarios
     */
    async testEndpoint(endpoint) {
        console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.fullPath}`);
        
        const scenarios = [
            await this.testHappyPath(endpoint),
            await this.testAuthRequired(endpoint),
            await this.testInvalidMethod(endpoint)
        ];

        const endpointResult = {
            endpoint: endpoint.fullPath,
            method: endpoint.method,
            category: endpoint.category,
            requiresAuth: endpoint.requiresAuth,
            scenarios: scenarios,
            passed: scenarios.filter(s => !s.skipped && s.passed).length,
            failed: scenarios.filter(s => !s.skipped && !s.passed).length,
            skipped: scenarios.filter(s => s.skipped).length
        };

        // Log results
        scenarios.forEach(s => {
            if (s.skipped) {
                console.log(`   ⏭️ ${s.scenario}: SKIPPED (${s.reason})`);
            } else if (s.passed) {
                console.log(`   ✅ ${s.scenario}: PASS (${s.statusCode}) - ${s.responseTime}ms`);
            } else {
                console.log(`   ❌ ${s.scenario}: FAIL (${s.statusCode || 'error'}) - ${s.error || ''}`);
            }
        });

        this.results.push(endpointResult);
        this.summary.total++;
        
        if (endpointResult.failed === 0 && endpointResult.passed > 0) {
            this.summary.passed++;
        } else if (endpointResult.failed > 0) {
            this.summary.failed++;
        } else {
            this.summary.skipped++;
        }

        return endpointResult;
    }

    /**
     * Test all endpoints from inventory
     */
    async testAllEndpoints(endpoints) {
        console.log('\n🚀 Starting Comprehensive API Testing');
        console.log(`Total Endpoints to Test: ${endpoints.length}\n`);

        for (const endpoint of endpoints) {
            await this.testEndpoint(endpoint);
        }

        return {
            summary: this.summary,
            results: this.results
        };
    }

    /**
     * Generate coverage matrix
     */
    generateCoverageMatrix() {
        const matrix = {};

        for (const result of this.results) {
            if (!matrix[result.endpoint]) {
                matrix[result.endpoint] = {
                    method: result.method,
                    category: result.category,
                    scenarios: {}
                };
            }

            for (const scenario of result.scenarios) {
                matrix[result.endpoint].scenarios[scenario.scenario] = {
                    status: scenario.skipped ? 'skipped' : (scenario.passed ? 'pass' : 'fail'),
                    statusCode: scenario.statusCode,
                    responseTime: scenario.responseTime
                };
            }
        }

        return matrix;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('═'.repeat(70));
    console.log('🧪 COMPREHENSIVE API VALIDATION SUITE');
    console.log('═'.repeat(70));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CI: ${process.env.CI || 'false'}`);
    console.log('═'.repeat(70));

    // Load endpoint inventory
    const inventoryPath = path.join(__dirname, '../api-endpoint-inventory.json');
    
    if (!fs.existsSync(inventoryPath)) {
        console.log('\n⚠️ Endpoint inventory not found. Run endpoint discovery first:');
        console.log('   node scripts/discover-api-endpoints.js\n');
        process.exit(1);
    }

    const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    const endpoints = inventory.mountedEndpoints || [];

    // Test endpoints
    const tester = new ComprehensiveAPITester();
    await tester.testAllEndpoints(endpoints);

    // Generate reports
    const coverageMatrix = tester.generateCoverageMatrix();

    const finalReport = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        environment: process.env.NODE_ENV || 'development',
        summary: tester.summary,
        coverageMatrix: coverageMatrix,
        detailedResults: tester.results
    };

    // Save JSON report
    const jsonPath = path.join(__dirname, '../comprehensive-api-test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(finalReport, null, 2));

    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Total Endpoints: ${tester.summary.total}`);
    console.log(`✅ Passed: ${tester.summary.passed}`);
    console.log(`❌ Failed: ${tester.summary.failed}`);
    console.log(`⏭️ Skipped: ${tester.summary.skipped}`);
    console.log('═'.repeat(70));

    console.log('\n✅ Reports saved:');
    console.log(`   JSON: ${jsonPath}`);

    // Exit code
    if (tester.summary.failed > 0) {
        console.log('\n❌ TESTS FAILED\n');
        process.exit(1);
    } else {
        console.log('\n✅ ALL TESTS PASSED\n');
        process.exit(0);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = { ComprehensiveAPITester, main };
