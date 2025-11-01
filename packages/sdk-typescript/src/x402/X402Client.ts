/**
 * x402 Payment Protocol Client for Solana
 *
 * Implements the x402 open payment standard for AI agent commerce.
 * Reference: https://www.x402.org
 *
 * @module X402Client
 */

import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type {
  Rpc,
  GetTransactionApi,
  SolanaRpcApi,
  Signature,
  TransactionSigner
} from '@solana/kit'
import {
  createSolanaRpc,
  getAddressFromPublicKey,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory
} from '@solana/kit'
import type { IInstruction } from '@solana/kit'

// =====================================================
// TYPES
// =====================================================

export interface X402PaymentRequest {
  recipient: Address
  amount: bigint
  token: Address
  description: string
  metadata?: Record<string, string>
  expiresAt?: number
  requiresReceipt?: boolean
}

export interface X402PaymentReceipt {
  signature: Signature
  recipient: Address
  amount: bigint
  token: Address
  timestamp: number
  metadata?: Record<string, string>
  blockTime?: number
  slot?: bigint
}

export interface X402PaymentHeaders {
  'X-Payment-Address': string
  'X-Payment-Amount': string
  'X-Payment-Token': string
  'X-Payment-Blockchain': 'solana'
  'X-Payment-Description'?: string
  'X-Payment-Expires-At'?: string
}

export interface X402VerificationResult {
  valid: boolean
  receipt?: X402PaymentReceipt
  error?: string
}

// =====================================================
// X402 CLIENT
// =====================================================

export class X402Client {
  constructor(
    private rpc: Rpc<SolanaRpcApi & GetTransactionApi>,
    private wallet?: TransactionSigner
  ) {}

  /**
   * Create an x402 payment request
   * Returns HTTP 402 compatible headers
   */
  createPaymentRequest(params: {
    amount: bigint
    token: Address
    description: string
    expiresAt?: number
    metadata?: Record<string, string>
  }): X402PaymentRequest {
    if (!this.wallet) {
      throw new Error('Wallet required to create payment request')
    }

    const recipient = getAddressFromPublicKey(this.wallet.address)

    return {
      recipient,
      amount: params.amount,
      token: params.token,
      description: params.description,
      metadata: params.metadata,
      expiresAt: params.expiresAt ?? Date.now() + 300000, // 5 minutes default
      requiresReceipt: true
    }
  }

  /**
   * Create HTTP 402 response headers
   */
  createPaymentHeaders(request: X402PaymentRequest): X402PaymentHeaders {
    const headers: X402PaymentHeaders = {
      'X-Payment-Address': request.recipient,
      'X-Payment-Amount': request.amount.toString(),
      'X-Payment-Token': request.token,
      'X-Payment-Blockchain': 'solana'
    }

    if (request.description) {
      headers['X-Payment-Description'] = request.description
    }

    if (request.expiresAt) {
      headers['X-Payment-Expires-At'] = request.expiresAt.toString()
    }

    return headers
  }

  /**
   * Execute an x402 payment
   */
  async pay(request: X402PaymentRequest): Promise<X402PaymentReceipt> {
    if (!this.wallet) {
      throw new Error('Wallet required to make payment')
    }

    // Create SPL token transfer instruction
    const transferIx = await this.createTransferInstruction(
      request.recipient,
      request.amount,
      request.token
    )

    // Add memo with x402 metadata
    const memoIx = this.createMemoInstruction(
      `x402:${request.description}:${JSON.stringify(request.metadata ?? {})}`
    )

    // Build transaction
    const { value: latestBlockhash } = await this.rpc
      .getLatestBlockhash()
      .send()

    let message = createTransactionMessage({ version: 0 })
    message = setTransactionMessageFeePayer(this.wallet.address, message)
    message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message)
    message = appendTransactionMessageInstruction(transferIx, message)
    message = appendTransactionMessageInstruction(memoIx, message)

    // Sign transaction
    const signedTransaction = await signTransactionMessageWithSigners(message)

