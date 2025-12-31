/**
 * Governance Helper Utilities
 * 
 * Comprehensive utilities for RBAC management, multi-signature wallets,
 * proposal lifecycle, and voting mechanisms.
 */

import type { Address } from '@solana/kit'
import { getAddressEncoder, getProgramDerivedAddress, getBytesEncoder } from '@solana/kit'
import {
  ProposalStatus,
  VoteChoice,
  // type Multisig, // TODO: Re-enable after multisig account is regenerated
  type GovernanceProposal,
  // type RbacConfig, // TODO: Re-enable after rbacConfig account is regenerated
  // type Role, // TODO: Re-enable after role type is regenerated
  type VotingResults,
  type QuorumRequirements
} from '../generated/index.js'

// =====================================================
// PDA DERIVATION
// =====================================================

/**
 * Derive multisig account PDA
 */
export async function deriveMultisigPda(
  programId: Address,
  authority: Address,
  multisigId: bigint
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([109, 117, 108, 116, 105, 115, 105, 103])), // 'multisig'
      getAddressEncoder().encode(authority),
      new Uint8Array(new BigUint64Array([multisigId]).buffer)
    ]
  })
  return pda
}

/**
 * Derive proposal account PDA
 */
export async function deriveProposalPda(
  programId: Address,
  multisig: Address,
  proposalId: bigint
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([112, 114, 111, 112, 111, 115, 97, 108])), // 'proposal'
      getAddressEncoder().encode(multisig),
      new Uint8Array(new BigUint64Array([proposalId]).buffer)
    ]
  })
  return pda
}

/**
 * Derive RBAC account PDA
 */
export async function deriveRbacPda(
  programId: Address,
  admin: Address
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([114, 98, 97, 99])), // 'rbac'
      getAddressEncoder().encode(admin)
    ]
  })
  return pda
}

// =====================================================
// MULTISIG UTILITIES
// =====================================================
// TODO: Re-enable after multisig account is regenerated
// MultisigUtils class removed due to missing Multisig type dependency

// =====================================================
// PROPOSAL UTILITIES
// =====================================================

export class ProposalUtils {
  /**
   * Check if proposal is in voting period
   */
  static isVotingOpen(proposal: GovernanceProposal): boolean {
    const now = BigInt(Math.floor(Date.now() / 1000))
    return proposal.status === ProposalStatus.Active &&
           now >= proposal.votingStartsAt &&
           now <= proposal.votingEndsAt
  }

  /**
   * Check if proposal has expired
   */
  static hasExpired(proposal: GovernanceProposal): boolean {
    const now = BigInt(Math.floor(Date.now() / 1000))
    return now > proposal.votingEndsAt
  }

  /**
   * Calculate time remaining for voting
   */
  static timeRemaining(proposal: GovernanceProposal): bigint {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (now >= proposal.votingEndsAt) return 0n
    return proposal.votingEndsAt - now
  }

  /**
   * Format time remaining as human-readable string
   */
  static formatTimeRemaining(proposal: GovernanceProposal): string {
    const remaining = this.timeRemaining(proposal)
    if (remaining === 0n) return 'Voting ended'

    const seconds = Number(remaining)
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  /**
   * Calculate if proposal has reached quorum
   */
  static hasReachedQuorum(
    votingResults: VotingResults,
    quorumRequirements: QuorumRequirements,
    totalEligibleVoters: number
  ): boolean {
    const totalVotes = Number(votingResults.votesFor + votingResults.votesAgainst + votingResults.votesAbstain)
    const participationRate = (totalVotes / totalEligibleVoters) * 100
    
    return participationRate >= quorumRequirements.minimumParticipation
  }

  /**
   * Calculate voting results summary
   */
  static calculateResults(votingResults: VotingResults): {
    total: number
    forPercentage: number
    againstPercentage: number
    abstainPercentage: number
    passed: boolean
  } {
    const total = Number(votingResults.votesFor + votingResults.votesAgainst + votingResults.votesAbstain)
    
    if (total === 0) {
      return {
        total: 0,
        forPercentage: 0,
        againstPercentage: 0,
        abstainPercentage: 0,
        passed: false
      }
    }

    const forPercentage = (Number(votingResults.votesFor) / total) * 100
    const againstPercentage = (Number(votingResults.votesAgainst) / total) * 100
    const abstainPercentage = (Number(votingResults.votesAbstain) / total) * 100
    
    // Simple majority (>50% for votes)
    const passed = votingResults.votesFor > votingResults.votesAgainst

    return {
      total,
      forPercentage,
      againstPercentage,
      abstainPercentage,
      passed
    }
  }

  /**
   * Validate proposal
   */
  static validateProposal(proposal: GovernanceProposal): { valid: boolean; error?: string } {
    if (!proposal.title || proposal.title.trim().length === 0) {
      return { valid: false, error: 'Title is required' }
    }

    if (proposal.title.length > 100) {
      return { valid: false, error: 'Title cannot exceed 100 characters' }
    }

    if (!proposal.description || proposal.description.trim().length === 0) {
      return { valid: false, error: 'Description is required' }
    }

    if (proposal.description.length > 5000) {
      return { valid: false, error: 'Description cannot exceed 5000 characters' }
    }

    return { valid: true }
  }
}

// =====================================================
// RBAC UTILITIES
// =====================================================
// TODO: Re-enable after rbacConfig account is regenerated
// RbacUtils class removed due to missing RbacConfig type dependency

// =====================================================
// VOTING UTILITIES
// =====================================================

export class VotingUtils {
  /**
   * Calculate vote weight based on token holdings or other factors
   */
  static calculateVoteWeight(
    baseWeight: number,
    tokenBalance?: bigint,
    stakeDuration?: bigint
  ): number {
    let weight = baseWeight

    // Apply token-based multiplier
    if (tokenBalance) {
      const tokenMultiplier = Math.min(Number(tokenBalance / 1000000n), 10) // Cap at 10x
      weight *= tokenMultiplier
    }

    // Apply time-based multiplier
    if (stakeDuration) {
      const daysStaked = Number(stakeDuration / 86400n)
      const timeMultiplier = 1 + (daysStaked / 365) // +100% per year
      weight *= timeMultiplier
    }

    return Math.floor(weight)
  }

