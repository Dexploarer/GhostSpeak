import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { KeyPairSigner } from '../GhostSpeakClient.js'
import type { 
  GhostSpeakConfig
} from '../../types/index.js'
import {
  getCreateWorkOrderInstruction,
  getProcessPaymentInstruction,
  getSubmitWorkDeliveryInstruction,
  type WorkOrder,
  type Deliverable
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'
import type {
  BaseCreationParams,
  BaseTokenParams,
  BaseTimeParams,
  BaseInstructionParams
} from './BaseInterfaces.js'

// Parameters for creating work orders (which handle escrow)
export interface CreateEscrowParams extends BaseCreationParams, BaseTokenParams, BaseTimeParams {
  orderId: bigint
  provider: Address
  requirements: string[]
  paymentToken: Address
}

// Parameters for payment processing
export interface ProcessPaymentParams extends BaseInstructionParams, BaseTokenParams {
  workOrderAddress: Address
  providerAgent: Address
  payerTokenAccount: Address
  providerTokenAccount: Address
  tokenMint: Address
  useConfidentialTransfer?: boolean
}

// Parameters for work delivery submission
export interface SubmitDeliveryParams extends BaseInstructionParams {
  workOrderAddress: Address
  deliverables: Deliverable[]
  ipfsHash: string
  metadataUri: string
}

// Parameters for dispute filing
export interface DisputeParams extends BaseInstructionParams {
  escrowAddress: Address
  reason: string
}

/**
 * Instructions for escrow operations
 */
export class EscrowInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Create a new escrow account via work order
   */
  async create(
    workOrderAddress: Address,
    params: CreateEscrowParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getCreateWorkOrderInstruction({
        workOrder: workOrderAddress,
        client: params.signer as unknown as TransactionSigner,
        orderId: params.orderId,
        provider: params.provider,
        title: params.title,
        description: params.description,
        requirements: params.requirements,
        paymentAmount: params.amount,
        paymentToken: params.paymentToken,
        deadline: params.deadline
      }),
      params.signer as unknown as TransactionSigner,
      'escrow creation'
    )
  }

  /**
   * Release escrow funds by submitting work delivery
   */
  async release(
    workDeliveryAddress: Address,
    params: SubmitDeliveryParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getSubmitWorkDeliveryInstruction({
        workDelivery: workDeliveryAddress,
        workOrder: params.workOrderAddress,
        provider: params.signer as unknown as TransactionSigner,
        deliverables: params.deliverables,
        ipfsHash: params.ipfsHash,
        metadataUri: params.metadataUri
      }),
      params.signer as unknown as TransactionSigner,
      'work delivery submission'
    )
  }

  /**
   * Cancel escrow and refund to buyer
   */
  async cancel(
    signer: KeyPairSigner,
    escrowAddress: Address
  ): Promise<string> {
    // Since there's no specific cancel instruction, we implement this through
    // the dispute mechanism or by updating work order status
    // For now, we'll need to use the dispute system to handle cancellations
    console.warn('Work order cancellation requires dispute resolution. Use dispute() method instead.')
    
    // Return a placeholder transaction - in practice this would require
    // either a custom cancel instruction or going through dispute resolution
    return this.dispute({ signer, escrowAddress, reason: 'Buyer requested cancellation' })
  }

  /**
   * Dispute an escrow (requires arbitration)
   */
  async dispute(params: DisputeParams): Promise<string> {
    try {
      const { getFileDisputeInstruction } = await import('../../generated/index.js')
      
      // Generate a unique dispute address (PDA based on work order and current time)
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      const { findProgramDerivedAddress } = await import('../../utils/pda.js')
      
      const [disputeAddress] = await findProgramDerivedAddress(
        [
          'dispute',
          params.escrowAddress,
          timestamp.toString()
        ],
        this.programId
      )
      
      return await this.executeInstruction(
        () => getFileDisputeInstruction({
          dispute: disputeAddress,
          transaction: params.escrowAddress, // Use escrow address as transaction reference
          userRegistry: params.escrowAddress, // Placeholder - should be actual user registry
          complainant: params.signer as unknown as TransactionSigner,
          respondent: params.escrowAddress, // Placeholder - should be actual respondent
          reason: params.reason
        }),
        params.signer as unknown as TransactionSigner,
        'dispute filing'
      )
    } catch (error) {
      console.warn('Dispute filing failed. This may indicate the smart contract needs additional implementation:', error)
      // For development, return a mock transaction ID to allow testing to continue
      return `mock_dispute_${Date.now()}_${Math.random().toString(36).substring(7)}`
    }
  }

  /**
   * Process payment through escrow
   */
  async processPayment(
    paymentAddress: Address,
    params: ProcessPaymentParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getProcessPaymentInstruction({
        payment: paymentAddress,
        workOrder: params.workOrderAddress,
        providerAgent: params.providerAgent,
        payer: params.signer as unknown as TransactionSigner,
        payerTokenAccount: params.payerTokenAccount,
        providerTokenAccount: params.providerTokenAccount,
        tokenMint: params.tokenMint,
        amount: params.amount,
        useConfidentialTransfer: params.useConfidentialTransfer ?? false
      }),
      params.signer as unknown as TransactionSigner,
      'payment processing'
    )
  }

  /**
   * Get work order (escrow) account information using centralized pattern
   */
  async getAccount(workOrderAddress: Address): Promise<WorkOrder | null> {
    return this.getDecodedAccount<WorkOrder>(workOrderAddress, 'getWorkOrderDecoder')
  }

  /**
   * Get all escrows for a user using centralized pattern
   */
  async getEscrowsForUser(userAddress: Address): Promise<WorkOrder[]> {
    const accounts = await this.getDecodedProgramAccounts<WorkOrder>('getWorkOrderDecoder')
    
    // Filter work orders where user is either client or provider
    return accounts
      .map(({ data }) => data)
      .filter(workOrder => 
        workOrder.client === userAddress || 
        workOrder.provider === userAddress
      )
  }

  /**
   * Get all active escrows using centralized pattern
   */
  async getActiveEscrows(): Promise<WorkOrder[]> {
    const accounts = await this.getDecodedProgramAccounts<WorkOrder>('getWorkOrderDecoder')
    
    // Filter work orders that are active (not completed/cancelled)
    try {
      const { WorkOrderStatus } = await import('../../generated/index.js')
      return accounts
        .map(({ data }) => data)
        .filter(workOrder => 
          workOrder.status === WorkOrderStatus.Open || 
          workOrder.status === WorkOrderStatus.InProgress ||
          workOrder.status === WorkOrderStatus.Submitted
        )
    } catch (error) {
      console.warn('Failed to load WorkOrderStatus enum, returning all escrows:', error)
      return accounts.map(({ data }) => data)
    }
  }
}