import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: [],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  }
})