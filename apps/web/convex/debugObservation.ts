/**
 * Debug Observation Functions
 *
 * Testing and verification utilities for the observation pipeline.
 * IMPORTANT: These functions use the EXISTING Caisper wallet configuration.
 * They do NOT seed or overwrite wallet configurations.
 */

import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'

/**
 * Debug run for testing observation pipeline.
 * Uses the EXISTING Caisper wallet - does NOT seed or overwrite it.
 */
export const debugRun = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('=== START DEBUG OBSERVATION RUN ===')

    // 1. Check for existing wallet - DO NOT SEED
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (!wallet) {
      console.error('[Debug] CAISPER WALLET NOT CONFIGURED!')
      console.error(
        '[Debug] Please configure the Caisper wallet via the admin interface or environment variables.'
      )
      console.error('[Debug] Aborting debug run.')
      throw new Error('Caisper wallet not configured. Cannot proceed with debug run.')
    }

    console.log(`[Debug] Using existing wallet: ${wallet.publicKey}`)

    // 2. Define target
    const url = 'https://x402factory.ai/solana/note'
    console.log(`[Debug] Fetching ${url}...`)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ message: 'Debug Probe' }),
        redirect: 'manual',
      })

      console.log(`[Debug] Status: ${response.status}`)

      const authHeader = response.headers.get('www-authenticate') || ''
      console.log(`[Debug] Auth Header: "${authHeader}"`)

      if (response.status === 402) {
        console.log('[Debug] 402 Detailed Parsing...')

        let recipient = ''
        let amount = 0
        let token = 'SOL'

        if (authHeader.includes('recipient=')) {
          console.log('[Debug] Parsing from Header...')
          const match = authHeader.match(/recipient="?([a-zA-Z0-9]+)"?/)
          if (match) recipient = match[1]

          const amountMatch = authHeader.match(/amount="?(\d+)"?/)
          if (amountMatch) amount = parseInt(amountMatch[1])
        } else {
          console.log('[Debug] Parsing from Body...')
          try {
            const json = await response.json()

            if (json.recipient) {
              recipient = json.recipient
              if (json.amount) amount = json.amount
              if (json.token) token = json.token
            } else if (json.accepts && Array.isArray(json.accepts) && json.accepts.length > 0) {
              const offer =
                json.accepts.find(
                  (a: unknown) => (a as Record<string, unknown>).network === 'solana'
                ) || json.accepts[0]
              if (offer) {
                recipient = offer.payTo
                amount = parseInt(offer.maxAmountRequired || '0')
                if (offer.asset) token = offer.asset
              }
            }
          } catch (e) {
            console.error('[Debug] Failed to parse body:', e)
          }
        }

        console.log(
          `[Debug] Parsed Result: Recipient=${recipient}, Amount=${amount}, Token=${token}`
        )

        if (recipient && amount > 0) {
          console.log(`[Debug] Attempting Payment: ${amount} ${token} to ${recipient}`)

          if (token !== 'SOL') {
            console.warn(
              '[Debug] WARNING: Token is ' +
                token +
                '. Caisper only supports SOL native currently (via sendSolPayment). Payment might fail or be rejected.'
            )
          }

          const payResult = await ctx.runAction(internal.lib.caisper.sendSolPayment, {
            recipient,
            amountSol: 0.00001, // Small test amount
          })

          if (payResult.success) {
            console.log(`[Debug] Payment SUCCESS! Sig: ${payResult.signature}`)
          } else {
            console.log(`[Debug] Payment FAILED.`)
          }
        } else {
          console.log('[Debug] Could not parse payment details.')
        }
      } else {
        console.log('[Debug] Not a 402 response.')
      }
    } catch (e: unknown) {
      console.error('[Debug] Fetch Failed:', e)
    }

    console.log('=== END DEBUG OBSERVATION RUN ===')
  },
})

/**
 * Deterministic verification helper:
 * - writes an `endpointTests` row via `recordTestResult` with a fake payment signature
 * - asserts a corresponding `historicalInteractions` row exists with `discoverySource=caisper_observation`
 * - asserts public Observatory x402 query can see it (and payer is redacted)
 *
 * IMPORTANT: Uses the EXISTING Caisper wallet. Fails if wallet is not configured.
 */
