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

import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { verifyWalletSignature } from '@/lib/auth/solana'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000 // 5 minutes

function validateTimestamp(timestamp: string | number): boolean {
  const now = Date.now()
  const reqTime = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  if (isNaN(reqTime) || Math.abs(now - reqTime) > TIMESTAMP_TOLERANCE_MS) {
    return false
  }
  return true
}

export const GET = withMiddleware(async (request) => {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('wallet') || request.headers.get('x-wallet-address')
  const signature = request.headers.get('x-signature')
  const timestamp = request.headers.get('x-timestamp')

  if (!walletAddress || !signature || !timestamp) {
    return errorResponse(
      'Missing security headers: x-wallet-address, x-signature, x-timestamp',
      401
    )
  }

  if (!validateTimestamp(timestamp)) {
    return errorResponse('Request expired (check device time)', 401)
  }

  const message = `view-keys-${timestamp}`
  if (!verifyWalletSignature(message, signature, walletAddress)) {
    return errorResponse('Invalid signature', 401)
  }

  const keys = await getConvexClient().query(api.lib.api_keys.listApiKeys, {
    walletAddress,
  })

  return jsonResponse({ keys })
})

export const POST = withMiddleware(async (request) => {
  const body = await request.json()
  const { walletAddress, name, signature, timestamp } = body

  if (!walletAddress || !name || !signature || !timestamp) {
    return errorResponse('Missing field: walletAddress, name, signature, timestamp', 400)
  }

  if (!validateTimestamp(timestamp)) {
    return errorResponse('Request expired', 401)
  }

  // Message format: create-key-{timestamp}-{name}
  const message = `create-key-${timestamp}-${name}`

  if (!verifyWalletSignature(message, signature, walletAddress)) {
    return errorResponse('Invalid signature', 401)
  }

  const result = await getConvexClient().mutation(api.lib.api_keys.createApiKey, {
    walletAddress,
    name,
  })

  return jsonResponse(result, { status: 201 })
})

export const DELETE = withMiddleware(async (request) => {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('wallet') || request.headers.get('x-wallet-address')
  const keyId = searchParams.get('id')
  const signature = request.headers.get('x-signature')
  const timestamp = request.headers.get('x-timestamp')

  if (!walletAddress || !keyId || !signature || !timestamp) {
    return errorResponse('Missing parameters/headers: wallet, id, signature, timestamp', 400)
  }

  if (!validateTimestamp(timestamp)) {
    return errorResponse('Request expired', 401)
  }

  // Message format: revoke-key-{keyId}-{timestamp}
  const message = `revoke-key-${keyId}-${timestamp}`

  if (!verifyWalletSignature(message, signature, walletAddress)) {
    return errorResponse('Invalid signature', 401)
  }

  await getConvexClient().mutation(api.lib.api_keys.revokeApiKey, {
    walletAddress,
    keyId: keyId as Id<'apiKeys'>,
  })

  return jsonResponse({ success: true })
})

export const OPTIONS = handleCORS
