/**
 * Convex client for querying indexed agent data
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../web/convex/_generated/api.js'

let convexClient: ConvexHttpClient | null = null

/**
 * Get or create Convex client instance
 */
export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL

    if (!convexUrl) {
      throw new Error(
        'CONVEX_URL not configured. Please set CONVEX_URL environment variable.'
      )
    }

    convexClient = new ConvexHttpClient(convexUrl)
  }

  return convexClient
}

/**
 * Query discovered agents from Convex indexer
 */
export async function queryDiscoveredAgents(params?: {
  status?: 'discovered' | 'claimed' | 'verified'
  limit?: number
}) {
  const client = getConvexClient()

  return await client.query(api.ghostDiscovery.listDiscoveredAgents, {
    status: params?.status,
    limit: params?.limit || 100,
  })
}

/**
 * Get discovery statistics
 */
export async function getDiscoveryStats() {
  const client = getConvexClient()
  return await client.query(api.ghostDiscovery.getDiscoveryStats)
}

/**
 * Get agent by address
 */
export async function getDiscoveredAgent(ghostAddress: string) {
  const client = getConvexClient()
  return await client.query(api.ghostDiscovery.getDiscoveredAgent, {
    ghostAddress,
  })
}

/**
 * Get external ID mappings for an agent
 */
export async function getExternalIdMappings(ghostAddress: string) {
  const client = getConvexClient()
  return await client.query(api.ghostDiscovery.getExternalIdMappings, {
    ghostAddress,
  })
}

/**
 * Resolve external ID to Ghost address
 */
export async function resolveExternalId(platform: string, externalId: string) {
  const client = getConvexClient()
  return await client.query(api.ghostDiscovery.resolveExternalId, {
    platform,
    externalId,
  })
}

/**
 * Mark an agent as claimed in Convex database
 */
export async function markGhostClaimed(
  ghostAddress: string,
  claimedBy: string,
  claimTxSignature?: string
) {
  const client = getConvexClient()
  return await client.mutation(api.ghostDiscovery.claimAgent, {
    ghostAddress,
    claimedBy,
    claimTxSignature,
  })
}

/**
 * Get Ghost Score for an agent
 */
export async function getGhostScore(agentAddress: string) {
  const client = getConvexClient()
  return await client.query(api.ghostScoreCalculator.calculateAgentScore, {
    agentAddress,
  })
}
