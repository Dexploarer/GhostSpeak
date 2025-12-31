/**
 * Bulk Agent Verification API
 *
 * POST /api/v1/verify/batch
 * Verify multiple agents in a single request with bulk pricing.
 *
 * Requires payment: 0.5¢ (USDC or GHOST) per agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { authenticateApiKey } from '@/lib/api/auth'
import { withBillingEnforcement } from '@/lib/api/billing-middleware'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Bulk pricing: 0.5¢ per agent (vs 1¢ for single verification)
const BULK_COST_PER_AGENT = 0.5

interface BatchVerificationResult {
  address: string
  ghostScore: number
  tier: string
  verified: boolean
  error?: string
}

/**
 * POST /api/v1/verify/batch - Bulk verify agents
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate API key
    const auth = await authenticateApiKey(req)

    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    const { agents } = body

    // 3. Validate agents array
    if (!agents || !Array.isArray(agents)) {
      return NextResponse.json(
        { error: 'Request must include "agents" array', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (agents.length === 0) {
      return NextResponse.json(
        { error: 'Agents array cannot be empty', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (agents.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 agents per batch request', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate all addresses are strings
    if (!agents.every((addr: unknown) => typeof addr === 'string')) {
      return NextResponse.json(
        { error: 'All agent addresses must be strings', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Remove duplicates
    const uniqueAgents = [...new Set(agents)]

    // Calculate total cost for all agents
    const totalCostCents = uniqueAgents.length * BULK_COST_PER_AGENT

    console.log(
      `[Batch Verify] Processing ${uniqueAgents.length} agents (cost: ${totalCostCents}¢)`
    )

    // 4. Enforce payment and execute batch verification
    const result = await withBillingEnforcement(
      auth,
      { costCents: totalCostCents, endpoint: '/verify/batch' },
      async () => {
        // Process agents in parallel (10 at a time to avoid overwhelming DB)
        const results: BatchVerificationResult[] = []
        const batchSize = 10

        for (let i = 0; i < uniqueAgents.length; i += batchSize) {
          const batch = uniqueAgents.slice(i, i + batchSize)

          const batchResults = await Promise.all(
            batch.map(async (address: string) => {
              try {
                // Fetch agent reputation from cache
                const reputation = await convexClient.query(
                  // @ts-expect-error - getAgentReputation not in generated types, run `bunx convex dev` to regenerate
                  api.agentReputationCache.getAgentReputation,
                  {
                    agentAddress: address,
                  }
                )

                if (!reputation) {
                  return {
                    address,
                    ghostScore: 0,
                    tier: 'NEWCOMER',
                    verified: false,
                    error: 'Agent not found',
                  }
                }

                return {
                  address,
                  ghostScore: reputation.ghostScore,
                  tier: reputation.tier,
                  verified: true,
                }
              } catch (error: unknown) {
                console.error(`[Batch Verify] Error verifying ${address}:`, error)
                return {
                  address,
                  ghostScore: 0,
                  tier: 'UNKNOWN',
                  verified: false,
                  error: error instanceof Error ? error.message : 'Verification failed',
                }
              }
            })
          )

          results.push(...batchResults)
        }

        return {
          results,
          uniqueAgents,
          requestedCount: agents.length,
        }
      }
    )

    // Handle billing failure (402 Payment Required)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: 'PAYMENT_REQUIRED' },
        { status: result.status || 402 }
      )
    }

    const responseTime = Date.now() - startTime

    console.log(
      `[Batch Verify] Completed ${result.data.uniqueAgents.length} agents in ${responseTime}ms (${(responseTime / result.data.uniqueAgents.length).toFixed(2)}ms per agent)`
    )

    // Track successful request (usage tracking for analytics)
    await convexClient.mutation(api.apiUsage.track, {
      apiKeyId: auth.apiKeyId as Id<'apiKeys'>,
      userId: auth.userId as Id<'users'>,
      endpoint: '/verify/batch',
      method: 'POST',
      statusCode: 200,
      responseTime,
      billable: true,
      cost: totalCostCents,
    })

    return NextResponse.json(
      {
        results: result.data.results,
        totalCost: totalCostCents,
        metadata: {
          requestedCount: result.data.requestedCount,
          uniqueCount: result.data.uniqueAgents.length,
          successCount: result.data.results.filter((r: BatchVerificationResult) => r.verified)
            .length,
          failedCount: result.data.results.filter((r: BatchVerificationResult) => !r.verified)
            .length,
          responseTime: `${responseTime}ms`,
          avgTimePerAgent: `${(responseTime / result.data.uniqueAgents.length).toFixed(2)}ms`,
        },
      },
      {
        headers: {
          'X-Response-Time': `${responseTime}ms`,
          'X-Payment-Token': result.billing.paymentToken?.toUpperCase() || 'UNKNOWN',
          'X-Payment-Amount': result.billing.amountCharged?.usdc?.toString() || '0',
        },
      }
    )
  } catch (error: unknown) {
    console.error('[Batch Verify API] Error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
