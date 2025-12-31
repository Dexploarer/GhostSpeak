/**
 * Convex Actions for Verifiable Credential Issuance
 *
 * Centralizes all credential issuance logic for both webhook and on-chain paths.
 * Actions can make external API calls to Crossmint for VC issuance.
 */

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

// Credential type constants
export const CREDENTIAL_TYPES = {
  REPUTATION_TIER: 'reputation_tier', // Bronze/Silver/Gold/Platinum
  PAYMENT_MILESTONE: 'payment_milestone', // 10/100/1000 payments
  AGENT_IDENTITY: 'agent_identity', // Agent registration
  STAKING_VERIFIED: 'staking_verified', // GHOST staker badge
  VERIFIED_HIRE: 'verified_hire', // Review with payment proof
} as const

// Payment milestone thresholds
export const PAYMENT_MILESTONES = [
  { count: 10, tier: 'Bronze' },
  { count: 100, tier: 'Silver' },
  { count: 1000, tier: 'Gold' },
] as const

// Staking tier thresholds (in GHOST tokens)
export const STAKING_TIERS = [
  { amount: 5000, tier: 'Basic', badge: 'Verified Staker' },
  { amount: 50000, tier: 'Premium', badge: 'Premium Staker' },
  { amount: 500000, tier: 'Elite', badge: 'Elite Staker' },
] as const

/**
 * Issue a reputation tier credential (Bronze/Silver/Gold/Platinum)
 */
