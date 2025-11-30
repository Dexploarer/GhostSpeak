import { defineConfig } from 'vitest/config'
import path from 'path'

// Determine test mode
const isQuickTest = process.env.QUICK_TEST === 'true'
const isFullTest = process.env.FULL_TEST_RUN === 'true'
const isCoverageRun = process.env.COVERAGE === 'true'

// Define test groups
const quickTestPattern = [
  '**/utils/*.test.ts',
  '**/client/*.test.ts',
  '!**/crypto/**',
  '!**/elgamal-complete.test.ts',
  '!**/bulletproofs.test.ts',
  '!**/wasm-crypto-bridge.test.ts'
]

const slowTestPattern = [
  '**/crypto/**/*.test.ts',
  '**/elgamal-complete.test.ts',
  '**/bulletproofs.test.ts',
  '**/wasm-crypto-bridge.test.ts'
]

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'src/generated/**',
        'tests/**',
        'scripts/**',
        'examples/**'
      ],
      thresholds: {
        branches: isCoverageRun ? 60 : 80, // Lower threshold for coverage runs
        functions: isCoverageRun ? 60 : 80,
        lines: isCoverageRun ? 60 : 80,
        statements: isCoverageRun ? 60 : 80
      }
    },
    // Include/exclude patterns based on mode
    ...(isQuickTest ? {
      include: quickTestPattern,
      exclude: slowTestPattern
    } : {}),
    // Performance optimizations
    testTimeout: isFullTest ? 120000 : (isQuickTest ? 10000 : 15000), // 15s for integration tests
    hookTimeout: isFullTest ? 120000 : (isQuickTest ? 10000 : 10000),  // 10s for hooks
    teardownTimeout: 5000, // 5s for cleanup (database connections)
    // Parallel execution with better defaults
    threads: !isFullTest, // Disable threads for full test runs to avoid race conditions
    maxConcurrency: isFullTest ? 1 : 5,
    pool: isFullTest ? 'forks' : 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true,
        minThreads: 1,
        maxThreads: isQuickTest ? 8 : 4
      },
      forks: {
        singleFork: false,
        isolate: true,
        minForks: 1,
        maxForks: 2
      }
    },
    // Module resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@client': path.resolve(__dirname, './src/client'),
        '@generated': path.resolve(__dirname, './src/generated'),
        '@types': path.resolve(__dirname, './src/types')
      }
    },
    // Cache for faster re-runs
    cache: {
      dir: '.vitest'
    },
    // Reporter options for cleaner output
    reporters: process.env.CI ? ['default', 'junit'] : (isQuickTest ? ['dot'] : ['default']),
    // Bail on first failure in CI or quick tests
    bail: process.env.CI || isQuickTest ? 1 : 0,
    // Retry flaky tests
    retry: isFullTest ? 2 : 0,
    // Shard tests for parallel CI runs
    ...(process.env.VITEST_SHARD ? {
      shard: process.env.VITEST_SHARD
    } : {})
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    // Handle .js imports in TypeScript files
    alias: {
      '~': path.resolve(__dirname, './src')
    }
  },
  // Handle ESM modules
  server: {
    deps: {
      inline: ['@noble/curves', '@noble/hashes']
    }
  }
})