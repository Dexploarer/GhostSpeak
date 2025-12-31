/**
 * Authorization Module - Agent Pre-Authorization System
 *
 * GhostSpeak's trustless system for agents to pre-authorize facilitators
 * (e.g., PayAI) to update their reputation with built-in security limits.
 *
 * @module AuthorizationModule
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import type { GhostSpeakConfig } from '../../types/index.js'
import {
  createSignedAuthorization,
  verifyAuthorizationSignature,
  serializeAuthorization,
  deserializeAuthorization,
  getAuthorizationId,
  isAuthorizationExpired,
  isAuthorizationExhausted,
} from '../../utils/signature-verification.js'
import type {
  ReputationAuthorization,
  CreateAuthorizationParams,
  AuthorizationWithStatus,
  AuthorizationStatus,
  AuthorizationFilter,
  SolanaNetwork,
  OnChainStorageConfig,
} from '../../types/authorization/authorization-types.js'
import { Keypair } from '@solana/web3.js'

/**
 * Default on-chain storage fee (2000000 lamports = 0.002 SOL)
 * This covers rent exemption for the authorization account
 */
const DEFAULT_STORAGE_FEE = 2000000n

/**
 * Authorization Module
 *
 * Manages agent pre-authorizations for reputation updates.
 */
export class AuthorizationModule extends BaseModule {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Create a signed authorization for a facilitator
   *
   * @param params - Authorization parameters
   * @param agentKeypair - Agent's keypair for signing
   * @returns Signed authorization
   *
   * @example
   * ```typescript
   * const authorization = await client.authorization.createAuthorization({
   *   authorizedSource: payAIFacilitatorAddress,
   *   indexLimit: 1000, // Allow 1000 reputation updates
   *   expiresIn: 30 * 24 * 60 * 60, // 30 days
   *   network: 'devnet',
   * }, agentKeypair)
   * ```
   */
  async createAuthorization(
    params: CreateAuthorizationParams,
    agentKeypair: Keypair
  ): Promise<ReputationAuthorization> {
    // Create signed authorization using signature verification utilities
    return await createSignedAuthorization(params, agentKeypair)
  }

