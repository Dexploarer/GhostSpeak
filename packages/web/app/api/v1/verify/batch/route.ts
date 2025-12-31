/**
 * Bulk Agent Verification API
 *
 * POST /api/v1/verify/batch
 * Verify multiple agents in a single request with bulk pricing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery, fetchMutation } from 'convex/nextjs'

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
    // Get API key from headers
    const apiKey =
      req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Validate API key and check rate limit
    const keyData = await fetchQuery(api.apiKeys.validateApiKey, {
      apiKey,
    })

    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API key', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { agents } = body

    // Validate agents array
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
    if (!agents.every((addr: any) => typeof addr === 'string')) {
      return NextResponse.json(
        { error: 'All agent addresses must be strings', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Remove duplicates
    const uniqueAgents = [...new Set(agents)]

    console.log(`[Batch Verify] Processing ${uniqueAgents.length} agents`)

    // Process agents in parallel (10 at a time to avoid overwhelming DB)
    const results: BatchVerificationResult[] = []
    const batchSize = 10

    for (let i = 0; i < uniqueAgents.length; i += batchSize) {
      const batch = uniqueAgents.slice(i, i + batchSize)

      const batchResults = await Promise.all(
        batch.map(async (address: string) => {
          try {
            // Fetch agent reputation from cache
            const reputation = await fetchQuery(api.agentReputationCache.getAgentReputation, {
              agentAddress: address,
            })

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
          } catch (error: any) {
            console.error(`[Batch Verify] Error verifying ${address}:`, error)
            return {
              address,
              ghostScore: 0,
              tier: 'UNKNOWN',
              verified: false,
              error: error.message || 'Verification failed',
            }
          }
        })
      )

      results.push(...batchResults)
    }

    // Calculate total cost
    const totalCost = uniqueAgents.length * BULK_COST_PER_AGENT

    // Record API usage for billing
    await Promise.all(
      uniqueAgents.map((address: string) =>
        fetchMutation(api.apiUsage.recordUsage, {
          apiKeyId: keyData.apiKeyId,
          endpoint: '/verify/batch',
          method: 'POST',
          agentAddress: address,
          statusCode: 200,
          responseTime: Date.now() - startTime,
          billable: true,
          cost: BULK_COST_PER_AGENT,
        })
      )
    )

    const responseTime = Date.now() - startTime

    console.log(
      `[Batch Verify] Completed ${uniqueAgents.length} agents in ${responseTime}ms (${(responseTime / uniqueAgents.length).toFixed(2)}ms per agent)`
    )

    return NextResponse.json(
      {
        results,
        totalCost,
        metadata: {
          requestedCount: agents.length,
          uniqueCount: uniqueAgents.length,
          successCount: results.filter((r) => r.verified).length,
          failedCount: results.filter((r) => !r.verified).length,
          responseTime: `${responseTime}ms`,
          avgTimePerAgent: `${(responseTime / uniqueAgents.length).toFixed(2)}ms`,
        },
      },
      {
        headers: {
          'X-RateLimit-Limit': keyData.rateLimit.toString(),
          'X-RateLimit-Remaining': (keyData.rateLimit - 1).toString(),
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    )
  } catch (error: any) {
    console.error('[Batch Verify API] Error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
