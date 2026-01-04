import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getCreateEscrowInstructionAsync,
  getSubmitDeliveryInstruction,
  getApproveDeliveryInstruction,
  getFileDisputeInstruction,
  getArbitrateDisputeInstruction,
  type GhostProtectEscrow,
  type EscrowStatus,
  type ArbitratorDecision,
} from '../../generated/index.js'

export interface CreateEscrowParams {
  /** Agent providing the service */
  agent: Address
  /** Client's token account for payment */
  clientTokenAccount: Address
  /** Vault to hold escrowed funds */
  escrowVault: Address
  /** Token mint (e.g., USDC, GHOST) */
  tokenMint: Address
  /** Client who is paying */
  client: TransactionSigner
  /** Unique escrow identifier */
  escrowId: bigint
  /** Amount to escrow */
  amount: bigint
  /** Description of the job/service */
  jobDescription: string
  /** Deadline timestamp (unix seconds) */
  deadline: bigint
}

export interface SubmitDeliveryParams {
  /** Escrow account */
  escrow: Address
  /** Agent account address */
  agent: Address
  /** Agent owner signer */
  agentOwner: TransactionSigner
  /** Proof of work (IPFS hash, URL, etc.) */
  deliveryProof: string
}

export interface ApproveDeliveryParams {
  /** Escrow account */
  escrow: Address
  /** Vault holding escrowed funds */
  escrowVault: Address
  /** Agent's token account to receive payment */
  agentTokenAccount: Address
  /** Client approving the delivery */
  client: TransactionSigner
}

export interface FileDisputeParams {
  /** Escrow account */
  escrow: Address
  /** Client filing the dispute */
  client: TransactionSigner
  /** Reason for dispute */
  reason: string
}

export interface ArbitrateDisputeParams {
  /** Escrow account */
  escrow: Address
  /** Vault holding escrowed funds */
  escrowVault: Address
  /** Client's token account (for refund) */
  clientTokenAccount: Address
  /** Agent's token account (for payment) */
  agentTokenAccount: Address
  /** Agent's staking account (for potential slashing) */
  agentStaking: Address
  /** Arbitrator making the decision */
  arbitrator: TransactionSigner
  /** Decision: FavorClient, FavorAgent, Split, or Invalid */
  decision: ArbitratorDecision
}

export class EscrowModule extends BaseModule {
  /**
   * Create a new escrow for a service agreement
   *
   * @param params - Escrow creation parameters
   * @returns Transaction signature
   */
  async createEscrow(params: CreateEscrowParams): Promise<string> {
    const instruction = await getCreateEscrowInstructionAsync({
      agent: params.agent,
      clientTokenAccount: params.clientTokenAccount,
      escrowVault: params.escrowVault,
      tokenMint: params.tokenMint,
      client: params.client,
      escrowId: params.escrowId,
      amount: params.amount,
      jobDescription: params.jobDescription,
      deadline: params.deadline,
    }, { programAddress: this.programId })

    return this.execute('createEscrow', () => instruction, [params.client])
  }

  /**
   * Submit proof of delivery for an escrow
   *
   * @param params - Delivery submission parameters
   * @returns Transaction signature
   */
  async submitDelivery(params: SubmitDeliveryParams): Promise<string> {
    const instruction = getSubmitDeliveryInstruction({
      escrow: params.escrow,
      agent: params.agent,
      agentOwner: params.agentOwner,
      deliveryProof: params.deliveryProof,
    }, { programAddress: this.programId })

    return this.execute('submitDelivery', () => instruction, [params.agentOwner])
  }

  /**
   * Approve delivery and release funds to agent
   *
   * @param params - Approval parameters
   * @returns Transaction signature
   */
  async approveDelivery(params: ApproveDeliveryParams): Promise<string> {
    const instruction = getApproveDeliveryInstruction({
      escrow: params.escrow,
      escrowVault: params.escrowVault,
      agentTokenAccount: params.agentTokenAccount,
      client: params.client,
    }, { programAddress: this.programId })

    return this.execute('approveDelivery', () => instruction, [params.client])
  }

  /**
   * File a dispute for an escrow
   *
   * @param params - Dispute filing parameters
   * @returns Transaction signature
   */
  async fileDispute(params: FileDisputeParams): Promise<string> {
    const instruction = getFileDisputeInstruction({
      escrow: params.escrow,
      client: params.client,
      reason: params.reason,
    }, { programAddress: this.programId })

    return this.execute('fileDispute', () => instruction, [params.client])
  }

  /**
   * Arbitrate a disputed escrow
   *
   * @param params - Arbitration parameters
   * @returns Transaction signature
   */
  async arbitrateDispute(params: ArbitrateDisputeParams): Promise<string> {
    const instruction = getArbitrateDisputeInstruction({
      escrow: params.escrow,
      escrowVault: params.escrowVault,
      agentTokenAccount: params.agentTokenAccount,
      clientTokenAccount: params.clientTokenAccount,
      agentStaking: params.agentStaking,
      arbitrator: params.arbitrator,
      decision: params.decision,
    }, { programAddress: this.programId })

    return this.execute('arbitrateDispute', () => instruction, [params.arbitrator])
  }

  /**
   * Get escrow account data
   *
   * @param escrowAddress - The escrow account address
   * @returns Escrow data or null if not found
   */
  async getEscrow(escrowAddress: Address): Promise<GhostProtectEscrow | null> {
    try {
      return await this.getAccount<GhostProtectEscrow>(escrowAddress, 'getGhostProtectEscrowDecoder')
    } catch (error) {
      console.error('Error fetching escrow:', error)
      return null
    }
  }
}

// Re-export types for convenience
export type { GhostProtectEscrow, EscrowStatus, ArbitratorDecision }
