/**
 * Health Check API
 *
 * GET /api/v1/health - Service health and status
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { completeWideEvent } from '@/lib/logging/wide-event'

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    // Always return healthy status - don't fail on Convex connection issues
    // This allows the API to work even when Convex is not available (e.g., in sandbox)
    let convexStatus = 'unknown'
    let convexLatency = 0
    let convexError = null

    try {
      // Test Convex connection (optional - don't fail if it doesn't work)
      if (process.env.NEXT_PUBLIC_CONVEX_URL) {
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
        const convexStart = Date.now()
        await convex.query(api.ghostDiscovery.getDiscoveryStats, {})
        convexLatency = Date.now() - convexStart
        convexStatus = 'up'
      } else {
        convexStatus = 'not_configured'
      }
    } catch (convexErr) {
      convexStatus = 'down'
      convexError = convexErr instanceof Error ? convexErr.message : 'Connection failed'
    }

    // Complete wide event logging
    const totalLatency = Date.now() - startTime
    completeWideEvent((request as any).wideEvent, {
      statusCode: 200,
      durationMs: totalLatency,
    })

    return Response.json(
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
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    // Only fail if there's a critical API error, not Convex issues
    console.error('Health check critical error:', error)

    // Complete wide event logging for error
    const errorLatency = Date.now() - startTime
    completeWideEvent((request as any).wideEvent, {
      statusCode: 500,
      durationMs: errorLatency,
      error: {
        type: 'HealthCheckError',
        code: 'CRITICAL_API_ERROR',
        message: error instanceof Error ? error.message : 'Critical API error',
      },
    })

    return Response.json(
      {
        status: 'error',
        timestamp: Date.now(),
        error: 'Critical API error',
        services: {
          api: {
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
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
