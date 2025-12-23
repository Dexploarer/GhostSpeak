import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
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
  getConfigureX402Instruction,
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
    name: string
    description: string
    metadataUri: string
    agentId: string
    skipSimulation?: boolean
  }): Promise<string> {
    const registerGetter = async () => {
      const agentAccount = await this.deriveAgentPda(params.agentId, signer.address)
      const ix = await getRegisterAgentInstructionAsync({
        agentAccount,
        signer,
        systemProgram: this.systemProgramId,
        agentType: params.agentType,
        name: params.name,
        description: params.description,
        metadataUri: params.metadataUri,
        agentId: params.agentId
      })
      
      // DEBUG: Remove UserRegistry account (index 1) to match modified program
      ix.accounts.splice(1, 1);
      
      return ix;
    }

    const heapGetter = () => {
      // Request 64KB Heap (Index 1)
      // ComputeBudgetProgram ID: ComputeBudget111111111111111111111111111111
      const heapData = new Uint8Array(5);
      heapData[0] = 1; // RequestHeapFrame
      new DataView(heapData.buffer).setUint32(1, 256 * 1024, true); // 256KB (Safe margin)

      return {
        programAddress: 'ComputeBudget111111111111111111111111111111' as Address,
        accounts: [],
        data: heapData
      }
    }
    
    // Enable debug mode to get detailed transaction information
    this.debug()
    
    // If skipSimulation is true, call builder directly to bypass simulation
    if (params.skipSimulation) {
      console.log('🚀 SKIPPING SIMULATION - Sending transaction directly')
      return this.builder.executeBatch(
        'registerAgent',
        [heapGetter, registerGetter],
        [signer] as unknown as TransactionSigner[],
        { simulate: false, skipPreflight: true }
      ) as Promise<string>
    }
    
    return this.builder.executeBatch(
      'registerAgent',
      [heapGetter, registerGetter],
      [signer] as unknown as TransactionSigner[]
    ) as Promise<string>
  }

  /**
   * Register a compressed agent (5000x cheaper)
   */
  async registerCompressed(signer: TransactionSigner, params: {
    agentType: number
    name: string
    description: string
    metadataUri: string
    agentId: string
    merkleTree: Address
    treeConfig?: Address
  }): Promise<string> {
    const instructionGetter = async () => {
      // Derive treeConfig if not provided
      const treeConfig = params.treeConfig || await this.deriveTreeConfigPda(signer.address)
      
      const result = await getRegisterAgentCompressedInstructionAsync({
        merkleTree: params.merkleTree,
        treeAuthority: treeConfig, // Map to correct instruction field (it's treeAuthority in IDL?)
        signer,
        systemProgram: this.systemProgramId,
        compressionProgram: this.compressionProgramId,
        agentType: params.agentType,
        name: params.name,
        description: params.description,
        metadataUri: params.metadataUri,
        agentId: params.agentId,
        logWrapper: 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV' as Address // Explicitly provide Noop program
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
    name?: string | null
    description?: string | null
  }): Promise<string> {
    const instructionGetter = () => {
      const result = getUpdateAgentInstruction({
        agentAccount: params.agentAddress,
        signer,
        metadataUri: params.metadataUri,
        agentType: params.agentType,
        agentId: params.agentId,
        name: params.name ?? null,
        description: params.description ?? null
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
    const instructionGetter = async () => {
      const result = await getVerifyAgentInstructionAsync({
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
    const { deriveAgentPdaOriginal } = await import('../../utils/pda.js')
    return deriveAgentPdaOriginal(this.programId, owner, agentId)
  }

  private async deriveUserRegistryPda(owner: Address): Promise<Address> {
    // Use the standard PDA utility function that matches Rust implementation
    const { deriveUserRegistryPda } = await import('../../utils/pda.js')
    return deriveUserRegistryPda(this.programId, owner)
  }

  private async deriveTreeConfigPda(owner: Address): Promise<Address> {
    const { getProgramDerivedAddress, getAddressEncoder } = await import('@solana/addresses')
    const addressEncoder = getAddressEncoder()
    const ownerBytes = addressEncoder.encode(owner)
    
    // seeds = [b"agent_tree_config", signer.key().as_ref()]
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        new TextEncoder().encode('agent_tree_config'),
        ownerBytes
      ]
    })
    
    return pda
  }

  private get systemProgramId(): Address {
    return SYSTEM_PROGRAM_ADDRESS
  }

  private get compressionProgramId(): Address {
    return 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK' as Address
  }
}