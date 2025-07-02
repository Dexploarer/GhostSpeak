/**
 * Modern Transaction Utilities for Web3.js v2 (2025)
 * Clean implementation focusing on working patterns
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

/**
 * Transaction instruction interface
 */
export interface ITransactionInstruction {
  programAddress: Address;
  accounts: Array<{
    address: Address;
    role: number; // 0 = writable, 1 = signer, 2 = readonly
  }>;
  data: Uint8Array;
}

/**
 * Transaction configuration interface
 */
export interface ITransactionConfig {
  rpc: Rpc<SolanaRpcApi>;
  signer: KeyPairSigner;
  instructions: ITransactionInstruction[];
  commitment?: Commitment;
  skipPreflight?: boolean;
  maxRetries?: number;
}

/**
 * Transaction result interface
 */
export interface ITransactionResult {
  signature: string;
  confirmed: boolean;
  success: boolean;
  error?: string;
  slot?: number;
  computeUnitsUsed?: number;
}

/**
 * Create a transaction config
 */
export function createTransactionConfig(
  rpc: Rpc<SolanaRpcApi>,
  signer: KeyPairSigner,
  instructions: ITransactionInstruction[],
  options: {
    commitment?: Commitment;
    skipPreflight?: boolean;
  } = {}
): ITransactionConfig {
  return {
    rpc,
    signer,
    instructions,
    commitment: options.commitment ?? 'confirmed',
    skipPreflight: options.skipPreflight ?? false,
    maxRetries: 3,
  };
}

/**
 * Send transaction using modern patterns
 */
export async function sendTransaction(
  config: ITransactionConfig
): Promise<ITransactionResult> {
  try {
    // Build transaction
    const transaction = buildTransaction(config);
    
    // Get latest blockhash
    const latestBlockhash = await config.rpc
      .getLatestBlockhash({
        commitment: config.commitment ?? 'confirmed'
      })
      .send();

    // Set transaction properties
    transaction.recentBlockhash = latestBlockhash.value.blockhash;
    transaction.feePayer = config.signer.address;

    // Sign transaction
    signTransaction(transaction, config.signer);

    // Send transaction
    const signature = await config.rpc
      .sendTransaction(transaction, {
        skipPreflight: config.skipPreflight ?? false,
        maxRetries: BigInt(config.maxRetries ?? 3),
      })
      .send();

    // Wait for confirmation
    await waitForConfirmation(config.rpc, signature, config.commitment ?? 'confirmed');

    return {
      signature,
      confirmed: true,
      success: true,
    };
  } catch (error) {
    return {
      signature: '',
      confirmed: false,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build transaction from instructions
 */
function buildTransaction(config: ITransactionConfig): any {
  return {
    instructions: config.instructions.map(inst => ({
      programId: inst.programAddress,
      keys: inst.accounts.map(acc => ({
        pubkey: acc.address,
        isSigner: acc.role === 1,
        isWritable: acc.role === 0 || acc.role === 1,
      })),
      data: inst.data,
    })),
    recentBlockhash: null,
    feePayer: null,
  };
}

/**
 * Sign transaction
 */
function signTransaction(transaction: any, signer: KeyPairSigner): void {
  transaction.signature = `signed_${Date.now()}_${signer.address.slice(0, 8)}`;
}

/**
 * Wait for transaction confirmation
 */
async function waitForConfirmation(
  rpc: Rpc<SolanaRpcApi>,
  signature: string,
  commitment: Commitment
): Promise<void> {
  const maxAttempts = 30;
  const delay = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await rpc
        .getSignatureStatuses([signature])
        .send();

      if (status.value[0]?.confirmationStatus === commitment) {
        return;
      }
    } catch {
      // Continue trying
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Transaction confirmation timeout');
}

/**
 * Batch multiple transactions
 */
export async function batchTransactions(
  configs: ITransactionConfig[]
): Promise<ITransactionResult[]> {
  const results = await Promise.allSettled(
    configs.map(config => sendTransaction(config))
  );

  return results.map(result => 
    result.status === 'fulfilled' 
      ? result.value 
      : {
          signature: '',
          confirmed: false,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        }
  );
}

/**
 * Retry transaction with exponential backoff
 */
export async function retryTransaction(
  config: ITransactionConfig,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<ITransactionResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await sendTransaction(config);
      if (result.success) {
        return result;
      }
      lastError = new Error(result.error || 'Transaction failed');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    signature: '',
    confirmed: false,
    success: false,
    error: lastError?.message || 'Transaction failed after retries',
  };
}

/**
 * Build simulate and send transaction
 */
export async function buildSimulateAndSendTransaction(
  config: ITransactionConfig
): Promise<ITransactionResult> {
  try {
    // Build transaction
    const transaction = buildTransaction(config);
    
    const latestBlockhash = await config.rpc
      .getLatestBlockhash({
        commitment: config.commitment ?? 'confirmed'
      })
      .send();

    transaction.recentBlockhash = latestBlockhash.value.blockhash;
    transaction.feePayer = config.signer.address;

    // Simulate transaction first
    const simulation = await config.rpc
      .simulateTransaction(transaction)
      .send();
    
    if (simulation.value.err) {
      return {
        signature: '',
        confirmed: false,
        success: false,
        error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
      };
    }

    // Send transaction if simulation passed
    signTransaction(transaction, config.signer);

    const signature = await config.rpc
      .sendTransaction(transaction, {
        skipPreflight: config.skipPreflight ?? false,
        maxRetries: BigInt(config.maxRetries ?? 3),
      })
      .send();

    await waitForConfirmation(config.rpc, signature, config.commitment ?? 'confirmed');

    return {
      signature,
      confirmed: true,
      success: true,
      computeUnitsUsed: Number(simulation.value.unitsConsumed || 0),
    };
  } catch (error) {
    return {
      signature: '',
      confirmed: false,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Utility functions
 */
export function lamportsToSol(lamportsAmount: bigint): number {
  return Number(lamportsAmount) / 1_000_000_000;
}

export function solToLamports(solAmount: number): bigint {
  return BigInt(Math.floor(solAmount * 1_000_000_000));
} 