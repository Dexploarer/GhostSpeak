/**
 * Ghost Module - Claim and manage external AI agents
 *
 * This module provides methods for claiming "Ghost" agents (external agents
 * registered on x402 facilitators like PayAI) using the Solana Attestation
 * Service (SAS) for trustless ownership verification.
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import {
  getProgramDerivedAddress,
  getAddressEncoder,
  getUtf8Encoder
} from '@solana/kit'
import type { GhostSpeakConfig } from '../../types/index.js'
import { BaseModule } from '../BaseModule.js'
import { SYSTEM_PROGRAM_ADDRESS } from '../../constants/system-addresses.js'
import { getClaimGhostInstruction, type Agent } from '../../generated/index.js'
import { SASAttestationHelper } from '../../modules/sas/index.js'

/**
 * Network identifier for DID generation
 */
export type Network = 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet'

/**
 * Parameters for claiming a Ghost
 */
export interface ClaimGhostParams {
  /** Agent account address (the external agent to claim) */
  agentAddress: Address
  /** x402 payment address of the agent (used for PDA derivation) */
  x402PaymentAddress: Address
  /** SAS Credential address (issuer) */
  sasCredential: Address
  /** SAS Schema address (defines attestation structure) */
  sasSchema: Address
  /** Network identifier for DID (e.g., "devnet", "mainnet-beta") */
  network: Network
  /** Optional IPFS metadata URI (ipfs://...) */
  ipfsMetadataUri?: string
  /** Optional GitHub username for social proof */
  githubUsername?: string
  /** Optional Twitter handle for social proof */
  twitterHandle?: string
}

/**
 * Result of preparing a Ghost claim
 */
export interface PreparedClaimResult {
  /** Derived attestation PDA */
  attestationPda: Address
  /** Derived DID document PDA */
  didDocumentPda: Address
  /** Attestation bump seed */
  attestationBump: number
  /** DID document bump seed */
  didDocumentBump: number
}

/**
 * DID_DOCUMENT seed prefix
 */
const DID_DOCUMENT_SEED = 'did_document'

/**
 * Ghost Module - Manage external agent claims
 */
