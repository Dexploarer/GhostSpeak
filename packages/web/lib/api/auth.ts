/**
 * B2B API Authentication Middleware
 * API key validation and user resolution
 */

import { NextRequest } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { createHash } from 'crypto'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface AuthenticatedUser {
  userId: string
  apiKeyId: string
  tier: 'startup' | 'growth' | 'enterprise'
  rateLimit: number
}

/**
 * Hash API key using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Generate a secure API key
 * Format: gs_live_<32_random_chars>
 */
export function generateApiKey(): { apiKey: string; hashedKey: string; keyPrefix: string } {
  // Generate 32 random bytes (256 bits)
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  const randomString = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const apiKey = `gs_live_${randomString}`
  const hashedKey = hashApiKey(apiKey)
  const keyPrefix = `${apiKey.slice(0, 15)}...${apiKey.slice(-4)}`

  return { apiKey, hashedKey, keyPrefix }
}

/**
 * Authenticate API request using X-API-Key header
 * Returns authenticated user or null if invalid
 */
export async function authenticateApiKey(request: NextRequest): Promise<AuthenticatedUser | null> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return null
  }

  // Validate API key format
  if (!apiKey.startsWith('gs_live_') || apiKey.length !== 72) {
    return null
  }

  // Hash and lookup in database
  const hashedKey = hashApiKey(apiKey)
  const keyRecord = await convexClient.query(api.apiKeys.getByHashedKey, { hashedKey })

  if (!keyRecord || !keyRecord.isActive) {
    return null
  }

  // Update last used timestamp (fire and forget)
  convexClient.mutation(api.apiKeys.updateLastUsed, { apiKeyId: keyRecord._id }).catch(() => {
    // Ignore errors
  })

  return {
    userId: keyRecord.userId,
    apiKeyId: keyRecord._id,
    tier: keyRecord.tier as 'startup' | 'growth' | 'enterprise',
    rateLimit: keyRecord.rateLimit,
  }
}

/**
 * Get rate limit for a subscription tier
 */
export function getRateLimitForTier(tier: string): number {
  const limits = {
    startup: 10, // 10 req/min
    growth: 60, // 60 req/min
    enterprise: 300, // 300 req/min
  }

  return limits[tier as keyof typeof limits] || 10
}

/**
 * Get daily quota for a subscription tier
 */
export function getDailyQuotaForTier(tier: string): number {
  const quotas = {
    startup: 1000,
    growth: 20000,
    enterprise: -1, // unlimited
  }

  return quotas[tier as keyof typeof quotas] || 1000
}

/**
 * Middleware to check USDC balance before processing API request
 * Deducts cost after successful request
 * Returns 402 Payment Required if balance too low
 */
export async function withBalanceCheck<T>(
  authUser: AuthenticatedUser,
  handler: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string; status: number }> {
  const { getTeamBalance, checkSufficientBalance, calculateRequestCost, deductUsage } = await import('@/lib/b2b-token-accounts')
  const { api } = await import('@/convex/_generated/api')
  const { ConvexHttpClient } = await import('convex/browser')

  const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

  try {
    // Get team's token account
    const teamMembers = await convexClient.query(api.teamMembers.getByUser, {
      userId: authUser.userId as any,
    })

    if (!teamMembers || teamMembers.length === 0) {
      return {
        success: false,
        error: 'No team found for this API key',
        status: 404,
      }
    }

    const teamId = teamMembers[0].teamId
    const team = await convexClient.query(api.teams.getById, { teamId })

    if (!team || !team.usdcTokenAccount) {
      return {
        success: false,
        error: 'Team does not have a USDC token account. Please deposit funds first.',
        status: 402, // Payment Required
      }
    }

    // Get current month's usage
    const now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const usageSummary = await convexClient.query(api.apiUsage.getSummaryByUser, {
      userId: authUser.userId as any,
      startDate: startOfMonth.getTime(),
      endDate: now,
    })

    // Calculate cost for this request
    const requestCost = calculateRequestCost(authUser.tier as any, usageSummary.totalRequests + 1)

    // Check balance (if cost > 0)
    if (requestCost > 0n) {
      const { address } = await import('@solana/addresses')
      const tokenAccount = address(team.usdcTokenAccount)
      const { sufficient, currentBalance, required } = await checkSufficientBalance(
        tokenAccount,
        requestCost
      )

      if (!sufficient) {
        return {
          success: false,
          error: `Insufficient balance: have ${Number(currentBalance) / 1_000_000} USDC, need ${Number(required) / 1_000_000} USDC. Please add funds.`,
          status: 402, // Payment Required
        }
      }
    }

    // Process the request
    const result = await handler()

    // Deduct cost after successful request (fire-and-forget)
    if (requestCost > 0n) {
      const { address } = await import('@solana/addresses')
      const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' ? 'mainnet' : 'devnet'
      deductUsage(address(team.usdcTokenAccount), requestCost, network as any).catch((error) => {
        console.error('[API] Failed to deduct usage cost:', error)
        // Log to monitoring/alerting system
      })
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('[API] Balance check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during balance check',
      status: 500,
    }
  }
}