export const issueReputationTierCredential = action({
  args: {
    agentAddress: v.string(),
    tier: v.string(), // Bronze, Silver, Gold, Platinum
    ghostScore: v.number(),
    totalJobs: v.number(),
    successRate: v.number(),
    totalEarnings: v.string(), // BigInt as string
  },
  returns: v.object({
    success: v.boolean(),
    credentialId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      console.log('[Credentials] Issuing reputation tier credential:', {
        agent: args.agentAddress.slice(0, 8),
        tier: args.tier,
        score: args.ghostScore,
      })

      // Get Crossmint credentials from environment
      const crossmintApiKey = process.env.CROSSMINT_SECRET_KEY
      const templateId = process.env.CROSSMINT_REPUTATION_TEMPLATE_ID

      if (!crossmintApiKey || !templateId) {
        console.warn('[Credentials] Crossmint not configured, skipping credential issuance')
        return {
          success: false,
          error: 'Crossmint not configured',
        }
      }

      // Build credential subject data
      const subject = {
        agent: args.agentAddress,
        reputationScore: args.ghostScore,
        totalJobsCompleted: args.totalJobs,
        totalEarnings: parseInt(args.totalEarnings),
        successRate: args.successRate,
        avgRating: Math.min(5, Math.max(1, Math.floor(args.ghostScore / 2000))), // 1-5 stars
        disputeRate: 0, // Not tracked yet
        snapshotTimestamp: Math.floor(Date.now() / 1000),
      }

      // Issue credential via Crossmint
      const recipientEmail = `agent-${args.agentAddress.slice(0, 8)}@ghostspeak.credentials`
      const credential = await issueCrossmintCredential(
        crossmintApiKey,
        templateId,
        recipientEmail,
        subject
      )

      // Record credential issuance in database
      await ctx.runMutation(internal.credentialsOrchestrator.recordCredentialIssuance, {
        agentAddress: args.agentAddress,
        credentialType: CREDENTIAL_TYPES.REPUTATION_TIER,
        tier: args.tier,
        credentialId: credential.credentialId,
        crossmintId: credential.id,
        ghostScore: args.ghostScore,
        totalJobs: args.totalJobs,
      })

      console.log('[Credentials] Credential issued successfully:', {
        credentialId: credential.credentialId,
        tier: args.tier,
      })

      return {
        success: true,
        credentialId: credential.credentialId,
      }
    } catch (error) {
      console.error('[Credentials] Failed to issue credential:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Issue credential via Crossmint API
 */
async function issueCrossmintCredential(
  apiKey: string,
  templateId: string,
  recipientEmail: string,
  subject: Record<string, unknown>
): Promise<{ id: string; credentialId: string; onChain: { status: string } }> {
  const baseUrl = 'https://staging.crossmint.com'
  const chain = 'base-sepolia'

  const response = await fetch(`${baseUrl}/api/v1-alpha1/credentials/templates/${templateId}/vcs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      recipient: `email:${recipientEmail}:${chain}`,
      credential: {
        subject,
        expiresAt: getDefaultExpiry(),
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Crossmint API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

/**
 * Get default expiry date (1 year from now)
 */
function getDefaultExpiry(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().split('T')[0]
}

/**
 * Issue an Agent Identity credential on registration
 *
 * Includes DID, capabilities, x402 status, and agent metadata
 */
export const issueAgentIdentityCredential = action({
  args: {
    agentAddress: v.string(),
    did: v.string(), // did:sol:network:address
    name: v.string(),
    capabilities: v.array(v.string()),
    x402Enabled: v.boolean(),
    x402ServiceEndpoint: v.optional(v.string()),
    owner: v.string(),
    registeredAt: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    credentialId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      console.log('[Credentials] Issuing agent identity credential:', {
        agent: args.agentAddress.slice(0, 8),
        did: args.did,
        x402: args.x402Enabled,
      })

      const crossmintApiKey = process.env.CROSSMINT_SECRET_KEY
      const templateId = process.env.CROSSMINT_AGENT_IDENTITY_TEMPLATE_ID

      if (!crossmintApiKey || !templateId) {
        console.warn('[Credentials] Crossmint not configured for agent identity, skipping')
        return {
          success: false,
          error: 'Crossmint not configured',
        }
      }

      // Build credential subject data
      const subject = {
        agent: args.agentAddress,
        did: args.did,
        name: args.name,
        capabilities: args.capabilities,
        x402Enabled: args.x402Enabled,
        x402ServiceEndpoint: args.x402ServiceEndpoint || null,
        owner: args.owner,
        registeredAt: args.registeredAt,
        issuedAt: Math.floor(Date.now() / 1000),
      }

      // Issue credential via Crossmint
      const recipientEmail = `agent-${args.agentAddress.slice(0, 8)}@ghostspeak.credentials`
      const credential = await issueCrossmintCredential(
        crossmintApiKey,
        templateId,
        recipientEmail,
        subject
      )

      // Record in database
      await ctx.runMutation(internal.credentialsOrchestrator.recordAgentIdentityCredential, {
        agentAddress: args.agentAddress,
        credentialId: credential.credentialId,
        crossmintId: credential.id,
        did: args.did,
      })

      console.log('[Credentials] Agent identity credential issued:', {
        credentialId: credential.credentialId,
        agent: args.agentAddress.slice(0, 8),
      })

      return {
        success: true,
        credentialId: credential.credentialId,
      }
    } catch (error) {
      console.error('[Credentials] Failed to issue agent identity credential:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Issue a Payment Milestone credential (10/100/1000 payments)
 */
export const issuePaymentMilestoneCredential = action({
  args: {
    agentAddress: v.string(),
    milestone: v.number(), // 10, 100, or 1000
    tier: v.string(), // Bronze, Silver, Gold
    totalPayments: v.number(),
    totalVolume: v.string(), // BigInt as string
    successRate: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    credentialId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      console.log('[Credentials] Issuing payment milestone credential:', {
        agent: args.agentAddress.slice(0, 8),
        milestone: args.milestone,
        tier: args.tier,
      })

      const crossmintApiKey = process.env.CROSSMINT_SECRET_KEY
      const templateId = process.env.CROSSMINT_PAYMENT_MILESTONE_TEMPLATE_ID

      if (!crossmintApiKey || !templateId) {
        console.warn('[Credentials] Crossmint not configured for payment milestones, skipping')
        return {
          success: false,
          error: 'Crossmint not configured',
        }
      }

      // Build credential subject data
      const subject = {
        agent: args.agentAddress,
        milestone: args.milestone,
        tier: args.tier,
        totalPayments: args.totalPayments,
        totalVolume: parseInt(args.totalVolume),
        successRate: args.successRate,
        issuedAt: Math.floor(Date.now() / 1000),
      }

      // Issue credential via Crossmint
      const recipientEmail = `agent-${args.agentAddress.slice(0, 8)}@ghostspeak.credentials`
      const credential = await issueCrossmintCredential(
        crossmintApiKey,
        templateId,
        recipientEmail,
        subject
      )

      // Record in database
      await ctx.runMutation(internal.credentialsOrchestrator.recordPaymentMilestoneCredential, {
        agentAddress: args.agentAddress,
        credentialId: credential.credentialId,
        crossmintId: credential.id,
        milestone: args.milestone,
        tier: args.tier,
      })

      console.log('[Credentials] Payment milestone credential issued:', {
        credentialId: credential.credentialId,
        milestone: args.milestone,
      })

      return {
        success: true,
        credentialId: credential.credentialId,
      }
    } catch (error) {
      console.error('[Credentials] Failed to issue payment milestone credential:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Issue a Staking Verified credential for GHOST token stakers
 */
export const issueStakingCredential = action({
  args: {
    agentAddress: v.string(),
    tier: v.string(), // Basic, Premium, Elite
    badge: v.string(), // Verified Staker, Premium Staker, Elite Staker
    amountStaked: v.number(),
    stakingTier: v.number(), // 1, 2, 3
    reputationBoostBps: v.number(),
    unlockAt: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    credentialId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      console.log('[Credentials] Issuing staking credential:', {
        agent: args.agentAddress.slice(0, 8),
        tier: args.tier,
        amount: args.amountStaked,
      })

      const crossmintApiKey = process.env.CROSSMINT_SECRET_KEY
      const templateId = process.env.CROSSMINT_STAKING_TEMPLATE_ID

      if (!crossmintApiKey || !templateId) {
        console.warn('[Credentials] Crossmint not configured for staking, skipping')
        return {
          success: false,
          error: 'Crossmint not configured',
        }
      }

      // Build credential subject data
      const subject = {
        agent: args.agentAddress,
        tier: args.tier,
        badge: args.badge,
        amountStaked: args.amountStaked,
        stakingTier: args.stakingTier,
        reputationBoostBps: args.reputationBoostBps,
        unlockAt: args.unlockAt,
        issuedAt: Math.floor(Date.now() / 1000),
      }

      // Issue credential via Crossmint
      const recipientEmail = `agent-${args.agentAddress.slice(0, 8)}@ghostspeak.credentials`
      const credential = await issueCrossmintCredential(
        crossmintApiKey,
        templateId,
        recipientEmail,
        subject
      )

      // Record in database
      await ctx.runMutation(internal.credentialsOrchestrator.recordStakingCredential, {
        agentAddress: args.agentAddress,
        credentialId: credential.credentialId,
        crossmintId: credential.id,
        tier: args.tier,
        stakingTier: args.stakingTier,
        amountStaked: args.amountStaked,
      })

      console.log('[Credentials] Staking credential issued:', {
        credentialId: credential.credentialId,
        tier: args.tier,
      })

      return {
        success: true,
        credentialId: credential.credentialId,
      }
    } catch (error) {
      console.error('[Credentials] Failed to issue staking credential:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Issue a Verified Hire credential for reviews with payment proof
 */
export const issueVerifiedHireCredential = action({
  args: {
    agentAddress: v.string(),
    clientAddress: v.string(),
    rating: v.number(), // 1-5 stars
    review: v.string(),
    transactionSignature: v.string(),
    jobCategory: v.optional(v.string()),
    timestamp: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    credentialId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      console.log('[Credentials] Issuing verified hire credential:', {
        agent: args.agentAddress.slice(0, 8),
        client: args.clientAddress.slice(0, 8),
        rating: args.rating,
      })

      const crossmintApiKey = process.env.CROSSMINT_SECRET_KEY
      const templateId = process.env.CROSSMINT_VERIFIED_HIRE_TEMPLATE_ID

      if (!crossmintApiKey || !templateId) {
        console.warn('[Credentials] Crossmint not configured for verified hires, skipping')
        return {
          success: false,
          error: 'Crossmint not configured',
        }
      }

      // Build credential subject data
      const subject = {
        agent: args.agentAddress,
        client: args.clientAddress,
        rating: args.rating,
        review: args.review,
        transactionSignature: args.transactionSignature,
        jobCategory: args.jobCategory || 'General',
        timestamp: args.timestamp,
        issuedAt: Math.floor(Date.now() / 1000),
      }

      // Issue credential via Crossmint
      const recipientEmail = `agent-${args.agentAddress.slice(0, 8)}@ghostspeak.credentials`
      const credential = await issueCrossmintCredential(
        crossmintApiKey,
        templateId,
        recipientEmail,
        subject
      )

      // Record in database
      await ctx.runMutation(internal.credentialsOrchestrator.recordVerifiedHireCredential, {
        agentAddress: args.agentAddress,
        credentialId: credential.credentialId,
        crossmintId: credential.id,
        clientAddress: args.clientAddress,
        rating: args.rating,
        transactionSignature: args.transactionSignature,
      })

      console.log('[Credentials] Verified hire credential issued:', {
        credentialId: credential.credentialId,
        rating: args.rating,
      })

      return {
        success: true,
        credentialId: credential.credentialId,
      }
    } catch (error) {
      console.error('[Credentials] Failed to issue verified hire credential:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
