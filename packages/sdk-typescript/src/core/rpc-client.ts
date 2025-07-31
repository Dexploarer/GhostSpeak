import type { Address } from '@solana/addresses'
import { 
  createSolanaRpc, 
  createSolanaRpcSubscriptions,
  lamports,
  type Signature,
  type Base64EncodedWireTransaction,
  type TransactionError,
  type TransactionMessageBytesBase64
} from '@solana/kit'
import type {
  Commitment,
  AccountInfo,
  GetAccountInfoOptions,
  GetMultipleAccountsOptions,
  GetProgramAccountsOptions,
  SignatureStatus,
  SimulatedTransactionResponse,
  SendTransactionOptions
} from '../types/rpc-types.js'

export interface RpcClientConfig {
  endpoint: string
  wsEndpoint?: string
  commitment?: Commitment
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

/**
 * Unified RPC client with all features consolidated from multiple implementations.
 * This is the single source of truth for all RPC operations.
 */
export class RpcClient {
  private rpc: ReturnType<typeof createSolanaRpc>
  private rpcSubscriptions?: ReturnType<typeof createSolanaRpcSubscriptions>
  private commitment: Commitment
  private endpoint: string
  private maxRetries: number
  private retryDelay: number
  private timeout: number

  constructor(config: RpcClientConfig) {
    this.endpoint = config.endpoint
    this.rpc = createSolanaRpc(config.endpoint)
    this.commitment = config.commitment ?? 'confirmed'
    this.maxRetries = config.maxRetries ?? 3
    this.retryDelay = config.retryDelay ?? 1000
    this.timeout = config.timeout ?? 60000
    
    if (config.wsEndpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions(config.wsEndpoint)
    }
  }

  /**
   * Get account information with automatic retries
   */
  async getAccountInfo(
    address: Address,
    options?: GetAccountInfoOptions
  ): Promise<AccountInfo | null> {
    return this.withRetry(async () => {
      const result = await this.rpc.getAccountInfo(address, {
        commitment: options?.commitment ?? this.commitment,
        encoding: 'base64'
      }).send()

      if (!result.value) return null

      return this.parseAccountInfo(result.value)
    })
  }

  /**
   * Get multiple accounts efficiently
   */
  async getMultipleAccounts(
    addresses: Address[],
    options?: GetMultipleAccountsOptions
  ): Promise<(AccountInfo | null)[]> {
    return this.withRetry(async () => {
      const result = await this.rpc.getMultipleAccounts(addresses, {
        commitment: options?.commitment ?? this.commitment,
        encoding: 'base64'
      }).send()

return result.value.map((account: unknown) => 
        account ? this.parseAccountInfo(account) : null
      )
    })
  }

  /**
   * Get program accounts with filters
   */
  async getProgramAccounts(
    programId: Address,
    options?: GetProgramAccountsOptions
  ): Promise<{ pubkey: Address; account: AccountInfo }[]> {
    return this.withRetry(async () => {
      const result = await this.rpc.getProgramAccounts(programId, {
        commitment: options?.commitment ?? this.commitment,
        encoding: 'base64',
        filters: options?.filters
      }).send()

return result.map((item: unknown) => {
        const typedItem = item as { pubkey: string; account: unknown }
        return {
          pubkey: typedItem.pubkey as Address,
          account: this.parseAccountInfo(typedItem.account)
        }
      })
    })
  }

  /**
   * Get latest blockhash with automatic caching
   */
  private blockhashCache: { value: { blockhash: string; lastValidBlockHeight: bigint }; timestamp: number } | null = null
  
  async getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: bigint }> {
    // Cache blockhash for 1 second to avoid excessive RPC calls
    const now = Date.now()
    if (this.blockhashCache && now - this.blockhashCache.timestamp < 1000) {
      return this.blockhashCache.value
    }

    const result = await this.withRetry(async () => {
      const response = await this.rpc.getLatestBlockhash({
        commitment: this.commitment
      }).send()
      
      return {
        blockhash: response.value.blockhash,
        lastValidBlockHeight: BigInt(response.value.lastValidBlockHeight)
      }
    })

    this.blockhashCache = { value: result, timestamp: now }
    return result
  }

