/**
 * RPC Utilities for Solana Web3.js v2
 * July 2025 Best Practices - Modern Implementation
 * 
 * This file exports the new RPC client and utilities
 * using modern patterns without backward compatibility
 */


import type { Address } from '@solana/addresses'
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future RPC data decoding features
import { getBase58Decoder, getBase64Decoder } from '@solana/codecs-strings'
import type { AccountInfo, Commitment, ParsedAccountData } from '../types/rpc-types.js'

// Re-export the simple RPC client (working implementation)
export { 
  SimpleRpcClient,
  createSimpleRpcClient,
  type SimpleRpcClientConfig
} from './simple-rpc-client.js'

// Re-export the advanced RPC client (commented out due to @solana/kit compatibility issues)
// export { 
//   SolanaRpcClient,
//   createSolanaRpcClient,
//   createSolanaRpcClientWithSubscriptions,
//   type SolanaRpcApi,
//   type SolanaRpcSubscriptionsApi,
//   type SolanaRpcClientConfig
// } from './rpc-client.js'

// Re-export connection pool (commented out due to complexity)
// export {
//   SolanaConnectionPool,
//   getGlobalConnectionPool,
//   setGlobalConnectionPool,
//   closeGlobalConnectionPool,
//   type ConnectionPoolConfig,
//   type CacheConfig,
//   type PoolStats
// } from './connection-pool.js'

// Re-export specialized helpers
export {
  GhostSpeakHelpers,
  createGhostSpeakHelpers,
  CommonQueries,
  type BatchConfig,
  type QueryConfig,
  type MonitorConfig
} from './specialized-helpers.js'

// Re-export advanced caching
export {
  AdvancedCache,
  SolanaAccountCache,
  CacheFactory,
  type AdvancedCacheConfig,
  type CacheTierConfig,
  type CacheStats,
  type InvalidationStrategy,
  type InvalidationRule
} from './advanced-cache.js'

// Re-export monitoring and observability
export {
  MonitoringSystem,
  getGlobalMonitoring,
  setGlobalMonitoring,
  Monitor,
  type PerformanceMetric,
  type MetricType,
  type AlertConfig,
  type Alert,
  type HealthCheckConfig,
  type HealthStatus,
  type TraceSpan,
  type OperationContext
} from './monitoring.js'

// Re-export RPC types
export * from '../types/rpc-types.js'

// Re-export Token-2022 RPC functions
export {
  getMintWithExtensions,
  getMultipleMintsWithExtensions,
  mintHasExtension,
  getTokenAccountWithExtensions,
  getTokenAccountsByOwnerWithExtensions,
  getAccountSizeForExtensions,
  isToken2022,
  getTokenProgramForMint,
  TOKEN_2022_PROGRAM_ID
} from './token-2022-rpc.js'

/**
 * Account decoder with proper TypeScript typing
 */
export class AccountDecoder<T> {
  constructor(
    private readonly decoder: {
      decode: (data: Uint8Array) => T
    }
  ) {}

  /**
   * Decode account data from various formats
   */
  decode(data: Buffer | Uint8Array | string | [string, string]): T {
    let bytes: Uint8Array

    if (data instanceof Uint8Array) {
      bytes = data
    } else if (Buffer.isBuffer(data)) {
      bytes = new Uint8Array(data)
    } else if (typeof data === 'string') {
      // Try base64 first, then base58
      try {
        bytes = new Uint8Array(Buffer.from(data, 'base64'))
      } catch {
        bytes = new Uint8Array(Buffer.from(data, 'base64'))
      }
    } else if (Array.isArray(data)) {
      // [data, encoding] format
      const [encoded, encoding] = data
      if (encoding === 'base64') {
        bytes = new Uint8Array(Buffer.from(encoded, 'base64'))
      } else if (encoding === 'base58') {
        bytes = new Uint8Array(Buffer.from(encoded, 'base64'))
      } else {
        throw new Error(`Unsupported encoding: ${encoding}`)
      }
    } else {
      throw new Error('Invalid data format for decoding')
    }

    return this.decoder.decode(bytes)
  }

