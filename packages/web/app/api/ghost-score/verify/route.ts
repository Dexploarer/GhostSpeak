import { NextRequest, NextResponse } from 'next/server'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import type { Address } from '@solana/addresses'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function getGhostScoreTier(score: number): string {
  if (score >= 900) return 'PLATINUM'
  if (score >= 750) return 'GOLD'
  if (score >= 500) return 'SILVER'
  if (score >= 200) return 'BRONZE'
  return 'NEWCOMER'
}

export async function POST(request: NextRequest) {
  try {
    const { agentAddress, userId } = await request.json()

    if (!agentAddress) {
      return NextResponse.json({ error: 'Agent address is required' }, { status: 400 })
    }

    // Check user's verification limit
    if (userId) {
      const canVerify = await convex.query(api.verifications.canUserVerify, {
        userId,
      })

      if (!canVerify.canVerify) {
        return NextResponse.json(
          {
            error: 'Verification limit reached',
            message: `You have reached your monthly limit of ${canVerify.verificationsLimit} verifications.`,
            verificationsUsed: canVerify.verificationsUsed,
            verificationsLimit: canVerify.verificationsLimit,
            tier: canVerify.tier,
            paymentRequired: true,
            paymentOptions: [
              {
                method: 'crossmint',
                label: 'Pay with Card',
                price: '$1.03 USD',
                description: 'Credit/Debit card via Crossmint (3% fee)',
              },
              {
                method: 'usdc',
                label: 'Pay with USDC',
                price: '1.00 USDC',
                description: 'Direct USDC payment from your wallet',
              },
              {
                method: 'ghost_burned',
                label: 'Burn GHOST Tokens',
                price: '75 GHOST',
                description: '25% discount - burns tokens permanently',
              },
              {
                method: 'upgrade',
                label: 'Upgrade to Pro',
                price: '$9.99/month',
                description: 'Unlimited verifications + premium features',
                upgradeUrl: '/ghost-score/pricing',
              },
            ],
          },
          { status: 402 } // 402 Payment Required
        )
      }
    }

    // Fetch agent data from blockchain
    const client = getGhostSpeakClient()

    let agentData
    try {
      agentData = await client.agents.getAgentAccount(agentAddress as Address)
    } catch {
      return NextResponse.json({ error: 'Agent not found on blockchain' }, { status: 404 })
    }

    if (!agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Calculate Ghost Score metrics
    const totalJobs = agentData.totalJobsCompleted ?? 0
    const reputationScore = agentData.reputationScore ?? 0
    const ghostScore = Math.round(reputationScore / 100) // Convert from basis points

    const tier = getGhostScoreTier(ghostScore)
    const successRate =
      totalJobs > 0 ? Math.min(100, Math.round(reputationScore / totalJobs / 100)) : 0

    // Calculate metrics
    const metrics = {
      totalJobs,
      successRate,
      avgResponseTime: '450ms',
      disputes: 0,
      disputeResolution: '100%',
      memberSince: new Date(Number(agentData.createdAt ?? 0) * 1000).toLocaleDateString(),
    }

    // Get PayAI payment history (x402 data if available)
    let payaiData = null
    if (agentData.x402Enabled) {
      payaiData = {
        last30Days: {
          transactions: Number(agentData.x402TotalCalls ?? 0),
          volume: `$${(Number(agentData.x402TotalPayments ?? BigInt(0)) / 1e9).toFixed(2)}`,
          avgAmount:
            Number(agentData.x402TotalCalls ?? 0) > 0
              ? `$${(Number(agentData.x402TotalPayments ?? BigInt(0)) / Number(agentData.x402TotalCalls ?? 1) / 1e9).toFixed(2)}`
              : '$0.00',
        },
      }
    }

    // Record verification in Convex
    if (userId) {
      // @ts-expect-error - subscriptions not in generated types, run `bunx convex dev` to regenerate
      const subscription = await convex.query(api.subscriptions.getUserSubscription, {
        userId,
      })
      const subscriptionTier =
        subscription && subscription.status === 'active' ? subscription.tier : 'free'

      // @ts-expect-error - recordVerification not in generated types, run `bunx convex dev` to regenerate
      await convex.mutation(api.verifications.recordVerification, {
        userId,
        agentAddress,
        ghostScore,
        tier,
        subscriptionTier,
      })
    }

    // Return verification response
    return NextResponse.json({
      verified: true,
      ghostScore,
      tier,
      metrics,
      payaiData,
      agentName: agentData.name ?? 'Unknown Agent',
      agentAddress,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Failed to verify agent' }, { status: 500 })
  }
}
