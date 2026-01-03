/**
 * Health Check API
 *
 * GET /api/v1/health - Service health and status
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export async function GET() {
  const startTime = Date.now()

  try {
    // Test Convex connection
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    await convex.query(api.ghostDiscovery.getDiscoveryStats, {})
    const convexLatency = Date.now() - startTime

    return Response.json({
      status: 'healthy',
      timestamp: Date.now(),
      services: {
        api: {
          status: 'up',
          version: '1.0.0',
        },
        convex: {
          status: 'up',
          latency: convexLatency,
          url: process.env.NEXT_PUBLIC_CONVEX_URL,
        },
        solana: {
          status: 'up',
          network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
          rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        },
      },
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    const errorLatency = Date.now() - startTime

    return Response.json({
      status: 'degraded',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        api: {
          status: 'up',
          version: '1.0.0',
        },
        convex: {
          status: 'down',
          latency: errorLatency,
          error: error instanceof Error ? error.message : 'Connection failed',
        },
        solana: {
          status: 'unknown',
          network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
        },
      },
    }, {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
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
