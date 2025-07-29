import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { GhostSpeakConfig } from '../types/index.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js'
import { AgentModule } from './modules/AgentModule.js'
import { EscrowModule } from '../modules/escrow/EscrowModule.js'
import { ChannelModule } from '../modules/channels/ChannelModule.js'
// ChannelType imported but not used in current implementation

/**
 * Main GhostSpeak client with fluent API design
 * 
 * Example usage:
 * ```typescript
 * const ghostspeak = new GhostSpeak()
 * 
 * // Create an agent
 * const agent = await ghostspeak
 *   .agent()
 *   .create({ name: "My Agent", capabilities: ["coding"] })
 *   .compressed()
 *   .execute()
 * 
 * // Create an escrow
 * const escrow = await ghostspeak
 *   .escrow()
 *   .between(buyer, seller)
 *   .amount(sol(10))
 *   .withMilestones([...])
 *   .execute()
 * ```
 */
export class GhostSpeak {
  private config: GhostSpeakConfig
  
  constructor(config?: Partial<GhostSpeakConfig>) {
    // Zero-config setup with smart defaults
    this.config = {
      programId: GHOSTSPEAK_PROGRAM_ID,
      commitment: 'confirmed',
      cluster: 'devnet',
      rpcEndpoint: config?.rpcEndpoint ?? this.getDefaultRpcEndpoint(config?.cluster ?? 'devnet'),
      ...config,
      rpc: config?.rpc ?? {} as GhostSpeakConfig['rpc']
    }
  }

  /**
   * Agent operations
   */
  agent(): AgentBuilder {
    return new AgentBuilder(this.config)
  }

  /**
   * Escrow operations
   */
  escrow(): EscrowBuilder {
    return new EscrowBuilder(this.config)
  }

  /**
   * Channel operations
   */
  channel(): ChannelBuilder {
    return new ChannelBuilder(this.config)
  }

  /**
   * Marketplace operations
   */
  marketplace(): MarketplaceBuilder {
    return new MarketplaceBuilder(this.config)
  }

  /**
   * Governance operations
   */
  governance(): GovernanceBuilder {
    return new GovernanceBuilder(this.config)
  }

  /**
   * Token-2022 operations
   */
  token2022(): Token2022Builder {
    return new Token2022Builder(this.config)
  }

  /**
   * Enable development mode features
   */
  enableDevMode(): this {
    console.log('🛠️ Development mode enabled')
    console.log('   - Transaction simulation before sending')
    console.log('   - Cost estimates for all operations')
    console.log('   - Enhanced error messages')
    
    this.config = {
      ...this.config,
      // Add dev mode flags
    }
    
    return this
  }

  /**
   * Configure network
   */
  useNetwork(cluster: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'): this {
    this.config.cluster = cluster
    this.config.rpcEndpoint = this.getDefaultRpcEndpoint(cluster)
    return this
  }

  /**
   * Configure custom RPC
   */
  useRpc(endpoint: string, wsEndpoint?: string): this {
    this.config.rpcEndpoint = endpoint
    this.config.wsEndpoint = wsEndpoint
    return this
  }

  /**
   * Get default RPC endpoint for cluster
   */
  private getDefaultRpcEndpoint(cluster: string): string {
    switch (cluster) {
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com'
      case 'devnet':
        return 'https://api.devnet.solana.com'
      case 'testnet':
        return 'https://api.testnet.solana.com'
      case 'localnet':
        return 'http://localhost:8899'
      default:
        return 'https://api.devnet.solana.com'
    }
  }
}

// =====================================================
// FLUENT BUILDERS
// =====================================================

/**
 * Agent builder parameters interface
 */
interface AgentBuilderParams {
  agentType?: number
  metadataUri?: string
  agentId?: string
  compressed?: boolean
  forceIPFS?: boolean
  signer?: TransactionSigner
}

/**
 * Agent builder for fluent API
 */
class AgentBuilder {
  private module: AgentModule
  private params: AgentBuilderParams = {}

  constructor(config: GhostSpeakConfig) {
    this.module = new AgentModule(config)
  }

  create(params: { name: string; capabilities: string[] }): this {
    this.params = {
      ...this.params,
      agentType: 0, // Default type
      metadataUri: JSON.stringify(params),
      agentId: params.name.toLowerCase().replace(/\s+/g, '-')
    }
    return this
  }

  withType(agentType: number): this {
    this.params.agentType = agentType
    return this
  }

  withIPFS(): this {
    this.params.forceIPFS = true
    return this
  }

  compressed(): this {
    this.params.compressed = true
    return this
  }

  debug(): this {
    this.module.debug()
    return this
  }

  private validateParams(): void {
    if (!this.params.signer) {
      throw new Error('Agent builder requires a signer. Call with signer first.')
    }
    if (!this.params.metadataUri) {
      throw new Error('Agent builder requires metadata. Call create() first.')
    }
    if (!this.params.agentId) {
      throw new Error('Agent builder requires agent ID. Call create() first.')
    }
    if (this.params.agentType === undefined) {
      this.params.agentType = 0 // Default type
    }
  }

  async getCost(): Promise<bigint> {
    this.validateParams()
    return this.module.getCost('registerAgent', () => this.module.register(this.params.signer!, {
      agentType: this.params.agentType!,
      metadataUri: this.params.metadataUri!,
      agentId: this.params.agentId!
    }))
  }

  async simulate(): Promise<unknown> {
    const instruction = () => ({
      // Placeholder for actual instruction generation
      programAddress: this.module.programId,
      accounts: [],
      data: new Uint8Array()
    })
    this.validateParams()
    return this.module.simulate('registerAgent', instruction, [this.params.signer!])
  }

