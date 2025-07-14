import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'es2022',
  platform: 'node',
  external: ['@solana/web3.js', '@ghostspeak/sdk'],
  tsconfig: 'tsconfig.json',
  esbuildOptions(options) {
    options.bundle = true
    options.mainFields = ['module', 'main']
  }
})