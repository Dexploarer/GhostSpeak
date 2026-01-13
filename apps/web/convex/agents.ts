/**
 * Agents - Public agent profile queries
 *
 * NOTE: This file is intentionally scoped to public-safe reads.
 */

import { v } from 'convex/values'
import { query } from './_generated/server'

type FieldPresence<T> = { present: true; value: T } | { present: false; value: null }

function presence<T>(value: T | null | undefined): FieldPresence<T> {
  return value === undefined || value === null
    ? { present: false, value: null }
    : { present: true, value }
}

/**
 * Public profile lookup by agent (wallet) address.
 *
 * Contract (stable-ish):
 * - Always returns an object.
 * - Each nested section includes `exists` + `presentFields`/`missingFields`.
 */
export const getAgentProfilePublic = query({
  args: {
    agentAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const [discovered, mappings, reputation] = await Promise.all([
      ctx.db
        .query('discoveredAgents')
        .withIndex('by_address', (q) => q.eq('ghostAddress', args.agentAddress))
        .first(),
      ctx.db
        .query('externalIdMappings')
        .withIndex('by_ghost', (q) => q.eq('ghostAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('agentReputationCache')
        .withIndex('by_address', (q) => q.eq('agentAddress', args.agentAddress))
        .first(),
    ])

    const discoveredPublic = discovered
      ? {
          status: discovered.status,
          claimedBy: presence(discovered.claimedBy),
          claimedAt: presence(discovered.claimedAt),
          name: presence(discovered.name),
          description: presence(discovered.description),

          // IPFS / metadata pointers
          ipfsCid: presence(discovered.ipfsCid),
          ipfsUri: presence(discovered.ipfsUri),
          metadataFileId: presence(discovered.metadataFileId),

          // x402 fields
          x402ServiceEndpoint: presence(discovered.x402ServiceEndpoint),
          x402Enabled: presence(discovered.x402Enabled),
          x402PricePerCall: presence(discovered.x402PricePerCall),
          x402AcceptedTokens: presence(discovered.x402AcceptedTokens),

          // Discovery metadata (non-secret)
          discoverySource: discovered.discoverySource,
          facilitatorAddress: presence(discovered.facilitatorAddress),
          firstTxSignature: discovered.firstTxSignature,
          firstSeenTimestamp: discovered.firstSeenTimestamp,
          slot: discovered.slot,
          blockTime: discovered.blockTime,
          createdAt: discovered.createdAt,
          updatedAt: discovered.updatedAt,
        }
      : null

    const discoveredFieldPairs: Array<[string, { present: boolean }]> = discoveredPublic
      ? Object.entries(discoveredPublic).map(([k, v]: [string, any]) => {
          if (typeof v === 'object' && v !== null && 'present' in v) {
            return [k, v as { present: boolean }]
          }
          return [k, { present: true }]
        })
      : []

    const presentFields = discoveredFieldPairs.filter(([, p]) => p.present).map(([k]: [string, any]) => k)
    const missingFields = discoveredFieldPairs.filter(([, p]) => !p.present).map(([k]: [string, any]) => k)

    const mappingsPublic = mappings.map((m: any) => ({
      platform: m.platform,
      externalId: m.externalId,
      verified: m.verified,
      verifiedAt: m.verifiedAt,
      discoveredFrom: m.discoveredFrom,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }))

    const reputationPublic = reputation
      ? {
          ghostScore: reputation.ghostScore,
          tier: reputation.tier,
          successRate: reputation.successRate,
          avgResponseTime: presence(reputation.avgResponseTime),
          totalJobs: reputation.totalJobs,
          disputes: reputation.disputes,
          disputeResolution: reputation.disputeResolution,
          payaiData: presence(reputation.payaiData),
          credentialId: presence(reputation.credentialId),
          lastUpdated: reputation.lastUpdated,
        }
      : null

    const reputationFieldPairs: Array<[string, { present: boolean }]> = reputationPublic
      ? Object.entries(reputationPublic).map(([k, v]: [string, any]) => {
          if (typeof v === 'object' && v !== null && 'present' in v) {
            return [k, v as { present: boolean }]
          }
          return [k, { present: true }]
        })
      : []

    return {
      agentAddress: args.agentAddress,

      discoveredAgent: {
        exists: Boolean(discovered),
        record: discoveredPublic,
        presentFields,
        missingFields,
      },

      externalIdMappings: {
        exists: mappingsPublic.length > 0,
        count: mappingsPublic.length,
        items: mappingsPublic,
      },

      reputationCache: {
        exists: Boolean(reputationPublic),
        record: reputationPublic,
        presentFields: reputationFieldPairs.filter(([, p]) => p.present).map(([k]: [string, any]) => k),
        missingFields: reputationFieldPairs.filter(([, p]) => !p.present).map(([k]: [string, any]) => k),
      },
    }
  },
})
