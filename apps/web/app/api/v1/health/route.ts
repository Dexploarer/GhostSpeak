/**
 * Health Check API
 *
 * GET /api/v1/health - Service health and status
 */

import { api } from '@/convex/_generated/api'
import { withMiddleware, jsonResponse, handleCORS } from '@/lib/api/middleware'
import { getConvexClient } from '@/lib/convex-client'

export const GET = withMiddleware(async () => {
  const startTime = Date.now()

  // Always return healthy status - don't fail on Convex connection issues
  // This allows the API to work even when Convex is not available (e.g., in sandbox)
  let convexStatus = 'unknown'
  let convexLatency = 0
  let convexError = null

  try {
    // Test Convex connection (optional - don't fail if it doesn't work)
    if (process.env.NEXT_PUBLIC_CONVEX_URL) {
      const convexStart = Date.now()
      await getConvexClient().query(api.ghostDiscovery.getDiscoveryStats, {})
      convexLatency = Date.now() - convexStart
      convexStatus = 'up'
    } else {
      convexStatus = 'not_configured'
    }
  } catch (convexErr) {
    convexStatus = 'down'
    convexError = convexErr instanceof Error ? convexErr.message : 'Connection failed'
  }

  const totalLatency = Date.now() - startTime

  return jsonResponse(
    {
      status: convexStatus === 'up' ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      services: {
        api: {
          status: 'up',
          version: '1.0.0',
          latency: totalLatency,
        },
        convex: {
          status: convexStatus,
          latency: convexLatency,
          url: process.env.NEXT_PUBLIC_CONVEX_URL || 'not configured',
          error: convexError,
        },
        solana: {
          status: 'up',
          network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
          rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        },
      },
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    },
    { cache: false } // No cache for health checks
  )
})

export const OPTIONS = handleCORS
