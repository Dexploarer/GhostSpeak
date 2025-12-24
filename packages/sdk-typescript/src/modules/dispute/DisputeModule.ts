/**
 * Dispute Module
 *
 * Manages dispute resolution for escrow transactions.
 * Provides read access to dispute data.
 */

import type { Address } from '@solana/addresses'
import { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder, getUtf8Encoder } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import type { DisputeCase } from '../../generated/index.js'

/**
 * Dispute resolution outcome
 */
export enum DisputeResolution {
  FavorComplainant = 0,
  FavorRespondent = 1,
  Split = 2,
  Dismissed = 3,
}

/**
 * Evidence type for disputes
 */
export interface EvidenceSubmission {
  evidenceType: 'document' | 'screenshot' | 'message' | 'other'
  description: string
  contentHash: string
  uri?: string
}

/**
 * Dispute module for handling escrow disputes
 */
export class DisputeModule extends BaseModule {
  /**
   * Derive dispute case PDA
   * Seeds: ["dispute", transaction_address, complainant, reason]
   */
  async deriveDisputePda(
    transactionAddress: Address,
    complainant: Address,
    reason: string
  ): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('dispute')),
        getAddressEncoder().encode(transactionAddress),
        getAddressEncoder().encode(complainant),
        getUtf8Encoder().encode(reason),
      ],
    })
    return pda
  }

  /**
   * Get dispute case by address
   */
  async getDisputeCase(address: Address): Promise<DisputeCase | null> {
    return this.getAccount<DisputeCase>(address, 'DisputeCase')
  }

  /**
   * Get all disputes
   */
  async getAllDisputes(): Promise<{ address: Address; data: DisputeCase }[]> {
    return this.getProgramAccounts<DisputeCase>('DisputeCase')
  }

  /**
   * Get disputes by complainant
   */
  async getDisputesByComplainant(
    complainant: Address
  ): Promise<{ address: Address; data: DisputeCase }[]> {
    const allDisputes = await this.getAllDisputes()
    return allDisputes.filter((d) => d.data.complainant === complainant)
  }

  /**
   * Get disputes by respondent
   */
  async getDisputesByRespondent(
    respondent: Address
  ): Promise<{ address: Address; data: DisputeCase }[]> {
    const allDisputes = await this.getAllDisputes()
    return allDisputes.filter((d) => d.data.respondent === respondent)
  }

  /**
   * Get pending disputes (awaiting resolution)
   */
  async getPendingDisputes(): Promise<{ address: Address; data: DisputeCase }[]> {
    const allDisputes = await this.getAllDisputes()
    return allDisputes.filter(
      (d) => !d.data.resolvedAt || (d.data.resolvedAt as { __option: string }).__option === 'None'
    )
  }

  /**
   * Check if a dispute is resolved
   */
  isResolved(dispute: DisputeCase): boolean {
    return dispute.resolvedAt !== null && 
           (dispute.resolvedAt as { __option: string }).__option !== 'None'
  }

  /**
   * Get evidence count for a dispute
   */
  getEvidenceCount(dispute: DisputeCase): number {
    return dispute.evidence?.length ?? 0
  }

  /**
   * Get AI confidence score (0-100)
   */
  getAiConfidence(dispute: DisputeCase): number {
    return Math.round(dispute.aiScore * 100)
  }

  /**
   * Check if dispute requires human review
   */
  requiresHumanReview(dispute: DisputeCase): boolean {
    return dispute.humanReview || dispute.aiScore < 0.7
  }
}
