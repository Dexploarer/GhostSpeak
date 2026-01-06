import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import pluginNext from '@next/eslint-plugin-next'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * ESLint Flat Config for GhostSpeak Web App
 * 
 * Note: eslint-config-next is incompatible with ESLint 9 flat config.
 * We use native plugins directly instead.
 */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.config.js',
      '*.config.mjs',
      'scripts/**',
      'test*.ts',
      'convex/test*.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'prettier': prettierPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': pluginNext,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Next.js (Manual compat mode for Flat Config)
      // Note: We use this manually because @next/eslint-plugin-next doesn't export flat config yet
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'error',
      '@next/next/no-sync-scripts': 'error',

      // Prettier
      'prettier/prettier': 'warn',
      
      // General - allow console for development
      'prefer-const': 'warn',
    },
  },
]

export default eslintConfig
