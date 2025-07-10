/**
 * @example Advanced Transaction Management
 * 
 * This example demonstrates the comprehensive transaction helper utilities
 * including retry mechanisms, circuit breakers, and error recovery strategies.
 */

import {
  Core,
  Utils,
  Protocol,
  Constants,
  createClient
} from '../src/index-documented';
import { createRpc } from '@solana/rpc';

/**
 * Transaction batch configuration
 */
interface BatchConfig {
  maxBatchSize: number;
  batchDelayMs: number;
  parallelExecution: boolean;
  failFast: boolean;
}

/**
 * Demonstration of retry mechanisms with different configurations
 */
async function demonstrateRetryMechanisms(): Promise<void> {
  console.log('🔄 Demonstrating Retry Mechanisms\n');

  const rpc = createRpc(Constants.RPC_ENDPOINTS.DEVNET);

  // Different retry configurations for different scenarios
  const retryConfigs = {
    critical: Utils.DEFAULT_RETRY_CONFIGS.CRITICAL,
    standard: Utils.DEFAULT_RETRY_CONFIGS.STANDARD,
    readOnly: Utils.DEFAULT_RETRY_CONFIGS.READ_ONLY,
    custom: {
      maxAttempts: 10,
      initialDelayMs: 500,
      maxDelayMs: 60000,
      backoffMultiplier: 1.5,
      jitterFactor: 0.2,
    } as Utils.RetryConfig
  };

  for (const [name, config] of Object.entries(retryConfigs)) {
    console.log(`📊 Testing ${name} retry configuration:`);
    console.log(`  Max attempts: ${config.maxAttempts}`);
    console.log(`  Initial delay: ${config.initialDelayMs}ms`);
    console.log(`  Max delay: ${config.maxDelayMs}ms`);

    try {
      const result = await Utils.withRetry(
        async () => {
          // Simulate operation that might fail
          if (Math.random() < 0.7) { // 70% failure rate for demo
            throw new Error('Simulated network error');
          }
          return `Success with ${name} config`;
        },
        config,
        `${name}-operation`
      );
      
      console.log(`  ✅ Result: ${result}\n`);
    } catch (error) {
      console.log(`  ❌ Failed after all retries: ${error}\n`);
    }
  }
}

/**
 * Demonstration of circuit breaker functionality
 */
async function demonstrateCircuitBreaker(): Promise<void> {
  console.log('⚡ Demonstrating Circuit Breaker\n');

  // Create circuit breaker with custom configuration
  const circuitConfig: Utils.CircuitBreakerConfig = {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 10000, // 10 seconds
    windowSizeMs: 60000, // 1 minute
  };

  const circuitBreaker = new Utils.CircuitBreaker(circuitConfig);

  console.log('Circuit breaker configuration:');
  console.log(`  Failure threshold: ${circuitConfig.failureThreshold}`);
  console.log(`  Success threshold: ${circuitConfig.successThreshold}`);
  console.log(`  Timeout: ${circuitConfig.timeoutMs}ms`);

  // Simulate series of operations that trigger circuit breaker
  for (let i = 1; i <= 8; i++) {
    try {
      const result = await circuitBreaker.execute(async () => {
        console.log(`  Operation ${i} - Circuit state: ${circuitBreaker.getState()}`);
        
        // First 4 operations fail, then succeed
        if (i <= 4) {
          throw new Error(`Simulated failure ${i}`);
        }
        return `Success ${i}`;
      });

      console.log(`  ✅ ${result}`);
    } catch (error) {
      console.log(`  ❌ ${error}`);
    }

    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nFinal circuit state: ${circuitBreaker.getState()}\n`);
}

/**
 * Demonstration of resilient transaction sender
 */
async function demonstrateResilientTransactionSender(): Promise<void> {
  console.log('🛡️ Demonstrating Resilient Transaction Sender\n');

  const rpc = createRpc(Constants.RPC_ENDPOINTS.DEVNET);
  
  // Create transaction sender with custom circuit breaker
  const transactionSender = new Utils.ResilientTransactionSender(rpc, {
    failureThreshold: 2,
    successThreshold: 1,
    timeoutMs: 30000,
    windowSizeMs: 120000,
  });

  console.log('🔧 Testing account info retrieval with resilience...');

  const testAddresses = [
    '11111111111111111111111111111111', // System program
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
    Constants.PROGRAM_IDS.DEVNET, // GhostSpeak program
  ] as Core.Address[];

  for (const address of testAddresses) {
    try {
      console.log(`📡 Fetching account info for: ${address}`);
      
      const accountInfo = await transactionSender.getAccountInfo(
        address,
        Utils.DEFAULT_RETRY_CONFIGS.READ_ONLY
      );

      if (accountInfo) {
        console.log(`  ✅ Account found - Owner: ${accountInfo.owner}`);
        console.log(`  💾 Data size: ${accountInfo.data.length} bytes`);
      } else {
        console.log(`  ⚠️ Account not found`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to fetch account: ${error}`);
    }
  }

  console.log(`\nCircuit breaker state: ${transactionSender.getCircuitBreakerState()}\n`);
}

