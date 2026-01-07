import { action, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { rag } from './rag'

/**
 * Sync Agent Reputation Data to RAG
 * Namespace: 'agents'
 */
export const syncAgentReputation = action({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Syncing Agent Reputation Cache to RAG...')

    // Fetch all agent reputation records
    const agents = await ctx.runMutation(internal.rag_sync.getAllAgentReputations, {})

    let count = 0
    for (const agent of agents) {
      const text = `
Agent: ${agent.agentAddress}
Ghost Score: ${agent.ghostScore} (Tier: ${agent.tier})
Success Rate: ${agent.successRate}%
Total Jobs: ${agent.totalJobs}
Disputes: ${agent.disputes} (${agent.disputeResolution} resolution rate)
Verifications Performed: ${agent.verificationsPerformed || 0}
Ghosthunter Score: ${agent.ghosthunterScore || 'N/A'}
      `.trim()

      await rag.add(ctx, {
        namespace: 'agents',
        text,
        metadata: {
          agentAddress: agent.agentAddress,
          type: 'reputation_cache',
          ghostScore: agent.ghostScore,
          tier: agent.tier,
          updatedAt: Date.now(),
        },
      })
      count++
    }

    console.log(`✅ Synced ${count} agent reputation records.`)
    return { success: true, count }
  },
})

/**
 * Sync Endpoint Tests (Observability) to RAG
 * Namespace: 'observability'
 */
export const syncEndpointTests = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    console.log('🔄 Syncing Endpoint Tests to RAG...')
    const limit = args.limit || 50

    const tests = await ctx.runMutation(internal.rag_sync.getRecentEndpointTests, { limit })

    let count = 0
    for (const test of tests) {
      // Only index significant tests (with notes or issues)
      if (!test.caisperNotes && (!test.issues || test.issues.length === 0)) continue

      const text = `
Test ID: ${test._id}
Agent: ${test.agentAddress}
Caisper Judgment: ${test.caisperNotes}
Success: ${test.success ? 'Yes' : 'No'}
Quality Score: ${test.qualityScore}/100
Issues Found: ${test.issues ? test.issues.join(', ') : 'None'}
Tested At: ${new Date(test.testedAt).toISOString()}
      `.trim()

      console.log(`🔍 Ingesting test ${test._id}: "${text.substring(0, 50)}..."`)

      await rag.add(ctx, {
        namespace: 'observability',
        text,
        metadata: {
          agentAddress: test.agentAddress,
          type: 'endpoint_test',
          success: test.success,
          qualityScore: test.qualityScore,
          updatedAt: Date.now(),
        },
      })
      count++
    }

    console.log(`✅ Synced ${count} endpoint tests.`)
    return { success: true, count }
  },
})

/**
 * Sync Daily Observation Reports to RAG
 * Namespace: 'observability'
 */
export const syncObservationReports = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    console.log('🔄 Syncing Daliy Observation Reports to RAG...')
    const limit = args.limit || 20

    const reports = await ctx.runMutation(internal.rag_sync.getRecentObservationReports, { limit })

    let count = 0
    for (const report of reports) {
      const text = `
Daily Report (${report.date}) for Agent: ${report.agentAddress}
Overall Grade: ${report.overallGrade}
Trustworthiness: ${report.trustworthiness}/100
Recommendation: ${report.recommendation}
Tests Passed: ${report.testsSucceeded}/${report.testsRun}
Fraud Risks: ${report.fraudSignals.length > 0 ? report.fraudSignals.join(', ') : 'None'}
      `.trim()

      await rag.add(ctx, {
        namespace: 'observability',
        text,
        metadata: {
          agentAddress: report.agentAddress,
          type: 'daily_report',
          grade: report.overallGrade,
          date: report.date,
          updatedAt: Date.now(),
        },
      })
      count++
    }

    console.log(`✅ Synced ${count} observation reports.`)
    return { success: true, count }
  },
})

// -------------------------------------------------------------------------
// Internal Helpers to fetch data (since actions can't query directly)
// -------------------------------------------------------------------------

export const getAllAgentReputations = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('agentReputationCache').collect()
  },
})

export const getRecentEndpointTests = internalMutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.query('endpointTests').order('desc').take(args.limit)
  },
})

export const getRecentObservationReports = internalMutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.query('dailyObservationReports').order('desc').take(args.limit)
  },
})

/**
 * Sync x402 Transactions to RAG
 * Namespace: 'transactions'
 */
export const syncTransactions = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    console.log('🔄 Syncing x402 Transactions to RAG...')
    const limit = args.limit || 50

    const transactions = await ctx.runMutation(internal.rag_sync.getRecentTransactions, { limit })

    let count = 0
    for (const tx of transactions) {
      const text = `
Transaction: ${tx.signature}
Payer: ${tx.payerAddress}
Merchant (Agent): ${tx.merchantAddress}
Amount: ${tx.amount} (raw units)
Success: ${tx.success}
Synced At: ${new Date(tx.syncedAt).toISOString()}
Facilitator: ${tx.facilitatorAddress}
Source: ${tx.sourceOnChain ? 'On-Chain' : ''} ${tx.sourceWebhook ? 'Webhook' : ''}
      `.trim()

      console.log(`🔍 Ingesting tx ${tx.signature.substring(0, 10)}...`)

      await rag.add(ctx, {
        namespace: 'transactions',
        text,
        metadata: {
          signature: tx.signature,
          payer: tx.payerAddress,
          merchant: tx.merchantAddress,
          amount: tx.amount,
          type: 'transaction',
          updatedAt: Date.now(),
        },
      })
      count++
    }

    console.log(`✅ Synced ${count} transactions.`)
    return { success: true, count }
  },
})

export const getRecentTransactions = internalMutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.query('x402SyncEvents').order('desc').take(args.limit)
  },
})