  /**
   * Send transaction with enhanced error handling
   */
  async sendTransaction(
    transaction: Base64EncodedWireTransaction,
    options?: SendTransactionOptions
  ): Promise<Signature> {
    return this.withRetry(async () => {
      const result = await this.rpc.sendTransaction(transaction, {
        encoding: 'base64',
        skipPreflight: options?.skipPreflight ?? false,
        preflightCommitment: options?.preflightCommitment ?? this.commitment,
        maxRetries: options?.maxRetries ? BigInt(options.maxRetries) : undefined
      }).send()
      
      return result as Signature
    })
  }

  /**
   * Get signature statuses with batch support
   */
  async getSignatureStatuses(
    signatures: Signature[]
  ): Promise<(SignatureStatus | null)[]> {
    return this.withRetry(async () => {
      const result = await this.rpc.getSignatureStatuses(signatures).send()
      
return result.value.map((status: unknown) => {
        if (!status) return null
        
        const typedStatus = status as {
          slot: bigint
          confirmations: number | null
          err: unknown | null
          confirmationStatus: string | null
        }
        
        return {
          slot: typedStatus.slot,
          confirmations: typedStatus.confirmations,
          err: typedStatus.err as TransactionError | null,
          confirmationStatus: typedStatus.confirmationStatus as Commitment | undefined
        }
      })
    })
  }

  /**
   * Simulate transaction with detailed error info
   */
  async simulateTransaction(
    transaction: Base64EncodedWireTransaction,
    options?: {
      commitment?: Commitment
      replaceRecentBlockhash?: boolean
    }
  ): Promise<SimulatedTransactionResponse> {
    return this.withRetry(async () => {
      const result = await this.rpc.simulateTransaction(transaction, {
        encoding: 'base64',
        commitment: options?.commitment ?? this.commitment,
        replaceRecentBlockhash: options?.replaceRecentBlockhash ?? false
      }).send()
      
      return {
        err: result.value.err,
        logs: result.value.logs ?? [],
        unitsConsumed: result.value.unitsConsumed ? BigInt(result.value.unitsConsumed) : undefined,
        returnData: result.value.returnData
      }
    })
  }

  /**
   * Get fee for message
   */
  async getFeeForMessage(encodedMessage: TransactionMessageBytesBase64): Promise<bigint | null> {
    return this.withRetry(async () => {
      const result = await this.rpc.getFeeForMessage(encodedMessage, {
        commitment: this.commitment
      }).send()
      
      return result.value ? BigInt(result.value) : null
    })
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.rpc.getHealth().send()
      return true
    } catch {
      return false
    }
  }

  /**
   * Get RPC node version
   */
  async getVersion(): Promise<{ 'solana-core': string; 'feature-set': number }> {
    const result = await this.rpc.getVersion().send()
    return result
  }

  /**
   * Subscribe to account changes (WebSocket) 
   * Note: This is a placeholder implementation. In production, you would use the actual subscription API
   */
  async subscribeToAccount(
    address: Address,
    callback: (accountInfo: AccountInfo | null) => void
  ): Promise<() => void> {
    if (!this.rpcSubscriptions) {
      throw new Error('WebSocket endpoint not configured')
    }

    // Placeholder implementation - in practice would use actual subscription
    console.warn('Account subscription is not fully implemented in this version')
    
    // Poll for changes as a fallback (not recommended for production)
    const intervalId = setInterval(async () => {
      try {
        const accountInfo = await this.getAccountInfo(address)
        callback(accountInfo)
      } catch (error) {
        console.error('Subscription polling error:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => {
      clearInterval(intervalId)
    }
  }

  // Private helper methods

  private async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)))
        }
      }
    }
    
    throw lastError
  }

  private parseAccountInfo(rawAccount: unknown): AccountInfo {
    const account = rawAccount as {
      executable: boolean
      lamports: number
      owner: string
      rentEpoch?: number
      data: [string, string] | string
      space?: number
    }

    const dataArray = account.data
    const base64Data = Array.isArray(dataArray) ? dataArray[0] : dataArray
    
    return {
      executable: account.executable,
      lamports: typeof account.lamports === 'number' ? lamports(BigInt(account.lamports)) : account.lamports,
      owner: account.owner as Address,
      rentEpoch: account.rentEpoch !== undefined ? (typeof account.rentEpoch === 'number' ? BigInt(account.rentEpoch) : account.rentEpoch) : BigInt(0),
      data: Buffer.from(base64Data, 'base64'),
      space: account.space ? (typeof account.space === 'number' ? BigInt(account.space) : account.space) : undefined
    }
  }
}