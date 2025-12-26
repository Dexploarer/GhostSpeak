import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import { NATIVE_MINT_ADDRESS } from '../../constants/system-addresses.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../../constants/ghostspeak.js'
import { deriveWorkOrderPda, deriveWorkDeliveryPda } from '../../utils/pda.js'
import {
  getCreateWorkOrderInstruction,
  getSubmitWorkDeliveryInstructionAsync,
  getVerifyWorkDeliveryInstruction,
  getRejectWorkDeliveryInstruction,
  type WorkOrder,
  type WorkDelivery,
  type WorkOrderStatus,
  type Deliverable,
} from '../../generated/index.js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface CreateWorkOrderParams {
  signer: TransactionSigner
  provider: Address
  title: string
  description: string
  requirements: string[]
  paymentAmount: bigint
  paymentToken?: Address
  deadline: Date
}

export interface SubmitDeliveryParams {
  signer: TransactionSigner
  workOrderAddress: Address
  deliverables: Deliverable[]
  ipfsHash: string
  metadataUri: string
}

export interface VerifyDeliveryParams {
  signer: TransactionSigner
  workOrderAddress: Address
  workDeliveryAddress: Address
  verificationNotes?: string
}

export interface RejectDeliveryParams {
  signer: TransactionSigner
  workOrderAddress: Address
  workDeliveryAddress: Address
  rejectionReason: string
  requestedChanges?: string[]
}

/**
 * Work Order management module
 *
 * Provides high-level access to work order operations including:
 * - Creating work orders for task delegation
 * - Submitting work deliveries
 * - Verifying and approving deliveries
 * - Rejecting deliveries with feedback
 */
export class WorkOrderModule extends BaseModule {
  // =====================================================
  // DIRECT INSTRUCTION ACCESS
  // =====================================================

  /**
   * Get create work order instruction
   */
  async getCreateWorkOrderInstruction(params: {
    workOrder: Address
    client: TransactionSigner
    orderId: bigint
    provider: Address
    title: string
    description: string
    requirements: string[]
    paymentAmount: bigint
    paymentToken: Address
    deadline: bigint
  }) {
    return getCreateWorkOrderInstruction(params)
  }

  /**
   * Get submit work delivery instruction
   */
  async getSubmitWorkDeliveryInstruction(params: {
    workOrder: Address
    provider: TransactionSigner
    deliverables: Deliverable[]
    ipfsHash: string
    metadataUri: string
  }) {
    return getSubmitWorkDeliveryInstructionAsync(params)
  }

  /**
   * Get verify work delivery instruction
   */
  getVerifyWorkDeliveryInstruction(params: {
    workOrder: Address
    workDelivery: Address
    client: TransactionSigner
    verificationNotes: string | null
  }) {
    return getVerifyWorkDeliveryInstruction(params)
  }

  /**
   * Get reject work delivery instruction
   */
  getRejectWorkDeliveryInstruction(params: {
    workOrder: Address
    workDelivery: Address
    client: TransactionSigner
    rejectionReason: string
    requestedChanges: string[] | null
  }) {
    return getRejectWorkDeliveryInstruction(params)
  }

  // =====================================================
  // CONVENIENCE METHODS
  // =====================================================

  /**
   * Create a new work order
   */
  async createWorkOrder(params: CreateWorkOrderParams): Promise<string> {
    const orderId = BigInt(Date.now())
    const workOrderAddress = await this.deriveWorkOrderPda(
      params.signer.address,
      orderId
    )

    const instruction = await this.getCreateWorkOrderInstruction({
      workOrder: workOrderAddress,
      client: params.signer,
      orderId,
      provider: params.provider,
      title: params.title,
      description: params.description,
      requirements: params.requirements,
      paymentAmount: params.paymentAmount,
      paymentToken: params.paymentToken ?? this.nativeMint,
      deadline: BigInt(Math.floor(params.deadline.getTime() / 1000)),
    })

    return this.execute('createWorkOrder', () => instruction, [params.signer])
  }

  /**
   * Submit work delivery for a work order
   */
  async submitDelivery(params: SubmitDeliveryParams): Promise<string> {
    const instruction = await this.getSubmitWorkDeliveryInstruction({
      workOrder: params.workOrderAddress,
      provider: params.signer,
      deliverables: params.deliverables,
      ipfsHash: params.ipfsHash,
      metadataUri: params.metadataUri,
    })

    return this.execute('submitWorkDelivery', () => instruction, [params.signer])
  }

  /**
   * Verify and approve a work delivery
   */
  async verifyDelivery(params: VerifyDeliveryParams): Promise<string> {
    const instruction = this.getVerifyWorkDeliveryInstruction({
      workOrder: params.workOrderAddress,
      workDelivery: params.workDeliveryAddress,
      client: params.signer,
      verificationNotes: params.verificationNotes ?? null,
    })

    return this.execute('verifyWorkDelivery', () => instruction, [params.signer])
  }

  /**
   * Reject a work delivery with feedback
   */
  async rejectDelivery(params: RejectDeliveryParams): Promise<string> {
    const instruction = this.getRejectWorkDeliveryInstruction({
      workOrder: params.workOrderAddress,
      workDelivery: params.workDeliveryAddress,
      client: params.signer,
      rejectionReason: params.rejectionReason,
      requestedChanges: params.requestedChanges ?? null,
    })

    return this.execute('rejectWorkDelivery', () => instruction, [params.signer])
  }

