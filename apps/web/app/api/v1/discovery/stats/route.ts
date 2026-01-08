/**
 * Discovery Stats API - Public (FREE)
 *
 * GET /api/v1/discovery/stats - Get comprehensive discovery statistics
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  // Rate limit check
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  try {
    const stats = await convex.query(api.ghostDiscovery.getDiscoveryStats, {})

    return Response.json(
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
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Discovery stats error:', error)
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
