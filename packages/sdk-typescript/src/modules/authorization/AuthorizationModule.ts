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
} from '../../types/authorization/authorization-types.js'
import { Keypair } from '@solana/web3.js'

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
    try {
      // Create signed authorization using signature verification utilities
      const authorization = await createSignedAuthorization(params, agentKeypair)

      return authorization
    } catch (error) {
      throw error
    }
  }

  /**
   * Store authorization on-chain (optional)
   *
   * Creates a PDA account storing the authorization for on-chain verification.
   * This allows the smart contract to verify authorization without needing
   * the full signature each time.
   *
   * @param authorization - Authorization to store
   * @param agentSigner - Agent's signer
   * @returns Transaction signature
   */
  async storeAuthorizationOnChain(
    authorization: ReputationAuthorization,
    agentSigner: TransactionSigner
  ): Promise<string> {
    try {
      const { getCreateAgentAuthorizationInstructionAsync } = await import(
        '../../generated/instructions/createAgentAuthorization.js'
      )

      // Use BaseModule's execute method
      return await this.execute(
        'createAgentAuthorization',
        async () => {
          return await getCreateAgentAuthorizationInstructionAsync({
            agent: authorization.agentAddress as Address,
            authority: agentSigner,
            authorizedSource: authorization.authorizedSource as Address,
            indexLimit: BigInt(authorization.indexLimit),
            expiresAt: BigInt(authorization.expiresAt),
            network: authorization.network === 'mainnet-beta' ? 0 : authorization.network === 'devnet' ? 1 : 2,
            signature: authorization.signature,
            // FIXME: Using "default" to match Rust's unwrap_or behavior
            // Codama generates expectSome() which requires a value, not null
            // Rust uses .unwrap_or(&String::from("default"))
            nonce: "default",
          })
        },
        [agentSigner]
      )
    } catch (error) {
      throw error
    }
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
    try {
      // TODO: Implement PDA derivation and account fetch
      // This will be added once Codama generates the account types

      throw new Error('On-chain fetch not yet implemented - pending Codama generation')
    } catch (error) {
      return null
    }
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
    try {
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
    } catch (error) {
      throw error
    }
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
    try {
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
    } catch (error) {
      throw error
    }
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
    try {
      // TODO: Implement getProgramAccounts query with filters
      // This will be added once Codama generates the account types

      throw new Error('Authorization listing not yet implemented - pending Codama generation')
    } catch (error) {
      return []
    }
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
}
