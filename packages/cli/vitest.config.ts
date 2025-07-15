import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'ghostspeak-cli-e2e',
    environment: 'node',
    globals: true,
    testTimeout: 45000, // Longer for CLI operations
    hookTimeout: 30000,
    teardownTimeout: 10000,
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'node_modules/**/*',
        'dist/**/*',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },
    // CLI testing configuration
    poolOptions: {
      threads: {
        singleThread: true, // CLI commands should run sequentially
      },
    },
    retry: 1, // CLI tests should be more deterministic
    reporter: ['verbose'],
  },
})