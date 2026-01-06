/**
 * Agent Observation System
 *
 * Caisper tests x402 endpoints to verify agent capabilities and build trust scores.
 * This powers the apiQualityMetrics source in Ghost Score calculation.
 */

import { v } from 'convex/values'
import {
  mutation,
  query,
  internalMutation,
  internalAction,
  internalQuery,
} from './_generated/server'
import { internal } from './_generated/api'
import type { Id, Doc } from './_generated/dataModel'
import { getNetworkMetadata } from './lib/networkMetadata'

// ─── QUERIES ────────────────────────────────────────────────────────────────────

/**
 * List all observed endpoints, optionally filtered
 */
export const listEndpoints = query({
  args: {
    agentAddress: v.optional(v.string()),
    category: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results

    if (args.agentAddress) {
      results = await ctx.db
        .query('observedEndpoints')
        .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress!))
        .collect()
    } else if (args.activeOnly) {
      results = await ctx.db
        .query('observedEndpoints')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .collect()
    } else if (args.category) {
      results = await ctx.db
        .query('observedEndpoints')
        .withIndex('by_category', (q) => q.eq('category', args.category!))
        .collect()
    } else {
      results = await ctx.db.query('observedEndpoints').collect()
    }

    return args.limit ? results.slice(0, args.limit) : results
  },
})

/**
 * Get a single endpoint by ID
 */
export const getEndpoint = query({
  args: { endpointId: v.id('observedEndpoints') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.endpointId)
  },
})

/**
 * List test results for an endpoint
 */
export const getTestsForEndpoint = query({
  args: {
    endpointId: v.id('observedEndpoints'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tests = await ctx.db
      .query('endpointTests')
      .withIndex('by_endpoint', (q) => q.eq('endpointId', args.endpointId))
      .order('desc')
      .collect()

    return args.limit ? tests.slice(0, args.limit) : tests
  },
})

/**
 * List test results for an agent (across all endpoints)
 */
export const getTestsForAgent = query({
  args: {
    agentAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tests = await ctx.db
      .query('endpointTests')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .order('desc')
      .collect()

    return args.limit ? tests.slice(0, args.limit) : tests
  },
})

/**
 * Get daily report for an agent on a specific date
 */
export const getDailyReport = query({
  args: {
    agentAddress: v.string(),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('dailyObservationReports')
      .withIndex('by_agent_date', (q) =>
        q.eq('agentAddress', args.agentAddress).eq('date', args.date)
      )
      .first()
  },
})

/**
 * List daily reports for an agent (most recent first)
 */
export const getReportsForAgent = query({
  args: {
    agentAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query('dailyObservationReports')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .order('desc')
      .collect()

    return args.limit ? reports.slice(0, args.limit) : reports
  },
})

/**
 * Get fraud signals for an agent
 */
export const getFraudSignals = query({
  args: {
    agentAddress: v.string(),
    unresolvedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let signals = await ctx.db
      .query('fraudSignals')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    if (args.unresolvedOnly) {
      signals = signals.filter((s) => !s.resolvedAt)
    }

    return signals
  },
})

/**
 * Get observatory overview stats
 */
export const getObservatoryStats = query({
  args: {},
  handler: async (ctx) => {
    const endpoints = await ctx.db.query('observedEndpoints').collect()
    const activeEndpoints = endpoints.filter((e) => e.isActive)

    // Get recent tests (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentTests = await ctx.db
      .query('endpointTests')
      .withIndex('by_tested_at')
      .filter((q) => q.gte(q.field('testedAt'), oneDayAgo))
      .collect()

    // Get unresolved fraud signals
    const fraudSignals = await ctx.db
      .query('fraudSignals')
      .withIndex('by_unresolved', (q) => q.eq('resolvedAt', undefined))
      .collect()

    // Unique agents
    const uniqueAgents = new Set(endpoints.map((e) => e.agentAddress))

    // Calculate success rate
    const successfulTests = recentTests.filter((t) => t.success).length
    const successRate = recentTests.length > 0 ? (successfulTests / recentTests.length) * 100 : 0

    // Calculate avg quality
    const avgQuality =
      recentTests.length > 0
        ? recentTests.reduce((sum, t) => sum + t.qualityScore, 0) / recentTests.length
        : 0

    return {
      totalEndpoints: endpoints.length,
      activeEndpoints: activeEndpoints.length,
      uniqueAgents: uniqueAgents.size,
      testsLast24h: recentTests.length,
      successRate: Math.round(successRate),
      avgQualityScore: Math.round(avgQuality),
      unresolvedFraudSignals: fraudSignals.length,
      network: getNetworkMetadata(),
    }
  },
})

/**
 * Get recent observations for the live feed
 */
export const getRecentObservations = query({
  args: {
    limit: v.optional(v.number()),
    walletAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20
    const tests = await ctx.db
      .query('endpointTests')
      .withIndex('by_tested_at')
      .order('desc')
      .take(limit)

    // Resolve user if wallet address provided
    let userId: Id<'users'> | null = null
    if (args.walletAddress) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress!))
        .first()
      if (user) userId = user._id
    }

    // Join with endpoint details and user vote
    const results = await Promise.all(
      tests.map(async (test) => {
        const endpoint = await ctx.db.get(test.endpointId)

        let myVote = null
        if (userId) {
          const vote = await ctx.db
            .query('observationVotes')
            .withIndex('by_user_observation', (q) =>
              q.eq('userId', userId!).eq('observationId', test._id)
            )
            .first()
          if (vote) myVote = vote.voteType
        }

        return {
          ...test,
          myVote,
          endpoint: endpoint
            ? {
                baseUrl: endpoint.baseUrl,
                method: endpoint.method,
                endpoint: endpoint.endpoint,
                description: endpoint.description,
              }
            : null,
        }
      })
    )

    return results
  },
})

