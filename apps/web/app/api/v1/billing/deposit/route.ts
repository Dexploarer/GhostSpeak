/**
 * Billing Deposit API
 *
 * POST /api/v1/billing/deposit - Record a payment and add credits
 *
 * Accepts payment proofs for USDC, SOL, or GHOST tokens sent to treasury wallet.
 * Treasury wallet: 12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD
 * GHOST token holders get bonus credits based on their tier.
 */

import { api, internal } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'
import {
  TREASURY_WALLET,
  TOKENS,
  TIER_CONFIG,
  calculateCredits,
  type SubscriptionTier,
} from '@/convex/lib/treasury'
import { verifyTransaction } from '@/lib/solana/transaction'
import { convertToUSD } from '@/lib/price-oracle'
import { getConvexClient } from '@/lib/convex-client'

interface DepositRequest {
  walletAddress: string
  transactionSignature: string
  paymentToken: 'USDC' | 'SOL' | 'GHOST'
  paymentAmount: number // Amount in token units (e.g., 1.5 for 1.5 USDC)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DepositRequest

    // Validate required fields
    if (
      !body.walletAddress ||
      !body.transactionSignature ||
      !body.paymentToken ||
      !body.paymentAmount
    ) {
      return Response.json(
        {
          error: 'Missing required fields',
          required: ['walletAddress', 'transactionSignature', 'paymentToken', 'paymentAmount'],
        },
        { status: 400 }
      )
    }

    // Validate token
    if (!['USDC', 'SOL', 'GHOST'].includes(body.paymentToken)) {
      return Response.json(
        { error: 'Invalid payment token. Accepted: USDC, SOL, GHOST' },
        { status: 400 }
      )
    }

    // Validate Solana address format
    const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
    if (!solanaAddressRegex.test(body.walletAddress)) {
      return Response.json({ error: 'Invalid Solana address format' }, { status: 400 })
    }

    // Get user's tier for pricing
    const balance = await getConvexClient().query(api.lib.credits.getBalance, {
      walletAddress: body.walletAddress,
    })

    const tier: SubscriptionTier = (balance?.tier as SubscriptionTier) || 'free'

    // Verify transaction on-chain to ensure funds were received
    const verification = await verifyTransaction(
      body.transactionSignature,
      body.paymentAmount,
      body.paymentToken,
      body.walletAddress
    )

    if (!verification.valid) {
      return Response.json(
        { error: verification.error || 'Transaction verification failed' },
        { status: 400 }
      )
    }

    // Get USD value of payment using real-time price oracle
    // Falls back to CoinGecko if Jupiter fails, then to hardcoded prices
    const usdValue = await convertToUSD(body.paymentAmount, body.paymentToken)

    // Calculate credits with GHOST bonus
    const credits = calculateCredits(usdValue, tier, body.paymentToken)

    // Add credits to user's balance using public mutation
    const result = await getConvexClient().mutation(api.lib.credits.addCreditsPublic, {
      walletAddress: body.walletAddress,
      credits,
      paymentToken: body.paymentToken,
      paymentAmount: body.paymentAmount,
      transactionSignature: body.transactionSignature,
    })

    const tierConfig = TIER_CONFIG[tier]
    const ghostBonus = body.paymentToken === 'GHOST' ? tierConfig.ghostBonus : 0
    const bonusCredits = Math.floor(credits * ghostBonus)

    return Response.json(
      {
        success: true,
        deposit: {
          credits,
          baseCredits: credits - bonusCredits,
          bonusCredits,
          ghostBonus: `${ghostBonus * 100}%`,
          paymentToken: body.paymentToken,
          paymentAmount: body.paymentAmount,
          usdValue: usdValue.toFixed(2),
          transactionSignature: body.transactionSignature,
        },
        newBalance: result.newBalance,
        tier,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Billing deposit API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return deposit instructions
  return Response.json(
    {
      instructions: 'Send payment to treasury wallet and POST transaction details',
      treasuryWallet: TREASURY_WALLET,
      acceptedTokens: {
        USDC: {
          mint: TOKENS.USDC.mint,
          symbol: 'USDC',
          decimals: TOKENS.USDC.decimals,
        },
        SOL: {
          mint: TOKENS.SOL.mint,
          symbol: 'SOL',
          decimals: TOKENS.SOL.decimals,
        },
        GHOST: {
          mint: TOKENS.GHOST.mint,
          symbol: 'GHOST',
          decimals: TOKENS.GHOST.decimals,
          note: 'Pay with GHOST for bonus credits!',
        },
      },
      tiers: Object.entries(TIER_CONFIG).map(([key, config]) => ({
        tier: key,
        name: config.name,
        pricePerThousandCredits: `$${config.pricePerThousandCredits}`,
        ghostBonus: `${config.ghostBonus * 100}%`,
        monthlyFreeCredits: config.monthlyFreeCredits,
        rateLimit: `${config.rateLimit}/min`,
      })),
      example: {
        method: 'POST',
        body: {
          walletAddress: 'YourWalletAddress...',
          transactionSignature: 'TransactionSignature...',
          paymentToken: 'USDC',
          paymentAmount: 10,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300',
      },
    }
  )
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
