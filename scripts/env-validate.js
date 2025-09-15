#!/usr/bin/env node
/**
 * Enhanced Environment Validation for EchoTune AI
 * Enforces real environment usage and validates required secrets
 * Used as pre-test guard to ensure production-ready configuration
 */

const fs = require('fs');
const path = require('path');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.requiredVars = [
      'MONGODB_URI',
      'SPOTIFY_CLIENT_ID', 
      'SPOTIFY_CLIENT_SECRET',
      'JWT_SECRET'
    ];
    this.optionalVars = [
      'OPENAI_API_KEY',
      'GEMINI_API_KEY', 
      'ANTHROPIC_API_KEY',
      'PERPLEXITY_API_KEY'
    ];
    this.placeholderPatterns = [
      /your_.*_key_here/i,
      /your_.*_id_here/i,
      /your_.*_secret_here/i,
      /placeholder.*value/i,
      /example.*\.com/i,
      /change.*in.*production/i
    ];
  }

  validateEnvironment() {
    console.log('🔍 Validating Environment Configuration...\n');

    // 1. Check if .env.example is the only env file
    this.checkEnvFileExists();
    
    // 2. Load environment variables
    this.loadEnvironment();
    
    // 3. Validate required variables
    this.validateRequiredVars();
    
    // 4. Check for placeholder values
    this.checkForPlaceholders();
    
    // 5. Validate optional AI provider keys
    this.validateOptionalVars();
    
    // 6. Generate report
    this.generateReport();
    
    // 7. Exit with appropriate code
    this.exit();
  }

  checkEnvFileExists() {
    const envPath = '.env';
    const envExamplePath = '.env.example';
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        this.errors.push('❌ CRITICAL: Only .env.example found. Copy to .env and configure values.');
      } else {
        this.errors.push('❌ CRITICAL: No .env file found. Create .env file with required configuration.');
      }
      return false;
    }
    
    const envStat = fs.statSync(envPath);
    if (envStat.size === 0) {
      this.errors.push('❌ CRITICAL: .env file is empty.');
      return false;
    }
    
    console.log('✅ .env file exists');
    return true;
  }

  loadEnvironment() {
    try {
      require('dotenv').config();
    } catch (error) {
      // Fallback - manually load .env
      try {
        const envContent = fs.readFileSync('.env', 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        });
      } catch (loadError) {
        this.errors.push(`❌ CRITICAL: Failed to load .env file: ${loadError.message}`);
      }
    }
  }

  validateRequiredVars() {
    console.log('🔑 Checking required variables...');
    
    for (const varName of this.requiredVars) {
      const value = process.env[varName];
      
      if (!value || value.trim() === '') {
        this.errors.push(`❌ MISSING: ${varName} is required but not set`);
      } else if (this.isPlaceholder(value)) {
        this.errors.push(`❌ PLACEHOLDER: ${varName} contains placeholder value: ${this.maskValue(value)}`);
      } else {
        console.log(`  ✅ ${varName}: ${this.maskValue(value)}`);
      }
    }
  }

  checkForPlaceholders() {
    console.log('\n🚫 Checking for placeholder values...');
    
    const allVars = [...this.requiredVars, ...this.optionalVars];
    let foundPlaceholders = false;
    
    for (const varName of allVars) {
      const value = process.env[varName];
      if (value && this.isPlaceholder(value)) {
        this.errors.push(`❌ PLACEHOLDER: ${varName} = ${this.maskValue(value)}`);
        foundPlaceholders = true;
      }
    }
    
    if (!foundPlaceholders) {
      console.log('  ✅ No placeholder values detected');
    }
  }

  validateOptionalVars() {
    console.log('\n🤖 Checking AI provider configuration...');
    
    let hasAnyProvider = false;
    for (const varName of this.optionalVars) {
      const value = process.env[varName];
      if (value && !this.isPlaceholder(value)) {
        console.log(`  ✅ ${varName}: ${this.maskValue(value)}`);
        hasAnyProvider = true;
      }
    }
    
    if (!hasAnyProvider) {
      this.warnings.push('⚠️  No AI provider keys configured - some features may be limited');
    }
  }

  isPlaceholder(value) {
    if (!value) return false;
    return this.placeholderPatterns.some(pattern => pattern.test(value));
  }

  maskValue(value) {
    if (!value) return '(empty)';
    if (value.length <= 8) return value;
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }

  generateReport() {
    console.log('\n📊 Validation Summary:');
    console.log('='.repeat(50));
    
    if (this.errors.length === 0) {
      console.log('✅ All environment validation checks passed!');
    } else {
      console.log(`❌ Found ${this.errors.length} critical error(s):`);
      this.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Found ${this.warnings.length} warning(s):`);
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    console.log('='.repeat(50));
  }

  exit() {
    if (this.errors.length > 0) {
      console.log('\n💥 Environment validation FAILED - cannot proceed');
      console.log('Please fix the above errors and run validation again.');
      process.exit(1);
    } else {
      console.log('\n🎉 Environment validation PASSED - ready to proceed');
      process.exit(0);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.validateEnvironment();
}

module.exports = EnvironmentValidator;