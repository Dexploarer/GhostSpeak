/**
 * Dispute Helper Utilities
 * 
 * Provides utility functions for dispute operations including PDA derivation,
 * validation, status tracking, and dispute resolution analytics.
 */

import type { Address } from '@solana/kit'
import { getProgramDerivedAddress } from '@solana/addresses'
import { DisputeStatus, type DisputeCase, type DisputeEvidence } from '../generated/index.js'

/**
 * Derive dispute PDA address
 * 
 * @param programId - The program ID
 * @param transaction - Transaction public key
 * @param complainant - Complainant public key
 * @param reason - Dispute reason (used as seed)
 * @returns The dispute PDA address
 */
export async function deriveDisputePda(
  programId: Address,
  transaction: Address,
  complainant: Address,
  reason: string
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      'dispute',
      transaction,
      complainant,
      reason
    ]
  })
  return address
}

/**
 * Dispute time utilities
 */
export class DisputeTimeUtils {
  /**
   * Get current timestamp in seconds
   */
  static now(): bigint {
    return BigInt(Math.floor(Date.now() / 1000))
  }

  /**
   * Convert days to seconds
   */
  static daysToSeconds(days: number): bigint {
    return BigInt(days * 24 * 3600)
  }

  /**
   * Check if dispute is overdue for resolution
   */
  static isOverdue(createdAt: bigint, maxDays: number = 14): boolean {
    const now = this.now()
    const maxDuration = this.daysToSeconds(maxDays)
    return (now - createdAt) > maxDuration
  }

  /**
   * Get days since dispute was created
   */
  static getDaysSinceCreated(createdAt: bigint): number {
    const now = this.now()
    return Math.floor(Number(now - createdAt) / 86400)
  }

  /**
   * Calculate resolution time in hours
   */
  static getResolutionTimeHours(createdAt: bigint, resolvedAt: bigint): number {
    return Number(resolvedAt - createdAt) / 3600
  }

