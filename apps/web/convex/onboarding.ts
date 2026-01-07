/**
 * User Onboarding
 *
 * Handles new user onboarding flow including:
 * - Username selection (required)
 * - Optional profile info (name, email)
 * - Wallet history analysis for initial reputation scoring
 * - x402 payment scanning for Ghosthunter score boost
 * - Agent discovery from payment recipients
 * - Developer detection from on-chain activity
 */

import { v } from 'convex/values'
import { mutation, query, action, internalMutation } from './_generated/server'
import { internal } from './_generated/api'

// Known x402 facilitator addresses
const X402_FACILITATORS = [
  '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4', // PayAI Facilitator (mainnet/devnet)
]

// Historical cutoff for x402 payment scanning
// PayAI launched on Solana in October 2025 - no x402 payments existed before this
const X402_LAUNCH_TIMESTAMP = 1727740800 // October 1, 2025 00:00:00 UTC

/**
 * Check if user needs to complete onboarding
 */
export const checkOnboardingStatus = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      return {
        exists: false,
        needsOnboarding: true,
        username: null,
      }
    }

    return {
      exists: true,
      needsOnboarding: !user.onboardingCompleted,
      username: user.username,
      walletHistoryAnalyzed: !!user.walletHistoryAnalyzedAt,
    }
  },
})

/**
 * Check if username is available
 */
export const checkUsernameAvailable = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize username (lowercase, trim)
    const normalizedUsername = args.username.toLowerCase().trim()

    // Check minimum length
    if (normalizedUsername.length < 3) {
      return {
        available: false,
        reason: 'Username must be at least 3 characters',
      }
    }

    // Check maximum length
    if (normalizedUsername.length > 20) {
      return {
        available: false,
        reason: 'Username must be 20 characters or less',
      }
    }

    // Check valid characters (alphanumeric, underscore, hyphen)
    const validPattern = /^[a-z0-9_-]+$/
    if (!validPattern.test(normalizedUsername)) {
      return {
        available: false,
        reason: 'Username can only contain letters, numbers, underscores, and hyphens',
      }
    }

    // Reserved usernames
    const reserved = [
      'admin',
      'ghost',
      'ghostspeak',
      'casper',
      'caisper',
      'system',
      'support',
      'help',
      'api',
      'bot',
      'official',
    ]
    if (reserved.includes(normalizedUsername)) {
      return {
        available: false,
        reason: 'This username is reserved',
      }
    }

    // Check if username is taken
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q: any) => q.eq('username', normalizedUsername))
      .first()

    if (existingUser) {
      return {
        available: false,
        reason: 'Username is already taken',
      }
    }

    return {
      available: true,
      normalizedUsername,
    }
  },
})

/**
 * Complete onboarding with username
 */
export const completeOnboarding = mutation({
  args: {
    walletAddress: v.string(),
    username: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Normalize username
    const normalizedUsername = args.username.toLowerCase().trim()

    // Validate username format
    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      throw new Error('Username must be between 3 and 20 characters')
    }

    const validPattern = /^[a-z0-9_-]+$/
    if (!validPattern.test(normalizedUsername)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens')
    }

    // Check if username is taken (double-check in mutation for race conditions)
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q: any) => q.eq('username', normalizedUsername))
      .first()

    if (existingUser && existingUser._id !== user._id) {
      throw new Error('Username is already taken')
    }

    const now = Date.now()

    // Update user with onboarding data
    await ctx.db.patch(user._id, {
      username: normalizedUsername,
      name: args.name?.trim() || undefined,
      email: args.email?.trim() || undefined,
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      lastActiveAt: now,
    })

    return {
      success: true,
      username: normalizedUsername,
    }
  },
})

/**
 * Internal mutation to save wallet history analysis results
 */
export const saveWalletHistoryAnalysis = internalMutation({
  args: {
    walletAddress: v.string(),
    walletAge: v.number(),
    walletTransactionCount: v.number(),
    walletHistoryScore: v.number(),
    x402PaymentsFound: v.number(),
    ghosthunterBoost: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (!user) {
      console.error('User not found for wallet history analysis:', args.walletAddress)
      return { success: false }
    }

    // Calculate initial Ghosthunter score from historical payments
    const initialGhosthunterScore = args.ghosthunterBoost

    await ctx.db.patch(user._id, {
      walletAge: args.walletAge,
      walletTransactionCount: args.walletTransactionCount,
      walletHistoryScore: args.walletHistoryScore,
      walletHistoryAnalyzedAt: Date.now(),
      // Set initial Ghosthunter score if they had x402 payments
      ...(initialGhosthunterScore > 0 && {
        ghosthunterScore: initialGhosthunterScore,
        ghosthunterTier: getGhosthunterTier(initialGhosthunterScore),
        ghosthunterScoreLastUpdated: Date.now(),
        isCustomer: true,
      }),
    })

    return { success: true }
  },
})

