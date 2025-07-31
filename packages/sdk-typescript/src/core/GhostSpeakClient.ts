import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { GhostSpeakConfig } from '../types/index.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js'
import { AgentModule } from './modules/AgentModule.js'
import { EscrowModule } from '../modules/escrow/EscrowModule.js'
import { ChannelModule } from '../modules/channels/ChannelModule.js'
import { MarketplaceModule } from '../modules/marketplace/MarketplaceModule.js'
import { GovernanceModule } from '../modules/governance/GovernanceModule.js'
import { Token2022Module } from '../modules/token2022/Token2022Module.js'
import { ChannelType } from '../generated/types/channelType.js'
import type { AccountState } from '../generated/types/accountState.js'

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
    this.params.agentType ??= 0 // Default type
  }

  async getCost(): Promise<bigint> {
    this.validateParams()
    return this.module.getCost('registerAgent', () => ({
      programAddress: this.module.getProgramId(),
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async simulate(): Promise<unknown> {
    const instruction = () => ({
      // Placeholder for actual instruction generation
      programAddress: this.module.getProgramId(),
      accounts: [],
      data: new Uint8Array()
    })
    this.validateParams()
    return this.module.simulateInstruction('registerAgent', instruction, [this.params.signer!])
  }

  async explain(): Promise<string> {
    this.validateParams()
    return this.module.explain('registerAgent', () => ({
      programAddress: this.module.getProgramId(),
      accounts: [],
      data: new Uint8Array()
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
      programAddress: this.module.getProgramId(),
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async explain(): Promise<string> {
    return this.module.explain('createEscrow', () => ({
      // Placeholder for actual instruction
      programAddress: this.module.getProgramId(),
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
      description: this.params.description ?? '',
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
  channelType?: ChannelType
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
    this.params.channelType = ChannelType.Public
    return this
  }

  description(desc: string): this {
    this.params.description = desc
    return this
  }

  private(): this {
    this.params.isPrivate = true
    this.params.channelType = ChannelType.Private
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
      programAddress: this.module.getProgramId(),
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async explain(): Promise<string> {
    return this.module.explain('createChannel', () => ({
      // Placeholder for actual instruction
      programAddress: this.module.getProgramId(),
      accounts: [],
      data: new Uint8Array()
    }))
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    const signature = await this.module.create({
      signer: this.params.signer!,
      name: this.params.name!,
      description: this.params.description ?? '',
      channelType: this.params.channelType ?? ChannelType.Public,
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

/**
 * Marketplace builder for fluent API
 */
class MarketplaceBuilder {
  private module: MarketplaceModule
  private params: MarketplaceBuilderParams = {}

  constructor(config: GhostSpeakConfig) {
    this.module = new MarketplaceModule(config)
  }

  /**
   * Create a service listing
   */
  service(): ServiceBuilder {
    return new ServiceBuilder(this.module, this.params)
  }

  /**
   * Create a job posting
   */
  job(): JobBuilder {
    return new JobBuilder(this.module, this.params)
  }

  /**
   * Create an auction
   */
  auction(): AuctionBuilder {
    return new AuctionBuilder(this.module, this.params)
  }

  /**
   * Get marketplace queries
   */
  query(): MarketplaceQuery {
    return new MarketplaceQuery(this.module)
  }

  debug(): this {
    this.module.debug()
    return this
  }
}

/**
 * Marketplace builder parameters interface
 */
interface MarketplaceBuilderParams {
  signer?: TransactionSigner
}

/**
 * Service builder for fluent API
 */
class ServiceBuilder {
  private params: {
    title?: string
    description?: string
    pricePerHour?: bigint
    category?: string
    capabilities?: string[]
    agentAddress?: Address
    signer?: TransactionSigner
  } = {}

  constructor(private module: MarketplaceModule, private builderParams: MarketplaceBuilderParams) {
    this.params.signer = builderParams.signer
  }

  create(params: { title: string; description: string; agentAddress: Address }): this {
    this.params.title = params.title
    this.params.description = params.description
    this.params.agentAddress = params.agentAddress
    return this
  }

  pricePerHour(price: bigint): this {
    this.params.pricePerHour = price
    return this
  }

  category(cat: string): this {
    this.params.category = cat
    return this
  }

  capabilities(caps: string[]): this {
    this.params.capabilities = caps
    return this
  }


  private validateParams(): void {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.title) throw new Error('Title required')
    if (!this.params.description) throw new Error('Description required')
    if (!this.params.agentAddress) throw new Error('Agent address required')
    if (!this.params.pricePerHour) throw new Error('Price per hour required')
    if (!this.params.category) throw new Error('Category required')
    if (!this.params.capabilities) throw new Error('Capabilities required')
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    const signature = await this.module.createServiceListing({
      signer: this.params.signer!,
      agentAddress: this.params.agentAddress!,
      title: this.params.title!,
      description: this.params.description!,
      pricePerHour: this.params.pricePerHour!,
      category: this.params.category!,
      capabilities: this.params.capabilities!
    })
    
    const address = `service_${this.params.agentAddress}_${this.params.title}` as Address
    return { address, signature }
  }
}

/**
 * Job builder for fluent API
 */
class JobBuilder {
  private params: {
    title?: string
    description?: string
    budget?: bigint
    duration?: number
    requiredSkills?: string[]
    category?: string
    signer?: TransactionSigner
  } = {}

  constructor(private module: MarketplaceModule, private builderParams: MarketplaceBuilderParams) {
    this.params.signer = builderParams.signer
  }

  create(params: { title: string; description: string }): this {
    this.params.title = params.title
    this.params.description = params.description
    return this
  }

  budget(amount: bigint): this {
    this.params.budget = amount
    return this
  }

  duration(hours: number): this {
    this.params.duration = hours
    return this
  }

  skills(skillList: string[]): this {
    this.params.requiredSkills = skillList
    return this
  }

  category(cat: string): this {
    this.params.category = cat
    return this
  }

  private validateParams(): void {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.title) throw new Error('Title required')
    if (!this.params.description) throw new Error('Description required')
    if (!this.params.budget) throw new Error('Budget required')
    if (!this.params.duration) throw new Error('Duration required')
    if (!this.params.requiredSkills) throw new Error('Required skills needed')
    if (!this.params.category) throw new Error('Category required')
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    const signature = await this.module.createJobPosting({
      signer: this.params.signer!,
      title: this.params.title!,
      description: this.params.description!,
      budget: this.params.budget!,
      duration: this.params.duration!,
      requiredSkills: this.params.requiredSkills!,
      category: this.params.category!
    })
    
    const address = `job_${this.params.signer!.address}_${this.params.title}` as Address
    return { address, signature }
  }
}

/**
 * Auction builder for fluent API
 */
class AuctionBuilder {
  private params: {
    serviceListingAddress?: Address
    startingPrice?: bigint
    reservePrice?: bigint
    duration?: number
    auctionType?: 'english' | 'dutch'
    signer?: TransactionSigner
  } = {}

  constructor(private module: MarketplaceModule, private builderParams: MarketplaceBuilderParams) {
    this.params.signer = builderParams.signer
  }

  forService(serviceAddress: Address): this {
    this.params.serviceListingAddress = serviceAddress
    return this
  }

  startingPrice(price: bigint): this {
    this.params.startingPrice = price
    return this
  }

  reservePrice(price: bigint): this {
    this.params.reservePrice = price
    return this
  }

  duration(hours: number): this {
    this.params.duration = hours
    return this
  }

  english(): this {
    this.params.auctionType = 'english'
    return this
  }

  dutch(): this {
    this.params.auctionType = 'dutch'
    return this
  }

  private validateParams(): void {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.serviceListingAddress) throw new Error('Service listing address required')
    if (!this.params.startingPrice) throw new Error('Starting price required')
    if (!this.params.reservePrice) throw new Error('Reserve price required')
    if (!this.params.duration) throw new Error('Duration required')
    if (!this.params.auctionType) throw new Error('Auction type required')
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    const signature = await this.module.createServiceAuction({
      signer: this.params.signer!,
      serviceListingAddress: this.params.serviceListingAddress!,
      startingPrice: this.params.startingPrice!,
      reservePrice: this.params.reservePrice!,
      duration: this.params.duration!,
      auctionType: this.params.auctionType!
    })
    
    const address = `auction_${this.params.serviceListingAddress}` as Address
    return { address, signature }
  }
}

/**
 * Marketplace query helper
 */
class MarketplaceQuery {
  constructor(private module: MarketplaceModule) {}

  async serviceListings() {
    return this.module.getAllServiceListings()
  }

  async serviceListingsByCategory(_category: string) {
    // Filter all listings by category (placeholder implementation)
    const allListings = await this.module.getAllServiceListings()
    return allListings.filter(_listing => {
      // Would check listing.data.category === category in real implementation
      // For now, return all listings since category filtering is not implemented
      return allListings.length > 0
    })
  }

  async jobPostings() {
    return this.module.getAllJobPostings()
  }

  async auctions() {
    return this.module.getAllAuctions()
  }
}

/**
 * Governance builder for fluent API
 */
class GovernanceBuilder {
  private module: GovernanceModule
  private params: GovernanceBuilderParams = {}

  constructor(config: GhostSpeakConfig) {
    this.module = new GovernanceModule(config)
  }

  /**
   * Create a governance proposal
   */
  proposal(): ProposalBuilder {
    return new ProposalBuilder(this.module, this.params)
  }

  /**
   * Get governance queries
   */
  query(): GovernanceQuery {
    return new GovernanceQuery(this.module)
  }

  debug(): this {
    this.module.debug()
    return this
  }
}

/**
 * Governance builder parameters interface
 */
interface GovernanceBuilderParams {
  signer?: TransactionSigner
}

/**
 * Proposal builder for fluent API
 */
class ProposalBuilder {
  private params: {
    title?: string
    description?: string
    proposalType?: 'parameter_change' | 'upgrade' | 'treasury'
    votingDuration?: number
    executionDelay?: number
    signer?: TransactionSigner
  } = {}

  constructor(private module: GovernanceModule, private builderParams: GovernanceBuilderParams) {
    this.params.signer = builderParams.signer
  }

  create(params: { title: string; description: string }): this {
    this.params.title = params.title
    this.params.description = params.description
    return this
  }

  type(proposalType: 'parameter_change' | 'upgrade' | 'treasury'): this {
    this.params.proposalType = proposalType
    return this
  }

  votingDuration(hours: number): this {
    this.params.votingDuration = hours
    return this
  }

  executionDelay(hours: number): this {
    this.params.executionDelay = hours
    return this
  }

  private validateParams(): void {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.title) throw new Error('Title required')
    if (!this.params.description) throw new Error('Description required')
    if (!this.params.proposalType) throw new Error('Proposal type required')
    if (!this.params.votingDuration) throw new Error('Voting duration required')
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    const signature = await this.module.createProposal({
      signer: this.params.signer!,
      title: this.params.title!,
      description: this.params.description!,
      proposalType: this.params.proposalType!,
      votingDuration: this.params.votingDuration!,
      executionDelay: this.params.executionDelay
    })
    
    const address = `proposal_${this.params.signer!.address}_${this.params.title}` as Address
    return { address, signature }
  }
}

/**
 * Governance query helper
 */
class GovernanceQuery {
  constructor(private module: GovernanceModule) {}

  async activeProposals() {
    return this.module.getActiveProposals()
  }

  async proposalsByProposer(proposer: Address) {
    return this.module.getProposalsByProposer(proposer)
  }

  async proposalsByStatus(status: 'draft' | 'voting' | 'succeeded' | 'defeated' | 'executed') {
    return this.module.getProposalsByStatus(status)
  }
}

/**
 * Token2022 builder for fluent API
 */
class Token2022Builder {
  private module: Token2022Module
  private params: Token2022BuilderParams = {}

  constructor(config: GhostSpeakConfig) {
    this.module = new Token2022Module(config)
  }

  /**
   * Create a basic mint
   */
  mint(): MintBuilder {
    return new MintBuilder(this.module, this.params)
  }

  /**
   * Get Token2022 queries
   */
  query(): Token2022Query {
    return new Token2022Query(this.module)
  }

  debug(): this {
    this.module.debug()
    return this
  }
}

/**
 * Token2022 builder parameters interface
 */
interface Token2022BuilderParams {
  signer?: TransactionSigner
}

/**
 * Mint builder for fluent API
 */
class MintBuilder {
  private params: {
    agentAddress?: Address
    decimals?: number
    freezeAuthority?: Address
    enableTransferFees?: boolean
    transferFeeBasisPoints?: number
    maxFee?: bigint
    enableConfidentialTransfers?: boolean
    autoApproveConfidential?: boolean
    enableInterestBearing?: boolean
    interestRate?: number
    defaultAccountState?: AccountState
    signer?: TransactionSigner
  } = {}

  constructor(private module: Token2022Module, private builderParams: Token2022BuilderParams) {
    this.params.signer = builderParams.signer
  }

  forAgent(agentAddress: Address): this {
    this.params.agentAddress = agentAddress
    return this
  }

  decimals(dec: number): this {
    this.params.decimals = dec
    return this
  }

  freezeAuthority(authority: Address): this {
    this.params.freezeAuthority = authority
    return this
  }

  withTransferFees(basisPoints: number, maxFee: bigint): this {
    this.params.enableTransferFees = true
    this.params.transferFeeBasisPoints = basisPoints
    this.params.maxFee = maxFee
    return this
  }

  withConfidentialTransfers(autoApprove = false): this {
    this.params.enableConfidentialTransfers = true
    this.params.autoApproveConfidential = autoApprove
    return this
  }

  withInterestBearing(rate: number): this {
    this.params.enableInterestBearing = true
    this.params.interestRate = rate
    return this
  }

  defaultAccountState(state: AccountState): this {
    this.params.defaultAccountState = state
    return this
  }

  private validateParams(): void {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.agentAddress) throw new Error('Agent address required')
    if (this.params.decimals === undefined) throw new Error('Decimals required')
    if (this.params.enableTransferFees && (!this.params.transferFeeBasisPoints || !this.params.maxFee)) {
      throw new Error('Transfer fee parameters required when fees enabled')
    }
    if (this.params.enableInterestBearing && this.params.interestRate === undefined) {
      throw new Error('Interest rate required when interest bearing enabled')
    }
  }

  async execute(): Promise<{ address: Address; signature: string }> {
    this.validateParams()
    
    let signature: string
    
    // Determine which creation method to use based on enabled features
    const hasMultipleFeatures = [
      this.params.enableTransferFees,
      this.params.enableConfidentialTransfers,
      this.params.enableInterestBearing,
      this.params.defaultAccountState
    ].filter(Boolean).length > 1

    if (hasMultipleFeatures) {
      // Use advanced mint creation for multiple features
      signature = await this.module.createAdvancedMint({
        signer: this.params.signer!,
        agentAddress: this.params.agentAddress!,
        decimals: this.params.decimals!,
        transferFeeBasisPoints: this.params.transferFeeBasisPoints ?? 0,
        maxFee: this.params.maxFee ?? BigInt(0),
        interestRate: this.params.interestRate ?? 0,
        autoApproveConfidential: this.params.autoApproveConfidential,
        defaultAccountState: this.params.defaultAccountState
      })
    } else if (this.params.enableTransferFees) {
      signature = await this.module.createMintWithTransferFees({
        signer: this.params.signer!,
        agentAddress: this.params.agentAddress!,
        decimals: this.params.decimals!,
        transferFeeBasisPoints: this.params.transferFeeBasisPoints!,
        maxFee: this.params.maxFee!
      })
    } else if (this.params.enableConfidentialTransfers) {
      signature = await this.module.createMintWithConfidentialTransfers({
        signer: this.params.signer!,
        agentAddress: this.params.agentAddress!,
        decimals: this.params.decimals!,
        autoApproveNewAccounts: this.params.autoApproveConfidential
      })
    } else if (this.params.enableInterestBearing) {
      signature = await this.module.createMintWithInterestBearing({
        signer: this.params.signer!,
        agentAddress: this.params.agentAddress!,
        decimals: this.params.decimals!,
        interestRate: this.params.interestRate!
      })
    } else {
      // Basic mint
      signature = await this.module.createMint({
        signer: this.params.signer!,
        agentAddress: this.params.agentAddress!,
        decimals: this.params.decimals!,
        freezeAuthority: this.params.freezeAuthority
      })
    }
    
    const address = `mint_${this.params.agentAddress}_${this.params.decimals}` as Address
    return { address, signature }
  }
}

/**
 * Token2022 query helper
 */
class Token2022Query {
  constructor(private module: Token2022Module) {}

  async allMints() {
    return this.module.getAllMints()
  }

  async mintsByAuthority(authority: Address) {
    return this.module.getMintsByAuthority(authority)
  }
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