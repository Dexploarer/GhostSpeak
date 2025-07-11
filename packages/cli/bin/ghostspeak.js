#!/usr/bin/env node

/**
 * ghostspeak CLI Binary
 *
 * This binary launches the main CLI application.
 * It handles Node.js compatibility and error reporting.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Launch the CLI by spawning node with the dist file
const cliPath = join(__dirname, '../dist/index.js');
const args = process.argv.slice(2);

const child = spawn(process.execPath, [cliPath, ...args], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (error) => {
  console.error(`
❌ Failed to start ghostspeak CLI:

${error.message}

If this error persists, please report it at:
https://github.com/ghostspeak/ghostspeak/issues
`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
