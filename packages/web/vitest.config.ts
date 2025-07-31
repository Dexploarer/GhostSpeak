import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        'lib/ghostspeak/client.ts', // Mock client file
        'components/ui/**', // UI library components
        'app/layout.tsx',
        'app/globals.css',
        'tailwind.config.js',
        'next.config.js',
      ],
      thresholds: {
        global: {
          lines: 80,
          branches: 75,
          functions: 80,
          statements: 80,
        },
        // Critical modules require higher coverage
        'lib/queries/': {
          lines: 85,
          branches: 80,
          functions: 85,
          statements: 85,
        },
      },
      include: [
        'lib/**/*.{js,ts,tsx}',
        'components/**/*.{js,ts,tsx}',
        'app/**/*.{js,ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
