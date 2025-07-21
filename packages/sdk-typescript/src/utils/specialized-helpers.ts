/**
 * Specialized Helper Methods for Common Usage Patterns
 * July 2025 Best Practices
 */

import type { Address, Signature, Lamports } from '@solana/kit'
import type { AccountInfo } from '../types/rpc-types.js'
import { SimpleRpcClient } from './simple-rpc-client.js'
import { SYSTEM_PROGRAM_ADDRESS } from '../constants/index.js'

/**
 * Batch operation configuration
 */
export interface BatchConfig {
  /** Maximum items per batch */
  batchSize: number
  /** Delay between batches in milliseconds */
  delayMs: number
  /** Maximum concurrent batches */
  maxConcurrency: number
  /** Enable progress tracking */
  enableProgress: boolean
}

/**
 * Filter and sorting configuration
 */
export interface QueryConfig<T> {
  /** Filter function */
  filter?: (item: T) => boolean
  /** Sort function */
  sort?: (a: T, b: T) => number
  /** Maximum results to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Enable caching */
  enableCache?: boolean
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number
}

/**
 * Account monitoring configuration
 */
export interface MonitorConfig {
  /** Polling interval in milliseconds */
  intervalMs: number
  /** Maximum number of polls */
  maxPolls: number
  /** Timeout in milliseconds */
  timeoutMs: number
  /** Enable exponential backoff */
  useBackoff: boolean
}

/**
 * Transaction details interface for July 2025
 */
interface TransactionDetails {
  transaction: {
    message: {
      accountKeys: string[]
      instructions: unknown[]
      recentBlockhash: string
    }
  }
  meta?: {
    err: unknown | null
    fee: number
    preBalances: number[]
    postBalances: number[]
    logMessages?: string[]
  }
}

/**
 * Specialized helper for GhostSpeak protocol operations
 */
export class GhostSpeakHelpers {
  constructor(private readonly rpcClient: SimpleRpcClient) {}

  // =====================================================
  // BATCH OPERATIONS
  // =====================================================

