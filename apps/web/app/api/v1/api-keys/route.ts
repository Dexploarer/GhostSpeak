/**
 * API Key Management API
 *
 * Secure endpoints for managing API keys.
 * Requires SIWS (Sign In With Solana) signatures for all operations.
 *
 * GET /api/v1/api-keys 
 *  - Headers: x-wallet-address, x-signature, x-timestamp
 *  - Message: "view-keys-{timestamp}"
 *
 * POST /api/v1/api-keys
 *  - Body: { walletAddress, name, signature, timestamp }
 *  - Message: "create-key-{timestamp}-{name}"
 *
 * DELETE /api/v1/api-keys
 *  - URL Params: ?wallet=...&id=...
 *  - Headers: x-signature, x-timestamp
 *  - Message: "revoke-key-{keyId}-{timestamp}"
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { NextRequest } from 'next/server'
import { Id } from '@/convex/_generated/dataModel'
import { verifyWalletSignature } from '@/lib/auth/solana'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000 // 5 minutes

function validateTimestamp(timestamp: string | number): boolean {
    const now = Date.now()
    const reqTime = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
    if (isNaN(reqTime) || Math.abs(now - reqTime) > TIMESTAMP_TOLERANCE_MS) {
        return false
    }
    return true
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const walletAddress =
            searchParams.get('wallet') || request.headers.get('x-wallet-address')
        const signature = request.headers.get('x-signature')
        const timestamp = request.headers.get('x-timestamp')

        if (!walletAddress || !signature || !timestamp) {
            return Response.json(
                { error: 'Missing security headers: x-wallet-address, x-signature, x-timestamp' },
                { status: 401 }
            )
        }

        if (!validateTimestamp(timestamp)) {
            return Response.json({ error: 'Request expired (check device time)' }, { status: 401 })
        }

        const message = `view-keys-${timestamp}`
        if (!verifyWalletSignature(message, signature, walletAddress)) {
            return Response.json({ error: 'Invalid signature' }, { status: 401 })
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
        const { walletAddress, name, signature, timestamp } = body

        if (!walletAddress || !name || !signature || !timestamp) {
            return Response.json(
                { error: 'Missing field: walletAddress, name, signature, timestamp' },
                { status: 400 }
            )
        }

        if (!validateTimestamp(timestamp)) {
            return Response.json({ error: 'Request expired' }, { status: 401 })
        }

        // Message format: create-key-{timestamp}-{name}
        const message = `create-key-${timestamp}-${name}`

        if (!verifyWalletSignature(message, signature, walletAddress)) {
            return Response.json({ error: 'Invalid signature' }, { status: 401 })
        }

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
        const signature = request.headers.get('x-signature')
        const timestamp = request.headers.get('x-timestamp')

        if (!walletAddress || !keyId || !signature || !timestamp) {
            return Response.json(
                { error: 'Missing parameters/headers: wallet, id, signature, timestamp' },
                { status: 400 }
            )
        }

        if (!validateTimestamp(timestamp)) {
            return Response.json({ error: 'Request expired' }, { status: 401 })
        }

        // Message format: revoke-key-{keyId}-{timestamp}
        const message = `revoke-key-${keyId}-${timestamp}`

        if (!verifyWalletSignature(message, signature, walletAddress)) {
            return Response.json({ error: 'Invalid signature' }, { status: 401 })
        }

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
            'Access-Control-Allow-Headers': 'Content-Type, x-wallet-address, x-signature, x-timestamp',
        },
    })
}
