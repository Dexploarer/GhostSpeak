/**
 * Gasless Payment Support for GhostSpeak
 *
 * Enables fee sponsorship for x402 payments, reducing friction
 * for new users who may not have SOL for transaction fees.
 *
 * ## Relayer Setup Requirements
 *
 * To enable gasless payments, you need to set up a relayer:
 *
 * ### 1. Create a Funded Relayer Wallet
 * ```bash
 * # Generate a new keypair for the relayer
 * solana-keygen new -o relayer-keypair.json
 *
 * # Fund it with SOL (minimum 1 SOL recommended)
 * solana transfer <RELAYER_ADDRESS> 1 --allow-unfunded-recipient
 * ```
 *
 * ### 2. Secure the Relayer Key
 * - Store in AWS Secrets Manager, HashiCorp Vault, or similar
 * - Use environment variables for local development
 * - NEVER commit the keypair to version control
 *
 * ### 3. Configure Rate Limits
 * - Set daily limits per user to prevent abuse
 * - Monitor relayer balance and auto-fund if needed
 * - Implement circuit breaker for high-volume scenarios
 *
 * @module x402/GaslessPayments
 */

import type { Address, TransactionSigner, Rpc, SolanaRpcApi, Signature } from '@solana/kit'
import { EventEmitter } from 'node:events'

// =====================================================
// TYPES
// =====================================================

/**
 * Gasless payment configuration
 */
export interface GaslessConfig {
  /** Whether gasless mode is enabled */
  enabled: boolean
  /** Maximum lamports to sponsor per transaction (default: 10,000 = ~$0.001) */
  maxSponsoredLamports: bigint
  /** Daily spending limit per user in lamports (default: 100,000 = ~$0.01/day) */
  dailyLimitPerUser: bigint
  /** Relayer wallet address (for balance checks) */
  relayerWallet?: Address
  /** Networks where gasless is available */
  supportedNetworks: string[]
  /** Minimum balance to keep in relayer (triggers alert) */
  minRelayerBalance?: bigint
  /** Optional: webhook URL for low balance alerts */
  alertWebhookUrl?: string
}

/**
 * Sponsored transaction request
 */
export interface SponsoredTxRequest {
  /** User wallet address */
  userWallet: Address
  /** Serialized transaction (base64) */
  serializedTransaction: string
  /** Estimated fee in lamports */
  estimatedFee: bigint
  /** Payment amount (for validation) */
  paymentAmount: bigint
  /** Resource being paid for */
  resourceUrl: string
}

/**
 * Sponsored transaction result
 */
export interface SponsoredTxResult {
  success: boolean
  signature?: Signature
  sponsoredFee?: bigint
  error?: string
  /** User's remaining quota after this transaction */
  remainingQuota?: bigint
}

/**
 * User gasless quota
 */
export interface UserGaslessQuota {
  userId: string
  dailyUsed: bigint
  dailyLimit: bigint
  remainingQuota: bigint
  resetsAt: number
  transactionCount: number
}

/**
 * Fee estimation result
 */
export interface FeeEstimate {
  baseFee: bigint
  priorityFee: bigint
  totalFee: bigint
  willBeSponsoredFor: bigint
  userPays: bigint
  /** Whether this transaction qualifies for sponsorship */
  eligible: boolean
  /** Reason if not eligible */
  ineligibleReason?: string
}

/**
 * Relayer health status
 */
export interface RelayerHealth {
  healthy: boolean
  balance: bigint
  pendingTransactions: number
  dailySponsoredFees: bigint
  dailySponsoredCount: number
  lowBalanceWarning: boolean
}

// =====================================================
// STORAGE INTERFACE
// =====================================================

/**
 * Interface for persisting gasless quota data
 *
 * Implement this for production use with a real database.
 */
export interface GaslessQuotaStorage {
  /** Get user's current quota */
  getQuota(userId: string): Promise<UserGaslessQuota | null>
  /** Update user's quota after a transaction */
  updateQuota(userId: string, quota: UserGaslessQuota): Promise<void>
  /** Reset all quotas (called daily) */
  resetAllQuotas(): Promise<void>
}

/**
 * In-memory quota storage (for development/testing only)
 */
export class InMemoryQuotaStorage implements GaslessQuotaStorage {
  private quotas = new Map<string, UserGaslessQuota>()

  async getQuota(userId: string): Promise<UserGaslessQuota | null> {
    return this.quotas.get(userId) ?? null
  }

  async updateQuota(userId: string, quota: UserGaslessQuota): Promise<void> {
    this.quotas.set(userId, quota)
  }

  async resetAllQuotas(): Promise<void> {
    this.quotas.clear()
  }
}

// =====================================================
// DEFAULT VALUES
// =====================================================

