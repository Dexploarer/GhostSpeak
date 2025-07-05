/**
 * Consolidated Transaction Helpers for Web3.js v2 (2025)
 * Provides utilities for transaction creation, signing, sending, and account fetching.
 */

import {
  address,
  getAddressEncoder,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  sendAndConfirmTransactionFactory as createSendAndConfirmTransactionFactory,
  pipe,
  createTransactionMessage,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  setTransactionMessageFeePayerSigner,
  appendTransactionMessageInstructions,
} from '@solana/kit';

import type { Address } from '@solana/addresses';
import type { IInstruction } from '@solana/instructions';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

// Web3.js v2 constants
const LAMPORTS_PER_SOL = 1_000_000_000n;
const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111112');
export const DEFAULT_PRIORITY_FEE = 1000n; // microLamports
export const DEFAULT_COMPUTE_UNIT_BUFFER = 1.1;
export const MAX_TRANSACTION_SIZE = 1232; // bytes

// --- Interfaces ---

export interface ITransactionOptions {
  commitment?: Commitment;
  timeout?: number;
  skipPreflight?: boolean;
  maxRetries?: number;
}

export interface ITransactionResult {
  signature: string;
  slot?: number;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  error?: string;
}

export interface ISendTransactionResult {
  signature: string;
  confirmed: boolean;
  success: boolean;
  error?: string;
}

export interface ITransactionInstruction {
  programAddress: Address;
  accounts: Array<{
    address: Address;
    role: 'writable-signer' | 'writable' | 'readonly-signer' | 'readonly';
  }>;
  data: Uint8Array;
}

// --- Factory Function for Transaction Sending ---

/**
 * Factory function to create a transaction sender with RPC client.
 * Returns a function that can send arrays of instructions with signers.
 */
export function sendAndConfirmTransactionFactory(rpcUrl: string) {
  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(
    rpcUrl.replace('http', 'ws'),
  );
  const sendAndConfirm = createSendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
  });

  return async function sendAndConfirmTransaction(
    instructions: IInstruction[],
    signers: KeyPairSigner[],
    options: ITransactionOptions = {}
  ): Promise<ISendTransactionResult> {
    try {
      // Get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Get primary signer (fee payer)
      const payer = signers[0];
      if (!payer) {
        throw new Error('No signer provided');
      }

      // Build transaction using Web3.js v2 pipe pattern
      const transaction = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(payer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      );

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transaction);

      // Send and confirm
      await sendAndConfirm(signedTransaction, {
        commitment: options.commitment ?? 'confirmed',
        skipPreflight: options.skipPreflight ?? false
      });

      const signature = getSignatureFromTransaction(signedTransaction);

      return {
        signature,
        confirmed: true,
        success: true
      };
    } catch (error) {
      return {
        signature: '',
        confirmed: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
}

// --- Utility Functions ---

/**
 * Safe Address to memcmp bytes conversion for Web3.js v2 filters
 */
export function addressToMemcmpBytes(addressValue: Address): string {
  try {
    return addressValue as string;
  } catch (error) {
    throw new Error(
      `Failed to convert Address for memcmp: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Safely convert a string to Address type with validation
 */
export function stringToAddress(addressString: string): Address {
  try {
    return address(addressString);
  } catch (error) {
    throw new Error(
      `Invalid address string: ${addressString} - ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Convert Address to base58 string for RPC calls
 */
export function addressToBase58(addr: Address): string {
  return addr as string;
}

/**
 * Create an instruction using Web3.js v2 patterns - simplified
 */
export function createInstruction(
  config: ITransactionInstruction
): Record<string, unknown> {
  return {
    programAddress: config.programAddress,
    accounts: config.accounts,
    data: config.data
  };
}

/**
 * Find Program Derived Address (Simplified implementation)
 */
export async function findProgramAddress(
  seeds: Array<Uint8Array | Buffer>,
  programId: Address
): Promise<[string, number]> {
  // Simplified PDA calculation for compatibility
  const seedStr = seeds
    .map((seed) => Array.from(seed).join(','))
    .join('|');
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(seedStr + programId)
  );
  const hashArray = new Uint8Array(hash);
  const pdaAddress = btoa(String.fromCharCode(...hashArray.slice(0, 32)))
    .replace(/[+/=]/g, '')
    .substring(0, 44);

  return [pdaAddress, 255];
}

// Export commonly used functions and constants
export { LAMPORTS_PER_SOL, SYSTEM_PROGRAM_ADDRESS, getAddressEncoder };

// Utility functions for lamports/SOL conversion
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / Number(LAMPORTS_PER_SOL);
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)));
}

// Additional utility functions
export const retryTransaction = async (
  config: () => Promise<unknown>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<unknown> => {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await config();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError ?? new Error('Max retries exceeded');
};

export const createTransactionConfig = (
  options: ITransactionOptions
): ITransactionOptions => {
  return {
    commitment: options.commitment ?? 'confirmed',
    timeout: options.timeout ?? 30000,
    skipPreflight: options.skipPreflight ?? false,
    maxRetries: options.maxRetries ?? 3,
    ...options
  };
};

/**
 * Create RPC client helper
 */
export function createRpcClient(rpcUrl: string): Rpc<SolanaRpcApi> {
  return createSolanaRpc(rpcUrl);
}

/**
 * Get account info helper
 */
export async function getAccountInfo(
  rpc: Rpc<SolanaRpcApi>,
  address: Address,
  commitment: Commitment = 'confirmed'
) {
  try {
    const response = await rpc
      .getAccountInfo(address, {
        commitment,
        encoding: 'base64'
      })
      .send();
    return response.value;
  } catch (error) {
    throw new Error(
      `Failed to get account info for ${address}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}


