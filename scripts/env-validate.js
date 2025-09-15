#!/usr/bin/env node
/**
 * Comprehensive Environment Validation Script
 * Validates required environment variables and fails on placeholder values
 * Outputs: env-validation.json with schema v2 compliance
 */

const fs = require('fs');
const path = require('path');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    // Required environment variables (fail if missing/placeholder)
    this.requiredVars = [
      'MONGODB_URI',
      'SPOTIFY_CLIENT_ID', 
      'SPOTIFY_CLIENT_SECRET',
      'JWT_SECRET'
    ];
    // Optional provider variables (skip tests if absent)
    this.optionalProviderVars = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GEMINI_API_KEY',
      'GROQ_API_KEY',
      'GCP_PROJECT_ID',
      'PERPLEXITY_API_KEY',
      'XAI_API_KEY'
    ];
    // Test bypass variables (auth shortcuts)
    this.testBypassVars = [
      'SPOTIFY_TEST_ACCESS_TOKEN',
      'SPOTIFY_TEST_REFRESH_TOKEN',
      'SPOTIFY_TEST_USER_ID'
    ];
    // Placeholder patterns
    this.placeholderPatterns = [
      /^your_/i,
      /^changeme/i,
      /^replace_me/i,
      /^xxx+$/i,
      /^placeholder/i,
      /^test[_-]?value/i,
      /^sample[_-]?/i,
      /your_.*_key_here/i,
      /your_.*_id_here/i,
      /your_.*_secret_here/i,
      /placeholder.*value/i,
      /example.*\.com/i,
      /change.*in.*production/i
    ];
  }

  validateEnvironment() {
    console.log('🔍 Comprehensive Environment Validation Starting...\n');

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

    // 6. Check test bypass variables
    this.validateTestBypassVars();
    
    // 7. Generate comprehensive report
    const report = this.generateReport();
    
    // 8. Write JSON report
    this.writeJsonReport(report);
    
    // 9. Exit with appropriate code
    this.exit(report);
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
    
    const allVars = [...this.requiredVars, ...this.optionalProviderVars];
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
    for (const varName of this.optionalProviderVars) {
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

  validateTestBypassVars() {
    console.log('\n🚀 Checking test bypass tokens...');
    
    let bypassTokensAvailable = 0;
    for (const varName of this.testBypassVars) {
      const value = process.env[varName];
      if (value && !this.isPlaceholder(value)) {
        console.log(`  ✅ ${varName}: Available for test bypass`);
        bypassTokensAvailable++;
      }
    }

    if (bypassTokensAvailable > 0) {
      console.log(`  📝 ${bypassTokensAvailable} test bypass tokens available`);
    } else {
      console.log('  ℹ️  No test bypass tokens configured');
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
    
    // Create comprehensive report structure (schema v2)
    const report = {
      timestamp: new Date().toISOString(),
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      required: {},
      optional: {},
      testBypass: {},
      summary: {
        totalRequired: this.requiredVars.length,
        requiredValid: 0,
        optionalProviders: this.optionalProviderVars.length,
        optionalValid: 0,
        testBypassAvailable: 0,
        hasPlaceholders: false
      }
    };

    // Analyze required variables
    for (const varName of this.requiredVars) {
      const value = process.env[varName];
      const isValid = !!(value && !this.isPlaceholder(value));
      
      report.required[varName] = {
        present: !!value,
        valid: isValid,
        isPlaceholder: value ? this.isPlaceholder(value) : false,
        length: value ? value.length : 0
      };

      if (isValid) {
        report.summary.requiredValid++;
      }
      if (value && this.isPlaceholder(value)) {
        report.summary.hasPlaceholders = true;
      }
    }

    // Analyze optional provider variables
    for (const varName of this.optionalProviderVars) {
      const value = process.env[varName];
      const isValid = !!(value && !this.isPlaceholder(value));
      
      report.optional[varName] = {
        present: !!value,
        valid: isValid,
        isPlaceholder: value ? this.isPlaceholder(value) : false,
        length: value ? value.length : 0
      };

      if (isValid) {
        report.summary.optionalValid++;
      }
      if (value && this.isPlaceholder(value)) {
        report.summary.hasPlaceholders = true;
      }
    }

    // Analyze test bypass variables
    for (const varName of this.testBypassVars) {
      const value = process.env[varName];
      const isValid = !!(value && !this.isPlaceholder(value));
      
      report.testBypass[varName] = {
        present: !!value,
        valid: isValid,
        isPlaceholder: value ? this.isPlaceholder(value) : false,
        length: value ? value.length : 0
      };

      if (isValid) {
        report.summary.testBypassAvailable++;
      }
    }

    // Additional validations
    if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost') && process.env.NODE_ENV === 'production') {
      this.warnings.push('Using localhost MongoDB URI in production environment');
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.warnings.push('JWT_SECRET is less than 32 characters (security concern)');
    }

    // Console output
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

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Required variables valid: ${report.summary.requiredValid}/${report.summary.totalRequired}`);
    console.log(`  🔌 Optional providers available: ${report.summary.optionalValid}/${report.summary.optionalProviders}`);
    console.log(`  🚀 Test bypass tokens: ${report.summary.testBypassAvailable}/${this.testBypassVars.length}`);
    
    console.log('='.repeat(50));

    return report;
  }

  writeJsonReport(report) {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Write comprehensive JSON report
      const reportPath = path.join(reportsDir, 'env-validation.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Comprehensive report written to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to write JSON report:', error.message);
      this.errors.push(`Failed to write validation report: ${error.message}`);
    }
  }

  exit(report) {
    if (report.success) {
      console.log('\n🎉 Environment validation PASSED - ready to proceed');
      process.exit(0);
    } else {
      console.log('\n💥 Environment validation FAILED - cannot proceed');
      console.log('Please fix the above errors and run validation again.');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.validateEnvironment();
}

module.exports = EnvironmentValidator;