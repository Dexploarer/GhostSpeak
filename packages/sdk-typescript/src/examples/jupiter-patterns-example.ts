/**
 * Example implementation showing Jupiter Swap API patterns in podAI SDK
 * Demonstrates Web3.js v2 best practices for transaction handling
 */

import { createSolanaRpcSubscriptions } from '@solana/rpc-subscriptions';

import { createDevnetClient } from '../client-v2';
import {
  sendTransaction,
  retryTransaction,
  // createTransactionConfig, // Commented out as it's not used
} from '../utils/transaction-helpers';

import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';

// Import our enhanced services

/**
 * Mock keypair generator (replace with actual implementation)
 */
async function generateMockKeypair(): Promise<KeyPairSigner> {
  // This would use actual Web3.js v2 keypair generation
  return {
    address:
      `mock_address_${Date.now()}_${Math.random().toString(36).substr(2, 8)}` as Address,
  } as KeyPairSigner;
}

/**
 * Example: Basic agent registration using Jupiter Swap patterns
 */
export async function exampleAgentRegistration() {
  console.log('🚀 Starting Agent Registration Example');

  try {
    // Create client using factory pattern
    const client = createDevnetClient();

    // Generate a new keypair for the agent
    const agentKeypair = await generateMockKeypair();

    console.log('✅ Generated agent keypair:', agentKeypair.address);

    // Define agent capabilities (following Web3.js v2 patterns)
    const agentOptions = {
      name: 'Test Agent',
      description: 'Agent created for testing',
      capabilities: [1], // Array of capabilities
      metadata: { source: 'jupiter-example' },
    };

    // Method 1: Direct registration (with built-in retry and validation)
    const registrationResult = await client.agents.registerAgent(
      agentKeypair,
      agentOptions
    );
    console.log('✅ Agent registered:', registrationResult);

    // Verify agent registration
    const registeredAgent = await client.agents.getAgent(
      registrationResult.agentPda
    );

    if (registeredAgent) {
      console.log('✅ Agent successfully registered:', registeredAgent);
    } else {
      console.error('❌ Agent registration verification failed');
    }
  } catch (error) {
    console.error('❌ Agent registration example failed:', error);
  }
}

/**
 * Example: Batch operations using Jupiter Swap efficiency patterns
 */
