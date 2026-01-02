/**
 * Token Refresh API Route
 *
 * This route handles JWT token refresh using Crossmint's server SDK.
 * It's called automatically by the client-side auth provider when tokens expire.
 *
 * Flow:
 * 1. Client sends request with refresh token in HttpOnly cookie
 * 2. Server validates refresh token with Crossmint
 * 3. Server gets new JWT and refresh token
 * 4. Server sets new tokens in cookies
 * 5. Client receives updated tokens automatically
 */

import { createCrossmint, CrossmintAuth } from '@crossmint/server-sdk'
import { NextRequest } from 'next/server'

// Initialize Crossmint server SDK
const crossmint = createCrossmint({
  apiKey: process.env.CROSSMINT_SECRET_KEY!,
})

const crossmintAuth = CrossmintAuth.from(crossmint, {
  cookieOptions: {
    httpOnly: true, // Refresh token is HttpOnly for security
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
})

/**
 * POST /api/auth/refresh
 *
 * Refresh authentication tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Crossmint SDK handles everything:
    // - Reads refresh token from cookies
    // - Validates with Crossmint API
    // - Gets new tokens
    // - Sets cookies in response
    return await crossmintAuth.handleCustomRefresh(request)
  } catch (error) {
    console.error('[Auth Refresh] Failed to refresh tokens:', error)
    return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
