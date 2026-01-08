/**
 * Convex client for querying indexed agent data
 *
 * Note: This module uses generic Convex API calls to avoid build-time dependencies
 * on generated Convex types from the web app.
 */

import { ConvexHttpClient } from 'convex/browser'

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

  // Use generic query - API endpoint name as string
  return await (client as any).query('ghostDiscovery:listDiscoveredAgents', {
    status: params?.status,
    limit: params?.limit || 100,
  })
}

/**
 * Get discovery statistics
 */
export async function getDiscoveryStats() {
  const client = getConvexClient()
  return await (client as any).query('ghostDiscovery:getDiscoveryStats')
}

/**
 * Get agent by address
 */
export async function getDiscoveredAgent(ghostAddress: string) {
  const client = getConvexClient()
  return await (client as any).query('ghostDiscovery:getDiscoveredAgent', {
    ghostAddress,
  })
}

/**
 * Get external ID mappings for an agent
 */
export async function getExternalIdMappings(ghostAddress: string) {
  const client = getConvexClient()
  return await (client as any).query('ghostDiscovery:getExternalIdMappings', {
    ghostAddress,
  })
}

/**
 * Resolve external ID to Ghost address
 */
export async function resolveExternalId(platform: string, externalId: string) {
  const client = getConvexClient()
  return await (client as any).query('ghostDiscovery:resolveExternalId', {
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
  return await (client as any).mutation('ghostDiscovery:claimAgent', {
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
  return await (client as any).query('ghostScoreCalculator:calculateAgentScore', {
    agentAddress,
  })
}
