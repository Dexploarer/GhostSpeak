/**
 * X402 Transaction Indexer
 *
 * Polls Solana blockchain for x402 payment transactions to eliminate
 * webhook dependency and enable historical reputation backfilling.
 *
 * x402 payments are SPL token transfers (USDC) to PayAI facilitator addresses.
 * This indexer discovers these transfers and extracts payment metadata.
 *
 * @module modules/indexer
 */

import type { Address, Signature } from '@solana/kit'
import type { Rpc, GetSignaturesForAddressApi, GetTransactionApi } from '@solana/rpc'

// =====================================================
// TYPES
// =====================================================

/**
 * Parsed x402 payment data from on-chain transaction
 */
export interface X402PaymentData {
  /** Transaction signature (on-chain proof) */
  signature: string
  /** Merchant (agent) receiving payment */
  merchant: Address
  /** Payer sending payment */
  payer: Address
  /** Payment amount in token base units (e.g., micro-USDC) */
  amount: string
  /** Payment success status */
  success: boolean
  /** Block timestamp */
  timestamp: Date
  /** Solana network */
  network: 'solana' | 'solana-devnet'
  /** Response time in milliseconds (if available from memo) */
  responseTimeMs?: number
  /** Additional metadata from transaction memo */
  metadata?: Record<string, unknown>
}

/**
 * Transaction signature with metadata
 */
export interface SignatureInfo {
  signature: Signature
  slot: bigint
  blockTime: bigint | null
  err: unknown | null
}

/**
 * Indexer configuration
 */
export interface X402IndexerConfig {
  /** Solana RPC client */
  rpc: Rpc<GetSignaturesForAddressApi & GetTransactionApi>
  /** PayAI facilitator address to monitor */
  facilitatorAddress: Address
  /** Network identifier */
  network?: 'solana' | 'solana-devnet'
  /** Maximum transactions per poll */
  batchSize?: number
}

// =====================================================
// X402 TRANSACTION INDEXER
// =====================================================

/**
 * X402 Transaction Indexer
 *
 * Discovers x402 payments by monitoring SPL token transfers
 * to PayAI facilitator addresses on Solana.
 *
 * @example
 * ```typescript
 * const indexer = new X402TransactionIndexer({
 *   rpc: createSolanaRpc('https://api.devnet.solana.com'),
 *   facilitatorAddress: address('PayAI...'),
 *   network: 'solana-devnet',
 * })
 *
 * // Poll for new transactions
 * const payments = await indexer.pollTransactions()
 * ```
 */
export class X402TransactionIndexer {
  private readonly rpc: Rpc<GetSignaturesForAddressApi & GetTransactionApi>
  private readonly facilitatorAddress: Address
  private readonly network: 'solana' | 'solana-devnet'
  private readonly batchSize: number

