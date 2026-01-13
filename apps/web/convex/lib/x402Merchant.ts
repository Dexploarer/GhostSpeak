/**
 * x402 Merchant Module
 *
 * Enables GhostSpeak/Caisper to act as an x402 MERCHANT (payee).
 * This complements caisperX402.ts which handles the CUSTOMER (payer) side.
 *
 * Per x402 spec: https://docs.payai.network/x402/reference
 *
 * Merchant responsibilities:
 * 1. Return HTTP 402 with WWW-Authenticate header containing payment requirements
 * 2. Verify incoming X-PAYMENT header contains valid, signed transaction
 * 3. Forward to facilitator for settlement (or settle directly)
 * 4. Return X-PAYMENT-RESPONSE header with settlement confirmation
 */

import { v } from 'convex/values'
import { internalQuery, internalAction, internalMutation } from '../_generated/server'
import { internal } from '../_generated/api'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface MerchantPaymentConfig {
  payTo: string // Merchant's wallet address (Caisper)
  priceUsdc: number // Price in USDC (e.g., 0.01 for 1 cent)
  description?: string // Human-readable description of the service
  facilitatorAddress?: string // PayAI facilitator address
}

export interface PaymentRequirements402 {
  scheme: 'exact' | 'upto'
  network: string // CAIP-2 format (e.g., 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')
  asset: string // USDC mint address
  payTo: string // Merchant address
  maxAmountRequired: string // Amount in atomic units (micro-USDC)
  extra?: {
    feePayer?: string // Facilitator fee payer
    description?: string
    resource?: string // Resource being purchased
  }
}

export interface X402PaymentPayload {
  x402Version: number
  scheme: string
  network: string
  payload: {
    transaction: string // Base64-encoded signed transaction
  }
}

