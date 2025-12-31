/**
 * Test action for SAS integration
 *
 * This is a PUBLIC action that can be called from scripts to test the SAS integration.
 * It internally calls the sasCredentialsAction to issue a test credential.
 */

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

/**
 * Test issuing an agent identity credential via SAS
 */
export const testIssueAgentIdentityCredential = action({
  args: {
    agentAddress: v.string(),
    did: v.string(),
    name: v.string(),
    capabilities: v.array(v.string()),
    x402Enabled: v.boolean(),
    x402ServiceEndpoint: v.optional(v.string()),
    owner: v.string(),
    registeredAt: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    attestationPda: v.optional(v.string()),
    signature: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log('[Test] Calling SAS action to issue agent identity credential...')

    // Call the internal SAS action
    const result = await ctx.runAction(internal.sasCredentialsAction.issueAgentIdentityCredential, args)

    console.log('[Test] Result:', result)

    return result
  },
})

/**
 * Test issuing a reputation tier credential via SAS
 */
export const testIssueReputationTierCredential = action({
  args: {
    agentAddress: v.string(),
    tier: v.string(),
    ghostScore: v.number(),
    totalJobs: v.number(),
    successRate: v.number(),
    totalEarnings: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    attestationPda: v.optional(v.string()),
    signature: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log('[Test] Calling SAS action to issue reputation tier credential...')

    const result = await ctx.runAction(internal.sasCredentialsAction.issueReputationTierCredential, args)

    console.log('[Test] Result:', result)

    return result
  },
})
