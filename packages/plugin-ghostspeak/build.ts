#!/usr/bin/env bun
/**
 * Self-contained build script for ElizaOS plugins
 */

import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { $ } from 'bun';

async function cleanBuild(outdir = 'dist') {
  if (existsSync(outdir)) {
    await rm(outdir, { recursive: true, force: true });
    console.log(`✓ Cleaned ${outdir} directory`);
  }
}

async function build() {
  const start = performance.now();
  console.log('🚀 Building plugin...');

  try {
    // Clean previous build
    await cleanBuild('dist');

    // Run JavaScript build first, then TypeScript declarations
    console.log('Starting build tasks...');

    // Task 1: Build with Bun
    console.log('📦 Bundling with Bun...');
    const buildResult = await Bun.build({
      entrypoints: ['./src/index.ts'],
      outdir: './dist',
      target: 'node',
      format: 'esm',
      sourcemap: true,
      minify: false,
      external: ['dotenv', 'node:*', '@elizaos/core', '@elizaos/cli', 'zod'],
      naming: {
        entry: '[dir]/[name].[ext]',
      },
    });

    if (!buildResult.success) {
      console.error('✗ Build failed:', buildResult.logs);
      return false;
    }

    const totalSize = buildResult.outputs.reduce((sum, output) => sum + output.size, 0);
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`✓ Built ${buildResult.outputs.length} file(s) - ${sizeMB}MB`);

    // Task 2: Generate TypeScript declarations (after Bun build completes)
    console.log('📝 Generating TypeScript declarations...');
    let tscResult;
    try {
      await $`tsc --project ./tsconfig.build.json`.quiet();
      console.log('✓ TypeScript declarations generated');
      tscResult = { success: true };
    } catch (error) {
      console.warn('⚠ Failed to generate TypeScript declarations');
      console.warn('  This is usually due to test files or type errors.');
      tscResult = { success: false };
    }

    if (!buildResult.success) {
      return false;
    }

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`✅ Build complete! (${elapsed}s)`);
    return true;
  } catch (error) {
    console.error('Build error:', error);
    return false;
  }
}

// Execute the build
build()
  .then((success) => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Build script error:', error);
    process.exit(1);
  });
