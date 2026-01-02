#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

// Run the Next on Pages adapter build. Ignore any extra args passed from the CLI/CI.
// The adapter defaults to "build" when no subcommand is provided, and some CI
// environments append stray args. Keep the invocation minimal.
const env = { ...process.env, NEXT_ON_PAGES_NEXTJS_CLI: 'next' };
const result = spawnSync('npx', ['@cloudflare/next-on-pages@1'], {
  stdio: 'inherit',
  env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
