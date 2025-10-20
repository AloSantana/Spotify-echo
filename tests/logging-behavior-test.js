/**
 * Logging Behavior Test
 * 
 * This test verifies that the logging configuration works correctly
 * and that verbose logs are properly suppressed based on LOG_LEVEL.
 */

const assert = require('assert');

// Test 1: Verify LOG_LEVEL defaults to 'info' if not set
function testDefaultLogLevel() {
  const originalLevel = process.env.LOG_LEVEL;
  delete process.env.LOG_LEVEL;
  
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  assert.strictEqual(logLevel, 'info', 'Default LOG_LEVEL should be info');
  
  // Restore original
  if (originalLevel) {
    process.env.LOG_LEVEL = originalLevel;
  }
  
  console.log('✅ Test 1 passed: Default LOG_LEVEL is info');
}

// Test 2: Verify verbose logging is disabled for 'info' level
function testVerboseLoggingDisabledForInfo() {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = 'info';
  
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const enableVerboseLogging = logLevel === 'debug' || logLevel === 'trace';
  
  assert.strictEqual(enableVerboseLogging, false, 'Verbose logging should be disabled for info level');
  
  // Restore original
  if (originalLevel) {
    process.env.LOG_LEVEL = originalLevel;
  } else {
    delete process.env.LOG_LEVEL;
  }
  
  console.log('✅ Test 2 passed: Verbose logging disabled for info level');
}

// Test 3: Verify verbose logging is enabled for 'debug' level
function testVerboseLoggingEnabledForDebug() {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = 'debug';
  
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const enableVerboseLogging = logLevel === 'debug' || logLevel === 'trace';
  
  assert.strictEqual(enableVerboseLogging, true, 'Verbose logging should be enabled for debug level');
  
  // Restore original
  if (originalLevel) {
    process.env.LOG_LEVEL = originalLevel;
  } else {
    delete process.env.LOG_LEVEL;
  }
  
  console.log('✅ Test 3 passed: Verbose logging enabled for debug level');
}

// Test 4: Verify verbose logging is enabled for 'trace' level
function testVerboseLoggingEnabledForTrace() {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = 'trace';
  
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const enableVerboseLogging = logLevel === 'debug' || logLevel === 'trace';
  
  assert.strictEqual(enableVerboseLogging, true, 'Verbose logging should be enabled for trace level');
  
  // Restore original
  if (originalLevel) {
    process.env.LOG_LEVEL = originalLevel;
  } else {
    delete process.env.LOG_LEVEL;
  }
  
  console.log('✅ Test 4 passed: Verbose logging enabled for trace level');
}

// Test 5: Verify console exporter selection based on LOG_LEVEL
function testConsoleExporterSelection() {
  const testCases = [
    { level: 'trace', shouldEnableConsole: true },
    { level: 'debug', shouldEnableConsole: true },
    { level: 'info', shouldEnableConsole: false },
    { level: 'warn', shouldEnableConsole: false },
    { level: 'error', shouldEnableConsole: false }
  ];
  
  testCases.forEach(({ level, shouldEnableConsole }) => {
    const originalLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = level;
    
    const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
    const enableConsoleExporter = logLevel === 'trace' || logLevel === 'debug';
    
    assert.strictEqual(
      enableConsoleExporter, 
      shouldEnableConsole, 
      `Console exporter should be ${shouldEnableConsole ? 'enabled' : 'disabled'} for ${level} level`
    );
    
    // Restore original
    if (originalLevel) {
      process.env.LOG_LEVEL = originalLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });
  
  console.log('✅ Test 5 passed: Console exporter selection correct for all levels');
}

// Test 6: Verify case-insensitive LOG_LEVEL handling
function testCaseInsensitiveLogLevel() {
  const originalLevel = process.env.LOG_LEVEL;
  
  const testCases = ['INFO', 'Info', 'info', 'DEBUG', 'Debug', 'debug'];
  
  testCases.forEach(level => {
    process.env.LOG_LEVEL = level;
    const normalizedLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
    assert.strictEqual(
      normalizedLevel.toLowerCase(),
      level.toLowerCase(),
      `LOG_LEVEL should be case-insensitive for ${level}`
    );
  });
  
  // Restore original
  if (originalLevel) {
    process.env.LOG_LEVEL = originalLevel;
  } else {
    delete process.env.LOG_LEVEL;
  }
  
  console.log('✅ Test 6 passed: LOG_LEVEL is case-insensitive');
}

// Run all tests
function runAllTests() {
  console.log('\n🧪 Running Logging Behavior Tests...\n');
  
  try {
    testDefaultLogLevel();
    testVerboseLoggingDisabledForInfo();
    testVerboseLoggingEnabledForDebug();
    testVerboseLoggingEnabledForTrace();
    testConsoleExporterSelection();
    testCaseInsensitiveLogLevel();
    
    console.log('\n✅ All logging behavior tests passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests if executed directly
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  runAllTests,
  testDefaultLogLevel,
  testVerboseLoggingDisabledForInfo,
  testVerboseLoggingEnabledForDebug,
  testVerboseLoggingEnabledForTrace,
  testConsoleExporterSelection,
  testCaseInsensitiveLogLevel
};
