import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    testTimeout: 15000, // 15 seconds for CLI tests
    hookTimeout: 15000, // 15 seconds for setup/teardown
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
})