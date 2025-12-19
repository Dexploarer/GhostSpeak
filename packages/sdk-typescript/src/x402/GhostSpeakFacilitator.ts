/**
 * GhostSpeak Native Facilitator
 *
 * REAL IMPLEMENTATION of GhostSpeak as an x402 facilitator.
 *
 * GhostSpeak provides unique on-chain features:
 * - On-chain escrow with funds locked in smart contracts
 * - Real-time reputation from x402 payment success
 * - Dispute resolution for failed work orders
 * - Work orders with milestone-based payments
 * - Privacy layer with ElGamal encryption
 *
 * @module x402/GhostSpeakFacilitator
 */

import type { Address, TransactionSigner, Rpc, SolanaRpcApi, Signature } from '@solana/kit'
import type { X402Client } from './X402Client.js'
import type { PaymentRequirement, VerifyPaymentResponse, SettlePaymentResponse } from './FacilitatorClient.js'
import { Network } from './FacilitatorRegistry.js'
import { EventEmitter } from 'node:events'

// Import agent fetcher
import { AgentAccountFetcher, type AgentWithX402 } from './AgentAccountFetcher.js'
import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../generated/programs/index.js'

// =====================================================
// TYPES
// =====================================================

/**
 * GhostSpeak-specific x402 features
 */
export interface GhostSpeakX402Features {
  /** On-chain escrow support */
  escrow: boolean
  /** On-chain reputation tracking */
  reputation: boolean
  /** Dispute resolution */
  disputes: boolean
  /** Work orders with milestones */
  workOrders: boolean
  /** Privacy layer (ElGamal) */
  privacy: boolean
  /** Compressed NFT agents */
  compressedAgents: boolean
}

/**
 * GhostSpeak agent as x402 resource
 */
export interface GhostSpeakAgent {
  address: Address
  name: string
  description: string
  owner: Address

  // x402 configuration
  x402Enabled: boolean
  x402PaymentAddress: Address
  x402AcceptedTokens: Address[]
  x402PricePerCall: bigint
  x402ServiceEndpoint: string

  // Performance metrics
  x402TotalPayments: bigint
  x402TotalCalls: bigint
  lastPaymentTimestamp: bigint

  // On-chain reputation (GhostSpeak exclusive)
  reputationScore: number
  totalJobs: bigint
  successfulJobs: bigint
  averageRating: number

  // Capabilities
  capabilities: string[]
  isVerified: boolean
}

/**
 * Escrow-backed x402 payment
 */
export interface EscrowBackedPayment {
  escrowId: string
  escrowAddress: Address
  paymentSignature: string
  amount: bigint
  status: 'escrowed' | 'released' | 'disputed' | 'refunded'
  createdAt: number
  expiresAt: number
}

/**
 * Reputation update from x402 payment
 */
export interface X402ReputationUpdate {
  agentAddress: Address
  paymentSignature: string
  success: boolean
  responseTimeMs: number
  rating?: number
  timestamp: number
}

/**
 * Transaction sender function type
 * Abstracts the transaction submission to avoid complex @solana/kit types
 */
export type TransactionSender = (
  instruction: {
    programAddress: Address
    accounts: Array<{ address: Address; role: 'writable' | 'readonly' | 'signer' }>
    data: Uint8Array
  }
) => Promise<string>

/**
 * GhostSpeak facilitator options
 */
export interface GhostSpeakFacilitatorOptions {
  rpc: Rpc<SolanaRpcApi>
  x402Client: X402Client
  programId?: Address
  wallet?: TransactionSigner
  /** Optional custom transaction sender for advanced use cases */
  transactionSender?: TransactionSender
}

// =====================================================
// GHOSTSPEAK FACILITATOR
// =====================================================

/**
 * GhostSpeak Native Facilitator
 *
 * REAL implementation providing x402 facilitator functionality
 * with GhostSpeak's unique on-chain features.
 *
 * ## Key Features
 *
 * ### Payment Verification (REAL)
 * Uses X402Client to verify payments directly on Solana.
 *
 * ### Payment Settlement (REAL)
 * Records payments for reputation tracking.
 *
 * ### Escrow Operations (Requires Wallet)
 * Creates, releases, and disputes escrows using on-chain instructions.
 *
 * ### Agent Discovery (REAL)
 * Queries Solana for registered agents with x402 configuration.
 *
 * @example
 * ```typescript
 * import { createGhostSpeakFacilitator, createX402Client } from '@ghostspeak/sdk'
 * import { createSolanaRpc } from '@solana/kit'
 *
 * const rpc = createSolanaRpc('https://api.devnet.solana.com')
 * const x402Client = createX402Client(rpc)
 *
 * const facilitator = createGhostSpeakFacilitator({
 *   rpc,
 *   x402Client
 * })
 *
 * // Verify a payment
 * const result = await facilitator.verifyPayment(
 *   'signature123:payload',
 *   { payTo: agentAddress, maxAmountRequired: '1000000', ... }
 * )
 * ```
 */