/**
 * Demonstration of transaction batching with error handling
 */
async function demonstrateTransactionBatching(): Promise<void> {
  console.log('📦 Demonstrating Transaction Batching\n');

  const rpc = createRpc(Constants.RPC_ENDPOINTS.DEVNET);
  const transactionSender = new Utils.ResilientTransactionSender(rpc);

  // Simulate multiple account lookups
  const addresses = [
    '11111111111111111111111111111111',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    Constants.PROGRAM_IDS.DEVNET,
    'invalid_address_for_testing'
  ] as Core.Address[];

  const batchConfig: BatchConfig = {
    maxBatchSize: 3,
    batchDelayMs: 100,
    parallelExecution: true,
    failFast: false,
  };

  console.log('Batch configuration:');
  console.log(`  Max batch size: ${batchConfig.maxBatchSize}`);
  console.log(`  Batch delay: ${batchConfig.batchDelayMs}ms`);
  console.log(`  Parallel execution: ${batchConfig.parallelExecution}`);
  console.log(`  Fail fast: ${batchConfig.failFast}`);

  // Process addresses in batches
  const batches = chunkArray(addresses, batchConfig.maxBatchSize);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n📥 Processing batch ${i + 1}/${batches.length}:`);

    try {
      let results;
      
      if (batchConfig.parallelExecution) {
        // Execute batch operations in parallel
        const promises = batch.map(async (address, index) => {
          try {
            console.log(`  🔄 [${index + 1}] Fetching: ${address}`);
            const accountInfo = await transactionSender.getAccountInfo(address);
            return { address, accountInfo, success: true };
          } catch (error) {
            return { address, error: error.message, success: false };
          }
        });

        results = await Promise.all(promises);
      } else {
        // Execute batch operations sequentially
        results = [];
        for (const address of batch) {
          try {
            console.log(`  🔄 Fetching: ${address}`);
            const accountInfo = await transactionSender.getAccountInfo(address);
            results.push({ address, accountInfo, success: true });
          } catch (error) {
            results.push({ address, error: error.message, success: false });
            
            if (batchConfig.failFast) {
              console.log('  ⚠️ Fail-fast enabled, stopping batch processing');
              break;
            }
          }
        }
      }

      // Display batch results
      results.forEach((result, index) => {
        if (result.success) {
          console.log(`  ✅ [${index + 1}] ${result.address}: Success`);
        } else {
          console.log(`  ❌ [${index + 1}] ${result.address}: ${result.error}`);
        }
      });

      // Delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, batchConfig.batchDelayMs));
      }

    } catch (error) {
      console.log(`  ❌ Batch ${i + 1} failed: ${error}`);
    }
  }
}

/**
 * Demonstration of error classification and handling
 */
async function demonstrateErrorClassification(): Promise<void> {
  console.log('🔍 Demonstrating Error Classification\n');

  // Simulate different types of errors
  const errorExamples = [
    new Error('Network timeout occurred'),
    new Error('Connection reset by peer'),
    new Error('Rate limit exceeded - too many requests'),
    new Error('Insufficient funds for transaction'),
    new Error('Invalid transaction signature'),
    new Error('Custom program error: 0x1234'),
    new Error('Unknown blockchain error'),
  ];

  errorExamples.forEach((error, index) => {
    const enhancedError = Utils.classifyError(error);
    
    console.log(`Error ${index + 1}:`);
    console.log(`  Original: ${error.message}`);
    console.log(`  Type: ${enhancedError.type}`);
    console.log(`  Retryable: ${enhancedError.retryable}`);
    console.log(`  Enhanced: ${enhancedError.message}\n`);
  });
}

/**
 * Demonstration of transaction utilities
 */
async function demonstrateTransactionUtils(): Promise<void> {
  console.log('🛠️ Demonstrating Transaction Utilities\n');

  const rpc = createRpc(Constants.RPC_ENDPOINTS.DEVNET);

  // Mock transaction for demonstration
  const mockTransaction = {
    message: {
      instructions: [],
      addressTableLookups: [],
    }
  };

  console.log('🧪 Testing transaction simulation...');
  try {
    const canSimulate = await Utils.TransactionUtils.simulateTransaction(rpc, mockTransaction);
    console.log(`  Transaction simulation result: ${canSimulate ? 'Success' : 'Failed'}`);
  } catch (error) {
    console.log(`  ❌ Simulation failed: ${error}`);
  }

  console.log('\n💰 Estimating transaction fee...');
  try {
    const estimatedFee = await Utils.TransactionUtils.estimateFee(rpc, mockTransaction);
    console.log(`  Estimated fee: ${Core.TokenAmountUtils.formatAmount(estimatedFee, 9)} SOL`);
  } catch (error) {
    console.log(`  ❌ Fee estimation failed, using default: ${Core.TokenAmountUtils.formatAmount(5000n, 9)} SOL`);
  }

  console.log('\n⏱️ Testing confirmation waiting...');
  const mockSignature = 'mock_signature_for_testing';
  try {
    const confirmed = await Utils.TransactionUtils.waitForConfirmation(rpc, mockSignature, 5000);
    console.log(`  Confirmation result: ${confirmed ? 'Confirmed' : 'Timeout'}`);
  } catch (error) {
    console.log(`  ❌ Confirmation check failed: ${error}`);
  }
}

/**
 * Helper function to chunk arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Main demonstration function
 */
async function runTransactionHelpersDemo(): Promise<void> {
  console.log('🚀 Advanced Transaction Helpers Demo\n');
  console.log('This example demonstrates the comprehensive transaction handling capabilities\n');

  try {
    await demonstrateRetryMechanisms();
    await demonstrateCircuitBreaker();
    await demonstrateResilientTransactionSender();
    await demonstrateTransactionBatching();
    await demonstrateErrorClassification();
    await demonstrateTransactionUtils();
    
    console.log('🎉 All demonstrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Performance monitoring example
async function demonstratePerformanceMonitoring(): Promise<void> {
  console.log('📊 Performance Monitoring Example\n');

  const startTime = performance.now();
  let operationCount = 0;
  const errors: Error[] = [];

  const rpc = createRpc(Constants.RPC_ENDPOINTS.DEVNET);
  const transactionSender = new Utils.ResilientTransactionSender(rpc);

  // Perform multiple operations and measure performance
  const testOperations = Array.from({ length: 10 }, (_, i) => 
    async () => {
      const opStart = performance.now();
      try {
        await transactionSender.getAccountInfo(
          '11111111111111111111111111111111' as Core.Address
        );
        operationCount++;
        const opEnd = performance.now();
        console.log(`  Operation ${i + 1}: ${(opEnd - opStart).toFixed(2)}ms`);
      } catch (error) {
        errors.push(error as Error);
        console.log(`  Operation ${i + 1}: Failed`);
      }
    }
  );

  // Execute all operations
  await Promise.all(testOperations.map(op => op()));

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  // Display performance metrics
  console.log('\n📈 Performance Metrics:');
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Successful operations: ${operationCount}`);
  console.log(`  Failed operations: ${errors.length}`);
  console.log(`  Average time per operation: ${(totalTime / 10).toFixed(2)}ms`);
  console.log(`  Success rate: ${((operationCount / 10) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.message}`);
    });
  }
}

// Export functions for use in other examples
export {
  demonstrateRetryMechanisms,
  demonstrateCircuitBreaker,
  demonstrateResilientTransactionSender,
  demonstrateTransactionBatching,
  demonstrateErrorClassification,
  demonstrateTransactionUtils,
  demonstratePerformanceMonitoring,
  runTransactionHelpersDemo,
  type BatchConfig
};

// Main execution
if (import.meta.main) {
  runTransactionHelpersDemo()
    .then(() => {
      console.log('\n✅ Transaction helpers demo completed successfully');
      return demonstratePerformanceMonitoring();
    })
    .then(() => {
      console.log('\n✅ Performance monitoring demo completed');
    })
    .catch(error => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}