/**
 * API Route Middleware Utilities
 *
 * Reusable middleware for common API route patterns:
 * - Rate limiting
 * - CORS headers
 * - Error handling
 * - Response formatting
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * CORS headers for public API endpoints
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Cache headers for public data
 */
export const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

/**
 * Standard OPTIONS handler for CORS preflight
 */
export function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

/**
 * Middleware wrapper that applies rate limiting and error handling
 *
 * Usage:
 * ```ts
 * export const GET = withMiddleware(async (request) => {
 *   const data = await fetchData()
 *   return jsonResponse({ data })
 * })
 * ```
 */
export function withMiddleware(
  handler: (request: NextRequest) => Promise<Response>,
  options: {
    rateLimit?: boolean
    cors?: boolean
  } = { rateLimit: true, cors: true }
) {
  return async (request: NextRequest) => {
    try {
      // Apply rate limiting
      if (options.rateLimit) {
        const rateLimited = checkRateLimit(request)
        if (rateLimited) return rateLimited
      }

      // Execute handler
      const response = await handler(request)

      // Apply CORS headers if enabled
      if (options.cors) {
        const headers = new Headers(response.headers)
        Object.entries(CORS_HEADERS).forEach(([key, value]) => {
          headers.set(key, value)
        })
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      }

      return response
    } catch (error) {
      console.error('API Route Error:', error)
      return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
    }
  }
}

/**
 * Create a standardized JSON success response
 */
export function jsonResponse<T>(
  data: T,
  options?: {
    status?: number
    headers?: HeadersInit
    cache?: boolean
  }
): Response {
  const headers = new Headers(options?.headers)
  headers.set('Content-Type', 'application/json')

  if (options?.cache) {
    Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
      headers.set(key, value)
    })
  }

  return Response.json(
    {
      ...data,
      timestamp: Date.now(),
    },
    {
      status: options?.status || 200,
      headers,
    }
  )
}

/**
 * Create a standardized JSON error response
 */
export function errorResponse(message: string, status = 400): Response {
  return Response.json(
    {
      error: message,
      timestamp: Date.now(),
    },
    { status }
  )
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: Record<
    string,
    { required?: boolean; type?: 'string' | 'number'; min?: number; max?: number }
  >
): { valid: boolean; error?: string; values: Record<string, any> } {
  const values: Record<string, any> = {}

  for (const [key, rules] of Object.entries(schema)) {
    const value = searchParams.get(key)

    // Check required
    if (rules.required && !value) {
      return { valid: false, error: `Missing required parameter: ${key}`, values: {} }
    }

    if (!value) continue

    // Type validation and conversion
    if (rules.type === 'number') {
      const num = parseInt(value)
      if (isNaN(num)) {
        return { valid: false, error: `Parameter ${key} must be a number`, values: {} }
      }
      if (rules.min !== undefined && num < rules.min) {
        return { valid: false, error: `Parameter ${key} must be >= ${rules.min}`, values: {} }
      }
      if (rules.max !== undefined && num > rules.max) {
        return { valid: false, error: `Parameter ${key} must be <= ${rules.max}`, values: {} }
      }
      values[key] = num
    } else {
      values[key] = value
    }
  }

  return { valid: true, values }
}