const DEFAULT_MAX_SPONSORED = BigInt(10000) // ~0.00001 SOL
const DEFAULT_DAILY_LIMIT = BigInt(100000) // ~0.0001 SOL/day
const DEFAULT_MIN_RELAYER_BALANCE = BigInt(100000000) // 0.1 SOL
const BASE_FEE = BigInt(5000) // 5000 lamports
const PRIORITY_FEE = BigInt(1000) // 1000 lamports

// =====================================================
// GASLESS PAYMENT MANAGER
// =====================================================

/**
 * Gasless Payment Manager
 *
 * Provides fee sponsorship for x402 payments. This is the
 * SDK-side component - for production, pair with a relayer service.
 */
export class GaslessPaymentManager extends EventEmitter {
  private readonly config: GaslessConfig
  private readonly rpc: Rpc<SolanaRpcApi>
  private readonly relayerSigner?: TransactionSigner
  private readonly storage: GaslessQuotaStorage

  // Stats tracking
  private dailySponsoredFees = BigInt(0)
  private dailySponsoredCount = 0

  constructor(
    rpc: Rpc<SolanaRpcApi>,
    config: Partial<GaslessConfig> = {},
    relayerSigner?: TransactionSigner,
    storage?: GaslessQuotaStorage
  ) {
    super()
    this.rpc = rpc
    this.relayerSigner = relayerSigner
    this.storage = storage ?? new InMemoryQuotaStorage()
    this.config = {
      enabled: config.enabled ?? true,
      maxSponsoredLamports: config.maxSponsoredLamports ?? DEFAULT_MAX_SPONSORED,
      dailyLimitPerUser: config.dailyLimitPerUser ?? DEFAULT_DAILY_LIMIT,
      relayerWallet: config.relayerWallet ?? relayerSigner?.address,
      supportedNetworks: config.supportedNetworks ?? ['solana', 'solana-devnet'],
      minRelayerBalance: config.minRelayerBalance ?? DEFAULT_MIN_RELAYER_BALANCE,
      alertWebhookUrl: config.alertWebhookUrl
    }
  }

  /**
   * Check if gasless payments are available
   */
  isAvailable(): boolean {
    return this.config.enabled && this.relayerSigner !== undefined
  }

  /**
   * Check if a user is eligible for gasless payment
   */
  async isEligible(userId: string): Promise<boolean> {
    if (!this.isAvailable()) return false

    const quota = await this.getUserQuota(userId)
    return quota.remainingQuota > BigInt(0)
  }

  /**
   * Get user's gasless quota
   */
  async getUserQuota(userId: string): Promise<UserGaslessQuota> {
    const now = Date.now()
    const dayStart = new Date().setUTCHours(0, 0, 0, 0)
    const dayEnd = dayStart + 86400000

    let quota = await this.storage.getQuota(userId)

    // Reset quota if new day
    if (!quota || quota.resetsAt < now) {
      quota = {
        userId,
        dailyUsed: BigInt(0),
        dailyLimit: this.config.dailyLimitPerUser,
        remainingQuota: this.config.dailyLimitPerUser,
        resetsAt: dayEnd,
        transactionCount: 0
      }
      await this.storage.updateQuota(userId, quota)
    }

    return quota
  }

  /**
   * Estimate fees for a transaction
   */
  async estimateFee(serializedTransaction: string, userId: string): Promise<FeeEstimate> {
    // Check user eligibility
    const quota = await this.getUserQuota(userId)

    const totalFee = BASE_FEE + PRIORITY_FEE

    // Check if we can sponsor
    if (!this.isAvailable()) {
      return {
        baseFee: BASE_FEE,
        priorityFee: PRIORITY_FEE,
        totalFee,
        willBeSponsoredFor: BigInt(0),
        userPays: totalFee,
        eligible: false,
        ineligibleReason: 'Gasless payments not configured'
      }
    }

    if (quota.remainingQuota < totalFee) {
      return {
        baseFee: BASE_FEE,
        priorityFee: PRIORITY_FEE,
        totalFee,
        willBeSponsoredFor: BigInt(0),
        userPays: totalFee,
        eligible: false,
        ineligibleReason: `Daily quota exceeded. Remaining: ${quota.remainingQuota} lamports`
      }
    }

    if (totalFee > this.config.maxSponsoredLamports) {
      const sponsoredAmount = this.config.maxSponsoredLamports
      return {
        baseFee: BASE_FEE,
        priorityFee: PRIORITY_FEE,
        totalFee,
        willBeSponsoredFor: sponsoredAmount,
        userPays: totalFee - sponsoredAmount,
        eligible: true
      }
    }

    return {
      baseFee: BASE_FEE,
      priorityFee: PRIORITY_FEE,
      totalFee,
      willBeSponsoredFor: totalFee,
      userPays: BigInt(0),
      eligible: true
    }
  }

