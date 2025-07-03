/**
 * Transaction Sending Utility for Web3.js v2
 * Handles proper transaction creation, signing, and sending
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { IInstruction } from '@solana/instructions';
import { pipe } from '@solana/functional';
import { 
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
} from '@solana/transaction-messages';
import { signTransactionMessageWithSigners } from '@solana/signers';
import { getSignatureFromTransaction } from '@solana/transactions';

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
export async function sendTransaction(options: SendTransactionOptions): Promise<TransactionResult> {
  const {
    rpc,
    instructions,
    signer,
    commitment = 'confirmed',
    skipPreflight = false,
    maxRetries = 3
  } = options;

  try {
    // Get recent blockhash for transaction lifetime
    const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment }).send();
    
    // Create transaction message using Web3.js v2 functional pipe approach
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(signer.address, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => instructions.reduce(
        (acc, instruction) => appendTransactionMessageInstruction(instruction, acc),
        tx
      )
    );

    // Sign the transaction
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

    const signature = getSignatureFromTransaction(signedTransaction);

    await rpc.sendTransaction(signedTransaction, { commitment, skipPreflight, maxRetries }).send();

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
 */
export async function sendTransactionBatch(
  rpc: Rpc<SolanaRpcApi>,
  transactionGroups: { instructions: IInstruction[]; signer: KeyPairSigner }[],
  options: {
    commitment?: Commitment;
    skipPreflight?: boolean;
    maxRetries?: number;
  } = {}
): Promise<TransactionResult[]> {
  const results: TransactionResult[] = [];
  
  for (const group of transactionGroups) {
    const result = await sendTransaction({
      rpc,
      instructions: group.instructions,
      signer: group.signer,
      ...options,
    });
    results.push(result);
  }
  
  return results;
}

/**
 * Estimate transaction fee
 */
export async function estimateTransactionFee(
  rpc: Rpc<SolanaRpcApi>,
  instructions: IInstruction[],
  feePayer: Address
): Promise<number> {
  try {
    const { value: fee } = await rpc.getFeeForMessage(await rpc.getLatestBlockhash().send().then(res => res.value), instructions).send();
    return fee;
  } catch (error) {
    console.warn('Fee estimation failed, using default:', error);
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
    const result = await rpc.getSignatureStatuses([signature], { searchTransactionHistory: true }).send();
    
    if (!result.value[0]) {
      return { confirmed: false, error: 'Transaction not found' };
    }

    const status = result.value[0];
    const isConfirmed = status.confirmationStatus === commitment || 
                      (commitment === 'processed' && status.confirmationStatus !== null) ||
                      (commitment === 'confirmed' && ['confirmed', 'finalized'].includes(status.confirmationStatus || ''));

    return {
      confirmed: isConfirmed && !status.err,
      slot: status.slot,
      error: status.err ? String(status.err) : undefined,
    };
  } catch (error) {
    return {
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}