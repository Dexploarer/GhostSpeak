/**
 * GET /api/v1/agents/:address/score
 * Lightweight endpoint to get agent's Ghost Score
 *
 * Requires payment: 0.5¢ (USDC or GHOST) per lookup
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { authenticateApiKey } from '@/lib/api/auth'
import { withBillingEnforcement } from '@/lib/api/billing-middleware'
import { checkRateLimit } from '@/lib/api/rate-limiter'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import type { Address } from '@solana/addresses'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface ScoreResponse {
  ghostScore: number
  tier: string
  lastUpdated: string
}

/**
 * Calculate Ghost Score tier from numeric score
 */
function getTierFromScore(score: number): string {
  if (score >= 9000) return 'DIAMOND'
  if (score >= 7500) return 'PLATINUM'
  if (score >= 5000) return 'GOLD'
  if (score >= 2000) return 'SILVER'
  if (score >= 500) return 'BRONZE'
  return 'NEWCOMER'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const startTime = Date.now()

  try {
    const { address: agentAddress } = await params

    // 1. Authenticate API key
    const auth = await authenticateApiKey(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. Check rate limit
    const rateLimit = await checkRateLimit(auth.apiKeyId, auth.tier)

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          limit: rateLimit.limit,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      )
    }

    // 3. Enforce payment and fetch score
    const result = await withBillingEnforcement(
      auth,
      { costCents: 0.5, endpoint: `/agents/${agentAddress}/score` },
      async () => {
        // Check cache first
        const cached = await convexClient
          .query(api.agentReputationCache?.getByAddress, {
            agentAddress,
          })
          .catch(() => null)

        if (cached && Date.now() - cached.lastUpdated < 5 * 60 * 1000) {
          // Cache hit (< 5 minutes old)
          const response: ScoreResponse = {
            ghostScore: cached.ghostScore,
            tier: cached.tier,
            lastUpdated: new Date(cached.lastUpdated).toISOString(),
          }

          return { response, cacheHit: true }
        }

        // Fetch from blockchain
        const client = getGhostSpeakClient()
        const agent = await client.agents.getAgentAccount(agentAddress as Address)

        if (!agent) {
          throw new Error('Agent not found')
        }

        // Calculate score
        const reputationScore = agent.reputationScore ?? 0
        const ghostScore = Math.min(10000, Math.round(reputationScore / 100))
        const tier = getTierFromScore(ghostScore)

        const response: ScoreResponse = {
          ghostScore,
          tier,
          lastUpdated: new Date().toISOString(),
        }

        return { response, cacheHit: false }
      }
    )

    // Handle billing failure (402 Payment Required)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: 'PAYMENT_REQUIRED' },
        { status: result.status || 402 }
      )
    }

    // Track successful request
    await convexClient.mutation(api.apiUsage.track, {
      apiKeyId: auth.apiKeyId as any,
      userId: auth.userId as any,
      endpoint: `/agents/${agentAddress}/score`,
      method: 'GET',
      agentAddress,
      statusCode: 200,
      responseTime: Date.now() - startTime,
      billable: true,
      cost: 0.5,
    })

    // Return response
    return NextResponse.json(result.data.response, {
      headers: {
        'X-Cache': result.data.cacheHit ? 'HIT' : 'MISS',
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
        'X-RateLimit-Reset': rateLimit.reset.toString(),
        'X-Payment-Token': result.billing.paymentToken?.toUpperCase() || 'UNKNOWN',
        'X-Payment-Amount': result.billing.amountCharged?.usdc?.toString() || '0',
      },
    })
  } catch (error) {
    console.error('Score API error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
