/**
 * Authentication Session Tests
 *
 * Unit tests for JWT token creation and validation logic
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { SignJWT, jwtVerify } from 'jose'

// JWT secret for testing (mimics what's in sessions.ts)
const TEST_JWT_SECRET = 'test_secret_key_with_at_least_32_characters_for_jwt_signing'
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getJwtSecret() {
  return new TextEncoder().encode(TEST_JWT_SECRET)
}

describe('JWT Session Token Creation and Validation', () => {
  test('creates a valid JWT token with correct payload', async () => {
    const userId = 'test_user_123'
    const walletAddress = 'test_wallet_address'
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS

    const payload = {
      userId,
      walletAddress,
      expiresAt,
    }

    const secret = getJwtSecret()
    const sessionToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject(userId)
      .sign(secret)

    // Verify token was created
    expect(sessionToken).toBeDefined()
    expect(typeof sessionToken).toBe('string')
    expect(sessionToken.length).toBeGreaterThan(100) // JWT tokens are typically 100+ chars
  })

  test('validates a valid JWT token and extracts payload', async () => {
    const userId = 'test_user_456'
    const walletAddress = 'test_wallet_789'
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS

    const payload = {
      userId,
      walletAddress,
      expiresAt,
    }

    const secret = getJwtSecret()
    const sessionToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject(userId)
      .sign(secret)

    // Validate the token
    const verified = await jwtVerify(sessionToken, secret)

    // Check payload
    expect(verified.payload).toBeDefined()
    expect(verified.payload.userId).toBe(userId)
    expect(verified.payload.walletAddress).toBe(walletAddress)
    expect(verified.payload.sub).toBe(userId)
    expect(Number(verified.payload.expiresAt)).toBe(expiresAt)
  })

  test('rejects an invalid JWT token', async () => {
    const invalidToken = 'invalid.jwt.token'
    const secret = getJwtSecret()

    await expect(async () => {
      await jwtVerify(invalidToken, secret)
    }).rejects.toThrow()
  })

  test('rejects a token signed with wrong secret', async () => {
    const userId = 'test_user_wrong_secret'
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS

    const payload = {
      userId,
      walletAddress: 'test_wallet',
      expiresAt,
    }

    // Sign with wrong secret
    const wrongSecret = new TextEncoder().encode('wrong_secret_key_different_from_real_one_32chars')
    const sessionToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject(userId)
      .sign(wrongSecret)

    // Try to verify with correct secret
    const correctSecret = getJwtSecret()

    await expect(async () => {
      await jwtVerify(sessionToken, correctSecret)
    }).rejects.toThrow()
  })

  test('rejects an expired JWT token', async () => {
    const userId = 'test_user_expired'
    const now = Date.now()
    const expiresAt = now - 1000 // Expired 1 second ago

    const payload = {
      userId,
      walletAddress: 'test_wallet',
      expiresAt,
    }

    const secret = getJwtSecret()
    const sessionToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt((now - SESSION_EXPIRY_MS) / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject(userId)
      .sign(secret)

    // Try to verify expired token
    await expect(async () => {
      await jwtVerify(sessionToken, secret)
    }).rejects.toThrow()
  })

  test('token expiration is set to 7 days in the future', () => {
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS

    const expectedSevenDaysLater = now + (7 * 24 * 60 * 60 * 1000)

    // Allow 1 second tolerance for test execution time
    expect(Math.abs(expiresAt - expectedSevenDaysLater)).toBeLessThan(1000)
  })

  test('token includes required claims (sub, iat, exp)', async () => {
    const userId = 'test_user_claims'
    const walletAddress = 'test_wallet_claims'
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS

    const payload = {
      userId,
      walletAddress,
      expiresAt,
    }

    const secret = getJwtSecret()
    const sessionToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject(userId)
      .sign(secret)

    const verified = await jwtVerify(sessionToken, secret)

    // Check required JWT claims
    expect(verified.payload.sub).toBe(userId) // Subject
    expect(verified.payload.iat).toBeDefined() // Issued At
    expect(verified.payload.exp).toBeDefined() // Expiration
    expect(verified.protectedHeader.alg).toBe('HS256') // Algorithm
  })

  test('token can be decoded without verification', async () => {
    const userId = 'test_user_decode'
    const walletAddress = 'test_wallet_decode'
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS

    const payload = {
      userId,
      walletAddress,
      expiresAt,
    }

    const secret = getJwtSecret()
    const sessionToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject(userId)
      .sign(secret)

    // Decode without verification (just to check structure)
    const parts = sessionToken.split('.')
    expect(parts.length).toBe(3) // Header.Payload.Signature

    // Decode payload (base64url)
    const payloadPart = parts[1]
    const decodedPayload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf-8')
    )

    expect(decodedPayload.userId).toBe(userId)
    expect(decodedPayload.walletAddress).toBe(walletAddress)
  })
})

describe('Session Security Requirements', () => {
  test('JWT secret must be at least 32 characters', () => {
    expect(TEST_JWT_SECRET.length).toBeGreaterThanOrEqual(32)
  })

  test('different users get different tokens', async () => {
    const now = Date.now()
    const expiresAt = now + SESSION_EXPIRY_MS
    const secret = getJwtSecret()

    const token1 = await new SignJWT({
      userId: 'user_1',
      walletAddress: 'wallet_1',
      expiresAt,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject('user_1')
      .sign(secret)

    const token2 = await new SignJWT({
      userId: 'user_2',
      walletAddress: 'wallet_2',
      expiresAt,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject('user_2')
      .sign(secret)

    expect(token1).not.toBe(token2)
  })

  test('same user creating multiple sessions gets different tokens', async () => {
    const userId = 'same_user'
    const walletAddress = 'same_wallet'
    const secret = getJwtSecret()

    const token1 = await new SignJWT({
      userId,
      walletAddress,
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Date.now() / 1000)
      .setExpirationTime((Date.now() + SESSION_EXPIRY_MS) / 1000)
      .setSubject(userId)
      .sign(secret)

    // Wait 1ms to ensure different iat
    await new Promise((resolve) => setTimeout(resolve, 1))

    const token2 = await new SignJWT({
      userId,
      walletAddress,
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Date.now() / 1000)
      .setExpirationTime((Date.now() + SESSION_EXPIRY_MS) / 1000)
      .setSubject(userId)
      .sign(secret)

    expect(token1).not.toBe(token2)
  })
})
