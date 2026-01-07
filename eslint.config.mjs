// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Global ignores (replacement for .eslintignore)
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.vercel/**',
      '**/generated/**',
      '.cursor/**',
      '**/archive/**',
      '**/examples/**',
      '**/test-debug.ts',
    ],
  },
  // Base ESLint recommended rules
  eslint.configs.recommended,
  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './packages/*/tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript rules - production deployment settings
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade to warn for production
      '@typescript-eslint/no-unused-vars': ['warn', { // Downgrade to warn for production
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      // Style/preference rules - turned off for cleaner focus on type safety
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Style preference - safe to suppress
      '@typescript-eslint/consistent-type-imports': 'off', // Style preference - safe to suppress
      '@typescript-eslint/no-unnecessary-condition': 'off', // Often defensive programming - safe to suppress
      '@typescript-eslint/prefer-optional-chain': 'off', // Style preference - safe to suppress

      // Additional strict TypeScript rules - keep as warnings for gradual improvement
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/prefer-string-starts-ends-with': 'warn',

      // Unsafe operations - downgrade to warn for production deployment
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-require-imports': 'off', // Legacy compatibility - safe to suppress

      // Temporarily downgrade these to warnings for gradual improvement
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/return-await': 'off', // Style preference - safe to suppress
      '@typescript-eslint/no-namespace': 'off', // Legitimate use cases - safe to suppress

      // Code quality and consistency rules
      'no-constant-condition': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-implicit-coercion': 'warn',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-misleading-character-class': 'error',
      'no-prototype-builtins': 'error',
      'no-self-assign': 'error',
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Disable conflicting rules
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript handles this better

      // Basic JS/TS quality - keep as errors
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Prevent legacy Solana package imports (use modern v5 packages instead)
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@solana/web3.js',
            message: 'Use @solana/rpc, @solana/addresses, @solana/signers, or @solana/kit instead. Legacy @solana/web3.js is deprecated.',
          },
          {
            name: '@solana/spl-token',
            message: 'Use @solana-program/token (for standard SPL tokens) or @solana-program/token-2022 (for Token Extensions) instead. Legacy @solana/spl-token is for web3.js v1.x only.',
          },
        ],
      }],
    },
    // Apply to all TypeScript files
    files: ['**/*.ts', '**/*.tsx'],
    // Exclude tests and scripts from this restriction
    ignores: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**', '**/scripts/**'],
  },
  {
    // Disable type-aware linting for JavaScript files
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Specific rules for test files
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // Specific rules for configuration files
    files: ['**/*.config.{js,mjs,ts}', '**/vite.config.ts', '**/vitest.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Very lenient rules for generated files
    files: ['**/generated/**/*.ts', '**/src/generated/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      'no-redeclare': 'off', // Function overloads in generated code
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  }
);