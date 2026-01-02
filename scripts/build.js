#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

// Run the Next on Pages adapter build. Ignore any extra args passed from the CLI/CI.
const result = spawnSync('npx', ['@cloudflare/next-on-pages@1', 'build'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
