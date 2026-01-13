/**
 * User Management Schema
 * Handles user accounts, sessions, and profiles
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Re-usable validators
export const walletAddressValidator = v.string()
export const timestampValidator = v.number()

export const userPreferencesValidator = v.object({
  theme: v.optional(v.string()),
  notifications: v.optional(v.boolean()),
  favoriteCategories: v.optional(v.array(v.string())),
})

export const users = defineTable({
  // Wallet address (Solana)
  walletAddress: walletAddressValidator,
  // Telegram user ID (for Mini App users)
  telegramUserId: v.optional(v.string()),
  // Optional email (from Crossmint)
  email: v.optional(v.string()),
  // Display name
  name: v.optional(v.string()),
  username: v.optional(v.string()),
  bio: v.optional(v.string()),
  avatar: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  // Auth tracking
  lastLoginAt: v.optional(timestampValidator),
  // User preferences
  preferences: v.optional(userPreferencesValidator),
  // Stats
  totalSpent: v.optional(v.number()),
  totalTransactions: v.optional(v.number()),
  // Activity streak tracking
  currentStreak: v.optional(v.number()),
  longestStreak: v.optional(v.number()),
  lastActivityDate: v.optional(v.string()),
  // Individual B2B API billing - USDC token account
  usdcTokenAccount: v.optional(v.string()),
  monthlyBudget: v.optional(v.number()),
  currentBalance: v.optional(v.number()),
  lastBillingAt: v.optional(timestampValidator),
  // Individual B2B API billing - GHOST token account
  ghostTokenAccount: v.optional(v.string()),
  currentGhostBalance: v.optional(v.number()),
  preferredPaymentToken: v.optional(v.string()),
  // API CREDITS SYSTEM
  subscriptionTier: v.optional(v.string()),
  freeCreditsRemaining: v.optional(v.number()),
  lastFreeCreditsReset: v.optional(timestampValidator),
  paidCreditsBalance: v.optional(v.number()),
  lifetimeCreditsPurchased: v.optional(v.number()),
  // THREE-TIER REPUTATION SYSTEM
  ectoScore: v.optional(v.number()),
  ectoTier: v.optional(v.string()),
  ectoScoreLastUpdated: v.optional(timestampValidator),
  ghosthunterScore: v.optional(v.number()),
  ghosthunterTier: v.optional(v.string()),
  ghosthunterScoreLastUpdated: v.optional(timestampValidator),
  // Role tracking
  isAgentDeveloper: v.optional(v.boolean()),
  isCustomer: v.optional(v.boolean()),
  // ONBOARDING
  onboardingCompleted: v.optional(v.boolean()),
  onboardingCompletedAt: v.optional(timestampValidator),
  // WALLET HISTORY SCORING
  walletAge: v.optional(v.number()),
  walletTransactionCount: v.optional(v.number()),
  walletHistoryScore: v.optional(v.number()),
  walletHistoryAnalyzedAt: v.optional(timestampValidator),
  // CHAT MESSAGE QUOTAS
  dailyMessageCount: v.optional(v.number()),
  lastMessageDate: v.optional(v.string()),
  messageTier: v.optional(v.string()),
  lastGhostBalanceCheck: v.optional(timestampValidator),
  cachedGhostBalanceUsd: v.optional(v.number()),
  // Timestamps
  createdAt: timestampValidator,
  lastActiveAt: timestampValidator,
})
  .index('by_wallet_address', ['walletAddress'])
  .index('by_telegram_user_id', ['telegramUserId'])
  .index('by_email', ['email'])
  .index('by_usdc_account', ['usdcTokenAccount'])
  .index('by_ghost_account', ['ghostTokenAccount'])
  .index('by_ecto_score', ['ectoScore'])
  .index('by_ghosthunter_score', ['ghosthunterScore'])
  .index('by_username', ['username'])
  .index('by_onboarding', ['onboardingCompleted'])

export const sessions = defineTable({
  userId: v.id('users'),
  walletAddress: walletAddressValidator,
  sessionToken: v.string(),
  expiresAt: timestampValidator,
  createdAt: timestampValidator,
  lastAccessedAt: timestampValidator,
  isActive: v.boolean(),
})
  .index('by_user', ['userId'])
  .index('by_wallet', ['walletAddress'])
  .index('by_token', ['sessionToken'])
  .index('by_active', ['isActive'])
  .index('by_expires', ['expiresAt'])

export const favorites = defineTable({
  userId: v.id('users'),
  resourceId: v.string(),
  resourceUrl: v.string(),
  resourceName: v.string(),
  category: v.optional(v.string()),
  addedAt: timestampValidator,
})
  .index('by_user', ['userId'])
  .index('by_resource', ['resourceId'])