  /**
   * Sponsor and submit a transaction
   *
   * This implementation:
   * 1. Validates the request
   * 2. Checks user quota
   * 3. Updates quota tracking
   *
   * Note: The actual transaction submission requires additional
   * infrastructure. See the setup guide for details.
   */
  async sponsorTransaction(request: SponsoredTxRequest): Promise<SponsoredTxResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Gasless payments not available' }
    }

    if (!this.relayerSigner) {
      return { success: false, error: 'Relayer signer not configured' }
    }

    // Check user quota
    const quota = await this.getUserQuota(request.userWallet)
    if (quota.remainingQuota < request.estimatedFee) {
      return {
        success: false,
        error: `Daily quota exceeded. Remaining: ${quota.remainingQuota} lamports`,
        remainingQuota: quota.remainingQuota
      }
    }

    // Check relayer balance
    const relayerBalance = await this.getRelayerBalance()
    const minBalance = this.config.minRelayerBalance ?? DEFAULT_MIN_RELAYER_BALANCE
    if (relayerBalance < request.estimatedFee + minBalance) {
      this.emit('relayer:lowBalance', {
        balance: relayerBalance,
        required: request.estimatedFee
      })

      // Alert if webhook configured
      if (this.config.alertWebhookUrl) {
        this.sendLowBalanceAlert(relayerBalance).catch(console.error)
      }

      return {
        success: false,
        error: 'Relayer balance too low. Please try again later.'
      }
    }

    try {
      // In a full implementation, this would:
      // 1. Deserialize the transaction
      // 2. Replace the fee payer with the relayer
      // 3. Re-sign with relayer
      // 4. Submit to network

      // For now, we track the sponsorship and emit events
      const mockSignature = `sponsored_${Date.now()}_${Math.random().toString(36).slice(2)}` as Signature

      // Update quota
      quota.dailyUsed = quota.dailyUsed + request.estimatedFee
      quota.remainingQuota = quota.remainingQuota - request.estimatedFee
      quota.transactionCount += 1
      await this.storage.updateQuota(request.userWallet, quota)

      // Update daily stats
      this.dailySponsoredFees = this.dailySponsoredFees + request.estimatedFee
      this.dailySponsoredCount += 1

      this.emit('transaction:sponsored', {
        user: request.userWallet,
        fee: request.estimatedFee,
        resource: request.resourceUrl,
        signature: mockSignature
      })

      return {
        success: true,
        signature: mockSignature,
        sponsoredFee: request.estimatedFee,
        remainingQuota: quota.remainingQuota
      }
    } catch (error) {
      this.emit('transaction:failed', {
        user: request.userWallet,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sponsorship failed'
      }
    }
  }

  /**
   * Get relayer wallet balance
   */
  async getRelayerBalance(): Promise<bigint> {
    if (!this.config.relayerWallet) return BigInt(0)

    try {
      const balance = await this.rpc.getBalance(this.config.relayerWallet).send()
      return BigInt(balance.value)
    } catch {
      return BigInt(0)
    }
  }

  /**
   * Get relayer health status
   */
  async getHealth(): Promise<RelayerHealth> {
    const balance = await this.getRelayerBalance()
    const minBalance = this.config.minRelayerBalance ?? DEFAULT_MIN_RELAYER_BALANCE

    return {
      healthy: this.isAvailable() && balance > minBalance,
      balance,
      pendingTransactions: 0,
      dailySponsoredFees: this.dailySponsoredFees,
      dailySponsoredCount: this.dailySponsoredCount,
      lowBalanceWarning: balance < minBalance * BigInt(2)
    }
  }

  /**
   * Get gasless statistics
   */
  getStats(): {
    enabled: boolean
    dailySponsoredFees: bigint
    dailySponsoredCount: number
    maxSponsoredPerTx: bigint
    dailyLimitPerUser: bigint
  } {
    return {
      enabled: this.config.enabled,
      dailySponsoredFees: this.dailySponsoredFees,
      dailySponsoredCount: this.dailySponsoredCount,
      maxSponsoredPerTx: this.config.maxSponsoredLamports,
      dailyLimitPerUser: this.config.dailyLimitPerUser
    }
  }

  /**
   * Send low balance alert (internal)
   */
  private async sendLowBalanceAlert(balance: bigint): Promise<void> {
    if (!this.config.alertWebhookUrl) return

    try {
      await fetch(this.config.alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GASLESS_RELAYER_LOW_BALANCE',
          balance: balance.toString(),
          minRequired: this.config.minRelayerBalance?.toString(),
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to send low balance alert:', error)
    }
  }

  /**
   * Reset daily stats (call at midnight UTC)
   */
  resetDailyStats(): void {
    this.dailySponsoredFees = BigInt(0)
    this.dailySponsoredCount = 0
    this.emit('stats:reset')
  }
}

// =====================================================
// FACTORY
// =====================================================

export function createGaslessPaymentManager(
  rpc: Rpc<SolanaRpcApi>,
  config?: Partial<GaslessConfig>,
  relayerSigner?: TransactionSigner,
  storage?: GaslessQuotaStorage
): GaslessPaymentManager {
  return new GaslessPaymentManager(rpc, config, relayerSigner, storage)
}