// ─── MUTATIONS ──────────────────────────────────────────────────────────────────

/**
 * Add a new endpoint to monitor
 */
export const addEndpoint = mutation({
  args: {
    agentAddress: v.string(),
    baseUrl: v.string(),
    endpoint: v.string(),
    method: v.string(),
    priceUsdc: v.number(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if endpoint already exists
    const existing = await ctx.db
      .query('observedEndpoints')
      .filter((q) => q.eq(q.field('endpoint'), args.endpoint))
      .first()

    if (existing) {
      return { success: false, error: 'Endpoint already exists', id: existing._id }
    }

    const id = await ctx.db.insert('observedEndpoints', {
      ...args,
      isActive: true,
      addedAt: Date.now(),
      totalTests: 0,
      successfulTests: 0,
    })

    return { success: true, id }
  },
})

/**
 * Bulk import endpoints from validated JSON
 */
export const bulkImportEndpoints = mutation({
  args: {
    endpoints: v.array(
      v.object({
        agentAddress: v.string(),
        baseUrl: v.string(),
        endpoint: v.string(),
        method: v.string(),
        priceUsdc: v.number(),
        description: v.string(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0
    let skipped = 0

    for (const ep of args.endpoints) {
      // Check if endpoint already exists
      const existing = await ctx.db
        .query('observedEndpoints')
        .filter((q) => q.eq(q.field('endpoint'), ep.endpoint))
        .first()

      if (existing) {
        skipped++
        continue
      }

      await ctx.db.insert('observedEndpoints', {
        ...ep,
        isActive: true,
        addedAt: Date.now(),
        totalTests: 0,
        successfulTests: 0,
      })
      imported++
    }

    return { imported, skipped }
  },
})

/**
 * Toggle endpoint active status
 */
export const toggleEndpointActive = mutation({
  args: {
    endpointId: v.id('observedEndpoints'),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.endpointId, { isActive: args.isActive })
    return { success: true }
  },
})

/**
 * Record a test result (internal use by testing action)
 */
export const recordTestResult = internalMutation({
  args: {
    endpointId: v.id('observedEndpoints'),
    agentAddress: v.string(),
    requestPayload: v.optional(v.string()),
    paymentSignature: v.optional(v.string()),
    paymentAmountUsdc: v.number(),
    responseStatus: v.number(),
    responseTimeMs: v.number(),
    responseBody: v.optional(v.string()),
    responseError: v.optional(v.string()),
    success: v.boolean(),
    capabilityVerified: v.boolean(),
    qualityScore: v.number(),
    issues: v.optional(v.array(v.string())),
    caisperNotes: v.string(),
    transcript: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
          isToolCall: v.optional(v.boolean()),
          toolName: v.optional(v.string()),
          toolArgs: v.optional(v.string()),
          timestamp: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Insert test result
    const testId = await ctx.db.insert('endpointTests', {
      ...args,
      testedAt: Date.now(),
    })

    // Update endpoint stats
    const endpoint = await ctx.db.get(args.endpointId)
    if (endpoint) {
      const totalTests = (endpoint.totalTests || 0) + 1
      const successfulTests = (endpoint.successfulTests || 0) + (args.success ? 1 : 0)

      // Running average for response time and quality
      const prevAvgTime = endpoint.avgResponseTimeMs || args.responseTimeMs
      const prevAvgQuality = endpoint.avgQualityScore || args.qualityScore
      const avgResponseTimeMs = Math.round(
        (prevAvgTime * (totalTests - 1) + args.responseTimeMs) / totalTests
      )
      const avgQualityScore = Math.round(
        (prevAvgQuality * (totalTests - 1) + args.qualityScore) / totalTests
      )

      await ctx.db.patch(args.endpointId, {
        lastTestedAt: Date.now(),
        totalTests,
        successfulTests,
        avgResponseTimeMs,
        avgQualityScore,
      })
    }

    return { testId }
  },
})

/**
 * Record a fraud signal
 */
export const recordFraudSignal = internalMutation({
  args: {
    agentAddress: v.string(),
    signalType: v.string(),
    severity: v.string(),
    evidence: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('fraudSignals', {
      ...args,
      detectedAt: Date.now(),
    })
    return { id }
  },
})

/**
 * Compile daily report for an agent
 */
export const compileDailyReport = internalMutation({
  args: {
    agentAddress: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all tests for this agent on this date
    const startOfDay = new Date(args.date).getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000

    const tests = await ctx.db
      .query('endpointTests')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) =>
        q.and(q.gte(q.field('testedAt'), startOfDay), q.lt(q.field('testedAt'), endOfDay))
      )
      .collect()

    if (tests.length === 0) {
      return { skipped: true, reason: 'No tests for this agent on this date' }
    }

    // Get endpoints for this agent to get claimed capabilities
    const endpoints = await ctx.db
      .query('observedEndpoints')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .collect()

    const claimedCapabilities = [...new Set(endpoints.map((e) => e.description))]

    // Calculate metrics
    const testsSucceeded = tests.filter((t) => t.success).length
    const avgResponseTimeMs = Math.round(
      tests.reduce((sum, t) => sum + t.responseTimeMs, 0) / tests.length
    )
    const avgQualityScore = Math.round(
      tests.reduce((sum, t) => sum + t.qualityScore, 0) / tests.length
    )
    const totalSpentUsdc = tests.reduce((sum, t) => sum + t.paymentAmountUsdc, 0)

    // Calculate response time consistency using coefficient of variation
    // CV = stddev / mean; lower CV = more consistent
    const responseTimes = tests.map((t) => t.responseTimeMs)
    const variance =
      responseTimes.reduce((sum, t) => sum + Math.pow(t - avgResponseTimeMs, 2), 0) /
      responseTimes.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = avgResponseTimeMs > 0 ? stdDev / avgResponseTimeMs : 0
    // Convert CV to 0-100 score: CV of 0 = 100 (perfect), CV >= 1 = 0 (highly variable)
    const responseConsistency = Math.round(
      Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation)))
    )

    // Verified vs failed capabilities
    const verifiedCapabilities = [
      ...new Set(
        tests
          .filter((t) => t.capabilityVerified)
          .map((t) => endpoints.find((e) => e._id === t.endpointId)?.description || '')
      ),
    ].filter(Boolean)
    const failedCapabilities = [
      ...new Set(
        tests
          .filter((t) => !t.capabilityVerified)
          .map((t) => endpoints.find((e) => e._id === t.endpointId)?.description || '')
      ),
    ].filter(Boolean)

    // Calculate grade and trustworthiness
    const successRate = testsSucceeded / tests.length
    const verificationRate = tests.filter((t) => t.capabilityVerified).length / tests.length
    const trustworthiness = Math.round(
      successRate * 40 + verificationRate * 40 + (avgQualityScore / 100) * 20
    )

    let overallGrade: string
    if (trustworthiness >= 90) overallGrade = 'A'
    else if (trustworthiness >= 80) overallGrade = 'B'
    else if (trustworthiness >= 70) overallGrade = 'C'
    else if (trustworthiness >= 60) overallGrade = 'D'
    else overallGrade = 'F'

    // Generate recommendation
    const recommendation =
      overallGrade === 'A'
        ? 'Highly reliable agent with verified capabilities. Recommended for production use.'
        : overallGrade === 'B'
          ? 'Reliable agent with minor issues. Generally safe to use.'
          : overallGrade === 'C'
            ? 'Agent has some inconsistencies. Use with caution and verify critical operations.'
            : overallGrade === 'D'
              ? 'Agent shows significant issues. Not recommended for production use.'
              : 'Agent failed most tests. Avoid using this agent.'

    // Get fraud signals for today
    const fraudSignals = await ctx.db
      .query('fraudSignals')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.gte(q.field('detectedAt'), startOfDay))
      .collect()

    const fraudRiskScore = Math.min(100, fraudSignals.length * 25)

    // Check if report already exists
    const existing = await ctx.db
      .query('dailyObservationReports')
      .withIndex('by_agent_date', (q) =>
        q.eq('agentAddress', args.agentAddress).eq('date', args.date)
      )
      .first()

    if (existing) {
      // Update existing report
      await ctx.db.patch(existing._id, {
        testsRun: tests.length,
        testsSucceeded,
        avgResponseTimeMs,
        avgQualityScore,
        totalSpentUsdc,
        claimedCapabilities,
        verifiedCapabilities,
        failedCapabilities,
        overallGrade,
        trustworthiness,
        recommendation,
        fraudSignals: fraudSignals.map((f) => f.signalType),
        fraudRiskScore,
        compiledAt: Date.now(),
      })

      // Issue observation-based credentials on update too (not just on create)
      await ctx.runMutation(internal.observation.issueObservationCredentials, {
        agentAddress: args.agentAddress,
        date: args.date,
        testsRun: tests.length,
        testsSucceeded,
        avgResponseTimeMs,
        avgQualityScore,
        responseConsistency,
        verifiedCapabilities,
        overallGrade,
        trustworthiness,
      })

      return { updated: true, reportId: existing._id }
    }

    // Create new report
    const reportId = await ctx.db.insert('dailyObservationReports', {
      date: args.date,
      agentAddress: args.agentAddress,
      testsRun: tests.length,
      testsSucceeded,
      avgResponseTimeMs,
      avgQualityScore,
      totalSpentUsdc,
      claimedCapabilities,
      verifiedCapabilities,
      failedCapabilities,
      overallGrade,
      trustworthiness,
      recommendation,
      fraudSignals: fraudSignals.map((f) => f.signalType),
      fraudRiskScore,
      compiledAt: Date.now(),
    })

    // Issue observation-based credentials
    await ctx.runMutation(internal.observation.issueObservationCredentials, {
      agentAddress: args.agentAddress,
      date: args.date,
      testsRun: tests.length,
      testsSucceeded,
      avgResponseTimeMs,
      avgQualityScore,
      responseConsistency,
      verifiedCapabilities,
      overallGrade,
      trustworthiness,
    })

    return { created: true, reportId }
  },
})

