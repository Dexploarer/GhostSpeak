/**
 * Next.js Middleware - Server-Side Session Validation
 *
 * This middleware validates and refreshes user sessions on every request.
 * It uses Crossmint's server SDK to:
 * 1. Validate the current JWT from cookies
 * 2. Refresh the session if needed
 * 3. Update cookies with new tokens
 * 4. Clear cookies if authentication fails
 *
 * Benefits:
 * - Server-side session validation (more secure)
 * - Automatic token refresh (better UX)
 * - HttpOnly cookies for refresh tokens (prevents XSS)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createCrossmint, CrossmintAuth } from '@crossmint/server-sdk'

export async function middleware(request: NextRequest) {
  // Skip middleware for:
  // - API routes (they handle auth independently)
  // - Static files and Next.js internals
  // - Public assets
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/icon.png')
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Get auth tokens from cookies
  const jwt = request.cookies.get('crossmint-jwt')?.value
  const refreshToken = request.cookies.get('crossmint-refresh-token')?.value

  // If no refresh token, user is not authenticated - allow request to continue
  if (refreshToken == null) {
    return response
  }

  try {
    // Initialize Crossmint server SDK
    const crossmint = createCrossmint({
      apiKey: process.env.CROSSMINT_SECRET_KEY || '',
    })
    const crossmintAuth = CrossmintAuth.from(crossmint, {
      cookieOptions: {
        httpOnly: true, // Refresh token is HttpOnly for security
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
      },
    })

    // Validate session and refresh if needed
    const { jwt: newJwt, refreshToken: newRefreshToken } = await crossmintAuth.getSession({
      jwt,
      refreshToken,
    })

    // Only update cookies if tokens have changed
    if (newJwt !== jwt) {
      response.cookies.set('crossmint-jwt', newJwt, {
        httpOnly: false, // JWT needs to be accessible to client for API calls
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    if (newRefreshToken.secret !== refreshToken) {
      response.cookies.set('crossmint-refresh-token', newRefreshToken.secret, {
        httpOnly: true, // Refresh token is HttpOnly
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }
  } catch (error) {
    // If auth fails, clear cookies
    console.error('[Middleware] Session validation failed:', error)
    response.cookies.delete('crossmint-jwt')
    response.cookies.delete('crossmint-refresh-token')
  }

  return response
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
