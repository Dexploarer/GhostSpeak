import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'ghostspeak-sdk-e2e',
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'src/generated/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/generated/**/*',
        'node_modules/**/*',
        'dist/**/*',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    // Blockchain testing configuration
    poolOptions: {
      threads: {
        singleThread: true, // Better for blockchain state management
      },
    },
    // Enable retry for flaky blockchain tests
    retry: 2,
    // Setup file for blockchain test environment
    setupFiles: ['./tests/setup.ts'],
    // Reporter configuration
    reporter: ['verbose', 'json'],
  },
})