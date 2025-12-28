/**
 * CSRF Protection for API Routes
 * 
 * Prevents Cross-Site Request Forgery attacks by validating tokens
 */

import { cookies } from 'next/headers'

const CSRF_TOKEN_NAME = 'ghostspeak_csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a random CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get or create CSRF token for the current session
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies()
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value
  
  if (!token) {
    token = generateCsrfToken()
    cookieStore.set(CSRF_TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    })
  }
  
  return token
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(req: Request): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(CSRF_TOKEN_NAME)?.value
  const requestToken = req.headers.get(CSRF_HEADER_NAME)
  
  if (!sessionToken || !requestToken) {
    return false
  }
  
  return sessionToken === requestToken
}

/**
 * Middleware to require CSRF token
 */
export async function requireCsrfToken(req: Request): Promise<Response | null> {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return null
  }
  
  const isValid = await validateCsrfToken(req)
  
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  return null
}

/**
 * Hook to get CSRF token for client-side use
 */
export async function getClientCsrfToken(): Promise<{token: string}> {
  const token = await getCsrfToken()
  return { token }
}
