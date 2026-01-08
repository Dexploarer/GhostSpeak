/**
 * Agent Validation API - Public (FREE)
 *
 * POST /api/v1/agent/validate - Validate an agent's credentials and status
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { checkRateLimit } from '@/lib/rate-limit'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
    // Rate limit check
    const rateLimited = checkRateLimit(req)
    if (rateLimited) return rateLimited

    try {
        const body = await req.json()
        const { agentAddress } = body

        if (!agentAddress) {
            return NextResponse.json(
                { error: 'Missing required field: agentAddress' },
                { status: 400 }
            )
        }

        // Validate Solana address format
        const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
        if (!solanaAddressRegex.test(agentAddress)) {
            return NextResponse.json(
                { error: 'Invalid Solana address format' },
                { status: 400 }
            )
        }

        // Fetch comprehensive agent data
        const [agent, credentials, scoreData, endpoints] = await Promise.all([
            convex.query(api.ghostDiscovery.getDiscoveredAgent, { ghostAddress: agentAddress }),
            convex.query(api.credentials.getAgentCredentialsPublic, { agentAddress }),
            convex.query(api.ghostScoreCalculator.calculateAgentScore, { agentAddress }),
            convex.query(api.observation.listEndpoints, { agentAddress }),
        ])

        if (!agent) {
            return NextResponse.json(
                {
                    error: 'Agent not found',
                    valid: false,
                    agentAddress,
                },
                { status: 404 }
            )
        }

        // Calculate validation status
        const validCredentials = credentials?.filter((c: any) => c.isValid) || []
        const hasIdentityCredential = validCredentials.some((c: any) => c.type === 'identity')
        const hasActiveEndpoints = endpoints?.some((ep: any) => ep.isActive) || false

        const validationStatus = {
            isRegistered: true,
            isClaimed: agent.status === 'claimed' || agent.status === 'verified',
            isVerified: agent.status === 'verified',
            hasIdentityCredential,
            hasActiveEndpoints,
            credentialCount: validCredentials.length,
            totalCredentials: credentials?.length || 0,
        }

        // Determine overall validity
        const isValid = validationStatus.isRegistered &&
            validationStatus.isClaimed &&
            validationStatus.hasIdentityCredential

        return NextResponse.json({
            valid: isValid,
            agentAddress,
            status: agent.status,
            validation: validationStatus,
            score: scoreData ? {
                score: scoreData.score,
                tier: scoreData.tier,
            } : null,
            owner: agent.claimedBy,
            registeredAt: agent.firstSeenTimestamp,
            claimedAt: agent.claimedAt,
            credentialSummary: {
                total: credentials?.length || 0,
                valid: validCredentials.length,
                types: [...new Set(validCredentials.map((c: any) => c.type))],
            },
            endpoints: {
                total: endpoints?.length || 0,
                active: endpoints?.filter((ep: any) => ep.isActive).length || 0,
            },
            timestamp: Date.now(),
        })
    } catch (error) {
        console.error('Agent validation error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Validation failed' },
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
