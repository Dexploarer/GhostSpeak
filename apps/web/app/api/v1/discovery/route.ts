/**
 * Discovery API - Public Endpoints
 *
 * GET /api/v1/discovery - List discovered agents
 * GET /api/v1/discovery/stats - Get discovery statistics
 * GET /api/v1/discovery/:address - Get specific agent details
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'discovered'
    const limit = parseInt(searchParams.get('limit') || '20')
    const address = searchParams.get('address')

    // Validate limit
    if (limit < 1 || limit > 100) {
      return Response.json({ error: 'Limit must be between 1 and 100' }, { status: 400 })
    }

    // If address is provided, get specific agent
    if (address) {
      const agent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
        ghostAddress: address,
      })

      if (!agent) {
        return Response.json({ error: 'Agent not found' }, { status: 404 })
      }

      return Response.json(
        {
          agent: {
            ghostAddress: agent.ghostAddress,
            status: agent.status,
            discoverySource: agent.discoverySource,
            firstSeenTimestamp: agent.firstSeenTimestamp,
            slot: agent.slot,
            blockTime: agent.blockTime,
            facilitatorAddress: agent.facilitatorAddress,
            claimedBy: agent.claimedBy,
            claimedAt: agent.claimedAt,
            metadataFileId: agent.metadataFileId,
            ipfsCid: agent.ipfsCid,
            ipfsUri: agent.ipfsUri,
          },
          timestamp: Date.now(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      )
    }

    // List agents with filters
    const [agents, stats] = await Promise.all([
      convex.query(api.ghostDiscovery.listDiscoveredAgents, { status, limit }),
      convex.query(api.ghostDiscovery.getDiscoveryStats, {}),
    ])

    return Response.json(
      {
        agents: agents.map((agent: any) => ({
          ghostAddress: agent.ghostAddress,
          status: agent.status,
          discoverySource: agent.discoverySource,
          firstSeenTimestamp: agent.firstSeenTimestamp,
          slot: agent.slot,
          blockTime: agent.blockTime,
          facilitatorAddress: agent.facilitatorAddress,
          claimedBy: agent.claimedBy,
          claimedAt: agent.claimedAt,
        })),
        stats,
        count: agents.length,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Discovery API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// CORS preflight
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
