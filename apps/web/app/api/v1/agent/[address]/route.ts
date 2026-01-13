/**
 * Agent Details API - Public (FREE)
 *
 * GET /api/v1/agent/:address - Get comprehensive agent information
 */

import { NextRequest } from 'next/server'
import { api } from '@/convex/_generated/api'
import { jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'
import { getConvexClient } from '@/lib/convex-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  const { address: agentAddress } = await context.params

    // Validate Solana address format
    const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
    if (!solanaAddressRegex.test(agentAddress)) {
      return errorResponse('Invalid Solana address format', 400)
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
      return errorResponse(
        JSON.stringify({
          error: 'Agent not found',
          address: agentAddress,
          note: 'This is expected behavior - the agent does not exist in the database',
        }),
        404
      )
    }

    return jsonResponse(
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
      { cache: true } // Cache agent details for 60s
    )
}

export const OPTIONS = handleCORS
