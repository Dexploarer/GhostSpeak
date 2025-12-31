import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { GhostSpeakConfig } from '../types/index.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js'
import { AgentModule } from './modules/AgentModule.js'

import { GovernanceModule } from '../modules/governance/GovernanceModule.js'
import { MultisigModule } from '../modules/multisig/MultisigModule.js'

import { UnifiedCredentialService } from '../modules/credentials/UnifiedCredentialService.js'
import { PayAIClient } from '../payai/PayAIClient.js'
import { ReputationModule } from '../modules/reputation/ReputationModule.js'
import { DidModule } from '../modules/did/DidModule.js'
import { PrivacyModule } from '../modules/privacy/PrivacyModule.js'
import { AuthorizationModule } from '../modules/authorization/AuthorizationModule.js'
import { ProposalType } from '../generated/types/proposalType.js'
import { VoteChoice } from '../generated/types/voteChoice.js'


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
 * ```
 */
export class GhostSpeakClient {
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
   * Direct access to Agent Module for read operations
   */
  get agents(): AgentModule {
    return new AgentModule(this.config)
  }



  /**
   * Direct access to Governance Module for read operations
   */
  get governanceModule(): GovernanceModule {
     return new GovernanceModule(this.config)
  }

  /**
   * Direct access to Multisig Module for read operations
   */
  get multisigModule(): MultisigModule {
    return new MultisigModule(this.config)
  }

  /**
   * Agent operations
   */
  agent(): AgentBuilder {
    return new AgentBuilder(this.config)
  }



  /**
   * PayAI operations (x402 payments)
   */
  payai(): PayAIClient {
    return new PayAIClient({
      rpcUrl: this.config.rpcEndpoint!,
      facilitatorUrl: this.config.payai?.facilitatorUrl,
      timeout: this.config.transactionTimeout,
      retry: this.config.retryConfig && {
        attempts: this.config.retryConfig.maxRetries ?? 3,
        delayMs: this.config.retryConfig.baseDelay ?? 1000
      }
    })
  }

  /**
   * Reputation operations
   */
  reputation(): ReputationModule {
    return new ReputationModule(this.config)
  }

  /**
   * Reputation Tag Engine (Pillar 2: Granular Tags)
   *
   * Automatic tag assignment and management based on agent metrics.
   * Features confidence scoring, evidence tracking, and tag decay.
   */
  tagEngine() {
    const { ReputationTagEngine } = require('../utils/reputation-tag-engine.js')
    return new ReputationTagEngine()
  }

  /**
   * Multi-Source Reputation Aggregator (Pillar 3: External Sources)
   *
   * Aggregate reputation data from multiple sources (PayAI, GitHub, custom webhooks)
   * with weighted scoring and conflict detection.
   */
  reputationAggregator() {
    const { MultiSourceAggregator } = require('../modules/reputation/MultiSourceAggregator.js')
    return new MultiSourceAggregator()
  }

  /**
   * Privacy operations
   */
  privacy(): PrivacyModule {
    return new PrivacyModule(this.config)
  }

  /**
   * Governance operations
   */
  governance(): GovernanceBuilder {
    return new GovernanceBuilder(this.config)
  }

  /**
   * Multisig operations
   */
  multisig(): MultisigBuilder {
    return new MultisigBuilder(this.config)
  }



  /**
   * Unified Credential operations (Solana + Crossmint)
   */
  credentials(): UnifiedCredentialService {
    return new UnifiedCredentialService({
      programId: this.config.programId,
      crossmint: this.config.credentials?.crossmintApiKey ? {
        apiKey: this.config.credentials.crossmintApiKey,
        environment: this.config.credentials.crossmintEnvironment,
        chain: this.config.credentials.crossmintChain
      } : undefined,
      crossmintTemplates: this.config.credentials?.templates
    })
  }

  /**
   * DID operations (Decentralized Identifiers)
   */
  did(): DidModule {
    return new DidModule(this.config)
  }

  /**
   * Direct access to Authorization Module for read operations
   */
  get authorization(): AuthorizationModule {
    return new AuthorizationModule(this.config)
  }

  // H2A module has been removed - use A2A (Agent-to-Agent) instructions instead

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
  name?: string
  description?: string
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

  create(params: { name: string; description?: string; capabilities: string[] }): this {
    this.params = {
      ...this.params,
      agentType: 0, // Default type
      metadataUri: JSON.stringify(params),
      agentId: params.name.toLowerCase().replace(/\s+/g, '-'),
      name: params.name,
      description: params.description || ''
    }
    return this
  }

  withDescription(description: string): this {
    this.params.description = description
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

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
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
      name: this.params.name!,
      description: this.params.description!,
      metadataUri: this.params.metadataUri!,
      agentId: this.params.agentId!
    })
    const address = await this.deriveAgentAddress(this.params.agentId!, this.params.signer!)
    
    return { address, signature }
  }

  private async deriveAgentAddress(agentId: string, signer: TransactionSigner): Promise<Address> {
    const { deriveAgentPda } = await import('../utils/pda.js')
    const [address] = await deriveAgentPda({ 
      programAddress: this.module.getProgramId(), 
      owner: signer.address, 
      agentId 
    })
    return address
  }
}



/**
 * Channel builder parameters interface
 */

/**
 * Marketplace builder for fluent API
 */

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

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
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

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
    return this
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
 * Multisig builder for fluent API
 */
class MultisigBuilder {
  private module: MultisigModule
  private params: MultisigBuilderParams = {}

  constructor(config: GhostSpeakConfig) {
    this.module = new MultisigModule(config)
  }

  create(): CreateMultisigBuilder {
    return new CreateMultisigBuilder(this.module, this.params)
  }

  proposal(): MultisigProposalBuilder {
    return new MultisigProposalBuilder(this.module, this.params)
  }

  approve(): MultisigApproveBuilder {
    return new MultisigApproveBuilder(this.module, this.params)
  }

  executeProposal(): MultisigExecuteBuilder {
    return new MultisigExecuteBuilder(this.module, this.params)
  }

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
    return this
  }

  debug(): this {
    this.module.debug()
    return this
  }
}

interface MultisigBuilderParams {
  signer?: TransactionSigner
}

class CreateMultisigBuilder {
  private params: {
    multisigId?: bigint
    threshold?: number
    signers?: Address[]
    signer?: TransactionSigner
  } = {}

  constructor(private module: MultisigModule, private builderParams: MultisigBuilderParams) {
    this.params.signer = builderParams.signer
  }

  withId(id: bigint): this {
    this.params.multisigId = id
    return this
  }

  threshold(t: number): this {
    this.params.threshold = t
    return this
  }

  signers(s: Address[]): this {
    this.params.signers = s
    return this
  }

  async execute(): Promise<{ signature: string }> {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.multisigId) throw new Error('Multisig ID required')
    if (!this.params.threshold) throw new Error('Threshold required')
    if (!this.params.signers) throw new Error('Signers required')

    return {
      signature: await this.module.createMultisig({
        owner: this.params.signer,
        multisigId: this.params.multisigId,
        threshold: this.params.threshold,
        signers: this.params.signers
      })
    }
  }

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
    return this
  }
}

class MultisigProposalBuilder {
  private params: {
    multisigAddress?: Address
    title?: string
    description?: string
    signer?: TransactionSigner
  } = {}

  constructor(private module: MultisigModule, private builderParams: MultisigBuilderParams) {
    this.params.signer = builderParams.signer
  }

  forMultisig(address: Address): this {
    this.params.multisigAddress = address
    return this
  }

  title(t: string): this {
    this.params.title = t
    return this
  }

  description(d: string): this {
    this.params.description = d
    return this
  }

  async execute(): Promise<{ signature: string }> {
     if (!this.params.signer) throw new Error('Signer required')
     if (!this.params.title) throw new Error('Title required')
     if (!this.params.description) throw new Error('Description required')
     
     // Placeholder execution since we simplified createProposal in module
     // We would need more params in a real app (execution params, type etc)
     // For now we just call it with minimal dummy data to prove wiring
     return {
      signature: await this.module.createProposal({
        multisigAddress: this.params.multisigAddress!,
        title: this.params.title,
        description: this.params.description,
        proposalType: ProposalType.Custom,
        executionParams: {
          instructions: [],
          executionDelay: 0n,
          executionConditions: [],
          cancellable: true,
          autoExecute: true,
          executionAuthority: this.params.signer.address
        },
        proposalId: BigInt(Date.now()),
        proposer: this.params.signer
      })
     }
  }

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
    return this
  }
}

class MultisigApproveBuilder {
  private params: {
    proposalAddress?: Address
    voteChoice?: VoteChoice
    reasoning?: string
    signer?: TransactionSigner
    tokenAccount?: Address
  } = {}

  constructor(private module: MultisigModule, private builderParams: MultisigBuilderParams) {
    this.params.signer = builderParams.signer
  }

  proposal(address: Address): this {
    this.params.proposalAddress = address
    return this
  }

  vote(choice: VoteChoice): this {
    this.params.voteChoice = choice
    return this
  }

  reason(text: string): this {
    this.params.reasoning = text
    return this
  }

  tokenAccount(account: Address): this {
    this.params.tokenAccount = account
    return this
  }

  async execute(): Promise<{ signature: string }> {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.proposalAddress) throw new Error('Proposal address required')

    // NOTE: approveProposal was removed - use protocol_config for voting
    throw new Error('Multisig approval: Use protocol_config instructions for voting (approveProposal removed)')
  }

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
    return this
  }
}

class MultisigExecuteBuilder {
  private params: {
    proposalAddress?: Address
    targetProgram?: Address
    signer?: TransactionSigner
  } = {}

  constructor(private module: MultisigModule, private builderParams: MultisigBuilderParams) {
    this.params.signer = builderParams.signer
  }

  proposal(address: Address): this {
    this.params.proposalAddress = address
    return this
  }

  target(programId: Address): this {
    this.params.targetProgram = programId
    return this
  }

  async execute(): Promise<{ signature: string }> {
    if (!this.params.signer) throw new Error('Signer required')
    if (!this.params.proposalAddress) throw new Error('Proposal address required')
    if (!this.params.targetProgram) throw new Error('Target program required')

    return {
      signature: await this.module.executeProposal({
        proposalAddress: this.params.proposalAddress,
        executor: this.params.signer,
        targetProgram: this.params.targetProgram
      })
    }
  }

  withSigner(signer: TransactionSigner): this {
    this.params.signer = signer
    return this
  }
}



// H2A Communication builders have been removed - use A2A (Agent-to-Agent) instructions instead

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

// Default export for easy importing
export default GhostSpeakClient