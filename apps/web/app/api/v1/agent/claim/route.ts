/**
 * Agent Claim API - x402 Protected + Rate Limited
 *
 * POST /api/v1/agent/claim - Claim ownership of an agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { requireX402Payment } from '@/lib/x402-middleware'
import { checkRateLimit } from '@/lib/rate-limit'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
    // Rate limit check
    const rateLimited = checkRateLimit(req)
    if (rateLimited) return rateLimited

    // Require x402 payment - $0.05 to claim
    const paymentRequired = requireX402Payment(req, { priceUsdc: 0.05 })
    if (paymentRequired) return paymentRequired

    try {
        const body = await req.json()
        const { agentAddress, claimedBy, claimTxSignature } = body

        if (!agentAddress || !claimedBy) {
            return NextResponse.json(
                { error: 'Missing required fields: agentAddress, claimedBy' },
                { status: 400 }
            )
        }

        // Validate Solana addresses
        const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
        if (!solanaAddressRegex.test(agentAddress) || !solanaAddressRegex.test(claimedBy)) {
            return NextResponse.json(
                { error: 'Invalid Solana address format' },
                { status: 400 }
            )
        }

        // Check if agent exists
        const agent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: agentAddress,
        })

        if (!agent) {
            return NextResponse.json(
                { error: 'Agent not found. Register the agent first.' },
                { status: 404 }
            )
        }

        if (agent.status === 'claimed' || agent.status === 'verified') {
            return NextResponse.json(
                {
                    error: 'Agent already claimed',
                    currentOwner: agent.claimedBy,
                    status: agent.status,
                },
                { status: 409 }
            )
        }

        // Claim agent
        const result = await convex.mutation(api.ghostDiscovery.claimAgent, {
            ghostAddress: agentAddress,
            claimedBy,
            claimTxSignature: claimTxSignature || `api_claim_${Date.now()}`,
        })

        return NextResponse.json({
            success: true,
            message: 'Agent claimed successfully',
            agent: {
                address: agentAddress,
                status: 'claimed',
                claimedBy,
                claimedAt: Date.now(),
            },
            credentialIssued: result.credentialIssued,
            credentialId: result.credentialId,
        })
    } catch (error) {
        console.error('Agent claim error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Claim failed' },
            { status: 500 }
        )
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Payment-Signature',
        },
    })
}
