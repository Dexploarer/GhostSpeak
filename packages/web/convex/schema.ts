/**
 * GhostSpeak Convex Schema
 *
 * Real-time database for Ghost Score, B2B API, Staking, and Revenue Share
 */

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  //
  // ─── USERS ─────────────────────────────────────────────────────────────────
  //
  users: defineTable({
    // Wallet address (Solana)
    walletAddress: v.string(),
    // Optional email (from Crossmint)
    email: v.optional(v.string()),
    // Display name
    name: v.optional(v.string()),
    // Avatar URL
    avatarUrl: v.optional(v.string()),
    // User preferences
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        notifications: v.optional(v.boolean()),
        favoriteCategories: v.optional(v.array(v.string())),
      })
    ),
    // Stats
    totalSpent: v.optional(v.number()),
    totalTransactions: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index('by_wallet', ['walletAddress'])
    .index('by_email', ['email']),

  //
  // ─── FAVORITE RESOURCES ────────────────────────────────────────────────────
  //
  favorites: defineTable({
    userId: v.id('users'),
    resourceId: v.string(), // External resource ID
    resourceUrl: v.string(),
    resourceName: v.string(),
    category: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_resource', ['resourceId']),

  //
  // ─── CONVERSATIONS ─────────────────────────────────────────────────────────
  // Human-to-Agent chat history
  //
  conversations: defineTable({
    userId: v.id('users'),
    resourceId: v.string(), // External resource ID
    resourceUrl: v.string(),
    resourceName: v.string(),
    // Conversation metadata
    title: v.optional(v.string()),
    status: v.string(), // 'active', 'completed', 'archived'
    totalCost: v.number(),
    messageCount: v.number(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_resource', ['userId', 'resourceId']),

  //
  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  //
  messages: defineTable({
    conversationId: v.id('conversations'),
    role: v.string(), // 'user' or 'agent'
    content: v.string(),
    // Payment info (for agent responses)
    cost: v.optional(v.number()),
    transactionSignature: v.optional(v.string()),
    // Metadata
    metadata: v.optional(v.any()),
    // Timestamp
    createdAt: v.number(),
  }).index('by_conversation', ['conversationId']),

  //
  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  // x402 payment records
  //
  payments: defineTable({
    userId: v.id('users'),
    // Resource info
    resourceId: v.string(),
    resourceUrl: v.string(),
    resourceName: v.string(),
    // Payment details
    amount: v.number(), // In USD
    network: v.string(), // 'base', 'solana'
    transactionSignature: v.optional(v.string()),
    status: v.string(), // 'pending', 'completed', 'failed'
    // Optional conversation reference
    conversationId: v.optional(v.id('conversations')),
    messageId: v.optional(v.id('messages')),
    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_resource', ['resourceId'])
    .index('by_status', ['status']),

  //
  // ─── GHOST SCORE: VERIFICATIONS ────────────────────────────────────────────
  // Track agent verification requests for freemium limits
  // Freemium model: 3 free verifications/month, then USDC payment or GHOST staking required
  //
  verifications: defineTable({
    userId: v.id('users'),
    agentAddress: v.string(),
    ghostScore: v.number(), // Score at time of verification
    tier: v.string(), // 'NEWCOMER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'
    paymentMethod: v.optional(v.string()), // 'free' | 'usdc' | 'ghost_staked' | 'ghost_burned'
    paymentSignature: v.optional(v.string()), // Transaction signature if paid
    timestamp: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_agent', ['agentAddress'])
    .index('by_user_timestamp', ['userId', 'timestamp']),

  //
  // ─── GHOST SCORE: REVIEWS ──────────────────────────────────────────────────
  // User reviews and ratings for agents
  //
  reviews: defineTable({
    agentAddress: v.string(),
    userId: v.id('users'),
    rating: v.number(), // 1-5 stars
    review: v.string(),
    verifiedHire: v.boolean(), // true if user has payment proof
    upvotes: v.number(),
    downvotes: v.number(),
    // Optional metadata
    jobCategory: v.optional(v.string()),
    transactionSignature: v.optional(v.string()),
    timestamp: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_user', ['userId'])
    .index('by_agent_timestamp', ['agentAddress', 'timestamp']),

  //
  // ─── GHOST SCORE: REVIEW VOTES ─────────────────────────────────────────────
  // Track user votes on reviews
  //
  reviewVotes: defineTable({
    reviewId: v.id('reviews'),
    userId: v.id('users'),
    vote: v.number(), // 1 for upvote, -1 for downvote
    timestamp: v.number(),
  })
    .index('by_review', ['reviewId'])
    .index('by_user_review', ['userId', 'reviewId']),

  //
  // ─── B2B API: API KEYS ─────────────────────────────────────────────────────
  // Enterprise API access management
  //
  apiKeys: defineTable({
    userId: v.id('users'),
    // Hashed API key (SHA-256)
    hashedKey: v.string(),
    // Key prefix for display (e.g., "gs_live_abc...")
    keyPrefix: v.string(),
    // Subscription tier
    tier: v.string(), // 'startup', 'growth', 'enterprise'
    // Rate limit (requests per minute)
    rateLimit: v.number(),
    // Status
    isActive: v.boolean(),
    // Metadata
    name: v.optional(v.string()), // User-defined name
    lastUsedAt: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_hashed_key', ['hashedKey'])
    .index('by_user_active', ['userId', 'isActive']),

  //
  // ─── B2B API: USAGE TRACKING ───────────────────────────────────────────────
  // Track API calls for billing
  //
  apiUsage: defineTable({
    apiKeyId: v.id('apiKeys'),
    userId: v.id('users'),
    // Endpoint info
    endpoint: v.string(), // '/verify', '/agents/:address/score', etc.
    method: v.string(), // 'GET', 'POST'
    // Request details
    agentAddress: v.optional(v.string()), // Agent being verified
    statusCode: v.number(), // 200, 404, 429, etc.
    responseTime: v.number(), // milliseconds
    // Billing
    billable: v.boolean(),
    cost: v.optional(v.number()), // USD cents
    // Timestamp
    timestamp: v.number(),
  })
    .index('by_api_key', ['apiKeyId'])
    .index('by_user', ['userId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
    .index('by_api_key_timestamp', ['apiKeyId', 'timestamp']),

  //
  // ─── B2B API: WEBHOOK SUBSCRIPTIONS ────────────────────────────────────────
  // Event notifications for B2B customers
  //
  webhookSubscriptions: defineTable({
    apiKeyId: v.id('apiKeys'),
    userId: v.id('users'),
    // Webhook config
    url: v.string(),
    secret: v.string(), // HMAC signing secret
    // Event filters
    events: v.array(v.string()), // ['score.updated', 'tier.changed', etc.]
    agentAddresses: v.optional(v.array(v.string())), // Filter by specific agents
    // Status
    isActive: v.boolean(),
    // Delivery stats
    totalDeliveries: v.number(),
    failedDeliveries: v.number(),
    lastDeliveryAt: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
  })
    .index('by_api_key', ['apiKeyId'])
    .index('by_user', ['userId'])
    .index('by_active', ['isActive']),

  //
  // ─── B2B API: WEBHOOK DELIVERIES ───────────────────────────────────────────
  // Queue and track webhook delivery attempts
  //
  webhookDeliveries: defineTable({
    subscriptionId: v.id('webhookSubscriptions'),
    userId: v.id('users'),
    // Event details
    event: v.string(),
    payload: v.any(),
    // Delivery details
    url: v.string(),
    secret: v.string(),
    // Status tracking
    status: v.string(), // 'pending', 'delivered', 'failed'
    attemptCount: v.number(),
    maxAttempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    // Error tracking
    lastError: v.optional(v.string()),
    lastResponseStatus: v.optional(v.number()),
    lastResponseBody: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_subscription', ['subscriptionId'])
    .index('by_status', ['status'])
    .index('by_user', ['userId']),

  //
  // ─── B2B API: AGENT REPUTATION CACHE ───────────────────────────────────────
  // Cache agent reputation data for fast API responses
  //
  agentReputationCache: defineTable({
    // Agent identity
    agentAddress: v.string(),
    // Ghost Score metrics
    ghostScore: v.number(),
    tier: v.string(), // 'NEWCOMER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'
    // Detailed metrics
    successRate: v.number(),
    avgResponseTime: v.optional(v.number()),
    totalJobs: v.number(),
    disputes: v.number(),
    disputeResolution: v.string(), // '100%', '95%', etc.
    // PayAI data (x402 payment history)
    payaiData: v.optional(
      v.object({
        last30Days: v.object({
          transactions: v.number(),
          volume: v.string(), // USD value
          avgAmount: v.string(),
        }),
      })
    ),
    // W3C Credential
    credentialId: v.optional(v.string()),
    // Cache metadata
    lastUpdated: v.number(),
    cacheHits: v.number(),
  })
    .index('by_address', ['agentAddress'])
    .index('by_tier', ['tier'])
    .index('by_score', ['ghostScore']),

  //
  // ─── PAYAI INTEGRATION: FAILED RECORDINGS ──────────────────────────────────
  // Track failed on-chain recordings for retry
  //
  payaiFailedRecordings: defineTable({
    // Payment data
    agentAddress: v.string(),
    paymentSignature: v.string(),
    amount: v.string(), // BigInt as string
    responseTimeMs: v.number(),
    success: v.boolean(),
    payerAddress: v.string(),
    network: v.string(),
    // Error tracking
    error: v.string(),
    retryCount: v.number(),
    lastRetryAt: v.optional(v.number()),
    maxRetries: v.number(), // Max 5 retries
    // Status
    status: v.string(), // 'pending', 'retrying', 'succeeded', 'failed'
    // Timestamps
    timestamp: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_status', ['status'])
    .index('by_agent', ['agentAddress'])
    .index('by_payment_signature', ['paymentSignature']),

  //
  // ─── PAYAI INTEGRATION: CREDENTIALS ISSUED ─────────────────────────────────
  // Track reputation credentials issued
  //
  payaiCredentialsIssued: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    tier: v.string(), // 'Bronze', 'Silver', 'Gold', 'Platinum'
    milestone: v.number(), // Score milestone (2000, 5000, 7500, 9000)
    ghostScore: v.number(),
    // Credential data
    solanaSignature: v.optional(v.string()),
    crossmintCredentialId: v.optional(v.string()),
    // Timestamps
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_tier', ['tier'])
    .index('by_credential_id', ['credentialId']),

  //
  // ─── GHOST STAKING: STAKING ACCOUNTS ───────────────────────────────────────
  // Track GHOST token staking for reputation boosts
  //
  stakingAccounts: defineTable({
    agentAddress: v.string(),
    amountStaked: v.number(), // Amount in GHOST tokens
    stakedAt: v.number(), // Unix timestamp
    unlockAt: v.number(), // Unix timestamp
    lockDuration: v.number(), // Duration in seconds
    reputationBoostBps: v.number(), // Boost in basis points (500 = 5%, 1500 = 15%)
    hasVerifiedBadge: v.boolean(), // Tier 2+
    hasPremiumBenefits: v.boolean(), // Tier 3
    tier: v.number(), // 1, 2, or 3
    isActive: v.boolean(), // false after unstaking
  })
    .index('by_agent', ['agentAddress'])
    .index('by_tier', ['tier'])
    .index('by_active', ['isActive']),

  //
  // ─── GHOST STAKING: STAKING EVENTS ─────────────────────────────────────────
  // Historical staking events
  //
  stakingEvents: defineTable({
    agentAddress: v.string(),
    eventType: v.string(), // 'staked' | 'unstaked' | 'slashed'
    amount: v.number(), // Amount in GHOST tokens
    timestamp: v.number(),
    txSignature: v.string(),
    // Optional details
    lockDuration: v.optional(v.number()), // For staking events
    tierReached: v.optional(v.number()), // Tier reached after this event
  })
    .index('by_agent', ['agentAddress'])
    .index('by_type', ['eventType'])
    .index('by_timestamp', ['timestamp'])
    .index('by_agent_timestamp', ['agentAddress', 'timestamp']),

  //
  // ─── GHOST PROTECT: ESCROWS ────────────────────────────────────────────────
  // B2C escrow transactions for hiring AI agents
  //
  escrows: defineTable({
    // On-chain identifiers
    escrowId: v.string(), // PDA address
    escrowIdNumber: v.string(), // BigInt escrow ID from chain
    // Parties
    clientAddress: v.string(),
    agentAddress: v.string(),
    // Payment details
    amount: v.string(), // BigInt as string (in token base units)
    tokenMint: v.string(),
    tokenSymbol: v.optional(v.string()), // 'USDC', 'USDT', etc.
    tokenDecimals: v.optional(v.number()),
    // Job details
    jobDescription: v.string(),
    deliveryProof: v.optional(v.string()), // IPFS hash
    // Status
    status: v.string(), // 'Active' | 'Completed' | 'Disputed' | 'Cancelled'
    // Timestamps (as Unix timestamps from chain)
    deadline: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    // Dispute info
    disputeReason: v.optional(v.string()),
    arbitratorDecision: v.optional(v.string()),
    // Metadata
    transactionSignature: v.optional(v.string()), // Creation tx sig
    lastUpdated: v.number(),
  })
    .index('by_escrow_id', ['escrowId'])
    .index('by_client', ['clientAddress'])
    .index('by_agent', ['agentAddress'])
    .index('by_status', ['status'])
    .index('by_client_status', ['clientAddress', 'status'])
    .index('by_agent_status', ['agentAddress', 'status'])
    .index('by_deadline', ['deadline']),

  //
  // ─── GHOST PROTECT: ESCROW EVENTS ──────────────────────────────────────────
  // Timeline of events for each escrow
  //
  escrowEvents: defineTable({
    escrowId: v.string(), // References escrows.escrowId
    eventType: v.string(), // 'created' | 'delivery_submitted' | 'approved' | 'disputed' | 'resolved' | 'cancelled'
    actor: v.string(), // Address of who triggered the event
    // Event data
    data: v.optional(
      v.object({
        deliveryProof: v.optional(v.string()),
        disputeReason: v.optional(v.string()),
        arbitratorDecision: v.optional(v.string()),
        transactionSignature: v.optional(v.string()),
      })
    ),
    // Metadata
    timestamp: v.number(),
  })
    .index('by_escrow', ['escrowId'])
    .index('by_escrow_timestamp', ['escrowId', 'timestamp'])
    .index('by_event_type', ['eventType']),

  //
  // ─── ENTERPRISE: TEAMS ─────────────────────────────────────────────────────
  // Team management for enterprise customers
  //
  teams: defineTable({
    name: v.string(),
    ownerUserId: v.id('users'),
    // Subscription info
    plan: v.string(), // 'startup', 'growth', 'enterprise'
    // Billing (USDC token account)
    usdcTokenAccount: v.optional(v.string()), // Team's USDC token account for payments
    monthlyBudget: v.optional(v.number()), // Monthly USDC budget
    currentBalance: v.optional(v.number()), // Current USDC balance
    lastBillingAt: v.optional(v.number()), // Last monthly billing timestamp
    // Limits
    maxMembers: v.number(),
    maxApiKeys: v.number(),
    // Status
    isActive: v.boolean(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerUserId'])
    .index('by_usdc_account', ['usdcTokenAccount']),

  //
  // ─── ENTERPRISE: TEAM MEMBERS ──────────────────────────────────────────────
  // User-to-team mappings with roles
  //
  teamMembers: defineTable({
    teamId: v.id('teams'),
    userId: v.id('users'),
    role: v.string(), // 'owner', 'admin', 'developer', 'viewer'
    // Permissions
    canManageMembers: v.boolean(),
    canManageApiKeys: v.boolean(),
    canViewBilling: v.boolean(),
    // Status
    isActive: v.boolean(),
    // Timestamps
    joinedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_user', ['userId'])
    .index('by_team_user', ['teamId', 'userId']),

  //
  // ─── ENTERPRISE: TEAM INVITES ──────────────────────────────────────────────
  // Pending team invitations
  //
  teamInvites: defineTable({
    teamId: v.id('teams'),
    email: v.string(),
    role: v.string(), // 'admin', 'developer', 'viewer'
    invitedBy: v.id('users'),
    // Invite token
    token: v.string(),
    // Status
    status: v.string(), // 'pending', 'accepted', 'expired'
    expiresAt: v.number(),
    // Timestamps
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index('by_team', ['teamId'])
    .index('by_email', ['email'])
    .index('by_token', ['token'])
    .index('by_status', ['status']),

  //
  // ─── B2B BILLING: DEDUCTIONS ───────────────────────────────────────────────
  // Track USDC deductions from team accounts
  //
  billingDeductions: defineTable({
    teamId: v.id('teams'),
    // Amount deducted
    amountMicroUsdc: v.number(), // Amount in micro USDC (6 decimals)
    amountUsdc: v.number(), // Amount in USDC (for display)
    // Usage info
    requestCount: v.number(),
    endpoint: v.string(),
    // Transaction
    transactionSignature: v.optional(v.string()),
    // Timestamp
    timestamp: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_team_timestamp', ['teamId', 'timestamp'])
    .index('by_timestamp', ['timestamp']),

  //
  // ─── B2B BILLING: DEPOSITS ─────────────────────────────────────────────────
  // Track USDC deposits to team accounts
  //
  billingDeposits: defineTable({
    teamId: v.id('teams'),
    // Amount deposited
    amountMicroUsdc: v.number(),
    amountUsdc: v.number(),
    // Transaction
    transactionSignature: v.optional(v.string()),
    // Timestamp
    timestamp: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_team_timestamp', ['teamId', 'timestamp'])
    .index('by_timestamp', ['timestamp']),

  //
  // ─── REVENUE SHARE: DAILY REVENUE ──────────────────────────────────────────
  // Track daily protocol revenue for APY calculations
  //
  dailyRevenue: defineTable({
    date: v.string(), // ISO date string (YYYY-MM-DD)
    // Revenue by source (in USDC)
    b2cRevenue: v.number(),
    b2bRevenue: v.number(),
    payaiRevenue: v.number(),
    otherRevenue: v.number(),
    totalRevenue: v.number(),
    // Distribution
    stakerPoolRevenue: v.number(), // Amount allocated to stakers (10% of most sources)
    treasuryRevenue: v.number(), // Amount allocated to treasury
    // Metadata
    verificationCount: v.number(), // Number of paid verifications
    b2bApiCalls: v.number(), // Number of B2B API calls
    timestamp: v.number(),
  })
    .index('by_date', ['date'])
    .index('by_timestamp', ['timestamp']),

  //
  // ─── REVENUE SHARE: APY SNAPSHOTS ──────────────────────────────────────────
  // Daily APY calculations for historical charts
  //
  apySnapshots: defineTable({
    date: v.string(), // ISO date string (YYYY-MM-DD)
    // APY calculations
    apy7Day: v.number(), // 7-day rolling average APY
    apy30Day: v.number(), // 30-day rolling average APY
    apy90Day: v.number(), // 90-day rolling average APY
    // Supporting data
    totalWeightedStake: v.number(), // Total weighted GHOST staked
    totalStakers: v.number(), // Number of active stakers
    last7DaysRevenue: v.number(), // Revenue last 7 days
    last30DaysRevenue: v.number(), // Revenue last 30 days
    last90DaysRevenue: v.number(), // Revenue last 90 days
    // Timestamp
    timestamp: v.number(),
  })
    .index('by_date', ['date'])
    .index('by_timestamp', ['timestamp']),

  //
  // ─── REVENUE SHARE: USER REWARDS ───────────────────────────────────────────
  // Track individual user rewards from revenue sharing
  //
  userRewards: defineTable({
    walletAddress: v.string(),
    // Reward tracking
    pendingRewardsUsdc: v.number(), // Unclaimed rewards
    claimedRewardsUsdc: v.number(), // All-time claimed rewards
    lastClaimAt: v.optional(v.number()),
    // User's staking info (cached for quick lookups)
    currentStake: v.number(), // GHOST tokens staked
    stakingTier: v.number(), // 1-4 (Basic, Verified, Pro, Whale)
    tierMultiplier: v.number(), // 1x, 1.5x, 2x, 3x
    weightedStake: v.number(), // currentStake * tierMultiplier
    shareOfPool: v.number(), // Percentage of total weighted stake
    // Estimated earnings
    estimatedMonthlyUsdc: v.number(), // Based on last 30 days
    estimatedApy: v.number(), // User's personal APY
    // Timestamps
    lastUpdated: v.number(),
  })
    .index('by_wallet', ['walletAddress'])
    .index('by_tier', ['stakingTier'])
    .index('by_last_updated', ['lastUpdated']),

  //
  // ─── REVENUE SHARE: CLAIM HISTORY ──────────────────────────────────────────
  // Historical record of reward claims
  //
  rewardClaims: defineTable({
    walletAddress: v.string(),
    amountUsdc: v.number(),
    transactionSignature: v.string(),
    // Metadata at time of claim
    stakedAmount: v.number(),
    stakingTier: v.number(),
    timestamp: v.number(),
  })
    .index('by_wallet', ['walletAddress'])
    .index('by_wallet_timestamp', ['walletAddress', 'timestamp'])
    .index('by_timestamp', ['timestamp']),
})
