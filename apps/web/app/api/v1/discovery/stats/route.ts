/**
 * Discovery Stats API - Public (FREE)
 *
 * GET /api/v1/discovery/stats - Get comprehensive discovery statistics
 */

import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, handleCORS } from '@/lib/api/middleware'

interface DiscoveryStatsResponse {
  stats: {
    total: number
    totalDiscovered: number
    totalClaimed: number
    totalVerified: number
    percentageClaimed: number
    percentageVerified: number
  }
  timestamp: number
}

export const GET = withMiddleware(async () => {
  const stats = await getConvexClient().query(api.ghostDiscovery.getDiscoveryStats, {})

  return jsonResponse<DiscoveryStatsResponse>(
    {
      stats: {
        total: stats.total,
        totalDiscovered: stats.totalDiscovered,
        totalClaimed: stats.totalClaimed,
        totalVerified: stats.totalVerified,
        percentageClaimed:
          stats.total > 0 ? Math.round((stats.totalClaimed / stats.total) * 100) : 0,
        percentageVerified:
          stats.total > 0 ? Math.round((stats.totalVerified / stats.total) * 100) : 0,
      },
      timestamp: Date.now(),
    },
    { cache: true } // Enable 30s cache
  )
})

// CORS preflight handled automatically by middleware
export const OPTIONS = handleCORS
