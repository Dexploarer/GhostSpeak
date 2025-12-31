/**
 * GET /api/v1/agents/:address/score
 * Lightweight endpoint to get agent's Ghost Score
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { authenticateApiKey } from '@/lib/api/auth'
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

    // 3. Check cache first
    const cached = await convexClient
      .query(api.agentReputationCache?.getByAddress, {
        agentAddress,
      })
      .catch(() => null)

    if (cached && Date.now() - cached.lastUpdated < 5 * 60 * 1000) {
      // Cache hit (< 5 minutes old)
      await convexClient.mutation(api.apiUsage.track, {
        apiKeyId: auth.apiKeyId as any,
        userId: auth.userId as any,
        endpoint: `/agents/${agentAddress}/score`,
        method: 'GET',
        agentAddress,
        statusCode: 200,
        responseTime: Date.now() - startTime,
        billable: true,
        cost: 0.5, // 0.5 cents per score lookup (cheaper than full verify)
      })

      const response: ScoreResponse = {
        ghostScore: cached.ghostScore,
        tier: cached.tier,
        lastUpdated: new Date(cached.lastUpdated).toISOString(),
      }

      return NextResponse.json(response, {
        headers: {
          'X-Cache': 'HIT',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        },
      })
    }

    // 4. Fetch from blockchain
    const client = getGhostSpeakClient()
    const agent = await client.agents.getAgentAccount(agentAddress as Address)

    if (!agent) {
      await convexClient.mutation(api.apiUsage.track, {
        apiKeyId: auth.apiKeyId as any,
        userId: auth.userId as any,
        endpoint: `/agents/${agentAddress}/score`,
        method: 'GET',
        agentAddress,
        statusCode: 404,
        responseTime: Date.now() - startTime,
        billable: false,
      })

      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 5. Calculate score
    const reputationScore = agent.reputationScore ?? 0
    const ghostScore = Math.min(10000, Math.round(reputationScore / 100))
    const tier = getTierFromScore(ghostScore)

    // 6. Track request
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

    // 7. Return response
    const response: ScoreResponse = {
      ghostScore,
      tier,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
        'X-RateLimit-Reset': rateLimit.reset.toString(),
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