  /**
   * Format time duration as human-readable string
   */
  static formatDuration(seconds: bigint): string {
    const totalSeconds = Number(seconds)
    
    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`
    } else if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60)
      return `${minutes} minutes`
    } else if (totalSeconds < 86400) {
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    } else {
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      return `${days}d ${hours}h`
    }
  }
}

/**
 * Dispute validation utilities
 */
export class DisputeValidationUtils {
  /**
   * Validate dispute filing parameters
   */
  static validateDisputeParams(params: {
    reason: string
    transaction: Address
    respondent: Address
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Reason validation
    if (!params.reason || params.reason.trim().length === 0) {
      errors.push('Dispute reason is required')
    }

    if (params.reason && params.reason.length < 10) {
      errors.push('Dispute reason must be at least 10 characters')
    }

    if (params.reason && params.reason.length > 500) {
      errors.push('Dispute reason cannot exceed 500 characters')
    }

    // Address validation
    if (params.transaction === params.respondent) {
      errors.push('Transaction and respondent cannot be the same address')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate evidence submission parameters
   */
  static validateEvidenceParams(params: {
    evidenceType: string
    evidenceData: string
    dispute: DisputeCase
    submitter: Address
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Evidence type validation
    if (!params.evidenceType || params.evidenceType.trim().length === 0) {
      errors.push('Evidence type is required')
    }

    const validEvidenceTypes = ['Documentation', 'Screenshot', 'Video', 'Communication', 'Contract', 'Other']
    if (params.evidenceType && !validEvidenceTypes.includes(params.evidenceType)) {
      errors.push(`Evidence type must be one of: ${validEvidenceTypes.join(', ')}`)
    }

    // Evidence data validation
    if (!params.evidenceData || params.evidenceData.trim().length === 0) {
      errors.push('Evidence data is required')
    }

    if (params.evidenceData && params.evidenceData.length < 10) {
      errors.push('Evidence data must be at least 10 characters')
    }

    if (params.evidenceData && params.evidenceData.length > 2000) {
      errors.push('Evidence data cannot exceed 2000 characters')
    }

    // Dispute status validation
    const allowedStatuses = [DisputeStatus.Filed, DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted]
    if (!allowedStatuses.includes(params.dispute.status)) {
      errors.push(`Cannot submit evidence for dispute with status: ${params.dispute.status}`)
    }

    // Authorization validation
    const authorizedSubmitters = [params.dispute.complainant, params.dispute.respondent]
    if (params.dispute.moderator?.__option === 'Some') {
      authorizedSubmitters.push(params.dispute.moderator.value)
    }
    
    if (!authorizedSubmitters.includes(params.submitter)) {
      errors.push('Submitter is not authorized to provide evidence for this dispute')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate dispute resolution parameters
   */
  static validateResolutionParams(params: {
    resolution: string
    dispute: DisputeCase
    moderator: Address
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Resolution validation
    if (!params.resolution || params.resolution.trim().length === 0) {
      errors.push('Resolution description is required')
    }

    if (params.resolution && params.resolution.length < 20) {
      errors.push('Resolution must be at least 20 characters')
    }

    if (params.resolution && params.resolution.length > 1000) {
      errors.push('Resolution cannot exceed 1000 characters')
    }

    // Dispute status validation
    const allowedStatuses = [
      DisputeStatus.Filed, 
      DisputeStatus.UnderReview, 
      DisputeStatus.EvidenceSubmitted, 
      DisputeStatus.Escalated
    ]
    if (!allowedStatuses.includes(params.dispute.status)) {
      errors.push(`Cannot resolve dispute with status: ${params.dispute.status}`)
    }

    // Moderator authorization (in production, check moderator registry)
    if (params.dispute.moderator?.__option === 'Some' && 
        params.dispute.moderator.value !== params.moderator) {
      errors.push('Only assigned moderator can resolve this dispute')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Dispute filtering and sorting utilities
 */
export class DisputeFilterUtils {
  /**
   * Filter disputes by status
   */
  static filterByStatus<T extends { status: DisputeStatus }>(
    disputes: T[],
    status: DisputeStatus
  ): T[] {
    return disputes.filter(dispute => dispute.status === status)
  }

  /**
   * Filter disputes by party involvement
   */
  static filterByParty<T extends { complainant: Address; respondent: Address }>(
    disputes: T[],
    partyAddress: Address
  ): T[] {
    return disputes.filter(dispute => 
      dispute.complainant === partyAddress || dispute.respondent === partyAddress
    )
  }

  /**
   * Filter disputes by time range
   */
  static filterByDateRange<T extends { createdAt: bigint }>(
    disputes: T[],
    startDate?: bigint,
    endDate?: bigint
  ): T[] {
    return disputes.filter(dispute => {
      if (startDate && dispute.createdAt < startDate) return false
      if (endDate && dispute.createdAt > endDate) return false
      return true
    })
  }

  /**
   * Filter disputes requiring attention
   */
  static filterRequiringAttention<T extends { 
    status: DisputeStatus
    createdAt: bigint
    humanReview: boolean
  }>(disputes: T[]): T[] {
    const now = DisputeTimeUtils.now()
    const urgentThreshold = DisputeTimeUtils.daysToSeconds(7)

    return disputes.filter(dispute => {
      // Active disputes that need review
      if ([DisputeStatus.Filed, DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted].includes(dispute.status)) {
        return true
      }
      
      // Disputes requiring human review
      if (dispute.humanReview && dispute.status === DisputeStatus.Escalated) {
        return true
      }
      
      // Urgent disputes (over 7 days old)
      if ((now - dispute.createdAt) > urgentThreshold && 
          dispute.status !== DisputeStatus.Resolved && 
          dispute.status !== DisputeStatus.Closed) {
        return true
      }
      
      return false
    })
  }

  /**
   * Sort disputes by creation time (newest first)
   */
  static sortByNewest<T extends { createdAt: bigint }>(disputes: T[]): T[] {
    return [...disputes].sort((a, b) => Number(b.createdAt - a.createdAt))
  }

  /**
   * Sort disputes by urgency (most urgent first)
   */
  static sortByUrgency<T extends { 
    createdAt: bigint
    status: DisputeStatus
    humanReview: boolean
  }>(disputes: T[]): T[] {
    return [...disputes].sort((a, b) => {
      // Calculate urgency score
      const getUrgencyScore = (dispute: T): number => {
        let score = 0
        
        // Age factor (older = more urgent)
        const ageInDays = DisputeTimeUtils.getDaysSinceCreated(dispute.createdAt)
        score += ageInDays * 10
        
        // Status factor
        switch (dispute.status) {
          case DisputeStatus.Escalated:
            score += 100
            break
          case DisputeStatus.EvidenceSubmitted:
            score += 50
            break
          case DisputeStatus.UnderReview:
            score += 30
            break
          case DisputeStatus.Filed:
            score += 20
            break
          default:
            score += 0
        }
        
        // Human review factor
        if (dispute.humanReview) {
          score += 75
        }
        
        return score
      }
      
      return getUrgencyScore(b) - getUrgencyScore(a)
    })
  }
}

/**
 * Dispute analytics utilities
 */
export class DisputeAnalyticsUtils {
  /**
   * Calculate dispute resolution statistics
   */
  static calculateResolutionStats<T extends { 
    status: DisputeStatus
    createdAt: bigint
    resolvedAt?: bigint
  }>(disputes: T[]): {
    totalDisputes: number
    resolvedDisputes: number
    resolutionRate: number
    averageResolutionTime: bigint
    activeDisputes: number
  } {
    const totalDisputes = disputes.length
    const resolvedDisputes = disputes.filter(d => 
      d.status === DisputeStatus.Resolved || d.status === DisputeStatus.Closed
    ).length
    
    const activeDisputes = disputes.filter(d => 
      [DisputeStatus.Filed, DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted, DisputeStatus.Escalated].includes(d.status)
    ).length

    const resolutionRate = totalDisputes > 0 ? resolvedDisputes / totalDisputes : 0

    // Calculate average resolution time
    const resolvedWithTime = disputes.filter(d => 
      d.resolvedAt && (d.status === DisputeStatus.Resolved || d.status === DisputeStatus.Closed)
    )
    
    const averageResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, d) => sum + (d.resolvedAt! - d.createdAt), 0n) / BigInt(resolvedWithTime.length)
      : 0n

    return {
      totalDisputes,
      resolvedDisputes,
      resolutionRate,
      averageResolutionTime,
      activeDisputes
    }
  }

  /**
   * Analyze dispute reasons frequency
   */
  static analyzeDisputeReasons<T extends { reason: string }>(
    disputes: T[]
  ): { reason: string; count: number; percentage: number }[] {
    const reasonCounts = new Map<string, number>()

    disputes.forEach(dispute => {
      const reason = dispute.reason.toLowerCase().trim()
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
    })

    const total = disputes.length
    return Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Calculate moderator performance metrics
   */
  static calculateModeratorStats<T extends { 
    moderator?: Address
    status: DisputeStatus
    createdAt: bigint
    resolvedAt?: bigint
  }>(disputes: T[]): Map<Address, {
    totalCases: number
    resolvedCases: number
    averageResolutionTime: bigint
    successRate: number
  }> {
    const moderatorStats = new Map<Address, {
      totalCases: number
      resolvedCases: number
      averageResolutionTime: bigint
      successRate: number
    }>()

    disputes.forEach(dispute => {
      if (!dispute.moderator) return

      const current = moderatorStats.get(dispute.moderator) ?? {
        totalCases: 0,
        resolvedCases: 0,
        averageResolutionTime: 0n,
        successRate: 0
      }

      current.totalCases++
      
      if (dispute.status === DisputeStatus.Resolved && dispute.resolvedAt) {
        current.resolvedCases++
        
        // Update average resolution time
        const resolutionTime = dispute.resolvedAt - dispute.createdAt
        current.averageResolutionTime = current.resolvedCases === 1
          ? resolutionTime
          : (current.averageResolutionTime * BigInt(current.resolvedCases - 1) + resolutionTime) / BigInt(current.resolvedCases)
      }

      current.successRate = current.totalCases > 0 ? current.resolvedCases / current.totalCases : 0
      moderatorStats.set(dispute.moderator, current)
    })

    return moderatorStats
  }

  /**
   * Get dispute trends over time
   */
  static getDisputeTrends<T extends { createdAt: bigint; status: DisputeStatus }>(
    disputes: T[],
    periodDays: number = 30
  ): {
    date: string
    filed: number
    resolved: number
    active: number
  }[] {
    const now = DisputeTimeUtils.now()
    const trends: {
      date: string
      filed: number
      resolved: number
      active: number
    }[] = []

    for (let i = periodDays; i >= 0; i--) {
      const dayStart = now - BigInt(i * 86400)
      const dayEnd = dayStart + BigInt(86400)
      
      const dayDisputes = disputes.filter(d => 
        d.createdAt >= dayStart && d.createdAt < dayEnd
      )

      const filed = dayDisputes.length
      const resolved = dayDisputes.filter(d => 
        d.status === DisputeStatus.Resolved || d.status === DisputeStatus.Closed
      ).length
      const active = dayDisputes.filter(d => 
        [DisputeStatus.Filed, DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted].includes(d.status)
      ).length

      trends.push({
        date: new Date(Number(dayStart) * 1000).toISOString().split('T')[0],
        filed,
        resolved,
        active
      })
    }

    return trends
  }
}

/**
 * Dispute status utilities
 */
export class DisputeStatusUtils {
  /**
   * Get status description
   */
  static getStatusDescription(status: DisputeStatus): string {
    switch (status) {
      case DisputeStatus.Filed:
        return 'Dispute has been filed and is awaiting initial review'
      case DisputeStatus.UnderReview:
        return 'Dispute is being reviewed by moderators'
      case DisputeStatus.EvidenceSubmitted:
        return 'Additional evidence has been submitted'
      case DisputeStatus.Resolved:
        return 'Dispute has been resolved'
      case DisputeStatus.Escalated:
        return 'Dispute has been escalated for human review'
      case DisputeStatus.Closed:
        return 'Dispute has been closed'
      default:
        return 'Unknown status'
    }
  }

  /**
   * Check if status allows evidence submission
   */
  static allowsEvidenceSubmission(status: DisputeStatus): boolean {
    return [
      DisputeStatus.Filed, 
      DisputeStatus.UnderReview, 
      DisputeStatus.EvidenceSubmitted
    ].includes(status)
  }

  /**
   * Check if status allows resolution
   */
  static allowsResolution(status: DisputeStatus): boolean {
    return [
      DisputeStatus.Filed, 
      DisputeStatus.UnderReview, 
      DisputeStatus.EvidenceSubmitted, 
      DisputeStatus.Escalated
    ].includes(status)
  }

  /**
   * Get next possible statuses
   */
  static getNextPossibleStatuses(currentStatus: DisputeStatus): DisputeStatus[] {
    switch (currentStatus) {
      case DisputeStatus.Filed:
        return [DisputeStatus.UnderReview, DisputeStatus.EvidenceSubmitted, DisputeStatus.Resolved, DisputeStatus.Closed]
      case DisputeStatus.UnderReview:
        return [DisputeStatus.EvidenceSubmitted, DisputeStatus.Resolved, DisputeStatus.Escalated, DisputeStatus.Closed]
      case DisputeStatus.EvidenceSubmitted:
        return [DisputeStatus.UnderReview, DisputeStatus.Resolved, DisputeStatus.Escalated, DisputeStatus.Closed]
      case DisputeStatus.Escalated:
        return [DisputeStatus.Resolved, DisputeStatus.Closed]
      case DisputeStatus.Resolved:
        return [DisputeStatus.Closed]
      case DisputeStatus.Closed:
        return []
      default:
        return []
    }
  }
}

/**
 * Evidence utilities
 */
export class EvidenceUtils {
  /**
   * Validate evidence type
   */
  static isValidEvidenceType(evidenceType: string): boolean {
    const validTypes = ['Documentation', 'Screenshot', 'Video', 'Communication', 'Contract', 'Other']
    return validTypes.includes(evidenceType)
  }

  /**
   * Get evidence type description
   */
  static getEvidenceTypeDescription(evidenceType: string): string {
    switch (evidenceType) {
      case 'Documentation':
        return 'Written documents, reports, or specifications'
      case 'Screenshot':
        return 'Screenshot images of interfaces or communications'
      case 'Video':
        return 'Video recordings or screen captures'
      case 'Communication':
        return 'Email threads, chat logs, or other communications'
      case 'Contract':
        return 'Contracts, agreements, or legal documents'
      case 'Other':
        return 'Other supporting evidence'
      default:
        return 'Unknown evidence type'
    }
  }

  /**
   * Sort evidence by submission time
   */
  static sortByTimestamp(evidence: DisputeEvidence[]): DisputeEvidence[] {
    return [...evidence].sort((a, b) => Number(a.timestamp - b.timestamp))
  }

  /**
   * Group evidence by submitter
   */
  static groupBySubmitter(evidence: DisputeEvidence[]): Map<Address, DisputeEvidence[]> {
    const grouped = new Map<Address, DisputeEvidence[]>()
    
    evidence.forEach(ev => {
      const existing = grouped.get(ev.submitter) ?? []
      existing.push(ev)
      grouped.set(ev.submitter, existing)
    })
    
    return grouped
  }

  /**
   * Get evidence summary statistics
   */
  static getEvidenceStats(evidence: DisputeEvidence[]): {
    totalPieces: number
    verifiedPieces: number
    verificationRate: number
    uniqueSubmitters: number
    evidenceTypes: Map<string, number>
  } {
    const totalPieces = evidence.length
    const verifiedPieces = evidence.filter(ev => ev.isVerified).length
    const verificationRate = totalPieces > 0 ? verifiedPieces / totalPieces : 0
    
    const uniqueSubmitters = new Set(evidence.map(ev => ev.submitter)).size
    
    const evidenceTypes = new Map<string, number>()
    evidence.forEach(ev => {
      evidenceTypes.set(ev.evidenceType, (evidenceTypes.get(ev.evidenceType) ?? 0) + 1)
    })
    
    return {
      totalPieces,
      verifiedPieces,
      verificationRate,
      uniqueSubmitters,
      evidenceTypes
    }
  }
}