  /**
   * Fetch multiple accounts in optimized batches
   */
  async batchGetAccounts<T>(
    addresses: Address[],
    decoderName: string,
    config: Partial<BatchConfig> = {}
  ): Promise<Map<Address, T | null>> {
    const {
      batchSize = 100,
      delayMs = 100,
      maxConcurrency = 5,
      enableProgress = false
    } = config

    const results = new Map<Address, T | null>()
    const batches: Address[][] = []

    // Split into batches
    for (let i = 0; i < addresses.length; i += batchSize) {
      batches.push(addresses.slice(i, i + batchSize))
    }

    let completed = 0
    const total = batches.length

    // Process batches with concurrency limit
    const processBatch = async (batch: Address[], batchIndex: number): Promise<void> => {
      try {
        const accounts = await this.rpcClient.getMultipleAccounts(batch)
        
        // Import decoder dynamically
        const generated = await import('../generated/index.js')
        const decoderGetter = generated[decoderName as keyof typeof generated] as unknown as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
        
        if (!decoderGetter) {
          throw new Error(`Decoder ${decoderName} not found`)
        }
        
        const decoder = decoderGetter()
        
        // Decode and store results
        batch.forEach((address, index) => {
          const account = accounts[index]
          if (account) {
            try {
              const decoded = decoder.decode(account.data as Uint8Array)
              results.set(address, decoded)
            } catch {
              results.set(address, null)
            }
          } else {
            results.set(address, null)
          }
        })

        completed++
        if (enableProgress) {
          console.log(`Batch ${completed}/${total} completed (${Math.round(completed / total * 100)}%)`)
        }

        // Add delay between batches
        if (delayMs > 0 && batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      } catch (error) {
        console.warn(`Batch ${batchIndex} failed:`, error)
        // Mark all addresses in failed batch as null
        batch.forEach(address => results.set(address, null))
      }
    }

    // Execute batches with concurrency control
    const semaphore = new Array(maxConcurrency).fill(null)
    let batchIndex = 0

    await Promise.all(
      semaphore.map(async () => {
        while (batchIndex < batches.length) {
          const currentIndex = batchIndex++
          await processBatch(batches[currentIndex], currentIndex)
        }
      })
    )

    return results
  }

  /**
   * Optimized program account scanning with filtering
   */
  async scanProgramAccounts<T>(
    programId: Address,
    decoderName: string,
    queryConfig: QueryConfig<{ address: Address; data: T }> = {}
  ): Promise<{ address: Address; data: T }[]> {
    const {
      filter,
      sort,
      limit,
      offset = 0,
      enableCache = true
    } = queryConfig

    // Check cache first if enabled
    if (enableCache) {
      // This would integrate with the connection pool cache
      // For now, we'll implement basic in-memory caching
    }

    try {
      // Get all program accounts
      const accounts = await this.rpcClient.getProgramAccounts(programId)
      
      // Import decoder
      const generated = await import('../generated/index.js')
      const decoderGetter = generated[decoderName as keyof typeof generated] as unknown as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
      
      if (!decoderGetter) {
        throw new Error(`Decoder ${decoderName} not found`)
      }
      
      const decoder = decoderGetter()
      
      // Decode accounts
      let results: { address: Address; data: T }[] = []
      
      for (const { pubkey, account } of accounts) {
        try {
          if (Buffer.isBuffer(account.data) || account.data instanceof Uint8Array) {
            const decoded = decoder.decode(account.data)
            results.push({ address: pubkey, data: decoded })
          }
        } catch {
          // Skip accounts that fail to decode
        }
      }

      // Apply filtering
      if (filter) {
        results = results.filter(filter)
      }

      // Apply sorting
      if (sort) {
        results.sort(sort)
      }

      // Apply pagination
      if (offset > 0 || limit !== undefined) {
        const start = offset
        const end = limit ? start + limit : undefined
        results = results.slice(start, end)
      }

      return results
    } catch (error) {
      console.warn(`Program account scan failed for ${programId}:`, error)
      return []
    }
  }

  // =====================================================
  // REAL-TIME MONITORING
  // =====================================================

  /**
   * Monitor account changes with callback
   */
  async monitorAccountChanges<T>(
    address: Address,
    decoderName: string,
    callback: (data: T | null, address: Address) => void,
    config: Partial<MonitorConfig> = {}
  ): Promise<() => void> {
    const {
      intervalMs = 5000,
      maxPolls = 1000,
      timeoutMs = 300000,
      useBackoff = true
    } = config

    let isMonitoring = true
    let pollCount = 0
    let currentInterval = intervalMs
    let lastData: T | null = null

    const poll = async (): Promise<void> => {
      if (!isMonitoring || pollCount >= maxPolls) {
        return
      }

      try {
        // Import decoder
        const generated = await import('../generated/index.js')
        const decoderGetter = generated[decoderName as keyof typeof generated] as unknown as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
        
        if (!decoderGetter) {
          throw new Error(`Decoder ${decoderName} not found`)
        }
        
        const decoder = decoderGetter()
        const account = await this.rpcClient.getAccountInfo(address)
        
        let currentData: T | null = null
        if (account) {
          try {
            if (Buffer.isBuffer(account.data) || account.data instanceof Uint8Array) {
              currentData = decoder.decode(account.data)
            }
          } catch {
            currentData = null
          }
        }

        // Check if data changed
        const dataChanged = JSON.stringify(currentData) !== JSON.stringify(lastData)
        if (dataChanged) {
          lastData = currentData
          callback(currentData, address)
        }

        // Reset interval on successful poll
        if (useBackoff) {
          currentInterval = intervalMs
        }

        pollCount++
      } catch (error) {
        console.warn(`Monitor poll failed for ${address}:`, error)
        
        // Apply exponential backoff on error
        if (useBackoff) {
          currentInterval = Math.min(currentInterval * 1.5, 30000)
        }
      }

      // Schedule next poll
      if (isMonitoring && pollCount < maxPolls) {
        setTimeout(poll, currentInterval)
      }
    }

    // Start monitoring
    poll()

    // Set overall timeout
    setTimeout(() => {
      isMonitoring = false
    }, timeoutMs)

    // Return stop function
    return () => {
      isMonitoring = false
    }
  }

  /**
   * Wait for account to exist with specific condition
   */
  async waitForAccountCondition<T>(
    address: Address,
    decoderName: string,
    condition: (data: T) => boolean,
    config: Partial<MonitorConfig> = {}
  ): Promise<T> {
    const { timeoutMs = 60000, intervalMs = 2000 } = config

    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkCondition = async (): Promise<void> => {
        try {
          // Import decoder
          const generated = await import('../generated/index.js')
          const decoderGetter = generated[decoderName as keyof typeof generated] as unknown as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
          
          if (!decoderGetter) {
            throw new Error(`Decoder ${decoderName} not found`)
          }
          
          const decoder = decoderGetter()
          const account = await this.rpcClient.getAccountInfo(address)
          
          if (account) {
            try {
              if (Buffer.isBuffer(account.data) || account.data instanceof Uint8Array) {
                const data = decoder.decode(account.data)
                if (condition(data)) {
                  resolve(data)
                  return
                }
              }
            } catch {
              // Continue checking
            }
          }

          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            reject(new Error(`Timeout waiting for condition on ${address}`))
            return
          }

          // Schedule next check
          setTimeout(checkCondition, intervalMs)
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }

      checkCondition()
    })
  }

  // =====================================================
  // TRANSACTION ANALYSIS
  // =====================================================

  /**
   * Analyze transaction for account changes
   */
  async analyzeTransactionChanges(
    signature: Signature,
    accountsOfInterest: Address[]
  ): Promise<Map<Address, { before: AccountInfo | null; after: AccountInfo | null }>> {
    const changes = new Map<Address, { before: AccountInfo | null; after: AccountInfo | null }>()

    try {
      // Get transaction details
      // Access the internal RPC method - SimpleRpcClient doesn't expose getTransaction directly
      // @ts-expect-error Accessing internal rpc property
      const rpcWithGetTransaction = this.rpcClient.rpc as { 
        getTransaction(signature: string, options: { encoding: string; maxSupportedTransactionVersion: number }): { send(): Promise<TransactionDetails | null> }
      }
      const transaction = await rpcWithGetTransaction.getTransaction(signature.toString(), {
        encoding: 'json',
        maxSupportedTransactionVersion: 0
      }).send()

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      // Get pre and post account states
      const preBalances = transaction.meta?.preBalances ?? []
      const postBalances = transaction.meta?.postBalances ?? []
      const accountKeys = transaction.transaction.message.accountKeys ?? []

      // Get current account states
      const currentAccounts = await this.rpcClient.getMultipleAccounts(accountsOfInterest)

      accountsOfInterest.forEach((address, index) => {
        const accountIndex = accountKeys.findIndex((key: string) => key === address)
        
        let before: AccountInfo | null = null
        let after: AccountInfo | null = null

        if (accountIndex >= 0) {
          // Account was involved in transaction
          const preBalance = preBalances[accountIndex] ?? 0n
          const postBalance = postBalances[accountIndex] ?? 0n

          // This is simplified - in reality we'd need more data from the transaction
          before = {
            lamports: preBalance as unknown as Lamports,
            data: Buffer.alloc(0), // Would need to get historical data
            owner: SYSTEM_PROGRAM_ADDRESS,
            executable: false,
            rentEpoch: 0n
          }

          after = {
            lamports: postBalance as unknown as Lamports,
            data: Buffer.alloc(0), // Would need to get historical data
            owner: SYSTEM_PROGRAM_ADDRESS,
            executable: false,
            rentEpoch: 0n
          }
        }

        // Use current state as fallback
        const currentAccount = currentAccounts[index]
        if (currentAccount) {
          after = currentAccount
        }

        changes.set(address, { before, after })
      })

      return changes
    } catch (error) {
      console.warn(`Transaction analysis failed for ${signature}:`, error)
      return changes
    }
  }

  // =====================================================
  // PERFORMANCE OPTIMIZATION
  // =====================================================

  /**
   * Prefetch accounts that are likely to be needed
   */
  async prefetchAccounts(
    addresses: Address[],
    decoderName: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    // This would integrate with the connection pool to warm the cache
    const delayMap = { high: 0, medium: 100, low: 500 }
    const delay = delayMap[priority]

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      await this.batchGetAccounts(addresses, decoderName, {
        batchSize: 50,
        delayMs: 50,
        maxConcurrency: 3,
        enableProgress: false
      })
    } catch (error) {
      console.warn('Prefetch failed:', error)
    }
  }

  /**
   * Get account with automatic retries and fallback
   */
  async getAccountWithRetries<T>(
    address: Address,
    decoderName: string,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const account = await this.rpcClient.getAccountInfo(address)
        if (!account) return null

        // Import decoder
        const generated = await import('../generated/index.js')
        const decoderGetter = generated[decoderName as keyof typeof generated] as unknown as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
        
        if (!decoderGetter) {
          throw new Error(`Decoder ${decoderName} not found`)
        }
        
        const decoder = decoderGetter()
        if (Buffer.isBuffer(account.data) || account.data instanceof Uint8Array) {
          return decoder.decode(account.data)
        }
        throw new Error('Account data is not a Buffer or Uint8Array')
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for ${address}:`, error)
        
        if (attempt === maxRetries - 1) {
          throw error
        }
        
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return null
  }

  // =====================================================
  // SPECIALIZED FILTERS
  // =====================================================

  /**
   * Create optimized filters for common patterns
   */
  static createFilters() {
    return {
      // Agent filters
      activeAgents: <T extends { isActive: boolean }>(item: T) => item.isActive,
      agentsByOwner: <T extends { owner: Address }>(owner: Address) => 
        (item: T) => item.owner === owner,
      
      // Marketplace filters  
      activeListings: <T extends { isActive: boolean }>(item: T) => item.isActive,
      listingsByPriceRange: <T extends { price: bigint }>(min: bigint, max: bigint) => 
        (item: T) => item.price >= min && item.price <= max,
      
      // Time-based filters
      createdAfter: <T extends { createdAt: bigint }>(timestamp: bigint) => 
        (item: T) => item.createdAt > timestamp,
      createdBefore: <T extends { createdAt: bigint }>(timestamp: bigint) => 
        (item: T) => item.createdAt < timestamp,
      
      // Status filters
      byStatus: <T extends { status: string }>(status: string) => 
        (item: T) => item.status === status,
      
      // Complex filters
      disputesByParticipant: <T extends { complainant: Address; respondent: Address }>(participant: Address) =>
        (item: T) => item.complainant === participant || item.respondent === participant
    }
  }

  /**
   * Create optimized sorters for common patterns
   */
  static createSorters() {
    return {
      // Time-based sorting
      byCreatedAt: <T extends { createdAt: bigint }>(ascending = false) =>
        (a: T, b: T) => ascending ? Number(a.createdAt - b.createdAt) : Number(b.createdAt - a.createdAt),
      
      byUpdatedAt: <T extends { updatedAt: bigint }>(ascending = false) =>
        (a: T, b: T) => ascending ? Number(a.updatedAt - b.updatedAt) : Number(b.updatedAt - a.updatedAt),
      
      // Price-based sorting
      byPrice: <T extends { price: bigint }>(ascending = true) =>
        (a: T, b: T) => ascending ? Number(a.price - b.price) : Number(b.price - a.price),
      
      // Reputation-based sorting
      byReputation: <T extends { reputation: number }>(ascending = false) =>
        (a: T, b: T) => ascending ? a.reputation - b.reputation : b.reputation - a.reputation,
      
      // Complex sorting
      byPriorityAndTime: <T extends { priority: number; createdAt: bigint }>(a: T, b: T) => {
        // Sort by priority first, then by creation time
        if (a.priority !== b.priority) {
          return b.priority - a.priority // Higher priority first
        }
        return Number(b.createdAt - a.createdAt) // Newer first
      }
    }
  }
}

/**
 * Factory function to create GhostSpeak helpers
 */
export function createGhostSpeakHelpers(rpcClient: SimpleRpcClient): GhostSpeakHelpers {
  return new GhostSpeakHelpers(rpcClient)
}

/**
 * Common query configurations for different use cases
 */
export const CommonQueries = {
  recentItems: <T extends { createdAt: bigint }>(limit = 10): QueryConfig<T> => ({
    sort: GhostSpeakHelpers.createSorters().byCreatedAt(false),
    limit,
    enableCache: true,
    cacheTtlMs: 30000
  }),

  activeItems: <T extends { isActive: boolean }>(limit = 50): QueryConfig<T> => ({
    filter: GhostSpeakHelpers.createFilters().activeAgents,
    limit,
    enableCache: true,
    cacheTtlMs: 60000
  }),

  itemsByOwner: <T extends { owner: Address }>(owner: Address, limit = 20): QueryConfig<T> => ({
    filter: GhostSpeakHelpers.createFilters().agentsByOwner(owner),
    limit,
    enableCache: true,
    cacheTtlMs: 120000
  }),

  priceRange: <T extends { price: bigint }>(min: bigint, max: bigint, limit = 25): QueryConfig<T> => ({
    filter: GhostSpeakHelpers.createFilters().listingsByPriceRange(min, max),
    sort: GhostSpeakHelpers.createSorters().byPrice(true),
    limit,
    enableCache: true,
    cacheTtlMs: 30000
  })
} as const