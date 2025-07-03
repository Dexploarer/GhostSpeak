// @ts-nocheck
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
// @ts-ignore
export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/generated/**',
      '**/.git/**',
      '**/.cache/**',
      '**/temp/**',
      '**/.tmp/**',
      '**/bun.lock',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/*.d.ts',
      '**/anchor.lock',
      '**/Anchor.lock'
    ]
  },

  // Base JavaScript configuration
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        // @ts-ignore
        ...globals.es2022
      }
    },
    plugins: {
      import: importPlugin,
      security,
      sonarjs,
      prettier
    },
    rules: {
      ...js.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...security.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      
      // Prettier integration
      'prettier/prettier': 'error',
      
      // Code quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Best practices
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': 'warn',
      
      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],
      'import/no-unresolved': 'off', // Handled by TypeScript
      'import/named': 'off', // Handled by TypeScript
      'import/default': 'off', // Handled by TypeScript
      'import/namespace': 'off', // Handled by TypeScript
      
      // Security
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      
      // SonarJS
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/max-switch-cases': ['error', 30],
      'sonarjs/no-duplicate-string': ['error', { threshold: 5 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/prefer-object-literal': 'error',
      'sonarjs/prefer-single-boolean-return': 'error'
    }
  },

  // TypeScript configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        // @ts-ignore
        ...globals.es2022
      }
    },
    plugins: {
      '@typescript-eslint': ts,
      import: importPlugin,
      security,
      sonarjs,
      prettier
    },
    rules: {
      // Disable base rules that are covered by TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-use-before-define': 'off',
      
      // TypeScript-specific rules
      ...ts.configs.recommended.rules,
      // @ts-ignore
      ...ts?.configs['recommended-requiring-type-checking'].rules,
      ...ts.configs.strict.rules,
      
      // Prettier integration
      'prettier/prettier': 'error',
      
      // TypeScript best practices
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false
        }
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      
      // Performance and memory
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for most cases
      '@typescript-eslint/prefer-return-this-type': 'error',
      
      // Import rules for TypeScript
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'type'
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],
      
      // AI development optimizations
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I']
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase']
        },
        {
          selector: 'enum',
          format: ['PascalCase']
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE']
        },
        {
          selector: 'class',
          format: ['PascalCase']
        },
        {
          selector: 'method',
          format: ['camelCase']
        },
        {
          selector: 'function',
          format: ['camelCase']
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow'
        }
      ]
    }
  },

  // Test files configuration
  {
    files: ['**/*.{test,spec}.{js,ts,tsx}', '**/tests/**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      // Relaxed rules for tests
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      'sonarjs/no-duplicate-string': 'off',
      'security/detect-object-injection': 'off'
    }
  },

  // CLI specific configuration
  {
    files: ['packages/cli/**/*.{js,ts}'],
    rules: {
      'no-console': 'off', // CLI tools need console output
      '@typescript-eslint/no-non-null-assertion': 'warn'
    }
  },

  // Configuration files
  {
    files: [
      '*.config.{js,ts}',
      '.*rc.{js,ts}',
      '*.config.*.{js,ts}',
      'vite.config.*',
      'rollup.config.*',
      'webpack.config.*',
      'jest.config.*',
      'playwright.config.*'
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/no-var-requires': 'off'
    }
  },

  // Documentation files
  {
    files: ['**/*.md', '**/*.mdx'],
    rules: {
      // Markdown files don't need linting
    }
  },

  // Blockchain/Solana specific files
  {
    files: ['packages/core/**/*.rs', '**/anchor/**/*.rs'],
    rules: {
      // Rust files are handled by cargo clippy
    }
  },

  // Performance-critical files
  {
    files: [
      '**/performance/**/*.{js,ts}',
      '**/benchmarks/**/*.{js,ts}',
      '**/*.perf.{js,ts}'
    ],
    rules: {
      'sonarjs/cognitive-complexity': ['error', 25],
      '@typescript-eslint/prefer-readonly': 'off'
    }
  },

  // Add override rules for generated code
  {
    files: ['**/generated*/**/*.ts', '**/generated-v2/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/naming-convention': 'off',
    }
  }
]; 