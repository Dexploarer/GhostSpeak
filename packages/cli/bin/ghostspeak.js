#!/bin/sh -
':'; /*-
test1=$(bun --version 2>&1) && exec bun "$0" "$@"
test2=$(node --version 2>&1) && exec node "$0" "$@"
exec printf '%s\n' "$test1" "$test2" 1>&2
*/

/**
 * ghostspeak CLI Binary
 * 
 * This binary launches the main CLI application.
 * It handles Node.js compatibility and error reporting.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

if (majorVersion < 20) {
  console.error(`
❌ ghostspeak CLI requires Node.js v20.0.0 or higher.
   Current version: ${nodeVersion}
   
   Please upgrade Node.js: https://nodejs.org/
`);
  process.exit(1);
}

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Launch the CLI
try {
  const cliPath = join(__dirname, '../dist/index.js');
  await import(cliPath);
} catch (error) {
  console.error(`
❌ Failed to start ghostspeak CLI:

${error.message}

If this error persists, please report it at:
https://github.com/ghostspeak/ghostspeak/issues
`);
  process.exit(1);
} 