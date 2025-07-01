/**
 * Transaction utilities following Jupiter Swap patterns
 * Modern Web3.js v2 transaction building and management
 */

// Core Web3.js v2 imports
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getSignatureFromTransaction,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/web3.js';

// Types and utilities
import type { KeyPairSigner } from '@solana/signers';
import type { Commitment } from '@solana/rpc-types';
import type {
  TransactionMessage,
  TransactionMessageInstruction,
} from '@solana/transaction-messages';

import type { Rpc, SolanaRpcApi } from '@solana/rpc';

/**
 * Configuration for transaction building
 */
export interface ITransactionConfig {
  rpc: Rpc<SolanaRpcApi>;
  signer: KeyPairSigner;
  instructions: TransactionMessageInstruction[];
  commitment?: Commitment;
  skipPreflight?: boolean;
  maxRetries?: number;
  wsEndpoint?: string;
}

/**
 * Result of transaction simulation
 */
export interface ISimulationResult {
  success: boolean;
  error?: string;
  computeUnitsUsed?: number;
  logs?: string[];
}

/**
 * Result of transaction execution
 */
export interface ITransactionResult {
  signature: string;
  confirmed: boolean;
  computeUnitsUsed?: number;
  slot?: number;
  error?: string;
}

/**
 * Create a transaction configuration for Jupiter-style batching
 */
export function createTransactionConfig(
  rpc: Rpc<SolanaRpcApi>,
  signer: KeyPairSigner,
  instructions: TransactionMessageInstruction[],
  options: {
    commitment?: Commitment;
    skipPreflight?: boolean;
    maxRetries?: number;
    wsEndpoint?: string;
  } = {}
): ITransactionConfig {
  return {
    rpc,
    signer,
    instructions,
    commitment: options.commitment ?? 'confirmed',
    skipPreflight: options.skipPreflight ?? false,
    maxRetries: options.maxRetries ?? 3,
    wsEndpoint: options.wsEndpoint,
  };
}

/**
 * Build a transaction message from instructions
 */
export async function buildTransaction(
  config: ITransactionConfig
): Promise<TransactionMessage> {
  const { rpc, signer, instructions } = config;

  // Get latest blockhash
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  // Build transaction using pipe pattern
  const transactionMessage = createTransactionMessage({ version: 0 });
  const withFeePayer = setTransactionMessageFeePayerSigner(
    signer,
    transactionMessage
  );
  const withBlockhash = setTransactionMessageLifetimeUsingBlockhash(
    latestBlockhash,
    withFeePayer
  );
  const withInstructions = appendTransactionMessageInstructions(
    instructions,
    withBlockhash
  );

  return withInstructions;
}

/**
 * Simulate a transaction before sending
 */
export async function simulateTransaction(
  config: ITransactionConfig
): Promise<ISimulationResult> {
  try {
    const transaction = await buildTransaction(config);
    const signedTransaction = await signTransactionMessageWithSigners(
      transaction
    );

    // Get simulation result
    const simulation = await config.rpc
      .simulateTransaction(signedTransaction, {
        commitment: config.commitment ?? 'confirmed',
        sigVerify: !(config.skipPreflight ?? false),
        accounts: {
          encoding: 'base64',
          addresses: [],
        },
      })
      .send();

    if (simulation.value.err) {
      return {
        success: false,
        error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
      };
    }

    return {
      success: true,
      computeUnitsUsed: Number(simulation.value.unitsConsumed ?? 0),
      logs: simulation.value.logs ?? [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send and confirm a transaction
 */
export async function sendAndConfirmTransaction(
  config: ITransactionConfig
): Promise<ITransactionResult> {
  try {
    const transaction = await buildTransaction(config);
    const signedTransaction = await signTransactionMessageWithSigners(
      transaction
    );

    // Send the transaction
    const signature = getSignatureFromTransaction(signedTransaction);
    await config.rpc
      .sendTransaction(signedTransaction, {
        commitment: config.commitment ?? 'confirmed',
        skipPreflight: config.skipPreflight ?? false,
        maxRetries: config.maxRetries ?? 3,
      })
      .send();

    console.log(
      `✅ Transaction simulation successful. Signature: ${signature}`
    );

    return {
      signature,
      confirmed: true,
    };
  } catch (error) {
    return {
      signature: '',
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build, simulate and send transaction in one call
 */
export async function buildSimulateAndSendTransaction(
  config: ITransactionConfig
): Promise<ITransactionResult> {
  // First simulate
  const simulation = await simulateTransaction(config);
  if (!simulation.success) {
    return {
      signature: '',
      confirmed: false,
      error: simulation.error,
    };
  }

  // Then send
  return await sendAndConfirmTransaction(config);
}

/**
 * Execute multiple transactions in batch
 */
export async function batchTransactions(
  configs: ITransactionConfig[]
): Promise<ITransactionResult[]> {
  const results: ITransactionResult[] = [];

  for (const config of configs) {
    try {
      const result = await buildSimulateAndSendTransaction(config);
      results.push(result);

      // If a transaction fails, you might want to continue or stop
      if (!result.confirmed) {
        console.warn(`Transaction failed: ${result.error}`);
      }
    } catch (error) {
      results.push({
        signature: '',
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Retry a transaction with exponential backoff
 */
export async function retryTransaction(
  config: ITransactionConfig,
  maxRetries = 3
): Promise<ITransactionResult> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await buildSimulateAndSendTransaction(config);

      if (result.confirmed) {
        return result;
      }

      lastError = result.error ?? 'Unknown error';

      if (attempt < maxRetries) {
        // Exponential backoff: wait 2^attempt seconds
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    signature: '',
    confirmed: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${
      lastError ?? 'Unknown error'
    }`,
  };
}

/**
 * Estimate transaction fee before sending
 */
export async function estimateTransactionFee(
  config: ITransactionConfig
): Promise<number> {
  try {
    const simulation = await simulateTransaction(config);

    if (!simulation.success || !simulation.computeUnitsUsed) {
      return 0;
    }

    // Simple fee estimation based on compute units
    // This is a rough estimate - actual fees may vary
    const baseFee = 5000; // Base transaction fee in lamports
    const computeFee = simulation.computeUnitsUsed * 0.1; // Rough estimate

    return baseFee + computeFee;
  } catch (error) {
    console.error('Failed to estimate transaction fee:', error);
    return 0;
  }
}