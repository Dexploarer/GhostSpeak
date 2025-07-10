module.exports = {
  extends: ['../../eslint.config.js'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Allow console.log in CLI context
    'no-console': 'off',

    // Allow any type for rapid prototyping
    '@typescript-eslint/no-explicit-any': 'warn',

    // Allow async functions without await for stubs
    '@typescript-eslint/require-await': 'off',

    // Allow interfaces without I prefix in CLI context
    '@typescript-eslint/naming-convention': 'off',

    // Relax import ordering for development
    'import/order': 'warn',

    // Allow unused vars starting with underscore
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Allow process.exit in CLI context
    'no-process-exit': 'off',

    // Allow require for dynamic imports
    '@typescript-eslint/no-var-requires': 'off',
  },
  settings: {
    react: {
      version: '18.3.1',
    },
  },
};
