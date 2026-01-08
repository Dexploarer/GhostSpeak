/**
 * Solana Wallet Authentication
 *
 * Custom authentication flow for Solana wallets using SIWS (Sign-In With Solana)
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Sign in with Solana wallet
 *
 * Verifies the signed message and creates/updates user record
 */
export const signInWithSolana = mutation({
  args: {
    publicKey: v.string(),
    signature: v.string(),
    message: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Decode public key and signature from base58
      const publicKeyBytes = bs58.decode(args.publicKey)
      const signatureBytes = bs58.decode(args.signature)
      const messageBytes = new TextEncoder().encode(args.message)

      // Verify the signature
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)

      if (!isValid) {
        throw new Error('Invalid signature')
      }

      // Check if user exists
      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.publicKey))
        .first()

      let userId: string
      let isNewUser = false

      const now = Date.now()

      if (existingUser) {
        // Update last login and sync metadata
        await ctx.db.patch(existingUser._id, {
          lastLoginAt: now,
          lastActiveAt: now,
          ...(args.email && { email: args.email }),
          ...(args.name && { name: args.name }),
        })
        userId = existingUser._id
      } else {
        // Create new user
        isNewUser = true
        userId = await ctx.db.insert('users', {
          walletAddress: args.publicKey,
          email: args.email,
          name: args.name,
          createdAt: now,
          lastLoginAt: now,
          lastActiveAt: now,
        })
      }

      // Create cryptographically secure session token
      // Note: In production, use proper JWT with signing
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      const sessionToken = `session_${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`

      return {
        success: true,
        userId,
        sessionToken,
        walletAddress: args.publicKey,
        isNewUser,
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Authentication failed: ${errorMessage}`)
    }
  },
})

/**
 * Get user by wallet address
 */
export const getUserByWallet = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    return user
  },
})

/**
 * Update user profile
 */
export const updateUserProfile = mutation({
  args: {
    walletAddress: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    await ctx.db.patch(user._id, {
      username: args.username,
      bio: args.bio,
      avatar: args.avatar,
      lastActiveAt: Date.now(),
    })

    return { success: true }
  },
})
