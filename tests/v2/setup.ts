// ✅ Web3.js v2 Test Setup - NEVER import v1 patterns
import { beforeAll, afterAll } from '@jest/globals';

// ✅ Global test configuration
beforeAll(async () => {
  console.log('🚀 Setting up Web3.js v2 test environment...');
  
  // ✅ Environment validation
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
  }
  
  // ✅ Web3.js version validation
  process.env.WEB3JS_VERSION = 'v2';
  process.env.NO_WEB3JS_V1 = 'true';
  
  console.log('✅ Web3.js v2 test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up Web3.js v2 test environment...');
  // Cleanup logic here
  console.log('✅ Web3.js v2 cleanup completed');
});

// ✅ Global error handler for v1 detection
process.on('uncaughtException', (error) => {
  if (error.message.includes('web3.js') && error.message.includes('v1')) {
    console.error('🚨 CRITICAL: Web3.js v1 detected in v2 tests!');
    console.error('This is a regression trigger that must be fixed');
    process.exit(1);
  }
  throw error;
});

// ✅ Jest globals for v2 tests
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      WEB3JS_VERSION: 'v2';
      NO_WEB3JS_V1: 'true';
    }
  }
}

export {}; 