/**
 * Platform Stats API
 *
 * GET /api/v1/stats - Get comprehensive platform statistics
 */

import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, handleCORS } from '@/lib/api/middleware'
import type { PlatformStatsResponse } from '@/lib/types/api'

export const GET = withMiddleware(async () => {
  // Fetch all stats in parallel
  const discoveryStats = await getConvexClient().query(api.ghostDiscovery.getDiscoveryStats, {})

  return jsonResponse<PlatformStatsResponse>(
    {
      platform: {
        name: 'GhostSpeak',
        version: '1.0.0',
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
        programId: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
      },

      discovery: {
        totalAgents: discoveryStats.total,
        discovered: discoveryStats.totalDiscovered,
        claimed: discoveryStats.totalClaimed,
        verified: discoveryStats.totalVerified,
      },

      network: {
        rpcEndpoint: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        websocketEndpoint:
          process.env.NEXT_PUBLIC_SOLANA_WS_URL || 'wss://api.devnet.solana.com',
      },

      features: {
        agentDiscovery: true,
        ghostScore: true,
        x402Payments: true,
        staking: true,
        reputation: true,
        escrow: true,
        verifiableCredentials: true,
      },

      timestamp: Date.now(),
    },
    { cache: true } // Enable 60s cache
  )
})

// CORS preflight handled automatically by middleware
export const OPTIONS = handleCORS
