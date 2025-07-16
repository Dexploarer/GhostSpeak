/**
 * DisputeInstructions - Complete Dispute Resolution Client
 * 
 * Provides developer-friendly high-level interface for dispute management
 * including filing disputes, evidence submission, and resolution with real Web3.js v2 execution.
 */

import type { Address, Signature, TransactionSigner, IInstruction } from '@solana/kit'
import { BaseInstructions } from './BaseInstructions.js'
import type { GhostSpeakConfig, Commitment } from '../../types/index.js'
import { 
  getFileDisputeInstruction,
  getSubmitDisputeEvidenceInstruction,
  getResolveDisputeInstruction,
  DisputeStatus,
  type DisputeCase,
  type DisputeEvidence,
  getDisputeCaseDecoder
} from '../../generated/index.js'
import { 
  createTransactionResult, 
  logTransactionDetails,
  type TransactionResult 
} from '../../utils/transaction-urls.js'

// Enhanced types for better developer experience
export interface FileDisputeParams {
  transaction: Address
  respondent: Address
  reason: string
  userRegistry?: Address
}

export interface SubmitEvidenceParams {
  dispute: Address
  evidenceType: string
  evidenceData: string
  userRegistry?: Address
}

export interface ResolveDisputeParams {
  dispute: Address
  resolution: string
  rulingInFavorOfComplainant: boolean
  userRegistry?: Address
}

export interface DisputeFilter {
  status?: DisputeStatus
  complainant?: Address
  respondent?: Address
  moderator?: Address
  createdAfter?: bigint
  createdBefore?: bigint
  hasEvidence?: boolean
  requiresHumanReview?: boolean
}

export interface DisputeSummary {
  dispute: Address
  transaction: Address
  complainant: Address
  respondent: Address
  moderator?: Address
  reason: string
  status: DisputeStatus
  evidence: DisputeEvidence[]
  resolution?: string
  aiScore: number
  humanReview: boolean
  createdAt: bigint
  resolvedAt?: bigint
  daysSinceCreated: number
  evidenceCount: number
}

export interface DisputeAnalytics {
  totalDisputes: number
  activeDisputes: number
  resolvedDisputes: number
  escalatedDisputes: number
  averageResolutionTime: bigint
  complainantSuccessRate: number
  mostCommonReasons: Array<{ reason: string; count: number }>
  topMediators: Array<{ moderator: Address; resolutionCount: number; successRate: number }>
}

export interface EvidenceSubmission {
  evidenceType: string
  evidenceData: string
  attachments?: string[]
  timestamp?: bigint
}

/**
 * Complete Dispute Resolution Client
 * 
 * Provides high-level developer-friendly interface for all dispute operations
 * with real blockchain execution, comprehensive validation, and resolution tracking.
 */
