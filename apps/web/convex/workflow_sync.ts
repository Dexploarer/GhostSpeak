import { WorkflowManager } from '@convex-dev/workflow'
import { components, api, internal } from './_generated/api'
import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const workflow = new WorkflowManager(components.workflow)

/**
 * Durable Workflow to sync all RAG data sources
 * Parallelizes the sync of agents, tests, reports, and transactions.
 */
export const syncDataWorkflow = workflow.define({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (step, args) => {
    const limit = args.limit || 50

    // Run all sync actions in parallel
    // The workflow engine manages the execution and retries for each step
    await Promise.all([
      step.runAction(api.rag_sync.syncAgentReputation, {}),
      step.runAction(api.rag_sync.syncEndpointTests, { limit }),
      step.runAction(api.rag_sync.syncObservationReports, { limit }),
      step.runAction(api.rag_sync.syncTransactions, { limit }),
    ])

    return { success: true, timestamp: Date.now() }
  },
})

export const startSync = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const runId: string = await workflow.start(ctx, internal.workflow_sync.syncDataWorkflow, args)
    return { runId }
  },
})
