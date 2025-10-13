#!/usr/bin/env node

/**
 * API Endpoint Discovery Script
 * Automatically discovers and catalogs all API endpoints from route files
 * 
 * Scans:
 * - src/routes/*.js
 * - src/api/routes/*.js
 * - Extracts HTTP methods, paths, auth requirements
 */

const fs = require('fs');
const path = require('path');

const ROUTE_DIRECTORIES = [
    path.join(__dirname, '../src/routes'),
    path.join(__dirname, '../src/api/routes')
];

class EndpointDiscovery {
    constructor() {
        this.endpoints = [];
        this.routePrefixes = new Map();
    }

    /**
     * Parse a route file to extract endpoints
     */
    parseRouteFile(filePath, fileName) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const endpoints = [];

            // Common patterns for Express route definitions
            const patterns = [
                // router.get('/path', ...)
                /router\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
                // app.get('/path', ...)
                /app\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
                // express.Router().get('/path', ...)
                /\.get|post|put|patch|delete|all\s*\(\s*['"`]([^'"`]+)['"`]/g,
            ];

            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const method = match[1] ? match[1].toUpperCase() : 'GET';
                    const routePath = match[2] || match[1];
                    
                    if (routePath && !routePath.startsWith('//')) {
                        endpoints.push({
                            method,
                            path: routePath,
                            file: fileName,
                            requiresAuth: this.detectAuthRequirement(content, routePath),
                            hasValidation: content.includes('validate') || content.includes('validator'),
                            category: this.categorizeEndpoint(fileName, routePath)
                        });
                    }
                }
            }

            return endpoints;
        } catch (error) {
            console.error(`Error parsing ${filePath}:`, error.message);
            return [];
        }
    }

    /**
     * Detect if endpoint requires authentication
     */
    detectAuthRequirement(content, routePath) {
        const authPatterns = [
            'requireAuth',
            'isAuthenticated',
            'ensureAuthenticated',
            'authMiddleware',
            'protect',
            'verifyToken',
            'validateSession'
        ];

        // Check if auth middleware is used near this route
        const routeIndex = content.indexOf(routePath);
        if (routeIndex !== -1) {
            const contextWindow = content.substring(Math.max(0, routeIndex - 200), routeIndex + 200);
            return authPatterns.some(pattern => contextWindow.includes(pattern));
        }

        return false;
    }

    /**
     * Categorize endpoint based on filename and path
     */
    categorizeEndpoint(fileName, routePath) {
        const categories = {
            'auth': 'Authentication',
            'spotify': 'Spotify Integration',
            'chat': 'Chat & Messaging',
            'recommendations': 'Recommendations',
            'playlists': 'Playlists',
            'settings': 'Settings & Configuration',
            'health': 'Health & Monitoring',
            'analytics': 'Analytics',
            'admin': 'Administration',
            'system': 'System',
            'performance': 'Performance',
            'metrics': 'Metrics'
        };

        for (const [key, category] of Object.entries(categories)) {
            if (fileName.includes(key) || routePath.includes(key)) {
                return category;
            }
        }

        return 'General';
    }

    /**
     * Discover all endpoints from route directories
     */
    async discoverEndpoints() {
        console.log('🔍 Discovering API endpoints...\n');

        for (const dir of ROUTE_DIRECTORIES) {
            if (!fs.existsSync(dir)) {
                console.log(`⚠️ Directory not found: ${dir}`);
                continue;
            }

            const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
            console.log(`📁 Scanning ${dir}/ (${files.length} files)`);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const fileEndpoints = this.parseRouteFile(filePath, file);
                
                if (fileEndpoints.length > 0) {
                    console.log(`   ✓ ${file}: ${fileEndpoints.length} endpoints`);
                    this.endpoints.push(...fileEndpoints);
                }
            }
        }

        return this.endpoints;
    }

    /**
     * Generate endpoint inventory
     */
    generateInventory() {
        const inventory = {
            totalEndpoints: this.endpoints.length,
            byMethod: {},
            byCategory: {},
            authRequired: this.endpoints.filter(e => e.requiresAuth).length,
            withValidation: this.endpoints.filter(e => e.hasValidation).length,
            endpoints: this.endpoints
        };

        // Group by HTTP method
        for (const endpoint of this.endpoints) {
            inventory.byMethod[endpoint.method] = (inventory.byMethod[endpoint.method] || 0) + 1;
        }

        // Group by category
        for (const endpoint of this.endpoints) {
            inventory.byCategory[endpoint.category] = (inventory.byCategory[endpoint.category] || 0) + 1;
        }

        return inventory;
    }

    /**
     * Generate mounted endpoints with full paths
     */
    generateMountedEndpoints() {
        // Map of route files to their mount points (from server.js analysis)
        const mountPoints = {
            'auth.js': '/auth',
            'spotify-api.js': '/api/spotify',
            'chat.js': '/api/chat',
            'health.js': '/health',
            'health-consolidated.js': '', // Multiple mounts
            'settings.js': '/api/settings',
            'recommendations.js': '/api/recommendations',
            'playlists.js': '/api/playlists',
            'analytics.js': '/api/analytics',
            'admin.js': '/api/admin',
            'system.js': '/api/system',
            'performance.js': '/api/performance',
            'metrics.js': '/metrics',
            'docs.js': '/api/docs'
        };

        const mounted = [];

        for (const endpoint of this.endpoints) {
            const mountPath = mountPoints[endpoint.file] || '/api';
            const fullPath = mountPath + endpoint.path;
            
            mounted.push({
                ...endpoint,
                fullPath: fullPath.replace(/\/+/g, '/'), // Remove double slashes
                mountPoint: mountPath
            });
        }

        return mounted;
    }
}

/**
 * Main execution
 */
async function main() {
    const discovery = new EndpointDiscovery();
    const endpoints = await discovery.discoverEndpoints();
    const inventory = discovery.generateInventory();
    const mounted = discovery.generateMountedEndpoints();

    console.log('\n📊 Discovery Summary:');
    console.log(`   Total Endpoints: ${inventory.totalEndpoints}`);
    console.log(`   By Method:`, inventory.byMethod);
    console.log(`   Auth Required: ${inventory.authRequired}`);
    console.log(`   With Validation: ${inventory.withValidation}\n`);

    // Save results
    const outputPath = path.join(__dirname, '../api-endpoint-inventory.json');
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: inventory.totalEndpoints,
            byMethod: inventory.byMethod,
            byCategory: inventory.byCategory,
            authRequired: inventory.authRequired,
            withValidation: inventory.withValidation
        },
        discoveredEndpoints: endpoints,
        mountedEndpoints: mounted
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ Endpoint inventory saved to: ${outputPath}\n`);

    // Print sample endpoints
    console.log('📝 Sample Discovered Endpoints:');
    mounted.slice(0, 10).forEach(e => {
        const authBadge = e.requiresAuth ? '🔒' : '🔓';
        console.log(`   ${authBadge} ${e.method.padEnd(6)} ${e.fullPath} (${e.category})`);
    });

    if (mounted.length > 10) {
        console.log(`   ... and ${mounted.length - 10} more endpoints`);
    }

    return report;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { EndpointDiscovery, main };
