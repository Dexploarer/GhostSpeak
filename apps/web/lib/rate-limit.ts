/**
 * API Rate Limiting
 *
 * Light rate limiting for developer API endpoints based on $GHOST holdings:
 * - Free: 10 requests/minute
 * - Holder ($10+ GHOST): 60 requests/minute
 * - Whale ($100+ GHOST): 300 requests/minute
 * - Admin: Unlimited
 */

import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store (per-process, resets on restart)
// For production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Rate limits per minute by tier
const RATE_LIMITS = {
    free: parseInt(process.env.API_RATE_LIMIT_FREE || '10'),
    holder: parseInt(process.env.API_RATE_LIMIT_HOLDER || '60'),
    whale: parseInt(process.env.API_RATE_LIMIT_WHALE || '300'),
    admin: parseInt(process.env.API_RATE_LIMIT_ADMIN || '999999'),
}

// Window duration (1 minute)
const WINDOW_MS = 60 * 1000

/**
 * Get the rate limit tier for a wallet address
 */
function getTier(walletAddress: string): keyof typeof RATE_LIMITS {
    const adminWhitelist = (process.env.ADMIN_WHITELIST || '').split(',').map(w => w.trim())

    if (adminWhitelist.includes(walletAddress)) {
        return 'admin'
    }

    // TODO: Implement actual $GHOST balance lookup from Convex cache
    // For now, check if wallet is in whale/holder env vars (temporary workaround)
    const whaleList = (process.env.WHALE_WHITELIST || '').split(',').map(w => w.trim())
    const holderList = (process.env.HOLDER_WHITELIST || '').split(',').map(w => w.trim())

    if (whaleList.includes(walletAddress)) return 'whale'
    if (holderList.includes(walletAddress)) return 'holder'

    return 'free'
}

/**
 * Check and update rate limit for a request
 * Returns null if allowed, or an error response if rate limited
 */
export function checkRateLimit(
    req: NextRequest,
    identifier?: string
): NextResponse | null {
    try {
        // Get identifier (wallet address, IP, or API key)
        const walletAddress = identifier ||
            req.headers.get('x-wallet-address') ||
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            'anonymous'

        const tier = getTier(walletAddress)
        const limit = RATE_LIMITS[tier]
        const key = `rate:${walletAddress}`
        const now = Date.now()

        // Get or create rate limit entry
        let entry = rateLimitStore.get(key)

        // Reset if window expired
        if (!entry || now >= entry.resetAt) {
            entry = { count: 0, resetAt: now + WINDOW_MS }
            rateLimitStore.set(key, entry)
        }

        // Check if over limit
        if (entry.count >= limit) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000)

            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    message: `Too many requests. You're on the ${tier} tier (${limit} requests/min). Hold more $GHOST for higher limits.`,
                    tier,
                    limit,
                    retryAfter,
                    upgrade: {
                        holder: { threshold: '$10 in $GHOST', limit: RATE_LIMITS.holder },
                        whale: { threshold: '$100 in $GHOST', limit: RATE_LIMITS.whale },
                        tokenMint: 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump',
                    },
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': entry.resetAt.toString(),
                    },
                }
            )
        }

        // Increment count
        entry.count++

        return null // Allowed
    } catch (error) {
        console.error('Rate limit error:', error)
        // SECURITY: Fail CLOSED - block request if rate limit check fails
        return NextResponse.json(
            { error: 'Rate limit check failed', message: 'Please try again later.' },
            { status: 503 }
        )
    }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(walletAddress: string): Record<string, string> {
    const tier = getTier(walletAddress)
    const limit = RATE_LIMITS[tier]
    const key = `rate:${walletAddress}`
    const entry = rateLimitStore.get(key)

    return {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': entry ? Math.max(0, limit - entry.count).toString() : limit.toString(),
        'X-RateLimit-Reset': entry ? entry.resetAt.toString() : (Date.now() + WINDOW_MS).toString(),
        'X-RateLimit-Tier': tier,
    }
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimitStore() {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now >= entry.resetAt + WINDOW_MS) {
            rateLimitStore.delete(key)
        }
    }
}

// NOTE: Cleanup is now handled per-request or via external scheduler
// to avoid memory leaks in serverless environments.
// Call cleanupRateLimitStore() explicitly from a cron job if needed.
