/**
 * Billing Balance API
 *
 * GET /api/v1/billing/balance - Get user's credit balance and tier info
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from query param or header
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet') || request.headers.get('x-wallet-address')

    if (!walletAddress) {
      return Response.json(
        {
          error: 'Missing wallet address. Provide ?wallet= query param or x-wallet-address header',
        },
        { status: 400 }
      )
    }

    // Validate Solana address format
    const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
    if (!solanaAddressRegex.test(walletAddress)) {
      return Response.json({ error: 'Invalid Solana address format' }, { status: 400 })
    }

    // Get credit balance from Convex
    const balance = await convex.query(api.lib.credits.getBalance, { walletAddress })

    if (!balance) {
      return Response.json(
        {
          error: 'User not found',
          note: 'User must sign up first',
        },
        { status: 404 }
      )
    }

    // Get pricing info
    const pricing = await convex.query(api.lib.credits.getPricing, { walletAddress })

    return Response.json(
      {
        balance: {
          freeCredits: balance.freeCredits,
          paidCredits: balance.paidCredits,
          totalCredits: balance.totalCredits,
          lastReset: balance.lastReset,
        },
        tier: {
          name: balance.tier,
          rateLimit: balance.rateLimit,
          ghostBonus: `${balance.ghostBonus * 100}%`,
        },
        pricing: {
          pricePerThousandCredits: pricing.pricePerThousandCredits,
          treasuryWallet: pricing.treasuryWallet,
          acceptedTokens: ['USDC', 'SOL', 'GHOST'],
        },
        timestamp: Date.now(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, no-cache',
        },
      }
    )
  } catch (error) {
    console.error('Billing balance API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-wallet-address',
    },
  })
}