/**
 * Issue credentials based on observation data
 * Called automatically after daily report compilation
 */
export const issueObservationCredentials = internalMutation({
  args: {
    agentAddress: v.string(),
    date: v.string(),
    testsRun: v.number(),
    testsSucceeded: v.number(),
    avgResponseTimeMs: v.number(),
    avgQualityScore: v.number(),
    responseConsistency: v.number(), // Variance-based consistency score (0-100)
    verifiedCapabilities: v.array(v.string()),
    overallGrade: v.string(),
    trustworthiness: v.number(),
  },
  handler: async (ctx, args) => {
    const results = {
      capabilityCredential: null as Id<'credentials'> | null,
      apiQualityCredential: null as Id<'credentials'> | null,
      uptimeCredential: null as Id<'credentials'> | null,
    }

    // 1. Issue Capability Verification Credential if capabilities verified
    if (args.verifiedCapabilities.length > 0 && args.testsRun >= 5) {
      results.capabilityCredential = await ctx.runMutation(
        internal.credentials.issueCapabilityVerificationCredential,
        {
          agentAddress: args.agentAddress,
          capabilities: args.verifiedCapabilities,
          testsRun: args.testsRun,
          testsPassed: args.testsSucceeded,
        }
      )
    }

    // 2. Issue API Quality Grade Credential
    if (args.testsRun >= 3) {
      // Calculate component scores from overall quality
      const responseQuality = Math.min(100, args.avgQualityScore)
      const capabilityAccuracy =
        args.testsRun > 0 ? Math.round((args.testsSucceeded / args.testsRun) * 100) : 0
      // Use variance-based consistency passed from report compilation
      const consistency = args.responseConsistency
      // Documentation score: use capability accuracy as proxy (well-documented APIs tend to work correctly)
      // TODO: Implement proper documentation scoring from endpoint descriptions/schemas
      const documentation = Math.min(
        100,
        Math.round(capabilityAccuracy * 0.8 + responseQuality * 0.2)
      )

      results.apiQualityCredential = await ctx.runMutation(
        internal.credentials.issueAPIQualityGradeCredential,
        {
          agentAddress: args.agentAddress,
          responseQuality,
          capabilityAccuracy,
          consistency,
          documentation,
          endpointsTested: args.testsRun,
          reportDate: args.date,
        }
      )
    }

    // 3. Check for Uptime Attestation Credential
    // Look back at last 7 days of reports to calculate uptime
    const sevenDaysAgo = new Date(args.date)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const recentReports = await ctx.db
      .query('dailyObservationReports')
      .withIndex('by_agent_date', (q) => q.eq('agentAddress', args.agentAddress))
      .filter((q) => q.gte(q.field('date'), sevenDaysAgoStr))
      .collect()

    if (recentReports.length >= 7) {
      const totalTests = recentReports.reduce((sum, r) => sum + r.testsRun, 0)
      const successfulTests = recentReports.reduce((sum, r) => sum + r.testsSucceeded, 0)
      const avgResponseTime =
        recentReports.reduce((sum, r) => sum + r.avgResponseTimeMs, 0) / recentReports.length

      // Get period start and end from reports
      const sortedDates = recentReports.map((r) => r.date).sort()
      const periodStart = new Date(sortedDates[0]).getTime()
      const periodEnd =
        new Date(sortedDates[sortedDates.length - 1]).getTime() + 24 * 60 * 60 * 1000

      results.uptimeCredential = await ctx.runMutation(
        internal.credentials.issueUptimeAttestationCredential,
        {
          agentAddress: args.agentAddress,
          totalTests,
          successfulResponses: successfulTests,
          avgResponseTimeMs: Math.round(avgResponseTime),
          periodStart,
          periodEnd,
        }
      )
    }

    return results
  },
})

