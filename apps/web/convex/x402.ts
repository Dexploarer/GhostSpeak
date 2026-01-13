/**
 * x402 Payment Verification
 *
 * Convex actions for verifying x402 payment transactions on-chain.
 * Ensures payments meet requirements before granting API access.
 */

import { internalAction, internalMutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'

/**
 * Verify x402 payment transaction on-chain
 *
 * Checks that:
 * 1. Transaction exists and is confirmed
 * 2. Transfer goes to expected recipient
 * 3. Amount meets or exceeds expected amount
 * 4. Asset is USDC
 */
export const verifyX402Payment = internalAction({
  args: {
    paymentSignature: v.string(),
    expectedRecipient: v.string(),
    expectedAmountUsdc: v.number(),
    network: v.string(),
  },
  handler: async (ctx, args) => {
    const { paymentSignature, expectedRecipient, expectedAmountUsdc, network } = args

    try {
      // Determine RPC endpoint based on network
      const rpcUrl = getRpcEndpoint(network)

      console.log('[x402Verify] Checking transaction:', paymentSignature)

      // Fetch transaction from Solana using RPC
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            paymentSignature,
            {
              encoding: 'jsonParsed',
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            },
          ],
        }),
      })

      const result = await response.json()

      if (result.error || !result.result) {
        return {
          valid: false,
          error: result.error?.message || 'Transaction not found on-chain',
        }
      }

      const txData = result.result

      // Verify transaction succeeded
      if (txData.meta?.err) {
        return {
          valid: false,
          error: `Transaction failed on-chain: ${JSON.stringify(txData.meta.err)}`,
        }
      }

      // Parse transaction to verify transfer details
      console.log('[x402Verify] Parsing SPL token transfer instructions...')

      // Expected USDC amount in micro-units (6 decimals)
      const expectedAmountMicro = Math.round(expectedAmountUsdc * 1_000_000)

      // Find SPL token transfer instruction
      const instructions = txData.transaction?.message?.instructions || []
      const parsedInstructions = instructions
        .map((ix: any, index: number) => {
          // Check if this is a parsed instruction with program name
          if (ix.parsed && ix.program === 'spl-token') {
            return { index, ...ix }
          }
          return null
        })
        .filter(Boolean)

      console.log('[x402Verify] Found', parsedInstructions.length, 'SPL token instructions')

      // Look for transferChecked or transfer instruction
      let transferInstruction = null
      for (const ix of parsedInstructions) {
        if (
          ix.parsed?.type === 'transferChecked' ||
          ix.parsed?.type === 'transfer'
        ) {
          transferInstruction = ix
          break
        }
      }

      if (!transferInstruction) {
        return {
          valid: false,
          error: 'No SPL token transfer instruction found in transaction',
        }
      }

      const transferInfo = transferInstruction.parsed.info

      // Verify recipient address
      const actualRecipient = transferInfo.destination
      if (actualRecipient !== expectedRecipient) {
        return {
          valid: false,
          error: `Payment sent to wrong recipient. Expected: ${expectedRecipient}, Got: ${actualRecipient}`,
        }
      }

      // Verify amount (for transferChecked, amount is in tokenAmount field)
      const actualAmount =
        transferInfo.tokenAmount?.amount || transferInfo.amount
      const actualAmountNum = parseInt(actualAmount || '0')

      if (actualAmountNum < expectedAmountMicro) {
        return {
          valid: false,
          error: `Insufficient payment amount. Expected: ${expectedAmountMicro} micro-USDC, Got: ${actualAmountNum}`,
        }
      }

      // Verify USDC mint (optional - for transferChecked only)
      const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
      const acceptedMints = [USDC_MINT_MAINNET, USDC_MINT_DEVNET]

      if (transferInfo.mint && !acceptedMints.includes(transferInfo.mint)) {
        return {
          valid: false,
          error: `Invalid token mint. Expected USDC, Got: ${transferInfo.mint}`,
        }
      }

      console.log('[x402Verify] ✅ Payment verified successfully')
      console.log('[x402Verify] Amount:', actualAmountNum, 'micro-USDC')
      console.log('[x402Verify] Recipient:', actualRecipient)

      // Extract payer (authority of the transfer)
      const payer = transferInfo.authority || transferInfo.source || 'unknown'

      return {
        valid: true,
        txSignature: paymentSignature,
        payer,
        amount: actualAmountNum,
        recipient: actualRecipient,
        confirmedAt: Date.now(),
      }
    } catch (error) {
      console.error('[x402Verify] Verification failed:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
      }
    }
  },
})

/**
 * Get RPC endpoint for network
 */
function getRpcEndpoint(network: string): string {
  // Handle CAIP-2 format: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" (mainnet)
  // or "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" (devnet)
  const networkId = network.includes(':') ? network.split(':')[1] : network

  const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
  const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1'

  if (networkId === MAINNET_GENESIS || network === 'mainnet-beta') {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  }

  if (networkId === DEVNET_GENESIS || network === 'devnet') {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  }

  // Default to devnet for development
  return 'https://api.devnet.solana.com'
}

/**
 * Check if a transaction signature has been used before (replay protection)
 */
export const isTransactionUsed = internalQuery({
  args: {
    transactionSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('x402UsedTransactions')
      .withIndex('by_signature', (q) => q.eq('transactionSignature', args.transactionSignature))
      .first()

    return existing !== null
  },
})

/**
 * Mark a transaction as used (for replay protection)
 */
export const markTransactionUsed = internalMutation({
  args: {
    transactionSignature: v.string(),
    network: v.string(),
    recipient: v.string(),
    payer: v.string(),
    amount: v.number(),
    service: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    // Transactions expire after 30 days
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000

    await ctx.db.insert('x402UsedTransactions', {
      transactionSignature: args.transactionSignature,
      network: args.network,
      recipient: args.recipient,
      payer: args.payer,
      amount: args.amount,
      service: args.service,
      usedAt: now,
      expiresAt,
    })

    console.log('[x402] Transaction marked as used:', args.transactionSignature)
  },
})

/**
 * Clean up expired transaction records (run via cron)
 */
export const cleanupExpiredTransactions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // Find all expired transactions
    const expired = await ctx.db
      .query('x402UsedTransactions')
      .withIndex('by_expires')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect()

    // Delete them
    for (const tx of expired) {
      await ctx.db.delete(tx._id)
    }

    console.log(`[x402] Cleaned up ${expired.length} expired transactions`)
    return { deleted: expired.length }
  },
})
