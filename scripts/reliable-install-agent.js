#!/usr/bin/env node

/**
 * Reliable Install Agent for Spotify-Echo
 * 
 * This agent implements a systematic approach to installing dependencies
 * and starting the application, with retry logic and error pattern analysis.
 * 
 * Based on GitHub Coding Agent specifications for reliable npm install and start.
 * 
 * Usage:
 *   node scripts/reliable-install-agent.js [options]
 * 
 * Options:
 *   --skip-install    Skip npm install step
 *   --skip-db         Skip database initialization
 *   --skip-start      Skip npm start
 *   --max-retries N   Maximum number of retries per step (default: 3)
 *   --verbose         Enable verbose logging
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import helper modules
const { analyzeError, formatAnalysis } = require('./agent-helpers/error-analyzer');
const { executeApplicableStrategies, getApplicableStrategies } = require('./agent-helpers/fix-strategies');
const MemoryStore = require('./agent-helpers/memory-store');

// Configuration
const DEFAULT_MAX_RETRIES = 3;
const PROJECT_ROOT = path.join(__dirname, '..');

class ReliableInstallAgent {
  constructor(options = {}) {
    this.options = {
      skipInstall: options.skipInstall || false,
      skipDb: options.skipDb || false,
      skipStart: options.skipStart || false,
      maxRetries: options.maxRetries || DEFAULT_MAX_RETRIES,
      verbose: options.verbose || false,
      projectRoot: options.projectRoot || PROJECT_ROOT
    };

    this.memory = new MemoryStore();
    this.startTime = Date.now();
    this.results = {
      install: null,
      database: null,
      start: null
    };
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📝',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[level] || '📝';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Execute a shell command with error capture
   */
  executeCommand(command, options = {}) {
    this.log(`Executing: ${command}`, 'debug');
    
    try {
      // Always capture output for error analysis, but also show to user if not silent
      const output = execSync(command, {
        cwd: this.options.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe', // Always pipe to capture
        ...options
      });
      
      // Show output if not silent
      if (!options.silent) {
        console.log(output);
      }
      
      return { success: true, output };
    } catch (error) {
      // Show error output if not silent
      if (!options.silent) {
        if (error.stdout) console.log(error.stdout.toString());
        if (error.stderr) console.error(error.stderr.toString());
      }
      
      return {
        success: false,
        error: error.message,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || '',
        exitCode: error.status
      };
    }
  }

  /**
   * Check if Node.js version is compatible
   */
  checkNodeVersion() {
    this.log('Checking Node.js version...', 'info');
    
    const nodeVersion = process.version.substring(1); // Remove 'v'
    const [major] = nodeVersion.split('.').map(Number);
    
    if (major < 18) {
      this.log(`Node.js version ${nodeVersion} is too old. Requires >= 18.0.0`, 'error');
      return false;
    }
    
    this.log(`Node.js version ${nodeVersion} is compatible`, 'success');
    return true;
  }

  /**
   * Check if package-lock.json exists
   */
  hasPackageLock() {
    return fs.existsSync(path.join(this.options.projectRoot, 'package-lock.json'));
  }

  /**
   * Step 1: Install dependencies
   */
  async installDependencies() {
    if (this.options.skipInstall) {
      this.log('Skipping dependency installation (--skip-install)', 'info');
      this.results.install = { skipped: true };
      return true;
    }

    this.log('━'.repeat(80), 'info');
    this.log('STEP 1: Installing Dependencies', 'info');
    this.log('━'.repeat(80), 'info');

    const useCI = this.hasPackageLock();
    const command = useCI ? 'npm ci' : 'npm install';
    
    this.log(`Using command: ${command}`, 'info');

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      this.log(`Attempt ${attempt}/${this.options.maxRetries}`, 'info');

      const result = this.executeCommand(command, { stdio: 'inherit' });

      if (result.success) {
        this.log('Dependencies installed successfully', 'success');
        this.results.install = { success: true, attempts: attempt };
        return true;
      }

      // Analyze the error
      const errorOutput = result.stderr + result.stdout + result.error;
      const analysis = analyzeError(errorOutput);
      
      this.log('Installation failed, analyzing error...', 'error');
      console.log(formatAnalysis(analysis));

      // Store error pattern in memory
      const errorId = this.memory.storeErrorPattern({
        category: analysis.category,
        severity: analysis.severity,
        errorSnippet: analysis.errorSnippet,
        command,
        context: { attempt, maxRetries: this.options.maxRetries }
      });

      // Check if fixable
      if (!analysis.fixable) {
        this.log('Error is not automatically fixable', 'error');
        this.results.install = { success: false, error: analysis, attempts: attempt };
        return false;
      }

      // Try to apply fixes
      this.log('Attempting to apply fixes...', 'info');
      const fixResults = await executeApplicableStrategies(analysis.category, {
        projectRoot: this.options.projectRoot,
        logger: this
      });

      // Store fix attempts
      fixResults.forEach(fixResult => {
        this.memory.storeFix({
          errorId,
          errorCategory: analysis.category,
          strategy: fixResult.strategy,
          success: fixResult.success,
          message: fixResult.message
        });
      });

      // Check if any fixes succeeded
      const anySucceeded = fixResults.some(f => f.success);
      if (!anySucceeded && attempt < this.options.maxRetries) {
        this.log('No fixes succeeded, will retry...', 'warning');
      }
    }

    this.log('Failed to install dependencies after all retries', 'error');
    this.results.install = { success: false, attempts: this.options.maxRetries };
    return false;
  }

  /**
   * Step 2: Initialize database
   */
  async initializeDatabase() {
    if (this.options.skipDb) {
      this.log('Skipping database initialization (--skip-db)', 'info');
      this.results.database = { skipped: true };
      return true;
    }

    this.log('━'.repeat(80), 'info');
    this.log('STEP 2: Initializing Database', 'info');
    this.log('━'.repeat(80), 'info');

    // Check if POSTGRES_URL is set
    require('dotenv').config({ path: path.join(this.options.projectRoot, '.env') });
    
    if (!process.env.POSTGRES_URL) {
      this.log('POSTGRES_URL not set, attempting to create .env file...', 'warning');
      
      // Try to create .env file
      const fixResult = await executeApplicableStrategies('env_missing', {
        projectRoot: this.options.projectRoot,
        logger: this
      });

      // Reload .env
      require('dotenv').config({ path: path.join(this.options.projectRoot, '.env') });
    }

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      this.log(`Attempt ${attempt}/${this.options.maxRetries}`, 'info');

      // Try db:init (combined generate + push)
      const result = this.executeCommand('npm run db:init', { stdio: 'inherit' });

      if (result.success) {
        this.log('Database initialized successfully', 'success');
        this.results.database = { success: true, attempts: attempt };
        return true;
      }

      // Analyze the error
      const errorOutput = result.stderr + result.stdout + result.error;
      const analysis = analyzeError(errorOutput);
      
      this.log('Database initialization failed, analyzing error...', 'error');
      console.log(formatAnalysis(analysis));

      // Store error
      const errorId = this.memory.storeErrorPattern({
        category: analysis.category,
        severity: analysis.severity,
        errorSnippet: analysis.errorSnippet,
        command: 'npm run db:init',
        context: { attempt }
      });

      // If database connection error, can't fix automatically
      if (analysis.category === 'database_connection') {
        this.log('Database connection error - requires manual intervention', 'error');
        this.log('Please ensure PostgreSQL is running and POSTGRES_URL is correct', 'error');
        this.results.database = { success: false, error: analysis, attempts: attempt };
        return false;
      }

      // Try to apply fixes
      if (analysis.fixable) {
        this.log('Attempting to apply fixes...', 'info');
        const fixResults = await executeApplicableStrategies(analysis.category, {
          projectRoot: this.options.projectRoot,
          logger: this
        });

        fixResults.forEach(fixResult => {
          this.memory.storeFix({
            errorId,
            errorCategory: analysis.category,
            strategy: fixResult.strategy,
            success: fixResult.success,
            message: fixResult.message
          });
        });
      }
    }

    this.log('Failed to initialize database after all retries', 'error');
    this.log('You may need to manually run: npm run db:generate && npm run db:push', 'warning');
    this.results.database = { success: false, attempts: this.options.maxRetries };
    return false;
  }

  /**
   * Step 3: Start the application
   */
  async startApplication() {
    if (this.options.skipStart) {
      this.log('Skipping application start (--skip-start)', 'info');
      this.results.start = { skipped: true };
      return true;
    }

    this.log('━'.repeat(80), 'info');
    this.log('STEP 3: Starting Application', 'info');
    this.log('━'.repeat(80), 'info');

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      this.log(`Attempt ${attempt}/${this.options.maxRetries}`, 'info');

      // Start the server with a timeout to check if it crashes immediately
      this.log('Starting server (will check for 10 seconds)...', 'info');
      
      const serverProcess = spawn('npm', ['start'], {
        cwd: this.options.projectRoot,
        stdio: 'pipe',
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';
      let crashed = false;
      let crashError = null;

      serverProcess.stdout.on('data', data => {
        output += data.toString();
        if (this.options.verbose) {
          process.stdout.write(data);
        }
      });

      serverProcess.stderr.on('data', data => {
        errorOutput += data.toString();
        if (this.options.verbose) {
          process.stderr.write(data);
        }
      });

      serverProcess.on('error', err => {
        crashed = true;
        crashError = err;
      });

      serverProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          crashed = true;
          crashError = new Error(`Server exited with code ${code}`);
        }
      });

      // Wait 10 seconds to see if it starts successfully
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Kill the server
      try {
        serverProcess.kill('SIGTERM');
        // Give it a moment to shut down gracefully
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      } catch (killError) {
        // Process might already be dead
      }

      if (crashed) {
        this.log('Server crashed during startup', 'error');
        
        const fullError = errorOutput + output + (crashError?.message || '');
        const analysis = analyzeError(fullError);
        
        console.log(formatAnalysis(analysis));

        // Store error
        const errorId = this.memory.storeErrorPattern({
          category: analysis.category,
          severity: analysis.severity,
          errorSnippet: analysis.errorSnippet,
          command: 'npm start',
          context: { attempt }
        });

        // Try to apply fixes
        if (analysis.fixable) {
          this.log('Attempting to apply fixes...', 'info');
          const fixResults = await executeApplicableStrategies(analysis.category, {
            projectRoot: this.options.projectRoot,
            logger: this,
            port: 3000
          });

          fixResults.forEach(fixResult => {
            this.memory.storeFix({
              errorId,
              errorCategory: analysis.category,
              strategy: fixResult.strategy,
              success: fixResult.success,
              message: fixResult.message
            });
          });
        } else {
          this.log('Error is not automatically fixable', 'error');
          this.results.start = { success: false, error: analysis, attempts: attempt };
          return false;
        }
      } else {
        this.log('Server started successfully and ran without crashing', 'success');
        this.log('(Server was stopped after 10 second validation)', 'info');
        this.results.start = { success: true, attempts: attempt };
        return true;
      }
    }

    this.log('Failed to start application after all retries', 'error');
    this.results.start = { success: false, attempts: this.options.maxRetries };
    return false;
  }

  /**
   * Generate final report
   */
  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    const lines = [];
    lines.push('');
    lines.push('═'.repeat(80));
    lines.push('📊 RELIABLE INSTALL AGENT - FINAL REPORT');
    lines.push('═'.repeat(80));
    lines.push('');
    lines.push(`Duration: ${duration}s`);
    lines.push('');
    
    // Step results
    lines.push('Step Results:');
    lines.push(`  1. Install Dependencies: ${this.formatResult(this.results.install)}`);
    lines.push(`  2. Initialize Database:  ${this.formatResult(this.results.database)}`);
    lines.push(`  3. Start Application:    ${this.formatResult(this.results.start)}`);
    lines.push('');

    // Overall status
    const allSuccessful = 
      (this.results.install?.success || this.results.install?.skipped) &&
      (this.results.database?.success || this.results.database?.skipped) &&
      (this.results.start?.success || this.results.start?.skipped);

    if (allSuccessful) {
      lines.push('✅ Overall Status: SUCCESS');
      lines.push('');
      lines.push('The application is ready to run!');
      lines.push('To start the server: npm start');
    } else {
      lines.push('❌ Overall Status: FAILED');
      lines.push('');
      lines.push('Some steps failed. Review the errors above and:');
      lines.push('  1. Check the error analysis and suggested fixes');
      lines.push('  2. Apply manual fixes if needed');
      lines.push('  3. Run this agent again');
    }

    lines.push('');
    lines.push('Memory Statistics:');
    const stats = this.memory.getStatistics();
    lines.push(`  - Total errors recorded: ${stats.totalErrors}`);
    lines.push(`  - Total fix attempts: ${stats.totalFixes}`);
    if (stats.mostSuccessfulStrategy !== 'none') {
      lines.push(`  - Most successful strategy: ${stats.mostSuccessfulStrategy}`);
    }
    
    lines.push('');
    lines.push('═'.repeat(80));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format step result for display
   */
  formatResult(result) {
    if (!result) return '⏭️  Not executed';
    if (result.skipped) return '⏭️  Skipped';
    if (result.success) return `✅ Success (${result.attempts} ${result.attempts === 1 ? 'attempt' : 'attempts'})`;
    return `❌ Failed (${result.attempts} ${result.attempts === 1 ? 'attempt' : 'attempts'})`;
  }

  /**
   * Main execution flow
   */
  async run() {
    this.log('═'.repeat(80), 'info');
    this.log('🤖 Reliable Install Agent Starting', 'info');
    this.log('═'.repeat(80), 'info');
    this.log('', 'info');

    // Check Node version first
    if (!this.checkNodeVersion()) {
      this.log('Node.js version check failed', 'error');
      return false;
    }

    // Step 1: Install dependencies
    const installSuccess = await this.installDependencies();
    if (!installSuccess && !this.options.skipInstall) {
      this.log('Cannot proceed without dependencies', 'error');
      console.log(this.generateReport());
      return false;
    }

    // Step 2: Initialize database
    const dbSuccess = await this.initializeDatabase();
    // Note: DB initialization can fail but we might still be able to start
    // (e.g., if DB is optional or using fallback)

    // Step 3: Start application
    const startSuccess = await this.startApplication();

    // Generate and display report
    console.log(this.generateReport());

    // Update metadata
    this.memory.updateMetadata({
      lastRun: new Date().toISOString(),
      lastResult: startSuccess ? 'success' : 'failure',
      totalRuns: (this.memory.getMetadata().totalRuns || 0) + 1
    });

    return startSuccess;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipInstall: args.includes('--skip-install'),
    skipDb: args.includes('--skip-db'),
    skipStart: args.includes('--skip-start'),
    verbose: args.includes('--verbose'),
    maxRetries: DEFAULT_MAX_RETRIES
  };

  // Parse max-retries
  const maxRetriesIndex = args.indexOf('--max-retries');
  if (maxRetriesIndex !== -1 && args[maxRetriesIndex + 1]) {
    options.maxRetries = parseInt(args[maxRetriesIndex + 1], 10) || DEFAULT_MAX_RETRIES;
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Reliable Install Agent for Spotify-Echo

Usage: node scripts/reliable-install-agent.js [options]

Options:
  --skip-install    Skip npm install step
  --skip-db         Skip database initialization
  --skip-start      Skip npm start
  --max-retries N   Maximum number of retries per step (default: 3)
  --verbose         Enable verbose logging
  --help, -h        Show this help message

Examples:
  node scripts/reliable-install-agent.js
  node scripts/reliable-install-agent.js --skip-db
  node scripts/reliable-install-agent.js --max-retries 5 --verbose
`);
    process.exit(0);
  }

  // Run the agent
  const agent = new ReliableInstallAgent(options);
  agent.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = ReliableInstallAgent;
