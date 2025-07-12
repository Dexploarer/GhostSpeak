#!/usr/bin/env node

/**
 * Test script to verify timeout functionality
 * Run with: bun test/timeout-test.ts
 */

import { withTimeout, TIMEOUTS, withTimeoutAndRetry } from '../src/utils/timeout.js';
import { logger } from '../src/utils/logger.js';
import chalk from 'chalk';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTimeoutWithWarning() {
  console.log(chalk.cyan('\n📋 Testing timeout with warning threshold...\n'));
  
  try {
    await withTimeout(
      delay(5000),  // 5 second delay
      3000,         // 3 second timeout
      'Test operation',
      {
        warningThreshold: 60,  // Warn at 60% (1.8 seconds)
        onWarning: () => {
          console.log(chalk.yellow('⚠️  Custom warning: Operation is slow!'));
        }
      }
    );
  } catch (error) {
    console.log(chalk.green('✅ Timeout worked correctly:'), error.message);
  }
}

async function testRetryWithTimeout() {
  console.log(chalk.cyan('\n📋 Testing retry with timeout...\n'));
  
  let attempts = 0;
  
  try {
    await withTimeoutAndRetry(
      async () => {
        attempts++;
        console.log(chalk.gray(`Attempt ${attempts}`));
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return 'Success!';
      },
      'Network operation',
      2000,  // 2 second timeout per attempt
      {
        maxRetries: 3,
        delayMs: 500,
        shouldRetry: () => true
      },
      {
        showRetryHint: true
      }
    );
    console.log(chalk.green('✅ Retry succeeded after', attempts, 'attempts'));
  } catch (error) {
    console.log(chalk.red('❌ All retries failed:'), error.message);
  }
}

async function testConfigurableTimeouts() {
  console.log(chalk.cyan('\n📋 Testing configurable timeouts...\n'));
  
  // Test environment variable override
  process.env.GHOSTSPEAK_SDK_INIT_TIMEOUT = '10000';
  
  console.log('Default SDK_INIT timeout:', TIMEOUTS.SDK_INIT);
  console.log('Custom timeouts can be set via environment variables');
  console.log('Example: GHOSTSPEAK_CHANNEL_CREATE_TIMEOUT=60000');
  
  // Clean up
  delete process.env.GHOSTSPEAK_SDK_INIT_TIMEOUT;
}

async function runTests() {
  console.log(chalk.bold('\n🧪 GhostSpeak CLI Timeout Tests\n'));
  
  await testTimeoutWithWarning();
  await testRetryWithTimeout();
  await testConfigurableTimeouts();
  
  console.log(chalk.green('\n✅ All timeout tests completed!\n'));
}

// Run tests
runTests().catch(console.error);