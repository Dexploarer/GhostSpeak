/**
 * Discovery API - Public Endpoints (FREE)
 *
 * GET /api/v1/discovery - List discovered agents
 * GET /api/v1/discovery/stats - Get discovery statistics
 * GET /api/v1/discovery/:address - Get specific agent details
 */

import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'

export const GET = withMiddleware(async (request) => {
  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status') || 'discovered'
  const limit = parseInt(searchParams.get('limit') || '20')
  const address = searchParams.get('address')

  // Validate status
  const validStatuses = ['discovered', 'claimed', 'verified'] as const
  if (!validStatuses.includes(statusParam as any)) {
    return errorResponse('Invalid status. Must be: discovered, claimed, or verified', 400)
  }
  const status = statusParam as 'discovered' | 'claimed' | 'verified'

  // Validate limit
  if (limit < 1 || limit > 100) {
    return errorResponse('Limit must be between 1 and 100', 400)
  }

  // If address is provided, get specific agent
  if (address) {
    const agent = await getConvexClient().query(api.ghostDiscovery.getDiscoveredAgent, {
      ghostAddress: address,
    })

    if (!agent) {
      return errorResponse('Agent not found', 404)
    }

    return jsonResponse(
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
      { cache: true }
    )
  }

  // List agents with filters
  const [agents, stats] = await Promise.all([
    getConvexClient().query(api.ghostDiscovery.listDiscoveredAgents, { status, limit }),
    getConvexClient().query(api.ghostDiscovery.getDiscoveryStats, {}),
  ])

  return jsonResponse(
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
    { cache: true }
  )
})

export const OPTIONS = handleCORS
