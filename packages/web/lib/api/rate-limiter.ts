/**
 * B2B API Rate Limiting
 * Convex-based sliding window rate limiter
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for an API key
 * Uses sliding window algorithm with Convex queries
 */
export async function checkRateLimit(apiKeyId: string, tier: string): Promise<RateLimitResult> {
  const limits = {
    startup: { requests: 10, window: 60 }, // 10 req/min
    growth: { requests: 60, window: 60 }, // 60 req/min
    enterprise: { requests: 300, window: 60 }, // 300 req/min
  }

  const limit = limits[tier as keyof typeof limits] || limits.startup
  const now = Date.now()
  const windowStart = now - limit.window * 1000

  // Get usage in the current window
  const usage = await convexClient.query(api.apiUsage.getSummaryByKey, {
    apiKeyId: apiKeyId as any,
    startDate: windowStart,
    endDate: now,
  })

  const currentCount = usage.totalRequests
  const remaining = Math.max(0, limit.requests - currentCount)
  const success = currentCount < limit.requests

  // Calculate reset time (start of next window)
  const reset = Math.ceil((now + limit.window * 1000) / 1000)

  return {
    success,
    limit: limit.requests,
    remaining,
    reset,
  }
}

/**
 * Check daily quota for an API key
 */
export async function checkDailyQuota(
  apiKeyId: string,
  tier: string
): Promise<{ success: boolean; used: number; limit: number }> {
  const quotas = {
    startup: 1000,
    growth: 20000,
    enterprise: -1, // unlimited
  }

  const quota = quotas[tier as keyof typeof quotas] || 1000

  // Enterprise has unlimited quota
  if (quota === -1) {
    return { success: true, used: 0, limit: -1 }
  }

  // Get today's usage
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const usage = await convexClient.query(api.apiUsage.getSummaryByKey, {
    apiKeyId: apiKeyId as any,
    startDate: todayStart.getTime(),
    endDate: Date.now(),
  })

  const used = usage.totalRequests
  const success = used < quota

  return { success, used, limit: quota }
}
