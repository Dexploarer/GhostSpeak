import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

const external = [
  'react',
  'react-dom',
  '@ghostspeak/sdk',
  '@solana/addresses',
  '@solana/codecs',
  '@solana/rpc',
  '@solana/rpc-types',
  '@solana/signers',
  '@solana/wallet-adapter-base',
  '@solana/wallet-adapter-react'
];

const plugins = [
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: './dist'
  })
];

export default defineConfig([
  // Main build
  {
    input: 'src/index.ts',
    external,
    plugins,
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        exports: 'named'
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm'
      }
    ]
  }
]);