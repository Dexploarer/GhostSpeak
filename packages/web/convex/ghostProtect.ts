/**
 * Ghost Protect: Convex queries and mutations for B2C escrow
 *
 * Provides real-time data layer for escrow transactions
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

//
// ─── QUERIES ───────────────────────────────────────────────────────────────────
//

/**
 * Get a single escrow by its on-chain PDA address
 */
export const getEscrow = query({
  args: { escrowId: v.string() },
  handler: async (ctx, args) => {
    const escrow = await ctx.db
      .query('escrows')
      .withIndex('by_escrow_id', (q) => q.eq('escrowId', args.escrowId))
      .first()

    return escrow
  },
})

/**
 * Get all escrows for a user (as client or agent)
 */
export const getUserEscrows = query({
  args: {
    walletAddress: v.string(),
    role: v.optional(v.union(v.literal('client'), v.literal('agent'))),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let escrows: Doc<'escrows'>[] = []

    if (!args.role || args.role === 'client') {
      const clientEscrows = await ctx.db
        .query('escrows')
        .withIndex('by_client', (q) => q.eq('clientAddress', args.walletAddress))
        .collect()
      escrows.push(...clientEscrows)
    }

    if (!args.role || args.role === 'agent') {
      const agentEscrows = await ctx.db
        .query('escrows')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.walletAddress))
        .collect()
      escrows.push(...agentEscrows)
    }

    // Filter by status if provided
    if (args.status) {
      escrows = escrows.filter((e) => e.status === args.status)
    }

    // Sort by most recent first
    escrows.sort((a, b) => b.createdAt - a.createdAt)

    return escrows
  },
})

/**
 * Get recent escrows for public feed
 */
export const getRecentEscrows = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const escrows = await ctx.db.query('escrows').order('desc').take(limit)

    return escrows
  },
})

/**
 * Get escrows by status
 */
export const getEscrowsByStatus = query({
  args: { status: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const escrows = await ctx.db
      .query('escrows')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')
      .take(limit)

    return escrows
  },
})

/**
 * Get timeline events for an escrow
 */
export const getEscrowTimeline = query({
  args: { escrowId: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query('escrowEvents')
      .withIndex('by_escrow_timestamp', (q) => q.eq('escrowId', args.escrowId))
      .collect()

    // Sort by timestamp ascending (oldest first for timeline)
    events.sort((a, b) => a.timestamp - b.timestamp)

    return events
  },
})

/**
 * Get escrow statistics for a user
 */
export const getUserEscrowStats = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const asClient = await ctx.db
      .query('escrows')
      .withIndex('by_client', (q) => q.eq('clientAddress', args.walletAddress))
      .collect()

    const asAgent = await ctx.db
      .query('escrows')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.walletAddress))
      .collect()

    return {
      asClient: {
        total: asClient.length,
        active: asClient.filter((e) => e.status === 'Active').length,
        completed: asClient.filter((e) => e.status === 'Completed').length,
        disputed: asClient.filter((e) => e.status === 'Disputed').length,
      },
      asAgent: {
        total: asAgent.length,
        active: asAgent.filter((e) => e.status === 'Active').length,
        completed: asAgent.filter((e) => e.status === 'Completed').length,
        disputed: asAgent.filter((e) => e.status === 'Disputed').length,
      },
    }
  },
})

//
// ─── MUTATIONS ─────────────────────────────────────────────────────────────────
//

/**
 * Record a newly created escrow from on-chain transaction
 */
export const recordEscrowCreated = mutation({
  args: {
    escrowId: v.string(),
    escrowIdNumber: v.string(),
    clientAddress: v.string(),
    agentAddress: v.string(),
    amount: v.string(),
    tokenMint: v.string(),
    tokenSymbol: v.optional(v.string()),
    tokenDecimals: v.optional(v.number()),
    jobDescription: v.string(),
    deadline: v.number(),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Create escrow record
    const escrowId = await ctx.db.insert('escrows', {
      escrowId: args.escrowId,
      escrowIdNumber: args.escrowIdNumber,
      clientAddress: args.clientAddress,
      agentAddress: args.agentAddress,
      amount: args.amount,
      tokenMint: args.tokenMint,
      tokenSymbol: args.tokenSymbol,
      tokenDecimals: args.tokenDecimals,
      jobDescription: args.jobDescription,
      deadline: args.deadline,
      status: 'Active',
      createdAt: now,
      transactionSignature: args.transactionSignature,
      lastUpdated: now,
    })

    // Create initial timeline event
    await ctx.db.insert('escrowEvents', {
      escrowId: args.escrowId,
      eventType: 'created',
      actor: args.clientAddress,
      data: {
        transactionSignature: args.transactionSignature,
      },
      timestamp: now,
    })

    return escrowId
  },
})

/**
 * Update escrow status
 */