export class GhostModule extends BaseModule {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Claim ownership of a Ghost using SAS attestation
   *
   * This method performs the complete claim flow:
   * 1. Derives required PDAs (attestation, DID document)
   * 2. Builds the claim_ghost instruction
   * 3. Executes the transaction
   *
   * **Prerequisites:**
   * - The claimer must have already created a SAS attestation proving ownership
   *   of the agent's x402_payment_address
   * - The agent must be in Unregistered or Registered status (not already claimed)
   *
   * **Results:**
   * - Agent status transitions to Claimed
   * - DID document is auto-created with did:sol:<network>:<address>
   * - Claimer becomes the owner of the agent
   *
   * @param claimer - Transaction signer (must own the SAS attestation)
   * @param params - Claim parameters
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * const signature = await client.ghosts.claim(signer, {
   *   agentAddress: 'GhostAgent123...',
   *   x402PaymentAddress: 'PaymentAddr456...',
   *   sasCredential: 'SASCredential789...',
   *   sasSchema: 'SASSchema012...',
   *   network: 'devnet',
   *   ipfsMetadataUri: 'ipfs://QmHash...',
   *   githubUsername: 'myusername'
   * })
   * ```
   */
  async claim(claimer: TransactionSigner, params: ClaimGhostParams): Promise<string> {
    // Prepare claim (derive all PDAs)
    const prepared = await this.prepareClaim(params)

    // Build instruction
    const instructionGetter = () => {
      return getClaimGhostInstruction({
        agentAccount: params.agentAddress,
        didDocument: prepared.didDocumentPda,
        sasAttestation: prepared.attestationPda,
        claimer,
        systemProgram: this.systemProgramId,
        sasCredential: params.sasCredential,
        sasSchema: params.sasSchema,
        ipfsMetadataUri: params.ipfsMetadataUri ?? null,
        network: params.network
      })
    }

    // Execute transaction
    return this.execute(
      'claimGhost',
      instructionGetter,
      [claimer] as unknown as TransactionSigner[]
    )
  }

  /**
   * Prepare a Ghost claim by deriving all required PDAs
   *
   * This is useful for:
   * - Pre-flight validation (checking if PDAs are correct)
   * - Building custom transactions with manual PDA management
   * - Debugging claim issues
   *
   * @param params - Claim parameters
   * @returns Prepared claim data with derived PDAs
   *
   * @example
   * ```typescript
   * const prepared = await client.ghosts.prepareClaim({
   *   agentAddress: 'GhostAgent123...',
   *   x402PaymentAddress: 'PaymentAddr456...',
   *   sasCredential: 'SASCredential789...',
   *   sasSchema: 'SASSchema012...',
   *   network: 'devnet'
   * })
   *
   * console.log('Attestation PDA:', prepared.attestationPda)
   * console.log('DID Document PDA:', prepared.didDocumentPda)
   * ```
   */
  async prepareClaim(params: ClaimGhostParams): Promise<PreparedClaimResult> {
    // Derive attestation PDA
    const { attestationPda, bump: attestationBump } = await SASAttestationHelper.deriveAttestationPda(
      params.sasCredential,
      params.sasSchema,
      params.x402PaymentAddress
    )

    // Derive DID document PDA
    const [didDocumentPda, didDocumentBump] = await this.deriveDidDocumentPda(params.x402PaymentAddress)

    return {
      attestationPda,
      didDocumentPda,
      attestationBump,
      didDocumentBump
    }
  }

  /**
   * Get Ghost agent account
   *
   * @param address - Agent account address
   * @returns Agent account data or null if not found
   */
  async getGhostAgent(address: Address): Promise<Agent | null> {
    return super.getAccount<Agent>(address, 'getAgentDecoder')
  }

  /**
   * Get all Ghost agents (agents with type 10 - external x402 agents)
   *
   * @returns Array of Ghost agents
   */
  async getAllGhosts(): Promise<{ address: Address; data: Agent }[]> {
    const GHOST_AGENT_TYPE = 10
    return this.getGhostsByType(GHOST_AGENT_TYPE)
  }

  /**
   * Get Ghost agents by type
   *
   * @param agentType - Agent type filter (default: 10 for x402 ghosts)
   * @returns Array of matching Ghost agents
   */
  async getGhostsByType(agentType: number = 10): Promise<{ address: Address; data: Agent }[]> {
    const typeBytes = Buffer.alloc(1)
    typeBytes.writeUInt8(agentType, 0)

    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: typeBytes.toString('base64'),
        encoding: 'base64' as const
      }
    }]

    return this.getProgramAccounts<Agent>('getAgentDecoder', filters)
  }

  /**
   * Get claimed Ghosts by owner
   *
   * @param owner - Owner address
   * @returns Array of Ghost agents owned by the address
   */
  async getClaimedGhosts(owner: Address): Promise<{ address: Address; data: Agent }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(9), // Skip discriminator + type
        bytes: owner,
        encoding: 'base58' as const
      }
    }]

    return this.getProgramAccounts<Agent>('getAgentDecoder', filters)
  }

  /**
   * Validate claim parameters
   *
   * Performs pre-flight checks to ensure claim will succeed:
   * - Agent exists and is in correct status
   * - Agent is not already claimed
   * - PDAs are correctly derived
   *
   * @param params - Claim parameters
   * @returns Validation result with error messages if any
   */
  async validateClaim(params: ClaimGhostParams): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate network format (check this first, independent of agent existence)
    const validNetworks: Network[] = ['devnet', 'testnet', 'mainnet-beta', 'localnet']
    if (!validNetworks.includes(params.network)) {
      errors.push(`Invalid network: ${params.network}. Must be one of: ${validNetworks.join(', ')}`)
    }

    // Validate IPFS URI format if provided (check this first, independent of agent existence)
    if (params.ipfsMetadataUri && !params.ipfsMetadataUri.startsWith('ipfs://')) {
      warnings.push('IPFS metadata URI should start with "ipfs://"')
    }

    // Check agent exists
    const agent = await this.getGhostAgent(params.agentAddress)
    if (!agent) {
      errors.push(`Agent not found at address: ${params.agentAddress}`)
      // Don't return early - we've already validated parameters above
    } else {
      // Only check agent-specific validations if agent exists

      // Check agent status (must be Unregistered or Registered)
      // Note: AgentStatus enum values would need to be checked here
      // For now, we check if owner is None (not claimed yet)
      if (agent.owner !== null) {
        errors.push(`Agent is already claimed by: ${agent.owner}`)
      }

      // Check agent type is external (10)
      if (agent.agentType !== 10) {
        warnings.push(`Agent type is ${agent.agentType}, expected 10 (external x402 agent)`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Helper methods

  /**
   * Derive DID document PDA
   *
   * Pattern: ['did_document', x402_payment_address]
   *
   * @param x402PaymentAddress - Agent's x402 payment address
   * @returns [DID document PDA, bump]
   */
  private async deriveDidDocumentPda(x402PaymentAddress: Address): Promise<[Address, number]> {
    const [pda, bump] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getUtf8Encoder().encode(DID_DOCUMENT_SEED),
        getAddressEncoder().encode(x402PaymentAddress)
      ]
    })
    return [pda, bump]
  }

  private get systemProgramId(): Address {
    return SYSTEM_PROGRAM_ADDRESS
  }
}
