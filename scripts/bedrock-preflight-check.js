#!/usr/bin/env node

/**
 * Pre-flight Check for AWS Bedrock Validation
 * 
 * Verifies environment and configuration before running live validation.
 * Does NOT make any AWS API calls or incur charges.
 */

const fs = require('fs');
const path = require('path');

class PreflightCheck {
    constructor() {
        this.checks = [];
        this.warnings = [];
        this.errors = [];
    }

    log(message, level = 'info') {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        console.log(`${icons[level]} ${message}`);
    }

    checkEnvironmentVariables() {
        this.log('Checking AWS Environment Variables...', 'info');
        
        const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
        const optional = ['AWS_REGION'];
        
        let allPresent = true;
        
        required.forEach(envVar => {
            if (process.env[envVar]) {
                const value = process.env[envVar];
                const masked = value.length > 8 ? 
                    `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
                    '***';
                this.log(`  ${envVar}: ${masked}`, 'success');
            } else {
                this.log(`  ${envVar}: Not set`, 'error');
                this.errors.push(`Missing required environment variable: ${envVar}`);
                allPresent = false;
            }
        });
        
        optional.forEach(envVar => {
            if (process.env[envVar]) {
                this.log(`  ${envVar}: ${process.env[envVar]}`, 'success');
            } else {
                this.log(`  ${envVar}: Not set (will use default: us-east-1)`, 'warning');
                this.warnings.push(`Optional environment variable ${envVar} not set`);
            }
        });
        
        return allPresent;
    }

    checkConfiguration() {
        this.log('\nChecking Bedrock Model Configuration...', 'info');
        
        try {
            const configPath = path.join(__dirname, '..', 'config', 'aws-bedrock-models.json');
            
            if (!fs.existsSync(configPath)) {
                this.log('  Configuration file not found', 'error');
                this.errors.push('Missing config/aws-bedrock-models.json');
                return false;
            }
            
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            if (!config.modelRegistry) {
                this.log('  Missing modelRegistry in configuration', 'error');
                this.errors.push('Configuration missing modelRegistry');
                return false;
            }
            
            // Check specific models
            const requiredModels = ['claude-sonnet-4-5', 'claude-3-opus'];
            let allModelsPresent = true;
            
            requiredModels.forEach(modelKey => {
                const model = config.modelRegistry[modelKey];
                
                if (!model) {
                    this.log(`  Model ${modelKey} not found`, 'error');
                    this.errors.push(`Missing model: ${modelKey}`);
                    allModelsPresent = false;
                    return;
                }
                
                this.log(`  ✓ ${model.displayName}`, 'success');
                this.log(`    Model ID: ${model.modelId}`, 'info');
                this.log(`    Requires Inference Profile: ${model.requiresInferenceProfile}`, 'info');
                
                if (model.requiresInferenceProfile) {
                    if (model.inferenceProfileArn) {
                        this.log(`    Inference Profile ARN: ${model.inferenceProfileArn.substring(0, 60)}...`, 'success');
                    } else {
                        this.log(`    Inference Profile ARN: Missing!`, 'error');
                        this.errors.push(`${modelKey} requires inference profile but ARN is missing`);
                        allModelsPresent = false;
                    }
                }
            });
            
            return allModelsPresent;
            
        } catch (error) {
            this.log(`  Failed to load configuration: ${error.message}`, 'error');
            this.errors.push(`Configuration error: ${error.message}`);
            return false;
        }
    }

    checkScripts() {
        this.log('\nChecking Validation Scripts...', 'info');
        
        const scripts = [
            'scripts/validate-bedrock-live.js',
            'scripts/generate-bedrock-evidence.js',
            'scripts/test-claude-opus-4.1-bedrock.js',
            'src/infra/BedrockInferenceProvider.js'
        ];
        
        let allPresent = true;
        
        scripts.forEach(scriptPath => {
            const fullPath = path.join(__dirname, '..', scriptPath);
            if (fs.existsSync(fullPath)) {
                this.log(`  ✓ ${scriptPath}`, 'success');
            } else {
                this.log(`  ✗ ${scriptPath} not found`, 'error');
                this.errors.push(`Missing script: ${scriptPath}`);
                allPresent = false;
            }
        });
        
        return allPresent;
    }

    checkDependencies() {
        this.log('\nChecking Dependencies...', 'info');
        
        try {
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            const requiredDeps = ['@aws-sdk/client-bedrock-runtime'];
            let allPresent = true;
            
            requiredDeps.forEach(dep => {
                const inDeps = packageJson.dependencies?.[dep];
                const inDevDeps = packageJson.devDependencies?.[dep];
                
                if (inDeps || inDevDeps) {
                    this.log(`  ✓ ${dep}`, 'success');
                } else {
                    this.log(`  ✗ ${dep} not installed`, 'error');
                    this.errors.push(`Missing dependency: ${dep}`);
                    allPresent = false;
                }
            });
            
            // Check if node_modules exists
            const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                this.log('  ✓ node_modules present', 'success');
            } else {
                this.log('  ✗ node_modules not found (run npm install)', 'warning');
                this.warnings.push('Dependencies not installed, run: npm install');
            }
            
            return allPresent;
            
        } catch (error) {
            this.log(`  Failed to check dependencies: ${error.message}`, 'error');
            this.errors.push(`Dependency check error: ${error.message}`);
            return false;
        }
    }

    checkDirectories() {
        this.log('\nChecking Output Directories...', 'info');
        
        const dirs = ['reports', 'test-results'];
        
        dirs.forEach(dir => {
            const dirPath = path.join(__dirname, '..', dir);
            if (fs.existsSync(dirPath)) {
                this.log(`  ✓ ${dir}/ exists`, 'success');
            } else {
                this.log(`  ✗ ${dir}/ does not exist (will be created)`, 'warning');
                this.warnings.push(`Directory ${dir}/ will be created automatically`);
            }
        });
        
        return true;
    }

    checkProviderType() {
        this.log('\nVerifying Provider Configuration...', 'info');
        
        try {
            // Check that we're using Bedrock, not Vertex
            const providerPath = path.join(__dirname, '..', 'src', 'infra', 'BedrockInferenceProvider.js');
            
            if (!fs.existsSync(providerPath)) {
                this.log('  BedrockInferenceProvider not found', 'error');
                return false;
            }
            
            const providerContent = fs.readFileSync(providerPath, 'utf8');
            
            // Check for Bedrock-specific code
            if (providerContent.includes('@aws-sdk/client-bedrock-runtime')) {
                this.log('  ✓ Using AWS Bedrock SDK', 'success');
            } else {
                this.log('  ✗ AWS Bedrock SDK reference not found', 'warning');
                this.warnings.push('Provider may not be configured for Bedrock');
            }
            
            // Check that it's not using Vertex
            if (providerContent.includes('vertex') || providerContent.includes('GCP_PROJECT_ID')) {
                this.log('  ✗ Found Vertex AI references (should use Bedrock only)', 'warning');
                this.warnings.push('Provider contains Vertex AI references');
            } else {
                this.log('  ✓ No Vertex AI references found', 'success');
            }
            
            return true;
            
        } catch (error) {
            this.log(`  Failed to check provider: ${error.message}`, 'error');
            return false;
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 PRE-FLIGHT CHECK SUMMARY');
        console.log('='.repeat(80));
        
        const totalChecks = 6;
        const totalIssues = this.errors.length + this.warnings.length;
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            this.log('\n🎉 All checks passed! Ready to run validation.', 'success');
            console.log('\nNext steps:');
            console.log('1. Run live validation:');
            console.log('   npm run bedrock:validate:live');
            console.log('');
            console.log('2. Generate evidence:');
            console.log('   npm run bedrock:evidence');
            console.log('');
            console.log('3. Run Bedrock tests:');
            console.log('   node scripts/test-claude-opus-4.1-bedrock.js');
            return true;
        }
        
        if (this.errors.length > 0) {
            this.log(`\n❌ ${this.errors.length} error(s) found:`, 'error');
            this.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        }
        
        if (this.warnings.length > 0) {
            this.log(`\n⚠️  ${this.warnings.length} warning(s):`, 'warning');
            this.warnings.forEach((warning, i) => {
                console.log(`   ${i + 1}. ${warning}`);
            });
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ Please fix errors before running validation.');
            return false;
        } else {
            console.log('\n⚠️  You can proceed with validation, but warnings should be reviewed.');
            console.log('\nTo run validation:');
            console.log('   npm run bedrock:validate:live');
            return true;
        }
    }

    run() {
        console.log('🔍 AWS Bedrock Validation Pre-flight Check');
        console.log('='.repeat(80));
        console.log('This check verifies your environment is ready for Bedrock validation.');
        console.log('No AWS API calls will be made.\n');
        
        this.checkEnvironmentVariables();
        this.checkConfiguration();
        this.checkScripts();
        this.checkDependencies();
        this.checkDirectories();
        this.checkProviderType();
        
        const success = this.printSummary();
        
        process.exit(success ? 0 : 1);
    }
}

// Run if called directly
if (require.main === module) {
    const check = new PreflightCheck();
    check.run();
}

module.exports = PreflightCheck;