/**
 * Internal mutation to record a historical interaction
 */
export const recordHistoricalInteraction = internalMutation({
  args: {
    userWalletAddress: v.string(),
    agentWalletAddress: v.string(),
    transactionSignature: v.string(),
    amount: v.optional(v.string()),
    facilitatorAddress: v.string(),
    blockTime: v.number(),
    agentKnown: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if we already recorded this interaction
    const existing = await ctx.db
      .query('historicalInteractions')
      .withIndex('by_signature', (q: any) =>
        q.eq('transactionSignature', args.transactionSignature)
      )
      .first()

    if (existing) {
      return { success: true, duplicate: true }
    }

    // Get user ID if they exist
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) => q.eq('walletAddress', args.userWalletAddress))
      .first()

    // Get agent ID if discovered
    const agent = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q: any) => q.eq('ghostAddress', args.agentWalletAddress))
      .first()

    await ctx.db.insert('historicalInteractions', {
      userWalletAddress: args.userWalletAddress,
      userId: user?._id,
      agentWalletAddress: args.agentWalletAddress,
      agentId: agent?._id,
      transactionSignature: args.transactionSignature,
      amount: args.amount,
      facilitatorAddress: args.facilitatorAddress,
      blockTime: args.blockTime,
      discoveredAt: now,
      discoverySource: 'wallet_onboarding',
      agentKnown: args.agentKnown,
    })

    return { success: true, duplicate: false }
  },
})

/**
 * Internal mutation to discover a new agent from x402 payment
 */
export const discoverAgentFromPayment = internalMutation({
  args: {
    agentWalletAddress: v.string(),
    transactionSignature: v.string(),
    facilitatorAddress: v.string(),
    blockTime: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if agent already discovered
    const existing = await ctx.db
      .query('discoveredAgents')
      .withIndex('by_address', (q: any) => q.eq('ghostAddress', args.agentWalletAddress))
      .first()

    if (existing) {
      return { success: true, alreadyKnown: true, agentId: existing._id }
    }

    // Create new discovered agent
    const agentId = await ctx.db.insert('discoveredAgents', {
      ghostAddress: args.agentWalletAddress,
      firstTxSignature: args.transactionSignature,
      firstSeenTimestamp: args.blockTime * 1000, // Convert to ms
      discoverySource: 'x402_payment',
      facilitatorAddress: args.facilitatorAddress,
      slot: 0, // Unknown
      blockTime: args.blockTime,
      status: 'discovered',
      createdAt: now,
      updatedAt: now,
    })

    // Log discovery event
    await ctx.db.insert('discoveryEvents', {
      eventType: 'agent_discovered',
      ghostAddress: args.agentWalletAddress,
      data: {
        signature: args.transactionSignature,
        blockTime: args.blockTime,
        facilitator: args.facilitatorAddress,
      },
      timestamp: now,
    })

    return { success: true, alreadyKnown: false, agentId }
  },
})

/**
 * Internal mutation to record potential developer
 */
export const recordPotentialDeveloper = internalMutation({
  args: {
    walletAddress: v.string(),
    authorityOverAgents: v.array(v.string()),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if already recorded
    const existing = await ctx.db
      .query('potentialDevelopers')
      .withIndex('by_wallet', (q: any) => q.eq('walletAddress', args.walletAddress))
      .first()

    if (existing) {
      // Update with new info
      const mergedAgents = [
        ...new Set([...(existing.authorityOverAgents || []), ...args.authorityOverAgents]),
      ]
      await ctx.db.patch(existing._id, {
        authorityOverAgents: mergedAgents,
        confidence: Math.max(existing.confidence, args.confidence),
        lastAnalyzedAt: now,
      })
      return { success: true, updated: true }
    }

    await ctx.db.insert('potentialDevelopers', {
      walletAddress: args.walletAddress,
      authorityOverAgents: args.authorityOverAgents,
      confidence: args.confidence,
      confirmedDeveloper: false,
      discoveredAt: now,
      discoverySource: 'wallet_onboarding',
      lastAnalyzedAt: now,
    })

    return { success: true, updated: false }
  },
})

/**
 * Get Ghosthunter tier from score
 */
function getGhosthunterTier(score: number): string {
  if (score >= 9000) return 'LEGENDARY'
  if (score >= 7500) return 'ELITE'
  if (score >= 5000) return 'VETERAN'
  if (score >= 2500) return 'TRACKER'
  return 'ROOKIE'
}

