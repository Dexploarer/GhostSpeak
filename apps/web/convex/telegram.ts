/**
 * Telegram Integration Functions
 * Links Telegram accounts with Solana wallets
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Link a Solana wallet to a Telegram account
 * Verifies signature and updates user record
 */
export const linkWallet = mutation({
  args: {
    telegramUserId: v.string(),
    walletAddress: v.string(),
    signature: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify signature
      const publicKeyBytes = bs58.decode(args.walletAddress)
      const signatureBytes = bs58.decode(args.signature)
      const messageBytes = new TextEncoder().encode(args.message)

      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)

      if (!isValid) {
        throw new Error('Invalid signature')
      }

      // Check if this wallet is already linked
      const existingWallet = await ctx.db
        .query('users')
        .withIndex('by_wallet_address', (q) => q.eq('walletAddress', args.walletAddress))
        .first()

      // If wallet exists and is linked to a DIFFERENT Telegram user, reject
      if (existingWallet && existingWallet.telegramUserId && existingWallet.telegramUserId !== args.telegramUserId) {
        throw new Error('This wallet is already linked to another Telegram account')
      }

      // If wallet is already linked to THIS Telegram user, just update timestamp and return success
      if (existingWallet && existingWallet.telegramUserId === args.telegramUserId) {
        await ctx.db.patch(existingWallet._id, {
          lastActiveAt: Date.now(),
        })
        return {
          success: true,
          walletAddress: args.walletAddress,
        }
      }

      // Find existing Telegram user record (with telegram_ prefix)
      const telegramUser = await ctx.db
        .query('users')
        .withIndex('by_wallet_address', (q) => q.eq('walletAddress', `telegram_${args.telegramUserId}`))
        .first()

      const now = Date.now()

      if (telegramUser) {
        // Update existing Telegram user with real wallet address
        await ctx.db.patch(telegramUser._id, {
          walletAddress: args.walletAddress,
          telegramUserId: args.telegramUserId,
          lastActiveAt: now,
        })
      } else if (existingWallet) {
        // Wallet exists but doesn't have telegramUserId - update it
        await ctx.db.patch(existingWallet._id, {
          telegramUserId: args.telegramUserId,
          lastActiveAt: now,
        })
      } else {
        // Create new user with linked wallet
        await ctx.db.insert('users', {
          walletAddress: args.walletAddress,
          telegramUserId: args.telegramUserId,
          createdAt: now,
          lastActiveAt: now,
        })
      }

      return {
        success: true,
        walletAddress: args.walletAddress,
      }
    } catch (error) {
      console.error('Error linking wallet:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to link wallet')
    }
  },
})

/**
 * Get linked wallet for a Telegram user
 */
export const getLinkedWallet = query({
  args: {
    telegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to find by telegram user ID using index
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_user_id', (q) => q.eq('telegramUserId', args.telegramUserId))
      .first()

    if (user && user.walletAddress && !user.walletAddress.startsWith('telegram_')) {
      return {
        walletAddress: user.walletAddress,
        linked: true,
      }
    }

    return {
      walletAddress: `telegram_${args.telegramUserId}`,
      linked: false,
    }
  },
})
