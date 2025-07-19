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
  orderId?: bigint
  provider: Address
  requirements?: string[]
  paymentToken?: Address
}

// Parameters for payment processing
export interface ProcessPaymentParams extends BaseInstructionParams, BaseTokenParams {
  workOrderAddress: Address
  providerAgent: Address
  payerTokenAccount?: Address
  providerTokenAccount?: Address
  tokenMint?: Address
  useConfidentialTransfer?: boolean
}

// Parameters for work delivery submission
export interface SubmitDeliveryParams extends BaseInstructionParams {
  workOrderAddress: Address
  deliverables?: Deliverable[]
  ipfsHash?: string
  metadataUri?: string
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
   * Resolve escrow creation parameters with smart defaults
   */
  private async _resolveCreateParams(
    params: CreateEscrowParams
  ): Promise<Required<CreateEscrowParams>> {
    // Get USDC token mint as default payment token
    const defaultPaymentToken = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address // USDC on mainnet
    
    return {
      title: params.title,
      description: params.description,
      amount: params.amount,
      orderId: params.orderId ?? BigInt(Date.now()), // Use timestamp as order ID
      provider: params.provider,
      requirements: params.requirements ?? [],
      paymentToken: params.paymentToken ?? defaultPaymentToken,
      deadline: params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60), // 30 days default
      signer: params.signer,
      tokenMint: params.tokenMint ?? defaultPaymentToken,
      createdAt: params.createdAt ?? BigInt(Math.floor(Date.now() / 1000))
    }
  }

  /**
   * Resolve payment processing parameters with smart defaults
   */
  private async _resolvePaymentParams(
    params: ProcessPaymentParams
  ): Promise<Required<ProcessPaymentParams>> {
    // Get USDC token mint as default
    const defaultTokenMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address // USDC on mainnet
    
    // Generate default token accounts if not provided
    // In production, these would be derived from the user's wallet and token mint
    const defaultPayerToken = params.payerTokenAccount ?? params.signer.address
    const defaultProviderToken = params.providerTokenAccount ?? params.providerAgent
    
    return {
      workOrderAddress: params.workOrderAddress,
      providerAgent: params.providerAgent,
      payerTokenAccount: defaultPayerToken,
      providerTokenAccount: defaultProviderToken,
      tokenMint: params.tokenMint ?? defaultTokenMint,
      amount: params.amount,
      useConfidentialTransfer: params.useConfidentialTransfer ?? false,
      signer: params.signer
    }
  }

  /**
   * Resolve delivery submission parameters with smart defaults
   */
  private async _resolveDeliveryParams(
    params: SubmitDeliveryParams
  ): Promise<Required<SubmitDeliveryParams>> {
    return {
      workOrderAddress: params.workOrderAddress,
      deliverables: params.deliverables ?? [],
      ipfsHash: params.ipfsHash ?? '',
      metadataUri: params.metadataUri ?? `https://ghostspeak.io/delivery/${Date.now()}`,
      signer: params.signer
    }
  }

  /**
   * Create a new escrow account via work order
   */
  async create(
    workOrderAddress: Address,
    params: CreateEscrowParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolveCreateParams(params)
    
    return this.executeInstruction(
      () => getCreateWorkOrderInstruction({
        workOrder: workOrderAddress,
        client: resolvedParams.signer as unknown as TransactionSigner,
        orderId: resolvedParams.orderId,
        provider: resolvedParams.provider,
        title: resolvedParams.title,
        description: resolvedParams.description,
        requirements: resolvedParams.requirements,
        paymentAmount: resolvedParams.amount,
        paymentToken: resolvedParams.paymentToken,
        deadline: resolvedParams.deadline
      }),
      resolvedParams.signer as unknown as TransactionSigner,
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
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolveDeliveryParams(params)
    
    return this.executeInstruction(
      () => getSubmitWorkDeliveryInstruction({
        workDelivery: workDeliveryAddress,
        workOrder: resolvedParams.workOrderAddress,
        provider: resolvedParams.signer as unknown as TransactionSigner,
        deliverables: resolvedParams.deliverables,
        ipfsHash: resolvedParams.ipfsHash,
        metadataUri: resolvedParams.metadataUri
      }),
      resolvedParams.signer as unknown as TransactionSigner,
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
    console.log('Work order cancellation through dispute resolution...')
    
    // Implement cancellation through dispute resolution mechanism
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
      console.error('Dispute filing failed:', error)
      throw error
    }
  }

  /**
   * Process payment through escrow
   */
  async processPayment(
    paymentAddress: Address,
    params: ProcessPaymentParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolvePaymentParams(params)
    
    return this.executeInstruction(
      () => getProcessPaymentInstruction({
        payment: paymentAddress,
        workOrder: resolvedParams.workOrderAddress,
        providerAgent: resolvedParams.providerAgent,
        payer: resolvedParams.signer as unknown as TransactionSigner,
        payerTokenAccount: resolvedParams.payerTokenAccount,
        providerTokenAccount: resolvedParams.providerTokenAccount,
        tokenMint: resolvedParams.tokenMint,
        amount: resolvedParams.amount,
        useConfidentialTransfer: resolvedParams.useConfidentialTransfer
      }),
      resolvedParams.signer as unknown as TransactionSigner,
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