/**
 * Billing Usage API
 *
 * GET /api/v1/billing/usage - Get user's API usage history and credit consumption
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
    try {
        // Get wallet address from query param or header
        const { searchParams } = new URL(request.url)
        const walletAddress =
            searchParams.get('wallet') || request.headers.get('x-wallet-address')
        const days = parseInt(searchParams.get('days') || '30', 10)

        if (!walletAddress) {
            return Response.json(
                { error: 'Missing wallet address. Provide ?wallet= query param or x-wallet-address header' },
                { status: 400 }
            )
        }

        // Validate Solana address format
        const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
        if (!solanaAddressRegex.test(walletAddress)) {
            return Response.json({ error: 'Invalid Solana address format' }, { status: 400 })
        }

        // Get usage data from Convex
        const usage = await convex.query(api.lib.credits.getUsageHistory, {
            walletAddress,
            days,
        })

        if (!usage) {
            return Response.json(
                {
                    error: 'User not found',
                    note: 'User must sign up first',
                },
                { status: 404 }
            )
        }

        return Response.json(
            {
                usage,
                timestamp: Date.now(),
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'private, max-age=60',
                },
            }
        )
    } catch (error) {
        console.error('Billing usage API error:', error)
        return Response.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-wallet-address',
        },
    })
}
