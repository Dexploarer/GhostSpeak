/**
 * Example implementation showing Jupiter Swap API patterns in podAI SDK
 * Demonstrates Web3.js v2 best practices for transaction handling
 */

import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';

// Import our enhanced services
import { PodAIClientV2, createDevnetClient } from '../client-v2';
import { 
  buildSimulateAndSendTransaction,
  batchTransactions,
  retryTransaction,
  createTransactionConfig
} from '../utils/transaction-utils';

/**
 * Example: Basic agent registration using Jupiter Swap patterns
 */
export async function exampleAgentRegistration() {
  console.log('🚀 Starting Agent Registration Example');

  try {
    // Create client using factory pattern
    const client = createDevnetClient();

    // Generate a new keypair for the agent
    const agentKeypair = await client.generateKeypair();
    
    console.log('✅ Generated agent keypair:', agentKeypair.address);

    // Define agent capabilities (following Web3.js v2 patterns)
    const agentOptions = {
      capabilities: 1, // Basic capability
      metadataUri: 'https://podai.com/agent-metadata.json'
    };

    // Method 1: Direct registration (with built-in retry and validation)
    const signature = await client.agents.registerAgent(agentKeypair, agentOptions);
    console.log('✅ Agent registered with signature:', signature);

    // Method 2: Pre-simulation before registration
    const simulationResult = await client.agents.simulateAgentRegistration(
      agentKeypair, 
      agentOptions
    );
    
    if (simulationResult.success) {
      console.log('✅ Simulation successful. Compute units:', simulationResult.computeUnitsUsed);
    } else {
      console.error('❌ Simulation failed:', simulationResult.error);
      return;
    }

    // Verify agent registration
    const agentPDA = await client.agents.getAgentPDA(agentKeypair.address);
    const registeredAgent = await client.agents.getAgent(agentPDA);
    
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
      client.generateKeypair(),
      client.generateKeypair(),
      client.generateKeypair()
    ]);

    console.log('✅ Generated', agentKeypairs.length, 'agent keypairs');

    // Get PDAs for all agents
    const agentPDAs = await Promise.all(
      agentKeypairs.map(kp => client.agents.getAgentPDA(kp.address))
    );

    // Batch query existing agents (efficient RPC usage)
    const existingAgents = await client.agents.batchGetAgents(agentPDAs);
    
    console.log('✅ Batch query completed. Results:', existingAgents.size);
    
    // Filter out already registered agents
    const unregisteredKeypairs = agentKeypairs.filter((kp, index) => {
      const pda = agentPDAs[index];
      return !existingAgents.get(String(pda));
    });

    console.log('📊 Found', unregisteredKeypairs.length, 'unregistered agents');

    if (unregisteredKeypairs.length > 0) {
      // Batch register agents using transaction utilities
      const rpc = client.getRpc();
      const transactionConfigs = await Promise.all(
        unregisteredKeypairs.map(async (kp) => {
          const { getRegisterAgentInstructionAsync } = await import('../generated-v2/instructions/registerAgent');
          const instruction = await getRegisterAgentInstructionAsync({
            signer: kp,
            capabilities: BigInt(1),
            metadataUri: `https://podai.com/agent-${kp.address}.json`,
          }, { programAddress: client.getProgramId() });

          return createTransactionConfig(rpc, kp, [instruction]);
        })
      );

      // Execute batch transactions
      const results = await batchTransactions(transactionConfigs);
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Batch registration completed: ${successCount}/${results.length} successful`);
      
      // Log results
      results.forEach((result, index) => {
        if (result.success) {
          console.log(`  ✅ Agent ${index + 1}: ${result.signature}`);
        } else {
          console.log(`  ❌ Agent ${index + 1}: ${result.error}`);
        }
      });
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

    // Overall client health check
    const clientHealth = await client.healthCheck();
    console.log('📊 Client Health:', clientHealth);

    // Service-specific health checks
    const agentServiceHealth = await client.agents.healthCheck();
    console.log('📊 Agent Service Health:', agentServiceHealth);

    // RPC performance test
    const startTime = Date.now();
    const slot = await client.getRpc().getSlot().send();
    const rpcLatency = Date.now() - startTime;
    
    console.log('📊 RPC Performance:');
    console.log('  Current Slot:', slot);
    console.log('  Latency:', rpcLatency, 'ms');

    // Connection quality assessment
    const healthScore = calculateHealthScore({
      ...clientHealth,
      ...agentServiceHealth,
      rpcLatency
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
    const agentKeypair = await client.generateKeypair();

    // Create transaction config with intentionally challenging parameters
    const rpc = client.getRpc();
    const { getRegisterAgentInstructionAsync } = await import('../generated-v2/instructions/registerAgent');
    
    const instruction = await getRegisterAgentInstructionAsync({
      signer: agentKeypair,
      capabilities: BigInt(1),
      metadataUri: 'https://podai.com/test-agent.json',
    }, { programAddress: client.getProgramId() });

    const config = createTransactionConfig(rpc, agentKeypair, [instruction], {
      commitment: 'finalized', // More strict commitment for testing
      skipPreflight: false
    });

    // Method 1: Simple retry with exponential backoff
    console.log('🔄 Testing retry mechanism...');
    const retryResult = await retryTransaction(config, 3, 1000);
    
    if (retryResult.success) {
      console.log('✅ Transaction succeeded with retry:', retryResult.signature);
    } else {
      console.log('❌ Transaction failed after retries:', retryResult.error);
    }

    // Method 2: Manual error handling with custom logic
    console.log('🔄 Testing manual error handling...');
    
    try {
      const directResult = await buildSimulateAndSendTransaction(config);
      
      if (directResult.success) {
        console.log('✅ Direct transaction succeeded:', directResult.signature);
      } else {
        console.log('❌ Direct transaction failed:', directResult.error);
        
        // Custom error handling based on error type
        if (directResult.error?.includes('blockhash')) {
          console.log('🔄 Blockhash expired, implementing fresh blockhash retry...');
          const freshConfig = createTransactionConfig(rpc, agentKeypair, [instruction], {
            commitment: 'finalized',
            skipPreflight: false
          });
          const retryResult = await retryTransaction(freshConfig, 2, 500);
          console.log('🔄 Retry result:', retryResult.success ? 'Success' : 'Failed');
        } else if (directResult.error?.includes('insufficient')) {
          console.log('💰 Insufficient funds detected - transaction would need funding');
          console.log('💡 In production, implement airdrop or funding mechanism here');
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

