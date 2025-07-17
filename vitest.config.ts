import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'scripts/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**'
      ]
    },
    testTimeout: 60000, // 1 minute default
    hookTimeout: 30000,
    teardownTimeout: 30000,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'programs']
  }
})