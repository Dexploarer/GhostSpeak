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
  fetchPayment,
  fetchWorkOrder,
  type Payment,
  type WorkOrder
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'

// Parameters for creating work orders (which handle escrow)
export interface CreateEscrowParams {
  orderId: bigint
  provider: Address
  title: string
  description: string
  requirements: string[]
  paymentAmount: bigint
  paymentToken: Address
  deadline: bigint
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
    signer: KeyPairSigner,
    workOrderAddress: Address,
    params: CreateEscrowParams
  ): Promise<string> {
    const instruction = getCreateWorkOrderInstruction({
      workOrder: workOrderAddress,
      client: signer as unknown as TransactionSigner,
      orderId: params.orderId,
      provider: params.provider,
      title: params.title,
      description: params.description,
      requirements: params.requirements,
      paymentAmount: params.paymentAmount,
      paymentToken: params.paymentToken,
      deadline: params.deadline
    })
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Release escrow funds by submitting work delivery
   */
  async release(
    signer: KeyPairSigner,
    workDeliveryAddress: Address,
    workOrderAddress: Address,
    deliverables: any[],
    ipfsHash: string,
    metadataUri: string
  ): Promise<string> {
    const instruction = getSubmitWorkDeliveryInstruction({
      workDelivery: workDeliveryAddress,
      workOrder: workOrderAddress,
      provider: signer as unknown as TransactionSigner,
      deliverables,
      ipfsHash,
      metadataUri
    })
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Cancel escrow and refund to buyer
   */
  async cancel(
    signer: KeyPairSigner,
    escrowAddress: Address
  ): Promise<string> {
    // TODO: Implement cancellation logic when available in contract
    throw new Error('Work order cancellation not yet available in smart contract')
  }

  /**
   * Dispute an escrow (requires arbitration)
   */
  async dispute(
    signer: KeyPairSigner,
    escrowAddress: Address,
    reason: string
  ): Promise<string> {
    // TODO: Implement dispute functionality using fileDispute instruction
    throw new Error('Dispute functionality requires dispute instruction implementation')
  }

  /**
   * Process payment through escrow
   */
  async processPayment(
    signer: KeyPairSigner,
    paymentAddress: Address,
    workOrderAddress: Address,
    providerAgent: Address,
    payerTokenAccount: Address,
    providerTokenAccount: Address,
    tokenMint: Address,
    amount: bigint,
    useConfidentialTransfer: boolean = false
  ): Promise<string> {
    const instruction = getProcessPaymentInstruction({
      payment: paymentAddress,
      workOrder: workOrderAddress,
      providerAgent,
      payer: signer as unknown as TransactionSigner,
      payerTokenAccount,
      providerTokenAccount,
      tokenMint,
      amount,
      useConfidentialTransfer
    })
    
    return this.sendTransaction([instruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Get work order (escrow) account information using 2025 patterns
   */
  async getAccount(workOrderAddress: Address): Promise<WorkOrder | null> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getWorkOrderDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      const workOrder = await rpcClient.getAndDecodeAccount(
        workOrderAddress,
        getWorkOrderDecoder(),
        this.commitment
      )
      
      return workOrder
    } catch (error) {
      console.warn('Failed to fetch work order account:', error)
      return null
    }
  }

  /**
   * Get all escrows for a user using 2025 patterns
   */
  async getEscrowsForUser(userAddress: Address): Promise<WorkOrder[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getWorkOrderDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all work orders and filter for this user
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getWorkOrderDecoder(),
        [], // No RPC filters - filtering client-side
        this.commitment
      )
      
      // Filter work orders where user is either client or provider
      const userWorkOrders = accounts
        .map(({ data }) => data)
        .filter(workOrder => 
          workOrder.client === userAddress || 
          workOrder.provider === userAddress
        )
      
      return userWorkOrders
    } catch (error) {
      console.warn('Failed to fetch user escrows:', error)
      return []
    }
  }

  /**
   * Get all active escrows using 2025 patterns
   */
  async getActiveEscrows(): Promise<WorkOrder[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getWorkOrderDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all work orders and filter for active ones
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getWorkOrderDecoder(),
        [], // No RPC filters - filtering client-side
        this.commitment
      )
      
      // Filter work orders that are active (not completed/cancelled)
      const { WorkOrderStatus } = await import('../../generated/index.js')
      const activeWorkOrders = accounts
        .map(({ data }) => data)
        .filter(workOrder => 
          workOrder.status === WorkOrderStatus.Open || 
          workOrder.status === WorkOrderStatus.InProgress ||
          workOrder.status === WorkOrderStatus.Submitted
        )
      
      return activeWorkOrders
    } catch (error) {
      console.warn('Failed to fetch active escrows:', error)
      return []
    }
  }
}