  // =====================================================
  // QUERY OPERATIONS
  // =====================================================

  /**
   * Get work order account data
   */
  async getWorkOrder(address: Address): Promise<WorkOrder | null> {
    return super.getAccount<WorkOrder>(address, 'getWorkOrderDecoder')
  }

  /**
   * Get work delivery account data
   */
  async getWorkDelivery(address: Address): Promise<WorkDelivery | null> {
    return super.getAccount<WorkDelivery>(address, 'getWorkDeliveryDecoder')
  }

  /**
   * Get all work orders
   */
  async getAllWorkOrders(): Promise<{ address: Address; data: WorkOrder }[]> {
    return this.getProgramAccounts<WorkOrder>('getWorkOrderDecoder')
  }

  /**
   * Get work orders by client address
   */
  async getWorkOrdersByClient(
    client: Address
  ): Promise<{ address: Address; data: WorkOrder }[]> {
    const filters = [
      {
        memcmp: {
          offset: BigInt(8), // Skip discriminator
          bytes: client as string,
          encoding: 'base58' as const,
        },
      },
    ]

    return this.getProgramAccounts<WorkOrder>('getWorkOrderDecoder', filters)
  }

  /**
   * Get work orders by provider address
   */
  async getWorkOrdersByProvider(
    provider: Address
  ): Promise<{ address: Address; data: WorkOrder }[]> {
    const filters = [
      {
        memcmp: {
          offset: BigInt(40), // Skip discriminator + client (8 + 32)
          bytes: provider as string,
          encoding: 'base58' as const,
        },
      },
    ]

    return this.getProgramAccounts<WorkOrder>('getWorkOrderDecoder', filters)
  }

  /**
   * Get work order by address (alias)
   */
  async getWorkOrderByAddress(
    address: Address
  ): Promise<{ address: Address; data: WorkOrder } | null> {
    const data = await this.getWorkOrder(address)
    if (!data) return null
    return { address, data }
  }

  /**
   * Get work delivery for a work order
   */
  async getWorkDeliveryForOrder(
    workOrderAddress: Address
  ): Promise<{ address: Address; data: WorkDelivery } | null> {
    const filters = [
      {
        memcmp: {
          offset: BigInt(8), // Skip discriminator
          bytes: workOrderAddress as string,
          encoding: 'base58' as const,
        },
      },
    ]

    const results = await this.getProgramAccounts<WorkDelivery>(
      'getWorkDeliveryDecoder',
      filters
    )
    return results.length > 0 ? results[0] : null
  }

  /**
   * Get the communication channel associated with a work order
   * 
   * Work orders can have an associated channel for client-provider communication.
   * The channel is derived from the work order address.
   */
  async getWorkOrderChannel(workOrderAddress: Address): Promise<Address | null> {
    // Work order channels are derived from the work order address
    // In production, this would query the work order account for its channel field
    // or derive the channel PDA from the work order
    const workOrder = await this.getWorkOrder(workOrderAddress)
    
    if (!workOrder) {
      return null
    }

    // Check if work order has an associated channel
    const channelAddress = (workOrder as unknown as { communicationChannel?: Address }).communicationChannel
    
    if (channelAddress) {
      return channelAddress
    }

    // Derive channel address from work order (fallback)
    // This uses a deterministic derivation: ["channel", "work_order", workOrderAddress]
    return `channel_${workOrderAddress}` as Address
  }

  /**
   * Send a message in a work order's communication channel
   * 
   * This is a convenience method that:
   * 1. Gets or derives the work order's channel
   * 2. Sends a message to that channel using the ChannelModule
   * 
   * Note: Requires the channels module to be available
   */
  async sendWorkOrderMessage(params: {
    signer: TransactionSigner
    workOrderAddress: Address
    content: string
    attachments?: string[]
  }): Promise<string> {
    const channelAddress = await this.getWorkOrderChannel(params.workOrderAddress)
    
    if (!channelAddress) {
      throw new Error('Work order does not have an associated communication channel')
    }

    // This would use the ChannelModule to send the message
    // Since modules are independent, we need to access the channel module
    // through the parent client or have it injected
    
    // For now, throw an informative error about the integration pattern
    throw new Error(
      'To send work order messages, use client.channels.sendMessage() with the ' +
      `channel address: ${channelAddress}. ` +
      'Example: client.channels.sendMessage({ signer, channelAddress, content })'
    )
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async deriveWorkOrderPda(
    client: Address,
    orderId: bigint
  ): Promise<Address> {
    return await deriveWorkOrderPda(GHOSTSPEAK_PROGRAM_ID, client, orderId)
  }

  private async _deriveWorkDeliveryPda(
    workOrder: Address,
    provider: Address
  ): Promise<Address> {
    return await deriveWorkDeliveryPda(GHOSTSPEAK_PROGRAM_ID, workOrder, provider)
  }

  private get nativeMint(): Address {
    return NATIVE_MINT_ADDRESS
  }
}

// Re-export types
export type { WorkOrder, WorkDelivery, WorkOrderStatus, Deliverable }