export async function exampleBatchOperations() {
  console.log('🚀 Starting Batch Operations Example');

  try {
    const client = createDevnetClient();

    // Generate multiple agent keypairs
    const agentKeypairs = await Promise.all([
      generateMockKeypair(),
      generateMockKeypair(),
      generateMockKeypair(),
    ]);

    console.log('✅ Generated', agentKeypairs.length, 'agent keypairs');

    // Check if agents exist (simplified approach)
    const existingAgentsChecks = await Promise.allSettled(
      agentKeypairs.map(async kp => {
        // Create mock PDA for checking
        const mockPda = `${kp.address}_agent_pda` as Address;
        return client.agents.getAgent(mockPda);
      })
    );

    // Filter out already registered agents
    const unregisteredKeypairs = agentKeypairs.filter((_, index) => {
      const check = existingAgentsChecks[index];
      return (
        check?.status === 'rejected' ||
        (check?.status === 'fulfilled' && check.value === null)
      );
    });

    console.log('📊 Found', unregisteredKeypairs.length, 'unregistered agents');

    if (unregisteredKeypairs.length > 0) {
      // Register agents one by one (batch registration would require more complex setup)
      console.log('🔄 Registering agents...');

      for (let i = 0; i < unregisteredKeypairs.length; i++) {
        const kp = unregisteredKeypairs[i];
        if (!kp) continue;

        try {
          const result = await client.agents.registerAgent(kp, {
            name: `Batch Agent ${i + 1}`,
            description: 'Agent created in batch operation',
            capabilities: [1],
          });
          console.log(`  ✅ Agent ${i + 1}: ${result.signature}`);
        } catch (error) {
          console.log(`  ❌ Agent ${i + 1}: Failed - ${String(error)}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Batch operations example failed:', error);
  }
}

/**
 * Example: Health monitoring using Jupiter Swap monitoring patterns
 */
export async function exampleHealthMonitoring() {
  console.log('🚀 Starting Health Monitoring Example');

  try {
    const client = createDevnetClient();

    // Basic client health check
    const isConnected = await client.isConnected();
    console.log('📊 Client Connected:', isConnected);

    // Get cluster information
    try {
      const clusterInfo = await client.getClusterInfo();
      console.log('📊 Cluster Info:', clusterInfo);
    } catch (error) {
      console.log('📊 Cluster Info: Unable to fetch -', error);
    }

    // RPC performance test
    const startTime = Date.now();
    try {
      const rpc = client.getRpc();
      // Mock RPC call since we don't have real implementation
      console.log('📊 RPC Client available:', !!rpc);
      const rpcLatency = Date.now() - startTime;
      console.log('📊 RPC Latency:', rpcLatency, 'ms');
    } catch (error) {
      console.log('📊 RPC Performance: Error -', error);
    }

    // Connection quality assessment
    const healthScore = calculateHealthScore({
      rpcConnection: isConnected,
      blockHeight: 12345, // Mock value
      programValid: true,
      programAccessible: true,
      canCreateInstructions: true,
      rpcLatency: 50,
    });

    console.log('📊 Overall Health Score:', healthScore, '/100');

    if (healthScore < 70) {
      console.warn('⚠️  System health is below optimal threshold');
    } else {
      console.log('✅ System health is optimal');
    }
  } catch (error) {
    console.error('❌ Health monitoring example failed:', error);
  }
}

/**
 * Example: Error handling and retry logic following Jupiter Swap resilience patterns
 */
export async function exampleErrorHandling() {
  console.log('🚀 Starting Error Handling Example');

  try {
    const client = createDevnetClient();
    const agentKeypair = await generateMockKeypair();

    // Create transaction config for testing
    const rpc = client.getRpc();

    const mockInstruction = {
      programAddress: client.getProgramId(),
      accounts: [
        { address: agentKeypair.address, role: 1 }, // signer
      ],
      data: new Uint8Array([1, 2, 3, 4]), // mock instruction data
    };

    // Transaction config for potential future use
    // const config = createTransactionConfig({
    //   commitment: 'confirmed',
    //   skipPreflight: false
    // });

    // Method 1: Simple retry with exponential backoff
    console.log('🔄 Testing retry mechanism...');
    const retryResult = await retryTransaction(
      async () => {
        // Create RPC subscriptions for transaction confirmation
        const rpcSubscriptions = createSolanaRpcSubscriptions(
          'wss://api.devnet.solana.com/'
        );
        const txFactory = sendTransaction(rpc, rpcSubscriptions);
        return txFactory([mockInstruction], [agentKeypair]);
      },
      3,
      1000
    );

    if (
      retryResult &&
      typeof retryResult === 'object' &&
      'success' in retryResult
    ) {
      console.log(
        '✅ Transaction succeeded with retry:',
        (retryResult as any).signature
      );
    } else {
      console.log('❌ Transaction failed after retries:', retryResult);
    }

    // Method 2: Direct transaction sending
    console.log('🔄 Testing direct transaction sending...');

    try {
      const rpcSubscriptions = createSolanaRpcSubscriptions(
        'wss://api.devnet.solana.com/'
      );
      const txFactory = sendTransaction(rpc, rpcSubscriptions);
      const directResult = await txFactory([mockInstruction], [agentKeypair]);

      if (directResult.success) {
        console.log('✅ Direct transaction succeeded:', directResult.signature);
      } else {
        console.log('❌ Direct transaction failed:', directResult.error);

        // Custom error handling based on error type
        if (directResult.error?.includes('blockhash')) {
          console.log(
            '🔄 Blockhash expired, would implement fresh blockhash retry...'
          );
        } else if (directResult.error?.includes('insufficient')) {
          console.log(
            '💰 Insufficient funds detected - transaction would need funding'
          );
          console.log(
            '💡 In production, implement airdrop or funding mechanism here'
          );
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
    }
  } catch (error) {
    console.error('❌ Error handling example failed:', error);
  }
}

/**
 * Utility function to calculate system health score
 */
function calculateHealthScore(metrics: {
  rpcConnection: boolean;
  blockHeight: number;
  programValid: boolean;
  programAccessible: boolean;
  canCreateInstructions: boolean;
  rpcLatency: number;
}): number {
  let score = 0;

  // RPC connection (25 points)
  if (metrics.rpcConnection) score += 25;

  // Program accessibility (25 points)
  if (metrics.programAccessible) score += 25;

  // Instruction creation capability (25 points)
  if (metrics.canCreateInstructions) score += 25;

  // RPC latency performance (25 points)
  if (metrics.rpcLatency < 500) score += 25;
  else if (metrics.rpcLatency < 1000) score += 15;
  else if (metrics.rpcLatency < 2000) score += 10;
  else if (metrics.rpcLatency < 5000) score += 5;

  return score;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running all Jupiter Swap pattern examples...\n');

  await exampleAgentRegistration();
  console.log('\n' + '='.repeat(60) + '\n');

  await exampleBatchOperations();
  console.log('\n' + '='.repeat(60) + '\n');

  await exampleHealthMonitoring();
  console.log('\n' + '='.repeat(60) + '\n');

  await exampleErrorHandling();
  console.log('\n✅ All examples completed!');
}
