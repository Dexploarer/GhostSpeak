import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const external = [
  '@elizaos/core',
  '@elizaos/adapters',
  '@ghostspeak/sdk',
  '@solana/addresses',
  '@solana/codecs',
  '@solana/rpc',
  '@solana/rpc-types',
  '@solana/signers',
  '@solana/keys',
  '@solana/transactions',
  'bs58',
  'zod'
];

const plugins = [
  resolve({
    preferBuiltins: true,
    exportConditions: ['node']
  }),
  commonjs(),
  typescript({
    declaration: true,
    declarationDir: 'dist',
    rootDir: 'src'
  })
];

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    external,
    plugins
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'auto'
    },
    external,
    plugins
  },
  // Individual exports
  {
    input: {
      actions: 'src/actions/index.ts',
      providers: 'src/providers/index.ts', 
      services: 'src/services/index.ts',
      evaluators: 'src/evaluators/index.ts'
    },
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].esm.js'
      },
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].js',
        exports: 'auto'
      }
    ],
    external,
    plugins
  }
];