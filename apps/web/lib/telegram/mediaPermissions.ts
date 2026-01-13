/**
 * Telegram Media Generation Permissions
 *
 * Controls who can use /media command to generate images
 *
 * MODES:
 * - allowlist: Only users in TELEGRAM_MEDIA_ALLOWLIST can generate
 * - blocklist: Everyone except TELEGRAM_MEDIA_BLOCKLIST can generate
 * - group-admins: Only group admins can generate in groups, DMs are open
 * - open: Everyone can generate (subject to rate limits)
 *
 * RATE LIMITS:
 * - Free: 5 images/day
 * - Holder ($10 GHOST): 25 images/day
 * - Whale ($100 GHOST): 100 images/day
 * - Allowlist users: Unlimited
 */

import { getConvexClient } from '@/lib/convex-client'
import { api } from '@/convex/_generated/api'

export type MediaPermissionMode = 'allowlist' | 'blocklist' | 'group-admins' | 'open'

export interface MediaPermissionCheck {
  allowed: boolean
  reason?: string
  rateLimitInfo?: {
    used: number
    limit: number
    remaining: number
  }
}

/**
 * In-memory rate limit tracking (resets on server restart)
 * For production, consider using Convex or Redis
 */
const mediaRateLimits = new Map<
  string,
  {
    count: number
    resetAt: number
  }
>()

/**
 * Get media permission mode from environment
 */
function getMediaMode(): MediaPermissionMode {
  const mode = process.env.TELEGRAM_MEDIA_MODE?.toLowerCase()
  if (mode === 'allowlist' || mode === 'blocklist' || mode === 'group-admins' || mode === 'open') {
    return mode
  }
  return 'open' // Default: everyone can use (subject to rate limits)
}

/**
 * Get allowlist from environment
 * Supports both usernames (@user) and Telegram IDs
 */
function getAllowlist(): Set<string> {
  const allowlist = process.env.TELEGRAM_MEDIA_ALLOWLIST || ''
  return new Set(
    allowlist
      .split(',')
      .map((item: any) => item.trim().toLowerCase())
      .filter(Boolean)
  )
}

/**
 * Get blocklist from environment
 */
function getBlocklist(): Set<string> {
  const blocklist = process.env.TELEGRAM_MEDIA_BLOCKLIST || ''
  return new Set(
    blocklist
      .split(',')
      .map((item: any) => item.trim().toLowerCase())
      .filter(Boolean)
  )
}

/**
 * Get rate limit from environment (images per day)
 */
function getDefaultRateLimit(): number {
  const limit = process.env.TELEGRAM_MEDIA_RATE_LIMIT
  return limit ? parseInt(limit, 10) : 10 // Default: 10 images/day
}

/**
 * Check if user is in allowlist
 */
function isInAllowlist(username?: string, userId?: number): boolean {
  const allowlist = getAllowlist()
  if (allowlist.size === 0) return false

  // Check username (with or without @)
  if (username) {
    const normalizedUsername = username.toLowerCase().replace(/^@/, '')
    if (allowlist.has(normalizedUsername) || allowlist.has(`@${normalizedUsername}`)) {
      return true
    }
  }

  // Check user ID
  if (userId && allowlist.has(userId.toString())) {
    return true
  }

  return false
}

/**
 * Check if user is in blocklist
 */
function isInBlocklist(username?: string, userId?: number): boolean {
  const blocklist = getBlocklist()
  if (blocklist.size === 0) return false

  // Check username
  if (username) {
    const normalizedUsername = username.toLowerCase().replace(/^@/, '')
    if (blocklist.has(normalizedUsername) || blocklist.has(`@${normalizedUsername}`)) {
      return true
    }
  }

  // Check user ID
  if (userId && blocklist.has(userId.toString())) {
    return true
  }

  return false
}

/**
 * Get rate limit for user based on $GHOST holdings
 */
async function getUserRateLimit(walletAddress: string, username?: string, userId?: number): Promise<number> {
  // Allowlist users get unlimited
  if (isInAllowlist(username, userId)) {
    return Infinity
  }

  try {
    // Check user's $GHOST holdings tier
    const tierResult = await getConvexClient().action(api.checkGhostBalance.checkAndUpdateTier, {
      walletAddress,
    })

    switch (tierResult.tier) {
      case 'whale': // $100+ in $GHOST
        return 100
      case 'holder': // $10+ in $GHOST
        return 25
      case 'free':
      default:
        return 5 // Free tier: 5 images/day
    }
  } catch (error) {
    console.warn('Error checking user tier for rate limit:', error)
    return getDefaultRateLimit()
  }
}

