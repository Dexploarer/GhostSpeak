/**
 * GhostSpeak SDK Integration Layer
 *
 * Centralized SDK client management for x402 marketplace
 */

import { createSolanaRpc, address } from '@solana/kit'
import type { Address, TransactionSigner, Rpc, SolanaRpcApi, GetTransactionApi } from '@solana/kit'

// =====================================================
// TYPE DEFINITIONS - Must come before stubs
// =====================================================

export interface X402PaymentRequest {
  amount: bigint | string
  token: Address
  recipient: Address
  description?: string
  metadata?: Record<string, string>
  requiresReceipt?: boolean
}

export interface X402PaymentReceipt {
  signature: string
  amount: string
  token: Address
  recipient: Address
  timestamp: number
}

export interface X402PaymentEvent {
  signature?: string
  request: X402PaymentRequest
  receipt?: X402PaymentReceipt
  timestamp: number
}

export interface Agent {
  address: Address
  name: string
  capabilities: string[]
  pricing?: AgentPricing
  reputation?: number
  totalCalls?: number
  successRate?: number
}

export interface AgentPricing {
  amount: string
  token: Address
  pricePerCall?: bigint
  paymentToken?: Address
  responseTimeMs?: number
}

export interface PaymentStream {
  id: string
  milestones: PaymentMilestone[]
  totalAmount: string
  releasedAmount?: string
  description: string
  status: 'active' | 'completed' | 'cancelled'
  recipient: string
  token: string
}

export interface PaymentMilestone {
  id: string
  amount: string
  completed: boolean
  released: boolean
  description: string
  deadline?: number
}

// =====================================================
// STUB CLASSES - Temporary for deployment
// =====================================================

interface X402EventMap {
  payment_sent: X402PaymentEvent
  payment_confirmed: X402PaymentEvent
}

const X402Client = class X402ClientStub {
  constructor(_rpc: unknown, _walletSigner?: unknown) {}
  on<K extends keyof X402EventMap>(_event: K, _handler: (event: X402EventMap[K]) => void): void {
    // Stub implementation
  }
  async sendPayment(_request: unknown): Promise<string> {
    throw new Error('SDK not implemented - sendPayment stub')
  }
  async waitForConfirmation(_signature: string, _options?: unknown): Promise<X402PaymentReceipt> {
    throw new Error('SDK not implemented - waitForConfirmation stub')
  }
  async verifyPayment(_signature: string): Promise<X402VerificationResult> {
    throw new Error('SDK not implemented - verifyPayment stub')
  }
  async getPaymentHistory(_publicKey: unknown): Promise<PaymentHistoryItem[]> {
    return []
  }
}

const AgentDiscoveryClient = class AgentDiscoveryClientStub {
  constructor(_rpc: unknown, _programId: Address) {}
  async searchAgents(_params: unknown): Promise<{ agents: Agent[]; total: number }> {
    return { agents: [], total: 0 }
  }
  async getAgent(_address: Address): Promise<Agent | null> {
    return null
  }
}

const X402AnalyticsTracker = class X402AnalyticsTrackerStub {
  constructor(_config: { rpc: unknown; programId: Address }) {}
  trackPayment(_payment: unknown): void {
    // Stub implementation
  }
  async getUserMetrics(_publicKey: unknown): Promise<X402TransactionMetrics> {
    return { totalVolume: '0', transactionCount: 0, averageAmount: '0' }
  }
  async getPlatformMetrics(): Promise<X402TransactionMetrics> {
    return { totalVolume: '0', transactionCount: 0, averageAmount: '0' }
  }
  async getAgentEarnings(_agentAddress: Address): Promise<X402TransactionMetrics> {
    return { totalVolume: '0', transactionCount: 0, averageAmount: '0' }
  }
}

const PaymentStreamingManager = class PaymentStreamingManagerStub {
  constructor(_rpc: unknown, _walletSigner?: unknown) {}
  async createStream(_params: unknown): Promise<PaymentStream> {
    throw new Error('SDK not implemented - createStream stub')
  }
  async getUserStreams(_publicKey: unknown): Promise<PaymentStream[]> {
    return []
  }
  async getStream(_streamId: string): Promise<PaymentStream | null> {
    return null
  }
  async releaseMilestone(_streamId: string, _milestoneIndex: number): Promise<unknown> {
    throw new Error('SDK not implemented - releaseMilestone stub')
  }
}

const GhostSpeakClient = class GhostSpeakClientStub {
  // Stub tokens module for type compatibility
  public tokens = {
    getBalance: async (_wallet: unknown, _token: Address): Promise<bigint> => {
      console.warn('SDK tokens module not implemented - returning 0')
      return BigInt(0)
    },
    getAllBalances: async (_wallet: unknown): Promise<Array<{ token: Address; balance: bigint }>> => {
      console.warn('SDK tokens module not implemented - returning empty array')
      return []
    },
  }
  constructor(_config: { rpcUrl: string; programId: Address; signer?: unknown }) {}
}