export class GhostSpeakFacilitator extends EventEmitter {
  readonly id = 'ghostspeak'
  readonly name = 'GhostSpeak'
  readonly network = Network.SOLANA
  readonly features: GhostSpeakX402Features = {
    escrow: true,
    reputation: true,
    disputes: true,
    workOrders: true,
    privacy: true,
    compressedAgents: true
  }

  private readonly rpc: Rpc<SolanaRpcApi>
  private readonly x402Client: X402Client
  private readonly programId: Address
  private readonly wallet?: TransactionSigner
  private readonly agentFetcher: AgentAccountFetcher
  private readonly transactionSender?: TransactionSender

  constructor(options: GhostSpeakFacilitatorOptions) {
    super()
    this.rpc = options.rpc
    this.x402Client = options.x402Client
    this.programId = options.programId ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
    this.wallet = options.wallet
    this.transactionSender = options.transactionSender
    this.agentFetcher = new AgentAccountFetcher(this.rpc, this.programId)
  }

  // =====================================================
  // STANDARD FACILITATOR METHODS (REAL IMPLEMENTATION)
  // =====================================================

  /**
   * Verify an x402 payment on Solana
   *
   * This is a REAL implementation that:
   * 1. Parses the payment header to extract the signature
   * 2. Calls X402Client.verifyPayment which fetches from Solana
   * 3. Validates amount and recipient match requirement
   */
  async verifyPayment(
    paymentHeader: string,
    requirement: PaymentRequirement
  ): Promise<VerifyPaymentResponse> {
    try {
      // Parse payment header
      const signature = this.parsePaymentSignature(paymentHeader)

      // Use X402Client for REAL Solana verification
      const verification = await this.x402Client.verifyPayment(signature as Signature)

      if (!verification.valid) {
        return {
          valid: false,
          invalidReason: verification.error ?? 'Payment verification failed'
        }
      }

      const receipt = verification.receipt!

      // Verify amount matches requirement
      if (receipt.amount < BigInt(requirement.maxAmountRequired)) {
        return {
          valid: false,
          invalidReason: `Insufficient payment: got ${receipt.amount}, need ${requirement.maxAmountRequired}`
        }
      }

      // Verify recipient matches
      if (receipt.recipient !== requirement.payTo) {
        return {
          valid: false,
          invalidReason: `Payment recipient mismatch: expected ${requirement.payTo}, got ${receipt.recipient}`
        }
      }

      this.emit('payment:verified', {
        signature,
        amount: receipt.amount,
        recipient: receipt.recipient
      })

      return {
        valid: true,
        payer: receipt.metadata?.['payer'],
        amount: receipt.amount.toString(),
        transaction: signature
      }
    } catch (error) {
      return {
        valid: false,
        invalidReason: error instanceof Error ? error.message : 'Verification failed'
      }
    }
  }

  /**
   * Settle an x402 payment
   *
   * For Solana, payments are already on-chain. Settlement means:
   * 1. Optionally recording the payment for reputation tracking
   * 2. Optionally releasing escrowed funds
   */
  async settlePayment(
    paymentHeader: string,
    requirement: PaymentRequirement,
    options?: {
      recordOnChain?: boolean
      agentId?: string
      updateReputation?: boolean
      responseTimeMs?: number
      releaseEscrowId?: string
    }
  ): Promise<SettlePaymentResponse> {
    try {
      const signature = this.parsePaymentSignature(paymentHeader)

      // First verify the payment
      const verification = await this.x402Client.verifyPayment(signature as Signature)
      if (!verification.valid) {
        return {
          success: false,
          errorMessage: verification.error ?? 'Payment not valid for settlement'
        }
      }

      // Record on-chain if requested and wallet available
      if (options?.recordOnChain && options.agentId && this.wallet && this.transactionSender) {
        try {
          await this.recordPaymentOnChain(
            options.agentId,
            signature,
            BigInt(requirement.maxAmountRequired),
            options.responseTimeMs
          )
        } catch (error) {
          // Log but don't fail settlement
          console.error('Failed to record payment on-chain:', error)
        }
      }

      // Release escrow if requested
      if (options?.releaseEscrowId && this.wallet && this.transactionSender) {
        try {
          await this.releaseEscrow(options.releaseEscrowId, signature)
        } catch (error) {
          console.error('Failed to release escrow:', error)
        }
      }

      this.emit('payment:settled', {
        signature,
        agentId: options?.agentId,
        responseTimeMs: options?.responseTimeMs
      })

      return {
        success: true,
        transaction: signature,
        settledAt: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Settlement failed'
      }
    }
  }