/**
 * Check and update rate limit for user
 */
async function checkRateLimit(
  walletAddress: string,
  username?: string,
  userId?: number
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  // Get user's rate limit based on tier
  const limit = await getUserRateLimit(walletAddress, username, userId)

  // Unlimited for allowlist users
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity, remaining: Infinity }
  }

  const now = Date.now()
  const resetTime = 24 * 60 * 60 * 1000 // 24 hours
  const key = `media_${walletAddress}`

  let rateLimitData = mediaRateLimits.get(key)

  // Reset if expired
  if (!rateLimitData || now > rateLimitData.resetAt) {
    rateLimitData = {
      count: 0,
      resetAt: now + resetTime,
    }
    mediaRateLimits.set(key, rateLimitData)
  }

  const used = rateLimitData.count
  const remaining = Math.max(0, limit - used)

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  }
}

/**
 * Increment rate limit counter for user
 */
export function incrementMediaCount(walletAddress: string): void {
  const key = `media_${walletAddress}`
  const rateLimitData = mediaRateLimits.get(key)

  if (rateLimitData) {
    rateLimitData.count++
  }
}

/**
 * Main permission check for media generation
 */
export async function checkMediaPermission(params: {
  username?: string
  userId?: number
  walletAddress: string
  isGroupAdmin?: boolean
  isGroup?: boolean
}): Promise<MediaPermissionCheck> {
  const { username, userId, walletAddress, isGroupAdmin, isGroup } = params
  const mode = getMediaMode()

  // 1. BLOCKLIST CHECK (always deny if blocked)
  if (isInBlocklist(username, userId)) {
    return {
      allowed: false,
      reason: '🚫 You are not authorized to generate images.',
    }
  }

  // 2. MODE-SPECIFIC CHECKS
  switch (mode) {
    case 'allowlist':
      if (!isInAllowlist(username, userId)) {
        return {
          allowed: false,
          reason:
            '🔒 Image generation is restricted to authorized users.\n\n' +
            'Contact @the_dexploarer to request access.',
        }
      }
      break

    case 'group-admins':
      if (isGroup && !isGroupAdmin) {
        return {
          allowed: false,
          reason:
            '👮 Only group admins can generate images in this chat.\n\n' +
            'Use `/media` in a DM with me for unrestricted access!',
        }
      }
      break

    case 'blocklist':
    case 'open':
      // No additional restrictions beyond blocklist
      break
  }

  // 3. RATE LIMIT CHECK (unless in allowlist)
  if (!isInAllowlist(username, userId)) {
    const rateLimit = await checkRateLimit(walletAddress, username, userId)

    if (!rateLimit.allowed) {
      const tier = rateLimit.limit === 5 ? 'Free' : rateLimit.limit === 25 ? 'Holder' : 'Whale'

      return {
        allowed: false,
        reason:
          `⏱️ Daily image limit reached (${rateLimit.used}/${rateLimit.limit})!\n\n` +
          `**Current Tier:** ${tier}\n\n` +
          `**Upgrade with $GHOST:**\n` +
          `• Holder ($10): 25 images/day\n` +
          `• Whale ($100): 100 images/day\n\n` +
          `Get $GHOST: https://jup.ag/swap/SOL-DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump\n\n` +
          `Limit resets in ${Math.ceil((rateLimit.used - Date.now()) / (1000 * 60 * 60))} hours.`,
        rateLimitInfo: {
          used: rateLimit.used,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
        },
      }
    }

    return {
      allowed: true,
      rateLimitInfo: {
        used: rateLimit.used,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
      },
    }
  }

  // 4. ALLOWED (all checks passed)
  return { allowed: true }
}

/**
 * Get user-friendly description of current permission mode
 */
export function getPermissionModeDescription(): string {
  const mode = getMediaMode()
  const allowlistSize = getAllowlist().size
  const blocklistSize = getBlocklist().size

  switch (mode) {
    case 'allowlist':
      return `🔒 Allowlist mode (${allowlistSize} authorized users)`
    case 'blocklist':
      return `🚫 Blocklist mode (${blocklistSize} blocked users)`
    case 'group-admins':
      return `👮 Group admins only (DMs open to all)`
    case 'open':
      return `🌐 Open access (rate limits apply)`
    default:
      return `❓ Unknown mode: ${mode}`
  }
}
