#!/usr/bin/env node
/**
 * Minimal Screenshot Website MCP server stub (health only for CI)
 */
const express = require('express');
const app = express();
const PORT = process.env.SCREENSHOT_WEBSITE_PORT || 3015;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'screenshot-website', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`screenshot-website MCP stub listening on port ${PORT}`);
});