// ─── ACTIONS (for external API calls) ───────────────────────────────────────────

/**
 * Get the next endpoint to test (round-robin, prioritize least recently tested)
 */
export const getNextEndpointToTest = internalMutation({
  args: {
    maxPriceUsdc: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all active endpoints sorted by last tested
    let endpoints = await ctx.db
      .query('observedEndpoints')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect()

    // Filter by max price if specified
    if (args.maxPriceUsdc !== undefined) {
      endpoints = endpoints.filter((e) => e.priceUsdc <= args.maxPriceUsdc!)
    }

    if (endpoints.length === 0) {
      return null
    }

    // Sort by last tested (never tested first, then oldest)
    endpoints.sort((a, b) => {
      if (!a.lastTestedAt && !b.lastTestedAt) return 0
      if (!a.lastTestedAt) return -1
      if (!b.lastTestedAt) return 1
      return a.lastTestedAt - b.lastTestedAt
    })

    return endpoints[0]
  },
})

/**
 * Run hourly endpoint tests
 * Called by cron job, tests multiple endpoints per hour
 */
export const runHourlyTests = internalAction({
  args: {},
  handler: async (ctx) => {
    // Budget: ~$1/day = ~$0.04/hour
    // With $0.01 endpoints, that's ~4 tests per hour
    const HOURLY_BUDGET_USDC = 0.05
    const MAX_TESTS_PER_HOUR = 10

    let totalSpent = 0
    let testsRun = 0

    console.log('[Observation] Starting hourly test run...')

    while (testsRun < MAX_TESTS_PER_HOUR && totalSpent < HOURLY_BUDGET_USDC) {
      // Get next endpoint to test (prioritize cheap ones within budget)
      const remainingBudget = HOURLY_BUDGET_USDC - totalSpent
      const endpoint = await ctx.runMutation(internal.observation.getNextEndpointToTest, {
        maxPriceUsdc: remainingBudget,
      })

      if (!endpoint) {
        console.log('[Observation] No more endpoints within budget')
        break
      }

      // Test this endpoint
      try {
        console.log(
          `[Observation] TESTING (DEBUG MODE) ${endpoint.baseUrl}${endpoint.endpoint.substring(0, 50)}...`
        )

        // Initialize variables for this test
        const startTime = Date.now()
        let responseStatus = 0
        let responseBody = ''
        let responseError = ''
        let success = false

        // Quality metrics
        let qualityScore = 50 // Base score
        let capabilityVerified = false
        const issues: string[] = []
        let caisperNotes = ''
        let paymentSignature = ''
        let paymentAmountUsdc = 0

        // Transcript tracking
        const transcript: {
          role: string
          content: string
          isToolCall?: boolean
          toolName?: string
          toolArgs?: string
          timestamp: number
        }[] = []

        try {
          // 1. Initial Call (Discovery)
          // Construct a prompt based on endpoint description
          const prompt = `Test request for: ${endpoint.description || 'General availability check'}`
          transcript.push({
            role: 'user',
            content: prompt,
            timestamp: Date.now(),
          })

          let response = await fetch(endpoint.endpoint, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: endpoint.method === 'POST' ? JSON.stringify({ message: prompt }) : undefined,
            redirect: 'manual',
          })

          responseStatus = response.status

          // 2. Handle 402 Payment Required
          if (responseStatus === 402) {
            const authHeader = response.headers.get('www-authenticate') || ''
            console.log(`[Observation Debug] 402 received. AuthHeader: "${authHeader}"`)

            let recipient = ''
            let amount = 0
            let token = 'SOL' // Default to SOL

            // Try to parse from header or body
            if (authHeader.includes('recipient=')) {
              const match = authHeader.match(/recipient="?([a-zA-Z0-9]+)"?/)
              if (match) recipient = match[1]

              const amountMatch = authHeader.match(/amount="?(\d+)"?/)
              if (amountMatch) amount = parseInt(amountMatch[1])
            } else {
              // Try body
              try {
                const json = await response.json()
                // Simple format: { recipient, amount, token }
                if (json.recipient) {
                  recipient = json.recipient
                  if (json.amount) amount = json.amount
                  if (json.token) token = json.token
                }
                // x402 standard format: { accepts: [{ payTo, maxAmountRequired, asset, ... }] }
                else if (json.accepts && Array.isArray(json.accepts) && json.accepts.length > 0) {
                  const offer =
                    json.accepts.find((a: { network?: string }) => a.network === 'solana') ||
                    json.accepts[0]
                  if (offer) {
                    recipient = offer.payTo || ''
                    amount = parseInt(offer.maxAmountRequired || '0')
                    if (offer.asset) token = offer.asset
                  }
                }
              } catch (e) {
                // Ignore JSON parse error on 402 if body is empty
                console.log(`[Observation Debug] 402 Body parse error:`, e)
              }
            }

            console.log(
              `[Observation Debug] Parsed: Recipient=${recipient}, Amount=${amount}, Token=${token}`
            )

            if (recipient && amount > 0) {
              console.log(`[Observation] Payment required: ${amount} ${token} to ${recipient}`)
              transcript.push({
                role: 'system',
                content: `Payment Required: ${amount} ${token} to ${recipient}`,
                timestamp: Date.now(),
              })

              // Check sanity (don't spend too much)
              // USDC amounts are in micro-units (1000 = $0.001 USDC)
              // SOL amounts are in lamports (1e9 = 1 SOL)
              const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
              const MAX_USDC_PAYMENT = 100000 // 100000 micro-USDC = $0.10 max
              const MAX_SOL_PAYMENT = 0.01 * 1e9 // 0.01 SOL limit

              // Determine if we should pay and how much SOL to send
              let shouldPay = false
              let solAmount = 0

              if (token === 'SOL' && amount <= MAX_SOL_PAYMENT) {
                shouldPay = true
                solAmount = amount / 1e9
              } else if (token === USDC_MINT && amount <= MAX_USDC_PAYMENT) {
                // Pay in SOL equivalent - assume ~$150/SOL for rough conversion
                // USDC amount is in micro-units (6 decimals): 1000 = $0.001
                shouldPay = true
                const usdcValue = amount / 1e6 // Convert to dollars
                const solPrice = 150 // Rough SOL price in USD
                solAmount = usdcValue / solPrice // Convert to SOL
              }

              if (shouldPay && solAmount > 0) {
                // PAY IT!
                const payResult = await ctx.runAction(internal.lib.caisper.sendSolPayment, {
                  recipient,
                  amountSol: solAmount,
                })

                if (payResult.success) {
                  const signature = payResult.signature
                  transcript.push({
                    role: 'system',
                    content: `Payment Sent. Signature: ${signature}`,
                    timestamp: Date.now(),
                  })
                  transcript.push({
                    role: 'user',
                    content: 'Payment completed. Retrying request with Authorization header...',
                    timestamp: Date.now(),
                  })
                  console.log(`[Observation] Paid! Sig: ${signature}`)

                  // 3. Retry with Authorization
                  response = await fetch(endpoint.endpoint, {
                    method: endpoint.method,
                    headers: {
                      'Content-Type': 'application/json',
                      Accept: 'application/json',
                      Authorization: `Solana ${signature}`,
                    },
                    redirect: 'manual',
                  })

                  responseStatus = response.status
                  success = responseStatus === 200

                  if (success) {
                    caisperNotes = `Successfully negotiated x402 payment! Paid ${amount} lamports. Content unlocked.`
                    qualityScore = 100
                    capabilityVerified = true
                    paymentSignature = signature
                    paymentAmountUsdc = (amount / 1e9) * 150 // Approx $150/SOL for tracking stats (mock rate)

                    const text = await response.text()
                    responseBody = text.substring(0, 1000)
                    transcript.push({
                      role: 'agent',
                      content: responseBody.substring(0, 5000),
                      timestamp: Date.now(),
                    })
                  }
                }
              } else {
                caisperNotes = `Payment requested (${amount} ${token}) exceeded safety limit or unsupported token.`
                // Mark as capabilities verified (it acts like an agent) but failed test
                capabilityVerified = true
                qualityScore = 80
                success = true // It's alive
              }
            } else {
              // 402 but couldn't parse params
              caisperNotes = 'returned 402 but missing payment params'
              qualityScore = 60
              success = true
            }
          } else {
            // 200 OK or other error
            success = responseStatus === 200
            if (success) {
              const text = await response.text()
              responseBody = text.substring(0, 1000)
              qualityScore = 80
              capabilityVerified = true
              caisperNotes = 'Endpoint responded successfully without payment.'
              transcript.push({
                role: 'agent',
                content: responseBody.substring(0, 5000),
                timestamp: Date.now(),
              })
            } else {
              const text = await response.text()
              responseBody = text.substring(0, 1000)
              qualityScore = 20
              issues.push(`HTTP ${responseStatus}: ${responseBody.substring(0, 100)}`)
              caisperNotes = `Endpoint failed with status ${responseStatus}`
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (fetchError: any) {
          responseError = fetchError.message || 'Unknown fetch error'
          success = false
          qualityScore = 0
          caisperNotes = `Fetch failed: ${responseError}`
        }

        const responseTimeMs = Date.now() - startTime

        // Adjust for response time
        if (responseTimeMs < 500) qualityScore += 10
        else if (responseTimeMs > 5000) qualityScore -= 10

        qualityScore = Math.max(0, Math.min(100, qualityScore))

        // Record the test result
        await ctx.runMutation(internal.observation.recordTestResult, {
          endpointId: endpoint._id,
          agentAddress: endpoint.agentAddress,
          paymentAmountUsdc,
          responseStatus,
          responseTimeMs,
          responseBody: responseBody.substring(0, 10000),
          responseError: responseError || undefined,
          success,
          capabilityVerified,
          qualityScore,
          issues: issues.length > 0 ? issues : undefined,
          caisperNotes,
          paymentSignature: paymentSignature || undefined,
          transcript,
        })

        testsRun++
        totalSpent += paymentAmountUsdc

        console.log(
          `[Observation] Test complete: ${success ? '✓' : '✗'} ${responseStatus} ${responseTimeMs}ms Q${qualityScore}`
        )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error(`[Observation] Test error: ${error.message}`)
      }
    }

    console.log(
      `[Observation] Hourly run complete: ${testsRun} tests, $${totalSpent.toFixed(4)} spent`
    )
    return { testsRun, totalSpent }
  },
})

/**
 * Compile daily reports for all agents
 * Called by daily cron job at midnight UTC
 */
export const compileDailyReports = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(0, 0, 0, 0)

    const startOfDay = yesterday.getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000
    const date = yesterday.toISOString().split('T')[0]

    console.log(`[Observation] Compiling daily reports for ${date}...`)

    // Get all unique agents that had tests yesterday

    const tests = await ctx.runQuery(internal.observation.getTestsInRange, {
      startTime: startOfDay,
      endTime: endOfDay,
    })

    const uniqueAgents: string[] = [...new Set(tests.map((t: Doc<'endpointTests'>) => t.agentAddress as string))]

    console.log(`[Observation] Found ${uniqueAgents.length} agents with tests yesterday`)

    for (const agentAddress of uniqueAgents) {
      try {
        await ctx.runMutation(internal.observation.compileDailyReport, {
          agentAddress,
          date,
        })
        console.log(`[Observation] Compiled report for ${agentAddress.substring(0, 8)}...`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error(
          `[Observation] Failed to compile report for ${agentAddress}: ${error.message}`
        )
      }
    }

    return { date, agentsProcessed: uniqueAgents.length }
  },
})

