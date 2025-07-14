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
  external: [],
  tsconfig: 'tsconfig.json',
  // Remove banner for now to avoid shebang issues
  // banner: {
  //   js: '#!/usr/bin/env node'
  // }
})