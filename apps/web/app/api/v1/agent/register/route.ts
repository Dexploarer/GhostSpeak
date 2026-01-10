/**
 * Agent Registration API - x402 Protected + Rate Limited
 *
 * POST /api/v1/agent/register - Register a new agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { requireX402Payment } from '@/lib/x402-middleware'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
    // Rate limit check
    const rateLimited = checkRateLimit(req)
    if (rateLimited) return rateLimited

    // Require x402 payment - $0.01 to register (now async with on-chain verification)
    const paymentRequired = await requireX402Payment(req, { priceUsdc: 0.01 }, convex)
    if (paymentRequired) return paymentRequired

    try {
        const body = await req.json()
        const { agentAddress, name, description, x402Enabled, x402Endpoints } = body

        if (!agentAddress) {
            return NextResponse.json(
                { error: 'Missing required field: agentAddress' },
                { status: 400 }
            )
        }

        // Validate Solana address format (base58 without 0, I, O, l)
        const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
        if (!solanaAddressRegex.test(agentAddress)) {
            return NextResponse.json(
                { error: 'Invalid Solana address format' },
                { status: 400 }
            )
        }

        // Check if agent already exists
        const existingAgent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: agentAddress,
        })

        if (existingAgent) {
            return NextResponse.json(
                { error: 'Agent already registered', existingStatus: existingAgent.status },
                { status: 409 }
            )
        }

        // Register agent
        const result = await convex.mutation(api.ghostDiscovery.bulkImportDiscoveredAgents, {
            agents: [{
                ghostAddress: agentAddress,
                firstTxSignature: `api_registration_${Date.now()}`,
                firstSeenTimestamp: Date.now(),
                discoverySource: 'api_registration',
                slot: 0,
            }]
        })

        // Update metadata if provided
        if (name || description || x402Enabled !== undefined) {
            try {
                // TODO: Require signed message proving ownership of agentAddress
                // For now, mark as self-update but log warning
                console.warn(`[Agent Register] Metadata update without signature verification for ${agentAddress}`)
                await convex.mutation(api.ghostDiscovery.updateAgentMetadata, {
                    ghostAddress: agentAddress,
                    callerWallet: agentAddress, // NOTE: This allows self-registration
                    name,
                    description,
                    x402Enabled,
                })
            } catch (metadataError) {
                console.warn('Could not update metadata:', metadataError)
            }
        }

        // Register x402 endpoints if provided
        if (x402Endpoints && Array.isArray(x402Endpoints)) {
            for (const ep of x402Endpoints) {
                try {
                    // Safely parse URL
                    let baseUrl: string
                    try {
                        baseUrl = new URL(ep.endpoint).origin
                    } catch (urlError) {
                        console.warn('Invalid endpoint URL:', ep.endpoint)
                        continue // Skip invalid URLs instead of crashing
                    }

                    await convex.mutation(api.observation.addEndpoint, {
                        agentAddress,
                        baseUrl,
                        endpoint: ep.endpoint,
                        method: ep.method || 'POST',
                        priceUsdc: ep.priceUsdc || 0.001,
                        description: ep.description || 'x402 endpoint',
                        category: ep.category || 'utility',
                    })
                } catch (epError) {
                    console.warn('Could not register endpoint:', ep.endpoint, epError)
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Agent registered successfully',
            agent: {
                address: agentAddress,
                status: 'discovered',
                registeredAt: Date.now(),
            },
            imported: result.imported,
        })
    } catch (error) {
        console.error('Agent registration error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Registration failed' },
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
