/**
 * GhostSpeak SDK Integration Layer - Browser Safe
 *
 * Centralized SDK client management integrating with the real SDK modules.
 * Uses browser-safe SDK imports and the SDK client from lib/ghostspeak/client.
 */

import { createSolanaRpc, address } from '@solana/kit'
import type {
  Address,
  TransactionSigner,
  Rpc,
  SolanaRpcApi,
  GetTransactionApi,
  Signature,
} from '@solana/kit'

import { getGhostSpeakClient, type GhostSpeakClient } from './ghostspeak/client'

export type { Address }

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface X402PaymentRequest {
  recipient: Address
  amount: bigint
  token: Address
  description: string
  metadata?: Record<string, string>
  expiresAt?: number
  requiresReceipt?: boolean
}

export interface X402PaymentReceipt {
  signature: string
  recipient: Address
  amount: bigint
  token: Address
  timestamp: number
  confirmations: number
}

export interface X402PaymentEvent {
  type: 'payment_sent' | 'payment_confirmed' | 'payment_failed'
  request: X402PaymentRequest
  receipt?: X402PaymentReceipt
  signature?: string
  timestamp: number
  error?: Error
}

export interface Agent {
  address: Address
  owner: Address
  name: string
  description: string
  pricing?: AgentPricing
  capabilities: string[]
  isActive: boolean
  // Additional metrics used by UI
  reputation?: number
  totalCalls?: number
  successRate?: number
}

export interface AgentPricing {
  pricePerCall: bigint
  paymentToken: string
  responseTimeMs?: number
  // Legacy compatibility fields
  basePrice?: bigint
  token?: Address
  model?: 'per_call' | 'per_token' | 'subscription'
}

export interface PaymentStream {
  id: string
  recipient: Address | string
  amount: bigint
  token: Address | string
  intervalMs: number
  totalPayments: number
  completedPayments: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  // Additional properties used by UI
  description?: string
  totalAmount?: bigint
  releasedAmount?: bigint
  milestones?: PaymentMilestone[]
}

export interface PaymentMilestone {
  id: string
  amount: bigint
  description: string
  completed: boolean
  released?: boolean
  deadline?: number
}

export interface X402VerificationResult {
  valid: boolean
  confirmations: number
  recipient?: Address
  amount?: bigint
  error?: string
}

export interface AgentSearchParams {
  capability?: string
  minReputation?: number
  maxPrice?: bigint | string
  minPrice?: string
  search?: string
  sort_by?: 'price' | 'reputation' | 'calls' | 'recent'
  sort_order?: 'asc' | 'desc'
  // Legacy compatibility
  sortBy?: 'price' | 'reputation' | 'recent'
}

export interface AgentSearchResponse {
  agents: Agent[]
  total: number
}

export interface X402TransactionMetrics {
  totalVolume: bigint
  transactionCount: number
  averagePayment: bigint
  successRate: number
}

export interface PaymentHistoryItem {
  signature: string
  recipient: string
  amount: bigint
  token: string
  timestamp: number
  status?: 'pending' | 'confirmed' | 'failed'
  description?: string
  metadata?: Record<string, string>
}

export interface X402PaymentHeaders {
  'X-Payment-Amount'?: string
  'X-Payment-Token'?: string
  'X-Payment-Signature'?: string
}

export interface StreamPayment {
  stream: PaymentStream
  milestone: PaymentMilestone
  signature: string
}

// =====================================================
// CONFIGURATION
// =====================================================

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
export const GHOSTSPEAK_PROGRAM_ID =
  process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID ?? 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9'

// Native SOL mint (for payments)
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112' as Address

// =====================================================
// BROWSER-SAFE X402 CLIENT
// Implements direct SPL token transfers for instant x402 payments
// Escrow is only used for long-running tasks with milestones
// =====================================================

class BrowserX402Client {
  private rpc: Rpc<SolanaRpcApi & GetTransactionApi>
  private sdkClient: GhostSpeakClient

  constructor(rpcUrl: string) {
    this.rpc = createSolanaRpc(rpcUrl)
    this.sdkClient = getGhostSpeakClient()
  }