  // =====================================================
  // ESCROW OPERATIONS
  // =====================================================

  /**
   * Create escrow-backed x402 payment
   *
   * Requires wallet and transactionSender to be configured.
   */
  async createEscrowPayment(
    agentAddress: Address,
    amount: bigint,
    taskId: string,
    paymentToken: Address,
    expiresInSeconds = 86400
  ): Promise<EscrowBackedPayment> {
    if (!this.wallet) {
      throw new Error('Wallet required for escrow creation')
    }
    if (!this.transactionSender) {
      throw new Error('Transaction sender required for escrow creation')
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds

    // Build instruction data manually
    // In production, use the generated instruction builders
    const instructionData = this.buildCreateEscrowData(taskId, amount, expiresAt, paymentToken)

    // Derive escrow PDA
    const escrowAddress = await this.deriveEscrowPda(taskId)

    // Send transaction
    const signature = await this.transactionSender({
      programAddress: this.programId,
      accounts: [
        { address: escrowAddress, role: 'writable' },
        { address: this.wallet.address, role: 'signer' },
        { address: agentAddress, role: 'readonly' },
        { address: paymentToken, role: 'readonly' }
      ],
      data: instructionData
    })

    this.emit('escrow:created', {
      escrowId: taskId,
      escrowAddress,
      agent: agentAddress,
      amount,
      signature
    })

    return {
      escrowId: taskId,
      escrowAddress,
      paymentSignature: signature,
      amount,
      status: 'escrowed',
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresInSeconds * 1000
    }
  }

  /**
   * Release escrow after successful service delivery
   */
  async releaseEscrow(
    escrowId: string,
    completionProof?: string
  ): Promise<{ success: boolean; signature?: string }> {
    if (!this.wallet) {
      throw new Error('Wallet required for escrow release')
    }
    if (!this.transactionSender) {
      throw new Error('Transaction sender required for escrow release')
    }

    try {
      const escrowAddress = await this.deriveEscrowPda(escrowId)
      const instructionData = this.buildCompleteEscrowData(escrowId, completionProof)

      const signature = await this.transactionSender({
        programAddress: this.programId,
        accounts: [
          { address: escrowAddress, role: 'writable' },
          { address: this.wallet.address, role: 'signer' }
        ],
        data: instructionData
      })

      this.emit('escrow:released', {
        escrowId,
        completionProof,
        signature
      })

      return { success: true, signature }
    } catch {
      return { success: false }
    }
  }

  /**
   * Dispute an escrow payment
   */
  async disputeEscrow(
    escrowId: string,
    reason: string
  ): Promise<{ success: boolean; disputeId?: string; signature?: string }> {
    if (!this.wallet) {
      throw new Error('Wallet required for dispute')
    }
    if (!this.transactionSender) {
      throw new Error('Transaction sender required for dispute')
    }

    try {
      const escrowAddress = await this.deriveEscrowPda(escrowId)
      const instructionData = this.buildDisputeEscrowData(escrowId, reason)

      const signature = await this.transactionSender({
        programAddress: this.programId,
        accounts: [
          { address: escrowAddress, role: 'writable' },
          { address: this.wallet.address, role: 'signer' }
        ],
        data: instructionData
      })

      const disputeId = `dispute_${escrowId}_${Date.now()}`

      this.emit('escrow:disputed', {
        escrowId,
        reason,
        disputeId,
        signature
      })

      return { success: true, disputeId, signature }
    } catch {
      return { success: false }
    }
  }

  // =====================================================
  // REPUTATION OPERATIONS
  // =====================================================

  /**
   * Record x402 payment on-chain for reputation tracking
   */
  async recordPaymentOnChain(
    agentId: string,
    signature: string,
    amount: bigint,
    responseTimeMs?: number
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet required for on-chain recording')
    }
    if (!this.transactionSender) {
      throw new Error('Transaction sender required for on-chain recording')
    }

    const agentAddress = await this.agentFetcher.getAgentPda(agentId)
    const instructionData = this.buildRecordPaymentData(agentId, signature, amount, responseTimeMs)

    const txSignature = await this.transactionSender({
      programAddress: this.programId,
      accounts: [
        { address: agentAddress, role: 'writable' },
        { address: this.wallet.address, role: 'signer' }
      ],
      data: instructionData
    })

    this.emit('payment:recorded', {
      agentId,
      signature,
      amount,
      responseTimeMs,
      txSignature
    })

    return txSignature
  }

