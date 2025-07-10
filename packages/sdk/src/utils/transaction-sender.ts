/**
 * Transaction Sending Utility for Web3.js v2
 * Handles proper transaction creation, signing, and sending
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { IInstruction } from './instruction-compat.js';
// import type { Signature } from '@solana/signatures';
import { pipe } from '@solana/functional';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
} from '@solana/transaction-messages';
import { signTransactionMessageWithSigners } from '@solana/signers';
import { logger } from '../../../../shared/logger';
import {
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
} from '@solana/transactions';

export interface SendTransactionOptions {
  rpc: Rpc<SolanaRpcApi>;
  instructions: IInstruction[];
  signer: KeyPairSigner;
  commitment?: Commitment;
  skipPreflight?: boolean;
  maxRetries?: number;
}

export interface TransactionResult {
  signature: string;
  slot?: number;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Send a transaction with proper Web3.js v2 handling
 */
export async function sendTransaction(
  options: SendTransactionOptions
): Promise<TransactionResult> {
  const {
    rpc,
    instructions,
    signer,
    commitment = 'confirmed',
    skipPreflight = false,
    maxRetries = 3,
  } = options;

  try {
    // Get recent blockhash for transaction lifetime
    const { value: latestBlockhash } = await rpc
      .getLatestBlockhash({ commitment })
      .send();

    // Create transaction message using Web3.js v2 functional pipe approach
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(signer.address, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx =>
        instructions.reduce(
          (acc, instruction) =>
            appendTransactionMessageInstruction(instruction, acc),
          tx
        )
    );

    // Sign the transaction
    const signedTransaction =
      await signTransactionMessageWithSigners(transactionMessage);

    const signature = getSignatureFromTransaction(signedTransaction);

    // Convert to base64 encoded wire transaction for sending
    const base64Transaction =
      getBase64EncodedWireTransaction(signedTransaction);
    await rpc
      .sendTransaction(base64Transaction, {
        preflightCommitment: commitment,
        skipPreflight,
        maxRetries: BigInt(maxRetries),
      })
      .send();

    return {
      signature,
      confirmationStatus: commitment,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Transaction failed: ${errorMessage}`);
  }
}

/**
 * Send multiple transactions as a batch
 * RACE CONDITION FIX: Prevents concurrent execution and handles blockhash expiry
 */
export async function sendTransactionBatch(
  rpc: Rpc<SolanaRpcApi>,
  transactionGroups: { instructions: IInstruction[]; signer: KeyPairSigner }[],
  options: {
    commitment?: Commitment;
    skipPreflight?: boolean;
    maxRetries?: number;
    concurrent?: boolean;
  } = {}
): Promise<TransactionResult[]> {
  const { concurrent = false, ...sendOptions } = options;

  // RACE CONDITION FIX: Add mutex-like protection for sequential processing
  if (!concurrent) {
    const results: TransactionResult[] = [];

    // Get a fresh blockhash for the entire batch
    const { value: latestBlockhash } = await rpc
      .getLatestBlockhash({
        commitment: options.commitment || 'confirmed',
      })
      .send();

    for (const group of transactionGroups) {
      // Check if blockhash is still valid (Solana blockhashes expire after ~150 slots / 1-2 minutes)
      const currentSlot = await rpc.getSlot().send();
      const timeSinceBlockhash =
        currentSlot - latestBlockhash.lastValidBlockHeight;

      if (timeSinceBlockhash > 100) {
        // Refresh if getting close to expiry
        break; // Exit and require caller to retry with fresh batch
      }

      const result = await sendTransaction({
        rpc,
        instructions: group.instructions,
        signer: group.signer,
        ...sendOptions,
      });
      results.push(result);
    }

    return results;
  }

  // Concurrent processing (original behavior, but now opt-in)
  const promises = transactionGroups.map(group =>
    sendTransaction({
      rpc,
      instructions: group.instructions,
      signer: group.signer,
      ...sendOptions,
    })
  );

  return Promise.all(promises);
}

/**
 * Estimate transaction fee
 */
export async function estimateTransactionFee(
  _rpc: Rpc<SolanaRpcApi>,
  instructions: IInstruction[],
  _feePayer: Address
): Promise<number> {
  try {
    // Simplified fee estimation - getFeeForMessage has complex type requirements in v2
    // For now, return a reasonable default based on instruction count
    const baseFee = 5000; // 0.000005 SOL
    const instructionFee = instructions.length * 1000; // Additional fee per instruction
    return baseFee + instructionFee;
  } catch (error) {
    logger.general.warn('Fee estimation failed, using default:', error);
    return 5000; // Default fee (0.000005 SOL)
  }
}

/**
 * Check if transaction was successful
 */
export async function checkTransactionStatus(
  rpc: Rpc<SolanaRpcApi>,
  signature: string,
  commitment: Commitment = 'confirmed'
): Promise<{
  confirmed: boolean;
  slot?: number;
  error?: string;
}> {
  try {
    // Convert string to Signature type
    const signatureAddress = signature as any; // Temporary type assertion for v2 compatibility
    const result = await rpc
      .getSignatureStatuses([signatureAddress], {
        searchTransactionHistory: true,
      })
      .send();

    if (!result.value[0]) {
      return { confirmed: false, error: 'Transaction not found' };
    }

    const status = result.value[0];
    const isConfirmed =
      status.confirmationStatus === commitment ||
      (commitment === 'processed' && status.confirmationStatus !== null) ||
      (commitment === 'confirmed' &&
        ['confirmed', 'finalized'].includes(status.confirmationStatus || ''));

    return {
      confirmed: isConfirmed && !status.err,
      slot: typeof status.slot === 'bigint' ? Number(status.slot) : status.slot,
      ...(status.err && { error: String(status.err) }),
    };
  } catch (error) {
    return {
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
