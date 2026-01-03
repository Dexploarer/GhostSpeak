/**
 * Platform Stats API
 *
 * GET /api/v1/stats - Get comprehensive platform statistics
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    // Fetch all stats in parallel
    const discoveryStats = await convex.query(api.ghostDiscovery.getDiscoveryStats, {})

    return Response.json({
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
        websocketEndpoint: process.env.NEXT_PUBLIC_SOLANA_WS_URL || 'wss://api.devnet.solana.com',
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
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Stats API error:', error)
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
