/**
 * Ghost Discovery - Mutations and Queries
 *
 * Store and retrieve discovered agents from blockchain monitoring
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { getDiscoveryNetworkMetadata } from './lib/networkMetadata'

/**
 * Store a newly discovered agent (called by actions)
 */
export const recordDiscoveredAgent = internalMutation({
  args: {
    ghostAddress: v.string(),
    firstTxSignature: v.string(),
    firstSeenTimestamp: v.number(),
    discoverySource: v.union(
      v.literal('program_logs'),
      v.literal('account_scan'),
      v.literal('x402_payment')
    ),
    facilitatorAddress: v.optional(v.string()),
    slot: v.number(),
    blockTime: v.number(),
    metadataFileId: v.optional(v.id('_storage')),
    ipfsCid: v.optional(v.string()),
    // x402 Payment Data (for historical feed)
    paymentAmount: v.optional(v.string()),
    paymentSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if agent already exists
    const existing = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (existing) {
      // Agent already discovered, just return existing record
      if (args.paymentSignature && args.paymentAmount) {
        // Proceed to record payment even if agent exists
      } else {
        return existing._id
      }
    }

    let agentId = existing?._id

    if (!existing) {
      // Insert new discovered agent
      agentId = await ctx.db.insert('discoveredAgents', {
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
    }

    // Record Historical Interaction (x402 Payment)
    if (args.paymentSignature && args.paymentAmount) {
      // Check deduplication
      const existingTx = await ctx.db
        .query('historicalInteractions')
        .withIndex('by_signature', (q) => q.eq('transactionSignature', args.paymentSignature!))
        .first()

      if (!existingTx) {
        await ctx.db.insert('historicalInteractions', {
          userWalletAddress: args.ghostAddress, // Payer
          agentWalletAddress: args.facilitatorAddress || 'unknown_facilitator', // Payee/Facilitator
          transactionSignature: args.paymentSignature,
          amount: args.paymentAmount,
          facilitatorAddress: args.facilitatorAddress || 'unknown_facilitator',
          blockTime: Math.floor(args.blockTime),
          discoveredAt: Date.now(),
          discoverySource: 'x402_indexer',
          agentKnown: true,
          agentId, // Optional link if the payer is the agent
        })
      }
    }

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
 * Public mutation to mark an agent as claimed (called by CLI)
 */
export const claimAgent = mutation({
  args: {
    ghostAddress: v.string(),
    claimedBy: v.string(),
    claimTxSignature: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    agentId: any // Using any to avoid importing Id<"discoveredAgents"> for now, or use string
    ghostAddress: string
    claimedBy: string
    credentialIssued: boolean
    credentialId: string | undefined
  }> => {
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (!agent) {
      throw new Error(`Agent ${args.ghostAddress} not found in discovery database`)
    }

    if (agent.status === 'claimed') {
      throw new Error(`Agent ${args.ghostAddress} is already claimed by ${agent.claimedBy}`)
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
      data: {
        signature: args.claimTxSignature,
      },
      timestamp: Date.now(),
    })

    // Issue agent identity credential
    const credentialResult = await ctx.runMutation(
      internal.credentials.issueAgentIdentityCredential,
      {
        agentAddress: args.ghostAddress,
        did: `did:sol:devnet:${args.ghostAddress}`,
      }
    )

    return {
      success: true,
      agentId: agent._id,
      ghostAddress: args.ghostAddress,
      claimedBy: args.claimedBy,
      credentialIssued: credentialResult.success,
      credentialId: credentialResult.credentialId,
    }
  },
})

/**
 * Update agent metadata (name, description, x402 config)
 * Only the agent owner (claimedBy) can update metadata
 */
export const updateAgentMetadata = mutation({
  args: {
    ghostAddress: v.string(),
    callerWallet: v.string(),
    // Optional metadata fields
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    // x402 service configuration
    x402ServiceEndpoint: v.optional(v.string()),
    x402Enabled: v.optional(v.boolean()),
    x402PricePerCall: v.optional(v.number()),
    x402AcceptedTokens: v.optional(v.array(v.string())),
    // IPFS metadata
    ipfsCid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (!agent) {
      throw new Error(`Agent ${args.ghostAddress} not found`)
    }

    // Only the owner can update metadata
    if (agent.claimedBy !== args.callerWallet) {
      throw new Error(`Only the agent owner can update metadata. Owner: ${agent.claimedBy}`)
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.x402ServiceEndpoint !== undefined)
      updates.x402ServiceEndpoint = args.x402ServiceEndpoint
    if (args.x402Enabled !== undefined) updates.x402Enabled = args.x402Enabled
    if (args.x402PricePerCall !== undefined) updates.x402PricePerCall = args.x402PricePerCall
    if (args.x402AcceptedTokens !== undefined) updates.x402AcceptedTokens = args.x402AcceptedTokens
    if (args.ipfsCid !== undefined) {
      updates.ipfsCid = args.ipfsCid
      updates.ipfsUri = args.ipfsCid ? `ipfs://${args.ipfsCid}` : undefined
    }

    await ctx.db.patch(agent._id, updates)

    // Metadata updated - log as agent_claimed since metadata_updated is not in schema
    // We can extend the schema later if needed
    // await ctx.db.insert('discoveryEvents', {
    //   eventType: 'metadata_updated', // Not in schema union
    //   ghostAddress: args.ghostAddress,
    //   timestamp: Date.now(),
    // })

    return {
      success: true,
      agentId: agent._id,
      ghostAddress: args.ghostAddress,
      updatedFields: Object.keys(updates).filter((k) => k !== 'updatedAt'),
    }
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
    network: v.union(v.literal('devnet'), v.literal('mainnet-beta')),
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
    status: v.optional(
      v.union(v.literal('discovered'), v.literal('claimed'), v.literal('verified'))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    if (args.status !== undefined) {
      const status = args.status // Type narrowing: now guaranteed non-undefined
      return await ctx.db
        .query('discoveredAgents')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit)
    }

    return await ctx.db.query('discoveredAgents').order('desc').take(limit)
  },
})

/**
 * Internal version for cron jobs
 */
export const listDiscoveredAgentsInternal = internalQuery({
  args: {
    status: v.optional(
      v.union(v.literal('discovered'), v.literal('claimed'), v.literal('verified'))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    if (args.status !== undefined) {
      const status = args.status // Type narrowing: now guaranteed non-undefined
      return await ctx.db
        .query('discoveredAgents')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit)
    }

    return await ctx.db.query('discoveredAgents').order('desc').take(limit)
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
 * Bulk import discovered agents from x402 backfill
 * Public mutation for importing historical data
 */
export const bulkImportDiscoveredAgents = mutation({
  args: {
    agents: v.array(
      v.object({
        ghostAddress: v.string(),
        firstTxSignature: v.string(),
        firstSeenTimestamp: v.number(),
        discoverySource: v.union(
          v.literal('program_logs'),
          v.literal('account_scan'),
          v.literal('x402_payment')
        ),
        facilitatorAddress: v.optional(v.string()),
        slot: v.number(),
        // Optional enrichment data
        solBalance: v.optional(v.number()),
        usdcBalance: v.optional(v.number()),
        totalTransactions: v.optional(v.number()),
        // Optional service data
        serviceCount: v.optional(v.number()),
        agentType: v.optional(v.string()), // 'payer' | 'merchant' | 'bidirectional'
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0
    let skipped = 0

    for (const agent of args.agents) {
      // Check if agent already exists
      const existing = await ctx.db
        .query('discoveredAgents')
        .withIndex('by_address', (q) => q.eq('ghostAddress', agent.ghostAddress))
        .first()

      if (existing) {
        skipped++
        continue
      }

      // Insert new discovered agent
      await ctx.db.insert('discoveredAgents', {
        ghostAddress: agent.ghostAddress,
        firstTxSignature: agent.firstTxSignature,
        firstSeenTimestamp: agent.firstSeenTimestamp,
        discoverySource: agent.discoverySource,
        facilitatorAddress: agent.facilitatorAddress,
        slot: agent.slot,
        blockTime: agent.firstSeenTimestamp,
        status: 'discovered',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      imported++
    }

    return {
      success: true,
      imported,
      skipped,
      total: args.agents.length,
    }
  },
})

/**
 * Get discovery stats
 */
export const getDiscoveryStats = query({
  returns: v.object({
    totalDiscovered: v.number(),
    totalClaimed: v.number(),
    totalVerified: v.number(),
    total: v.number(),
    network: v.object({
      chain: v.string(),
      environment: v.string(),
      rpcUrl: v.string(),
      notice: v.string(),
      programId: v.string(),
      ghostTokenMint: v.string(),
      discoveryNote: v.string(),
    }),
  }),
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
      network: getDiscoveryNetworkMetadata(),
    }
  },
})

/**
 * ADMIN: Transfer agent ownership (Fix for role assignment)
 */
export const adminTransferAgent = mutation({
  args: {
    ghostAddress: v.string(),
    newOwner: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (!agent) {
      throw new Error('Agent not found')
    }

    await ctx.db.patch(agent._id, {
      claimedBy: args.newOwner,
      status: 'claimed',
      updatedAt: Date.now(),
    })

    return { success: true, previousOwner: agent.claimedBy, newOwner: args.newOwner }
  },
})

/**
 * Register agent domain URL and trigger endpoint discovery
 * Allows agents to register their domain for x402 endpoint discovery
 */
export const registerAgentDomain = mutation({
  args: {
    ghostAddress: v.string(),
    domainUrl: v.string(),
    callerWallet: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q) => q.eq('ghostAddress', args.ghostAddress))
      .first()

    if (!agent) {
      throw new Error(`Agent ${args.ghostAddress} not found in discovery database`)
    }

    // If agent is claimed, verify ownership (optional callerWallet check)
    if (agent.status === 'claimed' && args.callerWallet) {
      if (agent.claimedBy !== args.callerWallet) {
        throw new Error(`Only the agent owner can register a domain. Owner: ${agent.claimedBy}`)
      }
    }

    // Validate domain format (no protocol, no trailing slash)
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/
    if (!domainRegex.test(args.domainUrl)) {
      throw new Error(
        'Invalid domain format. Use format: api.example.com (no http:// or trailing /)'
      )
    }

    // Update agent with domain
    await ctx.db.patch(agent._id, {
      domainUrl: args.domainUrl,
      updatedAt: Date.now(),
    })

    // Domain registered - log as external_id_mapped since domain_registered is not in schema
    // We can extend the schema later if needed for domain events
    // await ctx.db.insert('discoveryEvents', {
    //   eventType: 'domain_registered', // Not in schema union
    //   ghostAddress: args.ghostAddress,
    //   timestamp: Date.now(),
    // })

    return {
      success: true,
      agentId: agent._id,
      ghostAddress: args.ghostAddress,
      domainUrl: args.domainUrl,
      message: 'Domain registered successfully. Endpoint discovery will be triggered.',
    }
  },
})