export const updateEscrowStatus = mutation({
  args: {
    escrowId: v.string(),
    status: v.string(),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const escrow = await ctx.db
      .query('escrows')
      .withIndex('by_escrow_id', (q) => q.eq('escrowId', args.escrowId))
      .first()

    if (!escrow) {
      throw new Error('Escrow not found')
    }

    await ctx.db.patch(escrow._id, {
      status: args.status,
      completedAt: args.completedAt,
      lastUpdated: Date.now(),
    })

    return escrow._id
  },
})

/**
 * Add a timeline event to an escrow
 */
export const addTimelineEvent = mutation({
  args: {
    escrowId: v.string(),
    eventType: v.string(),
    actor: v.string(),
    data: v.optional(
      v.object({
        deliveryProof: v.optional(v.string()),
        disputeReason: v.optional(v.string()),
        arbitratorDecision: v.optional(v.string()),
        transactionSignature: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert('escrowEvents', {
      escrowId: args.escrowId,
      eventType: args.eventType,
      actor: args.actor,
      data: args.data,
      timestamp: Date.now(),
    })

    return eventId
  },
})

/**
 * Record delivery submission
 */
export const recordDeliverySubmitted = mutation({
  args: {
    escrowId: v.string(),
    deliveryProof: v.string(),
    agentAddress: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const escrow = await ctx.db
      .query('escrows')
      .withIndex('by_escrow_id', (q) => q.eq('escrowId', args.escrowId))
      .first()

    if (!escrow) {
      throw new Error('Escrow not found')
    }

    // Update escrow with delivery proof
    await ctx.db.patch(escrow._id, {
      deliveryProof: args.deliveryProof,
      lastUpdated: Date.now(),
    })

    // Add timeline event
    await ctx.db.insert('escrowEvents', {
      escrowId: args.escrowId,
      eventType: 'delivery_submitted',
      actor: args.agentAddress,
      data: {
        deliveryProof: args.deliveryProof,
        transactionSignature: args.transactionSignature,
      },
      timestamp: Date.now(),
    })

    return escrow._id
  },
})

/**
 * Record delivery approval
 */
export const recordDeliveryApproved = mutation({
  args: {
    escrowId: v.string(),
    clientAddress: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const escrow = await ctx.db
      .query('escrows')
      .withIndex('by_escrow_id', (q) => q.eq('escrowId', args.escrowId))
      .first()

    if (!escrow) {
      throw new Error('Escrow not found')
    }

    const now = Date.now()

    // Update escrow status
    await ctx.db.patch(escrow._id, {
      status: 'Completed',
      completedAt: now,
      lastUpdated: now,
    })

    // Add timeline event
    await ctx.db.insert('escrowEvents', {
      escrowId: args.escrowId,
      eventType: 'approved',
      actor: args.clientAddress,
      data: {
        transactionSignature: args.transactionSignature,
      },
      timestamp: now,
    })

    return escrow._id
  },
})

/**
 * Record dispute filed
 */
export const recordDisputeFiled = mutation({
  args: {
    escrowId: v.string(),
    disputeReason: v.string(),
    clientAddress: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const escrow = await ctx.db
      .query('escrows')
      .withIndex('by_escrow_id', (q) => q.eq('escrowId', args.escrowId))
      .first()

    if (!escrow) {
      throw new Error('Escrow not found')
    }

    const now = Date.now()

    // Update escrow with dispute
    await ctx.db.patch(escrow._id, {
      status: 'Disputed',
      disputeReason: args.disputeReason,
      lastUpdated: now,
    })

    // Add timeline event
    await ctx.db.insert('escrowEvents', {
      escrowId: args.escrowId,
      eventType: 'disputed',
      actor: args.clientAddress,
      data: {
        disputeReason: args.disputeReason,
        transactionSignature: args.transactionSignature,
      },
      timestamp: now,
    })

    return escrow._id
  },
})

/**
 * Record dispute resolution
 */
export const recordDisputeResolved = mutation({
  args: {
    escrowId: v.string(),
    arbitratorDecision: v.string(),
    arbitratorAddress: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const escrow = await ctx.db
      .query('escrows')
      .withIndex('by_escrow_id', (q) => q.eq('escrowId', args.escrowId))
      .first()

    if (!escrow) {
      throw new Error('Escrow not found')
    }

    const now = Date.now()

    // Update escrow with resolution
    await ctx.db.patch(escrow._id, {
      status: 'Completed', // Or could be 'Resolved'
      arbitratorDecision: args.arbitratorDecision,
      completedAt: now,
      lastUpdated: now,
    })

    // Add timeline event
    await ctx.db.insert('escrowEvents', {
      escrowId: args.escrowId,
      eventType: 'resolved',
      actor: args.arbitratorAddress,
      data: {
        arbitratorDecision: args.arbitratorDecision,
        transactionSignature: args.transactionSignature,
      },
      timestamp: now,
    })

    return escrow._id
  },
})
