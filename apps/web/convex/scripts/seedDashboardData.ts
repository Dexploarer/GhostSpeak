import { mutation } from '../_generated/server'

export const seedDashboardActivity = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    let paymentsCreated = 0
    let testsCreated = 0

    // 1. Get all observed endpoints
    const endpoints = await ctx.db.query('observedEndpoints').collect()

    if (endpoints.length === 0) {
      return { success: false, message: 'No endpoints found. Run seedAgentDirectory first.' }
    }

    // 2. Generate x402 Payments (Historical Interactions)
    const PAYMENT_AMOUNTS = [
      '5000000', // 5 USDC
      '1000000', // 1 USDC
      '250000', // 0.25 USDC
      '100000', // 0.10 USDC
      '10000000', // 10 USDC
    ]

    for (let i = 0; i < 20; i++) {
      const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
      const randomAmount = PAYMENT_AMOUNTS[Math.floor(Math.random() * PAYMENT_AMOUNTS.length)]

      await ctx.db.insert('historicalInteractions', {
        agentWalletAddress: randomEndpoint.agentAddress,
        userWalletAddress: `User${Math.floor(Math.random() * 1000)}...`, // Mock user
        // transactionSignature (was signature)
        transactionSignature: `sig_${Math.random().toString(36).substring(7)}`,
        blockTime: Math.floor((now - Math.random() * 24 * 60 * 60 * 1000) / 1000), // Within last 24h
        amount: randomAmount,
        facilitatorAddress: 'GhostSpeakFacilitator...',

        // Required fields from schema
        agentKnown: true,
        discoveredAt: now,
        discoverySource: 'seed_dashboard',
      })
      paymentsCreated++
    }

    // 3. Generate Endpoint Tests (Live Observation Feed)
    for (let i = 0; i < 15; i++) {
      const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
      const isSuccess = Math.random() > 0.2
      const responseTime = Math.floor(Math.random() * 800) + 100

      await ctx.db.insert('endpointTests', {
        endpointId: randomEndpoint._id,
        agentAddress: randomEndpoint.agentAddress,
        // testedAt (was timestamp)
        testedAt: now - Math.floor(Math.random() * 60 * 60 * 1000), // Within last hour
        success: isSuccess,
        responseStatus: isSuccess ? 200 : Math.random() > 0.5 ? 402 : 500,
        responseTimeMs: responseTime,
        capabilityVerified: isSuccess,
        qualityScore: isSuccess
          ? Math.floor(Math.random() * 20) + 80
          : Math.floor(Math.random() * 40),
        paymentAmountUsdc: 0.05,
        caisperNotes: isSuccess
          ? 'Agent responded correctly to test prompt.'
          : 'Agent failed to respond or requested excessive payment.',
        transcript: [
          {
            role: 'user',
            content: 'Test prompt: What is the current price of SOL?',
            timestamp: now - 3000,
          },
          { role: 'agent', content: 'The current price of SOL is $145.20.', timestamp: now },
        ],
      })
      testsCreated++
    }

    return {
      success: true,
      paymentsCreated,
      testsCreated,
      message: `Seeded ${paymentsCreated} payments and ${testsCreated} endpoint tests`,
    }
  },
})
export const clearAllSeeds = mutation({
  args: {},
  handler: async (ctx) => {
    let deletedInteractions = 0
    let deletedAgents = 0
    let deletedEndpoints = 0
    let deletedTests = 0

    // 1. Delete seed interactions
    const interactions = await ctx.db
      .query('historicalInteractions')
      .filter((q) => q.eq(q.field('discoverySource'), 'seed_dashboard'))
      .collect()
    for (const item of interactions) {
      await ctx.db.delete(item._id)
      deletedInteractions++
    }

    // 2. Delete seed agents and their children
    const agents = await ctx.db
      .query('discoveredAgents')
      .filter((q) => q.eq(q.field('discoverySource'), 'seed_data'))
      .collect()
    for (const agent of agents) {
      // Delete endpoints
      const endpoints = await ctx.db
        .query('observedEndpoints')
        .withIndex('by_agent', (q) => q.eq('agentAddress', agent.ghostAddress))
        .collect()
      for (const ep of endpoints) {
        // Delete tests for this endpoint
        const tests = await ctx.db
          .query('endpointTests')
          .withIndex('by_endpoint', (q) => q.eq('endpointId', ep._id))
          .collect()
        for (const t of tests) {
          await ctx.db.delete(t._id)
          deletedTests++
        }
        await ctx.db.delete(ep._id)
        deletedEndpoints++
      }
      await ctx.db.delete(agent._id)
      deletedAgents++
    }

    return {
      success: true,
      deletedInteractions,
      deletedAgents,
      deletedEndpoints,
      deletedTests,
      message: `Cleared ${deletedAgents} agents, ${deletedEndpoints} endpoints, ${deletedTests} tests, and ${deletedInteractions} interactions.`,
    }
  },
})