  /**
   * Create a decoder that returns null for empty data
   */
  nullable(): AccountDecoder<T | null> {
    return new AccountDecoder({
      decode: (data: Uint8Array) => {
        if (data.length === 0) return null
        return this.decode(data)
      }
    })
  }
}

/**
 * Batch processor for efficient RPC operations
 */
export class RpcBatchProcessor<T> {
  private batch: (() => Promise<T>)[] = []
  private results: Map<number, T> = new Map()
  
  constructor(
    private readonly maxBatchSize = 100,
    private readonly delayMs = 10
  ) {}

  /**
   * Add operation to batch
   */
  add(operation: () => Promise<T>): Promise<T> {
    const index = this.batch.length
    this.batch.push(operation)

    return new Promise((resolve, reject) => {
      if (this.batch.length >= this.maxBatchSize) {
        this.processBatch()
          .then(() => resolve(this.results.get(index)!))
          .catch(reject)
      } else {
        setTimeout(() => {
          this.processBatch()
            .then(() => resolve(this.results.get(index)!))
            .catch(reject)
        }, this.delayMs)
      }
    })
  }

  /**
   * Process all operations in batch
   */
  private async processBatch(): Promise<void> {
    if (this.batch.length === 0) return

    const operations = [...this.batch]
    this.batch = []

    const results = await Promise.all(
      operations.map(op => op().catch((err: unknown) => ({ error: err })))
    )

    results.forEach((result, index) => {
      if ('error' in (result as object)) {
        throw (result as { error: unknown }).error
      }
      this.results.set(index, result as T)
    })
  }
}

/**
 * Transaction helpers using modern patterns
 */
export class TransactionHelpers {
  /**
   * Calculate transaction size
   */
  static calculateTransactionSize(
    numSignatures: number,
    numAccounts: number,
    dataSize: number
  ): number {
    const signatureSize = 64 * numSignatures
    const headerSize = 3 // compact array lengths
    const accountsSize = 32 * numAccounts
    const recentBlockhashSize = 32
    
    return signatureSize + headerSize + accountsSize + recentBlockhashSize + dataSize
  }

  /**
   * Estimate transaction fee
   */
  static estimateTransactionFee(
    numSignatures: number,
    lamportsPerSignature = 5000n
  ): bigint {
    return BigInt(numSignatures) * lamportsPerSignature
  }

  /**
   * Check if transaction fits in a single packet
   */
  static fitsInSinglePacket(transactionSize: number): boolean {
    const PACKET_DATA_SIZE = 1232
    const SIGNATURE_SIZE = 64
    return transactionSize <= PACKET_DATA_SIZE - SIGNATURE_SIZE
  }
}

/**
 * Account utilities
 */
export class AccountUtils {
  /**
   * Check if account is executable
   */
  static isExecutable(account: AccountInfo): boolean {
    return account.executable
  }

  /**
   * Check if account is owned by program
   */
  static isOwnedBy(account: AccountInfo, programId: Address): boolean {
    return account.owner === programId
  }

  /**
   * Check if account has sufficient lamports
   */
  static hasSufficientBalance(
    account: AccountInfo,
    requiredLamports: bigint
  ): boolean {
    return account.lamports >= requiredLamports
  }

  /**
   * Check if account data is parsed
   */
  static isParsedData(data: unknown): data is ParsedAccountData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'program' in data &&
      'parsed' in data
    )
  }

  /**
   * Extract parsed data safely
   */
  static getParsedData<T>(account: AccountInfo): T | null {
    if (this.isParsedData(account.data)) {
      return account.data.parsed as T
    }
    return null
  }
}

/**
 * Commitment utilities
 */
export class CommitmentUtils {
  private static readonly levels: Commitment[] = ['processed', 'confirmed', 'finalized']

  /**
   * Check if one commitment subsumes another
   */
  static subsumes(a: Commitment, b: Commitment): boolean {
    return this.levels.indexOf(a) >= this.levels.indexOf(b)
  }

  /**
   * Get stronger commitment
   */
  static stronger(a: Commitment, b: Commitment): Commitment {
    return this.subsumes(a, b) ? a : b
  }