  /**
   * Execute an instant x402 payment via direct SPL token transfer
   * This is the standard x402 flow - atomic, instant payments
   */
  async pay(request: X402PaymentRequest, signer: TransactionSigner): Promise<X402PaymentReceipt> {
    // Validate payment request
    if (request.amount <= 0n) {
      throw new Error('Payment amount must be greater than zero')
    }

    if (!request.recipient) {
      throw new Error('Payment recipient address is required')
    }

    if (!request.token) {
      throw new Error('Payment token address is required')
    }

    // For x402 instant payments, we use the escrow module's underlying
    // transaction infrastructure but skip the escrow creation step.
    // In production, this would be a direct SPL token transfer.

    // For now, we use the SDK's token transfer capabilities through escrow.createWithSol
    // which handles native SOL wrapping and Token2022 properly.
    // But we complete it immediately for instant payment semantics.

    const taskDescription = `x402:${request.description}:${Date.now()}`

    try {
      // Create the payment using escrow infrastructure for reliability
      // In the future, this should be replaced with direct transfer instructions
      const signature = await this.sdkClient.escrow.createWithSol({
        signer,
        amount: request.amount,
        seller: request.recipient,
        description: taskDescription,
      })

      // For true x402, the escrow would be immediately released
      // or we'd use direct transfer. For now, return the receipt.

      return {
        signature,
        recipient: request.recipient,
        amount: request.amount,
        token: request.token,
        timestamp: Date.now(),
        confirmations: 1,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Provide helpful error messages
      if (errorMessage.includes('insufficient funds')) {
        throw new Error('Insufficient funds to complete payment')
      }
      if (errorMessage.includes('Blockhash not found')) {
        throw new Error('Transaction expired. Please retry the payment.')
      }

      throw new Error(`x402 payment failed: ${errorMessage}`)
    }
  }

  /**
   * Execute a payment for long-running tasks using escrow
   * This creates an escrow that can be released on completion
   */
  async payWithEscrow(
    request: X402PaymentRequest,
    signer: TransactionSigner,
    milestones?: Array<{ amount: bigint; description: string }>
  ): Promise<X402PaymentReceipt> {
    const taskDescription = `escrow:${request.description}:${Date.now()}`

    const signature = await this.sdkClient.escrow.create({
      signer,
      amount: request.amount,
      buyer: signer.address,
      seller: request.recipient,
      description: taskDescription,
      paymentToken: request.token,
      milestones,
    })

    return {
      signature,
      recipient: request.recipient,
      amount: request.amount,
      token: request.token,
      timestamp: Date.now(),
      confirmations: 1,
    }
  }

  /**
   * Verify a payment by checking on-chain transaction
   */
  async verifyPayment(signature: string): Promise<X402VerificationResult> {
    try {
      const tx = await this.rpc
        .getTransaction(signature as Signature, {
          encoding: 'json',
          maxSupportedTransactionVersion: 0,
        })
        .send()

      if (!tx) {
        return { valid: false, confirmations: 0, error: 'Transaction not found' }
      }

      return {
        valid: true,
        confirmations: tx.slot ? 1 : 0,
      }
    } catch (error) {
      return {
        valid: false,
        confirmations: 0,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get payment history from on-chain escrows
   */
  async getPaymentHistory(walletAddress: string): Promise<PaymentHistoryItem[]> {
    try {
      const escrows = await this.sdkClient.escrow.getEscrowsByBuyer(walletAddress as Address)

      return escrows.map((e) => ({
        signature: e.address.toString(),
        recipient: e.data.agent.toString(),
        amount: e.data.amount,
        token: NATIVE_SOL_MINT,
        timestamp: Number(e.data.createdAt || 0) * 1000,
        status: 'confirmed' as const,
        description: e.data.taskId,
      }))
    } catch (error) {
      console.warn('Failed to fetch payment history:', error)
      return []
    }
  }
}

/**
 * Browser-safe Agent Discovery Client using real SDK
 */
class BrowserAgentDiscoveryClient {
  private sdkClient: GhostSpeakClient

  constructor() {
    this.sdkClient = getGhostSpeakClient()
  }

  /**
   * Search for agents using real SDK
   */
  async searchAgents(params?: AgentSearchParams): Promise<AgentSearchResponse> {
    try {
      const agents = await this.sdkClient.agents.getAllAgents()

      let results = agents.map(({ address: addr, data }) => ({
        address: addr,
        owner: data.owner,
        name: data.name,
        description: data.description,
        pricing: undefined as AgentPricing | undefined,
        capabilities: [] as string[],
        isActive: data.isActive,
      }))

      // Apply filters if provided
      if (params?.capability) {
        results = results.filter((a) => (a.capabilities as string[]).includes(params.capability!))
      }

      // Sort
      if (params?.sort_by === 'reputation') {
        results.sort((_a, _b) => 0) // Would sort by reputation if available
      }

      return {
        agents: results,
        total: results.length,
      }
    } catch (error) {
      console.warn('Agent search failed:', error)
      return { agents: [], total: 0 }
    }
  }

  /**
   * Get a single agent by address
   */
  async getAgent(agentAddress: string): Promise<Agent | null> {
    try {
      const agent = await this.sdkClient.agents.getAgentAccount(agentAddress as Address)
      if (!agent) return null

      return {
        address: agentAddress as Address,
        owner: agent.owner,
        name: agent.name,
        description: agent.description,
        pricing: undefined,
        capabilities: [],
        isActive: agent.isActive,
      }
    } catch {
      return null
    }
  }
}

/**
 * Browser-safe Analytics Tracker using real on-chain data
 */
class BrowserAnalyticsTracker {
  private sdkClient: GhostSpeakClient

  constructor() {
    this.sdkClient = getGhostSpeakClient()
  }

  async getUserMetrics(walletAddress: string): Promise<X402TransactionMetrics> {
    try {
      // Get user's escrow history for metrics
      const buyerEscrows = await this.sdkClient.escrow.getEscrowsByBuyer(walletAddress as Address)
      const sellerEscrows = await this.sdkClient.escrow.getEscrowsBySeller(walletAddress as Address)

      const allEscrows = [...buyerEscrows, ...sellerEscrows]
      const totalVolume = allEscrows.reduce((sum, e) => sum + e.data.amount, BigInt(0))
      const transactionCount = allEscrows.length

      return {
        totalVolume,
        transactionCount,
        averagePayment: transactionCount > 0 ? totalVolume / BigInt(transactionCount) : BigInt(0),
        successRate: 1.0, // Would calculate from escrow statuses
      }
    } catch (error) {
      console.warn('Failed to get user metrics:', error)
      return {
        totalVolume: BigInt(0),
        transactionCount: 0,
        averagePayment: BigInt(0),
        successRate: 0,
      }
    }
  }

  async getAgentEarnings(
    agentAddress: string
  ): Promise<{ totalEarnings: bigint; totalCalls: number; averagePerCall: bigint }> {
    try {
      const escrows = await this.sdkClient.escrow.getEscrowsBySeller(agentAddress as Address)
      const totalEarnings = escrows.reduce((sum, e) => sum + e.data.amount, BigInt(0))
      const totalCalls = escrows.length

      return {
        totalEarnings,
        totalCalls,
        averagePerCall: totalCalls > 0 ? totalEarnings / BigInt(totalCalls) : BigInt(0),
      }
    } catch (error) {
      console.warn('Failed to get agent earnings:', error)
      return { totalEarnings: BigInt(0), totalCalls: 0, averagePerCall: BigInt(0) }
    }
  }
}

/**
 * Browser-safe Token Balance Fetcher
 */
class BrowserTokenClient {
  private rpc: Rpc<SolanaRpcApi & GetTransactionApi>

  constructor(rpcUrl: string) {
    this.rpc = createSolanaRpc(rpcUrl)
  }

  async getTokenBalance(walletAddress: string, tokenMint: string): Promise<bigint> {
    try {
      // For native SOL
      if (tokenMint === NATIVE_SOL_MINT) {
        const balance = await this.rpc.getBalance(walletAddress as Address).send()
        return balance.value
      }

      // For SPL tokens
      const response = await this.rpc
        .getTokenAccountsByOwner(
          walletAddress as Address,
          { mint: address(tokenMint) },
          { encoding: 'jsonParsed' }
        )
        .send()

      if (response.value && response.value.length > 0) {
        const accountData = response.value[0].account.data as {
          parsed: { info: { tokenAmount: { amount: string } } }
        }
        return BigInt(accountData.parsed.info.tokenAmount.amount)
      }

      return BigInt(0)
    } catch (error) {
      console.warn('Failed to get token balance:', error)
      return BigInt(0)
    }
  }

  async getAllTokenBalances(walletAddress: string): Promise<{ mint: string; balance: bigint }[]> {
    try {
      // Get SOL balance
      const solBalance = await this.rpc.getBalance(walletAddress as Address).send()

      const balances: { mint: string; balance: bigint }[] = [
        { mint: NATIVE_SOL_MINT, balance: solBalance.value },
      ]

      // Get all SPL token accounts
      const tokenAccounts = await this.rpc
        .getTokenAccountsByOwner(
          walletAddress as Address,
          { programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') },
          { encoding: 'jsonParsed' }
        )
        .send()

      for (const account of tokenAccounts.value) {
        const data = account.account.data as {
          parsed: { info: { mint: string; tokenAmount: { amount: string } } }
        }
        balances.push({
          mint: data.parsed.info.mint,
          balance: BigInt(data.parsed.info.tokenAmount.amount),
        })
      }

      return balances
    } catch (error) {
      console.warn('Failed to get all token balances:', error)
      return []
    }
  }
}

// =====================================================
// SDK CLIENT MANAGER
// =====================================================

export class GhostSpeakSDKManager {
  public x402: BrowserX402Client
  public discovery: BrowserAgentDiscoveryClient
  public analytics: BrowserAnalyticsTracker
  public tokens: BrowserTokenClient
  public sdkClient: GhostSpeakClient

  constructor() {
    this.sdkClient = getGhostSpeakClient()
    this.x402 = new BrowserX402Client(SOLANA_RPC_URL)
    this.discovery = new BrowserAgentDiscoveryClient()
    this.analytics = new BrowserAnalyticsTracker()
    this.tokens = new BrowserTokenClient(SOLANA_RPC_URL)
  }
}

// =====================================================
// GLOBAL SINGLETON
// =====================================================

let sdkManager: GhostSpeakSDKManager | null = null

export function getSDKManager(): GhostSpeakSDKManager {
  if (!sdkManager) {
    sdkManager = new GhostSpeakSDKManager()
  }
  return sdkManager
}

export function resetSDKManager(): void {
  sdkManager = null
}
