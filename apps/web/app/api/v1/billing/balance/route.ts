/**
 * Billing Balance API
 *
 * GET /api/v1/billing/balance - Get user's credit balance and tier info
 */

import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'

export const GET = withMiddleware(async (request) => {
  // Get wallet address from query param or header
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('wallet') || request.headers.get('x-wallet-address')

  if (!walletAddress) {
    return errorResponse(
      'Missing wallet address. Provide ?wallet= query param or x-wallet-address header',
      400
    )
  }

  // Validate Solana address format
  const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
  if (!solanaAddressRegex.test(walletAddress)) {
    return errorResponse('Invalid Solana address format', 400)
  }

  // Get credit balance from Convex
  const balance = await getConvexClient().query(api.lib.credits.getBalance, { walletAddress })

  if (!balance) {
    return errorResponse('User not found. User must sign up first.', 404)
  }

  // Get pricing info
  const pricing = await getConvexClient().query(api.lib.credits.getPricing, { walletAddress })

  return jsonResponse({
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
  })
})

export const OPTIONS = handleCORS
