/**
 * Solana Attestation Service (SAS) Configuration
 *
 * Configuration for GhostSpeak verifiable credentials using Solana's native
 * attestation service instead of enterprise solutions like Crossmint.
 */

import { Address } from 'gill'

/**
 * SAS Program Address on Solana mainnet/devnet
 */
export const SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS =
  '22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG' as Address

/**
 * Network configuration
 */
export const SAS_CONFIG = {
  /**
   * Solana cluster to use
   * - 'mainnet-beta' for production
   * - 'devnet' for testing
   */
  cluster: (process.env.SOLANA_CLUSTER || 'devnet') as 'mainnet-beta' | 'devnet',

  /**
   * RPC endpoint (optional, defaults to public endpoints)
   */
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT,

  /**
   * GhostSpeak credential name (issuing authority)
   */
  credentialName: 'GhostSpeak',

  /**
   * Authority wallet that signs attestations
   * In production, this should be a secure multisig or hardware wallet
   */
  authorityKeypairPath: process.env.SAS_AUTHORITY_KEYPAIR_PATH,

  /**
   * Authorized signers for the credential
   * These are the public keys that can issue attestations
   */
  authorizedSigners: process.env.SAS_AUTHORIZED_SIGNERS?.split(',') || [],
} as const

/**
 * Schema definitions for GhostSpeak credentials
 */
export const SCHEMA_DEFINITIONS = {
  /**
   * Agent Identity Schema
   * Proves agent registration and capabilities
   */
  AGENT_IDENTITY: {
    name: 'AgentIdentityFixed',
    version: 1,
    description: 'Verifiable credential proving agent registration and capabilities',
    /**
     * Layout: [12=string, 12=string, 12=string, 12=string, 10=bool, 12=string, 12=string, 8=i64, 8=i64]
     * Fields: agent, did, name, capabilities, x402Enabled, x402ServiceEndpoint, owner, registeredAt, issuedAt
     *
     * NOTE: Changed capabilities from Vec<String> (type 24/25) to String (type 12)
     * to avoid sas-lib@1.0.10's Vec type mapping bugs. Capabilities are now stored
     * as comma-separated strings (e.g., "trading,analysis,automation").
     *
     * Use parseCapabilities() to convert to array: parseCapabilities("a,b,c") => ["a", "b", "c"]
     * Use serializeCapabilities() to convert from array: serializeCapabilities(["a", "b"]) => "a,b"
     */
    layout: new Uint8Array([12, 12, 12, 12, 10, 12, 12, 8, 8]),
    fieldNames: [
      'agent',
      'did',
      'name',
      'capabilities',
      'x402Enabled',
      'x402ServiceEndpoint',
      'owner',
      'registeredAt',
      'issuedAt',
    ],
  },

  /**
   * Reputation Tier Schema
   * Represents agent reputation level and stats
   */
  REPUTATION_TIER: {
    name: 'ReputationTier',
    version: 1,
    description: 'Agent reputation tier and performance metrics',
    /**
     * Layout: [12=string, 12=string, 0=u8, 8=i64, 8=i64, 8=i64]
     * Fields: agent, tier, score, successfulJobs, totalEarned, lastUpdated
     */
    layout: new Uint8Array([12, 12, 0, 8, 8, 8]),
    fieldNames: ['agent', 'tier', 'score', 'successfulJobs', 'totalEarned', 'lastUpdated'],
  },

  /**
   * Payment Milestone Schema
   * Proof of payment completion
   */
  PAYMENT_MILESTONE: {
    name: 'PaymentMilestone',
    version: 1,
    description: 'Verifiable proof of payment milestone completion',
    /**
     * Layout: [12=string, 12=string, 12=string, 8=i64, 0=u8, 8=i64, 12=string]
     * Fields: jobId, agentId, clientId, amount, milestoneNumber, completedAt, txSignature
     */
    layout: new Uint8Array([12, 12, 12, 8, 0, 8, 12]),
    fieldNames: [
      'jobId',
      'agentId',
      'clientId',
      'amount',
      'milestoneNumber',
      'completedAt',
      'txSignature',
    ],
  },

  /**
   * Verified Staker Schema
   * Proves staking commitment
   */
  VERIFIED_STAKER: {
    name: 'VerifiedStaker',
    version: 1,
    description: 'Verifiable proof of agent staking',
    /**
     * Layout: [12=string, 8=i64, 8=i64, 8=i64, 10=bool]
     * Fields: agent, stakedAmount, lockPeriod, stakedAt, isActive
     */
    layout: new Uint8Array([12, 8, 8, 8, 10]),
    fieldNames: ['agent', 'stakedAmount', 'lockPeriod', 'stakedAt', 'isActive'],
  },

  /**
   * Verified Hire Schema
   * Proof of hiring agreement
   */
  VERIFIED_HIRE: {
    name: 'VerifiedHire',
    version: 1,
    description: 'Verifiable proof of agent hiring and terms',
    /**
     * Layout: [12=string, 12=string, 12=string, 8=i64, 8=i64, 12=string]
     * Fields: jobId, agentId, clientId, startDate, agreedRate, terms
     */
    layout: new Uint8Array([12, 12, 12, 8, 8, 12]),
    fieldNames: ['jobId', 'agentId', 'clientId', 'startDate', 'agreedRate', 'terms'],
  },
} as const

/**
 * Type mapping for field layouts
 * See: https://github.com/solana-foundation/solana-attestation-service
 */
export const FIELD_TYPES = {
  U8: 0,
  I8: 1,
  BOOL: 2,
  U16: 3,
  I16: 4,
  U32: 5,
  I32: 6,
  F32: 7,
  U64: 8,
  I64: 9,
  F64: 10,
  U128: 11,
  STRING: 12,
  ARRAY: 13,
  PUBKEY: 14,
  VEC_STRING: 25, // Array of strings
} as const

/**
 * Default attestation expiry (in days)
 */
export const DEFAULT_EXPIRY_DAYS = {
  AGENT_IDENTITY: 365, // 1 year
  REPUTATION_TIER: 90, // 3 months
  PAYMENT_MILESTONE: 730, // 2 years
  VERIFIED_STAKER: 365, // 1 year
  VERIFIED_HIRE: 365, // 1 year
} as const