  /**
   * Format vote choice as string
   */
  static formatVoteChoice(voteChoice: VoteChoice): string {
    switch (voteChoice) {
      case VoteChoice.For:
        return '✅ For'
      case VoteChoice.Against:
        return '❌ Against'
      case VoteChoice.Abstain:
        return '🤷 Abstain'
      default:
        return 'Unknown'
    }
  }

  /**
   * Calculate if simple majority is reached
   */
  static hasSimpleMajority(votingResults: VotingResults): boolean {
    return votingResults.votesFor > votingResults.votesAgainst
  }

  /**
   * Calculate if supermajority is reached (2/3)
   */
  static hasSupermajority(votingResults: VotingResults): boolean {
    const totalVotes = votingResults.votesFor + votingResults.votesAgainst
    if (totalVotes === 0n) return false
    
    const forPercentage = Number(votingResults.votesFor) / Number(totalVotes)
    return forPercentage >= 0.667
  }
}

// =====================================================
// PERMISSION TEMPLATES
// =====================================================

export const PERMISSION_TEMPLATES = {
  // Admin permissions
  ADMIN: {
    CREATE_PROPOSAL: { action: 'create', resource: 'proposal' },
    EXECUTE_PROPOSAL: { action: 'execute', resource: 'proposal' },
    MANAGE_ROLES: { action: 'manage', resource: 'roles' },
    MANAGE_TREASURY: { action: 'manage', resource: 'treasury' }
  },
  
  // Member permissions
  MEMBER: {
    VOTE: { action: 'vote', resource: 'proposal' },
    VIEW: { action: 'view', resource: 'all' },
    COMMENT: { action: 'comment', resource: 'proposal' }
  },
  
  // Moderator permissions
  MODERATOR: {
    CANCEL_PROPOSAL: { action: 'cancel', resource: 'proposal' },
    MODERATE_COMMENTS: { action: 'moderate', resource: 'comments' },
    VIEW_REPORTS: { action: 'view', resource: 'reports' }
  }
}

// =====================================================
// ROLE TEMPLATES
// =====================================================

export const ROLE_TEMPLATES = {
  ADMIN: {
    name: 'Administrator',
    description: 'Full administrative access',
    permissions: Object.values(PERMISSION_TEMPLATES.ADMIN)
  },
  
  MEMBER: {
    name: 'Member',
    description: 'Standard member access',
    permissions: Object.values(PERMISSION_TEMPLATES.MEMBER)
  },
  
  MODERATOR: {
    name: 'Moderator',
    description: 'Content moderation access',
    permissions: [
      ...Object.values(PERMISSION_TEMPLATES.MEMBER),
      ...Object.values(PERMISSION_TEMPLATES.MODERATOR)
    ]
  }
}

// =====================================================
// GOVERNANCE ANALYTICS
// =====================================================

export interface GovernanceAnalytics {
  totalProposals: number
  activeProposals: number
  passedProposals: number
  failedProposals: number
  averageVoterTurnout: number
  topVoters: { address: Address; voteCount: number }[]
  proposalCategories: { category: string; count: number }[]
}

export class GovernanceAnalyticsUtils {
  /**
   * Calculate governance health score (0-100)
   */
  static calculateHealthScore(analytics: GovernanceAnalytics): number {
    let score = 0

    // Voter turnout (40 points max)
    score += Math.min(analytics.averageVoterTurnout * 0.4, 40)

    // Proposal success rate (30 points max)
    const totalCompleted = analytics.passedProposals + analytics.failedProposals
    if (totalCompleted > 0) {
      const successRate = analytics.passedProposals / totalCompleted
      score += successRate * 30
    }

    // Activity level (30 points max)
    const activityRatio = analytics.activeProposals / Math.max(analytics.totalProposals, 1)
    score += Math.min(activityRatio * 60, 30)

    return Math.round(score)
  }

  /**
   * Generate governance summary report
   */
  static generateSummaryReport(analytics: GovernanceAnalytics): string {
    const healthScore = this.calculateHealthScore(analytics)
    const successRate = analytics.totalProposals > 0
      ? Math.round((analytics.passedProposals / analytics.totalProposals) * 100)
      : 0

    return `
Governance Summary:
- Total Proposals: ${analytics.totalProposals}
- Active: ${analytics.activeProposals}
- Success Rate: ${successRate}%
- Avg Turnout: ${Math.round(analytics.averageVoterTurnout)}%
- Health Score: ${healthScore}/100
    `.trim()
  }
}