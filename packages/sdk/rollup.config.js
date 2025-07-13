import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';

const external = [
  '@solana/addresses',
  '@solana/codecs',
  '@solana/rpc',
  '@solana/rpc-types',
  '@solana/signers',
  'bs58'
];

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/esm/index.js',
      format: 'es',
      sourcemap: true
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
        browser: false
      }),
      commonjs(),
      json(),
      typescript({
        declaration: true,
        declarationDir: 'dist/types',
        rootDir: 'src',
        exclude: ['**/*.test.ts', '**/*.spec.ts']
      }),
      terser()
    ]
  },
  // CJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/cjs/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
        browser: false
      }),
      commonjs(),
      json(),
      typescript({
        declaration: false,
        exclude: ['**/*.test.ts', '**/*.spec.ts']
      }),
      terser()
    ]
  },
  // Optimized build
  {
    input: 'src/index-optimized.ts',
    output: {
      file: 'dist/optimized/index.js',
      format: 'es',
      sourcemap: true
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
        browser: false
      }),
      commonjs(),
      json(),
      typescript({
        declaration: true,
        declarationDir: 'dist/types',
        declarationMap: true,
        exclude: ['**/*.test.ts', '**/*.spec.ts']
      }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ]
  }
];