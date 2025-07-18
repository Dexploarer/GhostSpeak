import type { Address } from '@solana/addresses'
import { 
  createSolanaRpc
} from '@solana/kit'
import type { 
  Commitment, 
  SolanaRpcClient,
  ExtendedRpcApi,
  RpcAccountInfo,
  RpcAccountInfoResponse,
  RpcMultipleAccountsResponse,
  RpcProgramAccountsResponse,
  RpcProgramAccount
} from '../types/index.js'

// Re-export account info type for backwards compatibility
export type AccountInfo = RpcAccountInfo

/**
 * Enhanced RPC client using 2025 Web3.js v2 patterns
 */
export class GhostSpeakRpcClient {
  private rpc: ExtendedRpcApi | SolanaRpcClient

  constructor(rpc: ExtendedRpcApi | SolanaRpcClient) {
    this.rpc = rpc
  }

  /**
   * Create a new RPC client from endpoint URL
   */
  static fromEndpoint(endpoint: string): GhostSpeakRpcClient {
    const rpc = createSolanaRpc(endpoint) as ExtendedRpcApi
    return new GhostSpeakRpcClient(rpc)
  }

  /**
   * Get account information using 2025 patterns
   */
  async getAccount(
    address: Address,
    commitment: Commitment = 'confirmed'
  ): Promise<RpcAccountInfo | null> {
    try {
      // Handle both Web3.js v2 (ExtendedRpcApi) and custom interface
      if ('getAccountInfo' in this.rpc && typeof (this.rpc as any).getAccountInfo === 'function') {
        const getAccountInfo = (this.rpc as any).getAccountInfo
        const result = typeof getAccountInfo(address, { commitment, encoding: 'base64' }).send === 'function'
          ? await getAccountInfo(address, { commitment, encoding: 'base64' }).send()
          : await getAccountInfo(address, { commitment, encoding: 'base64' })
        return result.value
      }
      throw new Error('getAccountInfo method not available')
    } catch (error) {
      console.warn(`Failed to fetch account ${address}:`, error)
      return null
    }
  }

  /**
   * Get multiple accounts efficiently
   */
  async getAccounts(
    addresses: Address[],
    commitment: Commitment = 'confirmed'
  ): Promise<(RpcAccountInfo | null)[]> {
    try {
      // Handle both Web3.js v2 (ExtendedRpcApi) and custom interface
      if ('getMultipleAccounts' in this.rpc && typeof (this.rpc as any).getMultipleAccounts === 'function') {
        const getMultipleAccounts = (this.rpc as any).getMultipleAccounts
        const result = typeof getMultipleAccounts(addresses, { commitment, encoding: 'base64' }).send === 'function'
          ? await getMultipleAccounts(addresses, { commitment, encoding: 'base64' }).send()
          : await getMultipleAccounts(addresses, { commitment, encoding: 'base64' })
        return result.value
      }
      throw new Error('getMultipleAccounts method not available')
    } catch (error) {
      console.warn('Failed to fetch multiple accounts:', error)
      return addresses.map(() => null)
    }
  }

  /**
   * Get program accounts with optional filters
   */
  async getProgramAccounts(
    programId: Address,
    filters: unknown[] = [],
    commitment: Commitment = 'confirmed'
  ): Promise<{ address: Address; account: RpcAccountInfo }[]> {
    try {
      // Handle both Web3.js v2 (ExtendedRpcApi) and custom interface
      if ('getProgramAccounts' in this.rpc && typeof (this.rpc as any).getProgramAccounts === 'function') {
        const getProgramAccounts = (this.rpc as any).getProgramAccounts
        const result = typeof getProgramAccounts(programId, { commitment, encoding: 'base64', filters }).send === 'function'
          ? await getProgramAccounts(programId, { commitment, encoding: 'base64', filters }).send()
          : await getProgramAccounts(programId, { commitment, encoding: 'base64', filters })
        
        return (result.value ?? []).map((item: RpcProgramAccount) => ({
          address: item.pubkey,
          account: item.account
        }))
      }
      throw new Error('getProgramAccounts method not available')
    } catch (error) {
      console.warn(`Failed to fetch program accounts for ${programId}:`, error)
      return []
    }
  }

  /**
   * Get and decode a single account using provided decoder
   */
  async getAndDecodeAccount<T>(
    address: Address,
    decoder: { decode: (data: Uint8Array) => T },
    commitment: Commitment = 'confirmed'
  ): Promise<T | null> {
    try {
      const account = await this.getAccount(address, commitment)
      if (!account?.data) {
        return null
      }

      // Account data comes as base64 encoded
      const data = typeof account.data === 'string' 
        ? Uint8Array.from(atob(account.data), c => c.charCodeAt(0))
        : account.data

      return decoder.decode(data)
    } catch (error) {
      console.warn(`Failed to decode account ${address}:`, error)
      return null
    }
  }

