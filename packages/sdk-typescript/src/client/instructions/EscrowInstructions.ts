import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type { 
  GhostSpeakConfig
} from '../../types/index.js'
import {
  getCreateWorkOrderInstruction,
  getProcessPaymentInstruction,
  getSubmitWorkDeliveryInstruction,
  getVerifyWorkDeliveryInstruction,
  getRejectWorkDeliveryInstruction,
  getCancelEscrowInstruction,
  getRefundExpiredEscrowInstruction,
  getProcessPartialRefundInstruction,
  getCreateEscrowInstruction,
  getCompleteEscrowInstruction,
  getProcessEscrowPaymentInstruction,
  getDisputeEscrowInstruction,
  type WorkOrder,
  type WorkDelivery,
  type Deliverable,
  type Escrow
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'
import type {
  BaseCreationParams,
  BaseTokenParams,
  BaseTimeParams,
  BaseInstructionParams
} from './BaseInterfaces.js'
import type { TransactionSigner } from '@solana/kit'
import {
  getAssociatedTokenAccount,
  detectTokenProgram,
  isToken2022Mint,
  type AssociatedTokenAccount
} from '../../utils/token-utils.js'
import {
  calculateTransferFee,
  createTransferFeeConfig,
  type TransferFeeCalculation,
  type ConfidentialTransferProof
} from '../../utils/token-2022-extensions.js'

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
  /** Transfer fee configuration (for Token 2022) */
  expectTransferFees?: boolean
  /** Maximum slippage for transfer fees (basis points) */
  maxFeeSlippageBasisPoints?: number
  /** Confidential transfer proof (required if using confidential transfers) */
  confidentialProof?: ConfidentialTransferProof | null
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

// Parameters for escrow cancellation
export interface CancelEscrowParams extends BaseInstructionParams {
  escrowAddress: Address
  cancellationReason: string
  paymentToken: Address
}

// Parameters for expired escrow refund
export interface RefundExpiredEscrowParams extends BaseInstructionParams {
  escrowAddress: Address
  paymentToken: Address
}

// Parameters for partial refund processing
export interface ProcessPartialRefundParams extends BaseInstructionParams {
  escrowAddress: Address
  clientRefundPercentage: number // 0-100
  paymentToken: Address
}

// Parameters for real escrow creation
export interface CreateRealEscrowParams extends BaseInstructionParams {
  taskId: string
  agent: Address
  amount: bigint
  expiresAt: bigint
  paymentToken: Address
  transferHook?: Address | null
  isConfidential?: boolean
}

// Parameters for completing escrow (agent marks work as done)
export interface CompleteEscrowParams extends BaseInstructionParams {
  escrowAddress: Address
  resolutionNotes?: string | null
}

// Parameters for processing escrow payment release
export interface ProcessEscrowPaymentParams extends BaseInstructionParams {
  escrowAddress: Address
  workOrder: Address
  paymentToken: Address
}

// Parameters for disputing escrow
export interface DisputeEscrowParams extends BaseInstructionParams {
  escrowAddress: Address
  disputeReason: string
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
deadline: params.deadline, // 30 days default
      signer: params.signer,
      tokenMint: params.tokenMint ?? defaultPaymentToken,
      createdAt: params.createdAt ?? BigInt(Math.floor(Date.now() / 1000))
    }
  }

  /**
   * Resolve payment processing parameters with smart defaults and proper ATA derivation
   */
  private async _resolvePaymentParams(
    params: ProcessPaymentParams
  ): Promise<Required<ProcessPaymentParams & {
    expectTransferFees: boolean
    maxFeeSlippageBasisPoints: number
    confidentialProof: ConfidentialTransferProof | null
  }>> {
    // Get USDC token mint as default
    const defaultTokenMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address // USDC on mainnet
    const tokenMint = params.tokenMint ?? defaultTokenMint
    
    // Detect token program and derive proper ATAs
    const tokenProgram = await detectTokenProgram(tokenMint)
    const isToken2022 = await isToken2022Mint(tokenMint)
    
    console.log('🔍 Token Analysis:')
    console.log(`   Token mint: ${tokenMint}`)
    console.log(`   Token program: ${tokenProgram}`)
    console.log(`   Is Token 2022: ${isToken2022}`)
    
    // Derive proper Associated Token Accounts
    let payerTokenAccount: Address
    let providerTokenAccount: Address
    
    if (params.payerTokenAccount) {
      payerTokenAccount = params.payerTokenAccount
    } else {
      const payerAta = await getAssociatedTokenAccount(
        params.signer.address,
        tokenMint,
        tokenProgram
      )
      payerTokenAccount = payerAta.address
      console.log(`   Derived payer ATA: ${payerTokenAccount}`)
    }
    
    if (params.providerTokenAccount) {
      providerTokenAccount = params.providerTokenAccount
    } else {
      const providerAta = await getAssociatedTokenAccount(
        params.providerAgent,
        tokenMint,
        tokenProgram
      )
      providerTokenAccount = providerAta.address
      console.log(`   Derived provider ATA: ${providerTokenAccount}`)
    }
    
    console.log('💰 Payment Resolution:')
    console.log(`   Payer token account: ${payerTokenAccount}`)
    console.log(`   Provider token account: ${providerTokenAccount}`)
    console.log(`   Using confidential transfers: ${params.useConfidentialTransfer ?? false}`)
    
    return {
      workOrderAddress: params.workOrderAddress,
      providerAgent: params.providerAgent,
      payerTokenAccount,
      providerTokenAccount,
      tokenMint,
      amount: params.amount,
      useConfidentialTransfer: params.useConfidentialTransfer ?? false,
      expectTransferFees: params.expectTransferFees ?? isToken2022,
      maxFeeSlippageBasisPoints: params.maxFeeSlippageBasisPoints ?? 500, // 5% default slippage
      confidentialProof: params.confidentialProof ?? null,
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
   * Create a work order (escrow with specific metadata)
   */
  async createWorkOrder(
    signer: TransactionSigner,
    params: {
      orderId: bigint
      provider: Address
      amount: bigint
      metadataUri: string
      deadline: number
    }
  ): Promise<string> {
    // Derive the work order PDA
    const { deriveWorkOrderPda } = await import('../../utils/pda.js')
    const workOrderAddress = await deriveWorkOrderPda(
      this.config.programId!,
      signer.address,
      params.orderId
    )
    
    // Parse metadata from URI
    let title = 'Work Order'
    let description = 'Work order task'
    const requirements: string[] = []
    
    if (params.metadataUri.startsWith('data:application/json;base64,')) {
      try {
        const base64Data = params.metadataUri.split(',')[1]
        const metadataJson = Buffer.from(base64Data, 'base64').toString()
        const metadata = JSON.parse(metadataJson) as {
          title?: string
          description?: string
          deliverables?: string[]
        }
        title = metadata.title ?? title
        description = metadata.description ?? description
        if (metadata.deliverables) {
          requirements.push(...metadata.deliverables)
        }
      } catch (e) {
        console.warn('Failed to parse metadata URI:', e)
      }
    }
    
    // Build the instruction
    const instruction = getCreateWorkOrderInstruction({
      workOrder: workOrderAddress,
      client: signer,
      orderId: params.orderId,
      provider: params.provider,
      title,
      description,
      requirements,
      paymentAmount: params.amount,
      paymentToken: address('So11111111111111111111111111111111111111112'), // SOL mint
      deadline: BigInt(params.deadline)
    })
    
    // Send the transaction
    await this.sendTransactionWithDetails(
      [instruction],
      [signer]
    )
    
    console.log(`✅ Work order created: ${workOrderAddress}`)
    return workOrderAddress.toString()
  }

  /**
   * Create a new escrow account via work order
   * @deprecated Use createEscrow() for real escrow creation with SPL token transfers
   */
  async create(
    params: CreateEscrowParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolveCreateParams(params)
    
    // Derive the work order PDA using the correct seeds
    const { deriveWorkOrderPda } = await import('../../utils/pda.js')
    const workOrderAddress = await deriveWorkOrderPda(
      this.config.programId!,
      resolvedParams.signer.address,
      resolvedParams.orderId
    )
    
    // Build the instruction for creating a work order
    const instruction = getCreateWorkOrderInstruction({
      workOrder: workOrderAddress,
      client: resolvedParams.signer,
      orderId: resolvedParams.orderId,
      provider: resolvedParams.provider,
      title: resolvedParams.title,
      description: resolvedParams.description,
      requirements: resolvedParams.requirements,
      paymentAmount: resolvedParams.amount,
      paymentToken: resolvedParams.paymentToken,
      deadline: resolvedParams.deadline
    })
    
    // Send the transaction using the base class method
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [resolvedParams.signer]
    )
    
    // Log the transaction signature for debugging
    console.log(`✅ Escrow created with signature: ${result.signature}`)
    console.log(`   Work order address: ${workOrderAddress.toString()}`)
    
    // Return the work order address instead of the transaction signature
    // This allows the caller to immediately fetch the account
    return workOrderAddress.toString()
  }

  /**
   * Create a new escrow account with real SPL token transfers
   */
  async createEscrow(
    params: CreateRealEscrowParams
  ): Promise<string> {
    console.log('🔒 Creating real escrow with token custody:', params.taskId)
    
    // Derive the escrow PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [escrowAddress] = await findProgramDerivedAddress(
      ['escrow', params.taskId],
      this.programId
    )

    // Derive the reentrancy guard PDA
    const [reentrancyGuard] = await findProgramDerivedAddress(
      ['reentrancy_guard'],
      this.programId
    )

    // Get token program and derive token accounts
    const tokenProgram = await detectTokenProgram(params.paymentToken)
    const isToken2022 = await isToken2022Mint(params.paymentToken)
    
    console.log('💰 Escrow Creation Setup:')
    console.log(`   Escrow address: ${escrowAddress}`)
    console.log(`   Client: ${params.signer.address}`)
    console.log(`   Agent: ${params.agent}`)
    console.log(`   Amount: ${params.amount}`)
    console.log(`   Token: ${params.paymentToken}`)
    console.log(`   Token program: ${tokenProgram}`)
    console.log(`   Is Token 2022: ${isToken2022}`)

    // Derive client token account
    const clientTokenAccount = await getAssociatedTokenAccount(
      params.signer.address,
      params.paymentToken,
      tokenProgram
    )

    // Derive escrow token account
    const escrowTokenAccount = await getAssociatedTokenAccount(
      escrowAddress,
      params.paymentToken,
      tokenProgram
    )

    console.log(`   Client token account: ${clientTokenAccount.address}`)
    console.log(`   Escrow token account: ${escrowTokenAccount.address}`)

    // Build the create escrow instruction
    const instruction = getCreateEscrowInstruction({
      escrow: escrowAddress,
      reentrancyGuard,
      client: params.signer,
      agent: params.agent,
      clientTokenAccount: clientTokenAccount.address,
      escrowTokenAccount: escrowTokenAccount.address,
      paymentToken: params.paymentToken,
      tokenProgram,
      taskId: params.taskId,
      amount: params.amount,
      expiresAt: params.expiresAt,
      transferHook: params.transferHook ?? null,
      isConfidential: params.isConfidential ?? false
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Real escrow created with signature: ${result.signature}`)
    console.log(`   Escrow address: ${escrowAddress}`)
    console.log(`   Tokens locked: ${params.amount}`)
    
    return escrowAddress.toString()
  }

  /**
   * Release escrow funds by submitting work delivery
   * @deprecated Use completeEscrow() followed by processEscrowPayment() for real escrow operations
   */
  async release(
    workDeliveryAddress: Address,
    params: SubmitDeliveryParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolveDeliveryParams(params)
    
    const instruction = getSubmitWorkDeliveryInstruction({
      workDelivery: workDeliveryAddress,
      workOrder: resolvedParams.workOrderAddress,
      provider: resolvedParams.signer,
      deliverables: resolvedParams.deliverables,
      ipfsHash: resolvedParams.ipfsHash,
      metadataUri: resolvedParams.metadataUri
    })
    
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [resolvedParams.signer]
    )
    
    return result.signature
  }

  /**
   * Complete an escrow (agent marks work as done)
   * This prepares the escrow for payment release but does NOT transfer tokens
   */
  async completeEscrow(
    params: CompleteEscrowParams
  ): Promise<string> {
    console.log('✔️ Completing escrow:', params.escrowAddress)
    
    // Get the escrow account to verify agent authority
    const escrowAccount = await this.getEscrowAccount(params.escrowAddress)
    if (!escrowAccount) {
      throw new Error(`Escrow account not found: ${params.escrowAddress}`)
    }

    // Verify the signer is the agent
    if (params.signer.address !== escrowAccount.agent) {
      throw new Error(`Only the agent can complete the escrow. Expected: ${escrowAccount.agent}, got: ${params.signer.address}`)
    }

    // Derive the reentrancy guard PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [reentrancyGuard] = await findProgramDerivedAddress(
      ['reentrancy_guard'],
      this.programId
    )

    // Get the agent account PDA (assuming it exists)
    const [agentAccount] = await findProgramDerivedAddress(
      ['agent', escrowAccount.agent],
      this.programId
    )

    // Get token program and derive token accounts
    const tokenProgram = await detectTokenProgram(escrowAccount.paymentToken)
    
    // Derive escrow and agent token accounts
    const escrowTokenAccount = await getAssociatedTokenAccount(
      params.escrowAddress,
      escrowAccount.paymentToken,
      tokenProgram
    )

    const agentTokenAccount = await getAssociatedTokenAccount(
      escrowAccount.agent,
      escrowAccount.paymentToken,
      tokenProgram
    )

    console.log('📋 Escrow Completion Setup:')
    console.log(`   Escrow status: ${escrowAccount.status}`)
    console.log(`   Agent: ${escrowAccount.agent}`)
    console.log(`   Escrow token account: ${escrowTokenAccount.address}`)
    console.log(`   Agent token account: ${agentTokenAccount.address}`)

    // Build the complete escrow instruction
    const instruction = getCompleteEscrowInstruction({
      escrow: params.escrowAddress,
      reentrancyGuard,
      agent: agentAccount,
      escrowTokenAccount: escrowTokenAccount.address,
      agentTokenAccount: agentTokenAccount.address,
      authority: params.signer,
      tokenProgram,
      resolutionNotes: params.resolutionNotes ?? null
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Escrow marked as completed: ${result.signature}`)
    console.log(`   Ready for payment processing`)
    
    return result.signature
  }

  /**
   * Cancel escrow and refund to buyer
   */
  async cancel(
    params: CancelEscrowParams
  ): Promise<string> {
    console.log('🚫 Cancelling escrow:', params.escrowAddress)
    
    // Get the Escrow account to access client and agent information
    const escrowAccount = await this.getEscrowAccount(params.escrowAddress)
    if (!escrowAccount) {
      throw new Error(`Escrow account not found: ${params.escrowAddress}`)
    }

    // Derive the reentrancy guard PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [reentrancyGuard] = await findProgramDerivedAddress(
      ['reentrancy_guard'],
      this.programId
    )

    // Get token program and derive token accounts
    const tokenProgram = await detectTokenProgram(params.paymentToken)
    const isToken2022 = await isToken2022Mint(params.paymentToken)
    console.log(`   Token program: ${tokenProgram}, Is Token 2022: ${isToken2022}`)

    // Derive escrow token account
    const escrowTokenAccount = await getAssociatedTokenAccount(
      params.escrowAddress,
      params.paymentToken,
      tokenProgram
    )

    // Derive client refund account
    const clientRefundAccount = await getAssociatedTokenAccount(
      escrowAccount.client,
      params.paymentToken, 
      tokenProgram
    )

    console.log('💰 Token Account Setup:')
    console.log(`   Escrow token account: ${escrowTokenAccount.address}`)
    console.log(`   Client refund account: ${clientRefundAccount.address}`)

    // Build the cancel escrow instruction
    const instruction = getCancelEscrowInstruction({
      escrow: params.escrowAddress,
      reentrancyGuard,
      escrowTokenAccount: escrowTokenAccount.address,
      clientRefundAccount: clientRefundAccount.address,
      paymentToken: params.paymentToken,
      authority: params.signer,
      tokenProgram,
      cancellationReason: params.cancellationReason
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Escrow cancelled successfully: ${result.signature}`)
    return result.signature
  }

  /**
   * Refund an expired escrow back to the client
   */
  async refundExpired(
    params: RefundExpiredEscrowParams
  ): Promise<string> {
    console.log('⏰ Refunding expired escrow:', params.escrowAddress)
    
    // Get the escrow account to access task information
    const escrowAccount = await this.getEscrowAccount(params.escrowAddress)
    if (!escrowAccount) {
      throw new Error(`Escrow account not found: ${params.escrowAddress}`)
    }

    // Derive the reentrancy guard PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [reentrancyGuard] = await findProgramDerivedAddress(
      ['reentrancy_guard'],
      this.programId
    )

    // Get token program and derive token accounts
    const tokenProgram = await detectTokenProgram(params.paymentToken)
    
    // Derive escrow and client token accounts
    const escrowTokenAccount = await getAssociatedTokenAccount(
      params.escrowAddress,
      params.paymentToken,
      tokenProgram
    )

    const clientRefundAccount = await getAssociatedTokenAccount(
      escrowAccount.client,
      params.paymentToken,
      tokenProgram
    )

    console.log('💰 Expired Refund Setup:')
    console.log(`   Escrow token account: ${escrowTokenAccount.address}`)
    console.log(`   Client refund account: ${clientRefundAccount.address}`)

    // Build the refund expired escrow instruction
    const instruction = getRefundExpiredEscrowInstruction({
      escrow: params.escrowAddress,
      reentrancyGuard,
      escrowTokenAccount: escrowTokenAccount.address,
      clientRefundAccount: clientRefundAccount.address,
      paymentToken: params.paymentToken,
      caller: params.signer,
      tokenProgram
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Expired escrow refund processed: ${result.signature}`)
    return result.signature
  }

  /**
   * Process a partial refund for disputed escrows (admin only)
   */
  async processPartialRefund(
    params: ProcessPartialRefundParams
  ): Promise<string> {
    console.log('⚖️ Processing partial refund for escrow:', params.escrowAddress)
    console.log(`   Client refund percentage: ${params.clientRefundPercentage}%`)
    
    // Validate percentage
    if (params.clientRefundPercentage < 0 || params.clientRefundPercentage > 100) {
      throw new Error('Client refund percentage must be between 0 and 100')
    }

    // Get the escrow account to access client and agent information
    const escrowAccount = await this.getEscrowAccount(params.escrowAddress)
    if (!escrowAccount) {
      throw new Error(`Escrow account not found: ${params.escrowAddress}`)
    }

    // Derive the reentrancy guard PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [reentrancyGuard] = await findProgramDerivedAddress(
      ['reentrancy_guard'],
      this.programId
    )

    // Get token program and derive token accounts
    const tokenProgram = await detectTokenProgram(params.paymentToken)
    
    // Derive all required token accounts
    const escrowTokenAccount = await getAssociatedTokenAccount(
      params.escrowAddress,
      params.paymentToken,
      tokenProgram
    )

    const clientRefundAccount = await getAssociatedTokenAccount(
      escrowAccount.client,
      params.paymentToken,
      tokenProgram
    )

    const agentPaymentAccount = await getAssociatedTokenAccount(
      escrowAccount.agent,
      params.paymentToken,
      tokenProgram
    )

    console.log('💰 Partial Refund Setup:')
    console.log(`   Escrow token account: ${escrowTokenAccount.address}`)
    console.log(`   Client refund account: ${clientRefundAccount.address}`)
    console.log(`   Agent payment account: ${agentPaymentAccount.address}`)

    // Build the process partial refund instruction
    const instruction = getProcessPartialRefundInstruction({
      escrow: params.escrowAddress,
      reentrancyGuard,
      escrowTokenAccount: escrowTokenAccount.address,
      clientRefundAccount: clientRefundAccount.address,
      agentPaymentAccount: agentPaymentAccount.address,
      paymentToken: params.paymentToken,
      authority: params.signer,
      tokenProgram,
      clientRefundPercentage: params.clientRefundPercentage
    })

    // Send the transaction  
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Partial refund processed successfully: ${result.signature}`)
    return result.signature
  }

  /**
   * Dispute an escrow (requires arbitration)
   * @deprecated Use disputeEscrow() for real escrow dispute handling
   */
  async dispute(params: DisputeParams): Promise<string> {
    console.warn('⚠️ Using deprecated dispute method. Please use disputeEscrow() instead.')
    return this.disputeEscrow({
      ...params,
      disputeReason: params.reason
    })
  }

  /**
   * Dispute an escrow with real dispute handling
   */
  async disputeEscrow(
    params: DisputeEscrowParams
  ): Promise<string> {
    console.log('⚖️ Disputing escrow:', params.escrowAddress)
    
    // Get the escrow account to verify authority
    const escrowAccount = await this.getEscrowAccount(params.escrowAddress)
    if (!escrowAccount) {
      throw new Error(`Escrow account not found: ${params.escrowAddress}`)
    }

    // Verify the signer is either client or agent
    if (params.signer.address !== escrowAccount.client && 
        params.signer.address !== escrowAccount.agent) {
      throw new Error('Only the client or agent can dispute the escrow')
    }

    // Derive the reentrancy guard PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [reentrancyGuard] = await findProgramDerivedAddress(
      ['reentrancy_guard'],
      this.programId
    )

    console.log('📋 Dispute Setup:')
    console.log(`   Escrow status: ${escrowAccount.status}`)
    console.log(`   Disputant: ${params.signer.address}`)
    console.log(`   Reason: ${params.disputeReason}`)

    // Build the dispute escrow instruction
    const instruction = getDisputeEscrowInstruction({
      escrow: params.escrowAddress,
      reentrancyGuard,
      authority: params.signer,
      disputeReason: params.disputeReason
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Escrow disputed successfully: ${result.signature}`)
    console.log(`   Escrow is now frozen pending resolution`)
    
    return result.signature
  }

  /**
   * Calculate transfer fees for Token 2022 payments
   * 
   * @param amount - Payment amount in token base units
   * @param tokenMint - Token mint address
   * @returns Promise<TransferFeeCalculation | null> - Fee calculation or null if no fees
   */
  async calculatePaymentFees(
    amount: bigint,
    tokenMint: Address
  ): Promise<TransferFeeCalculation | null> {
    try {
      // Check if this is a Token 2022 mint with transfer fees
      const isToken2022 = await isToken2022Mint(tokenMint)
      if (!isToken2022) {
        return null // No fees for SPL Token
      }

      // Get transfer fee configuration (this would need RPC implementation)
      // For now, using example fee configuration
      const exampleFeeConfig = createTransferFeeConfig({
        transferFeeBasisPoints: 250, // 2.5% fee
        maximumFee: 1000000n, // 1 token maximum fee
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      console.log('💰 Calculating Token 2022 transfer fees:')
      const feeCalculation = calculateTransferFee(amount, exampleFeeConfig)
      
      console.log(`   Transfer amount: ${amount}`)
      console.log(`   Fee amount: ${feeCalculation.feeAmount}`)
      console.log(`   Net amount: ${feeCalculation.netAmount}`)
      console.log(`   Fee rate: ${feeCalculation.feeBasisPoints / 100}%`)
      console.log(`   Fee capped: ${feeCalculation.wasFeeCapped}`)

      return feeCalculation
    } catch (error) {
      console.error('Failed to calculate payment fees:', error)
      return null
    }
  }

  /**
   * Process payment with Token 2022 support including transfer fees
   * 
   * @param paymentAddress - Payment account address
   * @param params - Payment parameters
   * @returns Promise<{ signature: string, feeCalculation?: TransferFeeCalculation }>
   */
  async processPaymentWithFees(
    paymentAddress: Address,
    params: ProcessPaymentParams
  ): Promise<{ signature: string, feeCalculation?: TransferFeeCalculation }> {
    // Resolve parameters with smart defaults and ATA derivation
    const resolvedParams = await this._resolvePaymentParams(params)
    
    // Calculate transfer fees if Token 2022
    const feeCalculation = await this.calculatePaymentFees(
      resolvedParams.amount,
      resolvedParams.tokenMint
    )
    
    // Adjust payment amount if fees are expected
    let adjustedAmount = resolvedParams.amount
    if (feeCalculation && resolvedParams.expectTransferFees) {
      // If fees are expected, the payer needs to send more to cover fees
      adjustedAmount = feeCalculation.transferAmount
      
      console.log('📊 Payment amount adjusted for fees:')
      console.log(`   Requested net amount: ${resolvedParams.amount}`)
      console.log(`   Total amount with fees: ${adjustedAmount}`)
      console.log(`   Transfer fees: ${feeCalculation.feeAmount}`)
    }

    // Generate confidential transfer proof if needed
    if (resolvedParams.useConfidentialTransfer && !resolvedParams.confidentialProof) {
      console.log('🔐 Generating confidential transfer proof...')
      // This would require ElGamal keypairs - placeholder for now
      // const proof = await generateConfidentialTransferProof(...)
      console.warn('Confidential transfer proof generation requires ElGamal keypairs')
    }

    const instruction = getProcessPaymentInstruction({
      payment: paymentAddress,
      workOrder: resolvedParams.workOrderAddress,
      providerAgent: resolvedParams.providerAgent,
      payer: resolvedParams.signer,
      payerTokenAccount: resolvedParams.payerTokenAccount,
      providerTokenAccount: resolvedParams.providerTokenAccount,
      tokenMint: resolvedParams.tokenMint,
      amount: adjustedAmount, // Use adjusted amount that includes fees
      useConfidentialTransfer: resolvedParams.useConfidentialTransfer
    })
    
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [resolvedParams.signer]
    )
    
    return {
      signature: result.signature,
      feeCalculation: feeCalculation ?? undefined
    }
  }

  /**
   * Create Associated Token Accounts for escrow participants
   * 
   * @param tokenMint - Token mint address
   * @param participants - Array of wallet addresses that need ATAs
   * @returns Promise<AssociatedTokenAccount[]> - Created ATA information
   */
  async createEscrowTokenAccounts(
    tokenMint: Address,
    participants: Address[]
  ): Promise<AssociatedTokenAccount[]> {
    console.log('🏦 Creating escrow token accounts...')
    
    const tokenProgram = await detectTokenProgram(tokenMint)
    const isToken2022 = await isToken2022Mint(tokenMint)
    
    console.log(`   Token mint: ${tokenMint}`)
    console.log(`   Token program: ${tokenProgram}`)
    console.log(`   Is Token 2022: ${isToken2022}`)
    
    const ataInfos: AssociatedTokenAccount[] = []
    
    for (const participant of participants) {
      const ataInfo = await getAssociatedTokenAccount(
        participant,
        tokenMint,
        tokenProgram
      )
      
      ataInfos.push(ataInfo)
      console.log(`   Created ATA for ${participant}: ${ataInfo.address}`)
    }
    
    return ataInfos
  }

  /**
   * Process escrow payment release - transfers tokens from escrow to agent
   * This should be called after completeEscrow() to actually release the funds
   */
  async processEscrowPayment(
    params: ProcessEscrowPaymentParams
  ): Promise<string> {
    console.log('💸 Processing escrow payment release:', params.escrowAddress)
    
    // Get the escrow account to verify it's completed
    const escrowAccount = await this.getEscrowAccount(params.escrowAddress)
    if (!escrowAccount) {
      throw new Error(`Escrow account not found: ${params.escrowAddress}`)
    }

    // Verify escrow is in completed state
    const { EscrowStatus } = await import('../../generated/index.js')
    if (escrowAccount.status !== EscrowStatus.Completed) {
      throw new Error(`Escrow must be completed before payment. Current status: ${escrowAccount.status}`)
    }

    // Derive the payment PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [paymentAddress] = await findProgramDerivedAddress(
      ['payment', params.escrowAddress],
      this.programId
    )

    // Derive the reentrancy guard PDA
    const [reentrancyGuard] = await findProgramDerivedAddress(
      ['reentrancy_guard'],
      this.programId
    )

    // Get token program and derive token accounts
    const tokenProgram = await detectTokenProgram(params.paymentToken)
    
    // Derive escrow token account
    const escrowTokenAccount = await getAssociatedTokenAccount(
      params.escrowAddress,
      params.paymentToken,
      tokenProgram
    )

    // Derive recipient (agent) token account
    const recipientTokenAccount = await getAssociatedTokenAccount(
      escrowAccount.agent,
      params.paymentToken,
      tokenProgram
    )

    console.log('💰 Payment Processing Setup:')
    console.log(`   Payment address: ${paymentAddress}`)
    console.log(`   Escrow amount: ${escrowAccount.amount}`)
    console.log(`   Recipient (agent): ${escrowAccount.agent}`)
    console.log(`   Escrow token account: ${escrowTokenAccount.address}`)
    console.log(`   Recipient token account: ${recipientTokenAccount.address}`)

    // Build the process payment instruction
    const instruction = getProcessEscrowPaymentInstruction({
      payment: paymentAddress,
      escrow: params.escrowAddress,
      reentrancyGuard,
      escrowTokenAccount: escrowTokenAccount.address,
      recipientTokenAccount: recipientTokenAccount.address,
      recipient: escrowAccount.agent,
      paymentToken: params.paymentToken,
      authority: params.signer,
      tokenProgram,
      workOrder: params.workOrder
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Escrow payment processed: ${result.signature}`)
    console.log(`   Tokens transferred to agent: ${escrowAccount.amount}`)
    console.log(`   Payment record created: ${paymentAddress}`)
    
    return result.signature
  }

  /**
   * Process payment through escrow (legacy method for backward compatibility)
   * @deprecated Use processEscrowPayment() for real escrow payment processing
   */
  async processPayment(
    paymentAddress: Address,
    params: ProcessPaymentParams
  ): Promise<string> {
    // Resolve parameters with smart defaults
    const resolvedParams = await this._resolvePaymentParams(params)
    
    const instruction = getProcessPaymentInstruction({
      payment: paymentAddress,
      workOrder: resolvedParams.workOrderAddress,
      providerAgent: resolvedParams.providerAgent,
      payer: resolvedParams.signer,
      payerTokenAccount: resolvedParams.payerTokenAccount,
      providerTokenAccount: resolvedParams.providerTokenAccount,
      tokenMint: resolvedParams.tokenMint,
      amount: resolvedParams.amount,
      useConfidentialTransfer: resolvedParams.useConfidentialTransfer
    })
    
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [resolvedParams.signer]
    )
    
    return result.signature
  }

  /**
   * Get work order (escrow) account information using centralized pattern
   */
  async getAccount(workOrderAddress: Address): Promise<WorkOrder | null> {
    return this.getDecodedAccount<WorkOrder>(workOrderAddress, 'getWorkOrderDecoder')
  }

  /**
   * Get escrow account information using centralized pattern
   */
  async getEscrowAccount(escrowAddress: Address): Promise<Escrow | null> {
    return this.getDecodedAccount<Escrow>(escrowAddress, 'getEscrowDecoder')
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

  /**
   * Verify work delivery and approve payment release
   * Client uses this to verify that the delivered work meets requirements
   */
  async verifyWorkDelivery(params: {
    workOrderAddress: Address
    verificationNotes?: string
    signer: TransactionSigner
  }): Promise<string> {
    console.log('✅ Verifying work delivery:', params.workOrderAddress)
    
    // Get the work order account
    const workOrder = await this.getAccount(params.workOrderAddress)
    if (!workOrder) {
      throw new Error(`Work order not found: ${params.workOrderAddress}`)
    }

    // Verify the signer is the client
    if (params.signer.address !== workOrder.client) {
      throw new Error('Only the client can verify work delivery')
    }

    // Derive work delivery PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [workDeliveryAddress] = await findProgramDerivedAddress(
      ['work_delivery', params.workOrderAddress],
      this.programId
    )

    console.log('📋 Verification Setup:')
    console.log(`   Work order status: ${workOrder.status}`)
    console.log(`   Work delivery PDA: ${workDeliveryAddress}`)
    console.log(`   Verification notes: ${params.verificationNotes ?? 'None'}`)

    // Build the verify work delivery instruction
    const instruction = getVerifyWorkDeliveryInstruction({
      workOrder: params.workOrderAddress,
      workDelivery: workDeliveryAddress,
      client: params.signer,
      verificationNotes: params.verificationNotes ?? null
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`✅ Work delivery verified successfully: ${result.signature}`)
    return result.signature
  }

  /**
   * Reject work delivery and request changes
   * Client uses this when delivered work doesn't meet requirements
   */
  async rejectWorkDelivery(params: {
    workOrderAddress: Address
    rejectionReason: string
    requestedChanges?: string[]
    signer: TransactionSigner
  }): Promise<string> {
    console.log('❌ Rejecting work delivery:', params.workOrderAddress)
    
    // Get the work order account
    const workOrder = await this.getAccount(params.workOrderAddress)
    if (!workOrder) {
      throw new Error(`Work order not found: ${params.workOrderAddress}`)
    }

    // Verify the signer is the client
    if (params.signer.address !== workOrder.client) {
      throw new Error('Only the client can reject work delivery')
    }

    // Validate rejection reason
    if (!params.rejectionReason || params.rejectionReason.trim().length === 0) {
      throw new Error('Rejection reason is required')
    }

    // Derive work delivery PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [workDeliveryAddress] = await findProgramDerivedAddress(
      ['work_delivery', params.workOrderAddress],
      this.programId
    )

    console.log('📋 Rejection Setup:')
    console.log(`   Work order status: ${workOrder.status}`)
    console.log(`   Rejection reason: ${params.rejectionReason}`)
    console.log(`   Requested changes: ${params.requestedChanges?.length ?? 0} items`)

    // Build the reject work delivery instruction
    const instruction = getRejectWorkDeliveryInstruction({
      workOrder: params.workOrderAddress,
      workDelivery: workDeliveryAddress,
      client: params.signer,
      rejectionReason: params.rejectionReason,
      requestedChanges: params.requestedChanges ?? null
    })

    // Send the transaction
    const result = await this.sendTransactionWithDetails(
      [instruction],
      [params.signer]
    )

    console.log(`❌ Work delivery rejected: ${result.signature}`)
    return result.signature
  }

  /**
   * Get work delivery details for a work order
   */
  async getWorkDelivery(workOrderAddress: Address): Promise<WorkDelivery | null> {
    // Derive work delivery PDA
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [workDeliveryAddress] = await findProgramDerivedAddress(
      ['work_delivery', workOrderAddress],
      this.programId
    )

    return this.getDecodedAccount<WorkDelivery>(workDeliveryAddress, 'getWorkDeliveryDecoder')
  }
}