/**
 * API Rate Limiting Middleware
 *
 * Prevents abuse by limiting requests per IP address
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const rateLimitStore: RateLimitStore = {}

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now()
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}, 60000)

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Optional custom message */
  message?: string
}

/**
 * Rate limit checker for API routes
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = identifier

  // Get or create rate limit entry
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  const entry = rateLimitStore[key]

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment counter
  entry.count++
  return { allowed: true }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback to a generic identifier
  return 'unknown'
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  // Strict limit for authentication endpoints
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },

  // Moderate limit for payment endpoints
  PAYMENT: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many payment requests. Please wait a moment.',
  },

  // Generous limit for general API calls
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
  },

  // Very generous for read-only endpoints
  READ_ONLY: {
    maxRequests: 300,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests.',
  },
} as const

/**
 * Helper to apply rate limiting in API routes
 */
export function withRateLimit(req: Request, config: RateLimitConfig): Response | null {
  const identifier = getClientIdentifier(req)
  const result = checkRateLimit(identifier, config)

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: config.message || 'Too many requests',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
        },
      }
    )
  }

  return null
}