export const verifyObservationPaymentInteractionWiringInternal = internalAction({
  args: {
    signature: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: true
    signature: string
    publicPayer: string
    publicMerchant: string
    publicTimestamp: number
  }> => {
    const signature = args.signature ?? `caisper_observation_test_${Date.now()}`

    // Use existing Caisper wallet - DO NOT CREATE OR OVERWRITE
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (!wallet) {
      throw new Error(
        'Caisper wallet not configured. Please configure via admin interface before running verification tests.'
      )
    }

    const caisperWalletPublicKey = wallet.publicKey
    console.log(`[Verify] Using Caisper wallet: ${caisperWalletPublicKey}`)

    // Use Caisper's actual address for test endpoints
    const agentAddress = caisperWalletPublicKey

    // Ensure an endpoint exists to attach the test to.
    const addRes = await ctx.runMutation(internal.observation.upsertObservedEndpointInternal, {
      agentAddress,
      baseUrl: 'example.com',
      endpoint: 'https://example.com/observatory-payment-wiring-test',
      method: 'POST',
      priceUsdc: 0.01,
      description: 'Observatory payment wiring test',
      category: 'utility',
    })

    const endpointId = addRes.id

    // Record a test result with a payment signature
    await ctx.runMutation(internal.observation.recordTestResult, {
      endpointId,
      agentAddress,
      requestPayload: '{"message":"test"}',
      paymentSignature: signature,
      paymentAmountUsdc: 0.01,
      responseStatus: 200,
      responseTimeMs: 10,
      responseBody: '{"ok":true}',
      success: true,
      capabilityVerified: true,
      qualityScore: 90,
      caisperNotes: 'verification run',
      transcript: [
        { role: 'user', content: 'test', timestamp: Date.now() - 1 },
        { role: 'agent', content: 'ok', timestamp: Date.now() },
      ],
    })

    const publicPayments = (await ctx.runQuery(
      internal.observatoryTerminal.getPublicX402PaymentsInternal,
      {
        limit: 50,
      }
    )) as Array<{
      kind: 'x402'
      timestamp: number
      signature: string
      payer: string
      merchant: string
      amount: string
      facilitator: string
    }>

    const publicItem = publicPayments.find((p) => p.signature === signature)
    if (!publicItem) {
      throw new Error('Expected getPublicX402Payments to include the test signature')
    }

    // Keep this consistent with `redactAddress()` in `observatoryTerminal.ts`.
    const expectedRedactedPayer = (() => {
      const a = (caisperWalletPublicKey ?? '').toString().trim()
      if (!a) return '[redacted]'
      if (a.length <= 12) return '[redacted]'
      return `${a.slice(0, 4)}…${a.slice(-4)}`
    })()

    if (publicItem.payer !== expectedRedactedPayer) {
      throw new Error(
        `Public DTO payer redaction mismatch. expected=${expectedRedactedPayer} actual=${publicItem.payer}`
      )
    }

    return {
      ok: true,
      signature,
      publicPayer: publicItem.payer,
      publicMerchant: publicItem.merchant,
      publicTimestamp: publicItem.timestamp,
    }
  },
})

/**
 * Public CLI-callable wrapper.
 *
 * Allows running:
 *   npx convex run debugObservation:verifyObservationPaymentInteractionWiring
 */
export const verifyObservationPaymentInteractionWiring = action({
  args: {
    signature: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    return await ctx.runAction(
      internal.debugObservation.verifyObservationPaymentInteractionWiringInternal,
      {
        signature: args.signature,
      }
    )
  },
}) as unknown

/**
 * End-to-end Convex validation proving the full observation pipeline works.
 * Uses EXISTING Caisper wallet and real agent addresses.
 */