/**
 * Internal query to get tests in a time range
 */
export const getTestsInRange = internalQuery({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('endpointTests')
      .filter((q) =>
        q.and(q.gte(q.field('testedAt'), args.startTime), q.lt(q.field('testedAt'), args.endTime))
      )
      .collect()
  },
})

/**
 * Vote on an observation result
 *
 * Updates user's Ecto/Ghosthunter Score points and observation metrics
 */
export const voteOnObservation = mutation({
  args: {
    observationId: v.id('endpointTests'),
    walletAddress: v.string(), // Authenticated user's wallet
    voteType: v.string(), // 'upvote' | 'downvote'
  },
  handler: async (ctx, args) => {
    // 1. Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // 2. Check for existing vote
    const existingVote = await ctx.db
      .query('observationVotes')
      .withIndex('by_user_observation', (q) =>
        q.eq('userId', user._id).eq('observationId', args.observationId)
      )
      .first()

    // 3. Get test record to update counts
    const test = await ctx.db.get(args.observationId)
    if (!test) {
      throw new Error('Observation not found')
    }

    let currentUpvotes = test.upvotes || 0
    let currentDownvotes = test.downvotes || 0

    if (existingVote) {
      if (existingVote.voteType === args.voteType) {
        // Same vote -> Toggle off (remove vote)
        await ctx.db.delete(existingVote._id)

        if (args.voteType === 'upvote') currentUpvotes = Math.max(0, currentUpvotes - 1)
        else currentDownvotes = Math.max(0, currentDownvotes - 1)
      } else {
        // Different vote -> Switch vote
        await ctx.db.patch(existingVote._id, {
          voteType: args.voteType,
          timestamp: Date.now(),
        })

        if (args.voteType === 'upvote') {
          currentUpvotes++
          currentDownvotes = Math.max(0, currentDownvotes - 1)
        } else {
          currentDownvotes++
          currentUpvotes = Math.max(0, currentUpvotes - 1)
        }
      }
    } else {
      // New vote
      await ctx.db.insert('observationVotes', {
        observationId: args.observationId,
        userId: user._id,
        voteType: args.voteType, // 'upvote' | 'downvote'
        timestamp: Date.now(),
      })

      if (args.voteType === 'upvote') currentUpvotes++
      else currentDownvotes++
    }

    // 4. Update test record
    await ctx.db.patch(args.observationId, {
      upvotes: currentUpvotes,
      downvotes: currentDownvotes,
    })

    return { success: true, upvotes: currentUpvotes, downvotes: currentDownvotes }
  },
})
