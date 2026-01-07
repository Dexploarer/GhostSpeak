import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'

export const debugRun = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('=== START DEBUG OBSERVATION RUN ===')

    // 0. SEED WALLET (Temporary Fix from .env.local)
    const secretKey = [
      114, 134, 95, 219, 29, 189, 88, 124, 77, 192, 107, 166, 121, 18, 105, 194, 216, 93, 89, 17,
      141, 233, 2, 159, 67, 31, 69, 245, 83, 213, 222, 151, 174, 75, 73, 203, 55, 63, 108, 34, 199,
      25, 195, 177, 46, 129, 232, 10, 115, 134, 81, 155, 57, 1, 35, 63, 31, 152, 119, 122, 19, 92,
      77, 39,
    ]
    const publicKey = 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc'

    await ctx.runMutation(internal.lib.caisper.setCaisperWallet, {
      publicKey,
      secretKey,
    })
    console.log('[Debug] Wallet seeded.')

    // 1. Check Wallet
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (wallet) {
      console.log(`[Debug] Wallet configured: ${wallet.publicKey}`)
    } else {
      console.error('[Debug] CAISPER WALLET NOT CONFIGURED! Payment will fail.')
    }

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
        let token = 'SOL' // Assume SOL unless specified otherwise

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
            // console.log('[Debug] Body JSON:', JSON.stringify(json, null, 2))

            if (json.recipient) {
              recipient = json.recipient
              if (json.amount) amount = json.amount
              if (json.token) token = json.token
            } else if (json.accepts && Array.isArray(json.accepts) && json.accepts.length > 0) {
              // Parse x402 style accepts array
              // Find solana network offer
              const offer =
                json.accepts.find(
                  (a: unknown) => (a as Record<string, unknown>).network === 'solana'
                ) || json.accepts[0]
              if (offer) {
                recipient = offer.payTo
                amount = parseInt(offer.maxAmountRequired || '0')
                // TODO: Handle Asset/Token check. x402factory uses USDC.
                // But let's see if we can extract it.
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

        // Try to PAY if parsed
        if (recipient && amount > 0) {
          console.log(`[Debug] Attempting Payment: ${amount} ${token} to ${recipient}`)

          // If token is NOT 'SOL' and NOT 'USDC-mock' (or whatever), warn.
          // Caisper assumes 'SOL' in sendSolPayment.
          // If the amount is small (1000 lamports = 0.000001 SOL), let's try sending SOL?
          // But wait, "1000" in x402 usually means units of the ASSET.
          // USDC has 6 decimals. 1000 = 0.001 USDC.
          // Sending 1000 lamports is 0.000001 SOL.
          // The Recipient expects USDC. sending SOL might fail or be lost.
          // BUT maybe Caisper needs a `sendSplPayment`?

          if (token !== 'SOL') {
            console.warn(
              '[Debug] WARNING: Token is ' +
                token +
                '. Caisper only supports SOL native currently (via sendSolPayment). Payment might fail or be rejected.'
            )
          }

          // Override amountSol for test:
          // If it wants 1000 units of USDC, we need to send equivalent Value? No.
          // We need to send USDC.
          // But let's try sending standard SOL amount for now just to trigger the flow?
          // Recipient wallet handles both?

          // Let's call sendSolPayment just to test the mechanism.
          // 1000 lamports is safely small.
          // sendSolPayment takes amountSol. 1000 / 1e9 = 0.000001 SOL.
          const payResult = await ctx.runAction(internal.lib.caisper.sendSolPayment, {
            recipient,
            amountSol: 0.00001, // Mock small amount test
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
    const signature = args.signature ?? 'caisper_observation_test_signature'

    // Ensure a Caisper wallet exists so the interaction has a payer address.
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (!wallet) {
      await ctx.runMutation(internal.lib.caisper.setCaisperWallet, {
        publicKey: 'CaisperTestWalletPublicKey1111111111111111111111111',
        secretKey: [0],
      })
    }

    const caisperWalletPublicKey =
      (await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal))?.publicKey ||
      'caisper_unconfigured'

    // Ensure an endpoint exists to attach the test to.
    const addRes = await ctx.runMutation(internal.observation.upsertObservedEndpointInternal, {
      agentAddress: 'CaisperTestAgent11111111111111111111111111111111',
      baseUrl: 'example.com',
      endpoint: 'https://example.com/observatory-payment-wiring-test',
      method: 'POST',
      priceUsdc: 0.01,
      description: 'Observatory payment wiring test',
      category: 'utility',
    })

    const endpointId = addRes.id

    // Record a test result with a payment signature; this should create a historical interaction.
    await ctx.runMutation(internal.observation.recordTestResult, {
      endpointId,
      agentAddress: 'CaisperTestAgent11111111111111111111111111111111',
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
 * End-to-end Convex validation proving the full observation pipeline works:
 * - selection from `observedEndpoints`
 * - real fetch/test run through the same code path as cron (`runHourlyTests`)
 * - persistence to `endpointTests`
 * - endpoint aggregates update
 * - public Observatory feed sees the new test
 * - ghost-score apiQualityMetrics consumes the new data
 * - (optional) daily report compilation consumes the new data
 */
export const verifyEndToEndObservationRunInternal = internalAction({
  args: {
    // Safety knobs (optional) so callers can keep spending low.
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

    // 2) Real fetch/test run: execute the same runner used by cron, but force maxTests=1
    //    and force the first endpoint to be the one we selected.
    const runResult: unknown = await ctx.runAction(internal.observation.runHourlyTests, {
      maxTests: 1,
      hourlyBudgetUsdc,
      maxPriceUsdc,
      forceEndpointId: endpointId,
    })

    // 3) Persistence proof: confirm a new `endpointTests` row exists very recently.
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

    // 4) Aggregates proof: endpoint row patched (totalTests incremented, lastTestedAt updated)
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

    // recordTestResult uses a single timestamp for test + endpoint patch; verify consistency.
    if (typeof testedAtMs === 'number' && typeof afterLastTestedAt === 'number') {
      const driftMs = Math.abs(testedAtMs - afterLastTestedAt)
      if (driftMs > 5_000) {
        throw new Error(
          `Expected endpoint.lastTestedAt to closely match endpointTests.testedAt. testedAtMs=${testedAtMs} lastTestedAt=${afterLastTestedAt} driftMs=${driftMs}`
        )
      }
    }

    // 5) Public reads proof: new test appears in Observatory public live feed.
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

    // 6) Downstream computations proof: ghost-score apiQualityMetrics sees >= 1 data point.
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

    // 7) Optional: compile daily report for *today* (not yesterday) and assert it exists.
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
 *
 * Allows running:
 *   bunx convex run debugObservation:verifyEndToEndObservationRun
 */
export const verifyEndToEndObservationRun = action({
  args: {
    maxPriceUsdc: v.optional(v.number()),
    hourlyBudgetUsdc: v.optional(v.number()),
    includeDailyReport: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    // NOTE: `_generated/api` is regenerated by `convex dev/deploy`.
    // During development or in CI type-checks that don't regenerate, the new
    // function may not exist in the committed types yet, so we cast.
    return await ctx.runAction(
      (internal as any).debugObservation.verifyEndToEndObservationRunInternal,
      args as any
    )
  },
}) as unknown
