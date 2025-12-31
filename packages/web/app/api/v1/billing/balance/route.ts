/**
 * GET /api/v1/billing/balance
 *
 * Check team's USDC balance in prepaid token account
 *
 * Requires: X-API-Key header
 * Returns: Current balance, projected balance, refill warning
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api/auth'
import { getTeamBalance, shouldNotifyRefill, calculateProjectedBalance, type PricingTier } from '@/lib/b2b-token-accounts'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { address, type Address } from '@solana/addresses'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const authUser = await authenticateApiKey(request)

    if (!authUser) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      )
    }

    // Get team info from Convex
    const teamMembers = await convexClient.query(api.teamMembers.getByUser, {
      userId: authUser.userId as Id<'users'>,
    })

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json(
        { error: 'User is not part of any team' },
        { status: 404 }
      )
    }

    // Get first team (user can be in multiple teams, use first for now)
    const teamId = teamMembers[0].teamId
    const team = await convexClient.query(api.teams.getById, { teamId })

    if (!team || !team.usdcTokenAccount) {
      return NextResponse.json(
        { error: 'Team does not have a USDC token account configured' },
        { status: 404 }
      )
    }

    // Get balance from on-chain
    const tokenAccount = address(team.usdcTokenAccount)
    const { balance, uiBalance } = await getTeamBalance(tokenAccount)

    // Get usage stats for projection
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const usageSummary = await convexClient.query(api.apiUsage.getSummaryByUser, {
      userId: authUser.userId as Id<'users'>,
      startDate: thirtyDaysAgo,
      endDate: now,
    })

    // Calculate average daily requests
    const avgDailyRequests = usageSummary.totalRequests / 30

    // Get pricing projection
    const tier = authUser.tier as PricingTier
    const projection = calculateProjectedBalance(uiBalance, avgDailyRequests, tier)

    // Check if refill needed
    const needsRefill = shouldNotifyRefill(uiBalance)

    return NextResponse.json({
      balance: {
        raw: balance.toString(), // BigInt as string
        usdc: uiBalance,
        formatted: `${uiBalance.toFixed(2)} USDC`,
      },
      projection: {
        currentUsage: {
          totalRequests: usageSummary.totalRequests,
          avgDailyRequests: Math.round(avgDailyRequests),
        },
        projected: {
          balanceInMonth: projection.projectedBalance,
          daysRemaining: Math.round(projection.daysRemaining),
          needsRefill: projection.needsRefill,
        },
      },
      alerts: {
        lowBalance: needsRefill,
        critical: uiBalance < 5, // Less than $5
        message: needsRefill
          ? 'Your balance is low. Please add funds to avoid service interruption.'
          : null,
      },
      tier,
      tokenAccount: team.usdcTokenAccount,
    })
  } catch (error) {
    console.error('[API] /api/v1/billing/balance error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve balance',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
