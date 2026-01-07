/**
 * API Key Management API
 *
 * GET /api/v1/api-keys - List keys
 * POST /api/v1/api-keys - Create key
 * DELETE /api/v1/api-keys - Revoke key
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress =
            searchParams.get('wallet') || request.headers.get('x-wallet-address')

        if (!walletAddress) {
            return Response.json(
                { error: 'Missing wallet address' },
                { status: 400 }
            )
        }

        const keys = await convex.query(api.lib.api_keys.listApiKeys, {
            walletAddress,
        })

        return Response.json({ keys })
    } catch (error) {
        return Response.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { walletAddress, name } = body

        if (!walletAddress) {
            return Response.json(
                { error: 'Missing wallet address' },
                { status: 400 }
            )
        }

        // TODO: Verify signature to prove ownership of wallet
        // const { signature, message } = body
        // if (!verifySignature(walletAddress, signature, message)) ...

        const result = await convex.mutation(api.lib.api_keys.createApiKey, {
            walletAddress,
            name,
        })

        return Response.json(result, { status: 201 })
    } catch (error) {
        return Response.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress =
            searchParams.get('wallet') || request.headers.get('x-wallet-address')
        const keyId = searchParams.get('id')

        if (!walletAddress || !keyId) {
            return Response.json(
                { error: 'Missing wallet address or key ID' },
                { status: 400 }
            )
        }

        // TODO: Verify signature

        await convex.mutation(api.lib.api_keys.revokeApiKey, {
            walletAddress,
            keyId: keyId as Id<'apiKeys'>,
        })

        return Response.json({ success: true })
    } catch (error) {
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
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-wallet-address',
        },
    })
}
