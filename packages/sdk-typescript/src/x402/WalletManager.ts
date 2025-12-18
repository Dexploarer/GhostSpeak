/**
 * Wallet Manager for x402 Payments
 *
 * Manages embedded wallets for x402 payments, including per-user wallets
 * and shared free-tier wallets for frictionless onboarding.
 *
 * @module x402/WalletManager
 */

import type { Address, TransactionSigner } from '@solana/kit'
import { EventEmitter } from 'node:events'

// =====================================================
// TYPES
// =====================================================

/**
 * Wallet types
 */
export enum WalletType {
  EMBEDDED = 'embedded',
  EXTERNAL = 'external',
  FREE_TIER = 'free_tier'
}

/**
 * Wallet information
 */
export interface WalletInfo {
  id: string
  address: Address
  type: WalletType
  userId?: string
  balance?: bigint
  createdAt: Date
  lastUsed?: Date
}

/**
 * Free tier configuration
 */
export interface FreeTierConfig {
  /** Address of the shared free-tier wallet */
  sharedWalletAddress: Address

  /** Maximum amount per request for free tier */
  maxAmountPerRequest: bigint

  /** Daily limit per user */
  dailyLimit: bigint

  /** Total daily limit for all free-tier usage */
  totalDailyLimit: bigint

  /** Allowed resources for free tier (empty = all allowed) */
  allowedResources?: string[]

  /** Blocked resources for free tier */
  blockedResources?: string[]
}

/**
 * User usage tracking
 */
export interface UserUsage {
  userId: string
  dailySpent: bigint
  dailyRequests: number
  lastResetDate: string // ISO date string
}

/**
 * Wallet manager options
 */
export interface WalletManagerOptions {
  /** Free tier configuration */
  freeTierConfig?: FreeTierConfig

  /** Storage adapter for persistence */
  storage?: WalletStorage

  /** Enable usage tracking */
  enableUsageTracking?: boolean
}

/**
 * Storage adapter interface
 */
export interface WalletStorage {
  getWallet(userId: string): Promise<WalletInfo | null>
  saveWallet(wallet: WalletInfo): Promise<void>
  deleteWallet(userId: string): Promise<void>
  getUsage(userId: string): Promise<UserUsage | null>
  saveUsage(usage: UserUsage): Promise<void>
}

/**
 * Wallet creation options
 */
export interface CreateWalletOptions {
  userId: string
  type?: WalletType
  metadata?: Record<string, unknown>
}

/**
 * Wallet manager events
 */
export interface WalletManagerEvents {
  'wallet:created': (wallet: WalletInfo) => void
  'wallet:accessed': (wallet: WalletInfo) => void
  'usage:updated': (usage: UserUsage) => void
  'limit:reached': (userId: string, limitType: 'request' | 'daily') => void
  'error': (error: Error) => void
}

// =====================================================
// IN-MEMORY STORAGE
// =====================================================

/**
 * Simple in-memory storage implementation
 */
export class InMemoryWalletStorage implements WalletStorage {
  private wallets: Map<string, WalletInfo> = new Map()
  private usage: Map<string, UserUsage> = new Map()

  async getWallet(userId: string): Promise<WalletInfo | null> {
    return this.wallets.get(userId) ?? null
  }

  async saveWallet(wallet: WalletInfo): Promise<void> {
    this.wallets.set(wallet.userId ?? wallet.id, wallet)
  }

  async deleteWallet(userId: string): Promise<void> {
    this.wallets.delete(userId)
  }

  async getUsage(userId: string): Promise<UserUsage | null> {
    return this.usage.get(userId) ?? null
  }

  async saveUsage(usage: UserUsage): Promise<void> {
    this.usage.set(usage.userId, usage)
  }
}

// =====================================================
// WALLET MANAGER CLASS
// =====================================================

/**
 * Manages embedded wallets for x402 payments
 */
export class WalletManager extends EventEmitter {
  private readonly storage: WalletStorage
  private readonly freeTierConfig?: FreeTierConfig
  private readonly enableUsageTracking: boolean

  // In-memory cache for signers
  private signerCache: Map<string, TransactionSigner> = new Map()

  // Shared free-tier signer
  private freeTierSigner?: TransactionSigner

  constructor(options?: WalletManagerOptions) {
    super()
    this.storage = options?.storage ?? new InMemoryWalletStorage()
    this.freeTierConfig = options?.freeTierConfig
    this.enableUsageTracking = options?.enableUsageTracking ?? true
  }

  // =====================================================
  // WALLET MANAGEMENT
  // =====================================================