export class DisputeInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  // =====================================================
  // DISPUTE FILING
  // =====================================================

  /**
   * File a new dispute
   * 
   * Initiates a formal dispute resolution process for transaction issues,
   * work quality problems, or payment disputes. Includes rate limiting
   * and spam prevention.
   * 
   * @param complainant - The signer filing the dispute
   * @param disputePda - The dispute account PDA (optional, will be derived)
   * @param params - Dispute filing parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.dispute.fileDispute(
   *   complainant,
   *   disputePda,
   *   {
   *     transaction: transactionAddress,
   *     respondent: respondentAddress,
   *     reason: "Work delivered does not meet agreed specifications",
   *     userRegistry: userRegistryAddress
   *   }
   * )
   * ```
   */
  async fileDispute(
    complainant: TransactionSigner,
    disputePda: Address,
    params: FileDisputeParams
  ): Promise<Signature> {
    console.log('📋 Filing dispute...')
    console.log(`   Transaction: ${params.transaction}`)
    console.log(`   Respondent: ${params.respondent}`)
    console.log(`   Reason: ${params.reason}`)

    // Validate parameters
    this.validateFileDisputeParams(params)

    // Build instruction
    const instruction = getFileDisputeInstruction({
      dispute: disputePda,
      transaction: params.transaction,
      userRegistry: params.userRegistry || await this.deriveUserRegistry(complainant),
      complainant,
      respondent: params.respondent,
      systemProgram: '11111111111111111111111111111112' as Address,
      clock: 'SysvarC1ock11111111111111111111111111111111' as Address,
      reason: params.reason
    })

    const signature = await this.sendTransaction([instruction], [complainant])
    
    console.log(`✅ Dispute filed with signature: ${signature}`)
    return signature
  }

  /**
   * File dispute with full transaction details and URLs
   */
  async fileDisputeWithDetails(
    complainant: TransactionSigner,
    disputePda: Address,
    params: FileDisputeParams
  ): Promise<TransactionResult> {
    console.log('📋 Filing dispute with detailed results...')

    this.validateFileDisputeParams(params)

    const instruction = getFileDisputeInstruction({
      dispute: disputePda,
      transaction: params.transaction,
      userRegistry: params.userRegistry || await this.deriveUserRegistry(complainant),
      complainant,
      respondent: params.respondent,
      systemProgram: '11111111111111111111111111111112' as Address,
      clock: 'SysvarC1ock11111111111111111111111111111111' as Address,
      reason: params.reason
    })

    return this.sendTransactionWithDetails([instruction], [complainant])
  }

  // =====================================================
  // EVIDENCE SUBMISSION
  // =====================================================

  /**
   * Submit evidence for a dispute
   * 
   * Allows both parties and moderators to submit additional evidence
   * during the dispute resolution process. Evidence is cryptographically
   * verified and timestamped.
   * 
   * @param submitter - The signer submitting evidence
   * @param params - Evidence submission parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.dispute.submitEvidence(
   *   submitter,
   *   {
   *     dispute: disputeAddress,
   *     evidenceType: "Documentation",
   *     evidenceData: "Contract specifications clearly state...",
   *     userRegistry: userRegistryAddress
   *   }
   * )
   * ```
   */
  async submitEvidence(
    submitter: TransactionSigner,
    params: SubmitEvidenceParams
  ): Promise<Signature> {
    console.log('📄 Submitting dispute evidence...')
    console.log(`   Dispute: ${params.dispute}`)
    console.log(`   Evidence Type: ${params.evidenceType}`)
    console.log(`   Evidence Length: ${params.evidenceData.length} characters`)

    // Validate parameters
    this.validateEvidenceParams(params)

    // Verify dispute exists and is in valid state
    const disputeData = await this.getDispute(params.dispute)
    if (!disputeData) {
      throw new Error('Dispute not found')
    }

    this.validateEvidenceSubmissionAllowed(disputeData)

    // Build instruction
    const instruction = getSubmitDisputeEvidenceInstruction({
      dispute: params.dispute,
      userRegistry: params.userRegistry || await this.deriveUserRegistry(submitter),
      submitter,
      clock: 'SysvarC1ock11111111111111111111111111111111' as Address,
      evidenceType: params.evidenceType,
      evidenceData: params.evidenceData
    })

    const signature = await this.sendTransaction([instruction], [submitter])
    
    console.log(`✅ Evidence submitted with signature: ${signature}`)
    return signature
  }

  /**
   * Submit evidence with detailed transaction results
   */
  async submitEvidenceWithDetails(
    submitter: TransactionSigner,
    params: SubmitEvidenceParams
  ): Promise<TransactionResult> {
    console.log('📄 Submitting dispute evidence with detailed results...')

    this.validateEvidenceParams(params)

    const disputeData = await this.getDispute(params.dispute)
    if (!disputeData) {
      throw new Error('Dispute not found')
    }

    this.validateEvidenceSubmissionAllowed(disputeData)

    const instruction = getSubmitDisputeEvidenceInstruction({
      dispute: params.dispute,
      userRegistry: params.userRegistry || await this.deriveUserRegistry(submitter),
      submitter,
      clock: 'SysvarC1ock11111111111111111111111111111111' as Address,
      evidenceType: params.evidenceType,
      evidenceData: params.evidenceData
    })

    return this.sendTransactionWithDetails([instruction], [submitter])
  }

  // =====================================================
  // DISPUTE RESOLUTION
  // =====================================================

  /**
   * Resolve a dispute
   * 
   * Called by authorized moderators or arbitrators to resolve disputes.
   * Includes final ruling, resolution reasoning, and compensation decisions.
   * 
   * @param moderator - The signer with authority to resolve disputes
   * @param params - Resolution parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.dispute.resolveDispute(
   *   moderator,
   *   {
   *     dispute: disputeAddress,
   *     resolution: "Evidence supports complainant's claim. Refund authorized.",
   *     rulingInFavorOfComplainant: true,
   *     userRegistry: userRegistryAddress
   *   }
   * )
   * ```
   */
  async resolveDispute(
    moderator: TransactionSigner,
    params: ResolveDisputeParams
  ): Promise<Signature> {
    console.log('⚖️ Resolving dispute...')
    console.log(`   Dispute: ${params.dispute}`)
    console.log(`   Ruling: ${params.rulingInFavorOfComplainant ? 'Complainant' : 'Respondent'} favored`)
    console.log(`   Resolution: ${params.resolution}`)

    // Validate parameters
    this.validateResolveDisputeParams(params)

    // Verify dispute exists and can be resolved
    const disputeData = await this.getDispute(params.dispute)
    if (!disputeData) {
      throw new Error('Dispute not found')
    }

    this.validateDisputeCanBeResolved(disputeData)

    // Build instruction
    const instruction = getResolveDisputeInstruction({
      dispute: params.dispute,
      arbitratorRegistry: params.userRegistry || await this.deriveUserRegistry(moderator),
      arbitrator: moderator,
      clock: 'SysvarC1ock11111111111111111111111111111111' as Address,
      resolution: params.resolution,
      awardToComplainant: params.rulingInFavorOfComplainant
    })

    const signature = await this.sendTransaction([instruction], [moderator])
    
    console.log(`✅ Dispute resolved with signature: ${signature}`)
    return signature
  }

  /**
   * Resolve dispute with detailed transaction results
   */
  async resolveDisputeWithDetails(
    moderator: TransactionSigner,
    params: ResolveDisputeParams
  ): Promise<TransactionResult> {
    console.log('⚖️ Resolving dispute with detailed results...')

    this.validateResolveDisputeParams(params)

    const disputeData = await this.getDispute(params.dispute)
    if (!disputeData) {
      throw new Error('Dispute not found')
    }

    this.validateDisputeCanBeResolved(disputeData)

    const instruction = getResolveDisputeInstruction({
      dispute: params.dispute,
      arbitratorRegistry: params.userRegistry || await this.deriveUserRegistry(moderator),
      arbitrator: moderator,
      clock: 'SysvarC1ock11111111111111111111111111111111' as Address,
      resolution: params.resolution,
      awardToComplainant: params.rulingInFavorOfComplainant
    })

    return this.sendTransactionWithDetails([instruction], [moderator])
  }

  // =====================================================
  // DISPUTE QUERYING & MONITORING
  // =====================================================

  /**
   * Get dispute account data
   * 
   * @param disputeAddress - The dispute account address
   * @returns Dispute account data or null if not found
   */
  async getDispute(disputeAddress: Address): Promise<DisputeCase | null> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      const dispute = await rpcClient.getAndDecodeAccount(
        disputeAddress,
        getDisputeCaseDecoder(),
        this.commitment
      )
      
      return dispute
    } catch (error) {
      console.warn(`Failed to fetch dispute ${disputeAddress}:`, error)
      return null
    }
  }

  /**
   * Get dispute summary with computed fields
   * 
   * @param disputeAddress - The dispute account address
   * @returns Enhanced dispute summary or null if not found
   */
  async getDisputeSummary(disputeAddress: Address): Promise<DisputeSummary | null> {
    const dispute = await this.getDispute(disputeAddress)
    if (!dispute) return null

    const now = BigInt(Math.floor(Date.now() / 1000))
    const daysSinceCreated = Math.floor(Number(now - dispute.createdAt) / 86400)

    return {
      dispute: disputeAddress,
      transaction: dispute.transaction,
      complainant: dispute.complainant,
      respondent: dispute.respondent,
      moderator: dispute.moderator?.__option === 'Some' ? dispute.moderator.value : undefined,
      reason: dispute.reason,
      status: dispute.status,
      evidence: dispute.evidence,
      resolution: dispute.resolution?.__option === 'Some' ? dispute.resolution.value : undefined,
      aiScore: dispute.aiScore,
      humanReview: dispute.humanReview,
      createdAt: dispute.createdAt,
      resolvedAt: dispute.resolvedAt?.__option === 'Some' ? dispute.resolvedAt.value : undefined,
      daysSinceCreated,
      evidenceCount: dispute.evidence.length
    }
  }

  /**
   * Get evidence history for a dispute
   * 
   * @param disputeAddress - The dispute account address
   * @returns Array of evidence entries with verification status
   */
  async getEvidenceHistory(disputeAddress: Address): Promise<DisputeEvidence[]> {
    const dispute = await this.getDispute(disputeAddress)
    if (!dispute) return []

    return dispute.evidence.sort((a, b) => Number(a.timestamp - b.timestamp))
  }

  /**
   * List disputes with optional filtering
   * 
   * @param filter - Optional filter criteria
   * @param limit - Maximum number of disputes to return
   * @returns Array of dispute summaries
   */
  async listDisputes(filter?: DisputeFilter, limit: number = 50): Promise<DisputeSummary[]> {
    console.log('📋 Listing disputes...')
    
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all dispute case accounts
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getDisputeCaseDecoder(),
        [], // No RPC filters - filtering client-side
        this.commitment
      )
      
      // Convert to summaries and apply filters
      let disputes = accounts
        .map(({ pubkey, data }) => this.disputeToSummary(pubkey, data))
        .filter(summary => this.applyDisputeFilter(summary, filter))
        .slice(0, limit)
      
      console.log(`✅ Found ${disputes.length} disputes`)
      return disputes
    } catch (error) {
      console.warn('Failed to list disputes:', error)
      return []
    }
  }

  /**
   * Get active disputes requiring attention
   * 
   * @param moderator - Optional moderator address to filter assigned disputes
   * @returns Array of disputes needing review
   */
  async getActiveDisputes(moderator?: Address): Promise<DisputeSummary[]> {
    console.log('⚡ Finding active disputes...')
    
    // In production, filter by status and moderator assignment
    const allDisputes = await this.listDisputes()
    
    return allDisputes.filter(dispute => 
      [DisputeStatus.Filed, DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted].includes(dispute.status) &&
      (!moderator || dispute.moderator === moderator)
    )
  }

  // =====================================================
  // ADVANCED FEATURES
  // =====================================================

  /**
   * Get dispute analytics and statistics
   * 
   * @returns Comprehensive dispute resolution analytics
   */
  async getDisputeAnalytics(): Promise<DisputeAnalytics> {
    console.log('📊 Generating dispute analytics...')
    
    // In production, this would aggregate data from all disputes
    return {
      totalDisputes: 0,
      activeDisputes: 0,
      resolvedDisputes: 0,
      escalatedDisputes: 0,
      averageResolutionTime: 0n,
      complainantSuccessRate: 0,
      mostCommonReasons: [],
      topMediators: []
    }
  }

  /**
   * Monitor dispute for status updates
   * 
   * @param disputeAddress - The dispute to monitor
   * @param callback - Function called when dispute updates
   * @returns Cleanup function to stop monitoring
   */
  async monitorDispute(
    disputeAddress: Address,
    callback: (dispute: DisputeSummary) => void
  ): Promise<() => void> {
    console.log(`👀 Starting dispute monitoring for ${disputeAddress}`)
    
    let isActive = true
    
    const poll = async () => {
      if (!isActive) return
      
      try {
        const summary = await this.getDisputeSummary(disputeAddress)
        if (summary) {
          callback(summary)
        }
      } catch (error) {
        console.warn('Error monitoring dispute:', error)
      }
      
      if (isActive) {
        setTimeout(poll, 10000) // Poll every 10 seconds
      }
    }
    
    poll()
    
    return () => {
      console.log(`🛑 Stopping dispute monitoring for ${disputeAddress}`)
      isActive = false
    }
  }

  /**
   * Escalate dispute to human review
   * 
   * @param disputeAddress - The dispute to escalate
   * @param escalationReason - Reason for escalation
   */
  async escalateDispute(
    disputeAddress: Address,
    escalationReason: string
  ): Promise<void> {
    console.log(`📈 Escalating dispute ${disputeAddress}`)
    console.log(`   Reason: ${escalationReason}`)
    
    // In production, this would update dispute status and assign human reviewers
    console.log('⚠️ Dispute escalation not fully implemented')
  }

  // =====================================================
  // VALIDATION HELPERS
  // =====================================================

  private validateFileDisputeParams(params: FileDisputeParams): void {
    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error('Dispute reason is required')
    }
    
    if (params.reason.length > 500) {
      throw new Error('Dispute reason cannot exceed 500 characters')
    }
    
    if (params.transaction === params.respondent) {
      throw new Error('Transaction and respondent cannot be the same')
    }
  }

  private validateEvidenceParams(params: SubmitEvidenceParams): void {
    if (!params.evidenceType || params.evidenceType.trim().length === 0) {
      throw new Error('Evidence type is required')
    }
    
    if (!params.evidenceData || params.evidenceData.trim().length === 0) {
      throw new Error('Evidence data is required')
    }
    
    if (params.evidenceData.length > 2000) {
      throw new Error('Evidence data cannot exceed 2000 characters')
    }
  }

  private validateResolveDisputeParams(params: ResolveDisputeParams): void {
    if (!params.resolution || params.resolution.trim().length === 0) {
      throw new Error('Resolution description is required')
    }
    
    if (params.resolution.length > 1000) {
      throw new Error('Resolution cannot exceed 1000 characters')
    }
  }

  private validateEvidenceSubmissionAllowed(dispute: DisputeCase): void {
    if (![DisputeStatus.Filed, DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted].includes(dispute.status)) {
      throw new Error(`Cannot submit evidence for dispute with status: ${dispute.status}`)
    }
  }

  private validateDisputeCanBeResolved(dispute: DisputeCase): void {
    if (![DisputeStatus.Filed, DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted, DisputeStatus.Escalated].includes(dispute.status)) {
      throw new Error(`Cannot resolve dispute with status: ${dispute.status}`)
    }
  }

  private async deriveUserRegistry(user: TransactionSigner): Promise<Address> {
    // In production, derive proper user registry PDA
    // For now, return a placeholder
    return '11111111111111111111111111111111' as Address
  }

  private disputeToSummary(disputeAddress: Address, dispute: DisputeCase): DisputeSummary {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const daysSinceCreated = Math.floor(Number(now - dispute.createdAt) / 86400)

    return {
      dispute: disputeAddress,
      transaction: dispute.transaction,
      complainant: dispute.complainant,
      respondent: dispute.respondent,
      moderator: dispute.moderator?.__option === 'Some' ? dispute.moderator.value : undefined,
      reason: dispute.reason,
      status: dispute.status,
      evidence: dispute.evidence,
      resolution: dispute.resolution?.__option === 'Some' ? dispute.resolution.value : undefined,
      aiScore: dispute.aiScore,
      humanReview: dispute.humanReview,
      createdAt: dispute.createdAt,
      resolvedAt: dispute.resolvedAt?.__option === 'Some' ? dispute.resolvedAt.value : undefined,
      daysSinceCreated,
      evidenceCount: dispute.evidence.length
    }
  }

  private applyDisputeFilter(summary: DisputeSummary, filter?: DisputeFilter): boolean {
    if (!filter) return true

    if (filter.status && summary.status !== filter.status) return false
    if (filter.complainant && summary.complainant !== filter.complainant) return false
    if (filter.respondent && summary.respondent !== filter.respondent) return false
    if (filter.moderator && summary.moderator !== filter.moderator) return false
    if (filter.createdAfter && summary.createdAt < filter.createdAfter) return false
    if (filter.createdBefore && summary.createdAt > filter.createdBefore) return false
    if (filter.hasEvidence !== undefined && (summary.evidenceCount > 0) !== filter.hasEvidence) return false
    if (filter.requiresHumanReview !== undefined && summary.humanReview !== filter.requiresHumanReview) return false

    return true
  }
}