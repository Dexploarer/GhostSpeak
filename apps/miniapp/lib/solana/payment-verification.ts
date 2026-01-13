/**
 * On-Chain Payment Verification for x402 Protocol
 *
 * Verifies that a Solana transaction signature represents a valid payment
 * from payer to recipient with the correct amount.
 */

import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { signature } from '@solana/keys'
import { config } from '@/lib/config'
import { isDevelopment } from '@/lib/env'

const SOLANA_RPC_URL = config.solana.rpcUrl
const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr' // Devnet USDC
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC

interface PaymentVerificationResult {
  valid: boolean
  error?: string
  details?: {
    payer: string
    recipient: string
    amount: number
    tokenMint: string
    blockTime: number
  }
}

/**
 * Verify a payment transaction on-chain
 */
export async function verifyPaymentTransaction(
  transactionSignature: string,
  expectedRecipient: string,
  expectedAmount: number, // in USDC (human-readable, e.g., 0.001)
  toleranceBps = 100 // 1% tolerance for amount matching
): Promise<PaymentVerificationResult> {
  try {
    const rpc = createSolanaRpc(SOLANA_RPC_URL)

    // Convert string signature to Signature type
    const sig = signature(transactionSignature)

    // Get transaction details
    const transaction = await rpc
      .getTransaction(sig, {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0,
      })
      .send()

    if (!transaction) {
      return {
        valid: false,
        error: 'Transaction not found on-chain',
      }
    }

    // Check if transaction succeeded
    if (transaction.meta?.err) {
      return {
        valid: false,
        error: `Transaction failed: ${JSON.stringify(transaction.meta.err)}`,
      }
    }

    // Extract payment details from transaction
    const meta = transaction.meta
    const tx = transaction.transaction

    if (!meta || !tx) {
      return {
        valid: false,
        error: 'Transaction metadata not available',
      }
    }

    // Look for SPL token transfer instruction (USDC)
    const instructions = tx.message.instructions || []
    let paymentFound = false
    let payer = ''
    let recipient = ''
    let amount = 0
    let tokenMint = ''

    for (const instruction of instructions) {
      // Check if this is a parsed SPL token transfer
      if (
        'parsed' in instruction &&
        instruction.program === 'spl-token' &&
        instruction.parsed.type === 'transfer' &&
        instruction.parsed.info
      ) {
        const info = instruction.parsed.info as {
          source: string
          destination: string
          amount: string
          mint?: string
          authority?: string
        }
        payer = info.source
        recipient = info.destination
        amount = parseFloat(info.amount) / 1_000_000 // Convert from microUSDC to USDC
        tokenMint = info.mint || USDC_MINT_DEVNET

        // Check if recipient matches
        if (recipient === expectedRecipient || info.authority === expectedRecipient) {
          paymentFound = true
          break
        }
      }
    }

    if (!paymentFound) {
      // Check SOL transfers as fallback
      const preBalances = meta.preBalances || []
      const postBalances = meta.postBalances || []
      const accounts = tx.message.accountKeys || []

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i]
        // In Solana v5, accountKeys are objects with pubkey property
        const accountKey =
          typeof account === 'string'
            ? account
            : (account as { pubkey: string }).pubkey
        if (accountKey && accountKey === expectedRecipient) {
          // Balances are bigint in Solana v5, convert to number
          const balanceChange = Number(postBalances[i]) - Number(preBalances[i])
          if (balanceChange > 0) {
            paymentFound = true
            const firstAccount = accounts[0]
            payer =
              typeof firstAccount === 'string'
                ? firstAccount
                : (firstAccount as { pubkey: string }).pubkey
            recipient = accountKey
            amount = balanceChange / 1_000_000_000 // Convert lamports to SOL
            tokenMint = 'SOL'
            break
          }
        }
      }
    }

    if (!paymentFound) {
      return {
        valid: false,
        error: 'No payment transfer found in transaction',
      }
    }

    // Verify amount is within tolerance
    const tolerance = expectedAmount * (toleranceBps / 10000)
    const minAmount = expectedAmount - tolerance
    const maxAmount = expectedAmount + tolerance

    if (amount < minAmount || amount > maxAmount) {
      return {
        valid: false,
        error: `Payment amount ${amount} does not match expected ${expectedAmount} (tolerance: ${tolerance})`,
      }
    }

    // Payment is valid
    return {
      valid: true,
      details: {
        payer,
        recipient,
        amount,
        tokenMint,
        blockTime: transaction.blockTime ? Number(transaction.blockTime) : 0,
      },
    }
  } catch (error) {
    if (isDevelopment) {
      console.error('[Dev] Payment verification error:', error)
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    }
  }
}

/**
 * Minimal Convex client interface for payment queries
 */
interface ConvexQueryClient {
  query: (name: string, args: Record<string, unknown>) => Promise<unknown>
}

/**
 * Check if a transaction signature has already been used (prevent replay attacks)
 */
export async function isTransactionUsed(
  transactionSignature: string,
  convexClient: ConvexQueryClient
): Promise<boolean> {
  try {
    // Check in payments table
    const existingPayment = await convexClient.query('payments:getBySignature', {
      transactionSignature,
    })
    return !!existingPayment
  } catch {
    return false
  }
}

/**
 * Minimal Convex client interface for payment mutations
 */
interface ConvexMutationClient {
  mutation: (name: string, args: Record<string, unknown>) => Promise<unknown>
}

/**
 * Record a verified payment in the database
 */
export async function recordVerifiedPayment(
  convexClient: ConvexMutationClient,
  paymentDetails: {
    transactionSignature: string
    payer: string
    recipient: string
    amount: number
    tokenMint: string
    resourceId?: string
    resourceUrl?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await convexClient.mutation('payments:recordPayment', paymentDetails)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record payment',
    }
  }
}
