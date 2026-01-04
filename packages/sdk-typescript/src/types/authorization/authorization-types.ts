/**
 * Agent Authorization System Types
 *
 * GhostSpeak's trustless authorization mechanism for agents to
 * pre-authorize reputation updates with cryptographic signatures.
 *
 * Built for secure, delegated reputation management across protocols.
 */

import type { Address } from '@solana/addresses'

/**
 * Network types supported by GhostSpeak
 */
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

/**
 * Configuration for on-chain authorization storage
 *
 * On-chain storage provides an immutable audit trail for authorizations,
 * but costs ~0.002 SOL in rent. Off-chain storage (default) is free but
 * requires agents to share signed authorizations with facilitators.
 */
export interface OnChainStorageConfig {
  /** Enable on-chain storage (default: false for cost efficiency) */
  enabled: boolean

  /**
   * Storage fee in lamports (default: 0.002 SOL = 2000000 lamports for rent)
   * This covers the account rent exemption cost on Solana
   */
  storageFee?: bigint

  /**
   * Who pays the storage fee
   * - true: Agent pays (stored authorization benefits agent's transparency)
   * - false: Facilitator pays (facilitator wants on-chain proof)
   * Default: true (agent pays for their own authorization storage)
   */
  feePayedByAgent?: boolean

  /**
   * Automatically store on-chain after creation
   * - true: Store immediately (requires funded wallet)
   * - false: Manual storage via storeAuthorizationOnChain()
   * Default: false (manual control)
   */
  autoStore?: boolean

  /**
   * Custom fee structure for different authorization durations
   * Maps duration in seconds to fee in lamports
   * Example: { 2592000: 1000000n } // 30 days = 0.001 SOL
   */
  customFees?: Record<number, bigint>
}

/**
 * Reputation Authorization
 * 
 * Allows an agent to pre-authorize a specific source (e.g., PayAI facilitator)
 * to update their reputation a limited number of times before expiration.
 */
export interface ReputationAuthorization {
  /** Agent's public key (the one granting authorization) */
  agentAddress: Address

  /** Authorized source address (e.g., PayAI facilitator address) */
  authorizedSource: Address

  /** Maximum number of reputation updates allowed */
  indexLimit: number

  /** Unix timestamp when authorization expires */
  expiresAt: number

  /** Solana network this authorization is valid on */
  network: SolanaNetwork

  /** Ed25519 signature (64 bytes) proving agent's intent */
  signature: Uint8Array

  /** Optional nonce to prevent replay attacks */
  nonce?: string

  /** Optional metadata */
  metadata?: AuthorizationMetadata
}

/**
 * Authorization metadata (optional fields)
 */
export interface AuthorizationMetadata {
  /** Human-readable description */
  description?: string

  /** Tags for categorization */
  tags?: string[]

  /** Custom data */
  customData?: Record<string, unknown>

  /** Creation timestamp */
  createdAt?: number

  /** Version of authorization format */
  version?: string
}

/**
 * Authorization Proof
 * 
 * Result of verifying a reputation authorization
 */
export interface AuthorizationProof {
  /** The authorization being verified */
  authorization: ReputationAuthorization

  /** Current index (number of times used) */
  currentIndex: number

  /** Whether the authorization is valid */
  isValid: boolean

  /** Reason if invalid */
  invalidReason?: AuthorizationInvalidReason

  /** Timestamp when verification was performed */
  verifiedAt: number

  /** Verification metadata */
  verificationDetails?: VerificationDetails
}

/**
 * Reasons why an authorization might be invalid
 */
export enum AuthorizationInvalidReason {
  EXPIRED = 'expired',
  INDEX_LIMIT_EXCEEDED = 'index_limit_exceeded',
  INVALID_SIGNATURE = 'invalid_signature',
  NETWORK_MISMATCH = 'network_mismatch',
  REVOKED = 'revoked',
  NOT_YET_VALID = 'not_yet_valid',
  MALFORMED = 'malformed',
}

/**
 * Verification details
 */
export interface VerificationDetails {
  /** Whether signature was verified */
  signatureVerified: boolean

  /** Whether expiration was checked */
  expirationChecked: boolean

  /** Whether index limit was checked */
  indexLimitChecked: boolean

  /** Whether network matched */
  networkMatched: boolean

  /** Additional notes */
  notes?: string[]
}