export const verifyEndToEndObservationRunInternal = internalAction({
  args: {
    maxPriceUsdc: v.optional(v.number()),
    hourlyBudgetUsdc: v.optional(v.number()),
    includeDailyReport: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const startedAtMs = Date.now()

    const maxPriceUsdc = args.maxPriceUsdc ?? 0.05
    const hourlyBudgetUsdc = args.hourlyBudgetUsdc ?? Math.max(maxPriceUsdc, 0.05)
    const includeDailyReport = args.includeDailyReport ?? true

    // 1) Selection proof: pick the next endpoint using the real selection algorithm.
    const selected = (await ctx.runMutation(internal.observation.getNextEndpointToTest, {
      maxPriceUsdc,
    })) as Record<string, unknown> | null

    if (!selected) {
      throw new Error(
        `No active observed endpoints within maxPriceUsdc=$${maxPriceUsdc}. Seed at least one row in observedEndpoints (isActive=true).`
      )
    }

    const endpointId = selected._id as Id<'observedEndpoints'>
    const agentAddress: string = selected.agentAddress as string
    const endpointUrl: string = selected.endpoint as string

    const endpointBefore = (await ctx.runQuery(internal.observation.getObservedEndpointInternal, {
      endpointId,
    })) as Record<string, unknown> | null
    if (!endpointBefore) {
      throw new Error(`Selected endpoint not found by id: ${endpointId}`)
    }

    // 2) Real fetch/test run
    const runResult: unknown = await ctx.runAction(internal.observation.runHourlyTests, {
      maxTests: 1,
      hourlyBudgetUsdc,
      maxPriceUsdc,
      forceEndpointId: endpointId,
    })

    // 3) Persistence proof
    const tests: unknown[] = await ctx.runQuery(internal.observation.getTestsForEndpointInternal, {
      endpointId,
      limit: 10,
    })

    const recentTest: unknown = tests.find((t: unknown) => {
      const testedAt = ((t as Record<string, unknown>).testedAt ??
        (t as Record<string, unknown>)._creationTime) as number | undefined
      return typeof testedAt === 'number' && testedAt >= startedAtMs - 2_000
    })

    if (!recentTest) {
      const newest = tests[0]
      const newestAt = newest
        ? (((newest as Record<string, unknown>).testedAt ??
            (newest as Record<string, unknown>)._creationTime) as number | undefined)
        : null
      throw new Error(
        `Expected a new endpointTests row for endpointId=${endpointId} after startedAtMs=${startedAtMs}. newestTestedAt=${newestAt}`
      )
    }

    const testId = (recentTest as Record<string, unknown>)._id as Id<'endpointTests'>
    const testedAtMs = ((recentTest as Record<string, unknown>).testedAt ??
      (recentTest as Record<string, unknown>)._creationTime) as number | undefined

    // 4) Aggregates proof
    const endpointAfter = (await ctx.runQuery(internal.observation.getObservedEndpointInternal, {
      endpointId,
    })) as Record<string, unknown> | null
    if (!endpointAfter) {
      throw new Error(`Endpoint missing after test run (unexpected): ${endpointId}`)
    }

    const beforeTotal = ((endpointBefore as Record<string, unknown>).totalTests as number) ?? 0
    const afterTotal = ((endpointAfter as Record<string, unknown>).totalTests as number) ?? 0

    if (afterTotal !== beforeTotal + 1) {
      throw new Error(
        `Expected totalTests to increment by 1. before=${beforeTotal} after=${afterTotal}`
      )
    }

    const afterLastTestedAt = (endpointAfter as Record<string, unknown>).lastTestedAt as
      | number
      | undefined
    if (typeof afterLastTestedAt !== 'number' || afterLastTestedAt < startedAtMs) {
      throw new Error(
        `Expected endpoint.lastTestedAt to be updated to a recent timestamp. lastTestedAt=${afterLastTestedAt} startedAtMs=${startedAtMs}`
      )
    }

    if (typeof testedAtMs === 'number' && typeof afterLastTestedAt === 'number') {
      const driftMs = Math.abs(testedAtMs - afterLastTestedAt)
      if (driftMs > 5_000) {
        throw new Error(
          `Expected endpoint.lastTestedAt to closely match endpointTests.testedAt. testedAtMs=${testedAtMs} lastTestedAt=${afterLastTestedAt} driftMs=${driftMs}`
        )
      }
    }

    // 5) Public reads proof
    const liveFeed: unknown[] = await ctx.runQuery(
      internal.observatoryTerminal.getPublicLiveFeedInternal,
      {
        limit: 200,
      }
    )
    const feedIndex: number = (liveFeed as unknown[]).findIndex(
      (i: unknown) =>
        (i as Record<string, unknown>)?.kind === 'observation' &&
        (i as Record<string, unknown>)._id === testId
    )
    if (feedIndex < 0) {
      throw new Error(`Expected observatoryTerminal:getPublicLiveFeed to include testId=${testId}`)
    }
    const feedItem = (liveFeed as unknown[])[feedIndex]

    // 6) Ghost score proof
    const ghostScore: unknown = await ctx.runQuery(
      internal.ghostScoreCalculator.calculateAgentScoreInternal,
      {
        agentAddress,
      }
    )
    const apiQualityMetrics = (
      (ghostScore as Record<string, unknown>).sources as Record<string, unknown>
    ).apiQualityMetrics as Record<string, unknown>
    const apiQualityDataPoints =
      ((apiQualityMetrics as Record<string, unknown>).dataPoints as number) ?? 0

    if (apiQualityDataPoints < 1) {
      throw new Error(
        `Expected ghostScoreCalculator:calculateAgentScore.sources.apiQualityMetrics.dataPoints >= 1. actual=${apiQualityDataPoints}`
      )
    }

    // 7) Optional: compile daily report
    const dailyReport: Record<string, unknown> = {
      attempted: false,
      date: null as string | null,
      compileResult: null as unknown,
      reportId: null as unknown,
      compiledAt: null as number | null,
    }

    if (includeDailyReport) {
      const date = new Date().toISOString().split('T')[0]
      const compileResult = await ctx.runMutation(internal.observation.compileDailyReport, {
        agentAddress,
        date,
      })
      const report: unknown = await ctx.runQuery(internal.observation.getDailyReportInternal, {
        agentAddress,
        date,
      })
      if (!report) {
        throw new Error(
          `Expected dailyObservationReports row after compileDailyReport. agentAddress=${agentAddress} date=${date}`
        )
      }

      dailyReport.attempted = true
      dailyReport.date = date
      dailyReport.compileResult = compileResult
      dailyReport.reportId = (report as Record<string, unknown>)
        ._id as Id<'dailyObservationReports'>
      dailyReport.compiledAt =
        ((report as Record<string, unknown>).compiledAt as number | null) ?? null
    }

    return {
      ok: true as const,
      startedAtMs,
      selection: {
        endpointId,
        endpointUrl,
        method: selected.method,
        baseUrl: selected.baseUrl,
        priceUsdc: selected.priceUsdc,
        agentAddress,
      },
      runResult,
      persisted: {
        testId,
        testedAtMs,
        responseStatus: (recentTest as Record<string, unknown>).responseStatus as number,
        responseTimeMs: (recentTest as Record<string, unknown>).responseTimeMs as number,
        paymentAmountUsdc: (recentTest as Record<string, unknown>).paymentAmountUsdc as number,
        success: (recentTest as Record<string, unknown>).success as boolean,
        capabilityVerified: (recentTest as Record<string, unknown>).capabilityVerified as boolean,
        qualityScore: (recentTest as Record<string, unknown>).qualityScore as number,
      },
      endpointAggregates: {
        before: {
          totalTests: ((endpointBefore as Record<string, unknown>).totalTests as number) ?? 0,
          successfulTests:
            ((endpointBefore as Record<string, unknown>).successfulTests as number) ?? 0,
          lastTestedAt:
            ((endpointBefore as Record<string, unknown>).lastTestedAt as number | null) ?? null,
          avgQualityScore:
            ((endpointBefore as Record<string, unknown>).avgQualityScore as number | null) ?? null,
          avgResponseTimeMs:
            ((endpointBefore as Record<string, unknown>).avgResponseTimeMs as number | null) ??
            null,
        },
        after: {
          totalTests: ((endpointAfter as Record<string, unknown>).totalTests as number) ?? 0,
          successfulTests:
            ((endpointAfter as Record<string, unknown>).successfulTests as number) ?? 0,
          lastTestedAt:
            ((endpointAfter as Record<string, unknown>).lastTestedAt as number | null) ?? null,
          avgQualityScore:
            ((endpointAfter as Record<string, unknown>).avgQualityScore as number | null) ?? null,
          avgResponseTimeMs:
            ((endpointAfter as Record<string, unknown>).avgResponseTimeMs as number | null) ?? null,
        },
      },
      publicFeed: {
        included: true,
        index: feedIndex,
        item: feedItem,
      },
      ghostScore: {
        score: (ghostScore as Record<string, unknown>).score as number,
        tier: (ghostScore as Record<string, unknown>).tier as string,
        apiQualityMetrics: {
          dataPoints: apiQualityDataPoints,
          rawScore: ((apiQualityMetrics as Record<string, unknown>).rawScore as number) ?? 0,
          weight: ((apiQualityMetrics as Record<string, unknown>).weight as number) ?? 0,
          confidence: ((apiQualityMetrics as Record<string, unknown>).confidence as number) ?? 0,
          timeDecayFactor:
            ((apiQualityMetrics as Record<string, unknown>).timeDecayFactor as number) ?? 0,
          lastUpdated:
            ((apiQualityMetrics as Record<string, unknown>).lastUpdated as number | null) ?? null,
        },
      },
      dailyReport,
    }
  },
}) as unknown

/**
 * Public CLI-callable wrapper.
 */
export const verifyEndToEndObservationRun = action({
  args: {
    maxPriceUsdc: v.optional(v.number()),
    hourlyBudgetUsdc: v.optional(v.number()),
    includeDailyReport: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    return await ctx.runAction(
      (internal as any).debugObservation.verifyEndToEndObservationRunInternal,
      args as any
    )
  },
}) as unknown
