import type { Address } from '@solana/addresses'
import type { TransactionSigner, Base58EncodedBytes, Base64EncodedBytes } from '@solana/kit'
import type { GhostSpeakConfig } from '../../types/index.js'
import type { IPFSConfig } from '../../types/ipfs-types.js'
import { BaseModule } from '../BaseModule.js'
import { createIPFSUtils } from '../../utils/ipfs-utils.js'
import {
  getRegisterAgentInstructionAsync,
  getUpdateAgentInstruction,
  getVerifyAgentInstructionAsync,
  getDeactivateAgentInstruction,
  getActivateAgentInstruction,
  getRegisterAgentCompressedInstructionAsync,
  type Agent
} from '../../generated/index.js'

/**
 * Simplified agent management using unified instruction pattern
 */
export class AgentModule extends BaseModule {
  private ipfsUtils: ReturnType<typeof createIPFSUtils> | null = null

  constructor(config: GhostSpeakConfig & { ipfsConfig?: IPFSConfig }) {
    super(config)
    if (config.ipfsConfig) {
      this.ipfsUtils = createIPFSUtils(config.ipfsConfig)
    }
  }

  /**
   * Register a new agent
   */
  async register(signer: TransactionSigner, params: {
    agentType: number
    metadataUri: string
    agentId: string
  }): Promise<string> {
    return this.execute(
      'registerAgent',
      () => getRegisterAgentInstructionAsync({
        agentAccount: this.deriveAgentPda(params.agentId),
        signer,
        systemProgram: this.systemProgramId,
        agentType: params.agentType,
        metadataUri: params.metadataUri,
        agentId: params.agentId
      }),
      [signer]
    )
  }

  /**
   * Register a compressed agent (5000x cheaper)
   */
  async registerCompressed(signer: TransactionSigner, params: {
    agentType: number
    metadataUri: string
    agentId: string
    merkleTree: Address
    treeConfig: Address
  }): Promise<string> {
    return this.execute(
      'registerAgentCompressed',
      () => getRegisterAgentCompressedInstructionAsync({
        merkleTree: params.merkleTree,
        signer,
        systemProgram: this.systemProgramId,
        compressionProgram: this.compressionProgramId,
        agentType: params.agentType,
        metadataUri: params.metadataUri,
        agentId: params.agentId
      }),
      [signer]
    )
  }

  /**
   * Update agent metadata
   */
  async update(signer: TransactionSigner, params: {
    agentAddress: Address
    metadataUri: string
    agentType: number
    agentId: string
  }): Promise<string> {
    return this.execute(
      'updateAgent',
      () => getUpdateAgentInstruction({
        agentAccount: params.agentAddress,
        signer,
        metadataUri: params.metadataUri,
        agentType: params.agentType,
        agentId: params.agentId
      }),
      [signer]
    )
  }

  /**
   * Verify an agent
   */
  async verify(signer: TransactionSigner, params: {
    agentAddress: Address
    agentPubkey: Address
    serviceEndpoint: string
    supportedCapabilities: Array<number | bigint>
    verifiedAt: number | bigint
  }): Promise<string> {
    return this.execute(
      'verifyAgent',
      () => getVerifyAgentInstructionAsync({
        agent: params.agentAddress,
        verifier: signer,
        agentPubkey: params.agentPubkey,
        serviceEndpoint: params.serviceEndpoint,
        supportedCapabilities: params.supportedCapabilities,
        verifiedAt: params.verifiedAt
      }),
      [signer]
    )
  }

  /**
   * Deactivate an agent
   */
  async deactivate(signer: TransactionSigner, params: {
    agentAddress: Address
    agentId: string
  }): Promise<string> {
    return this.execute(
      'deactivateAgent',
      () => getDeactivateAgentInstruction({
        agentAccount: params.agentAddress,
        signer,
        agentId: params.agentId
      }),
      [signer]
    )
  }

  /**
   * Activate an agent
   */
  async activate(signer: TransactionSigner, params: {
    agentAddress: Address
    agentId: string
  }): Promise<string> {
    return this.execute(
      'activateAgent',
      () => getActivateAgentInstruction({
        agentAccount: params.agentAddress,
        signer,
        agentId: params.agentId
      }),
      [signer]
    )
  }

  /**
   * Get agent account
   */
  async getAgentAccount(address: Address): Promise<Agent | null> {
    return super.getAccount<Agent>(address, 'getAgentDecoder')
  }

  /**
   * Get all agents
   */
  async getAllAgents(): Promise<{ address: Address; data: Agent }[]> {
    return this.getProgramAccounts<Agent>('getAgentDecoder')
  }

  /**
   * Get agents by type
   */
  async getAgentsByType(agentType: number): Promise<{ address: Address; data: Agent }[]> {
    const typeBytes = Buffer.alloc(1)
    typeBytes.writeUInt8(agentType, 0)
    
    const filters = [{
      memcmp: {
        offset: 8n, // Skip discriminator
        bytes: typeBytes.toString('base64'),
        encoding: 'base64' as const
      }
    }]
    
    return this.getProgramAccounts<Agent>('getAgentDecoder', filters)
  }

  /**
   * Get user's agents
   */
  async getUserAgents(authority: Address): Promise<{ address: Address; data: Agent }[]> {
    const filters = [{
      memcmp: {
        offset: 9n, // Skip discriminator + type
        bytes: authority,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<Agent>('getAgentDecoder', filters)
  }

  // Helper methods

  private deriveAgentPda(agentId: string): Address {
    // Implementation would derive PDA
    // This is a placeholder - actual implementation would use findProgramAddressSync
    return 'agent_pda_address' as Address
  }

  private get systemProgramId(): Address {
    return '11111111111111111111111111111111' as Address
  }

  private get compressionProgramId(): Address {
    return 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK' as Address
  }
}