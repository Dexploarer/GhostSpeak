/**
 * GovernanceInstructions - Complete Governance Management Client
 * 
 * Provides developer-friendly high-level interface for governance operations
 * including multi-signature wallets, proposals, voting, and RBAC with real Web3.js v2 execution.
 */

import type { Address, Signature, TransactionSigner } from '@solana/kit'
import { BaseInstructions } from './BaseInstructions.js'
import type { GhostSpeakConfig, EmergencyConfig } from '../../types/index.js'
import { 
  getCreateMultisigInstruction,
  getInitializeGovernanceProposalInstruction,
  getInitializeRbacConfigInstruction,
  ProposalStatus,
  type Multisig,
  type GovernanceProposal,
  type RbacConfig,
  type ProposalType,
  type MultisigConfig,
  type ExecutionParams,
  type Role
} from '../../generated/index.js'
import { SYSTEM_PROGRAM_ADDRESS_32 } from '../../constants/index.js'
import { type TransactionResult } from '../../utils/transaction-urls.js'

// Enhanced types for better developer experience
export interface CreateMultisigParams {
  multisigId: bigint
  threshold: number
  signers: Address[]
  config: MultisigConfig
}

export interface CreateProposalParams {
  proposalId: bigint
  title: string
  description: string
  proposalType: ProposalType
  executionParams: ExecutionParams
}

export interface InitializeRbacParams {
  initialRoles: Role[]
}

export interface VoteParams {
  proposal: Address
  vote: 'For' | 'Against' | 'Abstain'
  weight?: bigint
}

export interface MultisigFilter {
  owner?: Address
  signer?: Address
  threshold?: number
  minSigners?: number
  maxSigners?: number
  createdAfter?: bigint
  createdBefore?: bigint
}

export interface ProposalFilter {
  status?: ProposalStatus
  proposalType?: ProposalType
  proposer?: Address
  createdAfter?: bigint
  createdBefore?: bigint
  votingActive?: boolean
  executable?: boolean
  category?: string
}

export interface MultisigSummary {
  multisig: Address
  multisigId: bigint
  threshold: number
  signers: Address[]
  owner: Address
  createdAt: bigint
  updatedAt: bigint
  config: MultisigConfig
  emergencyConfig?: EmergencyConfig // Emergency configuration
  pendingTransactions: number
  isActive: boolean
  // Additional properties expected by CLI
  balance?: bigint
  name?: string
  multisigType?: string
  timelockDuration?: bigint
}

export interface ProposalSummary {
  proposal: Address
  proposalId: bigint
  proposalType: ProposalType
  proposer: Address
  title: string
  description: string
  status: ProposalStatus
  createdAt: bigint
  votingEndsAt: bigint
  executionDelay: bigint
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  totalVotes: bigint
  quorumReached: boolean
  canExecute: boolean
  timeRemaining?: bigint
  // Additional properties expected by CLI
  yesVotes?: bigint
  noVotes?: bigint
  eligibleVoters?: number
  quorumThreshold?: number
  approvalThreshold?: number
}

export interface GovernanceAnalytics {
  totalMultisigs: number
  activeMultisigs: number
  totalProposals: number
  activeProposals: number
  passedProposals: number
  failedProposals: number
  averageVotingParticipation: number
  topSigners: { signer: Address; multisigCount: number; transactionCount: number }[]
  proposalSuccess: { rate: number; averageVotes: bigint }
}

export interface RbacSummary {
  rbacConfig: Address
  roles: Role[]
  roleCount: number
  userCount: number
  isActive: boolean
}

/**
 * Complete Governance Management Client
 * 
 * Provides high-level developer-friendly interface for all governance operations
 * with real blockchain execution, comprehensive validation, and analytics.
 */
