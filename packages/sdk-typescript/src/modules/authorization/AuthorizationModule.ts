/**
 * Authorization Module - ERC-8004 Parity for Agent Pre-Authorization
 *
 * Allows agents to pre-authorize facilitators (e.g., PayAI) to update
 * their reputation a limited number of times before expiration.
 *
 * @module AuthorizationModule
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import type { GhostSpeakClient } from '../../core/GhostSpeakClient.js'
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
  constructor(client: GhostSpeakClient) {
    super(client)
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

      this.logger?.info('Created authorization:', {
        agent: authorization.agentAddress,
        source: authorization.authorizedSource,
        limit: authorization.indexLimit,
        expires: new Date(authorization.expiresAt * 1000).toISOString(),
      })

      return authorization
    } catch (error) {
      this.logger?.error('Failed to create authorization:', error)
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
      // TODO: Implement instruction builder for create_agent_authorization
      // This will be added once Codama generates the instruction types

      this.logger?.info('Storing authorization on-chain:', {
        agent: authorization.agentAddress,
        source: authorization.authorizedSource,
      })

      throw new Error('On-chain storage not yet implemented - pending Codama generation')
    } catch (error) {
      this.logger?.error('Failed to store authorization on-chain:', error)
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

      this.logger?.info('Fetching authorization:', {
        agent: agentAddress,
        source: authorizedSource,
        nonce,
      })

      throw new Error('On-chain fetch not yet implemented - pending Codama generation')
    } catch (error) {
      this.logger?.error('Failed to fetch authorization:', error)
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
   * @param metadata - Optional metadata
   * @param facilitatorSigner - Facilitator's signer
   * @returns Transaction signature
   */
  async updateReputationWithAuth(
    authorization: ReputationAuthorization,
    reputationChange: number,
    transactionSignature: string,
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

      // TODO: Implement instruction builder for update_reputation_with_auth
      // This will be added once Codama generates the instruction types

      this.logger?.info('Updating reputation with authorization:', {
        agent: authorization.agentAddress,
        change: reputationChange,
        remaining: status.remainingUses - 1,
      })

      throw new Error(
        'Reputation update with auth not yet implemented - pending Codama generation'
      )
    } catch (error) {
      this.logger?.error('Failed to update reputation with authorization:', error)
      throw error
    }
  }

  /**
   * Revoke authorization
   *
   * Agent can revoke an authorization before it expires or is exhausted.
   *
   * @param agentAddress - Agent's address
   * @param authorizedSource - Authorized source to revoke
   * @param nonce - Optional nonce (must match creation)
   * @param agentSigner - Agent's signer
   * @returns Transaction signature
   */
  async revokeAuthorization(
    agentAddress: Address,
    authorizedSource: Address,
    nonce: string | undefined,
    agentSigner: TransactionSigner
  ): Promise<string> {
    try {
      // TODO: Implement instruction builder for revoke_authorization
      // This will be added once Codama generates the instruction types

      this.logger?.info('Revoking authorization:', {
        agent: agentAddress,
        source: authorizedSource,
        nonce,
      })

      throw new Error('Authorization revocation not yet implemented - pending Codama generation')
    } catch (error) {
      this.logger?.error('Failed to revoke authorization:', error)
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

      this.logger?.info('Listing authorizations:', filter)

      throw new Error('Authorization listing not yet implemented - pending Codama generation')
    } catch (error) {
      this.logger?.error('Failed to list authorizations:', error)
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
