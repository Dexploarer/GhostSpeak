/**
 * GhostSpeak SDK Integration Layer
 *
 * Centralized SDK client management for x402 marketplace
 */

import { createSolanaRpc, address } from '@solana/kit'
import type { Address, TransactionSigner, Rpc, SolanaRpcApi, GetTransactionApi } from '@solana/kit'
import {
  GhostSpeakClient,
  X402Client,
  AgentDiscoveryClient,
  X402AnalyticsTracker,
  PaymentStreamingManager,
  type X402PaymentRequest,
  type X402PaymentReceipt,
  type X402PaymentEvent,
  type Agent,
  type AgentPricing,
  type PaymentStream,
  type PaymentMilestone,
  type X402VerificationResult,
  type AgentSearchParams,
  type AgentSearchResponse,
  type X402TransactionMetrics,
  type PaymentHistoryItem
} from '@ghostspeak/sdk'

export type { Address }
// Re-export types from SDK
export type {
  X402PaymentRequest,
  X402PaymentReceipt,
  X402PaymentEvent,
  Agent,
  AgentPricing,
  PaymentStream,
  PaymentMilestone,
  X402VerificationResult,
  AgentSearchParams,
  AgentSearchResponse,
  X402TransactionMetrics,
  PaymentHistoryItem
}

// =====================================================
// ADDITIONAL TYPE DEFINITIONS
// =====================================================

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
    // Note: signer is passed via builders in SDK, so generic client just needs config
    this.ghostspeak = new GhostSpeakClient({
      rpcEndpoint: SOLANA_RPC_URL,
      programId: address(GHOSTSPEAK_PROGRAM_ID),
      commitment: 'confirmed'
    })

    // Initialize x402 clients
    this.x402 = new X402Client(this.rpc, walletSigner)
    
    this.discovery = new AgentDiscoveryClient({
      rpcEndpoint: SOLANA_RPC_URL, 
      programId: address(GHOSTSPEAK_PROGRAM_ID)
    })
    
    this.analytics = new X402AnalyticsTracker({
      // Configure analytics options if needed
    })
    
    this.streaming = new PaymentStreamingManager(this.x402, this.rpc)

    // Setup analytics event handlers
    this.setupAnalyticsHandlers()
  }

  /**
   * Update wallet signer (e.g., when user connects/disconnects wallet)
   */
  updateWallet(walletSigner?: TransactionSigner): void {
    this.wallet = walletSigner
    
    // Re-initialize clients that depend on wallet
    this.x402 = new X402Client(this.rpc, walletSigner)
    this.streaming = new PaymentStreamingManager(this.x402, this.rpc)
    
    // Core client doesn't need re-init, but we could update if it stored signer
    // Current SDK design handles signer in operation builders
  }

  /**
   * Setup analytics event handlers to track x402 payments
   */
  private setupAnalyticsHandlers(): void {
    this.x402.on('payment_sent', (event: X402PaymentEvent) => {
      this.analytics.recordPayment({
        signature: event.signature ?? '',
        timestamp: BigInt(event.timestamp),
        payer: this.wallet?.address ?? address('11111111111111111111111111111111'), // Fallback if unclear
        recipient: event.request.recipient,
        amount: event.request.amount,
        token: event.request.token,
        status: 'pending'
      })
    })

    this.x402.on('payment_confirmed', (event: X402PaymentEvent) => {
      if (event.receipt) {
        this.analytics.updatePaymentStatus(
          event.receipt.signature,
          'confirmed',
          { confirmationTime: Date.now() - event.timestamp }
        )
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
