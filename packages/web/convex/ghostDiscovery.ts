/**
 * Ghost Discovery - Mutations and Queries
 *
 * Store and retrieve discovered agents from blockchain monitoring
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'

/**
 * Store a newly discovered agent (called by actions)
 */
export const recordDiscoveredAgent = internalMutation({
  args: {
    ghostAddress: v.string(),
    firstTxSignature: v.string(),
    firstSeenTimestamp: v.number(),
    discoverySource: v.string(), // 'program_logs' | 'account_scan' | 'x402_payment'
    facilitatorAddress: v.optional(v.string()),
    slot: v.number(),
    blockTime: v.number(),
    metadataFileId: v.optional(v.id('_storage')),
    ipfsCid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if agent already exists
    const existing = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (existing) {
      // Agent already discovered, just return existing record
      return existing._id
    }

    // Insert new discovered agent
    const agentId = await ctx.db.insert('discoveredAgents', {
      ghostAddress: args.ghostAddress,
      firstTxSignature: args.firstTxSignature,
      firstSeenTimestamp: args.firstSeenTimestamp,
      discoverySource: args.discoverySource,
      facilitatorAddress: args.facilitatorAddress,
      slot: args.slot,
      blockTime: args.blockTime,
      status: 'discovered',
      metadataFileId: args.metadataFileId,
      ipfsCid: args.ipfsCid,
      ipfsUri: args.ipfsCid ? `ipfs://${args.ipfsCid}` : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Log discovery event
    await ctx.db.insert('discoveryEvents', {
      eventType: 'agent_discovered',
      ghostAddress: args.ghostAddress,
      data: {
        signature: args.firstTxSignature,
        slot: args.slot,
        blockTime: args.blockTime,
        facilitator: args.facilitatorAddress,
      },
      timestamp: Date.now(),
    })

    return agentId
  },
})

/**
 * Mark an agent as claimed (called by actions)
 */
export const markAgentClaimed = internalMutation({
  args: {
    ghostAddress: v.string(),
    claimedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (!agent) {
      throw new Error(`Agent ${args.ghostAddress} not found`)
    }

    // Update agent status
    await ctx.db.patch(agent._id, {
      status: 'claimed',
      claimedAt: Date.now(),
      claimedBy: args.claimedBy,
      updatedAt: Date.now(),
    })

    // Log claim event
    await ctx.db.insert('discoveryEvents', {
      eventType: 'agent_claimed',
      ghostAddress: args.ghostAddress,
      timestamp: Date.now(),
    })

    return agent._id
  },
})

/**
 * Add external ID mapping for an agent (called by actions)
 */
export const addExternalIdMapping = internalMutation({
  args: {
    ghostAddress: v.string(),
    platform: v.string(),
    externalId: v.string(),
    verified: v.boolean(),
    discoveredFrom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if mapping already exists
    const existing = await ctx.db
      .query('externalIdMappings')
      .withIndex('by_platform_external_id', (q) =>
        q.eq('platform', args.platform).eq('externalId', args.externalId)
      )
      .first()

    if (existing) {
      // Update existing mapping
      await ctx.db.patch(existing._id, {
        ghostAddress: args.ghostAddress,
        verified: args.verified,
        verifiedAt: args.verified ? Date.now() : undefined,
        updatedAt: Date.now(),
      })
      return existing._id
    }

    // Insert new mapping
    const mappingId = await ctx.db.insert('externalIdMappings', {
      ghostAddress: args.ghostAddress,
      platform: args.platform,
      externalId: args.externalId,
      verified: args.verified,
      verifiedAt: args.verified ? Date.now() : undefined,
      discoveredFrom: args.discoveredFrom,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Log mapping event
    await ctx.db.insert('discoveryEvents', {
      eventType: 'external_id_mapped',
      ghostAddress: args.ghostAddress,
      data: {
        platform: args.platform,
        externalId: args.externalId,
      },
      timestamp: Date.now(),
    })

    return mappingId
  },
})

/**
 * Update indexer state (called by actions)
 */
export const updateIndexerState = internalMutation({
  args: {
    stateKey: v.string(),
    value: v.string(),
    network: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('ghostIndexerState')
      .withIndex('by_state_key', (q) => q.eq('stateKey', args.stateKey))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert('ghostIndexerState', {
      stateKey: args.stateKey,
      value: args.value,
      network: args.network,
      updatedAt: Date.now(),
    })
  },
})

//
// ──────────────────────────────────────────────────── QUERIES ─────
//

/**
 * Get discovered agent by address
 */
export const getDiscoveredAgent = query({
  args: { ghostAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()
  },
})

/**
 * List discovered agents with pagination
 */
export const listDiscoveredAgents = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    if (args.status !== undefined) {
      return await ctx.db
        .query('discoveredAgents')
        .withIndex('by_status', (q) => q.eq('status', args.status as string))
        .order('desc')
        .take(limit)
    }

    return await ctx.db
      .query('discoveredAgents')
      .order('desc')
      .take(limit)
  },
})

/**
 * Internal version for cron jobs
 */
export const listDiscoveredAgentsInternal = internalQuery({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    if (args.status !== undefined) {
      return await ctx.db
        .query('discoveredAgents')
        .withIndex('by_status', (q) => q.eq('status', args.status as string))
        .order('desc')
        .take(limit)
    }

    return await ctx.db
      .query('discoveredAgents')
      .order('desc')
      .take(limit)
  },
})

/**
 * Get external ID mappings for a Ghost address
 */
export const getExternalIdMappings = query({
  args: { ghostAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('externalIdMappings')
      .withIndex('by_ghost', (q) => q.eq('ghostAddress', args.ghostAddress))
      .collect()
  },
})

/**
 * Resolve external ID to Ghost address
 */
export const resolveExternalId = query({
  args: {
    platform: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query('externalIdMappings')
      .withIndex('by_platform_external_id', (q) =>
        q.eq('platform', args.platform).eq('externalId', args.externalId)
      )
      .first()

    if (!mapping) {
      return null
    }

    // Also fetch the discovered agent details
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', mapping.ghostAddress))
      .first()

    return {
      mapping,
      agent,
    }
  },
})

/**
 * Get indexer state
 */
export const getIndexerState = query({
  args: { stateKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('ghostIndexerState')
      .withIndex('by_state_key', (q) => q.eq('stateKey', args.stateKey))
      .first()
  },
})

/**
 * Get discovery stats
 */
export const getDiscoveryStats = query({
  handler: async (ctx) => {
    const discovered = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_status', (q) => q.eq('status', 'discovered'))
      .collect()

    const claimed = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_status', (q) => q.eq('status', 'claimed'))
      .collect()

    const verified = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_status', (q) => q.eq('status', 'verified'))
      .collect()

    return {
      totalDiscovered: discovered.length,
      totalClaimed: claimed.length,
      totalVerified: verified.length,
      total: discovered.length + claimed.length + verified.length,
    }
  },
})
