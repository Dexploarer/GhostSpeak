module.exports = {
  displayName: 'Web3.js v2 Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // ✅ Only run v2 tests
  testMatch: [
    '<rootDir>/tests/v2/**/*.test.ts',
    '<rootDir>/packages/*/tests/v2/**/*.test.ts'
  ],
  
  // ✅ Ignore v1 test files that might cause regression
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/(?!v2/).*\\.test\\.(ts|js)$',
    '/packages/.*/tests/(?!v2/).*\\.test\\.(ts|js)$'
  ],
  
  // ✅ Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // ✅ Module path mapping for v2 patterns
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@v2-tests/(.*)$': '<rootDir>/tests/v2/$1'
  },
  
  // ✅ Setup files for v2 tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/v2/setup.ts'
  ],
  
  // ✅ Coverage configuration
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'tests/v2/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  // ✅ Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // ✅ Global test timeout
  testTimeout: 30000,
  
  // ✅ Environment variables for v2 tests
  globals: {
    __WEB3JS_VERSION__: 'v2',
    __TEST_TYPE__: 'v2-only',
    __ANCHOR_PROGRAM_ID__: 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps'
  },
  
  // ✅ Verbose output for debugging
  verbose: true,
  
  // ✅ Reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/v2-tests',
      filename: 'report.html',
      pageTitle: 'Web3.js v2 Test Report'
    }]
  ]
}; 