export interface SettlementResult {
  success: boolean
  transactionSignature?: string
  error?: string
  payer?: string
  amount?: string
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

// USDC mint addresses
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'

// PayAI facilitator address (devnet)
const PAYAI_FACILITATOR_DEVNET = 'PayAiFacilitatorDevnetAddress11111111111111'

// Network identifiers (CAIP-2 format)
const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' // Mainnet genesis hash
const SOLANA_DEVNET_CAIP2 = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' // Devnet genesis hash

// ─── HELPER: Get USDC Mint for Network ───────────────────────────────────────

function getUsdcMint(network: string): string {
  if (network.includes('devnet') || network === 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1') {
    return USDC_MINT_DEVNET
  }
  return USDC_MINT_MAINNET
}

// ─── MAIN: Generate 402 Response ─────────────────────────────────────────────

/**
 * Generate a 402 Payment Required response with proper WWW-Authenticate header.
 *
 * Usage in API route:
 * ```typescript
 * const { header, body } = generate402Response({
 *   payTo: caisperWalletAddress,
 *   priceUsdc: 0.01,
 *   description: 'Agent verification service',
 * })
 * return new Response(JSON.stringify(body), {
 *   status: 402,
 *   headers: { 'WWW-Authenticate': header, 'Content-Type': 'application/json' },
 * })
 * ```
 */
export function generate402Response(config: MerchantPaymentConfig): {
  header: string
  body: PaymentRequirements402
  accepts: PaymentRequirements402[]
} {
  // x402 payments ALWAYS use mainnet (real USDC, real PayAI)
  // Even when GhostSpeak program is on devnet
  const envNetwork = process.env.X402_NETWORK || 'mainnet'
  const network = envNetwork.includes('devnet') ? SOLANA_DEVNET_CAIP2 : SOLANA_MAINNET_CAIP2

  const usdcMint = getUsdcMint(network)
  const facilitator = config.facilitatorAddress || process.env.PAYAI_FACILITATOR_ADDRESS

  // Convert USDC to micro-USDC (6 decimals)
  const amountMicro = Math.round(config.priceUsdc * 1_000_000).toString()

  const requirements: PaymentRequirements402 = {
    scheme: 'exact',
    network, // Now uses CAIP-2 format
    asset: usdcMint,
    payTo: config.payTo,
    maxAmountRequired: amountMicro,
    extra: {
      feePayer: facilitator,
      description: config.description,
    },
  }

  // Build WWW-Authenticate header per x402 v2 spec
  // Format: x402 scheme="exact", network="solana:...", asset="...", payTo="...", maxAmountRequired="..."
  const headerParts = [
    `x402`,
    `scheme="${requirements.scheme}"`,
    `network="${requirements.network}"`,
    `asset="${requirements.asset}"`,
    `payTo="${requirements.payTo}"`,
    `maxAmountRequired="${requirements.maxAmountRequired}"`,
  ]

  if (facilitator) {
    headerParts.push(`feePayer="${facilitator}"`)
  }

  return {
    header: headerParts.join(', '),
    body: requirements,
    accepts: [requirements], // x402 accepts array format
  }
}

// ─── MAIN: Parse X-PAYMENT Header ────────────────────────────────────────────

/**
 * Parse and decode the X-PAYMENT header from an incoming request.
 */
export function parseXPaymentHeader(header: string): X402PaymentPayload | null {
  try {
    const decoded = atob(header)
    const payload = JSON.parse(decoded) as X402PaymentPayload

    // Validate required fields
    if (!payload.x402Version || !payload.payload?.transaction) {
      console.error('[x402Merchant] Invalid X-PAYMENT payload: missing required fields')
      return null
    }

    return payload
  } catch (error) {
    console.error('[x402Merchant] Failed to parse X-PAYMENT header:', error)
    return null
  }
}

// ─── MAIN: Verify X-PAYMENT Transaction ──────────────────────────────────────

/**
 * Verify that the X-PAYMENT transaction is valid and pays the expected amount.
 * This is a Convex internal action that can access the database and make RPC calls.
 */
export const verifyX402Payment = internalAction({
  args: {
    xPaymentHeader: v.string(),
    expectedPayTo: v.string(),
    expectedAmountMicro: v.number(),
  },
  handler: async (ctx, args): Promise<SettlementResult> => {
    console.log('[x402Merchant] Verifying X-PAYMENT...')

    // 1. Parse the X-PAYMENT header
    const payload = parseXPaymentHeader(args.xPaymentHeader)
    if (!payload) {
      return { success: false, error: 'Invalid X-PAYMENT header format' }
    }

    // 2. Decode the transaction
    let txBytes: Uint8Array
    try {
      const binaryString = atob(payload.payload.transaction)
      txBytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        txBytes[i] = binaryString.charCodeAt(i)
      }
    } catch (error) {
      return { success: false, error: 'Failed to decode transaction bytes' }
    }

    console.log('[x402Merchant] Transaction decoded, length:', txBytes.length)

    // 3. For now, we trust the PayAI facilitator to verify and settle
    // In production, we would:
    // - Deserialize the transaction
    // - Verify it transfers the correct amount to our address
    // - Verify signatures are valid
    // - Forward to facilitator for co-signing and broadcast

    // 4. Forward to PayAI facilitator for settlement
    const facilitatorUrl =
      process.env.PAYAI_FACILITATOR_URL || 'https://facilitator.payai.network/v1/settle'

    try {
      const response = await fetch(facilitatorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': args.xPaymentHeader,
        },
        body: JSON.stringify({
          expectedPayTo: args.expectedPayTo,
          expectedAmount: args.expectedAmountMicro.toString(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[x402Merchant] Settlement successful:', result.transaction)
        return {
          success: true,
          transactionSignature: result.transaction,
          payer: result.payer,
          amount: args.expectedAmountMicro.toString(),
        }
      } else {
        const error = await response.text()
        console.error('[x402Merchant] Settlement failed:', error)
        return { success: false, error: `Facilitator error: ${error}` }
      }
    } catch (error) {
      console.error('[x402Merchant] Failed to contact facilitator:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to settle payment',
      }
    }
  },
})

// ─── MAIN: Create Settlement Response ────────────────────────────────────────

/**
 * Create the X-PAYMENT-RESPONSE header for a successful settlement.
 */
export function createSettlementResponse(
  txSignature: string,
  payer: string,
  network: string = 'solana'
): string {
  const response = {
    success: true,
    transaction: txSignature,
    network,
    payer,
  }
  return btoa(JSON.stringify(response))
}

/**
 * Create an error settlement response.
 */
export function createErrorResponse(errorReason: string): string {
  const response = {
    success: false,
    transaction: '',
    network: 'solana',
    payer: '',
    errorReason,
  }
  return btoa(JSON.stringify(response))
}

// ─── HELPER: Get Merchant Config ─────────────────────────────────────────────

/**
 * Get the x402 merchant configuration for an agent.
 */
export const getMerchantConfig = internalQuery({
  args: {
    agentAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.agentAddress))
      .first()

    if (!agent) {
      return null
    }

    return {
      payTo: agent.ghostAddress,
      x402Enabled: agent.x402Enabled ?? false,
      x402ServiceEndpoint: agent.x402ServiceEndpoint,
      x402PricePerCall: agent.x402PricePerCall ?? 0.01, // Default 1 cent
      x402AcceptedTokens: agent.x402AcceptedTokens ?? ['USDC'],
    }
  },
})

// ─── HELPER: Record x402 Payment Received ────────────────────────────────────

/**
 * Record an x402 payment received by a merchant.
 * This inserts directly into the historicalInteractions table for tracking.
 */
export const recordPaymentReceived = internalMutation({
  args: {
    merchantAddress: v.string(),
    payerAddress: v.string(),
    amountMicro: v.number(),
    transactionSignature: v.string(),
    serviceEndpoint: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[x402Merchant] Recording payment received:', {
      merchant: args.merchantAddress,
      payer: args.payerAddress,
      amount: args.amountMicro,
      signature: args.transactionSignature,
    })

    // Insert into historicalInteractions for tracking
    await ctx.db.insert('historicalInteractions', {
      userWalletAddress: args.payerAddress,
      agentWalletAddress: args.merchantAddress,
      transactionSignature: args.transactionSignature,
      amount: (args.amountMicro / 1_000_000).toString(),
      facilitatorAddress: process.env.PAYAI_FACILITATOR_ADDRESS || 'x402_merchant',
      discoverySource: 'x402_payment',
      discoveredAt: Date.now(),
      blockTime: Math.floor(Date.now() / 1000),
      agentKnown: true, // We are the agent receiving the payment
    })

    return { success: true }
  },
})
