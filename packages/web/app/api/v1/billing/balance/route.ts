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
import {
  getTeamBalance,
  getGhostBalance,
  shouldNotifyRefill,
  calculateProjectedBalance,
  calculateGhostCost,
  type PricingTier,
  GHOST_DECIMALS,
} from '@/lib/b2b-token-accounts'
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
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
    }

    // 1. Check if user has their own USDC token account (individual billing)
    const user = await convexClient.query(api.users.getById, {
      userId: authUser.userId as Id<'users'>,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user has their own payment accounts, use individual billing
    if (user.usdcTokenAccount || user.ghostTokenAccount) {
      const now = Date.now()
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

      // Get usage stats for projection
      const usageSummary = await convexClient.query(api.apiUsage.getSummaryByUser, {
        userId: authUser.userId as Id<'users'>,
        startDate: thirtyDaysAgo,
        endDate: now,
      })

      // Calculate average daily requests
      const avgDailyRequests = usageSummary.totalRequests / 30
      const tier = authUser.tier as PricingTier

      // Initialize response data
      const response: any = {
        billingType: 'individual',
        preferredPaymentToken: user.preferredPaymentToken || 'usdc',
      }

      // Get USDC balance if available
      if (user.usdcTokenAccount) {
        const usdcTokenAccount = address(user.usdcTokenAccount)
        const { balance: usdcBalance, uiBalance: usdcUiBalance } =
          await getTeamBalance(usdcTokenAccount)

        const usdcProjection = calculateProjectedBalance(usdcUiBalance, avgDailyRequests, tier)
        const usdcNeedsRefill = shouldNotifyRefill(usdcUiBalance)

        response.usdc = {
          balance: {
            raw: usdcBalance.toString(),
            usdc: usdcUiBalance,
            formatted: `${usdcUiBalance.toFixed(2)} USDC`,
          },
          projection: {
            currentUsage: {
              totalRequests: usageSummary.totalRequests,
              avgDailyRequests: Math.round(avgDailyRequests),
            },
            projected: {
              balanceInMonth: usdcProjection.projectedBalance,
              daysRemaining: Math.round(usdcProjection.daysRemaining),
              needsRefill: usdcProjection.needsRefill,
            },
          },
          alerts: {
            lowBalance: usdcNeedsRefill,
            critical: usdcUiBalance < 5,
            message: usdcNeedsRefill
              ? 'Your USDC balance is low. Please add funds to avoid service interruption.'
              : null,
          },
          tokenAccount: user.usdcTokenAccount,
        }
      }

      // Get GHOST balance if available
      if (user.ghostTokenAccount) {
        const ghostTokenAccount = address(user.ghostTokenAccount)
        const { balance: ghostBalance, uiBalance: ghostUiBalance } =
          await getGhostBalance(ghostTokenAccount)

        // Calculate GHOST equivalent for pricing projection
        // Estimate average cost per request in GHOST based on USDC pricing
        const avgCostPerRequestUsdc =
          tier === 'enterprise' ? 0 : calculateProjectedBalance(0, 1, tier).projectedBalance * -1
        const avgCostPerRequestGhost = Number(
          await calculateGhostCost(BigInt(Math.floor(avgCostPerRequestUsdc * 1_000_000)))
        )

        const ghostDailyCost = (avgCostPerRequestGhost * avgDailyRequests) / Math.pow(10, GHOST_DECIMALS)
        const ghostDaysRemaining = ghostDailyCost > 0 ? ghostUiBalance / ghostDailyCost : Infinity
        const ghostNeedsRefill = ghostDaysRemaining < 7

        response.ghost = {
          balance: {
            raw: ghostBalance.toString(),
            ghost: ghostUiBalance,
            formatted: `${ghostUiBalance.toFixed(2)} GHOST`,
          },
          projection: {
            currentUsage: {
              totalRequests: usageSummary.totalRequests,
              avgDailyRequests: Math.round(avgDailyRequests),
            },
            projected: {
              balanceInMonth: Math.max(0, ghostUiBalance - ghostDailyCost * 30),
              daysRemaining: Math.round(ghostDaysRemaining),
              needsRefill: ghostNeedsRefill,
            },
          },
          alerts: {
            lowBalance: ghostNeedsRefill,
            critical: ghostUiBalance < 20000, // Less than 20,000 GHOST (equivalent to ~$1 at $0.00005)
            message: ghostNeedsRefill
              ? 'Your GHOST balance is low. Please add funds to avoid service interruption.'
              : null,
          },
          tokenAccount: user.ghostTokenAccount,
        }
      }

      response.tier = tier

      return NextResponse.json(response)
    }

    // 2. Fall back to team billing (for enterprise users)
    const teamMembers = await convexClient.query(api.teamMembers.getByUser, {
      userId: authUser.userId as Id<'users'>,
    })

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json(
        {
          error:
            'No billing account configured. Please set up a USDC token account or join a team.',
        },
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
      billingType: 'team',
      teamId: team._id,
      teamName: team.name,
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