  /**
   * Get and decode multiple accounts with the same decoder
   */
  async getAndDecodeAccounts<T>(
    addresses: Address[],
    decoder: { decode: (data: Uint8Array) => T },
    commitment: Commitment = 'confirmed'
  ): Promise<(T | null)[]> {
    try {
      const accounts: (RpcAccountInfo | null)[] = await this.getAccounts(addresses, commitment)
      
      return accounts.map(account => {
        if (!account?.data) {
          return null
        }

        try {
          const data = typeof account.data === 'string'
            ? Uint8Array.from(atob(account.data), c => c.charCodeAt(0))
            : account.data

          return decoder.decode(data)
        } catch (error) {
          console.warn('Failed to decode account:', error)
          return null
        }
      })
    } catch (error) {
      console.warn('Failed to decode multiple accounts:', error)
      return addresses.map(() => null)
    }
  }

  /**
   * Get and decode program accounts with filtering
   */
  async getAndDecodeProgramAccounts<T>(
    programId: Address,
    decoder: { decode: (data: Uint8Array) => T },
    filters: unknown[] = [],
    commitment: Commitment = 'confirmed'
  ): Promise<{ address: Address; data: T }[]> {
    try {
      const accounts: { address: Address; account: RpcAccountInfo }[] = await this.getProgramAccounts(programId, filters, commitment)
      
      const decodedAccounts: { address: Address; data: T }[] = []
      
      for (const { address, account } of accounts) {
        try {
          if (!account.data) continue

          const data = typeof account.data === 'string'
            ? Uint8Array.from(atob(account.data), c => c.charCodeAt(0))
            : account.data

          const decoded = decoder.decode(data)
          decodedAccounts.push({ address, data: decoded })
        } catch (error) {
          console.warn(`Failed to decode account ${address}:`, error)
        }
      }
      
      return decodedAccounts
    } catch (error) {
      console.warn(`Failed to get program accounts for ${programId}:`, error)
      return []
    }
  }

  /**
   * Raw RPC access for advanced use cases
   */
  get raw(): ExtendedRpcApi | SolanaRpcClient {
    return this.rpc
  }
}

/**
 * Account decoder utility using 2025 patterns
 */
export class AccountDecoder {
  /**
   * Decode a single account's data
   */
  static decode<T>(
    accountData: Uint8Array | string,
    decoder: { decode: (data: Uint8Array) => T }
  ): T {
    const data = typeof accountData === 'string'
      ? Uint8Array.from(atob(accountData), c => c.charCodeAt(0))
      : accountData

    return decoder.decode(data)
  }

  /**
   * Decode multiple accounts with error handling
   */
  static decodeMultiple<T>(
    accountsData: (Uint8Array | string | null)[],
    decoder: { decode: (data: Uint8Array) => T }
  ): (T | null)[] {
    return accountsData.map(data => {
      if (!data) return null
      
      try {
        return this.decode(data, decoder)
      } catch (error) {
        console.warn('Failed to decode account data:', error)
        return null
      }
    })
  }
}

/**
 * Account fetcher with caching and batch optimization
 */
export class AccountFetcher {
  private cache = new Map<string, { data: unknown; timestamp: number }>()
  private cacheTimeout: number

  constructor(
    private rpcClient: GhostSpeakRpcClient,
    cacheTimeoutMs: number = 30000 // 30 seconds default
  ) {
    this.cacheTimeout = cacheTimeoutMs
  }

  /**
   * Fetch account with caching
   */
  async fetchAccount<T>(
    address: Address,
    decoder: { decode: (data: Uint8Array) => T },
    useCache: boolean = true
  ): Promise<T | null> {
    const cacheKey = `${address}_${decoder.constructor.name}`
    
    if (useCache) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data as T | null
      }
    }

    const data = await this.rpcClient.getAndDecodeAccount(address, decoder)
    
    if (data && useCache) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() })
    }
    
    return data
  }

  /**
   * Batch fetch accounts with optimization
   */
  async fetchAccountsBatch<T>(
    addresses: Address[],
    decoder: { decode: (data: Uint8Array) => T },
    useCache: boolean = true
  ): Promise<(T | null)[]> {
    const uncachedAddresses: Address[] = []
    const results: (T | null)[] = new Array<T | null>(addresses.length)
    
    // Check cache first
    if (useCache) {
      addresses.forEach((address, index) => {
        const cacheKey = `${address}_${decoder.constructor.name}`
        const cached = this.cache.get(cacheKey)
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          results[index] = cached.data as T | null
        } else {
          uncachedAddresses.push(address)
        }
      })
    } else {
      uncachedAddresses.push(...addresses)
    }

    // Fetch uncached accounts
    if (uncachedAddresses.length > 0) {
      const freshData = await this.rpcClient.getAndDecodeAccounts(uncachedAddresses, decoder)
      
      let uncachedIndex = 0
      addresses.forEach((address, index) => {
        if (results[index] === undefined) {
          const data = freshData[uncachedIndex++]
          results[index] = data
          
          if (data && useCache) {
            const cacheKey = `${address}_${decoder.constructor.name}`
            this.cache.set(cacheKey, { data, timestamp: Date.now() })
          }
        }
      })
    }
    
    return results
  }

  /**
   * Clear cache for specific account or all
   */
  clearCache(address?: Address): void {
    if (address) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(address)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
}