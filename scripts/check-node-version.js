#!/usr/bin/env node
/**
 * Pre-install Node.js version check
 * Ensures users are running a compatible Node.js version before installing dependencies
 */

const requiredVersion = '18.0.0';
const currentVersion = process.version.substring(1); // Remove 'v' prefix

function parseVersion(version) {
  return version.split('.').map(Number);
}

function compareVersions(current, required) {
  const [currentMajor, currentMinor, currentPatch] = parseVersion(current);
  const [requiredMajor, requiredMinor, requiredPatch] = parseVersion(required);

  if (currentMajor > requiredMajor) return 1;
  if (currentMajor < requiredMajor) return -1;
  if (currentMinor > requiredMinor) return 1;
  if (currentMinor < requiredMinor) return -1;
  if (currentPatch > requiredPatch) return 1;
  if (currentPatch < requiredPatch) return -1;
  return 0;
}

const comparison = compareVersions(currentVersion, requiredVersion);

if (comparison < 0) {
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('  ❌ Node.js Version Error');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('');
  console.error(`  Current version:  Node.js ${currentVersion}`);
  console.error(`  Required version: Node.js ${requiredVersion} or higher`);
  console.error('');
  console.error('  This project uses modern JavaScript features that require');
  console.error('  Node.js 18 or higher. Please upgrade your Node.js version.');
  console.error('');
  console.error('  💡 How to upgrade:');
  console.error('');
  console.error('  Using nvm (recommended):');
  console.error('    nvm install 20');
  console.error('    nvm use 20');
  console.error('');
  console.error('  Or download from: https://nodejs.org/');
  console.error('');
  console.error('  After upgrading, run: npm install');
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('');
  process.exit(1);
}

// Success - version is compatible
console.log(`✅ Node.js version ${currentVersion} is compatible (>= ${requiredVersion})`);