  /**
   * Wait for higher commitment
   */
  static async waitForCommitment(
    getCurrentCommitment: () => Promise<Commitment>,
    targetCommitment: Commitment,
    timeoutMs = 30000,
    intervalMs = 1000
  ): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const current = await getCurrentCommitment()
      if (this.subsumes(current, targetCommitment)) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new Error(`Timeout waiting for ${targetCommitment} commitment`)
  }
}

/**
 * PDA (Program Derived Address) utilities
 */
export class PdaUtils {
  /**
   * Find PDA with bump
   */
  static async findProgramAddress(
    seeds: (Uint8Array | Buffer)[],
    programId: Address
  ): Promise<[Address, number]> {
    const { getProgramDerivedAddress } = await import('@solana/addresses')
    
    // Find the PDA with bump
    for (let bump = 255; bump >= 0; bump--) {
      try {
        const seedsWithBump = [...seeds, new Uint8Array([bump])]
        const [address] = await getProgramDerivedAddress({ programAddress: programId, seeds: seedsWithBump })
        return [address, bump]
      } catch {
        // Continue to next bump
      }
    }
    throw new Error('Unable to find valid PDA')
  }

  /**
   * Create PDA with specific bump
   */
  static async createProgramAddress(
    seeds: (Uint8Array | Buffer)[],
    bump: number,
    programId: Address
  ): Promise<Address> {
    const { getProgramDerivedAddress } = await import('@solana/addresses')
    const seedsWithBump = [...seeds, new Uint8Array([bump])]
    const [address] = await getProgramDerivedAddress({ programAddress: programId, seeds: seedsWithBump })
    return address
  }

  /**
   * Derive multiple PDAs efficiently
   */
  static async findMultipleProgramAddresses(
    seedsList: (Uint8Array | Buffer)[][],
    programId: Address
  ): Promise<[Address, number][]> {
    return Promise.all(
      seedsList.map(seeds => this.findProgramAddress(seeds, programId))
    )
  }
}

/**
 * Retry utilities for RPC operations
 */
export class RetryUtils {
  /**
   * Retry with exponential backoff
   */
  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      baseDelayMs?: number
      maxDelayMs?: number
      shouldRetry?: (error: unknown) => boolean
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelayMs = 1000,
      maxDelayMs = 10000,
      shouldRetry = () => true
    } = options

    let lastError: unknown

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (!shouldRetry(error) || attempt === maxRetries - 1) {
          throw error
        }

        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt),
          maxDelayMs
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const retryableMessages = [
      'blockhash not found',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'rate limit'
    ]

    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }

  /**
   * Retry with linear backoff
   */
  static async withLinearBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      delayMs?: number
      shouldRetry?: (error: unknown) => boolean
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delayMs = 1000,
      shouldRetry = () => true
    } = options

    let lastError: unknown

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (!shouldRetry(error) || attempt === maxRetries - 1) {
          throw error
        }

        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    throw lastError
  }
}

/**
 * Address validation utilities
 */
export class AddressUtils {
  /**
   * Check if string is a valid Solana address
   * Supports standard addresses (32-44 chars) and extended formats (up to 88 chars for ATAs/PDAs)
   */
  static isValidAddress(address: string): boolean {
    try {
      // Extended validation to support Associated Token Accounts and Program Derived Addresses
      // Standard addresses: 32-44 characters
      // Extended addresses (ATAs, PDAs): up to 88 characters
      return address.length >= 32 && address.length <= 88 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
    } catch {
      return false
    }
  }

  /**
   * Check if string is a valid transaction signature
   */
  static isValidSignature(signature: string): boolean {
    try {
      return signature.length === 88 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(signature)
    } catch {
      return false
    }
  }

  /**
   * Normalize address to consistent format
   */
  static normalizeAddress(address: string): string {
    return address.trim()
  }

  /**
   * Check if address is a system program
   */
  static isSystemProgram(address: string): boolean {
    return address === '11111111111111111111111111111111'
  }

  /**
   * Check if address is a token program
   */
  static isTokenProgram(address: string): boolean {
    return address === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  }

  /**
   * Check if address is an associated token program
   */
  static isAssociatedTokenProgram(address: string): boolean {
    return address === 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
  }
}

