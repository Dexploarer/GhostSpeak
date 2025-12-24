import { defineConfig } from 'tsup'

export default defineConfig([
  // Main bundle - optimized for tree-shaking
  {
    entry: {
      index: 'src/index.ts',
      // Separate entry points for tree-shaking
      browser: 'src/browser.ts', // Browser-safe entry without libsql
      client: 'src/core/GhostSpeakClient.ts',
      types: 'src/core/types.ts',
      errors: 'src/core/errors.ts',
      crypto: 'src/crypto/index.ts',
      utils: 'src/utils/index.ts',
      credentials: 'src/modules/credentials/CrossmintVCClient.ts'
    },
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: true, // Enable code splitting for better tree-shaking
    treeshake: true,
    minify: process.env.NODE_ENV === 'production',
    target: 'es2022',
    platform: 'neutral', // Better for both node and browser
    esbuildOptions(options) {
      options.conditions = ['edge-light', 'node', 'import']
    },
    external: [
      // Mark all @solana packages as external for better tree-shaking
      '@solana/kit',
      '@solana/addresses',
      '@solana/accounts',
      '@solana/instructions',
      '@solana/transactions',
      '@solana/signers',
      '@solana/rpc',
      '@solana/rpc-spec',
      '@solana/rpc-types',
      '@solana/rpc-transport',
      '@solana/programs',
      '@solana/sysvars',
      '@solana/spl-token',
      '@solana/spl-account-compression',
      '@solana/options',
      '@solana/codecs-core',
      '@solana/codecs-data-structures',
      '@solana/codecs-numbers',
      '@solana/codecs-strings',
      '@solana/codecs',
      '@solana/errors',
      '@solana/functional',
      '@solana-program/system',
      '@solana-program/token-2022',
      '@noble/curves',
      '@noble/hashes',
      'bs58',
      'kubo-rpc-client',
      // Node.js built-ins
      'util',
      'fs',
      'http',
      'https',
      // External packages
      'rpc-websockets',
      '@solana/web3.js'
    ],
    tsconfig: 'tsconfig.json',
    // Bundle analysis
    metafile: true,
  },
  
  // Lightweight core bundle for minimal usage
  {
    entry: {
      'core-minimal': 'src/core/minimal.ts'
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: true,
    target: 'es2022',
    platform: 'neutral',
    external: [
      '@solana/kit',
      '@solana/addresses',
      '@noble/curves'
    ],
    tsconfig: 'tsconfig.json',
    outDir: 'dist/minimal'
  }
])