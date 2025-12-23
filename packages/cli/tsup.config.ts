import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  silent: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'es2022',
  platform: 'node',
  external: ['@solana/web3.js', '@ghostspeak/sdk', 'node-fetch'],
  noExternal: ['punycode', 'whatwg-url', 'webidl-conversions', 'tr46'],
  tsconfig: 'tsconfig.json',
  esbuildOptions(options) {
    options.bundle = true
    options.mainFields = ['module', 'main']
    options.banner = {
      js: `import { createRequire } from 'module';
const require = createRequire(import.meta.url);`
    }
    // Suppress warnings about unused imports from external modules
    options.logLevel = 'error'
  }
})