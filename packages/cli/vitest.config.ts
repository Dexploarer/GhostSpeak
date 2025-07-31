import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        'src/types/',
        '**/*.d.ts',
        'scripts/'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 95,
          statements: 95
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
})