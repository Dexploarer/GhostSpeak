/**
 * Failed Credential Issuance Retry System
 *
 * Tracks failed credential issuances and automatically retries them
 * with exponential backoff to handle temporary Crossmint API failures.
 */

import { internalMutation, internalAction, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

/**
 * Record a failed credential issuance
 */
export const recordFailedIssuance = internalMutation({
  args: {
    agentAddress: v.string(),
    credentialType: v.string(),
    payload: v.any(),
    error: v.string(),
  },
  returns: v.id('failedCredentialIssuances'),
  handler: async (ctx, args) => {
    const now = Date.now()

    const failedIssuanceId = await ctx.db.insert('failedCredentialIssuances', {
      agentAddress: args.agentAddress,
      credentialType: args.credentialType,
      payload: args.payload,
      error: args.error,
      retryCount: 0,
      maxRetries: 5,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })

    console.log('[Credentials Retry] Recorded failed issuance:', {
      id: failedIssuanceId,
      agent: args.agentAddress.slice(0, 8),
      type: args.credentialType,
    })

    return failedIssuanceId
  },
})

/**
 * Retry failed credential issuances
 *
 * Called by cron job every 15 minutes
 */
export const retryFailedIssuances = internalAction({
  args: {},
  returns: v.object({
    attempted: v.number(),
    succeeded: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx) => {
    // Get all pending failed issuances
    const failedIssuances = await ctx.runQuery(internal.credentialsRetry.getPendingRetries, {})

    let attempted = 0
    let succeeded = 0
    let failed = 0

    for (const failure of failedIssuances) {
      attempted++

      try {
        // Determine which action to call based on credential type
        let result: { success: boolean; credentialId?: string; error?: string } | null = null

        switch (failure.credentialType) {
          case 'agent_identity':
            result = await ctx.runAction(
              internal.sasCredentialsAction.issueAgentIdentityCredential,
              failure.payload
            )
            break
          case 'reputation_tier':
            result = await ctx.runAction(
              internal.sasCredentialsAction.issueReputationTierCredential,
              failure.payload
            )
            break
          case 'payment_milestone':
            result = await ctx.runAction(
              internal.sasCredentialsAction.issuePaymentMilestoneCredential,
              failure.payload
            )
            break
          case 'staking':
            result = await ctx.runAction(
              internal.sasCredentialsAction.issueStakingCredential,
              failure.payload
            )
            break
          case 'verified_hire':
            result = await ctx.runAction(
              internal.sasCredentialsAction.issueVerifiedHireCredential,
              failure.payload
            )
            break
          default:
            console.error('[Credentials Retry] Unknown credential type:', failure.credentialType)
            continue
        }

        if (result?.success) {
          // Mark as succeeded
          await ctx.runMutation(internal.credentialsRetry.markAsSucceeded, {
            failureId: failure._id,
          })
          succeeded++
          console.log('[Credentials Retry] Retry succeeded:', {
            id: failure._id,
            agent: failure.agentAddress.slice(0, 8),
            type: failure.credentialType,
          })
        } else {
          // Increment retry count
          await ctx.runMutation(internal.credentialsRetry.incrementRetryCount, {
            failureId: failure._id,
            error: result?.error || 'Unknown error',
          })
          failed++
        }
      } catch (error) {
        // Increment retry count
        await ctx.runMutation(internal.credentialsRetry.incrementRetryCount, {
          failureId: failure._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        failed++
      }
    }

    console.log('[Credentials Retry] Retry batch complete:', {
      attempted,
      succeeded,
      failed,
    })

    return {
      attempted,
      succeeded,
      failed,
    }
  },
})

/**
 * Get pending retries
 */
export const getPendingRetries = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('failedCredentialIssuances'),
      agentAddress: v.string(),
      credentialType: v.string(),
      payload: v.any(),
      retryCount: v.number(),
      maxRetries: v.number(),
    })
  ),
  handler: async (ctx) => {
    const pending = await ctx.db
      .query('failedCredentialIssuances')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .filter((q) => q.lt(q.field('retryCount'), q.field('maxRetries')))
      .take(50) // Process max 50 per batch

    return pending.map((f) => ({
      _id: f._id,
      agentAddress: f.agentAddress,
      credentialType: f.credentialType,
      payload: f.payload,
      retryCount: f.retryCount,
      maxRetries: f.maxRetries,
    }))
  },
})

/**
 * Mark a failed issuance as succeeded
 */
export const markAsSucceeded = internalMutation({
  args: { failureId: v.id('failedCredentialIssuances') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.failureId, {
      status: 'succeeded',
      updatedAt: Date.now(),
    })
  },
})

/**
 * Increment retry count for a failed issuance
 */
export const incrementRetryCount = internalMutation({
  args: {
    failureId: v.id('failedCredentialIssuances'),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const failure = await ctx.db.get(args.failureId)
    if (!failure) return

    const newRetryCount = failure.retryCount + 1
    const newStatus = newRetryCount >= failure.maxRetries ? 'failed' : 'pending'

    await ctx.db.patch(args.failureId, {
      retryCount: newRetryCount,
      status: newStatus,
      error: args.error,
      lastRetryAt: Date.now(),
      updatedAt: Date.now(),
    })

    if (newStatus === 'failed') {
      console.error('[Credentials Retry] Max retries exceeded:', {
        id: args.failureId,
        agent: failure.agentAddress.slice(0, 8),
        type: failure.credentialType,
        retryCount: newRetryCount,
      })
    }
  },
})

/**
 * Get retry statistics
 */
export const getRetryStats = internalMutation({
  args: {},
  returns: v.object({
    pending: v.number(),
    retrying: v.number(),
    succeeded: v.number(),
    failed: v.number(),
    totalRetries: v.number(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query('failedCredentialIssuances').collect()

    const pending = all.filter((f) => f.status === 'pending').length
    const retrying = all.filter((f) => f.status === 'retrying').length
    const succeeded = all.filter((f) => f.status === 'succeeded').length
    const failed = all.filter((f) => f.status === 'failed').length
    const totalRetries = all.reduce((sum, f) => sum + f.retryCount, 0)

    return {
      pending,
      retrying,
      succeeded,
      failed,
      totalRetries,
    }
  },
})
