/**
 * POST /api/v1/verify
 * Core B2B API endpoint for agent reputation verification
 *
 * Requires payment: 1¢ (USDC or GHOST) per verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { authenticateApiKey } from '@/lib/api/auth'
import { withBillingEnforcement } from '@/lib/api/billing-middleware'
import { checkRateLimit, checkDailyQuota } from '@/lib/api/rate-limiter'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import type { Address } from '@solana/addresses'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface VerifyRequest {
  agentAddress: string
  requiredScore?: number
  returnMetrics?: boolean
}

interface VerifyResponse {
  verified: boolean
  ghostScore: number
  tier: string
  meetsRequirement: boolean
  metrics?: {
    successRate: number
    avgResponseTime?: number
    totalJobs: number
    disputes: number
    disputeResolution: string
  }
  payaiData?: {
    last30Days: {
      transactions: number
      volume: string
      avgAmount: string
    }
  }
  credentialId?: string
  verifiedAt: string
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

/**
 * Calculate comprehensive Ghost Score from agent data
 */
function calculateGhostScore(agent: any): {
  score: number
  tier: string
  metrics: VerifyResponse['metrics']
} {
  // Extract basic metrics
  const totalJobs = agent.totalJobsCompleted ?? 0
  const reputationScore = agent.reputationScore ?? 0

  // Convert reputation score from basis points to 0-10000 scale
  const ghostScore = Math.min(10000, Math.round(reputationScore / 100))
  const tier = getTierFromScore(ghostScore)

  // Calculate success rate
  const successRate = totalJobs > 0 ? Math.min(100, (ghostScore / totalJobs) * 10) : 0

  const metrics = {
    successRate: Math.round(successRate * 100) / 100,
    totalJobs,
    disputes: 0,
    disputeResolution: '100%',
    avgResponseTime: undefined,
  }

  return { score: ghostScore, tier, metrics }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
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

    // 3. Check daily quota
    const quota = await checkDailyQuota(auth.apiKeyId, auth.tier)

    if (!quota.success) {
      return NextResponse.json(
        {
          error: 'Daily quota exceeded',
          code: 'QUOTA_EXCEEDED',
          used: quota.used,
          limit: quota.limit,
        },
        { status: 429 }
      )
    }

    // 4. Parse request body
    const body: VerifyRequest = await request.json()

    if (!body.agentAddress) {
      // Track failed request (no billing)
      await convexClient.mutation(api.apiUsage.track, {
        apiKeyId: auth.apiKeyId as any,
        userId: auth.userId as any,
        endpoint: '/verify',
        method: 'POST',
        statusCode: 400,
        responseTime: Date.now() - startTime,
        billable: false,
      })

      return NextResponse.json(
        { error: 'Missing required field: agentAddress', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // 5. Enforce payment and execute verification
    const result = await withBillingEnforcement(
      auth,
      { costCents: 1, endpoint: '/verify' },
      async () => {
        // Check cache first
        const cached = await convexClient
          .query(api.agentReputationCache?.getByAddress, {
            agentAddress: body.agentAddress,
          })
          .catch(() => null)

        if (cached && Date.now() - cached.lastUpdated < 5 * 60 * 1000) {
          // Cache hit (< 5 minutes old)
          const response: VerifyResponse = {
            verified: true,
            ghostScore: cached.ghostScore,
            tier: cached.tier,
            meetsRequirement: body.requiredScore ? cached.ghostScore >= body.requiredScore : true,
            metrics: body.returnMetrics
              ? {
                  successRate: cached.successRate,
                  avgResponseTime: cached.avgResponseTime,
                  totalJobs: cached.totalJobs,
                  disputes: cached.disputes,
                  disputeResolution: cached.disputeResolution,
                }
              : undefined,
            payaiData: body.returnMetrics ? cached.payaiData : undefined,
            credentialId: cached.credentialId,
            verifiedAt: new Date().toISOString(),
          }

          return { response, cacheHit: true }
        }

        // Fetch agent data from blockchain
        const client = getGhostSpeakClient()
        const agent = await client.agents.getAgentAccount(body.agentAddress as Address)

        if (!agent) {
          throw new Error('Agent not found')
        }

        // Calculate Ghost Score
        const { score, tier, metrics } = calculateGhostScore(agent)

        // Update cache (fire and forget)
        if (metrics) {
          convexClient
            .mutation(api.agentReputationCache?.upsert, {
              agentAddress: body.agentAddress,
              ghostScore: score,
              tier,
              successRate: metrics.successRate,
              avgResponseTime: metrics.avgResponseTime,
              totalJobs: metrics.totalJobs,
              disputes: metrics.disputes,
              disputeResolution: metrics.disputeResolution,
            })
            .catch(() => {
              // Ignore cache errors
            })
        }

        const response: VerifyResponse = {
          verified: true,
          ghostScore: score,
          tier,
          meetsRequirement: body.requiredScore ? score >= body.requiredScore : true,
          metrics: body.returnMetrics ? metrics : undefined,
          credentialId: undefined,
          verifiedAt: new Date().toISOString(),
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
      endpoint: '/verify',
      method: 'POST',
      agentAddress: body.agentAddress,
      statusCode: 200,
      responseTime: Date.now() - startTime,
      billable: true,
      cost: 1, // 1 cent per verification
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
    console.error('Verify API error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
