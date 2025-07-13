import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

const external = [
  '@ghostspeak/sdk',
  '@solana/addresses',
  '@solana/rpc',
  '@solana/signers',
  '@solana/web3.js',
  /^@solana\//,
  /^@ghostspeak\//,
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      json(),
      resolve({
        browser: false,
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        sourceMap: true,
      }),
    ],
  },
];