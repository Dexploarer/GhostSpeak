/**
 * Test setup and configuration
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SOLANA_NETWORK = 'localnet';

// Mock console methods to reduce noise during tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  // Keep error for debugging failed tests
  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('Test failed')) {
      originalConsole.error(...args);
    }
  };
}

// Global test utilities
export const testUtils = {
  // Restore console for specific tests
  restoreConsole: () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  },

  // Suppress console for specific tests
  suppressConsole: () => {
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
  },

  // Generate unique IDs for tests
  generateUniqueId: (prefix: string = 'test') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock successful transaction
  mockSuccessfulTransaction: () => ({
    signature: 'mock-signature-' + Date.now(),
    confirmations: 10,
    slot: 12345,
    err: null,
  }),

  // Mock failed transaction
  mockFailedTransaction: (error: string) => ({
    signature: 'mock-failed-signature-' + Date.now(),
    confirmations: 0,
    slot: 0,
    err: { message: error },
  }),
};

// Export for use in tests
(global as any).testUtils = testUtils;
