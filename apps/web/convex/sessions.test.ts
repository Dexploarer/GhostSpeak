/**
 * Authentication Session Tests
 *
 * Tests for JWT session management with convex-test
 */

import { convexTest } from 'convex-test'
import { expect, test, describe, beforeEach } from 'vitest'
import { api, internal } from './_generated/api'
import schema from './schema'
import sessions from './sessions'
import solanaAuth from './solanaAuth'
import users from './users'

describe('Session Management', () => {
  let t: ReturnType<typeof convexTest>

  beforeEach(async () => {
    // Create a new test environment for each test
    // Provide the modules explicitly to avoid import.meta.glob issues
    t = convexTest(schema, {
      sessions,
      solanaAuth,
      users,
    })

    // Set up test environment with JWT_SECRET
    process.env.JWT_SECRET = 'test_secret_key_with_at_least_32_characters_for_jwt_signing'
  })

  test('createSession: creates a valid JWT session', async () => {
    // Create a test user first
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        walletAddress: 'test_wallet_123',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
    })

    // Create a session
    const sessionResult = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_123',
    })

    // Verify session was created
    expect(sessionResult).toBeDefined()
    expect(sessionResult.sessionToken).toBeDefined()
    expect(sessionResult.sessionId).toBeDefined()
    expect(sessionResult.expiresAt).toBeGreaterThan(Date.now())

    // Verify session was stored in database
    const session = await t.run(async (ctx) => {
      return await ctx.db.get(sessionResult.sessionId)
    })

    expect(session).toBeDefined()
    expect(session?.userId).toBe(userId)
    expect(session?.walletAddress).toBe('test_wallet_123')
    expect(session?.isActive).toBe(true)
  })

  test('validateSession: validates a valid session token', async () => {
    // Create user and session
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        walletAddress: 'test_wallet_456',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
    })

    const sessionResult = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_456',
    })

    // Validate the session
    const validationResult = await t.query(api.sessions.validateSession, {
      sessionToken: sessionResult.sessionToken,
    })

    expect(validationResult.valid).toBe(true)
    expect(validationResult.userId).toBe(userId)
    expect(validationResult.walletAddress).toBe('test_wallet_456')
  })

  test('validateSession: rejects invalid session token', async () => {
    const validationResult = await t.query(api.sessions.validateSession, {
      sessionToken: 'invalid_token_123',
    })

    expect(validationResult.valid).toBe(false)
    expect(validationResult.error).toBeDefined()
  })

  test('validateSession: rejects expired session', async () => {
    // Create user and session
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        walletAddress: 'test_wallet_expired',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
    })

    const sessionResult = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_expired',
    })

    // Manually expire the session in the database
    await t.run(async (ctx) => {
      await ctx.db.patch(sessionResult.sessionId, {
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      })
    })

    // Validate the expired session
    const validationResult = await t.query(api.sessions.validateSession, {
      sessionToken: sessionResult.sessionToken,
    })

    expect(validationResult.valid).toBe(false)
    expect(validationResult.error).toContain('expired')
  })

  test('revokeSession: revokes an active session', async () => {
    // Create user and session
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        walletAddress: 'test_wallet_revoke',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
    })

    const sessionResult = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_revoke',
    })

    // Verify session is valid
    let validationResult = await t.query(api.sessions.validateSession, {
      sessionToken: sessionResult.sessionToken,
    })
    expect(validationResult.valid).toBe(true)

    // Revoke the session
    const revokeResult = await t.mutation(api.sessions.revokeSession, {
      sessionId: sessionResult.sessionId,
    })
    expect(revokeResult.success).toBe(true)

    // Verify session is now invalid
    validationResult = await t.query(api.sessions.validateSession, {
      sessionToken: sessionResult.sessionToken,
    })
    expect(validationResult.valid).toBe(false)
  })

  test('cleanupExpiredSessions: removes expired sessions', async () => {
    // Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        walletAddress: 'test_wallet_cleanup',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
    })

    // Create multiple sessions
    const session1 = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_cleanup',
    })

    const session2 = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_cleanup',
    })

    // Expire one session
    await t.run(async (ctx) => {
      await ctx.db.patch(session1.sessionId, {
        expiresAt: Date.now() - 1000,
      })
    })

    // Run cleanup
    const cleanupResult = await t.mutation(internal.sessions.cleanupExpiredSessions, {})
    expect(cleanupResult.success).toBe(true)
    expect(cleanupResult.deletedCount).toBeGreaterThanOrEqual(1)

    // Verify expired session was deleted
    const expiredSession = await t.run(async (ctx) => {
      return await ctx.db.get(session1.sessionId)
    })
    expect(expiredSession).toBeNull()

    // Verify active session still exists
    const activeSession = await t.run(async (ctx) => {
      return await ctx.db.get(session2.sessionId)
    })
    expect(activeSession).toBeDefined()
  })

  test('getUserSessions: retrieves all user sessions', async () => {
    // Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        walletAddress: 'test_wallet_list',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
    })

    // Create multiple sessions
    await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_list',
    })

    await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_list',
    })

    // Get all user sessions
    const sessions = await t.query(api.sessions.getUserSessions, { userId })

    expect(sessions).toBeDefined()
    expect(sessions.length).toBe(2)
    expect(sessions[0].userId).toBe(userId)
    expect(sessions[1].userId).toBe(userId)
  })

  test('revokeAllUserSessions: revokes all sessions for a user', async () => {
    // Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        walletAddress: 'test_wallet_revoke_all',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
    })

    // Create multiple sessions
    const session1 = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_revoke_all',
    })

    const session2 = await t.mutation(internal.sessions.createSession, {
      userId,
      walletAddress: 'test_wallet_revoke_all',
    })

    // Revoke all sessions
    const revokeResult = await t.mutation(api.sessions.revokeAllUserSessions, { userId })
    expect(revokeResult.success).toBe(true)
    expect(revokeResult.revokedCount).toBe(2)

    // Verify both sessions are revoked
    const validation1 = await t.query(api.sessions.validateSession, {
      sessionToken: session1.sessionToken,
    })
    expect(validation1.valid).toBe(false)

    const validation2 = await t.query(api.sessions.validateSession, {
      sessionToken: session2.sessionToken,
    })
    expect(validation2.valid).toBe(false)
  })
})