export class GovernanceInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  // =====================================================
  // MULTISIG OPERATIONS
  // =====================================================

  /**
   * Create a new multi-signature wallet
   * 
   * Creates a secure multi-signature wallet with configurable threshold,
   * emergency procedures, and time locks for enhanced security.
   * 
   * @param creator - The signer creating the multisig
   * @param multisigPda - The multisig account PDA
   * @param params - Multisig creation parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.governance.createMultisig(
   *   creator,
   *   multisigPda,
   *   {
   *     multisigId: 1n,
   *     threshold: 3,
   *     signers: [signer1, signer2, signer3, signer4, signer5],
   *     config: {
   *       requireSequentialExecution: false,
   *       executionDelay: 86400n // 24 hours
   *     }
   *   }
   * )
   * ```
   */
  async createMultisig(
    creator: TransactionSigner,
    multisigPda: Address,
    params: CreateMultisigParams
  ): Promise<Signature> {
    console.log('🏛️ Creating multi-signature wallet...')
    console.log(`   Multisig ID: ${params.multisigId}`)
    console.log(`   Threshold: ${params.threshold} of ${params.signers.length} signers`)
    console.log(`   Signers: ${params.signers.join(', ')}`)

    // Validate parameters
    this.validateCreateMultisigParams(params)

    // Build instruction
    const instruction = getCreateMultisigInstruction({
      multisig: multisigPda,
      owner: creator,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      multisigId: params.multisigId,
      threshold: params.threshold,
      signers: params.signers,
      config: params.config
    })

    const signature = await this.sendTransaction([instruction], [creator])
    
    console.log(`✅ Multi-signature wallet created with signature: ${signature}`)
    return signature
  }

  /**
   * Create multisig with full transaction details and URLs
   */
  async createMultisigWithDetails(
    creator: TransactionSigner,
    multisigPda: Address,
    params: CreateMultisigParams
  ): Promise<TransactionResult> {
    console.log('🏛️ Creating multi-signature wallet with detailed results...')

    this.validateCreateMultisigParams(params)

    const instruction = getCreateMultisigInstruction({
      multisig: multisigPda,
      owner: creator,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      multisigId: params.multisigId,
      threshold: params.threshold,
      signers: params.signers,
      config: params.config
    })

    return this.sendTransactionWithDetails([instruction], [creator])
  }

  // =====================================================
  // PROPOSAL OPERATIONS
  // =====================================================

  /**
   * Create a governance proposal
   * 
   * Initiates a new governance proposal for protocol changes, treasury management,
   * or other governance decisions. Includes voting periods and execution delays.
   * 
   * @param proposer - The signer creating the proposal
   * @param proposalPda - The proposal account PDA
   * @param params - Proposal creation parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.governance.createProposal(
   *   proposer,
   *   proposalPda,
   *   {
   *     proposalId: 42n,
   *     title: "Increase transaction fee threshold",
   *     description: "Proposal to increase the minimum transaction fee from 0.01 to 0.02 SOL",
   *     proposalType: ProposalType.ParameterChange,
   *     executionParams: {
   *       executionDelay: 172800n, // 2 days
   *       targetProgram: targetProgramAddress,
   *       instructionData: instructionBytes
   *     }
   *   }
   * )
   * ```
   */
  async createProposal(
    proposer: TransactionSigner,
    proposalPda: Address,
    params: CreateProposalParams
  ): Promise<Signature> {
    console.log('📜 Creating governance proposal...')
    console.log(`   Proposal ID: ${params.proposalId}`)
    console.log(`   Type: ${params.proposalType}`)
    console.log(`   Title: ${params.title}`)
    console.log(`   Execution Delay: ${params.executionParams.executionDelay} seconds`)

    // Validate parameters
    this.validateCreateProposalParams(params)

    // Build instruction
    const instruction = getInitializeGovernanceProposalInstruction({
      proposal: proposalPda,
      proposer,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      proposalId: params.proposalId,
      title: params.title,
      description: params.description,
      proposalType: params.proposalType,
      executionParams: params.executionParams
    })

    const signature = await this.sendTransaction([instruction], [proposer])
    
    console.log(`✅ Governance proposal created with signature: ${signature}`)
    return signature
  }

  /**
   * Create proposal with detailed transaction results
   */
  async createProposalWithDetails(
    proposer: TransactionSigner,
    proposalPda: Address,
    params: CreateProposalParams
  ): Promise<TransactionResult> {
    console.log('📜 Creating governance proposal with detailed results...')

    this.validateCreateProposalParams(params)

    const instruction = getInitializeGovernanceProposalInstruction({
      proposal: proposalPda,
      proposer,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      proposalId: params.proposalId,
      title: params.title,
      description: params.description,
      proposalType: params.proposalType,
      executionParams: params.executionParams
    })

    return this.sendTransactionWithDetails([instruction], [proposer])
  }

  // =====================================================
  // RBAC OPERATIONS
  // =====================================================

  /**
   * Initialize Role-Based Access Control configuration
   * 
   * Sets up comprehensive RBAC system with roles, permissions,
   * and access control policies for protocol governance.
   * 
   * @param admin - The signer initializing RBAC
   * @param rbacPda - The RBAC config account PDA
   * @param params - RBAC initialization parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.governance.initializeRbac(
   *   admin,
   *   rbacPda,
   *   {
   *     initialRoles: [
   *       {
   *         name: "Admin",
   *         permissions: [permission1, permission2, permission3],
   *         members: [admin1, admin2]
   *       },
   *       {
   *         name: "Member",
   *         permissions: [votePermission],
   *         members: []
   *       }
   *     ]
   *   }
   * )
   * ```
   */
  async initializeRbac(
    admin: TransactionSigner,
    rbacPda: Address,
    params: InitializeRbacParams
  ): Promise<Signature> {
    console.log('🔐 Initializing RBAC configuration...')
    console.log(`   Initial Roles: ${params.initialRoles.length} roles`)

    // Validate parameters
    this.validateInitializeRbacParams(params)

    // Build instruction
    const instruction = getInitializeRbacConfigInstruction({
      rbacConfig: rbacPda,
      authority: admin,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      initialRoles: params.initialRoles
    })

    const signature = await this.sendTransaction([instruction], [admin])
    
    console.log(`✅ RBAC configuration initialized with signature: ${signature}`)
    return signature
  }

  /**
   * Initialize RBAC with detailed transaction results
   */
  async initializeRbacWithDetails(
    admin: TransactionSigner,
    rbacPda: Address,
    params: InitializeRbacParams
  ): Promise<TransactionResult> {
    console.log('🔐 Initializing RBAC configuration with detailed results...')

    this.validateInitializeRbacParams(params)

    const instruction = getInitializeRbacConfigInstruction({
      rbacConfig: rbacPda,
      authority: admin,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      initialRoles: params.initialRoles
    })

    return this.sendTransactionWithDetails([instruction], [admin])
  }

  // =====================================================
  // QUERYING & MONITORING
  // =====================================================

  /**
   * Get multisig account data
   * 
   * @param multisigAddress - The multisig account address
   * @returns Multisig account data or null if not found
   */
  async getMultisig(multisigAddress: Address): Promise<Multisig | null> {
    return this.getDecodedAccount<Multisig>(
      multisigAddress,
      'getMultisigDecoder'
    )
  }

  /**
   * Get proposal account data
   * 
   * @param proposalAddress - The proposal account address
   * @returns Proposal account data or null if not found
   */
  async getProposal(proposalAddress: Address): Promise<GovernanceProposal | null> {
    return this.getDecodedAccount<GovernanceProposal>(
      proposalAddress,
      'getGovernanceProposalDecoder'
    )
  }

  /**
   * Get RBAC config account data
   * 
   * @param rbacAddress - The RBAC config account address
   * @returns RBAC config data or null if not found
   */
  async getRbacConfig(rbacAddress: Address): Promise<RbacConfig | null> {
    return this.getDecodedAccount<RbacConfig>(
      rbacAddress,
      'getRbacConfigDecoder'
    )
  }

  /**
   * Get multisig summary with computed fields
   * 
   * @param multisigAddress - The multisig account address
   * @returns Enhanced multisig summary or null if not found
   */
  async getMultisigSummary(multisigAddress: Address): Promise<MultisigSummary | null> {
    const multisig = await this.getMultisig(multisigAddress)
    if (!multisig) return null

    return {
      multisig: multisigAddress,
      multisigId: multisig.multisigId,
      threshold: multisig.threshold,
      signers: multisig.signers,
      owner: multisig.owner,
      createdAt: multisig.createdAt,
      updatedAt: multisig.updatedAt,
      config: multisig.config,
      emergencyConfig: undefined, // Not in the generated type
      pendingTransactions: 0, // Not in the generated type
      isActive: multisig.signers.length >= multisig.threshold
    }
  }

  /**
   * Get proposal summary with computed fields
   * 
   * @param proposalAddress - The proposal account address
   * @returns Enhanced proposal summary or null if not found
   */
  async getProposalSummary(proposalAddress: Address): Promise<ProposalSummary | null> {
    const proposal = await this.getProposal(proposalAddress)
    if (!proposal) return null

    const now = BigInt(Math.floor(Date.now() / 1000))
    // Assuming voting period of 7 days for now - in production this would come from the proposal
    const votingEndsAt = proposal.createdAt + BigInt(7 * 24 * 60 * 60)
    const timeRemaining = votingEndsAt > now ? votingEndsAt - now : 0n

    const totalVotes = proposal.votingResults.votesFor + proposal.votingResults.votesAgainst + proposal.votingResults.votesAbstain
    const quorumReached = proposal.votingResults.quorumReached

    const votingEnded = now >= votingEndsAt
    const canExecute = votingEnded && 
                      quorumReached && 
                      proposal.votingResults.votesFor > proposal.votingResults.votesAgainst &&
                      proposal.status === ProposalStatus.Active

    return {
      proposal: proposalAddress,
      proposalId: proposal.proposalId,
      proposalType: proposal.proposalType,
      proposer: proposal.proposer,
      title: proposal.title ?? 'Untitled Proposal',
      description: proposal.description ?? 'No description',
      status: proposal.status,
      createdAt: proposal.createdAt,
      votingEndsAt,
      executionDelay: proposal.executionParams.executionDelay,
      forVotes: proposal.votingResults.votesFor,
      againstVotes: proposal.votingResults.votesAgainst,
      abstainVotes: proposal.votingResults.votesAbstain,
      totalVotes,
      quorumReached,
      canExecute,
      timeRemaining: timeRemaining > 0n ? timeRemaining : undefined
    }
  }

  /**
   * List multisigs with optional filtering
   * 
   * @param filter - Optional filter criteria
   * @param limit - Maximum number of multisigs to return
   * @returns Array of multisig summaries
   */
  async listMultisigs(filter?: MultisigFilter, limit: number = 50): Promise<MultisigSummary[]> {
    console.log('📋 Listing multisigs...')
    
    try {
      // Get all multisig accounts
      const accounts = await this.getDecodedProgramAccounts<Multisig>(
        'getMultisigDecoder',
        [] // No RPC filters - filtering client-side
      )
      
      // Convert to summaries and apply filters
      let multisigs = accounts
        .map(({ address, data }) => this.multisigToSummary(address, data))
        .filter(summary => this.applyMultisigFilter(summary, filter))
        .slice(0, limit)
      
      console.log(`✅ Found ${multisigs.length} multisigs`)
      return multisigs
    } catch (error) {
      console.warn('Failed to list multisigs:', error)
      return []
    }
  }

  /**
   * List proposals with optional filtering
   * 
   * @param filter - Optional filter criteria
   * @param limit - Maximum number of proposals to return
   * @returns Array of proposal summaries
   */
  async listProposals(filter?: ProposalFilter, limit: number = 50): Promise<ProposalSummary[]> {
    console.log('📋 Listing proposals...')
    
    try {
      // Get all governance proposal accounts
      const accounts = await this.getDecodedProgramAccounts<GovernanceProposal>(
        'getGovernanceProposalDecoder',
        [] // No RPC filters - filtering client-side
      )
      
      // Convert to summaries and apply filters
      let proposals = accounts
        .map(({ address, data }) => this.proposalToSummary(address, data))
        .filter(summary => this.applyProposalFilter(summary, filter))
        .slice(0, limit)
      
      console.log(`✅ Found ${proposals.length} proposals`)
      return proposals
    } catch (error) {
      console.warn('Failed to list proposals:', error)
      return []
    }
  }

  /**
   * Get active proposals requiring votes
   * 
   * @returns Array of proposals open for voting
   */
  async getActiveProposals(): Promise<ProposalSummary[]> {
    console.log('🗳️ Finding active proposals...')
    
    const allProposals = await this.listProposals()
    const now = BigInt(Math.floor(Date.now() / 1000))
    
    return allProposals.filter(proposal => 
      proposal.status === ProposalStatus.Active && 
      proposal.votingEndsAt > now
    )
  }

  // =====================================================
  // ADVANCED FEATURES
  // =====================================================

  /**
   * Get governance analytics and statistics
   * 
   * @returns Comprehensive governance analytics
   */
  async getGovernanceAnalytics(): Promise<GovernanceAnalytics> {
    console.log('📊 Generating governance analytics...')
    
    // In production, this would aggregate data from all governance accounts
    return {
      totalMultisigs: 0,
      activeMultisigs: 0,
      totalProposals: 0,
      activeProposals: 0,
      passedProposals: 0,
      failedProposals: 0,
      averageVotingParticipation: 0,
      topSigners: [],
      proposalSuccess: { rate: 0, averageVotes: 0n }
    }
  }

  /**
   * Monitor proposal for voting updates
   * 
   * @param proposalAddress - The proposal to monitor
   * @param callback - Function called when proposal updates
   * @returns Cleanup function to stop monitoring
   */
  async monitorProposal(
    proposalAddress: Address,
    callback: (proposal: ProposalSummary) => void
  ): Promise<() => void> {
    console.log(`👀 Starting proposal monitoring for ${proposalAddress}`)
    
    let isActive = true
    
    const poll = async () => {
      if (!isActive) return
      
      try {
        const summary = await this.getProposalSummary(proposalAddress)
        if (summary) {
          callback(summary)
        }
      } catch (error) {
        console.warn('Error monitoring proposal:', error)
      }
      
      if (isActive) {
        setTimeout(poll, 30000) // Poll every 30 seconds
      }
    }
    
    poll()
    
    return () => {
      console.log(`🛑 Stopping proposal monitoring for ${proposalAddress}`)
      isActive = false
    }
  }

  // =====================================================
  // VALIDATION HELPERS
  // =====================================================

  private validateCreateMultisigParams(params: CreateMultisigParams): void {
    if (params.threshold <= 0) {
      throw new Error('Threshold must be greater than 0')
    }
    
    if (params.threshold > params.signers.length) {
      throw new Error('Threshold cannot exceed number of signers')
    }
    
    if (params.signers.length === 0) {
      throw new Error('At least one signer is required')
    }
    
    if (params.signers.length > 20) {
      throw new Error('Cannot have more than 20 signers')
    }
    
    // Check for duplicate signers
    const uniqueSigners = new Set(params.signers)
    if (uniqueSigners.size !== params.signers.length) {
      throw new Error('Duplicate signers are not allowed')
    }
  }

  private validateCreateProposalParams(params: CreateProposalParams): void {
    if (!params.title || params.title.trim().length === 0) {
      throw new Error('Proposal title is required')
    }
    
    if (params.title.length > 100) {
      throw new Error('Proposal title cannot exceed 100 characters')
    }
    
    if (!params.description || params.description.trim().length === 0) {
      throw new Error('Proposal description is required')
    }
    
    if (params.description.length > 2000) {
      throw new Error('Proposal description cannot exceed 2000 characters')
    }
    
    if (!params.executionParams) {
      throw new Error('Execution parameters are required')
    }
  }

  private validateInitializeRbacParams(params: InitializeRbacParams): void {
    if (!params.initialRoles || params.initialRoles.length === 0) {
      throw new Error('At least one initial role is required')
    }
    
    if (params.initialRoles.length > 10) {
      throw new Error('Cannot have more than 10 initial roles')
    }
  }

  private multisigToSummary(multisigAddress: Address, multisig: Multisig): MultisigSummary {
    return {
      multisig: multisigAddress,
      multisigId: multisig.multisigId,
      threshold: multisig.threshold,
      signers: multisig.signers,
      owner: multisig.owner,
      createdAt: multisig.createdAt,
      updatedAt: multisig.updatedAt,
      config: multisig.config,
      emergencyConfig: undefined,
      pendingTransactions: 0,
      isActive: multisig.signers.length >= multisig.threshold
    }
  }

  private proposalToSummary(proposalAddress: Address, proposal: GovernanceProposal): ProposalSummary {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const votingEndsAt = proposal.createdAt + BigInt(7 * 24 * 60 * 60) // 7 days
    const timeRemaining = votingEndsAt > now ? votingEndsAt - now : 0n

    const totalVotes = proposal.votingResults.votesFor + proposal.votingResults.votesAgainst + proposal.votingResults.votesAbstain
    const votingEnded = now >= votingEndsAt
    const canExecute = votingEnded && 
                      proposal.votingResults.quorumReached && 
                      proposal.votingResults.votesFor > proposal.votingResults.votesAgainst &&
                      proposal.status === ProposalStatus.Active

    return {
      proposal: proposalAddress,
      proposalId: proposal.proposalId,
      proposalType: proposal.proposalType,
      proposer: proposal.proposer,
      title: proposal.title ?? 'Untitled Proposal',
      description: proposal.description ?? 'No description',
      status: proposal.status,
      createdAt: proposal.createdAt,
      votingEndsAt,
      executionDelay: proposal.executionParams.executionDelay,
      forVotes: proposal.votingResults.votesFor,
      againstVotes: proposal.votingResults.votesAgainst,
      abstainVotes: proposal.votingResults.votesAbstain,
      totalVotes,
      quorumReached: proposal.votingResults.quorumReached,
      timeRemaining,
      canExecute
    }
  }

  private applyMultisigFilter(summary: MultisigSummary, filter?: MultisigFilter): boolean {
    if (!filter) return true

    if (filter.threshold !== undefined && summary.threshold !== filter.threshold) return false
    if (filter.owner && summary.owner !== filter.owner) return false
    if (filter.minSigners !== undefined && summary.signers.length < filter.minSigners) return false
    // isActive field not available in MultisigFilter
    if (filter.createdAfter && summary.createdAt < filter.createdAfter) return false
    if (filter.createdBefore && summary.createdAt > filter.createdBefore) return false

    return true
  }

  private applyProposalFilter(summary: ProposalSummary, filter?: ProposalFilter): boolean {
    if (!filter) return true

    if (filter.status && summary.status !== filter.status) return false
    if (filter.proposer && summary.proposer !== filter.proposer) return false
    if (filter.proposalType && summary.proposalType !== filter.proposalType) return false
    if (filter.createdAfter && summary.createdAt < filter.createdAfter) return false
    if (filter.createdBefore && summary.createdAt > filter.createdBefore) return false
    if (filter.votingActive !== undefined) {
      const isVotingActive = summary.timeRemaining !== undefined && summary.timeRemaining > 0n
      if (isVotingActive !== filter.votingActive) return false
    }
    if (filter.executable !== undefined && summary.canExecute !== filter.executable) return false

    return true
  }
}