  /**
   * Store authorization on-chain (optional, ~0.002 SOL fee)
   *
   * Creates a PDA account storing the authorization for on-chain verification.
   * This provides an immutable audit trail but costs rent (~0.002 SOL).
   *
   * **Cost vs Benefit:**
   * - Off-chain (default): Free, but requires sharing signed authorization
   * - On-chain: ~0.002 SOL, provides transparent audit trail
   *
   * **When to use on-chain storage:**
   * - High-value authorizations where transparency is critical
   * - Compliance/audit requirements
   * - Public agent reputation systems
   *
   * @param authorization - Authorization to store
   * @param agentSigner - Agent's signer (or facilitator if they pay fee)
   * @param config - Optional storage configuration
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * // Default: Agent pays ~0.002 SOL
   * const sig = await client.authorization.storeAuthorizationOnChain(auth, agentSigner)
   *
   * // Custom fee structure
   * const sig = await client.authorization.storeAuthorizationOnChain(auth, agentSigner, {
   *   storageFee: 1500000n, // 0.0015 SOL
   *   feePayedByAgent: false // Facilitator pays
   * })
   * ```
   */
  async storeAuthorizationOnChain(
    authorization: ReputationAuthorization,
    agentSigner: TransactionSigner,
    config?: Partial<OnChainStorageConfig>
  ): Promise<string> {
    // Calculate storage fee based on configuration
    const storageFee = this.calculateStorageFee(authorization, config)
    const feePayedByAgent = config?.feePayedByAgent ?? true

    console.log(`💰 On-chain storage cost: ${Number(storageFee) / 1e9} SOL`)
    console.log(`   Fee payer: ${feePayedByAgent ? 'Agent' : 'Facilitator'}`)

    const { getCreateAgentAuthorizationInstructionAsync } = await import(
      '../../generated/instructions/createAgentAuthorization.js'
    )

    // Manually derive authorization PDA with correct seed encoding
    // Codama's generated code uses size-prefixed seeds which exceed 32-byte limit
    // We need raw bytes matching Rust's .as_bytes() behavior
    const { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder, getUtf8Encoder } = await import('@solana/kit')

    const nonce = authorization.nonce ?? "default"  // Match Rust's unwrap_or("default")
    const [authorizationPda] = await getProgramDerivedAddress({
      programAddress: this.getProgramId(),
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116, 95, 97, 117, 116, 104])), // 'agent_auth'
        getAddressEncoder().encode(authorization.agentAddress as Address),
        getAddressEncoder().encode(authorization.authorizedSource as Address),
        getUtf8Encoder().encode(nonce), // Raw bytes, no size prefix - matches Rust .as_bytes()
      ],
    })

    // Use BaseModule's execute method
    return await this.execute(
      'createAgentAuthorization',
      async () => {
        return await getCreateAgentAuthorizationInstructionAsync({
          agent: authorization.agentAddress as Address,
          authorization: authorizationPda, // Provide manually derived PDA
          authority: agentSigner,
          authorizedSource: authorization.authorizedSource as Address,
          indexLimit: BigInt(authorization.indexLimit),
          expiresAt: BigInt(authorization.expiresAt),
          network: authorization.network === 'mainnet-beta' ? 0 : authorization.network === 'devnet' ? 1 : 2,
          signature: authorization.signature,
          nonce: nonce, // Pass the actual nonce value
        })
      },
      [agentSigner]
    )
  }

  /**
   * Verify authorization signature
   *
   * @param authorization - Authorization to verify
   * @returns True if signature is valid
   *
   * @example
   * ```typescript
   * const isValid = await client.authorization.verifySignature(authorization)
   * if (!isValid) {
   *   throw new Error('Invalid authorization signature')
   * }
   * ```
   */
  async verifySignature(authorization: ReputationAuthorization): Promise<boolean> {
    return verifyAuthorizationSignature(authorization)
  }

  /**
   * Check authorization status (without on-chain call)
   *
   * @param authorization - Authorization to check
   * @param currentIndex - Current usage count (optional, defaults to authorization.currentIndex)
   * @returns Authorization status
   */
  getAuthorizationStatus(
    authorization: ReputationAuthorization,
    currentIndex?: number
  ): {
    status: AuthorizationStatus
    isValid: boolean
    remainingUses: number
    reason?: string
  } {
    const now = Math.floor(Date.now() / 1000)
    const idx = currentIndex ?? 0

    if (isAuthorizationExpired(authorization, now)) {
      return {
        status: 'expired' as AuthorizationStatus,
        isValid: false,
        remainingUses: 0,
        reason: 'Authorization has expired',
      }
    }

    if (isAuthorizationExhausted(authorization, idx)) {
      return {
        status: 'exhausted' as AuthorizationStatus,
        isValid: false,
        remainingUses: 0,
        reason: 'Index limit reached',
      }
    }

    const remaining = authorization.indexLimit - idx

    return {
      status: 'active' as AuthorizationStatus,
      isValid: true,
      remainingUses: remaining,
    }
  }

  /**
   * Fetch authorization from on-chain PDA
   *
   * @param agentAddress - Agent's address
   * @param authorizedSource - Authorized source address
   * @param nonce - Optional nonce (must match creation)
   * @returns Authorization with current on-chain status
   */
  async fetchAuthorization(
    agentAddress: Address,
    authorizedSource: Address,
    nonce?: string
  ): Promise<AuthorizationWithStatus | null> {
    // TODO: Implement PDA derivation and account fetch
    // This will be added once Codama generates the account types

    throw new Error('On-chain fetch not yet implemented - pending Codama generation')
  }

  /**
   * Update reputation using authorization
   *
   * Called by facilitators (e.g., PayAI) to update agent reputation
   * using a pre-signed authorization.
   *
   * @param authorization - Authorization to use
   * @param reputationChange - Reputation change to apply
   * @param transactionSignature - Transaction signature for audit trail
   * @param usageRecord - PDA for usage record (audit trail)
   * @param metadata - Optional metadata
   * @param facilitatorSigner - Facilitator's signer
   * @returns Transaction signature
   */
  async updateReputationWithAuth(
    authorization: ReputationAuthorization,
    reputationChange: number,
    transactionSignature: string,
    usageRecord: Address,
    metadata: Record<string, unknown> | undefined,
    facilitatorSigner: TransactionSigner
  ): Promise<string> {
    // Verify authorization signature first
    const isValid = await this.verifySignature(authorization)
    if (!isValid) {
      throw new Error('Invalid authorization signature')
    }

    // Check authorization status
    const status = this.getAuthorizationStatus(authorization)
    if (!status.isValid) {
      throw new Error(`Authorization is ${status.status}: ${status.reason}`)
    }

    const { getUpdateReputationWithAuthInstructionAsync } = await import(
      '../../generated/instructions/updateReputationWithAuth.js'
    )

    // Use BaseModule's execute method
    return await this.execute(
      'updateReputationWithAuth',
      async () => {
        return await getUpdateReputationWithAuthInstructionAsync({
          agent: authorization.agentAddress as Address,
          authorizedSource: facilitatorSigner,
          usageRecord,
          reputationChange: BigInt(reputationChange),
          transactionSignature,
          metadata: metadata ? JSON.stringify(metadata) : null,
          nonce: authorization.nonce ?? null,
        })
      },
      [facilitatorSigner]
    )
  }

  /**
   * Revoke authorization
   *
   * Agent can revoke an authorization before it expires or is exhausted.
   *
   * @param agentAddress - Agent's address
   * @param authorization - Authorization account PDA
   * @param nonce - Optional nonce (must match creation)
   * @param agentSigner - Agent's signer
   * @returns Transaction signature
   */
  async revokeAuthorization(
    agentAddress: Address,
    authorization: Address,
    nonce: string | undefined,
    agentSigner: TransactionSigner
  ): Promise<string> {
    const { getRevokeAuthorizationInstruction } = await import(
      '../../generated/instructions/revokeAuthorization.js'
    )

    // Use BaseModule's execute method
    return await this.execute(
      'revokeAuthorization',
      () => {
        return getRevokeAuthorizationInstruction({
          agent: agentAddress,
          authorization,
          authority: agentSigner,
          nonce: nonce ?? null,
        })
      },
      [agentSigner]
    )
  }

  /**
   * List authorizations for an agent (filtering)
   *
   * @param filter - Filter criteria
   * @returns List of authorizations
   */
  async listAuthorizations(
    filter: AuthorizationFilter
  ): Promise<AuthorizationWithStatus[]> {
    // TODO: Implement getProgramAccounts query with filters
    // This will be added once Codama generates the account types

    throw new Error('Authorization listing not yet implemented - pending Codama generation')
  }

  /**
   * Serialize authorization for storage/transmission
   *
   * @param authorization - Authorization to serialize
   * @returns JSON-safe object
   */
  serializeAuthorization(authorization: ReputationAuthorization): Record<string, unknown> {
    return serializeAuthorization(authorization)
  }

  /**
   * Deserialize authorization from storage/transmission
   *
   * @param data - Serialized authorization data
   * @returns Authorization object
   */
  deserializeAuthorization(data: Record<string, unknown>): ReputationAuthorization {
    return deserializeAuthorization(data as Parameters<typeof deserializeAuthorization>[0])
  }

  /**
   * Get authorization ID (deterministic hash)
   *
   * @param authorization - Authorization to hash
   * @returns Base58-encoded hash
   */
  async getAuthorizationId(authorization: ReputationAuthorization): Promise<string> {
    return getAuthorizationId(authorization)
  }

  /**
   * Helper: Create authorization for PayAI facilitator
   *
   * Convenience method with sensible defaults for PayAI integration.
   *
   * @param payAIFacilitatorAddress - PayAI facilitator address
   * @param agentKeypair - Agent's keypair
   * @param options - Optional overrides
   * @returns Signed authorization
   *
   * @example
   * ```typescript
   * const auth = await client.authorization.createPayAIAuthorization(
   *   'PayAI...FacilitatorAddress',
   *   agentKeypair,
   *   { indexLimit: 5000 } // Optional overrides
   * )
   * ```
   */
  async createPayAIAuthorization(
    payAIFacilitatorAddress: Address,
    agentKeypair: Keypair,
    options?: Partial<CreateAuthorizationParams>
  ): Promise<ReputationAuthorization> {
    const defaultParams: CreateAuthorizationParams = {
      authorizedSource: payAIFacilitatorAddress,
      indexLimit: 1000, // 1000 reputation updates
      expiresIn: 30 * 24 * 60 * 60, // 30 days
      network: 'devnet' as SolanaNetwork, // TODO: detect from client
      ...options,
    }

    return this.createAuthorization(defaultParams, agentKeypair)
  }

  /**
   * Calculate storage fee based on authorization duration and custom fees
   *
   * @param authorization - Authorization to calculate fee for
   * @param config - Storage configuration
   * @returns Fee in lamports
   *
   * @example
   * ```typescript
   * // Default fee: 0.002 SOL
   * const fee = module.calculateStorageFee(auth)
   *
   * // Custom fee for 30-day authorizations: 0.001 SOL
   * const fee = module.calculateStorageFee(auth, {
   *   customFees: { 2592000: 1000000n } // 30 days = 0.001 SOL
   * })
   * ```
   */
  private calculateStorageFee(
    authorization: ReputationAuthorization,
    config?: Partial<OnChainStorageConfig>
  ): bigint {
    // If custom fee specified, use it
    if (config?.storageFee !== undefined) {
      return config.storageFee
    }

    // If custom fee structure specified, find matching duration
    if (config?.customFees) {
      const now = Math.floor(Date.now() / 1000)
      const duration = authorization.expiresAt - now

      // Find exact match or closest duration
      const durations = Object.keys(config.customFees).map(Number).sort((a, b) => a - b)
      for (const d of durations) {
        if (duration <= d) {
          return config.customFees[d]
        }
      }

      // If duration exceeds all custom tiers, use the highest tier fee
      const highestDuration = durations[durations.length - 1]
      if (highestDuration && config.customFees[highestDuration]) {
        return config.customFees[highestDuration]
      }
    }

    // Default: 0.002 SOL rent exemption
    return DEFAULT_STORAGE_FEE
  }

  /**
   * Estimate on-chain storage cost for an authorization
   *
   * @param params - Authorization parameters
   * @param config - Optional storage configuration
   * @returns Estimated cost in SOL
   *
   * @example
   * ```typescript
   * const costInSOL = await client.authorization.estimateStorageCost({
   *   authorizedSource: facilitatorAddress,
   *   expiresIn: 30 * 24 * 60 * 60 // 30 days
   * })
   * console.log(`On-chain storage will cost ${costInSOL} SOL`)
   * ```
   */
  async estimateStorageCost(
    params: CreateAuthorizationParams,
    config?: Partial<OnChainStorageConfig>
  ): Promise<number> {
    // Create a mock authorization to calculate fee
    const now = Math.floor(Date.now() / 1000)
    const mockAuth: ReputationAuthorization = {
      agentAddress: '11111111111111111111111111111111' as Address, // Placeholder
      authorizedSource: params.authorizedSource,
      indexLimit: params.indexLimit ?? 1000,
      expiresAt: params.expiresAt ?? now + (params.expiresIn ?? 30 * 24 * 60 * 60),
      network: params.network ?? 'devnet',
      signature: new Uint8Array(64),
      nonce: params.nonce
    }

    const feeInLamports = this.calculateStorageFee(mockAuth, config)
    return Number(feeInLamports) / 1e9 // Convert to SOL
  }
}
