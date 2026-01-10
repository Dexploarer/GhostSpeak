/**
 * Session Management with JWT
 *
 * Implements secure session management with:
 * - JWT tokens with expiration
 * - Server-side session validation
 * - Session revocation
 * - Automatic cleanup of expired sessions
 */

import { SignJWT, jwtVerify } from 'jose'
import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'

// JWT secret from environment (must be at least 32 characters)
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long')
  }
  return new TextEncoder().encode(secret)
}

// Session expiration: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Create a new session for a user (internal mutation for auth flow)
 */
export const createSession = internalMutation({
  args: {
    userId: v.id('users'),
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS

    // Create JWT payload
    const payload = {
      userId: args.userId,
      walletAddress: args.walletAddress,
      expiresAt,
    }

    // Sign JWT with jose
    const secret = getJwtSecret()
    const sessionToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000) // Convert to seconds
      .setExpirationTime(expiresAt / 1000) // Convert to seconds
      .setSubject(args.userId)
      .sign(secret)

    // Store session in database
    const sessionId = await ctx.db.insert('sessions', {
      userId: args.userId,
      walletAddress: args.walletAddress,
      sessionToken,
      expiresAt,
      createdAt: now,
      lastAccessedAt: now,
      isActive: true,
    })

    return {
      sessionId,
      sessionToken,
      expiresAt,
    }
  },
})

/**
 * Validate a session token
 */
export const validateSession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify JWT signature and expiration
      const secret = getJwtSecret()
      const { payload } = await jwtVerify(args.sessionToken, secret)

      // Check if session exists in database
      const session = await ctx.db
        .query('sessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
        .first()

      if (!session) {
        return { valid: false, error: 'Session not found' }
      }

      // Check if session is active
      if (!session.isActive) {
        return { valid: false, error: 'Session is inactive' }
      }

      // Check if session is expired
      const now = Date.now()
      if (session.expiresAt < now) {
        return { valid: false, error: 'Session expired' }
      }

      // Session is valid
      return {
        valid: true,
        userId: session.userId,
        walletAddress: session.walletAddress,
        expiresAt: session.expiresAt,
      }
    } catch (error) {
      // JWT verification failed
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      }
    }
  },
})

/**
 * Update session last accessed time
 */
export const touchSession = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    await ctx.db.patch(session._id, {
      lastAccessedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Revoke a session (logout)
 */
export const revokeSession = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first()

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    await ctx.db.patch(session._id, {
      isActive: false,
    })

    return { success: true }
  },
})

/**
 * Revoke all sessions for a user
 */
export const revokeAllUserSessions = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    for (const session of sessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
      })
    }

    return { success: true, revokedCount: sessions.length }
  },
})

/**
 * Cleanup expired sessions (should be called by a cron job)
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const expiredSessions = await ctx.db
      .query('sessions')
      .withIndex('by_expires', (q) => q.lt('expiresAt', now))
      .collect()

    let deletedCount = 0
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id)
      deletedCount++
    }

    return { success: true, deletedCount }
  },
})

/**
 * Get active sessions for a user
 */
export const getUserSessions = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const now = Date.now()
    return sessions
      .filter((s) => s.expiresAt > now)
      .map((s) => ({
        sessionId: s._id,
        createdAt: s.createdAt,
        lastAccessedAt: s.lastAccessedAt,
        expiresAt: s.expiresAt,
      }))
  },
})
