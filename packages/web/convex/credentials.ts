/**
 * Credential Issuance - Convex Mutations
 *
 * Issue credentials to agents when they reach milestones.
 * All credentials are stored in Convex tables and contribute to Ghost Score.
 *
 * Network: All credentials are issued on Solana Devnet.
 */

import { v } from 'convex/values'
import { mutation, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'

/**
 * Generate a unique credential ID
 * Uses a simple deterministic string since Convex doesn't have crypto or Buffer
 */
function generateCredentialId(type: string, agentAddress: string, timestamp: number): string {
  // Create a deterministic ID from the inputs
  const data = `${type}-${agentAddress}-${timestamp}`

  // Simple hash function (djb2 algorithm)
  let hash = 5381
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }

  // Convert to base36 for compact representation
  const hashStr = Math.abs(hash).toString(36)

  // Return formatted credential ID: TYPE_HASH_TIMESTAMP
  return `${type.toLowerCase()}_${hashStr}_${timestamp.toString(36)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT IDENTITY CREDENTIAL
// Issued when an agent is claimed/registered
// ─────────────────────────────────────────────────────────────────────────────

export const issueAgentIdentityCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    did: v.optional(v.string()), // did:sol:network:address
  },
  handler: async (ctx, args) => {
    // Check if already issued
    const existing = await ctx.db
      .query('agentIdentityCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .first()

    if (existing) {
      return { success: false, reason: 'already_issued', credentialId: existing.credentialId }
    }

    const timestamp = Date.now()
    const credentialId = generateCredentialId('AGENT_IDENTITY', args.agentAddress, timestamp)
    const did = args.did || `did:sol:devnet:${args.agentAddress}`

    await ctx.db.insert('agentIdentityCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      did,
      issuedAt: timestamp,
    })

    return { success: true, credentialId, did }
  },
})

// Public version for manual issuance
export const issueAgentIdentityCredentialPublic = mutation({
  args: {
    agentAddress: v.string(),
    did: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.credentials.issueAgentIdentityCredential, args)
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// REPUTATION TIER CREDENTIAL
// Issued when Ghost Score crosses tier thresholds (2000, 5000, 7500, 9000)
// ─────────────────────────────────────────────────────────────────────────────

const REPUTATION_TIERS = [
  { milestone: 2000, tier: 'Bronze' },
  { milestone: 5000, tier: 'Silver' },
  { milestone: 7500, tier: 'Gold' },
  { milestone: 9000, tier: 'Platinum' },
] as const

export const issueReputationCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    ghostScore: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the highest tier the agent qualifies for
    const qualifiedTier = REPUTATION_TIERS.filter((t) => args.ghostScore >= t.milestone).pop()

    if (!qualifiedTier) {
      return { success: false, reason: 'score_too_low', ghostScore: args.ghostScore }
    }

    // Check if this tier already issued
    const existing = await ctx.db
      .query('payaiCredentialsIssued')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const alreadyHasTier = existing.some((c) => c.tier === qualifiedTier.tier)
    if (alreadyHasTier) {
      return { success: false, reason: 'tier_already_issued', tier: qualifiedTier.tier }
    }

    const timestamp = Date.now()
    const credentialId = generateCredentialId(
      `REPUTATION_${qualifiedTier.tier}`,
      args.agentAddress,
      timestamp
    )

    await ctx.db.insert('payaiCredentialsIssued', {
      agentAddress: args.agentAddress,
      credentialId,
      tier: qualifiedTier.tier,
      milestone: qualifiedTier.milestone,
      ghostScore: args.ghostScore,
      issuedAt: timestamp,
    })

    return {
      success: true,
      credentialId,
      tier: qualifiedTier.tier,
      milestone: qualifiedTier.milestone,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT MILESTONE CREDENTIAL
// Issued when x402 payment count crosses 10/100/1000
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_MILESTONES = [
  { count: 10, tier: 'Bronze' },
  { count: 100, tier: 'Silver' },
  { count: 1000, tier: 'Gold' },
] as const

export const issuePaymentMilestoneCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    paymentCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the highest milestone the agent qualifies for
    const qualifiedMilestone = PAYMENT_MILESTONES.filter(
      (m) => args.paymentCount >= m.count
    ).pop()

    if (!qualifiedMilestone) {
      return { success: false, reason: 'not_enough_payments', paymentCount: args.paymentCount }
    }

    // Check if this milestone already issued
    const existing = await ctx.db
      .query('paymentMilestoneCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const alreadyHasMilestone = existing.some((c) => c.milestone === qualifiedMilestone.count)
    if (alreadyHasMilestone) {
      return { success: false, reason: 'milestone_already_issued', milestone: qualifiedMilestone.count }
    }

    const timestamp = Date.now()
    const credentialId = generateCredentialId(
      `PAYMENT_${qualifiedMilestone.count}`,
      args.agentAddress,
      timestamp
    )

    await ctx.db.insert('paymentMilestoneCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      milestone: qualifiedMilestone.count,
      tier: qualifiedMilestone.tier,
      issuedAt: timestamp,
    })

    return {
      success: true,
      credentialId,
      milestone: qualifiedMilestone.count,
      tier: qualifiedMilestone.tier,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// STAKING CREDENTIAL
// Issued when agent stakes GHOST tokens (Basic/Premium/Elite tiers)
// ─────────────────────────────────────────────────────────────────────────────

const STAKING_TIERS = [
  { minStake: 1000, tier: 'Basic', stakingTier: 1 },
  { minStake: 10000, tier: 'Premium', stakingTier: 2 },
  { minStake: 100000, tier: 'Elite', stakingTier: 3 },
] as const

export const issueStakingCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    amountStaked: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the highest tier based on stake amount
    const qualifiedTier = STAKING_TIERS.filter((t) => args.amountStaked >= t.minStake).pop()

    if (!qualifiedTier) {
      return { success: false, reason: 'stake_too_low', amountStaked: args.amountStaked }
    }

    // Check if this tier already issued
    const existing = await ctx.db
      .query('stakingCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const alreadyHasTier = existing.some((c) => c.stakingTier === qualifiedTier.stakingTier)
    if (alreadyHasTier) {
      return { success: false, reason: 'tier_already_issued', tier: qualifiedTier.tier }
    }

    const timestamp = Date.now()
    const credentialId = generateCredentialId(
      `STAKING_${qualifiedTier.tier}`,
      args.agentAddress,
      timestamp
    )

    await ctx.db.insert('stakingCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      tier: qualifiedTier.tier,
      stakingTier: qualifiedTier.stakingTier,
      amountStaked: args.amountStaked,
      issuedAt: timestamp,
    })

    return {
      success: true,
      credentialId,
      tier: qualifiedTier.tier,
      stakingTier: qualifiedTier.stakingTier,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// VERIFIED HIRE CREDENTIAL
// Issued when a review with payment proof is submitted
// ─────────────────────────────────────────────────────────────────────────────

export const issueVerifiedHireCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    clientAddress: v.string(),
    rating: v.number(),
    transactionSignature: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if credential for this transaction already exists
    const existing = await ctx.db
      .query('verifiedHireCredentials')
      .withIndex('by_transaction', (q) => q.eq('transactionSignature', args.transactionSignature))
      .first()

    if (existing) {
      return { success: false, reason: 'already_issued_for_tx', transactionSignature: args.transactionSignature }
    }

    const timestamp = Date.now()
    const credentialId = generateCredentialId('VERIFIED_HIRE', args.agentAddress, timestamp)

    await ctx.db.insert('verifiedHireCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      clientAddress: args.clientAddress,
      rating: args.rating,
      transactionSignature: args.transactionSignature,
      issuedAt: timestamp,
    })

    return { success: true, credentialId }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY VERIFICATION CREDENTIAL (Priority 1)
// Issued when Caisper observation tests verify claimed capabilities work
// ─────────────────────────────────────────────────────────────────────────────

const CAPABILITY_VALIDITY_DAYS = 30 // Credentials expire after 30 days

export const issueCapabilityVerificationCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    capabilities: v.array(v.string()),
    testsRun: v.number(),
    testsPassed: v.number(),
  },
  handler: async (ctx, args) => {
    const successRate = args.testsRun > 0 ? (args.testsPassed / args.testsRun) * 100 : 0

    // Must have at least 70% success rate to issue
    if (successRate < 70) {
      return {
        success: false,
        reason: 'success_rate_too_low',
        successRate,
        required: 70,
      }
    }

    const timestamp = Date.now()
    const validUntil = timestamp + CAPABILITY_VALIDITY_DAYS * 24 * 60 * 60 * 1000

    // Check for existing valid credential with same capabilities
    const existing = await ctx.db
      .query('capabilityVerificationCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const activeCredential = existing.find((c) => c.validUntil > timestamp)
    if (activeCredential) {
      // Update existing credential instead of creating new one
      await ctx.db.patch(activeCredential._id, {
        testsRun: args.testsRun,
        testsPassed: args.testsPassed,
        successRate,
        capabilities: args.capabilities,
        validUntil,
      })
      return {
        success: true,
        credentialId: activeCredential.credentialId,
        updated: true,
      }
    }

    const credentialId = generateCredentialId('CAPABILITY_VERIFIED', args.agentAddress, timestamp)

    await ctx.db.insert('capabilityVerificationCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      capabilities: args.capabilities,
      verificationMethod: 'caisper_observation',
      testsRun: args.testsRun,
      testsPassed: args.testsPassed,
      successRate,
      validFrom: timestamp,
      validUntil,
      issuedAt: timestamp,
    })

    return { success: true, credentialId, successRate, validUntil }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// UPTIME ATTESTATION CREDENTIAL (Priority 1)
// Issued when agent maintains high availability over observation period
// ─────────────────────────────────────────────────────────────────────────────

const UPTIME_TIERS = [
  { minUptime: 99.9, tier: 'gold' },
  { minUptime: 99.0, tier: 'silver' },
  { minUptime: 95.0, tier: 'bronze' },
] as const

export const issueUptimeAttestationCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    totalTests: v.number(),
    successfulResponses: v.number(),
    avgResponseTimeMs: v.number(),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const uptimePercentage =
      args.totalTests > 0 ? (args.successfulResponses / args.totalTests) * 100 : 0

    // Find qualifying tier
    const qualifiedTier = UPTIME_TIERS.find((t) => uptimePercentage >= t.minUptime)

    if (!qualifiedTier) {
      return {
        success: false,
        reason: 'uptime_too_low',
        uptimePercentage,
        required: 95,
      }
    }

    // Calculate observation period in days
    const periodDays = Math.round((args.periodEnd - args.periodStart) / (24 * 60 * 60 * 1000))

    // Need at least 7 days of observation
    if (periodDays < 7) {
      return {
        success: false,
        reason: 'observation_period_too_short',
        periodDays,
        required: 7,
      }
    }

    const timestamp = Date.now()

    // Check for existing credential for this agent
    const existing = await ctx.db
      .query('uptimeAttestationCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    // Find the most recent credential (regardless of tier)
    const mostRecent = existing.sort((a, b) => b.issuedAt - a.issuedAt)[0]

    if (mostRecent) {
      // If same or lower tier, just update the existing credential with new data
      // This creates a "rolling uptime" credential that gets refreshed
      const existingTierIndex = UPTIME_TIERS.findIndex((t) => t.tier === mostRecent.tier)
      const newTierIndex = UPTIME_TIERS.findIndex((t) => t.tier === qualifiedTier.tier)

      if (newTierIndex >= existingTierIndex) {
        // Update existing credential with refreshed data
        await ctx.db.patch(mostRecent._id, {
          uptimePercentage,
          tier: qualifiedTier.tier,
          observationPeriodDays: periodDays,
          totalTests: args.totalTests,
          successfulResponses: args.successfulResponses,
          avgResponseTimeMs: args.avgResponseTimeMs,
          periodStart: args.periodStart,
          periodEnd: args.periodEnd,
          issuedAt: timestamp, // Refresh timestamp
        })
        return {
          success: true,
          credentialId: mostRecent.credentialId,
          tier: qualifiedTier.tier,
          uptimePercentage,
          periodDays,
          updated: true,
        }
      }
      // If new tier is HIGHER (better uptime), create new credential below
    }

    const credentialId = generateCredentialId(
      `UPTIME_${qualifiedTier.tier.toUpperCase()}`,
      args.agentAddress,
      timestamp
    )

    await ctx.db.insert('uptimeAttestationCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      uptimePercentage,
      tier: qualifiedTier.tier,
      observationPeriodDays: periodDays,
      totalTests: args.totalTests,
      successfulResponses: args.successfulResponses,
      avgResponseTimeMs: args.avgResponseTimeMs,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      issuedAt: timestamp,
    })

    return {
      success: true,
      credentialId,
      tier: qualifiedTier.tier,
      uptimePercentage,
      periodDays,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// API QUALITY GRADE CREDENTIAL (Priority 1)
// A/B/C/D/F grades from Caisper daily observation reports
// ─────────────────────────────────────────────────────────────────────────────

function calculateGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export const issueAPIQualityGradeCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    responseQuality: v.number(),
    capabilityAccuracy: v.number(),
    consistency: v.number(),
    documentation: v.number(),
    endpointsTested: v.number(),
    reportDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    // Calculate overall grade score (weighted average)
    const gradeScore =
      args.responseQuality * 0.3 +
      args.capabilityAccuracy * 0.35 +
      args.consistency * 0.25 +
      args.documentation * 0.1

    const grade = calculateGrade(gradeScore)

    // Check if credential for this date already exists
    const existing = await ctx.db
      .query('apiQualityGradeCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const existingForDate = existing.find((c) => c.reportDate === args.reportDate)
    if (existingForDate) {
      // Update existing credential with new data
      await ctx.db.patch(existingForDate._id, {
        grade,
        gradeScore,
        responseQuality: args.responseQuality,
        capabilityAccuracy: args.capabilityAccuracy,
        consistency: args.consistency,
        documentation: args.documentation,
        endpointsTested: args.endpointsTested,
      })
      return {
        success: true,
        credentialId: existingForDate.credentialId,
        grade,
        gradeScore,
        updated: true,
      }
    }

    const timestamp = Date.now()
    const credentialId = generateCredentialId(`API_GRADE_${grade}`, args.agentAddress, timestamp)

    await ctx.db.insert('apiQualityGradeCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      grade,
      gradeScore,
      responseQuality: args.responseQuality,
      capabilityAccuracy: args.capabilityAccuracy,
      consistency: args.consistency,
      documentation: args.documentation,
      endpointsTested: args.endpointsTested,
      reportDate: args.reportDate,
      issuedAt: timestamp,
    })

    return { success: true, credentialId, grade, gradeScore }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// TEE ATTESTATION CREDENTIAL (Priority 2)
// Proves agent runs in Trusted Execution Environment
// ─────────────────────────────────────────────────────────────────────────────

const TEE_VALIDITY_DAYS = 90 // TEE attestations valid for 90 days

export const issueTEEAttestationCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    teeType: v.string(), // 'intel_tdx', 'intel_sgx', 'phala', 'eigencloud'
    teeProvider: v.string(), // 'phala_cloud', 'eigenai', 'self_hosted'
    attestationReport: v.string(), // DCAP report hash
    enclaveId: v.optional(v.string()),
    verifiedBy: v.string(), // 'on_chain_dcap', 'phala_ra', 'manual'
    verificationTxSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now()
    const validUntil = timestamp + TEE_VALIDITY_DAYS * 24 * 60 * 60 * 1000

    // Check for existing valid TEE credential
    const existing = await ctx.db
      .query('teeAttestationCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const activeCredential = existing.find((c) => c.validUntil > timestamp)
    if (activeCredential) {
      // If same TEE type and still valid, skip
      if (activeCredential.teeType === args.teeType) {
        return {
          success: false,
          reason: 'valid_credential_exists',
          credentialId: activeCredential.credentialId,
          validUntil: activeCredential.validUntil,
        }
      }
    }

    const credentialId = generateCredentialId(
      `TEE_${args.teeType.toUpperCase()}`,
      args.agentAddress,
      timestamp
    )

    await ctx.db.insert('teeAttestationCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      teeType: args.teeType,
      teeProvider: args.teeProvider,
      attestationReport: args.attestationReport,
      enclaveId: args.enclaveId,
      verifiedBy: args.verifiedBy,
      verificationTxSignature: args.verificationTxSignature,
      validFrom: timestamp,
      validUntil,
      issuedAt: timestamp,
    })

    return { success: true, credentialId, teeType: args.teeType, validUntil }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// MODEL PROVENANCE CREDENTIAL (Priority 2)
// Documents what LLM/AI model the agent uses (EU AI Act compliance)
// ─────────────────────────────────────────────────────────────────────────────

export const issueModelProvenanceCredential = internalMutation({
  args: {
    agentAddress: v.string(),
    modelName: v.string(),
    modelProvider: v.string(),
    modelVersion: v.string(),
    contextWindow: v.optional(v.number()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    frameworkName: v.optional(v.string()),
    frameworkVersion: v.optional(v.string()),
    selfAttested: v.boolean(),
    verificationMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now()

    // Check for existing credential with same model
    const existing = await ctx.db
      .query('modelProvenanceCredentials')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const sameModel = existing.find(
      (c) =>
        c.modelName === args.modelName &&
        c.modelProvider === args.modelProvider &&
        c.modelVersion === args.modelVersion
    )

    if (sameModel) {
      return {
        success: false,
        reason: 'model_already_attested',
        credentialId: sameModel.credentialId,
      }
    }

    const credentialId = generateCredentialId(
      `MODEL_${args.modelProvider.toUpperCase()}`,
      args.agentAddress,
      timestamp
    )

    await ctx.db.insert('modelProvenanceCredentials', {
      agentAddress: args.agentAddress,
      credentialId,
      modelName: args.modelName,
      modelProvider: args.modelProvider,
      modelVersion: args.modelVersion,
      contextWindow: args.contextWindow,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      frameworkName: args.frameworkName,
      frameworkVersion: args.frameworkVersion,
      selfAttested: args.selfAttested,
      verificationMethod: args.verificationMethod,
      issuedAt: timestamp,
    })

    return {
      success: true,
      credentialId,
      modelName: args.modelName,
      modelProvider: args.modelProvider,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIAL MILESTONE CHECKER
// Run daily to check all agents for new milestone credentials
// ─────────────────────────────────────────────────────────────────────────────

export const checkAndIssueMilestoneCredentials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      checked: 0,
      reputationIssued: 0,
      paymentMilestonesIssued: 0,
      stakingIssued: 0,
      errors: [] as string[],
    }

    // Get all discovered agents
    const agents = await ctx.db.query('discoveredAgents').collect()
    results.checked = agents.length

    for (const agent of agents) {
      try {
        // Check reputation credentials based on any existing Ghost Score data
        // Note: This would need to query the actual Ghost Score, but for now
        // we'll skip if no score data exists

        // Check payment milestones by counting x402 payments received (as merchant)
        const payments = await ctx.db
          .query('x402SyncEvents')
          .withIndex('by_merchant', (q) => q.eq('merchantAddress', agent.ghostAddress))
          .collect()

        if (payments.length > 0) {
          const paymentResult = await ctx.runMutation(
            internal.credentials.issuePaymentMilestoneCredential,
            {
              agentAddress: agent.ghostAddress,
              paymentCount: payments.length,
            }
          )
          if (paymentResult.success) {
            results.paymentMilestonesIssued++
          }
        }
      } catch (error) {
        results.errors.push(`Error processing ${agent.ghostAddress}: ${error}`)
      }
    }

    return results
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIAL QUERIES
// Get credentials for an agent
// ─────────────────────────────────────────────────────────────────────────────

export const getAgentCredentials = internalQuery({
  args: { agentAddress: v.string() },
  handler: async (ctx, args) => {
    const [
      identity,
      reputation,
      paymentMilestones,
      staking,
      verifiedHires,
      capabilityVerification,
      uptimeAttestation,
      apiQualityGrade,
      teeAttestation,
      modelProvenance,
    ] = await Promise.all([
      ctx.db
        .query('agentIdentityCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('payaiCredentialsIssued')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('paymentMilestoneCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('stakingCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('verifiedHireCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      // New credential types
      ctx.db
        .query('capabilityVerificationCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('uptimeAttestationCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('apiQualityGradeCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('teeAttestationCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
      ctx.db
        .query('modelProvenanceCredentials')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
        .collect(),
    ])

    // Filter for valid (non-expired) credentials
    const now = Date.now()
    const validCapability = capabilityVerification.filter((c) => c.validUntil > now)
    const validTee = teeAttestation.filter((c) => c.validUntil > now)

    return {
      // Original credentials
      identity,
      reputation,
      paymentMilestones,
      staking,
      verifiedHires,
      // New credentials
      capabilityVerification: validCapability,
      uptimeAttestation,
      apiQualityGrade,
      teeAttestation: validTee,
      modelProvenance,
      // Summary
      totalCount:
        identity.length +
        reputation.length +
        paymentMilestones.length +
        staking.length +
        verifiedHires.length +
        validCapability.length +
        uptimeAttestation.length +
        apiQualityGrade.length +
        validTee.length +
        modelProvenance.length,
      // Expiring soon (within 7 days)
      expiringSoon: [
        ...capabilityVerification.filter(
          (c) => c.validUntil > now && c.validUntil < now + 7 * 24 * 60 * 60 * 1000
        ),
        ...teeAttestation.filter(
          (c) => c.validUntil > now && c.validUntil < now + 7 * 24 * 60 * 60 * 1000
        ),
      ],
    }
  },
})