  /**
   * Get or create a wallet for a user
   */
  async getOrCreateWallet(userId: string): Promise<WalletInfo> {
    // Check for existing wallet
    let wallet = await this.storage.getWallet(userId)

    if (wallet) {
      wallet.lastUsed = new Date()
      await this.storage.saveWallet(wallet)
      this.emit('wallet:accessed', wallet)
      return wallet
    }

    // Create new embedded wallet
    wallet = await this.createWallet({ userId, type: WalletType.EMBEDDED })
    return wallet
  }

  /**
   * Create a new wallet
   */
  async createWallet(options: CreateWalletOptions): Promise<WalletInfo> {
    const walletId = this.generateWalletId()
    const address = this.generateAddress() // Placeholder - would use real key generation

    const wallet: WalletInfo = {
      id: walletId,
      address,
      type: options.type ?? WalletType.EMBEDDED,
      userId: options.userId,
      balance: 0n,
      createdAt: new Date(),
      lastUsed: new Date()
    }

    await this.storage.saveWallet(wallet)
    this.emit('wallet:created', wallet)

    return wallet
  }

  /**
   * Get a wallet by user ID
   */
  async getWallet(userId: string): Promise<WalletInfo | null> {
    return this.storage.getWallet(userId)
  }

  /**
   * Delete a wallet
   */
  async deleteWallet(userId: string): Promise<void> {
    await this.storage.deleteWallet(userId)
    this.signerCache.delete(userId)
  }

  // =====================================================
  // FREE TIER MANAGEMENT
  // =====================================================

  /**
   * Check if user is eligible for free tier
   */
  async isFreeTierEligible(userId: string): Promise<boolean> {
    if (!this.freeTierConfig) return false

    // Check if user has their own wallet with balance
    const wallet = await this.storage.getWallet(userId)
    if (wallet && wallet.balance != null && wallet.balance > 0n) {
      return false // User has funds, use their own wallet
    }

    // Check daily limit
    const usage = await this.getUserUsage(userId)
    if (usage.dailySpent >= this.freeTierConfig.dailyLimit) {
      return false
    }

    return true
  }

  /**
   * Get free tier wallet for a user
   */
  async getFreeTierWallet(): Promise<WalletInfo | null> {
    if (!this.freeTierConfig) return null

    return {
      id: 'free_tier_shared',
      address: this.freeTierConfig.sharedWalletAddress,
      type: WalletType.FREE_TIER,
      createdAt: new Date()
    }
  }

  /**
   * Check if a resource is allowed for free tier
   */
  isResourceAllowedForFreeTier(resourceUrl: string): boolean {
    if (!this.freeTierConfig) return false

    // Check blocked list
    if (this.freeTierConfig.blockedResources?.length) {
      for (const blocked of this.freeTierConfig.blockedResources) {
        if (resourceUrl.includes(blocked)) {
          return false
        }
      }
    }

    // Check allowed list (if specified)
    if (this.freeTierConfig.allowedResources?.length) {
      for (const allowed of this.freeTierConfig.allowedResources) {
        if (resourceUrl.includes(allowed)) {
          return true
        }
      }
      return false // Not in allowed list
    }

    return true // No restrictions
  }

  /**
   * Check if payment amount is within free tier limit
   */
  isWithinFreeTierLimit(amount: bigint): boolean {
    if (!this.freeTierConfig) return false
    return amount <= this.freeTierConfig.maxAmountPerRequest
  }

  // =====================================================
  // USAGE TRACKING
  // =====================================================

  /**
   * Get user usage for the current day
   */
  async getUserUsage(userId: string): Promise<UserUsage> {
    const today = new Date().toISOString().split('T')[0]
    let usage = await this.storage.getUsage(userId)

    if (!usage || usage.lastResetDate !== today) {
      // Reset for new day
      usage = {
        userId,
        dailySpent: 0n,
        dailyRequests: 0,
        lastResetDate: today
      }
      await this.storage.saveUsage(usage)
    }

    return usage
  }

  /**
   * Record usage for a user
   */
  async recordUsage(userId: string, amount: bigint): Promise<void> {
    if (!this.enableUsageTracking) return

    const usage = await this.getUserUsage(userId)
    usage.dailySpent += amount
    usage.dailyRequests += 1

    await this.storage.saveUsage(usage)
    this.emit('usage:updated', usage)

    // Check limits
    if (this.freeTierConfig) {
      if (usage.dailySpent >= this.freeTierConfig.dailyLimit) {
        this.emit('limit:reached', userId, 'daily')
      }
    }
  }

  /**
   * Check if user has remaining daily limit
   */
  async hasRemainingLimit(userId: string): Promise<boolean> {
    if (!this.freeTierConfig) return true

    const usage = await this.getUserUsage(userId)
    return usage.dailySpent < this.freeTierConfig.dailyLimit
  }

