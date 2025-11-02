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
import { EventEmitter } from 'node:events'

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

/**
 * x402 Payment Events
 */
export interface X402PaymentEvent {
  type: 'payment_created' | 'payment_sent' | 'payment_confirmed' | 'payment_failed'
  signature?: Signature
  request: X402PaymentRequest
  receipt?: X402PaymentReceipt
  error?: string
  timestamp: number
}

export class X402Client extends EventEmitter {
  constructor(
    private rpc: Rpc<SolanaRpcApi & GetTransactionApi>,
    private wallet?: TransactionSigner
  ) {
    super()
  }

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

    // Validate payment request
    if (request.amount <= 0n) {
      throw new Error('Payment amount must be greater than zero')
    }

    if (!request.recipient) {
      throw new Error('Payment recipient address is required')
    }

    if (!request.token) {
      throw new Error('Payment token address is required')
    }

    // Emit payment creation event
    this.emit('payment_created', {
      type: 'payment_created',
      request,
      timestamp: Date.now()
    })

    try {
      // Create SPL token transfer instruction
      const transferIx = await this.createTransferInstruction(
        request.recipient,
        request.amount,
        request.token
      ).catch((error) => {
        throw new Error(
          `Failed to create transfer instruction: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      })

      // Add memo with x402 metadata
      const memoIx = this.createMemoInstruction(
        `x402:${request.description}:${JSON.stringify(request.metadata ?? {})}`
      )

      // Build transaction
      const { value: latestBlockhash } = await this.rpc
        .getLatestBlockhash()
        .send()
        .catch((error) => {
          throw new Error(
            `Failed to fetch latest blockhash: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        })

      let message = createTransactionMessage({ version: 0 })
      message = setTransactionMessageFeePayer(this.wallet.address, message)
      message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message)
      message = appendTransactionMessageInstruction(transferIx, message)
      message = appendTransactionMessageInstruction(memoIx, message)

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(message).catch((error) => {
        throw new Error(
          `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      })

      // Send transaction
      const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc: this.rpc })
      const signature = await sendAndConfirm(signedTransaction, {
        commitment: 'confirmed'
      }).catch((error) => {
        // Parse common Solana transaction errors
        const errorMessage = error instanceof Error ? error.message : String(error)

        if (errorMessage.includes('insufficient funds')) {
          throw new Error('Insufficient funds to complete payment')
        }
        if (errorMessage.includes('Blockhash not found')) {
          throw new Error('Transaction expired. Please retry the payment.')
        }
        if (errorMessage.includes('InvalidAccountOwner')) {
          throw new Error(
            'Associated Token Account not found or invalid. ' +
            'Please ensure the token account exists for both sender and recipient.'
          )
        }

        throw new Error(
          `Transaction failed: ${errorMessage}`
        )
      })

      // Emit payment sent event
      this.emit('payment_sent', {
        type: 'payment_sent',
        signature,
        request,
        timestamp: Date.now()
      })

      // Get transaction details
      const tx = await this.rpc.getTransaction(signature, {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0
      }).send().catch((error) => {
        // Transaction was sent but we couldn't fetch details
        // Return receipt with basic info
        console.warn('Payment succeeded but failed to fetch transaction details:', error)
        return null
      })

      const receipt: X402PaymentReceipt = {
        signature,
        recipient: request.recipient,
        amount: request.amount,
        token: request.token,
        timestamp: Date.now(),
        metadata: request.metadata,
        blockTime: tx?.blockTime ?? undefined,
        slot: tx?.slot ?? undefined
      }

      // Emit payment confirmed event
      this.emit('payment_confirmed', {
        type: 'payment_confirmed',
        signature,
        request,
        receipt,
        timestamp: Date.now()
      })

      return receipt
    } catch (error) {
      // Emit payment failed event
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emit('payment_failed', {
        type: 'payment_failed',
        request,
        error: errorMessage,
        timestamp: Date.now()
      })

      // Wrap and rethrow with context
      if (error instanceof Error) {
        throw error // Already has good error message
      }
      throw new Error(`Payment failed: ${String(error)}`)
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
    // Query for token accounts owned by the owner address for this specific mint
    try {
      const response = await this.rpc.getTokenAccountsByOwner(
        owner,
        { mint: token },
        { encoding: 'jsonParsed' }
      ).send()

      if (response.value.length > 0) {
        // Return the first ATA found (there should only be one per mint)
        return response.value[0].pubkey
      }

      // If no ATA exists, it needs to be created first
      throw new Error(
        `Associated Token Account not found for owner ${owner} and mint ${token}. ` +
        `Please ensure the ATA is initialized before making payments. ` +
        `Use createAssociatedTokenAccountInstruction to create it.`
      )
    } catch (error) {
      if (error instanceof Error && error.message.includes('Associated Token Account not found')) {
        throw error
      }
      throw new Error(
        `Failed to get Associated Token Account: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private parseTransactionReceipt(
    tx: any,
    signature: Signature
  ): X402PaymentReceipt {
    // Parse transaction to extract payment details from SPL token transfer
    const instructions = tx.transaction?.message?.instructions ?? []

    // Find the SPL token transfer instruction
    const transferInstruction = instructions.find((ix: any) =>
      ix.program === 'spl-token' && ix.parsed?.type === 'transfer'
    )

    if (!transferInstruction) {
      throw new Error('No SPL token transfer found in transaction')
    }

    const transferInfo = transferInstruction.parsed?.info
    if (!transferInfo) {
      throw new Error('Failed to parse SPL token transfer instruction')
    }

    // Extract recipient, amount, and token from the transfer instruction
    const recipient = address(transferInfo.destination ?? transferInfo.account)
    const amount = BigInt(transferInfo.amount ?? transferInfo.tokenAmount?.amount ?? '0')

    // Get token mint from pre or post token balances
    let tokenMint: Address
    const tokenBalances = tx.meta?.preTokenBalances ?? []
    if (tokenBalances.length > 0) {
      tokenMint = address(tokenBalances[0].mint)
    } else {
      throw new Error('Failed to extract token mint from transaction')
    }

    // Parse memo instruction for metadata
    const memoInstruction = instructions.find((ix: any) =>
      ix.program === 'spl-memo' || ix.programId?.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
    )

    let metadata: Record<string, string> | undefined
    if (memoInstruction) {
      try {
        const memoText = memoInstruction.parsed ??
                        (memoInstruction.data ? new TextDecoder().decode(Buffer.from(memoInstruction.data, 'base64')) : '')

        if (typeof memoText === 'string' && memoText.startsWith('x402:')) {
          const parts = memoText.split(':')
          if (parts.length >= 3) {
            try {
              metadata = JSON.parse(parts[2])
            } catch {
              // Ignore JSON parse errors for metadata
            }
          }
        }
      } catch {
        // Ignore memo parsing errors
      }
    }

    return {
      signature,
      recipient,
      amount,
      token: tokenMint,
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
