/**
 * Batch Operations - Efficient multi-account fetching
 *
 * Utilities for batching RPC calls to reduce network overhead.
 * Uses Solana's getMultipleAccounts with 100-account limit.
 *
 * @module batch-operations
 */

import type { Address } from '@solana/addresses'
import type { ExtendedRpcApi } from '../types/index.js'

/**
 * Maximum accounts per getMultipleAccounts call
 * Solana RPC limit is 100 accounts
 */
const MAX_ACCOUNTS_PER_BATCH = 100

/**
 * Batch progress callback
 */
export type BatchProgressCallback = (completed: number, total: number) => void

/**
 * Batch fetch configuration
 */
export interface BatchFetchConfig {
  /** Progress callback for large batches */
  onProgress?: BatchProgressCallback
  /** Batch size (default: 100, max: 100) */
  batchSize?: number
}

/**
 * Chunk array into smaller batches
 *
 * @param array - Array to chunk
 * @param size - Chunk size (max 100 for RPC calls)
 * @returns Array of chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Account data type (simplified for RPC returns)
 */
export interface AccountData {
  data: Uint8Array | null
  executable: boolean
  lamports: bigint
  owner: Address
  rentEpoch: bigint
}

/**
 * Batch fetch multiple accounts with automatic chunking
 *
 * Features:
 * - Automatic batching (100 accounts per RPC call)
 * - Parallel batch execution
 * - Progress callback support
 * - Preserves order
 *
 * @param rpc - RPC client
 * @param addresses - Account addresses to fetch
 * @param config - Batch configuration
 * @returns Array of accounts (in same order as input)
 *
 * @example
 * ```typescript
 * const addresses = [...1000 agent addresses...]
 * const accounts = await batchGetAccounts(rpc, addresses, {
 *   onProgress: (completed, total) => {
 *     console.log(`Fetched ${completed}/${total} accounts`)
 *   }
 * })
 * ```
 */
export async function batchGetAccounts<T>(
  rpc: ExtendedRpcApi,
  addresses: Address[],
  config: BatchFetchConfig = {}
): Promise<(T | null)[]> {
  const batchSize = Math.min(
    config.batchSize ?? MAX_ACCOUNTS_PER_BATCH,
    MAX_ACCOUNTS_PER_BATCH
  )

  if (addresses.length === 0) return []

  // Single batch optimization
  if (addresses.length <= batchSize) {
    const result = await rpc.getMultipleAccounts(addresses).send()
    return result.value as (T | null)[]
  }

  // Chunk addresses into batches
  const batches = chunkArray(addresses, batchSize)
  const results: (T | null)[][] = []
  let completed = 0

  // Execute all batches in parallel
  const batchPromises = batches.map(async (batch) => {
    const result = await rpc.getMultipleAccounts(batch).send()
    completed += batch.length
    config.onProgress?.(completed, addresses.length)
    return result.value as (T | null)[]
  })

  results.push(...(await Promise.all(batchPromises)))

  // Flatten results while preserving order
  return results.flat()
}

/**
 * Batch fetch with filtering (only non-null accounts)
 *
 * Useful when you expect some addresses to not exist.
 *
 * @param rpc - RPC client
 * @param addresses - Account addresses to fetch
 * @param config - Batch configuration
 * @returns Array of non-null accounts with their addresses
 *
 * @example
 * ```typescript
 * const addresses = [...agent addresses...]
 * const existing = await batchGetExistingAccounts(rpc, addresses)
 * // Returns only accounts that exist: [{ address, account }, ...]
 * ```
 */
export async function batchGetExistingAccounts<T>(
  rpc: ExtendedRpcApi,
  addresses: Address[],
  config: BatchFetchConfig = {}
): Promise<Array<{ address: Address; account: T }>> {
  const accounts = await batchGetAccounts<T>(rpc, addresses, config)

  const existing: Array<{ address: Address; account: T }> = []
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]
    if (account !== null) {
      existing.push({
        address: addresses[i],
        account,
      })
    }
  }

  return existing
}

