/**
 * Transaction utilities following Jupiter Swap API and Web3.js v2 patterns
 * Provides common functionality for building, simulating, and sending transactions
 */

import { pipe } from '@solana/functional';
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  createSolanaRpcSubscriptions
} from '@solana/kit';

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { KeyPairSigner } from '@solana/signers';
import type { Commitment } from '@solana/rpc-types';
import type { TransactionMessage, TransactionMessageInstruction } from '@solana/transactions';

/**
 * Configuration for transaction building
 */
export interface TransactionConfig {
  rpc: Rpc<SolanaRpcApi>;
  signer: KeyPairSigner;
  instructions: TransactionMessageInstruction[];
  commitment?: Commitment;
  wsEndpoint?: string;
  skipPreflight?: boolean;
  computeBudget?: number;
}

/**
 * Result of transaction simulation
 */
export interface SimulationResult {
  success: boolean;
  error?: string;
  computeUnitsUsed?: number;
  logs?: string[];
}

/**
 * Result of transaction execution
 */
export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
  computeUnitsUsed?: number;
}

/**
 * Build a versioned transaction using the pipe pattern
 * Following Jupiter Swap API architecture
 */
export async function buildTransaction(
  config: TransactionConfig
): Promise<TransactionMessage> {
  // Get the latest blockhash for transaction lifetime
  const { value: latestBlockhash } = await config.rpc.getLatestBlockhash().send();

  // Build the transaction using the pipe pattern
  const transaction = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(config.signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(config.instructions, tx)
  );

  return transaction;
}

/**
 * Simulate a transaction before sending
 * Following Jupiter Swap validation patterns
 */
export async function simulateTransaction(
  config: TransactionConfig
): Promise<SimulationResult> {
  try {
    // Build the transaction
    const transaction = await buildTransaction(config);

    // Sign the transaction for simulation
    const signedTransaction = await signTransactionMessageWithSigners(transaction);

    // Simulate the transaction
    const simulation = await config.rpc.simulateTransaction(signedTransaction, {
      commitment: config.commitment || 'confirmed',
      replaceRecentBlockhash: true,
      sigVerify: false,
    }).send();

    if (simulation.value.err) {
      return {
        success: false,
        error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
        logs: simulation.value.logs || []
      };
    }

    return {
      success: true,
      computeUnitsUsed: simulation.value.unitsConsumed || 0,
      logs: simulation.value.logs || []
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Send and confirm a transaction
 * Following Jupiter Swap execution patterns
 */
export async function sendAndConfirmTransaction(
  config: TransactionConfig
): Promise<TransactionResult> {
  try {
    // Build the transaction
    const transaction = await buildTransaction(config);

    // Sign the transaction
    const signedTransaction = await signTransactionMessageWithSigners(transaction);

    // Create WebSocket URL from RPC URL or use provided wsEndpoint
    const wsUrl = config.wsEndpoint || 'wss://api.devnet.solana.com';
    const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

    // Create the send and confirm transaction factory
    const sendAndConfirm = sendAndConfirmTransactionFactory({ 
      rpc: config.rpc, 
      rpcSubscriptions 
    });

    // Send and confirm the transaction
    await sendAndConfirm(signedTransaction, {
      commitment: config.commitment || 'confirmed',
      skipPreflight: config.skipPreflight || false
    });

    // Get the transaction signature
    const signature = getSignatureFromTransaction(signedTransaction);
    
    return {
      signature,
      success: true
    };

  } catch (error) {
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Build, simulate, and send transaction with full validation
 * Following Jupiter Swap complete transaction flow
 */
export async function buildSimulateAndSendTransaction(
  config: TransactionConfig
): Promise<TransactionResult> {
  try {
    // First, simulate the transaction
    const simulationResult = await simulateTransaction(config);
    
    if (!simulationResult.success) {
      return {
        signature: '',
        success: false,
        error: `Simulation failed: ${simulationResult.error}`,
        computeUnitsUsed: simulationResult.computeUnitsUsed
      };
    }

    console.log(`✅ Transaction simulation successful. Compute units: ${simulationResult.computeUnitsUsed}`);

    // If simulation passes, send the actual transaction
    const result = await sendAndConfirmTransaction(config);
    
    if (result.success) {
      console.log(`✅ Transaction confirmed: ${result.signature}`);
    }

    return {
      ...result,
      computeUnitsUsed: simulationResult.computeUnitsUsed
    };

  } catch (error) {
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Batch multiple transactions efficiently
 * Following Jupiter Swap batching patterns
 */
export async function batchTransactions(
  configs: TransactionConfig[]
): Promise<TransactionResult[]> {
  const results: TransactionResult[] = [];

  try {
    // Execute all transactions in parallel using Promise.allSettled
    const promises = configs.map(config => 
      buildSimulateAndSendTransaction(config).catch(error => ({
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }))
    );

    const batchResults = await Promise.allSettled(promises);

    // Process results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          signature: '',
          success: false,
          error: `Transaction ${index} failed: ${result.reason}`
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Batch transaction failed:', error);
    // Return failed results for all transactions
    return configs.map(() => ({
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }));
  }
}

/**
 * Utility function to create a basic transaction config
 */
export function createTransactionConfig(
  rpc: Rpc<SolanaRpcApi>,
  signer: KeyPairSigner,
  instructions: TransactionMessageInstruction[],
  options?: {
    commitment?: Commitment;
    wsEndpoint?: string;
    skipPreflight?: boolean;
  }
): TransactionConfig {
  return {
    rpc,
    signer,
    instructions,
    commitment: options?.commitment || 'confirmed',
    wsEndpoint: options?.wsEndpoint,
    skipPreflight: options?.skipPreflight || false
  };
}

/**
 * Utility function to retry a transaction on failure
 * Following Jupiter Swap resilience patterns
 */
export async function retryTransaction(
  config: TransactionConfig,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<TransactionResult> {
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Transaction attempt ${attempt}/${maxRetries}`);
      
      const result = await buildSimulateAndSendTransaction(config);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error || `Attempt ${attempt} failed`;
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Transaction attempt ${attempt} failed:`, lastError);
      
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    signature: '',
    success: false,
    error: `Transaction failed after ${maxRetries} attempts. Last error: ${lastError}`
  };
}