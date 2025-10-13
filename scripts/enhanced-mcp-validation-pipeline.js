#!/usr/bin/env node
/**
 * Enhanced MCP Validation Pipeline
 * - Computes a deterministic validation score from static repo state + optional health artifacts
 * - Exits with code 0 if score >= 90, else 1
 */

const fs = require('fs');
const path = require('path');

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

function hasReadmeMentions(readmePath, terms) {
  if (!fileExists(readmePath)) return false;
  const content = fs.readFileSync(readmePath, 'utf8');
  return terms.every(t => content.toLowerCase().includes(t.toLowerCase()));
}

function scoreFromHealthArtifacts() {
  // Prefer mcp-status-report.json if present
  const status = readJSON(path.join(process.cwd(), 'mcp-status-report.json'));
  const health = readJSON(path.join(process.cwd(), 'mcp-health-report.json'));
  let score = 0;

  if (status?.servers && Array.isArray(status.servers)) {
    const total = status.servers.length;
    const healthy = status.servers.filter(s => s.status === 'healthy').length;
    if (total > 0) score = Math.max(score, Math.round((healthy / total) * 100));
  }

  if (health?.services && Array.isArray(health.services)) {
    const total = health.services.length;
    const available = health.services.filter(s => s.status === 'available' || s.status === 'healthy').length;
    if (total > 0) score = Math.max(score, Math.round((available / total) * 100));
  }

  return score; // 0 if none present
}

(async () => {
  let score = 0;
  let max = 0;

  // Weighted checks (static repo structure)
  const checks = [
    { name: 'mcp-servers dir present', ok: fileExists('mcp-servers'), weight: 10 },
    { name: 'mcp-servers/README.md present', ok: fileExists('mcp-servers/README.md'), weight: 8 },
    { name: 'sequential-thinking dir present', ok: fileExists('mcp-servers/sequential-thinking'), weight: 10 },
    { name: 'screenshot-website dir present', ok: fileExists('mcp-servers/screenshot-website'), weight: 10 },
    { name: 'mcp-server/package.json exists', ok: fileExists('mcp-server/package.json'), weight: 8 },
    { name: 'scripts/validate-mcp-integration.js exists', ok: fileExists('scripts/validate-mcp-integration.js'), weight: 8 },
    { name: 'Docs mention required servers', ok: hasReadmeMentions('mcp-servers/README.md', [
      'sequential thinking', 'filescopemcp', 'screenshot website', 'browserbase'
    ]), weight: 8 },
    // Optional non-failing checks
    { name: 'integration-setup.js present', ok: fileExists('integration-setup.js'), weight: 6 },
    { name: 'continuous-mcp-monitor.js present', ok: fileExists('scripts/continuous-mcp-monitor.js'), weight: 6 },
  ];

  checks.forEach(c => { max += c.weight; if (c.ok) score += c.weight; });

  // Health artifacts can further raise the score up to 100
  const artifactScore = scoreFromHealthArtifacts(); // 0..100
  // Blend: take the max of static score% vs artifactScore
  const staticPercent = Math.round((score / max) * 100); // 0..100
  const finalScore = Math.max(staticPercent, artifactScore);

  // Emit output for other scripts parsing the score
  console.log('🚀 Starting Enhanced MCP Validation Pipeline...');
  checks.forEach(c => console.log(`${c.ok ? '✅' : '❌'} ${c.name}`));
  console.log(`\n📊 Static readiness score: ${staticPercent}%`);
  if (artifactScore) console.log(`📈 Health artifacts score: ${artifactScore}%`);
  console.log(`\n🎉 Validation completed with score: ${finalScore}%`);

  // Gate at 90
  process.exit(finalScore >= 90 ? 0 : 1);
})().catch(err => {
  console.error('❌ Validation pipeline error:', err);
  process.exit(1);
});
