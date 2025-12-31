/**
 * CacheManager - Slot-aware RPC result caching
 *
 * Reduces RPC calls by caching account data and PDA derivations
 * with commitment-level aware TTLs.
 *
 * @module CacheManager
 */

import { LRUCache } from 'lru-cache'
import type { Address } from '@solana/addresses'
import type { Commitment } from '@solana/kit'

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Enable caching (default: false, opt-in) */
  enabled?: boolean
  /** Maximum cache entries (default: 1000) */
  maxSize?: number
  /** Custom TTL overrides (milliseconds) */
  ttlOverrides?: {
    processed?: number
    confirmed?: number
    finalized?: number
  }
}

/**
 * Cached entry metadata
 */
interface CacheEntry<T> {
  data: T
  slot: number
  commitment: Commitment
  timestamp: number
}

/**
 * Default TTLs by commitment level (milliseconds)
 */
const DEFAULT_TTLS: Record<Commitment, number> = {
  processed: 500,   // 500ms - very volatile
  confirmed: 2000,  // 2s - less volatile
  finalized: 30000, // 30s - stable
}

/**
 * CacheManager handles slot-aware caching for RPC results
 *
 * Features:
 * - Commitment-level TTLs (finalized=30s, confirmed=2s, processed=500ms)
 * - Indefinite PDA caching (deterministic addresses)
 * - LRU eviction policy
 * - Opt-in (disabled by default)
 */
export class CacheManager {
  private accountCache: LRUCache<string, CacheEntry<unknown>>
  private pdaCache: LRUCache<string, Address>
  private config: Required<CacheConfig>
  private ttls: Record<Commitment, number>

  constructor(config: CacheConfig = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      maxSize: config.maxSize ?? 1000,
      ttlOverrides: config.ttlOverrides ?? {},
    }

    // Merge default TTLs with user overrides
    this.ttls = {
      processed: config.ttlOverrides?.processed ?? DEFAULT_TTLS.processed,
      confirmed: config.ttlOverrides?.confirmed ?? DEFAULT_TTLS.confirmed,
      finalized: config.ttlOverrides?.finalized ?? DEFAULT_TTLS.finalized,
    }

    // Initialize LRU caches
    this.accountCache = new LRUCache({
      max: this.config.maxSize,
      ttl: DEFAULT_TTLS.finalized, // Default TTL (overridden per entry)
    })

    // PDA cache has no TTL (deterministic addresses never change)
    this.pdaCache = new LRUCache({
      max: this.config.maxSize,
    })
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Get cached account data
   *
   * @param address - Account address
   * @param commitment - Commitment level
   * @param currentSlot - Current blockchain slot (for staleness check)
   * @returns Cached data or undefined
   */
  getAccount<T>(
    address: Address,
    commitment: Commitment,
    currentSlot?: number
  ): T | undefined {
    if (!this.config.enabled) return undefined

    const key = `${address}:${commitment}`
    const entry = this.accountCache.get(key) as CacheEntry<T> | undefined

    if (!entry) return undefined

    // Check if entry is stale based on slot (if current slot provided)
    if (currentSlot !== undefined && entry.slot < currentSlot) {
      this.accountCache.delete(key)
      return undefined
    }

    return entry.data
  }

  /**
   * Cache account data
   *
   * @param address - Account address
   * @param data - Account data to cache
   * @param commitment - Commitment level
   * @param slot - Blockchain slot when data was fetched
   */
  setAccount<T>(
    address: Address,
    data: T,
    commitment: Commitment,
    slot: number
  ): void {
    if (!this.config.enabled) return

    const key = `${address}:${commitment}`
    const entry: CacheEntry<T> = {
      data,
      slot,
      commitment,
      timestamp: Date.now(),
    }

    // Set with commitment-level TTL
    this.accountCache.set(key, entry as CacheEntry<unknown>, {
      ttl: this.ttls[commitment],
    })
  }

  /**
   * Get cached PDA
   *
   * PDAs are cached indefinitely as they're deterministic.
   *
   * @param seeds - Serialized seed components
   * @returns Cached PDA or undefined
   */
  getPDA(seeds: string): Address | undefined {
    if (!this.config.enabled) return undefined
    return this.pdaCache.get(seeds)
  }

  /**
   * Cache PDA derivation
   *
   * @param seeds - Serialized seed components (use JSON.stringify for consistency)
   * @param pda - Derived PDA address
   */
  setPDA(seeds: string, pda: Address): void {
    if (!this.config.enabled) return
    this.pdaCache.set(seeds, pda)
  }

  /**
   * Invalidate account cache entry
   *
   * @param address - Account address to invalidate
   * @param commitment - Optional commitment level (invalidates all if not specified)
   */
  invalidateAccount(address: Address, commitment?: Commitment): void {
    if (!this.config.enabled) return

    if (commitment) {
      this.accountCache.delete(`${address}:${commitment}`)
    } else {
      // Invalidate all commitment levels
      ;(['processed', 'confirmed', 'finalized'] as Commitment[]).forEach((c) => {
        this.accountCache.delete(`${address}:${c}`)
      })
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.accountCache.clear()
    this.pdaCache.clear()
  }

  /**
   * Get cache statistics
   *
   * @returns Cache size and hit/miss stats
   */
  getStats(): {
    accountCache: { size: number; max: number }
    pdaCache: { size: number; max: number }
  } {
    return {
      accountCache: {
        size: this.accountCache.size,
        max: this.config.maxSize,
      },
      pdaCache: {
        size: this.pdaCache.size,
        max: this.config.maxSize,
      },
    }
  }
}
