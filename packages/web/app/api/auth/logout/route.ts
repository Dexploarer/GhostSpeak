/**
 * Logout API Route
 *
 * This route handles secure logout by clearing authentication cookies.
 * It's called when the user clicks "Disconnect" in the wallet dropdown.
 *
 * Flow:
 * 1. Client calls POST /api/auth/logout
 * 2. Server clears all auth cookies (JWT + refresh token)
 * 3. Client-side auth state is updated
 * 4. User is logged out
 */

import { createCrossmint, CrossmintAuth } from '@crossmint/server-sdk'
import { NextRequest } from 'next/server'

// Initialize Crossmint server SDK
const crossmint = createCrossmint({
  apiKey: process.env.CROSSMINT_SECRET_KEY!,
})

const crossmintAuth = CrossmintAuth.from(crossmint, {
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
})

/**
 * POST /api/auth/logout
 *
 * Clear authentication cookies and log out user
 */
export async function POST(request: NextRequest) {
  try {
    // Crossmint SDK handles clearing all auth cookies
    return await crossmintAuth.logout(request)
  } catch (error) {
    console.error('[Auth Logout] Failed to logout:', error)
    return new Response(JSON.stringify({ error: 'Failed to logout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
