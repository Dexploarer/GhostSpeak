#!/usr/bin/env node

/**
 * Fixed build script for GhostSpeak SDK
 * Properly handles external dependencies and re-exports
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// External dependencies that should not be bundled
const EXTERNALS = [
  '@solana/addresses',
  '@solana/codecs',
  '@solana/rpc',
  '@solana/rpc-types',
  '@solana/rpc-subscriptions',
  '@solana/signers',
  '@solana/functional',
  '@solana/transaction-messages',
  '@solana/transactions',
  '@solana/keys',
  '@solana/accounts',
  '@solana/spl-token',
  '@solana/spl-token-metadata',
  '@solana-program/token-2022',
  'borsh',
  'pino',
  'pino-pretty',
  'bs58',
  'uuid',
];

async function buildSDK() {
  console.log('🔧 Building GhostSpeak SDK with fixed configuration...\n');

  try {
    // ESM build (unminified for debugging)
    await build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'esm',
      target: ['es2022', 'node18'],
      platform: 'node',
      outdir: 'dist/esm-fixed',
      external: EXTERNALS,
      sourcemap: true,
      splitting: true,
      chunkNames: 'chunks/[name]-[hash]',
      metafile: true,
      minify: false, // Disable minification to avoid variable name issues
      keepNames: true, // Preserve function and class names
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      banner: {
        js: '// GhostSpeak SDK - Fixed Build\n',
      },
      logLevel: 'info',
    });

    console.log('✅ ESM build completed successfully\n');

    // CommonJS build
    await build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'cjs',
      target: ['node18'],
      platform: 'node',
      outfile: 'dist/cjs-fixed/index.js',
      external: EXTERNALS,
      sourcemap: true,
      metafile: true,
      minify: false,
      keepNames: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      banner: {
        js: '// GhostSpeak SDK - Fixed Build (CommonJS)\n',
      },
      logLevel: 'info',
    });

    console.log('✅ CommonJS build completed successfully\n');

    // Create a minimal example runner
    await build({
      entryPoints: ['examples/basic-agent-registration.ts'],
      bundle: true,
      format: 'esm',
      target: ['node18'],
      platform: 'node',
      outfile: 'dist/examples/basic-agent-registration.js',
      external: [
        ...EXTERNALS,
        '@ghostspeak/sdk', // External reference to our SDK
      ],
      sourcemap: true,
      minify: false,
      keepNames: true,
      define: {
        'process.env.NODE_ENV': '"development"',
      },
      logLevel: 'info',
    });

    console.log('✅ Example build completed successfully\n');

    console.log('🎉 All builds completed successfully!');
    console.log('\nTo test the build:');
    console.log('  node dist/esm-fixed/index.js');
    console.log('  node dist/examples/basic-agent-registration.js');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildSDK();