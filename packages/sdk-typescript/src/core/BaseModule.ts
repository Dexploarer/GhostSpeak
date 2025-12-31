import type { Address } from '@solana/addresses'
import type { TransactionSigner, Instruction } from '@solana/kit'
// Use string type for signature since @solana/rpc-types doesn't export Signature in v2
type Signature = string
// Type alias for backward compatibility with @solana/kit v2
type IInstruction = Instruction
import type { GhostSpeakConfig } from '../types/index.js'
import { InstructionBuilder } from './InstructionBuilder.js'
import type { TransactionResult } from '../utils/transaction-urls.js'
import { CacheManager } from './CacheManager.js'

/**
 * Base class for all instruction modules using the unified InstructionBuilder.
 * This replaces the old BaseInstructions class with a much simpler pattern.
 */
export abstract class BaseModule {
  protected builder: InstructionBuilder
  protected config: GhostSpeakConfig
  protected logger?: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void }
  protected cacheManager: CacheManager
  private _debugMode = false

  constructor(config: GhostSpeakConfig) {
    this.config = config
    this.builder = new InstructionBuilder(config)
    this.cacheManager = new CacheManager(config.cache)
    // Optional: Set logger if provided in config
    this.logger = config.logger
  }

  /**
   * Enable debug mode for next operation
   */
  debug(): this {
    this._debugMode = true
    this.builder.enableDebug()
    return this
  }

  /**
   * Execute a single instruction
   */
  protected async execute(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction,
    signers: TransactionSigner[]
  ): Promise<string> {
    return this.builder.execute(
      instructionName,
      instructionGetter,
      signers
    ) as Promise<string>
  }

  /**
   * Execute a single instruction with detailed result
   */
  protected async executeWithDetails(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction,
    signers: TransactionSigner[]
  ): Promise<TransactionResult> {
    return this.builder.execute(
      instructionName,
      instructionGetter,
      signers,
      { returnDetails: true }
    )
  }

  /**
   * Execute multiple instructions in a batch
   */
  protected async executeBatch(
    batchName: string,
    instructionGetters: (() => Promise<IInstruction> | IInstruction)[],
    signers: TransactionSigner[]
  ): Promise<Signature> {
    return this.builder.executeBatch(
      batchName,
      instructionGetters.map(getter => () => Promise.resolve(getter())),
      signers
    )
  }

  /**
   * Simulate an instruction
   */
  protected async simulate(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction,
    signers: TransactionSigner[]
  ): Promise<unknown> {
    return this.builder.execute(
      instructionName,
      () => Promise.resolve(instructionGetter()),
      signers,
      { simulate: true }
    )
  }

  /**
   * Simulate an instruction (public accessor)
   */
  public async simulateInstruction(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction,
    signers: TransactionSigner[]
  ): Promise<unknown> {
    return this.simulate(instructionName, instructionGetter, signers)
  }

  /**
   * Estimate transaction cost
   */
  protected async estimateCost(
    instructionGetters: (() => Promise<IInstruction> | IInstruction)[]
  ): Promise<bigint> {
    return this.builder.estimateCost(instructionGetters)
  }

  /**
   * Get cost estimation for an instruction
   */
  async getCost(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction
  ): Promise<bigint> {
    return this.builder.estimateCost([instructionGetter])
  }

  /**
   * Get human-readable explanation
   */
  async explain(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction
  ): Promise<string> {
    return this.builder.explain(instructionName, [instructionGetter])
  }

  /**
   * Debug analyze without executing
   */
  async analyze(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction
  ): Promise<unknown> {
    return this.builder.debug(instructionName, [instructionGetter])
  }

  /**
   * Get decoded account (with optional caching)
   */
  protected async getAccount<T>(
    address: Address,
    decoderImportName: string
  ): Promise<T | null> {
    // Check cache first (if enabled)
    if (this.cacheManager.isEnabled()) {
      const cached = this.cacheManager.getAccount<T>(address, this.commitment)
      if (cached !== undefined) {
        this.logger?.info(`[Cache HIT] ${address}`)
        return cached
      }
    }

    // Cache miss - fetch from RPC
    const account = await this.builder.getAccount<T>(address, decoderImportName)

    // Cache the result (if enabled and account exists)
    if (this.cacheManager.isEnabled() && account !== null) {
      // Get current slot for cache metadata (optional enhancement)
      const slot = 0 // TODO: fetch current slot from RPC context
      this.cacheManager.setAccount(address, account, this.commitment, slot)
      this.logger?.info(`[Cache SET] ${address}`)
    }

    return account
  }

  /**
   * Get multiple decoded accounts (with optional caching)
   */
  protected async getAccounts<T>(
    addresses: Address[],
    decoderImportName: string
  ): Promise<(T | null)[]> {
    if (!this.cacheManager.isEnabled()) {
      // Caching disabled - fetch all
      return this.builder.getAccounts<T>(addresses, decoderImportName)
    }

    // Check cache for each address
    const results: (T | null)[] = new Array(addresses.length)
    const uncachedIndices: number[] = []
    const uncachedAddresses: Address[] = []

    for (let i = 0; i < addresses.length; i++) {
      const cached = this.cacheManager.getAccount<T>(addresses[i], this.commitment)
      if (cached !== undefined) {
        results[i] = cached
        this.logger?.info(`[Cache HIT] ${addresses[i]}`)
      } else {
        uncachedIndices.push(i)
        uncachedAddresses.push(addresses[i])
      }
    }

    // Fetch uncached accounts
    if (uncachedAddresses.length > 0) {
      this.logger?.info(`[Cache MISS] Fetching ${uncachedAddresses.length}/${addresses.length} accounts`)
      const fetched = await this.builder.getAccounts<T>(uncachedAddresses, decoderImportName)

      // Insert fetched results and cache them
      const slot = 0 // TODO: fetch current slot
      for (let i = 0; i < fetched.length; i++) {
        const originalIndex = uncachedIndices[i]
        const account = fetched[i]
        results[originalIndex] = account

        if (account !== null) {
          this.cacheManager.setAccount(uncachedAddresses[i], account, this.commitment, slot)
        }
      }
    }

    return results
  }

  /**
   * Get program accounts
   */
  protected async getProgramAccounts<T>(
    decoderImportName: string,
    filters?: ({ dataSize: bigint } | { memcmp: { offset: bigint; bytes: string; encoding?: 'base58' | 'base64' } })[]
  ): Promise<{ address: Address; data: T }[]> {
    return this.builder.getProgramAccounts<T>(decoderImportName, filters)
  }

  /**
   * Get program ID
   */
  protected get programId(): Address {
    return this.config.programId!
  }

  /**
   * Get program ID (public accessor)
   */
  public getProgramId(): Address {
    return this.config.programId!
  }

  /**
   * Get commitment level
   */
  protected get commitment() {
    return this.config.commitment ?? 'confirmed'
  }

  /**
   * Get commitment level (public accessor)
   */
  public getCommitment() {
    return this.config.commitment ?? 'confirmed'
  }

  /**
   * Invalidate cache for specific account
   */
  public invalidateCache(address: Address): void {
    this.cacheManager.invalidateAccount(address)
    this.logger?.info(`[Cache INVALIDATE] ${address}`)
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cacheManager.clear()
    this.logger?.info('[Cache CLEAR] All caches cleared')
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return this.cacheManager.getStats()
  }
}