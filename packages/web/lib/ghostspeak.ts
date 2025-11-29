/**
 * GhostSpeak SDK Integration Layer
 *
 * Centralized SDK client management for x402 marketplace
 */

import { createSolanaRpc, address } from '@solana/kit'
import type { Address, TransactionSigner, Rpc, SolanaRpcApi, GetTransactionApi } from '@solana/kit'

// Temporary stubs for deployment - replace with actual SDK imports when build issues are resolved
const X402Client = class X402ClientStub {
  constructor() {}
  on() {}
}

const AgentDiscoveryClient = class AgentDiscoveryClientStub {
  constructor() {}
}

const X402AnalyticsTracker = class X402AnalyticsTrackerStub {
  constructor() {}
  trackPayment() {}
}

const PaymentStreamingManager = class PaymentStreamingManagerStub {
  constructor() {}
}

const GhostSpeakClient = class GhostSpeakClientStub {
  constructor() {}
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

  public ghostspeak: GhostSpeakClient
  public x402: X402Client
  public discovery: AgentDiscoveryClient
  public analytics: X402AnalyticsTracker
  public streaming: PaymentStreamingManager

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
    this.x402.on('payment_sent', (event) => {
      this.analytics.trackPayment({
        signature: event.signature ?? '',
        amount: event.request.amount,
        token: event.request.token,
        recipient: event.request.recipient,
        timestamp: event.timestamp
      })
    })

    this.x402.on('payment_confirmed', (event) => {
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
// CONVENIENCE EXPORTS
// =====================================================

export type {
  X402PaymentRequest,
  X402PaymentReceipt,
  X402PaymentHeaders,
  X402VerificationResult,
  X402PaymentEvent
} from '@ghostspeak/sdk/x402/X402Client'

export type {
  Agent,
  AgentSearchParams,
  AgentSearchResponse,
  AgentPricing
} from '@ghostspeak/sdk/x402/AgentDiscoveryClient'

export type {
  X402TransactionMetrics
} from '@ghostspeak/sdk/x402/analytics'

export type {
  PaymentStream,
  PaymentMilestone,
  StreamPayment
} from '@ghostspeak/sdk/x402/PaymentStreaming'