  /**
   * Get remaining daily limit for a user
   */
  async getRemainingLimit(userId: string): Promise<bigint> {
    if (!this.freeTierConfig) return BigInt(Number.MAX_SAFE_INTEGER)

    const usage = await this.getUserUsage(userId)
    const remaining = this.freeTierConfig.dailyLimit - usage.dailySpent
    return remaining > 0n ? remaining : 0n
  }

  // =====================================================
  // SIGNER MANAGEMENT
  // =====================================================

  /**
   * Get or create a signer for a user
   *
   * Note: This is a placeholder implementation.
   * In production, this would integrate with Coinbase CDP or similar.
   */
  async getSigner(userId: string): Promise<TransactionSigner | null> {
    // Check cache
    const cached = this.signerCache.get(userId)
    if (cached) return cached

    // Get wallet
    const wallet = await this.storage.getWallet(userId)
    if (!wallet) return null

    // Create signer (placeholder)
    // In production, this would recover the signer from secure storage
    const signer = this.createMockSigner(wallet.address)
    this.signerCache.set(userId, signer)

    return signer
  }

  /**
   * Get free tier signer
   *
   * Note: This is a placeholder implementation.
   */
  getFreeTierSigner(): TransactionSigner | null {
    if (!this.freeTierConfig) return null

    if (!this.freeTierSigner) {
      this.freeTierSigner = this.createMockSigner(this.freeTierConfig.sharedWalletAddress)
    }

    return this.freeTierSigner
  }

  /**
   * Set free tier signer (for initialization)
   */
  setFreeTierSigner(signer: TransactionSigner): void {
    this.freeTierSigner = signer
  }

  /**
   * Get the best signer for a user (their own wallet or free tier)
   */
  async getBestSigner(
    userId: string,
    paymentAmount: bigint
  ): Promise<{ signer: TransactionSigner; type: WalletType } | null> {
    // First, check if user has their own funded wallet
    const userWallet = await this.storage.getWallet(userId)
    if (userWallet && userWallet.balance != null && userWallet.balance >= paymentAmount) {
      const signer = await this.getSigner(userId)
      if (signer) {
        return { signer, type: WalletType.EMBEDDED }
      }
    }

    // Check free tier eligibility
    if (
      this.freeTierConfig &&
      (await this.isFreeTierEligible(userId)) &&
      this.isWithinFreeTierLimit(paymentAmount)
    ) {
      const signer = this.getFreeTierSigner()
      if (signer) {
        return { signer, type: WalletType.FREE_TIER }
      }
    }

    // Fall back to user's wallet even if low balance (they need to fund it)
    const signer = await this.getSigner(userId)
    if (signer) {
      return { signer, type: WalletType.EMBEDDED }
    }

    return null
  }

  // =====================================================
  // BALANCE MANAGEMENT
  // =====================================================

  /**
   * Get wallet balance
   *
   * Note: Placeholder - would query actual blockchain balance
   */
  async getBalance(userId: string, token?: Address): Promise<bigint> {
    const wallet = await this.storage.getWallet(userId)
    return wallet?.balance ?? 0n
  }

  /**
   * Update cached balance
   */
  async updateBalance(userId: string, balance: bigint): Promise<void> {
    const wallet = await this.storage.getWallet(userId)
    if (wallet) {
      wallet.balance = balance
      await this.storage.saveWallet(wallet)
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Generate wallet ID
   */
  private generateWalletId(): string {
    return `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  /**
   * Generate address (placeholder)
   *
   * Note: In production, this would use proper key derivation
   */
  private generateAddress(): Address {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let address = ''
    for (let i = 0; i < 44; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return address as Address
  }

  /**
   * Create mock signer (placeholder)
   *
   * Note: In production, this would create a real signer
   */
  private createMockSigner(address: Address): TransactionSigner {
    return {
      address,
      signTransactions: async (transactions) => transactions,
      signMessages: async (messages) =>
        messages.map(() => new Uint8Array(64) as unknown as Uint8Array & { readonly __brand: 'signature' })
    } as TransactionSigner
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.signerCache.clear()
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new wallet manager
 */
export function createWalletManager(options?: WalletManagerOptions): WalletManager {
  return new WalletManager(options)
}

// =====================================================
// DEFAULT FREE TIER CONFIG
// =====================================================

/**
 * Default free tier configuration
 */
export const DEFAULT_FREE_TIER_CONFIG: FreeTierConfig = {
  sharedWalletAddress: 'GHOSTFreeTierWalletxxxxxxxxxxxxxxxxxxxxxxxxx' as Address,
  maxAmountPerRequest: 100000n, // 0.1 USDC
  dailyLimit: 1000000n, // 1 USDC per user per day
  totalDailyLimit: 100000000n, // 100 USDC total per day
  blockedResources: []
}