    // Send transaction
    const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc: this.rpc })
    const signature = await sendAndConfirm(signedTransaction, {
      commitment: 'confirmed'
    })

    // Get transaction details
    const tx = await this.rpc.getTransaction(signature, {
      encoding: 'jsonParsed',
      maxSupportedTransactionVersion: 0
    }).send()

    return {
      signature,
      recipient: request.recipient,
      amount: request.amount,
      token: request.token,
      timestamp: Date.now(),
      metadata: request.metadata,
      blockTime: tx?.blockTime ?? undefined,
      slot: tx?.slot ?? undefined
    }
  }

  /**
   * Verify an x402 payment
   */
  async verifyPayment(signature: Signature): Promise<X402VerificationResult> {
    try {
      const tx = await this.rpc.getTransaction(signature, {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0
      }).send()

      if (!tx) {
        return {
          valid: false,
          error: 'Transaction not found'
        }
      }

      // Check if transaction succeeded
      if (tx.meta?.err !== null) {
        return {
          valid: false,
          error: 'Transaction failed'
        }
      }

      // Parse transaction to extract payment details
      const receipt = this.parseTransactionReceipt(tx, signature)

      return {
        valid: true,
        receipt
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verify payment for specific recipient and amount
   */
  async verifyPaymentDetails(params: {
    signature: Signature
    expectedRecipient: Address
    expectedAmount: bigint
    expectedToken: Address
  }): Promise<X402VerificationResult> {
    const result = await this.verifyPayment(params.signature)

    if (!result.valid || !result.receipt) {
      return result
    }

    // Verify recipient
    if (result.receipt.recipient !== params.expectedRecipient) {
      return {
        valid: false,
        error: 'Recipient mismatch'
      }
    }

    // Verify amount
    if (result.receipt.amount !== params.expectedAmount) {
      return {
        valid: false,
        error: 'Amount mismatch'
      }
    }

    // Verify token
    if (result.receipt.token !== params.expectedToken) {
      return {
        valid: false,
        error: 'Token mismatch'
      }
    }

    return {
      valid: true,
      receipt: result.receipt
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(signature: Signature): Promise<{
    status: 'pending' | 'confirmed' | 'finalized' | 'failed' | 'not_found'
    confirmations?: number
  }> {
    try {
      const status = await this.rpc.getSignatureStatuses([signature]).send()

      if (!status.value[0]) {
        return { status: 'not_found' }
      }

      const txStatus = status.value[0]

      if (txStatus.err) {
        return { status: 'failed' }
      }

      if (txStatus.confirmationStatus === 'finalized') {
        return { status: 'finalized', confirmations: 32 }
      }

      if (txStatus.confirmationStatus === 'confirmed') {
        return { status: 'confirmed', confirmations: 1 }
      }

      return { status: 'pending' }
    } catch {
      return { status: 'not_found' }
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async createTransferInstruction(
    recipient: Address,
    amount: bigint,
    token: Address
  ): Promise<IInstruction> {
    if (!this.wallet) {
      throw new Error('Wallet required')
    }

    // Get token accounts
    const sourceAccount = await this.getAssociatedTokenAddress(
      this.wallet.address,
      token
    )
    const destinationAccount = await this.getAssociatedTokenAddress(
      recipient,
      token
    )

    // Create transfer instruction
    // Using SPL Token program
    const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

    const keys = [
      { address: sourceAccount, role: 1, isWritable: true, isSigner: false },
      { address: destinationAccount, role: 1, isWritable: true, isSigner: false },
      { address: this.wallet.address, role: 2, isWritable: false, isSigner: true }
    ]

    // Transfer instruction data (discriminator + amount)
    const data = new Uint8Array(9)
    data[0] = 3 // Transfer instruction
    const amountBytes = new BigUint64Array([amount])
    data.set(new Uint8Array(amountBytes.buffer), 1)

    return {
      programAddress: TOKEN_PROGRAM_ID,
      accounts: keys,
      data
    }
  }

  private createMemoInstruction(memo: string): IInstruction {
    const MEMO_PROGRAM_ID = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

    return {
      programAddress: MEMO_PROGRAM_ID,
      accounts: [],
      data: new TextEncoder().encode(memo)
    }
  }

  private async getAssociatedTokenAddress(
    owner: Address,
    token: Address
  ): Promise<Address> {
    const ASSOCIATED_TOKEN_PROGRAM_ID = address(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
    )
    const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

    // Derive associated token account address
    // This is a simplified version - in production use proper PDA derivation
    const seeds = [
      Buffer.from(owner),
      Buffer.from(TOKEN_PROGRAM_ID),
      Buffer.from(token)
    ]

    // Return derived address (placeholder - implement proper derivation)
    return owner // Replace with actual PDA derivation
  }

  private parseTransactionReceipt(
    tx: any,
    signature: Signature
  ): X402PaymentReceipt {
    // Parse transaction to extract payment details
    // This is simplified - implement full parsing logic

    const instructions = tx.transaction?.message?.instructions ?? []
    const memoInstruction = instructions.find((ix: any) =>
      ix.program === 'spl-memo'
    )

    let metadata: Record<string, string> | undefined
    if (memoInstruction?.parsed) {
      const memo = memoInstruction.parsed
      if (memo.startsWith('x402:')) {
        const parts = memo.split(':')
        if (parts.length >= 3) {
          try {
            metadata = JSON.parse(parts[2])
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    return {
      signature,
      recipient: address('11111111111111111111111111111111'), // Parse from tx
      amount: 0n, // Parse from tx
      token: address('11111111111111111111111111111111'), // Parse from tx
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
      metadata,
      blockTime: tx.blockTime,
      slot: tx.slot
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

export function createX402Client(
  rpcUrl: string,
  wallet?: TransactionSigner
): X402Client {
  const rpc = createSolanaRpc(rpcUrl)
  return new X402Client(rpc, wallet)
}

// =====================================================
// EXPORTS
// =====================================================

export default X402Client
