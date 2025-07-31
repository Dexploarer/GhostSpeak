import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { getProgramDerivedAddress } from '@solana/addresses'
import type { GhostSpeakConfig } from '../../types/index.js'
import type { IPFSConfig } from '../../types/ipfs-types.js'
import { BaseModule } from '../BaseModule.js'
import { createIPFSUtils } from '../../utils/ipfs-utils.js'
import { SYSTEM_PROGRAM_ADDRESS } from '../../constants/system-addresses.js'
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
    const instructionGetter = async () => {
      const agentAccount = await this.deriveAgentPda(params.agentId, signer.address)
      const userRegistry = await this.deriveUserRegistryPda(signer.address)
      const result = getRegisterAgentInstructionAsync({
        agentAccount,
        userRegistry,
        signer,
        systemProgram: this.systemProgramId,
        agentType: params.agentType,
        metadataUri: params.metadataUri,
        agentId: params.agentId
      })
      return result
    }
    
    // Enable debug mode to get detailed transaction information
    this.debug()
    
    return this.execute(
      'registerAgent',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
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
    const instructionGetter = () => {
      const result = getRegisterAgentCompressedInstructionAsync({
        merkleTree: params.merkleTree,
        signer,
        systemProgram: this.systemProgramId,
        compressionProgram: this.compressionProgramId,
        agentType: params.agentType,
        metadataUri: params.metadataUri,
        agentId: params.agentId
      })
      return result
    }
    
    return this.execute(
      'registerAgentCompressed',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
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
    const instructionGetter = () => {
      const result = getUpdateAgentInstruction({
        agentAccount: params.agentAddress,
        signer,
        metadataUri: params.metadataUri,
        agentType: params.agentType,
        agentId: params.agentId
      })
      return result
    }
    
    return this.execute(
      'updateAgent',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
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
    const instructionGetter = () => {
      const result = getVerifyAgentInstructionAsync({
        agent: params.agentAddress,
        verifier: signer,
        agentPubkey: params.agentPubkey,
        serviceEndpoint: params.serviceEndpoint,
        supportedCapabilities: params.supportedCapabilities,
        verifiedAt: params.verifiedAt
      })
      return result
    }
    
    return this.execute(
      'verifyAgent',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
    )
  }

  /**
   * Deactivate an agent
   */
  async deactivate(signer: TransactionSigner, params: {
    agentAddress: Address
    agentId: string
  }): Promise<string> {
    const instructionGetter = () => {
      const result = getDeactivateAgentInstruction({
        agentAccount: params.agentAddress,
        signer,
        agentId: params.agentId
      })
      return result
    }
    
    return this.execute(
      'deactivateAgent',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
    )
  }

  /**
   * Activate an agent
   */
  async activate(signer: TransactionSigner, params: {
    agentAddress: Address
    agentId: string
  }): Promise<string> {
    const instructionGetter = () => {
      const result = getActivateAgentInstruction({
        agentAccount: params.agentAddress,
        signer,
        agentId: params.agentId
      })
      return result
    }
    
    return this.execute(
      'activateAgent',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
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
        offset: BigInt(8), // Skip discriminator
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
        offset: BigInt(9), // Skip discriminator + type
        bytes: authority,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<Agent>('getAgentDecoder', filters)
  }

  // Helper methods

  private async deriveAgentPda(agentId: string, owner: Address): Promise<Address> {
    // Use the standard PDA utility function that matches Rust implementation
    const { deriveAgentPda } = await import('../../utils/pda.js')
    return deriveAgentPda(this.programId, owner, agentId)
  }

  private async deriveUserRegistryPda(owner: Address): Promise<Address> {
    // Use the standard PDA utility function that matches Rust implementation
    const { deriveUserRegistryPda } = await import('../../utils/pda.js')
    return deriveUserRegistryPda(this.programId, owner)
  }

  private get systemProgramId(): Address {
    return SYSTEM_PROGRAM_ADDRESS
  }

  private get compressionProgramId(): Address {
    return 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK' as Address
  }
}