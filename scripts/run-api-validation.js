#!/usr/bin/env node

/**
 * API Validation Script
 * Tests API endpoints for availability and correct responses
 * Uses real environment variables for comprehensive validation
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const endpoints = [
    { path: '/healthz', name: 'Healthz Endpoint', critical: true },
    { path: '/health', name: 'Health Endpoint', critical: true },
    { path: '/health/simple', name: 'Simple Health', critical: false },
    { path: '/api-docs', name: 'API Docs', critical: false }
];

async function testEndpoint(path, name, critical = true) {
    return new Promise((resolve) => {
        const url = `${BASE_URL}${path}`;
        
        const startTime = Date.now();
        http.get(url, (res) => {
            const responseTime = Date.now() - startTime;
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ ${name} (${path}): ${res.statusCode} - ${responseTime}ms`);
                    resolve({ passed: true, status: res.statusCode, responseTime, critical });
                } else {
                    console.log(`⚠️ ${name} (${path}): ${res.statusCode} - ${responseTime}ms`);
                    resolve({ passed: false, status: res.statusCode, responseTime, critical });
                }
            });
        }).on('error', (err) => {
            console.log(`❌ ${name} (${path}): ${err.message}`);
            resolve({ passed: false, error: err.message, critical });
        });
    });
}

async function runValidation() {
    console.log('🔍 Starting Comprehensive API Validation...');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CI: ${process.env.CI || 'false'}\n`);
    
    // Check environment secrets (masked)
    if (process.env.SPOTIFY_CLIENT_ID) {
        console.log(`🔐 Spotify Client ID: ${process.env.SPOTIFY_CLIENT_ID.substring(0, 8)}...`);
    } else {
        console.log('⚠️ Spotify Client ID: NOT SET');
    }
    
    if (process.env.SPOTIFY_CLIENT_SECRET) {
        console.log(`🔐 Spotify Client Secret: ${process.env.SPOTIFY_CLIENT_SECRET.substring(0, 4)}****`);
    } else {
        console.log('⚠️ Spotify Client Secret: NOT SET');
    }
    console.log('');
    
    const results = [];
    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint.path, endpoint.name, endpoint.critical);
        results.push(result);
    }
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const criticalFailures = results.filter(r => !r.passed && r.critical).length;
    
    console.log(`\n📊 API Validation Results:`);
    console.log(`   ✅ Passed: ${passed}/${results.length}`);
    console.log(`   ❌ Failed: ${failed}/${results.length}`);
    console.log(`   🔴 Critical Failures: ${criticalFailures}`);
    
    // Write results to file
    const fs = require('fs');
    const resultsPath = 'api-validation-results.json';
    const summaryData = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        environment: process.env.NODE_ENV || 'development',
        ci: process.env.CI || 'false',
        hasSpotifyCredentials: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
        results: results,
        summary: {
            total: results.length,
            passed,
            failed,
            criticalFailures
        }
    };
    
    try {
        fs.writeFileSync(resultsPath, JSON.stringify(summaryData, null, 2));
        console.log(`\n📄 Results saved to ${resultsPath}`);
    } catch (error) {
        console.log(`\n⚠️ Could not save results: ${error.message}`);
    }
    
    if (criticalFailures > 0) {
        console.log('\n❌ CRITICAL FAILURES DETECTED - NOT READY FOR PRODUCTION');
        process.exit(1);
    } else if (failed > 0) {
        console.log('\n⚠️ Some non-critical endpoints failed');
        process.exit(0); // Don't fail on non-critical endpoints
    } else {
        console.log('\n✅ All API endpoints validated successfully');
        process.exit(0);
    }
}

if (require.main === module) {
    runValidation();
}

module.exports = { runValidation };
