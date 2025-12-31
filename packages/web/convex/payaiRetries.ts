/**
 * PayAI Failed Recording Retry Mechanism
 *
 * Stores failed on-chain payment recordings and retries them automatically.
 * This ensures that even if the RPC fails temporarily, we don't lose payment data.
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Store a failed on-chain recording for later retry
 */
export const storeFailedRecording = mutation({
  args: {
    agentAddress: v.string(),
    paymentSignature: v.string(),
    amount: v.string(), // BigInt as string
    responseTimeMs: v.number(),
    success: v.boolean(),
    payerAddress: v.string(),
    network: v.string(),
    error: v.string(),
    timestamp: v.number(),
  },
  returns: v.id('payaiFailedRecordings'),
  handler: async (ctx, args) => {
    // Check if this payment signature already exists
    const existing = await ctx.db
      .query('payaiFailedRecordings')
      .withIndex('by_payment_signature', (q) => q.eq('paymentSignature', args.paymentSignature))
      .first()

    if (existing) {
      console.log('[PayAI Retries] Payment already queued for retry:', args.paymentSignature)
      return existing._id
    }

    // Insert new failed recording
    const recordingId = await ctx.db.insert('payaiFailedRecordings', {
      agentAddress: args.agentAddress,
      paymentSignature: args.paymentSignature,
      amount: args.amount,
      responseTimeMs: args.responseTimeMs,
      success: args.success,
      payerAddress: args.payerAddress,
      network: args.network,
      error: args.error,
      retryCount: 0,
      lastRetryAt: undefined,
      maxRetries: 5, // Max 5 retries
      status: 'pending',
      timestamp: args.timestamp,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    console.log('[PayAI Retries] Stored failed recording:', {
      id: recordingId,
      paymentSignature: args.paymentSignature,
      agent: args.agentAddress,
    })

    return recordingId
  },
})

/**
 * Mark a failed recording as succeeded (called after successful retry)
 */
export const markRecordingSucceeded = mutation({
  args: {
    paymentSignature: v.string(),
    transactionSignature: v.string(),
  },
  returns: v.union(v.id('payaiFailedRecordings'), v.null()),
  handler: async (ctx, args) => {
    const recording = await ctx.db
      .query('payaiFailedRecordings')
      .withIndex('by_payment_signature', (q) => q.eq('paymentSignature', args.paymentSignature))
      .first()

    if (!recording) {
      console.warn('[PayAI Retries] Recording not found:', args.paymentSignature)
      return null
    }

    await ctx.db.patch(recording._id, {
      status: 'succeeded',
      updatedAt: Date.now(),
    })

    console.log('[PayAI Retries] Marked recording as succeeded:', {
      paymentSignature: args.paymentSignature,
      transactionSignature: args.transactionSignature,
    })

    return recording._id
  },
})

/**
 * Internal mutation to retry a single recording
 * (Called by cron job)
 */
export const retryFailedRecording = internalMutation({
  args: {
    recordingId: v.id('payaiFailedRecordings'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    recording: v.optional(
      v.object({
        agentAddress: v.string(),
        paymentSignature: v.string(),
        amount: v.string(),
        responseTimeMs: v.number(),
        success: v.boolean(),
        payerAddress: v.string(),
        network: v.string(),
        timestamp: v.any(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const recording = await ctx.db.get(args.recordingId)

    if (!recording) {
      console.error('[PayAI Retries] Recording not found:', args.recordingId)
      return { success: false, error: 'Recording not found' }
    }

    // Check retry limits
    if (recording.retryCount >= recording.maxRetries) {
      console.warn('[PayAI Retries] Max retries reached:', {
        id: args.recordingId,
        retries: recording.retryCount,
      })

      await ctx.db.patch(args.recordingId, {
        status: 'failed',
        updatedAt: Date.now(),
      })

      return { success: false, error: 'Max retries reached' }
    }

    // Update retry count and status
    await ctx.db.patch(args.recordingId, {
      retryCount: recording.retryCount + 1,
      lastRetryAt: Date.now(),
      status: 'retrying',
      updatedAt: Date.now(),
    })

    console.log('[PayAI Retries] Attempting retry:', {
      id: args.recordingId,
      attempt: recording.retryCount + 1,
      paymentSignature: recording.paymentSignature,
    })

    // Return the recording data so it can be retried externally
    // (The actual retry logic is in the webhook route)
    return {
      success: true,
      recording: {
        agentAddress: recording.agentAddress,
        paymentSignature: recording.paymentSignature,
        amount: recording.amount,
        responseTimeMs: recording.responseTimeMs,
        success: recording.success,
        payerAddress: recording.payerAddress,
        network: recording.network,
        timestamp: new Date(recording.timestamp),
      },
    }
  },
})

// =====================================================
// QUERIES
// =====================================================

/**
 * Get all pending failed recordings (for retry cron job)
 */
export const getPendingRecordings = query({
  returns: v.array(
    v.object({
      _id: v.id('payaiFailedRecordings'),
      _creationTime: v.number(),
      agentAddress: v.string(),
      paymentSignature: v.string(),
      amount: v.string(),
      responseTimeMs: v.number(),
      success: v.boolean(),
      payerAddress: v.string(),
      network: v.string(),
      error: v.string(),
      retryCount: v.number(),
      lastRetryAt: v.optional(v.number()),
      maxRetries: v.number(),
      status: v.string(),
      timestamp: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const recordings = await ctx.db
      .query('payaiFailedRecordings')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()

    return recordings
  },
})

/**
 * Get retry statistics
 */
export const getRetryStats = query({
  returns: v.object({
    total: v.number(),
    pending: v.number(),
    retrying: v.number(),
    succeeded: v.number(),
    failed: v.number(),
    successRate: v.string(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query('payaiFailedRecordings').collect()

    const pending = all.filter((r) => r.status === 'pending').length
    const retrying = all.filter((r) => r.status === 'retrying').length
    const succeeded = all.filter((r) => r.status === 'succeeded').length
    const failed = all.filter((r) => r.status === 'failed').length

    return {
      total: all.length,
      pending,
      retrying,
      succeeded,
      failed,
      successRate: all.length > 0 ? ((succeeded / all.length) * 100).toFixed(2) : '0.00',
    }
  },
})

/**
 * Get failed recordings for a specific agent
 */
export const getAgentFailedRecordings = query({
  args: {
    agentAddress: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id('payaiFailedRecordings'),
      _creationTime: v.number(),
      agentAddress: v.string(),
      paymentSignature: v.string(),
      amount: v.string(),
      responseTimeMs: v.number(),
      success: v.boolean(),
      payerAddress: v.string(),
      network: v.string(),
      error: v.string(),
      retryCount: v.number(),
      lastRetryAt: v.optional(v.number()),
      maxRetries: v.number(),
      status: v.string(),
      timestamp: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query('payaiFailedRecordings')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    return recordings
  },
})
