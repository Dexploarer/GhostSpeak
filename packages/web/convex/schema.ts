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
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
    // Avatar URL
    avatarUrl: v.optional(v.string()),
    // Auth tracking
    lastLoginAt: v.optional(v.number()),
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
    // Activity streak tracking
    currentStreak: v.optional(v.number()), // Current consecutive days active
    longestStreak: v.optional(v.number()), // All-time longest streak
    lastActivityDate: v.optional(v.string()), // ISO date string (YYYY-MM-DD) of last activity
    // Individual B2B API billing - USDC token account
    usdcTokenAccount: v.optional(v.string()), // User's USDC token account for API payments
    monthlyBudget: v.optional(v.number()), // Monthly USDC budget (optional limit)
    currentBalance: v.optional(v.number()), // Current USDC balance (in micro USDC, 6 decimals)
    lastBillingAt: v.optional(v.number()), // Last billing/sync timestamp
    // Individual B2B API billing - GHOST token account (alternative payment)
    ghostTokenAccount: v.optional(v.string()), // User's GHOST token account for API payments
    currentGhostBalance: v.optional(v.number()), // Current GHOST balance (in micro GHOST, 9 decimals)
    preferredPaymentToken: v.optional(v.string()), // 'usdc' | 'ghost' - user's preferred payment method
    // ─── THREE-TIER REPUTATION SYSTEM ───────────────────────────────────────────
    // Users can be Developers (Ecto Score), Customers (Ghosthunter Score), or both
    // Ghost Score is reserved for AI agents only
    //
    // Ecto Score: For agent developers (people who build/register AI agents)
    // Measures: agents registered, agent performance, developer activity
    ectoScore: v.optional(v.number()), // 0-10,000 scale
    ectoTier: v.optional(v.string()), // 'NOVICE' | 'APPRENTICE' | 'ARTISAN' | 'MASTER' | 'LEGEND'
    ectoScoreLastUpdated: v.optional(v.number()),
    //
    // Ghosthunter Score: For customers (people who hunt for/verify/use agents)
    // Measures: verifications, payments, reviews, platform engagement
    ghosthunterScore: v.optional(v.number()), // 0-10,000 scale
    ghosthunterTier: v.optional(v.string()), // 'ROOKIE' | 'TRACKER' | 'VETERAN' | 'ELITE' | 'LEGENDARY'
    ghosthunterScoreLastUpdated: v.optional(v.number()),
    //
    // Role tracking
    isAgentDeveloper: v.optional(v.boolean()), // true if user has registered agents
    isCustomer: v.optional(v.boolean()), // true if user has verified/used agents
    //
    // ─── ONBOARDING ───────────────────────────────────────────────────────────────
    // Track if user has completed initial onboarding (username selection)
    onboardingCompleted: v.optional(v.boolean()),
    onboardingCompletedAt: v.optional(v.number()),
    //
    // ─── WALLET HISTORY SCORING ───────────────────────────────────────────────────
    // Initial reputation seed from wallet history at signup
    walletAge: v.optional(v.number()), // Wallet age in days (first tx timestamp)
    walletTransactionCount: v.optional(v.number()), // Historical tx count
    walletHistoryScore: v.optional(v.number()), // 0-1000 initial score seed
    walletHistoryAnalyzedAt: v.optional(v.number()), // When we analyzed their wallet
    //
    // Timestamps
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index('by_wallet_address', ['walletAddress'])
    .index('by_email', ['email'])
    .index('by_usdc_account', ['usdcTokenAccount'])
    .index('by_ghost_account', ['ghostTokenAccount'])
    .index('by_ecto_score', ['ectoScore'])
    .index('by_ghosthunter_score', ['ghosthunterScore'])
    .index('by_username', ['username'])
    .index('by_onboarding', ['onboardingCompleted']),

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
    // Metadata (flexible key-value pairs for extensibility)
    metadata: v.optional(v.record(v.string(), v.any())),
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
    payload: v.object({
      event: v.union(
        v.literal('score.updated'),
        v.literal('tier.changed'),
        v.literal('credential.issued'),
        v.literal('staking.created'),
        v.literal('staking.updated')
      ),
      agentAddress: v.string(),
      data: v.union(
        v.object({
          kind: v.literal('score.updated'),
          ghostScore: v.number(),
          tier: v.string(),
          previousScore: v.number(),
          previousTier: v.optional(v.string()),
        }),
        v.object({
          kind: v.literal('tier.changed'),
          tier: v.string(),
          ghostScore: v.number(),
          previousTier: v.string(),
        }),
        v.object({
          kind: v.literal('credential.issued'),
          credentialId: v.string(),
          tier: v.string(),
          milestone: v.number(),
        }),
        v.object({
          kind: v.literal('staking.created'),
          agentAddress: v.string(),
          amountStaked: v.number(),
          stakingTier: v.number(),
          reputationBoostBps: v.number(),
          lockDuration: v.number(),
        }),
        v.object({
          kind: v.literal('staking.updated'),
          agentAddress: v.string(),
          amountStaked: v.number(),
          stakingTier: v.number(),
          reputationBoostBps: v.number(),
          isActive: v.boolean(),
        })
      ),
      timestamp: v.number(),
    }),
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
  // Agents have Ghost Score (their reputation) AND can have Ghosthunter Score
  // (if they verify other agents)
  //
  agentReputationCache: defineTable({
    // Agent identity
    agentAddress: v.string(),
    // Ghost Score metrics (the agent's own reputation)
    ghostScore: v.number(),
    tier: v.string(), // 'NEWCOMER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'
    //
    // Ghosthunter Score (if agent verifies OTHER agents)
    // AI agents can evaluate other AI agents, earning Ghosthunter reputation
    ghosthunterScore: v.optional(v.number()), // 0-10,000 scale
    ghosthunterTier: v.optional(v.string()), // 'ROOKIE' | 'TRACKER' | 'VETERAN' | 'ELITE' | 'LEGENDARY'
    verificationsPerformed: v.optional(v.number()), // How many agents this agent has verified
    //
    // Detailed metrics
    successRate: v.number(),
    avgResponseTime: v.optional(v.number()),
    totalJobs: v.number(),
    disputes: v.number(),
    disputeResolution: v.string(), // '100%', '95%', etc.
    // Payment data (x402 payment history)
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
    .index('by_score', ['ghostScore'])
    .index('by_ghosthunter_score', ['ghosthunterScore']),

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
  // ─── AGENT IDENTITY CREDENTIALS ────────────────────────────────────────────
  // Track agent identity credentials issued on registration
  //
  agentIdentityCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()), // Optional until Crossmint integration
    did: v.string(), // did:sol:network:address
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_credential_id', ['credentialId']),

  //
  // ─── PAYMENT MILESTONE CREDENTIALS ─────────────────────────────────────────
  // Track payment milestone credentials (10/100/1000 payments)
  //
  paymentMilestoneCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()), // Optional until Crossmint integration
    milestone: v.number(), // 10, 100, 1000
    tier: v.string(), // 'Bronze', 'Silver', 'Gold'
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_milestone', ['milestone'])
    .index('by_credential_id', ['credentialId']),

  //
  // ─── STAKING CREDENTIALS ───────────────────────────────────────────────────
  // Track staking verified credentials for GHOST token stakers
  //
  stakingCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()), // Optional until Crossmint integration
    tier: v.string(), // 'Basic', 'Premium', 'Elite'
    stakingTier: v.number(), // 1, 2, 3
    amountStaked: v.number(),
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_tier', ['tier'])
    .index('by_credential_id', ['credentialId']),

  //
  // ─── VERIFIED HIRE CREDENTIALS ─────────────────────────────────────────────
  // Track verified hire credentials from reviews with payment proof
  //
  verifiedHireCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()), // Optional until Crossmint integration
    clientAddress: v.string(),
    rating: v.number(),
    transactionSignature: v.string(),
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_client', ['clientAddress'])
    .index('by_transaction', ['transactionSignature'])
    .index('by_credential_id', ['credentialId']),

  //
  // ─── CAPABILITY VERIFICATION CREDENTIALS ────────────────────────────────────
  // Issued when Caisper observation tests verify claimed capabilities work
  //
  capabilityVerificationCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()),
    // Verified capabilities
    capabilities: v.array(v.string()), // ['research', 'market_data', 'social']
    verificationMethod: v.string(), // 'caisper_observation' | 'manual_review'
    testsRun: v.number(),
    testsPassed: v.number(),
    successRate: v.number(), // 0-100
    // Validity
    validFrom: v.number(),
    validUntil: v.number(), // Expires after 30 days, needs re-verification
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_credential_id', ['credentialId'])
    .index('by_valid_until', ['validUntil']),

  //
  // ─── UPTIME ATTESTATION CREDENTIALS ─────────────────────────────────────────
  // Issued when agent maintains high availability over observation period
  //
  uptimeAttestationCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()),
    // Uptime metrics
    uptimePercentage: v.number(), // 0-100 (e.g., 99.5)
    tier: v.string(), // 'bronze' (95%+), 'silver' (99%+), 'gold' (99.9%+)
    observationPeriodDays: v.number(), // Usually 7 or 30 days
    totalTests: v.number(),
    successfulResponses: v.number(),
    avgResponseTimeMs: v.number(),
    // Validity
    periodStart: v.number(),
    periodEnd: v.number(),
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_credential_id', ['credentialId'])
    .index('by_tier', ['tier']),

  //
  // ─── API QUALITY GRADE CREDENTIALS ──────────────────────────────────────────
  // A/B/C/D/F grades from Caisper daily observation reports
  //
  apiQualityGradeCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()),
    // Grade details
    grade: v.string(), // 'A', 'B', 'C', 'D', 'F'
    gradeScore: v.number(), // 0-100 underlying score
    // Breakdown
    responseQuality: v.number(), // 0-100
    capabilityAccuracy: v.number(), // 0-100 (does what it claims)
    consistency: v.number(), // 0-100 (same input = similar output)
    documentation: v.number(), // 0-100 (clear API docs/errors)
    // Context
    endpointsTested: v.number(),
    reportDate: v.string(), // YYYY-MM-DD
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_credential_id', ['credentialId'])
    .index('by_grade', ['grade'])
    .index('by_date', ['reportDate']),

  //
  // ─── TEE ATTESTATION CREDENTIALS ────────────────────────────────────────────
  // Proves agent runs in Trusted Execution Environment (Intel TDX/SGX, Phala)
  //
  teeAttestationCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()),
    // TEE details
    teeType: v.string(), // 'intel_tdx', 'intel_sgx', 'phala', 'eigencloud'
    teeProvider: v.string(), // 'phala_cloud', 'eigenai', 'self_hosted'
    attestationReport: v.string(), // DCAP attestation report hash
    enclaveId: v.optional(v.string()),
    // Verification
    verifiedBy: v.string(), // 'on_chain_dcap', 'phala_ra', 'manual'
    verificationTxSignature: v.optional(v.string()),
    // Validity
    validFrom: v.number(),
    validUntil: v.number(), // TEE attestations expire
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_credential_id', ['credentialId'])
    .index('by_tee_type', ['teeType'])
    .index('by_valid_until', ['validUntil']),

  //
  // ─── MODEL PROVENANCE CREDENTIALS ───────────────────────────────────────────
  // Documents what LLM/AI model the agent uses (EU AI Act compliance)
  //
  modelProvenanceCredentials: defineTable({
    agentAddress: v.string(),
    credentialId: v.string(),
    crossmintCredentialId: v.optional(v.string()),
    // Model details
    modelName: v.string(), // 'gpt-4', 'claude-3-opus', 'llama-3.1-405b'
    modelProvider: v.string(), // 'openai', 'anthropic', 'meta', 'local'
    modelVersion: v.string(), // 'gpt-4-0125-preview'
    // Parameters (optional, agent-disclosed)
    contextWindow: v.optional(v.number()), // e.g., 128000
    temperature: v.optional(v.number()), // e.g., 0.7
    maxTokens: v.optional(v.number()),
    // Framework
    frameworkName: v.optional(v.string()), // 'elizaos', 'langchain', 'custom'
    frameworkVersion: v.optional(v.string()),
    // Verification
    selfAttested: v.boolean(), // true if agent-provided, not independently verified
    verificationMethod: v.optional(v.string()), // 'api_fingerprinting', 'manual'
    issuedAt: v.number(),
  })
    .index('by_agent', ['agentAddress'])
    .index('by_credential_id', ['credentialId'])
    .index('by_model', ['modelName'])
    .index('by_provider', ['modelProvider']),

  //
  // ─── FAILED CREDENTIAL ISSUANCES ───────────────────────────────────────────
  // Track failed credential issuances for retry
  //
  failedCredentialIssuances: defineTable({
    agentAddress: v.string(),
    credentialType: v.string(), // 'agent_identity', 'reputation_tier', etc.
    payload: v.any(), // Full payload for retry
    error: v.string(),
    retryCount: v.number(),
    maxRetries: v.number(), // Max 5 retries
    status: v.string(), // 'pending', 'retrying', 'succeeded', 'failed'
    lastRetryAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_agent', ['agentAddress'])
    .index('by_type', ['credentialType']),

  //
  // ─── X402 INDEXER: SYNC STATE ──────────────────────────────────────────────
  // Track on-chain polling state for x402 payments
  //
  x402SyncState: defineTable({
    facilitatorAddress: v.string(), // X402 facilitator address
    lastSignature: v.string(), // Last synced transaction signature
    lastSyncAt: v.number(), // Last sync timestamp
    totalSynced: v.number(), // Total payments synced
    errors: v.optional(v.number()), // Sync error count
  }).index('by_facilitator', ['facilitatorAddress']),

  //
  // ─── X402 INDEXER: SYNC EVENTS ─────────────────────────────────────────────
  // Track x402 payment events from dual sources (webhook + on-chain)
  //
  x402SyncEvents: defineTable({
    signature: v.string(), // Transaction signature (on-chain proof)
    facilitatorAddress: v.string(), // X402 facilitator
    merchantAddress: v.string(), // Agent receiving payment
    payerAddress: v.string(), // User sending payment
    amount: v.string(), // Payment amount (BigInt as string)
    success: v.boolean(), // Payment success status
    syncedAt: v.number(), // When event was recorded
    // Dual-source tracking
    sourceWebhook: v.boolean(), // Received via payment webhook
    sourceOnChain: v.boolean(), // Discovered via on-chain polling
  })
    .index('by_signature', ['signature'])
    .index('by_facilitator', ['facilitatorAddress'])
    .index('by_merchant', ['merchantAddress']),

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
  // ─── INDIVIDUAL BILLING: DEDUCTIONS ────────────────────────────────────────
  // Track token deductions from individual user accounts (USDC or GHOST)
  //
  userBillingDeductions: defineTable({
    userId: v.id('users'),
    // Payment token type
    paymentToken: v.string(), // 'usdc' | 'ghost'
    // Amount deducted (in respective token)
    amountMicroUsdc: v.number(), // Amount in micro USDC (6 decimals) - 0 if paid with GHOST
    amountUsdc: v.number(), // Amount in USDC (for display)
    amountMicroGhost: v.optional(v.number()), // Amount in micro GHOST (9 decimals)
    amountGhost: v.optional(v.number()), // Amount in GHOST (for display)
    // Usage info
    requestCount: v.number(),
    endpoint: v.string(),
    // Transaction
    transactionSignature: v.optional(v.string()),
    // Timestamp
    timestamp: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_payment_token', ['paymentToken']),

  //
  // ─── INDIVIDUAL BILLING: DEPOSITS ──────────────────────────────────────────
  // Track token deposits to individual user accounts (USDC or GHOST)
  //
  userBillingDeposits: defineTable({
    userId: v.id('users'),
    // Payment token type
    paymentToken: v.string(), // 'usdc' | 'ghost'
    // Amount deposited (in respective token)
    amountMicroUsdc: v.number(), // Amount in micro USDC (6 decimals) - 0 if depositing GHOST
    amountUsdc: v.number(), // Amount in USDC (for display)
    amountMicroGhost: v.optional(v.number()), // Amount in micro GHOST (9 decimals)
    amountGhost: v.optional(v.number()), // Amount in GHOST (for display)
    // Transaction
    transactionSignature: v.optional(v.string()),
    // Timestamp
    timestamp: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_payment_token', ['paymentToken']),

  //
  // ─── REVENUE SHARE: DAILY REVENUE ──────────────────────────────────────────
  // Track daily protocol revenue for APY calculations and distribution
  //
  dailyRevenue: defineTable({
    date: v.string(), // ISO date string (YYYY-MM-DD)
    // USDC Revenue (micro units, 6 decimals)
    usdcRevenueMicro: v.optional(v.number()), // Total USDC revenue in micro units
    usdcStakerPoolMicro: v.optional(v.number()), // 10% for stakers
    usdcProtocolMicro: v.optional(v.number()), // 90% for protocol
    // GHOST Revenue (micro units, 6 decimals)
    ghostRevenueMicro: v.optional(v.number()), // Total GHOST revenue in micro units
    ghostStakerPoolMicro: v.optional(v.number()), // 10% for stakers
    ghostProtocolMicro: v.optional(v.number()), // 90% for protocol
    // Legacy fields (for backward compatibility)
    b2cRevenue: v.optional(v.number()),
    b2bRevenue: v.optional(v.number()),
    payaiRevenue: v.optional(v.number()),
    otherRevenue: v.optional(v.number()),
    totalRevenue: v.optional(v.number()),
    stakerPoolRevenue: v.optional(v.number()),
    treasuryRevenue: v.optional(v.number()),
    verificationCount: v.optional(v.number()),
    b2bApiCalls: v.optional(v.number()),
    // Metadata
    requestCount: v.optional(v.number()), // Number of billable requests
    lastUpdated: v.optional(v.number()), // Last update timestamp
    timestamp: v.number(),
  })
    .index('by_date', ['date'])
    .index('by_timestamp', ['timestamp']),

  //
  // ─── REVENUE SHARE: ENDPOINT REVENUE ───────────────────────────────────────
  // Track revenue by API endpoint for analytics
  //
  revenueByEndpoint: defineTable({
    endpoint: v.string(), // API endpoint path
    date: v.string(), // ISO date string (YYYY-MM-DD)
    // USDC Revenue (micro units)
    usdcRevenueMicro: v.optional(v.number()),
    // GHOST Revenue (micro units)
    ghostRevenueMicro: v.optional(v.number()),
    // Metadata
    requestCount: v.number(),
    lastUpdated: v.number(),
    timestamp: v.number(),
  })
    .index('by_endpoint', ['endpoint'])
    .index('by_endpoint_date', ['endpoint', 'date'])
    .index('by_date', ['date']),

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

  //
  // ─── SAS: CONFIGURATION ────────────────────────────────────────────────────
  // Solana Attestation Service keypair configuration (workaround for env vars)
  //
  sasConfiguration: defineTable({
    configKey: v.string(), // 'main' - single configuration record
    cluster: v.string(), // 'devnet' | 'mainnet-beta'
    payerKeypair: v.array(v.number()), // Uint8Array as number array
    authorityKeypair: v.array(v.number()),
    authorizedSignerKeypair: v.array(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_config_key', ['configKey']),

  //
  // ─── CAISPER WALLET: CONFIGURATION ──────────────────────────────────────────
  // Wallet used by Caisper for observation testing (x402 payments)
  //
  caisperWallet: defineTable({
    publicKey: v.string(),
    encryptedPrivateKey: v.string(), // We'll store it as a string for now, or array of numbers if we want to mimic SAS
    // Actually, let's stick to the SAS pattern for consistency if it uses array<number>
    secretKey: v.array(v.number()), // Uint8Array as number array - simplest for now for internal tool
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  //
  // ─── GHOST DISCOVERY: DISCOVERED AGENTS ────────────────────────────────────
  // Track agents discovered on-chain (before they claim their identity)
  //
  discoveredAgents: defineTable({
    // Agent identity
    ghostAddress: v.string(),
    // Discovery metadata
    firstTxSignature: v.string(), // First transaction where agent was discovered
    firstSeenTimestamp: v.number(), // When agent was first discovered
    discoverySource: v.string(), // 'program_logs' | 'account_scan' | 'x402_payment'
    facilitatorAddress: v.optional(v.string()), // PayAI or other facilitator
    slot: v.number(), // Solana slot number
    blockTime: v.number(), // Block timestamp
    // Status tracking
    status: v.string(), // 'discovered' | 'claimed' | 'verified'
    // Claim tracking
    claimedAt: v.optional(v.number()),
    claimedBy: v.optional(v.string()), // Wallet address that claimed it
    // Agent Details
    name: v.optional(v.string()), // Display name
    description: v.optional(v.string()), // Short description

    // Services
    x402ServiceEndpoint: v.optional(v.string()), // URL for x402 service if discovered
    x402Enabled: v.optional(v.boolean()),
    x402PricePerCall: v.optional(v.number()), // USDC
    x402AcceptedTokens: v.optional(v.array(v.string())), // List of mint addresses, e.g. USDC

    // Metadata storage (Convex file storage or IPFS)
    metadataFileId: v.optional(v.id('_storage')), // Convex file storage
    ipfsCid: v.optional(v.string()), // IPFS CID (alternative)
    ipfsUri: v.optional(v.string()), // IPFS URI
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_address', ['ghostAddress'])
    .index('by_status', ['status'])
    .index('by_discovery_source', ['discoverySource'])
    .index('by_facilitator', ['facilitatorAddress'])
    .index('by_first_seen', ['firstSeenTimestamp']),

  //
  // ─── GHOST DISCOVERY: EXTERNAL ID MAPPINGS ─────────────────────────────────
  // Cross-platform identity mappings (PayAI, ElizaOS, GitHub, etc.)
  //
  externalIdMappings: defineTable({
    ghostAddress: v.string(),
    platform: v.string(), // 'payai' | 'elizaos' | 'github' | 'twitter' | etc.
    externalId: v.string(), // Platform-specific ID
    verified: v.boolean(), // Whether mapping is verified
    verifiedAt: v.optional(v.number()),
    // Discovery metadata
    discoveredFrom: v.optional(v.string()), // 'x402_payment' | 'manual' | 'claim'
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_ghost', ['ghostAddress'])
    .index('by_platform', ['platform'])
    .index('by_platform_external_id', ['platform', 'externalId']),

  //
  // ─── GHOST DISCOVERY: INDEXER STATE ────────────────────────────────────────
  // Track blockchain indexing progress
  //
  ghostIndexerState: defineTable({
    stateKey: v.string(), // 'last_processed_slot' | 'last_processed_signature' | etc.
    value: v.string(), // State value as string
    network: v.string(), // 'devnet' | 'mainnet-beta'
    updatedAt: v.number(),
  })
    .index('by_state_key', ['stateKey'])
    .index('by_network', ['network']),

  //
  // ─── GHOST DISCOVERY: DISCOVERY EVENTS ─────────────────────────────────────
  // Audit log of agent discoveries
  //
  discoveryEvents: defineTable({
    eventType: v.string(), // 'agent_discovered' | 'agent_claimed' | 'external_id_mapped'
    ghostAddress: v.optional(v.string()),
    data: v.optional(
      v.object({
        signature: v.optional(v.string()),
        slot: v.optional(v.number()),
        blockTime: v.optional(v.number()),
        facilitator: v.optional(v.string()),
        platform: v.optional(v.string()),
        externalId: v.optional(v.string()),
      })
    ),
    timestamp: v.number(),
  })
    .index('by_event_type', ['eventType'])
    .index('by_ghost', ['ghostAddress'])
    .index('by_timestamp', ['timestamp']),

  //
  // ─── CASPER AI AGENT: CHAT MESSAGES ────────────────────────────────────────
  // Chat messages with Casper agent for credential verification
  //
  agentMessages: defineTable({
    userId: v.id('users'),
    role: v.string(), // 'user' | 'agent'
    content: v.string(),
    // Optional action/metadata from agent response
    actionTriggered: v.optional(v.string()), // Action name if an action was triggered
    metadata: v.optional(v.any()), // Additional metadata from agent
    // Timestamp
    timestamp: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_timestamp', ['userId', 'timestamp']),

  //
  // ─── HISTORICAL USER-AGENT INTERACTIONS ────────────────────────────────────
  // Track x402 payments discovered during wallet history analysis
  // Used for: Ghosthunter score calculation, agent discovery, review prompts
  //
  historicalInteractions: defineTable({
    // User who made the payment
    userWalletAddress: v.string(),
    userId: v.optional(v.id('users')), // May not exist yet at discovery time
    // Agent who received the payment
    agentWalletAddress: v.string(),
    agentId: v.optional(v.id('discoveredAgents')), // Links when agent is discovered/claimed
    // Payment details
    transactionSignature: v.string(),
    amount: v.optional(v.string()), // BigInt as string
    facilitatorAddress: v.string(), // x402 facilitator
    blockTime: v.number(), // Unix timestamp from chain
    // Discovery metadata
    discoveredAt: v.number(), // When we found this interaction
    discoverySource: v.string(), // 'wallet_onboarding' | 'x402_indexer' | 'manual'
    // Status tracking
    agentKnown: v.boolean(), // Was agent already in our system when discovered?
    reviewPromptSent: v.optional(v.boolean()), // Have we prompted for review?
    reviewPromptSentAt: v.optional(v.number()),
  })
    .index('by_user_wallet', ['userWalletAddress'])
    .index('by_agent_wallet', ['agentWalletAddress'])
    .index('by_user_agent', ['userWalletAddress', 'agentWalletAddress'])
    .index('by_signature', ['transactionSignature'])
    .index('by_facilitator', ['facilitatorAddress'])
    .index('by_block_time', ['blockTime']),

  //
  // ─── POTENTIAL AGENT DEVELOPERS ────────────────────────────────────────────
  // Track wallets that appear to be agent developers based on on-chain activity
  // (e.g., deployed programs, authority over multiple agent accounts)
  //
  potentialDevelopers: defineTable({
    walletAddress: v.string(),
    // Evidence of developer activity
    deployedProgramIds: v.optional(v.array(v.string())), // Programs they deployed
    authorityOverAgents: v.optional(v.array(v.string())), // Agent wallets they control
    // Confidence and status
    confidence: v.number(), // 0-100 confidence score
    confirmedDeveloper: v.boolean(), // Has claimed agents on platform
    // Discovery
    discoveredAt: v.number(),
    discoverySource: v.string(), // 'wallet_onboarding' | 'chain_analysis'
    lastAnalyzedAt: v.number(),
  })
    .index('by_wallet', ['walletAddress'])
    .index('by_confidence', ['confidence'])
    .index('by_confirmed', ['confirmedDeveloper']),

  //
  // ─── AGENT OBSERVATION SYSTEM ─────────────────────────────────────────────────
  // Caisper tests x402 endpoints to verify agent capabilities and build trust scores
  //

  // Endpoints being monitored for testing
  observedEndpoints: defineTable({
    agentAddress: v.string(), // Solana wallet of the agent
    baseUrl: v.string(), // e.g., "api.syraa.fun"
    endpoint: v.string(), // Full URL
    method: v.string(), // 'GET' | 'POST'
    priceUsdc: v.number(), // Cost per call in USDC
    description: v.string(), // Claimed capability
    category: v.string(), // 'research' | 'market_data' | 'social' | 'utility' | 'other'
    isActive: v.boolean(), // Currently being tested
    addedAt: v.number(),
    lastTestedAt: v.optional(v.number()),
    // Aggregated stats (updated after each test)
    totalTests: v.optional(v.number()),
    successfulTests: v.optional(v.number()),
    avgResponseTimeMs: v.optional(v.number()),
    avgQualityScore: v.optional(v.number()), // 0-100
  })
    .index('by_agent', ['agentAddress'])
    .index('by_active', ['isActive'])
    .index('by_category', ['category'])
    .index('by_price', ['priceUsdc'])
    .index('by_last_tested', ['lastTestedAt']),

  // Individual test results
  endpointTests: defineTable({
    endpointId: v.id('observedEndpoints'),
    agentAddress: v.string(),
    testedAt: v.number(),
    // Request details
    requestPayload: v.optional(v.string()), // JSON stringified
    paymentSignature: v.optional(v.string()), // x402 payment tx
    paymentAmountUsdc: v.number(),
    // Response details
    responseStatus: v.number(), // HTTP status code
    responseTimeMs: v.number(),
    responseBody: v.optional(v.string()), // Truncated/summarized (max 10KB)
    responseError: v.optional(v.string()), // Error message if failed
    // Judgment from Caisper
    success: v.boolean(), // Did the request succeed?
    capabilityVerified: v.boolean(), // Did it do what it claimed?
    qualityScore: v.number(), // 0-100 from Caisper judgment
    issues: v.optional(v.array(v.string())), // Problems found
    caisperNotes: v.string(), // AI judgment notes

    // Full trace/transcript for UI
    transcript: v.optional(
      v.array(
        v.object({
          role: v.string(), // 'user' (Caisper) | 'agent' | 'system'
          content: v.string(),
          isToolCall: v.optional(v.boolean()),
          toolName: v.optional(v.string()),
          toolArgs: v.optional(v.string()), // JSON stringified
          timestamp: v.number(),
        })
      )
    ),

    // Voting fields
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
  })
    .index('by_endpoint', ['endpointId'])
    .index('by_agent', ['agentAddress'])
    .index('by_tested_at', ['testedAt'])
    .index('by_success', ['success'])
    .index('by_quality', ['qualityScore']),

  //
  // ─── OBSERVATION VOTES ──────────────────────────────────────────────────────
  // User votes on observation results
  //
  observationVotes: defineTable({
    observationId: v.id('endpointTests'),
    userId: v.id('users'),
    voteType: v.string(), // 'upvote' | 'downvote'
    timestamp: v.number(),
  })
    .index('by_observation', ['observationId'])
    .index('by_user', ['userId'])
    .index('by_user_observation', ['userId', 'observationId']),

  // Daily compiled observation reports per agent
  dailyObservationReports: defineTable({
    date: v.string(), // YYYY-MM-DD format
    agentAddress: v.string(),
    // Aggregated metrics
    testsRun: v.number(),
    testsSucceeded: v.number(),
    avgResponseTimeMs: v.number(),
    avgQualityScore: v.number(), // 0-100
    totalSpentUsdc: v.number(),
    // Capability verification
    claimedCapabilities: v.array(v.string()),
    verifiedCapabilities: v.array(v.string()),
    failedCapabilities: v.array(v.string()),
    // Final judgment
    overallGrade: v.string(), // 'A' | 'B' | 'C' | 'D' | 'F'
    trustworthiness: v.number(), // 0-100
    recommendation: v.string(), // Caisper's summary
    // Fraud signals
    fraudSignals: v.array(v.string()),
    fraudRiskScore: v.number(), // 0-100
    // Timestamps
    compiledAt: v.number(),
  })
    .index('by_date', ['date'])
    .index('by_agent', ['agentAddress'])
    .index('by_agent_date', ['agentAddress', 'date'])
    .index('by_grade', ['overallGrade'])
    .index('by_fraud_risk', ['fraudRiskScore']),

  // Fraud detection signals
  fraudSignals: defineTable({
    agentAddress: v.string(),
    signalType: v.string(), // 'fake_reviews' | 'spam_activity' | 'capability_mismatch' | 'response_inconsistency'
    severity: v.string(), // 'low' | 'medium' | 'high' | 'critical'
    evidence: v.string(), // Description of what was detected
    detectedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolution: v.optional(v.string()), // How it was resolved
  })
    .index('by_agent', ['agentAddress'])
    .index('by_type', ['signalType'])
    .index('by_severity', ['severity'])
    .index('by_unresolved', ['resolvedAt']),
})