/**
 * Authorization message to be signed
 * 
 * This message is hashed and signed by the agent's private key
 */
export interface AuthorizationMessage {
  /** Agent granting authorization */
  agentAddress: Address

  /** Source being authorized */
  authorizedSource: Address

  /** Maximum updates allowed */
  indexLimit: number

  /** Expiration timestamp */
  expiresAt: number

  /** Network */
  network: SolanaNetwork

  /** Optional nonce */
  nonce?: string
}

/**
 * Authorization creation parameters
 */
export interface CreateAuthorizationParams {
  /** Authorized source (e.g., PayAI facilitator) */
  authorizedSource: Address

  /** Maximum number of updates (default: 1000) */
  indexLimit?: number

  /** Expiration time in seconds from now (default: 30 days) */
  expiresIn?: number

  /** Specific expiration timestamp (overrides expiresIn) */
  expiresAt?: number

  /** Network (defaults to current cluster) */
  network?: SolanaNetwork

  /** Optional nonce for replay protection */
  nonce?: string

  /** Optional metadata */
  metadata?: AuthorizationMetadata

  /**
   * On-chain storage configuration
   * If not provided, defaults to off-chain (free) storage
   */
  onChainStorage?: OnChainStorageConfig
}

/**
 * Authorization verification parameters
 */
export interface VerifyAuthorizationParams {
  /** Authorization to verify */
  authorization: ReputationAuthorization

  /** Current index (number of times used) */
  currentIndex: number

  /** Whether to check on-chain status (default: false) */
  checkOnChain?: boolean

  /** Expected network (defaults to current cluster) */
  expectedNetwork?: SolanaNetwork
}

/**
 * Authorization update record
 * 
 * Tracks when an authorization was used for a reputation update
 */
export interface AuthorizationUsage {
  /** Authorization ID */
  authorizationId: string

  /** Agent address */
  agentAddress: Address

  /** Authorized source */
  authorizedSource: Address

  /** Index at time of use */
  index: number

  /** Reputation change applied */
  reputationChange: number

  /** Timestamp of usage */
  usedAt: number

  /** Transaction signature (if on-chain) */
  transactionSignature?: string

  /** Usage metadata */
  metadata?: Record<string, unknown>
}

/**
 * Authorization status
 */
export enum AuthorizationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  EXHAUSTED = 'exhausted', // Index limit reached
  REVOKED = 'revoked',
  PENDING = 'pending', // Not yet valid
}

/**
 * Authorization with status
 */
export interface AuthorizationWithStatus extends ReputationAuthorization {
  /** Current status */
  status: AuthorizationStatus

  /** Current usage count */
  currentIndex: number

  /** Remaining uses */
  remainingUses: number

  /** Whether currently valid */
  isValid: boolean

  /** Last used timestamp */
  lastUsedAt?: number

  /** Authorization ID (derived from signature or on-chain account) */
  id: string
}

/**
 * Batch authorization verification result
 */
export interface BatchAuthorizationVerification {
  /** Total authorizations checked */
  total: number

  /** Number of valid authorizations */
  valid: number

  /** Number of invalid authorizations */
  invalid: number

  /** Individual results */
  results: AuthorizationProof[]

  /** Verification timestamp */
  verifiedAt: number
}

/**
 * Authorization revocation
 */
export interface AuthorizationRevocation {
  /** Authorization being revoked */
  authorizationId: string

  /** Agent revoking (must match authorization.agentAddress) */
  agentAddress: Address

  /** Reason for revocation */
  reason?: string

  /** Revocation timestamp */
  revokedAt: number

  /** Signature proving revocation intent */
  signature: Uint8Array

  /** Transaction signature (if on-chain) */
  transactionSignature?: string
}

/**
 * Authorization query filter
 */
export interface AuthorizationFilter {
  /** Filter by agent address */
  agentAddress?: Address

  /** Filter by authorized source */
  authorizedSource?: Address

  /** Filter by status */
  status?: AuthorizationStatus | AuthorizationStatus[]

  /** Filter by network */
  network?: SolanaNetwork

  /** Filter by expiration (before/after timestamp) */
  expiresAfter?: number
  expiresBefore?: number

  /** Filter by creation time */
  createdAfter?: number
  createdBefore?: number

  /** Pagination */
  limit?: number
  offset?: number
}
