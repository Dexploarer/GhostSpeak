import { defineConfig } from 'vitest/config'
import path from 'path'

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
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    // Performance optimizations
    testTimeout: 30000,
    hookTimeout: 30000,
    // Parallel execution with better defaults
    threads: true,
    maxConcurrency: 5,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true,
        minThreads: 1,
        maxThreads: 4
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
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    // Bail on first failure in CI
    bail: process.env.CI ? 1 : 0
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