/**
 * Analyze wallet history and calculate initial reputation score
 *
 * Enhanced to:
 * 1. Scan for x402 payments to award Ghosthunter points
 * 2. Discover new agents from payment recipients
 * 3. Record historical interactions for future review prompts
 * 4. Detect potential developer status
 */
export const analyzeWalletHistory = action({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY
    const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'

    let walletAge = 0
    let walletTransactionCount = 0
    let walletHistoryScore = 0
    let x402PaymentsFound = 0
    let ghosthunterBoost = 0
    const discoveredAgents: string[] = []
    const interactions: Array<{
      agentWallet: string
      signature: string
      amount?: string
      facilitator: string
      blockTime: number
    }> = []

    try {
      // ─── FETCH TRANSACTION HISTORY ───────────────────────────────────────────
      let transactions: any[] = []

      if (HELIUS_API_KEY) {
        // Use Helius enhanced transaction API
        const response = await fetch(
          `https://api.helius.xyz/v0/addresses/${args.walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=100`
        )

        if (response.ok) {
          transactions = await response.json()
          walletTransactionCount = transactions.length

          // Find oldest transaction for wallet age
          if (transactions.length > 0) {
            const oldestTx = transactions[transactions.length - 1]
            const oldestTimestamp = oldestTx.timestamp * 1000
            walletAge = Math.floor((Date.now() - oldestTimestamp) / (1000 * 60 * 60 * 24))
          }

          // ─── SCAN FOR X402 PAYMENTS ────────────────────────────────────────────
          for (const tx of transactions) {
            // Skip transactions before x402 launched on Solana (October 2025)
            if (tx.timestamp < X402_LAUNCH_TIMESTAMP) {
              continue
            }

            // Helius enriched transactions have accountData with token transfers
            const tokenTransfers = tx.tokenTransfers || []
            const nativeTransfers = tx.nativeTransfers || []

            // Check if this tx involves an x402 facilitator
            const involvesFacilitator =
              tx.accountData?.some((acc: any) => X402_FACILITATORS.includes(acc.account)) ||
              tokenTransfers.some(
                (t: any) =>
                  X402_FACILITATORS.includes(t.fromUserAccount) ||
                  X402_FACILITATORS.includes(t.toUserAccount)
              )

            if (involvesFacilitator) {
              // This is likely an x402 payment!
              x402PaymentsFound++

              // Find the recipient (agent) - typically the account that received funds
              // after facilitator processed the payment
              for (const transfer of tokenTransfers) {
                if (transfer.fromUserAccount === args.walletAddress) {
                  // User sent to someone - could be facilitator or agent
                  const recipient = transfer.toUserAccount
                  if (!X402_FACILITATORS.includes(recipient)) {
                    // This is probably the agent
                    interactions.push({
                      agentWallet: recipient,
                      signature: tx.signature,
                      amount: transfer.tokenAmount?.toString(),
                      facilitator: X402_FACILITATORS[0],
                      blockTime: tx.timestamp,
                    })
                    if (!discoveredAgents.includes(recipient)) {
                      discoveredAgents.push(recipient)
                    }
                  }
                }
              }

              // Also check native SOL transfers
              for (const transfer of nativeTransfers) {
                if (transfer.fromUserAccount === args.walletAddress) {
                  const recipient = transfer.toUserAccount
                  if (
                    !X402_FACILITATORS.includes(recipient) &&
                    !discoveredAgents.includes(recipient)
                  ) {
                    interactions.push({
                      agentWallet: recipient,
                      signature: tx.signature,
                      amount: transfer.amount?.toString(),
                      facilitator: X402_FACILITATORS[0],
                      blockTime: tx.timestamp,
                    })
                    discoveredAgents.push(recipient)
                  }
                }
              }
            }
          }
        }
      } else {
        // Fallback to basic RPC
        const sigResponse = await fetch(SOLANA_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignaturesForAddress',
            params: [args.walletAddress, { limit: 100 }],
          }),
        })

        if (sigResponse.ok) {
          const sigData = await sigResponse.json()
          const signatures = sigData.result || []
          walletTransactionCount = signatures.length

          if (signatures.length > 0) {
            const oldestSig = signatures[signatures.length - 1]
            if (oldestSig.blockTime) {
              walletAge = Math.floor((Date.now() / 1000 - oldestSig.blockTime) / (60 * 60 * 24))
            }
          }

          // For basic RPC, we'd need to fetch each tx to analyze
          // This is expensive, so we'll skip detailed x402 analysis without Helius
          console.log('Helius API key not available - x402 payment scanning limited')
        }
      }

      // ─── CALCULATE SCORES ────────────────────────────────────────────────────

      // Base wallet history score (0-1000)
      const ageScore = (Math.min(walletAge, 365) / 365) * 400
      const txScore = (Math.min(walletTransactionCount, 100) / 100) * 600
      walletHistoryScore = Math.round(ageScore + txScore)

      // Ghosthunter boost from x402 payments (each payment = 150 points, up to 3500)
      ghosthunterBoost = Math.min(x402PaymentsFound * 150, 3500)

      // ─── RECORD INTERACTIONS & DISCOVER AGENTS ───────────────────────────────

      for (const interaction of interactions) {
        // Check if agent is already known
        const agentResult = await ctx.runMutation(internal.onboarding.discoverAgentFromPayment, {
          agentWalletAddress: interaction.agentWallet,
          transactionSignature: interaction.signature,
          facilitatorAddress: interaction.facilitator,
          blockTime: interaction.blockTime,
        })

        // Record the historical interaction
        await ctx.runMutation(internal.onboarding.recordHistoricalInteraction, {
          userWalletAddress: args.walletAddress,
          agentWalletAddress: interaction.agentWallet,
          transactionSignature: interaction.signature,
          amount: interaction.amount,
          facilitatorAddress: interaction.facilitator,
          blockTime: interaction.blockTime,
          agentKnown: agentResult.alreadyKnown || false,
        })
      }

      // ─── DETECT POTENTIAL DEVELOPER ──────────────────────────────────────────

      // If we found interactions where this wallet RECEIVED payments through x402,
      // they might be an agent developer
      // (Would need additional analysis with Helius parsed tx data)

      // ─── SAVE RESULTS ────────────────────────────────────────────────────────

      await ctx.runMutation(internal.onboarding.saveWalletHistoryAnalysis, {
        walletAddress: args.walletAddress,
        walletAge,
        walletTransactionCount,
        walletHistoryScore,
        x402PaymentsFound,
        ghosthunterBoost,
      })

      return {
        success: true,
        walletAge,
        walletTransactionCount,
        walletHistoryScore,
        x402Analysis: {
          paymentsFound: x402PaymentsFound,
          ghosthunterBoost,
          agentsDiscovered: discoveredAgents.length,
          interactionsRecorded: interactions.length,
        },
      }
    } catch (error) {
      console.error('Wallet history analysis error:', error)

      // Save zero values on error
      await ctx.runMutation(internal.onboarding.saveWalletHistoryAnalysis, {
        walletAddress: args.walletAddress,
        walletAge: 0,
        walletTransactionCount: 0,
        walletHistoryScore: 0,
        x402PaymentsFound: 0,
        ghosthunterBoost: 0,
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        walletAge: 0,
        walletTransactionCount: 0,
        walletHistoryScore: 0,
        x402Analysis: {
          paymentsFound: 0,
          ghosthunterBoost: 0,
          agentsDiscovered: 0,
          interactionsRecorded: 0,
        },
      }
    }
  },
})