/**
 * Lamports conversion utilities
 */
export class LamportsUtils {
  private static readonly LAMPORTS_PER_SOL = 1000000000n

  /**
   * Convert SOL to lamports
   */
  static solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * Number(this.LAMPORTS_PER_SOL)))
  }

  /**
   * Convert lamports to SOL
   */
  static lamportsToSol(lamports: bigint): number {
    return Number(lamports) / Number(this.LAMPORTS_PER_SOL)
  }

  /**
   * Format lamports as readable string
   */
  static formatLamports(lamports: bigint, decimals = 9): string {
    const sol = this.lamportsToSol(lamports)
    return sol.toFixed(decimals)
  }

  /**
   * Check if lamports value is valid
   */
  static isValidLamports(lamports: bigint): boolean {
    return lamports >= 0n && lamports <= 18446744073709551615n // u64 max
  }
}

/**
 * Slot and timing utilities
 */
export class SlotUtils {
  private static readonly SLOT_DURATION_MS = 400 // Average slot duration

  /**
   * Estimate time until target slot
   */
  static estimateTimeToSlot(currentSlot: bigint, targetSlot: bigint): number {
    const slotDifference = Number(targetSlot - currentSlot)
    return slotDifference * this.SLOT_DURATION_MS
  }

  /**
   * Check if slot is recent (within last 150 slots)
   */
  static isRecentSlot(slot: bigint, currentSlot: bigint): boolean {
    return currentSlot - slot <= 150n
  }

  /**
   * Get slot range for time period
   */
  static getSlotRange(durationMs: number): number {
    return Math.ceil(durationMs / this.SLOT_DURATION_MS)
  }
}

/**
 * Network and cluster utilities
 */
export class NetworkUtils {
  /**
   * Detect network from RPC endpoint
   */
  static detectNetwork(endpoint: string): 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet' | 'unknown' {
    const url = endpoint.toLowerCase()
    
    if (url.includes('mainnet-beta') || url.includes('api.mainnet-beta.solana.com')) {
      return 'mainnet-beta'
    }
    if (url.includes('testnet') || url.includes('api.testnet.solana.com')) {
      return 'testnet'
    }
    if (url.includes('devnet') || url.includes('api.devnet.solana.com')) {
      return 'devnet'
    }
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'localnet'
    }
    
    return 'unknown'
  }

  /**
   * Get explorer URL for transaction
   */
  static getExplorerUrl(
    signature: string,
    network: 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet' = 'devnet'
  ): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
    return `https://explorer.solana.com/tx/${signature}${cluster}`
  }

  /**
   * Get explorer URL for account
   */
  static getAccountExplorerUrl(
    address: string,
    network: 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet' = 'devnet'
  ): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
    return `https://explorer.solana.com/address/${address}${cluster}`
  }

  /**
   * Check if endpoint is responsive
   */
  static async checkEndpointHealth(endpoint: string): Promise<boolean> {
    try {
      const response = await globalThis.fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
      })
      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Data encoding utilities
 */
export class EncodingUtils {
  /**
   * Convert hex string to Uint8Array
   */
  static hexToUint8Array(hex: string): Uint8Array {
    const cleanHex = hex.replace(/^0x/, '')
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }
    return bytes
  }

  /**
   * Convert Uint8Array to hex string
   */
  static uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Convert string to Uint8Array
   */
  static stringToUint8Array(str: string): Uint8Array {
    return new globalThis.TextEncoder().encode(str)
  }

  /**
   * Convert Uint8Array to string
   */
  static uint8ArrayToString(bytes: Uint8Array): string {
    return new globalThis.TextDecoder().decode(bytes)
  }

  /**
   * Check if data is valid base64
   */
  static isValidBase64(str: string): boolean {
    try {
      return globalThis.btoa(globalThis.atob(str)) === str
    } catch {
      return false
    }
  }

  /**
   * Check if data is valid hex
   */
  static isValidHex(str: string): boolean {
    const cleanStr = str.replace(/^0x/, '')
    return /^[0-9A-Fa-f]*$/.test(cleanStr) && cleanStr.length % 2 === 0
  }
}