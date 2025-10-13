#!/usr/bin/env node

/**
 * API Validation Script
 * Tests API endpoints for availability and correct responses
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const endpoints = [
    { path: '/healthz', name: 'Health Check' },
    { path: '/health', name: 'Health Endpoint' },
    { path: '/health/simple', name: 'Simple Health' }
];

async function testEndpoint(path, name) {
    return new Promise((resolve) => {
        const url = `${BASE_URL}${path}`;
        
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ ${name} (${path}): ${res.statusCode}`);
                    resolve(true);
                } else {
                    console.log(`⚠️ ${name} (${path}): ${res.statusCode}`);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.log(`❌ ${name} (${path}): ${err.message}`);
            resolve(false);
        });
    });
}

async function runValidation() {
    console.log('🔍 Starting API Validation...');
    console.log(`Base URL: ${BASE_URL}\n`);
    
    const results = [];
    for (const endpoint of endpoints) {
        const passed = await testEndpoint(endpoint.path, endpoint.name);
        results.push(passed);
    }
    
    const allPassed = results.every(r => r);
    console.log(`\n${allPassed ? '✅ All endpoints validated' : '⚠️ Some endpoints failed'}`);
    
    process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
    runValidation();
}

module.exports = { runValidation };
