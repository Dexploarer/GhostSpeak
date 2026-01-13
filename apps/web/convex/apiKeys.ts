/**
 * B2B API Key management.
 *
 * - Keys are generated server-side.
 * - Only SHA-256 hashes are stored.
 * - Plaintext key is returned only once at creation.
 */

import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { generateApiKeyMaterial, sha256Hex } from './apiKeyHelpers'

const tierValidator = v.union(v.literal('startup'), v.literal('growth'), v.literal('enterprise'))
type ApiKeyTier = 'startup' | 'growth' | 'enterprise'

function rateLimitForTier(tier: ApiKeyTier): number {
  // Dashboard docs: rate limit is requests per minute.
  switch (tier) {
    case 'startup':
      return 10
    case 'growth':
      return 60
    case 'enterprise':
      return 300
  }
}

/**
 * Returns the user's API keys with safe fields (no hashes).
 */
export const listMyApiKeys = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Ensure user exists (defense-in-depth)
    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error('User not found')

    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    // Sort newest first for dashboard display
    keys.sort((a, b) => b.createdAt - a.createdAt)

    return keys.map((k: any) => ({
      id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      tier: k.tier,
      rateLimit: k.rateLimit,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
      revokedAt: k.revokedAt,
    }))
  },
})

/**
 * Generates a new API key. Stores only SHA-256 hash + keyPrefix.
 * Returns the plaintext key ONCE.
 */
export const createApiKey = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    tier: tierValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error('User not found')

    // Enforce a sane limit to reduce abuse (docs: 10 active keys per account)
    const activeKeys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user_active', (q) => q.eq('userId', args.userId).eq('isActive', true))
      .collect()
    if (activeKeys.length >= 10) {
      throw new Error('API key limit reached (max 10 active keys)')
    }

    const now = Date.now()
    const rateLimit = rateLimitForTier(args.tier)

    // Extremely unlikely, but ensure hashedKey uniqueness.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { apiKey, keyPrefix } = generateApiKeyMaterial()
      const hashedKey = await sha256Hex(apiKey)

      const existing = await ctx.db
        .query('apiKeys')
        .withIndex('by_hashed_key', (q) => q.eq('hashedKey', hashedKey))
        .first()
      if (existing) continue

      const apiKeyId = await ctx.db.insert('apiKeys', {
        userId: args.userId,
        hashedKey,
        keyPrefix,
        tier: args.tier,
        rateLimit,
        isActive: true,
        name: args.name,
        createdAt: now,
      })

      return {
        apiKeyId,
        apiKey,
        keyPrefix,
        tier: args.tier,
        rateLimit,
        createdAt: now,
      }
    }

    throw new Error('Failed to generate a unique API key. Please try again.')
  },
})

/**
 * Revoke (disable) an API key.
 */
export const revokeApiKey = mutation({
  args: {
    userId: v.id('users'),
    apiKeyId: v.id('apiKeys'),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.apiKeyId)
    if (!key) throw new Error('API key not found')
    if (key.userId !== args.userId) throw new Error('Not authorized to revoke this API key')

    if (!key.isActive) {
      return { success: true }
    }

    await ctx.db.patch(args.apiKeyId, {
      isActive: false,
      revokedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Internal API key verification helper.
 *
 * Hashes the plaintext key, looks up `apiKeys.by_hashed_key`, enforces `isActive`,
 * updates `lastUsedAt`, and returns minimal identity/tier/rateLimit.
 */
export const verifyApiKey = internalMutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const hashedKey = await sha256Hex(args.apiKey)

    const key = await ctx.db
      .query('apiKeys')
      .withIndex('by_hashed_key', (q) => q.eq('hashedKey', hashedKey))
      .first()

    if (!key || !key.isActive) {
      return null
    }

    const now = Date.now()
    await ctx.db.patch(key._id, { lastUsedAt: now })

    return {
      apiKeyId: key._id,
      userId: key.userId,
      tier: key.tier,
      rateLimit: key.rateLimit,
      lastUsedAt: now,
    }
  },
})