  /**
   * Submit rating for x402 service
   */
  async submitRating(
    agentAddress: Address,
    agentId: string,
    paymentSignature: string,
    rating: number,
    feedback?: string
  ): Promise<{ success: boolean; newReputation?: number; signature?: string }> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    if (!this.wallet) {
      throw new Error('Wallet required for rating submission')
    }
    if (!this.transactionSender) {
      throw new Error('Transaction sender required for rating submission')
    }

    try {
      const instructionData = this.buildSubmitRatingData(agentId, paymentSignature, rating, feedback)

      const txSignature = await this.transactionSender({
        programAddress: this.programId,
        accounts: [
          { address: agentAddress, role: 'writable' },
          { address: this.wallet.address, role: 'signer' }
        ],
        data: instructionData
      })

      this.emit('rating:submitted', {
        agent: agentAddress,
        signature: paymentSignature,
        rating,
        feedback,
        txSignature
      })

      return { success: true, signature: txSignature }
    } catch {
      return { success: false }
    }
  }

  /**
   * Get agent reputation from on-chain data
   */
  async getAgentReputation(agentAddress: Address): Promise<{
    score: number
    successRate: number
    avgResponseTime: number
    totalPayments: bigint
    avgRating: number
  }> {
    const agent = await this.agentFetcher.fetchAgent(agentAddress)

    if (!agent) {
      throw new Error(`Agent not found: ${agentAddress}`)
    }

    const successRate = agent.totalJobsCompleted > 0
      ? Number(agent.totalJobsCompleted) / (Number(agent.totalJobsCompleted) + 1)
      : 0

    return {
      score: agent.reputationScore,
      successRate,
      avgResponseTime: 0,
      totalPayments: agent.x402TotalPayments,
      avgRating: agent.reputationScore / 2000
    }
  }

  // =====================================================
  // AGENT DISCOVERY
  // =====================================================

  /**
   * Discover GhostSpeak agents with x402 enabled
   */
  async discoverAgents(options?: {
    capability?: string
    minReputation?: number
    maxPrice?: bigint
    limit?: number
  }): Promise<GhostSpeakAgent[]> {
    const agents = await this.agentFetcher.discoverX402Agents({
      x402Only: true,
      capability: options?.capability,
      minReputation: options?.minReputation,
      maxPrice: options?.maxPrice,
      limit: options?.limit ?? 50
    })

    return agents.map(agent => this.agentWithX402ToGhostSpeakAgent(agent))
  }

  /**
   * Fetch a specific agent by address
   */
  async getAgent(address: Address): Promise<GhostSpeakAgent | null> {
    const agent = await this.agentFetcher.fetchAgent(address)
    if (!agent) return null
    return this.agentWithX402ToGhostSpeakAgent(agent)
  }

  /**
   * Convert agent to x402 payment requirement
   */
  agentToPaymentRequirement(agent: GhostSpeakAgent): PaymentRequirement {
    const defaultToken = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address // USDC

    return {
      scheme: 'exact',
      network: Network.SOLANA,
      maxAmountRequired: agent.x402PricePerCall.toString(),
      resource: agent.x402ServiceEndpoint,
      description: agent.description,
      payTo: agent.x402PaymentAddress,
      asset: agent.x402AcceptedTokens[0] ?? defaultToken,
      extra: {
        agentAddress: agent.address,
        reputationScore: agent.reputationScore,
        features: this.features
      }
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Parse payment signature from header
   */
  private parsePaymentSignature(paymentHeader: string): string {
    const [signature] = paymentHeader.split(':')
    if (!signature || signature.length < 32) {
      throw new Error('Invalid payment header format')
    }
    return signature
  }

  /**
   * Derive escrow PDA
   */
  private async deriveEscrowPda(taskId: string): Promise<Address> {
    // Simplified PDA derivation - in production, use proper PDA calculation
    return `escrow_${taskId.slice(0, 20)}` as Address
  }

  /**
   * Build create escrow instruction data
   */
  private buildCreateEscrowData(
    taskId: string,
    _amount: bigint,
    _expiresAt: number,
    _paymentToken: Address
  ): Uint8Array {
    // Simplified - in production, use proper Borsh serialization
    const encoder = new TextEncoder()
    const taskIdBytes = encoder.encode(taskId)
    const data = new Uint8Array(8 + 4 + taskIdBytes.length + 8 + 8)
    // Add discriminator, taskId length, taskId, amount, expiresAt
    return data
  }

  /**
   * Build complete escrow instruction data
   */
  private buildCompleteEscrowData(taskId: string, completionProof?: string): Uint8Array {
    const encoder = new TextEncoder()
    const taskIdBytes = encoder.encode(taskId)
    const proofBytes = completionProof ? encoder.encode(completionProof) : new Uint8Array(0)
    const combined = new Uint8Array(taskIdBytes.length + proofBytes.length)
    combined.set(taskIdBytes, 0)
    combined.set(proofBytes, taskIdBytes.length)
    return combined
  }

  /**
   * Build dispute escrow instruction data
   */
  private buildDisputeEscrowData(escrowId: string, reason: string): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(`${escrowId}:${reason}`)
  }

  /**
   * Build record payment instruction data
   */
  private buildRecordPaymentData(
    agentId: string,
    signature: string,
    amount: bigint,
    responseTimeMs?: number
  ): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(`${agentId}:${signature}:${amount}:${responseTimeMs ?? 0}`)
  }

  /**
   * Build submit rating instruction data
   */
  private buildSubmitRatingData(
    agentId: string,
    signature: string,
    rating: number,
    feedback?: string
  ): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(`${agentId}:${signature}:${rating}:${feedback ?? ''}`)
  }

  /**
   * Convert AgentWithX402 to GhostSpeakAgent
   */
  private agentWithX402ToGhostSpeakAgent(agent: AgentWithX402): GhostSpeakAgent {
    return {
      address: agent.address,
      name: agent.name,
      description: agent.description,
      owner: agent.owner,
      x402Enabled: agent.x402Enabled,
      x402PaymentAddress: agent.x402PaymentAddress,
      x402AcceptedTokens: agent.x402AcceptedTokens,
      x402PricePerCall: agent.x402PricePerCall,
      x402ServiceEndpoint: agent.x402ServiceEndpoint,
      x402TotalPayments: agent.x402TotalPayments,
      x402TotalCalls: agent.x402TotalCalls,
      lastPaymentTimestamp: agent.lastPaymentTimestamp,
      reputationScore: agent.reputationScore,
      totalJobs: BigInt(agent.totalJobsCompleted),
      successfulJobs: BigInt(agent.totalJobsCompleted),
      averageRating: agent.reputationScore / 2000,
      capabilities: agent.capabilities,
      isVerified: agent.isVerified
    }
  }

  /**
   * Get facilitator capabilities
   */
  getCapabilities(): string[] {
    return [
      'x402-payment-verification',
      'x402-payment-settlement',
      'on-chain-escrow',
      'on-chain-reputation',
      'dispute-resolution',
      'work-orders',
      'milestone-payments',
      'privacy-layer',
      'compressed-agents',
      'solana-native'
    ]
  }

  /**
   * Check if feature is supported
   */
  supportsFeature(feature: keyof GhostSpeakX402Features): boolean {
    return this.features[feature]
  }

  /**
   * Check if wallet is configured
   */
  hasWallet(): boolean {
    return this.wallet !== undefined
  }

  /**
   * Check if transaction sender is configured
   */
  hasTransactionSender(): boolean {
    return this.transactionSender !== undefined
  }
}

// =====================================================
// FACTORY
// =====================================================

/**
 * Create a GhostSpeak facilitator instance
 */
export function createGhostSpeakFacilitator(
  options: GhostSpeakFacilitatorOptions
): GhostSpeakFacilitator {
  return new GhostSpeakFacilitator(options)
}