  constructor(config: X402IndexerConfig) {
    this.rpc = config.rpc
    this.facilitatorAddress = config.facilitatorAddress
    this.network = config.network || 'solana'
    this.batchSize = config.batchSize || 100
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /**
   * Poll for new x402 transactions since last sync
   *
   * @param lastSignature - Last processed signature (for pagination)
   * @param limit - Maximum transactions to fetch
   * @returns Array of parsed x402 payment data
   */
  async pollTransactions(
    lastSignature?: Signature,
    limit?: number
  ): Promise<X402PaymentData[]> {
    try {
      // 1. Fetch transaction signatures for facilitator address
      const signatures = await this.getSignatures(lastSignature, limit)

      if (signatures.length === 0) {
        return []
      }

      console.log(`[X402 Indexer] Found ${signatures.length} new transactions`)

      // 2. Parse each transaction to extract x402 payment data
      const payments: X402PaymentData[] = []

      for (const sig of signatures) {
        try {
          const payment = await this.parseTransaction(sig.signature)

          if (payment) {
            payments.push(payment)
          }
        } catch (error) {
          console.error(`[X402 Indexer] Failed to parse transaction ${sig.signature}:`, error)
          // Continue processing other transactions
        }
      }

      console.log(`[X402 Indexer] Parsed ${payments.length} x402 payments`)

      return payments
    } catch (error) {
      console.error('[X402 Indexer] Failed to poll transactions:', error)
      throw error
    }
  }

  /**
   * Parse a specific transaction signature
   *
   * @param signature - Transaction signature to parse
   * @returns Parsed x402 payment data or null if not an x402 payment
   */
  async parseTransaction(sig: Signature | string): Promise<X402PaymentData | null> {
    try {
      // Fetch full transaction data
      const txSignature = (typeof sig === 'string' ? sig : sig) as Signature
      const response = await this.rpc
        .getTransaction(txSignature, {
          maxSupportedTransactionVersion: 0,
          encoding: 'jsonParsed',
        })
        .send()

      if (!response || !response.transaction) {
        return null
      }

      // Check if this is an x402 payment (SPL token transfer)
      const isX402 = this.isX402Payment(response)
      if (!isX402) {
        return null
      }

      // Extract payment data from transaction
      return this.extractPaymentData(response, typeof sig === 'string' ? sig : String(sig))
    } catch (error) {
      console.error(`[X402 Indexer] Failed to fetch transaction ${sig}:`, error)
      return null
    }
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  /**
   * Fetch transaction signatures for the facilitator address
   */
  private async getSignatures(
    before?: Signature,
    limit?: number
  ): Promise<SignatureInfo[]> {
    try {
      const config: { limit: number; before?: Signature } = {
        limit: limit || this.batchSize,
      }

      if (before) {
        config.before = before
      }

      const response = await this.rpc
        .getSignaturesForAddress(this.facilitatorAddress, config)
        .send()

      return response.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime,
        err: sig.err ?? null,
      }))
    } catch (error) {
      console.error('[X402 Indexer] Failed to fetch signatures:', error)
      throw error
    }
  }

  /**
   * Check if transaction is an x402 payment
   *
   * x402 payments are characterized by:
   * - SPL token transfer (TokenProgram or Token2022Program) for USDC
   * - Native SOL transfer (System Program)
   * - Transfer TO the facilitator address
   * - Optional memo instruction with payment metadata
   *
   * Supports both devnet and mainnet for all payment types
   */
  private isX402Payment(transaction: any): boolean {
    try {
      const instructions = transaction.transaction?.message?.instructions || []

      // Look for SPL token transfer OR native SOL transfer
      const hasPaymentTransfer = instructions.some((ix: any) => {
        const programId = ix.programId?.toString()

        // Check for SPL token transfer (USDC on mainnet/devnet)
        const isTokenProgram =
          programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || // SPL Token
          programId === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' // Token-2022

        if (isTokenProgram) {
          const parsed = ix.parsed
          if (parsed?.type === 'transfer' || parsed?.type === 'transferChecked') {
            const destination = parsed.info?.destination
            return destination === this.facilitatorAddress.toString()
          }
        }

        // Check for native SOL transfer (devnet and mainnet)
        if (programId === '11111111111111111111111111111111') {
          const parsed = ix.parsed
          if (parsed?.type === 'transfer') {
            const destination = parsed.info?.destination
            return destination === this.facilitatorAddress.toString()
          }
        }

        return false
      })

      return hasPaymentTransfer
    } catch (error) {
      console.error('[X402 Indexer] Error checking if x402 payment:', error)
      return false
    }
  }

  /**
   * Extract payment data from transaction
   */
  private extractPaymentData(transaction: any, signature: string): X402PaymentData | null {
    try {
      const instructions = transaction.transaction?.message?.instructions || []

      // Find transfer instruction (token or system)
      const transferIx = instructions.find((ix: any) => {
        const parsed = ix.parsed
        const programId = ix.programId?.toString()

        // Token transfer
        if (parsed?.type === 'transfer' || parsed?.type === 'transferChecked') {
          return true
        }

        return false
      })

      if (!transferIx) {
        return null
      }

      const transferInfo = transferIx.parsed.info

      // Extract basic payment data
      const merchant = transferInfo.destination as Address
      const payer = transferInfo.source as Address

      // For token transfers, use tokenAmount; for SOL, use lamports
      const amount = transferInfo.amount || transferInfo.tokenAmount?.amount || transferInfo.lamports || '0'
      const success = transaction.meta?.err === null

      // Extract timestamp from block time
      const blockTime = transaction.blockTime
      const timestamp = blockTime ? new Date(blockTime * 1000) : new Date()

      // Look for memo instruction (optional metadata)
      const memoIx = instructions.find((ix: any) =>
        ix.programId?.toString()?.includes('Memo')
      )

      let responseTimeMs: number | undefined
      let metadata: Record<string, unknown> | undefined

      if (memoIx) {
        try {
          // Memo data can be in parsed field or data field
          let memoText: string
          if (memoIx.parsed) {
            memoText = memoIx.parsed
          } else if (memoIx.data) {
            memoText = Buffer.from(memoIx.data, 'base64').toString('utf-8')
          } else {
            memoText = ''
          }

          if (memoText) {
            const memoData = JSON.parse(memoText)
            responseTimeMs = memoData.responseTimeMs
            metadata = memoData
          }
        } catch {
          // Memo is not JSON, ignore
        }
      }

      return {
        signature,
        merchant,
        payer,
        amount,
        success,
        timestamp,
        network: this.network,
        responseTimeMs,
        metadata,
      }
    } catch (error) {
      console.error('[X402 Indexer] Failed to extract payment data:', error)
      return null
    }
  }
}
