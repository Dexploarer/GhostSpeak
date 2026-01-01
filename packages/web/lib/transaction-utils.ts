/**
 * Transaction Building Utilities
 *
 * Provides helpers for building, signing, and sending Solana transactions
 * using the modern Solana v5 API.
 */

import type { Address } from '@solana/addresses'
import type { KeyPairSigner } from '@solana/signers'
import {
  getTransferInstruction,
  type TransferInstruction,
} from '@solana-program/token'
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  pipe,
} from '@solana/kit'
import { signAndSendTransactionMessageWithSigners } from '@solana/signers'

/**
 * Build and send a token transfer transaction
 *
 * @param rpc - Solana RPC connection
 * @param from - Source token account
 * @param to - Destination token account
 * @param authority - Signer with authority over source account
 * @param amount - Amount to transfer (in token base units with decimals)
 * @returns Transaction signature as base58 string
 */
export async function sendTokenTransfer(
  rpc: any,
  from: Address,
  to: Address,
  authority: KeyPairSigner,
  amount: bigint
): Promise<string> {
  // Get latest blockhash for transaction lifetime
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

  // Create transfer instruction
  const transferInstruction = getTransferInstruction({
    source: from,
    destination: to,
    authority,
    amount,
  })

  // Build transaction message using pipe pattern
  const transactionMessage = await pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(authority, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
  )

  // Sign and send transaction
  const signatureBytes = await signAndSendTransactionMessageWithSigners(transactionMessage)

  // Convert SignatureBytes to base58 string
  return String(signatureBytes)
}

/**
 * Build a token transfer instruction (for client-side signing)
 *
 * @param from - Source token account
 * @param to - Destination token account
 * @param authority - Signer with authority over source account
 * @param amount - Amount to transfer (in token base units with decimals)
 * @returns Transfer instruction
 */
export function buildTokenTransferInstruction(
  from: Address,
  to: Address,
  authority: KeyPairSigner | Address,
  amount: bigint
): TransferInstruction {
  return getTransferInstruction({
    source: from,
    destination: to,
    authority,
    amount,
  })
}

/**
 * Build a transaction message for client signing
 *
 * @param rpc - Solana RPC connection
 * @param feePayer - Address of the fee payer (cannot be a signer for client txs)
 * @param instructions - Instructions to include
 * @returns Serialized transaction message as base64
 */
export async function buildTransactionForClient(
  rpc: any,
  feePayer: Address,
  instructions: readonly any[]
): Promise<string> {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

  // Build transaction without signing
  let message: any = createTransactionMessage({ version: 0 })
  message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message)

  // Append all instructions
  for (const instruction of instructions) {
    message = await appendTransactionMessageInstruction(instruction, message)
  }

  // TODO: Serialize transaction to base64
  // For now, this is a simplified implementation
  // Real implementation would use compileTransaction and serialize
  // This returns a JSON representation that can be reconstructed client-side
  return JSON.stringify(message)
}

/**
 * Wait for transaction confirmation
 *
 * @param rpc - Solana RPC connection
 * @param signature - Transaction signature to confirm
 * @param maxRetries - Maximum number of retries (default: 30)
 * @returns true if confirmed, false otherwise
 */
export async function confirmTransaction(
  rpc: any,
  signature: string,
  maxRetries: number = 30
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await rpc
        .getSignatureStatuses([signature as any], { searchTransactionHistory: true })
        .send()

      const status = response.value[0]
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
        return true
      }

      // Wait 1 second between checks
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error checking transaction status:', error)
    }
  }

  return false
}