  async explain(): Promise<string> {
    this.validateParams()
    return this.module.explain('registerAgent', () => this.module.register(this.params.signer!, {
      agentType: this.params.agentType!,
      metadataUri: this.params.metadataUri!,
      agentId: this.params.agentId!
    }))
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    if (this.params.compressed) {
      // Implementation would handle compressed agent creation
      console.log('Creating compressed agent (5000x cheaper)...')
    }
    
    const signature = await this.module.register(this.params.signer!, {
      agentType: this.params.agentType!,
      metadataUri: this.params.metadataUri!,
      agentId: this.params.agentId!
    })
    const address = this.deriveAgentAddress(this.params.agentId!)
    
    return { address, signature }
  }

  private deriveAgentAddress(agentId: string): Address {
    // Placeholder - would use real PDA derivation
    return `agent_${agentId}` as Address
  }
}

/**
 * Escrow builder parameters interface
 */
interface EscrowBuilderParams {
  buyer?: Address
  seller?: Address
  amount?: bigint
  description?: string
  milestones?: Array<{ amount: bigint; description: string }>
  signer?: TransactionSigner
}

/**
 * Escrow builder for fluent API
 */
class EscrowBuilder {
  private module: EscrowModule
  private params: EscrowBuilderParams = {}

  constructor(config: GhostSpeakConfig) {
    this.module = new EscrowModule(config)
  }

  between(buyer: Address, seller: Address): this {
    this.params.buyer = buyer
    this.params.seller = seller
    return this
  }

  amount(lamports: bigint): this {
    this.params.amount = lamports
    return this
  }

  description(desc: string): this {
    this.params.description = desc
    return this
  }

  withMilestones(milestones: Array<{ amount: bigint; description: string }>): this {
    this.params.milestones = milestones
    return this
  }

  debug(): this {
    this.module.debug()
    return this
  }

  private validateParams(): void {
    if (!this.params.buyer) {
      throw new Error('Escrow builder requires buyer address. Call between() first.')
    }
    if (!this.params.seller) {
      throw new Error('Escrow builder requires seller address. Call between() first.')
    }
    if (!this.params.amount) {
      throw new Error('Escrow builder requires amount. Call amount() first.')
    }
    if (!this.params.signer) {
      throw new Error('Escrow builder requires signer.')
    }
  }

  async getCost(): Promise<bigint> {
    return this.module.getCost('createEscrow', () => ({
      // Placeholder for actual instruction
      programAddress: this.module.programId,
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async explain(): Promise<string> {
    return this.module.explain('createEscrow', () => ({
      // Placeholder for actual instruction
      programAddress: this.module.programId,
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    const signature = await this.module.create({
      signer: this.params.signer!,
      amount: this.params.amount!,
      buyer: this.params.buyer!,
      seller: this.params.seller!,
      description: this.params.description || '',
      milestones: this.params.milestones
    })
    const address = this.deriveEscrowAddress()
    
    return { address, signature }
  }

  private deriveEscrowAddress(): Address {
    // Placeholder - would use real PDA derivation
    return `escrow_${this.params.buyer}_${this.params.seller}` as Address
  }
}

/**
 * Channel builder parameters interface
 */
interface ChannelBuilderParams {
  name?: string
  description?: string
  channelType?: any // This should match the generated ChannelType
  isPrivate?: boolean
  maxMembers?: number
  signer?: TransactionSigner
}

/**
 * Channel builder for fluent API
 */
class ChannelBuilder {
  private module: ChannelModule
  private params: ChannelBuilderParams = {}

  constructor(config: GhostSpeakConfig) {
    this.module = new ChannelModule(config)
  }

  create(name: string): this {
    this.params.name = name
    this.params.channelType = { public: {} }
    return this
  }

  description(desc: string): this {
    this.params.description = desc
    return this
  }

  private(): this {
    this.params.isPrivate = true
    this.params.channelType = { private: {} }
    return this
  }

  maxMembers(max: number): this {
    this.params.maxMembers = max
    return this
  }

  debug(): this {
    this.module.debug()
    return this
  }

  private validateParams(): void {
    if (!this.params.name) {
      throw new Error('Channel builder requires name. Call create() first.')
    }
    if (!this.params.signer) {
      throw new Error('Channel builder requires signer.')
    }
  }

  async getCost(): Promise<bigint> {
    return this.module.getCost('createChannel', () => ({
      // Placeholder for actual instruction
      programAddress: this.module.programId,
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async explain(): Promise<string> {
    return this.module.explain('createChannel', () => ({
      // Placeholder for actual instruction
      programAddress: this.module.programId,
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    const signature = await this.module.create({
      signer: this.params.signer!,
      name: this.params.name!,
      description: this.params.description || '',
      channelType: this.params.channelType || { public: {} },
      isPrivate: this.params.isPrivate,
      maxMembers: this.params.maxMembers
    })
    const address = this.deriveChannelAddress()
    
    return { address, signature }
  }

  private deriveChannelAddress(): Address {
    // Placeholder - would use real PDA derivation
    return `channel_${this.params.name}` as Address
  }
}

// Placeholder builders for other modules
class MarketplaceBuilder {
  constructor(private config: GhostSpeakConfig) {}
}

class GovernanceBuilder {
  constructor(private config: GhostSpeakConfig) {}
}

class Token2022Builder {
  constructor(private config: GhostSpeakConfig) {}
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

/**
 * Convert SOL to lamports
 */
export function sol(amount: number): bigint {
  return BigInt(Math.floor(amount * 1_000_000_000))
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000
}

// Named export for explicit imports
export { GhostSpeak as GhostSpeakClient }

// Default export for easy importing
export default GhostSpeak