/**
 * Batch fetch with mapping
 *
 * Fetches accounts and immediately maps them to a transformed type.
 *
 * @param rpc - RPC client
 * @param addresses - Account addresses to fetch
 * @param mapper - Transform function (account, address, index) => result
 * @param config - Batch configuration
 * @returns Array of mapped results
 *
 * @example
 * ```typescript
 * const agentSummaries = await batchGetAndMap(
 *   rpc,
 *   agentAddresses,
 *   (account, address) => ({
 *     address,
 *     name: account.data.name,
 *     reputation: account.data.totalScore
 *   })
 * )
 * ```
 */
export async function batchGetAndMap<T, R>(
  rpc: ExtendedRpcApi,
  addresses: Address[],
  mapper: (account: T | null, address: Address, index: number) => R,
  config: BatchFetchConfig = {}
): Promise<R[]> {
  const accounts = await batchGetAccounts<T>(rpc, addresses, config)
  return accounts.map((account, index) =>
    mapper(account, addresses[index], index)
  )
}

/**
 * Batch fetch with retry logic
 *
 * Retries failed batches with exponential backoff.
 *
 * @param rpc - RPC client
 * @param addresses - Account addresses to fetch
 * @param config - Batch configuration
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Array of accounts
 */
export async function batchGetAccountsWithRetry<T>(
  rpc: ExtendedRpcApi,
  addresses: Address[],
  config: BatchFetchConfig = {},
  maxRetries = 3
): Promise<(T | null)[]> {
  const batchSize = Math.min(
    config.batchSize ?? MAX_ACCOUNTS_PER_BATCH,
    MAX_ACCOUNTS_PER_BATCH
  )

  if (addresses.length === 0) return []

  const batches = chunkArray(addresses, batchSize)
  const results: (T | null)[] = new Array(addresses.length)
  let completed = 0

  // Execute batches with retry logic
  await Promise.all(
    batches.map(async (batch, batchIndex) => {
      let retries = 0
      let success = false

      while (!success && retries <= maxRetries) {
        try {
          const result = await rpc.getMultipleAccounts(batch).send()
          const batchResults = result.value as (T | null)[]

          // Insert results at correct indices
          batchResults.forEach((account, i) => {
            results[batchIndex * batchSize + i] = account
          })

          completed += batch.length
          config.onProgress?.(completed, addresses.length)
          success = true
        } catch (error) {
          retries++
          if (retries > maxRetries) {
            throw new Error(
              `Batch ${batchIndex} failed after ${maxRetries} retries: ${error}`
            )
          }

          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, retries - 1))
          )
        }
      }
    })
  )

  return results
}

/**
 * Create a batch fetcher with reusable configuration
 *
 * Factory pattern for creating pre-configured batch fetchers.
 *
 * @param rpc - RPC client
 * @param defaultConfig - Default batch configuration
 * @returns Batch fetcher functions
 *
 * @example
 * ```typescript
 * const fetcher = createBatchFetcher(rpc, {
 *   batchSize: 50,
 *   onProgress: (c, t) => console.log(`${c}/${t}`)
 * })
 *
 * const accounts = await fetcher.getAccounts(addresses)
 * const existing = await fetcher.getExisting(addresses)
 * ```
 */
export function createBatchFetcher(
  rpc: ExtendedRpcApi,
  defaultConfig: BatchFetchConfig = {}
) {
  return {
    /**
     * Fetch multiple accounts
     */
    getAccounts: <T>(
      addresses: Address[],
      config?: BatchFetchConfig
    ) => batchGetAccounts<T>(rpc, addresses, { ...defaultConfig, ...config }),

    /**
     * Fetch only existing accounts
     */
    getExisting: <T>(
      addresses: Address[],
      config?: BatchFetchConfig
    ) =>
      batchGetExistingAccounts<T>(rpc, addresses, {
        ...defaultConfig,
        ...config,
      }),

    /**
     * Fetch and map accounts
     */
    getAndMap: <T, R>(
      addresses: Address[],
      mapper: (account: T | null, address: Address, index: number) => R,
      config?: BatchFetchConfig
    ) =>
      batchGetAndMap<T, R>(rpc, addresses, mapper, {
        ...defaultConfig,
        ...config,
      }),

    /**
     * Fetch with retry logic
     */
    getWithRetry: <T>(
      addresses: Address[],
      config?: BatchFetchConfig,
      maxRetries?: number
    ) =>
      batchGetAccountsWithRetry<T>(
        rpc,
        addresses,
        { ...defaultConfig, ...config },
        maxRetries
      ),
  }
}
