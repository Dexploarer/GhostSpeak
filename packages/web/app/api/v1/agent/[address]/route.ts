/**
 * Agent Details API
 *
 * GET /api/v1/agent/:address - Get comprehensive agent information
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: agentAddress } = await params

    // Validate Solana address format
    const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
    if (!solanaAddressRegex.test(agentAddress)) {
      return Response.json({ error: 'Invalid Solana address format' }, { status: 400 })
    }

    // Fetch agent from discovery database
    const discoveredAgent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
      ghostAddress: agentAddress,
    })

    // Fetch external ID mappings
    const externalMappings = await convex.query(api.ghostDiscovery.getExternalIdMappings, {
      ghostAddress: agentAddress,
    })

    if (!discoveredAgent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 })
    }

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
