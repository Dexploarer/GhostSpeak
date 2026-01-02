/**
 * Centralized Query Key Factory
 *
 * Provides type-safe, consistent query key generation for all TanStack Query operations.
 * This ensures proper cache invalidation and prevents key collisions.
 *
 * Benefits:
 * - Type safety for query keys
 * - Centralized key management
 * - Easier cache invalidation
 * - Better debugging (all keys in one place)
 * - Prevents key collisions
 */

/**
 * Agent-related query keys
 */
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters?: string) => [...agentKeys.lists(), { filters }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
  reputation: (address: string) => [...agentKeys.all, 'reputation', address] as const,
  metrics: (address: string) => [...agentKeys.all, 'metrics', address] as const,
}

/**
 * Governance-related query keys
 */
export const governanceKeys = {
  all: ['governance'] as const,
  proposals: () => [...governanceKeys.all, 'proposals'] as const,
  proposalList: (filters?: string) => [...governanceKeys.proposals(), { filters }] as const,
  proposal: (address: string) => [...governanceKeys.all, 'proposal', address] as const,
  votes: (proposalAddress: string) => [...governanceKeys.all, 'votes', proposalAddress] as const,
  votingPower: (address: string) => [...governanceKeys.all, 'voting-power', address] as const,
  delegations: (address: string) => [...governanceKeys.all, 'delegations', address] as const,
}

/**
 * Staking-related query keys
 */
export const stakingKeys = {
  all: ['staking'] as const,
  account: (agentAddress: string) => [...stakingKeys.all, 'account', agentAddress] as const,
  history: (agentAddress: string) => [...stakingKeys.all, 'history', agentAddress] as const,
  stats: () => [...stakingKeys.all, 'stats'] as const,
  tier: (agentAddress: string) => [...stakingKeys.all, 'tier', agentAddress] as const,
}

/**
 * Token-related query keys
 */
export const tokenKeys = {
  all: ['tokens'] as const,
  balances: () => [...tokenKeys.all, 'balances'] as const,
  balance: (address: string, mint?: string) =>
    mint
      ? [...tokenKeys.balances(), address, mint] as const
      : [...tokenKeys.balances(), address] as const,
  metadata: (mint: string) => [...tokenKeys.all, 'metadata', mint] as const,
  supportedMetadata: () => [...tokenKeys.all, 'supported-metadata'] as const,
}

/**
 * Credential-related query keys
 */
export const credentialKeys = {
  all: ['credentials'] as const,
  lists: () => [...credentialKeys.all, 'list'] as const,
  list: (address: string) => [...credentialKeys.lists(), address] as const,
  detail: (credentialId: string) => [...credentialKeys.all, 'detail', credentialId] as const,
  verifications: (credentialId: string) =>
    [...credentialKeys.all, 'verifications', credentialId] as const,
}

/**
 * Multisig-related query keys
 */
export const multisigKeys = {
  all: ['multisig'] as const,
  accounts: () => [...multisigKeys.all, 'accounts'] as const,
  account: (address: string) => [...multisigKeys.accounts(), address] as const,
  transactions: (multisigAddress: string) =>
    [...multisigKeys.all, 'transactions', multisigAddress] as const,
  transaction: (multisigAddress: string, transactionIndex: number) =>
    [...multisigKeys.all, 'transaction', multisigAddress, transactionIndex] as const,
}

/**
 * Reputation-related query keys
 */
export const reputationKeys = {
  all: ['reputation'] as const,
  score: (address: string) => [...reputationKeys.all, 'score', address] as const,
  history: (address: string) => [...reputationKeys.all, 'history', address] as const,
  events: (address: string) => [...reputationKeys.all, 'events', address] as const,
  leaderboard: (filters?: string) => [...reputationKeys.all, 'leaderboard', { filters }] as const,
}

/**
 * Privacy-related query keys
 */
export const privacyKeys = {
  all: ['privacy'] as const,
  settings: (agentAddress: string) => [...privacyKeys.all, 'settings', agentAddress] as const,
  accessList: (agentAddress: string) => [...privacyKeys.all, 'access-list', agentAddress] as const,
}

/**
 * Transparency-related query keys
 */
export const transparencyKeys = {
  all: ['transparency'] as const,
  logs: (agentAddress: string) => [...transparencyKeys.all, 'logs', agentAddress] as const,
  auditTrail: (agentAddress: string) => [...transparencyKeys.all, 'audit-trail', agentAddress] as const,
}

/**
 * Analytics-related query keys
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  metrics: (agentAddress: string, timeframe?: string) =>
    timeframe
      ? [...analyticsKeys.all, 'metrics', agentAddress, timeframe] as const
      : [...analyticsKeys.all, 'metrics', agentAddress] as const,
  performance: (agentAddress: string) => [...analyticsKeys.all, 'performance', agentAddress] as const,
  interactions: (agentAddress: string) =>
    [...analyticsKeys.all, 'interactions', agentAddress] as const,
}

/**
 * User-related query keys (Convex)
 */
export const userKeys = {
  all: ['users'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  profile: (address: string) => [...userKeys.all, 'profile', address] as const,
  activity: (address: string) => [...userKeys.all, 'activity', address] as const,
  stats: (address: string) => [...userKeys.all, 'stats', address] as const,
}

/**
 * Ghost Score related query keys
 */
export const ghostScoreKeys = {
  all: ['ghost-score'] as const,
  score: (agentAddress: string) => [...ghostScoreKeys.all, 'score', agentAddress] as const,
  breakdown: (agentAddress: string) => [...ghostScoreKeys.all, 'breakdown', agentAddress] as const,
  verification: (agentAddress: string) =>
    [...ghostScoreKeys.all, 'verification', agentAddress] as const,
}

/**
 * Helper to invalidate all related keys for an agent
 * Useful when an agent undergoes a major state change
 */
export function getAgentRelatedKeys(agentAddress: string) {
  return [
    agentKeys.detail(agentAddress),
    agentKeys.reputation(agentAddress),
    agentKeys.metrics(agentAddress),
    reputationKeys.score(agentAddress),
    reputationKeys.history(agentAddress),
    stakingKeys.account(agentAddress),
    privacyKeys.settings(agentAddress),
    transparencyKeys.logs(agentAddress),
    analyticsKeys.metrics(agentAddress),
    ghostScoreKeys.score(agentAddress),
  ]
}

/**
 * Helper to invalidate all user-related keys
 * Useful when a user's state changes (e.g., wallet connection)
 */
export function getUserRelatedKeys(userAddress: string) {
  return [
    userKeys.profile(userAddress),
    userKeys.activity(userAddress),
    userKeys.stats(userAddress),
    agentKeys.list(), // User's agents might have changed
    credentialKeys.list(userAddress),
  ]
}

/**
 * Type-safe query key utilities
 */
export const queryKeys = {
  agents: agentKeys,
  governance: governanceKeys,
  staking: stakingKeys,
  tokens: tokenKeys,
  credentials: credentialKeys,
  multisig: multisigKeys,
  reputation: reputationKeys,
  privacy: privacyKeys,
  transparency: transparencyKeys,
  analytics: analyticsKeys,
  users: userKeys,
  ghostScore: ghostScoreKeys,
} as const

/**
 * Type helper for query keys
 */
export type QueryKeys = typeof queryKeys