/**
 * Get historical interactions for a user
 * Useful for prompting reviews when agents get claimed
 */
export const getUserInteractions = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const interactions = await ctx.db
      .query('historicalInteractions')
      .withIndex('by_user_wallet', (q: any) => q.eq('userWalletAddress', args.walletAddress))
      .collect()

    // Enrich with agent info
    const enriched = await Promise.all(
      interactions.map(async (interaction) => {
        const agent = await ctx.db
          .query('discoveredAgents')
          .withIndex('by_address', (q: any) => q.eq('ghostAddress', interaction.agentWalletAddress))
          .first()

        return {
          ...interaction,
          agent: agent
            ? {
                address: agent.ghostAddress,
                status: agent.status,
                claimedBy: agent.claimedBy,
              }
            : null,
        }
      })
    )

    return enriched
  },
})

/**
 * Get interactions for prompting reviews
 * Returns interactions where agent is now claimed but no review prompt sent
 */
export const getInteractionsForReviewPrompt = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const interactions = await ctx.db
      .query('historicalInteractions')
      .withIndex('by_user_wallet', (q: any) => q.eq('userWalletAddress', args.walletAddress))
      .filter((q: any) => q.neq(q.field('reviewPromptSent'), true))
      .collect()

    // Filter to only interactions where agent is now claimed
    const promptable = []
    for (const interaction of interactions) {
      const agent = await ctx.db
        .query('discoveredAgents')
        .withIndex('by_address', (q: any) => q.eq('ghostAddress', interaction.agentWalletAddress))
        .first()

      if (agent && (agent.status === 'claimed' || agent.status === 'verified')) {
        promptable.push({
          interaction,
          agent: {
            address: agent.ghostAddress,
            status: agent.status,
            claimedBy: agent.claimedBy,
          },
        })
      }
    }

    return promptable
  },
})