// =====================================================
// CONFIGURATION
// =====================================================

export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
export const GHOSTSPEAK_PROGRAM_ID = process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID ?? 'GhostSpeakMarketplaceProgram11111111111111'

// =====================================================
// SDK CLIENT MANAGER
// =====================================================

export class GhostSpeakSDKManager {
  private rpc: Rpc<SolanaRpcApi & GetTransactionApi>
  private wallet?: TransactionSigner

  public ghostspeak: InstanceType<typeof GhostSpeakClient>
  public x402: InstanceType<typeof X402Client>
  public discovery: InstanceType<typeof AgentDiscoveryClient>
  public analytics: InstanceType<typeof X402AnalyticsTracker>
  public streaming: InstanceType<typeof PaymentStreamingManager>

  constructor(walletSigner?: TransactionSigner) {
    this.rpc = createSolanaRpc(SOLANA_RPC_URL)
    this.wallet = walletSigner

    // Initialize core GhostSpeak client
    this.ghostspeak = new GhostSpeakClient({
      rpcUrl: SOLANA_RPC_URL,
      programId: address(GHOSTSPEAK_PROGRAM_ID),
      signer: walletSigner
    })

    // Initialize x402 clients
    this.x402 = new X402Client(this.rpc, walletSigner)
    this.discovery = new AgentDiscoveryClient(this.rpc, address(GHOSTSPEAK_PROGRAM_ID))
    this.analytics = new X402AnalyticsTracker({
      rpc: this.rpc,
      programId: address(GHOSTSPEAK_PROGRAM_ID)
    })
    this.streaming = new PaymentStreamingManager(this.rpc, walletSigner)

    // Setup analytics event handlers
    this.setupAnalyticsHandlers()
  }

  /**
   * Update wallet signer (e.g., when user connects/disconnects wallet)
   */
  updateWallet(walletSigner?: TransactionSigner): void {
    this.wallet = walletSigner
    this.x402 = new X402Client(this.rpc, walletSigner)
    this.streaming = new PaymentStreamingManager(this.rpc, walletSigner)
    this.ghostspeak = new GhostSpeakClient({
      rpcUrl: SOLANA_RPC_URL,
      programId: address(GHOSTSPEAK_PROGRAM_ID),
      signer: walletSigner
    })
  }

  /**
   * Setup analytics event handlers to track x402 payments
   */
  private setupAnalyticsHandlers(): void {
    this.x402.on('payment_sent', (event: X402PaymentEvent) => {
      this.analytics.trackPayment({
        signature: event.signature ?? '',
        amount: event.request.amount,
        token: event.request.token,
        recipient: event.request.recipient,
        timestamp: event.timestamp
      })
    })

    this.x402.on('payment_confirmed', (event: X402PaymentEvent) => {
      if (event.receipt) {
        this.analytics.trackPayment({
          signature: event.receipt.signature,
          amount: event.receipt.amount,
          token: event.receipt.token,
          recipient: event.receipt.recipient,
          timestamp: event.receipt.timestamp
        })
      }
    })
  }
}

// =====================================================
// GLOBAL SINGLETON
// =====================================================

let sdkManager: GhostSpeakSDKManager | null = null

export function getSDKManager(walletSigner?: TransactionSigner): GhostSpeakSDKManager {
  if (!sdkManager) {
    sdkManager = new GhostSpeakSDKManager(walletSigner)
  } else if (walletSigner) {
    sdkManager.updateWallet(walletSigner)
  }
  return sdkManager
}

export function resetSDKManager(): void {
  sdkManager = null
}

// =====================================================
// ADDITIONAL TYPE DEFINITIONS
// =====================================================

export interface X402PaymentHeaders {
  'X-Payment-Amount'?: string
  'X-Payment-Token'?: string
  'X-Payment-Signature'?: string
}

export interface X402VerificationResult {
  verified: boolean
  receipt?: X402PaymentReceipt
}

export interface AgentSearchParams {
  capability?: string
  maxPrice?: string
  minPrice?: string
  token?: Address
  search?: string
  sortBy?: 'price' | 'reputation' | 'recent'
}

export interface AgentSearchResponse {
  agents: Agent[]
  total: number
}

export interface X402TransactionMetrics {
  totalVolume: string | bigint
  transactionCount: number
  averageAmount: string | bigint
  totalSpent?: bigint
  totalEarned?: bigint
  totalPaymentsSent?: number
  totalPaymentsReceived?: number
  successRate?: number
  successfulPayments?: number
  totalPayments?: number
  activeAgents?: number
  topAgents?: Agent[]
}

export interface StreamPayment {
  stream: PaymentStream
  milestone: PaymentMilestone
  signature: string
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
