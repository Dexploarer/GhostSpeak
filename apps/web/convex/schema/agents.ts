/**
 * Agent Management Schema
 * Handles agent discovery, reputation, credentials, and observation
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Reusable validators
const timestampValidator = v.number()
const walletAddressValidator = v.string()

// Agent reputation cache
export const agentReputationCache = defineTable({
  // Agent identity
  agentAddress: walletAddressValidator,
  // Ghost Score metrics
  ghostScore: v.number(),
  tier: v.union(
    v.literal('NEWCOMER'),
    v.literal('BRONZE'),
    v.literal('SILVER'),
    v.literal('GOLD'),
    v.literal('PLATINUM'),
    v.literal('DIAMOND'),
    // Legacy mixed-case variants (for existing data)
    v.literal('Newcomer'),
    v.literal('Bronze'),
    v.literal('Silver'),
    v.literal('Gold'),
    v.literal('Platinum'),
    v.literal('Diamond')
  ),
  // Ghosthunter Score (if agent verifies OTHER agents)
  ghosthunterScore: v.optional(v.number()),
  ghosthunterTier: v.optional(
    v.union(
      v.literal('ROOKIE'),
      v.literal('TRACKER'),
      v.literal('VETERAN'),
      v.literal('ELITE'),
      v.literal('LEGENDARY')
    )
  ),
  verificationsPerformed: v.optional(v.number()),
  // Detailed metrics
  successRate: v.number(),
  avgResponseTime: v.optional(v.number()),
  totalJobs: v.number(),
  disputes: v.number(),
  disputeResolution: v.string(),
  // Payment data
  payaiData: v.optional(
    v.object({
      last30Days: v.object({
        transactions: v.number(),
        volume: v.string(),
        avgAmount: v.string(),
      }),
    })
  ),
  // W3C Credential
  credentialId: v.optional(v.string()),
  // Cache metadata
  lastUpdated: timestampValidator,
  cacheHits: v.number(),
})
  .index('by_address', ['agentAddress'])
  .index('by_tier', ['tier'])
  .index('by_score', ['ghostScore'])
  .index('by_ghosthunter_score', ['ghosthunterScore'])

// Ghost Score history tracking
export const ghostScoreHistory = defineTable({
  agentAddress: walletAddressValidator,
  score: v.number(),
  tier: v.string(),
  breakdown: v.optional(
    v.object({
      paymentActivity: v.optional(v.number()),
      stakingCommitment: v.optional(v.number()),
      credentialVerifications: v.optional(v.number()),
      userReviews: v.optional(v.number()),
      onChainActivity: v.optional(v.number()),
      apiQualityMetrics: v.optional(v.number()),
    })
  ),
  snapshotType: v.union(v.literal('daily'), v.literal('on_change'), v.literal('manual')),
  timestamp: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_agent_timestamp', ['agentAddress', 'timestamp'])
  .index('by_timestamp', ['timestamp'])

// Discovered agents (before claiming)
export const discoveredAgents = defineTable({
  ghostAddress: walletAddressValidator,
  // Discovery metadata
  firstTxSignature: v.string(),
  firstSeenTimestamp: timestampValidator,
  discoverySource: v.string(), // Can be: 'program_logs', 'account_scan', 'x402_payment', 'seed_data', 'manual_registration', etc.
  facilitatorAddress: v.optional(walletAddressValidator),
  slot: v.number(),
  blockTime: v.number(),
  // Network tracking (where agent was discovered)
  discoveryNetwork: v.optional(v.union(v.literal('mainnet-beta'), v.literal('devnet'), v.literal('testnet'))),
  // Network where agent is registered on-chain (GhostSpeak program)
  registrationNetwork: v.optional(v.union(v.literal('mainnet-beta'), v.literal('devnet'), v.literal('testnet'))),
  registrationTxSignature: v.optional(v.string()),
  // Status
  status: v.union(v.literal('discovered'), v.literal('claimed'), v.literal('verified')),
  // Claim tracking
  claimedAt: v.optional(timestampValidator),
  claimedBy: v.optional(walletAddressValidator),
  // Agent details
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  domainUrl: v.optional(v.string()),
  // Services
  x402ServiceEndpoint: v.optional(v.string()),
  x402Enabled: v.optional(v.boolean()),
  x402PricePerCall: v.optional(v.number()),
  x402AcceptedTokens: v.optional(v.array(v.string())),
  // Metadata storage
  metadataFileId: v.optional(v.id('_storage')),
  ipfsCid: v.optional(v.string()),
  ipfsUri: v.optional(v.string()),
  // Timestamps
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
  .index('by_address', ['ghostAddress'])
  .index('by_status', ['status'])
  .index('by_claimed_by', ['claimedBy'])
  .index('by_discovery_source', ['discoverySource'])
  .index('by_facilitator', ['facilitatorAddress'])
  .index('by_first_seen', ['firstSeenTimestamp'])

// External ID mappings
export const externalIdMappings = defineTable({
  ghostAddress: walletAddressValidator,
  platform: v.string(),
  externalId: v.string(),
  verified: v.boolean(),
  verifiedAt: v.optional(timestampValidator),
  discoveredFrom: v.optional(v.string()),
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
  .index('by_ghost', ['ghostAddress'])
  .index('by_platform', ['platform'])
  .index('by_platform_external_id', ['platform', 'externalId'])

// Discovery events audit log
export const discoveryEvents = defineTable({
  eventType: v.string(), // Can be: 'agent_discovered', 'agent_claimed', 'external_id_mapped', 'metadata_updated', etc.
  ghostAddress: v.optional(walletAddressValidator),
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
  timestamp: timestampValidator,
})
  .index('by_event_type', ['eventType'])
  .index('by_ghost', ['ghostAddress'])
  .index('by_timestamp', ['timestamp'])

// Indexer state
export const ghostIndexerState = defineTable({
  stateKey: v.string(),
  value: v.string(),
  network: v.string(), // Can be: 'devnet', 'mainnet-beta', 'solana', etc.
  updatedAt: timestampValidator,
})
  .index('by_state_key', ['stateKey'])
  .index('by_network', ['network'])

// Reviews
export const reviews = defineTable({
  agentAddress: walletAddressValidator,
  userId: v.id('users'),
  rating: v.number(),
  review: v.string(),
  verifiedHire: v.boolean(),
  upvotes: v.number(),
  downvotes: v.number(),
  jobCategory: v.optional(v.string()),
  transactionSignature: v.optional(v.string()),
  timestamp: timestampValidator,
  updatedAt: v.optional(timestampValidator),
})
  .index('by_agent', ['agentAddress'])
  .index('by_user', ['userId'])
  .index('by_agent_timestamp', ['agentAddress', 'timestamp'])

// Review votes
export const reviewVotes = defineTable({
  reviewId: v.id('reviews'),
  userId: v.id('users'),
  vote: v.union(v.literal(1), v.literal(-1)),
  timestamp: timestampValidator,
})
  .index('by_review', ['reviewId'])
  .index('by_user_review', ['userId', 'reviewId'])

// Verifications
export const verifications = defineTable({
  userId: v.id('users'),
  agentAddress: walletAddressValidator,
  ghostScore: v.number(),
  tier: v.string(),
  paymentMethod: v.optional(
    v.union(
      v.literal('free'),
      v.literal('usdc'),
      v.literal('ghost_staked'),
      v.literal('ghost_burned')
    )
  ),
  paymentSignature: v.optional(v.string()),
  timestamp: timestampValidator,
})
  .index('by_user', ['userId'])
  .index('by_agent', ['agentAddress'])
  .index('by_user_timestamp', ['userId', 'timestamp'])

// Historical interactions
export const historicalInteractions = defineTable({
  userWalletAddress: walletAddressValidator,
  userId: v.optional(v.id('users')),
  agentWalletAddress: walletAddressValidator,
  agentId: v.optional(v.id('discoveredAgents')),
  transactionSignature: v.string(),
  amount: v.optional(v.string()),
  facilitatorAddress: walletAddressValidator,
  blockTime: v.number(),
  discoveredAt: timestampValidator,
  discoverySource: v.string(),
  agentKnown: v.boolean(),
  reviewPromptSent: v.optional(v.boolean()),
  reviewPromptSentAt: v.optional(timestampValidator),
})
  .index('by_user_wallet', ['userWalletAddress'])
  .index('by_agent_wallet', ['agentWalletAddress'])
  .index('by_user_agent', ['userWalletAddress', 'agentWalletAddress'])
  .index('by_signature', ['transactionSignature'])
  .index('by_facilitator', ['facilitatorAddress'])
  .index('by_block_time', ['blockTime'])

// Potential developers
export const potentialDevelopers = defineTable({
  walletAddress: walletAddressValidator,
  deployedProgramIds: v.optional(v.array(v.string())),
  authorityOverAgents: v.optional(v.array(v.string())),
  confidence: v.number(),
  confirmedDeveloper: v.boolean(),
  discoveredAt: timestampValidator,
  discoverySource: v.string(),
  lastAnalyzedAt: timestampValidator,
})
  .index('by_wallet', ['walletAddress'])
  .index('by_confidence', ['confidence'])
  .index('by_confirmed', ['confirmedDeveloper'])
