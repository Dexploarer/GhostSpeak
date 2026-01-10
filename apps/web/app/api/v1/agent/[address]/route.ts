/**
 * Agent Details API - Public (FREE)
 *
 * GET /api/v1/agent/:address - Get comprehensive agent information
 */

import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'
import { completeWideEvent } from '@/lib/logging/wide-event'
import { checkRateLimit } from '@/lib/rate-limit'
import { getConvexClient } from '@/lib/convex-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  // Rate limit check
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  try {
    const { address: agentAddress } = await params

    // Validate Solana address format
    const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
    if (!solanaAddressRegex.test(agentAddress)) {
      completeWideEvent((request as any).wideEvent, {
        statusCode: 400,
        durationMs:
          Date.now() - (request as any).wideEvent?.timestamp
            ? new Date((request as any).wideEvent.timestamp).getTime()
            : Date.now(),
        error: {
          type: 'ValidationError',
          code: 'INVALID_ADDRESS_FORMAT',
          message: 'Invalid Solana address format',
          retriable: false,
        },
      })

      return Response.json({ error: 'Invalid Solana address format' }, { status: 400 })
    }

    // Get Convex client (lazy initialization)
    const client = getConvexClient()

    let discoveredAgent: {
      ghostAddress: string
      status: string
      discoverySource: string
      firstSeenTimestamp: number
      slot: number
      blockTime?: number
      firstTxSignature?: string
      facilitatorAddress?: string
      claimedBy?: string
      claimedAt?: number
      ipfsCid?: string
      ipfsUri?: string
      metadataFileId?: string
    } | null = null
    let externalMappings: Array<{
      platform: string
      externalId: string
      verified: boolean
      verifiedAt?: number
    }> = []

    // Try to fetch from Convex
    try {
      discoveredAgent = await client.query(api.ghostDiscovery.getDiscoveredAgent, {
        ghostAddress: agentAddress,
      })

      externalMappings = await client.query(api.ghostDiscovery.getExternalIdMappings, {
        ghostAddress: agentAddress,
      })
    } catch (convexError) {
      console.warn('Convex query failed, agent lookup will return 404:', convexError)
      // Agent not found - will return 404 below
    }

    // If no agent found (or Convex not available), return 404
    if (!discoveredAgent) {
      completeWideEvent((request as any).wideEvent, {
        statusCode: 404,
        durationMs:
          Date.now() - (request as any).wideEvent?.timestamp
            ? new Date((request as any).wideEvent.timestamp).getTime()
            : Date.now(),
      })

      return Response.json(
        {
          error: 'Agent not found',
          address: agentAddress,
          note: 'This is expected behavior - the agent does not exist in the database',
        },
        { status: 404 }
      )
    }

    // Complete wide event with success
    completeWideEvent((request as any).wideEvent, {
      statusCode: 200,
      durationMs:
        Date.now() - (request as any).wideEvent?.timestamp
          ? new Date((request as any).wideEvent.timestamp).getTime()
          : Date.now(),
    })

    // Complete wide event logging
    completeWideEvent((request as any).wideEvent, {
      statusCode: 200,
      durationMs:
        Date.now() - (request as any).wideEvent?.timestamp
          ? new Date((request as any).wideEvent.timestamp).getTime()
          : Date.now(),
    })

    return Response.json(
      {
        agent: {
          address: discoveredAgent.ghostAddress,
          status: discoveredAgent.status,

          discovery: {
            source: discoveredAgent.discoverySource,
            firstSeenTimestamp: discoveredAgent.firstSeenTimestamp,
            slot: discoveredAgent.slot,
            blockTime: discoveredAgent.blockTime,
            firstTxSignature: discoveredAgent.firstTxSignature,
            facilitatorAddress: discoveredAgent.facilitatorAddress,
          },

          ownership: {
            claimedBy: discoveredAgent.claimedBy,
            claimedAt: discoveredAgent.claimedAt,
          },

          metadata: {
            ipfsCid: discoveredAgent.ipfsCid,
            ipfsUri: discoveredAgent.ipfsUri,
            fileId: discoveredAgent.metadataFileId,
          },

          externalIds: externalMappings.map((mapping: any) => ({
            platform: mapping.platform,
            externalId: mapping.externalId,
            verified: mapping.verified,
            verifiedAt: mapping.verifiedAt,
          })),
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
  } catch (error) {
    console.error('Agent API error:', error)

    // Complete wide event with error
    completeWideEvent((request as any).wideEvent, {
      statusCode: 500,
      durationMs:
        Date.now() - (request as any).wideEvent?.timestamp
          ? new Date((request as any).wideEvent.timestamp).getTime()
          : Date.now(),
      error: {
        type: 'AgentAPIError',
        code: 'AGENT_LOOKUP_FAILED',
        message: error instanceof Error ? error.message : 'Agent lookup failed',
        retriable: true,
      },
    })

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
