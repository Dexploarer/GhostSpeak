/**
 * Billing Usage API
 *
 * GET /api/v1/billing/usage - Get user's API usage history and credit consumption
 */

import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'

export const GET = withMiddleware(async (request) => {
  // Get wallet address from query param or header
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('wallet') || request.headers.get('x-wallet-address')
  const days = parseInt(searchParams.get('days') || '30', 10)

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

  // Get usage data from Convex
  const usage = await getConvexClient().query(api.lib.credits.getUsageHistory, {
    walletAddress,
    days,
  })

  if (!usage) {
    return errorResponse('User not found. User must sign up first.', 404)
  }

  return jsonResponse(
    {
      usage,
      timestamp: Date.now(),
    },
    { cache: false } // Private data, don't cache
  )
})

export const OPTIONS = handleCORS
