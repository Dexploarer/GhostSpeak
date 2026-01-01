/**
 * GET /api/v1/billing/usage
 *
 * Get detailed usage breakdown for billing period
 *
 * Requires: X-API-Key header
 * Query params: ?startDate=<timestamp>&endDate=<timestamp>
 * Returns: Usage stats, costs, overage fees
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api/auth'
import { calculateOverageFees, PRICING_TIERS, type PricingTier } from '@/lib/b2b-token-accounts'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const authUser = await authenticateApiKey(request)

    if (!authUser) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Default to current month
    const now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const startDate = startDateParam ? parseInt(startDateParam) : startOfMonth.getTime()
    const endDate = endDateParam ? parseInt(endDateParam) : now

    // Get usage data from Convex
    const usageSummary = await convexClient.query(api.apiUsage.getSummaryByUser, {
      userId: authUser.userId as Id<'users'>,
      startDate,
      endDate,
    })

    // Get pricing tier info
    const tier = authUser.tier as PricingTier
    const pricing = PRICING_TIERS[tier]

    // Calculate overage
    const overageInfo = calculateOverageFees(usageSummary.totalRequests, tier)

    // Calculate total cost
    const monthlyCost = pricing.monthlyFee / 1_000_000 // Convert to USDC
    const totalCost = monthlyCost + overageInfo.overageFeesUi

    // Calculate breakdown by endpoint
    const endpointBreakdown = Object.entries(usageSummary.byEndpoint).map(
      ([endpoint, stats]: [string, any]) => ({
        endpoint,
        requests: stats.count,
        billableRequests: stats.billableCount,
        avgResponseTime: Math.round(stats.avgResponseTime),
        cost: stats.totalCost,
      })
    )

    // Daily usage chart data
    const dailyUsage = Object.entries(usageSummary.daily).map(([date, stats]: [string, any]) => ({
      date,
      requests: stats.count,
      cost: stats.cost,
    }))

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        daysInPeriod: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)),
      },
      summary: {
        totalRequests: usageSummary.totalRequests,
        billableRequests: usageSummary.billableRequests,
        includedRequests: pricing.includedRequests,
        requestsRemaining: Math.max(0, pricing.includedRequests - usageSummary.totalRequests),
      },
      costs: {
        monthlyFee: monthlyCost,
        overageFees: overageInfo.overageFeesUi,
        totalCost,
        currency: 'USDC',
      },
      overage: {
        hasOverage: overageInfo.overageRequests > 0,
        overageRequests: overageInfo.overageRequests,
        overageRate: pricing.overageRate / 1_000_000, // USDC per request
        overageFees: overageInfo.overageFeesUi,
        goesToStakers: overageInfo.goesToStakers,
      },
      tier: {
        name: tier,
        monthlyFee: monthlyCost,
        includedRequests: pricing.includedRequests,
        overageRate: pricing.overageRate / 1_000_000,
      },
      breakdown: {
        byEndpoint: endpointBreakdown,
        daily: dailyUsage,
      },
    })
  } catch (error) {
    console.error('[API] /api/v1/billing/usage error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve usage data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
